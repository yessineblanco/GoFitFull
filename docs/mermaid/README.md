# GoFit Mermaid Diagrams

These are the clean Mermaid versions of the presentation diagrams.

## Files

- `gofit_use_case_clean.mmd`
- `gofit_physical_architecture_clean.mmd`
- `gofit_feature_architecture_clean.mmd`
- `gofit_class_client_core_clean.mmd`
- `gofit_class_coach_admin_clean.mmd`

## Rendering

Render with Mermaid CLI:

```powershell
mmdc -i docs/mermaid/gofit_use_case_clean.mmd -o docs/mermaid/gofit_use_case_clean.svg -b transparent
```

For the class diagrams, keep them as two separate slides. Do not merge them into one diagram.
The exported class PNGs are padded to exactly `1600 x 900` so they stay landscape 16:9 in slides.
