import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// Bring in Mock Questions to calculate scores for fallback/mock mode
const MOCK_QUESTIONS = [
  { id: 'mock-q-1', correct_answer: 'B' },
  { id: 'mock-q-2', correct_answer: 'C' },
  { id: 'mock-q-3', correct_answer: 'B' },
  { id: 'mock-q-4', correct_answer: 'B' },
  { id: 'mock-q-5', correct_answer: 'C' },
  { id: 'mock-q-6', correct_answer: 'A' },
  { id: 'mock-q-7', correct_answer: 'B' },
  { id: 'mock-q-8', correct_answer: 'C' },
  { id: 'mock-q-9', correct_answer: 'B' },
  { id: 'mock-q-10', correct_answer: 'B' }
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  try {
    const { testId, userId, timeSpentSeconds, answers } = await request.json();

    if (!testId || !answers) {
      return NextResponse.json(
        { success: false, error: 'testId and answers are required.' },
        { status: 400 }
      );
    }

    // Resolve if we run in mock/simulation
    const isMock = !isSupabaseConfigured() || 
                   testId.startsWith('demo-') || 
                   testId.startsWith('simulated-') || 
                   !userId || 
                   !UUID_REGEX.test(userId);

    // 1. Resolve question key (answers) to grade
    let questions = [];

    if (isMock) {
      questions = MOCK_QUESTIONS;
    } else {
      const { data, error } = await supabaseAdmin
        .from('questions')
        .select('id, correct_answer')
        .eq('test_id', testId);
      
      if (error) throw error;
      questions = data || [];
    }

    // Map questions by id for fast lookup
    const questionKey = {};
    questions.forEach(q => {
      questionKey[q.id] = q.correct_answer;
    });

    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    // Detailed answers mapper to write to DB
    const processedAnswers = [];

    answers.forEach(ans => {
      const correctAnswer = questionKey[ans.questionId];
      const selected = ans.selectedOption; // A, B, C, D, or null
      
      let isCorrect = false;
      
      if (!selected) {
        unattemptedCount++;
      } else if (correctAnswer && selected.toUpperCase() === correctAnswer.toUpperCase()) {
        correctCount++;
        isCorrect = true;
      } else {
        wrongCount++;
        isCorrect = false;
      }

      processedAnswers.push({
        question_id: ans.questionId,
        selected_option: selected || null,
        is_correct: isCorrect,
        time_taken_seconds: ans.timeTakenSeconds || 0
      });
    });

    // Handle any missing questions in the payload as unattempted
    const answeredQuestionIds = new Set(answers.map(a => a.questionId));
    questions.forEach(q => {
      if (!answeredQuestionIds.has(q.id)) {
        unattemptedCount++;
        processedAnswers.push({
          question_id: q.id,
          selected_option: null,
          is_correct: false,
          time_taken_seconds: 0
        });
      }
    });

    // NEET scoring formula: +4 for correct, -1 for wrong
    const score = (correctCount * 4) - (wrongCount * 1);
    
    // Accuracy = (correct / attempted) * 100
    const totalAttempted = correctCount + wrongCount;
    const accuracy = totalAttempted > 0 ? parseFloat(((correctCount / totalAttempted) * 100).toFixed(2)) : 0.00;

    // Simulated Attempt response for fallback mode
    if (isMock) {
      const simulatedAttemptId = 'attempt-' + Math.random().toString(36).substr(2, 9);
      
      return NextResponse.json({
        success: true,
        isMock: true,
        attemptId: simulatedAttemptId,
        attempt: {
          id: simulatedAttemptId,
          test_id: testId,
          score,
          accuracy,
          correct_count: correctCount,
          wrong_count: wrongCount,
          unattempted_count: unattemptedCount,
          time_spent_seconds: timeSpentSeconds,
          created_at: new Date().toISOString()
        }
      });
    }

    // 2. Write attempt to DB using supabaseAdmin to bypass write RLS policies
    const { data: attemptData, error: attemptError } = await supabaseAdmin
      .from('attempts')
      .insert({
        user_id: userId,
        test_id: testId,
        score,
        accuracy,
        correct_count: correctCount,
        wrong_count: wrongCount,
        unattempted_count: unattemptedCount,
        time_spent_seconds: timeSpentSeconds
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // 3. Bulk insert detailed answers using supabaseAdmin to bypass write RLS
    const answersWithAttemptId = processedAnswers.map(ans => ({
      attempt_id: attemptData.id,
      question_id: ans.question_id,
      selected_option: ans.selected_option,
      is_correct: ans.is_correct,
      time_taken_seconds: ans.time_taken_seconds
    }));

    const { error: answersError } = await supabaseAdmin
      .from('answers')
      .insert(answersWithAttemptId);

    if (answersError) {
      // Cleanup orphan attempt
      await supabaseAdmin.from('attempts').delete().eq('id', attemptData.id);
      throw answersError;
    }

    return NextResponse.json({
      success: true,
      attemptId: attemptData.id,
      attempt: attemptData
    });

  } catch (error) {
    console.error('Submit test attempt API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Return empty attempts list if not a valid UUID (avoids server crashes on old cookies)
    if (!isSupabaseConfigured() || !userId || !UUID_REGEX.test(userId)) {
      return NextResponse.json({
        success: true,
        attempts: []
      });
    }

    // Fetch attempts from DB using supabaseAdmin to bypass read RLS policies on behalf of the user
    const { data, error } = await supabaseAdmin
      .from('attempts')
      .select('*, test:tests(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      attempts: data || []
    });

  } catch (error) {
    console.error('Fetch attempts history API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
