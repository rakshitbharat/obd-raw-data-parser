import { parseOBDResponse, getPIDInfo, getAllPIDs } from '../src/index.js';

// Example 1: Parse vehicle speed
const speedResponse = parseOBDResponse('41 0D 32');
console.log('Vehicle Speed:', speedResponse);
// Output: { mode: '41', pid: '0D', name: 'vss', unit: 'km/h', value: 50 }

// Example 2: Parse engine RPM
const rpmResponse = parseOBDResponse('41 0C 1A F8');
console.log('Engine RPM:', rpmResponse);
// Output: { mode: '41', pid: '0C', name: 'rpm', unit: 'rev/min', value: 1726 }

// Example 3: Get information about a specific PID
const pidInfo = getPIDInfo('0C');
console.log('PID Info:', pidInfo);
// Output: { mode: '01', pid: '0C', name: 'rpm', description: 'Engine RPM', ... }

// Example 4: Get all supported PIDs
const allPids = getAllPIDs();
console.log('Number of supported PIDs:', allPids.length);
