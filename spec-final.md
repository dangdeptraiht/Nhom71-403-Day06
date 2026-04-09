# SPEC — AI Research Paper Assistant (ScholarAI)

**Nhóm:** NhomXX-Lop
**Track:** ☐ VinFast · ☐ Vinmec · ☒ VinUni-VinSchool · ☐ XanhSM · ☐ Open
**Thành viên:** Ngô Văn Long · Nguyễn Phương Linh · Nguyễn Hải Đăng · Nguyễn Mạnh Phú

**Problem statement (1 câu):** Researcher và sinh viên nghiên cứu tại VinUni mất 3–5 giờ cho mỗi literature review vì phải dùng rời rạc nhiều tool (Google Scholar, Zotero, ChatGPT, iThenticate) và copy-paste thủ công giữa các bước — AI có thể gộp thành 1 pipeline: tìm paper → tổng hợp nội dung → kiểm tra citation → sàng lọc đạo văn, giảm xuống còn 30–60 phút và giảm lỗi trích dẫn sai.

> **Nguồn tham khảo:**
> - Template: [spec-template.md](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/02-templates/spec-template.md) · [canvas-template.md](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/02-templates/canvas-template.md) — repo VinUni-AI20k/Day06-AI-Product-Hackathon
> - Ví dụ: [canvas-example.md (AI Email Triage)](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/04-reference/canvas-example.md) — repo Day06-AI-Product-Hackathon
> - Framework: 3 trụ (Requirement · Eval · UX), 4 paths, AI Product Canvas, Automation vs Augmentation — slide lecture Day 5, AICB-P1 VinUni 2026
> - API: [Semantic Scholar API](https://api.semanticscholar.org), [CrossRef API](https://www.crossref.org/documentation/)

---

## 1. AI Product Canvas

|  | Value | Trust | Feasibility |
|---|-------|-------|-------------|
| **Câu hỏi** | User nào? Pain gì? AI giải quyết gì mà cách hiện tại không giải được? | Khi AI sai thì user bị ảnh hưởng thế nào? User biết AI sai bằng cách nào? User sửa bằng cách nào? | Cost bao nhiêu/request? Latency bao lâu? Risk chính là gì? |
| **Core** | **User:** Researcher + sinh viên cao học VinUni (~300 người). **Pain:** mất 3–5h/literature review, phải nhảy giữa 4–5 tool, bỏ sót paper quan trọng, trích dẫn sai format/nội dung (~15% citation có lỗi theo khảo sát nội bộ). **Value:** 1 pipeline gộp tìm + tóm + check → giảm xuống 30–60 phút, giảm lỗi citation. | **Khi sai:** AI tóm tắt sai nội dung → researcher dùng thông tin sai → ảnh hưởng chất lượng nghiên cứu. **Biết sai:** abstract gốc luôn hiện bên cạnh summary để so sánh. Citation có link DOI trực tiếp để verify 1 click. **Sửa:** loại paper không liên quan, chỉnh summary, sửa citation — tất cả 1 click. | **Cost:** ~$0.02/paper (LLM tóm tắt). Search: Semantic Scholar API (miễn phí, 100 req/5 phút). Citation verify: CrossRef API (miễn phí). **Latency:** search <5s, tóm tắt <15s/paper. **Risk:** hallucination khi tóm tắt, DOI giả, API rate limit khi nhiều user. |
| **Then chốt** | **Augmentation** — cost of reject = 0, nhưng cost of undetected error rất cao (trích dẫn sai ≈ integrity issue). | **Recall-first** cho search (bỏ sót paper > trả thừa). **Precision-first** cho citation check (báo đúng khi sai > flag thừa). | POC option: **A (Prompt-based)** — Web app gọi Semantic Scholar + LLM API + CrossRef. Nâng lên C nếu kịp. |

> *[Annotation] Value: đo được (3–5h → 30–60 phút). Trust: trả lời 3 câu (sai → biết → sửa). Feasibility: cost per unit cụ thể, risk đặt tên.*
> *Tham khảo: framework Canvas — [canvas-example.md](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/04-reference/canvas-example.md), slide lecture Day 5.*

### Automation hay augmentation?

☒ **Augmentation** — AI gợi ý, researcher quyết định cuối cùng.

**Justify:** Trong nghiên cứu khoa học, cost of false positive (tóm tắt sai, trích dẫn sai) rất cao — có thể ảnh hưởng tới academic integrity. User là researcher có chuyên môn, có khả năng evaluate AI output. Cost of reject = 0 (bỏ qua gợi ý không mất gì). Nếu automation → AI tóm tắt sai mà researcher không review → nguy hiểm.

> *Gợi ý từ slide Day 5: "nếu AI sai mà user không biết → automation nguy hiểm, cân nhắc augmentation."*

### Learning signal

| # | Câu hỏi | Trả lời |
|---|---------|---------|
| 1 | User correction đi vào đâu? | Mỗi lần user loại paper / sửa summary / flag citation lỗi → **correction log** → dùng để tinh chỉnh prompt + cải thiện search ranking cho topic tương tự. |
| 2 | Product thu signal gì để biết tốt lên hay tệ đi? | **Implicit:** acceptance rate (% paper user giữ lại). **Explicit:** thumbs down trên summary. **Correction:** user sửa summary / sửa citation. **Alert:** khi acceptance rate giảm >15%/tuần. |
| 3 | Data thuộc loại nào? | ☒ Domain-specific (academic papers, citation formats) · ☒ User-specific (research topic/interest) · ☐ Real-time · ☒ Human-judgment (đánh giá relevance). |

**Có marginal value không?** Có — LLM tổng quát không biết: (a) paper nào relevant với research direction cụ thể của user, (b) citation conventions theo từng journal/conference, (c) user's past reading history. Data từ correction log là unique, đối thủ không dễ thu được.

---

## 2. User Stories — 4 paths

> *Framework "4 paths" — slide lecture Day 5, mục UX: Happy / Low-confidence / Failure / Correction.*

### Feature 1: AI Search & Tổng hợp paper

**Trigger:** User nhập topic/research question → AI gọi Semantic Scholar API → lọc top 10 kết quả → LLM tóm tắt mỗi paper 3 dòng → trả về danh sách có summary + metadata + relevance score.

| Path | Câu hỏi thiết kế | Mô tả cụ thể |
|------|-------------------|---------------|
| **Happy — AI đúng, tự tin** | User thấy gì? Flow kết thúc ra sao? | AI trả 10 paper, mỗi cái có: tiêu đề, tác giả, năm, venue, citation count, abstract summary 3 dòng, relevance score (85–99%). User đọc, tick chọn 5 paper cần dùng → bấm "Export Citations" → nhận file BibTeX/APA. Flow xong trong 5 phút. |
| **Low-confidence — AI không chắc** | System báo "không chắc" bằng cách nào? | Paper có relevance < 60%: hiện tag vàng ⚠️ "Có thể không liên quan" + lý do ngắn (VD: "keyword trùng nhưng domain khác"). Paper được đẩy xuống cuối danh sách. User tự quyết giữ hay bỏ. |
| **Failure — AI sai** | User biết AI sai bằng cách nào? | AI trả paper không liên quan HOẶC tóm tắt sai nội dung. **Biết sai:** abstract gốc LUÔN hiện bên cạnh summary → user so sánh ngay. Nút "Xem paper gốc" link tới Semantic Scholar. **Recover:** bỏ paper 1 click, hệ thống suggest thay thế. |
| **Correction — user sửa** | User sửa bằng cách nào? Data đó đi vào đâu? | User bấm "Không liên quan" hoặc "Sửa tóm tắt" → correction log lưu: (query, paper_id, action, timestamp). Dùng để refine prompt + adjust relevance ranking. |

### Feature 2: Citation Checker

**Trigger:** User paste danh sách trích dẫn (hoặc upload .bib) → AI kiểm tra từng citation: DOI tồn tại? metadata khớp? format đúng chuẩn (APA/IEEE)?

| Path | Câu hỏi thiết kế | Mô tả cụ thể |
|------|-------------------|---------------|
| **Happy** | Citation hợp lệ → user thấy gì? | Mỗi citation hiện ✅ badge xanh "Verified". Metadata khớp 100%, format đúng. Bấm "Export All" → danh sách sạch. |
| **Low-confidence** | DOI không tìm thấy | ⚠️ vàng: "DOI không tìm thấy trên CrossRef." Gợi ý: link tìm thủ công trên CrossRef. Không cho export citation này cho đến khi user confirm. |
| **Failure** | AI báo OK nhưng metadata sai | User phát hiện khi bấm link DOI → thấy paper khác. **Mitigation:** hiện metadata gốc từ CrossRef bên cạnh → highlight khác biệt bằng màu đỏ. |
| **Correction** | User sửa citation sai | Chỉnh DOI/tác giả/năm trực tiếp → hệ thống cập nhật + flag pattern lỗi phổ biến (VD: năm sai nhiều → cảnh báo sớm). |

### Feature 3: Plagiarism Scan

**Trigger:** User paste đoạn literature review → AI so sánh với papers đã tìm ở Feature 1 → trả % similarity + highlight đoạn cần paraphrase.

| Path | Câu hỏi thiết kế | Mô tả cụ thể |
|------|-------------------|---------------|
| **Happy** | Bài đạt chuẩn | Similarity < 15%. Highlight nhẹ vài câu + nút "Gợi ý paraphrase". Flow xong 3 phút. |
| **Low-confidence** | Vùng xám 15–30% | ⚠️ vàng + source gốc. KHÔNG tự kết luận "đạo văn" — gợi ý 3 option: giữ nguyên / paraphrase / thêm trích dẫn trực tiếp. |
| **Failure** | Bỏ sót đoạn copy | Disclaimer: "ScholarAI là công cụ sàng lọc sơ bộ. KHÔNG thay thế Turnitin/iThenticate." Dùng cả lexical + semantic similarity. |
| **Correction** | False positive | User bấm "Đây là trích dẫn trực tiếp" → hệ thống giảm weight cho quoted text pattern. |

---

## 3. Eval metrics + threshold

> *Tham khảo: "Precision vs Recall tradeoff" — slide lecture Day 5, mục Eval.*

**Optimize precision hay recall?**

| Feature | Ưu tiên | Tại sao? | Nếu sai ngược lại? |
|---------|---------|----------|---------------------|
| Search paper | ☒ **Recall** | Bỏ sót paper quan trọng → researcher thiếu foundation | Low recall → user không tìm thấy paper cần → mất niềm tin, bỏ dùng |
| Citation check | ☒ **Precision** | Báo citation đúng khi sai → academic integrity issue | Low precision → flag thừa → user mệt, ignore cảnh báo |
| Summary | ☒ **Precision** (faithfulness) | Hallucination → researcher dùng thông tin bịa | Too conservative → bỏ sót insight → ít nguy hiểm hơn |

| Metric | Mô tả | Threshold | Red flag (dừng khi) |
|--------|-------|-----------|---------------------|
| **Recall@10** (search) | Paper liên quan nằm trong top 10 kết quả | ≥ 80% | < 60% trên test set 50 query |
| **Citation precision** | Citation AI nói "hợp lệ" thực sự hợp lệ | ≥ 95% | < 85% — sai citation = lỗi nghiêm trọng |
| **Faithfulness** (summary) | Summary không chứa thông tin ngoài paper gốc | ≥ 90% (LLM-as-judge + human spot-check) | < 75% — hallucination quá nhiều |

**Cách đo:**
- Recall@10: 50 query + ground-truth papers từ existing literature reviews → % ground-truth trong top 10
- Citation precision: 100 citations (50 đúng + 50 có lỗi cố ý) → % AI phân loại chính xác
- Faithfulness: 30 paper × summary → 2 người so sánh summary vs abstract gốc → ghi nhận claim nào bịa

---

## 4. Top 3 failure modes

> *"Failure mode nào user KHÔNG BIẾT bị sai? Đó là cái nguy hiểm nhất." — slide lecture Day 5.*

| # | Failure mode | Trigger | Hậu quả | User biết không? | Mitigation |
|---|-------------|---------|---------|-------------------|------------|
| 1 | **LLM hallucinate khi tóm tắt** — thêm kết quả/con số không có trong paper | Paper dài, phức tạp, nhiều bảng số → LLM bịa thêm cho summary nghe hoàn chỉnh | Researcher trích dẫn thông tin bịa → ảnh hưởng uy tín, có thể bị retract | ❌ **KHÔNG** — nguy hiểm nhất | (a) Abstract gốc LUÔN hiện song song. (b) Prompt: "chỉ tóm tắt nội dung có trong paper, ghi [?] nếu không chắc". (c) Faithfulness auto-check bằng NLI. (d) Warning: "Verify với paper gốc trước khi trích dẫn." |
| 2 | **DOI giả / trỏ sai paper** — LLM tạo DOI không tồn tại | User paste citation từ ChatGPT (hay bịa DOI), hoặc DOI cũ đã thay đổi | Trích dẫn source không có thật → bị reject khi submit | ⚠️ Có thể, nếu user click verify | (a) MỌI DOI verify qua CrossRef API — không tìm thấy → ❌ cảnh báo đỏ, cấm export. (b) Hiện metadata CrossRef bên cạnh → highlight khác biệt. (c) >30% DOI lỗi → cảnh báo batch. |
| 3 | **Plagiarism checker bỏ sót semantic copy** — paraphrase sát nghĩa mà tool chỉ so lexical | User paraphrase sát (thay synonym, đảo câu) nhưng không thêm insight riêng | Bị phát hiện đạo văn bởi Turnitin | ❌ **KHÔNG** — user tưởng đã pass | (a) Disclaimer: "Không thay thế kiểm tra chính thức." (b) Dual method: lexical (n-gram) + semantic (embedding cosine > 0.85 → flag). (c) Suggest: "Đoạn này paraphrase sát — cân nhắc thêm phân tích riêng." |

---

## 5. ROI 3 kịch bản

|  | Conservative | Realistic | Optimistic |
|---|-------------|-----------|------------|
| **Assumption** | 50 researcher (1 lab), 5 query/tháng. Chỉ Feature 1. Acceptance 60%. | 300 researcher + SV cao học, 10 query/tháng. Cả 3 features. Acceptance 80%. | 1000+ user (VinUni + VinSchool + đối tác), 20 query/tháng. Tích hợp LMS. Acceptance 90%. |
| **Cost** | ~$15/tháng (LLM API). Hosting: $0 (local). **Total: $15** | ~$200/tháng (LLM + hosting cloud). | ~$1,800/tháng (LLM + hosting + CDN + part-time maintainer). |
| **Benefit** | 2h/người/tháng × 50 = **100 giờ NC**. Quy đổi: **$500/tháng** | 3h/người × 300 = **900 giờ**. Giảm lỗi citation 30%. **$4,500/tháng** | 4h/người × 1000 = **4,000 giờ**. Giảm lỗi 60%. Tăng publication. **$20,000/tháng** |
| **Net** | **+$485/tháng** — prove concept | **+$4,300/tháng** — justify scale | **+$18,200/tháng** — SaaS cho đại học khác |

**Kill criteria:** Dừng khi:
1. Cost > benefit 2 tháng liên tục
2. Faithfulness < 75% không cải thiện sau 3 vòng prompt iteration
3. < 20% user quay lại lần 2
4. Acceptance rate < 50% sau 1 tháng launch

---

## 6. Mini AI spec

### ScholarAI — AI Research Paper Assistant

**Giải gì:** Researcher mất 3–5 giờ cho literature review vì nhảy giữa nhiều tool và copy-paste thủ công. ScholarAI gộp thành 1 pipeline: tìm paper → tóm tắt → kiểm tra citation → sàng lọc đạo văn.

**Cho ai:** Researcher, giảng viên, sinh viên cao học VinUni. Primary persona: SV năm 3–4 viết thesis, cần review 30–50 papers.

**AI làm gì (auto/aug):** **Augmentation.** AI tìm + gợi ý, researcher duyệt + quyết định. Pipeline 4 bước: Search (Semantic Scholar API) → Summarize (LLM) → Verify citation (CrossRef API) → Scan đạo văn (embedding similarity). Mỗi bước có output để user review.

**Quality:** Recall-first cho search (≥80%), Precision-first cho citation (≥95%) và faithfulness (≥90%). Metric khác nhau vì cost of error khác nhau.

**Risk chính:** (1) Hallucination khi tóm tắt → source song song + faithfulness check. (2) DOI giả → CrossRef verification layer. (3) Plagiarism false negative → disclaimer + dual method.

**Data flywheel:**

```
User query → AI search + summarize → User review output
                                        ↓
                          User loại paper / sửa summary / flag lỗi
                                        ↓
                                  Correction log
                                        ↓
                    Prompt tuning + ranking adjustment + pattern detection
                                        ↓
                  Kết quả chính xác hơn → trust cao hơn → dùng nhiều hơn
                                        ↓
                              Nhiều correction data hơn ↺
```

Data: domain-specific (academic) + user-specific (research interest). **Marginal value cao** — LLM tổng quát không biết context nghiên cứu cụ thể, correction data là unique.

---

## Nguồn tham khảo

1. **SPEC template:** [spec-template.md](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/02-templates/spec-template.md) — repo VinUni-AI20k/Day06-AI-Product-Hackathon
2. **Canvas template:** [canvas-template.md](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/02-templates/canvas-template.md)
3. **Canvas example (AI Email Triage):** [canvas-example.md](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/04-reference/canvas-example.md)
4. **Hackathon rules:** [hackathon-rules.md](https://github.com/VinUni-AI20k/Day06-AI-Product-Hackathon/blob/main/05-rules/hackathon-rules.md)
5. **Framework lecture Day 5:** 3 trụ, 4 paths, Canvas, Auto vs Aug, Precision vs Recall, Data flywheel — AICB-P1, VinUni 2026
6. **Semantic Scholar API:** https://api.semanticscholar.org
7. **CrossRef API:** https://www.crossref.org/documentation/
