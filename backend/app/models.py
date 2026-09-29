from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class EligibilityRule(BaseModel):
    field: str
    operator: str
    value: str | int | float | bool | list[str]
    question: Optional[str] = None


class Settlement(BaseModel):
    id: str
    name: str
    company: str
    summary: str
    claim_deadline: date
    payout_min: Optional[float] = None
    payout_max: Optional[float] = None
    benefit_summary: Optional[str] = None
    proof_required: bool
    official_source_url: HttpUrl
    official_claim_url: Optional[HttpUrl] = None
    eligibility_rules: List[EligibilityRule] = Field(default_factory=list)


class UserProfile(BaseModel):
    state: Optional[str] = None
    brands_used: List[str] = Field(default_factory=list)
    answers: dict[str, str | int | float | bool | list[str]] = Field(default_factory=dict)


class MatchResult(BaseModel):
    settlement_id: str
    settlement_name: str
    status: str
    reasons: List[str]
    missing_fields: List[str]
