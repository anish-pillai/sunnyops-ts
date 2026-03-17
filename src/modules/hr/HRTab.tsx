import React, { useEffect, useState } from 'react';
import { useRecruitment } from '@/hooks/useRecruitment';
import { useLetters } from '@/hooks/useLetters';
import { useSettings } from '@/hooks/useSettings';
import { RecruitmentPipeline } from './RecruitmentPipeline';
import { ApplicantListSubTab } from './ApplicantListSubTab';
import { LettersSubTab } from './LettersSubTab';
import type { Applicant } from '@/types/hr.types';
import type { UserRole } from '@/types/user.types';

type HRView = 'recruitment' | 'applicants' | 'letters';

interface Props {
  isAdmin: boolean;
  uName: string;
  userRole: UserRole;
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

export const HRTab: React.FC<Props> = ({ isAdmin, uName, showToast }) => {
  const [view, setView] = useState<HRView>('recruitment');
  const { applicants, loading: appLoading, fetch: fetchApplicants, save: saveApplicant, moveStage } = useRecruitment();
  const { letters, loading: letLoading, fetch: fetchLetters, save: saveLetter, markIssued } = useLetters();
  const { siteDetails, fetchSiteDetails } = useSettings();

  useEffect(() => {
    fetchApplicants();
    fetchLetters();
    fetchSiteDetails();
  }, [fetchApplicants, fetchLetters, fetchSiteDetails]);

  const activeSites = siteDetails.map(s => s.name || (s as any));

  const tabs: { key: HRView; label: string; icon: string }[] = [
    { key: 'recruitment', label: 'Recruitment Pipeline', icon: '🎯' },
    { key: 'applicants', label: 'All Applicants', icon: '👤' },
    { key: 'letters', label: 'Letters', icon: '📝' },
  ];

  return (
    <div>
      {/* Sub-tab switcher */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 6, border: 'none',
              background: view === t.key ? '#f97316' : 'transparent',
              color: view === t.key ? '#fff' : '#64748b',
              fontWeight: 700, fontSize: 11, letterSpacing: 1, cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'recruitment' && (
        <RecruitmentPipeline
          applicants={applicants}
          loading={appLoading}
          uName={uName}
          onMoveStage={moveStage}
          onEdit={(_a: Applicant) => setView('applicants')}
          onRefresh={fetchApplicants}
          showToast={showToast}
        />
      )}

      {view === 'applicants' && (
        <ApplicantListSubTab
          applicants={applicants}
          loading={appLoading}
          onSave={saveApplicant}
          showToast={showToast}
        />
      )}

      {view === 'letters' && (
        <LettersSubTab
          letters={letters}
          loading={letLoading}
          isAdmin={isAdmin}
          uName={uName}
          sites={activeSites}
          canOfferLetter={isAdmin}
          onSave={saveLetter}
          onMarkIssued={markIssued}
          onRefresh={fetchLetters}
          showToast={showToast}
        />
      )}
    </div>
  );
};
