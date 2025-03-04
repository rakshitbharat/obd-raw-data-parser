import { CanDecoder } from "./Support/Can";
import { NonCanDecoder } from "./Support/NonCan";
import { DecoderConfig, DTCMode, DTCStatus, DTCObject, LogLevel } from "./dtc";
import { CanSingleFrame } from "./Support/CanSingleFrame";

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
  private readonly decoder: CanDecoder | NonCanDecoder | CanSingleFrame;
  private readonly serviceMode: string;
  private readonly troubleCodeType: string;
  private readonly logPrefix: string;

  constructor(config: DecoderConfig) {
    const { isCan = false, serviceMode, troubleCodeType, logPrefix } = config;

    // Convert service mode to mode response byte
    const modeResponse = this.getModeResponseFromServiceMode(serviceMode);
    
    // Create appropriate decoder with mode response
    if (isCan) {
      this.decoder = new CanSingleFrame(modeResponse);
    } else {
      this.decoder = new NonCanDecoder();
      if ('setModeResponse' in this.decoder) {
        this.decoder.setModeResponse(modeResponse);
      }
    }

    this.serviceMode = serviceMode;
    this.troubleCodeType = troubleCodeType;
    this.logPrefix = `${logPrefix} [DTC-${isCan ? "CAN" : "NonCAN"}]`;

    // Bind methods to decoder
    Object.defineProperties(this.decoder, {
      _log: { value: this._log.bind(this) },
      setDTC: { value: this.setDTC.bind(this) }
    });
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
      currentError: (statusByte & 0x01) !== 0,
      pendingError: (statusByte & 0x02) !== 0,
      confirmedError: (statusByte & 0x04) !== 0,
      egrSystem: (statusByte & 0x08) !== 0,
      oxygenSensor: (statusByte & 0x10) !== 0,
      catalyst: (statusByte & 0x20) !== 0,
    };
  }

  private getModeResponseFromServiceMode(serviceMode: string): number {
    // Convert service mode to uppercase hex format without leading 0x
    const modeKey = `MODE${serviceMode.toUpperCase()}`;
    const mode = DTC_MODES[modeKey];
    if (!mode) {
      throw new Error(`Invalid service mode: ${serviceMode}`);
    }
    return mode.RESPONSE;
  }

  private _validateServiceMode(mode: string): boolean {
    const validModes = ["03", "07", "0A"];
    if (!validModes.includes(mode)) {
      this._log("error", `Invalid service mode: ${mode}`);
      return false;
    }
    return true;
  }

  private _log(level: LogLevel, ...message: unknown[]): void {
    console.log(`[${this.logPrefix}] [${level}]`, ...message);
  }

  private setDTC(dtc: string): void {
    console.log(`Setting ${this.troubleCodeType} DTC: ${dtc}`);
  }
}
