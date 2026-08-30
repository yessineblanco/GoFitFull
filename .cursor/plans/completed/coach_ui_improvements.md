# Coach UI Improvements

## Goal Description
Enhance the Coach UI to surface the newly collected dietary preferences, highlight clients who need attention (e.g., missing info), and improve the workflow for assigning programs that respect client food dislikes.

## Steps & Verification

1. **Client Detail Screen Enhancements**
   - [x] In `ClientDetailScreen.tsx`, add a "Health & Nutrition Profile" section or tab.
   - [x] Display the client's `dietary_preferences`, `food_allergies`, and `food_dislikes` fetched from their profile.
   - [x] *Verify*: Opening a client's profile shows their dislikes clearly so the coach is aware.

2. **Dashboard Alerts & Widgets**
   - [x] In `CoachDashboardScreen.tsx`, add an "Action Needed" or "Missing Info" widget.
   - [x] Highlight clients who have not yet completed their nutrition profiles, so the coach can prompt them in chat.
   - [x] *Verify*: Dashboard lists clients with `food_dislikes === null` as needing follow-up.

3. **Program Builder & Nutrition Guidelines**
   - [x] In `ProgramBuilderScreen.tsx`, add a section for the coach to attach "Nutrition Guidelines".
   - [x] When assigning meals or guidelines, show a warning if the assigned food contradicts the client's `food_dislikes` or `food_allergies`.
   - [x] *Verify*: Coach receives visual feedback if assigning restricted foods to a client.

4. **UI Cleanup & Navigation**
   - [x] General UX pass on `CoachDashboardScreen` to make CRM navigation faster, reducing clicks to view client details.
   - [x] *Verify*: Workflow from Dashboard -> Client Detail -> Program Builder feels streamlined.
