# Prototype — ScholarAI v2: AI Research Nexus

## Mô tả
Web app hỗ trợ researcher VinUni tự động quét và trích xuất thông tin từ papers trên Semantic Scholar thành bảng so sánh có cấu trúc (Method / Dataset / Result / Limitation), kèm grounded citation cho từng cell. Ngoài ra hỗ trợ kiểm tra chéo trích dẫn trong bài viết với nội dung paper gốc (SUPPORTED / PARTIALLY SUPPORTED / NOT SUPPORTED), giúp giảm rủi ro trích dẫn sai ngữ cảnh.

## Level: Working Prototype
- Backend API hoạt động đầy đủ với Autonomous ReAct Agent (Intent routing → Search → Extract → Stream)
- Frontend Next.js kết nối thật với backend, có real-time streaming qua SSE
- Toàn bộ flow chính chạy thật: nhập query → agent tìm papers → extract bảng → hiện kết quả
- Session persistence: lưu lịch sử chat vào file JSON, reload được

## Links
- GitHub repo: https://github.com/dangdeptraiht/Nhom71-403-Day06
- Prompt test log: xem file [`prompt-test.md`](prompt-test.md)
- Spec đầy đủ: xem file [`spec-final.md`](../spec-final.md)

## Tools và API đã dùng

| Layer | Tool / Tech |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), TailwindCSS, Framer Motion, Aceternity UI, Lucide React |
| **Backend** | FastAPI (Python), Uvicorn, python-dotenv |
| **LLM** | OpenAI GPT-4o-mini (extraction) · GPT-4o (agent reasoning) |
| **Structured output** | `Instructor` (Pydantic-based LLM output parsing) |
| **Academic search** | Semantic Scholar API (free tier, 100 req/5 min) |
| **Agent pattern** | Hybrid ReAct loop với Streaming SSE |
| **Session storage** | File-based JSON persistence |
| **Agentic framework** | LangChain + LangGraph |

## Phân công

| Thành viên | Phần | Output |
|-----------|------|--------|
| **Ngô Văn Long** | Product Owner — AI Product Canvas, Failure modes, Mini AI spec, review SPEC tổng, quyết định scope | `spec-final.md` phần 1, 4, 6 |
| **Nguyễn Phương Linh** | UX Designer — User Stories 4 paths × 2 features, UI bảng extract + claim verify, poster demo | `spec-final.md` phần 2, UI prototype, `demo-slides.pdf` |
| **Nguyễn Hải Đăng** | Analyst — Eval metrics, ROI 3 kịch bản, Kill criteria, test set, cost estimate | `spec-final.md` phần 3, 5, test data, `feedback.md` |
| **Nguyễn Mạnh Phú** | Engineer — Prototype build (backend + frontend), prompt engineering, API integration, demo script | Toàn bộ code, `prompt-test.md`, demo script |
