# SPEC — Nexus AI: Research Assistant 

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

| # | Câu hỏi | Trả lời |
|---|---------|---------|
| 1 | User correction đi vào đâu? | User chỉnh cell trong bảng / loại paper / đánh dấu claim sai → **lưu vào user context** (user A đang focus aspect X của topic Y) → nhét vào System Prompt cho lần extract/search tiếp theo. *(Không tự build reranker — quá tốn cho MVP.)* |
| 2 | Product thu signal gì? | **Click-through rate:** % paper user accept vào thư viện (target ≥ 40%). **Edit rate:** % cell trong bảng bị user sửa (target ≤ 20%). **Claim verify accuracy:** % claim user confirm đúng. |
| 3 | Data thuộc loại nào? | ☒ Domain-specific (academic) · ☒ User-specific (research focus, past searches). Marginal value cao — LLM tổng quát không biết user đang focus aspect nào. |


---
## 2. User Stories — 4 paths

### Feature 1: Deep Extraction & Synthesis (CORE — 80% effort)


**Trigger:** User nhập research question → AI search Semantic Scholar → đọc abstract từng paper → trích xuất thông tin theo tiêu chí → trả về **bảng so sánh có cấu trúc**.

| Path | Câu hỏi thiết kế | Mô tả cụ thể |
|------|-------------------|---------------|
| **Happy — AI đúng** | User thấy gì? | Bảng so sánh 4 cột (Methodology/Model, Dataset Used, Key Findings, Limitations). Có **grounded evidence** qua `source_quote` + nút **src check** để mở link Semantic Scholar. User có thể mở abstract chi tiết của paper trong tooltip/panel. |
| **Low-confidence — AI không chắc** | System báo "không chắc" bằng cách nào? | Backend ép rule precision-first: nếu không có thông tin rõ trong abstract thì trả `N/A`. UI hiện `N/A` dưới dạng dấu `-` trong cell (không bịa thêm nội dung). |
| **Failure — AI sai** | User biết AI sai bằng cách nào? | Nếu extract sai, user đối chiếu nội dung bảng với `source_quote` và abstract gốc qua **src check** để phát hiện mismatch. (Hiện tại quote đang ở mức theo hàng/paper, chưa phải quote riêng cho từng cell). |
| **Correction — user sửa** | User sửa bằng cách nào? Data đi đâu? | User click **edit** tại cell để sửa trực tiếp. Correction hiện được log qua API với: *(paper_id, field, original_value, corrected_value, timestamp)*. Dữ liệu correction được nạp lại vào prompt extraction cho các lần chạy sau (data flywheel). |

### Feature 2: Claim Verification 


**Trigger (as-built hiện tại):** API nhận **1 claim + 1 abstract** rồi trả kết quả verify. Luồng "paste đoạn review + danh sách references rồi tự map paper" chưa được implement end-to-end ở frontend.

| Path | Câu hỏi thiết kế | Mô tả cụ thể |
|------|-------------------|---------------|
| **Happy** | Claim khớp | API `/verify` trả: `status = SUPPORTED`, kèm `evidence_quote` và `reasoning`. |
| **Low-confidence** | Claim mơ hồ/khớp một phần | API có mức `PARTIALLY SUPPORTED` để biểu diễn bằng chứng chưa đủ mạnh hoặc khác ngữ cảnh nhẹ. |
| **Failure** | API kết luận chưa đúng | User phải tự đối chiếu `evidence_quote` với claim; hiện chưa có UI verify chuyên dụng để bắt lỗi tự động theo danh sách references. |
| **Correction** | User đánh dấu sai | Chưa có luồng correction riêng cho verify claim trong frontend hiện tại; mới có feedback/correction cho bảng extraction. |

---
## 3. Eval metrics + threshold


| Feature | Ưu tiên | Tại sao? |
|---------|---------|----------|
| Deep Extraction |  **Precision** | Extract sai info làm cho researcher so sánh sai, việc này nguy hiểm hơn bỏ sót 
| Claim Verification |  **Precision** | Nói "supported" khi thực tế không khớp → user trích dẫn sai → integrity issue |

| Metric | Mô tả | Threshold | Red flag |
|--------|-------|-----------|----------|
| **Extraction accuracy** | % cell có câu trích dẫn đúng từ abstract| ≥ 70% | < 60% |
| **Faithfulness** (grounded) | % cell có trích dẫn câu gốc chính xác (câu gốc thật sự support nội dung cell) | ≥ 80% | < 65%  |
| **Claim verify precision** | % AI phân loại đúng (SUPPORTED / PARTIALLY / NOT SUPPORTED) | ≥ 80% | < 60%  |
| **Time-to-value** | Thời gian từ nhập query đến thấy bảng extract hoàn chỉnh | ≤ 30 giây | > 2 phút |

**Cách đo:**
- Extraction accuracy: 2 người đọc 10–15 papers, so sánh từng cell AI extract với abstract gốc để tính % đúng
- Faithfulness: kiểm tra câu trích dẫn có nằm trong abstract và support nội dung cell không
- Claim verify: khoảng 30 claims (đúng + sai + tricky), so sánh output AI với ground truth để tính % đúng
- Time-to-value: đo thời gian từ bấm search → bảng hiển thị xong (test 3–5 lần, lấy trung bình)
---


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
| **Nguyễn Phương Linh** | Engineer | Prototype build + Prompt engineering (extraction + claim verify). API integration. Demo. | Prototype code. `prompt-tests.md`. Demo script. |
| **Nguyễn Mạnh Phú** | UX Designer | User Stories 4 paths × 2 features (phần 2). UI bảng extract + claim verify. | `spec-final.md` phần 2. UI prototype. `demo-slides.pdf` |
| **Nguyễn Hải Đăng** | Analyst | Eval metrics + ROI + Kill criteria (phần 3, 5). Test set. Cost estimate. Feedback nhóm khác. | `spec-final.md` phần 3, 5. Test data. `feedback.md` |

---
