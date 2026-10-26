"""Render the approved Sprint 1 domain view. Run with Python and matplotlib."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle


OUTPUT = Path(__file__).resolve().parents[1]
NAVY = "#343434"
INK = "#202020"
PALE = "white"
plt.rcParams.update({"font.family": "DejaVu Sans", "svg.fonttype": "none"})
fig, ax = plt.subplots(figsize=(8, 10))
fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
ax.set(xlim=(0, 8), ylim=(0.65, 10.65))
ax.axis("off")
fig.patch.set_facecolor("white")


def box(x, top, width, name, fields, stereotype=None):
    header = 0.55 if stereotype else 0.37
    height = header + 0.11 + len(fields) * 0.215 + 0.10
    bottom = top - height
    ax.add_patch(Rectangle((x, bottom), width, height, facecolor="white",
                           edgecolor=NAVY, linewidth=0.8, zorder=2))
    ax.add_patch(Rectangle((x, top - header), width, header, facecolor=PALE,
                           edgecolor=NAVY, linewidth=0.8, zorder=3))
    if stereotype:
        ax.text(x + width / 2, top - 0.15, f"«{stereotype}»", ha="center",
                va="center", fontsize=8.4, color=INK, zorder=4)
    ax.text(x + width / 2, top - header + 0.18, name, ha="center",
            va="center", fontsize=10, fontweight="bold", color=NAVY, zorder=4)
    y = top - header - 0.20
    for field in fields:
        ax.text(x + 0.14, y, field, ha="left", va="center", fontsize=9.3,
                color=INK, zorder=4)
        y -= 0.215
    return {"x": x, "right": x + width, "top": top, "bottom": bottom,
            "cx": x + width / 2}


def line(points):
    ax.plot(*zip(*points), color=NAVY, linewidth=0.8, zorder=1)


def label(x, y, text, align="center"):
    ax.text(x, y, text, ha=align, va="center", fontsize=8.6, color=INK,
            bbox={"facecolor": "white", "edgecolor": "none", "pad": 1}, zorder=5)


def diamond(x, y):
    ax.add_patch(Polygon([(x, y), (x + 0.065, y - 0.11),
                          (x, y - 0.22), (x - 0.065, y - 0.11)],
                         closed=True, facecolor=NAVY, edgecolor=NAVY, zorder=4))


left, right, width = 0.40, 4.50, 3.10
account = box(left, 10.40, width, "UserAccount", ["id"], "external identity")
profile = box(right, 10.40, width, "UserProfile", ["id", "goal", "weightKg", "heightCm"])
workout = box(left, 8.30, width, "Workout", ["id", "name", "workoutType"])
session = box(right, 8.30, width, "WorkoutSession",
              ["id", "startedAt", "completedAt", "durationMinutes"])
entry = box(left, 5.65, width, "WorkoutExercise",
            ["id", "sets", "reps", "restSeconds", "day", "orderIndex"])
snapshot = box(right, 5.65, width, "SessionExerciseSnapshot",
               ["exerciseId", "exerciseName", "sets", "reps", "restTime",
                "completedSets", "weights", "completed"], "embedded value object")
exercise = box(left, 2.78, width, "Exercise", ["id", "name", "category"])
timer = box(right, 2.78, width, "TimerPreferences",
            ["audioEnabled", "hapticsEnabled", "autoAdvance", "warningSeconds",
             "defaultRestSeconds"], "local configuration")

# An account may exist before its profile is created.
line([(account["right"], 9.95), (profile["x"], 9.95)])
label(account["right"] + 0.07, 10.11, "1")
label(profile["x"] - 0.11, 10.11, "0..1")
label(4.0, 9.78, "has")

# Native workouts have no personal owner; custom workouts have one.
line([(account["cx"], account["bottom"]), (workout["cx"], workout["top"])])
label(account["cx"] - 0.11, account["bottom"] - 0.18, "0..1", "right")
label(workout["cx"] - 0.11, workout["top"] + 0.17, "0..*", "right")
label(account["cx"] + 0.12, 8.83, "owns", "left")

# Route account/session ownership around the profile and the workout.
line([(account["right"], 9.50), (4.0, 9.50), (4.0, 8.67),
      (session["cx"], 8.67), (session["cx"], session["top"])])
label(account["right"] - 0.10, 9.37, "1", "right")
label(5.14, 8.67, "performs")
label(session["cx"] + 0.09, 8.48, "0..*", "left")

line([(workout["right"], 7.72), (session["x"], 7.72)])
label(workout["right"] + 0.07, 7.90, "0..1", "left")
label(session["x"] - 0.07, 7.90, "0..*", "right")
label(4.0, 7.54, "used for")

line([(workout["cx"], workout["bottom"]), (entry["cx"], entry["top"])])
diamond(workout["cx"], workout["bottom"])
label(workout["cx"] - 0.10, workout["bottom"] - 0.27, "1", "right")
label(entry["cx"] - 0.10, entry["top"] + 0.15, "0..*", "right")
label(entry["cx"] + 0.12, 6.13, "contains", "left")

line([(session["cx"], session["bottom"]), (snapshot["cx"], snapshot["top"])])
diamond(session["cx"], session["bottom"])
label(session["cx"] - 0.10, session["bottom"] - 0.27, "1", "right")
label(snapshot["cx"] - 0.10, snapshot["top"] + 0.15, "0..*", "right")
label(snapshot["cx"] + 0.12, 6.17, "embeds", "left")

line([(entry["cx"], entry["bottom"]), (exercise["cx"], exercise["top"])])
label(entry["cx"] - 0.10, entry["bottom"] - 0.16, "0..*", "right")
label(exercise["cx"] - 0.10, exercise["top"] + 0.15, "1", "right")
label(exercise["cx"] + 0.12, 3.16, "references", "left")

for extension in ("png", "svg"):
    fig.savefig(OUTPUT / f"class_diagram_sprint1.{extension}", dpi=300,
                facecolor="white", transparent=False)
plt.close(fig)
