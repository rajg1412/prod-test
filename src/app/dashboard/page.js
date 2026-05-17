'use client';

import { useState, useEffect } from 'react';
import { getLocalSession } from '@/lib/auth-service';
import { 
  Award, Clock, Sparkles, AlertCircle, ArrowLeft,
  ChevronRight, RefreshCw, BarChart3, Star, Compass
} from 'lucide-react';
import Link from 'next/link';

// Import Recharts components safely
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [analytics, setAnalytics] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mount checker to prevent Recharts hydration issues on Next.js server pre-rendering
    const mountTimer = window.setTimeout(() => {
      setIsMounted(true);
    }, 0);

    const session = getLocalSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    const userTimer = window.setTimeout(() => {
      setUser(session);
    }, 0);

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics?userId=${session.id}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setAnalytics(data.analytics);
        } else {
          setError(data.error || 'Failed to aggregate student analytics.');
        }
      } catch (err) {
        console.error('Analytics aggregation error:', err);
        setError('Network connection error. Could not calculate scores.');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      window.clearTimeout(userTimer);
      window.clearTimeout(mountTimer);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-24 bg-background">
        <div className="space-y-4 text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Aggregating historical records & scoring matrix...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center py-24 px-4 bg-background text-center select-none">
        <div className="max-w-md bg-card border border-border p-8 rounded-2xl space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-danger mx-auto" />
          <h3 className="text-lg font-bold text-white">Analytics Unavailable</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{error}</p>
          <Link 
            href="/" 
            className="inline-block py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Return to lobby
          </Link>
        </div>
      </div>
    );
  }

  // Format total seconds into hours and minutes
  const formatTotalTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const { summary, subjectPerformance, progressTrends, strongChapters, weakChapters } = analytics;
  const latestAttempt = analytics?.latestAttempt;

  if (!summary || summary.totalAttempts === 0) {
    return (
      <div className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 select-none space-y-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all cursor-pointer mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby Hub</span>
        </Link>
        
        <div className="bg-card border border-border border-dashed p-12 sm:p-16 text-center rounded-3xl shadow-xl space-y-6">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-black text-white">No Attempts Logged Yet</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Your dashboard will fill with score trends, subject accuracy, and chapter insights once you submit your first test.
            </p>
          </div>
          <Link
            href="/"
            className="inline-block py-3 px-6 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer"
          >
            Go to Exam Lobby
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 select-none space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link 
            href="/" 
            className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Lobby Hub</span>
          </Link>
          <h2 className="text-2xl font-black text-white leading-snug">Personal Progress Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Isolate weak chapters, track score velocities, and optimize NEET grading stats.</p>
        </div>
        
      </div>

      {latestAttempt && (
        <div className="bg-card border border-border p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Latest Submission</p>
            <h3 className="text-base font-black text-white mt-1">{latestAttempt.test?.title || 'Most recent test'}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Submitted on {new Date(latestAttempt.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <div className="text-xs uppercase font-bold text-slate-500">Score</div>
              <div className="text-xl font-black text-white">{latestAttempt.score} / {(latestAttempt.test?.total_questions || 180) * 4}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase font-bold text-slate-500">Accuracy</div>
              <div className="text-xl font-black text-white">{latestAttempt.accuracy}%</div>
            </div>
            <Link
              href={`/test/results/${latestAttempt.id}`}
              className="inline-flex items-center gap-1.5 py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <span>View report</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* QUICK ANALYTICAL OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-lg" />
          <BarChart3 className="w-5 h-5 text-primary mb-3" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Exams Taken</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{summary.totalAttempts}</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-success/5 rounded-full blur-lg" />
          <Award className="w-5 h-5 text-success mb-3" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Average Score</span>
            <span className="text-2xl font-black text-white mt-0.5 block">
              {summary.averageScore} <span className="text-xs text-slate-500">/ {summary.averageMaxScore || 720}</span>
            </span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-warning/5 rounded-full blur-lg" />
          <Sparkles className="w-5 h-5 text-warning mb-3" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Avg Accuracy</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{summary.averageAccuracy}%</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/5 rounded-full blur-lg" />
          <Clock className="w-5 h-5 text-purple-400 mb-3" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Study Time</span>
            <span className="text-2xl font-black text-white mt-0.5 block">{formatTotalTime(summary.totalTimeSpentSeconds)}</span>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Score Progression Trend Chart */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-md space-y-4">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">NEET Score Velocity</h4>
            <p className="text-[10px] text-slate-400">Score improvement across submitted tests</p>
          </div>

          <div className="h-64 w-full text-xs">
            {isMounted && progressTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="attemptNumber" tickFormatter={(v) => `Test ${v}`} stroke="#64748b" />
                  <YAxis domain={[0, 'auto']} stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#131a2c', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelClassName="text-white font-bold"
                    itemStyle={{ color: '#3b82f6' }}
                    formatter={(value, name, props) => {
                      if (name === 'score') {
                        return [`${value} / ${props.payload.maxScore}`, 'Score'];
                      }
                      return [value, name];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">Chart parsing...</div>
            )}
          </div>
        </div>

        {/* Subject wise comparison Bar Chart */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-md space-y-4">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Subject Accuracy Matrix</h4>
            <p className="text-[10px] text-slate-400">Comparing percentage accuracy in Biology, Chemistry, and Physics</p>
          </div>

          <div className="h-64 w-full text-xs">
            {isMounted && subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="subject" stroke="#64748b" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#131a2c', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelClassName="text-white font-bold"
                    itemStyle={{ color: '#10b981' }}
                    formatter={(v) => [`${v}%`, 'Accuracy']}
                  />
                  <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                    {subjectPerformance.map((entry, index) => {
                      let color = '#10b981'; // Bio
                      if (entry.subject === 'Physics') color = '#3b82f6'; // Phys
                      if (entry.subject === 'Chemistry') color = '#8b5cf6'; // Chem
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">Chart parsing...</div>
            )}
          </div>
        </div>

      </div>

      {/* CHAPTER DIAGNOSTICS SPLIT LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Strongest Chapters */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="p-2 bg-success-bg border border-success/15 text-success rounded-xl">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Strongest Chapters</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Topics with 70%+ accuracy rating</p>
            </div>
          </div>

          <div className="space-y-4">
            {strongChapters.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">Complete more practice tests to isolate strong topics.</div>
            ) : (
              strongChapters.map((chap, idx) => (
                <div key={idx} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-350">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-xs">{chap.chapter}</span>
                      <span className="text-[9px] uppercase font-extrabold text-slate-500 mt-0.5">{chap.subject}</span>
                    </div>
                    <span className="font-extrabold text-success">{chap.accuracy}% accuracy</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-success h-full rounded-full" style={{ width: `${chap.accuracy}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weakest Chapters */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <div className="p-2 bg-danger-bg border border-danger/15 text-danger rounded-xl">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Weakest Chapters</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase font-sans">High priority focus areas</p>
            </div>
          </div>

          <div className="space-y-4">
            {weakChapters.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">No critical weak chapters found. Excellent work!</div>
            ) : (
              weakChapters.map((chap, idx) => (
                <div key={idx} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-350">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-xs">{chap.chapter}</span>
                      <span className="text-[9px] uppercase font-extrabold text-slate-500 mt-0.5">{chap.subject}</span>
                    </div>
                    <span className="font-extrabold text-danger">{chap.accuracy}% accuracy</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-danger h-full rounded-full" style={{ width: `${chap.accuracy}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
