import React, { useState } from 'react';
import { BottomSheet, Button, Spinner } from '@/components/ui';
import { STAGE_COLOURS, RECRUITMENT_STAGES } from '@/config/constants';
import { fmtDate } from '@/utils/formatters';
import type { Applicant, RecruitmentStage } from '@/types/hr.types';

interface RecruitmentPipelineProps {
  applicants: Applicant[];
  loading: boolean;
  uName: string;
  onMoveStage: (id: string, stage: RecruitmentStage, updatedBy: string) => Promise<string | null>;
  onEdit: (applicant: Applicant) => void;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

export const RecruitmentPipeline: React.FC<RecruitmentPipelineProps> = ({
  applicants, loading, uName, onMoveStage, onEdit, showToast,
}) => {
  const [selected, setSelected] = useState<Applicant | null>(null);

  const stats = {
    screening: applicants.filter(a => a.stage === 'Screening').length,
    interview:  applicants.filter(a => a.stage === 'Interview').length,
    offered:    applicants.filter(a => a.stage === 'Offer Sent').length,
    joined:     applicants.filter(a => a.stage === 'Joined').length,
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Stat chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Screening', val: stats.screening, c: '#1d4ed8', bg: '#eff6ff', bc: '#bfdbfe' },
          { label: 'Interview',  val: stats.interview,  c: '#92400e', bg: '#fffbeb', bc: '#fcd34d' },
          { label: 'Offer Sent', val: stats.offered,    c: '#15803d', bg: '#f0fdf4', bc: '#bbf7d0' },
          { label: 'Joined',     val: stats.joined,     c: '#6d28d9', bg: '#f5f3ff', bc: '#ddd6fe' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.bc}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: s.c, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: s.c, marginTop: 4, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
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
                    const latestRound = a.interview_rounds && a.interview_rounds.length > 0 ? a.interview_rounds[a.interview_rounds.length - 1] : undefined;
                    return (
                      <div
                        key={a.id}
                        onClick={() => setSelected(a)}
                        style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', margin: '0 8px 8px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#f97316'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'; }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{a.name}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{a.trade || '—'}</div>
                        {a.site && (
                          <span style={{ fontSize: 9, marginTop: 4, display: 'inline-block', background: sc.bg, color: sc.c, border: `1px solid ${sc.br}`, borderRadius: 20, padding: '1px 8px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>
                            {a.site}
                          </span>
                        )}
                        {latestRound && (
                          <div style={{ fontSize: 9, marginTop: 4, color: '#64748b' }}>
                            {latestRound.round_name} — <span style={{ color: latestRound.verdict === 'Passed' ? '#16a34a' : latestRound.verdict === 'Failed' ? '#dc2626' : '#d97706' }}>{latestRound.verdict}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
              }
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet Detail */}
      {selected && (
        <BottomSheet onClose={() => setSelected(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 20px 12px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {selected.trade || '—'}{selected.site ? ` · ${selected.site}` : ''}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#f1f5f9', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: 16 }}>
            {[
              ['Phone', selected.phone],
              ['Source', selected.source],
              ['Certification', selected.certification],
              ['Prev. Employer', selected.previous_employer],
            ].map(([label, val], i) => (
              <div key={i} style={{ background: '#fff', padding: '10px 16px' }}>
                <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{val || '—'}</div>
              </div>
            ))}
          </div>

          {/* Interview rounds */}
          {selected.interview_rounds?.length > 0 && (
            <div style={{ padding: '0 20px 12px' }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, marginBottom: 8 }}>INTERVIEW ROUNDS</div>
              {selected.interview_rounds.map((r, i) => {
                const vc = r.verdict === 'Passed' ? '#16a34a' : r.verdict === 'Failed' ? '#dc2626' : '#d97706';
                const vbg = r.verdict === 'Passed' ? '#f0fdf4' : r.verdict === 'Failed' ? '#fef2f2' : '#fffbeb';
                return (
                  <div key={i} style={{ background: vbg, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{r.round_name || `Round ${i + 1}`}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: vc }}>{r.verdict || 'Pending'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {r.date && <span>{fmtDate(r.date)} </span>}
                      {r.conducted_by && <span>by {r.conducted_by}</span>}
                      {r.venue && <span> · {r.venue}</span>}
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
                const sc2 = STAGE_COLOURS[s] ?? { bg: '#f8fafc', c: '#64748b', br: '#e2e8f0' };
                return (
                  <button
                    key={s}
                    onClick={async () => {
                      const err = await onMoveStage(selected.id, s, uName);
                      if (err) showToast(err, 'err');
                      else { showToast(`${selected.name} moved to ${s}`); setSelected(null); }
                    }}
                    style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${sc2.br}`, background: sc2.bg, color: sc2.c, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '4px 20px 16px', display: 'flex', gap: 10 }}>
            <Button onClick={() => { onEdit(selected); setSelected(null); }} style={{ flex: 1, padding: '11px 0', fontSize: 13 }}>
              ✎ Edit Applicant
            </Button>
            <Button variant="ghost" onClick={() => setSelected(null)} style={{ padding: '11px 20px', fontSize: 13 }}>
              Close
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
