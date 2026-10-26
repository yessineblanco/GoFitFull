from pathlib import Path
from collections import Counter
import ast,csv,difflib,hashlib,json,re
from datetime import date
from PIL import Image
import xml.etree.ElementTree as ET

OUT=Path(__file__).resolve().parent
REPORT=OUT.parents[1]
ROOT=REPORT.parent
text=(REPORT/'main.tex').read_text(encoding='utf-8')
before=(OUT/'main-before.txt').read_text(encoding='utf-8')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
labels=re.findall(r'\\label\{([^}]+)\}',text)
refs=re.findall(r'\\(?:ref|pageref)\{([^}]+)\}',text)
assert len(labels)==len(set(labels))
assert not set(refs)-set(labels),set(refs)-set(labels)
assert not any(x in text for x in ('February','June 2026','five-month','Sprint Burn Down Chart','burn-down chart interpretation'))
assert text.count('\\section{Progress Tracking and Evidence Limits}')==3
assert 'tab:pdf-42-20' not in text
assert 'Admin panel libraries and implementation roles' not in text
assert 'Sprint 1 implementation components' not in text
assert re.findall(r'^US-.* & T[345]\.\d\.\d & .*$',before,re.M)==re.findall(r'^US-.* & T[345]\.\d\.\d & .*$',text,re.M)
assert re.findall(r'^S[123]-T\d+ & .*$',before,re.M)==re.findall(r'^S[123]-T\d+ & .*$',text,re.M)
assert before[before.index('\\chapter*{General Conclusion}'):]==text[text.index('\\chapter*{General Conclusion}'):]
chapters=list(re.finditer(r'\\chapter\{([^}]+)\}',text))
chapter_review=[]
for i,m in enumerate(chapters):
    end=chapters[i+1].start() if i+1<len(chapters) else text.index('\\chapter*{General Conclusion}')
    block=text[m.end():end]
    assert block.count('\\section*{Introduction}')==1
    assert block.count('\\section*{Conclusion}')==1
    chapter_review.append({'chapter':m.group(1),'introduction':True,'conclusion':True})

assets=[]
for name in re.findall(r'\\includegraphics(?:\[[^]]*\])?\{([^}]+)\}',text):
    p=REPORT/name
    with Image.open(p) as image:image.verify()
    if p.with_suffix('.svg').exists():ET.parse(p.with_suffix('.svg'))
    assets.append({'path':name,'sha256':sha(p)})
for name in re.findall(r'\\path\{([^}]+)\}',text):assert (REPORT/name).exists(),name
(OUT/'figure-hashes.json').write_text(json.dumps(assets,indent=2)+'\n',encoding='utf-8')
# Derive selected class concept sets from actual renderer definitions, without executing them.
foundation=[]
extension=[]
for filename,target,argindex in [('build_sprint1_class_diagram.py',foundation,3),('build_sprint2_class_diagram.py',extension,2)]:
    tree=ast.parse((REPORT/'figures/source'/filename).read_text(encoding='utf-8'))
    for node in ast.walk(tree):
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='box':
            value=node.args[argindex]
            if isinstance(value,ast.Constant) and isinstance(value.value,str):target.append(value.value)
sprint3=json.loads((REPORT/'figures/source/sprint3-render-manifest.json').read_text(encoding='utf-8'))
s3=set(c for view in sprint3 for c in view['concepts'])
assert len(foundation)==8
assert len(set(foundation)|set(extension))==14
assert len(set(foundation)|set(extension)|s3)==30
assert text.count('{figures/class_diagram_sprint1.png}')==2
for label in ['fig:class_sprint2_foundation','fig:class_sprint2','fig:class_sprint3','fig:class_sprint3_communication','fig:class_sprint3_followup','fig:class_sprint3_finance']:
    assert label in labels and label in refs,label
(OUT/'cumulative-model-check.json').write_text(json.dumps({'sprint1Concepts':foundation,'sprint2ViewConcepts':extension,'sprint3Views':sprint3,'cumulativeDistinctConceptCounts':[8,14,30],'selectedViewsNotExhaustiveSchema':True,'historicalSprintEndSnapshot':False},indent=2)+'\n',encoding='utf-8')

planning={}
for name in ['GANTT_SPRINTS.csv','GANTT_SCRUM.csv']:
    p=ROOT/'docs/gantt'/name
    with p.open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
    planning[name]={'entries':len(rows),'start':min(r['Start Date'] for r in rows),'end':max(r['End Date'] for r in rows),'sha256':sha(p),'rows':rows}
