export interface IObdPID {
  mode: Modes;
  pid: string | undefined;
  bytes: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 9;
  name: string;
  description: string;
  min: number;
  max: number;
  unit: string;
  convertToUseful?: (
    ...args: string[]
  ) =>
    | number
    | string
    | Record<string, number>
    | boolean[]
    | Record<string, number | undefined>;
}

export enum Modes {
  '01' = '01',
  '03' = '03',
  '04' = '04',
  '09' = '09', // VIN mode
}

export interface IParsedOBDResponse
  extends Partial<Pick<IObdPID, 'mode' | 'pid' | 'name' | 'unit'>> {
  value?: number | string | Record<string, number> | boolean[];
}

export type IObdPIDDescriptor = Omit<IObdPID, 'convertToUseful'>;
