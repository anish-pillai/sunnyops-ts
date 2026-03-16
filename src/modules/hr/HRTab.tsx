import React, { useEffect, useState } from 'react';
import { useRecruitment } from '@/hooks/useRecruitment';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { RECRUITMENT_STAGES, STAGE_COLOURS } from '@/config/constants';
import type { Applicant, RecruitmentStage } from '@/types/hr.types';
import type { UserRole } from '@/types/user.types';

interface Props {
  isAdmin: boolean;
  uName: string;
  userRole: UserRole;
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

export const HRTab: React.FC<Props> = ({ uName, showToast }) => {
  const { applicants, loading, fetch, moveStage } = useRecruitment();
  const [selected, setSelected] = useState<Applicant | null>(null);
  const [movingTo, setMovingTo] = useState<RecruitmentStage | null>(null);

  useEffect(() => { fetch(); }, [fetch]);

  const handleMoveStage = async (applicant: Applicant, stage: RecruitmentStage) => {
    setMovingTo(stage);
    const err = await moveStage(applicant.id, stage, uName);
    setMovingTo(null);
    if (err) { showToast(err, 'err'); return; }
    showToast(`${applicant.name} moved to ${stage}`);
    setSelected(null);
  };

  const stats = {
    screening: applicants.filter(a => a.stage === 'Screening').length,
    interview: applicants.filter(a => a.stage === 'Interview').length,
    offered: applicants.filter(a => a.stage === 'Offer Sent').length,
    joined: applicants.filter(a => a.stage === 'Joined').length,
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Screening', val: stats.screening, ...STAGE_COLOURS.Screening },
          { label: 'Interview', val: stats.interview, ...STAGE_COLOURS.Interview },
          { label: 'Offer Sent', val: stats.offered, ...STAGE_COLOURS['Offer Sent'] },
          { label: 'Joined', val: stats.joined, ...STAGE_COLOURS.Joined },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.br}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: s.c, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: s.c, marginTop: 4, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {(['Screening', 'Interview', 'Offer Sent', 'Not Selected'] as RecruitmentStage[]).map(stage => {
          const sc = STAGE_COLOURS[stage] ?? { bg: '#f8fafc', c: '#64748b', br: '#e2e8f0' };
          const stageApps = applicants.filter(a => a.stage === stage);
          return (
            <div key={stage} style={{ background: sc.bg, border: `1px solid ${sc.br}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 11, color: sc.c }}>{stage}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, fontSize: 16, color: sc.c }}>{stageApps.length}</span>
              </div>
              {stageApps.length === 0
                ? <div style={{ padding: '12px 14px', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>No applicants</div>
                : stageApps.map(a => {
                  const rounds = a.interview_rounds ?? [];
                  const latest = rounds[rounds.length - 1];
                  return (
                    <div key={a.id}
                      onClick={() => setSelected(a)}
                      style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', margin: '0 8px 8px', cursor: 'pointer', transition: 'all 0.12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#f97316'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', flex: 1 }}>{a.name}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>›</div>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{a.trade ?? '—'}</div>
                      {a.site && <span style={{ fontSize: 9, marginTop: 4, display: 'inline-block', background: sc.bg, color: sc.c, border: `1px solid ${sc.br}`, borderRadius: 20, padding: '1px 8px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{a.site}</span>}
                      {latest && <div style={{ fontSize: 9, marginTop: 4, color: '#64748b' }}>Round: {latest.round_name} — <span style={{ color: latest.verdict === 'Passed' ? '#16a34a' : latest.verdict === 'Failed' ? '#dc2626' : '#d97706', fontWeight: 700 }}>{latest.verdict ?? 'Pending'}</span></div>}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Bottom sheet detail */}
      {selected && (
        <BottomSheet onClose={() => setSelected(null)}>
          <div style={{ padding: '0 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selected.trade ?? '—'}{selected.site ? ` · ${selected.site}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ background: (STAGE_COLOURS[selected.stage] ?? {}).bg, color: (STAGE_COLOURS[selected.stage] ?? {}).c, border: `1px solid ${(STAGE_COLOURS[selected.stage] ?? {}).br}`, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{selected.stage}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#f1f5f9', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: 16 }}>
            {[
              ['Phone', selected.phone ?? '—'],
              ['Source', selected.source ?? '—'],
              ['Certification', selected.certification ?? '—'],
              ['Previous Employer', selected.previous_employer ?? '—'],
              ['Aadhar', selected.aadhar ? '••••' + selected.aadhar.slice(-4) : '—'],
              ['Offer Ref', selected.offer_letter_ref ?? '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#fff', padding: '10px 16px' }}>
                <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Interview rounds */}
          {(selected.interview_rounds ?? []).length > 0 && (
            <div style={{ padding: '0 20px 12px' }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, marginBottom: 8 }}>INTERVIEW ROUNDS</div>
              {(selected.interview_rounds ?? []).map((r, i) => {
                const vc = r.verdict === 'Passed' ? '#16a34a' : r.verdict === 'Failed' ? '#dc2626' : '#d97706';
                const vbg = r.verdict === 'Passed' ? '#f0fdf4' : r.verdict === 'Failed' ? '#fef2f2' : '#fffbeb';
                return (
                  <div key={i} style={{ background: vbg, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{r.round_name ?? `Round ${i + 1}`}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: vc }}>{r.verdict ?? 'Pending'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {r.date && new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' '}
                      {r.conducted_by && `by ${r.conducted_by}`}
                      {r.venue && ` · ${r.venue}`}
                    </div>
                    {r.notes && <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>{r.notes}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Move stage */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, marginBottom: 8 }}>MOVE TO STAGE</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RECRUITMENT_STAGES.filter(s => s !== selected.stage).map(s => {
                const sc = STAGE_COLOURS[s] ?? { bg: '#f8fafc', c: '#64748b', br: '#e2e8f0' };
                return (
                  <button key={s}
                    onClick={() => handleMoveStage(selected, s)}
                    disabled={movingTo !== null}
                    style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${sc.br}`, background: sc.bg, color: sc.c, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', opacity: movingTo ? 0.6 : 1 }}>
                    {movingTo === s ? '...' : s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '4px 20px 16px', display: 'flex', gap: 10 }}>
            <Button style={{ flex: 1, padding: '11px 0' }} onClick={() => setSelected(null)}>✎ Edit Applicant</Button>
            <Button variant="ghost" style={{ padding: '11px 20px' }} onClick={() => setSelected(null)}>Close</Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
