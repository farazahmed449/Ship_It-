# Ship It — Student Finance & Micro-Budgeting Assistant

**Ship It** is an agentic personal finance and micro-budgeting web app built for students. It combines simple, deterministic budgeting tools — monthly budgets, categorized expenses, threshold alerts, forecasts, saving goals, and monthly reports — with optional AI assistance that parses natural-language expenses, suggests categories, and offers saving tips. The AI always acts as a reviewable, overridable assistant: it suggests, the student decides. Built for the **MAJU CodeCraft Hackathon — Track 2**.

## Features

- **Monthly budgets with categories and colors** — set a total budget per month and break it into color-coded categories.
- **Manual expense entry with persistence** — log expenses against categories; everything is stored per user in PostgreSQL.
- **AI natural-language expense entry** — type "spent 200 on pizza last night" and AI drafts a structured expense for you to review.
- **AI category suggestions** — AI proposes a category for an expense; suggestions are reviewed and confirmed by the user and are **never auto-applied**.
- **Budget threshold alerts** — automatic alerts when spending in a category crosses **80%** and **100%** of its allocation.
- **End-of-month forecast** — projects spending and remaining balance based on current activity and recurring expenses.
- **Saving goals with progress** — track goals with target/saved amounts, deadlines, and progress bars.
- **Monthly reports with AI saving suggestions** — income/spent/saved summaries plus AI-generated, non-binding saving tips.
- **JWT authentication with per-user data isolation** — every request is authenticated and every query is scoped to the logged-in user.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), React Router, Axios, Recharts |
| Backend | FastAPI, SQLAlchemy |
| Database | PostgreSQL (Supabase) |
| AI | Groq API |
| Auth | JWT (python-jose) + bcrypt |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, request flow, and security.
- [Database ERD](docs/DATABASE_ERD.md) — entity-relationship diagram of all 10 tables.
- [Project Summary](docs/PROJECT_SUMMARY.md) — what it is, who it's for, and how it helps.
- [AI Usage](docs/AI_USAGE.md) — AI usage declaration and safeguards.

## Setup

### Prerequisites

- Python 3.11+
- Node 20+
- A PostgreSQL / Supabase database
- A Groq API key

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate    macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in real values
uvicorn main:app --reload
```

The backend runs on **http://127.0.0.1:8000**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on **http://localhost:3000**.

## Environment Variables

Create `backend/.env` with:

```env
DATABASE_URL=postgresql://username:password@host:5432/student_finance
SECRET_KEY=your-secret-key-here
GROQ_API_KEY=your-groq-api-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

- Generate a strong secret with:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- If your network blocks IPv6, use the **Supabase Session Pooler (IPv4)** connection string for `DATABASE_URL`.

## Demo Credentials

| Email | Password |
|-------|----------|
| `test@student.com` | `test1234` |

This account is pre-loaded with seed data (budget, categories, expenses, income, and an alert).

## Known Limitations

- **AI suggestions are limited to existing categories** — if the AI suggests a category that doesn't exist, the user must create it manually on the Budget page. This is **by design**, to keep the user in control.
- **Single currency** — all amounts are in PKR (Rs).
- **Forecast uses linear extrapolation** — it projects from the current spending rate, not a statistical model.
- **No email verification or password reset** flows.
- **JWT expires after 30 minutes**, after which the user must log in again.
- **Money is stored as float** for simplicity (not exact decimal).

## AI Usage

Ship It uses the Groq API in three places: it **parses** natural-language text into a structured expense draft, **suggests** an expense category, and **generates** saving tips from a monthly summary. In every case the AI produces *overridable suggestions only* — each response carries a "not financial advice" disclaimer, and the user reviews, edits, or rejects the output before anything is saved. The AI never makes a final financial decision; all core budgeting, alerting, forecasting, and reporting logic is deterministic, non-AI code. See [docs/AI_USAGE.md](docs/AI_USAGE.md) for the full AI usage declaration.
