'use client';

import { useState, useEffect, use } from 'react';
import { getLocalSession } from '@/lib/auth-service';
import { 
  Award, CheckCircle, XCircle, HelpCircle, Clock, 
  BookOpen, ChevronRight, BarChart4, ArrowLeft, Lightbulb, RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function TestResultsPage({ params }) {
  // Unwrap parameters using React.use
  const { attemptId } = use(params);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState([]);

  // Filter tab for review questions: 'all', 'correct', 'incorrect', 'unattempted'
  const [filterTab, setFilterTab] = useState('all');

  useEffect(() => {
    const session = getLocalSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    setUser(session);

    const loadAttemptDetails = async () => {
      try {
        setLoading(true);
        // Call the detailed retrieval endpoint we wrote
        const response = await fetch(`/api/attempts/single/${attemptId}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setAttempt(data.attempt);
          setTest(data.test);
          setAnswers(data.answers);
        } else {
          setError(data.error || 'Could not fetch your graded report.');
        }
      } catch (err) {
        console.error('Grading report error:', err);
        setError('Network connection interrupted. Failed to download grades.');
      } finally {
        setLoading(false);
      }
    };

    loadAttemptDetails();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 bg-background">
        <div className="space-y-4 text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Grading answers and parsing chapter analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-24 px-4 bg-background text-center select-none">
        <div className="max-w-md bg-card border border-border p-8 rounded-2xl space-y-4 shadow-xl">
          <XCircle className="w-12 h-12 text-danger mx-auto" />
          <h3 className="text-lg font-bold text-white">Grading Report Unavailable</h3>
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

  // Format time spent
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // Filtered answers selection
  const filteredAnswers = answers.filter(ans => {
    if (filterTab === 'correct') return ans.is_correct && ans.selected_option;
    if (filterTab === 'incorrect') return !ans.is_correct && ans.selected_option;
    if (filterTab === 'unattempted') return !ans.selected_option;
    return true; // 'all'
  });

  // Calculate subject breakdowns for attempts
  const subjectBreakdown = {
    Biology: { correct: 0, wrong: 0, total: 0 },
    Chemistry: { correct: 0, wrong: 0, total: 0 },
    Physics: { correct: 0, wrong: 0, total: 0 }
  };

  answers.forEach(ans => {
    const sub = ans.question?.subject;
    if (sub && subjectBreakdown[sub]) {
      subjectBreakdown[sub].total++;
      if (ans.selected_option) {
        if (ans.is_correct) subjectBreakdown[sub].correct++;
        else subjectBreakdown[sub].wrong++;
      }
    }
  });

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 select-none">
      
      {/* Back button & Title */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby Dashboard</span>
        </Link>
        
        {attempt?.isMock && (
          <span className="py-1 px-3 rounded-full text-[10px] font-extrabold uppercase bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
            Simulated Sandbox Report
          </span>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-black text-white leading-snug">{test?.title}</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Detailed performance report card & explanations card.</p>
      </div>

      {/* GRADED METRICS BANNER GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        
        {/* Total Score */}
        <div className="bg-card border border-border p-5 rounded-2xl text-center relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-xl" />
          <Award className="w-5 h-5 text-primary mx-auto mb-2.5" />
          <span className="block text-[10px] uppercase font-bold text-slate-500">NEET Score</span>
          <span className="text-2xl font-black text-white mt-0.5">
            {attempt?.score} <span className="text-xs text-slate-500">/ 720</span>
          </span>
        </div>

        {/* Accuracy */}
        <div className="bg-card border border-border p-5 rounded-2xl text-center relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-16 h-16 bg-success/5 rounded-full blur-xl" />
          <BarChart4 className="w-5 h-5 text-success mx-auto mb-2.5" />
          <span className="block text-[10px] uppercase font-bold text-slate-500">Test Accuracy</span>
          <span className="text-2xl font-black text-white mt-0.5">
            {attempt?.accuracy}%
          </span>
        </div>

        {/* Time spent */}
        <div className="bg-card border border-border p-5 rounded-2xl text-center relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-16 h-16 bg-warning/5 rounded-full blur-xl" />
          <Clock className="w-5 h-5 text-warning mx-auto mb-2.5" />
          <span className="block text-[10px] uppercase font-bold text-slate-500">Time Taken</span>
          <span className="text-2xl font-black text-white mt-0.5">
            {formatDuration(attempt?.time_spent_seconds)}
          </span>
        </div>

        {/* Question counts */}
        <div className="bg-card border border-border p-5 rounded-2xl text-center relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl" />
          <BookOpen className="w-5 h-5 text-purple-400 mx-auto mb-2.5" />
          <span className="block text-[10px] uppercase font-bold text-slate-500">Correct / Wrong</span>
          <span className="text-2xl font-black text-white mt-0.5">
            {attempt?.correct_count} <span className="text-xs text-slate-500">/</span> {attempt?.wrong_count}
          </span>
        </div>

      </div>

      {/* SUBJECT COMPARISON MATRIX */}
      <div className="space-y-4 mb-8">
        <h3 className="text-base font-bold text-white">Subject Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(subjectBreakdown).map(([subj, stats]) => {
            const attempted = stats.correct + stats.wrong;
            const accuracy = attempted > 0 ? Math.round((stats.correct / attempted) * 100) : 0;
            const score = (stats.correct * 4) - (stats.wrong * 1);
            
            return (
              <div key={subj} className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <span className={`text-xs font-black uppercase py-0.5 px-2 rounded-md ${
                    subj === 'Biology'
                      ? 'bg-success-bg border border-success/15 text-success'
                      : subj === 'Physics'
                      ? 'bg-primary/10 border border-primary/15 text-primary'
                      : 'bg-warning/10 border border-warning/15 text-warning'
                  }`}>
                    {subj}
                  </span>
                  
                  <span className="text-xs font-black text-white">
                    Score: {score}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Questions correct:</span>
                    <span className="font-bold text-white">{stats.correct} / {stats.total}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Incorrect responses:</span>
                    <span className="font-bold text-slate-300">{stats.wrong}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Accuracy rate:</span>
                    <span className="font-bold text-white">{accuracy}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      subj === 'Biology' ? 'bg-success' : subj === 'Physics' ? 'bg-primary' : 'bg-warning'
                    }`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SOLUTIONS VIEW DECK */}
      <div className="space-y-6">
        
        {/* Solution Header & Filter tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Review Detailed Solutions</h3>
            <p className="text-xs text-slate-400 mt-0.5">Filter questions by status to analyze where mistakes were made.</p>
          </div>

          <div className="flex flex-wrap p-1 bg-card/65 border border-border rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: `All (${answers.length})` },
              { id: 'correct', label: `Correct (${attempt?.correct_count})` },
              { id: 'incorrect', label: `Wrong (${attempt?.wrong_count})` },
              { id: 'unattempted', label: `Unattempted (${attempt?.unattempted_count})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`py-1.5 px-3 rounded-lg transition-all tap-highlight-transparent cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtered Question cards */}
        <div className="space-y-4">
          {filteredAnswers.length === 0 ? (
            <div className="bg-card border border-border p-12 text-center rounded-2xl">
              <p className="text-slate-400 text-sm font-medium">No questions matched this filter.</p>
            </div>
          ) : (
            filteredAnswers.map((ans, idx) => {
              const q = ans.question;
              if (!q) return null;

              const isCorrect = ans.is_correct;
              const hasAttempted = !!ans.selected_option;
              
              let cardBorderClass = 'border-border hover:border-slate-800';
              let badgeColorClass = 'bg-slate-800 border-slate-700 text-slate-400';
              let badgeText = 'Unattempted';

              if (hasAttempted) {
                if (isCorrect) {
                  cardBorderClass = 'border-success/30 bg-success-bg/5 hover:border-success/50';
                  badgeColorClass = 'bg-success/15 border-success/30 text-success';
                  badgeText = 'Correct (+4)';
                } else {
                  cardBorderClass = 'border-danger/30 bg-danger-bg/5 hover:border-danger/50';
                  badgeColorClass = 'bg-danger/15 border-danger/30 text-danger';
                  badgeText = 'Incorrect (-1)';
                }
              }

              return (
                <div 
                  key={ans.id}
                  className={`bg-card border p-6 rounded-2xl transition-all shadow-sm space-y-4 relative ${cardBorderClass}`}
                >
                  {/* Status Indicator Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase py-0.5 px-2 bg-slate-900 border border-border rounded text-slate-300">
                        Q{q.question_number}
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

                    <span className={`text-[10px] font-black uppercase py-0.5 px-2.5 rounded-full border ${badgeColorClass}`}>
                      {badgeText}
                    </span>
                  </div>

                  {/* Question text */}
                  <p className="text-sm font-semibold text-white leading-relaxed pr-6 select-text">
                    {q.question_text}
                  </p>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'A', text: q.option_a },
                      { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c },
                      { key: 'D', text: q.option_d }
                    ].map(opt => {
                      const isUserSelected = ans.selected_option === opt.key;
                      const isCorrectKey = q.correct_answer === opt.key;
                      
                      let optColorClass = 'border-border bg-background/55 text-slate-400';
                      
                      if (isCorrectKey) {
                        optColorClass = 'border-success bg-success/10 text-white font-bold ring-1 ring-success/20';
                      } else if (isUserSelected && !isCorrect) {
                        optColorClass = 'border-danger bg-danger/10 text-white font-bold ring-1 ring-danger/20';
                      }

                      return (
                        <div 
                          key={opt.key}
                          className={`p-3 border rounded-xl flex items-center gap-3 select-text ${optColorClass}`}
                        >
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black uppercase ${
                            isCorrectKey 
                              ? 'bg-success text-white' 
                              : isUserSelected
                              ? 'bg-danger text-white'
                              : 'bg-background border border-border text-slate-500'
                          }`}>
                            {opt.key}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grading explanation section */}
                  <div className="bg-background border border-border/80 p-4 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Lightbulb className="w-4 h-4" />
                      <span className="font-bold uppercase tracking-wider">Solution Explanation</span>
                    </div>

                    <div className="text-slate-300 leading-relaxed space-y-1.5 select-text">
                      <p>{q.explanation}</p>
                      {ans.selected_option && (
                        <p className="text-[10px] text-slate-500 border-t border-border/60 pt-2 font-bold flex items-center gap-1 mt-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Time taken on this question: {ans.time_taken_seconds} seconds</span>
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
