import { CanDecoder } from './Support/Can.js';
import { NonCanDecoder } from './Support/NonCan.js';
import { LogLevel, DTCObject, DTCResult } from './dtc.js';
import { DecoderConfig, DTCMode, DTCStatus } from './dtc.js';
import { toHexString, formatMessage } from '../utils.js';
import { handleFrameSequence } from './utils/dtcDecoder.js';

const DTC_MODES: Record<string, DTCMode> = {
  MODE03: {
    REQUEST: '03',
    RESPONSE: 0x43,
    DIVIDER: 1,
    NAME: 'CURRENT',
    DESCRIPTION: 'Current DTCs',
  },
  MODE07: {
    REQUEST: '07',
    RESPONSE: 0x47,
    DIVIDER: 1,
    NAME: 'PENDING',
    DESCRIPTION: 'Pending DTCs',
  },
  MODE0A: {
    REQUEST: '0A',
    RESPONSE: 0x4a,
    DIVIDER: 1,
    NAME: 'PERMANENT',
    DESCRIPTION: 'Permanent DTCs',
  },
} as const;

export class DTCBaseDecoder {
  private readonly decoder: CanDecoder | NonCanDecoder;
  private readonly serviceMode: string;
  private readonly troubleCodeType: string;
  private readonly logPrefix: string;

  constructor(config: DecoderConfig) {
    const { isCan = false, serviceMode, troubleCodeType, logPrefix } = config;

    // Set the service mode first so getModeResponseByte() can properly determine the response byte
    this.serviceMode = serviceMode.toUpperCase();
    this.troubleCodeType = troubleCodeType;
    this.logPrefix = `${logPrefix} [DTC-${isCan ? 'CAN' : 'NonCAN'}]`;

    // Get mode response after setting serviceMode
    const modeResponse = this.getModeResponseByte();

    // Use the correct mode response byte for both CAN and non-CAN decoders
    this.decoder = isCan ? new CanDecoder(modeResponse) : new NonCanDecoder();
    if (!isCan) {
      (this.decoder as NonCanDecoder).setModeResponse(modeResponse);
    } else {
      (this.decoder as CanDecoder).setModeResponse(modeResponse);
    }

    // Reference the methods rather than binding them to avoid property conflicts
    const decoderAny = this.decoder as unknown;
    if (
      typeof (
        decoderAny as {
          _log?: (level: LogLevel, ...message: unknown[]) => void;
        }
      )._log !== 'function'
    ) {
      (
        decoderAny as {
          _log?: (level: LogLevel, ...message: unknown[]) => void;
        }
      )._log = this.log.bind(this);
    }
    if (
      typeof (decoderAny as { setDTC?: (dtc: string) => void }).setDTC !==
      'function'
    ) {
      (decoderAny as { setDTC?: (dtc: string) => void }).setDTC =
        this.setDTC.bind(this);
    }
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    if (!this.validateServiceMode(this.serviceMode)) {
      return [];
    }

    // Handle frame sequences and normalize
    const processedFrames = handleFrameSequence(rawResponseBytes);

    return this.decoder.decodeDTCs(processedFrames);
  }

  public getRawDTCs(): DTCObject[] {
    const rawDtcs = this.decoder.getRawDTCs() as DTCResult[];
    // Convert string DTCs to DTCObject format if needed
    return rawDtcs.map(dtc => {
      if (typeof dtc === 'string') {
        // Convert string DTC to DTCObject format
        const match = dtc.match(/^([PCBU])(\d)(\d)(\d{2})$/);
        if (match) {
          const [, category, d2, d3, d45] = match;
          return {
            type: 'PCBU'.indexOf(category),
            digit2: parseInt(d2),
            digit3: parseInt(d3),
            digits45: parseInt(d45, 16),
          };
        }
        // Return a default DTCObject if string format is invalid
        return {
          type: 0,
          digit2: 0,
          digit3: 0,
          digits45: 0,
        };
      }
      return dtc;
    });
  }

  public parseDTCStatus(statusByte: number): DTCStatus {
    // Convert status byte to hex for logging
    const statusHex = toHexString(statusByte);
    this.log('debug', `Parsing DTC status: ${statusHex}`);

    // Extract MIL status
    const milActive = (statusByte & 0x80) !== 0;

    // Simple DTC count case - when value is less than 0x20 and MIL is not set
    if (!milActive && statusByte < 0x20) {
      return {
        milActive: false,
        dtcCount: statusByte,
        currentError: false,
        pendingError: false,
        confirmedError: false,
        egrSystem: false,
        oxygenSensor: false,
        catalyst: false,
      };
    }

    // Parse individual status bits
    return {
      milActive,
      dtcCount: milActive ? statusByte & 0x7f : statusByte & 0x0f,
      currentError: (statusByte & 0x20) !== 0,
      pendingError: (statusByte & 0x10) !== 0,
      confirmedError: (statusByte & 0x08) !== 0,
      egrSystem: (statusByte & 0x04) !== 0,
      oxygenSensor: (statusByte & 0x02) !== 0,
      catalyst: (statusByte & 0x01) !== 0,
    };
  }

  private getModeResponseByte(): number {
    if (!this.serviceMode) {
      this.log(
        'error',
        formatMessage(
          `Invalid service mode: ${this.serviceMode}`,
          this.logPrefix,
        ),
      );
      return 0x43; // Default to mode 03 response
    }

    const upperMode = this.serviceMode.toUpperCase();
    const service = Object.values(DTC_MODES).find(s => s.REQUEST === upperMode);
    if (!service) {
      this.log('error', `Invalid service mode: ${this.serviceMode}`);
      return 0x43;
    }
    return service.RESPONSE;
  }

  private validateServiceMode(mode: string): boolean {
    if (!mode) {
      this.log('error', `Invalid service mode: ${mode}`);
      return false;
    }

    const upperMode = mode.toUpperCase();
    const isValid = Object.values(DTC_MODES).some(
      service => service.REQUEST === upperMode,
    );

    if (!isValid) {
      this.log('error', `Invalid service mode: ${mode}`);
    }
    return isValid;
  }

  private log(level: LogLevel, ...message: unknown[]): void {
    this._log(
      level,
      formatMessage(`[${level}] ${this.logPrefix}`, '', ''),
      ...message,
    );
  }

  private setDTC(dtc: string): void {
    this.log(
      'info',
      formatMessage(
        `Setting ${this.troubleCodeType} DTC: ${dtc}`,
        this.logPrefix,
      ),
    );
  }
}
