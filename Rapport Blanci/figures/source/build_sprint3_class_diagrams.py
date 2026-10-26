"""Render four approved Sprint 3 domain views using matplotlib."""

from pathlib import Path
import json
import math

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Circle, Polygon, Rectangle


OUTPUT = Path(__file__).resolve().parents[1]
INK = "#202020"
LINE = "#343434"
plt.rcParams.update({"font.family": "DejaVu Sans", "svg.fonttype": "none"})
manifest = []


def render(filename, height, definitions, links):
    fig, ax = plt.subplots(figsize=(8.4, height))
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    ax.set(xlim=(0, 8.4), ylim=(0, height))
    ax.axis("off")
    fig.patch.set_facecolor("white")
    boxes = {}
    segments = []

    for name, x, top, fields, stereotype in definitions:
        header = 0.55 if stereotype else 0.37
        bottom = top - header - 0.21 - len(fields) * 0.215
        boxes[name] = {"left": x, "right": x + 3.0, "top": top,
                       "bottom": bottom, "cx": x + 1.5}
        ax.add_patch(Rectangle((x, bottom), 3.0, top - bottom,
                               facecolor="white", edgecolor=LINE,
                               linewidth=0.8, zorder=2))
        ax.plot([x, x + 3.0], [top - header, top - header],
                color=LINE, linewidth=0.8, zorder=3)
        if stereotype:
            ax.text(x + 1.5, top - 0.15, f"«{stereotype}»", ha="center",
                    va="center", fontsize=8.4, color=INK, zorder=4)
        ax.text(x + 1.5, top - header + 0.18, name, ha="center",
                va="center", fontsize=10, fontweight="bold", color=INK, zorder=4)
        for index, field in enumerate(fields):
            ax.text(x + 0.14, top - header - 0.20 - index * 0.215, field,
                    va="center", fontsize=9.3, color=INK, zorder=4)

    def point(spec):
        if len(spec) == 2 and isinstance(spec[0], (int, float)):
            return spec
        name, side, value = spec
        b = boxes[name]
        if side in ("top", "bottom"):
            return (b["cx"] if value is None else value, b[side])
        return (b[side], value)

    def text(x, y, value, align="center"):
        if x < 0.55:
            align = "left"
        elif x > 7.8:
            align = "right"
        ax.text(x, y, value, ha=align, va="center", fontsize=8.6, color=INK,
                bbox={"facecolor": "white", "edgecolor": "none", "pad": 1}, zorder=5)

    def multiplicity(points, value, at_end=False, composition=False):
        ordered = list(reversed(points)) if at_end else points
        x, y = ordered[0]
        nx, ny = ordered[1]
        length = math.hypot(nx - x, ny - y)
        dx, dy = (nx - x) / length, (ny - y) / length
        distance = 0.29 if composition and not at_end else 0.18
        # Keep each label beside its terminal segment, outside the class box.
        text(x + distance * dx + (0.12 if dy else 0),
             y + distance * dy + (0.12 if dx else 0), value)

    for source, target, waypoints, source_count, target_count, caption, label_at, composition in links:
        points = [point(source), *waypoints, point(target)]
        for endpoint, spec in ((points[0], source), (points[-1], target)):
            b = boxes[spec[0]]
            assert b["left"] <= endpoint[0] <= b["right"]
            assert b["bottom"] <= endpoint[1] <= b["top"]
        ax.plot(*zip(*points), color=LINE, linewidth=0.8, zorder=1)
        segments.extend(zip(points, points[1:]))
        multiplicity(points, source_count, composition=composition)
        multiplicity(points, target_count, at_end=True)
        text(*label_at, caption)
        if composition:
            x, y = points[0]
            nx, ny = points[1]
            length = math.hypot(nx - x, ny - y)
            dx, dy = (nx - x) / length, (ny - y) / length
            ax.add_patch(Polygon([(x, y), (x + dx * 0.11 - dy * 0.06, y + dy * 0.11 + dx * 0.06),
                                  (x + dx * 0.22, y + dy * 0.22),
                                  (x + dx * 0.11 + dy * 0.06, y + dy * 0.11 - dx * 0.06)],
                                 facecolor=LINE, edgecolor=LINE, zorder=4))

    # Small bridges distinguish crossings from association junctions.
    crossings = set()
    horizontal = [(a, b) for a, b in segments if a[1] == b[1]]
    vertical = [(a, b) for a, b in segments if a[0] == b[0]]
    for a, b in horizontal:
        for c, d in vertical:
            x, y = c[0], a[1]
            if min(a[0], b[0]) + 0.07 < x < max(a[0], b[0]) - 0.07 and min(c[1], d[1]) + 0.07 < y < max(c[1], d[1]) - 0.07:
                crossings.add((x, y))
    for x, y in crossings:
        ax.add_patch(Circle((x, y), 0.055, color="white", zorder=1.1))
        ax.plot([x, x], [y - 0.055, y + 0.055], color=LINE, linewidth=0.8, zorder=1.2)
        ax.add_patch(Arc((x, y), 0.11, 0.11, theta1=0, theta2=180,
                         color=LINE, linewidth=0.8, zorder=1.3))

    lower = max(0, min(b["bottom"] for b in boxes.values()) - 0.35)
    ax.set_ylim(lower, height)
    fig.set_size_inches(8.4, height - lower)
    for extension in ("png", "svg"):
        fig.savefig(OUTPUT / f"{filename}.{extension}", dpi=300,
                    facecolor="white", transparent=False)
    manifest.append({"file": filename, "concepts": [d[0] for d in definitions],
                     "relationships": [{"source": e[0][0], "target": e[1][0],
                                        "source_multiplicity": e[3], "target_multiplicity": e[4],
                                        "role": e[5]} for e in links]})
    plt.close(fig)


