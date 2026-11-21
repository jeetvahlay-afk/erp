import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import axios from '../api/client';
import { CheckCircle2, ArrowRight, Home } from 'lucide-react';
import { AssessmentPortalHeader, AssessmentWatermark } from './AssessmentPortalHeader';

const AssessmentComplete = () => {
  const { candidateCode: paramCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const stateData = location.state || {};

  const candidateCode = paramCode || stateData.candidateCode || '';
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(Boolean(candidateCode && !stateData.fullName));

  useEffect(() => {
    const fetchCandidate = async () => {
      if (!candidateCode) return;
      try {
        setLoading(true);
        const res = await axios.get(`/api/assessment/${candidateCode}/result`);
        setCandidate(res.data?.data);
      } catch (err) {
        console.warn('Could not fetch assessment details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (candidateCode && !stateData.fullName) {
      fetchCandidate();
    }
  }, [candidateCode, stateData.fullName]);

  const fullName = stateData.fullName || candidate?.fullName || '';
  const email = stateData.email || candidate?.email || '';
  const driveLocation = stateData.driveLocation || candidate?.driveLocation || 'Ahmedabad';

  return (
    <div className="relative min-h-screen bg-[#fafafa] flex flex-col font-sans text-gray-800">
      <AssessmentWatermark />
      <AssessmentPortalHeader location={`${driveLocation} candidate portal`} />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div
          style={{ borderTopColor: 'var(--erp-primary, #2563eb)' }}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 p-8 sm:p-14 text-center"
        >
          
          {/* Header Tag - Exact match of Image 5 */}
          <div
            style={{ color: 'var(--erp-primary, #2563eb)' }}
            className="text-xs font-bold uppercase tracking-wider mb-3"
          >
            GMAIL VERIFIED
          </div>

          {/* Heading - Exact match of Image 5 */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Registration complete
          </h1>

          {/* Subtitle - Exact match of Image 5 */}
          <p className="text-sm sm:text-base text-gray-600 max-w-lg mx-auto leading-relaxed mb-8">
            Use your registered Gmail address and password to sign in at the assessment desk.
          </p>

          {/* Candidate ID Box */}
          {candidateCode && (
            <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-8 py-5 mb-8 shadow-2xs">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Candidate Assessment ID
              </span>
              <span
                style={{ color: 'var(--erp-primary, #2563eb)' }}
                className="font-mono text-xl sm:text-2xl font-bold tracking-wider select-all"
              >
                {candidateCode}
              </span>
              {fullName && (
                <span className="block text-xs text-gray-600 mt-1 font-medium">
                  {fullName} {email ? `(${email})` : ''}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/assessment/signin', { state: { email, candidateCode } })}
              style={{ backgroundColor: 'var(--erp-primary, #2563eb)' }}
              className="w-full sm:w-auto px-7 py-3 rounded-xl text-white font-semibold text-xs shadow-sm transition hover:opacity-90 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Go to Assessment Desk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/assessment/register')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-xs transition cursor-pointer"
            >
              Back to Registration
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

export default AssessmentComplete;
