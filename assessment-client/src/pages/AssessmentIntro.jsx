import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/client';
import { AlertCircle, ArrowRight, Clock, HelpCircle, ShieldAlert } from 'lucide-react';
import { AssessmentPortalHeader, AssessmentWatermark } from './AssessmentPortalHeader';

const AssessmentIntro = () => {
  const { candidateCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchIntro = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/assessment/${candidateCode}/intro`);
        const raw = res.data?.data;
        setData((raw && raw.assessmentTitle) ? raw : (raw?.data || raw));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load assessment information.');
      } finally {
        setLoading(false);
      }
    };

    if (candidateCode) {
      fetchIntro();
    }
  }, [candidateCode]);

  const handleBegin = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen().catch(() => {});
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen().catch(() => {});
      }
    } catch (err) {
      console.warn('Fullscreen request blocked or unsupported:', err);
    }
    const isCompleted = data?.status === 'Completed';
    navigate(`/assessment/${candidateCode}/exam${isCompleted ? '?retake=true' : ''}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-red-200 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Not Found</h2>
          <p className="text-sm text-gray-600 mb-6">{error || 'Invalid or expired candidate code.'}</p>
          <button
            onClick={() => navigate('/assessment/signin')}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition"
          >
            Go to Desk Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-800">
      <AssessmentWatermark />
      <AssessmentPortalHeader
        rightContent={
          <span className="font-mono text-xs sm:text-sm font-bold text-gray-500 tracking-wider">
            {data.candidateCode}
          </span>
        }
      />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div
          style={{ borderTopColor: 'var(--erp-primary, #2563eb)' }}
          className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 p-8 sm:p-12"
        >
          
          {/* Welcome Tag */}
          <div
            style={{ color: 'var(--erp-primary, #2563eb)' }}
            className="text-xs font-bold uppercase tracking-wider mb-2"
          >
            WELCOME, {data.fullName || 'CANDIDATE'}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            {data.assessmentTitle}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-gray-500 mb-6 font-medium">
            {data.totalQuestions} questions · {data.timeMinutes} minutes · Complete the assessment in one sitting.
          </p>

          <hr className="border-gray-100 mb-6" />

          {/* Rules List */}
          <div className="space-y-3 mb-8 text-xs sm:text-sm text-gray-600">
            <div className="flex items-start space-x-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
              <span>The timer starts when you select <strong>Begin assessment</strong>.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
              <span>Your answers and current question are restored after a refresh.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
              <span>Multiple-choice answers are locked after Save & Next.</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
              <span>The assessment submits automatically when time expires.</span>
            </div>
            <div className="flex items-start space-x-2.5 text-gray-800 font-medium">
              <span
                style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
              />
              <span>
                <strong>Fullscreen Mode:</strong> The assessment automatically enters full screen mode. Please keep the window maximized throughout the examination.
              </span>
            </div>
            <div className="flex items-start space-x-2.5 text-gray-800 font-medium">
              <span
                style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
                className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
              />
              <span>
                <strong>Warning:</strong> switching tabs 3 times automatically submits the assessment.
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleBegin}
              style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
              className="px-8 py-3 rounded-md text-white font-bold text-sm shadow-xs transition hover:opacity-90 cursor-pointer"
            >
              Begin assessment
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-gray-400">
        For technical assistance, contact your recruiter.
      </footer>
    </div>
  );
};

export default AssessmentIntro;
