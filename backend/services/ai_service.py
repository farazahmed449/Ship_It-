"""AI helpers backed by the Groq API.

Every function here produces *suggestions only*. Callers are responsible for
attaching the disclaimer (see schemas.AI_DISCLAIMER) before returning data to
the client.
"""
import json
from datetime import date
from typing import Dict, List, Optional

from fastapi import HTTPException, status

from config import settings

try:  # groq is optional at import-time so the app still boots without a key
    from groq import Groq
except Exception:  # pragma: no cover
    Groq = None


def _client() -> "Groq":
    """Return a configured Groq client or raise a 503 if unavailable."""
    if Groq is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Groq SDK is not installed.",
        )
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GROQ_API_KEY is not configured.",
        )
    return Groq(api_key=settings.GROQ_API_KEY)


def _chat(messages: List[dict], json_mode: bool = False) -> str:
    """Send a chat completion request and return the message content."""
    client = _client()
    kwargs = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": 0.2,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        completion = client.chat.completions.create(**kwargs)
        return completion.choices[0].message.content or ""
    except HTTPException:
        raise
    except Exception as exc:  # network / API errors
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI request failed: {exc}",
        )


def categorize_expense(description: str) -> str:
    """Suggest a single budget category name for a free-text expense description."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a budgeting assistant for students. Given an expense "
                "description, reply with ONE short category name only (e.g. "
                "Food, Transport, Rent, Entertainment, Education, Health, "
                "Shopping, Utilities, Other). Reply with the category word only."
            ),
        },
        {"role": "user", "content": description},
    ]
    result = _chat(messages).strip()
    # Keep only the first line/word-ish to stay robust.
    return result.splitlines()[0].strip().strip(".") or "Other"


def parse_natural_language(text: str) -> Dict[str, Optional[object]]:
    """Parse a sentence like 'spent 200 on pizza last night' into structured data."""
    today = date.today().isoformat()
    messages = [
        {
            "role": "system",
            "content": (
                "You extract structured expense data from a sentence. "
                f"Today's date is {today}. Respond ONLY with a JSON object with "
                'keys: "amount" (number), "description" (string), and "date" '
                '(ISO format YYYY-MM-DD). If the date is implied (e.g. "last '
                'night", "yesterday"), resolve it relative to today. If unknown, '
                "use today's date."
            ),
        },
        {"role": "user", "content": text},
    ]
    raw = _chat(messages, json_mode=True)
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an unparseable response.",
        )

    parsed_date: Optional[date] = None
    raw_date = data.get("date")
    if raw_date:
        try:
            parsed_date = date.fromisoformat(str(raw_date))
        except ValueError:
            parsed_date = None

    amount = data.get("amount")
    try:
        amount = float(amount) if amount is not None else None
    except (TypeError, ValueError):
        amount = None

    return {
        "amount": amount,
        "description": data.get("description"),
        "date": parsed_date or date.today(),
    }


def generate_suggestions(report_data: Dict) -> List[str]:
    """Return a list of short saving tips based on a monthly report payload."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a friendly budgeting assistant for students. Given a "
                "JSON summary of a month's finances, give 3-5 short, practical "
                "money-saving suggestions. Respond ONLY with a JSON object of "
                'the form {"suggestions": ["tip 1", "tip 2", ...]}. Keep each '
                "tip under 25 words. These are suggestions, not financial advice."
            ),
        },
        {"role": "user", "content": json.dumps(report_data, default=str)},
    ]
    raw = _chat(messages, json_mode=True)
    try:
        data = json.loads(raw)
        suggestions = data.get("suggestions", [])
        if isinstance(suggestions, list):
            return [str(s) for s in suggestions]
    except (json.JSONDecodeError, TypeError):
        pass
    return ["Unable to generate suggestions at this time."]
