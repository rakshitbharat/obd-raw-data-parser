import { CanDecoder } from './Support/Can';
import { NonCanDecoder } from './Support/NonCan';
import { DecoderConfig, DTCMode, DTCStatus, DTCObject, LogLevel } from './dtc';

const DTC_MODES: Record<string, DTCMode> = {
  MODE03: { REQUEST: '03', RESPONSE: 0x43, DIVIDER: 1, NAME: 'CURRENT', DESCRIPTION: 'Current DTCs' },
  MODE07: { REQUEST: '07', RESPONSE: 0x47, DIVIDER: 1, NAME: 'PENDING', DESCRIPTION: 'Pending DTCs' },
  MODE0A: { REQUEST: '0A', RESPONSE: 0x4a, DIVIDER: 1, NAME: 'PERMANENT', DESCRIPTION: 'Permanent DTCs' }
} as const;

export class DTCBaseDecoder {
  private readonly decoder: CanDecoder | NonCanDecoder;
  private readonly serviceMode: string;
  private readonly troubleCodeType: string;
  private readonly logPrefix: string;

  constructor(config: DecoderConfig) {
    const { isCan = false, serviceMode, troubleCodeType, logPrefix } = config;
    
    this.decoder = isCan ? new CanDecoder() : new NonCanDecoder();
    this.serviceMode = serviceMode;
    this.troubleCodeType = troubleCodeType;
    this.logPrefix = `${logPrefix} [DTC-${isCan ? 'CAN' : 'NonCAN'}]`;

    // Bind methods to decoder
    Object.defineProperties(this.decoder, {
      '_log': { value: this._log.bind(this) },
      'setDTC': { value: this.setDTC.bind(this) },
      'getModeResponseByte': { value: this.getModeResponseByte.bind(this) }
    });
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    if (!this._validateServiceMode(this.serviceMode)) {
      return [];
    }
    return this.decoder.decodeDTCs(rawResponseBytes);
  }

  public reset(): void {
    this.decoder.reset();
  }

  public dtcToString(dtc: DTCObject): string | null {
    return this.decoder['_dtcToString'](dtc);
  }

  public getRawDTCs(): DTCObject[] {
    return this.decoder.getRawDTCs();
  }

  public parseDTCStatus(statusByte: number): DTCStatus {
    return {
      milActive: (statusByte & 0x80) !== 0,
      dtcCount: statusByte & 0x7f,
      currentError: (statusByte & 0x20) !== 0,
      pendingError: (statusByte & 0x10) !== 0,
      confirmedError: (statusByte & 0x08) !== 0,
      egrSystem: (statusByte & 0x04) !== 0,
      oxygenSensor: (statusByte & 0x02) !== 0,
      catalyst: (statusByte & 0x01) !== 0
    };
  }

  private getModeResponseByte(): number {
    const service = Object.values(DTC_MODES).find(s => s.REQUEST === this.serviceMode);
    if (!service) {
      this._log('error', `Invalid service mode: ${this.serviceMode}`);
      return 0x00;
    }
    return service.RESPONSE;
  }

  private _validateServiceMode(mode: string): boolean {
    const isValid = Object.values(DTC_MODES).some(service => service.REQUEST === mode);
    if (!isValid) {
      this._log('error', `Invalid service mode: ${mode}`);
    }
    return isValid;
  }

  private _log(level: LogLevel, ...message: unknown[]): void {
    console.log(`[${level}] ${this.logPrefix}`, ...message);
  }

  private setDTC(dtc: string): void {
    console.log(`Setting ${this.troubleCodeType} DTC: ${dtc}`);
  }
}
