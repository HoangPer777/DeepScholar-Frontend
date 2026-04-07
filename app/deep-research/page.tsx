'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  Search, 
  Brain,
  Zap,
  ShieldCheck,
  SearchIcon,
  Bot,
  Bell,
  Settings,
  UserRound
} from 'lucide-react';
import AgentWorkflow, { AgentStatus } from '@/components/deep-research/AgentWorkflow';
import ResearchResults from '@/components/deep-research/ResearchResults';

type ResearchState = 'idle' | 'results';

export default function DeepResearchPage() {
  const [state, setState] = useState<ResearchState>('idle');
  const [query, setQuery] = useState('');
  const [currentQuery, setCurrentQuery] = useState('');

  const handleStartResearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setCurrentQuery(query);
    setState('results');
  };

  const resetResearch = () => {
    setState('idle');
    setQuery('');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900 font-sans">
      {/* Scholar Modernist Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 px-6 py-3">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-black tracking-tight text-slate-900">
              Scholar Modernist
            </Link>
            
            <div className="relative w-72">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Deep search archive..."
                className="w-full bg-slate-100/80 border-none rounded-lg py-2 pl-9 pr-4 text-[11px] font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>
          
          <nav className="flex items-center gap-6">
            <Link href="/library" className="text-[11px] font-bold text-slate-500 hover:text-slate-900">Library</Link>
            <Link href="/archive" className="text-[11px] font-bold text-slate-500 hover:text-slate-900">Archive</Link>
            <Link href="/deep-research" className="text-[11px] font-bold text-[#135bec] border-b-2 border-[#135bec] pb-1">Methodology</Link>
            <div className="flex items-center gap-4 ml-6 border-l border-slate-200 pl-6">
               <Bell size={18} className="text-slate-400 hover:text-slate-600 cursor-pointer" />
               <Settings size={18} className="text-slate-400 hover:text-slate-600 cursor-pointer" />
               <Link href="/profile" className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center p-1">
                 <UserRound size={16} className="text-indigo-600" />
               </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className={`${state === 'results' ? 'max-w-full' : 'max-w-[1400px] mx-auto'}`}>
        {state === 'idle' && (
          <div className="max-w-3xl mx-auto px-6 py-20 lg:py-32 space-y-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="space-y-4">
               <h2 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                 The future of <span className="text-[#135bec]">Scientific Discovery</span> starts here.
               </h2>
               <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                 Enter a complex research topic to analyze multiple databases and synthesize localized insights instantly.
               </p>
            </div>

            <form onSubmit={handleStartResearch} className="relative group p-2 rounded-[28px] bg-white border border-slate-200 shadow-2xl transition-all hover:border-[#135bec]/20">
              <div className="relative flex items-center bg-white rounded-[24px] overflow-hidden">
                <div className="pl-6 pr-4 text-slate-400">
                  <Search size={28} />
                </div>
                <input 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text" 
                  placeholder="Enter a complex research topic..." 
                  className="w-full py-7 pr-40 text-xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-slate-300"
                />
                <button 
                  type="submit"
                  className="absolute right-3 bg-[#135bec] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Start Deep Research
                </button>
              </div>
            </form>
          </div>
        )}

        {state === 'results' && (
          <ResearchResults 
            query={currentQuery} 
            report="Generated Report Here" 
            sources={[
              { id: '1', title: 'Deep Learning in Medical Imaging', author: 'Voss et al.', year: 2023, url: '#' },
              { id: '2', title: 'Neural Radiance Fields Explained', author: 'Chen & Miller', year: 2022, url: '#' },
              { id: '3', title: 'Multi-Agent Systems in Research', author: 'Marcus Thorne', year: 2024, url: '#' },
              { id: '4', title: 'Scaling RAG for Scientific Data', author: 'DeepScholar Team', year: 2024, url: '#' },
            ]} 
          />
        )}
      </main>
      
      {state === 'results' && (
        <button 
          onClick={resetResearch}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
        >
          <Search size={16} />
          New Research
        </button>
      )}
    </div>
  );
}
