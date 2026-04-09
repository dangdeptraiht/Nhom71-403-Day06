"use client";

import React, { useEffect, useState } from "react";
import ComparisonTable, { PaperExtract } from "@/components/synthesis/ComparisonTable";
import { Database, Loader2, ArrowLeft } from "lucide-react";
import { useSessionStore } from "@/lib/store";
import { extractPapers } from "@/lib/api";
import { useRouter } from "next/navigation";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";

export default function SynthesisPage() {
  const { selectedPapers } = useSessionStore();
  const [data, setData] = useState<PaperExtract[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (selectedPapers.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    extractPapers(selectedPapers)
      .then(res => setData(res))
      .catch(err => alert("AI Extraction Timeout/Error: " + err))
      .finally(() => setLoading(false));
  }, [selectedPapers]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-white p-2 md:p-3 overflow-hidden">
      {/* Background Grid Lines synced (15% brighter white) */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>

      <div className="relative z-10 w-full mx-auto mt-2 px-2">
        <header className="mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
          <HoverBorderGradient
            containerClassName="rounded-full"
            as="button"
            className="bg-slate-900 text-white flex items-center p-2 md:p-2.5"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
          </HoverBorderGradient>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 md:p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Database className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold">Deep Synthesis Matrix</h1>
              <p className="text-slate-400 text-[10px] md:text-xs mt-0.5">
                Hover vào nút &quot;Source Check&quot; để đối chiếu độ tin cậy của bảng (Grounded AI).
              </p>
            </div>
          </div>
        </header>
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden p-2 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-slate-400 animate-pulse text-sm text-center max-w-sm">
                AI đang đọc hiểu Abstracts và bóc tách dữ liệu có cấu trúc... <br/>(Sẽ tốn khoảng 5-15 giây)
              </p>
            </div>
          ) : data.length > 0 ? (
            <ComparisonTable data={data} />
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              Chưa có dữ liệu bài báo nào được chọn để trích xuất.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
