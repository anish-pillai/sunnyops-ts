import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RECRUITMENT_STAGES } from '@/config/constants';
import type { Applicant, RecruitmentStage, InterviewRound } from '@/types/hr.types';

interface Props {
  initial?: Applicant;
  onClose: () => void;
  onSave: (data: Omit<Applicant, 'id' | 'created_at'>, id?: string) => Promise<void>;
}

const SI: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', boxSizing: 'border-box' };
const LBL: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, display: 'block', marginBottom: 4 };

export const ApplicantFormModal: React.FC<Props> = ({ initial, onClose, onSave }) => {
  const blank = {
    name: '', phone: '', trade: '', site: '', source: '', stage: 'Screening' as RecruitmentStage,
    certification: '', previous_employer: '', aadhar: '', offer_letter_ref: '', address: '', experience: '',
    interview_rounds: [] as InterviewRound[],
  };
  const [f, setF] = useState(initial ? { ...blank, ...initial } : blank);
  const [saving, setSaving] = useState(false);

  const upd = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const addRound = () => {
    setF(p => ({
      ...p,
      interview_rounds: [...(p.interview_rounds || []), { round_name: `Round ${(p.interview_rounds || []).length + 1}`, verdict: 'Pending' as const }],
    }));
  };

  const updateRound = (idx: number, k: string, v: any) => {
    setF(p => {
      const rounds = [...(p.interview_rounds || [])];
      rounds[idx] = { ...rounds[idx], [k]: v };
      return { ...p, interview_rounds: rounds };
    });
  };

  const removeRound = (idx: number) => {
    setF(p => ({
      ...p,
      interview_rounds: (p.interview_rounds || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    if (!f.name.trim()) return alert('Name is required');
    setSaving(true);
    const { id, created_at, ...rest } = f as any;
    await onSave(rest, initial?.id);
    setSaving(false);
  };

  return (
    <div style={{ maxHeight: '72vh', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={LBL}>NAME *</label><input style={SI} value={f.name} onChange={e => upd('name', e.target.value)} /></div>
        <div><label style={LBL}>PHONE</label><input style={SI} value={f.phone || ''} onChange={e => upd('phone', e.target.value)} /></div>
        <div><label style={LBL}>TRADE / POSITION</label><input style={SI} value={f.trade || ''} onChange={e => upd('trade', e.target.value)} placeholder="e.g. Fitter, Welder" /></div>
        <div><label style={LBL}>SITE</label><input style={SI} value={f.site || ''} onChange={e => upd('site', e.target.value)} placeholder="e.g. MRPL" /></div>
        <div><label style={LBL}>SOURCE</label><input style={SI} value={f.source || ''} onChange={e => upd('source', e.target.value)} placeholder="Referral, Walk-in..." /></div>
        <div>
          <label style={LBL}>STAGE</label>
          <select style={SI} value={f.stage} onChange={e => upd('stage', e.target.value)}>
            {RECRUITMENT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label style={LBL}>CERTIFICATION</label><input style={SI} value={f.certification || ''} onChange={e => upd('certification', e.target.value)} /></div>
        <div><label style={LBL}>PREVIOUS EMPLOYER</label><input style={SI} value={f.previous_employer || ''} onChange={e => upd('previous_employer', e.target.value)} /></div>
        <div><label style={LBL}>AADHAR</label><input style={SI} value={f.aadhar || ''} onChange={e => upd('aadhar', e.target.value)} /></div>
        <div><label style={LBL}>OFFER LETTER REF</label><input style={SI} value={f.offer_letter_ref || ''} onChange={e => upd('offer_letter_ref', e.target.value)} /></div>
        <div style={{ gridColumn: '1/-1' }}><label style={LBL}>ADDRESS</label><textarea style={{ ...SI, minHeight: 50, resize: 'vertical' }} value={f.address || ''} onChange={e => upd('address', e.target.value)} /></div>
        <div><label style={LBL}>EXPERIENCE</label><input style={SI} value={f.experience || ''} onChange={e => upd('experience', e.target.value)} placeholder="e.g. 5 years" /></div>
      </div>

      {/* Interview rounds */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>INTERVIEW ROUNDS</div>
          <button onClick={addRound} style={{ fontSize: 10, padding: '4px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', color: '#1d4ed8', fontWeight: 700 }}>+ Add Round</button>
        </div>
        {(f.interview_rounds || []).map((r, i) => {
          const vc = r.verdict === 'Passed' ? '#16a34a' : r.verdict === 'Failed' ? '#dc2626' : '#d97706';
          const vbg = r.verdict === 'Passed' ? '#f0fdf4' : r.verdict === 'Failed' ? '#fef2f2' : '#fffbeb';
          return (
            <div key={i} style={{ background: vbg, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 6 }}>
                <div><label style={{ ...LBL, fontSize: 9 }}>ROUND NAME</label><input style={{ ...SI, fontSize: 11 }} value={r.round_name || ''} onChange={e => updateRound(i, 'round_name', e.target.value)} /></div>
                <div><label style={{ ...LBL, fontSize: 9 }}>DATE</label><input type="date" style={{ ...SI, fontSize: 11 }} value={r.date || ''} onChange={e => updateRound(i, 'date', e.target.value)} /></div>
                <div><label style={{ ...LBL, fontSize: 9 }}>CONDUCTED BY</label><input style={{ ...SI, fontSize: 11 }} value={r.conducted_by || ''} onChange={e => updateRound(i, 'conducted_by', e.target.value)} /></div>
                <div>
                  <label style={{ ...LBL, fontSize: 9 }}>VERDICT</label>
                  <select style={{ ...SI, fontSize: 11, color: vc }} value={r.verdict || 'Pending'} onChange={e => updateRound(i, 'verdict', e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input style={{ ...SI, fontSize: 11, flex: 1 }} value={r.notes || ''} onChange={e => updateRound(i, 'notes', e.target.value)} placeholder="Notes..." />
                <button onClick={() => removeRound(i)} style={{ fontSize: 10, padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '11px 0' }}>{saving ? 'Saving...' : (initial ? 'Update Applicant' : 'Add Applicant')}</Button>
        <Button variant="ghost" onClick={onClose} style={{ padding: '11px 20px' }}>Cancel</Button>
      </div>
    </div>
  );
};