L, R = 0.55, 4.65

render("class_diagram_sprint3", 10.7, [
    ("UserAccount", L, 10.3, ["id"], "external identity"),
    ("CoachProfile", R, 10.3, ["id", "bio", "specialties", "status", "isVerified"], None),
    ("PurchasedPack", L, 7.8, ["id", "sessionsRemaining", "sessionsTotal", "purchasedAt", "status"], None),
    ("SessionPack", R, 7.8, ["id", "name", "sessionCount", "price", "currency"], None),
    ("Booking", L, 4.9, ["id", "scheduledAt", "durationMinutes", "status", "videoRoomId"], None),
    ("CoachCertification", R, 4.9, ["id", "name", "issuer", "documentUrl", "status"], None),
    ("CoachAvailability", R, 2.25, ["id", "dayOfWeek", "startTime", "endTime"], None),
], [
    (("UserAccount", "right", 9.85), ("CoachProfile", "left", 9.85), [], "1", "0..1", "has", (4.1, 9.66), False),
    (("UserAccount", "bottom", None), ("PurchasedPack", "top", None), [], "1", "0..*", "buys", (2.32, 8.55), False),
    (("CoachProfile", "bottom", None), ("SessionPack", "top", None), [], "1", "0..*", "offers", (6.45, 8.23), False),
    (("SessionPack", "left", 7.0), ("PurchasedPack", "right", 7.0), [], "1", "0..*", "purchased as", (4.1, 6.80), False),
    (("CoachProfile", "left", 9.1), ("PurchasedPack", "right", 6.55), [(4.0, 9.1), (4.0, 6.55)], "1", "0..*", "receives", (4.0, 7.65), False),
    (("PurchasedPack", "bottom", None), ("Booking", "top", None), [], "0..1", "0..*", "funds", (2.34, 5.52), False),
    (("UserAccount", "left", 9.7), ("Booking", "top", 1.50), [(0.15, 9.7), (0.15, 5.23), (1.50, 5.23)], "1", "0..*", "books", (0.15, 6.02), False),
    (("CoachProfile", "left", 8.9), ("Booking", "right", 4.10), [(4.32, 8.9), (4.32, 4.10)], "1", "0..*", "receives", (4.32, 5.7), False),
    (("CoachProfile", "right", 9.7), ("CoachCertification", "top", 5.85), [(7.95, 9.7), (7.95, 5.23), (5.85, 5.23)], "1", "0..*", "submits", (7.95, 6.05), False),
    (("CoachProfile", "right", 9.3), ("CoachAvailability", "top", 6.45), [(8.2, 9.3), (8.2, 2.58), (6.45, 2.58)], "1", "0..*", "defines", (8.2, 3.2), False),
])

