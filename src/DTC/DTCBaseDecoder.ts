import { CanDecoder } from "./Support/Can.js";
import { NonCanDecoder } from "./Support/NonCan.js";
import { DecoderConfig, DTCMode, DTCStatus, DTCObject, LogLevel } from "./dtc.js";

const DTC_MODES: Record<string, DTCMode> = {
  MODE03: {
    REQUEST: "03",
    RESPONSE: 0x43,
    DIVIDER: 1,
    NAME: "CURRENT",
    DESCRIPTION: "Current DTCs",
  },
  MODE07: {
    REQUEST: "07",
    RESPONSE: 0x47,
    DIVIDER: 1,
    NAME: "PENDING",
    DESCRIPTION: "Pending DTCs",
  },
  MODE0A: {
    REQUEST: "0A",
    RESPONSE: 0x4a,
    DIVIDER: 1,
    NAME: "PERMANENT",
    DESCRIPTION: "Permanent DTCs",
  },
} as const;

export class DTCBaseDecoder {
  private readonly decoder: CanDecoder | NonCanDecoder;
  private readonly serviceMode: string;
  private readonly troubleCodeType: string;
  private readonly logPrefix: string;

  constructor(config: DecoderConfig) {
    const { isCan = false, serviceMode, troubleCodeType, logPrefix } = config;

    // Get mode response before creating decoder
    const modeResponse = this.getModeResponseByte();
    
    // Use the correct mode response byte for both CAN and non-CAN decoders
    this.decoder = isCan ? new CanDecoder(modeResponse) : new NonCanDecoder();
    if (!isCan) {
      (this.decoder as NonCanDecoder).setModeResponse(modeResponse);
    } else {
      (this.decoder as CanDecoder).setModeResponse(modeResponse);
    }
    this.serviceMode = serviceMode.toUpperCase();
    this.troubleCodeType = troubleCodeType;
    this.logPrefix = `${logPrefix} [DTC-${isCan ? "CAN" : "NonCAN"}]`;

    // Reference the methods rather than binding them to avoid property conflicts
    const decoderAny = this.decoder as any;
    if (typeof decoderAny._log !== 'function') {
      decoderAny._log = this._log.bind(this);
    }
    if (typeof decoderAny.setDTC !== 'function') {
      decoderAny.setDTC = this.setDTC.bind(this);
    }
  }

  public decodeDTCs(rawResponseBytes: number[][]): string[] {
    if (!this._validateServiceMode(this.serviceMode)) {
      return [];
    }
    return this.decoder.decodeDTCs(rawResponseBytes);
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
      catalyst: (statusByte & 0x01) !== 0,
    };
  }

  private getModeResponseByte(): number {
    const service = Object.values(DTC_MODES).find(
      (s) => s.REQUEST === this.serviceMode
    );
    if (!service) {
      this._log("error", `Invalid service mode: ${this.serviceMode}`);
      return 0x43;
    }
    return service.RESPONSE;
  }

  private _validateServiceMode(mode: string): boolean {
    const upperMode = mode.toUpperCase();
    const isValid = Object.values(DTC_MODES).some(
      (service) => service.REQUEST === upperMode
    );
    if (!isValid) {
      this._log("error", `Invalid service mode: ${mode}`);
    }
    return isValid;
  }

  private _log(level: LogLevel, ...message: unknown[]): void {
    if (false == false) {
      return;
    }
    console.log(`[${level}] ${this.logPrefix}`, ...message);
  }

  private setDTC(dtc: string): void {
    console.log(`Setting ${this.troubleCodeType} DTC: ${dtc}`);
  }
}
