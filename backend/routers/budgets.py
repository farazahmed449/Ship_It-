"""Budget and category routes."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import Budget, Category, User
from schemas import BudgetCreate, BudgetOut, CategoryCreate, CategoryOut

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.post("", response_model=BudgetOut, status_code=201)
def create_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == payload.month,
            Budget.year == payload.year,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A budget already exists for this month and year.",
        )

    budget = Budget(user_id=current_user.id, **payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.get("/{month}/{year}", response_model=BudgetOut)
def get_budget(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == month,
            Budget.year == year,
        )
        .first()
    )
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found.")
    return budget


@router.post(
    "/{budget_id}/categories", response_model=CategoryOut, status_code=201
)
def add_category(
    budget_id: UUID,
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found.")

    category = Category(
        budget_id=budget.id,
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
