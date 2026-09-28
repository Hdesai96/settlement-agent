# Settlement Agent

Settlement Agent is a consumer-facing web application that helps people discover class-action settlements they may qualify for, understand why they match, and prepare the information needed to submit a claim.

## MVP goal

The first working version will:

1. Show verified, currently open settlements.
2. Ask users a small number of eligibility questions.
3. Match users against structured settlement rules.
4. Explain why a user may qualify.
5. Show deadlines, payout ranges, proof requirements, and official claim sources.
6. Let users start preparing a claim package.

The MVP does **not** automatically attest, sign, or submit legal certifications on behalf of users.

## Architecture

Frontend: Next.js + React + TypeScript  
Backend: FastAPI + Python  
Database: PostgreSQL  
Matching: Deterministic rule engine  
AI: Used for extraction/explanation, not for final eligibility decisions

## Repository structure

```
settlement-agent/
  frontend/
  backend/
  data/
  docs/
```

## Safety principles

Eligibility decisions must be traceable to structured rules derived from official settlement sources.

The product should never fabricate missing user information.

Any required certification, attestation, or signature must be shown to the user for review and confirmation.

## Current status

Initial application scaffold in progress.
