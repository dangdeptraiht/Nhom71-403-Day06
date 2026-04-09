# Prototype — ScholarAI: AI Research Paper Assistant

## Mô tả

Web app giúp researcher tìm, tổng hợp, và kiểm tra paper khoa học trong 1 pipeline. User nhập topic → AI tìm paper từ Semantic Scholar → tóm tắt nội dung bằng LLM → kiểm tra DOI/citation qua CrossRef → sàng lọc đạo văn sơ bộ. Mỗi bước đều hiện source gốc để researcher verify trước khi dùng.

## Level: Mock prototype → Working prototype (hybrid)

- **UI:** Build bằng React (Claude Artifacts) — 3 tab chính: Search / Citation Check / Plagiarism Scan
- **AI call thật:** Tab Search gọi Semantic Scholar API (lấy paper thật) + LLM API (tóm tắt thật)
- **Citation check:** Gọi CrossRef API verify DOI thật
- **Plagiarism scan:** Mock (so sánh cosine similarity cơ bản, chưa full pipeline)

## Links

- **Prototype:** *(link Claude Artifacts / deployed app — điền khi build xong)*
- **Prompt test log:** xem file `extras/prompt-tests.md`
- **Video demo (backup):** *(link Google Drive — quay backup phòng prototype crash)*

## Tools và API đã dùng

| Tool/API | Dùng cho | Ghi chú |
|----------|----------|---------|
| React (Claude Artifacts) | UI prototype 3 tab | Single-page app, Tailwind CSS |
| Semantic Scholar API | Search paper theo keyword | Free tier, 100 req/5 phút |
| CrossRef API | Verify DOI + metadata citation | Free, không cần API key |
| Google Gemini 2.0 Flash / Claude API | Tóm tắt paper abstract | ~$0.02/paper, <15s latency |
| Sentence embedding (local) | Plagiarism similarity check | TF-IDF + cosine similarity cơ bản |

## Phân công

| Thành viên | Role | Phần phụ trách | Output cụ thể |
|-----------|------|---------------|----------------|
| **Ngô Văn Long** | Product Owner + AI Architect | Canvas + Failure modes + Mini AI spec | `spec-final.md` phần 1, 4, 6. Thiết kế pipeline tổng thể. Quyết định auto/aug. Review SPEC final. |
| **Nguyễn Phương Linh** | UX Designer + User Stories | User Stories 4 paths + UI design + Demo slides | `spec-final.md` phần 2. UI prototype (3 tab layout). Poster/slides cho demo. |
| **Nguyễn Hải Đăng** | Analyst + Evaluator | Eval metrics + ROI + Kill criteria | `spec-final.md` phần 3, 5. Test set 50 query. Cost estimate. Feedback cho nhóm khác. |
| **Nguyễn Mạnh Phú** | Engineer + Prompt Engineer | Prototype build + API integration + Prompt engineering | Prototype code. `prompt-tests.md`. Tích hợp Semantic Scholar + CrossRef + LLM API. Demo script + dry run. |

## Ghi chú kỹ thuật

### Semantic Scholar API call mẫu
```
GET https://api.semanticscholar.org/graph/v1/paper/search
  ?query=transformer+medical+imaging
  &limit=10
  &fields=title,authors,year,abstract,citationCount,externalIds,venue
```

### CrossRef API verify DOI mẫu
```
GET https://api.crossref.org/works/{DOI}
→ Trả về metadata: title, author, published-date, container-title
→ So sánh với metadata user nhập → highlight khác biệt
```

### Prompt tóm tắt (version cuối)
```
System: You are an academic paper summarizer. Given a paper's abstract,
produce a 3-sentence summary covering: (1) research question/objective,
(2) method/approach, (3) key finding/contribution.
Rules:
- ONLY use information present in the abstract. Do NOT infer or add details.
- If information is unclear, write [unclear from abstract].
- Do NOT fabricate statistics, numbers, or results.
```

> *Tham khảo cấu trúc prototype-readme: [README.md Day 6](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/README.md), mục "Ví dụ bài nộp tốt — prototype-readme.md".*
