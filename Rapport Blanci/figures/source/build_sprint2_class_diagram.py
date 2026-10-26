"""Render the extension view of the approved cumulative Sprint 2 model."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Rectangle


OUTPUT = Path(__file__).resolve().parents[1]
INK = "#202020"
LINE = "#343434"
plt.rcParams.update({"font.family": "DejaVu Sans", "svg.fonttype": "none"})
fig, ax = plt.subplots(figsize=(8, 10.5))
fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
ax.set(xlim=(0, 8), ylim=(0, 10.5))
ax.axis("off")
fig.patch.set_facecolor("white")


def box(x, top, name, fields, stereotype=None):
    width = 3.10
    header = 0.55 if stereotype else 0.37
    height = header + 0.21 + len(fields) * 0.215
    bottom = top - height
    ax.add_patch(Rectangle((x, bottom), width, height, facecolor="white",
                           edgecolor=LINE, linewidth=0.8, zorder=2))
    ax.plot([x, x + width], [top - header, top - header], color=LINE,
            linewidth=0.8, zorder=3)
    if stereotype:
        ax.text(x + width / 2, top - 0.15, f"«{stereotype}»", ha="center",
                va="center", fontsize=8.4, color=INK, zorder=4)
    ax.text(x + width / 2, top - header + 0.18, name, ha="center",
            va="center", fontsize=10, fontweight="bold", color=INK, zorder=4)
    for index, field in enumerate(fields):
        ax.text(x + 0.14, top - header - 0.20 - index * 0.215, field,
                va="center", fontsize=9.3, color=INK, zorder=4)
    return {"x": x, "right": x + width, "top": top, "bottom": bottom,
            "cx": x + width / 2}


def line(points):
    ax.plot(*zip(*points), color=LINE, linewidth=0.8, zorder=1)


def label(x, y, text, align="center"):
    ax.text(x, y, text, ha=align, va="center", fontsize=8.6, color=INK,
            bbox={"facecolor": "white", "edgecolor": "none", "pad": 1}, zorder=5)


left, right = 0.40, 4.50
account = box(left, 10.15, "UserAccount", ["id"], "external identity")
profile = box(right, 10.15, "UserProfile",
              ["id", "dietaryPreferences", "foodAllergies", "foodDislikes"])
measurement = box(left, 7.55, "BodyMeasurement",
                  ["id", "measurementDate", "heightCm", "chestCm", "waistCm",
                   "hipCm", "shoulderCm", "confidence", "source"])
preferences = box(right, 7.55, "NotificationPreferences",
                  ["workoutReminders", "achievementNotifications",
                   "weeklyProgressReports", "notificationTime"], "embedded value object")
photo = box(right, 5.12, "ProgressPhoto", ["id", "photoDate", "category", "storagePath"])
goals = box(left, 3.98, "NutritionGoals",
            ["calorieTarget", "proteinTargetG", "carbsTargetG", "fatTargetG"])
meal = box(right, 2.82, "MealLog", ["id", "loggedDate", "mealType", "servings"])
food = box(left, 2.18, "FoodItem", ["id", "name", "servingLabel", "calories",
                                 "proteinG", "carbsG", "fatG"])

# Retained identity/profile relationship; only new profile fields are expanded.
line([(account["right"], 9.70), (profile["x"], 9.70)])
label(account["right"] + 0.08, 9.88, "1", "left")
label(profile["x"] - 0.08, 9.88, "0..1", "right")
label(4.0, 9.52, "has")

line([(account["cx"], account["bottom"]), (measurement["cx"], measurement["top"])])
label(account["cx"] - 0.10, account["bottom"] - 0.18, "1", "right")
label(measurement["cx"] - 0.10, measurement["top"] + 0.17, "0..*", "right")
label(account["cx"] + 0.12, 8.25, "records", "left")

line([(profile["cx"], profile["bottom"]), (preferences["cx"], preferences["top"])])
y = profile["bottom"]
ax.add_patch(Polygon([(profile["cx"], y), (profile["cx"] + 0.065, y - 0.11),
                      (profile["cx"], y - 0.22), (profile["cx"] - 0.065, y - 0.11)],
                     closed=True, facecolor=LINE, edgecolor=LINE, zorder=4))
label(profile["cx"] - 0.10, profile["bottom"] - 0.27, "1", "right")
label(preferences["cx"] - 0.10, preferences["top"] + 0.15, "0..1", "right")
label(profile["cx"] + 0.12, 8.05, "contains", "left")

# Independently routed account associations; no shared association trunks.
line([(account["right"], 9.31), (4.0, 9.31), (4.0, 4.54), (photo["x"], 4.54)])
label(account["right"] - 0.10, 9.18, "1", "right")
label(photo["x"] - 0.07, 4.72, "0..*", "right")
label(4.0, 5.36, "saves")

line([(account["x"], 9.68), (0.16, 9.68), (0.16, 4.28),
      (goals["cx"], 4.28), (goals["cx"], goals["top"])])
label(account["x"] - 0.08, 9.86, "1", "right")
label(goals["cx"] + 0.09, 4.12, "0..1", "left")
label(0.16, 4.48, "sets")

line([(2.90, account["bottom"]), (2.90, 8.95), (3.72, 8.95),
      (3.72, 2.24), (meal["x"], 2.24)])
label(2.80, 9.02, "1", "right")
label(meal["x"] - 0.07, 2.42, "0..*", "right")
label(3.72, 3.00, "logs")

line([(food["right"], 1.17), (meal["cx"], 1.17), (meal["cx"], meal["bottom"])])
label(food["right"] + 0.07, 1.35, "1", "left")
label(meal["cx"] + 0.09, meal["bottom"] - 0.16, "0..*", "left")
label(4.90, 0.99, "referenced by")

for extension in ("png", "svg"):
    fig.savefig(OUTPUT / f"class_diagram_sprint2.{extension}", dpi=300,
                facecolor="white", transparent=False)
plt.close(fig)
