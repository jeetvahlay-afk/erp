import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AgreementModule from '../components/AgreementModule';
import { PageHeader, ToolbarButton } from '../components/ui/EnterpriseUI';

export default function ManageAgreements() {
  const navigate = useNavigate();
  const { candidateId: routeCandidateId } = useParams();
  const [searchParams] = useSearchParams();
  const candidateId = routeCandidateId || searchParams.get('candidateId') || '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Candidate Agreement & Policy Studio"
        breadcrumbs={['Recruitment Management', 'Candidate Agreements']}
        subtitle="Manage candidate onboarding agreements, policies, digital signing & signed vault"
        actions={
          <ToolbarButton
            label="Return to Recruitment"
            icon={ArrowLeft}
            onClick={() => navigate('/manage-interviews')}
            variant="outline"
          />
        }
      />

      <AgreementModule initialCandidateId={candidateId} />
    </div>
  );
}
