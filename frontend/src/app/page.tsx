"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { NoiseBackground } from "@/components/ui/noise-background";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { Highlight } from "@/components/ui/hero-highlight";
import { SparklesCore } from "@/components/ui/sparkles";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-950 text-white">
      {/* Background Grid */}
      <div
        className="absolute inset-0 [background-size:40px_40px] [background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
       <div className="relative z-10 w-full flex flex-col items-center justify-center pt-20">
        <h1 className="text-4xl md:text-7xl font-bold font-mono tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 relative z-20">
          AI Research Assistant
        </h1>
        <div className="w-full max-w-sm md:max-w-xl h-24 md:h-32 relative mt-4">
          <div className="absolute inset-x-10 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-10 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-32 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-32 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />
          
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={1200}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />
          <div className="absolute inset-0 w-full h-full bg-slate-950 [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
        </div>

        <p className="mt-[-20px] md:mt-[-40px] flex items-center gap-2 font-mono text-xs md:text-sm text-neutral-300 mx-auto bg-slate-950/40 px-4 py-2 rounded-full backdrop-blur-sm border border-slate-800">
          <Highlight>
            <span className="font-bold text-white whitespace-nowrap px-1">Deep Synthesis.</span>
          </Highlight>
          Tương tác AI trích xuất mượt mà.
        </p>

        <div className="mt-10 relative w-full max-w-md mx-auto shadow-2xl">
          <PlaceholdersAndVanishInput
            placeholders={[
              "Transformer models in AI...",
              "LLMs in Healthcare...",
              "RAG architecture trends...",
              "Vision transformers...",
            ]}
            onChange={(e) => setQuery(e.target.value)}
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                setTimeout(() => {
                  router.push(`/chat?q=${encodeURIComponent(query)}`);
                }, 1000); 
              }
            }}
          />
        </div>
      </div>
      </motion.div>
    </div>
  );
}
