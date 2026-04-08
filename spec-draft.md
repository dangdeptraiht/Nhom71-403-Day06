# SPEC draft — Nhom71 - Lop E403 - Day06


**Nhóm:** 71
**Thành viên:** Ngô Văn Long, Nguyễn Phương Linh, Nguyễn Hải Đăng, Nguyễn Mạnh Phú
**Track:** ☒ VinUni-VinSchool 

---

## Problem statement

Researcher và sinh viên nghiên cứu tại VinUni mất **3–5 giờ** để tìm, đọc, tổng hợp và kiểm tra trích dẫn cho mỗi literature review. Hiện tại phải dùng rời rạc nhiều tool (Google Scholar, Semantic Scholar, Zotero, ChatGPT, iThenticate) và copy-paste thủ công giữa các bước. **AI có thể tự động hóa pipeline: tìm paper → tổng hợp nội dung → kiểm tra citation → kiểm tra đạo văn**, giảm thời gian xuống còn 30–60 phút và giảm lỗi trích dẫn sai.

---

## 1. AI Product Canvas (draft)

|  | Value | Trust | Feasibility |
|---|-------|-------|-------------|
| **Câu hỏi** | User nào? Pain gì? AI giải gì? | Khi AI sai thì sao? User sửa bằng cách nào? | Cost/latency bao nhiêu? Risk chính? |
| **Trả lời** | Researcher + sinh viên nghiên cứu VinUni. Pain: mất nhiều giờ tìm & đọc paper, bỏ sót paper quan trọng, trích dẫn sai format/nội dung. AI tổng hợp pipeline 3 bước: (1) search paper theo keyword/topic, (2) tóm tắt + kiểm tra citation hợp lệ, (3) check đạo văn bản tổng hợp. | Nếu AI tóm tắt sai nội dung paper → researcher dùng thông tin sai trong literature review → ảnh hưởng chất lượng nghiên cứu. Mỗi bước đều hiện source gốc để user verify. User có thể sửa/loại bỏ paper không phù hợp, chỉnh lại summary. | API call: ~$0.01–0.03/paper (dùng LLM tóm tắt). Search: Semantic Scholar API (miễn phí). Plagiarism check: API bên thứ 3 hoặc so sánh cosine similarity. Latency: <10s cho search, <15s cho tóm tắt 1 paper. Risk: hallucination khi tóm tắt, trích dẫn DOI không tồn tại, API rate limit. |

**Automation hay augmentation?** ☒ Augmentation
Justify: Researcher luôn cần review và kiểm chứng lại kết quả AI. Cost of false positive (tóm tắt sai, trích dẫn sai) rất cao trong nghiên cứu khoa học — không thể để AI quyết định hoàn toàn. AI gợi ý, researcher duyệt và chỉnh.


**Learning signal:**
1. User correction đi vào đâu? → Khi user loại bỏ paper không phù hợp hoặc chỉnh sửa summary → ghi log để cải thiện prompt / ranking.
2. Product thu signal gì? → Tỷ lệ paper được user giữ lại vs loại bỏ; tỷ lệ summary bị user sửa; số lần citation bị flag lỗi.
3. Data thuộc loại: ☒ Domain-specific (academic papers) · ☒ User-specific (research topic/preference)
   Marginal value: Có — model LLM tổng quát chưa biết context nghiên cứu cụ thể của user, cần domain data từ paper database + user preference.

---

## 2. User Stories — 4 paths (draft)

### Feature 1: AI Search & Tổng hợp paper

**Trigger:** User nhập topic/keyword → AI tìm paper từ Semantic Scholar → tóm tắt top kết quả → trả về danh sách có summary + metadata.

