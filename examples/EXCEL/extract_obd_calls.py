import json
import re
import os

def clean_json_string(s):
    # Clean up the JSON string, handling multi-line format with vertical bars
    lines = s.split('\n')
    cleaned_lines = []
    for line in lines:
        # Remove vertical bars and leading/trailing whitespace
        cleaned = line.replace('│', '').strip()
        if cleaned and not cleaned.startswith('//'):  # Skip comment lines
            cleaned_lines.append(cleaned)
    # Join lines and ensure properly formatted JSON
    joined = ' '.join(cleaned_lines)
    return joined

def extract_api_calls(log_file_path):
    with open(log_file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Match debug blocks that might contain API calls
    pattern = r'\[DEBUG\][^\n]*\[Axios\][^\n]*Request[^\n]*\n((?:│[^\n]*\n)+)'
    matches = re.finditer(pattern, content, re.MULTILINE)
    
    api_calls = []
    for match in matches:
        try:
            json_str = clean_json_string(match.group(1))
            data = json.loads(json_str)
            
            # Check if this is an OBD call with decodeDTC action
            if (isinstance(data, dict) and 
                data.get('url') == 'obd' and 
                data.get('method') == 'post' and 
                isinstance(data.get('payload'), dict) and 
                data['payload'].get('action') == 'decodeDTC'):
                api_calls.append(data)
                
        except json.JSONDecodeError as e:
            continue
    
    return api_calls

def format_output(call):
    # Format the output in a clear, readable way
    formatted = {
        'url': call['url'],
        'method': call['method'],
        'payload': call['payload']
    }
    return json.dumps(formatted, indent=2)

def main():
    # Use the raw_log file directly
    current_dir = os.path.dirname(os.path.abspath(__file__))
    log_file_path = os.path.join(current_dir, 'raw_log')
    
    try:
        api_calls = extract_api_calls(log_file_path)
        
        if not api_calls:
            print("\nNo OBD decodeDTC API calls found in the log file.")
            return
            
        print(f"\nFound {len(api_calls)} OBD decodeDTC API calls:")
        for i, call in enumerate(api_calls, 1):
            print(f"\nCall #{i}")
            print(format_output(call))
            print("-" * 40)
            
    except FileNotFoundError:
        print(f"Error: Could not find log file at {log_file_path}")
    except Exception as e:
        print(f"Error occurred: {str(e)}")

if __name__ == "__main__":
    main()