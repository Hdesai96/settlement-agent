import json
import os
from pathlib import Path

from fastapi import HTTPException, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.discovery import DiscoveryCandidate, load_candidates, save_candidate
from app.matcher import match_settlement
from app.models import Settlement, UserProfile

app = FastAPI(
    title="Settlement Agent API",
    version="0.1.0",
    description="API for verified settlement discovery and deterministic eligibility matching.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "settlements.sample.json"


def load_settlements() -> list[Settlement]:
    with DATA_PATH.open("r", encoding="utf-8") as file:
        records = json.load(file)
    return [Settlement.model_validate(record) for record in records]


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "settlement-agent-api"}


@app.get("/settlements", response_model=list[Settlement])
def list_settlements():
    return load_settlements()


@app.post("/match")
def match_profile(profile: UserProfile):
    settlements = load_settlements()
    results = [match_settlement(settlement, profile) for settlement in settlements]
    return {"matches": results}


@app.get("/settlements/{settlement_id}", response_model=Settlement)
def get_settlement(settlement_id: str):
    for settlement in load_settlements():
        if settlement.id == settlement_id:
            return settlement
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Settlement not found")


@app.get("/discovery/candidates", response_model=list[DiscoveryCandidate])
def list_discovery_candidates():
    """Local prototype only: protect this route with admin authentication before deployment."""
    if os.getenv("ENABLE_LOCAL_REVIEW_API") != "1":
        raise HTTPException(status_code=404, detail="Review API disabled")
    return load_candidates()


@app.post("/discovery/candidates", status_code=201)
def add_discovery_candidate(candidate: DiscoveryCandidate):
    """Local prototype only: do not expose this unauthenticated route publicly."""
    if os.getenv("ENABLE_LOCAL_REVIEW_API") != "1":
        raise HTTPException(status_code=404, detail="Review API disabled")
    if not save_candidate(candidate):
        raise HTTPException(status_code=409, detail="Candidate already exists")
    return {"status": "queued", "id": candidate.id}
