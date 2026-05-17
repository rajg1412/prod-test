'use client';

import { useState, useEffect, use } from 'react';
import { getLocalSession } from '@/lib/auth-service';
import { 
  BookOpen, Clock, ArrowLeft, Lightbulb, Search, 
  Filter, RefreshCw, Check, BookOpenCheck
} from 'lucide-react';
import Link from 'next/link';

export default function TestSolutionsPage({ params }) {
  // Unwrap parameters using React.use
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // Filtering and searching states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  useEffect(() => {
    const session = getLocalSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }

    const loadTestDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tests/${id}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setTest(data.test);
          setQuestions(data.questions || []);
        } else {
          setError(data.error || 'Failed to download the exam answer key.');
        }
      } catch (err) {
        console.error('Answer key download error:', err);
        setError('Network connection interrupted. Failed to download answer key.');
      } finally {
        setLoading(false);
      }
    };

    loadTestDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 bg-background">
        <div className="space-y-4 text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Downloading complete answer key and explanations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-24 px-4 bg-background text-center select-none">
        <div className="max-w-md bg-card border border-border p-8 rounded-2xl space-y-4 shadow-xl">
          <BookOpenCheck className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-lg font-bold text-white">Answer Key Unavailable</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{error}</p>
          <Link 
            href="/" 
            className="inline-block py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Return to Lobby
          </Link>
        </div>
      </div>
    );
  }

  // Filter questions based on subject & search query
  const filteredQuestions = questions.filter(q => {
    const matchesSubject = selectedSubject === 'All' || q.subject === selectedSubject;
    const matchesSearch = searchQuery.trim() === '' || 
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.chapter && q.chapter.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 select-none">
      
      {/* Back button */}
      <div className="mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lobby</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl relative overflow-hidden mb-8 shadow-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary py-1 px-3 rounded-full">
              Study Solutions & Explanations
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-3 leading-snug">{test?.title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Review the complete question bank with solutions and deep NEET-level insights.</p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900 border border-border/80 px-4 py-3 rounded-xl text-xs text-slate-300">
            <div className="text-center border-r border-border/60 pr-4">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Duration</span>
              <span className="font-extrabold text-white">{test?.duration_minutes} Mins</span>
            </div>
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Questions</span>
              <span className="font-extrabold text-white">{questions.length} MCQs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control bar: Search and Subject Filters */}
      <div className="bg-card border border-border p-4 rounded-2xl gap-4 flex flex-col md:flex-row md:items-center justify-between mb-6 shadow-sm">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, chapters or keywords..."
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-all select-text"
          />
        </div>

        {/* Subject filter */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {['All', 'Biology', 'Chemistry', 'Physics'].map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer tap-highlight-transparent ${
                selectedSubject === sub
                  ? 'bg-primary text-white'
                  : 'bg-background hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-border/60'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

      </div>

      {/* Solutions Deck */}
      <div className="space-y-5">
        {filteredQuestions.length === 0 ? (
          <div className="bg-card border border-border p-12 text-center rounded-2xl">
            <p className="text-slate-400 text-sm font-medium">No questions match your search or filter.</p>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div 
              key={q.id}
              className="bg-card border border-border p-6 rounded-2xl hover:border-slate-800/80 transition-all shadow-sm space-y-4"
            >
              
              {/* Question Meta tags */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase py-0.5 px-2 bg-slate-900 border border-border rounded text-slate-300">
                    Question {q.question_number}
                  </span>
                  
                  <span className={`text-[10px] font-black uppercase py-0.5 px-2 rounded border ${
                    q.subject === 'Biology'
                      ? 'bg-success-bg border-success/20 text-success'
                      : q.subject === 'Physics'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-warning/10 border-warning/20 text-warning'
                  }`}>
                    {q.subject}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 bg-background border border-border/80 py-0.5 px-2 rounded">
                    {q.chapter}
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Correct Option: <span className="text-success font-black text-xs ml-1">{q.correct_answer}</span>
                </span>
              </div>

              {/* Question Text */}
              <p className="text-sm font-semibold text-white leading-relaxed select-text">
                {q.question_text}
              </p>

              {/* Option List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'A', text: q.option_a },
                  { key: 'B', text: q.option_b },
                  { key: 'C', text: q.option_c },
                  { key: 'D', text: q.option_d }
                ].map(opt => {
                  const isCorrect = q.correct_answer === opt.key;
                  
                  return (
                    <div 
                      key={opt.key}
                      className={`p-3 border rounded-xl flex items-center gap-3 select-text transition-all ${
                        isCorrect
                          ? 'border-success bg-success/10 text-white font-bold ring-1 ring-success/15'
                          : 'border-border bg-background/55 text-slate-400'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black uppercase ${
                        isCorrect 
                          ? 'bg-success text-white' 
                          : 'bg-background border border-border text-slate-500'
                      }`}>
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Explanation section */}
              <div className="bg-background border border-border/80 p-4 rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-primary">
                  <Lightbulb className="w-4 h-4" />
                  <span className="font-bold uppercase tracking-wider">Solution Explanation</span>
                </div>

                <div className="text-slate-300 leading-relaxed select-text">
                  <p>{q.explanation || 'No explanation provided for this question.'}</p>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
