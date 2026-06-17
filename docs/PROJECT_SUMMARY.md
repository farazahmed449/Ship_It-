# Project Summary — PocketAI

## What it is

PocketAI is an agentic personal finance and micro-budgeting web app for students. It lets a student set a monthly budget, split it into categories, log expenses (manually or in plain language), receive alerts when a category nears or exceeds its limit, forecast where the month is heading, track saving goals, and generate monthly reports with AI-powered saving tips. AI assists at every friction point but never makes the final call — the student always reviews and confirms.

## Who it is for

Students — with a focus on **Pakistan** and the **PKR (Rs)** currency. Students typically manage small, tight budgets across food, transport, rent, and education, and benefit from tools that are fast, low-friction, and forgiving rather than enterprise finance software.

## The problem

- Students usually have **little or no financial buffer**, so a single overspend can hurt.
- **Manual logging is friction** — most budgeting apps demand disciplined, structured data entry that students abandon within days.
- Without early signals, students discover they've overspent only at the end of the month, when it's too late to adjust.

## How it helps

- **Quick budgets** — create a monthly budget and color-coded categories in seconds.
- **Low-friction + AI expense logging** — log expenses manually, or type natural language ("spent 200 on pizza last night") and let AI draft the entry for review.
- **Early alerts** — automatic notifications at 80% and 100% of any category's allocation, so adjustments happen in time.
- **Forecast** — a projected end-of-month spending and balance estimate based on the current pace and recurring expenses.
- **Goals** — saving goals with target/saved amounts, deadlines, and visual progress.
- **AI reports** — monthly income/spent/saved summaries plus AI-generated, non-binding saving suggestions.

## Responsible AI

AI in PocketAI is strictly assistive: **AI suggests, the student decides.** Every AI feature produces output the user can review, edit, or reject before it affects any data, and every AI response carries a clear "not financial advice" disclaimer. Disclaimers appear everywhere AI output is shown, and the core financial logic (budgets, alerts, forecasts, reports) is deterministic code, not AI.

## Tech overview

- **Frontend:** React (Vite), React Router, Axios, Recharts — runs on port 3000.
- **Backend:** FastAPI with SQLAlchemy — runs on port 8000, exposing auth, resource, and AI routes plus service modules for alerts, forecasts, and AI.
- **Database:** PostgreSQL (Supabase), with UUID primary keys and per-user data isolation.
- **AI:** Groq API, called only from the server with a server-side key.
- **Auth:** JWT (python-jose) with bcrypt password hashing.
