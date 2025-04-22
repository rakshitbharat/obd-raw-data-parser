import {
  DELAYS,
  PROT,
  PROT_DESCRIPTIONS,
  PROTOCOL_PRIORITIES,
} from '@src/helper/OBDManagerHelper/OBDUtils';

import ElmProtocolHelper from './ElmProtocolHelper';
import ElmProtocolInit from './ElmProtocolInit';
import ElmProtocolTelegramProtocol from './ElmProtocolTelegramProtocol';
import Protocol from './Protocol';

/**
 * Manages ELM protocol communication and state.
 * Extends Protocol class for base functionality.
 */
class ElmProtocol extends Protocol {
  static PROT = PROT;
  static PROT_DESCRIPTIONS = PROT_DESCRIPTIONS;
  static instance = null;

  /**
   * Creates a new ElmProtocol instance with trait-based method mixing
   * @param {Object} handlers - Protocol handlers
   */
  constructor(handlers) {
    if (ElmProtocol.instance) {
      ElmProtocol.instance.updateHandlers(handlers);

      return ElmProtocol.instance;
    }

    super(handlers);

    // Initialize all properties
    ElmProtocolInit.initializeProtocol(this, handlers);

    // Mix in all protocol methods as traits
    this.bindAllMethods();

    ElmProtocol.instance = this;

    return this;
  }

  /**
   * Get singleton instance
   * @param {Object} handlers - Protocol handlers
   * @returns {ElmProtocol} The singleton instance
   */
  static getInstance(handlers) {
    if (!ElmProtocol.instance) {
      new ElmProtocol(handlers);
    } else if (handlers) {
      ElmProtocol.instance.updateHandlers(handlers);
    }

    return ElmProtocol.instance;
  }

  /**
   * Reset singleton instance
   */
  static resetInstance() {
    if (ElmProtocol.instance) {
      ElmProtocol.instance.reset();
      ElmProtocol.instance = null;
    }
  }

  /**
   * Updates handlers and reinitializes protocol
   * @param {Object} handlers - New handlers
   */
  updateHandlers(handlers) {
    if (!handlers) return;

    // Update base protocol handlers
    super.updateHandlers(handlers);

    // Reinitialize protocol with new handlers
    ElmProtocolInit.initializeProtocol(this, handlers);

    // Rebind all methods to ensure proper context
    this.bindAllMethods();
  }

  /**
   * Binds all methods from helper classes as traits
   * @private
   */
  bindAllMethods() {
    // Mix in all protocol methods
    const boundMethods = new Set();

    // First bind protocol detection methods
    Object.getOwnPropertyNames(ElmProtocolTelegramProtocol).forEach(method => {
      if (
        Object.hasOwn(ElmProtocolTelegramProtocol, method) &&
        typeof ElmProtocolTelegramProtocol[method] === 'function' &&
        !boundMethods.has(method)
      ) {
        this[method] = ElmProtocolTelegramProtocol[method].bind(this);
        boundMethods.add(method);
      }
    });

    // Then bind helper methods, but skip if already bound
    Object.getOwnPropertyNames(ElmProtocolHelper).forEach(method => {
      if (
        Object.hasOwn(ElmProtocolHelper, method) &&
        typeof ElmProtocolHelper[method] === 'function' &&
        !boundMethods.has(method)
      ) {
        this[method] = ElmProtocolHelper[method].bind(this);
        boundMethods.add(method);
      }
    });
  }

  /**
   * Resets the protocol state
   */
  reset() {
    super.reset();
    // Clear all bound methods
    Object.getOwnPropertyNames(this).forEach(prop => {
      if (
        typeof this[prop] === 'function' &&
        (ElmProtocolTelegramProtocol[prop] || ElmProtocolHelper[prop])
      ) {
        delete this[prop];
      }
    });
    // Reinitialize with current handlers
    ElmProtocolInit.initializeProtocol(this, this.handlers);
  }

  async initialize() {
    try {
      this.handlers.log?.(
        'info',
        '[ELM] Starting protocol initialization sequence',
      );
      this.setStatus(Protocol.STATUS.INITIALIZING);

      await this.reset();
      await this.delay(DELAYS.RESET);

      const commands = [
        { cmd: 'ATL0', desc: 'Disable linefeeds' },
        { cmd: 'ATS0', desc: 'Disable spaces' },
        { cmd: 'ATH0', desc: 'Disable headers' },
        { cmd: 'ATE0', desc: 'Disable echo' },
        { cmd: 'ATSP0', desc: 'Set auto protocol' },
      ];

      for (const { cmd } of commands) {
        const response = await this.sendCommand(cmd);

        if (!this.isValidResponse(response)) {
          this.handlers.log?.(
            'error',
            `[ELM] Failed to initialize with command: ${cmd}`,
          );
          throw new Error(`Failed to initialize with command: ${cmd}`);
        }

        await this.delay(DELAYS.COMMAND);
      }

      const timingSuccess = await this.initializeAdaptiveTiming();

      if (!timingSuccess) {
        this.handlers.log?.(
          'warn',
          '[ELM] Adaptive timing initialization failed, using default timing',
        );
      }

      this.setStatus(Protocol.STATUS.INITIALIZED);
      this.handlers.log?.(
        'success',
        '[ELM] Protocol initialization completed successfully',
      );
    } catch (error) {
      this.setStatus(Protocol.STATUS.ERROR);
      this.handlers.log?.('error', '[ELM] Protocol initialization failed', {
        error: error.message,
        status: this.getStatus(),
      });
      throw error;
    }
  }

