import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import axios from '../api/client';
import { CheckCircle2, AlertCircle, ArrowRight, Award } from 'lucide-react';
import { AssessmentPortalHeader, AssessmentWatermark } from './AssessmentPortalHeader';

const AssessmentResult = () => {
  const { candidateCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const autoSubmittedReason = location.state?.autoSubmittedReason;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/assessment/${candidateCode}/result`);
        const raw = res.data?.data;
        setData((raw && (raw.score !== undefined || raw.colorCategory)) ? raw : (raw?.data || raw));
      } catch (err) {
        console.error('Failed to load result:', err);
      } finally {
        setLoading(false);
      }
    };

    if (candidateCode) {
      fetchResult();
    }
  }, [candidateCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const categoryBadges = {
    Green: { label: 'Qualified (Green)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    Yellow: { label: 'Under Review (Yellow)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    Red: { label: 'Evaluated (Red)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  };

  const badge = categoryBadges[data?.colorCategory] || categoryBadges.Green;

  return (
    <div className="relative min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-800">
      <AssessmentWatermark />
      <AssessmentPortalHeader location={`${data?.driveLocation || 'Ahmedabad'} candidate portal`} />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div
          style={{ borderTopColor: 'var(--erp-primary, #2563eb)' }}
          className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 p-8 sm:p-12 text-center"
        >
          
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Assessment Submitted
          </h1>

          {autoSubmittedReason === 'tab_switch_prohibited' || autoSubmittedReason === 'tab_switch_exceeded' ? (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Assessment Automatically Submitted</strong>
                <span>Tab switching or navigating away from the examination window is strictly prohibited. Your assessment was locked and submitted with your current recorded answers.</span>
              </div>
            </div>
          ) : autoSubmittedReason === 'time_expired' ? (
            <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              Assessment submitted automatically as the time limit expired.
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 mb-8 max-w-md mx-auto">
              Thank you for completing the assessment. Your answers have been recorded and synchronized with our recruitment portal.
            </p>
          )}

          {/* Candidate ID and Result summary */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-left space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Candidate Name:</span>
              <span className="font-semibold text-gray-800">{data?.fullName || 'Candidate'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Candidate ID:</span>
              <span
                style={{ color: 'var(--erp-primary, #2563eb)' }}
                className="font-mono font-bold"
              >
                {candidateCode}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Position:</span>
              <span className="font-semibold text-gray-800">{data?.positionAppliedFor || 'Executive'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Evaluation Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${badge.bg} ${badge.text} border ${badge.border}`}>
                {badge.label}
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <Link
              to="/assessment/register"
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-gray-400">
        For technical assistance, contact your recruiter.
      </footer>
    </div>
  );
};

export default AssessmentResult;
