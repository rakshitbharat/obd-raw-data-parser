/* eslint-disable no-bitwise */


// Add helper function to format numbers
function formatNumber(value: number): number {
  return Number(value.toFixed(2));
}

// Helper types
function checkHex(n: string): boolean {
  return /^[0-9A-Fa-f]{1,64}$/.test(n);
}

function Hex2Bin(n: string): string {
  if (!checkHex(n)) {
    return '';
  }
  return zeroFill(parseInt(n, 16).toString(2), 4);
}

function zeroFill(number: string, width: number): string {
  width -= number.toString().length;
  if (width > 0) {
    return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
  }
  return number;
}

function bitDecoder(byte: string): number {
  return parseInt(byte, 2);
}

function convertPIDSupported(byteA: string, byteB: string, byteC: string, byteD: string): boolean[] {
  const hexstring = byteA + byteB + byteC + byteD;
  const pidHex = hexstring.split('');
  const pidStatus: boolean[] = [];
  pidHex.forEach((hex) => {
    const hexPerm = Hex2Bin(hex).split('');
    hexPerm.forEach((perm: string) => {
      pidStatus.push(perm === '1');
    });
  });
  return pidStatus;
}

interface FuelSystemResult {
  system1: number;
  system2?: number;
  [key: string]: number | undefined;  // Add index signature to allow optional properties
}

function convertFuelSystem(byteA: string, byteB?: string): FuelSystemResult {
  const reply: FuelSystemResult = {
    system1: bitDecoder(byteA)
  };
  if (byteB) {
    reply.system2 = bitDecoder(byteB);
  }
  return reply;
}

interface DTCCheckResult {
  numberOfErrors: number;
  mil: number;
  [key: string]: number;  // Add index signature
}

function convertDTCCheck(byteA: string): DTCCheckResult {
  const byteValue = parseInt(byteA, 16);
  const mil = byteValue >> 7 === 1 ? 1 : 0;
  const numberOfDTCs = byteValue % 128;
  return {
    numberOfErrors: numberOfDTCs,
    mil
  };
}

function convertLoad(byte: string) {
  return formatNumber(parseInt(byte, 16) * (100 / 256));
}
function convertTemp(byte: string) {
  return formatNumber(parseInt(byte, 16) - 40);
}
function convertFuelTrim(byte: string) {
  return formatNumber((parseInt(byte, 16) - 128) * (100 / 128));
}
function convertFuelRailPressure(byte: string) {
  return formatNumber(parseInt(byte, 16) * 3);
}
function convertIntakePressure(byte: string) {
  return parseInt(byte, 16); // Already an integer, no formatting needed
}
function convertRPM(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 4);
}
function convertSpeed(byte: string) {
  return parseInt(byte, 16); // Already an integer, no formatting needed
}
function convertSparkAdvance(byte: string) {
  return formatNumber(parseInt(byte, 16) / 2 - 64);
}
function convertAirFlowRate(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256.0 + parseInt(byteB, 16)) / 100);
}
function convertThrottlePos(byte: string) {
  return formatNumber((parseInt(byte, 16) * 100) / 255);
}
function convertOxygenSensorOutput(byte: string) {
  return formatNumber(parseInt(byte, 16) * 0.005);
}
function convertRuntime(byteA: string, byteB: string) {
  return formatNumber(parseInt(byteA, 16) * 256.0 + parseInt(byteB, 16));
}
function convertfrpm(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 0.079);
}
function convertfrpd(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 10);
}

interface LambdaResponse {
  ratio: number;
  voltage: number;
  [key: string]: number;  // Add index signature
}

function convertLambda(
  byteA: string,
  byteB: string,
  byteC: string,
  byteD: string,
): LambdaResponse {
  const reply: LambdaResponse = {
    ratio: formatNumber(((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 2) / 65535),
    voltage: formatNumber(((parseInt(byteC, 16) * 256 + parseInt(byteD, 16)) * 8) / 65535)
  };
  return reply;
}

function convertPercentA(byte: string) {
  return formatNumber((parseInt(byte, 16) * 100) / 255);
}
function convertPercentB(byte: string) {
  return formatNumber(((parseInt(byte, 16) - 128) * 100) / 128);
}
function convertDistanceSinceCodesCleared(byteA: string, byteB: string) {
  return formatNumber(parseInt(byteA, 16) * 256 + parseInt(byteB, 16));
}

function convertLambda2(
  byteA: string,
  byteB: string,
  byteC: string,
  byteD: string,
): LambdaResponse {
  const reply: LambdaResponse = {
    ratio: formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 32768),
    voltage: formatNumber((parseInt(byteC, 16) * 256 + parseInt(byteD, 16)) / 256 - 128)
  };
  return reply;
}

