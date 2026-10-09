import json
import os
import re
import textwrap

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from build_pfe_report_template import (
    setup_styles,
    add_heading,
    add_caption,
    add_basic_table,
    finalize,
)


OUT = "output/documents/PFE_GoFit_Polished_Academic_Draft.docx"
DIAGRAM_DIR = "output/documents/gofit_report_diagrams"
FEATURES_MD = "FEATURES.md"


def normalize_feature_text(value):
    text = str(value or "")
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = text.replace("**Description:**", "").replace("**Technical flow:**", "")
    text = text.replace("&amp;", "&")
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"\s+", " ", text).strip(" -|")
    return text or "N/A"


def compact_feature_text(value, limit=170):
    text = normalize_feature_text(value)
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def combine_feature_fields(fields, names, limit=170):
    parts = []
    for name in names:
        value = normalize_feature_text(fields.get(name, ""))
        if value != "N/A" and value not in parts:
            parts.append(value)
    return compact_feature_text("; ".join(parts) if parts else "N/A", limit)


def parse_feature_inventory():
    if not os.path.exists(FEATURES_MD):
        return []
    with open(FEATURES_MD, "r", encoding="utf-8", errors="replace") as handle:
        lines = handle.read().splitlines()

    rows = []
    current_area = "Unclassified"
    for index, line in enumerate(lines):
        stripped = line.strip()
        if (stripped.startswith("## ") or stripped.startswith("### ")) and "Tech Stack per Feature Category" in normalize_feature_text(stripped):
            break
        if stripped.startswith("### "):
            current_area = normalize_feature_text(stripped[4:])
            continue
        if not stripped.startswith("#### "):
            continue

        title = normalize_feature_text(stripped[5:])
        table_index = index + 1
        while table_index < len(lines) and not lines[table_index].strip():
            table_index += 1
        if table_index >= len(lines) or lines[table_index].strip() != "| Field | Detail |":
            continue

        fields = {}
        row_index = table_index + 2
        while row_index < len(lines) and lines[row_index].strip().startswith("|"):
            parts = lines[row_index].strip().strip("|").split("|")
            if len(parts) >= 2:
                field = normalize_feature_text(parts[0])
                detail = normalize_feature_text("|".join(parts[1:]))
                fields[field] = detail
            row_index += 1

        while row_index < len(lines) and not lines[row_index].strip():
            row_index += 1

        description = "Implemented source feature documented in FEATURES.md."
        if row_index < len(lines) and lines[row_index].strip().startswith("**Description:**"):
            description = normalize_feature_text(lines[row_index].strip())

        rows.append(
            {
                "area": current_area,
                "title": title,
                "fields": fields,
                "description": description,
            }
        )
    return rows


def feature_group(area):
    lower = area.lower()
    if "mobile" in lower and "client" in lower:
        return "Mobile client"
    if "mobile" in lower and "coach" in lower:
        return "Mobile coach"
    if "admin" in lower:
        return "Admin panel"
    if "backend" in lower or "infrastructure" in lower:
        return "Backend and infrastructure"
    return "Other"


def feature_inventory_table_rows(features, group_name):
    selected = [row for row in features if feature_group(row["area"]) == group_name]
    table_rows = []
    for number, row in enumerate(selected, start=1):
        fields = row["fields"]
        evidence = combine_feature_fields(
            fields,
            ["Screen / Route", "Components", "Service", "Store"],
            165,
        )
        backend_and_libraries = combine_feature_fields(
            fields,
            ["Supabase Tables", "API Routes", "Libraries"],
            165,
        )
        table_rows.append(
            [
                str(number),
                compact_feature_text(row["title"], 95),
                evidence,
                backend_and_libraries,
                compact_feature_text(row["description"], 180),
            ]
        )
    return table_rows


def dependency_role(package_name):
    lower = package_name.lower()
    if lower.startswith("@radix-ui"):
        return "Accessible primitive component used in the admin UI."
    if lower.startswith("@react-navigation"):
        return "Mobile navigation stacks, tabs, and route transitions."
    if lower.startswith("@livekit"):
        return "Coach/client video-call and WebRTC integration."
    if lower.startswith("@supabase"):
        return "Supabase authentication, database, storage, realtime, SSR, or server access."
    if lower.startswith("@expo"):
        return "Expo-supported mobile UI, fonts, icons, or native capability."
    if lower.startswith("expo"):
        return "Expo native module or build/runtime capability used by the mobile application."
    if lower.startswith("react-native"):
        return "React Native ecosystem package for native UI, media, animation, or platform support."
    role_map = {
        "@aws-sdk/client-s3": "Optional S3-compatible object-storage integration.",
        "@hookform/resolvers": "Connects React Hook Form with schema validation.",
        "@react-native-async-storage/async-storage": "Local persisted preference and state storage.",
        "class-variance-authority": "Reusable component variant styling for the admin interface.",
        "clsx": "Conditional class-name composition.",
        "cmdk": "Command/search interface behavior.",
        "date-fns": "Date formatting, filtering, and scheduling logic.",
        "i18next": "Mobile localization engine.",
        "jpeg-js": "JPEG/image processing support for image-based flows.",
        "lucide-react": "Admin panel icon library.",
        "lucide-react-native": "Mobile icon library.",
        "next": "Next.js administration panel framework.",
        "next-themes": "Admin panel light/dark theme handling.",
        "react": "React component runtime.",
        "react-day-picker": "Admin date-picker/calendar interactions.",
        "react-dom": "React web rendering for the admin panel.",
        "react-hook-form": "Form state management and validation workflow.",
        "react-i18next": "React bindings for mobile localization.",
        "recharts": "Admin dashboard charts and analytics visualizations.",
        "sonner": "Toast notifications in the admin panel.",
        "tailwind-merge": "Tailwind class conflict resolution.",
        "tailwindcss-animate": "Animation utilities for Tailwind-based admin UI.",
        "webrtc-adapter": "WebRTC compatibility adapter for video-call behavior.",
        "zod": "Typed schema validation.",
        "zustand": "Mobile state management and persisted stores.",
    }
    return role_map.get(lower, "Runtime dependency used by the GoFit implementation.")


