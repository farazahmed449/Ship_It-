"""FastAPI application entry point for the student finance app."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401  (ensure models are registered with Base.metadata)
from database import Base, engine
from routers import (
    ai,
    alerts,
    auth,
    budgets,
    expenses,
    forecast,
    income,
    recurring,
    reports,
    saving_goals,
)

app = FastAPI(
    title="Student Finance App",
    description="Personal finance and micro-budgeting API for students.",
    version="1.0.0",
)

# CORS for the React dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Auto-create tables on startup.
    Base.metadata.create_all(bind=engine)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(income.router)
app.include_router(budgets.router)
app.include_router(expenses.router)
app.include_router(recurring.router)
app.include_router(saving_goals.router)
app.include_router(alerts.router)
app.include_router(forecast.router)
app.include_router(reports.router)
app.include_router(ai.router)
