from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import json
import logging
from datetime import datetime
from ..services.semantic_scholar import search_papers as sc_search
from ..services.llm_extractor import extract_dimensions_from_papers, extract_search_keywords, verify_claim
from ..services.agent_service import ResearchAgent
from ..services.session_service import SessionManager

logger = logging.getLogger(__name__)
router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), "../../data")
SIGNALS_FILE = os.path.join(DATA_DIR, "learning_signals.json")

def _load_signals():
    if not os.path.exists(SIGNALS_FILE):
        return {"corrections": [], "feedbacks": []}
    with open(SIGNALS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_signals(data):
    with open(SIGNALS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

class SearchQuery(BaseModel):
    query: str
    limit: int = 10
    session_id: Optional[str] = None

class ExtractionRequest(BaseModel):
    papers: List[Dict] 
    session_id: Optional[str] = None

@router.post("/search")
async def search(req: SearchQuery):
    try:
        results = await sc_search(req.query, req.limit)
        return {"status": "success", "data": results}
    except Exception as e:
        print(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail="Error fetching papers from Semantic Scholar.")

class SemanticSearchQuery(BaseModel):
    description: str
    limit: int = 15

@router.post("/search/semantic")
async def semantic_search(req: SemanticSearchQuery):
    try:
        keywords = await extract_search_keywords(req.description)
        print(f"[SEMANTIC SEARCH] Generated Keywords: {keywords}")
        results = await sc_search(keywords, req.limit)
        return {
            "status": "success", 
            "data": {
                "keywords_used": keywords,
                "papers": results
            }
        }
    except Exception as e:
        print(f"Semantic Search Error: {e}")
        raise HTTPException(status_code=500, detail="Error performing semantic search.")

@router.post("/extract")
async def extract(req: ExtractionRequest):
    try:
        extraction = await extract_dimensions_from_papers(req.papers)
        return {"status": "success", "data": [e.model_dump() for e in extraction.extractions]}
    except Exception as e:
        print(f"Extract Error: {e}")
        raise HTTPException(status_code=500, detail="LLM Extraction Error. May be caused by rate limits.")

class CorrectionRequest(BaseModel):
    paper_id: str
    field: str
    original_value: str
    corrected_value: str

class FeedbackRequest(BaseModel):
    paper_id: str
    signal_type: str 

@router.post("/signals/correction")
async def log_correction(req: CorrectionRequest):
    data = _load_signals()
    data["corrections"].append({
        **req.model_dump(),
        "timestamp": datetime.utcnow().isoformat()
    })
    _save_signals(data)
    print(f"[LEARNING SIGNAL] Correction logged on '{req.field}' for '{req.paper_id}'")
    return {"status": "success"}

@router.post("/signals/feedback")
async def log_feedback(req: FeedbackRequest):
    data = _load_signals()
    data["feedbacks"].append({
        **req.model_dump(),
        "timestamp": datetime.utcnow().isoformat()
    })
    _save_signals(data)
    print(f"[LEARNING SIGNAL] Feedback '{req.signal_type}' logged for '{req.paper_id}'")
    return {"status": "success"}

class ClaimVerifyRequest(BaseModel):
    claim: str
    abstract: str

@router.post("/verify")
async def verify(req: ClaimVerifyRequest):
    try:
        verification = await verify_claim(req.claim, req.abstract)
        return {"status": "success", "data": verification.model_dump()}
    except Exception as e:
        print(f"Verify Error: {e}")
        raise HTTPException(status_code=500, detail="Error during claim verification pipeline.")

class AgentChatRequest(BaseModel):
    query: str
    mode: str = "research"
    session_id: Optional[str] = None

@router.get("/sessions")
async def list_sessions():
    return {"status": "success", "data": SessionManager.list_sessions()}

@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = SessionManager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "success", "data": session}

@router.post("/agent/chat")
async def agent_chat(req: AgentChatRequest):
    """
    Endpoint chính cho Autonomous Agent: Hỗ trợ Real-time Streaming (SSE).
    """
    logger.info(f"[CHAT ACTIVITY] User: {req.query}")
    
    # 1. Ensure Session Exists
    sid = req.session_id
    if not sid or not SessionManager.get_session(sid):
        sid = SessionManager.create_session(title=req.query[:40])
    
    # 2. Log User message
    SessionManager.add_message(sid, role="user", msg_type="text", content=req.query)
    
    agent = ResearchAgent(session_id=sid)
    
    return StreamingResponse(
        agent.run_agent_loop(req.query, manual_mode=req.mode),
        media_type="text/event-stream",
        headers={"X-Session-ID": sid}
    )

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    success = SessionManager.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found or could not be deleted")
    return {"status": "success", "message": f"Session {session_id} deleted"}

@router.delete("/sessions")
async def clear_history():
    count = SessionManager.clear_all_sessions()
    return {"status": "success", "message": f"Cleared {count} sessions"}
