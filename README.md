# OBD Raw Data Parser

A lightweight TypeScript library for parsing OBD-II raw data into human readable format. This library helps you interpret raw OBD-II data from your vehicle's diagnostic system.

[![NPM Version](https://img.shields.io/npm/v/obd-raw-data-parser.svg)](https://www.npmjs.com/package/obd-raw-data-parser)
[![Build Status](https://github.com/rakshitbharat/obd-raw-data-parser/workflows/CI/badge.svg)](https://github.com/rakshitbharat/obd-raw-data-parser/actions)
[![codecov](https://codecov.io/gh/rakshitbharat/obd-raw-data-parser/branch/main/graph/badge.svg)](https://codecov.io/gh/rakshitbharat/obd-raw-data-parser)

## Installation

```bash
npm install obd-raw-data-parser
```

## Usage

```typescript
import { parseOBDResponse, getPIDInfo, getAllPIDs } from 'obd-raw-data-parser';

// Parse raw OBD response
const speedResponse = parseOBDResponse('41 0D 32');
console.log('Vehicle Speed:', speedResponse);
// Output: { mode: '41', pid: '0D', name: 'vss', unit: 'km/h', value: 50 }

// Get PID information
const pidInfo = getPIDInfo('0C');
console.log('RPM PID Info:', pidInfo);
// Output: { mode: '01', pid: '0C', name: 'rpm', description: 'Engine RPM', ... }

// Get all supported PIDs
const allPids = getAllPIDs();
console.log('Supported PIDs:', allPids.length);
```

## Supported PIDs

The library supports all standard OBD-II PIDs including:

- Vehicle Speed (0D)
- Engine RPM (0C)
- Engine Load (04)
- Throttle Position (11)
- Engine Coolant Temperature (05)
- Intake Air Temperature (0F)
- Mass Air Flow Rate (10)
- O2 Sensors (14-1B)
- OBD Standard (1C)
- Engine Run Time (1F)
- And many more...

## API Reference

### `parseOBDResponse(hexString: string): IParsedOBDResponse`

Parses a raw OBD response string into a structured object.

```typescript
interface IParsedOBDResponse {
  mode?: string;
  pid?: string;
  name?: string;
  value?: string | number;
  unit?: string;
}
```

### `getPIDInfo(pid: string): IObdPIDDescriptor | null`

Returns detailed information about a specific PID.

```typescript
interface IObdPIDDescriptor {
  mode: string;
  pid: string;
  bytes: number;
  name: string;
  description: string;
  min: number;
  max: number;
  unit: string;
}
```

### `getAllPIDs(): IObdPIDDescriptor[]`

Returns an array of all supported PID descriptors.

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -am 'feat: add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Create a new Pull Request

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Run example
npm run example
```

## Credits

This library was inspired by and builds upon the work of [obd-utils](https://github.com/Nishkalkashyap/obd-utils). Special thanks to [@Nishkalkashyap](https://github.com/Nishkalkashyap) for the original implementation.

## License

MIT © [Rakshit Bharat](LICENSE)

