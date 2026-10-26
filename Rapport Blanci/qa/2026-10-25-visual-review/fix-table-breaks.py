from pathlib import Path
import re
p=Path(__file__).resolve().parents[2]/'main.tex'
s=p.read_text(encoding='utf-8')
count=0
def fix(m):
    global count
    block=m.group()
    if not any(label in block for label in ('tab:pdf-42-21','tab:pdf-64-30','tab:pdf-85-41','tab:implementation-evidence','tab:pdf-113-56')):
        return block
    count+=1
    # Permit breaks after visible slash separators without changing wording.
    return block.replace('/',r'\slash{}').replace('Precondit ions','Preconditions')
s=re.sub(r'\\begin\{longtable\}.*?\\end\{longtable\}',fix,s,flags=re.S)
p.write_text(s,encoding='utf-8')
print('Adjusted tables:',count)
