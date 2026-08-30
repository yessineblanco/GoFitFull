import re
import os
import base64
import zlib
import urllib.request
import urllib.error

print("Starting generation...", flush=True)

# Read the markdown file
with open(r'C:\Users\yessi\.gemini\antigravity\brain\2e858ef6-61a4-4410-b248-a2aa635d2134\uml_diagrams.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all mermaid blocks and their preceding headings
blocks = re.findall(r'### (.*?)\n.*?```mermaid\n(.*?)```', content, re.DOTALL)
print(f"Found {len(blocks)} blocks.", flush=True)

output_dir = r'C:\Users\yessi\Desktop\work\GoFit\output\diagrams'
os.makedirs(output_dir, exist_ok=True)

def kroki_encode(text):
    compressed = zlib.compress(text.encode('utf-8'), 9)
    return base64.urlsafe_b64encode(compressed).decode('ascii')

for title, code in blocks:
    safe_title = re.sub(r'[^a-zA-Z0-9]+', '_', title).strip('_').lower()
    encoded = kroki_encode(code.strip())
    url = f'https://kroki.io/mermaid/png/{encoded}'
    out_path = os.path.join(output_dir, f'{safe_title}.png')
    
    print(f'Generating {safe_title}.png...', flush=True)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(out_path, 'wb') as out_f:
                out_f.write(response.read())
        print(f'Saved to {out_path}', flush=True)
    except Exception as e:
        print(f'Failed to generate {safe_title}: {e}', flush=True)

print('Done!', flush=True)
