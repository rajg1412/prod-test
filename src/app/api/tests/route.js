import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        tests: []
      });
    }

    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      tests: data || []
    });

  } catch (error) {
    console.error('Fetch tests API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { title, duration_minutes, questions } = await request.json();

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Test title and parsed questions are required.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase keys are not set. Cannot publish exam.' },
        { status: 500 }
      );
    }

    // 1. Create the Test row using supabaseAdmin to bypass write RLS
    const { data: testData, error: testError } = await supabaseAdmin
      .from('tests')
      .insert({
        title,
        duration_minutes: duration_minutes || 180,
        total_questions: questions.length,
        is_published: true
      })
      .select()
      .single();

    if (testError) throw testError;

    // 2. Map questions with their test_id
    const questionsWithId = questions.map((q, idx) => ({
      test_id: testData.id,
      question_number: idx + 1,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      subject: q.subject,
      chapter: q.chapter
    }));

    // 3. Batch insert questions using supabaseAdmin to bypass write RLS
    const { error: questionsError } = await supabaseAdmin
      .from('questions')
      .insert(questionsWithId);

    if (questionsError) {
      // Cleanup orphan test entry
      await supabaseAdmin.from('tests').delete().eq('id', testData.id);
      throw questionsError;
    }

    return NextResponse.json({
      success: true,
      test: testData
    });

  } catch (error) {
    console.error('Create test API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
