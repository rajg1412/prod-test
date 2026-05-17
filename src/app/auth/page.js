'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { setLocalSession, getLocalSession } from '@/lib/auth-service';
import { BookOpen, User, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('student-login'); // student-login, admin-login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isDemoMode] = useState(() => !isSupabaseConfigured());

  useEffect(() => {
    // If already logged in, redirect
    const user = getLocalSession();
    if (user) {
      window.location.href = user.is_admin ? '/admin' : '/dashboard';
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      setLoading(false);
      return;
    }

    try {
      if (isDemoMode) {
        // --- SIMULATED DEMO LOGIN ---
        let is_admin = false;
        const normalizedEmail = email.trim().toLowerCase();
        
        if (activeTab === 'admin-login') {
          if (normalizedEmail !== 'admin@gmail.com') {
            throw new Error('For offline demo admin access, please use admin@gmail.com');
          }
          is_admin = true;
        } else {
          if (normalizedEmail !== 'gauri@neet.com') {
            throw new Error('For offline demo student access, please use gauri@neet.com');
          }
        }
        
        const demoUser = {
          id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
          email: normalizedEmail,
          full_name: is_admin ? 'Admin Instructor' : 'Gauri Student',
          is_admin
        };

        setLocalSession(demoUser);
        setMessage({ type: 'success', text: 'Sandbox login successful! Loading workspace...' });
        
        setTimeout(() => {
          window.location.href = is_admin ? '/admin' : '/dashboard';
        }, 1200);

      } else {
        // --- REAL SUPABASE AUTH ---
        const normalizedEmail = email.trim().toLowerCase();
        
        // Safety check to ensure they can only login with the two specific email ids
        if (activeTab === 'admin-login' && normalizedEmail !== 'admin@gmail.com') {
          throw new Error('Access denied. Admin portal only allows admin@gmail.com.');
        }
        if (activeTab === 'student-login' && normalizedEmail !== 'gauri@neet.com') {
          throw new Error('Access denied. Student portal only allows gauri@neet.com.');
        }

        // Login flow (student or admin)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });

        if (error) throw error;

        if (data.user) {
          // Fetch profile detail to check is_admin column
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const isAdminUser = profile ? profile.is_admin : (activeTab === 'admin-login');

          if (activeTab === 'admin-login' && !isAdminUser) {
            throw new Error('Access denied. This email is not flagged as Admin.');
          }

          const activeUser = {
            id: data.user.id,
            email: data.user.email,
            full_name: profile?.full_name || data.user.user_metadata?.full_name || (isAdminUser ? 'Admin Instructor' : 'Gauri Student'),
            is_admin: isAdminUser
          };

          setLocalSession(activeUser);
          setMessage({ type: 'success', text: 'Login Successful! Loading workspace...' });
          
          setTimeout(() => {
            window.location.href = isAdminUser ? '/admin' : '/dashboard';
          }, 1200);
        }
      }
    } catch (err) {
      console.error('Authentication Error:', err);
      setMessage({ type: 'error', text: err.message || 'An error occurred during authentication.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-background relative overflow-hidden select-none">
      
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-card border border-border text-primary mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            NEET Test Analyzer
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Comfortable, distraction-free exam preparation portal
          </p>
        </div>

        {/* Tab Buttons (Strictly 2 Columns: Student vs Admin) */}
        <div className="grid grid-cols-2 p-1 bg-card/60 border border-border rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveTab('student-login'); setMessage(null); }}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all tap-highlight-transparent cursor-pointer ${
              activeTab === 'student-login'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Student Log In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('admin-login'); setMessage(null); }}
            className={`py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all tap-highlight-transparent cursor-pointer ${
              activeTab === 'admin-login'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admin Portal
          </button>
        </div>

        {/* Notification Boxes */}
        {message && (
          <div className={`p-4 rounded-xl border flex items-start space-x-3 text-sm ${
            message.type === 'success'
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleAuth} className="mt-8 space-y-5 bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                id="email"
                type="email"
                placeholder={activeTab === 'admin-login' ? 'admin@gmail.com' : 'gauri@neet.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-xl text-sm font-semibold tracking-wide shadow-md transition-all flex items-center justify-center space-x-2 tap-highlight-transparent cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>
                {activeTab === 'student-login' && 'Log In to Dashboard'}
                {activeTab === 'admin-login' && 'Log In as Admin'}
              </span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
