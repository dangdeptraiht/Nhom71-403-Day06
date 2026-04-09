# SPEC — ScholarAI v2: Deep Extraction & Claim Verification

**Nhóm:** Nhom71-LopE403
**Track:** ☒ VinUni-VinSchool
**Thành viên:** Ngô Văn Long · Nguyễn Phương Linh · Nguyễn Hải Đăng · Nguyễn Mạnh Phú

**Problem statement (1 câu):** Researcher VinUni khi viết literature review chỉ đọc sâu được ~20 papers do giới hạn thời gian, dễ bỏ sót công trình quan trọng và trích dẫn sai ngữ cảnh — AI có thể **mở rộng phễu quét lên 100 papers, trích xuất thông tin có cấu trúc (Method / Dataset / Result) thành bảng so sánh, và kiểm tra chéo xem trích dẫn trong bài viết có đúng với nội dung paper gốc không**, giúp researcher filter nhanh hơn và trích dẫn chính xác hơn.

---

## 1. AI Product Canvas

|  | Value | Trust | Feasibility |
|---|-------|-------|-------------|
| **Câu hỏi** | User nào? Pain gì? AI giải gì mà cách hiện tại không giải được? | Khi AI sai thì sao? User biết bằng cách nào? Sửa bằng cách nào? | Cost/request? Latency? Risk chính? |
| **Core** | **User:** Researcher + SV cao học VinUni (~300 người). **Pain:** chỉ đọc sâu ~20 papers/review, bỏ sót công trình quan trọng, trích dẫn sai ngữ cảnh ("râu ông nọ cắm cằm bà kia"). **Value:** AI mở rộng phễu quét lên 100 papers → trích xuất Method/Dataset/Result thành bảng → researcher filter 5 papers chất nhất để đọc sâu. Thêm: kiểm tra chéo trích dẫn trong bài viết vs nội dung paper gốc. | **Khi sai:** AI extract sai method hoặc result → researcher so sánh sai giữa các papers. **Biết sai:** mỗi cell trong bảng kèm trích dẫn nguyên văn câu gốc ("grounded generation") — user bấm xem câu gốc ngay. Nếu AI không tìm thấy info → ghi "N/A" thay vì bịa. **Sửa:** user chỉnh trực tiếp cell trong bảng, 1 click. | **Cost:** ~$0.02/paper (LLM extract). Search: Semantic Scholar API (free, 100 req/5 min). **Latency:** search <5s, extract bảng <20s cho 10 papers. **Risk:** hallucination khi extract, mù thông tin trong bảng/biểu đồ (API chỉ có text), rate limit. |
| **Then chốt** | **Augmentation** — AI mở rộng phễu + extract structured info, researcher vẫn đọc sâu + quyết định cuối. | **Precision-first** — extract sai nguy hiểm hơn bỏ sót. Ghi N/A thay vì bịa. | POC: **A (Prompt-based)** — web app + Semantic Scholar + LLM API. |

### Automation hay augmentation?

☒ **Augmentation** — AI quét rộng + extract structured info, researcher filter + đọc sâu + quyết định.

**Justify:** Cost of undetected error cực cao trong nghiên cứu (trích dẫn sai ngữ cảnh = academic integrity issue). AI không có đủ context để thay thế judgment của researcher. Cost of reject = 0.

### Learning signal

# AI Research Nexus - Technical Specification

AI Research Nexus is a premium, autonomous AI research workstation designed to harmonize complex academic discovery with an intuitive, human-like chat interface. It leverages a ReAct (Reasoning and Action) loop to synthesize research papers, verify claims, and build multidimensional comparison matrices in real-time.

## 1. Project Overview

The system is split into a high-performance Python/FastAPI backend and a modern TypeScript/Next.js frontend. It specializes in semantic research, taking an initial query and autonomously exploring the academic landscape using Semantic Scholar and OpenAI's GPT-4o models.

### Core Philosophy
- **Unified Flow**: Seamlessly transition between conversational exploration and deep workstation-centric synthesis.
- **Grounded Intelligence**: Every claim is verified against source abstracts with interactive citation cards.
- **Autonomous Reasoning**: The agent decides which tools to use and how to structure the resulting maxtrix.

