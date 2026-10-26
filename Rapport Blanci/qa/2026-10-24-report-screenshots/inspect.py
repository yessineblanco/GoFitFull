from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
choices={
'client':['qa/2026-10-22/screenshots/'+s+'.png' for s in ['CLIENT-001-onboarding-before-skip','CLIENT-089-library-native','CLIENT-012-exercise-detail','CLIENT-097-builder-form','CLIENT-103-edited-workout-detail','CLIENT-037-progress-loaded','CLIENT-024-nutrition-dashboard','CLIENT-031-food-added','CLIENT-058-body-measurement-form','CLIENT-060-camera-denial-handled','CLIENT-134-coach-marketplace','CLIENT-180-duration-booking-45']],
'coach':['qa/2026-10-23-coach/screenshots/'+s+'.png' for s in ['COACH-004-app-welcome','COACH-092-fixed-restart-dashboard','COACH-023-client-list','COACH-124-current-streak-corrected','COACH-099-fixed-return-october','COACH-106-availability-preserved-after-fix','COACH-117-duration-60-restored','COACH-068-programs-list','COACH-069-program-builder-empty','COACH-035-note-persisted','COACH-064-session-packs','COACH-062-conversations']],
'payment':['qa/2026-10-22/fixes/COACHING-07/payment-fulfillment/screenshots/'+s+'.png' for s in ['PACK-003-test-card','PACK-006-payment-result','PACK-007-saved','ADMIN-verified-sandbox-payment']]+['qa/2026-10-24-session-payments/screenshots/session-payment-admin.png'],
'admin':['qa/2026-10-23-admin/fixes/DASH-03/screenshots/dashboard-profile-count.png','qa/2026-10-23-admin/screenshots/ADMIN-028-coaches-ready.png','qa/2026-10-23-admin/screenshots/ADMIN-029-coach-approval-confirmation.png','qa/2026-10-23-admin/screenshots/ADMIN-010-exercises.png','qa/2026-10-23-admin/fixes/WORK-05/02-edited-and-reloaded.png','qa/2026-10-23-admin/fixes/AUDIT-03/screenshots/activity-log-api-consistency.png']}
for group,paths in choices.items():
 for offset in range(0,len(paths),6):
  batch=paths[offset:offset+6]
  thumbw,thumbh=(570,390) if group=='admin' else (330,680)
  canvas=Image.new('RGB',(3*thumbw,2*(thumbh+40)),'#dddddd');d=ImageDraw.Draw(canvas)
  for i,name in enumerate(batch):
   im=Image.open(ROOT/name).convert('RGB');im.thumbnail((thumbw-12,thumbh))
   x=(i%3)*thumbw+(thumbw-im.width)//2;y=(i//3)*(thumbh+40)+30
   canvas.paste(im,(x,y));d.text(((i%3)*thumbw+4,(i//3)*(thumbh+40)+5),Path(name).name,fill='black')
  canvas.save(OUT/f'inspect-{group}-{offset//6+1}.jpg')
(OUT/'candidates.json').write_text(json.dumps(choices,indent=2)+'\n',encoding='utf-8')
print('Inspection thumbnails created; original evidence files unchanged.')
