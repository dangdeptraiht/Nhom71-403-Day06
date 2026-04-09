"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Send,
  ArrowRight,
  Layout,
  History,
  User,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  GraduationCap,
  Search,
  CheckCircle2,
  Info,
  ShieldCheck,
  ChevronRight,
  Activity,
  Database,
  ThumbsUp,
  ThumbsDown,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { SparklesCore } from "@/components/ui/sparkles";
import ComparisonTable from "@/components/synthesis/ComparisonTable";
import { AgentThoughtProcess } from "@/components/chat/AgentThoughtProcess";
import { PillAlert } from "@/components/chat/PillAlert";
import { Tooltip } from "@/components/ui/tooltip-card";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "assistant";
  type: "text" | "papers" | "matrix" | "verify_result" | "loading";
  content?: string;
  papers?: any[];
  matrix?: any[];
  verifyResult?: {
    title: string;
    segments: Array<{
      claim: string;
      status: string;
      sources: Array<{ id: string; title: string, abstract: string }>;
    }>;
    conclusion: string;
  };
};

function ChatRoomContent() {
  const searchParams = useSearchParams();
  const initQuery = searchParams.get("q");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"research" | "verify">("research");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [activeDetail, setActiveDetail] = useState<{ title: string, content: string, source_quote?: string } | null>(null);
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [isWorkstationMode, setIsWorkstationMode] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [workstationMatrix, setWorkstationMatrix] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const initializedRef = React.useRef(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Theme Constants
  const theme = mode === "research"
    ? {
      primary: "indigo",
      accent: "blue",
      glow: "rgba(79, 70, 229, 0.15)",
      icon: <GraduationCap className="w-5 h-5 text-white" />,
      label: "Research Mode"
    }
    : {
      primary: "amber",
      accent: "orange",
      glow: "rgba(245, 158, 11, 0.15)",
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      label: "Verification Mode"
    };

  useEffect(() => {
    fetchHistory();
    if (initQuery && !initializedRef.current) {
      initializedRef.current = true;
      handleUserSubmit(initQuery);

      // Clear URL params after first submit
      if (typeof window !== "undefined") {
        const newUrl = window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }
  }, [initQuery]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/sessions");
      const data = await res.json();
      if (data.status === "success") setHistory(data.data);
    } catch (e) { console.error("History fetch failed", e); }
  };

  const loadSession = async (sid: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/sessions/${sid}`);
      const data = await res.json();
      if (data.status === "success") {
        setSessionId(sid);
        setMessages(data.data.messages || []);
        setWorkstationMatrix(data.data.matrix || []);
        setIsWorkstationMode((data.data.matrix || []).length > 0);
      }
    } catch (e) { console.error("Session load failed", e); }
    finally { setIsProcessing(false); }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setWorkstationMatrix([]);
    setIsWorkstationMode(false);
    setInput("");
  };

  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (!confirm("Xóa cuộc hội thoại này?")) return;
    try {
      await fetch(`http://localhost:8000/api/v1/sessions/${sid}`, { method: "DELETE" });
      if (sessionId === sid) handleNewChat();
      fetchHistory();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirm("Xóa toàn bộ lịch sử hội thoại? Hành động này không thể hoàn tác.")) return;
    try {
      await fetch(`http://localhost:8000/api/v1/sessions`, { method: "DELETE" });
      handleNewChat();
      fetchHistory();
    } catch (e) {
      console.error("Clear all failed", e);
    }
  };

  const handleUserSubmit = async (query: string) => {
    if (!query.trim() || isProcessing) return;

    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", type: "text", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    const activeThoughtId = `thought-${Date.now()}`;
    const activePapersId = `papers-${Date.now()}`;
    let currentMatrix: any[] = [];

    try {
      const response = await fetch("http://localhost:8000/api/v1/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          session_id: sessionId,
          mode: mode
        }),
      });

      // Get Session ID from header if it was newly created
      const newSid = response.headers.get("X-Session-ID");
      if (newSid) setSessionId(newSid);

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.replace("data: ", "");
          try {
            const event = JSON.parse(jsonStr);
            const { type, payload } = event;

            if (type === "thought" || type === "error") {
              setMessages((prev) => {
                const filtered = prev.filter(m => m.id !== activeThoughtId);
                return [...filtered, {
                  id: activeThoughtId,
                  role: "assistant",
                  type: type === "error" ? "text" : "loading",
                  content: payload
                }];
              });
            } else if (type === "papers") {
              setMessages((prev) => [
                ...prev,
                {
                  id: activePapersId,
                  role: "assistant",
                  type: "papers",
                  content: `Đã đề xuất chiến lược tìm kiếm: "${payload.query}"`,
                  papers: payload.results
                }
              ]);
            } else if (type === "matrix_row") {
              setIsWorkstationMode(true);
              currentMatrix = [...currentMatrix, payload];
              setWorkstationMatrix([...currentMatrix]);

              const matrixId = "live-matrix";
              setMessages((prev) => {
                const filtered = prev.filter(m => m.id !== matrixId);
                return [...filtered, {
                  id: matrixId,
                  role: "assistant",
                  type: "matrix",
                  content: "Ma trận Tổng hợp Chuyên sâu (Phiên hiện tại)",
                  matrix: currentMatrix
                }];
              });
            } else if (type === "verify_result") {
              setMessages((prev) => {
                const filtered = prev.filter(m => m.id !== activeThoughtId);
                return [
                  ...filtered,
                  {
                    id: `verify-${Date.now()}`,
                    role: "assistant",
                    type: "verify_result",
                    verifyResult: payload
                  }
                ];
              });
            } else if (type === "text") {
              setMessages((prev) => {
                const filtered = prev.filter(m => m.id !== activeThoughtId);
                return [
                  ...filtered,
                  { id: `final-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, role: "assistant", type: "text", content: payload }
                ];
              });
            }
          } catch (err) {
            console.error("Error parsing SSE:", err);
          }
        }
      }
    } catch (e) {
      setMessages((prev) => [...prev, { id: `${Date.now()}-err`, role: "assistant", type: "text", content: "Mất kết nối với Agent. Vui lòng thử lại." }]);
    } finally {
      setIsProcessing(false);
      fetchHistory();
    }
  };

  const handleLoadMore = async (msgId: string, query: string) => {
    const currentOffset = (offsets[msgId] || 15);
    setIsProcessing(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: query, limit: 15, offset: currentOffset }),
      });
      const data = await res.json();

      setMessages((prev) => prev.map(m => {
        if (m.id === msgId) {
          return { ...m, papers: [...(m.papers || []), ...data.data.papers] };
        }
        return m;
      }));
      setOffsets({ ...offsets, [msgId]: currentOffset + 15 });
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeExtraction = async (selectedPapers: any[]) => {
    setIsProcessing(true);
    const loadId = Date.now().toString();
    setMessages((prev) => [...prev, { id: loadId, role: "assistant", type: "loading", content: "Đang yêu cầu AI vắt kiệt Abstract và bóc tách dữ liệu có cấu trúc..." }]);

    try {
      const res = await fetch("http://localhost:8000/api/v1/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ papers: selectedPapers }),
      });
      const data = await res.json();

      setMessages((prev) => prev.filter(m => m.id !== loadId));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          type: "matrix",
          content: "Deep Synthesis Matrix đã hoàn thành! Bảng dữ liệu có thể tương tác (Thumbs up/down) để luyện AI trực tiếp.",
          matrix: data.data
        }
      ]);
    } catch (e) {
      setMessages((prev) => prev.filter(m => m.id !== loadId));
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", type: "text", content: "Lỗi kiệt sức API hoặc Timeout khi Extraction." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`relative flex h-screen bg-slate-950 text-white font-sans overflow-hidden transition-colors duration-700 ${mode === "research" ? "selection:bg-indigo-500/30" : "selection:bg-amber-500/30"}`}>
      {/* Dynamic Background Glow */}
      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${mode === "research" ? "opacity-30" : "opacity-0"}`}>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
      </div>
      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${mode === "verify" ? "opacity-30" : "opacity-0"}`}>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Landing-Synced Background Grid */}
      <div className="absolute inset-0 [background-size:40px_40px] [background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] z-0 pointer-events-none" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] z-0"></div>

      {/* LEFT SIDEBAR - Navigation & History */}
      <aside className={`relative z-20 w-64 border-r border-slate-800 bg-slate-900/40 backdrop-blur-xl flex flex-col hidden md:flex transition-all duration-500 ${mode === "verify" ? "border-amber-900/20" : "border-slate-800"}`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 relative overflow-hidden group">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl z-10 ${mode === "research" ? "bg-indigo-600 shadow-indigo-600/40" : "bg-amber-600 shadow-amber-600/40"}`}>
            {theme.icon}
          </div>
          <span className="font-mono font-bold text-sm tracking-tight z-10">NEXUS AI</span>

          {/* Logo Sparkles (Unified Branding) */}
          <div className="absolute bottom-[-100%] left-0 w-full h-full opacity-30 pointer-events-none group-hover:bottom-0 transition-all duration-700">
            <div className="w-full h-full relative">
              <SparklesCore
                background="transparent"
                minSize={0.2}
                maxSize={0.8}
                particleDensity={500}
                className="w-full h-full"
                particleColor="#FFFFFF"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-2xl border border-dashed transition-all font-bold text-xs uppercase tracking-widest ${mode === "research" ? "border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/5" : "border-amber-500/30 text-amber-400 hover:bg-amber-500/5"}`}
          >
            <Send className="w-4 h-4 rotate-[-45deg]" /> New Conversation
          </button>

          <div className="group">
            <div className={`text-[9px] font-black uppercase tracking-[0.2em] mb-4 px-2 transition-colors ${mode === "research" ? "text-indigo-500" : "text-amber-500"}`}>Current Protocol</div>
            <div className={`p-3 rounded-2xl border transition-all duration-500 ${mode === "research" ? "bg-indigo-500/5 border-indigo-500/10" : "bg-amber-500/5 border-amber-500/10"}`}>
              <div className="text-[11px] font-bold text-slate-200 mb-1">{theme.label}</div>
              <div className="text-[9px] text-slate-500 leading-relaxed font-mono">
                {mode === "research" ? "Scanning 200M+ papers for semantic clusters." : "Cross-referencing claims with grounded baseline citations."}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">History</div>
            <div className="space-y-1">
              {history.length > 0 ? history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadSession(item.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-full cursor-pointer transition-all group/item ${sessionId === item.id ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sessionId === item.id ? "bg-indigo-400" : "bg-slate-700"}`} />
                    <span className="text-[10px] font-bold truncate">{item.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, item.id)}
                    className="p-1 opacity-0 group-hover/item:opacity-100 hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )) : (
                <div className="px-3 py-2 text-[10px] text-slate-600 italic">No previous sessions</div>
              )}
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="mt-4 px-3 py-1 text-[9px] font-bold text-slate-600 hover:text-rose-400 transition-colors uppercase tracking-tighter"
              >
                Clear all memory
              </button>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-white rounded-full transition-colors">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <div className="flex items-center gap-3 px-3 py-2 border border-slate-800 rounded-full bg-slate-900/50">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <User className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold truncate">Linh Nguyen</div>
              <div className="text-[8px] text-slate-500 truncate uppercase">Premium</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MIDDLE SECTION - Chat & Workstation Stage */}
      <main className="relative z-10 flex-1 flex transition-all duration-700 overflow-hidden">

        {/* CHAT PANEL (Left side in split, Full width in chat mode) */}
        <div className={`flex flex-col h-full border-r border-slate-800/10 transition-all duration-700 ${isWorkstationMode && !isMaximized ? "w-[35%] opacity-90" : isMaximized ? "w-0 opacity-0 pointer-events-none" : "w-full"}`}>
          <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-xl p-5 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-6 px-2">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(79,70,229,0.4)] animate-pulse"></div>
                <span className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Unified Neural Stream</span>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && null}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} w-full`}>
                  <div className={`transition-all duration-500 ${msg.role === "user" ? "p-4 rounded-3xl bg-indigo-600 shadow-xl shadow-indigo-600/10 max-w-[80%]" : "w-full"}`}>

                    {msg.role === "user" && <div className="text-sm font-medium text-white">{msg.content}</div>}

                    {msg.type === "loading" && msg.content && (
                      <PillAlert
                        type="info"
                        title="Intelligence Activity"
                        message={msg.content}
                      />
                    )}

                    {msg.type === "text" && msg.content && (msg.content.includes("Vui lòng") || msg.content.includes("Mất kết nối")) && (
                      <PillAlert
                        type="error"
                        title="Intelligence Halted"
                        message={msg.content}
                      />
                    )}

                    {msg.type === "text" && msg.role === "assistant" && msg.content && !(msg.content.includes("Vui lòng") || msg.content.includes("Mất kết nối")) && (
                      <div className="text-sm font-medium text-slate-300 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/40 leading-relaxed shadow-xl mt-2 mb-4 backdrop-blur-md">
                        {msg.content}
                      </div>
                    )}

                    {msg.type === "verify_result" && msg.verifyResult && (
                      <div className="space-y-6 bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl mt-4 mb-8 backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
                          <div className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">{msg.verifyResult.title}</div>
                          <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
                        </div>

                        <div className="space-y-4">
                          {msg.verifyResult.segments.map((seg, idx) => (
                            <div key={idx} className="p-6 bg-slate-950/40 border border-white/5 rounded-[1.8rem] transition-all hover:bg-slate-900/60 group">
                              <div className="text-sm text-slate-300 leading-relaxed mb-5 group-hover:text-white transition-colors">"{seg.claim}"</div>
                              <div className="flex flex-wrap items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${seg.status === 'SUPPORTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800/50 text-slate-600 border border-slate-800'}`}>
                                  {seg.status === 'SUPPORTED' ? 'Đã xác thực' : 'Chưa tìm thấy nguồn'}
                                </span>
                                {seg.sources.map((s) => (
                                  <Tooltip
                                    key={s.id}
                                    content={
                                      <div className="max-w-xs space-y-3 p-2">
                                        <div className="font-bold text-indigo-300 text-[11px] leading-snug">{s.title}</div>
                                        <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-5 italic px-3 border-l-2 border-indigo-500/30">"{s.abstract}"</div>
                                        <div className="text-[8px] text-slate-500 uppercase tracking-tighter pt-2 border-t border-white/5">Nhấn để xem chi tiết học thuật</div>
                                      </div>
                                    }
                                  >
                                    <div
                                      onClick={() => { setActiveDetail({ title: s.title, content: s.abstract }); setShowDetail(true); }}
                                      className="cursor-help px-4 py-1.5 bg-indigo-500/5 text-indigo-400/80 border border-white/5 rounded-full text-[9px] font-bold hover:bg-indigo-500/20 hover:text-indigo-200 transition-all flex items-center gap-2 group/cite"
                                    >
                                      Trích dẫn học thuật
                                      <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/cite:opacity-100 -translate-x-2 group-hover/cite:translate-x-0 transition-all" />
                                    </div>
                                  </Tooltip>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-slate-800/60 text-[11px] text-slate-400 italic leading-relaxed px-2">
                          {msg.verifyResult.conclusion}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </AnimatePresence>
          </div>

          <div className="p-6 relative bg-transparent">
            {/* Mode Selector */}
            <div className="max-w-xs mx-auto mb-6 flex justify-center">
              <div className="bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-full border border-white/5 flex items-center relative overflow-hidden shadow-2xl">
                <motion.div
                  className="absolute inset-y-1 rounded-full bg-indigo-600 shadow-lg shadow-indigo-600/20"
                  animate={{
                    x: mode === "research" ? 4 : 88,
                    width: mode === "research" ? 80 : 80
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button
                  onClick={() => setMode("research")}
                  className={`relative z-10 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors duration-200 ${mode === "research" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Nghiên cứu
                </button>
                <button
                  onClick={() => setMode("verify")}
                  className={`relative z-10 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors duration-200 ${mode === "verify" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  Trích dẫn
                </button>
              </div>
            </div>

            {/* Floating Input Container */}
            <div className="max-w-2xl mx-auto relative group">
              <div className={`absolute inset-0 blur-xl transition-all rounded-full z-0 ${mode === "research" ? "bg-indigo-500/5 group-focus-within:bg-indigo-500/10" : "bg-emerald-500/5 group-focus-within:bg-emerald-500/10"}`} />
              <div className="relative z-10">
                <PlaceholdersAndVanishInput
                  placeholders={mode === "research" ? [
                    " ",
                  ] : [
                    " ",
                  ]}
                  onChange={(e) => setInput(e.target.value)}
                  onSubmit={(e) => { e.preventDefault(); handleUserSubmit(input); }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* WORKSTATION STAGE (Right side / Focus Area) */}
        {isWorkstationMode && (
          <div className={`flex flex-col h-full bg-slate-900/40 backdrop-blur-3xl transition-all duration-700 ease-in-out relative ${isMaximized ? "w-full" : "w-[65%] border-l border-slate-800"}`}>
            <header className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-950/60 backdrop-blur-xl sticky top-0 z-20">
              <div className="flex items-center gap-4 px-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-100">Synthesis Workstation</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                  title={isMaximized ? "Minimize" : "Maximize Workspace"}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsWorkstationMode(false)}
                  className="p-2 hover:bg-rose-500/20 hover:text-rose-400 rounded-full text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            <div className={`flex-1 overflow-auto p-6 md:p-8 custom-scrollbar transition-all ${isMaximized ? "max-w-7xl mx-auto w-full" : ""}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Active Research Synthesis</h1>
                  <p className="text-slate-500 text-sm max-w-2xl font-mono leading-relaxed">Bộ ma trận được kiến tạo dựa trên phân tích cấu trúc từ abstracts của {workstationMatrix.length} tài liệu hàn lâm.</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-[2.5rem] p-4 shadow-3xl overflow-hidden relative">
                  <div className="absolute top-0 right-10 w-20 h-[1px] bg-indigo-500/30"></div>
                  <ComparisonTable data={workstationMatrix} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Stability", value: "98.2%", icon: <Activity className="w-3.5 h-3.5 text-emerald-400" /> },
                    { label: "Grounding", value: "Verified", icon: <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> },
                    { label: "Vectorized", value: "Real-time", icon: <Database className="w-3.5 h-3.5 text-amber-400" /> }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-between px-6">
                      <div className="flex items-center gap-3">
                        {stat.icon}
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                      </div>
                      <span className="text-xs font-mono font-bold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT SIDEBAR - Detail View */}
      <AnimatePresence>
        {!isMaximized && activeDetail && (
          <motion.aside
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-0 right-0 z-50 w-full md:w-96 h-full border-l border-slate-800 bg-slate-950 shadow-2xl flex flex-col pt-16"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-indigo-400">Deep Insights</span>
              <button onClick={() => setActiveDetail(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <h3 className="text-xl font-bold text-white">{activeDetail.title}</h3>
              <p className="text-sm leading-8 text-slate-400 text-justify">{activeDetail.content}</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatRoom() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
      <ChatRoomContent />
    </Suspense>
  );
}
