"""Saving goal routes."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import SavingGoal, User
from schemas import SavingGoalCreate, SavingGoalOut, SavingGoalUpdate

router = APIRouter(prefix="/saving-goals", tags=["saving-goals"])


def _get_owned(db: Session, goal_id: UUID, user_id) -> SavingGoal:
    goal = (
        db.query(SavingGoal)
        .filter(SavingGoal.id == goal_id, SavingGoal.user_id == user_id)
        .first()
    )
    if goal is None:
        raise HTTPException(status_code=404, detail="Saving goal not found.")
    return goal


@router.post("", response_model=SavingGoalOut, status_code=201)
def create_goal(
    payload: SavingGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = SavingGoal(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("", response_model=List[SavingGoalOut])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(SavingGoal)
        .filter(SavingGoal.user_id == current_user.id)
        .all()
    )


@router.put("/{goal_id}", response_model=SavingGoalOut)
def update_goal(
    goal_id: UUID,
    payload: SavingGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = _get_owned(db, goal_id, current_user.id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(goal, field, value)

    # Auto-complete the goal when the target is reached.
    if goal.saved_amount >= goal.target_amount and goal.status == "active":
        goal.status = "completed"

    db.commit()
    db.refresh(goal)
    return goal
