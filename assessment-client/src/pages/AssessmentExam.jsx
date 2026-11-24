import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/client';
import { X, AlertTriangle, CheckCircle, Clock, Maximize2, Minimize2 } from 'lucide-react';
import { VahlayEmblem, AssessmentWatermark } from './AssessmentPortalHeader';

const AssessmentExam = () => {
  const { candidateCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(50 * 60);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [detectedKey, setDetectedKey] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(
    Boolean(typeof document !== 'undefined' && (document.fullscreenElement || document.webkitFullscreenElement))
  );

  const tabSwitchesRef = useRef(0);
  const submittingRef = useRef(false);

  const requestFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request blocked or unsupported:', err);
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Auto-enter fullscreen when examination desk loads
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      requestFullscreen().catch(() => {});
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 1. Fetch exam questions & resume state
  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const urlParams = new URLSearchParams(window.location.search);
        const isRetake = urlParams.get('retake') === 'true';

        const res = await axios.get(`/api/assessment/${candidateCode}/exam${isRetake ? '?retake=true' : ''}`);
        const raw = res.data?.data;
        const data = (raw && raw.questions) ? raw : (raw?.data || raw);
        if (!data || !Array.isArray(data.questions)) return;

        setExamData(data);
        const secs = Number(data.remainingSeconds);
        setRemainingSeconds(!isNaN(secs) && secs > 0 ? secs : 50 * 60);
        setTabSwitches(data.tabSwitchCount || 0);
        tabSwitchesRef.current = data.tabSwitchCount || 0;

        if (data.savedAnswers && typeof data.savedAnswers === 'object') {
          setAnswers(data.savedAnswers);
        }

        if (data.status === 'Completed' && !isRetake) {
          navigate(`/assessment/${candidateCode}/result`, { replace: true });
        }
      } catch (err) {
        console.error('Failed to load exam:', err);
      } finally {
        setLoading(false);
      }
    };

    if (candidateCode) {
      fetchExam();
    }
  }, [candidateCode, navigate]);

  // 2. Countdown Timer
  useEffect(() => {
    if (loading || !examData || submitting) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, examData, submitting]);

  // 3. Keyboard Key Warning: Restrict keys and warn that tab-switching is prohibited
  useEffect(() => {
    if (loading || !examData || submitting) return;

    const handleKeyDown = (e) => {
      // Intercept and prevent browser actions for tab switching, refresh, DevTools
      if (
        e.key === 'Tab' ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.key === 'F5' ||
        e.key === 'F12' ||
        e.key === 'F11' ||
        e.key === 'Escape'
      ) {
        e.preventDefault();
        e.stopPropagation();
      }

      const keyLabel = e.key === ' ' ? 'Space' : e.key;
      setDetectedKey(keyLabel);
      setShowKeyWarning(true);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [loading, examData, submitting]);

  // 4. Anti-cheat Tab Switch Tracking: If user tries to change tab/window, automatically submit immediately
  const recordTabSwitchBackend = useCallback(async () => {
    if (submittingRef.current || loading || !examData) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      await axios.post(`/api/assessment/${candidateCode}/tab-switch`);
    } catch (err) {
      console.warn('Tab-switch signal logged:', err?.message);
    }

    try {
      await axios.post(`/api/assessment/${candidateCode}/submit`, { answers });
      exitFullscreen();
      navigate(`/assessment/${candidateCode}/result`, {
        replace: true,
        state: { autoSubmittedReason: 'tab_switch_prohibited' },
      });
    } catch (err) {
      console.error('Error auto-submitting after tab switch:', err);
      exitFullscreen();
      navigate(`/assessment/${candidateCode}/result`, {
        replace: true,
        state: { autoSubmittedReason: 'tab_switch_prohibited' },
      });
    }
  }, [candidateCode, navigate, loading, examData, answers]);

  useEffect(() => {
    if (loading || !examData || submitting) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordTabSwitchBackend();
      }
    };

    const handleWindowBlur = () => {
      // If user clicks outside the window to another application/tab
      recordTabSwitchBackend();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [recordTabSwitchBackend, loading, examData, submitting]);

  // 4. Save Answer for current question
  const handleSelectOption = (optionKey) => {
    if (!examData?.questions?.[currentIndex]) return;
    const qNum = examData.questions[currentIndex].questionNumber;

    setAnswers((prev) => ({
      ...prev,
      [String(qNum)]: optionKey,
    }));
  };

  const handleSaveAndNext = async () => {
    if (!examData?.questions?.[currentIndex]) return;
    const currentQ = examData.questions[currentIndex];
    const qNum = currentQ.questionNumber;
    const selected = answers[String(qNum)];

    if (selected) {
      try {
        await axios.post(`/api/assessment/${candidateCode}/answer`, {
          questionNumber: qNum,
          selectedOption: selected,
        });
      } catch (err) {
        console.error('Error saving answer:', err);
      }
    }

    if (currentIndex < examData.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Last question - prompt submit
      handleFinalSubmit();
    }
  };

  // 5. Submit Assessment
  const handleFinalSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      await axios.post(`/api/assessment/${candidateCode}/submit`, { answers });
      exitFullscreen();
      // Step 5 complete -> proceed to Step 6: Final registration completed page
      navigate(`/assessment/${candidateCode}/complete`, { replace: true });
    } catch (err) {
      console.error('Error submitting exam:', err);
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleAutoSubmit = async (reason) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      await axios.post(`/api/assessment/${candidateCode}/submit`, { answers });
      exitFullscreen();
      // Step 5 complete -> proceed to Step 6: Final registration completed page
      navigate(`/assessment/${candidateCode}/complete`, {
        replace: true,
        state: { autoSubmittedReason: reason },
      });
    } catch (err) {
      console.error('Auto submit error:', err);
    }
  };

  // Format MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading || !examData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const questions = examData.questions || [];
  const currentQ = questions[currentIndex] || {};
  const answeredCount = Object.keys(answers).length;
  const currentAnswer = answers[String(currentQ.questionNumber)] || '';

  return (
    <div className="relative min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-800 select-none">
      <AssessmentWatermark />

      {/* Top Banner if user exits Fullscreen */}
      {!isFullscreen && (
        <div className="relative z-30 bg-blue-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span>Fullscreen mode is required for this examination. Please keep the window maximized.</span>
          </div>
          <button
            onClick={requestFullscreen}
            className="bg-white text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1 cursor-pointer flex-shrink-0 ml-3"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Return to Fullscreen</span>
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <VahlayEmblem />
        </div>

        {/* Center Controls: Fullscreen toggle & Exit */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Fullscreen On' : 'Full Screen'}</span>
          </button>
          <button
            onClick={() => setShowExitModal(true)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center transition shadow-xs cursor-pointer"
            title="Exit Assessment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Right Timer & Candidate Code */}
        <div className="text-right">
          <div
            style={{ color: 'var(--erp-primary, #2563eb)' }}
            className={`font-mono text-xl sm:text-2xl font-bold tracking-tight ${
              remainingSeconds < 300 ? 'animate-pulse' : ''
            }`}
          >
            {formatTimer(remainingSeconds)}
          </div>
          <div className="font-mono text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            {candidateCode}
          </div>
        </div>
      </header>

      {/* MAIN EXAM CONTAINER */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-4">
        <div
          style={{ borderTopColor: 'var(--erp-primary, #2563eb)' }}
          className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 p-6 sm:p-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT PALETTE PANEL (4 Cols) */}
            <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-gray-100 lg:pr-6 pb-6 lg:pb-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-500">
                  Answered {answeredCount} of {questions.length}
                </span>
              </div>

              {/* Numbered Palette Grid (5 cols) */}
              <div className="grid grid-cols-5 gap-2 max-h-[440px] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = !!answers[String(q.questionNumber)];

                  let btnStyle = 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50';
                  let inlineStyle = undefined;
                  if (isCurrent) {
                    btnStyle = 'text-white font-bold shadow-sm';
                    inlineStyle = {
                      backgroundColor: 'var(--erp-primary, #2563eb)',
                      borderColor: 'var(--erp-primary, #2563eb)',
                    };
                  } else if (isAnswered) {
                    btnStyle = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                  }

                  return (
                    <button
                      key={q.questionNumber}
                      onClick={() => setCurrentIndex(idx)}
                      style={inlineStyle}
                      className={`h-9 w-full rounded-lg border text-xs flex items-center justify-center transition cursor-pointer ${btnStyle}`}
                    >
                      {q.questionNumber}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <div className="flex items-center space-x-1.5">
                  <span
                    style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                    className="w-3 h-3 rounded"
                  />
                  <span>Current</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-white border border-gray-200" />
                  <span>Unanswered</span>
                </div>
              </div>
            </div>

            {/* RIGHT QUESTION PANEL (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between min-h-[420px]">
              <div>
                {/* Section & Question Progress */}
                <div
                  style={{ color: 'var(--erp-primary, #2563eb)' }}
                  className="text-[11px] font-bold uppercase tracking-wider mb-3"
                >
                  {currentQ.section || 'ASSESSMENT'} · QUESTION {currentIndex + 1} OF {questions.length}
                </div>

                {/* Question Text */}
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-6">
                  {currentQ.question}
                </h2>

                {/* Options List */}
                <div className="space-y-3">
                  {currentQ.options &&
                    Object.entries(currentQ.options).map(([optKey, optText]) => {
                      const isSelected = currentAnswer === optKey;

                      return (
                        <div
                          key={optKey}
                          onClick={() => handleSelectOption(optKey)}
                          style={
                            isSelected
                              ? {
                                  borderColor: 'var(--erp-primary, #2563eb)',
                                  backgroundColor: 'color-mix(in srgb, var(--erp-primary, #2563eb) 6%, transparent)',
                                }
                              : undefined
                          }
                          className={`flex items-center space-x-3.5 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition ${
                            isSelected
                              ? 'shadow-xs'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                          }`}
                        >
                          {/* Radio Circle */}
                          <div
                            style={
                              isSelected
                                ? {
                                    borderColor: 'var(--erp-primary, #2563eb)',
                                    backgroundColor: 'var(--erp-primary, #2563eb)',
                                  }
                                : undefined
                            }
                            className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition ${
                              isSelected
                                ? ''
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>

                          {/* Option Badge & Text */}
                          <div className="flex items-center space-x-3 text-sm text-gray-800">
                            <span className="font-bold text-gray-700 w-4">{optKey}</span>
                            <span className="font-normal">{optText}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>

                <div className="flex items-center space-x-3">
                  {currentIndex === questions.length - 1 ? (
                    <button
                      onClick={handleFinalSubmit}
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-60 cursor-pointer"
                    >
                      {submitting ? 'Submitting...' : 'Submit Assessment'}
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveAndNext}
                      style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                      className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md transition hover:opacity-90 cursor-pointer"
                    >
                      Save & Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-gray-400">
        For technical assistance, contact your recruiter.
      </footer>

      {/* TAB SWITCH WARNING MODAL */}
      {showTabWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl border border-red-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Tab Switch Detected!</h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              You navigated away from the assessment window. This has been recorded as{' '}
              <strong className="text-red-600">Warning {tabSwitches} of 3</strong>.
              <br />
              Switching tabs 3 times will automatically submit your assessment.
            </p>
            <button
              onClick={() => setShowTabWarning(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition"
            >
              Resume Assessment
            </button>
          </div>
        </div>
      )}

      {/* KEYBOARD ACTIVITY & TAB SWITCH WARNING MODAL */}
      {showKeyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border border-rose-200 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-4 shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="inline-block px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-2.5">
              RESTRICTED KEYSTROKE DETECTED
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mb-2">
              Keyboard Action Prohibited
            </h3>

            <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed">
              Keyboard inputs are disabled during this assessment. You cannot switch tabs, change windows, or use shortcut keys.
            </p>

            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-left">
              <div className="flex items-start space-x-2 text-xs text-rose-800 leading-normal">
                <span className="font-bold shrink-0">⚠️ CRITICAL WARNING:</span>
                <span>
                  If you attempt to <strong>switch tabs or change windows</strong>, your assessment will be <strong>submitted automatically</strong> immediately with your current answers.
                </span>
              </div>
              {detectedKey && (
                <div className="mt-2 pt-2 border-t border-rose-200/70 text-[11px] text-rose-700 flex items-center justify-between">
                  <span>Detected Key:</span>
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-rose-300">
                    {detectedKey}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-500 mb-6">
              Please use only your <strong>mouse or touch controls</strong> to select options (A, B, C, D) and click Save &amp; Next.
            </p>

            <button
              onClick={() => setShowKeyWarning(false)}
              style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
              className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-sm transition hover:opacity-90 cursor-pointer"
            >
              I Understand &amp; Continue Assessment
            </button>
          </div>
        </div>
      )}

      {/* EXIT CONFIRMATION MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl border border-gray-100 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Exit Assessment?</h3>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              Your answered questions have been recorded. However, please note that the examination timer
              will continue running in the background.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Continue Assessment
              </button>
              <button
                onClick={() => navigate('/assessment/signin')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                Exit to Desk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentExam;
