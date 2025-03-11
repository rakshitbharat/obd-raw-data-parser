package automindv3.dtc;

import android.util.Log;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class DTCParser extends ReactContextBaseJavaModule {
    private static final String TAG = "🚗 Android DTCParser";
    private static final Pattern HEX_PATTERN = Pattern.compile("^[0-9A-F]{4}$");
    private static final Pattern FRAME_PATTERN = Pattern.compile("(\\d+):\\s*([0-9A-Fa-f\\s]+)");

    public DTCParser(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "DTCParser";
    }

    private void log(String message) {
        Log.d(TAG, message);
    }

    private void logError(String message, Throwable e) {
        Log.e(TAG, message, e);
    }

    private String decodeDTCFromBytes(int byte1, int byte2) {
        // Extract type code (first 2 bits of byte1)
        int typeCode = (byte1 >> 6) & 0x03;
        
        // Extract digits
        int firstDigit = (byte1 >> 4) & 0x03;
        int secondDigit = byte1 & 0x0F;
        int thirdDigit = (byte2 >> 4) & 0x0F;
        int fourthDigit = byte2 & 0x0F;
        
        log(String.format("Decoding bytes: %02X %02X -> typeCode: %d, digits: %d,%X,%X,%X", 
                byte1, byte2, typeCode, firstDigit, secondDigit, thirdDigit, fourthDigit));
        
        // Map type code to letter
        String type;
        switch(typeCode) {
            case 0: type = "P"; break;
            case 1: type = "C"; break;
            case 2: type = "B"; break;
            case 3: type = "U"; break;
            default:
                log("Invalid type code: " + typeCode);
                return null;
        }
        
        // Format DTC string
        String dtc = String.format("%s%d%X%X%X",
                type,
                firstDigit,
                secondDigit,
                thirdDigit,
                fourthDigit);
                
        // Validate DTC format
        if (!isValidDTC(dtc)) {
            log("⚠️ Invalid DTC format: " + dtc);
            return null;
        }
                
        log("Decoded DTC: " + dtc);
        return dtc;
    }

    private boolean isValidDTC(String dtc) {
        // Basic format check
        if (!dtc.matches("^[PCBU][0-3][0-9A-F]{3}$")) {
            return false;
        }
        
        // Skip known invalid codes
        return !dtc.equals("P0000") &&
               !dtc.equals("C0000") &&
               !dtc.equals("B0000") &&
               !dtc.equals("U0000");
    }

    @ReactMethod
    public void parseDTCs(ReadableArray rawFrames, String mode, Promise promise) {
        log("🔍 Starting DTC parsing for mode: " + mode);
        log("Received " + rawFrames.size() + " frames");
        
        try {
            Set<String> dtcs = new HashSet<>();
            WritableArray frameData = Arguments.createArray();
            
            for (int frameIndex = 0; frameIndex < rawFrames.size(); frameIndex++) {
                ReadableArray frame = rawFrames.getArray(frameIndex);
                log(String.format("Processing frame %d of %d", frameIndex + 1, rawFrames.size()));
                
                if (frame == null) {
                    log("⚠️ Invalid frame type at index " + frameIndex);
                    continue;
                }
                
                // Convert frame bytes to string
                StringBuilder frameStr = new StringBuilder();
                StringBuilder hexDump = new StringBuilder();
                for (int i = 0; i < frame.size(); i++) {
                    int byte_ = frame.getInt(i);
                    frameStr.append((char) byte_);
                    hexDump.append(String.format("%02X ", byte_));
                }
                
                WritableMap frameInfo = Arguments.createMap();
                frameInfo.putInt("index", frameIndex + 1);
                frameInfo.putString("ascii", frameStr.toString());
                frameInfo.putString("hex", hexDump.toString());
                frameData.pushMap(frameInfo);
                
                log("Frame " + (frameIndex + 1) + " raw string: " + frameStr);
                log("Frame " + (frameIndex + 1) + " hex dump: " + hexDump);
                
                // Find hex data in frame using regex
                Matcher matcher = FRAME_PATTERN.matcher(frameStr);
                if (!matcher.find()) {
                    log("⚠️ No frame pattern match in frame " + (frameIndex + 1) + ": " + frameStr);
                    continue;
                }
                
                // Extract hex data
                String hexData = matcher.group(2).replaceAll("\\s+", "").toUpperCase();
                log("Frame " + (frameIndex + 1) + " hex data: " + hexData);
                
                // Process hex pairs
                for (int i = 0; i + 3 < hexData.length(); i += 4) {
                    String hexPair = hexData.substring(i, i + 4);
                    log("Processing hex pair: " + hexPair);
                    
                    // Validate hex format
                    if (!HEX_PATTERN.matcher(hexPair).matches()) {
                        log("⚠️ Invalid hex format: " + hexPair);
                        continue;
                    }
                    
                    // Convert hex to bytes
                    try {
                        int byte1 = Integer.parseInt(hexPair.substring(0, 2), 16);
                        int byte2 = Integer.parseInt(hexPair.substring(2, 4), 16);
                        
                        log(String.format("Parsed bytes: %02X %02X", byte1, byte2));
                        
                        // Decode DTC
                        String dtc = decodeDTCFromBytes(byte1, byte2);
                        if (dtc != null) {
                            dtcs.add(dtc);
                            log("✅ Added DTC: " + dtc);
                        }
                    } catch (NumberFormatException e) {
                        log("⚠️ Failed to parse hex values from pair: " + hexPair);
                    }
                }
            }
            
            // Sort DTCs
            List<String> sortedDTCs = new ArrayList<>(dtcs);
            Collections.sort(sortedDTCs);
            
            WritableArray dtcArray = Arguments.createArray();
            for (String dtc : sortedDTCs) {
                dtcArray.pushString(dtc);
            }
            
            log("🏁 Parsing complete. Found " + sortedDTCs.size() + " DTCs: " + sortedDTCs);
            
            // Return both DTCs and debug info
            WritableMap result = Arguments.createMap();
            result.putArray("dtcs", dtcArray);
            result.putArray("frameData", frameData);
            result.putString("mode", mode);
            
            promise.resolve(result);
        } catch (Exception e) {
            logError("❌ Error parsing DTCs", e);
            promise.reject("parse_error", e.getMessage(), e);
        }
    }
} 