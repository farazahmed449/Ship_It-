"""Income routes."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import Income, User
from schemas import IncomeCreate, IncomeOut

router = APIRouter(prefix="/income", tags=["income"])


@router.post("", response_model=IncomeOut, status_code=201)
def add_income(
    payload: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    income = Income(user_id=current_user.id, **payload.model_dump())
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.get("/{month}/{year}", response_model=List[IncomeOut])
def get_income(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Income)
        .filter(
            Income.user_id == current_user.id,
            Income.month == month,
            Income.year == year,
        )
        .all()
    )
