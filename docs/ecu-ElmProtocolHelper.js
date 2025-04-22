import { DEMO_DEVICE } from '@src/components';
import {
  CMD,
  DELAYS,
  PROT,
  RESPONSE_PATTERNS,
  TEST_COMMANDS,
} from '@src/helper/OBDManagerHelper/OBDUtils';

import ElmProtocolInit from './ElmProtocolInit';
import Protocol from './Protocol';

/**
 * Helper functions for ELM protocol handling
 */
const ElmProtocolHelper = {
  async queryNextEcu() {
    const addresses = Array.from(this.ecuAddresses);

    if (addresses.length <= 1) {
      this.handlers.log?.(
        'info',
        '[ELM-Helper] No additional ECUs available for query',
        {
          currentEcu: this.selectedEcuAddress,
          totalEcus: addresses.length,
        },
      );

      return false;
    }

    const currentIndex = addresses.indexOf(this.selectedEcuAddress);
    const nextIndex = (currentIndex + 1) % addresses.length;
    const nextAddress = addresses[nextIndex];

    this.handlers.log?.('info', '[ELM-Helper] Switching to next ECU', {
      currentEcu: this.selectedEcuAddress,
      nextEcu: nextAddress,
      availableEcus: addresses,
      totalEcus: addresses.length,
    });

    return await this.selectEcu(nextAddress);
  },

  extractEcuAddress(response, protocol, bitFormat = null) {
    // Try new logic with bitFormat first
    if (bitFormat) {
      // Clean up response
      const cleanResponse = response.replace(/[\r\n\s]/g, '').toUpperCase();

      // Find address end (start of service response)
      const adrEnd =
        cleanResponse.indexOf('41') >= 0
          ? cleanResponse.indexOf('41')
          : cleanResponse.indexOf('7F01');

      if (adrEnd < 0) return null;

      // Find address start
      const adrStart = cleanResponse.lastIndexOf('.') + 1;

      if (adrEnd <= adrStart) return null;

      let adrLen = adrEnd - adrStart;
      let addressStart = adrStart;

      // Apply bit format specific logic
      if (bitFormat === '29bit' && cleanResponse.startsWith('18DA')) {
        adrLen = 8;
        addressStart = adrStart;
      } else if (bitFormat === '11bit' && cleanResponse.match(/7E[0-9A-F]/)) {
        adrLen = 3;
      } else {
        // If format doesn't match expected patterns, fall back to old logic
        return this.extractEcuAddress(response, protocol);
      }

      const address = cleanResponse.substring(
        addressStart,
        addressStart + adrLen,
      );

      // If we got a valid address, return it
      if (address && address.length > 0) {
        return address;
      }
    }

    // Fall back to original golden logic if bitFormat is null or new logic failed
    // Clean up response
    const cleanResponse = response.replace(/[\r\n\s]/g, '').toUpperCase();

    // Find address end (start of service response)
    const adrEnd =
      cleanResponse.indexOf('41') >= 0
        ? cleanResponse.indexOf('41')
        : cleanResponse.indexOf('7F01');

    if (adrEnd < 0) return null;

    // Find address start
    const adrStart = cleanResponse.lastIndexOf('.') + 1;

    if (adrEnd <= adrStart) return null;

    // Get address length
    let adrLen = adrEnd - adrStart;
    let addressStart = adrStart;

    // Handle different address formats
    if (adrLen % 2 !== 0) {
      // Odd address length -> CAN with frame type
      adrLen = 3;
    } else if (adrLen === 6) {
      // ISO9141/KWP2000 address format <FF><RR><SS>
      adrLen = 2;
      addressStart = adrEnd - adrLen;
    } else if (adrLen === 10) {
      // 29-bit CAN address
      adrLen = 8;
      addressStart = adrStart;
    }

    const address = cleanResponse.substring(
      addressStart,
      addressStart + adrLen,
    );

    // Additional validation for ISO/KWP protocols
    if (protocol === PROT.ISO9141 || protocol === PROT.ISO14230_4ST) {
      // Check if we have a valid ISO format header
      const isoMatch = cleanResponse.match(/^(48|68)([0-9A-F]{2})(6B|6D)/i);

      if (isoMatch) {
        return isoMatch[2]; // Return the receiver address part
      }
    }

    return address;
  },

  /**
   * Detect CAN bit format from ECU address
   * @param {string} address - ECU address from response
   * @returns {'11bit' | '29bit' | null} The detected bit format or null if not a valid CAN address
   */
  detectCanBitFormat(address) {
    if (!address) return null;

    // Clean the address exactly like extractEcuAddress does
    const cleanAddr = address.replace(/[\r\n\s]/g, '').toUpperCase();

    // Only detect format for complete CAN messages
    // 29-bit: Must start with 18DA and be exactly 6 chars (without frame type)
    if (cleanAddr.startsWith('18DA') && cleanAddr.length >= 6) {
      return '29bit';
    }

    // 11-bit: Must be exactly 7Ex format
    if (cleanAddr.match(/^7E[0-9A-F]$/)) {
      return '11bit';
    }

    // If not a clearly identifiable CAN format, return null
    return null;
  },

  /**
   * Format header based on protocol and address
   * @param {string} address - ECU address
   * @returns {string} Formatted header
   */
  formatHeader(address) {
    if (!address) return '';

    // Clean address for consistency
    const cleanAddr = address.replace(/[\r\n\s]/g, '').toUpperCase();

    switch (this.currentProtocol) {
      // ISO 9141-2 Protocol
      case PROT.ISO9141:
        return `68${cleanAddr}6B`;

      // ISO 14230-4 KWP Protocol
      case PROT.ISO14230_4ST:
      case PROT.ISO14230_4FT:
        return `68${cleanAddr}6B`;

      // CAN 29-bit Protocols (ISO 15765-4)
      case PROT.ISO15765_29_250:
      case PROT.ISO15765_29_500:
        // If address already includes 18DA prefix, use as is
        return cleanAddr.startsWith('18DA') ? cleanAddr : `18DA${cleanAddr}`;

      // CAN 11-bit Protocols (ISO 15765-4)
      case PROT.ISO15765_11_250:
      case PROT.ISO15765_11_500:
        // If address already includes 7E prefix, use as is
        return cleanAddr.startsWith('7E') ? cleanAddr : `7E${cleanAddr}`;

      // SAE J1850 Protocols
      case PROT.J1850PWM:
      case PROT.J1850VPW:
        return cleanAddr; // No header modification needed

      // Default case - handle unknown protocols safely
      default:
        // If address has clear format indicators, preserve them
        if (cleanAddr.startsWith('18DA')) {
          return cleanAddr; // Preserve 29-bit format
        } else if (cleanAddr.startsWith('7E')) {
          return cleanAddr; // Preserve 11-bit format
        } else if (cleanAddr.length <= 2) {
          return `7E${cleanAddr}`; // Default to 11-bit for short addresses
        }

        return cleanAddr; // Keep original if format unclear
    }
  },

  async handleEcuDetection(response) {
    if (!response) {
      return false;
    }

    const cleanResponse = response.replace(/[\r\n\s]/g, '').toUpperCase();
    const foundAddresses = new Set();

    const patterns = {
      standard: /7E[0-9A-F]/g,
      extended: /18DA[0-9A-F]{2}/g,
      custom: /[0-9A-F]{3}/g,
    };

    Object.entries(patterns).forEach(([format, pattern]) => {
      const matches = cleanResponse.match(pattern) || [];

      matches.forEach(match => {
        const address =
          format === 'standard'
            ? match.slice(-1)
            : format === 'extended'
              ? match.slice(-2)
              : match;

        if (address) {
          foundAddresses.add(address);

          // Only log format if we're absolutely certain
          if (format === 'standard' || format === 'extended') {
            const bitFormat = this.detectCanBitFormat(match);

            if (bitFormat) {
              // First try with bitFormat
              const extractedWithFormat = this.extractEcuAddress(
                response,
                this.currentProtocol,
                bitFormat,
              );

              if (extractedWithFormat) {
                foundAddresses.add(extractedWithFormat);
              }

              this.handlers.log?.('debug', '[ELM-Helper] Detected CAN format', {
                address: match,
                format: bitFormat,
              });
            }
          }
        }
      });
    });

    // If no addresses found with bitFormat, or as additional validation,
    // try without bitFormat (original golden logic)
    const extractedAddress = this.extractEcuAddress(
      response,
      this.currentProtocol,
    );

    if (extractedAddress) {
      foundAddresses.add(extractedAddress);
    }

    foundAddresses.forEach(address => {
      this.ecuAddresses.add(address);

      if (!this.selectedEcuAddress) {
        this.selectedEcuAddress = address;
        this.currentHeader = this.formatHeader(address);

        this.handlers.log?.('info', '[ELM-Helper] Default ECU selected', {
          address,
          header: this.currentHeader,
          protocol: this.currentProtocol,
        });
      }
    });

    const success = this.ecuAddresses.size > 0;

    if (success) {
      this.handlers.log?.(
        'success',
        '[ELM-Helper] ECU detection completed successfully',
      );
      this.handlers.onEcuDetected?.(Array.from(this.ecuAddresses));
    }

    return success;
  },

  async connectToECU() {
    try {
      this.retryCount = 0;
      this.currentProtocol = await this.handlers.getProtocol();
      this.handlers.log?.(
        'info',
        '[ELM-Helper] Starting ECU connection sequence',
      );

      const firstCommandResult = await this.firstCommand();

      if (firstCommandResult === 'demo') {
        this.handlers.log?.(
          'info',
          '[ELM-Helper] Demo device detected - skipping normal initialization',
        );

        return true;
      }

      await this.delay(DELAYS.RESET);
      await this.sendCommand('ATZ');
      await this.delay(DELAYS.RESET);

      if (await this.tryAllProtocols()) {
        if (!this.currentProtocol || this.currentProtocol === 0) {
          this.handlers.log?.(
            'error',
            '[ELM-Helper] Protocol detection failed - no valid protocol set',
          );
          this.setStatus(Protocol.STATUS.ERROR);

          return false;
        }

        await this.initializeDevice();
        await this.setProtocol(this.currentProtocol);

        this.setStatus(Protocol.STATUS.CONNECTED);
        this.handlers.log?.(
          'success',
          '[ELM-Helper] ECU connection established successfully',
        );

        await this.handlers.setProtocol(this.currentProtocol);

        return true;
      }

      this.setStatus(Protocol.STATUS.ERROR);
      throw new Error('Protocol detection failed');
    } catch (error) {
      this.setStatus(Protocol.STATUS.ERROR);
      this.handlers.log?.('error', '[ELM-Helper] ECU connection failed', {
        error: error.message,
        protocol: this.currentProtocol,
      });

      return false;
    }
  },

  async testProtocol(protocol, desc) {
    this.handlers.log?.('info', '[ELM-Helper] Starting protocol test', {
      protocol,
      description: desc,
      currentStatus: this.getStatus(),
    });

    const protocolCmd = this.createCommand(CMD.SETPROT, protocol);
    const protocolResponse = await this.sendCommand(protocolCmd);

    if (!this.isValidResponse(protocolResponse)) {
      this.handlers.log?.('warn', '[ELM-Helper] Protocol setup failed', {
        protocol,
        description: desc,
        response: protocolResponse,
        command: protocolCmd,
      });

      return false;
    }

    await this.delay(DELAYS.PROTOCOL);

    const testCommands = TEST_COMMANDS;

    for (const {
      cmd,
      desc: cmdDesc,
      response: expectedResponse,
    } of testCommands) {
      this.handlers.log?.('debug', '[ELM-Helper] Testing protocol command', {
        protocol,
        command: cmd,
        description: cmdDesc,
        expectedResponse,
      });

      const response = await this.sendCommand(cmd);

      if (!response) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] No response for test command',
          {
            protocol,
            command: cmd,
            description: cmdDesc,
          },
        );
        continue;
      }

      const errorPatterns = Object.values(RESPONSE_PATTERNS.ERROR);

      if (errorPatterns.some(pattern => response.includes(pattern))) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Protocol test received error response',
          {
            protocol,
            description: desc,
            response,
            matchedPattern: errorPatterns.find(p => response.includes(p)),
          },
        );

        return false;
      }

      if (this.isValidResponseFormat(response, expectedResponse)) {
        this.handlers.log?.(
          'success',
          '[ELM-Helper] Protocol test successful',
          {
            protocol,
            description: desc,
            command: cmd,
            commandDesc: cmdDesc,
            response,
          },
        );

        return true;
      }

      await this.delay(DELAYS.PROTOCOL);
    }

    this.handlers.log?.(
      'warn',
      '[ELM-Helper] Protocol test failed - all commands unsuccessful',
      {
        protocol,
        description: desc,
        testedCommands: testCommands.map(tc => tc.cmd),
      },
    );

    return false;
  },

  async tryProtocolWithEcuDetection(protocol, desc, canConfig = null) {
    try {
      if (typeof protocol !== 'number' || protocol < 0 || protocol > 9) {
        this.handlers.log?.('error', '[ELM-Helper] Invalid protocol number', {
          protocol,
          description: desc,
        });

        return false;
      }

      this.handlers.log?.(
        'debug',
        `[ELM-Helper] Testing protocol configuration`,
        {
          protocol,
          description: desc,
          canConfig: canConfig ? 'Using custom CAN config' : 'Standard config',
        },
      );

      // Set protocol
      await this.sendCommand(`ATSP${protocol}`);
      await this.delay(DELAYS.PROTOCOL);

      // Try 0100 command first
      await this.handle0100Command(3);

      // Protocol specific settings
      if (canConfig) {
        this.handlers.log?.(
          'debug',
          '[ELM-Helper] Applying CAN protocol configuration',
          canConfig,
        );
        const canCommands = [
          { cmd: 'ATCAF1', desc: 'CAN Formatting ON' },
          { cmd: `ATSH${canConfig.header}`, desc: 'Set Header' },
          { cmd: `ATCF${canConfig.receiveFilter}`, desc: 'Set Filter' },
        ];

        for (const { cmd, desc } of canCommands) {
          this.handlers.log?.('debug', `[ELM-Helper] ${desc}`, {
            command: cmd,
          });
          await this.sendCommand(cmd);
        }
      }

      // Test sequence for additional commands
      const testCommands = [
        { cmd: '0902', desc: 'VIN Message', needsFlowControl: true },
        { cmd: '0901', desc: 'VIN Data', needsFlowControl: true },
      ];

      for (const { cmd, desc, needsFlowControl } of testCommands) {
        this.handlers.log?.('debug', `[ELM-Helper] Testing ${desc}`, {
          command: cmd,
          protocol,
          description: desc,
        });

        // First try without flow control
        await this.sendCommand('ATFCSM0');
        let response = await this.sendCommand(cmd);

        // If response indicates need for flow control, try with flow control
        if (
          needsFlowControl &&
          canConfig &&
          (!this.isValidResponse(response) ||
            response.includes('WAITING') ||
            this.isErrorResponse(response))
        ) {
          this.handlers.log?.(
            'debug',
            `[ELM-Helper] Attempting with flow control for ${desc}`,
          );

          // Try different flow control configurations for this specific command
          const flowControlSuccess = await this.tryFlowControlConfigs(
            canConfig.flowControl,
            cmd,
          );

          if (flowControlSuccess) {
            response = await this.sendCommand(cmd);
          }
        }

        if (!response) {
          this.handlers.log?.('debug', `[ELM-Helper] No response for ${desc}`, {
            command: cmd,
            protocol,
          });
          continue;
        }

        // Check for error responses
        const errorPatterns = Object.values(RESPONSE_PATTERNS.ERROR);

        if (errorPatterns.some(pattern => response.includes(pattern))) {
          this.handlers.log?.('debug', `[ELM-Helper] Error response received`, {
            command: cmd,
            response,
            protocol,
          });
          continue;
        }

        // Check for valid response
        if (this.isValidResponse(response)) {
          this.handlers.log?.('debug', `[ELM-Helper] Valid response received`, {
            command: cmd,
            response,
            protocol,
          });

          const ecuDetected = await this.handleEcuDetection(response);

          if (ecuDetected) {
            this.currentProtocol = protocol;
            await this.setProtocol(protocol);

            this.handlers.log?.(
              'success',
              `[ELM-Helper] Protocol validated successfully`,
              {
                protocol,
                description: desc,
                ecus: Array.from(this.ecuAddresses),
                response,
              },
            );

            return true;
          }
        }

        await this.delay(DELAYS.PROTOCOL);
      }

      this.handlers.log?.(
        'debug',
        `[ELM-Helper] Protocol ${desc} failed validation`,
        {
          protocol,
          description: desc,
        },
      );

      return false;
    } catch (error) {
      this.handlers.log?.('error', `[ELM-Helper] Protocol test failed`, {
        protocol,
        description: desc,
        error: error.message,
      });

      return false;
    }
  },

  async tryFlowControlConfigs(flowControlAddress, testCommand) {
    const flowControlConfigs = [
      // Standard configuration
      {
        fcsh: flowControlAddress,
        fcsd: '300000',
        fcsm: '1',
        desc: 'Standard flow control',
      },
      // Alternative with shorter wait time
      {
        fcsh: flowControlAddress,
        fcsd: '300000',
        fcsm: '0',
        desc: 'No wait flow control',
      },
      // Alternative with longer wait time
      {
        fcsh: flowControlAddress,
        fcsd: '300008',
        fcsm: '1',
        desc: 'Extended wait flow control',
      },
      // Alternative with different block size
      {
        fcsh: flowControlAddress,
        fcsd: '300400',
        fcsm: '1',
        desc: 'Different block size flow control',
      },
    ];

    for (const config of flowControlConfigs) {
      this.handlers.log?.(
        'debug',
        `[ELM-Helper] Trying ${config.desc}`,
        config,
      );

      await this.sendCommand(`ATFCSH${config.fcsh}`);
      await this.sendCommand(`ATFCSD${config.fcsd}`);
      await this.sendCommand(`ATFCSM${config.fcsm}`);

      const testResponse = await this.sendCommand(testCommand);

      if (
        this.isValidResponse(testResponse) &&
        !this.isErrorResponse(testResponse)
      ) {
        this.handlers.log?.(
          'success',
          `[ELM-Helper] Flow control established with ${config.desc}`,
        );

        return true;
      }

      await this.delay(DELAYS.PROTOCOL);
    }

    this.handlers.log?.(
      'warn',
      '[ELM-Helper] Could not establish optimal flow control',
    );

    return false;
  },

  async firstCommand() {
    const firstResponse = await this.sendCommand('\r');

    if (
      typeof firstResponse === 'string' &&
      firstResponse.includes(DEMO_DEVICE)
    ) {
      this.handlers.log?.('info', '[ELM-Helper] Demo device detected');
      this.currentProtocol = 0;
      await this.handlers.setProtocol(this.currentProtocol);

      return 'demo';
    }

    return 'normal';
  },

  // Delegate core functionality to ElmProtocolInit
  getProtocolTimingConfig(...args) {
    return ElmProtocolInit.getProtocolTimingConfig.call(this, ...args);
  },

  getProtocolEcuConfig(...args) {
    return ElmProtocolInit.getProtocolEcuConfig.call(this, ...args);
  },

  getValidPatternsForProtocol(...args) {
    return ElmProtocolInit.getValidPatternsForProtocol.call(this, ...args);
  },

  initializeAdaptiveTiming(...args) {
    return ElmProtocolInit.initializeAdaptiveTiming.call(this, ...args);
  },
  // Core helper methods
  isCanProtocol(protocol) {
    if (!protocol) return false;

    // CAN protocols are typically 6 and above in the ELM327
    return protocol >= 6 && protocol <= 12;
  },

  // Delegate core protocol operations to ElmProtocolInit
  createCommand(...args) {
    return ElmProtocolInit.createCommand.call(this, ...args);
  },

  getResponseId(...args) {
    return ElmProtocolInit.getResponseId.call(this, ...args);
  },

  delay(...args) {
    return ElmProtocolInit.delay.call(this, ...args);
  },

  reset(...args) {
    return ElmProtocolInit.reset.call(this, ...args);
  },

  setProtocol(...args) {
    return ElmProtocolInit.setProtocol.call(this, ...args);
  },

  sendCommand(...args) {
    return ElmProtocolInit.sendCommand.call(this, ...args);
  },

  isValidResponse(...args) {
    return ElmProtocolInit.isValidResponse.call(this, ...args);
  },

  setStatus(status) {
    return ElmProtocolInit.setStatus.call(this, status);
  },

  getStatus() {
    return ElmProtocolInit.getStatus.call(this);
  },

  isErrorResponse(...args) {
    return ElmProtocolInit.isErrorResponse.call(this, ...args);
  },

  isValidResponseFormat(...args) {
    return ElmProtocolInit.isValidResponseFormat.call(this, ...args);
  },

  isValidVinResponse(...args) {
    return ElmProtocolInit.isValidVinResponse.call(this, ...args);
  },

  selectEcu(...args) {
    return ElmProtocolInit.selectEcu.call(this, ...args);
  },

  handle0100Command(...args) {
    return ElmProtocolInit.handle0100Command.call(this, ...args);
  },

  checkProtocolNumber(...args) {
    return ElmProtocolInit.checkProtocolNumber.call(this, ...args);
  },
};

export default ElmProtocolHelper;

export const flushEverything = () =>
  ElmProtocolInit.flushEverything(ElmProtocolHelper);