## 2. Technical Stack

### Backend (Research Engine)
- **Framework**: FastAPI (Python 3.10+)
- **LLM Context**: OpenAI GPT-4o-mini (Extraction) & GPT-4o (Reasoning)
- **Structured Data**: `Instructor` (Pydantic-based LLM outputs)
- **Database**: Local JSON-based Persistent Session Management
- **Search API**: Semantic Scholar API

### Frontend (Nexus UI)
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS
- **Animations**: Framer Motion & Aceternity UI
- **Icons**: Lucide React
- **Icons**: Google Fonts (Outfit, Inter)

## 3. Directory Structure

```text
nexus-ai-lab/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI Endpoints (Search, Extract, Session CRUD)
│   │   ├── services/        # Core Logic (Agent Loop, LLM extraction, Search)
│   │   └── main.py          # App Entry & CORS Middleware
│   ├── data/
│   │   ├── sessions/        # Persistent Session JSON Storage
│   │   └── learning_signals.json # Flywheel data for corrections/feedback
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js Pages (Chat, Landing, Search)
│   │   ├── components/      # UI Components (Synthesis Matrix, Sidebar, Floating Input)
│   │   └── lib/             # API client & Utilities
│   └── tailwind.config.ts
└── spec-draft.md            # You are here
```

## 4. Key Features

### Autonomous Research Loop (ReAct)
1. **Intent Analysis**: Classifies input as social chat or deep research.
2. **Keyword Generation**: Expands queries for optimal Semantic Scholar coverage.
3. **Structured Extraction**: Parallel processing of paper abstracts into structured comparison rows.
4. **Professional Summary**: Generates a natural, human-like conclusion of the research findings.

### Deep Synthesis Workstation
- **Comparison Matrix**: A dense, interactive table displaying methodology, findings, and limitations.
- **Abstract Tooltip Cards**: Premium glassmorphism cards showing full abstracts and metadata on hover.
- **Source Verification**: Portal-based tooltips for verifying specific evidence quotes.

### Session Management
- **Persistence**: Sessions are saved to disk and can be loaded from the history sidebar.
- **CRUD Operations**: Support for starting new chats, deleting sessions, and clearing all memory.
- **Streaming**: Server-Sent Events (SSE) for real-time progress visualization.

## 5. Development Setup

### Running Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Running Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 2. User Stories — 4 paths

### Feature 1: Deep Extraction & Synthesis (CORE — 80% effort)


**Trigger:** User nhập research question → AI search Semantic Scholar → đọc abstract từng paper → trích xuất thông tin theo tiêu chí → trả về **bảng so sánh có cấu trúc**.

| Path | Câu hỏi thiết kế | Mô tả cụ thể |
|------|-------------------|---------------|
| **Happy — AI đúng** | User thấy gì? | Bảng 10 papers × 4 cột (Method / Dataset / Result / Limitation). Mỗi cell kèm **trích dẫn câu gốc** từ abstract (grounded generation) — user hover để xem. Bấm vào paper → link Semantic Scholar. Bấm "Export CSV" → tải bảng. **Time-to-value: <30 giây** từ lúc nhập query → thấy bảng. |
| **Low-confidence — AI không chắc** | System báo "không chắc" bằng cách nào? | Cell ghi **"N/A — không tìm thấy trong abstract"** (thay vì bịa). Cả cột N/A nhiều → hiện gợi ý: "Thông tin này có thể nằm trong full-text, không có trong abstract." User tự quyết có cần đọc full paper không. |
| **Failure — AI sai** | User biết AI sai bằng cách nào? | AI extract sai (VD: gán result của method A cho method B). **Biết sai:** mỗi cell hiện nút 📎 → popup trích dẫn câu gốc từ abstract → user so sánh ngay. Nếu câu gốc không match nội dung cell → user biết AI sai. |
| **Correction — user sửa** | User sửa bằng cách nào? Data đi đâu? | User click vào cell → sửa trực tiếp. Correction lưu lại: *(paper_id, field, old_value, new_value, source_sentence)*. Data dùng để: (a) cải thiện extraction prompt, (b) lưu user context "user quan tâm field X" → lần search sau ưu tiên aspect này. |

