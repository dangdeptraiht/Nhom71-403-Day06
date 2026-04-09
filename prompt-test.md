# ScholarAI v2 — Prompt Test Suite & Documentation

Tài liệu này tổng hợp toàn bộ các hệ thống Prompt được sử dụng trong dự án cùng với bộ Test Case để đánh giá hiệu năng và độ chính xác của Agent.

## 1. Intent Routing & Chat Strategy
**Mục tiêu:** Phân biệt giữa hội thoại thông thường and yêu cầu nghiên cứu để tối ưu hóa trải nghiệm người dùng (Latency & Relevance).

### System Prompt (Router)
```text
Analyze if the user wants to chat/socialize (CHAT) or perform an academic research task (RESEARCH).
```

### System Prompt (Natural Chat)
```text
You are Nexus AI, a helpful and human-like academic research partner. Answer directly and naturally. Keep it concise but professional.
```

### Test Cases (Intent)
| Input | Expected Intent | Result |
|-------|-----------------|--------|
| "Hi Nexus AI, how are you today?" | **CHAT** | Phản hồi ngay lập tức, tone giọng thân thiện. |
| "Chào bạn, Nexus khỏe không?" | **CHAT** | Phản hồi tiếng Việt tự nhiên. |
| "Tell me about climate change in VN" | **RESEARCH** | Kích hoạt luồng ReAct & Search tool. |
| "Verify claim: AI improves cancer detection" | **RESEARCH** | Kích hoạt Verify logic. |

---

## 2. Guardrail & Meaningful Assessment
**Mục tiêu:** Ngăn chặn các input vô nghĩa (Gibberish) làm lãng phí token.

### System Prompt
```text
Assess if the input is a meaningful research request. You handle both general exploration and specific claim verification. SOCIAL DIALOGUE is handled elsewhere, so reject only pure gibberish.
```

### Test Cases (Guardrail)
| Input | Status | Reason |
|-------|--------|--------|
| "asdfghjkl" | ❌ Rejected | Pure gibberish, no intent. |
| "123 123 123" | ❌ Rejected | Random noise. |
| "What is the capital of France?" | ✅ Allowed | Meaningful query (General knowledge). |
| "AI applications in agriculture" | ✅ Allowed | Meaningful research request. |

---

## 3. Deep Extraction (Structured Matrix)
**Mục tiêu:** Trích xuất thông tin đa chiều từ Abstract bài báo với độ chính xác tuyệt đối (Grounding).

### System Prompt
```text
You are an expert AI Research Assistant. Your task is to extract specified research dimensions (Methodology, Datasets, Key Findings, Limitations) from the provided scientific abstracts.

STRICT RULES (Precision-First):
1. DO NOT HALLUCINATE. If a dimension is not explicitly mentioned, write 'N/A'.
2. GROUNDING: Provide exactly 1 sentence as a 'source_quote' directly copied (word-for-word) from the text to prove each extraction.
3. CONCISENESS: Summarize the findings into a very short phrase.
4. If you cannot find a direct quote for a claim, mark it as N/A.
```

### Test Case (Extraction)
- **Input:** "BERT: Pre-training of Deep Bidirectional Transformers..." (Abstract text)
- **Expected Matrix Row:**
    - **Methodology:** Bidirectional Transformer pre-training.
    - **Dataset:** BooksCorpus & Wikipedia.
    - **Result:** State-of-the-art results on 11 NLP tasks.
    - **Source Quote:** "BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context."

---

## 4. Claim Verification (Citations)
**Mục tiêu:** Kiểm tra chéo giữa nhận định của người dùng và bằng chứng thực tế từ tài liệu.

### System Prompt
```text
You are an expert scientific fact-checker. Evaluate if the claim is supported by the abstract.
Rules:
1. Categories: SUPPORTED, PARTIALLY SUPPORTED, NOT SUPPORTED.
2. Precision: Distinguish between causation vs correlation.
3. Grounding: You MUST provide a direct quote from the abstract.
```

### Test Cases (Verify)
| Claim | Abstract Context | Expected Status |
|-------|------------------|-----------------|
| "AI reduces radiologist fatigue" | "Study shows AI improves speed by 20%..." | **PARTIALLY SUPPORTED** (Improves speed, doesn't directly mention fatigue). |
| "X causes Y" | "X is associated with Y" | **NOT SUPPORTED** (Correlation is not causation). |

---

## 5. Search Keyword Optimization
**Mục tiêu:** Tối ưu hóa query để tìm được nhiều tài liệu chất lượng nhất trên Semantic Scholar.

### System Prompt
```text
Extract the 3 to 5 most important core scientific concepts/keywords and output them as a single space-separated search query string. Do NOT include punctuation.
```

### Test Case (Search)
- **Input:** "Tôi muốn tìm các nghiên cứu về việc dùng AI để phát hiện bệnh sâu răng từ hình ảnh X-ray"
- **Expected Search Query:** `AI dental caries detection X-ray`
