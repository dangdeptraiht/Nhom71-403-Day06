"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles, BrainCircuit } from "lucide-react";

interface AgentThoughtProcessProps {
  thoughts: string;
  isCollapsed?: boolean;
}

export const AgentThoughtProcess = ({ thoughts, isCollapsed: initialCollapsed = false }: AgentThoughtProcessProps) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  return (
    <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/5 transition-all">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
             <BrainCircuit className="w-5 h-5 text-indigo-400" />
             <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full animate-pulse"></div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Agent Reasoning Flow</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
             {[0, 1, 2].map((i) => (
               <motion.div
                 key={i}
                 animate={{ opacity: [0.3, 1, 0.3] }}
                 transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                 className="w-1 h-1 rounded-full bg-indigo-400"
               />
             ))}
          </div>
          {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0">
               <div className="relative p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50">
                  <p className="text-xs leading-relaxed text-slate-400 font-mono">
                    <span className="text-indigo-400 mr-2">➜</span>
                    {thoughts}
                  </p>
                  <div className="absolute bottom-2 right-2 opacity-20">
                    <Sparkles className="w-3 h-3 text-indigo-300" />
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
