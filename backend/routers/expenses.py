"""Expense routes. Adding an expense may auto-trigger a budget alert."""
from datetime import date as date_type
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import Category, Expense, User
from schemas import ExpenseCreate, ExpenseOut, ExpenseUpdate
from services.alert_service import check_budget_threshold

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _validate_category(db: Session, user_id, category_id: Optional[UUID]):
    if category_id is None:
        return
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == user_id)
        .first()
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")


@router.post("", response_model=ExpenseOut, status_code=201)
def add_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _validate_category(db, current_user.id, payload.category_id)

    data = payload.model_dump()
    if data.get("date") is None:
        data["date"] = date_type.today()

    expense = Expense(user_id=current_user.id, **data)
    db.add(expense)
    db.commit()
    db.refresh(expense)

    # Auto-trigger a budget threshold alert if needed (best-effort).
    if expense.category_id is not None:
        check_budget_threshold(current_user.id, expense.category_id, db)

    return expense


@router.get("", response_model=List[ExpenseOut])
def list_expenses(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Expense).filter(Expense.user_id == current_user.id)
    if month is not None:
        query = query.filter(extract("month", Expense.date) == month)
    if year is not None:
        query = query.filter(extract("year", Expense.date) == year)
    return query.order_by(Expense.date.desc()).all()


def _get_owned_expense(db: Session, expense_id: UUID, user_id) -> Expense:
    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.user_id == user_id)
        .first()
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    return expense


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: UUID,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = _get_owned_expense(db, expense_id, current_user.id)

    updates = payload.model_dump(exclude_unset=True)
    if "category_id" in updates:
        _validate_category(db, current_user.id, updates["category_id"])
        # A manual category change counts as a user correction.
        if updates["category_id"] != expense.category_id:
            expense.user_corrected = True

    for field, value in updates.items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)

    if expense.category_id is not None:
        check_budget_threshold(current_user.id, expense.category_id, db)

    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = _get_owned_expense(db, expense_id, current_user.id)
    db.delete(expense)
    db.commit()
    return None
