"""End-of-month spending / balance forecasting."""
import calendar
from datetime import date, datetime, timezone
from typing import Dict

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from models import Expense, Income, RecurringExpense


def _sum_expenses(db: Session, user_id, month: int, year: int) -> float:
    total = (
        db.query(func.coalesce(func.sum(Expense.amount), 0.0))
        .filter(
            Expense.user_id == user_id,
            extract("month", Expense.date) == month,
            extract("year", Expense.date) == year,
        )
        .scalar()
    )
    return float(total or 0.0)


def _sum_income(db: Session, user_id, month: int, year: int) -> float:
    total = (
        db.query(func.coalesce(func.sum(Income.amount), 0.0))
        .filter(
            Income.user_id == user_id,
            Income.month == month,
            Income.year == year,
        )
        .scalar()
    )
    return float(total or 0.0)


def _sum_active_recurring(db: Session, user_id) -> float:
    total = (
        db.query(func.coalesce(func.sum(RecurringExpense.amount), 0.0))
        .filter(
            RecurringExpense.user_id == user_id,
            RecurringExpense.is_active.is_(True),
        )
        .scalar()
    )
    return float(total or 0.0)


def calculate_forecast(user_id, month: int, year: int, db: Session) -> Dict:
    """Project total spending and remaining balance for the given month.

    Strategy: take the current daily spending rate for the month, extrapolate it
    to the full month, and add any active recurring expenses not yet reflected.
    Balance = income for the month minus projected spending.
    """
    today = date.today()
    days_in_month = calendar.monthrange(year, month)[1]

    if today.year == year and today.month == month:
        days_elapsed = today.day
    elif (year, month) < (today.year, today.month):
        days_elapsed = days_in_month  # month already complete
    else:
        days_elapsed = 1  # future month, avoid divide-by-zero

    spending_so_far = _sum_expenses(db, user_id, month, year)
    income = _sum_income(db, user_id, month, year)
    recurring_total = _sum_active_recurring(db, user_id)

    daily_rate = spending_so_far / days_elapsed if days_elapsed else 0.0
    projected_from_rate = daily_rate * days_in_month

    # Projected spending is at least what's already spent; add recurring costs
    # that may not yet have been logged as expenses this month.
    projected_spending = max(projected_from_rate, spending_so_far) + recurring_total
    projected_balance = income - projected_spending

    return {
        "month": month,
        "year": year,
        "projected_spending": round(projected_spending, 2),
        "projected_balance": round(projected_balance, 2),
        "total_income": round(income, 2),
        "spending_so_far": round(spending_so_far, 2),
        "recurring_total": round(recurring_total, 2),
        "generated_at": datetime.now(timezone.utc),
    }