function convertCatalystTemperature(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 10 - 40);
}
function convertControlModuleVoltage(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 1000);
}
function convertAbsoluteLoad(byteA: string, byteB: string) {
  return formatNumber(((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 100) / 255);
}
function convertLambda3(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 32768);
}
function convertAmbientAirTemp(byte: string) {
  return formatNumber(parseInt(byte, 16) - 40);
}
function convertMinutes(byteA: string, byteB: string) {
  return formatNumber(parseInt(byteA, 16) * 256 + parseInt(byteB, 16));
}

interface ExternalTestResponse {
  te1: number;
  te2: number;
  te3: number;
  te4: number;
  [key: string]: number;  // Add index signature
}

function convertExternalTestEquipment(
  byteA: string,
  byteB: string,
  byteC: string,
  byteD: string,
): ExternalTestResponse {
  const reply: ExternalTestResponse = {
    te1: bitDecoder(byteA),
    te2: bitDecoder(byteB),
    te3: bitDecoder(byteC),
    te4: bitDecoder(byteD) * 10
  };
  return reply;
}

function convertExternalTestEquipment2(
  byteA: string,
  byteB: string,
  byteC: string,
  byteD: string,
): ExternalTestResponse {
  const reply: ExternalTestResponse = {
    te1: bitDecoder(byteA) * 10,
    te2: bitDecoder(byteB),
    te3: bitDecoder(byteC),
    te4: bitDecoder(byteD)
  };
  return reply;
}
function convertAbsoluteVaporPressure(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 200);
}
function convertSystemVaporPressure(byteA: string, byteB: string) {
  return formatNumber(parseInt(byteA, 16) * 256 + parseInt(byteB, 16) - 32767);
}

interface OxygenSensorOutput {
  bank1: number;
  bank2: number;
  [key: string]: number;  // Add index signature
}

function convertShortOxygenSensorOutput(byteA: string, byteB: string): OxygenSensorOutput {
  return {
    bank1: formatNumber(((parseInt(byteA, 16) - 128) * 100) / 128),
    bank2: formatNumber(((parseInt(byteB, 16) - 128) * 100) / 128)
  };
}

function convertFuelRailPressureAbs(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 10);
}
function convertFuelInjectionTiming(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16) - 26880) / 128);
}
function convertEngineFuelRate(byteA: string, byteB: string) {
  return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 0.05);
}

function convertEngineTorque(byte: string) {
  return formatNumber(parseInt(byte, 16) - 125);
}

function convertExhaustGasTemperature(byteA: string, byteB: string): number {
  const a = parseInt(byteA, 16);
  const b = parseInt(byteB, 16);
  return formatNumber((a * 256 + b) / 10 - 40);
}

const PIDS = {
  ENGINE_COOLANT_TEMPERATURE_SENSOR: '05',
  FUEL_PRESSURE_SENSOR: '0A',
  INTAKE_MANIFOLD_ABSOLUTE_PRESSURE_SENSOR: '0B',
  ENGINE_RPM: '0C',
  VEHICLE_SPEED_SENSOR: '0D',
  SPARK_ADVANCE: '0E',
  INTAKE_AIR_TEMPERATURE_SENSOR: '0F',
  MASS_AIR_FLOW_SENSOR: '10',
  THROTTLE_POSITION_SENSOR: '11',
  ENGINE_RUNTIME: '1F',
} as const;

// Export all conversion functions and PIDS constant
export {
  convertPIDSupported,
  convertDTCCheck,
  bitDecoder,
  convertFuelSystem,
  convertLoad,
  convertTemp,
  convertFuelTrim,
  convertFuelRailPressure,
  convertIntakePressure,
  convertRPM,
  convertSpeed,
  convertSparkAdvance,
  convertAirFlowRate,
  convertThrottlePos,
  convertOxygenSensorOutput,
  convertRuntime,
  convertfrpm,
  convertfrpd,
  convertLambda,
  convertPercentA,
  convertPercentB,
  convertDistanceSinceCodesCleared,
  convertLambda2,
  convertCatalystTemperature,
  convertControlModuleVoltage,
  convertAbsoluteLoad,
  convertLambda3,
  convertAmbientAirTemp,
  convertMinutes,
  convertExternalTestEquipment,
  convertExternalTestEquipment2,
  convertAbsoluteVaporPressure,
  convertSystemVaporPressure,
  convertShortOxygenSensorOutput,
  convertFuelRailPressureAbs,
  convertFuelInjectionTiming,
  convertEngineFuelRate,
  convertEngineTorque,
  convertExhaustGasTemperature,
  PIDS,
};
