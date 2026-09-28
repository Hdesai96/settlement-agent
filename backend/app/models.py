from datetime import date
from typing import List, Optional
from pydantic import BaseModel, HttpUrl


class EligibilityRule(BaseModel):
    field: str
    operator: str
    value: str | int | float | bool | list[str]


class Settlement(BaseModel):
    id: str
    name: str
    company: str
    summary: str
    claim_deadline: date
    payout_min: Optional[float] = None
    payout_max: Optional[float] = None
    proof_required: bool
    official_source_url: HttpUrl
    official_claim_url: Optional[HttpUrl] = None
    eligibility_rules: List[EligibilityRule] = []


class UserProfile(BaseModel):
    state: Optional[str] = None
    brands_used: List[str] = []
    answers: dict[str, str | int | float | bool | list[str]] = {}


class MatchResult(BaseModel):
    settlement_id: str
    settlement_name: str
    status: str
    reasons: List[str]
    missing_fields: List[str]
