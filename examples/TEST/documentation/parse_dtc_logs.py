import json
import os
import re
from typing import List, Dict, Any
import ast

def clean_json_block(block: str) -> str:
    """Clean the JSON block by removing line markers and fixing indentation."""
    # Remove "│  " line markers and any timestamp lines
    lines = []
    for line in block.split('\n'):
        line = line.replace('│  ', '')
        if not line.startswith('202'):  # Skip timestamp lines
            lines.append(line)
    return '\n'.join(lines)

def parse_byte_array(data_str: str) -> List[List[int]]:
    """Parse the byte array string into actual arrays."""
    try:
        # Convert string representation to actual list
        return ast.literal_eval(data_str)
    except:
        return []

def parse_log_file(file_path: str) -> List[Dict[str, Any]]:
    """Process a single log file and extract DTC data."""
    dtc_entries = []
    current_block = []
    in_json_block = False
    request_data = None
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            # Skip empty lines
            if not line.strip():
                continue
            
            # Start of a new request block
            if '[Axios] DTC Decoder Request' in line:
                in_json_block = True
                current_block = []
                request_data = None
                continue
            
            # Start of a response block
            if '[Axios] DTC Decoder Response' in line:
                if request_data:  # If we have a pending request
                    in_json_block = True
                    current_block = []
                continue
            
            if in_json_block:
                if line.strip() and not line.startswith('202'):  # Not a timestamp line
                    current_block.append(line)
                else:
                    in_json_block = False
                    if current_block:
                        try:
                            # Clean and parse the JSON block
                            json_str = clean_json_block(''.join(current_block))
                            data = json.loads(json_str)
                            
                            # Handle request
                            if 'payload' in data and data['payload'].get('action') == 'decodeDTC':
                                # Debug print to see the actual payload
                                print(f"\nPayload from {file_path}:")
                                print(json.dumps(data['payload'], indent=2))
                                
                                # Extract isCan value from payload
                                is_can = False  # Default to False
                                
                                # Check if protocol is specified in the payload
                                protocol = data['payload'].get('protocol', '').lower()
                                if protocol:
                                    is_can = 'can' in protocol
                                
                                # If protocol is not specified, check for explicit isCan flag
                                if 'isCan' in data['payload']:
                                    is_can = bool(data['payload']['isCan'])
                                elif 'iscan' in data['payload']:
                                    is_can = bool(data['payload']['iscan'])
                                elif 'protocol' not in data['payload']:
                                    print(f"Warning: No protocol or isCan value found in {file_path}")
                                
                                request_data = {
                                    "s": data['payload']['mode'],
                                    "b": ast.literal_eval(data['payload']['data']),
                                    "r": [],
                                    "isCan": is_can
                                }
                            
                            # Handle response
                            elif request_data and 'response' in data:
                                if data['response'].get('status') == 'success':
                                    request_data['r'] = data['response'].get('data', [])
                                    if request_data['r'] or request_data['b']:  # Add entry if it has response data or byte data
                                        dtc_entries.append(request_data)
                                request_data = None
                                
                        except (json.JSONDecodeError, SyntaxError, ValueError) as e:
                            print(f"Error parsing JSON in {file_path}: {str(e)}")
                            continue
                    current_block = []
    
    return dtc_entries

def main():
    # Directory containing the log files
    log_dir = "./"
    output_file = os.path.join(log_dir, "data.json")
    
    all_dtc_entries = []
    
    # Process all temp.txt files
    for filename in sorted(os.listdir(log_dir)):
        if filename.endswith('_temp.txt'):
            file_path = os.path.join(log_dir, filename)
            print(f"\nProcessing {filename}...")
            dtc_entries = parse_log_file(file_path)
            all_dtc_entries.extend(dtc_entries)
    
    # Write the results to data.json
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_dtc_entries, f, indent=2)
    
    print(f"\nProcessing complete. Results saved to {output_file}")
    print(f"Total DTC entries processed: {len(all_dtc_entries)}")

if __name__ == "__main__":
    main() 