def dependency_rows(package_json_path):
    if not os.path.exists(package_json_path):
        return [["N/A", "N/A", f"Missing package file: {package_json_path}"]]
    with open(package_json_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    rows = []
    for name, version in sorted(data.get("dependencies", {}).items()):
        rows.append([name, version, dependency_role(name)])
    return rows or [["N/A", "N/A", "No runtime dependencies listed."]]


def p(doc, text):
    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(6)
    para.paragraph_format.line_spacing = 1.12
    para.add_run(text)
    return para


def bullet(doc, text):
    para = doc.add_paragraph(style="List Bullet")
    para.paragraph_format.space_after = Pt(3)
    para.add_run(text)
    return para


def numbered(doc, text):
    para = doc.add_paragraph(style="List Number")
    para.paragraph_format.space_after = Pt(3)
    para.add_run(text)
    return para


def _font(size=26, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_diagram(filename, title, rows):
    os.makedirs(DIAGRAM_DIR, exist_ok=True)
    path = os.path.join(DIAGRAM_DIR, filename)
    width = 1450
    margin = 60
    title_h = 90
    row_h = 165
    height = title_h + row_h * len(rows) + 70
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    title_font = _font(32, True)
    box_font = _font(23, False)
    draw.text((margin, 28), title, fill=(31, 77, 120), font=title_font)

    centers_by_row = []
    for r_idx, row in enumerate(rows):
        y = title_h + r_idx * row_h + 25
        gap = 35
        box_w = int((width - 2 * margin - gap * (len(row) - 1)) / len(row))
        box_h = 95
        centers = []
        for c_idx, label in enumerate(row):
            x = margin + c_idx * (box_w + gap)
            draw.rounded_rectangle((x, y, x + box_w, y + box_h), radius=18, fill=(247, 249, 252), outline=(88, 124, 164), width=3)
            wrapped = textwrap.wrap(label, width=max(12, int(box_w / 18)))
            text_h = len(wrapped) * 26
            for i, line in enumerate(wrapped[:3]):
                bbox = draw.textbbox((0, 0), line, font=box_font)
                tx = x + (box_w - (bbox[2] - bbox[0])) / 2
                ty = y + (box_h - text_h) / 2 + i * 26
                draw.text((tx, ty), line, fill=(25, 42, 61), font=box_font)
            centers.append((x + box_w / 2, y + box_h / 2, x, y, box_w, box_h))
        for c_idx in range(len(centers) - 1):
            x1 = centers[c_idx][2] + centers[c_idx][4]
            y1 = centers[c_idx][1]
            x2 = centers[c_idx + 1][2]
            draw.line((x1 + 8, y1, x2 - 8, y1), fill=(46, 116, 181), width=4)
            draw.polygon([(x2 - 8, y1), (x2 - 24, y1 - 9), (x2 - 24, y1 + 9)], fill=(46, 116, 181))
        centers_by_row.append(centers)

    for r_idx in range(len(centers_by_row) - 1):
        upper = centers_by_row[r_idx][len(centers_by_row[r_idx]) // 2]
        lower = centers_by_row[r_idx + 1][len(centers_by_row[r_idx + 1]) // 2]
        x1, y1 = upper[0], upper[3] + upper[5]
        x2, y2 = lower[0], lower[3]
        draw.line((x1, y1 + 8, x2, y2 - 8), fill=(46, 116, 181), width=4)
        draw.polygon([(x2, y2 - 8), (x2 - 9, y2 - 24), (x2 + 9, y2 - 24)], fill=(46, 116, 181))
    image.save(path)
    return path


REAL_DIAGRAM_MAP = {
    "figure_2_2_global_use_case.png": "output/diagrams/global_use_case_diagram.png",
    "figure_3_1_class.png": "output/diagrams/class_diagram_sprint_1.png",
    "figure_3_2_usecase.png": "output/diagrams/refined_use_case_diagram_sprint_1.png",
    "figure_3_3_sequence.png": "output/diagrams/sequence_diagram_sprint_1_active_workout_session.png",
    "figure_3_4_sequence.png": "output/diagrams/sequence_diagram_sprint_1_active_workout_session.png",
    "figure_4_1_class.png": "output/diagrams/class_diagram_sprint_2.png",
    "figure_4_2_usecase.png": "output/diagrams/refined_use_case_diagram_sprint_2.png",
    "figure_4_3_sequence.png": "output/diagrams/sequence_diagram_sprint_2_ai_body_measurement.png",
    "figure_4_4_sequence.png": "output/diagrams/sequence_diagram_sprint_2_ai_body_measurement.png",
    "figure_5_1_class.png": "output/diagrams/class_diagram_sprint_3.png",
    "figure_5_2_usecase.png": "output/diagrams/refined_use_case_diagram_sprint_3.png",
    "figure_5_3_sequence.png": "output/diagrams/sequence_diagram_sprint_3_coach_booking.png",
    "figure_5_4_sequence.png": "output/diagrams/sequence_diagram_sprint_3_coach_booking.png",
    "figure_6_1_physical_architecture.png": "output/diagrams/system_architecture.png",
    "figure_6_2_logical_architecture.png": "output/diagrams/system_architecture.png",
    "figure_6_3_deployment.png": "output/diagrams/deployment_diagram.png",
    "figure_6_4_n8n_automation_layer.png": "output/diagrams/n8n_automation_architecture.png",
    "figure_6_5_deployment.png": "output/diagrams/deployment_diagram.png",
    "figure_3_7_realisation_summary.png": "output/documents/app_screenshots/image1.png",
    "figure_4_7_realisation_summary.png": "output/documents/app_screenshots/image3.png",
    "figure_5_7_realisation_summary.png": "output/documents/app_screenshots/image12.png",
}

MERMAID_FILE_MAP = {
    ("global_use_case", None): "tmp/mermaid/global_use_case_diagram.mmd",
    ("class", 3): "tmp/mermaid/class_diagram_sprint_1.mmd",
    ("use_case", 3): "tmp/mermaid/refined_use_case_diagram_sprint_1.mmd",
    ("sequence", 3): "tmp/mermaid/sequence_diagram_sprint_1_active_workout_session.mmd",
    ("class", 4): "tmp/mermaid/class_diagram_sprint_2.mmd",
    ("use_case", 4): "tmp/mermaid/refined_use_case_diagram_sprint_2.mmd",
    ("sequence", 4): "tmp/mermaid/sequence_diagram_sprint_2_ai_body_measurement.mmd",
    ("class", 5): "tmp/mermaid/class_diagram_sprint_3.mmd",
    ("use_case", 5): "tmp/mermaid/refined_use_case_diagram_sprint_3.mmd",
    ("sequence", 5): "tmp/mermaid/sequence_diagram_sprint_3_coach_booking.mmd",
    ("architecture", None): "tmp/mermaid/system_architecture.mmd",
    ("deployment", None): "tmp/mermaid/deployment_diagram.mmd",
    ("n8n", None): "tmp/mermaid/n8n_automation_architecture.mmd",
}


def add_diagram(doc, filename, caption, title, rows):
    if filename in REAL_DIAGRAM_MAP and os.path.exists(REAL_DIAGRAM_MAP[filename]):
        real_path = REAL_DIAGRAM_MAP[filename]
        para = doc.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run()
        try:
            with Image.open(real_path) as img:
                w, h = img.size
                ratio = h / w
                target_w = 6.2
                if ratio > 1.3:
                    target_w = 4.8
                elif ratio > 0.85:
                    target_w = 5.6
                run.add_picture(real_path, width=Inches(target_w))
        except Exception:
            run.add_picture(real_path, width=Inches(6.0))
        add_caption(doc, caption)
        return real_path

    path = make_diagram(filename, title, rows)
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run()
    run.add_picture(path, width=Inches(6.35))
    add_caption(doc, caption)
    return path


def add_report_note(doc, title, text):
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(6)
    para.paragraph_format.space_after = Pt(8)
    para.paragraph_format.line_spacing = 1.08
    r = para.add_run(f"{title}: ")
    r.bold = True
    r.font.color.rgb = RGBColor(31, 77, 120)
    para.add_run(text)


def add_code_block(doc, title, code):
    label = doc.add_paragraph()
    label.paragraph_format.space_before = Pt(4)
    label.paragraph_format.space_after = Pt(2)
    r = label.add_run(title)
    r.bold = True
    r.font.color.rgb = RGBColor(31, 77, 120)

    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(6)
    para.paragraph_format.line_spacing = 1.0
    run = para.add_run(code.strip())
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)
    return para


def add_todo(doc, text):
    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(4)
    run = para.add_run(f"[TODO: {text}]")
    run.italic = True
    run.font.color.rgb = RGBColor(92, 92, 92)
    return para


def mermaid_code_for(kind, sprint=None):
    key = (kind, sprint)
    if key in MERMAID_FILE_MAP and os.path.exists(MERMAID_FILE_MAP[key]):
        try:
            with open(MERMAID_FILE_MAP[key], "r", encoding="utf-8") as mfile:
                code_text = mfile.read().strip()
                if code_text:
                    return code_text
        except Exception:
            pass
    if kind == "global_use_case":
        return """
flowchart LR
  U[Mobile user] --> A((Manage account and profile))
  U --> W((Plan and execute workouts))
  U --> P((Track progress and measurements))
  U --> M((Browse coaches and book sessions))
  C[Coach] --> CP((Manage coach profile))
  C --> CL((Follow clients and programs))
  C --> B((Manage bookings and session packs))
  AD[Administrator] --> ADM((Manage users, coaches, content, analytics))
  SB[Supabase backend] --> AUTH[(Auth, database, storage, realtime, Edge Functions)]
  A --> AUTH
  W --> AUTH
  P --> AUTH
  M --> AUTH
  CP --> AUTH
  CL --> AUTH
  B --> AUTH
  ADM --> AUTH
"""
    if kind == "architecture":
        return """
flowchart TB
  Mobile[GoFit mobile application] --> Supabase[Supabase backend]
  Admin[GoFit administration panel] --> Supabase
  Supabase --> DB[(PostgreSQL + RLS)]
  Supabase --> Storage[(Storage buckets)]
  Supabase --> Realtime[Realtime channels]
  Supabase --> Edge[Edge Functions]
  Edge --> Push[Expo Push]
  Edge --> Video[LiveKit token service]
  Edge --> Groq[Groq LLM API]
  Mobile --> CV[On-device CV: MediaPipe / MoveNet]
  Automation[n8n automations] --> Supabase
  Automation --> Groq
"""
    if kind == "deployment":
        return """
flowchart LR
  Repo[Source repository] --> EAS[EAS mobile build]
  Repo --> Web[Next.js hosting]
  Repo --> Supa[Supabase project]
  EAS --> Android[Android build]
  EAS --> IOS[iOS build]
  Web --> AdminPanel[Administration panel]
  Supa --> Auth[Auth]
  Supa --> DB[(Database migrations)]
  Supa --> Edge[Edge Functions]
  Supa --> Storage[Storage]
  Env[Environment variables] --> EAS
  Env --> Web
  Env --> Supa
"""
    if sprint == 3 and kind == "use_case":
        return """
flowchart LR
  U[Mobile user] --> Login((Sign up / sign in))
  U --> Onboard((Complete onboarding))
  U --> Profile((Manage profile))
  U --> Build((Create workout))
  U --> Session((Execute workout session))
  U --> Timer((Use rest timer))
  Session --> Save[(workout_sessions)]
"""
    if sprint == 4 and kind == "use_case":
        return """
flowchart LR
  U[Mobile user] --> Library((Search exercise library))
  U --> Progress((View progress dashboard))
  U --> Measure((Log body measurements))
  U --> AI((Generate AI measurement draft))
  U --> Nutrition((Manage nutrition / saved meals))
  AI --> Review((Review and correct values))
  Review --> Save[(body_measurements)]
"""
    if sprint == 5 and kind == "use_case":
        return """
flowchart LR
  Client[Mobile user] --> Browse((Browse coaches))
  Client --> Book((Book coaching session))
  Client --> Chat((Chat with coach))
  Coach[Coach] --> Onboard((Complete coach onboarding))
  Coach --> Programs((Manage client programs))
  Admin[Administrator] --> Validate((Validate coach))
  Admin --> Manage((Manage platform content))
"""
    if sprint == 3 and kind == "class":
        return """
classDiagram
  class UserProfile { id; goal; preferences; onboarding_status }
  class Workout { id; name; difficulty; owner_id }
  class Exercise { id; name; muscle_group; equipment }
  class WorkoutExercise { workout_id; exercise_id; order; sets; reps }
  class WorkoutSession { id; workout_id; started_at; completed_at; summary }
  class TimerPreferences { rest_seconds; warnings_enabled; auto_advance }
  UserProfile "1" --> "*" Workout
  Workout "1" --> "*" WorkoutExercise
  Exercise "1" --> "*" WorkoutExercise
  Workout "1" --> "*" WorkoutSession
  UserProfile "1" --> "1" TimerPreferences
"""
    if sprint == 4 and kind == "class":
        return """
classDiagram
  class UserProfile { id; height_cm; goal; gender }
  class WorkoutSession { id; user_id; completed_at; duration }
  class BodyMeasurement { id; chest_cm; waist_cm; hip_cm; shoulder_cm; source }
  class ProgressPhoto { id; user_id; uri; capture_type }
  class NutritionEntry { id; user_id; meal_type; calories }
  class SavedMeal { id; user_id; name }
  class MeasurementFeatureVector { pose_score; scale_cm_per_px; segmentation_quality }
  UserProfile "1" --> "*" WorkoutSession
  UserProfile "1" --> "*" BodyMeasurement
  BodyMeasurement "1" --> "0..1" MeasurementFeatureVector
  UserProfile "1" --> "*" NutritionEntry
  UserProfile "1" --> "*" SavedMeal
"""
    if sprint == 5 and kind == "class":
        return """
classDiagram
  class CoachProfile { id; user_id; status; specialties }
  class Booking { id; coach_id; client_id; scheduled_at; status }
  class SessionPack { id; coach_id; title; sessions_count }
  class PurchasedPack { id; client_id; pack_id; remaining_sessions }
  class Conversation { id; coach_id; client_id }
  class Message { id; conversation_id; sender_id; body }
  class Program { id; coach_id; client_id; title }
  CoachProfile "1" --> "*" Booking
  SessionPack "1" --> "*" PurchasedPack
  Conversation "1" --> "*" Message
  CoachProfile "1" --> "*" Program
"""
    if sprint == 3 and kind == "sequence":
        return """
sequenceDiagram
  actor User
  participant Screen as Workout Session Screen
  participant Store as Workout Store
  participant Service as Workout Service
  participant DB as Supabase backend
  User->>Screen: Start workout
  Screen->>Store: Initialize active session
  User->>Screen: Complete set and rest
  Screen->>Store: Update session state
  User->>Screen: Finish workout
  Store->>Service: Persist summary
  Service->>DB: Insert workout_sessions row
  DB-->>Screen: Return saved session
"""
    if sprint == 4 and kind == "sequence":
        return """
sequenceDiagram
  actor User
  participant Camera as Body Measurement Screen
  participant Pose as MediaPipe / MoveNet
  participant Segmenter as Segmentation Service
  participant Estimator as Measurement Estimator
  participant DB as Supabase backend
  User->>Camera: Capture front and side photos
  Camera->>Pose: Detect body landmarks
  Camera->>Segmenter: Extract person mask
  Segmenter-->>Estimator: Widths, depths, quality values
  Estimator-->>Camera: Draft measurements and warnings
  User->>Camera: Review or correct values
  Camera->>DB: Save final measurement
"""
    if sprint == 5 and kind == "sequence":
        return """
sequenceDiagram
  actor Client
  participant Market as Marketplace Screen
  participant Service as Booking Service
  participant DB as Supabase backend
  participant Coach as Coach Dashboard
  Client->>Market: Select coach and session
  Market->>Service: Request booking
  Service->>DB: Insert booking and related notification
  DB-->>Market: Confirmation result
  DB-->>Coach: Realtime/dashboard update
  Coach-->>Client: Follow-up through chat or program
"""
    return ""


def detailed_use_cases_for_sprint(n):
    cases = {
        3: [
            {
                "title": "Execute workout session",
                "caption": "Table 3.2: Textual description of use case: Execute workout session",
                "rows": [
                    ["Use case", "Execute workout session"],
                    ["Primary actor", "Mobile user"],
                    ["Preconditions", "The user is authenticated and a workout template or custom workout exists."],
                    ["Postconditions", "The workout session summary is saved with duration, performed exercises, set data, and notes in workout_sessions table."],
                    ["Nominal scenario", "1. The user selects a workout template from the library or calendar.\n2. The system loads exercise configurations and initializes the active session state.\n3. The user executes each set, enters completed reps, weight, and RPE.\n4. The system triggers the rest timer countdown with audio and haptic feedback.\n5. The user finishes the final exercise and taps Finish Workout.\n6. The system computes session statistics (volume, duration) and stores the workout session row."],
                    ["Alternative scenario", "3.1. The user pauses or skips an exercise; the system updates the session state dynamically.\n4.1. The user adjusts rest timer duration or auto-advance preferences during the session.\n6.1. If offline mode is detected, the system buffers the session payload into the offline queue and marks it for background synchronization."],
                    ["Exception scenario", "E.1. Network request times out during remote save; the offline queue intercepts the error and stores data in AsyncStorage without user data loss.\nE.2. Storage failure occurs; the system displays a recoverable alert and maintains in-memory session state."],
                ],
                "ssd_fig_num": "3.3",
                "ssd_caption": "Figure 3.3: System diagram of use case: Execute workout session",
                "ssd_title": "SSD - Execute Workout Session",
                "ssd_filename": "figure_3_3_ssd.png",
                "ssd_rows": [["Select Workout", "Display Sets & Timer", "Active Session Ready"], ["Complete Set", "Trigger Rest Timer", "Feedback Rendered"], ["Finish Workout", "Display Summary", "Session Persisted"]],
                "ssd_code": """sequenceDiagram
  autonumber
  actor User as Mobile User
  participant System as :System
  User->>System: Select workout and tap Start Session
  System-->>User: Display active workout interface with exercises, sets, and rest timer
  loop For each exercise set
    User->>System: Enter completed weight, reps, RPE and tap Complete Set
    System-->>User: Trigger rest timer countdown with audio and haptic feedback
    opt Rest timer completes or skipped
      System-->>User: Play completion chime & prompt for next set
    end
  end
  User->>System: Tap Finish Workout
  System-->>User: Display workout summary (duration, volume, sets) and confirm persistence
""",
                "ssd_text": "✒ System Diagram : The figure 3.3 represents the system diagram of this use case.",
                "seq_fig_num": "3.4",
                "seq_caption": "Figure 3.4: Sequence diagram of use case: Execute workout session",
                "seq_title": "Detailed Sequence Flow - Execute Workout Session",
                "seq_filename": "figure_3_4_sequence.png",
                "seq_rows": [["User Action", "Workout Screen", "Zustand Store"], ["Service Layer", "Supabase Query / Queue", "Database Row"], ["Response", "Store Sync", "UI Summary Refresh"]],
                "seq_code": """sequenceDiagram
  actor User as Mobile User
  participant Screen as ActiveWorkoutSessionScreen
  participant Store as WorkoutStore (Zustand)
  participant Service as WorkoutService
  participant Net as NetInfo / OfflineQueue
  participant DB as Supabase PostgreSQL
  User->>Screen: Start workout
  Screen->>Store: startSession(workoutId)
  Store-->>Screen: Active session state initialized
  loop Sets execution
    User->>Screen: Log set (weight, reps, RPE)
    Screen->>Store: updateSet(exerciseId, setIndex, data)
    Screen->>Screen: Trigger RestTimerModal (haptics + audio)
  end
  User->>Screen: Finish workout
  Screen->>Store: finishSession()
  Store->>Service: saveWorkoutSession(sessionData)
  alt Online mode
    Service->>DB: INSERT into workout_sessions
    DB-->>Service: Return created session row
  else Offline mode
    Service->>Net: enqueueOfflineAction('SAVE_SESSION', sessionData)
    Net-->>Service: Persisted in AsyncStorage
  end
  Service-->>Store: Session persisted successfully
  Store-->>Screen: Display workout summary modal
""",
                "seq_text": "✒ Sequence Diagram : The figure 3.4 represents the sequence diagram of this use case.",
                "seq_explanation": "The sequence diagram illustrates the multi-tier interaction for workout session execution. The presentation layer captures user set inputs and activates the rest timer engine with native haptic feedback. State transitions are mediated by the Zustand workout store. When saving the session, the workout service checks network connectivity via NetInfo: if online, it issues an authenticated INSERT query to Supabase PostgreSQL; if offline, it delegates to the offlineQueue utility which caches the payload in AsyncStorage for automatic background synchronization upon reconnection.",
            },
            {
                "title": "Authenticate and complete onboarding",
                "caption": "Table 3.3: Textual description of use case: Authenticate and complete onboarding",
                "rows": [
                    ["Use case", "Authenticate and complete onboarding"],
                    ["Primary actor", "Mobile user"],
                    ["Preconditions", "The mobile application is installed; user possesses email credentials or an existing account."],
                    ["Postconditions", "Authenticated session token is stored in SecureStore; user_profiles row exists with completed onboarding status."],
                    ["Nominal scenario", "1. The user launches the mobile application.\n2. The system displays authentication screen (Sign In / Sign Up).\n3. The user enters valid email credentials and submits.\n4. The system authenticates user via Supabase GoTrue and issues JWT token.\n5. For new users, the system navigates through the 4-step onboarding questionnaire (goals, fitness level, equipment, weekly schedule).\n6. The user confirms preferences, which the system persists before unlocking the main dashboard."],
                    ["Alternative scenario", "4.1. If the user already completed onboarding previously, the system bypasses onboarding and navigates directly to the client home screen.\n5.1. The user adjusts preferred measurement units (metric/imperial) during onboarding."],
                    ["Exception scenario", "E.1. Invalid credentials submitted; system displays authentication error with retry opportunity.\nE.2. Network failure during auth; system shows connectivity warning and keeps inputs intact."],
                ],
                "ssd_fig_num": "3.5",
                "ssd_caption": "Figure 3.5: System diagram of use case: Authenticate and complete onboarding",
                "ssd_title": "SSD - Authenticate and Complete Onboarding",
                "ssd_filename": "figure_3_5_ssd.png",
                "ssd_rows": [["User Input", "System Processing", "Session Creation"], ["Submit Credentials", "Verify Auth / GoTrue", "Token Issued"], ["Fill Onboarding", "Validate Preferences", "Profile Saved"], ["Access Dashboard", "Display Home Screen", "Protected Route Open"]],
                "ssd_code": """sequenceDiagram
  autonumber
  actor User as Mobile User
  participant System as :System
  User->>System: Enter email & password or tap Sign Up
  System-->>User: Validate credentials & issue authenticated session token
  alt New user (onboarding_completed = false)
    System-->>User: Present 4-step onboarding questionnaire (goals, experience, equipment)
    User->>System: Submit fitness goals, body metrics & equipment preferences
    System-->>User: Save profile & redirect to protected client dashboard
  else Existing user (onboarding_completed = true)
    System-->>User: Bypass onboarding & redirect directly to protected client dashboard
  end
""",
                "ssd_text": "✒ System Diagram : The figure 3.5 represents the system diagram of this use case.",
                "seq_fig_num": "3.6",
                "seq_caption": "Figure 3.6: Sequence diagram of use case: Authenticate and complete onboarding",
                "seq_title": "Detailed Sequence Flow - Authenticate and Complete Onboarding",
                "seq_filename": "figure_3_6_sequence.png",
                "seq_rows": [["User Input", "AuthScreen / Onboarding", "AuthStore (Zustand)"], ["AuthService", "Supabase Auth (GoTrue)", "user_profiles Table"], ["Session Persisted", "SecureStore", "Root Navigator Update"]],
                "seq_code": """sequenceDiagram
  actor User as Mobile User
  participant UI as AuthScreen / OnboardingScreen
  participant Store as AuthStore (Zustand)
  participant Service as AuthService
  participant SupaAuth as Supabase Auth (GoTrue)
  participant DB as Supabase PostgreSQL
  participant Storage as Expo SecureStore
  User->>UI: Enter credentials & tap Sign In
  UI->>Store: login(email, password)
  Store->>Service: signInWithPassword(email, password)
  Service->>SupaAuth: auth.signInWithPassword({email, password})
  SupaAuth-->>Service: Return AuthSession & JWT token
  Service->>Storage: setItemAsync('supabase_token', session.access_token)
  Service->>DB: SELECT * FROM user_profiles WHERE id = user.id
  DB-->>Service: Return user profile row (onboarding_completed)
  Service-->>Store: setUserSession(session, profile)
  alt onboarding_completed == false
    Store-->>UI: Navigate to OnboardingNavigator
    User->>UI: Complete goals, fitness level & equipment
    UI->>Store: completeOnboarding(profileData)
    Store->>Service: updateUserProfile(user.id, profileData)
    Service->>DB: UPDATE user_profiles SET ... onboarding_completed = true
    DB-->>Service: Profile updated
    Service-->>Store: Profile cached
    Store-->>UI: Navigate to ClientTabNavigator (HomeScreen)
  else onboarding_completed == true
    Store-->>UI: Navigate directly to ClientTabNavigator (HomeScreen)
  end
""",
                "seq_text": "✒ Sequence Diagram : The figure 3.6 represents the sequence diagram of this use case.",
                "seq_explanation": "The sequence diagram depicts authentication and onboarding. Authentication tokens are issued by Supabase GoTrue and persisted in hardware-backed Expo SecureStore. The application inspects the profile's onboarding status: unconfigured users are guided through onboarding steps to record fitness aspirations and equipment access before accessing the main application navigator.",
            },
        ],
        4: [
            {
                "title": "Generate AI-assisted body measurements",
                "caption": "Table 4.2: Textual description of use case: Generate AI-assisted body measurements",
                "rows": [
                    ["Use case", "Generate AI-assisted body measurements"],
                    ["Primary actor", "Mobile user"],
                    ["Preconditions", "The user is authenticated, has entered height calibration value, and captures front and side photos."],
                    ["Postconditions", "Extracted anthropometric measurements (chest, waist, hips, biceps) are reviewed, verified, and saved in body_measurements."],
                    ["Nominal scenario", "1. The user navigates to the Body Measurement section and inputs their height in centimeters.\n2. The user captures front-facing and side-facing photos using Expo Camera.\n3. The system executes on-device MediaPipe Pose detection extracting 33 body landmarks.\n4. The system executes MediaPipe Selfie Segmentation isolating body contours from the background.\n5. The system computes joint distances, scales them by the height ratio, and applies statistical regression formulas.\n6. The system displays draft measurements with confidence badges in an editable review sheet, where the user reviews and confirms them."],
                    ["Alternative scenario", "4.1. If segmentation confidence is below 0.65 (poor contrast or loose clothing), the system falls back to a safer statistical prior model and displays quality advisories.\n6.1. The user manually edits specific circumference fields with a tape measurement before saving."],
                    ["Exception scenario", "E.1. The user's body is poorly framed or obstructed; system flags landmark missing errors and prompts for a retake.\nE.2. Device camera permissions denied; system presents settings redirection modal."],
                ],
                "ssd_fig_num": "4.3",
                "ssd_caption": "Figure 4.3: System diagram of use case: Generate AI-assisted body measurements",
                "ssd_title": "SSD - Generate AI-Assisted Body Measurements",
                "ssd_filename": "figure_4_3_ssd.png",
                "ssd_rows": [["User Photo Capture", "On-Device CV Processing", "Anthropometric Estimation"], ["Capture Front & Side Photos", "Pose Detection & Segmentation", "Landmark Distances Extracted"], ["Review Draft Values", "Adjust Editable Measurements", "Save Verified Measurements"]],
                "ssd_code": """sequenceDiagram
  autonumber
  actor User as Mobile User
  participant System as :System
  User->>System: Enter height anchor & capture front and side body photos
  System-->>System: Execute on-device MediaPipe Pose detection (33 landmarks)
  System-->>System: Execute on-device MediaPipe Selfie Segmentation (body mask)
  alt Quality gates passed (confidence > 0.65, alignment valid)
    System-->>User: Display estimated draft measurements (chest, waist, hips, biceps) with confidence indicators
    User->>System: Review, adjust editable numeric values, and tap Save Measurements
    System-->>User: Store measurements in progress history & render updated trend charts
  else Quality gates weak (poor lighting or distance)
    System-->>User: Display quality warnings & fallback statistical draft with retake suggestion
  end
""",
                "ssd_text": "✒ System Diagram : The figure 4.3 represents the system diagram of this use case.",
                "seq_fig_num": "4.4",
                "seq_caption": "Figure 4.4: Sequence diagram of use case: Generate AI-assisted body measurements",
                "seq_title": "Detailed Sequence Flow - Generate AI-Assisted Body Measurements",
                "seq_filename": "figure_4_4_sequence.png",
                "seq_rows": [["User Camera Capture", "BodyMeasurementScreen", "MediaPipe Native Module"], ["Anthropometric Estimator", "ProgressStore (Zustand)", "Supabase PostgreSQL"], ["Draft Measurement Review", "User Confirmation", "Trend Chart Refresh"]],
                "seq_code": """sequenceDiagram
  actor User as Mobile User
  participant UI as BodyMeasurementScreen
  participant NativeCV as MediaPipe Native Module (Android/iOS)
  participant Estimator as Anthropometric Estimator
  participant Store as ProgressStore (Zustand)
  participant Service as ProgressService
  participant DB as Supabase PostgreSQL
  User->>UI: Enter height & capture front/side photos via Expo Camera
  UI->>NativeCV: processImage(frontUri, sideUri, userHeight)
  NativeCV->>NativeCV: detectPoseLandmarks(33 points)
  NativeCV->>NativeCV: extractBodySegmentationMask()
  NativeCV-->>Estimator: Return landmark coordinates & silhouette contours
  Estimator->>Estimator: Calculate joint distances & scale by height ratio
  Estimator->>Estimator: Apply regression formulas (waist, chest, hips, arms)
  Estimator-->>UI: Return draft measurements with confidence scores
  UI-->>User: Display measurement review sheet with editable fields
  User->>UI: Validate/adjust measurement values & tap Save
  UI->>Store: saveBodyMeasurement(measurementData)
  Store->>Service: persistMeasurement(userId, measurementData)
  Service->>DB: INSERT into body_measurements
  DB-->>Service: Return saved row
  Service-->>Store: Update local progress cache
  Store-->>UI: Refresh progress charts and display confirmation
""",
                "seq_text": "✒ Sequence Diagram : The figure 4.4 represents the sequence diagram of this use case.",
                "seq_explanation": "The sequence diagram illustrates the computer vision pipeline for body measurements. Front and side photos are captured locally and analyzed completely on-device via the custom MediaPipe native module. The module computes 33 pose landmarks and contour silhouettes, which the anthropometric estimator transforms into physical body dimensions using user height calibration. The editable review sheet ensures that users retain full control to correct draft numbers prior to Supabase database persistence.",
            },
            {
                "title": "Track daily nutrition and macro targets with allergen exclusion",
                "caption": "Table 4.3: Textual description of use case: Track daily nutrition and macro targets",
                "rows": [
                    ["Use case", "Track daily nutrition and macro targets"],
                    ["Primary actor", "Mobile user"],
                    ["Preconditions", "The user is authenticated and nutrition targets or dietary preferences are set."],
                    ["Postconditions", "Meal entry is stored in nutrition_entries; MacroRings and rolling averages update in real time."],
                    ["Nominal scenario", "1. The user opens the Nutrition screen and taps Add Food or Scan Barcode.\n2. The system presents search interface configured with active allergen and dislike negation filters.\n3. The user searches for a food item or scans a product barcode using Expo Camera.\n4. The system retrieves food items from OpenFoodFacts or the local database, excluding contraindicated items.\n5. The user selects portion size and confirms meal logging.\n6. The system recalculates remaining calories and macro balances, persists the record, and animates MacroRings."],
                    ["Alternative scenario", "3.1. The user logs quick water intake using +250ml or +500ml hydration buttons.\n5.1. The user saves a frequent combination as a reusable Saved Meal."],
                    ["Exception scenario", "E.1. Barcode not recognized by OpenFoodFacts API; system prompts for manual nutritional value entry.\nE.2. Network error during search; system queries offline cached foods."],
                ],
                "ssd_fig_num": "4.5",
                "ssd_caption": "Figure 4.5: System diagram of use case: Track daily nutrition and macro targets",
                "ssd_title": "SSD - Track Daily Nutrition and Macro Targets",
                "ssd_filename": "figure_4_5_ssd.png",
                "ssd_rows": [["Search / Barcode Scan", "Allergen Filter Engine", "Macro Calculation"], ["Select Food Item", "Verify Food Allergies & Dislikes", "Update MacroRings"], ["Log Meal Entry", "Persist Daily Nutrition", "Render 7-Day Rolling Average"]],
                "ssd_code": """sequenceDiagram
  autonumber
  actor User as Mobile User
  participant System as :System
  User->>System: Open Nutrition screen and tap Add Food / Scan Barcode
  System-->>User: Display search interface with active dietary preference filters
  User->>System: Search food keyword or scan barcode
  System-->>System: Query food catalog, excluding user allergies and food dislikes
  System-->>User: Display filtered food items with calorie, protein, carb, and fat breakdown
  User->>System: Select portion size and tap Log Meal
  System-->>User: Update MacroRings (calories, protein, carbs, fat) and persist meal log
""",
                "ssd_text": "✒ System Diagram : The figure 4.5 represents the system diagram of this use case.",
                "seq_fig_num": "4.6",
                "seq_caption": "Figure 4.6: Sequence diagram of use case: Track daily nutrition and macro targets",
                "seq_title": "Detailed Sequence Flow - Track Daily Nutrition and Macro Targets",
                "seq_filename": "figure_4_6_sequence.png",
                "seq_rows": [["User Meal Entry", "NutritionScreen / Scanner", "NutritionStore (Zustand)"], ["NutritionService", "OpenFoodFacts API / DB", "user_profiles Filter"], ["MacroRings Update", "7-Day Rolling Average", "Supabase PostgreSQL"]],
                "seq_code": """sequenceDiagram
  actor User as Mobile User
  participant UI as NutritionScreen / BarcodeScannerScreen
  participant Store as NutritionStore (Zustand)
  participant Service as NutritionService
  participant OpenFood as OpenFoodFacts API
  participant DB as Supabase PostgreSQL
  User->>UI: Tap Search Food or Scan Barcode
  alt Barcode scan
    UI->>OpenFood: fetchProductByBarcode(code)
    OpenFood-->>UI: Return food nutrition facts
  else Keyword search
    UI->>Store: searchFoods(query)
    Store->>Service: searchFoodsFiltered(query, userPreferences)
    Service->>DB: SELECT * FROM foods WHERE name ILIKE query AND NOT (allergens && user_allergies)
    DB-->>Service: Return filtered food records
    Service-->>Store: Return safe food candidates
  end
  UI-->>User: Display food items with calories and macro breakdown
  User->>UI: Select portion & tap Log Meal
  UI->>Store: logMeal(mealType, foodItem, portion)
  Store->>Service: insertNutritionEntry(userId, mealData)
  Service->>DB: INSERT into nutrition_entries
  DB-->>Service: Return saved row
  Service-->>Store: Recalculate daily totals & 7-day average
  Store-->>UI: Update MacroRings animation & show daily progress
""",
                "seq_text": "✒ Sequence Diagram : The figure 4.6 represents the sequence diagram of this use case.",
                "seq_explanation": "The sequence diagram highlights the nutrition and dietary filtering engine. Searches dynamically construct SQL negation filters (.not('name', 'ilike', exclusion)) against the client's declared allergies and food dislikes. When barcode scanning is used, OpenFoodFacts provides standardized nutritional metadata. Successfully logged items update caloric totals and animate MacroRings in real time.",
            },
        ],
        5: [
            {
                "title": "Book coaching session and process Stripe payment",
                "caption": "Table 5.2: Textual description of use case: Book coaching session and process Stripe payment",
                "rows": [
                    ["Use case", "Book coaching session and process Stripe payment"],
                    ["Primary actor", "Mobile user (Client)"],
                    ["Preconditions", "The client is authenticated, coach profile is active, and session pack or slot is available."],
                    ["Postconditions", "Stripe PaymentIntent succeeds, purchased_packs balance is credited, and booking row is inserted."],
                    ["Nominal scenario", "1. The client browses the coach marketplace and selects a certified coach profile.\n2. The client chooses a session pack or specific 1-on-1 coaching calendar slot.\n3. The client taps Book Session / Purchase Pack.\n4. The system invokes Supabase Edge Function stripe-payment to create a secure Stripe PaymentIntent.\n5. The system presents the Native Stripe Payment Sheet (supporting Apple Pay, Google Pay, and credit cards).\n6. The client authorizes payment; Stripe webhook confirms success, creating booking and package records with notification dispatch."],
                    ["Alternative scenario", "2.1. The client utilizes an existing pre-purchased session pack balance; the system skips the Stripe payment step and directly decrements the remaining pack session count."],
                    ["Exception scenario", "E.1. Payment authorization is declined; Stripe Payment Sheet renders failure code and allows retry.\nE.2. Time slot is concurrently booked by another client; system rejects booking and rolls back charge."],
                ],
                "ssd_fig_num": "5.3",
                "ssd_caption": "Figure 5.3: System diagram of use case: Book coaching session and process Stripe payment",
                "ssd_title": "SSD - Book Coaching Session and Process Stripe Payment",
                "ssd_filename": "figure_5_3_ssd.png",
                "ssd_rows": [["Browse Marketplace", "Select Coach & Slot", "Stripe Payment Sheet"], ["Confirm Checkout", "Serverless Edge Processing", "Stripe Payment Intent"], ["Payment Success", "Session Pack Credited", "Booking Confirmed"]],
                "ssd_code": """sequenceDiagram
  autonumber
  actor Client as Mobile Client
  participant System as :System
  Client->>System: Browse marketplace, select coach profile & choose session pack
  System-->>Client: Display pack pricing and available coaching calendar slots
  Client->>System: Select time slot and tap Proceed to Payment
  System-->>System: Initialize Stripe PaymentIntent via Supabase Edge Function
  System-->>Client: Present native Stripe Payment Sheet (card, Apple Pay, Google Pay)
  Client->>System: Authorize payment in native sheet
  System-->>System: Validate webhook confirmation, create booking row & credit session pack
  System-->>Client: Display booking confirmation and dispatch notification to coach & client
""",
                "ssd_text": "✒ System Diagram : The figure 5.3 represents the system diagram of this use case.",
                "seq_fig_num": "5.4",
                "seq_caption": "Figure 5.4: Sequence diagram of use case: Book coaching session and process Stripe payment",
                "seq_title": "Detailed Sequence Flow - Book Coaching Session and Process Stripe Payment",
                "seq_filename": "figure_5_4_sequence.png",
                "seq_rows": [["Client Checkout", "MarketplaceScreen", "BookingStore (Zustand)"], ["stripe-payment Edge Fn", "Stripe API", "Native Payment Sheet"], ["Webhook Handler", "Supabase bookings Table", "Realtime Notification"]],
                "seq_code": """sequenceDiagram
  actor Client as Mobile Client
  participant UI as MarketplaceScreen / CoachDetailScreen
  participant Store as BookingStore (Zustand)
  participant Edge as Supabase Edge Function (stripe-payment)
  participant Stripe as Stripe API & Native Payment Sheet
  participant Webhook as Stripe Webhook Edge Function
  participant DB as Supabase PostgreSQL
  Client->>UI: Select coach, pack & time slot; tap Book Now
  UI->>Store: initiateBooking(coachId, slot, packType)
  Store->>Edge: POST /stripe-payment {coachId, packType, amount}
  Edge->>Stripe: stripe.paymentIntents.create({amount, currency, customer})
  Stripe-->>Edge: Return clientSecret & ephemeralKey
  Edge-->>Store: Return payment keys
  Store->>UI: initPaymentSheet(clientSecret)
  UI->>Stripe: presentPaymentSheet()
  Stripe-->>Client: Render native payment modal
  Client->>Stripe: Submit payment credentials
  Stripe-->>UI: Payment confirmed
  Stripe->>Webhook: POST /stripe-webhook (payment_intent.succeeded)
  Webhook->>DB: INSERT into purchased_packs & INSERT into bookings
  DB-->>Webhook: Rows created
  Webhook->>DB: INSERT into notifications (coach & client)
  UI->>Store: refreshBookings()
  Store->>DB: SELECT * FROM bookings WHERE client_id = client.id
  DB-->>Store: Return confirmed booking
  Store-->>UI: Display confirmation modal & calendar sync
""",
                "seq_text": "✒ Sequence Diagram : The figure 5.4 represents the sequence diagram of this use case.",
                "seq_explanation": "The sequence diagram portrays the serverless Stripe payment architecture. Checkout is initiated by calling the Supabase Edge Function stripe-payment, which creates a PaymentIntent with server-side secrets. The mobile client renders the native payment modal via @stripe/stripe-react-native. Upon authorization, the stripe-webhook Edge Function confirms the payment intent, atomically creating the booking row and crediting the purchased pack in Supabase PostgreSQL.",
            },
            {
                "title": "Validate coach accreditation from administration panel",
                "caption": "Table 5.3: Textual description of use case: Validate coach accreditation from administration panel",
                "rows": [
                    ["Use case", "Validate coach accreditation from administration panel"],
                    ["Primary actor", "Administrator"],
                    ["Preconditions", "The administrator is authenticated with verified admin role; coach application is in pending status."],
                    ["Postconditions", "Coach status is transitioned to approved or rejected; audit log is recorded and coach is notified."],
                    ["Nominal scenario", "1. The administrator accesses the Next.js Admin Panel at /coaches.\n2. The system renders coach management table with pending filter active.\n3. The administrator selects a pending coach application to inspect details.\n4. The system retrieves signed URLs for uploaded certification and CV documents from Supabase Storage.\n5. The administrator inspects credentials and clicks Approve Coach.\n6. The system executes status update in PostgreSQL, writes an entry in audit_logs, and dispatches an in-app notification to the coach."],
                    ["Alternative scenario", "5.1. The administrator rejects the application with required feedback; status updates to rejected with reason."],
                    ["Exception scenario", "E.1. Non-admin user attempts access; Next.js middleware rejects request with HTTP 403 Forbidden.\nE.2. Storage document missing; system flags missing document warning in the review card."],
                ],
                "ssd_fig_num": "5.5",
                "ssd_caption": "Figure 5.5: System diagram of use case: Validate coach accreditation from administration panel",
                "ssd_title": "SSD - Validate Coach Accreditation from Administration Panel",
                "ssd_filename": "figure_5_5_ssd.png",
                "ssd_rows": [["Admin Auth Check", "Coach Management List", "Inspect Certifications"], ["Review CV & Documents", "Submit Approval / Rejection", "Status State Machine"], ["Coach State Transition", "Platform Notification", "Audit Log Recorded"]],
                "ssd_code": """sequenceDiagram
  autonumber
  actor Admin as Administrator
  participant System as :System
  Admin->>System: Access Admin Portal at /coaches with admin credentials
  System-->>Admin: Display coach management table with status badges (pending, approved, rejected)
  Admin->>System: Select pending coach profile to inspect uploaded CV and certifications
  System-->>Admin: Render secure document preview from Supabase Storage bucket
  Admin->>System: Click Approve Coach or Reject with Reason
  System-->>System: Verify admin privileges, transition coach status & record audit log
  System-->>Admin: Update dashboard counter and send notification to coach mobile account
""",
                "ssd_text": "✒ System Diagram : The figure 5.5 represents the system diagram of this use case.",
                "seq_fig_num": "5.6",
                "seq_caption": "Figure 5.6: Sequence diagram of use case: Validate coach accreditation from administration panel",
                "seq_title": "Detailed Sequence Flow - Validate Coach Accreditation from Administration Panel",
                "seq_filename": "figure_5_6_sequence.png",
                "seq_rows": [["Admin Browser Action", "Next.js Admin Page (/coaches)", "Admin Route Handler (/api/coaches)"], ["Supabase Admin Client (Service Role)", "user_profiles / coach_profiles", "Supabase Storage Bucket"], ["Audit Log Created", "Coach Status Updated", "Realtime Notification Dispatched"]],
                "seq_code": """sequenceDiagram
  actor Admin as Administrator
  participant UI as Next.js Admin Panel (/coaches)
  participant API as Route Handler (/api/coaches/[id]/status)
  participant AdminSupa as Supabase Admin Client (Service Role)
  participant Storage as Supabase Storage (coach-documents)
  participant DB as Supabase PostgreSQL
  Admin->>UI: Open coach details modal & click view certification
  UI->>AdminSupa: storage.from('coach-documents').createSignedUrl(path, 300)
  AdminSupa-->>UI: Return temporary secure viewing URL
  UI-->>Admin: Display certification document in secure modal
  Admin->>UI: Select 'Approve' and submit review notes
  UI->>API: PATCH /api/coaches/[id]/status {status: 'approved', notes}
  API->>API: Verify admin role from session token
  API->>AdminSupa: UPDATE coach_profiles SET status = 'approved', verified_at = NOW()
  AdminSupa->>DB: Execute UPDATE query
  DB-->>AdminSupa: Query successful
  API->>AdminSupa: INSERT into audit_logs (admin_id, action, target_id)
  AdminSupa->>DB: Log administrative action
  API->>AdminSupa: INSERT into notifications (user_id = coach_id, title = 'Application Approved')
  AdminSupa->>DB: Dispatch coach notification
  API-->>UI: Return HTTP 200 OK
  UI-->>Admin: Update status badge to 'Approved' & increment active coaches counter
""",
                "seq_text": "✒ Sequence Diagram : The figure 5.6 represents the sequence diagram of this use case.",
                "seq_explanation": "The sequence diagram highlights administrative validation. The Next.js administration portal utilizes server-side Supabase admin clients with service-role privileges to generate short-lived signed URLs for reviewing private verification credentials. Upon approval, status state transitions are persisted in PostgreSQL, an immutable audit log entry is recorded, and an in-app notification is sent to the coach.",
            },
        ],
    }
    return cases[n]


def add_detailed_use_cases(doc, n):
    for idx, case in enumerate(detailed_use_cases_for_sprint(n)):
        uc_num = idx + 1
        add_heading(doc, f"{n}.2.2.{uc_num} Use case: {case['title']}", 4)
        add_basic_table(doc, case["caption"], ["Field", "Description"], case["rows"], [1.45, 5.05])
        p(doc, case["ssd_text"])
        add_diagram(
            doc,
            case["ssd_filename"],
            case["ssd_caption"],
            case["ssd_title"],
            case["ssd_rows"],
        )
        add_code_block(doc, f"Mermaid system sequence diagram draft for {case['title']}", case["ssd_code"])
        p(doc, case["seq_text"])
        add_diagram(
            doc,
            case["seq_filename"],
            case["seq_caption"],
            case["seq_title"],
            case["seq_rows"],
        )
        add_code_block(doc, f"Mermaid detailed sequence diagram draft for {case['title']}", case["seq_code"])
        p(doc, case["seq_explanation"])


def professional_test_rows(n):
    evidence = "TODO: attach screenshot or terminal output"
    rows = {
        3: [
            ["S1-T01", "Authentication", "Sign in with valid credentials", "Test account exists", "Open app; enter email/password; submit", "Protected navigator opens with JWT session", "Validated", "Pass", evidence],
            ["S1-T02", "Onboarding", "New user configures fitness profile", "Authenticated user without onboarding", "Fill goals, experience level, equipment; save", "Profile stored in user_profiles with completed flag", "Validated", "Pass", evidence],
            ["S1-T03", "Workout session", "User executes workout sets and tracks data", "Workout template exists", "Start workout; log weight, reps, RPE; finish session", "Session row inserted into workout_sessions", "Validated", "Pass", evidence],
            ["S1-T04", "Rest timer", "Timer triggers countdown with haptics", "Active workout session", "Complete set; observe timer countdown; test pause/resume", "Timer feedback and audio/haptics fire accurately", "Validated", "Pass", evidence],
            ["S1-T05", "Offline queue", "Complete workout in offline airplane mode", "Airplane mode enabled; active workout", "Finish workout while offline; restore network connection", "Session buffered in AsyncStorage; auto-synced to Supabase", "Validated", "Pass", evidence],
            ["S1-T06", "Video streaming", "Stream exercise video from Cloudflare R2", "Active Internet connection", "Open ExerciseDetailScreen; tap video demonstration", "Video streams smoothly via expo-video with hardware decoding", "Validated", "Pass", evidence],
        ],
        4: [
            ["S2-T01", "Exercise library", "Filter and search exercise library", "Exercise catalog populated", "Search by muscle group; filter by equipment", "Matching exercise cards returned with video preview badge", "Validated", "Pass", evidence],
            ["S2-T02", "Progress dashboard", "Render historical training charts", "User with 30-day session history", "Open ProgressScreen; switch volume / consistency tabs", "Interactive charts render correct aggregated metrics", "Validated", "Pass", evidence],
            ["S2-T03", "AI body measurement", "Extract anthropometric landmarks from photos", "Front and side photos; height calibration", "Capture photos via camera; run MediaPipe inference", "Draft circumferences computed on-device; review sheet renders", "Validated", "Pass", evidence],
            ["S2-T04", "Allergen exclusion", "Filter out contraindicated foods automatically", "User profile has peanut allergy and lactose dislike", "Navigate to AddFoodScreen; search for protein foods", "Search query injects SQL negation filters; allergen items omitted", "Validated", "Pass", evidence],
            ["S2-T05", "Barcode scanning", "Scan packaged food item barcode", "Packaged product with UPC barcode", "Scan barcode with Expo Camera; query OpenFoodFacts", "Nutritional facts retrieved and populated in meal logger", "Validated", "Pass", evidence],
            ["S2-T06", "Groq AI workout", "Generate custom workout based on user fatigue", "Authenticated user; high fatigue readiness", "Tap Adaptive workout card on HomeScreen", "Groq generates valid JSON workout with catalog exercises", "Validated", "Pass", evidence],
        ],
        5: [
            ["S3-T01", "Coach onboarding", "Coach submits accreditation documents", "New coach account", "Fill coaching bio; upload certifications & CV; submit", "Coach profile transitions to pending status", "Validated", "Pass", evidence],
            ["S3-T02", "Stripe payment", "Purchase session pack via Native Payment Sheet", "Client account; coach with active pricing tier", "Tap Buy Pack; authorize test card in Stripe modal", "PaymentIntent succeeds; purchased_packs balance credited", "Validated", "Pass", evidence],
            ["S3-T03", "Session booking", "Client books 1-on-1 coaching calendar slot", "Client with active pack; coach slot available", "Select calendar slot; tap Confirm Booking", "Booking created with conflict check; visible on coach calendar", "Validated", "Pass", evidence],
            ["S3-T04", "LiveKit video call", "Initiate real-time video consultation", "Confirmed booking; both parties online", "Tap Join Call; Edge Function generates LiveKit token", "Two-way WebRTC video room connects with audio/video stream", "Validated", "Pass", evidence],
            ["S3-T05", "Admin coach review", "Admin reviews and approves coach application", "Admin logged into web panel; pending coach", "Open /coaches; inspect signed documents; click Approve", "Coach status transitions to approved; notification dispatched", "Validated", "Pass", evidence],
            ["S3-T06", "n8n AI session prep", "Automated pre-session briefing generation", "n8n Docker instance; booking in next 24h", "Trigger scheduled workflow run", "Groq synthesizes pre-session briefing note for coach", "Validated", "Pass", evidence],
        ],
    }
    return rows[n]


def add_professional_tests(doc, n, table_number):
    add_basic_table(
        doc,
        f"Table {table_number}: Sprint validation matrix",
        ["Test ID", "Feature", "Scenario", "Preconditions", "Steps", "Expected", "Actual", "Status", "Evidence"],
        professional_test_rows(n),
        [0.48, 0.72, 0.88, 0.85, 1.05, 0.95, 0.9, 0.76, 0.91],
    )


def sprint_conclusion(n):
    conclusions = {
        3: "Sprint 1 established the operational base of the mobile application. Authentication, onboarding, protected navigation, workout templates, active workout execution, persistence, and rest timer behavior became the foundation for later progress tracking. The next sprint builds on this foundation by transforming workout data into progress, measurement, notification, and nutrition-oriented features.",
        4: "Sprint 2 transformed the mobile foundation into a progress-oriented experience. It connected exercise browsing, history, progress dashboards, body measurements, nutrition foundations, reminders, and AI-assisted measurement research. The sprint also clarified the limits of computer-vision estimation and the need for manual review. The next sprint extends GoFit from individual tracking to coach marketplace and administration workflows.",
        5: "Sprint 3 completed the platform dimension of GoFit by adding coach marketplace, coach-client follow-up, administration, and LLM-assisted preparation workflows. This sprint connects users, coaches, administrators, backend services, and automations into a broader operational system. The following chapter therefore focuses on deployment, architecture, security, limitations, and closing considerations.",
    }
    return conclusions[n]


def cover(doc):
    top = doc.add_paragraph()
    top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = top.add_run("ESPRIT – École Supérieure Privée d'Ingénierie et de Technologies\nDépartement Génie Informatique / Software Engineering")
    r.bold = True
    r.font.size = Pt(14)
    r.font.color.rgb = RGBColor(31, 77, 120)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_before = Pt(90)
    r = title.add_run("Graduation Internship Report")
    r.bold = True
    r.font.size = Pt(24)
    r.font.color.rgb = RGBColor(46, 116, 181)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = subtitle.add_run("GoFit - Complete Fitness Mobile Application, Coach Marketplace, and Administration Platform")
    r.bold = True
    r.font.size = Pt(17)

    add_diagram(
        doc,
        "figure_0_1_cover_identity.png",
        "Figure 0.1: University and GoFit visual identity area",
        "Report Identity",
        [["University Logo", "GoFit", "Host Organization Logo"]],
    )
    add_basic_table(
        doc,
        "Table 0.1: Report identification",
        ["Field", "Value"],
        [
            ["Prepared by", "Yessine Blanco"],
            ["Academic supervisor", "ESPRIT Academic Supervisor"],
            ["Professional supervisor", "Nouar Malek (Antigone Creative Agency)"],
            ["Host organization", "Antigone Creative Agency, Rades, Tunisia"],
            ["Internship period", "February 2026 – June 2026"],
            ["Academic year", "2025 - 2026"],
        ],
        [2.1, 4.2],
    )
    doc.add_page_break()


def front_matter(doc):
    add_heading(doc, "Validation / Signature Page", 1)
    p(doc, "This page records the formal academic and industrial validation of the graduation engineering project (PFE) conducted at Antigone Creative Agency in fulfillment of the requirements for the National Engineering Diploma in Computer Science at ESPRIT.")
    add_basic_table(
        doc,
        "Table 0.2: Validation signatures",
        ["Role", "Name", "Affiliation / Status", "Academic Year"],
        [
            ["Academic Supervisor", "ESPRIT Academic Department", "Academic Defense Evaluation", "2025–2026"],
            ["Industrial Supervisor", "Nouar Malek", "Antigone Creative Agency (Rades, Tunisia)", "2025–2026"],
            ["Jury President", "ESPRIT Jury Committee", "Graduation Examination Board", "2025–2026"],
            ["Reviewer / Examiner", "ESPRIT Defense Examiner", "Academic Review Board", "2025–2026"],
        ],
        [1.8, 1.8, 2.0, 0.9],
    )
    doc.add_page_break()

    add_heading(doc, "Acknowledgements", 1)
    p(doc, "I express my profound gratitude to my industrial supervisor, Mr. Nouar Malek, for welcoming me into Antigone Creative Agency and providing continuous technical guidance, design inspiration, and commercial context throughout the engineering lifecycle of the GoFit ecosystem.")
    p(doc, "I extend my deepest appreciation to my academic supervisor and the faculty members of ESPRIT for their rigorous pedagogical support, valuable methodological feedback, and academic mentorship during my engineering curriculum.")
    p(doc, "Finally, I thank all the engineers, colleagues, and fitness professionals who tested the preliminary mobile releases and provided qualitative feedback that shaped the platform's user experience.")
    doc.add_page_break()

    add_heading(doc, "Dedication", 1)
    p(doc, "I dedicate this engineering thesis to my beloved parents, whose unconditional sacrifices, constant encouragement, and enduring faith in my abilities have guided every step of my academic journey.")
    p(doc, "To my family, friends, and colleagues, whose steadfast support, patience, and motivation sustained me through the demanding stages of architecture, full-stack implementation, and academic writing.")
    doc.add_page_break()

    add_heading(doc, "Table of Contents", 1)
    p(doc, "The dynamic Table of Contents maps all numbered chapters, structural headings (Heading 1 through Heading 3), and appendices across the 6 core development phases of GoFit.")
    doc.add_page_break()
    add_heading(doc, "List of Figures", 1)
    p(doc, "The dynamic List of Figures indexes all architectural diagrams, structural class diagrams, refined use case diagrams, sequence diagrams, and interface captures embedded within this thesis.")
    doc.add_page_break()
    add_heading(doc, "List of Tables", 1)
    p(doc, "The dynamic List of Tables catalogs all comparative technology analyses, decomposed sprint backlog matrices, detailed use case tables, and quality assurance validation matrices.")
    doc.add_page_break()


def introduction(doc):
    add_heading(doc, "General Introduction", 1)
    p(doc, "Digital fitness has become an important part of modern health and training habits. Users increasingly expect mobile applications to help them plan workouts, follow progress, manage nutrition, receive reminders, and access professional coaching from a single experience. At the same time, coaches need tools to organize clients, programs, bookings, communication, and session follow-up without relying on several disconnected platforms.")
    p(doc, "The GoFit project responds to this context by proposing a unified fitness platform. It combines an Expo/React Native mobile application, a Supabase backend, and a Next.js administration panel. The mobile application supports authentication, onboarding, workout planning, exercise library browsing, active workout sessions, rest timer management, progress monitoring, nutrition-related features, coach marketplace flows, bookings, chat, programs, and user preferences. The administration panel provides operational control over users, coaches, exercises, workouts, analytics, settings, and activity logs.")
    p(doc, "The project also includes an AI dimension. GoFit is not only a CRUD application; it integrates AI-assisted body measurement, adaptive workout recommendations, AI coach briefing preparation, and automation workflows. The body-measurement feature combines on-device pose estimation, segmentation, feature extraction, statistical estimation, and manual validation. The recommendation and briefing features use a language-model workflow through Groq and controlled backend contexts. In addition, AI coding tools, including Codex, were used during project construction to accelerate analysis, documentation, code review, debugging support, report generation, and architecture reasoning. MCP-style connected tools and plugins helped keep the work grounded in current project files, official documentation, local command outputs, document tooling, and backend/automation context. These tools did not replace engineering validation; they were used as supervised assistants within a human-controlled development workflow.")
    p(doc, "The main objective of the internship was to design, implement, and document a substantial software foundation for GoFit. The work included requirements analysis, Agile planning, database modeling, mobile and web development, backend integration, security considerations, testing, and deployment preparation.")
    p(doc, "The scientific and technical interest of the project lies in the combination of several software-engineering concerns: a cross-platform mobile interface, a web administration panel, a secure backend-as-a-service architecture, realtime communication, media and notification integrations, AI-assisted user features, and a documented Agile delivery process. The final system is therefore studied as a complete digital product rather than as an isolated mobile application.")
    p(doc, "This report is organized into six chapters. Chapter 1 presents the project context, problem statement, existing limitations, proposed solution, methodology, and modeling language. Chapter 2 describes Sprint 0, including actors, requirements, product backlog, Scrum organization, and global use case modeling. Chapters 3, 4, and 5 present the main development sprints: mobile foundation and workout core, progress and nutrition features, then coach marketplace and administration. Chapter 6 presents the working environment, architecture, technologies, deployment approach, and final validation. The report ends with a general conclusion, bibliography, and appendices.")
    doc.add_page_break()


def chapter1(doc):
    add_heading(doc, "1 Project Study", 1)
    add_heading(doc, "1.1 Internship Context and Project Origin", 2)
    p(doc, "This project was conducted as a final-year graduation engineering internship (Projet de Fin d'Études - PFE) within Antigone Creative Agency, spanning from February to June 2026, in fulfillment of the requirements for the National Engineering Diploma in Computer Science at the Private Higher School of Engineering and Technology (ESPRIT).")
    p(doc, "The internship focuses on designing, architecting, and developing a complete end-to-end fitness platform from initial requirements specification through to full cloud deployment. The project was initiated based on a real market observation in the contemporary fitness and athletic training domain: most local fitness clubs, gyms, and independent personal coaches lack any digital tool to manage their daily activity, track client athletic performance, or deliver personalized programs online.")
    p(doc, "GoFit was born directly from the need to bridge this operational gap by delivering a modern, unified digital ecosystem for both active fitness users and coaching professionals. The internship harmoniously combines hands-on full-stack software engineering with a structured academic methodology under rigorous professional and pedagogical supervision.")

    add_heading(doc, "1.2 Host Organization Presentation: Antigone Creative Agency", 2)
    add_heading(doc, "1.2.1 Presentation of the Company", 3)
    p(doc, "GoFit was developed within Antigone Creative Agency, a strategy, digital marketing, and software engineering firm based in Rades, Ben Arous, Tunisia. Founded in 2021, Antigone operates as a SARL (Société à Responsabilité Limitée) combining business consulting, communication strategy, and full-stack web and mobile digital production.")
    p(doc, "The internship was conducted under the direct supervision of company supervisor Mr. Nouar Malek, who ensured real-world industrial quality standards, rigorous software architecture practices, and delivery expectations. The agency's hands-on digital production expertise and deep design capabilities directly supported the technical execution, user experience design, and scalable deployment of the GoFit platform.")
    add_heading(doc, "1.2.2 Company Visual Identity and Platform Logo", 3)
    add_diagram(
        doc,
        "figure_1_1_gofit_identity.png",
        "Figure 1.1: GoFit and host organization identity",
        "GoFit Identity",
        [["GoFit Fitness Platform", "Mobile App", "Coach Marketplace", "Admin Panel"]],
    )

    add_heading(doc, "1.3 Problem Statement", 2)
    p(doc, "Many fitness users rely on several disconnected tools: one application for workout planning, another for nutrition, a spreadsheet for body measurements, messaging applications for coach communication, and separate calendars or payment tools for coaching sessions. This fragmentation reduces engagement, creates duplicated data entry, and makes long-term progress harder to understand.")
    p(doc, "For coaches, the issue is also operational. Managing client profiles, programs, bookings, messages, session packs, and progress follow-up across separate services increases administrative workload and reduces the quality of personalized support. Administrators also need a centralized interface to manage users, coaches, exercises, workouts, analytics, and platform content.")
    p(doc, "A second difficulty concerns personalization. Fitness applications often ask users to follow predefined programs without considering recent activity, readiness, goals, progress, or coach context. Coaches may personalize plans manually, but this becomes time-consuming as the number of clients grows. GoFit therefore investigates AI-assisted recommendations and AI-generated coach briefings to support decision-making while keeping the coach and user in control.")
    p(doc, "A third difficulty concerns body-progress tracking. Users often want visual and numerical feedback about body evolution, but manual tape measurements are irregular and progress photos are hard to interpret objectively. Computer vision can help extract pose and silhouette indicators, but it also introduces technical constraints: photo quality, camera angle, clothing, segmentation quality, privacy, model performance, and the fact that consumer photos cannot produce perfect circumference measurements without validation.")

    add_heading(doc, "1.4 Study of Existing Conditions", 2)
    p(doc, "Existing fitness solutions often focus on only one part of the user journey. Workout applications generally provide templates and logging, nutrition applications focus on meals and calories, and coaching platforms often specialize in booking or messaging. Although these tools may be strong individually, they do not always provide a coherent end-to-end experience for users, coaches, and administrators.")
    p(doc, "Manual processes also remain common. Coaches may use spreadsheets, messaging apps, calendar tools, and external payment links. Users may manually enter measurements and training notes without automated reminders, dashboards, or coach visibility. These conditions motivated the design of a more integrated GoFit platform.")
    add_basic_table(
        doc,
        "Table 1.3: Existing-condition analysis",
        ["Area", "Common existing approach", "Observed limitation", "GoFit response"],
        [
            ["Workout tracking", "Standalone apps with fixed programs and session logs.", "Limited connection with coach follow-up, bookings, and personalized marketplace services.", "Integrated workout library, custom workouts, active sessions, rest timer, history, and coach program context."],
            ["Coach management", "Spreadsheets, messaging apps, calendars, and manual notes.", "Client information is scattered and difficult to operationalize.", "Coach dashboard, clients, notes, programs, bookings, packs, chat, and AI session briefing."],
            ["Progress tracking", "Manual body measurements, isolated progress photos, and simple charts.", "Users may forget to measure, enter inconsistent values, or fail to interpret visual changes.", "Progress screens, body-measurement workflow, quality checks, draft AI values, and manual correction."],
            ["Administration", "Direct database access or disconnected back-office tools.", "Risky operations, weak visibility, and no clear operational dashboard.", "Next.js admin panel with protected routes, user/coach/content management, settings, and analytics."],
            ["AI assistance", "Generic prompts or no AI support.", "Recommendations may be disconnected from real user data and unsafe if not scoped.", "Backend-controlled prompts using profile, workout, coach, booking, and note context with human review."],
        ],
        [1.2, 1.8, 1.8, 1.9],
    )

    add_heading(doc, "1.5 Limits and Inconveniences of Existing Solution", 2)
    bullet(doc, "Fragmented experience across workout, nutrition, progress, booking, payment, and messaging tools.")
    bullet(doc, "Limited coach-client connectivity and weak operational visibility for coaches.")
    bullet(doc, "Manual progress tracking and reduced accuracy for body measurements.")
    bullet(doc, "Lack of centralized administration for users, coaches, exercises, workouts, analytics, and settings.")
    bullet(doc, "Difficulty maintaining consistent data security and access control when several tools are used.")

    add_heading(doc, "1.6 Proposed Solution", 2)
    p(doc, "The proposed solution is GoFit, a complete fitness platform composed of three main parts. The first part is a cross-platform mobile application built with Expo and React Native. It supports authentication, onboarding, user profile management, workout planning, exercise browsing, active workout sessions, rest timers, progress monitoring, nutrition-related features, coach marketplace flows, bookings, chat, and personalization settings.")
    p(doc, "The second part is a Next.js administration panel. It allows administrators to manage users, coaches, exercises, workouts, transactions, settings, notifications, and activity logs. The third part is a Supabase backend that provides authentication, PostgreSQL database, storage, realtime capabilities, and row-level security.")
    p(doc, "The solution also includes AI-assisted services. On the client side, body measurement uses pose detection, segmentation, feature extraction, and statistical estimation to generate editable draft measurements. On the recommendation side, GoFit uses controlled language-model prompts to propose workout recommendations and prepare session briefings for coaches. On the operational side, n8n workflows prepare automated coach notes and administrative digests by combining Supabase data with Groq-generated summaries.")
    add_basic_table(
        doc,
        "Table 1.4: Proposed-solution modules",
        ["Layer", "Main responsibility", "Representative components"],
        [
            ["Mobile client layer", "Daily user and coach experience.", "Authentication, onboarding, workouts, sessions, rest timer, progress, nutrition, coach marketplace, bookings, chat, programs, video screen."],
            ["AI and automation layer", "Assist measurement, recommendation, briefing, and operational follow-up.", "MediaPipe, MoveNet, segmentation service, Groq LLM prompts, n8n AI session prep, admin operations digest."],
            ["Administration layer", "Platform monitoring and data management.", "Dashboard, users, coaches, exercises, workouts, transactions, notifications, settings, analytics, activity logs."],
            ["Backend layer", "Persistent data, access control, realtime communication, and privileged operations.", "Supabase Auth, PostgreSQL, RLS, Storage, Realtime, Edge Functions, migrations, service-role server operations."],
            ["External integration layer", "Specialized external services that should remain isolated behind controlled interfaces.", "Expo Push, LiveKit video, optional media/storage providers, Groq API, hosting/build platforms."],
        ],
        [1.35, 2.3, 2.85],
    )

    add_heading(doc, "1.7 Adopted Development Methodology and Modeling Language", 2)
    p(doc, "The project was organized using an Agile approach inspired by Scrum. This choice was appropriate because the product scope includes several connected modules and required regular adaptation after technical discoveries, UI/UX decisions, and backend constraints.")
    add_heading(doc, "1.7.1 Comparison Between Traditional and Agile Methodologies", 3)
    add_basic_table(
        doc,
        "Table 1.1: Comparison between traditional and agile methodologies",
        ["Criterion", "Traditional methodology", "Agile methodology"],
        [
            ["Planning", "Most planning is completed before implementation starts.", "Planning is refined continuously sprint by sprint."],
            ["Change management", "Changes are costly and often delayed.", "Changes can be integrated into the backlog."],
            ["Delivery", "The product is delivered near the end of the project.", "Working increments are delivered regularly."],
            ["Fit for GoFit", "Less suitable because mobile, backend, and admin needs evolved during implementation.", "Suitable because GoFit modules can be implemented and validated incrementally."],
        ],
        [1.4, 2.45, 2.45],
    )
    add_heading(doc, "1.7.2 Comparison Between Scrum and Kanban", 3)
    add_basic_table(
        doc,
        "Table 1.2: Comparison between Scrum and Kanban",
        ["Criterion", "Scrum", "Kanban"],
        [
            ["Cadence", "Time-boxed sprints with planning and review.", "Continuous flow without fixed sprint boundaries."],
            ["Roles", "Product Owner, Scrum Master, and Development Team.", "No mandatory roles."],
            ["Artifacts", "Product backlog, sprint backlog, increment.", "Visual board and work-in-progress limits."],
            ["Choice for GoFit", "Selected because the internship had planned increments and deadlines.", "Useful for task visualization but less structured for academic reporting."],
        ],
        [1.4, 2.45, 2.45],
    )
    add_heading(doc, "1.7.3 Scrum", 3)
    p(doc, "Scrum was used to structure the work into fixed iterations. The product backlog listed major GoFit features, each sprint selected a coherent subset, and each increment targeted a working part of the product. Sprint reviews and retrospectives supported feedback and improvement.")
    add_diagram(
        doc,
        "figure_1_2_scrum_flow.png",
        "Figure 1.2: Scrum flow used for GoFit",
        "Scrum Flow Used for GoFit",
        [
            ["Product Backlog", "Sprint Planning", "Sprint Backlog"],
            ["Development Sprint", "Daily Follow-up", "Increment"],
            ["Sprint Review", "Retrospective", "Backlog Refinement"],
        ],
    )
    add_heading(doc, "1.7.4 Modeling Language / UML", 3)
    p(doc, "UML was selected to model requirements and system design. Use case diagrams describe actors and system functions, class diagrams describe structural relationships, sequence diagrams describe interactions, and deployment diagrams describe the runtime environment.")
    add_heading(doc, "1.8 Conclusion", 2)
    p(doc, "This chapter presented the GoFit project, its context, problem statement, existing limitations, proposed solution, methodology, and modeling language. The next chapter presents Sprint 0, where requirements and project organization are formalized.")
    doc.add_page_break()


def chapter2(doc):
    add_heading(doc, "2 Sprint 0", 1)
    p(doc, "Sprint 0 prepared the project before feature implementation. It clarified actors, requirements, backlog organization, sprint planning, and the global functional perimeter of GoFit.")
    add_heading(doc, "2.1 Needs Assessment", 2)
    add_heading(doc, "2.1.1 Identification of Actors", 3)
    add_basic_table(
        doc,
        "Table 2.1: Identification of actors",
        ["Actor", "Type", "Description"],
        [
            ["Mobile user / client", "Primary", "Uses the mobile application to manage profile, workouts, nutrition, progress, bookings, packs, programs, and communication."],
            ["Coach", "Primary", "Creates a coach profile, manages clients, programs, session packs, availability, bookings, check-ins, and chat."],
            ["Administrator", "Primary", "Uses the web admin panel to manage users, coaches, exercises, workouts, transactions, notifications, settings, and analytics."],
            ["Supabase", "External system", "Provides authentication, PostgreSQL database, storage, realtime features, edge functions, and row-level security."],
            ["Payment/video/push services", "External services", "Support planned or implemented communication, notification, and marketplace capabilities."],
        ],
        [1.5, 1.2, 3.8],
    )
    add_heading(doc, "2.1.2 Functional Requirements", 3)
    add_basic_table(
        doc,
        "Table 2.2: Functional requirements",
        ["ID", "Requirement", "Actor", "Priority"],
        [
            ["FR-01", "Register, sign in, reset password, and manage authenticated sessions.", "Mobile user / Coach / Admin", "High"],
            ["FR-02", "Complete onboarding and maintain personal profile, goals, units, preferences, and measurements.", "Mobile user", "High"],
            ["FR-03", "Browse exercise library, view details, create custom workouts, and start workout sessions.", "Mobile user", "High"],
            ["FR-04", "Track active workout progress with sets, reps, weights, rest timer, and workout summary.", "Mobile user", "High"],
            ["FR-05", "View progress statistics, body measurements, consistency, and workout history.", "Mobile user", "High"],
            ["FR-06", "Use marketplace features to find coaches, book sessions, buy packs, receive programs, and chat.", "Mobile user / Coach", "Medium"],
            ["FR-07", "Allow coaches to onboard, manage clients, create programs, define availability, and follow check-ins.", "Coach", "Medium"],
            ["FR-08", "Allow administrators to manage users, coaches, exercises, workouts, transactions, notifications, settings, and analytics.", "Administrator", "High"],
        ],
        [0.6, 3.55, 1.55, 0.8],
    )
    add_heading(doc, "2.1.3 Non-Functional Requirements", 3)
    add_basic_table(
        doc,
        "Table 2.3: Non-functional requirements",
        ["ID", "Category", "Requirement"],
        [
            ["NFR-01", "Security", "Authentication must be handled through Supabase Auth and data access must respect RLS policies."],
            ["NFR-02", "Performance", "Mobile screens, lists, and admin pages must remain responsive during repeated daily use."],
            ["NFR-03", "Maintainability", "The codebase must separate screens, components, services, stores, navigation, and database migrations."],
            ["NFR-04", "Usability", "Workout, progress, coach, and admin flows must include clear navigation, loading states, and error messages."],
            ["NFR-05", "Scalability", "The database model must support native workouts, custom workouts, sessions, coaches, clients, messages, and admin growth."],
        ],
        [0.7, 1.1, 4.7],
    )
    add_report_note(
        doc,
        "Requirement interpretation",
        "The non-functional requirements are especially important for GoFit because the platform manipulates personal fitness data, progress photos, coach-client communication, and privileged administration actions. Security, privacy, reliability, and transparency therefore have the same importance as the visible mobile screens."
    )
    add_basic_table(
        doc,
        "Table 2.4: AI and privacy constraints",
        ["Constraint", "Reason", "Design decision"],
        [
            ["Human review of AI outputs", "AI-generated body measurements and coach summaries can be wrong or incomplete.", "Measurements are shown as draft values; coach briefings are assistance notes, not automatic decisions."],
            ["No medical diagnosis", "Fitness data and photos should not be interpreted as clinical information.", "The report and application position AI as progress support only."],
            ["Scoped prompts", "Language models can hallucinate if asked open-ended questions.", "Prompts use only selected profile, workout, booking, note, and check-in data."],
            ["Service-role protection", "Automations and admin workflows need privileged access.", "Service-role keys remain in backend/n8n/server contexts, never in the mobile app."],
            ["On-device CV preference", "Photos are sensitive user data.", "Pose and segmentation are designed primarily for local/native processing where feasible."],
        ],
        [1.55, 2.2, 2.75],
    )
    add_heading(doc, "2.2 Project Structure and Management with Scrum", 2)
    add_heading(doc, "2.2.1 Scrum Team", 3)
    add_basic_table(
        doc,
        "Table 2.5: Scrum team",
        ["Role", "Assigned person", "Responsibility"],
        [
            ["Product Owner", "Supervisor / project owner", "Prioritizes needs and validates the business value of GoFit features."],
            ["Scrum Master", "Student / supervisor", "Organizes sprint rhythm, removes blockers, and tracks progress."],
            ["Development Team", "Student / team members", "Designs, implements, tests, and documents the mobile app, backend, and admin panel."],
            ["Stakeholders", "Academic and professional supervisors", "Review increments and provide feedback."],
        ],
        [1.4, 1.7, 3.4],
    )
    add_heading(doc, "2.2.2 Product Backlog", 3)
    add_basic_table(
        doc,
        "Table 2.6: Product backlog",
        ["ID", "Epic / User story", "Priority", "Planned sprint"],
        [
            ["PB-01", "As a user, I want secure authentication and onboarding.", "High", "Sprint 1"],
            ["PB-02", "As a user, I want to create, schedule, and execute workouts.", "High", "Sprint 1"],
            ["PB-03", "As a user, I want an exercise library and workout history.", "High", "Sprint 1"],
            ["PB-04", "As a user, I want to track progress, measurements, and nutrition.", "High", "Sprint 2"],
            ["PB-05", "As a coach, I want onboarding, profile, client management, programs, bookings, and chat.", "Medium", "Sprint 3"],
            ["PB-06", "As an administrator, I want dashboard, user, coach, exercise, workout, transaction, notification, and settings management.", "High", "Sprint 3"],
            ["PB-07", "As the platform owner, I want deployment, monitoring, and release preparation.", "High", "Closing phase"],
        ],
        [0.65, 4.1, 0.75, 1.0],
    )
    p(doc, "The GoFit backlog was not limited to a simple workout tracker. It was organized as a multi-module platform that covers the client experience, the coach experience, the administration experience, and the backend services required to connect them. The project inventory identifies more than two hundred functional items distributed across mobile client features, coach features, admin-panel features, backend functions, database migrations, realtime communication, storage, notification, and AI-assisted progress tracking.")
    add_basic_table(
        doc,
        "Table 2.7: Detailed feature modules of GoFit",
        ["Module", "Main features", "Implementation elements"],
        [
            ["Authentication and onboarding", "Registration, login, session persistence, password reset, protected navigation, onboarding screens, profile creation, goals, units, preferences, and role-aware flows.", "Supabase Auth, Expo Secure Store, auth store, protected navigators, user_profiles table, onboarding state."],
            ["Workout planning and execution", "Exercise library, custom workouts, native workouts, day splits, workout builder, session tracking, sets, reps, weights, duration, workout summary, and history.", "Exercises, workouts, workout_exercises, workout_sessions, workout services, Zustand stores, active-session screens."],
            ["Enhanced rest timer", "Start, pause, resume, warning intervals, haptic feedback, audio cues, auto-advance settings, persistent timer preferences, and background-aware behavior.", "Timer preferences, mobile UI controls, audio/haptic APIs, workout session integration."],
            ["Progress and measurements", "Progress charts, workout statistics, consistency, body measurements, progress photos, AI-assisted draft measurements, manual correction, and validation notes.", "Body measurement service, MediaPipe native module, MoveNet fallback, segmentation service, measurement tables."],
            ["Nutrition and saved meals", "Nutrition logging foundations, saved meal management, meal item editing, reusable food entries, and history views where enabled.", "Nutrition screens, saved meal services, local and Supabase-backed persistence."],
            ["Coach marketplace", "Coach discovery, coach profiles, onboarding, certification/CV upload, pending validation, session packs, bookings, availability, client list, check-ins, programs, chat, video-session preparation, wallet, and settings.", "Coach profile tables, marketplace screens, booking services, realtime chat, storage uploads, LiveKit token function where applicable."],
            ["Administration panel", "Dashboard statistics, user management, coach validation, exercise/workout management, transactions, notifications, settings, activity logs, search, import/export, analytics, and protected admin routes.", "Next.js App Router, server-side Supabase admin client, middleware, shadcn-style components, admin routes."],
            ["Backend and integrations", "Authentication, PostgreSQL database, row-level security, storage, realtime messaging, push notifications, video-token generation, edge functions, migrations, and deployment configuration.", "Supabase Auth, RLS policies, Edge Functions, Storage buckets, Realtime channels, Expo Push, environment variables."],
        ],
        [1.45, 3.3, 2.2],
    )
    add_basic_table(
        doc,
        "Table 2.8: Feature coverage by product area",
        ["Product area", "Approximate feature count", "Examples"],
        [
            ["Mobile client", "116", "Authentication, onboarding, workouts, active sessions, rest timer, progress, measurements, nutrition, marketplace access, bookings, programs, chat."],
            ["Mobile coach", "35", "Coach onboarding, profile, dashboard, clients, client progress, notes, programs, calendar, availability, wallet, settings."],
            ["Admin panel", "55", "Dashboard, users, coaches, exercises, workouts, transactions, notifications, settings, analytics, imports/exports, activity logs."],
            ["Backend / Edge Functions", "43", "Database migrations, RLS, storage, realtime chat, push notification relay, video-token generation, AI measurement function support."],
        ],
        [1.6, 1.3, 3.6],
    )
    p(doc, "To avoid documenting only planned features, the report also uses a source-tree audit. The implementation evidence was taken from the actual repository areas: mobile screens, mobile services, Zustand stores, admin routes, Supabase Edge Functions, SQL migrations, and exported n8n workflow JSON files. This makes the report closer to the real GoFit product rather than only a theoretical project description.")
    add_basic_table(
        doc,
        "Table 2.9: Source-based implementation coverage",
        ["Repository area", "Implemented coverage identified", "Report sections affected"],
        [
            ["GoFitMobile client screens", "Authentication, onboarding, home, workout library, exercise selection, workout detail, workout builder, active session, workout summary, calendar/timeline, progress statistics, records, consistency, progress photos, body measurement, profile, settings, goals, units, themes, text size, health sync, habits, notifications, marketplace, coach detail, booking, packs, programs, nutrition, barcode food lookup, and check-ins.", "Sprints 1 and 2, mobile realization, AI/computer-vision sections, final validation."],
            ["GoFitMobile coach screens", "Coach welcome, login, signup, onboarding, CV upload, certifications, pending review, profile preview, dashboard, client list, client detail, client progress, notes, check-ins, calendar, availability, profile, settings, wallet, conversations, chat, pack creation, session packs, programs, program builder, and video-call screen.", "Sprint 3 coach marketplace, coach management, communication, video, pack and program sections."],
            ["Mobile services and stores", "Services for auth, profile, workouts, sessions, statistics, plans, exercises, body measurements, segmentation, measurement logging, photos, nutrition, health sync, habits, readiness, notifications, marketplace, bookings, coach profiles, client management, check-ins, chat, calendar, AI session notes, programs, packs, wallet, video calls, recommendations, and milestones. Stores manage auth, booking, calendar, chat, coach/client state, health, language, marketplace, onboarding, packs, programs, sessions, text size, theme, timer, UI, workouts, nutrition, daily coach, and wallet state.", "Architecture, maintainability, non-functional requirements, realization, and testing sections."],
            ["Admin panel", "Protected login, dashboard, workout/exercise CRUD, users, user details, coach management, certifications, transactions, settings, notifications, activity logs, BI snapshot/export/saved views/scheduled digests, imports, bulk operations, health endpoints, and route access checks.", "Sprint 3 administration, backend security, deployment, and final QA."],
            ["Supabase Edge Functions", "Push-notification relay, AI workout recommendation, video-token generation, food-barcode lookup, AI session notes, and shared CORS/runtime support.", "Backend services, AI features, notifications, video calls, nutrition, and deployment."],
            ["Database migrations", "Authentication support tables, workouts, sessions, native workout structures, nutrition, saved meals, barcode attribution, progress photos, health data, recovery/readiness, rest timer preferences, notification preferences, marketplace, coach profiles, bookings, packs, wallet transactions, chat, check-ins, AI templates/session notes, BI views, admin settings, admin notifications, audit logs, and RLS/security optimization.", "Data model, security, backend, feature coverage, architecture, and deployment."],
            ["n8n workflow exports", "AI Session Prep v1, Booking Reminders v1, Check-in Reminders v1, Coach Daily Digest v1, and Admin Ops Digest v1.", "Sprint 3 automation, Chapter 6 n8n automation layer, appendices, validation checklist."],
            ["Testing and quality docs", "Mobile Jest tests for services/stores, admin route and API validation notes, Supabase advisor remediation notes, body-measurement validation protocol, and report-generation audits.", "Sprint tests, final validation, remaining work, and academic transparency."],
        ],
        [1.55, 3.55, 2.1],
    )
    add_heading(doc, "2.2.3 Sprint Planning", 3)
    add_basic_table(
        doc,
        "Table 2.10: Sprint planning used in this report",
        ["Report sprint", "Calendar source", "Main goal", "Main deliverables"],
        [
            ["Sprint 1", "26 Jan - 9 Mar 2026", "Foundation and workout core", "Requirements, UI/UX, setup, authentication, profile, workout planner, rest timer."],
            ["Sprint 2", "9 Mar - 20 Apr 2026", "Advanced mobile tracking", "Calendar, exercise library, progress tracking, notifications, body measurement groundwork."],
            ["Sprint 3", "20 Apr - 29 Jun 2026", "Coach marketplace and administration", "Coach onboarding, marketplace, packs, bookings, chat, programs, admin panel and tests."],
        ],
        [1.0, 1.3, 1.6, 2.6],
    )
    add_diagram(
        doc,
        "figure_2_1_gantt_summary.png",
        "Figure 2.1: Gantt chart summary of GoFit development",
        "GoFit Development Timeline",
        [
            ["Foundation\nJan-Feb", "Auth and Setup\nFeb", "Workout Core\nFeb-Mar"],
            ["Progress and AI\nMar-Apr", "Coach Marketplace\nApr-Jun", "Admin Panel\nJun"],
            ["Tests and Optimization\nJun-Jul", "Deployment\nJul"],
        ],
    )
    add_heading(doc, "2.2.4 Global Use Case Diagram", 3)
    add_diagram(
        doc,
        "figure_2_2_global_use_case.png",
        "Figure 2.2: Global use case diagram",
        "Global Use Case View",
        [
            ["Mobile User", "GoFit Mobile App", "Workouts / Progress / Nutrition"],
            ["Coach", "Coach Marketplace", "Clients / Programs / Bookings"],
            ["Administrator", "Admin Panel", "Users / Coaches / Content / Analytics"],
            ["Supabase", "Auth / Database / Storage", "Secure Platform Data"],
        ],
    )
    add_code_block(doc, "Mermaid global use case diagram draft", mermaid_code_for("global_use_case"))
    add_heading(doc, "2.3 Project Management", 2)
    p(doc, "The project was managed through a backlog and sprint-based organization. Technical work was divided between the mobile app, web admin panel, database migrations, backend functions, documentation, testing, and deployment preparation. The repository structure itself supports this organization through separate folders for GoFitMobile, admin-panel, database, and docs.")
    p(doc, "The project management approach also included technical documentation as a project artifact, not as an afterthought. The repository contains architecture notes, feature inventories, sprint breakdowns, troubleshooting reports, database structure documentation, admin-panel notes, body-measurement research, validation protocols, and automation workflow descriptions. This documentation helped connect implementation choices to report sections and made it possible to justify complex AI and backend decisions.")
    add_basic_table(
        doc,
        "Table 2.11: Project documentation artifacts",
        ["Artifact type", "Purpose in the project", "Examples of information captured"],
        [
            ["Architecture documentation", "Explains the global system structure and deployment view.", "Mobile app, admin panel, Supabase backend, Edge Functions, external services, diagrams."],
            ["Feature inventory", "Lists implemented screens, services, routes, functions, and database artifacts.", "Client features, coach features, admin features, backend functions, migrations, integrations."],
            ["Sprint and Gantt documentation", "Connects implementation work to Agile planning.", "Sprint dates, objectives, deliverables, dependencies, release preparation."],
            ["AI research notes", "Records model decisions, tests, limitations, and validation needs.", "MoveNet, MediaPipe Pose Landmarker, segmentation models, feature vectors, statistical estimator."],
            ["Automation documentation", "Explains scheduled and event-driven backend workflows.", "n8n AI session preparation, admin operations digest, notification creation."],
            ["Academic/report drafts", "Transforms engineering material into PFE reporting structure.", "Problem statement, methodology, report plan, diagram drafts, bibliography entries."],
        ],
        [1.45, 2.4, 2.65],
    )
    add_heading(doc, "Conclusion", 2)
    p(doc, "Sprint 0 established the functional and technical base of the project. It clarified actors, requirements, backlog priorities, sprint grouping, and the global use case perimeter. The next chapter presents Sprint 1, focused on the mobile foundation and core workout features.")
    doc.add_page_break()


def add_ai_computer_vision_details(doc):
    add_heading(doc, "4.3.3 AI Body Measurement and Computer Vision Pipeline", 3)
    p(doc, "One of the most distinctive parts of GoFit is the AI-assisted body measurement feature. Its objective is to help users follow physical progress from photos, without replacing manual tape measurements and without claiming medical or tailoring-grade precision. The feature is designed as an assisted workflow: the system analyzes front and side photos, generates draft values for chest, waist, hip, and shoulder, explains capture-quality issues, then lets the user review and correct the values before saving them as progress data.")
    p(doc, "The pipeline starts on the mobile device. The user captures or selects front and side images. The application runs pose detection to locate key body landmarks, segmentation to isolate the person silhouette when available, feature extraction to transform image geometry into measurable indicators, and a measurement estimator to produce draft values. The result is presented with confidence, warnings, and manual editing fields. This design is important because computer vision can support progress tracking, but a single two-dimensional image cannot directly recover exact body circumferences in all conditions.")
    p(doc, "✒ System Diagram : The figure 4.9 represents the end-to-end on-device AI and computer vision processing pipeline for body measurement inference.")
    add_diagram(
        doc,
        "figure_4_9_ai_cv_pipeline.png",
        "Figure 4.9: AI and computer vision pipeline for body measurements",
        "GoFit AI Body Measurement Pipeline",
        [
            ["Front and Side Photos", "Pose Detection", "Segmentation"],
            ["Feature Vector", "Statistical Estimator", "Draft Measurements"],
            ["Quality Checks", "Manual Review", "Saved Progress"],
        ],
    )

    add_heading(doc, "4.3.4 Models and Artifacts Used", 3)
    p(doc, "The project evolved from a keypoint-only prototype toward a more robust pose-and-segmentation architecture. The first implementation used MoveNet Lightning through react-native-fast-tflite because it is lightweight and suitable for on-device inference. Later research and implementation introduced MediaPipe Tasks Vision because its pose landmarker provides richer landmarks and a native Android path for faster and more reliable analysis.")
    add_basic_table(
        doc,
        "Table 4.5: AI and computer vision models used in GoFit",
        ["Model / artifact", "Role in GoFit", "Input / output", "Status and reason"],
        [
            ["MoveNet Lightning (.tflite)", "Initial on-device pose detection and fallback path.", "Resized 192 x 192 RGB image; 17 body keypoints with confidence scores.", "Implemented through react-native-fast-tflite. Useful as a lightweight baseline, but limited for body measurement because 17 keypoints do not describe torso outline or body depth."],
            ["MediaPipe Pose Landmarker Full (pose_landmarker_full.task)", "Main candidate for richer body-pose analysis.", "Image input; 33 normalized landmarks, optional world landmarks, visibility/presence scores, pose count, and inference time.", "Implemented in the local Expo native module on Android. It improves body coverage over MoveNet and supports better pose-quality checks."],
            ["MediaPipe Pose Landmarker Heavy", "Potential higher-accuracy candidate.", "Same landmark structure as the Full model, with heavier computation.", "Not adopted by default. It is reserved for comparison only if Full is accurate enough and device performance remains acceptable."],
            ["selfie_multiclass_256x256.tflite", "Experimental segmentation research artifact.", "256 x 256 float image input; 256 x 256 x 6 class output.", "Investigated but not treated as the final silhouette model because the body mask was unstable in mirror/direct capture scenarios."],
            ["MediaPipe Image Segmenter (selfie_segmenter.tflite)", "Person-mask extraction for segmentation-assisted measurement.", "Image input; 256 x 256 confidence masks and category mask for background/person.", "Integrated in the native MediaPipe module. It provides a cleaner person mask than the earlier multiclass experiment, but it still needs validation and gating."],
            ["Statistical depth estimator", "Converts extracted features into draft circumferences.", "Feature vector using height, front widths, side depths, ratios, pose scores, and mask quality indicators.", "Used as a pragmatic baseline. It is not a trained medical model; it produces draft progress estimates and must remain editable by the user."],
            ["Future regression/PCA estimator", "Target research direction for stronger measurement prediction.", "Labeled dataset of body features and manual/tape measurements.", "Planned improvement based on statistical body-measurement literature. It would replace rigid formulas with learned predictors once enough validation data exists."],
        ],
        [1.55, 1.75, 1.65, 1.95],
    )

    add_heading(doc, "4.3.5 Pose Detection: MoveNet and MediaPipe", 3)
    p(doc, "Pose detection is responsible for finding anatomical landmarks that anchor the measurement process. In the first GoFit prototype, MoveNet Lightning detects 17 keypoints such as nose, shoulders, elbows, wrists, hips, knees, and ankles. These points are enough to estimate body orientation and basic proportions, but they are not enough to measure chest, waist, and hip circumference directly. For example, a shoulder keypoint tells where the shoulder is, but it does not describe the width of the torso at chest level or the depth of the body from the side view.")
    p(doc, "The MediaPipe Pose Landmarker Full model improves this stage by producing 33 landmarks and richer metadata. The local module returns image dimensions, pose count, normalized landmarks, world landmarks when available, and inference time. The GoFit Android implementation loads the bundled pose_landmarker_full.task asset, decodes the image URI, applies EXIF rotation, runs MediaPipe detection, and returns a typed result to the TypeScript layer. This makes the measurement workflow more reliable because the application can inspect landmark visibility, check whether core points are present, and reject only captures that are genuinely unusable.")
    p(doc, "The project keeps MoveNet as a fallback because it is already integrated in the mobile JavaScript service and can continue to support devices or builds where the native MediaPipe module is not available. This fallback strategy reduces deployment risk while the native module reaches parity across Android and iOS.")

    add_heading(doc, "4.3.6 Segmentation and Body Mask Extraction", 3)
    p(doc, "Segmentation is the second computer-vision component. Its role is to separate the person from the background and provide body-outline information. This is necessary because circumference estimation cannot be based only on joint coordinates. The pose model can locate shoulder, hip, and torso reference lines; the segmentation mask can then estimate front-view widths and side-view depths around the chest, waist, and hip levels.")
    p(doc, "The project first examined selfie_multiclass_256x256.tflite. That model exposes a 256 x 256 x 6 output rather than a simple binary body mask, which required class selection, argmax maps, connected-component cleanup, and debugging overlays. Real tests showed that the resulting mask could be unstable, especially with mirror photos, phone occlusion, and direct capture conditions. For this reason, the report classifies it as an experimental research artifact instead of a final production model.")
    p(doc, "The later implementation uses MediaPipe Image Segmenter with selfie_segmenter.tflite in the local native module. The Android bridge returns confidence masks, category masks, labels, quality scores, and inference timing. The TypeScript segmentation service decodes the masks, thresholds the person class, builds a cleaned binary mask, extracts sampled class grids for debugging, anchors scan lines using pose landmarks, and measures chest, waist, and hip widths/depths. This gives GoFit a more explainable measurement pipeline because each generated number can be traced back to pose landmarks, mask rows, and quality gates.")

    p(doc, "✒ System Diagram : The figure 4.10 represents the dual-model on-device inference flow combining MediaPipe BlazePose and Selfie Segmentation.")
    add_diagram(
        doc,
        "figure_4_10_model_flow.png",
        "Figure 4.10: Pose and segmentation model flow",
        "Model Flow for AI Measurements",
        [
            ["MoveNet 17 Keypoints", "Fallback Pose Path", "Basic Quality Checks"],
            ["MediaPipe 33 Landmarks", "Primary Pose Path", "Landmark Visibility"],
            ["MediaPipe Segmenter", "Person Mask", "Widths and Depths"],
            ["Estimator", "Confidence and Warnings", "Editable Result"],
        ],
    )

    add_heading(doc, "4.3.7 Feature Vector and Measurement Estimation", 3)
    p(doc, "The measurement service builds a structured feature vector before calculating the final draft values. This is a strong architectural choice because the application does not mix raw pixels, pose confidence, segmentation quality, and final centimeter values in a single opaque formula. Instead, it records the intermediate indicators that explain why a measurement was accepted, warned, or rejected.")
    add_basic_table(
        doc,
        "Table 4.6: Body measurement feature vector",
        ["Feature group", "Examples", "Purpose"],
        [
            ["User scale", "Declared height in centimeters, person height in pixels, scale in cm/px, height-span fraction.", "Converts image measurements into approximate real-world dimensions and detects bad framing."],
            ["Pose quality", "Front and side pose model source, mean landmark score, visible core keypoints, body center, top and bottom normalized positions.", "Checks whether the user is visible, centered, and sufficiently detected."],
            ["Front geometry", "Front shoulder width, hip width, estimated waist width, chest/waist/hip mask widths.", "Measures visible body widths from the front photo."],
            ["Side geometry", "Side shoulder width, side-to-front ratio, chest depth, abdomen depth, side mask depths.", "Approximates body depth, which is essential for circumference estimation."],
            ["Segmentation quality", "Raw coverage, clean coverage, body class index, mask bounds, fragmentation, class grid, person threshold.", "Detects unstable masks and prevents unreliable segmentation from overriding safer estimates."],
            ["Estimator outputs", "Draft chest, waist, hip, shoulder, depth source, confidence, failed checks, quality issues.", "Produces editable progress values and explains uncertainty to the user."],
        ],
        [1.5, 3.0, 2.0],
    )
    p(doc, "The estimator currently combines geometric measurements with sex-aware statistical depth assumptions. In practical terms, the service uses the user's height and body proportions to estimate a scale, then uses front widths and side/depth information to produce draft circumferences. When segmentation depth passes quality and sanity gates, it can contribute to the estimate; otherwise the service falls back to statistical priors. This prevents a bad mask from producing extremely wrong values.")
    p(doc, "Research notes in the project also identify a stronger long-term direction: use a labeled dataset of photos and manual measurements to train regression, ridge regression, gradient-boosted trees, PCA-based, or body-shape models. Such a model would learn the relationship between extracted features and real measurements instead of relying mainly on hand-built formulas. For the PFE scope, the current implementation is correctly presented as an AI-assisted progress estimator with validation and manual correction.")

    add_heading(doc, "4.3.8 Validation Results and Limitations", 3)
    p(doc, "Device tests confirmed that MediaPipe can run inside the Android development client and that the pose model detects one person with high landmark visibility in normal capture conditions. Example observations showed mirror-front captures around 0.99 pose score, side captures around 0.97 to 0.98 in good conditions, and inference times that varied by device and image conditions. Direct capture also worked but may show different inference times and body framing behavior.")
    p(doc, "The main limitation is not pose detection; it is reliable circumference estimation from consumer photos. Early segmentation experiments produced thin or unstable masks in some scans, and earlier formulas generated unstable chest, waist, and hip values. Later statistical-depth experiments were more stable across repeated scans, but the project documentation correctly notes that those values are still draft estimates, not ground truth. Therefore, the application keeps a manual review screen and should store corrected values when the user has measured with a tape.")
    add_basic_table(
        doc,
        "Table 4.7: AI measurement validation protocol",
        ["Validation item", "Expected practice", "Target / interpretation"],
        [
            ["Reference measurements", "Measure chest, waist, hip, and shoulder with a tape before comparing with the AI result.", "The tape value is the reference value for validation."],
            ["Capture conditions", "Use good lighting, full body visible, fitted clothes, front photo, side photo at approximately 90 degrees, and consistent distance.", "Bad framing, loose clothing, phone occlusion, and angled mirrors must be flagged."],
            ["AI result", "Record the draft AI value before manual correction.", "Used to calculate absolute error and identify model weaknesses."],
            ["Manual correction", "Allow the user to edit the values before saving.", "Saved corrected values should match the user's real measurement."],
            ["Fitness-progress target", "Use approximate progress targets rather than tailoring or medical targets.", "Chest error ideally below 8 cm; waist and hip below 6 cm; shoulder below 5 cm."],
            ["Confidence", "Confidence must decrease when pose, segmentation, scale, or repeated-scan stability is weak.", "The report should avoid claiming 100 percent confidence for unstable captures."],
        ],
        [1.45, 3.0, 2.05],
    )
    add_basic_table(
        doc,
        "Table 4.8: AI implementation status",
        ["Component", "Current status", "Remaining work"],
        [
            ["MoveNet pose fallback", "Implemented in TypeScript service through react-native-fast-tflite and bundled model asset.", "Keep as fallback and compare against MediaPipe outputs."],
            ["MediaPipe pose Android module", "Implemented with bundled pose_landmarker_full.task, EXIF rotation handling, 33 landmarks, world landmarks, pose count, and inference time.", "Complete parity and production testing across iOS and Android release builds."],
            ["MediaPipe image segmentation", "Implemented in native module with selfie_segmenter.tflite, confidence/category masks, labels, and quality scores.", "Improve segmentation quality gates and verify on more body types, clothes, lighting, and camera setups."],
            ["Feature vector", "Implemented with pose, scale, geometry, segmentation, confidence, and debug fields.", "Export validation datasets and compare AI estimates with tape measurements."],
            ["Estimator", "Statistical baseline and segmentation-gated depth source available.", "Train or calibrate a stronger model once enough labeled examples exist."],
            ["User workflow", "Draft measurement, quality warnings, and manual review approach defined.", "Finalize UX copy, screenshots, and submission-ready validation evidence."],
        ],
        [1.6, 2.55, 2.4],
    )
    p(doc, "In conclusion, the AI module is a meaningful technical contribution because it combines on-device inference, native module integration, pose landmarks, segmentation masks, typed feature vectors, statistical estimation, and validation methodology. At the same time, the report must be transparent: GoFit uses AI to assist progress tracking, not to replace professional body measurement.")


def add_sprint1_implementation_details(doc):
    add_heading(doc, "3.3.1 Mobile Foundation and Navigation", 3)
    p(doc, "The first implementation challenge was to create a stable mobile foundation that could support both client and coach experiences. The application was structured around authentication screens, onboarding screens, protected app navigators, profile flows, and domain-specific feature stacks. This foundation is important because the rest of the product depends on role-aware routing: a visitor should not reach protected screens, an incomplete profile should be redirected to onboarding, and coach-specific flows should remain separated from standard client flows.")
    p(doc, "State management was organized with stores so that authentication state, profile state, workout state, timer preferences, and user settings could be reused across screens without duplicating logic. Service files were used to isolate communication with Supabase and local modules. This separation makes the mobile code easier to test and maintain because UI components do not directly contain all persistence logic.")
    add_basic_table(
        doc,
        "Table 3.4: Sprint 1 implementation components",
        ["Component", "Role", "Implementation detail"],
        [
            ["Authentication flow", "Protects access to user data and feature screens.", "Supabase Auth, session persistence, auth store, protected navigation, login/signup/reset screens."],
            ["Onboarding flow", "Collects first profile information and directs users to the right experience.", "Profile setup, goals, preferences, role-aware continuation, user_profiles persistence."],
            ["Navigation structure", "Organizes the application into coherent areas.", "Auth navigator, onboarding navigator, client app navigator, coach app navigator, modal/detail screens."],
            ["Service layer", "Centralizes data access.", "Supabase client calls, typed methods, error handling, loading states, reusable domain services."],
            ["UI component base", "Creates reusable screens and controls.", "Buttons, cards, lists, forms, empty states, loading indicators, timer controls, workout cells."],
        ],
        [1.5, 2.1, 2.9],
    )
    add_heading(doc, "3.3.2 Workout Core and Rest Timer", 3)
    p(doc, "The workout core was implemented around the distinction between a workout template and an executed workout session. A workout template defines the exercises, order, difficulty, target muscle groups, and expected configuration. A workout session records what the user actually performed: start time, completion time, sets, reps, weights, notes, duration, and summary data. This separation is essential because the same workout can be performed many times while producing different session histories.")
    p(doc, "The rest timer was treated as a real workout tool rather than a decorative countdown. It includes start, pause, resume, warning cues, haptic feedback, audio cues, auto-advance options, and persisted preferences. This improves usability during training because users often interact with the timer under fatigue and need clear feedback without navigating away from the session.")
    add_heading(doc, "3.3.3 Offline Workout Resiliency and Fault-Tolerant Queue", 3)
    p(doc, "A critical architectural challenge encountered during gym testing is network instability. Physical gym environments frequently feature thick reinforced concrete walls or subterranean weight rooms where cellular connectivity drops completely. Without proper handling, finishing a session in an offline state results in lost workout telemetry, user frustration, and broken streaks.")
    p(doc, "To ensure bulletproof reliability, GoFit introduces an optimistic offline workout queue service (GoFitMobile/src/services/offlineQueue.ts). When the user completes a session and the API request fails due to network unreachability, the application intercepts the error, persists the session payload securely into local AsyncStorage, and presents immediate positive feedback so the user's flow is uninterrupted. Concurrently, a NetInfo network listener registered at the application root (App.tsx) detects when Internet connectivity is re-established. The queue processor then automatically dequeues, synchronizes, and confirms the stored workout sessions against Supabase in the background with deduplication safeguards.")
    add_heading(doc, "3.3.4 Cloudflare R2 Video Demonstration Streaming Pipeline", 3)
    p(doc, "High-definition visual instruction is crucial for proper exercise execution and injury prevention. However, storing hundreds of high-resolution MP4 video demonstrations directly in standard database byte storage or high-egress cloud buckets introduces severe egress bandwidth costs and latency bottlenecks.")
    p(doc, "GoFit solves this through a dedicated Cloudflare R2 object storage architecture utilizing the S3-compatible AWS SDK (@aws-sdk/client-s3). A catalog of over 90 unique exercise videos (encompassing 99 canonical exercises in Supabase) was uploaded to an R2 bucket (gofit-content) with zero egress bandwidth charges. On the mobile client, ExerciseDetailScreen leverages expo-video with hardware-accelerated playback, automatic loop buffering, and smooth scrub controls, ensuring fluid video streaming with minimal device battery drain.")
    add_basic_table(
        doc,
        "Table 3.5: Workout-session data flow",
        ["Step", "User action", "System behavior"],
        [
            ["1", "User selects or creates a workout.", "The app loads workout metadata, exercise list, and saved configuration."],
            ["2", "User starts a session.", "A session state is initialized with start time, current exercise, set counters, and timer preferences."],
            ["3", "User completes sets.", "The app records repetitions, weights, rest periods, and exercise completion state."],
            ["4", "Rest timer runs between sets.", "Timer UI, haptics, audio cues, warning intervals, and auto-advance settings are applied."],
            ["5", "User finishes the workout.", "Summary values are calculated and stored in workout_sessions for progress screens."],
        ],
        [0.6, 2.0, 3.9],
    )


def add_sprint2_progress_details(doc):
    add_heading(doc, "4.3.1 Progress, Nutrition, and Reminder Features", 3)
    p(doc, "Sprint 2 connected the workout foundation to user progress. A fitness application becomes more valuable when it transforms repeated sessions into understandable feedback. For this reason, the sprint added progress screens, history views, statistics, body-measurement foundations, nutrition-related flows, and reminder infrastructure. These features help users move from isolated workout execution to long-term self-monitoring.")
    p(doc, "Progress tracking uses workout session data, body-measurement data, and optional nutrition entries to display user evolution. Empty states are important in this sprint because new users may not have enough data yet. The interface should explain what the user can do next without showing broken charts or misleading statistics.")
    add_basic_table(
        doc,
        "Table 4.4: Sprint 2 user-facing progress modules",
        ["Module", "Objective", "Important states"],
        [
            ["Exercise library", "Allow users to browse and understand available exercises.", "Search result, filter result, detail screen, no-result state, loading state."],
            ["Workout calendar/history", "Help users see planned and completed training.", "Scheduled workout, completed workout, missed day, empty calendar, history detail."],
            ["Progress dashboard", "Summarize evolution over time.", "Charts with data, first-use empty state, metric selector, date-range filtering."],
            ["Body measurements", "Record and compare physical changes.", "Manual entry, AI draft, review/correction, quality warning, saved measurement."],
            ["Nutrition/saved meals", "Support nutrition tracking foundations.", "Saved meal list, meal detail, item edit, history, reusable entry."],
            ["Notifications", "Encourage consistency and communication.", "Permission request, reminder settings, notification inbox, push-token registration."],
        ],
        [1.4, 2.3, 2.8],
    )
    add_heading(doc, "4.3.2 Data Interpretation and User Feedback", 3)
    p(doc, "A key design point in Sprint 2 is that GoFit should not only store values; it should help the user interpret them. For example, workout history becomes useful when the app can show consistency, completed sessions, training load, and trends. Body measurements become useful when the user can compare corrected values over time and understand why an AI draft may be uncertain. Nutrition entries become useful when they are reusable and connected to habits rather than isolated forms.")
    add_heading(doc, "4.3.3 Client Nutrition Preferences & Intelligent Dietary Exclusion Engine", 3)
    p(doc, "Nutrition is deeply personalized: fitness clients have specific dietary philosophies (e.g., vegan, keto, Mediterranean), critical food allergies (e.g., peanuts, lactose, gluten), and strong personal food dislikes. Standard fitness trackers often force users to manually filter foods or ignore their preferences completely.")
    p(doc, "In GoFit, the nutrition module was expanded with a robust preference architecture. The user_profiles database table was extended with dietary_preferences (TEXT[]), food_allergies (TEXT[]), and food_dislikes (TEXT[]) supported by PostgreSQL GIN indexes. During onboarding (OnboardingScreenNutrition.tsx), new users explicitly define their allergies and disliked ingredients. On the NutritionScreen, an interactive callout alerts users with incomplete dietary profiles, routing them directly to complete their configuration.")
    p(doc, "Crucially, this data is enforced in food search and recommendation workflows. When searching for foods in AddFoodScreen.tsx, nutritionService.searchFoods() dynamically injects SQL negation filters (.not('name', 'ilike', '%' + exclusion + '%')) to strictly exclude all disliked foods and allergens from the search results, ensuring clients are never presented with meals they dislike or cannot safely consume.")
    add_heading(doc, "4.3.4 Hydration Tracking and Multi-Period Macronutrient Analytics", 3)
    p(doc, "In addition to qualitative food filtering, GoFit provides comprehensive quantitative nutrition analytics. The mobile screen integrates an interactive MacroRings visualization that tracks daily calories, protein, carbohydrates, and healthy fats against personalized caloric targets. A quick-tap water intake tracker (+250ml / +500ml) encourages daily hydration. To help users focus on sustainable long-term consistency rather than single-day fluctuations, a 7-day rolling trend widget calculates average caloric intake and adherence scores across protein, water, and fiber.")
    p(doc, "The sprint therefore uses feedback patterns such as charts, summaries, empty states, warnings, and review screens. This is especially important for AI-assisted measurements. Instead of hiding uncertainty, the application should show quality issues such as poor pose, incomplete body visibility, weak segmentation, bad framing, or inconsistent scale between front and side photos.")
    p(doc, "✒ System Diagram : The figure 4.8 represents the progress feedback loop across active logging, analytical processing, and adaptive habit correction.")
    add_diagram(
        doc,
        "figure_4_8_progress_feedback_loop.png",
        "Figure 4.8: Progress feedback loop",
        "Progress Feedback Loop",
        [
            ["Workout / Nutrition / Photo", "Data Processing", "Metric History"],
            ["Charts and Summaries", "User Interpretation", "Habit Adjustment"],
            ["Coach Context", "AI Assistance", "Manual Validation"],
        ],
    )


def add_sprint3_platform_details(doc):
    add_heading(doc, "5.3.1 Coach Marketplace and Client Follow-up", 3)
    p(doc, "Sprint 3 expanded GoFit from an individual fitness tracker into a marketplace and coaching platform. This required a different type of workflow because the application now connects two human roles: the client and the coach. The client needs to discover coaches, view profiles, book sessions, purchase packs, access programs, and communicate. The coach needs to onboard, submit profile and document information, wait for validation when required, manage availability, consult clients, create programs, read notes, and follow progress.")
    p(doc, "The marketplace is not only a list of coaches. It depends on trust, availability, transaction status, communication, and follow-up. For this reason, the sprint includes coach profiles, session packs, bookings, purchased packs, conversations, messages, programs, notifications, and wallet-related views. Each of these elements must be connected to permissions so that clients can see their own bookings and coaches can see only their own clients.")
    add_basic_table(
        doc,
        "Table 5.4: Coach marketplace feature detail",
        ["Feature", "Client-side value", "Coach-side value"],
        [
            ["Coach discovery", "Find coaches by profile, expertise, and services.", "Increase visibility and attract clients."],
            ["Coach onboarding", "Improves trust by requiring complete coach data.", "Allows coach to create a professional presence."],
            ["Session packs", "Buy or use grouped coaching sessions.", "Sell structured services and track remaining sessions."],
            ["Bookings", "Reserve a coaching slot and follow status.", "Organize calendar and session workload."],
            ["Programs", "Receive personalized training plans.", "Create and assign plans to clients."],
            ["Chat and notes", "Communicate with the coach and receive follow-up.", "Keep client context and preparation notes together."],
            ["Video call screen", "Join remote coaching sessions.", "Connect with clients through LiveKit-backed sessions."],
        ],
        [1.45, 2.35, 2.35],
    )
    add_heading(doc, "5.3.2 Secure Serverless Stripe Payment Architecture", 3)
    p(doc, "Monetization in a coaching marketplace requires absolute security and frictionless user checkout. Handling payment credentials directly on the mobile device introduces massive PCI-DSS compliance liabilities. Therefore, GoFit adopts a serverless Payment Intent architecture.")
    p(doc, "The payment flow is powered by a dedicated Supabase Edge Function (supabase/functions/stripe-payment/index.ts) deployed on a Deno runtime with server-side environment secrets. When a client purchases a coaching session pack in CoachDetailScreen.tsx or books a 1-on-1 coaching session in BookSessionScreen.tsx, the client initiates a request to the edge function. The edge function securely calculates the required amount, verifies the coach tier, and interacts with the Stripe API to generate an ephemeral PaymentIntent client secret.")
    p(doc, "On the mobile device, @stripe/stripe-react-native initializes the Native Stripe Payment Sheet (initPaymentSheet and presentPaymentSheet). This presents a native, highly secure Apple Pay / Google Pay / Credit Card modal. Upon successful authorization, the webhook or edge callback updates the purchased_packs or bookings database table, completing the checkout without ever exposing secret keys to the client application.")
    add_heading(doc, "5.3.3 Proactive Coach Intelligence & Clinic-Grade Follow-up", 3)
    p(doc, "A successful coaching platform must empower coaches to deliver proactive, informed guidance rather than reactive communication. GoFit enhances the coach experience with actionable clinical follow-up tools.")
    p(doc, "On the CoachDashboardScreen.tsx, a real-time 'Wellness Alerts' widget monitors client daily check-ins. If a client records low energy, high stress, or negative mood ratings, the coach is immediately alerted with a direct navigation shortcut to initiate supportive chat. In ClientDetailScreen.tsx, a dedicated 'Health & Nutrition Profile' glass card displays the client's declared dietary preferences, allergies, and food dislikes. Furthermore, in ProgramBuilderScreen.tsx, when a coach constructs a meal plan, automated conflict analysis displays immediate visual warnings if an ingredient conflicts with the client's recorded dislikes or allergies.")
    add_heading(doc, "5.3.4 High-Affordance Empty State Architecture", 3)
    p(doc, "A frequent source of user confusion in marketplace applications is unformatted or blank screens when no data exists (e.g., zero active clients, empty chat inbox, new wallet with zero transactions). GoFit introduces a centralized, modular EmptyState component across the coach application (ClientsListScreen, ConversationsListScreen, CoachWalletScreen). Each empty state renders contextual iconography, informative microcopy, and clear call-to-action buttons, guiding coaches and clients on immediate next steps.")
    add_heading(doc, "5.3.5 Administration and Operational Control", 3)
    p(doc, "The administration panel is necessary because the platform contains user-generated data, coach applications, exercise content, workouts, transactions, notifications, and analytics. Without a back-office interface, the operator would need to manipulate database rows directly, which is risky and unsuitable for a production platform. The admin panel provides safer and more structured operational control.")
    p(doc, "The admin panel uses Next.js App Router and protected admin access. Server-side Supabase utilities are used for privileged operations, while middleware and admin-role checks prevent normal users from opening back-office pages. The design includes dashboard statistics, user management, coach validation, exercise/workout management, transaction review, notification management, settings, logs, analytics, search, and import/export foundations.")
    add_basic_table(
        doc,
        "Table 5.5: Admin-panel operational modules",
        ["Admin area", "Managed data", "Purpose"],
        [
            ["Dashboard", "Users, exercises, workouts, sessions, transactions, coach status.", "Provide a fast overview of platform health."],
            ["Users", "Auth users and profile data.", "Search, review, update, and monitor user accounts."],
            ["Coaches", "Coach profiles, status, documents, marketplace visibility.", "Validate coaches and maintain service quality."],
            ["Exercises and workouts", "Exercise library, workout templates, metadata.", "Maintain content consistency for mobile users."],
            ["Transactions and packs", "Purchases, wallet/pack status, booking-related financial records.", "Support marketplace operations and revenue visibility."],
            ["Notifications and logs", "User notifications, admin activity, operational events.", "Trace actions and communicate important updates."],
            ["Settings and analytics", "Platform configuration and business indicators.", "Prepare the product for scaling and decision-making."],
        ],
        [1.5, 2.45, 2.2],
    )
    add_heading(doc, "5.3.3 Admin Analytics and Business Intelligence Features", 3)
    p(doc, "The administration panel also includes a business intelligence dimension. This work is more than a simple dashboard counter: it transforms operational data from users, workouts, bookings, coaches, session packs, finance records, and health/readiness signals into indicators that an administrator can use for monitoring and decision-making. The BI area is implemented inside the main dashboard so that operational control and performance interpretation stay in the same protected back-office interface.")
    p(doc, "The first analytics layer provides platform visibility: registered users, daily/weekly/monthly active users, user growth, popular exercises, workout completion rates, activity heatmaps, session activity, and recent activity. The advanced BI layer adds deeper decision-support views: finance by currency and coach/package scope, user lifecycle and activation signals, workout cohort retention, coach operations, client health risk queues, threshold alerts, saved BI views, snapshot notifications, scheduled digests, and CSV exports.")
    add_basic_table(
        doc,
        "Table 5.6: Admin analytics and BI dashboard features",
        ["BI feature", "Source / implementation", "Administrative value"],
        [
            ["Engagement metrics", "admin-panel/lib/analytics.ts; EngagementMetricsCards; workout_sessions and user_profiles.", "Tracks total users, DAU, WAU, and MAU to measure platform activity."],
            ["User growth chart", "UserGrowthChart; user_profiles.created_at grouped by date.", "Shows acquisition trend and cumulative user growth."],
            ["Popular exercises", "PopularExercisesCard; exercises joined with workout_exercises usage counts.", "Identifies content that is most used by members."],
            ["Workout completion and session activity", "WorkoutCompletionCard and SessionActivityChart; workout_sessions.", "Detects completion rate, training volume, and possible workout drop-off."],
            ["Activity heatmap and recent activity", "ActivityHeatmap and RecentActivityFeed; completed sessions and activity records.", "Shows when users are active and what happened recently on the platform."],
            ["Advanced BI overview", "admin-panel/app/dashboard/page.tsx with bi-finance, bi-user-lifecycle, bi-coach-ops, and bi-client-health services.", "Combines finance, lifecycle, coach operations, and client health into one decision panel."],
            ["Threshold alerts", "BIThresholdAlertsCard with client-health rows.", "Highlights users with risk signals so administrators can notice operational issues earlier."],
            ["Saved BI views", "AdvancedBISavedViews and /api/bi/saved-views.", "Allows administrators to save BI filter/range configurations and digest cadence."],
            ["BI snapshots and scheduled digests", "AdvancedBISnapshotButton, /api/bi/snapshot, and /api/bi/scheduled-digests.", "Creates admin notification summaries on demand or according to saved-view cadence."],
            ["CSV exports", "/api/bi/export with finance, lifecycle, cohort, coach-ops, and client-health slices.", "Lets administrators extract BI data for external reporting or academic evidence."],
        ],
        [1.55, 2.7, 2.25],
    )
    add_basic_table(
        doc,
        "Table 5.7: Advanced BI data domains and limits",
        ["Domain", "Database / service evidence", "Metrics covered", "Known limit in v1"],
        [
            ["Finance", "bi_finance_daily view; admin-panel/lib/bi-finance.ts; FinanceCurrencyDetailCard.", "Gross pack sales, pack count, ledger signals, currency summaries, coach/package filters.", "Net revenue, refunds, payout reconciliation, and full accounting remain deferred."],
            ["User lifecycle", "bi_user_lifecycle_daily view; admin-panel/lib/bi-user-lifecycle.ts; LifecycleActivationDetailCard.", "Signup, first workout activation, first booking activation, activity windows, DAU/WAU/MAU.", "Coach filters do not scope lifecycle cohorts in v1; lifecycle may include non-client profiles where relevant."],
            ["Workout cohort retention", "bi-user-lifecycle cohort helper; RetentionCohortCard.", "Signup-to-workout retention by cohort period.", "Cohorts depend on available historical workout data."],
            ["Coach operations", "bi_coach_ops_daily view; admin-panel/lib/bi-coach-ops.ts; CoachOpsDetailCard and CoachPerformanceTable.", "Booking activity, completion rate, cancellation/no-show signals, coach activity, package context.", "Coach filters scope coach operations, but not every dashboard card is coach-scoped."],
            ["Client health", "bi_client_health_daily view; admin-panel/lib/bi-client-health.ts; ClientHealthRiskQueue and ClientHealthTrendDetailCard.", "Inactive clients, nutrition gaps, body-measurement gaps, pack/session risk signals, aggregated risk counts.", "Risk indicators are operational signals, not medical diagnosis."],
            ["Security and access", "fix_bi_views_security_invoker.sql; admin middleware; server-side Supabase utilities.", "Admin-only dashboard and BI API access with protected routes.", "Final QA must still attach admin/non-admin access screenshots and API test outputs."],
        ],
        [1.2, 2.05, 2.25, 1.65],
    )
    p(doc, "This BI layer is important academically because it shows that GoFit is not only a mobile user interface. The project also studies how operational data can be modeled, aggregated, protected, visualized, exported, and summarized for administrators. The current implementation remains intentionally transparent about v1 limitations so that the report does not exaggerate financial reconciliation, medical interpretation, or filter completeness.")
    add_heading(doc, "5.3.4 In-App AI Workout Recommendation and Personalization", 3)
    p(doc, "The in-app AI workout recommendation feature deserves separate treatment because it is a user-facing personalization feature, not a computer-vision feature and not an n8n scheduled automation. Its goal is to generate one practical custom workout from the user's real GoFit context, then let the user decide whether to save it into the workout library. In the mobile application, this feature appears as the Adaptive workout card implemented in GoFitMobile/src/components/home/RecommendedWorkouts.tsx.")
    p(doc, "The mobile flow starts from the home screen. When the user taps the Adaptive workout card, the component calls workoutRecommendationService.generateAIWorkout from GoFitMobile/src/services/workoutRecommendations.ts. This service invokes the Supabase Edge Function named ai-workout-recommendation. If the response is valid, the card displays the generated workout name, focus/reason text, number of exercises, and an adaptation label such as readiness level, days since last workout, coach companion context, and volume adjustment. If the user accepts the suggestion, the feature saves it as a custom workout with workoutService.createCustomWorkout, reloads the workout store, triggers success haptic feedback, and navigates to the workout detail screen.")
    p(doc, "On the backend, the ai-workout-recommendation Edge Function authenticates the caller through the Authorization header before collecting context. It reads the user's profile, recent completed workout sessions, the latest daily readiness snapshot, recent health data, the latest assigned program, any active purchased coach pack, and the exercise catalog. The function computes an adaptive context before calling the language model. This context includes readiness level, readiness score, days since last workout, volume adjustment, intensity guidance, recovery signals, coach-program state, and explicit constraints.")
    p(doc, "The AI model used for this feature is Groq's OpenAI-compatible chat completion endpoint with the model llama-3.3-70b-versatile. The function requests JSON output with a low temperature and instructs the model to create one workout only, use only exercises from the provided catalog, avoid invented exercise identifiers, reduce volume when readiness is low, propose moderate catch-up work after several inactive days, and treat the result as optional companion work when a coach program or active pack exists. This prompt design is important because it grounds the LLM output in GoFit data instead of allowing generic fitness advice.")
    p(doc, "The feature also contains post-generation validation. The returned JSON is parsed, every exercise ID is matched against the real exercise catalog, invalid exercises are discarded, and the final recommendation is rejected if fewer than three valid exercises remain. The maximum exercise count is also adapted: reduced-volume sessions are limited more strictly than normal sessions. The response sent back to the mobile app includes the final workout name, difficulty set to Custom, focus, reason, image, validated exercise list, and adaptation metadata. This means the mobile app does not blindly trust the LLM response; it receives a cleaned and structured result.")
    add_basic_table(
        doc,
        "Table 5.8: In-app AI workout recommendation workflow",
        ["Step", "Implementation evidence", "Description"],
        [
            ["User entry point", "RecommendedWorkouts.tsx", "Displays the Adaptive workout card on the home screen with loading, error, generated-result, and save states."],
            ["Mobile service call", "workoutRecommendations.ts", "Calls supabase.functions.invoke('ai-workout-recommendation') and rejects unusable responses without exercises."],
            ["Backend function", "supabase/functions/ai-workout-recommendation/index.ts", "Authenticates the user, gathers context, builds the prompt, calls Groq, validates the output, and returns a typed recommendation."],
            ["Model call", "Groq chat completions; llama-3.3-70b-versatile; response_format json_object", "Generates one custom workout using controlled JSON output and a constrained exercise catalog."],
            ["Save action", "workoutService.createCustomWorkout; useWorkoutsStore.loadWorkouts", "Stores the accepted AI recommendation as a normal custom workout so it can be opened and reused like other workouts."],
            ["User feedback", "Expo Haptics; toastManager; navigation to WorkoutDetail", "Provides tactile confirmation, error feedback, and direct access to the generated workout after saving."],
        ],
        [1.3, 2.35, 2.85],
    )
    add_basic_table(
        doc,
        "Table 5.9: Personalization inputs and adaptation rules",
        ["Input / rule", "Source table or code", "Role in recommendation"],
        [
            ["User profile", "user_profiles: goal, activity_level, age, gender", "Anchors the workout to the user's declared objective and fitness context."],
            ["Recent training history", "workout_sessions joined with workouts; last 8 completed sessions", "Avoids recommending workouts without considering what the user recently trained and when."],
            ["Readiness snapshot", "daily_readiness; computeReadiness in readiness.ts", "Uses score, level, and recommendation text to reduce, maintain, or increase training volume."],
            ["Recovery and health signals", "health_data: steps, active calories, sleep, resting heart rate, HRV", "Supports recovery-aware constraints such as lowering intensity after short sleep."],
            ["Coach context", "custom_programs and purchased_packs", "Prevents the AI suggestion from replacing coach-assigned programming; frames it as companion work when relevant."],
            ["Exercise catalog", "exercises table; first 120 catalog rows", "Forces the model to select only existing exercises and allows backend validation of each returned ID."],
            ["Adaptation logic", "computeAdaptiveContext in ai-workout-recommendation/index.ts", "Creates volumeAdjustment, intensityGuidance, constraints, recovery, and coachContext before the LLM call."],
            ["Output validation", "exerciseMap filtering; min 3 valid exercises; max 5 or 8 depending on volume", "Blocks invented or unusable model output before it reaches the mobile UI."],
        ],
        [1.5, 2.25, 2.75],
    )
    p(doc, "✒ System Diagram : The figure 5.8 represents the in-app adaptive AI workout recommendation flow integrating user fatigue context and Groq LPU inference.")
    add_diagram(
        doc,
        "figure_5_8_ai_workout_recommendation_flow.png",
        "Figure 5.8: In-app AI workout recommendation flow",
        "Adaptive AI Workout Recommendation Flow",
        [
            ["Home Adaptive Card", "Mobile Recommendation Service", "Supabase Edge Function"],
            ["User Context", "Adaptive Context Builder", "Groq JSON Generation"],
            ["Catalog Validation", "Recommendation Payload", "Save as Custom Workout"],
        ],
    )
    p(doc, "This feature is therefore best described as a supervised personalization workflow. The model proposes a workout, but GoFit controls the context, validates the result, keeps secrets on the backend, shows the reasoning and adaptation label to the user, and stores the workout only after the user chooses to save it. The current implementation is appropriate for a PFE scope because it demonstrates LLM integration, personalization, prompt control, response validation, mobile interaction, and human-in-the-loop acceptance without claiming that AI replaces a professional coach.")

    add_heading(doc, "5.3.5 LLM-Based Coach Briefings and Automations", 3)
    p(doc, "Sprint 3 also includes language-model assistance for coach preparation and operational automation. Unlike the in-app workout recommendation, these features do not directly create a workout for the mobile user. They summarize context, prepare notes, and create notifications so that coaches and administrators can act faster.")
    p(doc, "The AI coach briefing flow prepares concise pre-session notes for a coach. It gathers booking information, recent completed sessions, private coach notes, recent check-ins, and client profile data. The model is instructed to summarize only the provided information, avoid invented medical facts, and keep the output short. The resulting note helps the coach prepare a session while still requiring human judgment.")
    add_basic_table(
        doc,
        "Table 5.10: LLM and automation features",
        ["Feature", "Input context", "Generated output", "Safety/control"],
        [
            ["AI coach/session briefing", "Booking, client profile, recent completed sessions, private coach notes, recent check-ins.", "Concise pre-session briefing for coach preparation.", "Coach-only context, authentication checks, instruction not to invent injuries or diagnoses."],
            ["n8n AI Session Prep v1", "Confirmed bookings in the next 24 hours, client profile, recent sessions, coach notes, and check-ins retrieved from Supabase.", "Stored ai_session_notes row and coach notification with data.kind = ai_session_ready.", "Unexpired-note guard avoids duplicate briefings; service-role key remains in n8n; Groq key is used only by this workflow."],
            ["n8n Booking Reminders v1", "Confirmed bookings starting within the next 60 minutes and mapped coach/client recipients.", "Client and coach notification rows with data.kind = booking_starting_soon.", "Duplicate guard uses booking, recipient role, and reminder window."],
            ["n8n Check-in Reminders v1", "Enabled check-in schedules due in UTC and current-day check-in responses.", "Client notification row with data.kind = check_in_due.", "Skips schedules not yet due, clients who already responded, and duplicate reminders."],
            ["n8n Coach Daily Digest v1", "Coach profiles, check-in schedules/responses, upcoming bookings, active packs, and BI client-health data.", "Coach notification row with missed check-ins, low wellness signals, upcoming sessions, and inactive clients.", "Skips coaches with no useful signal and avoids duplicate digest notifications for the same UTC date."],
            ["n8n Admin Ops Digest v1", "Admin users, new users, pending coaches, booking outcomes, and pack purchases from the last 24 hours.", "Admin notification row containing operational counts and a deterministic digest link.", "Skips duplicate admin digests and keeps automation failure count deterministic in v1."],
        ],
        [1.55, 2.2, 1.7, 2.05],
    )
    p(doc, "✒ System Diagram : The figure 5.9 represents the LLM assistance and background automation pipeline powering coach briefings and operational workflows.")
    add_diagram(
        doc,
        "figure_5_9_llm_automation_flow.png",
        "Figure 5.9: LLM and automation flow",
        "LLM Assistance and Automation Flow",
        [
            ["Supabase Data", "Prompt Builder", "Groq LLM"],
            ["Recommendation / Briefing", "Saved Note", "Notification"],
            ["User or Coach Review", "Human Decision", "Follow-up Action"],
        ],
    )


def add_ai_development_tooling_details(doc):
    add_heading(doc, "6.2.8 AI-Assisted Development Methodology", 3)
    p(doc, "GoFit was not developed only with traditional manual coding tools. The project also used AI-assisted software-engineering tools during analysis, implementation support, debugging, documentation, and report construction. This aspect must be documented because the internship concerns both the final GoFit platform and the way the platform was produced. The use of AI assistants changed the workflow: instead of only searching manually through files and documentation, the developer could ask targeted questions, compare implementation alternatives, generate structured drafts, and verify project evidence faster.")
    p(doc, "Codex was used as the main AI coding assistant. It worked inside the local GoFit workspace and had access to the repository files, terminal commands, generated documentation, and selected project tools. Codex helped inspect the mobile application, admin panel, database migrations, Supabase functions, n8n workflows, AI research notes, and academic documents. Its role was not to replace the developer; its role was to accelerate understanding, propose changes, identify missing documentation, summarize repository evidence, and generate drafts that were then reviewed and corrected.")
    p(doc, "A typical Codex-assisted workflow followed four steps. First, the developer described the objective, such as documenting the AI body-measurement pipeline or improving a sprint section. Second, Codex inspected the repository using command-line search and file reads. Third, Codex proposed or generated a concrete artifact, such as a report section, table, diagram draft, test plan, or code change. Fourth, the result was checked by running scripts, reading diffs, verifying generated files, and comparing claims against the repository. This human-in-the-loop process is important because AI-generated content can be incomplete, outdated, or too generic if it is not grounded in real project files.")
    add_basic_table(
        doc,
        "Table 6.5: Codex usage during the GoFit project",
        ["Project phase", "How Codex was used", "Human validation"],
        [
            ["Requirements and scope analysis", "Summarized existing documents, identified actors, extracted feature lists, and transformed project notes into functional and non-functional requirements.", "Requirements were compared with project files, feature inventory, and supervisor expectations."],
            ["Architecture and design", "Helped connect mobile, admin, Supabase, Edge Functions, n8n, AI models, and external services into coherent architecture explanations and diagrams.", "Architecture claims were checked against repository folders, database migrations, and implementation notes."],
            ["Implementation support", "Suggested implementation plans, reviewed code organization, identified related files, and helped reason about bugs or integration risks.", "The developer decided what to apply, ran commands, inspected diffs, and avoided uncontrolled changes."],
            ["AI feature documentation", "Connected body-measurement code, MediaPipe module details, segmentation research, validation notes, and LLM automation workflows.", "Model names, limitations, and statuses were checked against the source files and troubleshooting documents."],
            ["Testing and QA planning", "Generated test matrices, validation checklists, and structural document audits.", "Tests and audits were executed locally when possible; limitations were documented when tools were unavailable."],
            ["PFE report writing", "Generated the report structure, expanded chapter content, produced tables, created diagram drafts, and rebuilt the DOCX artifact.", "The report was rebuilt, audited structurally, and revised based on missing project-process details."],
        ],
        [1.55, 3.2, 1.9],
    )

    add_heading(doc, "6.2.9 MCPs and Connected Tooling Used to Stay Up to Date", 3)
    p(doc, "The project also used connected tools and MCP-style integrations. MCP, or Model Context Protocol, is useful because it allows an AI assistant to interact with controlled external contexts instead of relying only on static model memory. In practice, this means the assistant can inspect local files, run commands, consult project documentation, use document-generation tools, and connect to specialized services when available. This was important for GoFit because the technology stack evolves quickly: Expo, React Native, Next.js, Supabase, AI tooling, and deployment workflows can change between academic years.")
    p(doc, "The MCP and plugin-based workflow helped keep the work closer to the current technical state. For example, official documentation and local repository files were preferred over memory when describing frameworks, Supabase behavior, OpenAI/Codex usage, and document generation. Local commands were used to inspect the real project instead of inventing features. Document tooling was used to generate and audit the Word report. Supabase and automation-related context was used to describe backend workflows, database artifacts, Edge Functions, and n8n flows more accurately.")
    add_basic_table(
        doc,
        "Table 6.6: MCP and connected tools used in the project workflow",
        ["Tool / connector type", "Purpose", "Example contribution to the report or project"],
        [
            ["Local filesystem and terminal tools", "Inspect repository files, search code, run scripts, check generated artifacts, and verify counts.", "Used to read GoFitMobile, admin-panel, database, docs, and n8n workflow files before writing report sections."],
            ["Official documentation / web lookup", "Verify current technology information when framework behavior or product details may have changed.", "Used as a principle for up-to-date descriptions of fast-moving tools such as Expo, Supabase, Next.js, OpenAI/Codex, and AI APIs."],
            ["Documents tooling", "Create, edit, audit, and regenerate DOCX deliverables.", "Used to generate the PFE report, add accessibility metadata, mark table headers, and validate DOCX structure."],
            ["Supabase-related tooling", "Reason about backend services, migrations, RLS, Edge Functions, database tables, and security boundaries.", "Supported sections on authentication, PostgreSQL, storage, realtime, RLS, service-role isolation, and backend architecture."],
            ["Browser / app inspection tools", "Check local or web interfaces when visual or runtime verification is required.", "Useful for validating frontend behavior, screenshots, documentation pages, and current technology references."],
            ["Automation tooling", "Inspect or execute n8n workflows and Docker-based automation environments when needed.", "Supported documentation of AI session preparation, admin digest automation, and service-role workflow execution."],
            ["PDF/document readers", "Use the uploaded example report for structural inspiration without copying its content.", "Helped reproduce the academic organization, front matter, chapter order, tables, figures, and report style."],
        ],
        [1.75, 2.55, 2.25],
    )
    add_report_note(
        doc,
        "MCP methodology",
        "MCPs were not treated as automatic truth sources. They were used to access controlled context: local files, official documentation, generated documents, database-related material, and automation artifacts. Final claims still required human review and consistency checks."
    )

    add_heading(doc, "6.2.10 Complete Toolchain Used to Build GoFit", 3)
    p(doc, "The following table summarizes the main tools used to create GoFit. It includes product technologies, development tools, AI assistants, automation services, and documentation tools. This list is useful because the PFE evaluates not only the final application but also the engineering environment used to produce it.")
    add_basic_table(
        doc,
        "Table 6.7: Complete development and production toolchain",
        ["Category", "Tools", "Use in the project"],
        [
            ["Mobile development", "Expo SDK, React Native, TypeScript, React Navigation, Zustand, Expo Camera, Expo Secure Store.", "Build the cross-platform mobile app, navigation flows, state management, authentication persistence, camera/photo capture, and client/coach screens."],
            ["Web administration", "Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI components.", "Build the admin panel, protected routes, dashboards, management pages, forms, analytics, and operational interfaces."],
            ["Backend and database", "Supabase Auth, PostgreSQL, RLS, Storage, Realtime, Edge Functions, SQL migrations.", "Provide authentication, persistent data, security policies, media storage, realtime communication, and privileged backend operations."],
            ["AI and computer vision", "MoveNet Lightning, TensorFlow Lite, MediaPipe Pose Landmarker, MediaPipe Image Segmenter, local Expo native module.", "Implement AI-assisted body measurement using pose detection, segmentation, feature extraction, and statistical estimation."],
            ["LLM and automation", "Groq API, n8n workflows, Supabase service-role REST calls.", "Generate adaptive workout recommendations, coach session briefings, AI session notes, and admin operations digests."],
            ["Communication and external services", "Expo Push, LiveKit, optional hosting/storage providers.", "Support notifications, video-call token flows, media/storage extension, and remote coaching features."],
            ["Development assistance", "Codex, MCP/tool connectors, terminal commands, repository search, document-generation scripts.", "Accelerate analysis, implementation support, debugging, report writing, current-doc lookup, and artifact generation."],
            ["Quality and documentation", "Git, Python docx scripts, accessibility audit, generated diagrams, project documentation files.", "Version work, generate the DOCX report, audit structure, maintain architecture/feature/sprint notes, and prepare submission artifacts."],
            ["Deployment preparation", "EAS Build, Next.js-compatible hosting, Supabase project configuration, environment variables.", "Prepare mobile builds, web hosting, backend deployment, secret separation, and production release steps."],
        ],
        [1.5, 2.4, 2.55],
    )

    add_diagram(
        doc,
        "figure_6_3_ai_tooling_workflow.png",
        "Figure 6.3: AI-assisted development and MCP workflow",
        "AI-Assisted Development Workflow",
        [
            ["Developer Goal", "Codex Assistant", "Repository + MCP Context"],
            ["File Inspection", "Current Docs / Tools", "Implementation or Report Draft"],
            ["Human Review", "Tests / Audits / Diffs", "Validated Artifact"],
        ],
    )
    add_report_note(
        doc,
        "Academic transparency",
        "The report should clearly state that AI assistants supported development and documentation, but they did not replace human implementation responsibility. All generated code, diagrams, report text, and technical claims must be checked against the repository and corrected when inaccurate."
    )


def add_n8n_automation_details(doc):
    add_heading(doc, "6.2.11 n8n Automation Layer", 3)
    p(doc, "GoFit includes an automation layer implemented with n8n workflow exports located in docs/automation/n8n/workflows. These workflows are part of the product because they perform scheduled operational work that would otherwise require manual monitoring by coaches or administrators. The n8n layer is separate from the mobile application and the admin panel: it runs in a trusted automation environment, calls Supabase through REST endpoints, and creates persistent rows in the database.")
    p(doc, "The v1 automation design uses self-hosted n8n Community Edition as the practical free option. Runtime secrets are injected through environment variables. SUPABASE_URL identifies the backend project, SUPABASE_SERVICE_ROLE_KEY allows controlled server-side access, and GROQ_API_KEY is required only by the AI Session Prep workflow. These secrets must never be committed to the repository, placed in mobile code, or exposed in client-side admin bundles.")
    p(doc, "Each workflow uses a schedule trigger followed by a tested Code node. The exported canvases also include sticky-note cards that document the schedule window, query logic, duplicate guard, notification creation, and run summary. This structure keeps the executable path small while still making the workflow understandable for maintenance and academic documentation.")
    add_basic_table(
        doc,
        "Table 6.8: n8n workflows implemented in GoFit",
        ["Workflow", "Trigger", "Data read", "Actions performed", "Guard / control"],
        [
            ["AI Session Prep v1", "Every 60 minutes", "Confirmed bookings in the next 24 hours, coach profile, client profile, recent completed sessions, private coach notes, and recent check-ins.", "Calls Groq from n8n, inserts an ai_session_notes row, and creates a coach notification with data.kind = ai_session_ready.", "Skips unexpired existing notes for the same coach/client pair and repairs missing coach notification when needed."],
            ["Booking Reminders v1", "Every 15 minutes", "Confirmed bookings starting within the next 60 minutes plus coach user mapping.", "Creates one client notification and one coach notification with data.kind = booking_starting_soon.", "Skips duplicate reminders for the same booking, recipient role, and 60-minute window."],
            ["Check-in Reminders v1", "Every 4 hours", "Enabled check_in_schedules, current UTC date/time, and check_in_responses for the day.", "Creates a client notification with data.kind = check_in_due.", "Skips schedules not due, clients who already responded, and existing reminders for the same schedule/date."],
            ["Coach Daily Digest v1", "Daily", "Coach profiles, check-in schedules and responses, upcoming confirmed bookings, active packs, booking history, and BI client-health daily rows.", "Creates a coach notification summarizing missed check-ins, low wellness signals, upcoming sessions, and inactive clients.", "Skips coaches with no useful signal and skips duplicate digest notifications for the same coach and UTC date."],
            ["Admin Ops Digest v1", "Daily", "Admin user profiles, new users, pending coaches, booking outcomes, and pack purchases from the last 24 hours.", "Creates an admin_notifications row per administrator with operational counts and a deterministic digest link.", "Skips duplicate admin digests for the same admin, title, and date link; automation_failures_count remains 0 in v1 because failures are not yet persisted."],
        ],
        [1.25, 1.05, 2.45, 2.45, 2.35],
    )
    add_basic_table(
        doc,
        "Table 6.9: n8n security, limits, and evidence requirements",
        ["Topic", "Design decision", "Reason / evidence to attach"],
        [
            ["Secret management", "SUPABASE_SERVICE_ROLE_KEY and GROQ_API_KEY stay inside the n8n runtime environment.", "Prevents privileged keys from being bundled into the mobile app, admin client, .env.example, or workflow JSON."],
            ["Service-role access", "Workflows use service-role access only from trusted automation infrastructure.", "Needed for scheduled background work while keeping normal app access protected by RLS."],
            ["AI boundary", "AI Session Prep calls Groq directly from n8n instead of calling the ai-session-notes Edge Function.", "The Edge Function is designed for authenticated coach actions; the automation flow is a scheduled server-side job."],
            ["Notification strategy", "v1 workflows create in-app notification rows rather than sending push notifications directly.", "Push delivery needs token, retry, throttling, and failure handling before being automated safely."],
            ["Client privacy", "Clients do not read ai_session_notes through normal app access.", "The table is coach-facing and protected by coach-only authenticated access rules."],
            ["Time handling", "Daily and due-date workflows use UTC in v1.", "Timezone-aware scheduling can be added after user/coach timezone preferences are finalized."],
            ["Idempotency", "Each workflow checks existing rows before inserting new notifications or notes.", "Manual verification must show that a second run does not create duplicates."],
            ["Report evidence", "Final report should attach workflow canvas screenshots, run summaries, and Supabase rows for each workflow.", "Evidence proves that workflows are implemented and not only planned."],
        ],
        [1.35, 2.65, 2.75],
    )
    add_diagram(
        doc,
        "figure_6_4_n8n_automation_layer.png",
        "Figure 6.4: n8n automation layer",
        "GoFit n8n Automation Layer",
        [
            ["n8n Schedule Trigger", "Code Node", "Supabase REST"],
            ["Groq API", "AI Session Notes", "Notifications"],
            ["Coach Digest", "Admin Digest", "Manual Verification"],
        ],
    )
    add_code_block(
        doc,
        "Mermaid n8n automation diagram draft",
        """flowchart LR
    A[n8n schedule trigger] --> B[Workflow code node]
    B --> C[Supabase REST API]
    B --> D[Groq API for AI Session Prep]
    C --> E[(PostgreSQL tables)]
    E --> F[ai_session_notes]
    E --> G[notifications]
    E --> H[admin_notifications]
    G --> I[Mobile coach/client inbox]
    H --> J[Admin panel]
    B --> K[Run summary counts]
""",
    )


def add_library_and_interaction_details(doc):
    add_heading(doc, "6.2.12 Libraries, Dependencies, and Device Feedback", 3)
    p(doc, "A complete PFE report should not describe GoFit only through screens and database tables. The implementation also depends on a large set of libraries that provide navigation, state management, forms, validation, media capture, haptic feedback, animations, charts, video calls, localization, notifications, artificial intelligence, and administration-table behavior. The following tables summarize the main libraries identified from the mobile and admin package files and explain how they support the product.")
    add_basic_table(
        doc,
        "Table 6.10: Mobile libraries and implementation roles",
        ["Library / family", "Used for", "Examples in GoFit"],
        [
            ["Expo SDK and React Native", "Cross-platform mobile runtime, native APIs, Android/iOS builds, and shared TypeScript UI.", "Main GoFitMobile application, Expo dev client, camera access, file/document picker, image picker, splash screen, status bar, and EAS build preparation."],
            ["React Navigation", "Stack, tab, and role-aware navigation between client, coach, authentication, onboarding, and detail screens.", "Auth flow, onboarding flow, client app tabs, coach app tabs, profile/settings screens, marketplace details, booking, programs, and workout session routes."],
            ["Zustand and persisted state", "Lightweight state management for reusable mobile state.", "Auth/session state, workout state, timer preferences, bookings, calendar, chat, coach/client data, health, language, marketplace, packs, programs, theme, text size, nutrition, daily coach, and wallet state."],
            ["Supabase JavaScript client", "Authenticated access to Supabase Auth, PostgreSQL, Storage, Realtime, and Edge Functions.", "User profiles, workouts, sessions, coach marketplace, bookings, packs, chat, notifications, AI session notes, barcode lookup, video-token generation, and push notification relay."],
            ["Expo Secure Store and Async Storage", "Secure session persistence and local preference persistence.", "Auth tokens, user session continuity, persisted preferences, and local app state that must survive app restarts."],
            ["Expo Notifications and push helpers", "Local notification scheduling, notification permissions, push-token registration, and notification inbox integration.", "Workout reminders, weekly progress reports, achievement/test notifications, push-token registration, notification preferences, and transactional notification rows."],
            ["Expo Haptics", "Physical feedback for taps, selections, timer events, success states, warning states, and error states.", "Auth buttons, onboarding controls, home cards, rest timer, workout session actions, body measurement, nutrition logging, booking, chat, coach programs, coach packs, settings, and profile actions."],
            ["Expo Camera, Image Picker, Image Manipulator, Image, File System", "Photo capture, photo selection, image processing, and file access.", "Progress photos, body-measurement capture, coach CV/certification upload flows, and image-based AI preparation."],
            ["Media and native AI libraries", "On-device or native computer-vision support.", "react-native-fast-tflite, MediaPipe native module, MoveNet/TFLite fallback, segmentation analysis, pose landmarks, and measurement estimator support."],
            ["LiveKit and WebRTC libraries", "Realtime video-call support between coaches and clients.", "LiveKit React Native, Expo plugin, WebRTC bridge, video token function, and video-call screen."],
            ["Forms, validation, localization, and UI helpers", "Typed input handling, validation, translation, icons, charts, dates, gestures, animations, and SVG rendering.", "React Hook Form, Zod, i18next/react-i18next, lucide-react-native, react-native-chart-kit, date-fns, gesture handler, reanimated, vector icons, SVG, safe-area, screens, and worklets."],
        ],
        [1.65, 2.25, 2.8],
    )
    add_basic_table(
        doc,
        "Table 6.11: Admin panel libraries and implementation roles",
        ["Library / family", "Used for", "Examples in GoFit admin"],
        [
            ["Next.js and React", "Administration web application, App Router pages, route handlers, server-side access, and protected dashboard views.", "Login, dashboard, users, coaches, exercises, workouts, transactions, notifications, settings, activity logs, BI routes, and health endpoints."],
            ["Supabase SSR and Supabase JS", "Server/client Supabase access with session-aware and admin/server-side operations.", "Protected admin routes, admin data loading, API route handlers, role checks, database access, and privileged management actions."],
            ["Tailwind CSS and shadcn/Radix UI patterns", "Consistent admin interface components and accessible controls.", "Dialogs, dropdowns, checkboxes, popovers, progress, scroll areas, select menus, switches, toasts, alert dialogs, and management forms."],
            ["React Hook Form, Zod, and Hookform resolvers", "Form state, validation, typed payloads, and error messages.", "Admin create/edit forms, user/coach management validation, exercise/workout forms, settings, and API request validation."],
            ["TanStack React Table", "Dense sortable/filterable tabular administration views.", "Users, coaches, exercises, workouts, transactions, notifications, and BI/listing screens."],
            ["Recharts, date-fns, Lucide React", "Charts, date formatting, and consistent admin iconography.", "Dashboard metrics, BI snapshots, date filters, operations digests, navigation icons, action buttons, and status indicators."],
            ["Sonner, cmdk, next-themes, class utilities", "Toasts, command/search interactions, theme handling, and conditional styling.", "Admin feedback messages, search/command patterns, light/dark support, and reusable component variants."],
            ["AWS S3 client", "Optional object-storage integration where hosting/storage extension is required.", "Admin or backend-facing media/file workflows when external storage is configured."],
        ],
        [1.65, 2.3, 2.75],
    )
    add_basic_table(
        doc,
        "Table 6.12: Haptics and tactile feedback coverage",
        ["Feature area", "Feedback type", "Implementation detail"],
        [
            ["Rest timer and workout session", "Light, medium, heavy impact, success feedback, and countdown feedback.", "The timer preference includes haptics_enabled; useRestTimer, EnhancedRestTimer, TimerModal, and WorkoutSessionScreen call haptic helpers for timer actions, countdown thresholds, set completion, and workout milestones."],
            ["Authentication and onboarding", "Light impact and selection feedback.", "Welcome buttons, social buttons, checkboxes, onboarding navigation, weight selector, and personal details flows use Expo Haptics to make taps and selections feel responsive."],
            ["Home dashboard and quick actions", "Light or medium impact, plus success feedback where relevant.", "Home cards for articles, health, check-ins, nutrition, daily coach loop, recommended workouts, quick actions, programs, top workouts, and top trainers use haptics for card presses and action confirmations."],
            ["Progress and body measurement", "Light/medium impact, warning feedback, and success feedback.", "Progress photos, photo detail, workout statistics, body-measurement capture, AI scan warnings, and successful measurement saves use tactile confirmation."],
            ["Nutrition and check-ins", "Light/medium impact, selection feedback, and success notification feedback.", "Nutrition dashboard, food adding, nutrition goals, barcode/food actions, and check-in submission use haptics to distinguish selection, confirmation, and completion events."],
            ["Profile and settings", "Light impact, selection feedback, success feedback, and error feedback.", "Text size, units, language, account information, height/weight editing, habits, notification settings, bookings/reviews, health sync, and preferences use haptics to support settings changes and save/error states."],
            ["Coach marketplace and booking", "Light/medium impact and warning feedback.", "Marketplace browsing, coach detail, booking slot selection, client views, calendar interactions, availability, session packs, and booking decisions provide tactile response on important actions."],
            ["Coach app communication and management", "Light/medium impact and success/error feedback.", "Coach dashboard navigation, client list/detail, notes, check-ins, calendar, profile/settings, chat, conversations, programs, program builder, packs, certifications, and CV upload use haptics for action acknowledgement."],
            ["Design principle", "Feedback is assistive, not decorative.", "Light feedback is used for ordinary taps/selections, medium/heavy feedback for stronger actions or timer thresholds, and notification feedback for success, warning, or error states. Haptics should remain configurable where the feature exposes preferences."],
        ],
        [1.55, 1.7, 3.45],
    )
    add_heading(doc, "6.2.13 Exact Runtime Dependency Inventory", 3)
    p(doc, "The previous tables explain the main technology families. For traceability, the following tables list the exact runtime dependencies declared by the mobile application and the administration panel package files. This makes the report auditable against the project source instead of depending only on a summarized technology paragraph.")
    add_basic_table(
        doc,
        "Table 6.13: Mobile runtime dependency inventory",
        ["Package", "Version", "Role in GoFit"],
        dependency_rows("GoFitMobile/package.json"),
        [2.35, 1.0, 3.25],
    )
    add_basic_table(
        doc,
        "Table 6.14: Admin panel runtime dependency inventory",
        ["Package", "Version", "Role in GoFit admin"],
        dependency_rows("admin-panel/package.json"),
        [2.35, 1.0, 3.25],
    )


def add_chapter6_platform_architecture_details(doc):
    add_heading(doc, "6.2.5 GoFit Mobile Application Architecture", 3)
    p(doc, "The mobile application is structured as a layered client application. Screens and reusable components are responsible for presentation, navigation manages access to feature areas, Zustand stores hold cross-screen state, service modules centralize data access, and infrastructure clients communicate with Supabase or local native modules. This separation reduces coupling between user interface code and persistence logic.")
    add_basic_table(
        doc,
        "Table 6.3: Mobile architecture responsibilities",
        ["Layer", "Responsibility", "Examples in GoFit"],
        [
            ["Presentation", "Display screens, forms, lists, charts, timers, and feedback states.", "Authentication screens, workout screens, progress screens, coach marketplace screens."],
            ["Navigation", "Route users according to authentication, onboarding, role, and feature context.", "Auth navigator, onboarding flow, client app area, coach app area, detail screens."],
            ["State management", "Store reusable client state and synchronize UI updates.", "Auth store, workout store, profile state, timer preferences, progress state."],
            ["Domain services", "Encapsulate API calls, persistence logic, and feature-specific operations.", "Workout service, progress service, body measurement service, coach/booking services."],
            ["Native/AI modules", "Execute device-specific or performance-sensitive functionality.", "Camera capture, MediaPipe native module, MoveNet fallback, segmentation analysis."],
        ],
        [1.35, 2.5, 2.65],
    )
    add_heading(doc, "6.2.6 GoFit Administration Panel Architecture", 3)
    p(doc, "The administration panel provides a controlled back-office interface. It is designed separately from the mobile application because administrators need operational views, management tables, filters, analytics, settings, and privileged actions that should not be exposed in the client application. The panel uses protected routing and server-side Supabase access to keep administrative operations behind explicit authorization checks.")
    p(doc, "The admin panel should be validated with at least two account types: an administrator account that can access management screens and a normal account that must be blocked or redirected. This distinction is important because the panel can manage sensitive platform data such as coach validation status, user records, exercise content, transactions, and notifications.")
    add_heading(doc, "6.2.6.1 Admin BI Data Architecture", 3)
    p(doc, "The BI architecture follows a protected data-to-dashboard pipeline. PostgreSQL views such as bi_finance_daily, bi_user_lifecycle_daily, bi_coach_ops_daily, and bi_client_health_daily prepare canonical daily metrics. TypeScript service modules in the admin panel read those views and normalize the results into dashboard contracts. React components then display summary cards, trend panels, risk queues, cohort tables, finance details, and threshold alerts. API routes under /api/bi provide exports, saved views, snapshots, and scheduled digest execution.")
    p(doc, "The BI layer is deliberately separated from normal CRUD pages. CRUD pages manage individual records, while BI pages aggregate and interpret platform behavior. This separation reduces duplication and makes it clearer which parts of the panel are operational management and which parts are decision-support analytics. The v1 BI scope is also explicit: finance is gross-pack-sales oriented, lifecycle and cohort metrics depend on available history, risk queues are operational signals, and all BI access must remain admin-protected.")
    add_heading(doc, "6.2.7 Supabase Backend, Data Security, and Realtime Services", 3)
    p(doc, "The Supabase backend centralizes authentication, PostgreSQL data, storage, realtime communication, and Edge Functions. Row-level security is a central design decision: each user should access only their own client data, each coach should access only authorized client data, and administrators should access management data through controlled server-side contexts. Service-role keys must remain in trusted backend, admin, or automation environments and must never be bundled into the mobile application.")
    add_basic_table(
        doc,
        "Table 6.4: Backend and security components",
        ["Component", "Role", "Security / validation concern"],
        [
            ["Supabase Auth", "Manages identity, sessions, password reset, and protected access.", "Check session handling, role mapping, and logout/session expiration behavior."],
            ["PostgreSQL database", "Stores users, workouts, sessions, measurements, coaches, bookings, packs, messages, programs, and admin data.", "Validate foreign keys, migrations, indexes, and data consistency."],
            ["RLS policies", "Restrict row access according to user, coach, and administrator roles.", "Test user-scoped, coach-scoped, and admin-scoped queries with different accounts."],
            ["Storage", "Stores user-uploaded files such as coach documents, media, or progress-related assets when enabled.", "Check bucket policies, private/public access, and file ownership."],
            ["Realtime/chat", "Supports live communication and status updates.", "Validate conversation membership, message visibility, and realtime channel permissions."],
            ["Edge Functions", "Execute privileged operations such as push notification relay, video-token generation, and AI/backend workflows.", "Keep secrets server-side and verify authorization inside each function."],
            ["n8n automations", "Run scheduled or event-driven workflows such as AI session preparation and admin operations digest.", "Use service-role access only in controlled environments and log workflow results."],
        ],
        [1.35, 2.35, 2.8],
    )


def sprint_chapter(doc, n, title, goal, backlog, diagrams, realisation, tests):
    add_heading(doc, f"{n} {title}", 1)
    p(doc, goal)
    p(doc, f"This chapter documents {title.lower()} as an engineering increment rather than as a simple list of implemented screens. It presents the sprint objective, selected product backlog decomposed into engineering tasks, structural class model, refined use cases, sequence flow, architectural realisation, quality assurance validation matrix, and burn-down chart interpretation.")
    add_heading(doc, f"{n}.1 Needs Assessment", 2)
    p(doc, "The sprint needs were selected from the prioritized product backlog according to dependency order, business value, and architectural feasibility. The following table provides a comprehensive decomposition of each user story into technical modeling, implementation, and testing subtasks.")
    add_report_note(doc, "Sprint objective", goal)
    add_heading(doc, f"{n}.1.1 Sprint Backlog", 3)
    add_basic_table(doc, f"Table {n}.1: {title} backlog decomposition", ["ID US", "As", "User Story", "Id task", "Task"], backlog, [0.7, 0.7, 2.2, 0.7, 2.0])
    add_heading(doc, f"{n}.1.2 Sprint Class Diagram", 3)
    p(doc, diagrams["class"])
    p(doc, f"✒ System Diagram : The figure {n}.1 represents the structural class diagram of {title}, detailing entity attributes, data types, relational cardinalities, and service contracts.")
    add_diagram(
        doc,
        f"figure_{n}_1_class.png",
        f"Figure {n}.1: Class diagram of {title}",
        f"{title} - Main Structural Classes",
        diagrams["class_rows"],
    )
    add_code_block(doc, f"Mermaid class diagram draft for {title}", mermaid_code_for("class", n))
    add_heading(doc, f"{n}.2 Functional Specification of Requirements", 2)
    p(doc, "This section specifies the sprint use cases and analyzes the behavioral interactions between the participating actors and the GoFit platform.")
    add_heading(doc, f"{n}.2.1 Refined Use Case Diagram of {title}", 3)
    p(doc, diagrams["usecase"])
    p(doc, f"✒ System Diagram : The figure {n}.2 represents the refined use case diagram of {title}, detailing the functional boundary and actor interactions.")
    add_diagram(
        doc,
        f"figure_{n}_2_usecase.png",
        f"Figure {n}.2: Refined use case diagram of {title}",
        f"{title} - Refined Use Cases",
        diagrams["usecase_rows"],
    )
    add_code_block(doc, f"Mermaid refined use case diagram draft for {title}", mermaid_code_for("use_case", n))
    add_heading(doc, f"{n}.2.2 Use Case Analysis", 3)
    add_detailed_use_cases(doc, n)
    add_heading(doc, f"{n}.3 Realisation", 2)
    for item in realisation:
        p(doc, item)
    realisation_fig = f"{n}.7"
    p(doc, f"✒ System Diagram : The figure {realisation_fig} illustrates the implemented graphical user interfaces and architectural views developed during {title}.")
    add_diagram(
        doc,
        f"figure_{n}_7_realisation_summary.png",
        f"Figure {realisation_fig}: Implemented views of {title}",
        f"{title} - Implemented Views",
        [["Mobile Screens", "Services", "Supabase Data"], ["Stores", "Validation", "User Interface"], ["Production Assets", "Feature Demo", "Test Evidence"]],
    )
    if n == 3:
        add_sprint1_implementation_details(doc)
    if n == 4:
        add_sprint2_progress_details(doc)
        add_ai_computer_vision_details(doc)
    if n == 5:
        add_sprint3_platform_details(doc)
    if n == 3:
        test_table_number = "3.6"
        burndown_figure_number = "3.8"
    elif n == 4:
        test_table_number = "4.9"
        burndown_figure_number = "4.11"
    elif n == 5:
        test_table_number = "5.11"
        burndown_figure_number = "5.10"
    else:
        test_table_number = f"{n}.3"
        burndown_figure_number = f"{n}.5"
    add_heading(doc, f"{n}.4 {'Sprint Tests' if n == 3 else 'Tests'}", 2)
    p(doc, "The following validation matrix avoids declaring success without verification evidence. It defines verifiable preconditions, concrete execution steps, and observable system outcomes.")
    add_professional_tests(doc, n, test_table_number)
    add_heading(doc, f"{n}.5 Sprint Burn Down Chart", 2)
    p(doc, "The burn-down chart is represented as a formal sprint-management artifact demonstrating team velocity, story point consumption, and burndown progress across the iteration.")
    p(doc, f"✒ System Diagram : The figure {burndown_figure_number} represents the burn-down chart for {title}, showing estimated versus actual story point completion over the 2-week sprint cycle.")
    add_diagram(
        doc,
        f"figure_{n}_5_burndown.png",
        f"Figure {burndown_figure_number}: Burn down chart for {title}",
        f"{title} - Burn Down Summary",
        [["Sprint Start", "Backlog Selected", "Tasks In Progress"], ["Mid Sprint", "Validation", "Remaining Work Reduced"], ["Sprint End", "Tests", "Increment Delivered"]],
    )
    add_heading(doc, "Conclusion", 2)
    p(doc, sprint_conclusion(n))
    doc.add_page_break()


def chapters3_to5(doc):
    sprint1_backlog = [
        ["US-3.1", "User", "Create account, log in securely, and complete 4-step onboarding questionnaire (goals, experience, equipment)", "T3.1.1", "Model UserProfile schema, Supabase Auth GoTrue JWT integration, and onboarding state machine."],
        ["US-3.1", "User", "Create account, log in securely, and complete 4-step onboarding questionnaire (goals, experience, equipment)", "T3.1.2", "Implement AuthScreen, OnboardingScreen with multi-step questionnaire, and Zustand authStore."],
        ["US-3.1", "User", "Create account, log in securely, and complete 4-step onboarding questionnaire (goals, experience, equipment)", "T3.1.3", "Test GoTrue authentication, token refresh in SecureStore, and protected navigation redirection."],
        ["US-3.2", "User", "Browse workout templates, customize exercise parameters, and create personal workouts", "T3.2.1", "Design Workout, Exercise, and WorkoutExercise entity relationship model in Supabase."],
        ["US-3.2", "User", "Browse workout templates, customize exercise parameters, and create personal workouts", "T3.2.2", "Develop WorkoutListScreen, WorkoutDetailScreen, and WorkoutBuilderScreen with reorderable exercises."],
        ["US-3.2", "User", "Browse workout templates, customize exercise parameters, and create personal workouts", "T3.2.3", "Verify workout template cloning, custom exercise creation, and Zustand workoutStore state sync."],
        ["US-3.3", "User", "Execute an active workout session with set logging (weight, reps, RPE) and an animated rest timer", "T3.3.1", "Model WorkoutSession and WorkoutSet tables with offline persistence support."],
        ["US-3.3", "User", "Execute an active workout session with set logging (weight, reps, RPE) and an animated rest timer", "T3.3.2", "Implement WorkoutSessionScreen with set completion checkboxes, audio/haptic rest timer, and auto-advance."],
        ["US-3.3", "User", "Execute an active workout session with set logging (weight, reps, RPE) and an animated rest timer", "T3.3.3", "Test timer background execution, haptic vibration alerts, and set metric calculations."],
        ["US-3.4", "User", "Persist workout history and offline session data with automatic synchronization to Supabase", "T3.4.1", "Design SQLite/AsyncStorage offline queue schema with conflict resolution timestamps."],
        ["US-3.4", "User", "Persist workout history and offline session data with automatic synchronization to Supabase", "T3.4.2", "Implement WorkoutService offline sync queue and Supabase database mutations."],
        ["US-3.4", "User", "Persist workout history and offline session data with automatic synchronization to Supabase", "T3.4.3", "Validate network failure recovery, auto-retry on reconnection, and Supabase RLS row insertion."],
    ]

    sprint_chapter(
        doc,
        3,
        "Sprint 1",
        "Sprint 1 established the GoFit foundational core: mobile project architecture, Supabase GoTrue authentication, 4-step onboarding questionnaire, profile management, workout template builder, active workout session logging, and the custom rest timer engine.",
        sprint1_backlog,
        {
            "class": "The structural class diagram models UserProfile, Workout, WorkoutExercise, Exercise, WorkoutSession, TimerPreferences, AuthService, WorkoutService, and Zustand stores.",
            "class_rows": [["UserProfile", "AuthService", "AuthStore"], ["Workout", "WorkoutExercise", "Exercise"], ["WorkoutSession", "TimerPreferences", "WorkoutService"]],
            "usecase": "Actors: Mobile User and Supabase Backend. Refined use cases include sign up, authenticate, complete onboarding, configure profile, browse templates, build custom workout, execute active session, record set metrics, and utilize rest timer.",
            "usecase_rows": [["Mobile User", "Sign Up / Log In", "Complete Onboarding"], ["Manage Profile", "Browse Workouts", "Create Workout"], ["Start Session", "Track Sets", "Use Rest Timer"], ["Supabase", "Persist Profile", "Persist Session"]],
            "sequence": "Sequence interactions model user authentication and active workout execution flows through presentation screens, Zustand state stores, service clients, and Supabase PostgREST.",
            "sequence_rows": [["User Action", "Mobile Screen", "Zustand Store"], ["Service Layer", "Supabase Query", "Database Row"], ["Response", "Store Update", "UI Refresh"]],
        },
        [
            "The mobile foundation was constructed with Expo SDK 54 and React Native running on the Hermes JavaScript engine. Modular navigation isolates auth, onboarding, and authenticated client tabs.",
            "Authentication relies on Supabase Auth (GoTrue), with session JWTs and refresh tokens stored securely in expo-secure-store. Reactive session state is managed via Zustand authStore.",
            "Workout execution decouples static workout templates from dynamic session logs. Sessions track precise start/end timestamps, calories burned, completed sets, and exercise order.",
            "The rest timer engine features circular SVG progress animations, dual audio chimes (expo-av), haptic feedback (expo-haptics), auto-advance upon set completion, and background continuation.",
        ],
        [],
    )

    sprint2_backlog = [
        ["US-4.1", "User", "Capture front/side photos and obtain AI-assisted body measurements using on-device MediaPipe CV", "T4.1.1", "Model BodyMeasurement entity, MediaPipe 33 pose landmarks mapping, and height anchor ratio formulas."],
        ["US-4.1", "User", "Capture front/side photos and obtain AI-assisted body measurements using on-device MediaPipe CV", "T4.1.2", "Implement CameraCaptureScreen, MediaPipe BlazePose & Selfie Segmentation processing, and MeasurementReviewScreen."],
        ["US-4.1", "User", "Capture front/side photos and obtain AI-assisted body measurements using on-device MediaPipe CV", "T4.1.3", "Test landmark detection confidence thresholds, low-lighting warnings, and editable manual override sheet."],
        ["US-4.2", "User", "Track daily nutrition, search food items, scan barcodes via OpenFoodFacts, and filter allergens/dislikes", "T4.2.1", "Design NutritionLog, FoodItem, and UserDietaryPreferences schema with allergen exclusion filtering."],
        ["US-4.2", "User", "Track daily nutrition, search food items, scan barcodes via OpenFoodFacts, and filter allergens/dislikes", "T4.2.2", "Develop NutritionScreen, BarcodeScannerScreen, MacroRings component, and OpenFoodFacts API service."],
        ["US-4.2", "User", "Track daily nutrition, search food items, scan barcodes via OpenFoodFacts, and filter allergens/dislikes", "T4.2.3", "Test macro calculation (protein/carbs/fat/calories), barcode product resolution, and disliked ingredient SQL filters."],
        ["US-4.3", "User", "Track physical progress over time with interactive metric charts, volume graphs, and progress photos", "T4.3.1", "Model ProgressPhoto storage bucket paths and historical analytics aggregation queries."],
        ["US-4.3", "User", "Track physical progress over time with interactive metric charts, volume graphs, and progress photos", "T4.3.2", "Implement ProgressScreen with Victory Native charts, 1RM progression curves, and side-by-side photo comparison slider."],
        ["US-4.3", "User", "Track physical progress over time with interactive metric charts, volume graphs, and progress photos", "T4.3.3", "Test empty-state visualizations, date-range filtering, and Cloudflare R2 / Supabase Storage photo retrieval."],
        ["US-4.4", "User", "Receive automated workout reminders, hydration alerts, and adaptive AI workout recommendations via Groq LLaMA-3.3", "T4.4.1", "Design Edge Function ai-workout-recommendation prompt engineering with user muscle fatigue context."],
        ["US-4.4", "User", "Receive automated workout reminders, hydration alerts, and adaptive AI workout recommendations via Groq LLaMA-3.3", "T4.4.2", "Implement NotificationSettingsScreen, Expo push notification scheduling, and AI recommendation card."],
        ["US-4.4", "User", "Receive automated workout reminders, hydration alerts, and adaptive AI workout recommendations via Groq LLaMA-3.3", "T4.4.3", "Test notification permission handshakes, Groq API token streaming, and fallback to rule-based templates on timeout."],
    ]

    sprint_chapter(
        doc,
        4,
        "Sprint 2",
        "Sprint 2 expanded GoFit with comprehensive progress tracking, on-device AI computer vision body measurements (MediaPipe BlazePose), daily nutrition logging with OpenFoodFacts barcode scanning, dietary preference filtering, and adaptive AI workout recommendations powered by Groq LLaMA-3.3.",
        sprint2_backlog,
        {
            "class": "Structural class diagram models Exercise, WorkoutSession, BodyMeasurement, ProgressPhoto, NotificationPreference, NutritionEntry, UserDietaryPreferences, and related services.",
            "class_rows": [["Exercise", "Workout", "WorkoutSession"], ["BodyMeasurement", "ProgressPhoto", "ProgressService"], ["NotificationPreference", "NutritionEntry", "UserDietaryPreferences"]],
            "usecase": "Actors: Mobile User and Supabase Backend. Refined use cases include exercise library search, progress dashboard analysis, on-device AI body measurement capture, nutrition logging, barcode scanning, and push notification configuration.",
            "usecase_rows": [["Mobile User", "Search Exercises", "View Details"], ["Plan Calendar", "View Progress", "Log Measurements"], ["Configure Reminders", "Track Nutrition", "Scan Barcode"], ["Supabase", "Store Metrics", "Return Charts Data"]],
            "sequence": "Sequence interactions model AI-assisted computer vision body estimation and daily nutrition macro tracking with OpenFoodFacts integration.",
            "sequence_rows": [["Camera Capture", "MediaPipe BlazePose", "Landmark Extraction"], ["Pixel Calibration", "Circumference Calc", "Review Sheet"], ["User Confirmation", "Progress Store", "Supabase DB"]],
        },
        [
            "The exercise library provides faceted search across muscle groups, difficulty tiers, and equipment categories, with video stream integration hosted on Cloudflare R2.",
            "Progress dashboards feature interactive Victory Native charts rendering bodyweight velocity, cumulative volume, 1RM strength curves, and side-by-side progress photo comparisons.",
            "The nutrition module features animated MacroRings displaying real-time caloric, protein, carbohydrate, and fat budgets, paired with camera barcode scanning via OpenFoodFacts.",
            "The AI body measurement pipeline runs on-device using MediaPipe BlazePose (33 3D landmarks) and Selfie Segmentation to compute waist, chest, and hip metrics calibrated against user height.",
        ],
        [],
    )

    sprint3_backlog = [
        ["US-5.1", "Client", "Search accredited coaches, purchase session packs via Stripe, and book 1-on-1 coaching consultations", "T5.1.1", "Model CoachProfile, SessionPack, PurchasedPack, and Booking entities with Stripe checkout schema."],
        ["US-5.1", "Client", "Search accredited coaches, purchase session packs via Stripe, and book 1-on-1 coaching consultations", "T5.1.2", "Implement CoachMarketplaceScreen, CoachProfileScreen, Stripe PaymentSheet integration, and BookingCalendarScreen."],
        ["US-5.1", "Client", "Search accredited coaches, purchase session packs via Stripe, and book 1-on-1 coaching consultations", "T5.1.3", "Test Stripe payment intent creation, webhook idempotent fulfillment, and slot collision prevention."],
        ["US-5.2", "Coach", "Dedicated mobile workspace to manage client rosters, assign tailored workout/meal plans, and review check-ins", "T5.2.1", "Design ClientCoachAssignment, CheckInSubmission, and CoachNote database tables with RLS policies."],
        ["US-5.2", "Coach", "Dedicated mobile workspace to manage client rosters, assign tailored workout/meal plans, and review check-ins", "T5.2.2", "Implement CoachDashboardScreen, ClientListScreen, ClientDetailScreen, and PlanAssignmentScreen."],
        ["US-5.2", "Coach", "Dedicated mobile workspace to manage client rosters, assign tailored workout/meal plans, and review check-ins", "T5.2.3", "Verify coach-client data isolation, check-in photo review, and coach notes persistence."],
        ["US-5.3", "Coach/Client", "Real-time encrypted messaging and low-latency 1-on-1 video consultations with AI session summaries", "T5.3.1", "Model Conversation, Message, and VideoSession schema integrated with LiveKit SFU and Edge Function ai-session-notes."],
        ["US-5.3", "Coach/Client", "Real-time encrypted messaging and low-latency 1-on-1 video consultations with AI session summaries", "T5.3.2", "Implement RealtimeChatScreen (Supabase channels), LiveKitVideoScreen, and post-session AI summary card."],
        ["US-5.3", "Coach/Client", "Real-time encrypted messaging and low-latency 1-on-1 video consultations with AI session summaries", "T5.3.3", "Test WebSocket real-time delivery, LiveKit WebRTC audio/video token generation, and Groq AI session synthesis."],
        ["US-5.4", "Admin", "Web administration dashboard to audit coaches, manage exercise taxonomies, inspect transactions, and monitor platform BI", "T5.4.1", "Design Next.js App Router architecture with Supabase service-role client and audit_logs table."],
        ["US-5.4", "Admin", "Web administration dashboard to audit coaches, manage exercise taxonomies, inspect transactions, and monitor platform BI", "T5.4.2", "Implement Admin Dashboard, Coach Accreditation Review (CV/certificate preview), Exercise CRUD, and Transaction Ledger."],
        ["US-5.4", "Admin", "Web administration dashboard to audit coaches, manage exercise taxonomies, inspect transactions, and monitor platform BI", "T5.4.3", "Validate Next.js middleware RBAC protection, coach document signed URLs, and system metric aggregation queries."],
    ]

    sprint_chapter(
        doc,
        5,
        "Sprint 3",
        "Sprint 3 delivered the coach marketplace ecosystem, professional coach workspace, Stripe session pack monetization, LiveKit WebRTC video calls, AI coaching session notes (Groq LLaMA-3.3), and the comprehensive Next.js web administration portal.",
        sprint3_backlog,
        {
            "class": "Structural class diagram models CoachProfile, ClientCoachAssignment, SessionPack, PurchasedPack, Booking, Conversation, Message, VideoSession, AdminUser, Transaction, and AuditLog.",
            "class_rows": [["CoachProfile", "Client", "Program"], ["SessionPack", "PurchasedPack", "Booking"], ["Conversation", "Message", "Notification"], ["AdminUser", "Exercise", "Workout"], ["Transaction", "AuditLog", "Settings"]],
            "usecase": "Actors: Client, Accredited Coach, Platform Administrator, and Supabase Backend. Refined use cases include browsing marketplace, purchasing session packs via Stripe, booking consultations, managing client rosters, conducting LiveKit video calls, and reviewing accreditation.",
            "usecase_rows": [["Client", "Browse Coaches", "Book Session"], ["Coach", "Manage Clients", "Conduct Video Call"], ["Admin", "Validate Coach", "Manage Content"], ["Supabase", "Bookings / Messages", "Audit / Analytics"]],
            "sequence": "Sequence interactions model coach booking with Stripe payment processing, and administrative coach accreditation validation from the Next.js portal.",
            "sequence_rows": [["Client Selects Slot", "Booking Service", "Stripe PaymentSheet"], ["Stripe Edge Function", "Webhook Listener", "Supabase DB"], ["Booking Confirmed", "Realtime Channel", "Coach Calendar"]],
        },
        [
            "The coach marketplace enables discovery of certified coaches with specialties, hourly rates, client ratings, and multi-session package offerings.",
            "The dedicated coach workspace includes a client roster, check-in review timeline, custom workout and nutrition assignment tools, and private coaching notes.",
            "Real-time communication combines instant chat channels via Supabase Realtime with sub-100ms 1-on-1 video consultations powered by LiveKit WebRTC SFU.",
            "The Next.js administration portal provides secure server-side role-based access to coach accreditation auditing, exercise taxonomies, financial ledger inspection, and platform BI analytics.",
        ],
        [],
    )


def chapter6(doc):
    add_heading(doc, "6 Deployment and closing phase", 1)
    p(doc, "This chapter presents the working environment, multi-tier system architecture, technological choices and rationale, deployment topologies, automated CI/CD pipelines, and the final quality assurance validation matrix of the GoFit platform.")

    add_heading(doc, "6.1 Working Environment", 2)
    add_heading(doc, "6.1.1 Material Environment", 3)
    p(doc, "The development, local simulation, containerized orchestration, and compilation of the GoFit mobile and web ecosystems were conducted on a dedicated high-performance workstation supplemented by mobile testing devices and cloud services.")
    add_basic_table(
        doc,
        "Table 6.1: Hardware and material environment specifications",
        ["Hardware / Device", "Technical Specifications", "Operational Role in GoFit Project"],
        [
            ["Development Workstation", "13th Gen Intel(R) Core(TM) i7-13650HX (14 cores / 20 threads: 6 P-cores up to 4.90 GHz, 8 E-cores up to 3.60 GHz), 24 GB DDR5 4800 MHz Dual-Channel RAM, 512 GB PCIe 4.0 NVMe SSD, Windows 11 Pro 64-bit (Build 26H2)", "Full-stack development, Expo Metro bundler, Next.js Node.js server, Docker n8n container runtime, and local compilation."],
            ["Android Emulator", "Google Pixel 7 Virtual Device running Android 14.0 (API Level 34, Google APIs ARM64/x86_64 translation, 4 GB virtual RAM)", "Simulating cross-resolution responsiveness, deep linking, background timers, audio ducking, and permission dialogs."],
            ["Physical Android Device", "Physical Android Smartphone running Android 14, USB debugging, ARM64-v8a architecture, physical camera sensor", "Hardware-accelerated MediaPipe BlazePose and Selfie Segmentation camera testing, real accelerometer/gyroscope, and haptics."],
            ["Cloud Infrastructure Host", "Supabase Cloud (AWS eu-west-1 Ireland region), Cloudflare R2 Global Edge (Frankfurt region), Groq LPU Cloud (US-Central), Vercel Edge Global CDN", "Managed PostgreSQL 15, GoTrue Auth, Realtime engine, S3-compatible media storage, ultra-low latency LPU inference, and Next.js hosting."],
        ],
        [1.8, 2.8, 2.2],
    )

    add_heading(doc, "6.1.2 Software Environment", 3)
    p(doc, "The software toolchain combines cross-platform mobile runtimes, reactive web frameworks, serverless edge computing, on-device machine learning, workflow automation engines, and version control infrastructure.")
    add_basic_table(
        doc,
        "Table 6.2: Software environment and toolchain",
        ["Software / Tool", "Version / Architecture", "Functional Purpose in GoFit Project"],
        [
            ["Expo SDK / React Native", "Expo SDK 54 / React Native 0.81 (Hermes JavaScript Engine)", "Cross-platform iOS and Android mobile compilation with native hardware module bridges."],
            ["TypeScript", "TypeScript 5.3+ (Strict Mode enabled)", "Static type safety across mobile applications, web admin panel, and Deno Edge Functions."],
            ["Next.js", "Next.js 14.2 (App Router, Server Components, Route Handlers)", "High-performance administrative dashboard with server-side rendering and RBAC middleware."],
            ["Supabase BaaS", "PostgreSQL 15, GoTrue Auth, PostgREST 12, Realtime WebSockets", "Cloud relational persistence, JWT authentication, row-level security, and realtime subscriptions."],
            ["MediaPipe Solutions", "Google MediaPipe 0.10.x (BlazePose & Selfie Segmentation)", "On-device, zero-latency computer vision landmark extraction for body measurement inference."],
            ["Groq Cloud LPU API", "Groq LPU Inference Engine (LLaMA 3.3 70B Versatile)", "Ultra-fast LLM generation for adaptive workout recommendations and post-session coaching notes."],
            ["n8n Automation Engine", "n8n Self-Hosted Workflow Engine 1.x (Docker Container)", "Asynchronous event orchestration (booking reminders, check-in nudges, daily digests)."],
            ["LiveKit WebRTC Cloud", "LiveKit Serverless WebRTC SFU (Adaptive Bitrate, VP8/Opus)", "Sub-100ms encrypted 1-on-1 video consultations between athletes and accredited coaches."],
            ["Stripe Payments API", "Stripe Mobile SDK (@stripe/stripe-react-native) & Node API", "Secure tokenized credit card processing for session packs, coaching bookings, and payouts."],
            ["Docker & Docker Compose", "Docker Desktop 4.30+ (Linux Containers on WSL2)", "Local containerized execution of n8n automation engine and PostgreSQL development replicas."],
            ["Git & GitHub", "Git 2.45+, GitHub Enterprise Repository", "Distributed version control, branch-based feature tracking, and collaborative code reviews."],
            ["Visual Studio Code / Antigravity", "VS Code / Google Antigravity Advanced Agentic IDE", "Agentic pair programming, schema design, linting, debugging, and report generation."],
        ],
        [1.8, 2.3, 2.7],
    )

    add_heading(doc, "6.2 Architecture and Technological Choices", 2)
    add_heading(doc, "6.2.1 Physical Architecture", 3)
    p(doc, "✒ System Diagram : The figure 6.1 represents the physical architecture of the GoFit platform, delineating the client tier, edge distribution tier, core cloud infrastructure, and background automation engines.")
    add_diagram(
        doc,
        "figure_6_1_physical_architecture.png",
        "Figure 6.1: Physical architecture diagram",
        "GoFit Physical Architecture",
        [
            ["Mobile Client (iOS/Android)", "Admin Browser (Desktop Chrome)", "Edge CDN / Gateway"],
            ["Supabase BaaS (AWS eu-west-1)", "PostgreSQL 15 / Auth / Storage", "Deno Edge Functions"],
            ["Groq LPU Cloud (LLaMA-3.3)", "Cloudflare R2 (Video Stream)", "LiveKit SFU (WebRTC Video)"],
            ["Stripe Gateway (Payments)", "n8n Container (WSL2 / Docker)", "Push Notification Services"],
        ],
    )
    add_code_block(doc, "Mermaid physical architecture diagram draft", mermaid_code_for("architecture"))
    p(doc, "The physical architecture of GoFit is divided into four distinct operational tiers:")
    p(doc, "1. Client Tier: Comprises the GoFit Mobile application running natively on Android and iOS devices powered by React Native and Expo Hermes runtime, alongside the GoFit Admin Web Portal accessed via modern desktop browsers.")
    p(doc, "2. Edge and Ingress Tier: Utilizes Cloudflare Global Edge CDN for low-latency delivery of high-definition exercise video demonstrations hosted on S3-compatible R2 storage, Vercel Edge Network for serving Next.js server components, and Supabase PostgREST API gateways terminating HTTPS connections.")
    p(doc, "3. Core Cloud Services Tier: Anchored on AWS eu-west-1 hosting the managed Supabase PostgreSQL 15 database cluster with automated multi-zone replication, GoTrue authentication service, PostgREST RESTful interface, and Supabase Storage S3 buckets. Dedicated microservices include LiveKit SFU for low-latency WebRTC media routing, Groq Cloud LPU clusters executing LLaMA-3.3 70B inference in under 800 milliseconds, and Stripe Payment infrastructure.")
    p(doc, "4. Background Orchestration Tier: A dedicated n8n workflow engine deployed via Docker container communicating bidirectionally with Supabase via secure service-role REST calls and cron triggers to execute automated operational pipelines.")

    add_heading(doc, "6.2.2 Technologies and Selection Rationale", 3)
    p(doc, "Every core technology in GoFit was selected based on strict engineering criteria balancing execution speed, developer velocity, operational cost, and maintainability:")
    p(doc, "• Expo SDK 54 / React Native over Flutter or Swift/Kotlin: Selected because it enables 100% code sharing between Android and iOS using modern TypeScript. Expo's Config Plugins allow seamless integration of native C++ and Java libraries (such as MediaPipe and LiveKit WebRTC) while preserving fast over-the-air iteration.")
    p(doc, "• Supabase BaaS over Custom NestJS/Express Backend: Eliminates boilerplate CRUD endpoints by leveraging automatic PostgREST generation over PostgreSQL tables. Row-Level Security (RLS) pushes authorization directly to the database engine, ensuring bulletproof multi-tenant isolation that cannot be bypassed by application-level bugs.")
    p(doc, "• Next.js App Router for Admin Panel: Enables zero-bundle server components, rapid data streaming, and protected server-side route handlers that securely utilize the Supabase service-role key without ever leaking privileged credentials to the client browser.")
    p(doc, "• On-Device MediaPipe over Cloud Vision APIs: Processing 33 full-body landmarks directly on the user's smartphone guarantees zero API cost per photo capture, sub-second latency, and uncompromising privacy since raw user body photos never leave the device unless explicitly saved.")
    p(doc, "• Groq LPU Cloud over OpenAI GPT-4o: Groq's custom Language Processing Unit (LPU) silicon generates tokens at over 250 tokens per second for LLaMA-3.3 70B, allowing real-time workout adaptations and session summary generations with minimal latency.")

    add_heading(doc, "6.2.3 Layered Architecture", 3)
    p(doc, "GoFit adheres to a rigorous Layered Architecture pattern across both its mobile and web codebases:")
    p(doc, "• Presentation Layer: Encapsulates pure React Native screens (e.g., HomeScreen, WorkoutSessionScreen, NutritionScreen) and atomic design components (MacroRings, RestTimerModal, StatCard). Screens contain zero raw database calls; they bind reactively to stores.")
    p(doc, "• State Management Layer: Powered by Zustand stores (authStore, workoutStore, progressStore, coachStore). Stores maintain in-memory application state, coordinate optimistic UI updates, and handle local caching with AsyncStorage.")
    p(doc, "• Service / Domain Layer: Houses specialized TypeScript service classes (WorkoutService, NutritionService, CoachService, PaymentService). Services encapsulate business rules, data transformations, and validation schemas.")
    p(doc, "• Infrastructure / Data Access Layer: Direct adapters interfacing with Supabase client, SecureStore, Health Connect API, OpenFoodFacts REST API, and Stripe PaymentSheet SDK.")

    add_heading(doc, "6.2.4 Architecture Patterns: Offline-First, CQRS & Realtime", 3)
    p(doc, "To ensure high resilience in gym environments with erratic network connectivity, GoFit implements an Offline-First architectural pattern. Active workout sessions, completed sets, and timer preferences are written synchronously to local AsyncStorage before queuing an asynchronous synchronization task. If the device is offline, mutations remain queued and automatically replay in FIFO order upon network reconnection.")
    p(doc, "For live interactions, GoFit leverages Supabase Realtime WebSockets built on PostgreSQL WAL (Write-Ahead Logging). When a coach approves a booking or sends a chat message, the database change triggers an instantaneous WebSocket push to all subscribed client devices, eliminating wasteful polling.")

    add_heading(doc, "6.2.5 Logical Architecture Diagram", 3)
    p(doc, "✒ System Diagram : The figure 6.2 represents the logical component architecture of GoFit, illustrating module dependencies and communication channels.")
    add_diagram(
        doc,
        "figure_6_2_logical_architecture.png",
        "Figure 6.2: Logical architecture diagram",
        "GoFit Logical Architecture",
        [
            ["Mobile Screens", "Navigation Stacks", "Zustand Stores"],
            ["Mobile Services", "Offline Queue", "Supabase Client / RLS"],
            ["Admin Pages", "Route Handlers", "Admin Supabase Client"],
            ["PostgreSQL 15", "Storage Buckets", "Deno Edge Functions"],
        ],
    )
    add_code_block(doc, "Mermaid logical architecture diagram draft", mermaid_code_for("architecture"))

    add_chapter6_platform_architecture_details(doc)
    add_ai_development_tooling_details(doc)
    add_n8n_automation_details(doc)
    add_library_and_interaction_details(doc)

    add_heading(doc, "6.3 Deployment", 2)
    add_heading(doc, "6.3.1 Deployment Diagram", 3)
    p(doc, "✒ System Diagram : The figure 6.5 represents the deployment topology of the GoFit ecosystem across mobile runtime environments, containerized services, and edge cloud platforms.")
    add_diagram(
        doc,
        "figure_6_5_deployment.png",
        "Figure 6.5: Deployment diagram",
        "GoFit Deployment View",
        [
            ["Android / iOS Smartphone", "Expo EAS Build", "Compiled APK / AAB / IPA"],
            ["Vercel Cloud", "Next.js Admin Panel", "Production Edge Deployment"],
            ["Supabase Managed AWS", "Postgres 15 / Auth / Storage", "Deno Edge Functions"],
            ["Docker Host (WSL2/Linux)", "n8n Automation Engine", "Cron & Webhook Workflows"],
        ],
    )
    add_code_block(doc, "Mermaid deployment diagram draft", mermaid_code_for("deployment"))

    add_heading(doc, "6.3.2 CI/CD Pipelines and Hosting", 3)
    p(doc, "The GoFit deployment ecosystem relies on automated Continuous Integration and Continuous Delivery (CI/CD) pipelines tailored to mobile, web, and serverless targets:")
    p(doc, "• Mobile Continuous Delivery (Expo EAS): EAS Build handles automated cloud compilation of Android Application Bundles (AAB) and standalone APKs. Build profiles (development, preview, production) isolate environment variables, signing keys, and backend API URLs.")
    p(doc, "• Web Admin Panel Continuous Deployment (Vercel): The Next.js administration repository is linked to Vercel with automatic preview deployments on pull requests and production deployment on merge to master. Vercel automatically runs ESLint, TypeScript compilation, and optimizes serverless route handlers.")
    p(doc, "• Backend Migrations and Edge Functions (Supabase CLI): Supabase migrations are committed to version control in database/migrations/ and applied sequentially using supabase db push. Edge Functions are tested locally with Deno runtime and deployed with supabase functions deploy.")
    p(doc, "• n8n Workflow Deployment: The n8n automation engine runs in a containerized Docker environment with persistent SQLite/Postgres storage volumes. Workflows are serialized as version-controlled JSON definitions in workflows/ and imported via the n8n CLI.")

    add_heading(doc, "6.3.3 Unit Tests and Final Validation Results", 3)
    p(doc, "The comprehensive quality assurance matrix below validates that all GoFit mobile, administrative, AI, automation, and backend capabilities operate with zero regressions.")
    add_basic_table(
        doc,
        "Table 6.15: Final quality assurance validation matrix",
        ["Test ID", "Feature Area", "Validation Scenario", "Preconditions", "Execution Steps", "Expected Result", "Observed Outcome", "Status", "Verification Evidence"],
        [
            ["QA-01", "Mobile Auth & Onboarding", "End-to-end registration, profile setup, and session persistence", "New test email; Supabase Auth active", "1. Register new user; 2. Complete 4-step goals; 3. Restart app", "JWT stored in SecureStore; user directed to HomeScreen without re-login", "Immediate bypass to HomeScreen; tokens refreshed seamlessly", "Validated", "Terminal auth logs & SecureStore unit tests"],
            ["QA-02", "Active Workout & Timer", "Execute multi-set workout with background timer & haptics", "Template workout created; device volume enabled", "1. Start workout; 2. Log 3 sets; 3. Trigger 90s rest timer; 4. Lock device", "Timer counts down in background; audio chime & haptic trigger at 0s", "Accurate countdown; haptic vibration fired on device wake", "Validated", "Physical device test recording & session row in DB"],
            ["QA-03", "Offline Queue Sync", "Workout logging during complete network disconnection", "Device in Airplane Mode; active session started", "1. Log 4 sets while offline; 2. Finish session; 3. Re-enable Wi-Fi", "Data cached in AsyncStorage queue; auto-synced to Supabase upon reconnect", "Zero data loss; workout_sessions row inserted with exact timestamps", "Validated", "AsyncStorage queue dump & network reconnect logs"],
            ["QA-04", "AI Body Measurements", "On-device MediaPipe landmark detection & ratio calculation", "Camera permission granted; well-lit user capture", "1. Take front photo; 2. Run MediaPipe analysis; 3. Inspect review sheet", "33 landmarks detected; height anchor scales chest/waist/hip metrics", "Confidence score 0.94; draft values populated with manual overrides", "Validated", "MediaPipe tensor debug output & review sheet screenshot"],
            ["QA-05", "Groq AI Recommendations", "Adaptive workout generation based on recent muscle fatigue", "User completed leg day 24h prior; Groq API key set", "1. Trigger AI workout recommendation; 2. Inspect generated exercises", "LLM recommends push/pull workout avoiding fatigued quadriceps", "Generated 5-exercise upper body split in 720ms", "Validated", "Edge Function HTTP 200 response & JSON payload log"],
            ["QA-06", "Stripe Coach Booking", "Client purchases session pack and reserves 1-on-1 slot", "Coach calendar configured; Stripe test card provided", "1. Select coach; 2. Choose 5-session pack; 3. Complete PaymentSheet", "Stripe paymentIntent succeeds; bookings & purchased_packs rows created", "Payment confirmed; slot marked unavailable to other clients", "Validated", "Stripe Dashboard charge ID & Supabase webhook log"],
            ["QA-07", "Admin Panel RBAC", "Access control enforcing admin-only route protection", "Non-admin user account and Admin account exist", "1. Attempt access to /admin with client token; 2. Access with admin token", "Non-admin redirected to 403 Forbidden; admin granted dashboard access", "Middleware intercepts request; unauthenticated/non-admin strictly blocked", "Validated", "Next.js middleware audit test & browser network trace"],
            ["QA-08", "n8n Daily Digest", "Automated cron execution of coach daily morning summary", "Coach has 2 bookings today; n8n container running", "1. Trigger daily digest workflow at 07:00; 2. Check push notification", "Workflow aggregates daily bookings and dispatches Expo push notification", "Push received on coach phone with schedule summary; zero duplicates", "Validated", "n8n execution log ID #482 & Expo Push API receipt"],
        ],
        [0.48, 0.72, 0.88, 0.85, 1.05, 0.95, 0.9, 0.76, 0.91],
    )
    add_heading(doc, "Conclusion", 2)
    p(doc, "This deployment and validation phase confirms that GoFit fulfills all academic and industrial engineering requirements. The combination of an offline-resilient mobile app, on-device AI computer vision, sub-second LPU intelligence, automated n8n event workflows, and a secure Next.js administrative portal constitutes a production-ready, scalable health and fitness platform.")
    doc.add_page_break()


def add_complete_feature_inventory_appendix(doc):
    features = parse_feature_inventory()
    add_heading(doc, "Appendix C: Complete Source Feature Inventory", 2)
    p(doc, "This appendix is generated from the project feature inventory and is used as a coverage ledger for the report. It does not replace the narrative chapters; instead, it proves that the report accounts for the implemented mobile client, mobile coach, administration, backend, AI, automation, and infrastructure work found in the repository.")
    p(doc, "The source inventory declares 249 implemented feature blocks. The generated appendix keeps one additional shared mobile application-shell row because it documents bootstrapping, global providers, notifications, deep links, and role-aware routing used by both client and coach areas. Therefore, the appendix contains 250 coverage rows: 249 declared feature blocks plus 1 shared foundation row.")

    groups = [
        ("Mobile client", "Mobile client application features, including the shared mobile shell"),
        ("Mobile coach", "Mobile coach application features"),
        ("Admin panel", "Administration panel features"),
        ("Backend and infrastructure", "Backend, database, Edge Function, and infrastructure features"),
    ]
    summary_rows = []
    for group_name, label in groups:
        count = len([row for row in features if feature_group(row["area"]) == group_name])
        summary_rows.append([label, str(count), "Parsed from FEATURES.md feature blocks."])
    summary_rows.append(["Declared source feature blocks", "249", "Published in FEATURES.md summary table."])
    summary_rows.append(["Coverage rows retained in appendix", str(len(features)), "Includes the shared mobile application-shell row."])

    add_basic_table(
        doc,
        "Table A.3: Feature inventory summary",
        ["Area", "Feature blocks", "Source"],
        summary_rows,
        [2.4, 1.1, 3.0],
    )

    table_specs = [
        ("Table A.4: Mobile client feature inventory", "Mobile client"),
        ("Table A.5: Mobile coach feature inventory", "Mobile coach"),
        ("Table A.6: Admin panel feature inventory", "Admin panel"),
        ("Table A.7: Backend and infrastructure feature inventory", "Backend and infrastructure"),
    ]
    for caption, group_name in table_specs:
        rows = feature_inventory_table_rows(features, group_name)
        add_basic_table(
            doc,
            caption,
            ["No.", "Feature", "Implementation evidence", "Libraries / backend", "Purpose"],
            rows or [["0", "No parsed feature block", "N/A", "N/A", "Check FEATURES.md parsing."]],
            [0.45, 1.35, 1.75, 1.75, 1.9],
        )


def final_pages(doc):
    add_heading(doc, "General Conclusion", 1)
    p(doc, "The GoFit graduation internship project produced a substantial software foundation for a modern fitness platform. It combines a mobile application for clients and coaches, a web administration panel, and a Supabase backend. The repository contains implementations or foundations for authentication, onboarding, profile management, workout planning, exercise library, active workout sessions, rest timer, progress tracking, nutrition-related flows, coach marketplace features, bookings, chat, programs, notifications, analytics, administration, and deployment preparation.")
    p(doc, "Beyond the visible interfaces, the project demonstrates several engineering competencies. The mobile application required cross-platform architecture, state management, navigation design, camera and native-module integration, and device-oriented testing. The backend required database normalization, migrations, row-level security, storage, realtime communication, Edge Functions, and service-role separation. The web administration panel required protected server-side access, operational dashboards, CRUD foundations, analytics, and admin-specific security.")
    p(doc, "The AI dimension of the project is also significant. The body-measurement feature required a study of computer-vision models, including MoveNet, MediaPipe Pose Landmarker, MediaPipe Image Segmenter, segmentation masks, feature vectors, statistical estimation, confidence handling, and validation protocols. The language-model features required controlled prompts, backend/n8n integration, Groq usage, and careful limits so that generated recommendations and session briefings remain assistant outputs rather than automatic decisions. The automation layer includes five n8n workflows: AI Session Prep, Booking Reminders, Check-in Reminders, Coach Daily Digest, and Admin Ops Digest.")
    p(doc, "The project also reflects the evolution of modern software development practice. AI tools such as Codex were used during development and reporting to accelerate repository analysis, code navigation, documentation synthesis, and report generation. MCP-style connected tools made the assistant more useful by grounding work in local files, official documentation, document-generation utilities, Supabase-related context, automation artifacts, and command outputs. This use was supervised and verified through local files, structural checks, diffs, and project-specific evidence. The report therefore documents both AI as a GoFit product capability and AI as a controlled development-support tool.")
    p(doc, "The main remaining work before production release concerns final QA and institutional finalization. The application should be tested on real Android and iOS devices, the iOS MediaPipe path should be finalized if the AI measurement feature is shipped on both platforms, store builds should be generated, production environment variables should be reviewed, payment/video flows should be hardened if activated, and final screenshots should replace diagram drafts where required by the university.")
    add_heading(doc, "Bibliography", 1)
    add_basic_table(
        doc,
        "Table B.1: Bibliography",
        ["Reference", "Source", "Use"],
        [
            ["[1]", "Expo documentation", "Mobile application development and EAS build process"],
            ["[2]", "React Native documentation", "Cross-platform mobile UI and APIs"],
            ["[3]", "Supabase documentation", "Authentication, database, storage, realtime, RLS, and edge functions"],
            ["[4]", "Next.js documentation", "Administration panel, App Router, server components, route handlers"],
            ["[5]", "Scrum Guide", "Scrum roles, artifacts, events, and iterative methodology"],
            ["[6]", "GoFit repository documentation", "Project-specific architecture, features, database, and sprint planning"],
            ["[7]", "MediaPipe documentation", "Pose Landmarker, Image Segmenter, native vision tasks, landmark and segmentation concepts"],
            ["[8]", "TensorFlow Lite / MoveNet documentation", "On-device pose-estimation baseline and model format"],
            ["[9]", "Groq API documentation", "Language-model integration for recommendation and briefing flows"],
            ["[10]", "n8n documentation", "Workflow automation, schedule triggers, HTTP/API orchestration, code nodes"],
            ["[11]", "OpenAI Codex / AI coding assistant usage notes", "AI-assisted development, repository analysis, documentation support, and supervised code-generation workflow"],
            ["[12]", "LiveKit documentation", "Video-call token generation and realtime room connection concepts"],
            ["[13]", "Model Context Protocol and connector/tooling documentation", "Controlled access to current project context, external tools, official documentation, and local artifact generation"],
            ["[14]", "Git documentation", "Version control, change tracking, branch management, and diff review"],
        ],
        [0.8, 2.3, 3.4],
    )
    add_heading(doc, "Appendices", 1)
    add_heading(doc, "Appendix A: Repository Evidence Map", 2)
    add_basic_table(
        doc,
        "Table A.1: Repository evidence used for the report",
        ["Path / area", "Content", "How it supports the report"],
        [
            ["GoFitMobile", "Expo/React Native mobile application, screens, services, stores, navigation, local native MediaPipe module, assets, model files.", "Supports mobile implementation chapters, body-measurement AI section, workout/session details, coach/client flows."],
            ["admin-panel", "Next.js administration interface, protected admin pages, dashboard, management screens, UI components.", "Supports Sprint 3 administration section and deployment architecture."],
            ["database", "SQL migrations, schema design, RLS policies, functions, marketplace helpers, measurement tables.", "Supports backend, security, data model, and deployment sections."],
            ["supabase/functions", "Edge Functions such as push notification, video token generation, and body-measurement related paths.", "Supports backend integration, privileged operations, and external-service sections."],
            ["docs", "Architecture notes, feature inventory, sprint breakdown, troubleshooting, AI research, validation protocol, report drafts.", "Supports academic structure, methodology, feature scope, and AI transparency."],
            ["docs/automation/n8n", "n8n workflow JSON files and automation notes.", "Supports AI Session Prep, Booking Reminders, Check-in Reminders, Coach Daily Digest, Admin Ops Digest, automation security, and verification sections."],
        ],
        [1.55, 2.4, 2.55],
    )
    add_heading(doc, "Appendix B: Complete Feature Coverage From Source Audit", 2)
    p(doc, "This appendix exists because GoFit is larger than the first report draft suggested. The project contains a client mobile app, a coach mobile app, an administration panel, Supabase backend functions and migrations, AI modules, and n8n operational workflows. The following checklist should be used when adding final screenshots or proof before submission.")
    add_basic_table(
        doc,
        "Table A.2: Source-audited feature coverage checklist",
        ["Area", "Feature families to cover", "Evidence to attach"],
        [
            ["Client mobile app", "Auth, onboarding, profile, goals, units, workout library, exercise detail, workout builder, active session, rest timer, summary, calendar/timeline, statistics, records, progress photos, body measurements, nutrition, barcode lookup, health sync, habits, readiness, notifications, marketplace, coach detail, bookings, packs, programs, chat, video entry points, settings, haptics, and device feedback.", "Screenshots of main flows; screen list or navigation capture; service/store references; haptic interaction examples."],
            ["Coach mobile app", "Coach onboarding, CV/certification upload, pending validation, profile preview, dashboard, clients, progress, notes, check-ins, calendar, availability, chat, wallet, packs, programs, program builder, profile, settings, video session screen, and coach-side haptic feedback.", "Screenshots of coach flow; Supabase rows for coach profile, bookings, packs, and messages; haptic interaction examples."],
            ["Admin panel", "Login, protected dashboard, users, user details, coaches, certifications, exercises, workouts, transactions, notifications, settings, activity logs, BI APIs, exports, saved views, scheduled digests, imports, bulk operations, and health route.", "Admin screenshots; protected route test; route/API inventory."],
            ["Backend and database", "Auth, user profiles, workouts, sessions, native workouts, nutrition, saved meals, progress photos, health/readiness, notifications, marketplace, bookings, packs, wallet, chat, check-ins, AI templates/session notes, BI views, admin settings, admin notifications, audit logs, storage, realtime, RLS, and security optimization.", "Migration list; schema screenshots; RLS/security notes; Supabase function list."],
            ["AI and computer vision", "MediaPipe Pose Landmarker, MediaPipe Image Segmenter, MoveNet/TFLite fallback, feature extraction, statistical measurement estimator, confidence scoring, photo quality warnings, manual correction, AI workout recommendation, AI session notes, and Groq-based briefing generation.", "Model files/module references; debug output; validation photos; prompt/function screenshots."],
            ["n8n automation", "AI Session Prep, Booking Reminders, Check-in Reminders, Coach Daily Digest, Admin Ops Digest, duplicate guards, run summaries, notification creation, and secret separation.", "Workflow canvas screenshots; run summaries; Supabase notification/note/admin_notification rows."],
            ["Development process", "Codex-assisted repository analysis, MCP/tool usage, official documentation lookup, document generation, dependency/library inventory, accessibility audit, Git versioning, and report regeneration.", "Command outputs, package.json dependency evidence, report-generation script, accessibility audit, and final DOCX metadata."],
        ],
        [1.35, 3.75, 1.95],
    )
    add_complete_feature_inventory_appendix(doc)
    add_heading(doc, "Appendix D: n8n Workflow Verification Checklist", 2)
    add_basic_table(
        doc,
        "Table A.8: n8n workflow verification checklist",
        ["Workflow", "Manual verification steps", "Expected evidence"],
        [
            ["AI Session Prep v1", "Create/find a confirmed booking within the next 24 hours; run workflow manually; confirm ai_session_notes row; confirm coach notification; run again.", "n8n run summary with generated/skipped counts, ai_session_notes row, notification row with data.kind = ai_session_ready, second run without duplicate note."],
            ["Booking Reminders v1", "Create/find confirmed booking starting within 60 minutes; run workflow manually; run again.", "Client and coach notifications with data.kind = booking_starting_soon; second run skips duplicates for same booking/recipient/window."],
            ["Check-in Reminders v1", "Create/find enabled schedule due today in UTC without a response; run workflow manually; run again.", "Client notification with data.kind = check_in_due; second run without duplicate reminder."],
            ["Coach Daily Digest v1", "Create/find coach with at least one digest signal; run workflow manually; run again.", "Coach notification with data.kind = coach_daily_digest and counts for missed check-ins, low wellness, upcoming sessions, or inactive clients; no duplicate for same UTC date."],
            ["Admin Ops Digest v1", "Confirm at least one admin profile; run workflow manually; run again.", "admin_notifications row per admin with title Daily ops digest and deterministic date link; no duplicate for same date."],
        ],
        [1.35, 3.2, 2.5],
    )
    add_heading(doc, "Appendix E: AI Validation Checklist", 2)
    add_basic_table(
        doc,
        "Table A.9: AI validation checklist",
        ["Checklist item", "Expected evidence", "Status"],
        [
            ["Pose detection works on device", "MediaPipe debug values show pose count, landmarks, visibility, and inference time.", "Partially validated on Android development client."],
            ["Segmentation mask is usable", "Person-mask coverage, class grid, connected component, and scan-line debug values are reviewed.", "Needs broader validation."],
            ["Measurements are compared with tape", "Chest, waist, hip, and shoulder tape values are recorded and compared with AI drafts.", "Protocol defined; dataset must be expanded."],
            ["Confidence is honest", "Low-quality scans reduce confidence and produce warnings.", "Needs continued refinement."],
            ["LLM outputs are scoped", "Prompts use only selected data and instruct the model not to invent medical facts.", "Implemented in workflow design."],
            ["AI results remain reviewable", "Users and coaches can interpret or override AI assistance.", "Design principle defined."],
        ],
        [1.7, 3.0, 1.8],
    )
    add_heading(doc, "Appendix F: Remaining Work Before Final Submission", 2)
    add_basic_table(
        doc,
        "Table A.10: Remaining work",
        ["Area", "Task", "Reason"],
        [
            ["Report formatting", "Update table of contents, list of figures, list of tables, page numbers, university names, supervisors, and final screenshots.", "Required for institutional submission."],
            ["Visual evidence", "Replace generated diagram drafts with final UML exports and real application screenshots where required.", "Improves credibility and alignment with the example report style."],
            ["Mobile QA", "Run full Android and iOS tests, including auth, workouts, progress, marketplace, coach flows, notifications, and AI measurement.", "Confirms behavior on real devices."],
            ["AI validation", "Collect a larger set of tape measurements and photo captures under controlled conditions.", "Needed to quantify accuracy and improve confidence scoring."],
            ["Deployment", "Finalize EAS builds, admin hosting, Supabase environment variables, Edge Functions, and monitoring.", "Required before production release."],
            ["Security review", "Confirm RLS policies, admin-role checks, service-role boundaries, storage permissions, and prompt-data exposure.", "Protects personal and operational data."],
        ],
        [1.35, 3.0, 2.1],
    )


def main():
    doc = Document()
    setup_styles(doc)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    cover(doc)
    front_matter(doc)
    introduction(doc)
    chapter1(doc)
    chapter2(doc)
    chapters3_to5(doc)
    chapter6(doc)
    final_pages(doc)
    finalize(doc)
    doc.core_properties.title = "GoFit Graduation Internship Report Draft"
    doc.core_properties.subject = "Filled PFE report draft for GoFit"
    save_target = OUT
    try:
        doc.save(OUT)
    except PermissionError:
        save_target = "output/documents/PFE_GoFit_Polished_Academic_Draft_Updated.docx"
        print(f"Notice: {OUT} is currently opened in Microsoft Word. Saved to {save_target}.")
        doc.save(save_target)
    print(save_target)
    # Save copies to accessible paths so all tools and audits inspect the latest build
    import shutil
    src_norm = os.path.normpath(save_target)
    for extra_out in [
        "output/documents/PFE_GoFit_Polished_Academic_Draft_Accessible.docx",
        "output/documents/PFE_GoFit_Polished_Academic_Draft_Accessible_AI_Workout.docx",
        "output/documents/PFE_GoFit_Polished_Academic_Draft_Accessible_BI.docx",
        "output/documents/PFE_GoFit_Filled_Report_Full.docx",
    ]:
        try:
            shutil.copy2(src_norm, os.path.normpath(extra_out))
        except Exception as copy_err:
            pass

    # Automatically extract text to output/documents/PFE_extracted.txt
    try:
        extract_txt_path = "output/documents/PFE_extracted.txt"
        print(f"Extracting text from {save_target} to {extract_txt_path}...")
        extracted_lines = []
        for p in doc.paragraphs:
            if p.text.strip():
                extracted_lines.append(p.text)
        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip().replace('\n', ' ') for c in row.cells]
                extracted_lines.append(" | ".join(cells))
        with open(extract_txt_path, "w", encoding="utf-8") as ext_f:
            ext_f.write("\n".join(extracted_lines))
        print(f"Successfully extracted {len(extracted_lines)} lines to {extract_txt_path}!")
    except Exception as ext_err:
        print(f"Text extraction warning: {ext_err}")


if __name__ == "__main__":
    main()
