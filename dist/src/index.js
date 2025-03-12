import responsePIDS from "./obdPIDS.js";
export function parseOBDResponse(hexString) {
    const reply = {};
    let byteNumber;
    let valueArray = [];
    if (hexString === "NO DATA" ||
        hexString === "OK" ||
        hexString === "?" ||
        hexString === "UNABLE TO CONNECT" ||
        hexString === "SEARCHING...") {
        reply.value = hexString;
        return reply;
    }
    hexString = hexString.replace(/ /g, "");
    valueArray = [];
    for (byteNumber = 0; byteNumber < hexString.length; byteNumber += 2) {
        valueArray.push(hexString.substr(byteNumber, 2));
    }
    if (valueArray[0] === "41") {
        reply.mode = valueArray[0];
        reply.pid = valueArray[1];
        for (let i = 0; i < responsePIDS.length; i++) {
            if (responsePIDS[i].pid === reply.pid) {
                const numberOfBytes = responsePIDS[i].bytes;
                reply.name = responsePIDS[i].name;
                reply.unit = responsePIDS[i].unit;
                const convertToUseful = responsePIDS[i].convertToUseful;
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
                        reply.value = convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5]);
                        break;
                    case 8:
                        reply.value = convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6], valueArray[7], valueArray[8], valueArray[9]);
                        break;
                }
                break;
            }
        }
    }
    else if (valueArray[0] === "43") {
        reply.mode = valueArray[0];
        for (let i = 0; i < responsePIDS.length; i++) {
            if (responsePIDS[i].mode === "03") {
                const convertToUseful = responsePIDS[i].convertToUseful;
                if (!convertToUseful) {
                    break;
                }
                reply.name = responsePIDS[i].name;
                reply.unit = responsePIDS[i].unit;
                reply.value = convertToUseful(valueArray[1], valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6]);
            }
        }
    }
    else if (valueArray[0] === "49") {
        reply.mode = valueArray[0];
        reply.pid = valueArray[1];
        for (let i = 0; i < responsePIDS.length; i++) {
            if (responsePIDS[i].mode === "09" && responsePIDS[i].pid === reply.pid) {
                reply.name = responsePIDS[i].name;
                reply.unit = responsePIDS[i].unit;
                const convertToUseful = responsePIDS[i].convertToUseful;
                if (!convertToUseful) {
                    break;
                }
                reply.value = convertToUseful(hexString);
                break;
            }
        }
    }
    return reply;
}
export function getPIDInfo(pid) {
    const responsePid = responsePIDS.find((item) => item.pid === pid);
    return responsePid || null;
}
export function getAllPIDs() {
    return responsePIDS;
}
export { DTCBaseDecoder } from "./DTC/DTCBaseDecoder.js";
export { VinDecoder } from "./VIN/VinDecoder.js";
