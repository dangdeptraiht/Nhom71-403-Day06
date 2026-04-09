from pydantic import BaseModel, Field
from typing import List, Optional
import os
import json
from .llm_client import get_llm_client

client = get_llm_client()

DATA_DIR = os.path.join(os.path.dirname(__file__), "../../data")
SIGNALS_FILE = os.path.join(DATA_DIR, "learning_signals.json")

def _get_user_context() -> str:
    """
    Rút chắt lịch sử sửa nhãn từ file JSON để tiêm vào System Prompt (Data Flywheel).
    """
    if not os.path.exists(SIGNALS_FILE):
        return ""
    try:
        with open(SIGNALS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            corrections = data.get("corrections", [])
            if not corrections:
                return ""
            
            # Chỉ lấy 5 corrections gần nhất để tránh ngốn token
            context_summary = "\n--- ROLE MODEL / LEARNING CONTEXT ---\n"
            context_summary += "Previous corrections made by the user to improve accuracy:\n"
            for c in corrections[-5:]:
                context_summary += f"- Field '{c['field']}': Changed '{c['original_value']}' to '{c['corrected_value']}'\n"
            return context_summary
    except:
        return ""

# ---- PYDANTIC SCHEMAS CHO CẤU TRÚC EXTRACTION ----
class KeywordExtraction(BaseModel):
    query: str = Field(..., description="The highly optimized search query string containing 3 to 5 core keywords.")

class PaperExtraction(BaseModel):
    paper_title: str = Field(..., description="Tiêu đề bài báo")
    methodology: str = Field(default="N/A", description="Trích xuất chính xác tên phương pháp/mô hình được dùng. Nếu không có trả về N/A.")
    datasets: str = Field(default="N/A", description="Tên tập dữ liệu được dùng để huấn luyện/kiểm thử. Nếu không có trả về N/A.")
    key_findings: str = Field(default="N/A", description="Tóm tắt 1-2 câu về kết quả chính")
    limitations: str = Field(default="N/A", description="Hạn chế của nghiên cứu (nếu có nhắc đến)")
    source_quote: str = Field(default="", description="Trích dẫn chính xác 1 câu văn gốc nguyên bản từ abstract/text chứng minh cho các thông tin trên.")

class PaperExtractionList(BaseModel):
    extractions: List[PaperExtraction]

# ---- CLAIM VERIFICATION SCHEMAS ----
class ClaimVerification(BaseModel):
    status: str = Field(..., description="SUPPORTED, PARTIALLY SUPPORTED, or NOT SUPPORTED")
    evidence_quote: str = Field(..., description="Direct quote from the paper abstract as evidence")
    reasoning: str = Field(..., description="Brief explanation of the matching logic, highlighting nuances like correlation vs causation.")

# ---- CORE PROCESSING PIPELINE ----
async def extract_dimensions_from_papers(papers_context: List[dict]) -> PaperExtractionList:
    """
    Hệ thống AUGMENTATION: AI giúp tóm tắt cấu trúc rành mạch từ unstructured text.
    User dựa vào 'source_quote' để tự xác minh (Verify) AI không bịa đặt.
    """
    
    # 1. Format context để đưa vào LLM
    context_text = ""
    for idx, paper in enumerate(papers_context):
        context_text += f"\n--- PAPER {idx + 1} ---\n"
        context_text += f"Title: {paper.get('title')}\n"
        context_text += f"Abstract: {paper.get('abstract')}\n"

    user_feedback_context = _get_user_context()

    system_prompt = (
        "Bạn là một chuyên gia Trợ lý Nghiên cứu AI. Nhiệm vụ của bạn là trích xuất các chiều nghiên cứu cụ thể "
        "(Phương pháp, Tập dữ liệu, Kết quả chính, Hạn chế) từ các tóm tắt khoa học được cung cấp.\n\n"
        "QUY TẮC NGHIÊM NGẶT (Ưu tiên độ chính xác):\n"
        "1. KHÔNG ĐƯỢC BỊA ĐẶT. Nếu một thông tin không được nhắc đến rõ ràng, hãy ghi 'N/A'.\n"
        "2. CĂN CỨ: Cung cấp chính xác 1 câu văn dưới dạng 'source_quote' được sao chép nguyên văn (từng chữ một) từ văn bản gốc để chứng minh cho thông tin chiết xuất. Giữ nguyên ngôn ngữ gốc của câu trích dẫn này.\n"
        "3. NGÔN NGỮ: Mọi phần tóm tắt và giải thích (trừ câu trích dẫn gốc) phải được viết bằng tiếng Việt chuyên nghiệp.\n"
        "4. SỰ SÚC TÍCH: Tóm tắt các phát hiện thành các cụm từ rất ngắn gọn.\n"
        f"{user_feedback_context}"
    )

    # 2. Gọi OpenAI API qua Instructor để ép kiểu Pydantic
    result = await client.chat.completions.create(
        model="gpt-4o-mini", # Cost-effective cho abstract extraction
        response_model=PaperExtractionList,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Extract information from these papers:\n{context_text}"}
        ],
        temperature=0.0
    )
    
    return result