render("class_diagram_sprint3_communication", 9.7, [
    ("UserAccount", L, 9.3, ["id"], "external identity"),
    ("CoachProfile", R, 9.3, ["id"], None),
    ("Conversation", L, 6.9, ["id", "lastMessageAt"], None),
    ("CoachClientNote", R, 6.9, ["id", "note", "createdAt"], None),
    ("Message", L, 4.4, ["id", "content", "type", "mediaUrl", "readAt", "createdAt"], None),
    ("AISessionNote", R, 4.4, ["id", "summary", "context", "createdAt", "expiresAt"], None),
], [
    (("UserAccount", "bottom", 1.65), ("Conversation", "top", 1.65), [], "1", "0..*", "client in", (1.28, 7.65), False),
    (("CoachProfile", "left", 8.9), ("Conversation", "right", 6.35), [(4.10, 8.9), (4.10, 6.35)], "1", "0..*", "coach in", (4.10, 7.00), False),
    (("CoachProfile", "bottom", None), ("CoachClientNote", "top", None), [], "1", "0..*", "writes", (6.48, 7.72), False),
    (("UserAccount", "bottom", 2.90), ("CoachClientNote", "left", 6.25), [(2.90, 7.82), (3.82, 7.82), (3.82, 6.25)], "1", "0..*", "client", (3.82, 6.68), False),
    (("CoachProfile", "right", 8.9), ("AISessionNote", "top", None), [(7.95, 8.9), (7.95, 4.72), (6.15, 4.72)], "1", "0..*", "uses", (7.95, 5.2), False),
    (("UserAccount", "bottom", 2.65), ("AISessionNote", "left", 3.70), [(2.65, 7.52), (4.40, 7.52), (4.40, 3.70)], "1", "0..*", "client", (4.4, 5.1), False),
    (("Conversation", "bottom", None), ("Message", "top", None), [], "1", "0..*", "contains", (2.40, 5.15), True),
    (("UserAccount", "left", 8.9), ("Message", "top", 1.45), [(0.15, 8.9), (0.15, 4.72), (1.45, 4.72)], "1", "0..*", "sends", (0.15, 5.45), False),
])

render("class_diagram_sprint3_followup", 9.4, [
    ("UserAccount", L, 9.0, ["id"], "external identity"),
    ("CoachProfile", R, 9.0, ["id"], None),
    ("CustomProgram", L, 6.7, ["id", "title", "type", "programData", "status", "isTemplate"], None),
    ("CheckInSchedule", R, 6.7, ["id", "enabled", "frequency", "checkInDays", "checkInTime"], None),
    ("CheckInResponse", L, 3.7, ["id", "responseDate", "mood", "energy", "soreness", "sleepQuality"], None),
], [
    (("UserAccount", "bottom", 1.65), ("CustomProgram", "top", 1.65), [], "0..1", "0..*", "assigned to", (2.25, 7.38), False),
    (("CoachProfile", "bottom", None), ("CheckInSchedule", "top", None), [], "1", "0..*", "sets", (6.43, 7.48), False),
    (("CoachProfile", "left", 8.6), ("CustomProgram", "right", 5.9), [(4.10, 8.6), (4.10, 5.9)], "1", "0..*", "authors", (4.10, 6.92), False),
    (("UserAccount", "bottom", 2.90), ("CheckInSchedule", "left", 5.9), [(2.90, 7.72), (3.82, 7.72), (3.82, 5.9)], "1", "0..*", "client", (3.82, 6.40), False),
    (("UserAccount", "left", 8.6), ("CheckInResponse", "top", 1.65), [(0.15, 8.6), (0.15, 4.02), (1.65, 4.02)], "1", "0..*", "submits", (0.15, 4.55), False),
    (("CoachProfile", "left", 8.4), ("CheckInResponse", "right", 2.80), [(4.40, 8.4), (4.40, 2.80)], "1", "0..*", "receives", (4.4, 4.52), False),
])

render("class_diagram_sprint3_finance", 8.5, [
    ("UserAccount", L, 8.1, ["id"], "external identity"),
    ("CoachProfile", R, 8.1, ["id"], None),
    ("AdminAuditLog", L, 5.6, ["id", "action", "resourceType", "resourceId", "createdAt"], None),
    ("Wallet", R, 5.6, ["id", "balance", "currency"], None),
    ("Booking", L, 2.95, ["id"], None),
    ("Transaction", R, 2.95, ["id", "type", "amount", "description", "createdAt"], None),
], [
    (("UserAccount", "bottom", None), ("AdminAuditLog", "top", None), [], "1", "0..*", "acts in", (2.40, 6.38), False),
    (("CoachProfile", "bottom", None), ("Wallet", "top", None), [], "1", "0..1", "has", (6.42, 6.43), False),
    (("Wallet", "bottom", None), ("Transaction", "top", None), [], "1", "0..*", "records", (6.55, 3.65), False),
    (("Booking", "right", 2.45), ("Transaction", "left", 2.45), [], "0..1", "0..*", "linked to", (4.10, 2.25), False),
])

(OUTPUT / "source" / "sprint3-render-manifest.json").write_text(
    json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
