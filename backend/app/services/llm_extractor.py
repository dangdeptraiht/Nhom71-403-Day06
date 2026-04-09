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
        "You are an expert AI Research Assistant. Your task is to extract specified research dimensions "
        "(Methodology, Datasets, Key Findings, Limitations) from the provided scientific abstracts.\n\n"
        "STRICT RULES (Precision-First):\n"
        "1. DO NOT HALLUCINATE. If a dimension is not explicitly mentioned, write 'N/A'.\n"
        "2. GROUNDING: Provide exactly 1 sentence as a 'source_quote' directly copied (word-for-word) from the text to prove each extraction.\n"
        "3. CONCISENESS: Summarize the findings into a very short phrase.\n"
        "4. If you cannot find a direct quote for a claim, mark it as N/A.\n"
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
        "You are an expert scientific fact-checker. You will be given a 'claim' and a paper 'abstract'.\n"
        "Evaluate if the claim is supported by the abstract.\n"
        "Rules:\n"
        "1. Categories: SUPPORTED (exact match/strong evidence), PARTIALLY SUPPORTED (some evidence but missing nuances or slightly different context), NOT SUPPORTED (no evidence or contradiction).\n"
        "2. Precision: Distinguish between causation vs correlation, and general vs specific results.\n"
        "3. Grounding: You MUST provide a direct quote from the abstract to support your judgment."
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
