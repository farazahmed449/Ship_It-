"""Recurring expense routes."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import Category, RecurringExpense, User
from schemas import RecurringCreate, RecurringOut, RecurringUpdate

router = APIRouter(prefix="/recurring", tags=["recurring"])


def _validate_category(db: Session, user_id, category_id):
    if category_id is None:
        return
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == user_id)
        .first()
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")


def _get_owned(db: Session, item_id: UUID, user_id) -> RecurringExpense:
    item = (
        db.query(RecurringExpense)
        .filter(RecurringExpense.id == item_id, RecurringExpense.user_id == user_id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Recurring expense not found.")
    return item


@router.post("", response_model=RecurringOut, status_code=201)
def add_recurring(
    payload: RecurringCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _validate_category(db, current_user.id, payload.category_id)
    item = RecurringExpense(user_id=current_user.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=List[RecurringOut])
def list_recurring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(RecurringExpense)
        .filter(RecurringExpense.user_id == current_user.id)
        .all()
    )


@router.put("/{item_id}", response_model=RecurringOut)
def update_recurring(
    item_id: UUID,
    payload: RecurringUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = _get_owned(db, item_id, current_user.id)
    updates = payload.model_dump(exclude_unset=True)
    if "category_id" in updates:
        _validate_category(db, current_user.id, updates["category_id"])
    for field, value in updates.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = _get_owned(db, item_id, current_user.id)
    db.delete(item)
    db.commit()
    return None
