'use client';

import { useState, useEffect } from 'react';
import { getLocalSession } from '@/lib/auth-service';
import { FileUp, BookOpen, Clock, Check, AlertCircle, FileText, ChevronRight, RefreshCw, Trash2 } from 'lucide-react';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [testTitle, setTestTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(180);
  
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Parsed Questions state
  const [parsedData, setParsedData] = useState(null); // { filename, totalQuestions, subjectBreakdown, questions }

  useEffect(() => {
    const session = getLocalSession();
    if (!session) {
      window.location.href = '/auth';
      return;
    }
    if (!session.is_admin) {
      setError('Access Denied. Student profiles cannot access the Upload Panel.');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return;
    }
    setUser(session);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // Default test title to filename (without extension)
      const titleWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTestTitle(titleWithoutExt.replace(/[-_]/g, ' '));
    }
  };

  const handleUploadAndParse = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setParsedData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setParsedData(data);
        setSuccess('File parsed successfully! Review the extracted questions below.');
      } else {
        setError(data.error || 'Parsing failed. Check the formatting of your document.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Network connection error. Server might be processing a large document.');
    } finally {
      setUploading(false);
    }
  };

  const handlePublishTest = async () => {
    if (!parsedData || parsedData.questions.length === 0) return;
    if (!testTitle.trim()) {
      setError('Please enter a valid title for the NEET Mock Exam.');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: testTitle,
          duration_minutes: parseInt(durationMinutes) || 180,
          questions: parsedData.questions
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Successfully published "${testTitle}" with ${parsedData.questions.length} questions! Redirecting to lobby...`);
        setParsedData(null);
        setFile(null);
        
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setError(data.error || 'Failed to save test to database.');
      }
    } catch (err) {
      console.error('Publish error:', err);
      setError('Network connection error. Could not publish exam.');
    } finally {
      setPublishing(false);
    }
  };

  const deleteQuestion = (index) => {
    if (!parsedData) return;
    const updatedQs = [...parsedData.questions];
    updatedQs.splice(index, 1);
    
    // Update indices
    const cleanedQs = updatedQs.map((q, idx) => ({
      ...q,
      question_number: idx + 1
    }));

    // Recalculate breakdown
    const subjectBreakdown = { Physics: 0, Chemistry: 0, Biology: 0 };
    cleanedQs.forEach(q => {
      if (subjectBreakdown[q.subject] !== undefined) subjectBreakdown[q.subject]++;
    });

    setParsedData({
      ...parsedData,
      totalQuestions: cleanedQs.length,
      subjectBreakdown,
      questions: cleanedQs
    });
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 select-none">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">Admin Test Creator</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Upload mock exams in TXT, Word, or PDF layout. Questions are processed and auto-categorized instantly.</p>
      </div>

      {/* Errors & Alerts */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 text-danger rounded-xl flex items-start space-x-3 text-sm mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success/10 border border-success/30 text-success rounded-xl flex items-start space-x-3 text-sm mb-6 animate-pulse">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Upload Zone Block */}
      {!parsedData && (
        <form onSubmit={handleUploadAndParse} className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
          <div className="border-2 border-dashed border-border hover:border-slate-700/80 rounded-2xl p-8 sm:p-12 text-center transition-all bg-background/40 relative">
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              id="file-upload"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-4">
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <FileUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {file ? file.name : 'Select NEET Mock Document'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Drag and drop or click to browse (TXT, PDF, or DOCX up to 10MB)
                </p>
              </div>
            </div>
          </div>

          {file && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Test Title</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="Enter exam title"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Duration (Minutes)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Clock className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="180"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-white text-sm focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-xl text-sm font-semibold shadow transition-all flex items-center justify-center space-x-2 cursor-pointer tap-highlight-transparent"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Document Text & Extracting MCQs...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Parse Document Questions</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Parsed Preview Section */}
      {parsedData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Metadata Banner */}
          <div className="bg-card border border-border p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg">
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 py-0.5 px-2 rounded">
                Parser Analysis Result
              </span>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Title:</span>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="bg-background border border-border px-2 py-1 rounded text-white text-sm focus:outline-none focus:border-primary w-64 sm:w-80"
                  />
                </div>
                <p className="text-xs text-slate-400">Filename: {parsedData.filename}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-center p-3 bg-background border border-border rounded-xl min-w-[70px]">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Physics</span>
                <span className="text-sm font-black text-white">{parsedData.subjectBreakdown.Physics}</span>
              </div>
              <div className="text-center p-3 bg-background border border-border rounded-xl min-w-[70px]">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Chemistry</span>
                <span className="text-sm font-black text-white">{parsedData.subjectBreakdown.Chemistry}</span>
              </div>
              <div className="text-center p-3 bg-background border border-border rounded-xl min-w-[70px]">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Biology</span>
                <span className="text-sm font-black text-white">{parsedData.subjectBreakdown.Biology}</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Total Extracted: {parsedData.totalQuestions} Questions
            </span>
            
            <div className="flex gap-2">
              <button
                onClick={() => setParsedData(null)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Clear Parser
              </button>
              
              <button
                onClick={handlePublishTest}
                disabled={publishing}
                className="py-2.5 px-4 bg-success hover:bg-success/80 disabled:bg-success/50 text-white text-xs font-semibold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer tap-highlight-transparent"
              >
                {publishing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Publish Exam to Lobby</span>
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {parsedData.questions.map((q, idx) => (
              <div 
                key={idx}
                className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-800 transition-all relative group"
              >
                {/* Delete Question button */}
                <button
                  onClick={() => deleteQuestion(idx)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg border border-border text-slate-500 hover:text-danger hover:border-danger/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Remove question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Subject / Chapter tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase py-0.5 px-2 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                    Q{q.question_number}
                  </span>
                  
                  <span className={`text-[10px] font-black uppercase py-0.5 px-2 rounded-md border ${
                    q.subject === 'Biology'
                      ? 'bg-success-bg border-success/20 text-success'
                      : q.subject === 'Physics'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-warning/10 border-warning/20 text-warning'
                  }`}>
                    {q.subject}
                  </span>

                  <span className="text-[10px] font-bold text-slate-400 bg-background/50 border border-border/60 py-0.5 px-2 rounded">
                    Chapter: {q.chapter}
                  </span>
                </div>

                {/* Question Text */}
                <p className="text-sm font-semibold text-white leading-relaxed pr-6">{q.question_text}</p>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-background border border-border/80 rounded-lg text-slate-300">
                    <span className="font-extrabold text-primary mr-1">A.</span> {q.option_a}
                  </div>
                  <div className="p-2.5 bg-background border border-border/80 rounded-lg text-slate-300">
                    <span className="font-extrabold text-primary mr-1">B.</span> {q.option_b}
                  </div>
                  <div className="p-2.5 bg-background border border-border/80 rounded-lg text-slate-300">
                    <span className="font-extrabold text-primary mr-1">C.</span> {q.option_c}
                  </div>
                  <div className="p-2.5 bg-background border border-border/80 rounded-lg text-slate-300">
                    <span className="font-extrabold text-primary mr-1">D.</span> {q.option_d}
                  </div>
                </div>

                {/* Answer and Explanation */}
                <div className="border-t border-border/50 pt-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 text-xs">
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <span className="font-bold text-slate-500 uppercase">Correct:</span>
                    <span className="py-0.5 px-2 bg-success text-white font-extrabold rounded">{q.correct_answer}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="font-bold text-slate-500 uppercase block mb-0.5">Explanation:</span>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
