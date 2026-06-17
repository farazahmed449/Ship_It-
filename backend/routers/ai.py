"""AI routes (Groq-backed). All responses are labelled suggestions only."""
from fastapi import APIRouter, Depends

from deps import get_current_user
from models import User
from schemas import (
    AI_DISCLAIMER,
    CategorizeRequest,
    CategorizeResponse,
    ParseRequest,
    ParseResponse,
    SuggestionsRequest,
    SuggestionsResponse,
)
from services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/categorize", response_model=CategorizeResponse)
def categorize(
    payload: CategorizeRequest,
    current_user: User = Depends(get_current_user),
):
    category = ai_service.categorize_expense(payload.description)
    return CategorizeResponse(suggested_category=category, disclaimer=AI_DISCLAIMER)


@router.post("/parse", response_model=ParseResponse)
def parse(
    payload: ParseRequest,
    current_user: User = Depends(get_current_user),
):
    parsed = ai_service.parse_natural_language(payload.text)
    return ParseResponse(
        amount=parsed["amount"],
        description=parsed["description"],
        date=parsed["date"],
        disclaimer=AI_DISCLAIMER,
    )


@router.post("/suggestions", response_model=SuggestionsResponse)
def suggestions(
    payload: SuggestionsRequest,
    current_user: User = Depends(get_current_user),
):
    tips = ai_service.generate_suggestions(payload.report_data)
    return SuggestionsResponse(suggestions=tips, disclaimer=AI_DISCLAIMER)
