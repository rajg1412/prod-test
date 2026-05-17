import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { parseNeetQuestions } from '@/lib/parser';

// Set max body size or config if necessary in Next.js 15
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const filename = file.name;
    const fileType = filename.split('.').pop().toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText = '';

    if (fileType === 'txt') {
      extractedText = buffer.toString('utf-8');
    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileType === 'pdf') {
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      extractedText = data.text;
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file format. Please upload TXT, PDF, or DOCX.' },
        { status: 400 }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not extract text from the file.' },
        { status: 400 }
      );
    }

    // Pass the extracted text into the intelligent parser
    const parsedQuestions = parseNeetQuestions(extractedText);

    if (parsedQuestions.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No questions could be extracted. Please ensure the file contains structured MCQs with option labels (A., B., C., D.) and answers.' 
        },
        { status: 422 }
      );
    }

    // Calculate subject-wise metrics
    const subjectBreakdown = {
      Physics: 0,
      Chemistry: 0,
      Biology: 0
    };

    parsedQuestions.forEach(q => {
      if (subjectBreakdown[q.subject] !== undefined) {
        subjectBreakdown[q.subject]++;
      }
    });

    return NextResponse.json({
      success: true,
      filename,
      totalQuestions: parsedQuestions.length,
      subjectBreakdown,
      questions: parsedQuestions
    });

  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { success: false, error: `Parsing failed: ${error.message}` },
      { status: 500 }
    );
  }
}
