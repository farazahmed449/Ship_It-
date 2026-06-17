"""SQLAlchemy ORM models for the student finance app.

All primary keys are UUIDs. Monetary values use Float for simplicity.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)


class Income(Base):
    __tablename__ = "income"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    source = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    categories = relationship(
        "Category", back_populates="budget", cascade="all, delete-orphan"
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    allocated_amount = Column(Float, nullable=False, default=0.0)
    color = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    budget = relationship("Budget", back_populates="categories")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    date = Column(Date, nullable=False, default=lambda: _now().date())
    ai_suggested_category = Column(String, nullable=True)
    user_corrected = Column(Boolean, nullable=False, default=False)
    input_method = Column(String, nullable=True)  # e.g. "manual", "natural_language"
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    billing_date = Column(Integer, nullable=False)  # day of month (1-31)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)


class SavingGoal(Base):
    __tablename__ = "saving_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    saved_amount = Column(Float, nullable=False, default=0.0)
    deadline = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="active")  # active, completed, abandoned
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    type = Column(String, nullable=False)  # e.g. "approaching_limit", "limit_exceeded"
    message = Column(String, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    projected_spending = Column(Float, nullable=False, default=0.0)
    projected_balance = Column(Float, nullable=False, default=0.0)
    generated_at = Column(DateTime(timezone=True), default=_now, nullable=False)


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_income = Column(Float, nullable=False, default=0.0)
    total_spent = Column(Float, nullable=False, default=0.0)
    total_saved = Column(Float, nullable=False, default=0.0)
    ai_summary = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), default=_now, nullable=False)
