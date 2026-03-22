import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable, Column } from '@/components/ui/DataTable';
import { FIRMS } from '@/config/constants';
import type { Letter, OfferLetterData, LetterType } from '@/types/hr.types';

/* ── colour maps ─────────────────────────────────────────────────────── */
const LET_COLORS: Record<string, { bg: string; c: string; br: string }> = {
  Draft:  { bg: '#f1f5f9', c: '#475569', br: '#cbd5e1' },
  Issued: { bg: '#f0fdf4', c: '#16a34a', br: '#bbf7d0' },
};

/* ── print function ──────────────────────────────────────────────────── */
function printLetter(lt: Letter) {
  const firm = FIRMS.find(fi => fi.key === (lt.firm || 'opc')) || FIRMS[0];
  const isOFR = lt.type === 'OFR';
  const refDate = new Date(lt.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  if (isOFR) {
    let od: OfferLetterData = {};
    try { od = lt.ofr_data ? (typeof lt.ofr_data === 'object' ? lt.ofr_data as OfferLetterData : JSON.parse(lt.ofr_data as string)) : {}; } catch { /* ignore */ }
    const empName = od.emp_name || lt.to_name || '___________';
    const desig = od.designation || '___________';
    const site = od.site || lt.site || '___________';
    const doj = od.doj ? new Date(od.doj).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '___________';
    const basic = parseFloat(od.basic || '0'), hra = parseFloat(od.hra || '0'), conv = parseFloat(od.conv || '0'), special = parseFloat(od.special || '0');
    const gross = parseFloat(od.gross || '0') || basic + hra + conv + special;
    const pfEmp = parseFloat(od.pf_emp || '0'), esiEmp = parseFloat(od.esi_emp || '0');
    const net = parseFloat(od.net || '0') || gross - pfEmp - esiEmp;
    const fmt = (n: number) => n > 0 ? '₹' + n.toLocaleString('en-IN') : '—';

    const css = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:12px}.page{max-width:820px;margin:0 auto}.banner{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#f97316 100%);padding:28px 36px 22px;display:flex;justify-content:space-between;align-items:flex-start}.co-name{color:#fff;font-size:16px;font-weight:800}.co-sub{color:rgba(255,255,255,0.75);font-size:9.5px;margin-top:4px;line-height:1.6}.co-gst{color:#fbbf24;font-size:9.5px;font-weight:700;margin-top:3px}.ofr-badge{background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.35);border-radius:8px;padding:10px 18px;text-align:right}.ofr-badge-title{color:#fbbf24;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase}.ofr-badge-ref{color:#fff;font-size:13px;font-weight:800;margin-top:3px;font-family:monospace}.ofr-badge-dt{color:rgba(255,255,255,0.7);font-size:9px;margin-top:3px}.body{padding:28px 36px}.salute{font-size:13px;color:#0f172a;margin-bottom:14px}b.emp{font-size:14px;color:#f97316}.intro{color:#374151;line-height:1.8;margin-bottom:20px;font-size:12px}.section-title{font-size:9px;font-weight:800;color:#f97316;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid #f97316;padding-bottom:5px;margin-bottom:12px;margin-top:20px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:4px}.detail-cell{padding:9px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}.detail-cell:nth-child(even){border-right:none}.detail-lbl{font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px}.detail-val{font-size:12px;font-weight:700;color:#0f172a}.comp-table{width:100%;border-collapse:collapse;font-size:11.5px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}.comp-table th{background:#0f172a;color:#fff;padding:8px 14px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700}.comp-table td{padding:9px 14px;border-bottom:1px solid #f1f5f9}.comp-table .sub{background:#fafafa}.comp-table .gross-row td{background:#fff7ed;font-weight:800;color:#92400e}.comp-table .net-row td{background:#f0fdf4;font-weight:800;color:#15803d;font-size:13px}.comp-table .ded-row td{color:#dc2626}.amt{text-align:right;font-family:monospace;font-size:12px;font-weight:700}.terms{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;font-size:11px;color:#374151;line-height:1.9;counter-reset:tc}.terms li{list-style:none;counter-increment:tc;margin-bottom:4px}.terms li::before{content:counter(tc)'. ';font-weight:700;color:#f97316}.sign-row{padding:0 36px 32px;display:grid;grid-template-columns:1fr 1fr;gap:60px}.sign-box{border-top:2px solid #0f172a;padding-top:8px;margin-top:44px}.sign-label{font-size:9px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase}.sign-name{font-weight:800;font-size:12px;color:#0f172a;margin-top:4px}.sign-for{font-size:10px;color:#64748b;margin-top:2px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

    let h = `<!DOCTYPE html><html><head><title>Offer Letter - ${empName}</title><style>${css}</style></head><body><div class='page'>`;
    h += `<div class='banner'><div style='display:flex;align-items:flex-start'><div><div class='co-name'>${firm.name}</div><div class='co-sub'>Kutherthooru, Mangaluru, Karnataka 574 143<br>LL: 08246637172 | M: 8050196063 | sunny@sunnyengg.com</div><div class='co-gst'>GSTIN: ${firm.gst}</div></div></div><div class='ofr-badge'><div class='ofr-badge-title'>Offer Letter</div><div class='ofr-badge-ref'>${lt.ref_no}</div><div class='ofr-badge-dt'>${refDate}</div></div></div>`;
    h += `<div class='body'><p class='salute'>Dear <b class='emp'>${empName}</b>,</p><p class='intro'>We are pleased to offer you the position of <b>${desig}</b> at <b>${firm.name}</b>, deployed at <b>${site}</b>. This offer is subject to the terms and conditions set forth below.</p>`;
    h += `<div class='section-title'>Appointment Details</div><div class='detail-grid'><div class='detail-cell'><div class='detail-lbl'>Designation</div><div class='detail-val'>${desig}</div></div><div class='detail-cell'><div class='detail-lbl'>Work Site</div><div class='detail-val'>${site}</div></div><div class='detail-cell'><div class='detail-lbl'>Date of Joining</div><div class='detail-val'>${doj}</div></div><div class='detail-cell'><div class='detail-lbl'>Employment Type</div><div class='detail-val'>Contract / Workmen</div></div></div>`;
    h += `<div class='section-title'>Monthly Compensation</div><table class='comp-table'><thead><tr><th>Component</th><th class='amt'>Amount (₹/month)</th></tr></thead><tbody><tr class='sub'><td>Basic Salary</td><td class='amt'>${fmt(basic)}</td></tr><tr class='sub'><td>House Rent Allowance (HRA)</td><td class='amt'>${fmt(hra)}</td></tr><tr class='sub'><td>Conveyance Allowance</td><td class='amt'>${fmt(conv)}</td></tr><tr class='sub'><td>Special Allowance</td><td class='amt'>${fmt(special)}</td></tr><tr class='gross-row'><td>∑ Gross Salary</td><td class='amt'>${fmt(gross)}</td></tr><tr class='ded-row'><td>PF (Employee Contribution — 12%)</td><td class='amt'>− ${fmt(pfEmp)}</td></tr><tr class='ded-row'><td>ESI (Employee Contribution — 0.75%)</td><td class='amt'>− ${fmt(esiEmp)}</td></tr><tr class='net-row'><td><b>Net Take-Home Pay</b></td><td class='amt'>${fmt(net)}</td></tr></tbody></table>`;
    h += `<div class='section-title'>Terms &amp; Conditions</div><ol class='terms'><li>This offer is valid for acceptance within <b>7 days</b> from the date of this letter.</li><li>The appointment is subject to satisfactory verification of your original documents and a pre-joining medical examination.</li><li>You will be governed by the applicable Labour Laws, Standing Orders, and company policies in force from time to time.</li><li>Either party may terminate this contract with <b>7 days' written notice</b>.</li><li>Wages shall be disbursed by the <b>7th of each succeeding month</b> via bank transfer.</li><li>You shall comply with all HSE regulations and site rules applicable at the place of deployment.</li></ol></div>`;
    h += `<div class='sign-row'><div><div class='sign-box'><div class='sign-label'>Employee Signature</div><div class='sign-name'>${empName}</div><div class='sign-for'>Date: _______________</div></div></div><div><div class='sign-box'><div class='sign-label'>Authorised Signatory</div><div class='sign-name'>${firm.short}</div><div class='sign-for'>For &amp; on behalf of the Company</div></div></div></div></div></body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(h); w.document.close(); setTimeout(() => w.print(), 600); }
  } else {
    const css = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:40px 50px;max-width:800px;margin:0 auto;color:#1a1a1a;font-size:12px;line-height:1.9}.hdr{border-bottom:3px solid #f97316;padding-bottom:14px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start}.co-name{font-size:17px;font-weight:800;color:#0f172a}.co-sub{font-size:10px;color:#555;margin-top:3px}.co-gst{font-size:10px;color:#f97316;font-weight:700;margin-top:2px}.body{white-space:pre-line;font-size:12px;color:#374151;line-height:2}.sign{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end}.sb{border-top:1px solid #0f172a;padding-top:6px;font-size:10px;color:#555;min-width:200px;text-align:center}`;
    let h = `<!DOCTYPE html><html><head><title>${lt.ref_no}</title><style>${css}</style></head><body>`;
    h += `<div class='hdr'><div><div class='co-name'>${firm.name}</div><div class='co-sub'>Kutherthooru, Mangaluru, Karnataka 574 143 | LL: 08246637172 | M: 8050196063 | sunny@sunnyengg.com</div><div class='co-gst'>GSTIN: ${firm.gst}</div></div><div style='text-align:right;font-size:11px;color:#64748b'><div><b>Ref:</b> ${lt.ref_no}</div><div><b>Date:</b> ${refDate}</div></div></div>`;
    h += `<div style='margin-bottom:16px'><div><b>To,</b></div>`;
    if (lt.to_name) h += `<div style='font-weight:700'>${lt.to_name}</div>`;
    if (lt.to_designation) h += `<div>${lt.to_designation}</div>`;
    if (lt.to_company) h += `<div>${lt.to_company}</div>`;
    if (lt.to_address) h += `<div style='white-space:pre-line'>${lt.to_address}</div>`;
    h += `</div><div style='margin-bottom:16px'><b>Sub: ${lt.subject || ''}</b></div><div style='margin-bottom:16px'>Dear Sir/Madam,</div><div class='body'>${lt.body || ''}</div>`;
    h += `<div class='sign'><div class='sb'>Received &amp; Accepted<br><br><br>${lt.to_name || 'Employee Name'}</div><div class='sb'>For ${firm.short}<br>Authorised Signatory</div></div></body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(h); w.document.close(); setTimeout(() => w.print(), 600); }
  }
}

/* ── Letter Form ─────────────────────────────────────────────────────── */
interface LetterFormProps {
  initial?: Letter | null;
  defaultType: LetterType;
  saving: boolean;
  sites: string[];
  onSave: (form: Partial<Letter>) => void;
  onClose: () => void;
}

const LetterForm: React.FC<LetterFormProps> = ({ initial, defaultType, saving, sites, onSave, onClose }) => {
  const blankOfr: OfferLetterData = { emp_name: '', designation: '', department: '', site: '', doj: '', basic: '', hra: '', conv: '', special: '', gross: '', pf_emp: '', esi_emp: '', net: '' };
  const initOfr: OfferLetterData = initial?.ofr_data
    ? (typeof initial.ofr_data === 'object' ? initial.ofr_data as OfferLetterData : (() => { try { return JSON.parse(initial.ofr_data as string); } catch { return blankOfr; } })())
    : blankOfr;

  const blank = { ref_no: '', type: defaultType, firm: 'opc', to_name: '', to_designation: '', to_company: '', to_address: '', subject: '', body: '', site: '', status: 'Draft' as const, ofr_data: blankOfr };
  const [f, setF] = useState<any>(initial ? { ...blank, ...initial, ofr_data: initOfr } : blank);
  const upd = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const updOFR = (k: string, v: any) => setF((p: any) => ({ ...p, ofr_data: { ...p.ofr_data, [k]: v } }));
  const isOFR = f.type === 'OFR';

  const IS: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', boxSizing: 'border-box' };
  const LS: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, display: 'block', marginBottom: 4 };

  return (
    <div style={{ maxHeight: '72vh', overflowY: 'auto' }}>
      {/* Firm selector */}
      <div style={{ marginBottom: 12, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, whiteSpace: 'nowrap' }}>ISSUING COMPANY</span>
        <select style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #bfdbfe', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', background: '#fff', fontWeight: 700 }} value={f.firm || 'opc'} onChange={e => upd('firm', e.target.value)}>
          {FIRMS.map(fi => <option key={fi.key} value={fi.key}>{fi.name} — {fi.gst}</option>)}
        </select>
      </div>

      {/* Ref / Type / Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div><label style={LS}>REF NUMBER *</label><input style={IS} value={f.ref_no} onChange={e => upd('ref_no', e.target.value)} placeholder="e.g. SE462-LET-25-26" /></div>
        <div><label style={LS}>TYPE</label><select style={IS} value={f.type} onChange={e => upd('type', e.target.value)}><option value="LET">Letter (LET)</option><option value="OFR">Offer Letter (OFR)</option></select></div>
        <div><label style={LS}>STATUS</label><select style={IS} value={f.status} onChange={e => upd('status', e.target.value)}><option value="Draft">Draft</option><option value="Issued">Issued</option></select></div>
      </div>

      {/* Generic letter fields */}
      {!isOFR && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={LS}>TO NAME</label><input style={IS} value={f.to_name} onChange={e => upd('to_name', e.target.value)} placeholder="Full name" /></div>
            <div><label style={LS}>DESIGNATION</label><input style={IS} value={f.to_designation} onChange={e => upd('to_designation', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={LS}>COMPANY / ORGANIZATION</label><input style={IS} value={f.to_company} onChange={e => upd('to_company', e.target.value)} /></div>
            <div><label style={LS}>SITE</label><select style={IS} value={f.site} onChange={e => upd('site', e.target.value)}><option value="">Select...</option>{sites.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={LS}>ADDRESS</label><textarea style={{ ...IS, minHeight: 50, resize: 'vertical', fontSize: 12 }} value={f.to_address} onChange={e => upd('to_address', e.target.value)} /></div>
          <div style={{ marginBottom: 12 }}><label style={LS}>SUBJECT *</label><input style={IS} value={f.subject} onChange={e => upd('subject', e.target.value)} /></div>
          <div style={{ marginBottom: 16 }}><label style={LS}>BODY</label><textarea style={{ ...IS, minHeight: 180, resize: 'vertical', fontSize: 12, lineHeight: '1.8' }} value={f.body} onChange={e => upd('body', e.target.value)} placeholder="Letter content..." /></div>
        </>
      )}

      {/* Offer letter fields */}
      {isOFR && (
        <>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: '#16a34a', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 10 }}>EMPLOYEE DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div><label style={LS}>EMPLOYEE NAME *</label><input style={IS} value={f.ofr_data.emp_name} onChange={e => updOFR('emp_name', e.target.value)} /></div>
              <div><label style={LS}>DESIGNATION</label><input style={IS} value={f.ofr_data.designation} onChange={e => updOFR('designation', e.target.value)} /></div>
              <div><label style={LS}>DEPARTMENT</label><input style={IS} value={f.ofr_data.department} onChange={e => updOFR('department', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={LS}>SITE</label><select style={IS} value={f.ofr_data.site || f.site} onChange={e => { updOFR('site', e.target.value); upd('site', e.target.value); }}><option value="">Select...</option>{sites.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label style={LS}>DATE OF JOINING</label><input type="date" style={IS} value={f.ofr_data.doj} onChange={e => updOFR('doj', e.target.value)} /></div>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: '#1d4ed8', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 10 }}>₹ SALARY STRUCTURE (per month)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              {[['basic', 'Basic'], ['hra', 'HRA'], ['conv', 'Conveyance'], ['special', 'Special Allow.']].map(([k, l]) => (
                <div key={k}><label style={LS}>{l}</label><input type="number" style={IS} value={f.ofr_data[k]} onChange={e => updOFR(k, e.target.value)} /></div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              {[['gross', 'Gross CTC'], ['pf_emp', 'PF (Emp)'], ['esi_emp', 'ESI (Emp)'], ['net', 'Net Take-Home']].map(([k, l]) => (
                <div key={k}><label style={LS}>{l}</label><input type="number" style={IS} value={f.ofr_data[k]} onChange={e => updOFR(k, e.target.value)} /></div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}><label style={LS}>EMPLOYEE NAME (for letter header)</label><input style={IS} value={f.to_name || f.ofr_data.emp_name} onChange={e => upd('to_name', e.target.value)} /></div>
        </>
      )}

      {/* Save buttons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          onClick={() => {
            if (!f.ref_no.trim()) return alert('Ref number required');
            if (isOFR && !f.ofr_data.emp_name?.trim()) return alert('Employee name required');
            if (!isOFR && !f.subject?.trim()) return alert('Subject required');
            onSave({ ...f, to_name: f.to_name || f.ofr_data?.emp_name || '', status: 'Issued' });
          }}
          disabled={saving}
          style={{ flex: 1, padding: '10px 0', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 13 }}>
          {saving ? 'Saving...' : '✓ Save & Issue'}
        </button>
        <button
          onClick={() => {
            if (!f.ref_no.trim()) return alert('Ref number required');
            onSave({ ...f, to_name: f.to_name || f.ofr_data?.emp_name || '', status: 'Draft' });
          }}
          disabled={saving}
          style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 13 }}>
          ✎ Save Draft
        </button>
        <button onClick={onClose} style={{ padding: '10px 20px', background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>Cancel</button>
      </div>
    </div>
  );
};

/* ── Main Letters Sub Tab ────────────────────────────────────────────── */
interface LettersSubTabProps {
  letters: Letter[];
  loading: boolean;
  isAdmin: boolean;
  uName: string;
  sites: string[];
  canOfferLetter?: boolean;
  onSave: (form: Partial<Letter>, id?: string, userName?: string) => Promise<string | null>;
  onMarkIssued: (id: string, userName: string) => Promise<string | null>;
  onRefresh: () => void;
  showToast: (msg: string, type?: 'ok' | 'err') => void;
}

export const LettersSubTab: React.FC<LettersSubTabProps> = ({
  letters, loading, isAdmin, uName, sites, canOfferLetter = true,
  onSave, onMarkIssued, onRefresh, showToast,
}) => {
  const [modal, setModal] = useState<{ type: 'new' | 'edit'; letType?: LetterType; letter?: Letter } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fType, setFType] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => letters.filter(lt =>
    (fType === 'All' || lt.type === fType) &&
    (!search || (lt.ref_no || '').toLowerCase().includes(search.toLowerCase()) || (lt.to_name || '').toLowerCase().includes(search.toLowerCase()) || (lt.subject || '').toLowerCase().includes(search.toLowerCase()))
  ), [letters, fType, search]);

  const handleSave = async (form: Partial<Letter>) => {
    setSaving(true);
    const err = await onSave(form, modal?.letter?.id, uName);
    setSaving(false);
    if (err) { showToast(err, 'err'); return; }
    showToast(modal?.letter ? 'Letter updated' : 'Letter saved');
    setModal(null);
    onRefresh();
  };

  if (loading && letters.length === 0) return <Spinner />;

  const columns: Column<Letter>[] = [
    {
      header: 'Ref No / Type',
      width: 180,
      render: (lt) => {
        const isOFR = lt.type === 'OFR';
        const sc = LET_COLORS[lt.status] || LET_COLORS.Draft;
        return (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', fontFamily: 'IBM Plex Mono, monospace' }}>{lt.ref_no}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 9, background: isOFR ? '#f0fdf4' : '#eff6ff', color: isOFR ? '#16a34a' : '#0369a1', border: `1px solid ${isOFR ? '#bbf7d0' : '#bfdbfe'}`, borderRadius: 4, padding: '1px 6px', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>{isOFR ? 'OFR' : 'LET'}</span>
              <span style={{ background: sc.bg, color: sc.c, border: `1px solid ${sc.br}`, borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>{lt.status.toUpperCase()}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Date',
      width: 100,
      render: (lt) => <span style={{ fontSize: 11, color: '#64748b' }}>{lt.created_at ? new Date(lt.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
    },
    {
      header: 'Recipient / Subject',
      render: (lt) => {
        const isOFR = lt.type === 'OFR';
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{isOFR ? (lt.to_name || '?') : (lt.subject || '?')}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              {!isOFR && lt.to_name ? lt.to_name + (lt.to_company ? ', ' : '') : ''}
              {lt.to_company || ''}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Site',
      width: 100,
      render: (lt) => lt.site ? <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#475569' }}>{lt.site}</span> : '-'
    },
    {
      header: 'Actions',
      width: 180,
      align: 'right',
      render: (lt) => (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
          <button onClick={e => { e.stopPropagation(); printLetter(lt); }} style={{ fontSize: 10, padding: '4px 10px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>🖨 Print</button>
          {isAdmin && <button onClick={e => { e.stopPropagation(); setModal({ type: 'edit', letter: lt }); }} style={{ fontSize: 10, padding: '4px 10px', background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>✏ Edit</button>}
          {isAdmin && lt.status !== 'Issued' && (
            <button onClick={async e => { e.stopPropagation(); const err = await onMarkIssued(lt.id, uName); if (err) showToast(err, 'err'); else { showToast('Marked Issued'); onRefresh(); } }}
              style={{ fontSize: 10, padding: '4px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>✓ Issue</button>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Header with filters and buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setFType('All')} style={{ fontSize: 10, padding: '6px 14px', borderRadius: 20, border: `1px solid ${fType === 'All' ? '#0f172a' : '#e2e8f0'}`, background: fType === 'All' ? '#0f172a' : '#fff', color: fType === 'All' ? '#fff' : '#64748b', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>ALL ({letters.length})</button>
          <button onClick={() => setFType('LET')} style={{ fontSize: 10, padding: '6px 14px', borderRadius: 20, border: `1px solid ${fType === 'LET' ? '#0f172a' : '#e2e8f0'}`, background: fType === 'LET' ? '#0f172a' : '#fff', color: fType === 'LET' ? '#fff' : '#64748b', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>LETTERS ({letters.filter(l => l.type === 'LET').length})</button>
          {canOfferLetter && (
            <button onClick={() => setFType('OFR')} style={{ fontSize: 10, padding: '6px 14px', borderRadius: 20, border: `1px solid ${fType === 'OFR' ? '#0f172a' : '#e2e8f0'}`, background: fType === 'OFR' ? '#0f172a' : '#fff', color: fType === 'OFR' ? '#fff' : '#64748b', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>OFFER ({letters.filter(l => l.type === 'OFR').length})</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="Search ref, name, subject..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'IBM Plex Mono, monospace', minWidth: 240 }} />
          <button onClick={() => setModal({ type: 'new', letType: 'LET' })} style={{ background: '#0369a1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700 }}>＋ Letter</button>
          {canOfferLetter && (
            <button onClick={() => setModal({ type: 'new', letType: 'OFR' })} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700 }}>＋ Offer Letter</button>
          )}
        </div>
      </div>

      <DataTable<Letter>
        columns={columns}
        data={filtered}
        loading={loading && letters.length === 0}
        emptyMessage="No letters found."
        onRowClick={(lt) => printLetter(lt)}
        rowStyle={(lt) => ({ borderLeft: `4px solid ${lt.type === 'OFR' ? '#16a34a' : '#0369a1'}` })}
        initialPageSize={20}
      />

      {/* Modal */}
      {modal && (
        <Modal
          title={modal.type === 'edit' ? 'Edit Letter' : (modal.letType === 'OFR' ? 'New Offer Letter' : 'New Letter')}
          wide
          onClose={() => setModal(null)}
        >
          <LetterForm
            initial={modal.letter || null}
            defaultType={modal.letType || 'LET'}
            saving={saving}
            sites={sites}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
};
