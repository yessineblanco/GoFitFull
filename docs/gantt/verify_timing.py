from datetime import datetime

phases = [
    ("Phase 1", "2026-01-26", "2026-02-16"),
    ("Phase 2", "2026-02-16", "2026-03-02"),
    ("Phase 3", "2026-03-02", "2026-04-06"),
    ("Phase 4", "2026-04-06", "2026-04-27"),
    ("Phase 5", "2026-04-27", "2026-05-25"),
    ("Phase 6", "2026-05-25", "2026-06-08"),
    ("Phase 7", "2026-06-08", "2026-06-29"),
    ("Phase 8", "2026-06-29", "2026-07-26"),
]

print("=" * 60)
print("TIMING VERIFICATION")
print("=" * 60)
print()

total_days = 0
for name, start, end in phases:
    start_dt = datetime.strptime(start, "%Y-%m-%d")
    end_dt = datetime.strptime(end, "%Y-%m-%d")
    days = (end_dt - start_dt).days
    weeks = days / 7
    total_days += days
    print(f"{name:20} {start} -> {end:12} = {days:3} days ({weeks:.1f} weeks)")

print()
print("=" * 60)
print(f"TOTAL DURATION: {total_days} days ({total_days/7:.1f} weeks)")
print(f"PROJECT SPAN: 2026-01-26 -> 2026-07-26 = {(datetime.strptime('2026-07-26', '%Y-%m-%d') - datetime.strptime('2026-01-26', '%Y-%m-%d')).days} days")
print("=" * 60)
