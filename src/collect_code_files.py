import os

# File extensions and their corresponding output text files
file_types = {
    '.js': 'all_scripts_js.txt',
    '.html': 'all_scripts_html.txt',
    '.css': 'all_scripts_css.txt'
}

# Create or clear the output files
for output in file_types.values():
    with open(output, 'w', encoding='utf-8') as f:
        f.write(f"--- Combined file for {output.replace('all_scripts_', '').replace('.txt', '').upper()} ---\n\n")

# Walk through all folders recursively
for root, _, files in os.walk('.'):
    for file in files:
        ext = os.path.splitext(file)[1].lower()
        if ext in file_types:
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                # Write the content with clear headers and dividers
                with open(file_types[ext], 'a', encoding='utf-8') as out:
                    out.write(f"{'='*80}\n")
                    out.write(f"File: {filepath}\n")
                    out.write(f"{'-'*80}\n")
                    out.write(content)
                    out.write(f"\n{'='*80}\n\n")

            except Exception as e:
                print(f"⚠️ Skipping {filepath}: {e}")

print("✅ Done! Contents written to:")
for ext, output in file_types.items():
    print(f"   • {output}")