### Feature 2: Claim Verification (Citation checker v2)


**Trigger:** User paste 1 đoạn literature review có trích dẫn (VD: "Smith et al. showed that X [1]") + danh sách references → AI đọc đoạn text + đọc abstract paper được trích → kiểm tra claim có khớp với nội dung paper gốc không.

| Path | Câu hỏi thiết kế | Mô tả cụ thể |
|------|-------------------|---------------|
| **Happy** | Claim khớp | AI xác nhận: ✅ "Claim 'X improves Y by 30%' — **SUPPORTED** — paper gốc viết: *'Our method achieves 30.2% improvement...'*" Hiện câu gốc kèm theo. |
| **Low-confidence** | Không tìm thấy paper hoặc claim mơ hồ | ⚠️ "Không tìm thấy paper này trên Semantic Scholar" HOẶC "Claim quá chung chung, không thể verify cụ thể — cần đọc full paper." Gợi ý user check thủ công. |
| **Failure** | AI nói supported nhưng thực tế không khớp | User đọc câu gốc (luôn hiện kèm) → thấy không match. **Mitigation:** AI LUÔN kèm trích dẫn câu gốc (grounded) — không bao giờ chỉ nói "supported" mà không có evidence. User tự đánh giá final. |
| **Correction** | User đánh dấu sai | User bấm "Claim này KHÔNG được support" → correction log → cải thiện prompt matching + lưu pattern lỗi (VD: AI hay nhầm "correlation" với "causation"). |

---

## 3. Eval metrics + threshold


| Feature | Ưu tiên | Tại sao? |
|---------|---------|----------|
| Deep Extraction | ☒ **Precision** | Extract sai info → researcher so sánh sai → nguy hiểm hơn bỏ sót (ghi N/A an toàn hơn bịa) |
| Claim Verification | ☒ **Precision** | Nói "supported" khi thực tế không khớp → user trích dẫn sai → integrity issue |

| Metric | Mô tả | Threshold | Red flag |
|--------|-------|-----------|----------|
| **Click-through Rate** | % paper user accept vào thư viện sau khi xem bảng | ≥ 40% | < 25% — bảng extract không hữu ích, user bỏ qua |
| **Extraction accuracy** | % cell trong bảng đúng khi human spot-check (30 papers × 4 fields) | ≥ 85% | < 70% — extract sai quá nhiều, user mất tin |
| **Faithfulness** (grounded) | % cell có trích dẫn câu gốc chính xác (câu gốc thật sự support nội dung cell) | ≥ 90% | < 75% — grounding không hoạt động |
| **Claim verify precision** | % claim AI nói "supported" thực sự supported | ≥ 90% | < 80% — tool gây hại hơn giúp ích |
| **Time-to-value** | Thời gian từ nhập query → user thấy bảng hoàn chỉnh | ≤ 30 giây | > 2 phút → **Kill/Pivot** (user bỏ đi) |

**Cách đo:**
- Click-through: log số paper user bấm "Add to library" / tổng papers hiện
- Extraction accuracy: 2 người đọc 30 papers, so sánh cell AI extract vs abstract gốc
- Faithfulness: kiểm tra câu gốc có thật sự nằm trong abstract không (exact match hoặc NLI)
- Claim verify: 50 claims (25 đúng + 25 sai cố ý) → đo precision

---

## 4. Top 3 failure modes

