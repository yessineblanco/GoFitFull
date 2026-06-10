# Periodic review — Start of internship (6th week)

**English reference for:** *Bilan Périodique Début Stage (2).docx* (your Downloads folder).  
**Project:** GoFit — aligns with week **6** from a start around **26 Jan 2026** and **Sprint 3.1** (workout planner core) on your Gantt.

**Use:** Copy the **Form answers (English)** block into Word, or translate into French if your school requires the form in French. Fill in only the bracketed personal fields.

### Is this what the “bilan périodique” really looks like? (Esprit Tunisia / web check)

- **This repo guide matches your file:** The question list, the six self-assessment rows (1–4) with “why + concrete example,” and the final contact block were taken from text **extracted from your own** `Bilan Périodique Début Stage (2).docx`. If your school reissues a **newer** Word template, open it and compare section titles—update your copy if anything changed.
- **What a public search shows for Esprit (Tunisia):** Official pages ([Esprit — Stages / PFE](https://www.esprit.tn/stages-et-entreprises/stages/), [PFE portal](https://pfe.esprit.tn/)) stress **internship rules**, **PFE duration**, and (in FAQs) a **“cahier de stage”** as a **follow-up** tool with your **maître de stage** and academic supervisor. They do **not** publish a downloadable PDF with the **exact same** “6th week / début de stage” bilan wording that we could mirror line-for-line online.
- **What is different elsewhere:** Student examples and Slideshare “modèle rapport PFE Esprit” describe the **final PFE report** (chapters, introduction, implementation), **not** this short mid-internship reflective form. So similarity to “Esprit” online examples is **only** at a high level (reflection + competences), not a one-to-one official layout.
- **Bottom line:** Treat **your Word document from Esprit / Moodle / the internship office** as the **source of truth**. This markdown is a **faithful mirror** of the file you provided plus English answers; it is **not** a certificate that the school has published that exact form on the open web.

---

## 1. What the form is asking for

A **check-in** early in the internship (framed as the **6th week**). It is reflective: motivation, one memorable situation, a difficulty, learnings, how you manage deadlines, how you use your strengths, a **1–4 self-rating** on six skills (each with **why + concrete example**), and whether you want follow-up with the reviewer (tutor / HR).

**Scale:** 1 = weakest → 4 = strongest.

**Six skills on the form:**

1. Working in a team  
2. Being autonomous  
3. Being resilient  
4. Organizing your work to meet deadlines  
5. Taking initiative  
6. Delivering quality work (professional rigor, thoroughness)

---

## 2. Field-by-field (what evaluators expect)

| Section | What to include |
|--------|------------------|
| **Name, program, host org** | Exact details as required by your school. |
| **What motivates you** | Specific, not generic: stack, project goal, supervision style, concrete tasks. |
| **Memorable situation** | One story: context → what you did → outcome (e.g. demo, bug, tradeoff). |
| **Difficult situation** | Real or minor issue + **how you responded** (help, notes, time-boxing). |
| **Learnings** | What you did not know before: planning, sector, tools, security, etc. |
| **Deadlines** | Your method: weekly goal with tutor, task list, buffer, Gantt. |
| **Strengths + examples** | Two short links between a strength and a real task. |
| **Self-rating 1–4** | A number you can defend; the **justification + example** matters most. |
| **Contact yes/no** | Your choice; if yes, suggest channel (email, call, meeting). |

---

## 3. Link to your logbook (optional)

See `docs/INTERNSHIP_LOGBOOK_SPRINTS_1.1_to_3.3_EN.md`. Week 6 lines up with **Sprint 3.1** (sessions, sets/reps, rest timer, saving to the database).

---

## 4. Form answers (English) — copy & paste

**Name:** [Your first and last name]  
**Program / major:** [e.g. Software development, Computer science, Web & mobile]  
**Host organization:** [Company or school name]

---

### What do you enjoy and what motivates you in your internship?

What I enjoy is working on a real product, **GoFit**, with a serious stack (**React Native**, **Expo**, **Supabase**) and a clear user goal: help people structure their workouts. I am motivated by moving from **design to features to tests**, with regular feedback from my supervisor. I also like seeing the app come alive on a device when a feature works end to end, even if it is not polished yet.

---

### Describe a memorable work situation from your internship.

A situation that stood out was when I connected **creating a workout**, **sets and reps**, and a **rest timer** and had to check that everything **saved correctly** in the database and that the screen handled the flow (next exercise, pause, resume). It was memorable because it was not only UI: I had to clarify the **data model** (session, exercises, sets) and ship a **simple path first**, then note what still needed improvement. My supervisor validated the increment, which reassured me about working in **small, shippable steps**.

---

### Have you faced a difficult or problematic situation? If yes, how did you react?

Yes: time lost on **build / environment** issues (SDK versions, emulator setup) that are not “the job” but still **block** progress. I reacted by **writing down** each error message and the fix, **time-boxing** how long I struggled alone before asking for help, and keeping the **weekly goal** in mind: a **testable feature**, not only “it builds on my machine.”

---

### What have you learned since the start (company culture, sector, profession)?

I am learning to **prioritize** a backlog tied to a roadmap (sprints) and to separate **product needs** from **technical solutions**. In fitness / health, the app must stay **simple during exercise**, which pushes for clear UI and large touch targets. Professionally, I understand better how **database design** and **security** (user accounts, personal data) must be considered **early**, not as an afterthought.

---

### How do you manage deadlines in your work?

I set a **weekly objective** with my supervisor and break it into tasks (e.g. model, screen, manual tests). I prioritize the **happy path** first, then error cases. If something takes too long, I **time-box** it and log it as a **risk** instead of letting it derail the whole week.

---

### In what ways do you use your abilities and talents? Give concrete examples.

I use **organization**: short notes after check-ins with my supervisor and a simple list of **done / next**. I use **technical persistence**: I do not drop a bug until I have **reproduced** it, **isolated** the cause, and **documented** the fix. **Example:** keeping the same **exercise ID** between the **workout** screen and the **library** detail so data stays consistent.

---

## 5. Self-assessment (1–4) — full text for each row on the form

Circle **one** number per row in the Word document. Below is the text to paste under **“Why did you give yourself this score? Give a concrete example.”**

### Working in a team — **Example rating: 3**

I stay aligned with my supervisor: I share progress, accept feedback on **Figma** vs implementation, and write short updates so someone else could follow my work. **Example:** after a review, I adjusted navigation to match the mockups and noted the change in the task list.

---

### Being autonomous — **Example rating: 3**

I read official docs (Expo, Supabase) before every question and try small experiments in a branch. I do not stay stuck on one detail without a plan. **Example:** I configured the database client and environment variables by following the docs and checking the project never committed secrets.

---

### Being resilient — **Example rating: 3**

When a build fails or a feature breaks, I trace the error, search for a fix, write it down, and return to the weekly plan instead of spiraling. **Example:** after a failed run on the emulator, I reset the cache, documented the steps, and continued with the workout flow.

---

### Organizing your work within deadlines — **Example rating: 3**

I split the sprint into daily goals and flag slippage early (e.g. calendar view taking longer than planned). **Example:** I delivered the session + timer path first and moved “edge cases” to a visible backlog so the week still had a demo.

---

### Taking initiative — **Example rating: 3**

I proposed adding a short **“known limitations”** list for demos (e.g. rest timer behavior in background) so expectations stay clear. I could still be more proactive on suggesting **tests** earlier in the week.

---

### Delivering quality work (rigor, thoroughness) — **Example rating: 3**

I run **manual tests** on full paths, use **clear names** for components and variables, and keep **API keys** out of the repository. **Example:** I verified save/load for a workout session in two rounds: happy path, then one failure case (e.g. offline / error message).

---

**Adjust the numbers (1–4) to match your honest view** and tweak the examples to your real week.

---

## 6. Contact (end of form)

**Would you like to be contacted to discuss your internship?**  
[ ] Yes [ ] No — *choose one*

**If yes, how (phone, email, appointment)?**  
[Example: institutional email, or 30-minute video slot on [day] / leave blank to agree by email only]

---

## 7. Checklist before submitting

- [ ] Personal fields filled in  
- [ ] No secrets (passwords, API keys)  
- [ ] Dates consistent if you refer to a “6th week” from your real start date  
- [ ] Every self-rating has **why + example**  
- [ ] Spell-check  

---

*Derived from: `Bilan Périodique Début Stage (2).docx` — form text extracted for this guide.*
