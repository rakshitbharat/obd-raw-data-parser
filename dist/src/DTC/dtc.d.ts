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
    readonly type: number;
    readonly digit2: number;
    readonly digit3: number;
    readonly digits45: number;
}
export type DTCResult = string | DTCObject;
export interface DTCStatus {
    readonly milActive: boolean;
    readonly dtcCount: number;
    readonly currentError: boolean;
    readonly pendingError: boolean;
    readonly confirmedError: boolean;
    readonly egrSystem: boolean;
    readonly oxygenSensor: boolean;
    readonly catalyst: boolean;
}
export interface DecoderConfig {
    readonly isCan?: boolean;
    readonly serviceMode: string;
    readonly troubleCodeType: string;
    readonly logPrefix: string;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'warning';
export type LogFunction = (level: LogLevel, ...message: unknown[]) => void;
export type SetDTCFunction = (dtc: string) => void;
