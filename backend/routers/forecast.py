"""Forecast routes."""
from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import User
from schemas import ForecastOut
from services.forecast_service import calculate_forecast

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/{month}/{year}", response_model=ForecastOut)
def get_forecast(
    month: int = Path(..., ge=1, le=12),
    year: int = Path(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return calculate_forecast(current_user.id, month, year, db)