| Path | Câu hỏi thiết kế | Mô tả |
|------|-------------------|-------|
| **Happy — AI đúng** | User thấy gì? Flow kết thúc ra sao? | AI trả về 10 paper liên quan, mỗi paper có: tiêu đề, tác giả, năm, abstract summary 3 dòng, relevance score. User đọc, chọn 5 paper cần dùng → export citation list. |
| **Low-confidence — AI không chắc** | System báo "không chắc" bằng cách nào? | Với paper có relevance score < 60%: hiện tag "Có thể không liên quan" + lý do (VD: "paper này thuộc domain khác nhưng có keyword trùng"). User tự quyết giữ hay bỏ. |
| **Failure — AI sai** | User biết AI sai bằng cách nào? | AI trả paper không liên quan hoặc tóm tắt sai nội dung chính. User phát hiện khi đọc abstract gốc (luôn hiện bên cạnh summary). Mỗi summary có nút "Xem abstract gốc" để so sánh. |
| **Correction — user sửa** | User sửa bằng cách nào? Data đi vào đâu? | User bấm "Không liên quan" hoặc chỉnh summary → correction log lưu lại → dùng để refine search ranking & prompt cho lần sau. |


### Feature 2: Citation checker

**Trigger:** User có danh sách trích dẫn → AI kiểm tra: DOI có tồn tại không, metadata (tác giả, năm, tên paper) có khớp không, format citation có đúng chuẩn (APA/IEEE) không.

| Path | Câu hỏi thiết kế | Mô tả |
|------|-------------------|-------|
| **Happy** | Citation hợp lệ | AI xác nhận: ✅ DOI hợp lệ, metadata khớp, format đúng. User yên tâm. |
| **Low-confidence** | Không tìm được DOI | Hiện ⚠️ "Không tìm thấy DOI — có thể paper chưa index hoặc DOI sai". Gợi ý user kiểm tra thủ công + link tìm trên CrossRef. |
| **Failure** | AI báo citation đúng nhưng thực tế sai | User phát hiện khi bấm link DOI → paper khác. Mỗi citation hiện link trực tiếp để user verify nhanh. |
| **Correction** | User sửa citation | User chỉnh DOI/metadata → hệ thống cập nhật → flag pattern lỗi phổ biến (VD: năm xuất bản sai) để cảnh báo sớm lần sau. |

### Feature 3: Plagiarism check (bản tổng hợp)

**Trigger:** User viết xong literature review draft → AI kiểm tra % trùng lặp với nguồn gốc, highlight đoạn cần paraphrase lại.

| Path | Câu hỏi thiết kế | Mô tả |
|------|-------------------|-------|
| **Happy** | Bài viết đạt chuẩn | AI báo: similarity < 15%, highlight vài câu cần rephrase nhẹ. User chỉnh xong, nộp bài. |
| **Low-confidence** | Kết quả không rõ ràng | Đoạn text có similarity 15–30%: hiện ⚠️ + source gốc bên cạnh để user tự đánh giá là paraphrase hay copy. |
| **Failure** | AI bỏ sót đoạn copy | User hoặc giảng viên phát hiện đoạn trùng mà tool không flag. Mitigation: disclaimer rõ "Tool hỗ trợ sàng lọc, không thay thế kiểm tra chính thức". |
| **Correction** | User đánh dấu false positive | User bấm "Đây là trích dẫn trực tiếp, không phải đạo văn" → hệ thống học pattern quoted text. |

---

## 3. Eval metrics + threshold (draft)

**Optimize precision hay recall?** ☒ Recall (cho search paper) + ☒ Precision (cho citation check)

Tại sao?
- **Search paper:** bỏ sót paper quan trọng (low recall) nguy hiểm hơn trả thừa vài paper không liên quan → ưu tiên recall.
- **Citation check:** báo citation đúng nhưng thực tế sai (low precision) nguy hiểm hơn flag thừa → ưu tiên precision.


