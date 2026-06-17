"""Budget threshold alerting."""
from typing import Optional
from uuid import UUID

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from models import Alert, Budget, Category, Expense

# Thresholds (as a fraction of the category's allocated amount).
WARN_THRESHOLD = 0.8
EXCEED_THRESHOLD = 1.0


def _spent_in_category(db: Session, user_id, category_id, month: int, year: int) -> float:
    total = (
        db.query(func.coalesce(func.sum(Expense.amount), 0.0))
        .filter(
            Expense.user_id == user_id,
            Expense.category_id == category_id,
            extract("month", Expense.date) == month,
            extract("year", Expense.date) == year,
        )
        .scalar()
    )
    return float(total or 0.0)


def _has_unread_alert(db: Session, user_id, category_id, alert_type: str) -> bool:
    return (
        db.query(Alert)
        .filter(
            Alert.user_id == user_id,
            Alert.category_id == category_id,
            Alert.type == alert_type,
            Alert.is_read.is_(False),
        )
        .first()
        is not None
    )


def check_budget_threshold(user_id, category_id, db: Session) -> Optional[Alert]:
    """Create an alert if spending in a category crosses 80% or 100% of its budget.

    Returns the created Alert, or None if no new alert was needed.
    """
    if category_id is None:
        return None

    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == user_id)
        .first()
    )
    if category is None or not category.allocated_amount:
        return None

    budget = db.query(Budget).filter(Budget.id == category.budget_id).first()
    if budget is None:
        return None

    spent = _spent_in_category(db, user_id, category_id, budget.month, budget.year)
    ratio = spent / category.allocated_amount

    alert_type: Optional[str] = None
    message: Optional[str] = None
    if ratio >= EXCEED_THRESHOLD:
        alert_type = "limit_exceeded"
        message = (
            f"You have exceeded your '{category.name}' budget "
            f"({spent:.2f} of {category.allocated_amount:.2f})."
        )
    elif ratio >= WARN_THRESHOLD:
        alert_type = "approaching_limit"
        message = (
            f"You have used {ratio * 100:.0f}% of your '{category.name}' budget "
            f"({spent:.2f} of {category.allocated_amount:.2f})."
        )

    if alert_type is None:
        return None

    # Avoid spamming duplicate unread alerts of the same type.
    if _has_unread_alert(db, user_id, category_id, alert_type):
        return None

    alert = Alert(
        user_id=user_id,
        category_id=category_id,
        type=alert_type,
        message=message,
        is_read=False,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