| # | Failure mode | Trigger | Hậu quả | User biết không? | Mitigation |
|---|-------------|---------|---------|-------------------|------------|
| 1 | **LLM hallucinate khi extract** — bịa Method/Result không có trong abstract | Paper phức tạp, nhiều method được nhắc tới, LLM "sáng tạo" thêm chi tiết | Researcher so sánh papers dựa trên info bịa → kết luận sai | ❌ **KHÔNG** nếu không check câu gốc | **Grounded Generation:** mỗi cell PHẢI kèm trích dẫn câu gốc nguyên văn từ abstract. Nếu LLM không tìm được câu gốc → ghi N/A. Prompt: *"Extract ONLY information explicitly stated. Quote the exact sentence. If not found, write N/A."* |
| 2 | **Mù thông tin dạng bảng/biểu đồ** — abstract thường không chứa data chi tiết nằm trong figures/tables của paper | User hỏi "dataset size" hoặc "exact accuracy number" nhưng info đó nằm trong Table 3 của paper, không có trong abstract | Bảng extract toàn N/A cho cột đó → user thấy tool vô dụng | ✅ **CÓ** — thấy N/A nhiều | Cảnh báo rõ: "⚠️ AI chỉ đọc abstract — thông tin chi tiết (bảng, biểu đồ, appendix) cần đọc full paper." Gợi ý link paper gốc. Long-term: upgrade lên RAG full-text. |
| 3 | **Claim verification nhầm "correlation" với "causation"** — AI nói claim supported nhưng mức độ support khác nhau | User viết "X causes Y [1]" nhưng paper [1] chỉ nói "X correlates with Y" | User trích dẫn sai mức độ → peer reviewer bắt lỗi logic | ⚠️ **Khó biết** — cả hai nghe giống nhau | AI output 3 mức: **SUPPORTED / PARTIALLY SUPPORTED / NOT SUPPORTED**. Kèm trích dẫn câu gốc + highlight khác biệt. Prompt: *"Distinguish between: claims of causation vs correlation, direct evidence vs indirect inference."* |

---

## 5. ROI 3 kịch bản

|  | Conservative | Realistic | Optimistic |
|---|-------------|-----------|------------|
| **Assumption** | 50 researcher (1 lab), 5 query/tháng. Chỉ Feature 1 (extract bảng). CTR 30%. | 300 researcher + SV, 10 query/tháng. Cả 2 features. CTR 45%. | 1000+ user (VinUni + đối tác), 20 query/tháng. RAG full-text. CTR 60%. |
| **Cost** | ~$15/tháng (LLM API, abstract only). Hosting: $0. | ~$200/tháng (LLM + cloud). | ~$2,000/tháng (LLM full-text: token cost x10–x50, vector storage, hosting). |
| **Benefit** | Researcher quét 100 papers thay vì 20 → tìm thêm ~3 papers quan trọng/review. Tiết kiệm ~1.5h/review × 50 = **75 giờ/tháng**. | Tiết kiệm ~2h/review × 300 = **600 giờ/tháng**. Giảm lỗi trích dẫn sai ngữ cảnh ~30%. | **2,500 giờ/tháng**. Giảm lỗi citation 50%. Tăng publication quality. |
| **Net** | +$360/tháng (nhỏ, prove concept) | +$2,800/tháng (justify tiếp) | +$10,500/tháng (scale SaaS) |


**Kill criteria:**
1. Cost > benefit 2 tháng liên tục
2. Extraction accuracy < 70% sau 3 vòng prompt iteration
3. < 20% user quay lại lần 2
4. **Time-to-value > 2 phút → Kill/Pivot ngay** (user không chờ được)
5. CTR < 25% sau 1 tháng (bảng extract không hữu ích)

---

## 6. Mini AI spec

### ScholarAI v2 — Deep Extraction & Claim Verification

**Giải gì:** Researcher chỉ đọc sâu ~20 papers/review, bỏ sót công trình quan trọng và trích dẫn sai ngữ cảnh. ScholarAI mở rộng phễu quét lên 100 papers bằng AI, extract thông tin có cấu trúc, và verify trích dẫn.

**Cho ai:** Researcher, SV cao học VinUni. Primary: SV năm 3–4 viết thesis.

**2 features (không phải 4):**
1. **Deep Extraction:** Search papers → extract Method/Dataset/Result/Limitation thành bảng so sánh. Mỗi cell kèm trích dẫn câu gốc (grounded). Không tìm thấy → N/A.
2. **Claim Verification:** User paste đoạn trích dẫn → AI check claim có khớp paper gốc không. Output: SUPPORTED / PARTIALLY / NOT SUPPORTED + câu gốc.

**Auto/Aug:** Augmentation. AI mở rộng phễu + extract + verify. Researcher filter + đọc sâu + quyết định.

**Quality:** Precision-first cho cả 2 features. Extract sai > bỏ sót. Threshold: extraction accuracy ≥ 85%, claim precision ≥ 90%, time-to-value ≤ 30s.