| Metric | Threshold | Red flag (dừng khi) |
|--------|-----------|---------------------|
| Recall@10 cho search (paper liên quan nằm trong top 10 kết quả) | ≥ 80% | < 60% trên test set 50 query |
| Precision cho citation validation (citation AI nói "hợp lệ" thực sự hợp lệ) | ≥ 95% | < 85% — vì sai citation trong nghiên cứu là lỗi nghiêm trọng |
| Faithfulness score cho summary (summary không chứa thông tin ngoài paper gốc) | ≥ 90% (đánh giá bằng LLM-as-judge hoặc human eval) | < 75% — hallucination quá nhiều |

---

## 4. Top 3 failure modes (draft)

| # | Trigger | Hậu quả | Mitigation |
|---|---------|---------|------------|
| 1 | **LLM hallucinate khi tóm tắt paper** — thêm thông tin không có trong paper gốc (VD: bịa kết quả thí nghiệm) | Researcher dùng thông tin sai trong literature review → ảnh hưởng uy tín nghiên cứu | Luôn hiện abstract gốc bên cạnh summary để so sánh. Dùng prompt "chỉ tóm tắt từ nội dung paper, không suy luận thêm". Thêm faithfulness check tự động. |
| 2 | **Citation DOI không tồn tại hoặc trỏ sai paper** — LLM tạo DOI giả khi được yêu cầu trích dẫn | User trích dẫn source không có thật → bị reject khi submit | Mọi DOI được verify qua CrossRef API trước khi hiện cho user. DOI không tìm thấy → hiện cảnh báo rõ ràng, không cho export. |
| 3 | **Plagiarism checker bỏ sót đoạn copy do paraphrase sát nghĩa** — tool chỉ so text similarity, không detect semantic copy | Bài viết bị phát hiện đạo văn bởi tool chính thức (Turnitin) | Disclaimer: "Đây là công cụ sàng lọc sơ bộ, không thay thế kiểm tra đạo văn chính thức". Dùng cả lexical + semantic similarity. |


---

## 5. ROI 3 kịch bản (draft)

|  | Conservative | Realistic | Optimistic |
|---|-------------|-----------|------------|
| **Assumption** | 50 researcher dùng/tháng (1 lab VinUni), mỗi người 5 query/tháng | 300 researcher + sinh viên cao học, 10 query/tháng | 1000+ user (mở rộng VinSchool + đối tác), 20 query/tháng |
| **Cost** | ~$15/tháng (API LLM + Semantic Scholar miễn phí) | ~$100/tháng | ~$400/tháng + server hosting |
| **Benefit** | Tiết kiệm ~2h/người/tháng × 50 = 100 giờ nghiên cứu/tháng | Tiết kiệm ~500h/tháng, giảm lỗi trích dẫn 30% | Tiết kiệm 2000h/tháng, tăng output publication, giảm lỗi citation 60% |
| **Net** | Dương nhẹ — chủ yếu prove concept | Rõ ràng dương — justify tiếp tục phát triển | Mở rộng thành SaaS cho các trường khác |

**Kill criteria:** Cost > benefit 2 tháng liên tục, HOẶC faithfulness score < 75% không cải thiện được sau 3 vòng prompt iteration, HOẶC < 20% user quay lại dùng lần 2.

---

## 6. Mini AI spec (draft)

**Sản phẩm:** AI Research Paper Assistant — tool hỗ trợ researcher VinUni tìm, tổng hợp, và kiểm tra chất lượng trích dẫn paper khoa học.

**Giải gì, cho ai:** Researcher và sinh viên nghiên cứu mất quá nhiều thời gian cho literature review thủ công. Tool cung cấp pipeline: search → summarize → verify citation → check plagiarism.

**Auto hay aug:** Augmentation — AI gợi ý và tổng hợp, researcher luôn duyệt và quyết định cuối cùng. Không tự động thay thế judgment của researcher.

**Quality:** Ưu tiên recall cho search (không bỏ sót paper quan trọng), precision cho citation check (không báo sai là đúng). Faithfulness score cho summary ≥ 90%.

**Risk chính:** (1) LLM hallucinate nội dung paper, (2) DOI giả, (3) plagiarism check không đủ sâu. Tất cả được mitigate bằng verify layer + disclaimer.

