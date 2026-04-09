"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Beaker, Loader2, ArrowLeft } from "lucide-react";
import { searchPapers } from "@/lib/api";
import { useSessionStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Tooltip } from "@/components/ui/tooltip-card";
import { NoiseBackground } from "@/components/ui/noise-background";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";

export default function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const resolvedParams = React.use(searchParams);
  const query = resolvedParams.q || "";
  const router = useRouter();
  
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { selectedPapers, setPapers: setStorePapers } = useSessionStore();

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    searchPapers(query)
      .then(res => setPapers(res || []))
      .catch(err => alert(err))
      .finally(() => setLoading(false));
  }, [query]);

  const handleSelect = (paper: any) => {
    const exists = selectedPapers.find(p => p.id === paper.id);
    if(exists) {
      setStorePapers(selectedPapers.filter(p => p.id !== paper.id));
    } else {
      setStorePapers([...selectedPapers, paper]);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white p-2 md:p-3 overflow-hidden">
      {/* Background Grid Lines synced (15% brighter white) */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
      
      <div className="relative z-10 w-full mx-auto mt-2 px-2">
        <header className="mb-6 border-b border-white/10 pb-4 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <HoverBorderGradient
              containerClassName="rounded-full"
              as="button"
              className="bg-slate-900 text-white flex items-center p-2 md:p-2.5"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
            </HoverBorderGradient>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Search Results
              </h1>
              <p className="text-slate-400 mt-1 text-xs md:text-sm">Query: &quot;{query}&quot;</p>
            </div>
          </div>
          <NoiseBackground
            containerClassName="w-fit p-[1px] md:p-[2px] rounded-full shadow-lg"
            gradientColors={["#3b82f6", "#8b5cf6", "#a855f7"]}
          >
            <button 
              disabled={selectedPapers.length === 0}
              onClick={() => router.push('/synthesis')}
              className="flex items-center gap-1.5 md:gap-2 bg-slate-900/80 hover:bg-slate-800 text-white px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold outline-none border border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Beaker className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Deep Synthesize ({selectedPapers.length})
            </button>
          </NoiseBackground>
        </header>

        {loading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
             </div>
          ) : (
            <TracingBeam className="px-2 md:px-4">
              <div className="flex flex-col gap-3">
                {papers.map((paper, idx) => {
                  const isSelected = selectedPapers.some(p => p.id === paper.id);
                  return (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.1, 1) }}
                    key={paper.id}
                    onClick={() => handleSelect(paper)}
                    className="relative list-none cursor-pointer group rounded-xl"
                  >
                    <div className="relative h-full rounded-xl border border-white/10 bg-slate-900/40 p-3 md:p-4 backdrop-blur-md">
                      <GlowingEffect
                        spread={30}
                        glow={true}
                        disabled={false}
                        proximity={64}
                        inactiveZone={0.01}
                      />
                      <div className="relative flex gap-3 items-start z-10">
                        <div className={`mt-0.5 w-4 h-4 md:w-5 md:h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors
                          ${isSelected ? "bg-blue-500 border-blue-500" : "border-slate-600 bg-slate-800/50"}`}>
                          {isSelected && <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-sm md:text-base font-medium text-slate-100 leading-tight line-clamp-2">{paper.title}</h3>
                          </div>
                          <p className="text-[10px] md:text-xs text-slate-400 mb-2.5 inline-flex items-center gap-1.5">
                             <Tooltip 
                               content={<div className="font-medium text-white">Published in {paper.year}</div>}
                             >
                                <span className="hover:text-blue-400 border-b border-dashed border-slate-600 pb-0.5">{paper.authors}</span>
                             </Tooltip>
                             • {paper.year}
                          </p>
                          <div className="text-[11px] md:text-xs text-slate-300 line-clamp-3 leading-relaxed">
                            <span className="font-semibold text-slate-500 border-b border-slate-700 pb-0 mb-1 inline-block">Abstract</span><br/>
                            {paper.abstract}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )})}
              </div>
            </TracingBeam>
          )}
        </div>
    </div>
  );
}
