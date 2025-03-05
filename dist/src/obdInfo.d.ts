declare function bitDecoder(byte: string): number;
declare function convertPIDSupported(byteA: string, byteB: string, byteC: string, byteD: string): boolean[];
interface FuelSystemResult {
    system1: number;
    system2?: number;
    [key: string]: number | undefined;
}
declare function convertFuelSystem(byteA: string, byteB?: string): FuelSystemResult;
interface DTCCheckResult {
    numberOfErrors: number;
    mil: number;
    [key: string]: number;
}
declare function convertDTCCheck(byteA: string): DTCCheckResult;
declare function convertLoad(byte: string): number;
declare function convertTemp(byte: string): number;
declare function convertFuelTrim(byte: string): number;
declare function convertFuelRailPressure(byte: string): number;
declare function convertIntakePressure(byte: string): number;
declare function convertRPM(byteA: string, byteB: string): number;
declare function convertSpeed(byte: string): number;
declare function convertSparkAdvance(byte: string): number;
declare function convertAirFlowRate(byteA: string, byteB: string): number;
declare function convertThrottlePos(byte: string): number;
declare function convertOxygenSensorOutput(byte: string): number;
declare function convertRuntime(byteA: string, byteB: string): number;
declare function convertfrpm(byteA: string, byteB: string): number;
declare function convertfrpd(byteA: string, byteB: string): number;
interface LambdaResponse {
    ratio: number;
    voltage: number;
    [key: string]: number;
}
declare function convertLambda(byteA: string, byteB: string, byteC: string, byteD: string): LambdaResponse;
declare function convertPercentA(byte: string): number;
declare function convertPercentB(byte: string): number;
declare function convertDistanceSinceCodesCleared(byteA: string, byteB: string): number;
declare function convertLambda2(byteA: string, byteB: string, byteC: string, byteD: string): LambdaResponse;
declare function convertCatalystTemperature(byteA: string, byteB: string): number;
declare function convertControlModuleVoltage(byteA: string, byteB: string): number;
declare function convertAbsoluteLoad(byteA: string, byteB: string): number;
declare function convertLambda3(byteA: string, byteB: string): number;
declare function convertAmbientAirTemp(byte: string): number;
declare function convertMinutes(byteA: string, byteB: string): number;
interface ExternalTestResponse {
    te1: number;
    te2: number;
    te3: number;
    te4: number;
    [key: string]: number;
}
declare function convertExternalTestEquipment(byteA: string, byteB: string, byteC: string, byteD: string): ExternalTestResponse;
declare function convertExternalTestEquipment2(byteA: string, byteB: string, byteC: string, byteD: string): ExternalTestResponse;
declare function convertAbsoluteVaporPressure(byteA: string, byteB: string): number;
declare function convertSystemVaporPressure(byteA: string, byteB: string): number;
interface OxygenSensorOutput {
    bank1: number;
    bank2: number;
    [key: string]: number;
}
declare function convertShortOxygenSensorOutput(byteA: string, byteB: string): OxygenSensorOutput;
declare function convertFuelRailPressureAbs(byteA: string, byteB: string): number;
declare function convertFuelInjectionTiming(byteA: string, byteB: string): number;
declare function convertEngineFuelRate(byteA: string, byteB: string): number;
declare function convertEngineTorque(byte: string): number;
declare function convertExhaustGasTemperature(byteA: string, byteB: string): number;
declare const PIDS: {
    readonly ENGINE_COOLANT_TEMPERATURE_SENSOR: "05";
    readonly FUEL_PRESSURE_SENSOR: "0A";
    readonly INTAKE_MANIFOLD_ABSOLUTE_PRESSURE_SENSOR: "0B";
    readonly ENGINE_RPM: "0C";
    readonly VEHICLE_SPEED_SENSOR: "0D";
    readonly SPARK_ADVANCE: "0E";
    readonly INTAKE_AIR_TEMPERATURE_SENSOR: "0F";
    readonly MASS_AIR_FLOW_SENSOR: "10";
    readonly THROTTLE_POSITION_SENSOR: "11";
    readonly ENGINE_RUNTIME: "1F";
};
export { convertPIDSupported, convertDTCCheck, bitDecoder, convertFuelSystem, convertLoad, convertTemp, convertFuelTrim, convertFuelRailPressure, convertIntakePressure, convertRPM, convertSpeed, convertSparkAdvance, convertAirFlowRate, convertThrottlePos, convertOxygenSensorOutput, convertRuntime, convertfrpm, convertfrpd, convertLambda, convertPercentA, convertPercentB, convertDistanceSinceCodesCleared, convertLambda2, convertCatalystTemperature, convertControlModuleVoltage, convertAbsoluteLoad, convertLambda3, convertAmbientAirTemp, convertMinutes, convertExternalTestEquipment, convertExternalTestEquipment2, convertAbsoluteVaporPressure, convertSystemVaporPressure, convertShortOxygenSensorOutput, convertFuelRailPressureAbs, convertFuelInjectionTiming, convertEngineFuelRate, convertEngineTorque, convertExhaustGasTemperature, PIDS, };