**Data flywheel:** User correction (loại paper, sửa summary, flag citation lỗi) → cải thiện prompt ranking + phát hiện pattern lỗi phổ biến → tool chính xác hơn theo thời gian. Data là domain-specific (academic) + user-specific (research interest), có marginal value cao vì LLM tổng quát không biết context nghiên cứu cụ thể.

---

## Hướng đi chính

- **Prototype:** Web app đơn giản (HTML/React) với 3 tab: (1) Search — nhập keyword, gọi Semantic Scholar API, hiện kết quả + AI summary, (2) Citation Check — paste danh sách citation, verify DOI qua CrossRef API, (3) Plagiarism Scan — paste text, so sánh với source.
- **Eval:** Recall@10 ≥ 80% cho search, precision ≥ 95% cho citation check, faithfulness ≥ 90% cho summary.
- **Main failure mode:** LLM hallucinate khi tóm tắt — cần hiện source gốc song song để user verify.

---

## Phân công nhóm (4 thành viên)

| Thành viên | Role | Phần phụ trách | Output cụ thể |
|-----------|------|---------------|----------------|
| **Ngô Văn Long** | Product Owner + AI Architect | Canvas (phần 1) + Failure modes (phần 4) + Mini AI spec (phần 6) | `spec-draft.md` phần 1, 4, 6 · Thiết kế pipeline tổng thể (search → summarize → cite check → plagiarism) · Quyết định auto/aug cho từng bước |
| **Nguyễn Phương Linh** | UX Designer + User Stories | User Stories 4 paths cho 3 features (phần 2) + Sketch UI flow (as-is → to-be) | `spec-draft.md` phần 2 · Sketch giấy/Figma UI 3 tab · Thiết kế UX cho low-confidence và failure path (hiện warning, so sánh source gốc) |
| **Nguyễn Hải Đăng** | Analyst + Evaluator | Eval metrics + threshold (phần 3) + ROI 3 kịch bản (phần 5) + Kill criteria | `spec-draft.md` phần 3, 5 · Xây test set 50 query để đo Recall@10 · Tính cost estimate (Semantic Scholar API + LLM API + CrossRef) |
| **Nguyễn Mạnh Phú** | Engineer + Prompt Engineer | Prototype research + build + Prompt engineering + Demo prep | Prototype code (HTML/React) · Prompt test log (`prompt-tests.md`) · Tích hợp Semantic Scholar API + CrossRef API · Demo script 2 phút |

### Chi tiết công việc theo timeline

**Tối nay (trước 23h59 08/04) — SPEC draft:**

| Ai | Việc cần hoàn thành |
|----|---------------------|
| **Long** | Hoàn thiện Canvas table + viết 3 failure modes + Mini AI spec 1 trang |
| **Linh** | Viết 4 paths cho 3 features (bảng đã có sẵn trong draft — review + bổ sung chi tiết) |
| **Đăng** | Finalize 3 eval metrics + threshold + ROI 3 kịch bản với số liệu cụ thể |
| **Phú** | Test thử Semantic Scholar API + viết 2–3 prompt version cho paper summarization, ghi log kết quả |

**Ngày 6 (09/04) — Prototype + Demo:**

| Ai | Việc cần hoàn thành |
|----|---------------------|
| **Long** | Review SPEC final tổng thể · Hỗ trợ Phú debug pipeline · Chuẩn bị trả lời câu hỏi "Auto hay aug?" và "Failure mode chính?" |
| **Linh** | Build UI prototype (3 tab: Search / Citation Check / Plagiarism) · Thiết kế poster/slides cho demo |
| **Đăng** | Chạy eval trên test set · Cập nhật ROI với số liệu thực từ prototype · Viết feedback cho các nhóm khác |
| **Phú** | Gắn AI call thật vào prototype (LLM API + Semantic Scholar + CrossRef) · Dry run demo · Backup video |


---
