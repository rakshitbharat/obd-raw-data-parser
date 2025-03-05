import { parseOBDResponse } from 'obd-raw-data-parser';

// Test both ESM and CJS imports
const speed = parseOBDResponse("41 0D 32");
console.log('Speed:', speed);

const rpm = parseOBDResponse("41 0C 1A F8");
console.log('RPM:', rpm);