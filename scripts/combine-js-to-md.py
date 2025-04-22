import os
import re

def combine_js_to_md(base_dir=None, output_file=None):
    # Get the root directory (assuming script is in scripts/ folder)
    if base_dir is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Set docs directory path
    docs_dir = os.path.join(base_dir, "docs")
    
    # Set default output file if not provided
    if output_file is None:
        output_file = os.path.join(base_dir, "ecu-common-files.md")
    
    with open(output_file, 'w', encoding='utf-8') as md_file:
        md_file.write("# JavaScript Files Documentation\n\n")
        
        # Only walk through the docs directory
        for file in sorted(os.listdir(docs_dir)):
            if file.endswith('.js') and re.search(r'(common|ecu)', file.lower()):
                file_path = os.path.join(docs_dir, file)
                # Create relative path from docs directory
                relative_path = os.path.relpath(file_path, base_dir)
                
                md_file.write(f"## {relative_path}\n\n")
                md_file.write("```javascript\n")
                md_file.write(f"// filepath: {relative_path}\n")
                try:
                    with open(file_path, 'r', encoding='utf-8') as js_file:
                        md_file.write(js_file.read())
                except Exception as e:
                    md_file.write(f"// Error reading file: {str(e)}\n")
                md_file.write("```\n\n")
                print(f"Processed: {relative_path}")

if __name__ == "__main__":
    combine_js_to_md()
    print("\nMarkdown file created in project root directory")
