/* eslint-disable no-bitwise */
// Add helper function to format numbers
function formatNumber(value) {
    return Number(value.toFixed(2));
}
// Helper types
function checkHex(n) {
    return /^[0-9A-Fa-f]{1,64}$/.test(n);
}
function Hex2Bin(n) {
    if (!checkHex(n)) {
        return '';
    }
    return zeroFill(parseInt(n, 16).toString(2), 4);
}
function zeroFill(number, width) {
    width -= number.toString().length;
    if (width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
    }
    return number;
}
function bitDecoder(byte) {
    return parseInt(byte, 2);
}
function convertPIDSupported(byteA, byteB, byteC, byteD) {
    const hexstring = byteA + byteB + byteC + byteD;
    const pidHex = hexstring.split('');
    const pidStatus = [];
    pidHex.forEach((hex) => {
        const hexPerm = Hex2Bin(hex).split('');
        hexPerm.forEach((perm) => {
            pidStatus.push(perm === '1');
        });
    });
    return pidStatus;
}
function convertFuelSystem(byteA, byteB) {
    const reply = {
        system1: bitDecoder(byteA)
    };
    if (byteB) {
        reply.system2 = bitDecoder(byteB);
    }
    return reply;
}
function convertDTCCheck(byteA) {
    const byteValue = parseInt(byteA, 16);
    const mil = byteValue >> 7 === 1 ? 1 : 0;
    const numberOfDTCs = byteValue % 128;
    return {
        numberOfErrors: numberOfDTCs,
        mil
    };
}
function convertLoad(byte) {
    return formatNumber(parseInt(byte, 16) * (100 / 256));
}
function convertTemp(byte) {
    return formatNumber(parseInt(byte, 16) - 40);
}
function convertFuelTrim(byte) {
    return formatNumber((parseInt(byte, 16) - 128) * (100 / 128));
}
function convertFuelRailPressure(byte) {
    return formatNumber(parseInt(byte, 16) * 3);
}
function convertIntakePressure(byte) {
    return parseInt(byte, 16); // Already an integer, no formatting needed
}
function convertRPM(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 4);
}
function convertSpeed(byte) {
    return parseInt(byte, 16); // Already an integer, no formatting needed
}
function convertSparkAdvance(byte) {
    return formatNumber(parseInt(byte, 16) / 2 - 64);
}
function convertAirFlowRate(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256.0 + parseInt(byteB, 16)) / 100);
}
function convertThrottlePos(byte) {
    return formatNumber((parseInt(byte, 16) * 100) / 255);
}
function convertOxygenSensorOutput(byte) {
    return formatNumber(parseInt(byte, 16) * 0.005);
}
function convertRuntime(byteA, byteB) {
    return formatNumber(parseInt(byteA, 16) * 256.0 + parseInt(byteB, 16));
}
function convertfrpm(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 0.079);
}
function convertfrpd(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 10);
}
function convertLambda(byteA, byteB, byteC, byteD) {
    const reply = {
        ratio: formatNumber(((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 2) / 65535),
        voltage: formatNumber(((parseInt(byteC, 16) * 256 + parseInt(byteD, 16)) * 8) / 65535)
    };
    return reply;
}
function convertPercentA(byte) {
    return formatNumber((parseInt(byte, 16) * 100) / 255);
}
function convertPercentB(byte) {
    return formatNumber(((parseInt(byte, 16) - 128) * 100) / 128);
}
function convertDistanceSinceCodesCleared(byteA, byteB) {
    return formatNumber(parseInt(byteA, 16) * 256 + parseInt(byteB, 16));
}
function convertLambda2(byteA, byteB, byteC, byteD) {
    const reply = {
        ratio: formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 32768),
        voltage: formatNumber((parseInt(byteC, 16) * 256 + parseInt(byteD, 16)) / 256 - 128)
    };
    return reply;
}
function convertCatalystTemperature(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 10 - 40);
}
function convertControlModuleVoltage(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 1000);
}
function convertAbsoluteLoad(byteA, byteB) {
    return formatNumber(((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 100) / 255);
}
function convertLambda3(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 32768);
}
function convertAmbientAirTemp(byte) {
    return formatNumber(parseInt(byte, 16) - 40);
}
function convertMinutes(byteA, byteB) {
    return formatNumber(parseInt(byteA, 16) * 256 + parseInt(byteB, 16));
}
function convertExternalTestEquipment(byteA, byteB, byteC, byteD) {
    const reply = {
        te1: bitDecoder(byteA),
        te2: bitDecoder(byteB),
        te3: bitDecoder(byteC),
        te4: bitDecoder(byteD) * 10
    };
    return reply;
}
function convertExternalTestEquipment2(byteA, byteB, byteC, byteD) {
    const reply = {
        te1: bitDecoder(byteA) * 10,
        te2: bitDecoder(byteB),
        te3: bitDecoder(byteC),
        te4: bitDecoder(byteD)
    };
    return reply;
}
function convertAbsoluteVaporPressure(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) / 200);
}
function convertSystemVaporPressure(byteA, byteB) {
    return formatNumber(parseInt(byteA, 16) * 256 + parseInt(byteB, 16) - 32767);
}
function convertShortOxygenSensorOutput(byteA, byteB) {
    return {
        bank1: formatNumber(((parseInt(byteA, 16) - 128) * 100) / 128),
        bank2: formatNumber(((parseInt(byteB, 16) - 128) * 100) / 128)
    };
}
function convertFuelRailPressureAbs(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 10);
}
function convertFuelInjectionTiming(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16) - 26880) / 128);
}
function convertEngineFuelRate(byteA, byteB) {
    return formatNumber((parseInt(byteA, 16) * 256 + parseInt(byteB, 16)) * 0.05);
}
function convertEngineTorque(byte) {
    return formatNumber(parseInt(byte, 16) - 125);
}
function convertExhaustGasTemperature(byteA, byteB) {
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
};
// Export all conversion functions and PIDS constant
export { convertPIDSupported, convertDTCCheck, bitDecoder, convertFuelSystem, convertLoad, convertTemp, convertFuelTrim, convertFuelRailPressure, convertIntakePressure, convertRPM, convertSpeed, convertSparkAdvance, convertAirFlowRate, convertThrottlePos, convertOxygenSensorOutput, convertRuntime, convertfrpm, convertfrpd, convertLambda, convertPercentA, convertPercentB, convertDistanceSinceCodesCleared, convertLambda2, convertCatalystTemperature, convertControlModuleVoltage, convertAbsoluteLoad, convertLambda3, convertAmbientAirTemp, convertMinutes, convertExternalTestEquipment, convertExternalTestEquipment2, convertAbsoluteVaporPressure, convertSystemVaporPressure, convertShortOxygenSensorOutput, convertFuelRailPressureAbs, convertFuelInjectionTiming, convertEngineFuelRate, convertEngineTorque, convertExhaustGasTemperature, PIDS, };
