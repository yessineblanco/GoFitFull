from pathlib import Path
import json
import pypdfium2 as pdfium
from pypdf import PdfReader
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
PDF = ROOT / 'render/main.pdf'
OUT = ROOT / 'pages'
OUT.mkdir(exist_ok=True)
doc = pdfium.PdfDocument(PDF)
reader = PdfReader(PDF)
index = []
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ''
    index.append({'pdfPage': i+1, 'text': text, 'images': len(page.images)})
(ROOT/'page-index.json').write_text(json.dumps(index, indent=2), encoding='utf-8')
for start in range(0, len(doc), 12):
    sheet = Image.new('RGB', (1200, 1740), '#cbd0d3')
    draw = ImageDraw.Draw(sheet)
    for j in range(start, min(start+12, len(doc))):
        im = doc[j].render(scale=0.50).to_pil().convert('RGB')
        im.thumbnail((290, 405))
        x = ((j-start)%4)*300
        y = ((j-start)//4)*580
        sheet.paste(im, (x+(300-im.width)//2, y+24))
        draw.text((x+8, y+5), f'PDF page {j+1}', fill='black')
    sheet.save(OUT/f'overview-{start+1:03d}-{min(start+12,len(doc)):03d}.jpg', quality=88)
print(json.dumps({'pages': len(doc), 'overviewSheets': (len(doc)+11)//12, 'figurePages': [p['pdfPage'] for p in index if p['images']], 'shortPages': [p['pdfPage'] for p in index if len(p['text'])<180]}))
