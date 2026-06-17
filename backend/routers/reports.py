"""Monthly report routes."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Path
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import Expense, Income, MonthlyReport, SavingGoal, User
from schemas import ReportOut

router = APIRouter(prefix="/reports", tags=["reports"])


def _compute_report(db: Session, user_id, month: int, year: int) -> dict:
    total_income = float(
        db.query(func.coalesce(func.sum(Income.amount), 0.0))
        .filter(Income.user_id == user_id, Income.month == month, Income.year == year)
        .scalar()
        or 0.0
    )
    total_spent = float(
        db.query(func.coalesce(func.sum(Expense.amount), 0.0))
        .filter(
            Expense.user_id == user_id,
            extract("month", Expense.date) == month,
            extract("year", Expense.date) == year,
        )
        .scalar()
        or 0.0
    )
    # Total currently saved across all goals (snapshot).
    total_saved = float(
        db.query(func.coalesce(func.sum(SavingGoal.saved_amount), 0.0))
        .filter(SavingGoal.user_id == user_id)
        .scalar()
        or 0.0
    )

    return {
        "month": month,
        "year": year,
        "total_income": round(total_income, 2),
        "total_spent": round(total_spent, 2),
        "total_saved": round(total_saved, 2),
    }


@router.get("/{month}/{year}", response_model=ReportOut)
def get_report(
    month: int = Path(..., ge=1, le=12),
    year: int = Path(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = _compute_report(db, current_user.id, month, year)
    # If a saved report exists, surface its stored AI summary.
    saved = (
        db.query(MonthlyReport)
        .filter(
            MonthlyReport.user_id == current_user.id,
            MonthlyReport.month == month,
            MonthlyReport.year == year,
        )
        .first()
    )
    if saved is not None:
        data["ai_summary"] = saved.ai_summary
        data["generated_at"] = saved.generated_at
    return data


@router.post("/{month}/{year}/generate", response_model=ReportOut, status_code=201)
def generate_report(
    month: int = Path(..., ge=1, le=12),
    year: int = Path(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = _compute_report(db, current_user.id, month, year)

    report = (
        db.query(MonthlyReport)
        .filter(
            MonthlyReport.user_id == current_user.id,
            MonthlyReport.month == month,
            MonthlyReport.year == year,
        )
        .first()
    )
    if report is None:
        report = MonthlyReport(user_id=current_user.id, month=month, year=year)
        db.add(report)

    report.total_income = data["total_income"]
    report.total_spent = data["total_spent"]
    report.total_saved = data["total_saved"]
    report.generated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(report)

    data["ai_summary"] = report.ai_summary
    data["generated_at"] = report.generated_at
    return data