async def extract_search_keywords(description: str) -> str:
    """
    Biến đoạn Semantic Description của người dùng thành từ khoá tìm kiếm hàn lâm (Search String).
    """
    system_prompt = (
        "You are an expert academic librarian. The user will provide a long description or an abstract of a research topic. "
        "Your task is to extract the 3 to 5 most important core scientific concepts/keywords and output them as a single space-separated search query string. "
        "Do NOT include punctuation like commas. Optimize the keywords to find high quality academic papers on Semantic Scholar."
    )
    result = await client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=KeywordExtraction,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": description}
        ],
        temperature=0.0
    )
    return result.query

async def verify_claim(claim: str, abstract: str) -> ClaimVerification:
    """
    Kiểm tra một nhận định (claim) có khớp với Abstract bài báo hay không (Grounded Citation Checker).
    """
    system_prompt = (
        "Bạn là một chuyên gia kiểm chứng sự thật khoa học. Bạn sẽ được cung cấp một 'nhận định' (claim) và một 'tóm tắt' (abstract) bài báo.\n"
        "Đánh giá xem nhận định đó có được hỗ trợ bởi bản tóm tắt hay không.\n"
        "Quy tắc:\n"
        "1. Phân loại: SUPPORTED (khớp hoàn toàn/bằng chứng mạnh), PARTIALLY SUPPORTED (có bằng chứng nhưng thiếu chi tiết hoặc ngữ cảnh hơi khác), NOT SUPPORTED (không có bằng chứng hoặc mâu thuẫn).\n"
        "2. Độ chính xác: Phân biệt rõ ràng giữa hệ quả vs tương quan, và kết quả chung vs kết quả cụ thể.\n"
        "3. Ngôn ngữ: Phần giải trình (reasoning) phải được viết hoàn toàn bằng tiếng Việt.\n"
        "4. Căn cứ: Bạn BẮT BUỘC phải cung cấp một câu trích dẫn trực tiếp từ bản tóm tắt để hỗ trợ cho phán quyết của mình (giữ nguyên ngôn ngữ gốc của câu trích dẫn)."
    )
    result = await client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=ClaimVerification,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Claim: {claim}\n\nAbstract: {abstract}"}
        ],
        temperature=0.0
    )
    return result
class ClaimSegment(BaseModel):
    text: str = Field(..., description="A single factual claim or sentence from the input text.")
    importance: str = Field(..., description="HIGH, MEDIUM, LOW - priority for verification.")

class TextSegments(BaseModel):
    segments: List[ClaimSegment]

# ---- CORE PROCESSING PIPELINE ----
async def segment_text_into_claims(text: str) -> List[ClaimSegment]:
    """
    Tách đoạn văn bản của người dùng thành các luận điểm nhỏ để kiểm chứng.
    """
    system_prompt = (
        "Bạn là một chuyên gia ngôn ngữ học. Hãy chia văn bản được cung cấp thành các nhận định thực tế hoặc các câu riêng biệt "
        "có thể được kiểm chứng độc lập so với tài liệu học thuật. Loại bỏ các từ đệm hoặc các cụm từ giao tiếp đơn thuần. "
        "Đảm bảo các nhận định được giữ nguyên ý nghĩa gốc bằng tiếng Việt."
    )
    result = await client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=TextSegments,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ],
        temperature=0.0
    )
    return result.segments
