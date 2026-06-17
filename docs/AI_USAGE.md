# AI Usage Declaration — Ship It

Ship It uses AI as an **assistive layer only**. AI helps students log and understand their finances faster, but it never makes financial decisions on their behalf. This document declares exactly where and how AI is used, and the safeguards that keep the student in control.

## AI Provider

- **Provider:** Groq API.
- **Key handling:** the `GROQ_API_KEY` is stored server-side only (in `backend/.env`) and is never exposed to the browser. All AI calls are made from the FastAPI backend.

## AI Endpoints

### 1. `POST /ai/parse` — Natural-language expense parsing
Takes a free-text sentence (e.g. *"spent 200 on pizza last night"*) and returns a **structured draft** of an expense: amount, description, and date. The draft is used only to **pre-fill the add-expense form**. The user reviews (and edits if needed) and must explicitly click Save to persist it — the app never auto-submits a parsed expense.

### 2. `POST /ai/categorize` — Category suggestion
Takes an expense description and returns a **suggested category name**. The suggestion is shown to the user but is **never auto-applied**. The user chooses the final category from the dropdown. If the suggested category does not already exist in the user's budget, the user must either **create it manually** on the Budget page or **pick another** existing category — the app will not silently create categories.

### 3. `POST /ai/suggestions` — Saving suggestions
Takes a monthly summary (income, total spent, and per-category allocated/spent figures) and returns a list of **saving tips**. These are presented as labeled suggestions for the student to consider; they do not change any data.

## Safeguards

- **AI never makes final financial decisions.** It only drafts, suggests, and advises.
- **Every AI response carries a "not financial advice" disclaimer**, shown wherever the output appears in the UI.
- **All AI output is reviewable, editable, and rejectable** before it has any effect — parsed expenses must be confirmed, category suggestions must be selected, and saving tips are informational only.
- **Core logic is deterministic, non-AI code.** Budgeting, the 80%/100% alert thresholds, the end-of-month forecast, and monthly report calculations are all implemented as plain backend logic, not AI.
- **Graceful degradation.** If the AI service is unavailable or no API key is configured, the affected endpoints fail cleanly and the UI shows a friendly "AI service may be unavailable" message. All non-AI features continue to work normally.

## AI-Assisted Development

AI coding assistants were used to help build this project (scaffolding, boilerplate, and documentation). All code is understood, reviewed, and maintained by the team — the AI assistance accelerated development but did not replace the team's understanding of the system.