assert planning['GANTT_SPRINTS.csv']['entries']==23
assert planning['GANTT_SCRUM.csv']['entries']==13
(OUT/'planning-evidence.json').write_text(json.dumps({'userConfirmedInternship':{'start':'2026-01-26','end':'2026-07-26','reply':'26 January–26 July 2026 this one is correct'},'reportSprintToCalendarMappingConfirmed':False,'alternativePlans':planning,'smallerBreakdownDeclaredCount':22,'smallerCsvCount':23,'logbookContainsIdentityPlaceholders':True,'burndownDailySeriesAvailable':False},indent=2)+'\n',encoding='utf-8')

table_inventory=[]
for m in re.finditer(r'\\begin\{longtable\}[\s\S]*?\\end\{longtable\}',before):
    cap=re.search(r'\\caption\{([^}]+)\}',m.group())
    label=re.search(r'\\label\{([^}]+)\}',m.group())
    title=cap.group(1) if cap else ''
    key=label.group(1) if label else ''
    disposition='Retained; no obsolete replacement identified in this checklist scope'
    if key=='tab:pdf-42-20':disposition='Removed: redundant and inaccurate workout flow; replaced by existing detailed sequence references'
    elif key=='tab:pdf-41-19':disposition='Revised: actual artifact names and evidence boundary; generic predecessor already absent'
    elif key=='tab:pdf-27-15':disposition='Revised: competing planning artifacts are not execution evidence'
    elif key=='tab:pdf-113-56':disposition='Scenario rows preserved; introduction updated for confirmed internship dates and completed Step 4 reconciliation'
    elif key in ('tab:pdf-88-42','tab:pdf-88-43','tab:pdf-95-46','tab:pdf-96-47','tab:pdf-97-48','tab:pdf-101-51','tab:pdf-103-53'):
        disposition='Retained for separate Step 6 tooling/technical-claim tightening; not certified by this checklist review'
    table_inventory.append({'caption':title,'label':key,'originalLine':before[:m.start()].count('\n')+1,'disposition':disposition,'presentAfterRevision':key in labels})
(OUT/'table-review.json').write_text(json.dumps(table_inventory,indent=2)+'\n',encoding='utf-8')
sources=['docs/gantt/SPRINT_BREAKDOWN.md','docs/gantt/SCRUM_SPRINT_BREAKDOWN.md','docs/gantt/GANTT_SPRINTS.csv','docs/gantt/GANTT_SCRUM.csv','docs/INTERNSHIP_LOGBOOK_SPRINTS_1.1_to_3.3_EN.md','tmp/apply_supervisor_revisions.py','GoFitMobile/src/navigation/AuthNavigator.tsx','GoFitMobile/src/navigation/OnboardingNavigator.tsx','GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx','GoFitMobile/src/store/authStore.ts','GoFitMobile/src/store/profileStore.ts','GoFitMobile/src/store/workoutsStore.ts','GoFitMobile/src/store/timerStore.ts','GoFitMobile/src/store/uiStore.ts','GoFitMobile/src/services/auth.ts','GoFitMobile/src/services/workouts.ts','GoFitMobile/src/services/offlineQueue.ts']
(OUT/'source-hashes.json').write_text(json.dumps({p:sha(ROOT/p) for p in sources},indent=2)+'\n',encoding='utf-8')
corrections=json.loads((OUT/'corrections.json').read_text(encoding='utf-8'))
for c in corrections:
    if c.get('new') in text:c['revisedLine']=text[:text.index(c['new'])].count('\n')+1
(OUT/'corrections.json').write_text(json.dumps(corrections,indent=2)+'\n',encoding='utf-8')
(OUT/'main-revision.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='step-4/main.tex',tofile='step-5/main.tex')),encoding='utf-8')
v={'date':'2026-10-24','step':5,'status':'revised_awaiting_user_review_with_chronology_limits','step4Approved':True,'step6Started':False,'userConfirmedInternship':['2026-01-26','2026-07-26'],'exactSprintMapping':'unverified','fabricatedDatesOrBurndownData':False,'chaptersChecked':chapter_review,'cumulativeConceptCounts':[8,14,30],'originalTablesReviewed':len(table_inventory),'tablesRemoved':1,'remainingTables':text.count('\\begin{longtable}'),'sprintBacklogRowsAndVerdictsPreserved':True,'generalConclusionPreserved':True,'graphicsReferencesChecked':len(assets),'allReferencesAndPathsResolve':True,'compile':{'success':False,'reason':'Missing Biber executable in built-in compiler; source reaches XDV output','existingEditorKeptOpen':True,'separatePdfCreated':False},'appOrBackendChanges':False,'mainSha256':sha(REPORT/'main.tex')}
(OUT/'verification.json').write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
manifest=[{'file':str(p.relative_to(OUT)),'sha256':sha(p)} for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='evidence-manifest.json']
(OUT/'evidence-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps(v,indent=2))
