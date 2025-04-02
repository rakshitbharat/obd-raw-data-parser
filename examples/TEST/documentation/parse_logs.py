import os
import json
import re

def extract_data_from_logs(folder_path):
    data_entries = []

    for file_name in os.listdir(folder_path):
        if file_name.endswith('.txt'):
            file_path = os.path.join(folder_path, file_name)
            with open(file_path, 'r') as file:
                content = file.read()

                # Extracting the payload data
                payload_match = re.search(r'"payload": (\{.*?\})', content, re.DOTALL)
                if payload_match:
                    payload = json.loads(payload_match.group(1))
                    mode = payload.get("mode", "")

                # Extracting the response data
                response_match = re.search(r'"response": (\{.*?\})', content, re.DOTALL)
                if response_match:
                    response = json.loads(response_match.group(1))
                    dtc_codes = response.get("data", [])

                    # Append the formatted entry
                    data_entries.append({
                        "s": mode,
                        "r": dtc_codes
                    })

    return data_entries

def main():
    folder_path = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(folder_path, 'data.json')

    # Extract data from logs
    data = extract_data_from_logs(folder_path)

    # Write to data.json
    with open(output_file, 'w') as json_file:
        json.dump(data, json_file, indent=4)

    print(f"Data has been written to {output_file}")

if __name__ == "__main__":
    main()