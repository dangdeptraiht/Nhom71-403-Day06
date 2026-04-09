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
    strategy: str = Field(
        ..., description="Reasoning for this search (verification vs exploration)."
    )


class GuardrailResponse(BaseModel):
    is_meaningful: bool = Field(
        ..., description="Is the user query a valid research request?"
    )
    reason: str = Field(..., description="Reasoning for blocking or allowing.")


class IntentAnalysis(BaseModel):
    intent: str = Field(
        ...,
        description="Must be one of: 'CHAT' (social), 'RESEARCH' (standard academic exploration), or 'VERIFY' (citation checking, plagiarism verification, or source-finding for a specific text).",
    )
    explanation: str = Field(
        ..., description="Why this intent was chosen (Human-like reasoning)."
    )


class ChatResponse(BaseModel):
    message: str = Field(description="The conversational response to the user.")


# ---- CORE AGENT SERVICE ----


class ResearchAgent:
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id
        self.current_matrix = []

    async def _determine_intent(self, user_input: str) -> str:
        """Sử dụng LLM để phân loại yêu cầu của người dùng làm Router."""
        try:
            intent_check = await client.chat.completions.create(
                model="gpt-4o-mini",
                response_model=IntentAnalysis,
                messages=[
                    {
                        "role": "system",
                        "content": """Bạn là một Chuyên gia Điều phối Nghiên cứu (Research Orchestrator). 
Nhiệm vụ của bạn là phân loại yêu cầu người dùng vào 3 nhóm chính:

1. CHAT: Các lời chào hỏi, làm quen, hoặc câu hỏi phi kỹ thuật về bản thân AI.
2. RESEARCH: Khi người dùng yêu cầu tìm kiếm thông tin mới, tổng hợp tài liệu về một chủ đề (Ví dụ: "Tìm paper về AI", "Nghiên cứu về Graphene").
3. VERIFY: Khi người dùng dán một đoạn văn bản dài, một đoạn trích dẫn, hoặc một khẳng định kỹ thuật và muốn kiểm chứng xem nó có đúng không, hoặc tìm nguồn trích dẫn cho đoạn đó. 

QUY TẮC ĐẶC BIỆT: 
- Nếu người dùng gửi một ĐOẠN VĂN BẢN DÀI (mô tả tính chất, kết quả nghiên cứu) mà không đi kèm câu hỏi cụ thể, hãy coi đó là yêu cầu VERIFY (Xác thực trích dẫn).
- Luôn trả lời phần giải thích bằng tiếng Việt.""",
                    },
                    {"role": "user", "content": user_input},
                ],
            )
            return intent_check.intent
        except Exception as e:
            logger.error(f"Intent check failed: {e}")
            return "RESEARCH"  # Mặc định fallback về Research để giữ an toàn

    async def _execute_chat(self, user_input: str) -> AsyncGenerator[str, None]:
        """Worker 3: Xử lý giao tiếp xã giao thông thường."""
        chat_response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_model=ChatResponse,
            messages=[
                {
                    "role": "system",
                    "content": "Bạn là Nexus AI, một cộng sự nghiên cứu thông minh và thân thiện. Hãy trả lời như một người đồng nghiệp: chân thành, chuyên nghiệp nhưng không quá máy móc. Sử dụng 'Tôi' và 'Bạn' một cách tự nhiên. Hãy khơi gợi thêm sự tò mò về nghiên cứu nếu có thể.",
                },
                {"role": "user", "content": user_input},
            ],
        )
        chat_text = chat_response.message
        yield self._format_event("text", chat_text)
        if self.session_id:
            SessionManager.add_message(self.session_id, "assistant", "text", chat_text)

    async def _execute_verification(self, user_input: str) -> AsyncGenerator[str, None]:
        """Worker 2: Xác thực nguồn trích dẫn từ văn bản."""
        yield self._format_event(
            "thought",
            "Tôi đang tiếp nhận đoạn văn bản của bạn. Để tôi đối soát xem thông tin này có thể được trích dẫn từ nguồn nào nhé...",
        )

        from .llm_extractor import (
            segment_text_into_claims,
            verify_claim,
            extract_search_keywords,
        )

        # Segment text for precision
        segments = await segment_text_into_claims(user_input)
        yield self._format_event(
            "thought",
            f"Tôi đã chia đoạn văn của bạn thành {len(segments)} luận điểm chính để đối soát chính xác hơn...",
        )

        # Generate master search keywords
        keywords = await extract_search_keywords(user_input)
        yield self._format_event(
            "thought", f"Đang dò tìm các nguồn học thuật liên quan đến: {keywords}..."
        )
        sources = await search_papers(keywords, limit=5)

        if not sources:
            no_cite = "Tôi đã quét qua các thư viện học thuật nhưng chưa tìm thấy bài báo nào khớp với nội dung này. Bạn có thể thử cung cấp thêm ngữ cảnh hoặc từ khóa chuyên sâu hơn không?"
            yield self._format_event("text", no_cite)
            return

        # Deep Cross-Verification
        yield self._format_event(
            "thought",
            "Đã tìm thấy các nguồn tiềm năng. Tôi đang tiến hành kiểm chứng chéo từng luận điểm...",
        )

        verification_data = []
        has_matches = False

        for seg in segments[:4]:  # Limit for performance
            seg_matches = []
            for paper in sources:
                v = await verify_claim(seg.text, paper["abstract"])
                if v.status == "SUPPORTED":
                    seg_matches.append(
                        {
                            "id": paper["id"],
                            "title": paper["title"],
                            "abstract": paper["abstract"],
                        }
                    )

            if seg_matches:
                has_matches = True
            
            verification_data.append({
                "claim": seg.text,
                "status": "SUPPORTED" if seg_matches else "UNVERIFIED",
                "sources": seg_matches
            })

        conclusion = "Tôi đã tìm thấy các nguồn khớp nhất phía trên. Bạn có thể nhấn vào tiêu đề hoặc di chuột để xem chi tiết bài báo nhé!" if has_matches else "Tôi đã kiểm tra kỹ nhưng không tìm thấy đoạn văn bản nào trùng lặp trực tiếp. Đây là một tín hiệu tốt cho tính nguyên bản của văn bản bạn viết!"
        
        yield self._format_event("verify_result", {
            "title": "Báo cáo Đối soát Trích dẫn",
            "segments": verification_data,
            "conclusion": conclusion
        })

        if self.session_id:
            SessionManager.add_message(self.session_id, "assistant", "verify_result", "Dữ liệu xác thực trích dẫn.", {"verifyData": verification_data})

    async def _execute_synthesis(self, user_input: str) -> AsyncGenerator[str, None]:
        """Worker 1: Khai phá dữ liệu và xây dựng ma trận (Tool 1 + Tool 2)."""
        yield self._format_event(
            "thought",
            "Để tôi xem qua yêu cầu này của bạn nhé. Đang thẩm định tính khả thi...",
        )

        try:
            assessment = await client.chat.completions.create(
                model="gpt-4o-mini",
                response_model=GuardrailResponse,
                messages=[
                    {
                        "role": "system",
                        "content": "Bạn là một chuyên gia thẩm định nghiên cứu học thuật. Hãy đánh giá xem Input có đủ thông tin để bắt đầu tìm kiếm không. Nếu quá chung chung hoặc vô nghĩa, hãy giải thích bằng tiếng Việt như một người hướng dẫn tại sao chúng ta cần thêm thông tin cụ thể.",
                    },
                    {"role": "user", "content": f"<data>{user_input}</data>"},
                ],
            )
        except Exception as e:
            logger.error(f"Guardrail failed: {e}")
            yield self._format_event(
                "error",
                "Có lỗi xảy ra khi tôi đang phân tích yêu cầu. Bạn thử lại giúp tôi nhé!",
            )
            return

        if not assessment.is_meaningful:
            err_msg = f"Tôi nghĩ chúng ta cần cụ thể hơn một chút: {assessment.reason}. Bạn có thể bổ sung thêm chi tiết không?"
            yield self._format_event("text", err_msg)
            if self.session_id:
                SessionManager.add_message(
                    self.session_id, "assistant", "text", err_msg
                )
            return

        yield self._format_event(
            "thought",
            "Tôi đang lên chiến lược tìm kiếm. Có lẽ kết hợp giữa tìm kiếm rộng và xác thực các nguồn trích dẫn chéo sẽ hiệu quả nhất...",
        )

        search_plan = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_model=SearchAction,
            messages=[
                {
                    "role": "system",
                    "content": "Bạn là trưởng nhóm nghiên cứu. Hãy quyết định chiến lược (thăm dò rộng hay xác thực mục tiêu) và tạo từ khóa tối ưu. Hãy viết phần 'strategy' hoàn toàn bằng tiếng Việt để giải thích hướng tiếp cận cho đồng nghiệp.",
                },
                {"role": "user", "content": f"Yêu cầu: {user_input}"},
            ],
        )

        yield self._format_event(
            "thought",
            f"Ý tưởng của tôi: {search_plan.strategy}. Đang kết nối với thư viện Semantic Scholar để lọc tài liệu cho bạn...",
        )
        try:
            papers = await search_papers(search_plan.query, search_plan.limit)
        except Exception as e:
            logger.error(f"Search tool failed: {e}")
            yield self._format_event(
                "error",
                "Thư viện Semantic Scholar đang phản hồi chậm quá. Có lẽ tôi nên thử lại sau một lát.",
            )
            return

        if not papers:
            no_data = "Tôi đã tìm khắp các nguồn dữ liệu nhưng chưa thấy tài liệu nào khớp hoàn toàn với ý tưởng này. Bạn có muốn tôi mở rộng sang các lĩnh vực lân cận không?"
            yield self._format_event("text", no_data)
            if self.session_id:
                SessionManager.add_message(
                    self.session_id, "assistant", "text", no_data
                )
            return

        papers_msg = f"Tôi đã lọc được {len(papers)} nghiên cứu tiềm năng dựa trên từ khóa chúng ta đã chọn: {search_plan.query}"
        yield self._format_event(
            "papers", {"query": search_plan.query, "results": papers}
        )
        if self.session_id:
            SessionManager.add_message(
                self.session_id, "assistant", "papers", papers_msg, {"papers": papers}
            )

        yield self._format_event(
            "thought",
            "Tôi đang bắt đầu đọc lướt qua các Abstracts để trích xuất những luận điểm đắt giá nhất vào bảng ma trận cho bạn...",
        )

        processed_count = 0
        for i, paper in enumerate(papers[:12]):
            try:
                extract_result = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_model=PaperExtraction,
                    messages=[
                        {
                            "role": "system",
                            "content": "Bạn là một nhà phân tích dữ liệu nghiên cứu bài bản. Trích xuất methodology (phương pháp), key findings (kết quả chính) và source quote. Mọi nội dung phân tích phải được viết bằng tiếng Việt tự nhiên, chuyên nghiệp.",
                        },
                        {
                            "role": "user",
                            "content": f"Yêu cầu: {user_input}\nPaper: {paper['title']}\nAbstract: {paper['abstract']}",
                        },
                    ],
                )
                final_row = extract_result.model_dump()
                final_row["id"] = paper["id"]
                final_row["abstract"] = paper.get("abstract", "")
                final_row["authors"] = paper.get("authors", "")
                final_row["year"] = paper.get("year", "")
                final_row["venue"] = paper.get("venue", "")

                self.current_matrix.append(final_row)
                yield self._format_event("matrix_row", final_row)
                processed_count += 1

                if self.session_id:
                    SessionManager.update_session(
                        self.session_id, matrix=self.current_matrix
                    )

            except Exception as e:
                logger.error(f"Failed to extract paper {paper['id']}: {e}")
                continue

        try:
            summary_response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "Bạn là một cộng sự nghiên cứu thực thụ. Hãy viết một đoạn tổng kết tự nhiên bằng tiếng Việt (Tôi/Bạn). Đoạn văn bao gồm: 1. Thông báo đã lọc xong [X] bài báo. 2. Một 'Nhận định cá nhân' (Peer Insight) ngắn gọn về kết quả. 3. Đề xuất 3-4 câu hỏi/hướng nghiên cứu tiếp theo để người dùng đào sâu thêm. Định dạng rõ ràng, chuyên nghiệp.",
                    },
                    {
                        "role": "user",
                        "content": f"Query: {user_input}. Processed: {processed_count} papers. Matrix data: {str(self.current_matrix[:3])}",
                    },
                ],
            )
            final_summary = summary_response.choices[0].message.content
        except:
            final_summary = f"Tôi đã lọc xong {processed_count} nghiên cứu cho bạn. Bạn có thể tương tác trực tiếp với bảng ma trận để xem chi tiết nhé!"

        yield self._format_event("text", final_summary)
        if self.session_id:
            SessionManager.add_message(
                self.session_id, "assistant", "text", final_summary
            )

    async def run_agent_loop(self, user_input: str, manual_mode: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        [ROUTER ENGINE] Đóng vai trò như não bộ Orchestrator. 
        Phân luồng yêu cầu xuống các Worker độc lập.
        """
        intent = "RESEARCH"
        if manual_mode:
            if manual_mode.lower() == "verify":
                intent = "VERIFY"
            elif manual_mode.lower() == "chat":
                intent = "CHAT"
            else:
                intent = "RESEARCH"
            logger.info(f"Manual Mode Override: {intent}")
        else:
            intent = await self._determine_intent(user_input)
            logger.info(f"Router Selected Intent: {intent}")
        
        if intent == "CHAT":
            async for event in self._execute_chat(user_input):
                yield event
        elif intent == "VERIFY":
            async for event in self._execute_verification(user_input):
                yield event
        else:
            # RESEARCH / SYNTHESIS
            async for event in self._execute_synthesis(user_input):
                yield event

    def _format_event(self, event_type: str, data: any) -> str:
        """Helper to format SSE data string."""
        return f"data: {json.dumps({'type': event_type, 'payload': data})}\n\n"
