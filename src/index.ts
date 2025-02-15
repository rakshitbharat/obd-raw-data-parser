import responsePIDS from './obdInfo';
import PIDS from './obdInfo';
import { IObdPIDDescriptor, IParsedOBDResponse, Modes} from './obdTypes';


export function parseOBDResponse(hexString: string): IParsedOBDResponse {
  var reply: IParsedOBDResponse = {},
    byteNumber,
    valueArray; //New object

  if (
    hexString === 'NO DATA' ||
    hexString === 'OK' ||
    hexString === '?' ||
    hexString === 'UNABLE TO CONNECT' ||
    hexString === 'SEARCHING...'
  ) {
    //No data or OK is the response, return directly.
    reply.value = hexString;
    return reply;
  }

  hexString = hexString.replace(/ /g, ''); //Whitespace trimming //Probably not needed anymore?
  valueArray = [];

  for (byteNumber = 0; byteNumber < hexString.length; byteNumber += 2) {
    valueArray.push(hexString.substr(byteNumber, 2));
  }

  if (valueArray[0] === '41') {
    reply.mode = valueArray[0] as Modes;
    reply.pid = valueArray[1];
    for (var i = 0; i < PIDS.length; i++) {
      if (PIDS[i].pid === reply.pid) {
        var numberOfBytes = PIDS[i].bytes;

        reply.name = PIDS[i].name;
        reply.unit = PIDS[i].unit;

        const convertToUseful = PIDS[i].convertToUseful;
        if (!convertToUseful) {
          break;
        }

        switch (numberOfBytes) {
          case 1:
            reply.value = convertToUseful(valueArray[2]);
            break;
          case 2:
            reply.value = convertToUseful(valueArray[2], valueArray[3]);
            break;
          case 4:
            reply.value = convertToUseful(
              valueArray[2],
              valueArray[3],
              valueArray[4],
              valueArray[5],
            );
            break;
          case 8:
            reply.value = convertToUseful(
              valueArray[2],
              valueArray[3],
              valueArray[4],
              valueArray[5],
              valueArray[6],
              valueArray[7],
              valueArray[8],
              valueArray[9],
            );
            break;
        }
        break; //Value is converted, break out the for loop.
      }
    }
  } else if (valueArray[0] === '43') {
    reply.mode = valueArray[0] as Modes;
    for (var i = 0; i < PIDS.length; i++) {
      if (PIDS[i].mode === '03') {
        const convertToUseful = PIDS[i].convertToUseful;
        if (!convertToUseful) {
          break;
        }

        reply.name = PIDS[i].name;
        reply.unit = PIDS[i].unit;

        reply.value = convertToUseful(
          valueArray[1],
          valueArray[2],
          valueArray[3],
          valueArray[4],
          valueArray[5],
          valueArray[6],
        );
      }
    }
  }
  return reply;
}


export function getPIDInfo(pid: string): IObdPIDDescriptor | null{
  const responsePid = responsePIDS.find((item)=>item.pid === pid);
  return responsePid || null;
}

export function getAllPIDs(): IObdPIDDescriptor[]{
  return responsePIDS;
}

export { parseOBDResponse, getPIDInfo, getAllPIDs } from './obdParser';
export type { IObdPIDDescriptor, IParsedOBDResponse } from './obdTypes';
export { Modes } from './obdTypes';