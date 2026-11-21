import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { feedback } from '../lib/feedback';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';
import CandidateDetailsModal from '../components/CandidateDetailsModal';

const InterviewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInterview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/api/interviews/${id}`);
      setInterview(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load candidate information.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  const handleEdit = () => {
    navigate('/manage-interviews');
  };

  const handleDelete = async (cand) => {
    if (!window.confirm(`Delete candidate "${cand.candidateName}"?`)) return;
    try {
      await api.delete(`/api/interviews/${cand._id}`);
      feedback.success('Candidate deleted');
      navigate('/manage-interviews');
    } catch {
      feedback.error('Failed to delete candidate');
    }
  };

  if (loading) return <LoadingState label="Loading candidate record…" />;
  if (error) return <ErrorState message={error} retry={loadInterview} />;
  if (!interview) {
    return (
      <EmptyState
        title="Candidate not found"
        message="This recruitment record is no longer available."
      />
    );
  }

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <ToolbarButton icon={ArrowLeft} onClick={() => navigate('/manage-interviews')}>
          Back to Candidates
        </ToolbarButton>
      </div>
      <CandidateDetailsModal
        candidate={interview}
        open={true}
        inline={true}
        onClose={() => navigate('/manage-interviews')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onUpdate={(updated) => setInterview(updated)}
      />
    </div>
  );
};

export default InterviewDetails;
