import { parseOBDResponse } from 'obd-raw-data-parser';

console.log('Testing speed response...');
const speed = parseOBDResponse("41 0D 32");
console.log('Speed:', speed);

console.log('\nTesting RPM response...');
const rpm = parseOBDResponse("41 0C 1A F8");
console.log('RPM:', rpm);

console.log('\nTesting temperature response...');
const temp = parseOBDResponse("41 05 7B");
console.log('Temperature:', temp);