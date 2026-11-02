import os
import pypdf

pdf_path = os.path.expanduser('~/Downloads/PG Manager Core Screens (2).pdf')
out_dir = os.path.expanduser('/Users/zdofice02/Documents/GitHub/pg-owner-mobile/docs')
os.makedirs(out_dir, exist_ok=True)
out_file = os.path.join(out_dir, 'DESIGN_SCREENS_CATALOG.md')

reader = pypdf.PdfReader(pdf_path)
lines_out = []
lines_out.append('# PG Manager Core Screens Design Catalog (56 Screens)\n\n')
lines_out.append('Source: Claude Artifact `6c9060d4-d06a-42e0-9456-b4559bbc1eaf` (`PG Manager Core Screens (2).pdf`)\n\n')

for i, page in enumerate(reader.pages):
    txt = page.extract_text() or ''
    page_lines = [l.strip() for l in txt.split('\n') if l.strip()]
    title = page_lines[0] if page_lines else 'Empty'
    lines_out.append(f'### Page {i+1}: {title}\n\n')
    lines_out.append('```text\n')
    lines_out.append('\n'.join(page_lines))
    lines_out.append('\n```\n\n')

with open(out_file, 'w', encoding='utf-8') as f:
    f.write(''.join(lines_out))

print(f'Successfully cataloged {len(reader.pages)} screens into {out_file}')

