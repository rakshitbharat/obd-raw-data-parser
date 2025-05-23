import { IObdPID, Modes } from './obdTypes';
import {
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
  convertfrpd,
  PIDS,
} from './obdInfo';

const modeRealTime: Modes = Modes['01'];

const responsePIDS: IObdPID[] = [
  //Realtime data
  {
    mode: modeRealTime,
    pid: '00',
    bytes: 4,
    name: 'pidsupp0',
    description: 'PIDs supported 00-20',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: convertPIDSupported,
  },
  {
    mode: modeRealTime,
    pid: '01',
    bytes: 4,
    name: 'dtc_cnt',
    description: 'Monitor status since DTCs cleared',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: convertDTCCheck,
  },
  {
    mode: modeRealTime,
    pid: '02',
    bytes: 2,
    name: 'dtcfrzf',
    description: 'DTC that caused required freeze frame data storage',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: '03',
    bytes: 2,
    name: 'fuelsys',
    description: 'Fuel system 1 and 2 status',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: convertFuelSystem,
  },
  {
    mode: modeRealTime,
    pid: '04',
    bytes: 1,
    name: 'load_pct',
    description: 'Calculated LOAD Value',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertLoad,
  },
  {
    mode: modeRealTime,
    pid: PIDS.ENGINE_COOLANT_TEMPERATURE_SENSOR,
    bytes: 1,
    name: 'temp',
    description: 'Engine Coolant Temperature',
    min: -40,
    max: 215,
    unit: 'Celsius',
    convertToUseful: convertTemp,
  },
  {
    mode: modeRealTime,
    pid: '06',
    bytes: 1,
    name: 'shrtft13',
    description: 'Short Term Fuel Trim - Bank 1,3',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertFuelTrim,
  },
  {
    mode: modeRealTime,
    pid: '07',
    bytes: 1,
    name: 'longft13',
    description: 'Long Term Fuel Trim - Bank 1,3',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertFuelTrim,
  },
  {
    mode: modeRealTime,
    pid: '08',
    bytes: 1,
    name: 'shrtft24',
    description: 'Short Term Fuel Trim - Bank 2,4',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertFuelTrim,
  },
  {
    mode: modeRealTime,
    pid: '09',
    bytes: 1,
    name: 'longft24',
    description: 'Long Term Fuel Trim - Bank 2,4',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertFuelTrim,
  },
  {
    mode: modeRealTime,
    pid: PIDS.FUEL_PRESSURE_SENSOR,
    bytes: 1,
    name: 'frp',
    description: 'Fuel Pressure',
    min: 0,
    max: 765,
    unit: 'kPa',
    convertToUseful: convertFuelRailPressure,
  },
  {
    mode: modeRealTime,
    pid: PIDS.INTAKE_MANIFOLD_ABSOLUTE_PRESSURE_SENSOR,
    bytes: 1,
    name: 'map',
    description: 'Intake Manifold Absolute Pressure',
    min: 0,
    max: 255,
    unit: 'kPa',
    convertToUseful: convertIntakePressure,
  },
  {
    mode: modeRealTime,
    pid: PIDS.ENGINE_RPM,
    bytes: 2,
    name: 'rpm',
    description: 'Engine RPM',
    min: 0,
    max: 16383.75,
    unit: 'rev/min',
    convertToUseful: convertRPM,
  },
  {
    mode: modeRealTime,
    pid: PIDS.VEHICLE_SPEED_SENSOR,
    bytes: 1,
    name: 'vss',
    description: 'Vehicle Speed Sensor',
    min: 0,
    max: 255,
    unit: 'km/h',
    convertToUseful: convertSpeed,
  },
  {
    mode: modeRealTime,
    pid: PIDS.SPARK_ADVANCE,
    bytes: 1,
    name: 'sparkadv',
    description: 'Ignition Timing Advance for #1 Cylinder',
    min: -64,
    max: 63.5,
    unit: 'degrees relative to #1 cylinder',
    convertToUseful: convertSparkAdvance,
  },
  {
    mode: modeRealTime,
    pid: PIDS.INTAKE_AIR_TEMPERATURE_SENSOR,
    bytes: 1,
    name: 'iat',
    description: 'Intake Air Temperature',
    min: -40,
    max: 215,
    unit: 'Celsius',
    convertToUseful: convertTemp,
  },
  {
    mode: modeRealTime,
    pid: PIDS.MASS_AIR_FLOW_SENSOR,
    bytes: 2,
    name: 'maf',
    description: 'Air Flow Rate from Mass Air Flow Sensor',
    min: 0,
    max: 655.35,
    unit: 'g/s',
    convertToUseful: convertAirFlowRate,
  },
  {
    mode: modeRealTime,
    pid: PIDS.THROTTLE_POSITION_SENSOR,
    bytes: 1,
    name: 'throttlepos',
    description: 'Absolute Throttle Position',
    min: 1,
    max: 100,
    unit: '%',
    convertToUseful: convertThrottlePos,
  },
  {
    mode: modeRealTime,
    pid: '12',
    bytes: 1,
    name: 'air_stat',
    description: 'Commanded Secondary Air Status',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: '13',
    bytes: 1,
    name: 'o2sloc',
    description: 'Location of Oxygen Sensors',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: '14',
    bytes: 2,
    name: 'o2s11',
    description:
      'Bank 1 - Sensor 1/Bank 1 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim',
    min: 0,
    max: 1.275,
    unit: 'V',
    convertToUseful: convertOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '15',
    bytes: 2,
    name: 'o2s12',
    description:
      'Bank 1 - Sensor 2/Bank 1 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim',
    min: 0,
    max: 1.275,
    unit: 'V',
    convertToUseful: convertOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '16',
    bytes: 2,
    name: 'o2s13',
    description:
      'Bank 1 - Sensor 3/Bank 2 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim',
    min: 0,
    max: 1.275,
    unit: 'V',
    convertToUseful: convertOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '17',
    bytes: 2,
    name: 'o2s14',
    description:
      'Bank 1 - Sensor 4/Bank 2 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim',
    min: 0,
    max: 1.275,
    unit: 'V',
    convertToUseful: convertOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '18',
    bytes: 2,
    name: 'o2s21',
    description:
      'Bank 2 - Sensor 1/Bank 3 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim',
    min: 0,
    max: 1.275,
    unit: 'V',
    convertToUseful: convertOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '19',
    bytes: 2,
    name: 'o2s22',
    description:
      'Bank 2 - Sensor 2/Bank 3 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim',
    min: 0,
    max: 1.275,
    unit: 'V',
    convertToUseful: convertOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '1A',
    bytes: 2,
    name: 'o2s23',
    description:
      'Bank 2 - Sensor 3/Bank 4 - Sensor 1 Oxygen Sensor Output Voltage / Short Term Fuel Trim',
    min: 0,
    max: 1.275,
    unit: 'V',
    convertToUseful: convertOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '1B',
    bytes: 2,
    name: 'o2s24',
    description:
      'Bank 2 - Sensor 4/Bank 4 - Sensor 2 Oxygen Sensor Output Voltage / Short Term Fuel Trim',
    min: 0,
    max: 1.275,
    unit: 'V',
    convertToUseful: convertOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '1C',
    bytes: 1,
    name: 'obdsup',
    description: 'OBD requirements to which vehicle is designed',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: '1D',
    bytes: 1,
    name: 'o2sloc2',
    description: 'Location of oxygen sensors',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: '1E',
    bytes: 1,
    name: 'pto_stat',
    description: 'Auxiliary Input Status',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: PIDS.ENGINE_RUNTIME,
    bytes: 2,
    name: 'runtm',
    description: 'Time Since Engine Start',
    min: 0,
    max: 65535,
    unit: 'seconds',
    convertToUseful: convertRuntime,
  },
  {
    mode: modeRealTime,
    pid: '20',
    bytes: 4,
    name: 'piddsupp2',
    description: 'PIDs supported 21-40',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: convertPIDSupported,
  },
  {
    mode: modeRealTime,
    pid: '21',
    bytes: 2,
    name: 'mil_dist',
    description: 'Distance Travelled While MIL is Activated',
    min: 0,
    max: 65535,
    unit: 'km',
    convertToUseful: convertRuntime,
  },
  {
    mode: modeRealTime,
    pid: '22',
    bytes: 2,
    name: 'frpm',
    description: 'Fuel Rail Pressure relative to manifold vacuum',
    min: 0,
    max: 5177.265,
    unit: 'kPa',
    convertToUseful: convertFuelRailPressure,
  },
  {
    mode: modeRealTime,
    pid: '23',
    bytes: 2,
    name: 'frpd',
    description: 'Fuel Rail Pressure (diesel)',
    min: 0,
    max: 655350,
    unit: 'kPa',
    convertToUseful: convertfrpd,
  },
  {
    mode: modeRealTime,
    pid: '24',
    bytes: 4,
    name: 'lambda11',
    description:
      'Bank 1 - Sensor 1/Bank 1 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda,
  },
  {
    mode: modeRealTime,
    pid: '25',
    bytes: 4,
    name: 'lambda12',
    description:
      'Bank 1 - Sensor 2/Bank 1 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda,
  },
  {
    mode: modeRealTime,
    pid: '26',
    bytes: 4,
    name: 'lambda13',
    description:
      'Bank 1 - Sensor 3 /Bank 2 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda,
  },
  {
    mode: modeRealTime,
    pid: '27',
    bytes: 4,
    name: 'lambda14',
    description:
      'Bank 1 - Sensor 4 /Bank 2 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda,
  },
  {
    mode: modeRealTime,
    pid: '28',
    bytes: 4,
    name: 'lambda21',
    description:
      'Bank 2 - Sensor 1 /Bank 3 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda,
  },
  {
    mode: modeRealTime,
    pid: '29',
    bytes: 4,
    name: 'lambda22',
    description:
      'Bank 2 - Sensor 2 /Bank 3 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda,
  },
  {
    mode: modeRealTime,
    pid: '2A',
    bytes: 4,
    name: 'lambda23',
    description:
      'Bank 2 - Sensor 3 /Bank 4 - Sensor 1(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda,
  },
  {
    mode: modeRealTime,
    pid: '2B',
    bytes: 4,
    name: 'lambda24',
    description:
      'Bank 2 - Sensor 4 /Bank 4 - Sensor 2(wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Voltage',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda,
  },
  {
    mode: modeRealTime,
    pid: '2C',
    bytes: 1,
    name: 'egr_pct',
    description: 'Commanded EGR',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '2D',
    bytes: 1,
    name: 'egr_err',
    description: 'EGR Error',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertPercentB,
  },
  {
    mode: modeRealTime,
    pid: '2E',
    bytes: 1,
    name: 'evap_pct',
    description: 'Commanded Evaporative Purge',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '2F',
    bytes: 1,
    name: 'fli',
    description: 'Fuel Level Input',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '30',
    bytes: 1,
    name: 'warm_ups',
    description: 'Number of warm-ups since diagnostic trouble codes cleared',
    min: 0,
    max: 255,
    unit: '',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: '31',
    bytes: 2,
    name: 'clr_dist',
    description: 'Distance since diagnostic trouble codes cleared',
    min: 0,
    max: 65535,
    unit: 'km',
    convertToUseful: convertDistanceSinceCodesCleared,
  },
  // <-- pending
  {
    mode: modeRealTime,
    pid: '32',
    bytes: 2,
    name: 'evap_vp',
    description: 'Evap System Vapour Pressure',
    min: -8192,
    max: 8192,
    unit: 'Pa',
    convertToUseful: bitDecoder,
  },
  // pending -->
  {
    mode: modeRealTime,
    pid: '33',
    bytes: 1,
    name: 'baro',
    description: 'Barometric Pressure',
    min: 0,
    max: 255,
    unit: 'kPa',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: '34',
    bytes: 4,
    name: 'lambdac11',
    description:
      'Bank 1 - Sensor 1/Bank 1 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda2,
  },
  {
    mode: modeRealTime,
    pid: '35',
    bytes: 4,
    name: 'lambdac12',
    description:
      'Bank 1 - Sensor 2/Bank 1 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda2,
  },
  {
    mode: modeRealTime,
    pid: '36',
    bytes: 4,
    name: 'lambdac13',
    description:
      'Bank 1 - Sensor 3/Bank 2 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda2,
  },
  {
    mode: modeRealTime,
    pid: '37',
    bytes: 4,
    name: 'lambdac14',
    description:
      'Bank 1 - Sensor 4/Bank 2 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda2,
  },
  {
    mode: modeRealTime,
    pid: '38',
    bytes: 4,
    name: 'lambdac21',
    description:
      'Bank 2 - Sensor 1/Bank 3 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda2,
  },
  {
    mode: modeRealTime,
    pid: '39',
    bytes: 4,
    name: 'lambdac22',
    description:
      'Bank 2 - Sensor 2/Bank 3 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda2,
  },
  {
    mode: modeRealTime,
    pid: '3A',
    bytes: 4,
    name: 'lambdac23',
    description:
      'Bank 2 - Sensor 3/Bank 4 - Sensor 1 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda2,
  },
  {
    mode: modeRealTime,
    pid: '3B',
    bytes: 4,
    name: 'lambdac24',
    description:
      'Bank 2 - Sensor 4/Bank 4 - Sensor 2 (wide range O2S) Oxygen Sensors Equivalence Ratio (lambda) / Current',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda2,
  },
  {
    mode: modeRealTime,
    pid: '3C',
    bytes: 2,
    name: 'catemp11',
    description: 'Catalyst Temperature Bank 1 /  Sensor 1',
    min: -40,
    max: 6513.5,
    unit: 'Celsius',
    convertToUseful: convertCatalystTemperature,
  },
  {
    mode: modeRealTime,
    pid: '3D',
    bytes: 2,
    name: 'catemp21',
    description: 'Catalyst Temperature Bank 2 /  Sensor 1',
    min: -40,
    max: 6513.5,
    unit: 'Celsius',
    convertToUseful: convertCatalystTemperature,
  },
  {
    mode: modeRealTime,
    pid: '3E',
    bytes: 2,
    name: 'catemp12',
    description: 'Catalyst Temperature Bank 1 /  Sensor 2',
    min: -40,
    max: 6513.5,
    unit: 'Celsius',
    convertToUseful: convertCatalystTemperature,
  },
  {
    mode: modeRealTime,
    pid: '3F',
    bytes: 2,
    name: 'catemp22',
    description: 'Catalyst Temperature Bank 2 /  Sensor 2',
    min: -40,
    max: 6513.5,
    unit: 'Celsius',
    convertToUseful: convertCatalystTemperature,
  },

  {
    mode: modeRealTime,
    pid: '40',
    bytes: 4,
    name: 'piddsupp4',
    description: 'PIDs supported 41-60',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: convertPIDSupported,
  },
  // <-- pending
  {
    mode: modeRealTime,
    pid: '41',
    bytes: 4,
    name: 'monitorstat',
    description: 'Monitor status this driving cycle',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },
  // pending -->
  {
    mode: modeRealTime,
    pid: '42',
    bytes: 2,
    name: 'vpwr',
    description: 'Control module voltage',
    min: 0,
    max: 65535,
    unit: 'V',
    convertToUseful: convertControlModuleVoltage,
  },
  {
    mode: modeRealTime,
    pid: '43',
    bytes: 2,
    name: 'load_abs',
    description: 'Absolute Load Value',
    min: 0,
    max: 25700,
    unit: '%',
    convertToUseful: convertAbsoluteLoad,
  },
  {
    mode: modeRealTime,
    pid: '44',
    bytes: 2,
    name: 'lambda',
    description: 'Fuel/air Commanded Equivalence Ratio',
    min: 0,
    max: 2,
    unit: '(ratio)',
    convertToUseful: convertLambda3,
  },
  {
    mode: modeRealTime,
    pid: '45',
    bytes: 1,
    name: 'tp_r',
    description: 'Relative Throttle Position',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '46',
    bytes: 1,
    name: 'aat',
    description: 'Ambient air temperature',
    min: -40,
    max: 215,
    unit: 'Celsius',
    convertToUseful: convertAmbientAirTemp,
  },
  {
    mode: modeRealTime,
    pid: '47',
    bytes: 1,
    name: 'tp_b',
    description: 'Absolute Throttle Position B',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '48',
    bytes: 1,
    name: 'tp_c',
    description: 'Absolute Throttle Position C',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '49',
    bytes: 1,
    name: 'app_d',
    description: 'Accelerator Pedal Position D',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '4A',
    bytes: 1,
    name: 'app_e',
    description: 'Accelerator Pedal Position E',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '4B',
    bytes: 1,
    name: 'app_f',
    description: 'Accelerator Pedal Position F',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '4C',
    bytes: 1,
    name: 'tac_pct',
    description: 'Commanded Throttle Actuator Control',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '4D',
    bytes: 2,
    name: 'mil_time',
    description: 'Time run by the engine while MIL activated',
    min: 0,
    max: 65535,
    unit: 'minutes',
    convertToUseful: convertMinutes,
  },
  {
    mode: modeRealTime,
    pid: '4E',
    bytes: 2,
    name: 'clr_time',
    description: 'Time since diagnostic trouble codes cleared',
    min: 0,
    max: 65535,
    unit: 'minutes',
    convertToUseful: convertMinutes,
  },
  {
    mode: modeRealTime,
    pid: '4F',
    bytes: 4,
    name: 'exttest1',
    description: 'External Test Equipment Configuration #1',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: convertExternalTestEquipment,
  },
  {
    mode: modeRealTime,
    pid: '50',
    bytes: 4,
    name: 'exttest2',
    description: 'External Test Equipment Configuration #2',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: convertExternalTestEquipment2,
  },
  {
    mode: modeRealTime,
    pid: '51',
    bytes: 1,
    name: 'fuel_type',
    description: 'Fuel Type',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },
  {
    mode: modeRealTime,
    pid: '52',
    bytes: 1,
    name: 'alch_pct',
    description: 'Ethanol fuel %',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '53',
    bytes: 2,
    name: 'abs_vp',
    description: 'Absolute Evap system Vapor Pressure',
    min: 0,
    max: 327675,
    unit: 'kPa',
    convertToUseful: convertAbsoluteVaporPressure,
  },
  {
    mode: modeRealTime,
    pid: '54',
    bytes: 2,
    name: 'system_vp',
    description: 'Evap system vapor pressure',
    min: -32767,
    max: 32767,
    unit: 'Pa',
    convertToUseful: convertSystemVaporPressure,
  },
  {
    mode: modeRealTime,
    pid: '55',
    bytes: 2,
    name: 's02b13',
    description: 'Short term secondary oxygen sensor trim bank 1 and bank 3',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertShortOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '56',
    bytes: 2,
    name: 'l02b13',
    description: 'Long term secondary oxygen sensor trim bank 1 and bank 3',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertShortOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '57',
    bytes: 2,
    name: 's02b24',
    description: 'Short term secondary oxygen sensor trim bank 2 and bank 4',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertShortOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '58',
    bytes: 2,
    name: 'l02b24',
    description: 'Long term secondary oxygen sensor trim bank 2 and bank 4',
    min: -100,
    max: 99.22,
    unit: '%',
    convertToUseful: convertShortOxygenSensorOutput,
  },
  {
    mode: modeRealTime,
    pid: '59',
    bytes: 2,
    name: 'frp_abs',
    description: 'Fuel rail pressure (absolute)',
    min: 0,
    max: 655350,
    unit: 'kPa',
    convertToUseful: convertFuelRailPressureAbs,
  },
  {
    mode: modeRealTime,
    pid: '5A',
    bytes: 1,
    name: 'pedalpos',
    description: 'Relative accelerator pedal position',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '5B',
    bytes: 1,
    name: 'hybridlife',
    description: 'Hybrid battery pack remaining life',
    min: 0,
    max: 100,
    unit: '%',
    convertToUseful: convertPercentA,
  },
  {
    mode: modeRealTime,
    pid: '5C',
    bytes: 1,
    name: 'engineoilt',
    description: 'Engine oil temperature',
    min: -40,
    max: 210,
    unit: '°C',
    convertToUseful: convertTemp,
  },
  {
    mode: modeRealTime,
    pid: '5D',
    bytes: 2,
    name: 'finjtiming',
    description: 'Fuel injection timing',
    min: -210.0,
    max: 301.992,
    unit: '°',
    convertToUseful: convertFuelInjectionTiming,
  },
  {
    mode: modeRealTime,
    pid: '5E',
    bytes: 2,
    name: 'enginefrate',
    description: 'Engine fuel rate',
    min: 0,
    max: 3212.75,
    unit: 'L/h',
    convertToUseful: convertEngineFuelRate,
  },
  {
    mode: modeRealTime,
    pid: '5F',
    bytes: 1,
    name: 'emmissionreq',
    description: 'Emission requirements to which vehicle is designed',
    min: 0,
    max: 0,
    unit: 'Bit Encoded',
    convertToUseful: bitDecoder,
  },

  //added some new pid entries
  {
    mode: modeRealTime,
    pid: '62',
    bytes: 1,
    name: 'aet',
    description: 'Actual engine - percent torque',
    min: -125,
    max: 125,
    unit: '%',
    convertToUseful: convertEngineTorque,
  },
  {
    mode: modeRealTime,
    pid: '67',
    bytes: 3,
    name: 'ect',
    description: 'Engine coolant temperature',
    min: -40,
    max: 215,
    unit: 'Celsius',
  },
  {
    mode: modeRealTime,
    pid: '6B',
    bytes: 5,
    name: 'egrt',
    description: 'Exhaust gas recirculation temperature',
    min: -40,
    max: 215,
    unit: 'Celsius',
  },
  {
    mode: modeRealTime,
    pid: '6D',
    bytes: 6,
    name: 'fpc',
    description: 'Fuel pressure control system',
    min: -40,
    max: 215,
    unit: 'Celsius',
  },
  {
    mode: modeRealTime,
    pid: '6E',
    bytes: 5,
    name: 'ipct',
    description: 'Injection pressure control system',
    min: -40,
    max: 215,
    unit: 'Celsius',
  },
  {
    mode: modeRealTime,
    pid: '73',
    bytes: 5,
    name: 'ep',
    description: 'Exhaust pressure',
    min: -40,
    max: 215,
    unit: 'Celsius',
  },
  {
    mode: modeRealTime,
    pid: '78',
    bytes: 2, // Changed from 9 to 2 since we only use 2 bytes
    name: 'egt',
    description: 'Exhaust Gas temperature Bank 1',
    min: -40,
    max: 215,
    unit: 'Celsius',
    convertToUseful: convertExhaustGasTemperature, // Added the conversion function
  },

  //DTC's
  //   {
  //     mode: modeRequestDTC,
  //     pid: undefined,
  //     bytes: 6,
  //     name: 'requestdtc',
  //     description: 'Requested DTC',
  //     convertToUseful: convertDTCRequest,
  //   }, //n*6 --> For each code, 6 bytes.
  //   {
  //     mode: modeClearDTC,
  //     pid: undefined,
  //     bytes: 0,
  //     name: 'cleardtc',
  //     description: 'Clear Trouble Codes (Clear engine light)',
  //     convertToUseful: notSupported,
  //   },

  //VIN
  //   {
  //     mode: modeVin,
  //     pid: '00',
  //     bytes: 4,
  //     name: 'vinsupp0',
  //     description: 'Vehicle Identification Number',
  //     convertToUseful: bitDecoder,
  //   },
  //   {
  //     mode: modeVin,
  //     pid: '01',
  //     bytes: 1,
  //     name: 'vin_mscout',
  //     description: 'VIN message count',
  //     convertToUseful: convertVIN_count,
  //   },
  //   {
  //     mode: modeVin,
  //     pid: '02',
  //     bytes: 1,
  //     name: 'vin',
  //     description: 'Vehicle Identification Number',
  //     convertToUseful: convertVIN,
  //   },
];

export default responsePIDS;
