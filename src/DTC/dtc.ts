export interface DTCMode {
  readonly REQUEST: string;
  readonly RESPONSE: number;
  readonly DIVIDER: number;
  readonly NAME: string;
  readonly DESCRIPTION: string;
}

export interface DTCModes {
  readonly [key: string]: {
    readonly RESPONSE: number;
    readonly DESCRIPTION: string;
  };
}

export interface DTCObject {
  readonly type: number;      // 0-3 (P, C, B, U)
  readonly digit2: number;    // 0-3
  readonly digit3: number;    // 0-15
  readonly digits45: number;  // 0-255
}

export type DTCResult = string | DTCObject;

export interface DTCStatus {
  readonly milActive: boolean;      // Malfunction Indicator Lamp status
  readonly dtcCount: number;        // Number of DTCs
  readonly currentError: boolean;   // Current DTC present
  readonly pendingError: boolean;   // Pending DTC present
  readonly confirmedError: boolean; // Confirmed DTC present
  readonly egrSystem: boolean;      // EGR System status
  readonly oxygenSensor: boolean;   // Oxygen Sensor status
  readonly catalyst: boolean;       // Catalyst status
}

export interface DecoderConfig {
  readonly isCan?: boolean;         // Whether to use CAN or Non-CAN decoder
  readonly serviceMode: string;     // Mode of operation (03, 07, 0A)
  readonly troubleCodeType: string; // Type of trouble code being decoded
  readonly logPrefix: string;       // Prefix for logging messages
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFunction = (level: LogLevel, ...message: unknown[]) => void;
export type SetDTCFunction = (dtc: string) => void;
