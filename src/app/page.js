'use client';

import { useState, useEffect } from 'react';
import { getLocalSession } from '@/lib/auth-service';
import { BookOpen, Clock, Calendar, CheckCircle, TrendingUp, Sparkles, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const session = getLocalSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    setUser(session);
    
    // Fetch tests and user attempt history
    const loadData = async () => {
      try {
        setLoading(true);
        const [testsRes, attemptsRes] = await Promise.all([
          fetch('/api/tests'),
          fetch(`/api/attempts?userId=${session.id}`)
        ]);

        const testsData = await testsRes.json();
        const attemptsData = await attemptsRes.json();

        if (testsData.success) {
          setTests(testsData.tests);
        } else {
          setError(testsData.error);
        }

        if (attemptsData.success) {
          setAttempts(attemptsData.attempts);
        }
      } catch (err) {
        console.error('Failed to load portal data:', err);
        setError('Network connection error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 px-4 bg-background">
        <div className="space-y-4 text-center max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm animate-pulse font-medium">Preparing mock tests & solutions...</p>
        </div>
      </div>
    );
  }

  // Calculate quick metrics for the student
  const totalMockTestsTaken = attempts.length;

  // Find the attempt with the highest absolute score
  const bestAttempt = attempts.reduce((best, curr) => {
    if (!best || curr.score > best.score) return curr;
    return best;
  }, null);

  const highestScoreText = bestAttempt
    ? `${bestAttempt.score} / ${(bestAttempt.test?.total_questions || 180) * 4}`
    : '—';

  const averageAccuracy = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, curr) => sum + parseFloat(curr.accuracy), 0) / attempts.length) 
    : 0;

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 select-none">
      
      {/* Welcome Banner */}
      <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl relative overflow-hidden mb-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 z-10 relative">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 py-1 px-3 rounded-full border border-primary/20">
              Personal NEET Portal
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
              Welcome back, {user?.full_name}!
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Take complete 3-hour distraction-free mock tests on your mobile device, track weak topics, and optimize your NEET exam score.
            </p>
          </div>

          <div className="flex gap-3">
            {user?.is_admin && (
              <Link
                href="/admin"
                className="py-3 px-4 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload New Test</span>
              </Link>
            )}
            <Link
              href="/dashboard"
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Performance Analytics</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tests Attempted</span>
            <span className="text-2xl font-black text-white">{totalMockTestsTaken}</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-success/10 border border-success/20 text-success rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Highest Score</span>
            <span className="text-2xl font-black text-white">
              {highestScoreText}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-warning/10 border border-warning/20 text-warning rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Average Accuracy</span>
            <span className="text-2xl font-black text-white">
              {totalMockTestsTaken > 0 ? `${averageAccuracy}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white">Available Mock Exams</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Select an exam to begin a high-comfort 3-hour simulator attempt.</p>
        </div>

        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}

        {tests.length === 0 ? (
          <div className="bg-card border border-border border-dashed p-12 text-center rounded-2xl">
            <p className="text-slate-400 text-sm font-medium">No tests uploaded yet.</p>
            {user?.is_admin ? (
              <p className="text-xs text-slate-500 mt-1">Go to the Upload page to submit a PDF, DOCX or TXT exam.</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Please ask your administrator to upload the weekly test file.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tests.map((test) => (
              <div 
                key={test.id}
                className="bg-card hover:bg-card-hover border border-border hover:border-slate-700/80 p-6 rounded-2xl transition-all shadow-md flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md text-[10px] uppercase font-extrabold bg-slate-800 text-slate-300 border border-slate-700/50">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{test.duration_minutes} Minutes</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(test.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2">
                    {test.title}
                  </h4>

                  <p className="text-xs text-slate-400">
                    Standard NEET format matching physics, chemistry, and biology ratios. High readability for eye protection.
                  </p>
                </div>

                <div className="border-t border-border/80 my-5 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-left">
                    <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Questions</span>
                    <span className="text-sm font-black text-white">{test.total_questions} MCQs</span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    {attempts.some(a => a.test_id === test.id) && (
                      <Link
                        href={`/test/solutions/${test.id}`}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-xl border border-slate-700/80 tracking-wide transition-all cursor-pointer tap-highlight-transparent flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        <span>Study Explanations</span>
                      </Link>
                    )}
                    
                    <Link
                      href={`/test/${test.id}`}
                      className="py-2 px-3 bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold rounded-xl tracking-wide shadow transition-all cursor-pointer tap-highlight-transparent"
                    >
                      Start Practice Exam
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
