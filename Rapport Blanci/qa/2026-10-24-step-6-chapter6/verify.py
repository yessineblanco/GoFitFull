from pathlib import Path
import json,re,hashlib,difflib
from PIL import Image
import xml.etree.ElementTree as ET

OUT=Path(__file__).resolve().parent
REPORT=OUT.parents[1]
ROOT=REPORT.parent
main=REPORT/'main.tex'
text=main.read_text(encoding='utf-8')
before=(OUT/'main-before.txt').read_text(encoding='utf-8')
marker='\\chapter{Deployment and closing phase}'
assert before[:before.index(marker)]==text[:text.index(marker)]
assert before[before.index('\\subsection{Automated Checks and Evidence-Based QA Status}'):]==text[text.index('\\subsection{Automated Checks and Evidence-Based QA Status}'):]
assert re.findall(r'^FR-\d+ & .*$',before,re.M)==re.findall(r'^FR-\d+ & .*$',text,re.M)
labels=re.findall(r'\\label\{([^}]+)\}',text)
refs=re.findall(r'\\(?:ref|pageref)\{([^}]+)\}',text)
assert len(labels)==len(set(labels))
assert not set(refs)-set(labels),set(refs)-set(labels)
for name in re.findall(r'\\path\{([^}]+)\}',text):assert (REPORT/name).exists(),name
for env in ['figure','longtable','begingroup','enumerate','itemize']:
    if env=='begingroup':assert text.count('\\begingroup')==text.count('\\endgroup')
    else:assert text.count('\\begin{'+env+'}')==text.count('\\end{'+env+'}'),env
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior_assets=json.loads((REPORT/'qa/2026-10-24-step-5-supervisor/figure-hashes.json').read_text(encoding='utf-8'))
assert len(prior_assets)==33
for asset in prior_assets:
    p=REPORT/asset['path']
    assert sha(p)==asset['sha256']
    with Image.open(p) as im:im.verify()
    if p.with_suffix('.svg').exists():ET.parse(p.with_suffix('.svg'))
removed=['tab:pdf-93-44','tab:pdf-95-46','tab:pdf-96-47','tab:pdf-97-48','tab:pdf-100-50','tab:pdf-101-51','tab:pdf-103-53']
assert all(label in before and label not in text for label in removed)
assert before.count('\\begin{longtable}')-text.count('\\begin{longtable}')==7
sources=['GoFitMobile/package.json','GoFitMobile/tsconfig.json','GoFitMobile/eas.json','admin-panel/package.json','admin-panel/tsconfig.json','GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx','GoFitMobile/src/store/timerStore.ts','admin-panel/lib/bi-finance.ts','admin-panel/lib/bi-user-lifecycle.ts','admin-panel/lib/bi-coach-ops.ts','admin-panel/lib/bi-client-health.ts','docs/automation/n8n/README.md','Rapport Blanci/deployment-verification.md','Rapport Blanci/qa/2026-10-22/results.json','Rapport Blanci/qa/2026-10-22/fixes/SETTINGS-08/verification.json','Rapport Blanci/qa/2026-10-23-admin/fixes/DASH-03/verification.json']
sources+= [str(p.relative_to(ROOT)).replace('\\','/') for p in (ROOT/'docs/automation/n8n/workflows').glob('*.json')]
(OUT/'source-hashes.json').write_text(json.dumps({p:sha(ROOT/p) for p in sources},indent=2)+'\n',encoding='utf-8')
mobile=json.loads((ROOT/'GoFitMobile/package.json').read_text(encoding='utf-8'))
admin=json.loads((ROOT/'admin-panel/package.json').read_text(encoding='utf-8'))
assert mobile['devDependencies']['typescript']=='~5.9.2'
assert admin['devDependencies']['typescript']=='^5'
assert mobile['dependencies']['@stripe/stripe-react-native']=='0.50.3'
workflows=[]
for p in sorted((ROOT/'docs/automation/n8n/workflows').glob('*.json')):
    data=json.loads(p.read_text(encoding='utf-8'))
    code='\n'.join(n.get('parameters',{}).get('jsCode','') for n in data['nodes'])
    intervals=[n.get('parameters',{}).get('rule') for n in data['nodes'] if 'scheduleTrigger' in n.get('type','')]
    workflows.append({'file':p.name,'nodeTypes':[n['type'] for n in data['nodes']],'scheduleRules':intervals,'sha256':sha(p)})
    expected={'ai-session-prep-v1.json':'ai_session_ready','booking-reminders-v1.json':'booking_starting_soon','check-in-reminders-v1.json':'check_in_due','admin-ops-digest-v1.json':'automation_failures_count'}.get(p.name)
    if expected:assert expected in code,expected
(OUT/'workflow-structure.json').write_text(json.dumps(workflows,indent=2)+'\n',encoding='utf-8')
def chapter(s):return s[s.index(marker):s.index('\\chapter*{General Conclusion}')]
oldwords=len(chapter(before).split());newwords=len(chapter(text).split())
changes=json.loads((OUT/'corrections.json').read_text(encoding='utf-8'))
for c in changes:
    if c['new']:c['revisedLine']=text[:text.index(c['new'],text.index(marker))].count('\n')+1
(OUT/'corrections.json').write_text(json.dumps(changes,indent=2)+'\n',encoding='utf-8')
(OUT/'main-revision.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='step-5/main.tex',tofile='step-6/main.tex')),encoding='utf-8')
v={'date':'2026-10-24','step':6,'status':'content_revised_awaiting_user_review_compiler_dependency_blocked','step5Approved':True,'corrections':len(changes),'chapter6WhitespaceTokensBefore':oldwords,'chapter6WhitespaceTokensAfter':newwords,'chapter6ReductionPercent':round((oldwords-newwords)*100/oldwords,1),'removedRedundantTables':removed,'retainedLongtablesInReport':text.count('\\begin{longtable}'),'earlierChaptersPreserved':True,'requirementsMatrixRowsPreserved':True,'entireFinalQaAndConclusionsPreserved':True,'figuresUnchanged':True,'graphicsReferencesChecked':33,'allLabelsPathsReferencesResolve':True,'sourceFilesHashed':len(sources),'workstationVerification':'CIM unavailable; exact hardware specifications not claimed','newAppTestsOrBackendChanges':False,'compile':{'tool':'compile_latex_document','success':False,'reason':'Missing Biber executable; final returned diagnostics retained separately','separatePdfCreated':False,'existingEditorKeptOpen':True},'revisedSha256':sha(main)}
if (OUT/'verification.json').exists():
    prior=json.loads((OUT/'verification.json').read_text(encoding='utf-8'))
    if prior.get('userApproval'):
        v.update(status='approved_by_user_compiler_dependency_blocked',userApproval=prior['userApproval'],approvalDate=prior['approvalDate'])
(OUT/'verification.json').write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
manifest=[{'file':str(p.relative_to(OUT)),'sha256':sha(p)} for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='evidence-manifest.json']
(OUT/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(v,indent=2))
