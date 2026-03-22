import React, { useState, useEffect } from 'react';
import { useChallans } from '@/hooks/useChallans';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/ui/DataTable';
import { fmtDate } from '@/utils/formatters';
import type { Challan } from '@/types/challan.types';
import { DEFAULT_SITE_DETAILS } from '@/config/constants';

import { EWBModal } from './modals/EWBModal';

interface Props {
  isAdmin?: boolean;
  showToast?: (msg: string, type?: 'ok' | 'err') => void;
}

const printChallan = (c: Challan) => {
  const from = DEFAULT_SITE_DETAILS.find(s => s.name === c.from_site) || { name: c.from_site, address: '', city: '', state: '', pincode: '', gstin: '' };
  const to = DEFAULT_SITE_DETAILS.find(s => s.name === c.to_site) || { name: c.to_site, address: '', city: '', state: '', pincode: '', gstin: '' };

  const makeParty = (label: string, detail: any) => `
    <div class='party-box'>
      <div class='party-label'>${label}</div>
      <div class='party-name'>P. Sunny Engineering Contractors (OPC) Pvt. Ltd.</div>
      ${detail.gstin ? `<div class='party-gstin'>GSTIN: <b>${detail.gstin}</b></div>` : ''}
      ${detail.address ? `<div class='party-addr'>${detail.address}${detail.city ? ', ' + detail.city : ''}${detail.state ? ', ' + detail.state : ''} - ${detail.pincode || ''}</div>` : ''}
    </div>
  `;

  let css = "*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:30px;max-width:820px;margin:0 auto;color:#1a1a1a;font-size:13px}";
  css += ".hdr{border-bottom:3px solid #e65c00;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start}";
  css += ".co-name{font-size:18px;font-weight:800}.co-sub{font-size:11px;color:#555;margin-top:3px}.co-gst{font-size:11px;color:#e65c00;font-weight:700;margin-top:2px}";
  css += ".ch-title{text-align:right}.ch-title h2{font-size:16px;color:#e65c00;font-weight:800;letter-spacing:1px}.ch-no{font-size:13px;font-weight:700;margin-top:4px}.ch-dt{font-size:12px;color:#555;margin-top:2px}";
  css += ".parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}";
  css += ".party-box{border:1px solid #ddd;border-radius:6px;padding:12px 14px;background:#fafafa}.party-label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#e65c00;margin-bottom:5px}";
  css += ".party-name{font-size:13px;font-weight:700}.party-gstin{font-size:11px;color:#374151;margin-top:3px}.party-addr{font-size:11px;color:#555;margin-top:3px;line-height:1.5}";
  css += "table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:10px 12px;border:1px solid #ddd;text-align:left}";
  css += "th{background:#f97316;color:#fff;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700}tr:nth-child(even) td{background:#fafafa}";
  css += ".rmk{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px}";
  css += ".si-wrap{margin-top:24px;margin-bottom:20px}.si-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}.si-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 13px}.si-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px}.si-name{font-size:13px;font-weight:700;color:#0f172a;min-height:18px}.si-sub{font-size:10px;color:#64748b;margin-top:2px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px}.sign-box{border-top:2px solid #374151;padding-top:10px}";
  css += ".sign-lbl{font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px}.sign-name{font-weight:700;margin-top:24px;font-size:13px}";
  css += ".ftr{margin-top:30px;border-top:1px solid #ddd;padding-top:10px;font-size:10px;color:#999;text-align:center}";
  css += ".print-btn{margin-top:20px;padding:10px 24px;background:#ea580c;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:700;transition:all 0.2s}@media print{.print-btn{display:none}}";

  const dt = new Date(c.date || c.created_at).toLocaleDateString("en-IN");
  let html = `<!DOCTYPE html><html><head><title>Challan ${c.challan_no}</title><style>${css}</style></head><body>`;
  
  html += `<div class='hdr'>
    <div style='display:flex;align-items:center'>
      <div>
        <div class='co-name'>P. Sunny Engineering Contractors (OPC) Pvt. Ltd.</div>
        <div class='co-sub'>Door No 1-144 A30, Shree Siddi Vinayaka Building, Mangaluru - 575030 | LL: 08246637172 | M: 8050196063 | sunny@sunnyengg.com</div>
        <div class='co-gst'>GSTIN: 29AAOCP5225B1ZE | State: Karnataka (29)</div>
      </div>
    </div>
    <div class='ch-title'>
      <h2>DELIVERY CHALLAN</h2>
      <div class='ch-no'>No: ${c.challan_no}</div>
      <div class='ch-dt'>Date: ${dt}</div>
    </div>
  </div>`;
  
  html += `<div class='parties'>${makeParty("FROM — " + c.from_site, from)}${makeParty("TO — " + c.to_site, to)}</div>`;
  html += `<table><thead><tr><th>#</th><th>Equipment Description</th><th>Qty</th><th>Unit</th><th>Condition</th></tr></thead>`;
  const itemDesc = c.item_name + (c.item_alias ? ` (${c.item_alias})` : "");
  html += `<tbody><tr><td>1</td><td>${itemDesc}</td><td><b>${c.qty}</b></td><td>${c.unit || "Nos"}</td><td>${c.condition || "Good"}</td></tr></tbody></table>`;
  
  if (c.remarks) html += `<div class='rmk'><b>Remarks:</b> ${c.remarks}</div>`;
  
  html += `<div class='si-wrap'>
    <div class='si-grid'>
      <div class='si-box'>
        <div class='si-lbl' style='color:#64748b'>Requested By</div>
        <div class='si-name'>${c.requested_by || '&mdash;'}</div>
        <div class='si-sub'>Raised Request</div>
      </div>
      <div class='si-box'>
        <div class='si-lbl' style='color:#1d4ed8'>Stock Checked By</div>
        <div class='si-name'>${c.reviewed_by_name || '&mdash;'}</div>
        <div class='si-sub'>Verified Inventory</div>
      </div>
      <div class='si-box'>
        <div class='si-lbl' style='color:#16a34a'>Approved By</div>
        <div class='si-name'>Admin</div>
        <div class='si-sub'>Final Approval</div>
      </div>
    </div>
    <div class='sign'>
      <div class='sign-box'>
        <div class='sign-lbl'>Sent By</div>
        <div class='sign-name'>&nbsp;</div>
        <div style='margin-top:4px;font-size:11px;color:#555'>Name &amp; Date</div>
      </div>
      <div class='sign-box'>
        <div class='sign-lbl'>Received By</div>
        <div class='sign-name'>&nbsp;</div>
        <div style='margin-top:4px;font-size:11px;color:#555'>Name &amp; Date</div>
      </div>
    </div>
  </div>`;
  
  html += `<div class='ftr'>Computer generated delivery challan - P. Sunny Engineering Contractors (OPC) Pvt. Ltd. | GSTIN: 29AAOCP5225B1ZE</div>`;
  html += `<br/><button class='print-btn' onclick='window.print()'>Print Challan</button></body></html>`;
  
  const w = window.open("", "_blank", "width=900,height=700");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

export const ChallansTab: React.FC<Props> = ({ isAdmin, showToast }) => {
  const { challans, loading, fetch, remove } = useChallans();
  const [search, setSearch] = useState('');
  const [ewbModal, setEwbModal] = useState<Challan | null>(null);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = challans.filter(c => 
    !search || 
    (c.challan_no + c.item_name + (c.item_alias || '') + c.from_site + c.to_site).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  const columns: Column<Challan>[] = [
    { 
      header: 'Challan No.', 
      width: 120,
      render: (c) => <span style={{ fontWeight: 700, color: '#ea580c', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>{c.challan_no}</span> 
    },
    { 
      header: 'Date', 
      width: 100,
      render: (c) => <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(c.date || c.created_at)}</span> 
    },
    { 
      header: 'Item Details', 
      render: (c) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{c.item_name}</div>
          {c.item_alias && <div style={{ color: '#ea580c', fontSize: 11, fontWeight: 700 }}>({c.item_alias})</div>}
          {c.remarks && <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>"{c.remarks}"</div>}
        </div>
      )
    },
    { 
      header: 'Qty', 
      width: 80,
      render: (c) => <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.qty} {c.unit || 'Nos'}</span> 
    },
    { 
      header: 'From Site', 
      render: (c) => <span style={{ color: '#64748b', fontSize: 12 }}>{c.from_site}</span> 
    },
    { 
      header: 'To Site', 
      render: (c) => <span style={{ color: '#0f172a', fontWeight: 600, fontSize: 12 }}>{c.to_site}</span> 
    },
    {
      header: 'Actions',
      width: 220,
      render: (c) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button 
            onClick={() => setEwbModal(c)} 
            style={{ 
              fontSize: 10, 
              padding: '4px 8px', 
              background: c.ewb_no ? '#16a34a' : '#f0fdf4', 
              color: c.ewb_no ? '#fff' : '#16a34a',
              border: `1px solid ${c.ewb_no ? '#16a34a' : '#bbf7d0'}`,
              fontWeight: 700,
              fontFamily: 'IBM Plex Mono, monospace',
              minWidth: 80
            }}
          >
            {c.ewb_no ? `📋 ${c.ewb_no.slice(-4)}` : 'E-Way Bill'}
          </Button>
          <Button variant="info" onClick={() => printChallan(c)} style={{ fontSize: 10, padding: '4px 8px' }}>Print</Button>
          {isAdmin && (
            <Button variant="ghost" onClick={async () => {
              if (window.confirm(`Delete Challan ${c.challan_no}?`)) {
                const err = await remove(c.id);
                if (err) showToast?.(err, 'err');
                else showToast?.('Challan deleted', 'ok');
              }
            }} style={{ fontSize: 10, padding: '4px 8px', color: '#dc2626' }}>🗑 Delete</Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search challans..." 
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, minWidth: 260 }}
        />
        <Button variant="ghost" onClick={() => {
          let html = "<table><tr><th>#</th><th>Challan No.</th><th>Item</th><th>Qty</th><th>Unit</th><th>From</th><th>To</th><th>Purpose</th><th>Date</th><th>By</th></tr>";
          filtered.forEach((c, n) => { html += `<tr><td>${n + 1}</td><td><b>${c.challan_no}</b></td><td>${c.item_name}</td><td>${c.qty}</td><td>${c.unit || "Nos"}</td><td>${c.from_site}</td><td>${c.to_site}</td><td>${c.purpose || "-"}</td><td>${fmtDate(c.created_at)}</td><td>${c.created_by_name || c.issued_by_name || '-'}</td></tr>`; });
          html += `</table><p style='font-size:11px;color:#666'>Total: ${filtered.length} challans</p>`;
          
          const w = window.open("", "_blank");
          if (w) {
            w.document.write(`<html><head><title>Challans</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:12px;}</style></head><body><h2>Delivery Challan Register</h2>${html}</body></html>`);
            w.document.close();
            setTimeout(() => w.print(), 500);
          }
        }} style={{ fontSize: 11 }}>⬇ PDF Register</Button>
      </div>

      <DataTable<Challan>
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No challans found."
        initialPageSize={20}
      />

      {ewbModal && (
        <Modal title={`📦 E-Way Bill — ${ewbModal.challan_no}`} onClose={() => setEwbModal(null)} wide>
          <EWBModal 
            challan={ewbModal} 
            onClose={() => setEwbModal(null)} 
            onSaved={() => {
              fetch();
            }} 
          />
        </Modal>
      )}
    </div>
  );
};
