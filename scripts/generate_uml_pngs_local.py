import re
import os
import subprocess

# Read the markdown file
with open(r'C:\Users\yessi\.gemini\antigravity\brain\2e858ef6-61a4-4410-b248-a2aa635d2134\uml_diagrams.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all mermaid blocks and their preceding headings
blocks = re.findall(r'### (.*?)\n.*?```mermaid\n(.*?)```', content, re.DOTALL)

output_dir = r'C:\Users\yessi\Desktop\work\GoFit\output\diagrams'
tmp_dir = r'C:\Users\yessi\Desktop\work\GoFit\tmp\mermaid'
os.makedirs(output_dir, exist_ok=True)
os.makedirs(tmp_dir, exist_ok=True)

print(f"Found {len(blocks)} blocks.", flush=True)

for title, code in blocks:
    safe_title = re.sub(r'[^a-zA-Z0-9]+', '_', title).strip('_').lower()
    out_path = os.path.join(output_dir, f'{safe_title}.png')
    mmd_path = os.path.join(tmp_dir, f'{safe_title}.mmd')
    
    # Save the mermaid code to a file
    with open(mmd_path, 'w', encoding='utf-8') as f:
        f.write(code.strip())
    
    print(f'Generating {safe_title}.png...', flush=True)
    try:
        # call mmdc via npx
        cmd = ['npx.cmd', '--yes', '-p', '@mermaid-js/mermaid-cli', 'mmdc', '-i', mmd_path, '-o', out_path, '-b', 'white']
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f'Saved to {out_path}', flush=True)
        else:
            print(f'Failed to generate {safe_title}: {result.stderr}', flush=True)
    except Exception as e:
        print(f'Failed to generate {safe_title}: {e}', flush=True)

print('Done!', flush=True)
