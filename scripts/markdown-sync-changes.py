import os
import re
from pathlib import Path

def sync_changes_to_src(changes_file: str, base_dir: str) -> None:
    print("Starting sync process...")
    
    with open(changes_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Modified regex pattern to match the actual format in changes.md
    # The key change is removing the expectation of closing backticks between
    # the START marker and the language identifier
    file_pattern = re.compile(
        r'```markdown\s*' +
        r'---\s*START OF MODIFIED FILE\s*(src/[^\s]+?)\s*---\s*' +
        r'```(?:[a-zA-Z0-9]+)?\s*' +  # Language identifier directly follows the start marker
        r'(.*?)\s*' +
        r'```\s*' +
        r'```markdown\s*' +
        r'---\s*END OF MODIFIED FILE[^\n]*\s*' +
        r'```',
        re.DOTALL
    )
    
    matches = list(file_pattern.finditer(content))
    processed_count = 0
    error_count = 0
    
    if not matches:
        # Debug: Print first part of content
        print("\nFirst 200 chars of changes.md:")
        print(content[:200].replace('\n', '\\n'))
        print("\nNo file blocks found. Expected format:")
        print("```markdown")
        print("--- START OF MODIFIED FILE src/example/file.ts ---")
        print("```")
        print("```typescript")  # Note: This can be any language identifier
        print("// code content")
        print("```")
        print("```markdown")
        print("--- END OF MODIFIED FILE src/example/file.ts ---")
        print("```")
        return

    for match in matches:
        relative_path = match.group(1).strip()
        file_content = match.group(2)
        
        try:
            full_path = os.path.join(base_dir, relative_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            cleaned_content = clean_content(file_content)
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            
            print(f"✅ Synced: {relative_path}")
            processed_count += 1
            
        except Exception as e:
            print(f"❌ Error syncing {relative_path}: {str(e)}")
            error_count += 1
    
    # Print detailed summary
    print(f"\nSync completed!")
    if processed_count > 0:
        print(f"✅ Successfully processed: {processed_count} files")
    if error_count > 0:
        print(f"❌ Errors: {error_count}")
        
    if processed_count == 0:
        print("\nℹ️  No valid file blocks found in changes.md")
        print("\nExpected format:")
        print("--- START OF MODIFIED FILE src/example/file.ts ---")
        print("```typescript")
        print("// Your code here")
        print("```")
        print("--- END OF MODIFIED FILE src/example/file.ts ---")
        
        # Print first 100 chars of content for debugging
        print("\nFirst 100 chars of changes.md:")
        print(content[:100].replace('\n', '\\n'))

def clean_content(content: str) -> str:
    """Cleans the content by removing markdown artifacts and normalizing line endings"""
    # Remove trailing code block markers
    content = re.sub(r'```\s*$', '', content)
    
    # Normalize line endings
    content = content.replace('\r\n', '\n')
    
    # Remove trailing whitespace from each line
    content = '\n'.join(line.rstrip() for line in content.splitlines())
    
    # Ensure single newline at end of file
    content = content.rstrip('\n') + '\n'
    
    return content

def main():
    # Get the script's directory
    script_dir = Path(__file__).parent
    base_dir = script_dir.parent
    changes_file = script_dir / 'changes.md'
    
    if not changes_file.exists():
        print(f"❌ Error: Changes file not found at {changes_file}")
        return
    
    print(f"Base directory: {base_dir}")
    print(f"Changes file: {changes_file}\n")
    
    # Confirm before proceeding
    response = input("⚠️  This will modify source files. Continue? [y/N]: ").strip().lower()
    if response != 'y':
        print("Operation cancelled.")
        return
    
    sync_changes_to_src(str(changes_file), str(base_dir))

if __name__ == "__main__":
    main()