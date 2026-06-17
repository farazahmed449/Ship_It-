# Testing — PocketAI

## Overview

PocketAI was validated end-to-end. The backend was tested directly through the **FastAPI Swagger UI** (`/docs`), and the full application was tested through the **React frontend**. All tests ran against the **live Supabase database** and the **live Groq API** — **nothing is mocked**. AI features call the real Groq endpoints, and all data is read from and written to the real database.

## Backend API tests (via Swagger UI)

| Endpoint | Test | Result |
|----------|------|--------|
| POST /auth/register | Register a new student | 201 Created, user persisted with UUID |
| POST /auth/login | Log in with valid credentials | 200 OK, JWT returned |
| POST /auth/login | Log in with wrong password | 401 Unauthorized |
| POST /auth/token | OAuth2 form login (Swagger Authorize) | 200 OK, authorizes protected routes |
| POST /budgets | Create a monthly budget (Rs 50,000) | 201 Created, tied to user |
| POST /budgets/{id}/categories | Add a Food category (Rs 15,000) | 201 Created |
| POST /expenses | Add expense Rs 13,000 (no date field; server-set) | 201 Created |
| GET /alerts | Check threshold alert after 87% spend | 200 OK, "approaching_limit" alert auto-generated |
| POST /income | Add monthly income (Rs 40,000) | 201 Created |
| GET /forecast/6/2026 | Get end-of-month forecast | 200 OK, projected_balance Rs 15,625 |
| GET /reports/6/2026 | Get monthly report | 200 OK, totals from real data |
| POST /reports/6/2026/generate | Generate and save report | 201 Created |
| POST /ai/parse | Parse "spent 200 on pizza last night" | 200 OK, {amount:200, description:"pizza"} + disclaimer |
| POST /ai/categorize | Categorize "pizza dinner with friends" | 200 OK, "Food" + disclaimer |
| POST /ai/suggestions | Get saving tips from report data | 200 OK, suggestions list + disclaimer |

## Frontend tests (via React UI)

| Page | Test | Result |
|------|------|--------|
| Register | Create account via form | Redirects to login, user persisted |
| Login | Log in, token stored in localStorage | Lands on dashboard |
| Protected routes | Visit dashboard without token | Redirected to login |
| Dashboard | Load summary cards, alerts, charts | Renders live data (budget, spent, forecast, alert) |
| Budget | Create budget + add categories with colors | Persists and displays |
| Expenses | Smart Add natural language → review → save | AI parses, user confirms, expense saved |
| Expenses | Suggest category, then override with own choice | Suggestion shown, user choice saved |
| Goals | Add goal, update saved amount, mark complete | Progress bar updates |
| Reports | Generate report + get AI suggestions | Report and suggestions display with disclaimer |

## Security validation

- All protected routes reject requests without a valid JWT (401).
- Every query is filtered by the authenticated user's id; users cannot see others' data.
- Secrets (DATABASE_URL, SECRET_KEY, GROQ_API_KEY) are in `.env`, which is gitignored and never committed.
- An expired JWT (30 min) triggers the frontend to clear the token and redirect to login.

## Edge cases handled (from the handbook's Project 2 list)

- **Wrong category prediction** → user overrides the AI suggestion before saving.
- **Monthly income changes** → income is recorded per month/year.
- **Recurring subscription amounts** → recurring_expenses table supports updates.
- **Late/cash expense entry** → expenses can be added any time for the month.
