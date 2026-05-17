'use client';

import { useState, useEffect, useRef, use } from 'react';
import { getLocalSession } from '@/lib/auth-service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Clock, ChevronLeft, ChevronRight, Menu, X, CheckSquare, 
  HelpCircle, AlertCircle, RefreshCw, Send, CheckCircle2 
} from 'lucide-react';

export default function TestExamPage({ params }) {
  // Unwrap parameters safely using standard Next.js use hook
  const { id: testId } = use(params);

  const [user, setUser] = useState(null);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Core Exam States
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({}); // { [questionId]: 'A'|'B'|'C'|'D'|null }
  const [questionStates, setQuestionStates] = useState({}); // { [questionId]: 'unvisited'|'unanswered'|'answered'|'marked'|'marked_answered' }
  const [timeSpent, setTimeSpent] = useState({}); // { [questionId]: seconds }
  const [timeLeft, setTimeLeft] = useState(180 * 60); // 180 minutes in seconds

  // UI States
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Interval reference for clearing timer
  const timerRef = useRef(null);

  useEffect(() => {
    const session = getLocalSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    const userTimer = window.setTimeout(() => {
      setUser(session);
    }, 0);

    // Fetch NEET test questions
    const loadTest = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tests/${testId}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setTest(data.test);
          setQuestions(data.questions);
          setTimeLeft((data.test.duration_minutes || 180) * 60);
          
          // Initialize states
          const initialOptions = {};
          const initialStates = {};
          const initialTimes = {};

          data.questions.forEach((q, index) => {
            initialOptions[q.id] = null;
            initialStates[q.id] = index === 0 ? 'unanswered' : 'unvisited';
            initialTimes[q.id] = 0;
          });

          // Check for localStorage recovery
          const recoveryKey = `neet_recovery_${testId}_${session.id}`;
          const savedData = localStorage.getItem(recoveryKey);
          
          if (savedData) {
            try {
              const recovered = JSON.parse(savedData);
              setSelectedOptions(recovered.selectedOptions || initialOptions);
              setQuestionStates(recovered.questionStates || initialStates);
              setTimeSpent(recovered.timeSpent || initialTimes);
              setTimeLeft(recovered.timeLeft !== undefined ? recovered.timeLeft : (data.test.duration_minutes || 180) * 60);
              
              // Find first recovered visited/unanswered question or fallback to 0
              const lastActive = recovered.activeIdx !== undefined ? recovered.activeIdx : 0;
              setActiveIdx(lastActive);
              console.log('Test session successfully recovered from local storage!');
            } catch (e) {
              console.warn('Failed to parse recovered test state:', e);
              setSelectedOptions(initialOptions);
              setQuestionStates(initialStates);
              setTimeSpent(initialTimes);
            }
          } else {
            setSelectedOptions(initialOptions);
            setQuestionStates(initialStates);
            setTimeSpent(initialTimes);
          }
        } else {
          setError(data.error || 'Failed to load the practice exam.');
        }
      } catch (err) {
        console.error('Test loading error:', err);
        setError('Network connection error. Failed to load NEET mock questions.');
      } finally {
        setLoading(false);
      }
    };

    loadTest();

    // Lock screen scrolling on body for premium distraction-free CBT simulator feeling
    document.body.classList.add('exam-mode-active');
    
    return () => {
      document.body.classList.remove('exam-mode-active');
      window.clearTimeout(userTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testId]);

  // High-reliability Clock & Auto-Save Interval Hook
  useEffect(() => {
    if (loading || error || submitting || !test || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      // 1. Countdown timer
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit(); // Force immediate exam submit when time runs out!
          return 0;
        }
        return prev - 1;
      });

      // 2. Track time spent on the ACTIVE question
      const activeQ = questions[activeIdx];
      if (activeQ) {
        setTimeSpent(prev => ({
          ...prev,
          [activeQ.id]: (prev[activeQ.id] || 0) + 1
        }));
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, test, activeIdx, questions, submitting]);

  // Periodic LocalStorage Auto-Saver (Triggered every time state changes)
  useEffect(() => {
    if (!user || !test || questions.length === 0 || submitting) return;

    const stateToSave = {
      selectedOptions,
      questionStates,
      timeSpent,
      timeLeft,
      activeIdx
    };
    
    const recoveryKey = `neet_recovery_${testId}_${user.id}`;
    localStorage.setItem(recoveryKey, JSON.stringify(stateToSave));
  }, [selectedOptions, questionStates, timeSpent, timeLeft, activeIdx, user, test, submitting]);

  // Navigation handlers
  const navigateTo = (index) => {
    if (index < 0 || index >= questions.length) return;
    
    // Update current active question's state if it's currently unvisited
    const currentQ = questions[activeIdx];
    const targetQ = questions[index];

    setQuestionStates(prev => {
      const nextStates = { ...prev };
      
      // If active question was unanswered, mark as visited (unanswered)
      if (nextStates[currentQ.id] === 'unvisited') {
        nextStates[currentQ.id] = 'unanswered';
      }

      // Mark the target question as visited (unanswered) if it's currently unvisited
      if (nextStates[targetQ.id] === 'unvisited') {
        nextStates[targetQ.id] = 'unanswered';
      }

      return nextStates;
    });

    setActiveIdx(index);
    setIsPaletteOpen(false);
  };

  const handleSelectOption = (option) => {
    const currentQ = questions[activeIdx];
    setSelectedOptions(prev => ({
      ...prev,
      [currentQ.id]: option
    }));
  };

  const handleClearSelection = () => {
    const currentQ = questions[activeIdx];
    setSelectedOptions(prev => ({
      ...prev,
      [currentQ.id]: null
    }));
    
    setQuestionStates(prev => {
      const nextStates = { ...prev };
      if (nextStates[currentQ.id] === 'marked_answered') {
        nextStates[currentQ.id] = 'marked';
      } else {
        nextStates[currentQ.id] = 'unanswered';
      }
      return nextStates;
    });
  };

  const handleMarkForReview = () => {
    const currentQ = questions[activeIdx];
    const selected = selectedOptions[currentQ.id];

    setQuestionStates(prev => ({
      ...prev,
      [currentQ.id]: selected ? 'marked_answered' : 'marked'
    }));

    // Auto-advance
    if (activeIdx < questions.length - 1) {
      navigateTo(activeIdx + 1);
    }
  };

  const handleSaveAndNext = () => {
    const currentQ = questions[activeIdx];
    const selected = selectedOptions[currentQ.id];

    setQuestionStates(prev => {
      const nextStates = { ...prev };
      if (selected) {
        // If it was marked for review, save it as answered_and_marked or answered
        if (nextStates[currentQ.id] === 'marked' || nextStates[currentQ.id] === 'marked_answered') {
          nextStates[currentQ.id] = 'marked_answered';
        } else {
          nextStates[currentQ.id] = 'answered';
        }
      } else {
        nextStates[currentQ.id] = 'unanswered';
      }
      return nextStates;
    });

    if (activeIdx < questions.length - 1) {
      navigateTo(activeIdx + 1);
    } else {
      // Final question save opens submit window
      setShowSubmitConfirm(true);
    }
  };

  // Submit operations
  function handleAutoSubmit() {
    setShowSubmitConfirm(false);
    submitExam();
  }

  async function submitExam() {
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Format attempts object
    const finalAnswers = questions.map(q => ({
      questionId: q.id,
      selectedOption: selectedOptions[q.id],
      timeTakenSeconds: timeSpent[q.id] || 0
    }));

    const totalDuration = (test.duration_minutes || 180) * 60;
    const timeSpentSeconds = totalDuration - timeLeft;

    try {
      const response = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          userId: user.id,
          timeSpentSeconds,
          answers: finalAnswers
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Wipe local auto-save recovery values
        const recoveryKey = `neet_recovery_${testId}_${user.id}`;
        localStorage.removeItem(recoveryKey);

        // Send the user to the graded report with explanations
        window.location.href = `/test/results/${data.attemptId}`;
      } else {
        setError(data.error || 'Failed to submit exam details. Contact instructor.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Submit exam error:', err);
      setError('Connection interrupted. Please verify your internet and click submit again.');
      setSubmitting(false);
    }
  }

  // Render Helper functions
  const getPaletteStateColor = (status, hasOption) => {
    switch (status) {
      case 'answered': return 'bg-emerald-600 border-emerald-500 text-white';
      case 'marked': return 'bg-purple-600 border-purple-500 text-white';
      case 'marked_answered': return 'bg-purple-600 border-purple-500 text-white relative after:content-[""] after:absolute after:top-1 after:right-1 after:w-2 after:h-2 after:bg-emerald-400 after:rounded-full';
      case 'unanswered': return 'bg-rose-600 border-rose-500 text-white';
      case 'unvisited':
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500';
    }
  };

  const getStatusSummaryCount = () => {
    let answered = 0;
    let marked = 0;
    let markedAnswered = 0;
    let unanswered = 0;
    let unvisited = 0;

    questions.forEach(q => {
      const state = questionStates[q.id];
      if (state === 'answered') answered++;
      else if (state === 'marked') marked++;
      else if (state === 'marked_answered') markedAnswered++;
      else if (state === 'unanswered') unanswered++;
      else unvisited++;
    });

    return { answered, marked, markedAnswered, unanswered, unvisited };
  };

  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 bg-background">
        <div className="space-y-4 text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Securing test encryption locks...</p>
        </div>
      </div>
    );
  }

  if (error && !submitting) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 px-4 bg-background text-center select-none">
        <div className="max-w-md bg-card border border-border p-8 rounded-2xl space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-danger mx-auto" />
          <h3 className="text-lg font-bold text-white">Exam Simulator Interrupted</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Reload Exam Portal
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[activeIdx];
  const activeOption = selectedOptions[currentQ.id];
  const summary = getStatusSummaryCount();
  const isTimeLow = timeLeft < 15 * 60; // 15 minutes left

  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-64px)] sm:h-screen w-full bg-background relative overflow-hidden text-white select-none">
      
      {/* Submitting Spinner Overlay */}
      {submitting && (
        <div className="absolute inset-0 bg-background/90 z-50 flex flex-col justify-center items-center gap-4">
          <RefreshCw className="w-12 h-12 text-primary animate-spin" />
          <div className="text-center">
            <h4 className="text-lg font-bold text-white">Grading NEET Paper...</h4>
            <p className="text-xs text-slate-500 mt-1">Applying negative marking rules (+4 / -1)</p>
          </div>
        </div>
      )}

      {/* STICKY TOP TIMER & PROGRESS BAR */}
      <header className="bg-card/90 backdrop-blur border-b border-border py-3 px-4 sm:px-6 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center space-x-2.5 max-w-[55%] sm:max-w-md">
          <span className="p-1 rounded-md bg-slate-800 border border-slate-700/50 text-slate-300 font-bold text-[10px] sm:text-xs">
            Q{activeIdx + 1}/{questions.length}
          </span>
          <h3 className="text-xs sm:text-sm font-extrabold text-white truncate" title={test?.title}>
            {test?.title}
          </h3>
        </div>

        {/* Dynamic Countdown Timer */}
        <div className={`flex items-center space-x-2 font-mono text-sm sm:text-base font-bold bg-background/50 border py-1.5 px-3 rounded-xl ${
          isTimeLow ? 'timer-low-pulse border-danger/30' : 'text-primary border-primary/20'
        }`}>
          <Clock className={`w-4 h-4 ${isTimeLow ? 'animate-pulse' : ''}`} />
          <span>{formatTimer(timeLeft)}</span>
        </div>

        {/* Palette Drawer Trigger */}
        <button
          onClick={() => setIsPaletteOpen(true)}
          className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-border/80 text-slate-300 transition-all cursor-pointer tap-highlight-transparent flex items-center gap-1.5 text-xs font-bold"
        >
          <Menu className="w-4 h-4" />
          <span className="hidden sm:inline">Palette</span>
        </button>
      </header>

      {/* Progress Indicator line */}
      <div className="w-full bg-slate-900 h-1 z-20 flex-shrink-0">
        <div 
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((activeIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* MAIN EXAM SCROLLER AREA */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-28 flex flex-col justify-between max-w-3xl mx-auto w-full">
        
        {/* Subject & Chapter Tags */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-extrabold uppercase py-0.5 px-2.5 rounded-md border ${
              currentQ.subject === 'Biology'
                ? 'bg-success-bg border-success/20 text-success'
                : currentQ.subject === 'Physics'
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-warning/10 border-warning/20 text-warning'
            }`}>
              {currentQ.subject}
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-card border border-border py-0.5 px-2 rounded">
              Chapter: {currentQ.chapter || `General ${currentQ.subject}`}
            </span>
          </div>

          {/* Question Text */}
          <div className="space-y-1">
            <h1 className="text-base sm:text-lg font-bold text-white leading-relaxed tracking-wide select-text">
              {currentQ.question_text}
            </h1>
          </div>

          {/* Large Comfortable Option Targets */}
          <div className="space-y-3 pt-4">
            {[
              { key: 'A', text: currentQ.option_a },
              { key: 'B', text: currentQ.option_b },
              { key: 'C', text: currentQ.option_c },
              { key: 'D', text: currentQ.option_d }
            ].map((opt) => {
              const isActive = activeOption === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleSelectOption(opt.key)}
                  className={`w-full p-4 bg-card border text-left rounded-xl transition-all flex items-center gap-4 text-sm font-semibold select-none tap-highlight-transparent cursor-pointer ${
                    isActive 
                      ? 'border-primary bg-primary/10 text-white ring-1 ring-primary' 
                      : 'border-border text-slate-300 hover:border-slate-800'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'bg-background border border-border text-slate-500'
                  }`}>
                    {opt.key}
                  </span>
                  <span className="leading-relaxed select-text">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>

      </main>

      {/* STICKY BOTTOM EXAM ACTIONS BAR */}
      <footer className="absolute bottom-0 inset-x-0 bg-card/90 backdrop-blur border-t border-border py-3.5 px-4 flex items-center justify-between z-20 select-none flex-shrink-0">
        
        {/* Left Actions: Previous & Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo(activeIdx - 1)}
            disabled={activeIdx === 0}
            className="p-3 bg-slate-900 border border-border disabled:opacity-40 text-slate-300 rounded-xl hover:border-slate-700 transition-all cursor-pointer tap-highlight-transparent flex items-center justify-center"
            title="Previous question"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleClearSelection}
            disabled={!activeOption}
            className="py-3 px-3 bg-slate-900 border border-border disabled:opacity-40 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer tap-highlight-transparent"
          >
            Clear Response
          </button>
        </div>

        {/* Center Action: Mark for Review */}
        <button
          onClick={handleMarkForReview}
          className="py-3 px-4 bg-purple-900/30 border border-purple-900/50 hover:bg-purple-900/50 text-purple-300 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer tap-highlight-transparent flex items-center gap-1"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Review</span>
        </button>

        {/* Right Action: Save & Next / Submit */}
        <button
          onClick={handleSaveAndNext}
          className="py-3 px-5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-extrabold rounded-xl tracking-wide shadow-md transition-all cursor-pointer tap-highlight-transparent flex items-center gap-1.5"
        >
          <span>{activeIdx === questions.length - 1 ? 'Verify & Submit' : 'Save & Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

      </footer>

      {/* SLIDE-OUT QUESTION PALETTE DRAWER */}
      <div className={`fixed inset-0 z-40 transition-all duration-300 ${
        isPaletteOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}>
        {/* Backdrop overlay */}
        <div 
          onClick={() => setIsPaletteOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-card border-l border-border p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between ${
          isPaletteOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4 flex-shrink-0">
            <div>
              <h4 className="font-extrabold text-white text-sm">Question Palette</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Mock CBT Progress map</p>
            </div>
            <button
              onClick={() => setIsPaletteOpen(false)}
              className="p-1.5 rounded-lg border border-border text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid Scroller */}
          <div className="flex-1 overflow-y-auto my-6 pr-1">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const status = questionStates[q.id] || 'unvisited';
                const hasOption = !!selectedOptions[q.id];
                const isActive = activeIdx === idx;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => navigateTo(idx)}
                    className={`h-9 border text-xs font-black rounded-lg transition-all tap-highlight-transparent cursor-pointer flex items-center justify-center ${
                      isActive ? 'ring-2 ring-primary scale-105 border-white' : ''
                    } ${getPaletteStateColor(status, hasOption)}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Indicators Legend & Submit */}
          <div className="border-t border-border/80 pt-4 space-y-4 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2.5 text-[10px] font-bold text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-500 block" />
                <span>Answered ({summary.answered})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-500 block" />
                <span>Not Answered ({summary.unanswered})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-500 block" />
                <span>Marked ({summary.marked})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-500 block relative after:content-[''] after:absolute after:top-0.5 after:right-0.5 after:w-1.5 after:h-1.5 after:bg-emerald-400 after:rounded-full" />
                <span>Marked + Ans ({summary.markedAnswered})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 block" />
                <span>Not Visited ({summary.unvisited})</span>
              </div>
            </div>

            <button
              onClick={() => { setIsPaletteOpen(false); setShowSubmitConfirm(true); }}
              className="w-full py-3 bg-danger hover:bg-danger/80 text-white text-xs font-black rounded-xl tracking-wider shadow transition-all cursor-pointer tap-highlight-transparent flex items-center justify-center gap-1.5 uppercase"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Mock Paper</span>
            </button>
          </div>

        </div>
      </div>

      {/* DOUBLE-CONFIRMATION SUBMIT DIALOG */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <div 
            onClick={() => setShowSubmitConfirm(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Panel */}
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl z-10 space-y-6 text-center animate-scaleIn">
            <div className="w-12 h-12 bg-danger/10 border border-danger/20 text-danger rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckSquare className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-lg font-black text-white">Submit NEET Mock Exam?</h4>
              <p className="text-xs text-slate-400 mt-1">Review your final response summary below. Submitted papers are graded immediately.</p>
            </div>

            {/* Answer Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-center bg-background/50 border border-border p-4 rounded-xl">
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Answered</span>
                <span className="text-lg font-black text-success">{summary.answered + summary.markedAnswered}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marked</span>
                <span className="text-lg font-black text-purple-400">{summary.marked}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unattempted</span>
                <span className="text-lg font-black text-slate-400">{summary.unanswered + summary.unvisited}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-3 border border-border hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Back to Test
              </button>
              
              <button
                onClick={handleAutoSubmit}
                className="flex-1 py-3 bg-success hover:bg-success/80 text-white text-xs font-black rounded-xl tracking-wider shadow transition-all cursor-pointer tap-highlight-transparent flex items-center justify-center gap-1 uppercase"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
