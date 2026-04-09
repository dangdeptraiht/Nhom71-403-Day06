# Demo Script — ScholarAI (5 phút)

> *Tham khảo format: [README.md Day 6](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/README.md), mục Demo round.*

---

## Phân vai

| Thời gian | Ai nói | Nội dung | Show gì |
|-----------|--------|----------|---------|
| 0:00–0:45 | **Long** | Problem + Solution overview | Poster/slide 1: Problem statement + pipeline diagram |
| 0:45–1:15 | **Long** | Auto vs Aug + Failure mode chính | Poster/slide 2: Canvas summary + "tại sao augmentation" |
| 1:15–2:30 | **Phú** | Live demo Feature 1: Search + Summarize | Prototype: nhập query → hiện kết quả → show abstract gốc bên cạnh |
| 2:30–3:15 | **Phú** | Live demo Feature 2: Citation Check | Prototype: paste citation → verify DOI → show ✅/❌ |
| 3:15–3:45 | **Linh** | UX walkthrough: 4 paths khi AI sai | Prototype: show low-confidence tag, failure recovery flow |
| 3:45–4:15 | **Đăng** | Eval metrics + ROI | Poster/slide 3: 3 metrics + threshold + ROI table |
| 4:15–5:00 | **Cả nhóm** | Q&A | Mỗi người trả lời phần mình |

---

## Script chi tiết

### Long (0:00–1:15)

> "Mỗi lần viết literature review, bạn mất bao lâu? Với researcher VinUni, câu trả lời là 3–5 giờ — vì phải nhảy giữa Google Scholar, Zotero, ChatGPT, rồi check citation bằng tay.
>
> ScholarAI gộp tất cả vào 1 pipeline: nhập topic → AI tìm paper → tóm tắt → verify citation → scan đạo văn. Giảm xuống 30–60 phút.
>
> Đây là augmentation — AI gợi ý, researcher quyết định. Tại sao? Vì trong nghiên cứu, nếu AI tóm tắt sai mà researcher không biết — đó là failure mode nguy hiểm nhất. Nên mọi bước đều hiện source gốc để verify."

**[Chỉ vào poster: pipeline diagram + Canvas summary]**

### Phú (1:15–3:15)

> "Mình demo 2 features chính. Đầu tiên — Search."

**[Gõ query: "transformer attention mechanism medical imaging"]**

> "Semantic Scholar trả 10 paper thật. AI tóm tắt mỗi cái 3 dòng. Chú ý — abstract gốc luôn hiện bên cạnh để bạn verify. Paper nào relevance thấp, hệ thống đánh tag vàng cảnh báo."

**[Click vào 1 paper, show abstract gốc vs summary]**

> "Feature 2 — Citation Check. Mình paste 3 citation vào đây."

**[Paste 3 citation: 1 đúng, 1 DOI sai, 1 thiếu metadata]**

> "CrossRef API verify từng DOI. Citation 1: xanh — verified. Citation 2: đỏ — DOI không tồn tại, không cho export. Citation 3: vàng — metadata không khớp, highlight chỗ khác."

### Linh (3:15–3:45)

> "Về UX — mình thiết kế cho 4 trường hợp: AI đúng, không chắc, sai, và user sửa. Khi AI không chắc: tag vàng + lý do. Khi AI sai: abstract gốc luôn có sẵn để so sánh. User sửa 1 click — data đó vào correction log để cải thiện cho lần sau."

**[Click vào low-confidence paper → show tag + reason]**

### Đăng (3:45–4:15)

> "3 metrics chính: Recall@10 ≥ 80% cho search — không bỏ sót paper. Citation precision ≥ 95% — không báo đúng khi sai. Faithfulness ≥ 90% — summary không được bịa.
>
> ROI realistic: 300 user, tiết kiệm 900 giờ nghiên cứu/tháng, chi phí chỉ $200. Kill criteria: nếu acceptance < 50% sau 1 tháng — dừng."

---

## Câu hỏi dự kiến + ai trả lời

| Câu hỏi | Ai trả lời |
|----------|------------|
| "Tại sao augmentation chứ không automation?" | Long |
| "Failure mode chính là gì?" | Long |
| "LLM nào dùng để tóm tắt? Prompt ra sao?" | Phú |
| "Semantic Scholar API có giới hạn gì?" | Phú |
| "Low-confidence threshold là bao nhiêu?" | Linh |
| "Precision 95% — đo bằng cách nào?" | Đăng |
| "Kill criteria cụ thể?" | Đăng |

---

## Backup plan

- Nếu API Semantic Scholar bị rate limit → show screenshot kết quả đã chạy trước + video backup
- Nếu prototype crash → chuyển sang slides walkthrough (đã chuẩn bị sẵn)
- Mỗi feature có ít nhất 1 screenshot backup trong folder `demo/screenshots/`
