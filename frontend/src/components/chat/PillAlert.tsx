"use client";
import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, ShieldAlert, Info, X } from "lucide-react";

interface PillAlertProps {
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  onClose?: () => void;
}

export const PillAlert = ({ type, title, message, onClose }: PillAlertProps) => {
  const styles = {
    error: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      text: "text-rose-400",
      glow: "shadow-rose-500/10",
      icon: <ShieldAlert className="w-5 h-5 text-rose-500" />
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-400",
      glow: "shadow-amber-500/10",
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />
    },
    info: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      text: "text-indigo-400",
      glow: "shadow-indigo-500/10",
      icon: <Info className="w-5 h-5 text-indigo-500" />
    }
  };

  const current = styles[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`relative w-full max-w-xl ${current.bg} backdrop-blur-2xl border ${current.border} ${current.glow} shadow-2xl rounded-full px-6 py-4 flex items-center justify-between group`}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-slate-950/40 rounded-full border border-white/5">
          {current.icon}
        </div>
        <div>
          <h4 className={`text-[10px] font-black uppercase tracking-widest ${current.text} mb-0.5`}>{title}</h4>
          <p className="text-xs text-slate-300 font-medium">{message}</p>
        </div>
      </div>
      
      {onClose && (
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};
