<div align="center">
  <h1>🚗 OBD Raw Data Parser</h1>
  <p><strong>Turn cryptic OBD-II data into human-readable vehicle information</strong></p>

  [![NPM Version](https://img.shields.io/npm/v/obd-raw-data-parser.svg)](https://www.npmjs.com/package/obd-raw-data-parser)
  [![Build Status](https://github.com/rakshitbharat/obd-raw-data-parser/workflows/CI/badge.svg)](https://github.com/rakshitbharat/obd-raw-data-parser/actions)
  [![codecov](https://codecov.io/gh/rakshitbharat/obd-raw-data-parser/branch/main/graph/badge.svg)](https://codecov.io/gh/rakshitbharat/obd-raw-data-parser)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Downloads](https://img.shields.io/npm/dm/obd-raw-data-parser.svg)](https://www.npmjs.com/package/obd-raw-data-parser)

  <img src="https://raw.githubusercontent.com/rakshitbharat/obd-raw-data-parser/main/docs/images/demo.png" alt="OBD Parser Demo" width="600">
</div>

## ✨ Features

- 🚀 **Lightning Fast**: Optimized for quick parsing and minimal overhead
- 🎯 **Type Safe**: Written in TypeScript with full type definitions
- 🔌 **Zero Dependencies**: Lightweight and self-contained
- 📊 **Extensive Support**: Covers all standard OBD-II PIDs
- 🧪 **Well Tested**: High test coverage with Jest
- 📖 **Well Documented**: Comprehensive API documentation
- 🔄 **Real-time Ready**: Perfect for live vehicle data streaming

## 🚀 Quick Start

### Installation

```bash
npm install obd-raw-data-parser
```

### Basic Usage

```typescript
import { parseOBDResponse } from 'obd-raw-data-parser';

// Parse vehicle speed (50 km/h)
const speed = parseOBDResponse('41 0D 32');
console.log(speed);
// { mode: '41', pid: '0D', name: 'vss', unit: 'km/h', value: 50 }

// Parse engine RPM (1726 RPM)
const rpm = parseOBDResponse('41 0C 1A F8');
console.log(rpm);
// { mode: '41', pid: '0C', name: 'rpm', unit: 'rev/min', value: 1726 }
```

## 🎯 Supported Parameters

### Engine & Performance
- ⚡ Engine RPM
- 🏃 Vehicle Speed
- 🌡️ Engine Temperature
- 💨 Mass Air Flow
- 🎮 Throttle Position

### Emissions & Fuel
- ⛽ Fuel System Status
- 💨 O2 Sensors
- 🌿 EGR System
- 🔋 Battery Voltage
- 📊 Fuel Pressure

### Advanced Metrics
- 🌡️ Catalyst Temperature
- 💪 Engine Load
- ⏱️ Timing Advance
- 🔄 OBD Status
- 📝 DTC Codes

## 🔧 Advanced Usage

### PID Information Lookup

```typescript
import { getPIDInfo } from 'obd-raw-data-parser';

const pidInfo = getPIDInfo('0C');
console.log(pidInfo);
/* Output:
{
  mode: '01',
  pid: '0C',
  name: 'rpm',
  description: 'Engine RPM',
  min: 0,
  max: 16383.75,
  unit: 'rev/min',
  bytes: 2
}
*/
```

### Get All Supported PIDs

```typescript
import { getAllPIDs } from 'obd-raw-data-parser';

const pids = getAllPIDs();
console.log(`Supporting ${pids.length} parameters`);
```

## 📈 Real-World Example

```typescript
import { parseOBDResponse } from 'obd-raw-data-parser';

// Create a real-time dashboard
class VehicleDashboard {
  update(rawData: string) {
    const data = parseOBDResponse(rawData);
    
    switch(data.pid) {
      case '0C': // RPM
        this.updateTachometer(data.value);
        break;
      case '0D': // Speed
        this.updateSpeedometer(data.value);
        break;
      // ... handle other parameters
    }
  }
}
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. 🍴 Fork the repository
2. 🌿 Create your feature branch: `git checkout -b feature/amazing`
3. 💾 Commit changes: `git commit -am 'feat: add amazing feature'`
4. 🚀 Push to branch: `git push origin feature/amazing`
5. 🎉 Submit a pull request

## 💖 Credits

Built with inspiration from [obd-utils](https://github.com/Nishkalkashyap/obd-utils) by [@Nishkalkashyap](https://github.com/Nishkalkashyap).

## 📄 License

MIT © [Rakshit Bharat](LICENSE)

---

<div align="center">
  Made with ❤️ for the automotive community
  <br>
  <a href="https://github.com/rakshitbharat/obd-raw-data-parser/issues">Report Bug</a>
  ·
  <a href="https://github.com/rakshitbharat/obd-raw-data-parser/pulls">Submit Feature</a>
</div>

