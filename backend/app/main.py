from fastapi import FastAPI

app = FastAPI(
    title="Settlement Agent API",
    version="0.1.0",
    description="API for verified settlement discovery and deterministic eligibility matching.",
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "settlement-agent-api"}
