"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Info, ThumbsUp, ThumbsDown, Edit2, Check, X, Loader2 } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip-card";

export type PaperExtract = {
  id: string;
  paper_title: string;
  methodology: string;
  datasets: string;
  key_findings: string;
  limitations: string;
  source_quote: string;
  abstract?: string;
  authors?: string;
  year?: string | number;
  venue?: string;
};

interface Props {
  data: PaperExtract[];
}

export default function ComparisonTable({ data }: Props) {
  const [editingCell, setEditingCell] = useState<{id: string, col: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState<string | null>(null);
  const [localData, setLocalData] = useState<PaperExtract[]>(data);

  // Sync props to local on change (Critical for streaming updates)
  React.useEffect(() => { 
    setLocalData(data); 
  }, [data]);

  const handleFeedback = async (paperId: string, type: "thumbs_up" | "thumbs_down") => {
    setLoadingFeedback(`${paperId}-${type}`);
    try {
      await fetch("http://localhost:8000/api/v1/signals/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper_id: paperId, signal_type: type })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeedback(null);
    }
  };

  const saveCorrection = async (paperId: string, colKey: keyof PaperExtract, originalVal: string) => {
    try {
      await fetch("http://localhost:8000/api/v1/signals/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper_id: paperId, field: colKey, original_value: originalVal, corrected_value: editValue })
      });
      // update local
      setLocalData(prev => prev.map(p => p.id === paperId ? { ...p, [colKey]: editValue } : p));
    } catch (e) {
      console.error(e);
    }
    setEditingCell(null);
  };

  if (!localData || localData.length === 0) return <div className="text-white">Trống</div>;

  const columns = [
    { key: 'methodology', label: 'Methodology / Model' },
    { key: 'datasets', label: 'Dataset Used' },
    { key: 'key_findings', label: 'Key Findings' },
    { key: 'limitations', label: 'Limitations' },
  ] as const;

  return (
    <div className="w-full relative">
      <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-[2rem] bg-slate-950/20 shadow-3xl overflow-y-hidden">
        <table className="w-full text-left border-collapse min-w-[1100px] table-fixed">
          <thead>
            <tr className="bg-slate-900 sticky top-0 z-20">
              <th className="p-4 border-b border-slate-800 text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] w-[260px] sticky left-0 z-30 bg-slate-900 after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[1px] after:bg-slate-800">
                Paper Core
              </th>
              {columns.map(col => (
                <th key={col.key} className="p-4 border-b border-slate-800 text-slate-500 font-black text-[9px] uppercase tracking-[0.2em]">
                  {col.label}
                </th>
              ))}
              <th className="p-4 border-b border-slate-800 text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] w-[70px]">
                Feed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {localData.map((row, idx) => (
              <motion.tr 
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group/row hover:bg-indigo-500/[0.03] transition-colors relative"
              >
                {/* STICKY FIRST COLUMN WITH SHADOW INDICATOR */}
                <td className="p-4 align-top sticky left-0 z-10 bg-slate-950/80 backdrop-blur-md group-hover/row:bg-slate-900 transition-colors border-r border-slate-800/50 shadow-[4px_0_15px_-5px_rgba(0,0,0,0.5)]">
                  <Tooltip
                    content={
                      <div className="w-[450px] p-6 bg-slate-950/90 backdrop-blur-3xl border border-slate-800 rounded-[2rem] shadow-5xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Abstract Insight</span>
                            <span className="text-[10px] font-mono font-bold text-slate-500 italic">{row.year || 'N/A'} &middot; {row.venue || 'Academic Paper'}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white mb-3 leading-tight">{row.paper_title}</h4>
                          <div className="text-[10px] text-slate-500 mb-4 uppercase tracking-tighter font-medium truncate">{row.authors}</div>
                          <div className="h-[1px] w-full bg-slate-800/60 mb-4"></div>
                          <div className="max-h-[250px] overflow-y-auto custom-scrollbar-mini pr-2">
                             <p className="text-[11px] text-slate-400 leading-relaxed text-justify italic">
                               {row.abstract || "Abstract not available for this session summary."}
                             </p>
                          </div>
                          <div className="mt-6 flex justify-end">
                             <span className="text-[9px] text-slate-600 font-mono italic">Scroll for full text &middot; Real-time Synthesis</span>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <div className="font-bold text-slate-200 text-xs leading-relaxed mb-3 group-hover/row:text-indigo-400 transition-colors cursor-help hover:underline decoration-indigo-500/30 underline-offset-4">
                      {row.paper_title}
                    </div>
                  </Tooltip>
                  
                  <Tooltip 
                    content={
                      <div className="w-80 pointer-events-auto p-4 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-4xl group/tt relative z-[10000]">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                           <span className="font-black text-[9px] text-indigo-400 uppercase tracking-widest">Grounded Evidence</span>
                        </div>
                        <p className="text-slate-300 italic leading-relaxed text-xs mb-3">
                          &quot;{row.source_quote}&quot;
                        </p>
                        <a 
                          href={`https://www.semanticscholar.org/paper/${row.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Check original source ↗
                        </a>
                      </div>
                    }
                  >
                    <a 
                      href={`https://www.semanticscholar.org/paper/${row.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/20 cursor-pointer transition-all"
                    >
                      <Info className="w-3 h-3" /> src check
                    </a>
                  </Tooltip>
                </td>
                
                {columns.map(col => {
                  const isEditing = editingCell?.id === row.id && editingCell?.col === col.key;
                  const cellValue = row[col.key as keyof PaperExtract] as string;
                  
                  return (
                    <td key={col.key} className="p-4 align-top text-xs relative group/cell">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea 
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            autoFocus
                            className="w-full bg-slate-900 border border-indigo-500/50 rounded-2xl text-slate-200 p-3 text-xs focus:outline-none min-h-[80px]"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingCell(null)} className="p-1 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X className="w-4 h-4"/></button>
                            <button onClick={() => saveCorrection(row.id, col.key as keyof PaperExtract, cellValue)} className="px-3 py-1 bg-indigo-600 rounded-full text-white text-[9px] font-black uppercase tracking-widest">Apply</button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <Tooltip 
                            content={
                              <div className="max-w-xs p-2 text-[10px] leading-relaxed">
                                {cellValue}
                              </div>
                            }
                          >
                            <div className={`leading-relaxed line-clamp-3 ${cellValue === "N/A" ? "italic text-slate-700 font-mono text-center" : "text-slate-400 group-hover/row:text-slate-200"}`}>
                              {cellValue === "N/A" ? "-" : cellValue}
                            </div>
                          </Tooltip>
                          <button 
                            onClick={() => { setEditingCell({id: row.id, col: col.key}); setEditValue(cellValue); }}
                            className="absolute -right-2 top-0 opacity-0 group-hover/row:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                          >
                            <span className="text-[8px] text-slate-500">edit</span>
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
                
                <td className="p-4 align-middle">
                  <div className="flex flex-col gap-2 opacity-0 group-hover/row:opacity-100 transition-all items-center">
                    <button 
                      onClick={() => handleFeedback(row.id, "thumbs_up")}
                      className="p-2 rounded-full border border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-slate-600 hover:text-emerald-500 transition-all"
                    >
                      {loadingFeedback === `${row.id}-thumbs_up` ? <Loader2 className="w-3 h-3 animate-spin"/> : <ThumbsUp className="w-3 h-3" />}
                    </button>
                    <button 
                      onClick={() => handleFeedback(row.id, "thumbs_down")}
                      className="p-2 rounded-full border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/5 text-slate-600 hover:text-rose-500 transition-all"
                    >
                       {loadingFeedback === `${row.id}-thumbs_down` ? <Loader2 className="w-3 h-3 animate-spin"/> : <ThumbsDown className="w-3 h-3" />}
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[9px] font-mono text-slate-600 uppercase tracking-widest pl-2">
         <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
         Horizontal scroll enabled for deep data view &middot; Sticky paper cores
      </div>
    </div>
  );
}
