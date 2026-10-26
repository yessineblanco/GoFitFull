from pathlib import Path
from collections import Counter
import ast, difflib, hashlib, json, re
import xml.etree.ElementTree as ET
from PIL import Image

OUT=Path(__file__).resolve().parent
REPORT=OUT.parents[1]
ROOT=REPORT.parent
main=REPORT/'main.tex'
text=main.read_text(encoding='utf-8')
before=(OUT/'main-before.txt').read_text(encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
labels=re.findall(r'\\label\{([^}]+)\}',text)
refs=re.findall(r'\\(?:ref|pageref)\{([^}]+)\}',text)
assert len(labels)==len(set(labels))
assert not set(refs)-set(labels),set(refs)-set(labels)
images=re.findall(r'\\includegraphics(?:\[[^]]*\])?\{([^}]+)\}',text)
for image in images:
    p=REPORT/image
    assert p.is_file(),p
    with Image.open(p) as im: im.verify()
    if p.with_suffix('.svg').is_file(): ET.parse(p.with_suffix('.svg'))
paths=re.findall(r'\\path\{([^}]+)\}',text)
for p in paths: assert (REPORT/p).exists(),p
rows=json.loads((OUT/'validation-rows.json').read_text(encoding='utf-8'))
assert len(rows)==18
assert Counter(r['status'] for r in rows)=={'Pending':12,'Partial':5,'Scoped pass':1}
assert 'TODO: attach' not in text
assert not re.search(r'^S[123]-T\d+ .*Validated',text,re.M)
for r in rows:
    found=re.findall(r'^'+r['id']+r' & .*$',text,re.M)
    assert len(found)==1
    assert found[0].count(' & ')==8
# Original planning rows and estimates have not been silently rewritten.
original_backlog=re.findall(r'^US-[345]\.\d & .* & T[345]\.\d\.\d & .*$',before,re.M)
current_backlog=re.findall(r'^US-[345]\.\d & .* & T[345]\.\d\.\d & .*$',text,re.M)
assert original_backlog==current_backlog and len(current_backlog)==36
assert len(json.loads((OUT/'story-traceability.json').read_text(encoding='utf-8')))==12
# Preserve previously reconciled final QA and conclusions verbatim.
for marker in ('\\label{sec:qa-evidence}', '\\chapter*{General Conclusion}'):
    if marker in before:
        original=before[before.index(marker):]
        current=text[text.index(marker):]
        assert original==current,marker

index=json.loads((REPORT/'qa/2026-10-24-step-2-evidence-matrix/matrix.json').read_text(encoding='utf-8'))
sources={}
for record in index['records']:
    for source in record['sources']:
        p=ROOT/source['path']
        assert digest(p)==source['sha256'],source['path']
        sources[source['path']]=source['sha256']
for p in (REPORT/'figures/source').glob('build_*.py'):
    ast.parse(p.read_text(encoding='utf-8-sig'))
    sources[str(p.relative_to(ROOT))]=digest(p)
for p in [ROOT/'supabase/functions/stripe-payment/index.ts',ROOT/'GoFitMobile/src/screens/marketplace/BookSessionScreen.tsx',ROOT/'GoFitMobile/src/screens/marketplace/CoachDetailScreen.tsx',ROOT/'GoFitMobile/src/utils/bookingTime.ts',ROOT/'database/migrations/20261024122314_verified_session_payments.sql']:
    sources[str(p.relative_to(ROOT))]=digest(p)
(OUT/'source-hashes.json').write_text(json.dumps(sources,indent=2)+'\n',encoding='utf-8')
# Record precise revised locations so this audit remains reviewable.
anchors=['The backlog is retained as a planning artifact','This backlog records planned scope','The original task wording remains a target','The following use case and sequences describe','Figure~\\ref{fig:seq_booking_ssd} makes','Cross-sprint artifact traceability']
locations={a:next(i for i,l in enumerate(text.splitlines(),1) if a in l) for a in anchors}
locations.update({r['id']: next(i for i,l in enumerate(text.splitlines(),1) if l.startswith(r['id']+' & ')) for r in rows})
(OUT/'locations.json').write_text(json.dumps(locations,indent=2)+'\n',encoding='utf-8')
(OUT/'main-revision.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='step-3/main.tex',tofile='step-4/main.tex')),encoding='utf-8')
result={'date':'2026-10-24','step':4,'status':'content_revised_awaiting_user_review_compiler_dependency_blocked','step3Approved':True,'step5Started':False,'storiesMapped':12,'originalBacklogRowsPreserved':36,'sprintTestRowsReconciled':18,'testVerdicts':dict(Counter(r['status'] for r in rows)),'paymentFiguresUpdated':4,'graphicsReferencesChecked':len(images),'distinctFigures':len(set(images)),'labelsUnique':True,'allReferencesResolve':True,'allPathReferencesResolve':True,'sourceHashesChecked':len(sources),'priorFinalQaAndConclusionPreserved':True,'newAppTestsOrProviderTransactions':False,'applicationOrBackendMutations':False,'compile':{'tool':'compile_latex_document','success':False,'reason':'Biber executable missing from built-in compiler environment; source processed to 117-page XDV','bibliographyPreserved':True,'existingEditorKeptOpen':True,'separatePdfCreated':False},'originalSha256':digest(OUT/'main-before.txt'),'revisedSha256':digest(main)}
(OUT/'verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
manifest=[{'file':str(p.relative_to(OUT)),'sha256':digest(p)} for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='evidence-manifest.json']
(OUT/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2))