  async initializeDevice() {
    try {
      this.handlers.log?.(
        'info',
        '[ELM] Starting device initialization sequence',
      );
      this.setStatus(Protocol.STATUS.INITIALIZING);
      await this.delay(DELAYS.PROTOCOL);
      const initCommands = [];

      initCommands.push({ cmd: 'ATE0', desc: 'Echo off' });
      initCommands.push({ cmd: 'ATL0', desc: 'Linefeeds off' });
      initCommands.push({ cmd: 'ATS0', desc: 'Spaces off' });
      initCommands.push({ cmd: 'ATH0', desc: 'Headers off' });
      for (const { cmd } of initCommands) {
        const response = await this.sendCommand(cmd);

        if (!this.isValidResponse(response)) {
          this.handlers.log?.(
            'error',
            `[ELM] Failed to initialize with command: ${cmd}`,
          );
          throw new Error(`Failed to initialize with command: ${cmd}`);
        }

        await this.delay(DELAYS.PROTOCOL);
      }

      this.setStatus(Protocol.STATUS.INITIALIZED);
      this.handlers.log?.(
        'success',
        '[ELM] Device initialization completed successfully',
      );
    } catch (error) {
      this.setStatus(Protocol.STATUS.ERROR);
      this.handlers.log?.('error', '[ELM] Device initialization failed', {
        error: error.message,
        status: this.getStatus(),
      });
      throw error;
    }
  }

  async tryAllProtocols() {
    try {
      this.handlers.log?.(
        'info',
        '[ELM] Starting comprehensive protocol detection sequence',
      );

      await this.sendCommand('ATZ');
      await this.delay(DELAYS.RESET);

      const initCommands = [
        { cmd: 'ATE0', desc: 'Echo off' },
        { cmd: 'ATL0', desc: 'Linefeeds off' },
        { cmd: 'ATH1', desc: 'Headers on' },
        { cmd: 'ATST64', desc: 'Timeout 100ms' },
        { cmd: 'ATAT0', desc: 'Disable adaptive timing' },
      ];

      for (const { cmd } of initCommands) {
        await this.sendCommand(cmd);
      }

      await this.sendCommand('ATSP0');
      await this.handle0100Command();

      const { protocol: detectedProtocol } = await this.checkProtocolNumber();

      if (detectedProtocol) {
        let protocolConfigs = PROTOCOL_PRIORITIES.filter(
          p => p.protocol === detectedProtocol,
        ).sort((a, b) => a.priority - b.priority);

        if (protocolConfigs.length === 0) {
          const isCanProtocol = detectedProtocol >= 6 && detectedProtocol <= 9;
          const is11BitCan =
            isCanProtocol && (detectedProtocol === 6 || detectedProtocol === 8);
          const is29BitCan =
            isCanProtocol && (detectedProtocol === 7 || detectedProtocol === 9);

          const baseConfig = {
            protocol: detectedProtocol,
            desc:
              PROT_DESCRIPTIONS[detectedProtocol] || 'Auto-detected protocol',
            canType: is11BitCan ? '11bit' : is29BitCan ? '29bit' : null,
          };

          if (is11BitCan) {
            protocolConfigs = [
              {
                ...baseConfig,
                priority: 1,
                header: '7DF',
                receiveFilter: '7E8',
                flowControl: '7E0',
              },
              {
                ...baseConfig,
                priority: 1.5,
                desc: `${baseConfig.desc} Alt`,
                header: '7E0',
                receiveFilter: '7E8',
                flowControl: '7E0',
              },
            ];
          } else if (is29BitCan) {
            protocolConfigs = [
              {
                ...baseConfig,
                header: '18DB33F1',
                receiveFilter: '18DAF110',
                flowControl: '18DA10F1',
              },
            ];
          } else {
            protocolConfigs = [baseConfig];
          }
        }

        for (const config of protocolConfigs) {
          this.handlers.log?.(
            'info',
            `[ELM] Testing auto-detected protocol configuration`,
          );

          if (
            await this.tryProtocolWithEcuDetection(
              detectedProtocol,
              config.desc,
              config.canType
                ? {
                    header: config.header,
                    receiveFilter: config.receiveFilter,
                    flowControl: config.flowControl,
                  }
                : null,
            )
          ) {
            this.handlers.log?.(
              'success',
              '[ELM] Auto-detected protocol validated successfully',
            );

            return true;
          }
        }
      }

      const protocolsToTry = PROTOCOL_PRIORITIES.filter(
        p => p.protocol >= 1 && p.protocol <= 9,
      ).sort((a, b) => a.priority - b.priority);

      for (const config of protocolsToTry) {
        if (config.protocol === detectedProtocol) continue;

        this.handlers.log?.('info', `[ELM] Testing protocol: ${config.desc}`);

        await this.sendCommand('ATZ');
        await this.delay(DELAYS.RESET);
        await this.sendCommand('ATE0');
        await this.sendCommand('ATH1');

        if (
          await this.tryProtocolWithEcuDetection(
            config.protocol,
            config.desc,
            config.canType
              ? {
                  header: config.header,
                  receiveFilter: config.receiveFilter,
                  flowControl: config.flowControl,
                }
              : null,
          )
        ) {
          this.handlers.log?.(
            'success',
            '[ELM] Protocol validated successfully',
          );

          return true;
        }
      }

      this.handlers.log?.(
        'error',
        '[ELM] Protocol detection failed - all protocols tested without success',
      );

      return false;
    } catch (error) {
      this.handlers.log?.('error', '[ELM] Protocol detection sequence failed', {
        error: error.message,
        status: this.getStatus(),
      });

      return false;
    }
  }
}

export default ElmProtocol;
