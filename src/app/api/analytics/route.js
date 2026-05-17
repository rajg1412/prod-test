import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// Empty stats structure to initialize a candidate's journey
const EMPTY_ANALYTICS = {
  summary: {
    totalAttempts: 0,
    averageScore: 0,
    averageAccuracy: 0,
    totalTimeSpentSeconds: 0,
    averageTimePerQuestion: 0
  },
  subjectPerformance: [
    { subject: 'Biology', attempted: 0, correct: 0, wrong: 0, score: 0, maxScore: 360, accuracy: 0 },
    { subject: 'Chemistry', attempted: 0, correct: 0, wrong: 0, score: 0, maxScore: 180, accuracy: 0 },
    { subject: 'Physics', attempted: 0, correct: 0, wrong: 0, score: 0, maxScore: 180, accuracy: 0 }
  ],
  progressTrends: [],
  strongChapters: [],
  weakChapters: []
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Return empty analytics if not a valid UUID (avoids server crashes on old cookies)
    if (!isSupabaseConfigured() || !userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json({
        success: true,
        analytics: EMPTY_ANALYTICS
      });
    }

    // 1. Fetch all attempts for user using supabaseAdmin to bypass RLS
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('attempts')
      .select('*, test:tests(title, total_questions)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (attemptsError) throw attemptsError;

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({
        success: true,
        analytics: EMPTY_ANALYTICS
      });
    }

    // 2. Fetch all detailed answers using supabaseAdmin to bypass RLS
    const attemptIds = attempts.map(a => a.id);
    const { data: answers, error: answersError } = await supabaseAdmin
      .from('answers')
      .select('*, question:questions(*)')
      .in('attempt_id', attemptIds);

    if (answersError) throw answersError;

    // 3. Process primary metrics
    const totalAttempts = attempts.length;
    let totalScore = 0;
    let totalAccuracy = 0;
    let totalTimeSpentSeconds = 0;
    let totalAttemptedQuestions = 0;
    let totalMaxScore = 0;

    attempts.forEach(a => {
      totalScore += a.score;
      totalAccuracy += parseFloat(a.accuracy);
      totalTimeSpentSeconds += a.time_spent_seconds;
      
      const qCount = a.test?.total_questions || 180;
      totalMaxScore += qCount * 4;
    });

    const averageScore = Math.round(totalScore / totalAttempts);
    const averageMaxScore = Math.round(totalMaxScore / totalAttempts);
    const averageAccuracy = parseFloat((totalAccuracy / totalAttempts).toFixed(1));

    // Subject Performance Accumulators
    const subjectStats = {
      Physics: { attempted: 0, correct: 0, wrong: 0 },
      Chemistry: { attempted: 0, correct: 0, wrong: 0 },
      Biology: { attempted: 0, correct: 0, wrong: 0 }
    };

    // Chapter Performance Accumulators
    const chapterStats = {};

    answers.forEach(ans => {
      const q = ans.question;
      if (!q) return;

      const sub = q.subject; // Physics, Chemistry, Biology
      const chap = q.chapter || 'General ' + sub;

      totalAttemptedQuestions++;

      // Init chapter key if missing
      if (!chapterStats[chap]) {
        chapterStats[chap] = { chapter: chap, subject: sub, correct: 0, total: 0 };
      }

      chapterStats[chap].total++;

      if (ans.selected_option) {
        if (subjectStats[sub]) {
          subjectStats[sub].attempted++;
        }
        if (ans.is_correct) {
          if (subjectStats[sub]) subjectStats[sub].correct++;
          chapterStats[chap].correct++;
        } else {
          if (subjectStats[sub]) subjectStats[sub].wrong++;
        }
      }
    });

    // Format subject stats for Recharts
    const subjectPerformance = Object.entries(subjectStats).map(([subj, stats]) => {
      const attempted = stats.attempted;
      const correct = stats.correct;
      const wrong = stats.wrong;
      const accuracy = attempted > 0 ? parseFloat(((correct / attempted) * 100).toFixed(1)) : 0;
      
      // Calculate NEET score contribution
      const score = (correct * 4) - (wrong * 1);
      const maxScore = subj === 'Biology' ? 360 : 180; // Standard single-test ratio proportions

      return {
        subject: subj,
        attempted,
        correct,
        wrong,
        score,
        maxScore,
        accuracy
      };
    });

    // Format progress trends
    const progressTrends = attempts.map((a, idx) => {
      const d = new Date(a.created_at);
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      return {
        attemptNumber: idx + 1,
        testTitle: a.test?.title || `Practice #${idx + 1}`,
        date: formattedDate,
        score: a.score,
        maxScore: (a.test?.total_questions || 180) * 4,
        accuracy: parseFloat(a.accuracy)
      };
    });

    const latestAttempt = attempts[attempts.length - 1];

    // Format and sort chapter performances
    const formattedChapters = Object.values(chapterStats).map(c => {
      const accuracy = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
      return {
        chapter: c.chapter,
        subject: c.subject,
        accuracy,
        correct: c.correct,
        total: c.total
      };
    });

    // Separate strong vs weak chapters (accuracy > 70% vs accuracy <= 55%)
    const strongChapters = formattedChapters
      .filter(c => c.accuracy >= 70 && c.total >= 3)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    const weakChapters = formattedChapters
      .filter(c => c.accuracy < 60 && c.total >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    // Calculate time metrics
    const averageTimePerQuestion = totalAttemptedQuestions > 0 ? Math.round(totalTimeSpentSeconds / totalAttemptedQuestions) : 0;

    return NextResponse.json({
      success: true,
      analytics: {
        summary: {
          totalAttempts,
          averageScore,
          averageMaxScore,
          averageAccuracy,
          totalTimeSpentSeconds,
          averageTimePerQuestion
        },
        subjectPerformance,
        progressTrends,
        strongChapters,
        weakChapters,
        latestAttempt
      }
    });

  } catch (error) {
    console.error('Fetch student analytics API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
