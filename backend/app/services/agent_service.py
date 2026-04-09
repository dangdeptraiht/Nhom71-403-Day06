import json
import asyncio
import logging
from typing import AsyncGenerator, List, Dict, Optional
from pydantic import BaseModel, Field
from .llm_client import get_llm_client
from .semantic_scholar import search_papers
from .llm_extractor import extract_dimensions_from_papers, PaperExtraction
from .session_service import SessionManager

logger = logging.getLogger(__name__)
client = get_llm_client()

# ---- AGENT SCHEMAS (TOOLS & DECISIONS) ----

class SearchAction(BaseModel):
    query: str = Field(..., description="The highly optimized search query.")
    limit: int = Field(default=15, description="Number of papers to find.")
    strategy: str = Field(..., description="Reasoning for this search (verification vs exploration).")

class GuardrailResponse(BaseModel):
    is_meaningful: bool = Field(..., description="Is the user query a valid research request?")
    reason: str = Field(..., description="Reasoning for blocking or allowing.")

class IntentAnalysis(BaseModel):
    intent: str = Field(..., description="Must be either 'CHAT' (greeting, social, general question) or 'RESEARCH' (scientific search, synthesis, verification).")
    explanation: str = Field(..., description="Why this intent was chosen.")

# ---- CORE AGENT SERVICE ----

class ResearchAgent:
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id
        self.current_matrix = []

    async def run_agent_loop(self, user_input: str) -> AsyncGenerator[str, None]:
        """
        Vòng lặp ReAct của Agent: Suy nghĩ -> Hành động -> Quan sát -> Phản hồi.
        Hệ thống tự động quyết định chiến lược (Research vs Verify).
        """
        
        # 1. INTENT & GUARDRAIL
        try:
            intent_check = await client.chat.completions.create(
                model="gpt-4o-mini",
                response_model=IntentAnalysis,
                messages=[
                    {"role": "system", "content": "Analyze if the user wants to chat/socialize (CHAT) or perform an academic research task (RESEARCH)."},
                    {"role": "user", "content": user_input}
                ]
            )

            if intent_check.intent == "CHAT":
                chat_response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are Nexus AI, a helpful and human-like academic research partner. Answer directly and naturally. Keep it concise but professional."},
                        {"role": "user", "content": user_input}
                    ]
                )
                chat_text = chat_response.choices[0].message.content
                yield self._format_event("text", chat_text)
                if self.session_id:
                    SessionManager.add_message(self.session_id, "assistant", "text", chat_text)
                return
        except Exception as e:
            logger.error(f"Intent check failed: {e}")
            # Fallback to research if intent check fails
            pass

        # IF RESEARCH, INITIALIZE ReAct
        msg = "Đang thẩm định yêu cầu nghiên cứu..."
        yield self._format_event("thought", msg)
        
        try:
            assessment = await client.chat.completions.create(
                model="gpt-4o-mini",
                response_model=GuardrailResponse,
                messages=[
                    {"role": "system", "content": "Assess if the input is a meaningful research request. You handle both general exploration and specific claim verification. SOCIAL DIALOGUE is handled elsewhere, so reject only pure gibberish."},
                    {"role": "user", "content": f"<data>{user_input}</data>"}
                ]
            )
        except Exception as e:
            logger.error(f"Guardrail failed: {e}")
            yield self._format_event("error", "Lỗi thẩm định yêu cầu. Vui lòng thử lại sau.")
            return
        
        if not assessment.is_meaningful:
            err_msg = f"Cảnh báo: {assessment.reason}. Vui lòng nhập yêu cầu nghiên cứu cụ thể hơn."
            yield self._format_event("error", err_msg)
            if self.session_id:
                SessionManager.add_message(self.session_id, "assistant", "text", err_msg)
            return

        # 2. STRATEGY PLANNING
        yield self._format_event("thought", "Lập chiến lược tiếp cận (Research & Verify Hybrid)...")
        
        search_plan = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_model=SearchAction,
            messages=[
                {"role": "system", "content": "You are a lead researcher. Decide if the user needs a broad exploration or a targeted verification of a claim. Generate an optimized search query."},
                {"role": "user", "content": f"User Input: {user_input}"}
            ]
        )
        
        # 3. EXECUTE SEARCH
        yield self._format_event("thought", f"Chiến lược: {search_plan.strategy}. Đang truy xuất dữ liệu...")
        try:
            papers = await search_papers(search_plan.query, search_plan.limit)
        except Exception as e:
            logger.error(f"Search tool failed: {e}")
            yield self._format_event("error", "Lỗi kết nối kho dữ liệu học thuật.")
            return

        if not papers:
            no_data = "Không tìm thấy tài liệu phù hợp để chứng minh hoặc bác bỏ yêu cầu này."
            yield self._format_event("text", no_data)
            if self.session_id:
                SessionManager.add_message(self.session_id, "assistant", "text", no_data)
            return

        papers_msg = f"Đã tìm thấy {len(papers)} tài liệu liên quan thông qua từ khóa: {search_plan.query}"
        yield self._format_event("papers", {"query": search_plan.query, "results": papers})
        if self.session_id:
            SessionManager.add_message(self.session_id, "assistant", "papers", papers_msg, {"papers": papers})

        # 4. STREAMING EXTRACTION
        yield self._format_event("thought", "Bắt đầu trích xuất ma trận so sánh đa chiều thực tế...")
        
        processed_count = 0
        for i, paper in enumerate(papers[:12]):
            try:
                extract_result = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_model=PaperExtraction,
                    messages=[
                        {"role": "system", "content": "Extract core findings. If the session involves verification, look for specific evidence quotes. Focus on high precision."},
                        {"role": "user", "content": f"Context: {user_input}\nPaper: {paper['title']}\nAbstract: {paper['abstract']}"}
                    ]
                )
                final_row = extract_result.model_dump()
                final_row["id"] = paper["id"]
                
                # Enrich with metadata for tooltips
                final_row["abstract"] = paper.get("abstract", "")
                final_row["authors"] = paper.get("authors", "")
                final_row["year"] = paper.get("year", "")
                final_row["venue"] = paper.get("venue", "")
                
                self.current_matrix.append(final_row)
                yield self._format_event("matrix_row", final_row)
                processed_count += 1
                
                # Update session matrix incrementally
                if self.session_id:
                    SessionManager.update_session(self.session_id, matrix=self.current_matrix)
                    
            except Exception as e:
                logger.error(f"Failed to extract paper {paper['id']}: {e}")
                continue

        # 5. PROFESSIONAL SUMMARY CONCLUSION
        try:
            summary_response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a professional research partner. Write a short, natural summary in Vietnamese confirming that you have finished researching and filtering the top papers for the user's specific query. Use the format: 'Tôi đã nghiên cứu và lọc cho bạn top [X] nghiên cứu liên quan đến [User Input]...'"},
                    {"role": "user", "content": f"Query: {user_input}. Processed: {processed_count} papers."}
                ]
            )
            final_summary = summary_response.choices[0].message.content
        except:
            final_summary = f"Tôi đã nghiên cứu và lọc cho bạn top {processed_count} nghiên cứu liên quan đến yêu cầu của bạn. Ma trận tổng hợp đã sẵn sàng."

        yield self._format_event("text", final_summary)
        if self.session_id:
            SessionManager.add_message(self.session_id, "assistant", "text", final_summary)

    def _format_event(self, event_type: str, data: any) -> str:
        """Helper to format SSE data string."""
        return f"data: {json.dumps({'type': event_type, 'payload': data})}\n\n"