**Risk:** (1) Hallucination → grounded generation + N/A fallback. (2) Mù bảng/biểu đồ → disclaimer + link paper gốc. (3) Nhầm correlation/causation → 3-level output + highlight.

**Data flywheel:** User correction (sửa cell, reject claim) → lưu user context (focus aspect X) → nhét vào System Prompt → extract/verify lần sau chính xác hơn cho user đó. Không build reranker (quá tốn MVP) — dùng prompt engineering thuần.

---

## Phân công nhóm (4 thành viên)

| Thành viên | Role | Phần phụ trách | Output |
|-----------|------|---------------|--------|
| **Ngô Văn Long** | Product Owner | Canvas + Failure modes + Mini AI spec (phần 1, 4, 6). Review SPEC tổng. Quyết định scope. | `spec-final.md` phần 1, 4, 6 |
| **Nguyễn Phương Linh** | UX Designer | User Stories 4 paths × 2 features (phần 2). UI bảng extract + claim verify. Poster demo. | `spec-final.md` phần 2. UI prototype. `demo-slides.pdf` |
| **Nguyễn Hải Đăng** | Analyst | Eval metrics + ROI + Kill criteria (phần 3, 5). Test set. Cost estimate. Feedback nhóm khác. | `spec-final.md` phần 3, 5. Test data. `feedback.md` |
| **Nguyễn Mạnh Phú** | Engineer | Prototype build + Prompt engineering (extraction + claim verify). API integration. Demo. | Prototype code. `prompt-tests.md`. Demo script. |

---

## 7. Technical Implementation

### Technology Stack
- **Frontend**: Next.js 15 (App Router), TailwindCSS, Framer Motion, Lucide React.
- **Backend**: FastAPI (Python), Instructor (Structured Data), OpenAI GPT-4o-mini.
- **APIs**: Semantic Scholar API (Academic Search).
- **Storage**: File-based JSON Session Storage (Scalable to PostgreSQL/Redis).

### Project Structure (Directory Tree)
```text
lab06/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py      # REST Endpoints (Streaming, Sessions)
│   │   ├── services/
│   │   │   ├── agent_service.py  # Autonomous ReAct Agent Loop (Intent Routing)
│   │   │   ├── session_service.py # JSON Session Persistence
│   │   │   ├── semantic_scholar.py # Academic Search Tool
│   │   │   └── llm_client.py     # Instructor/OpenAI Client
│   │   └── main.py              # Entry Point
│   └── data/
│       └── sessions/             # Persistence data
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── chat/
    │   │   │   └── page.tsx      # Production Unified UI
    │   │   └── globals.css       # Custom Scrollbars & Styles
    │   ├── components/
    │   │   ├── chat/             # ThoughtProcess, PillAlert
    │   │   ├── synthesis/        # ComparisonTable (Portal Tooltips)
    │   │   └── ui/               # Reusable Components (Sparkles, Tooltip)
    │   └── lib/                  # Utils
    └── tailwind.config.ts
```

### Core Logic: Autonomous Intent Routing (Hybrid ReAct)
Hệ thống sử dụng mô hình **Autonomous Hybrid ReAct** tích hợp **Streaming SSE**:
1. **Intent Analysis Phase**: Agent tự động phân loại yêu cầu là `CHAT` (hội thoại xã giao) hay `RESEARCH` (cần truy xuất học thuật).
    - Nếu là **CHAT**: Trả lời ngay lập tức với tone giọng con người, bỏ qua bước "Thought".
    - Nếu là **RESEARCH**: Kích hoạt bộ tool ReAct.
2. **Guardrail Phase**: Kiểm tra tính hợp lệ của yêu cầu nghiên cứu (PillAlert UI).
3. **Planning & Execution**: Truy xuất Semantic Scholar -> Trích xuất dữ liệu đa chiều (với Grounded Evidence).
4. **Interactive Workstation**: Bảng ma trận hỗ trợ xem nhanh qua **Portal Tooltips** cho mọi ô dữ liệu và điều hướng **src check** trực tiếp.
5. **Persistence**: Tự động lưu trữ vào Session JSON để khôi phục trạng thái.

---
