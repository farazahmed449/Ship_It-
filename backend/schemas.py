"""Pydantic schemas (request/response validation) for all routers."""
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# Standard disclaimer attached to every AI-generated response.
AI_DISCLAIMER = (
    "These are AI-generated suggestions only and are not professional "
    "financial advice. Always use your own judgement before making "
    "financial decisions."
)


class ORMModel(BaseModel):
    """Base schema enabling ORM attribute reads (Pydantic v2)."""

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- auth
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: UUID
    name: str
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------- income
class IncomeCreate(BaseModel):
    amount: float = Field(..., gt=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    source: Optional[str] = None


class IncomeOut(ORMModel):
    id: UUID
    user_id: UUID
    amount: float
    month: int
    year: int
    source: Optional[str]
    created_at: datetime


# ---------------------------------------------------------------- budgets
class BudgetCreate(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    total_amount: float = Field(0.0, ge=0)


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    allocated_amount: float = Field(0.0, ge=0)
    color: Optional[str] = None


class CategoryOut(ORMModel):
    id: UUID
    budget_id: UUID
    user_id: UUID
    name: str
    allocated_amount: float
    color: Optional[str]
    created_at: datetime


class BudgetOut(ORMModel):
    id: UUID
    user_id: UUID
    month: int
    year: int
    total_amount: float
    created_at: datetime
    categories: List[CategoryOut] = []


# ---------------------------------------------------------------- expenses
class ExpenseCreate(BaseModel):
    category_id: Optional[UUID] = None
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    date: Optional[date] = None
    ai_suggested_category: Optional[str] = None
    user_corrected: bool = False
    input_method: Optional[str] = "manual"


class ExpenseUpdate(BaseModel):
    category_id: Optional[UUID] = None
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    date: Optional[date] = None
    user_corrected: Optional[bool] = None
    input_method: Optional[str] = None


class ExpenseOut(ORMModel):
    id: UUID
    user_id: UUID
    category_id: Optional[UUID]
    amount: float
    description: Optional[str]
    date: date
    ai_suggested_category: Optional[str]
    user_corrected: bool
    input_method: Optional[str]
    created_at: datetime


# ---------------------------------------------------------------- recurring
class RecurringCreate(BaseModel):
    category_id: Optional[UUID] = None
    name: str = Field(..., min_length=1, max_length=120)
    amount: float = Field(..., gt=0)
    billing_date: int = Field(..., ge=1, le=31)
    is_active: bool = True


class RecurringUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    billing_date: Optional[int] = Field(None, ge=1, le=31)
    is_active: Optional[bool] = None


class RecurringOut(ORMModel):
    id: UUID
    user_id: UUID
    category_id: Optional[UUID]
    name: str
    amount: float
    billing_date: int
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------- saving goals
class SavingGoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    target_amount: float = Field(..., gt=0)
    saved_amount: float = Field(0.0, ge=0)
    deadline: Optional[date] = None
    status: str = "active"


class SavingGoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = Field(None, gt=0)
    saved_amount: Optional[float] = Field(None, ge=0)
    deadline: Optional[date] = None
    status: Optional[str] = None


class SavingGoalOut(ORMModel):
    id: UUID
    user_id: UUID
    title: str
    target_amount: float
    saved_amount: float
    deadline: Optional[date]
    status: str
    created_at: datetime


# ---------------------------------------------------------------- alerts
class AlertOut(ORMModel):
    id: UUID
    user_id: UUID
    category_id: Optional[UUID]
    type: str
    message: str
    is_read: bool
    created_at: datetime


# ---------------------------------------------------------------- forecast
class ForecastOut(BaseModel):
    month: int
    year: int
    projected_spending: float
    projected_balance: float
    total_income: float
    spending_so_far: float
    recurring_total: float
    generated_at: datetime


# ---------------------------------------------------------------- reports
class ReportOut(BaseModel):
    month: int
    year: int
    total_income: float
    total_spent: float
    total_saved: float
    ai_summary: Optional[str] = None
    generated_at: Optional[datetime] = None


# ---------------------------------------------------------------- ai
class CategorizeRequest(BaseModel):
    description: str = Field(..., min_length=1)


class CategorizeResponse(BaseModel):
    suggested_category: str
    disclaimer: str = AI_DISCLAIMER


class ParseRequest(BaseModel):
    text: str = Field(..., min_length=1)


class ParseResponse(BaseModel):
    amount: Optional[float]
    description: Optional[str]
    date: Optional[date]
    disclaimer: str = AI_DISCLAIMER


class SuggestionsRequest(BaseModel):
    report_data: Dict[str, Any]


class SuggestionsResponse(BaseModel):
    suggestions: List[str]
    disclaimer: str = AI_DISCLAIMER
