import os
import mimetypes

def get_language_from_ext(file_ext):
    """Map file extensions to markdown code block language identifiers"""
    ext_map = {
        '.js': 'javascript',
        '.jsx': 'jsx',
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.py': 'python',
        '.json': 'json',
        '.md': 'markdown',
        '.css': 'css',
        '.scss': 'scss',
        '.html': 'html',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
    }
    return ext_map.get(file_ext.lower(), 'text')

def combine_src_files(base_dir=None, output_file=None):
    # Get the root directory (assuming script is in scripts/ folder)
    if base_dir is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_dir = os.path.join(base_dir, "src")
    
    # Set default output file if not provided
    if output_file is None:
        output_file = os.path.join(base_dir, "src-documentation.md")
    
    with open(output_file, 'w', encoding='utf-8') as md_file:
        md_file.write("# Source Code Documentation\n\n")
        md_file.write("Generated documentation of all source files in the project.\n\n")
        
        # Walk through directories recursively
        for root, dirs, files in os.walk(src_dir):
            # Skip node_modules and hidden directories
            if 'node_modules' in root or any(part.startswith('.') for part in root.split(os.sep)):
                continue
            
            # Calculate relative path for current directory
            rel_dir = os.path.relpath(root, base_dir)
            
            # Add directory header if there are files to document
            files_to_doc = [f for f in sorted(files) if not f.startswith('.')]
            if files_to_doc:
                dir_depth = rel_dir.count(os.sep)
                md_file.write(f"{'#' * (dir_depth + 2)} Directory: {rel_dir}\n\n")
            
            # Process each file in current directory
            for file in files_to_doc:
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, base_dir)
                _, file_ext = os.path.splitext(file)
                
                # Get appropriate language for syntax highlighting
                lang = get_language_from_ext(file_ext)
                
                # Write file documentation
                md_file.write(f"### File: {file}\n\n")
                md_file.write(f"**Path:** `{relative_path}`\n\n")
                md_file.write(f"```{lang}\n")
                md_file.write(f"// filepath: {relative_path}\n")
                try:
                    with open(file_path, 'r', encoding='utf-8') as src_file:
                        md_file.write(src_file.read())
                except Exception as e:
                    md_file.write(f"// Error reading file: {str(e)}\n")
                md_file.write("\n```\n\n")
                print(f"Processed: {relative_path}")

if __name__ == "__main__":
    combine_src_files()
    print("\nSource documentation file created successfully")