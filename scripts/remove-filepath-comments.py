import os
import re
from pathlib import Path

def get_all_files(directory):
    """Recursively get all files in directory."""
    # Only process these file extensions
    valid_extensions = {'.ts', '.tsx', '.js', '.jsx', '.md'}
    
    for root, _, files in os.walk(directory):
        for file in files:
            if Path(file).suffix in valid_extensions:
                yield os.path.join(root, file)

def remove_filepath_comments(file_path):
    """Remove filepath comments from a single file."""
    try:
        # Read file content
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove both comment formats:
        # // filepath: src/...
        # // filepath: /Users/.../src/...
        updated_content = re.sub(
            r'\/\/ filepath:.*?(?:src\/.*?|/src/.*?)\n',
            '',
            content
        )
        
        # Only write if changes were made
        if content != updated_content:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                rel_path = os.path.relpath(file_path, src_dir)
                print(f"✓ Removed filepath comment from: {rel_path}")
            except IOError as e:
                print(f"✗ Error writing to {os.path.relpath(file_path, src_dir)}: {str(e)}")
            
    except UnicodeDecodeError:
        print(f"✗ Skipping binary file: {os.path.relpath(file_path, src_dir)}")
    except Exception as e:
        print(f"✗ Error processing {os.path.relpath(file_path, src_dir)}: {str(e)}")

if __name__ == "__main__":
    # Get the src directory path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(os.path.dirname(script_dir), 'src')
    
    if not os.path.exists(src_dir):
        print(f"Error: Source directory not found: {src_dir}")
        exit(1)
    
    print("Starting to remove filepath comments...\n")
    
    try:
        files_processed = 0
        for file_path in get_all_files(src_dir):
            remove_filepath_comments(file_path)
            files_processed += 1
        
        print(f"\nDone! Processed {files_processed} files.")
    except Exception as e:
        print(f"\nScript failed: {str(e)}")
        exit(1)
