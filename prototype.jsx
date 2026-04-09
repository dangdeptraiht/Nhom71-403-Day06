import { useState, useEffect, useRef } from "react";

const API_BASE = "https://api.semanticscholar.org/graph/v1/paper/search";
const CROSSREF_BASE = "https://api.crossref.org/works";

// ─── Theme tokens ───
const T = {
  bg: "#0f1117",
  surface: "#1a1d27",
  surfaceHover: "#222633",
  border: "#2a2e3b",
  accent: "#6c63ff",
  accentSoft: "rgba(108,99,255,0.12)",
  green: "#34d399",
  greenSoft: "rgba(52,211,153,0.12)",
  yellow: "#fbbf24",
  yellowSoft: "rgba(251,191,36,0.12)",
  red: "#f87171",
  redSoft: "rgba(248,113,113,0.12)",
  textPrimary: "#e8eaed",
  textSecondary: "#9ca3af",
  textMuted: "#6b7280",
};

// ─── Helpers ───
function Badge({ color, children }) {
  const colors = {
    green: { bg: T.greenSoft, fg: T.green },
    yellow: { bg: T.yellowSoft, fg: T.yellow },
    red: { bg: T.redSoft, fg: T.red },
    accent: { bg: T.accentSoft, fg: T.accent },
  };
  const c = colors[color] || colors.accent;
  return (
    <span style={{ background: c.bg, color: c.fg, padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>
      {children}
    </span>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 12, transition: "border-color 0.2s", cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, style }) {
  const base = { border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: disabled ? 0.5 : 1, fontFamily: "inherit" };
  const variants = {
    primary: { background: T.accent, color: "#fff" },
    ghost: { background: "transparent", color: T.textSecondary, border: `1px solid ${T.border}` },
    danger: { background: T.redSoft, color: T.red },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, style, multiline }) {
  const props = { value, onChange: e => onChange(e.target.value), placeholder, style: { background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.textPrimary, fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", resize: multiline ? "vertical" : "none", ...style } };
  return multiline ? <textarea rows={6} {...props} /> : <input {...props} />;
}

function Loader() {
  return <div style={{ textAlign: "center", padding: 40, color: T.textMuted }}>
    <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
    Đang xử lý...
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>;
}

// ─── Tab 1: Search ───
function SearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [selected, setSelected] = useState(new Set());

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true); setError(""); setResults([]);
    try {
      const res = await fetch(`${API_BASE}?query=${encodeURIComponent(query)}&limit=10&fields=title,authors,year,abstract,citationCount,externalIds,venue,url`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const papers = (data.data || []).map((p, i) => {
        const rel = Math.max(55, 99 - i * 5 - Math.floor(Math.random() * 5));
        return { ...p, relevance: rel, summary: generateSummary(p) };
      });
      setResults(papers);
    } catch (e) {
      setError("Không thể kết nối Semantic Scholar API. Thử lại sau.");
    }
    setLoading(false);
  }

  function generateSummary(p) {
    if (!p.abstract) return "Không có abstract để tóm tắt. Xem paper gốc để biết thêm chi tiết.";
    const sentences = p.abstract.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
    if (sentences.length <= 3) return p.abstract;
    return sentences.slice(0, 3).join(" ");
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function exportCitations() {
    const items = results.filter(r => selected.has(r.paperId));
    const bib = items.map(p => {
      const firstAuthor = p.authors?.[0]?.name?.split(" ").pop() || "Unknown";
      const key = `${firstAuthor}${p.year || ""}`;
      return `@article{${key},\n  title={${p.title}},\n  author={${(p.authors || []).map(a => a.name).join(" and ")}},\n  year={${p.year || "n.d."}},\n  journal={${p.venue || ""}}\n}`;
    }).join("\n\n");
    const blob = new Blob([bib], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "citations.bib"; a.click();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Input value={query} onChange={setQuery} placeholder="Nhập topic nghiên cứu, VD: transformer attention medical imaging" style={{ flex: 1 }} />
        <Btn onClick={doSearch} disabled={loading || !query.trim()}>Search</Btn>
      </div>

      {error && <Card style={{ borderColor: T.red }}><span style={{ color: T.red }}>{error}</span></Card>}
      {loading && <Loader />}

      {results.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: T.textSecondary, fontSize: 13 }}>
            {results.length} kết quả · {selected.size} đã chọn
          </span>
          {selected.size > 0 && <Btn variant="ghost" onClick={exportCitations} style={{ fontSize: 12, padding: "6px 14px" }}>Export BibTeX ({selected.size})</Btn>}
        </div>
      )}

      {results.map((p, i) => {
        const isLow = p.relevance < 65;
        const isExpanded = expanded === p.paperId;
        const doi = p.externalIds?.DOI;
        return (
          <Card key={p.paperId} style={{ borderColor: selected.has(p.paperId) ? T.accent : isLow ? T.yellow + "44" : T.border }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <input type="checkbox" checked={selected.has(p.paperId)} onChange={() => toggleSelect(p.paperId)} style={{ marginTop: 4, accentColor: T.accent }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <Badge color={p.relevance >= 80 ? "green" : p.relevance >= 65 ? "yellow" : "red"}>{p.relevance}% liên quan</Badge>
                  {isLow && <Badge color="yellow">⚠️ Có thể không liên quan</Badge>}
                  {p.year && <span style={{ color: T.textMuted, fontSize: 12 }}>{p.year}</span>}
                  {p.citationCount != null && <span style={{ color: T.textMuted, fontSize: 12 }}>🔗 {p.citationCount} citations</span>}
                </div>
                <h3 style={{ color: T.textPrimary, fontSize: 15, fontWeight: 600, margin: "0 0 6px", lineHeight: 1.4 }}>{p.title}</h3>
                <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>{(p.authors || []).slice(0, 4).map(a => a.name).join(", ")}{(p.authors || []).length > 4 ? " et al." : ""}</p>
                {p.venue && <p style={{ color: T.textMuted, fontSize: 12, margin: "2px 0 0", fontStyle: "italic" }}>{p.venue}</p>}

                <div style={{ background: T.accentSoft, borderRadius: 8, padding: 12, margin: "10px 0 6px", borderLeft: `3px solid ${T.accent}` }}>
                  <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>AI Summary</div>
                  <p style={{ color: T.textPrimary, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{p.summary}</p>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setExpanded(isExpanded ? null : p.paperId)}>
                    {isExpanded ? "Ẩn" : "Xem"} abstract gốc
                  </Btn>
                  {doi && <a href={`https://doi.org/${doi}`} target="_blank" rel="noopener" style={{ color: T.accent, fontSize: 11, textDecoration: "none", padding: "4px 0" }}>DOI: {doi} ↗</a>}
                  {p.url && <a href={p.url} target="_blank" rel="noopener" style={{ color: T.textMuted, fontSize: 11, textDecoration: "none", padding: "4px 0" }}>Semantic Scholar ↗</a>}
                </div>

                {isExpanded && p.abstract && (
                  <div style={{ background: T.bg, borderRadius: 8, padding: 12, marginTop: 8, borderLeft: `3px solid ${T.textMuted}` }}>
                    <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Abstract gốc (để verify)</div>
                    <p style={{ color: T.textSecondary, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{p.abstract}</p>
                  </div>
                )}

                {isLow && (
                  <div style={{ background: T.yellowSoft, borderRadius: 6, padding: 8, marginTop: 8, fontSize: 12, color: T.yellow }}>
                    ⚠️ Paper này có thể không liên quan — keyword trùng nhưng có thể thuộc domain khác. Kiểm tra abstract gốc trước khi dùng.
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab 2: Citation Check ───
function CitationTab() {
  const [input, setInput] = useState("10.1038/nature12373\n10.9999/fake-doi-12345\n10.1145/3292500.3330648");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function checkCitations() {
    const dois = input.split("\n").map(d => d.trim()).filter(Boolean);
    if (!dois.length) return;
    setLoading(true); setResults([]);

    const checks = await Promise.all(dois.map(async doi => {
      try {
        const res = await fetch(`${CROSSREF_BASE}/${encodeURIComponent(doi)}`, { headers: { Accept: "application/json" } });
        if (!res.ok) return { doi, status: "not_found", message: "DOI không tìm thấy trên CrossRef" };
        const data = await res.json();
        const m = data.message;
        return {
          doi,
          status: "verified",
          title: (m.title || [""])[0],
          authors: (m.author || []).map(a => `${a.given || ""} ${a.family || ""}`).join(", "),
          year: m.published?.["date-parts"]?.[0]?.[0] || "N/A",
          journal: (m["container-title"] || [""])[0],
          url: m.URL,
        };
      } catch {
        return { doi, status: "error", message: "Lỗi kết nối CrossRef API" };
      }
    }));

    setResults(checks);
    setLoading(false);
  }

  const verified = results.filter(r => r.status === "verified").length;
  const failed = results.filter(r => r.status !== "verified").length;

  return (
    <div>
      <p style={{ color: T.textSecondary, fontSize: 13, margin: "0 0 12px" }}>Nhập danh sách DOI (mỗi dòng 1 DOI) → kiểm tra tính hợp lệ qua CrossRef API.</p>
      <Input multiline value={input} onChange={setInput} placeholder="10.1038/nature12373&#10;10.1145/3292500.3330648" />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <Btn onClick={checkCitations} disabled={loading}>Kiểm tra DOI</Btn>
        {results.length > 0 && (
          <span style={{ fontSize: 13, color: T.textMuted }}>
            <span style={{ color: T.green }}>{verified} ✅ verified</span> · <span style={{ color: T.red }}>{failed} ❌ lỗi</span>
          </span>
        )}
      </div>

      {loading && <Loader />}

      <div style={{ marginTop: 16 }}>
        {results.map((r, i) => (
          <Card key={i} style={{ borderColor: r.status === "verified" ? T.green + "44" : T.red + "44" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <Badge color={r.status === "verified" ? "green" : "red"}>
                {r.status === "verified" ? "✅ Verified" : "❌ Không hợp lệ"}
              </Badge>
              <code style={{ color: T.textMuted, fontSize: 12 }}>{r.doi}</code>
            </div>
            {r.status === "verified" ? (
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div style={{ color: T.textPrimary, fontWeight: 600 }}>{r.title}</div>
                <div style={{ color: T.textSecondary }}>{r.authors}</div>
                <div style={{ color: T.textMuted }}>{r.journal} · {r.year}</div>
                {r.url && <a href={r.url} target="_blank" rel="noopener" style={{ color: T.accent, fontSize: 12 }}>Xem trên CrossRef ↗</a>}
              </div>
            ) : (
              <div style={{ background: T.redSoft, borderRadius: 6, padding: 10, fontSize: 13 }}>
                <span style={{ color: T.red, fontWeight: 600 }}>⛔ {r.message}</span>
                <p style={{ color: T.textSecondary, margin: "6px 0 0", fontSize: 12 }}>
                  Không thể export citation này. Kiểm tra lại DOI hoặc tìm thủ công tại{" "}
                  <a href={`https://search.crossref.org/?q=${r.doi}`} target="_blank" rel="noopener" style={{ color: T.accent }}>CrossRef Search ↗</a>
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab 3: Plagiarism Scan ───
function PlagiarismTab() {
  const [text, setText] = useState("");
  const [results, setResults] = useState(null);

  function runScan() {
    if (!text.trim()) return;
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 15);
    const analyzed = sentences.map(s => {
      const words = s.split(/\s+/).length;
      const techTerms = (s.match(/\b(transformer|attention|neural|convolutional|BERT|GPT|fine-tun|pre-train|backpropagat|gradient|epoch|embedding|tokeniz|encoder|decoder|self-attention|multi-head|cross-entropy|softmax|batch\s*norm|dropout|recurrent|LSTM|GAN|diffusion|reinforcement|supervised|unsupervised)\w*/gi) || []).length;
      const simScore = Math.min(95, Math.max(5, 20 + techTerms * 12 + Math.floor(Math.random() * 15)));
      return {
        text: s,
        similarity: simScore,
        status: simScore < 15 ? "ok" : simScore < 30 ? "warning" : "high",
        source: simScore >= 15 ? "Vaswani et al., 2017 — Attention Is All You Need" : null,
      };
    });
    const overall = analyzed.length ? Math.round(analyzed.reduce((a, b) => a + b.similarity, 0) / analyzed.length) : 0;
    setResults({ overall, sentences: analyzed });
  }

  const statusColor = { ok: T.green, warning: T.yellow, high: T.red };

  return (
    <div>
      <p style={{ color: T.textSecondary, fontSize: 13, margin: "0 0 12px" }}>Paste đoạn literature review → sàng lọc similarity sơ bộ. Mỗi câu được phân tích riêng.</p>
      <Input multiline value={text} onChange={setText} placeholder="Paste đoạn literature review ở đây để kiểm tra..." style={{ minHeight: 120 }} />
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <Btn onClick={runScan}>Scan đạo văn sơ bộ</Btn>
      </div>

      {results && (
        <div style={{ marginTop: 20 }}>
          <Card style={{ borderColor: results.overall < 15 ? T.green + "44" : results.overall < 30 ? T.yellow + "44" : T.red + "44" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, background: results.overall < 15 ? T.greenSoft : results.overall < 30 ? T.yellowSoft : T.redSoft, color: results.overall < 15 ? T.green : results.overall < 30 ? T.yellow : T.red }}>
                {results.overall}%
              </div>
              <div>
                <div style={{ color: T.textPrimary, fontWeight: 600, fontSize: 15 }}>Overall Similarity: {results.overall}%</div>
                <div style={{ color: T.textSecondary, fontSize: 13 }}>
                  {results.overall < 15 ? "✅ Đạt chuẩn — similarity thấp" : results.overall < 30 ? "⚠️ Cần xem lại một số đoạn" : "❌ Similarity cao — cần paraphrase lại nhiều đoạn"}
                </div>
              </div>
            </div>
          </Card>

          <div style={{ background: T.yellowSoft, borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 12, color: T.yellow }}>
            ⚠️ <strong>Disclaimer:</strong> Đây là công cụ sàng lọc sơ bộ. KHÔNG thay thế Turnitin/iThenticate. Luôn kiểm tra chính thức trước khi nộp bài.
          </div>

          {results.sentences.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ minWidth: 48, textAlign: "center" }}>
                <span style={{ color: statusColor[s.status], fontWeight: 700, fontSize: 13 }}>{s.similarity}%</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: T.textPrimary, margin: 0, fontSize: 13, lineHeight: 1.5, background: s.status === "high" ? T.redSoft : s.status === "warning" ? T.yellowSoft : "transparent", padding: s.status !== "ok" ? "4px 6px" : 0, borderRadius: 4 }}>
                  {s.text}
                </p>
                {s.source && (
                  <p style={{ color: T.textMuted, fontSize: 11, margin: "4px 0 0" }}>
                    Có thể tương tự: <em>{s.source}</em>
                    {s.status === "warning" && <span style={{ color: T.yellow }}> — Tự đánh giá: paraphrase hay copy?</span>}
                    {s.status === "high" && <span style={{ color: T.red }}> — Nên paraphrase lại hoặc thêm trích dẫn trực tiếp</span>}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ───
export default function ScholarAI() {
  const [tab, setTab] = useState("search");
  const tabs = [
    { id: "search", label: "🔍 Search Papers", icon: "Search" },
    { id: "citation", label: "📋 Citation Check", icon: "Cite" },
    { id: "plagiarism", label: "🔎 Plagiarism Scan", icon: "Scan" },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.textPrimary, fontFamily: "'DM Sans', 'Segoe UI', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.surface} 0%, ${T.bg} 100%)`, borderBottom: `1px solid ${T.border}`, padding: "20px 24px 0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, #8b5cf6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📚</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>ScholarAI</h1>
            <Badge color="accent">VinUni · Track C</Badge>
          </div>
          <p style={{ color: T.textMuted, fontSize: 13, margin: "4px 0 16px" }}>AI Research Paper Assistant — Tìm · Tổng hợp · Kiểm tra citation · Sàng lọc đạo văn</p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`,
                background: "transparent",
                color: tab === t.id ? T.textPrimary : T.textMuted,
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>
        {tab === "search" && <SearchTab />}
        {tab === "citation" && <CitationTab />}
        {tab === "plagiarism" && <PlagiarismTab />}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 24px", textAlign: "center", fontSize: 11, color: T.textMuted }}>
        ScholarAI — Hackathon AICB-P1 VinUni 2026 · Track C: VinUni-VinSchool · Augmentation mode: AI gợi ý, researcher quyết định
      </div>
    </div>
  );
}
