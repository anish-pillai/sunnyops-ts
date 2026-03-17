import React, { useEffect, useState, useMemo } from 'react';
import { useActivityData, ActivityRecord } from '@/hooks/useActivityData';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { COMPANY } from '@/config/constants';

const MOD_COLORS: Record<string, string> = {
  Inventory: '#ea580c', Auth: '#7c3aed', Bills: '#0891b2',
  Payables: '#065f46', Challans: '#7c2d12', Requests: '#5b21b6',
};
const ACT_COLORS: Record<string, string> = {
  'Stock In': '#16a34a', 'Stock Out': '#dc2626', Login: '#3b82f6',
};

export const ActivityTab: React.FC = () => {
  const { activities, loading, fetch } = useActivityData();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userF, setUserF] = useState('');
  const [moduleF, setModuleF] = useState('');
  const [actionF, setActionF] = useState('');

  useEffect(() => { fetch(); }, [fetch]);

  const allUsers = useMemo(() => [...new Set(activities.map(a => a.user_name).filter(Boolean))].sort(), [activities]);
  const allModules = useMemo(() => [...new Set(activities.map(a => a.module))].sort(), [activities]);
  const allActions = useMemo(() => [...new Set(activities.map(a => a.action_type))].sort(), [activities]);

  const filtered = useMemo(() => activities.filter(a => {
    if (dateFrom && a.timestamp < dateFrom) return false;
    if (dateTo && a.timestamp.slice(0, 10) > dateTo) return false;
    if (userF && a.user_name !== userF) return false;
    if (moduleF && a.module !== moduleF) return false;
    if (actionF && a.action_type !== actionF) return false;
    return true;
  }), [activities, dateFrom, dateTo, userF, moduleF, actionF]);

  const statCards = useMemo(() => [
    { label: 'Total Activities', v: filtered.length, c: '#f97316' },
    { label: 'Inventory Moves', v: filtered.filter(a => a.module === 'Inventory').length, c: '#3b82f6' },
    { label: 'Auth Events', v: filtered.filter(a => a.module === 'Auth').length, c: '#7c3aed' },
    { label: 'Bills Actions', v: filtered.filter(a => a.module === 'Bills').length, c: '#0369a1' },
    { label: 'Payables Actions', v: filtered.filter(a => a.module === 'Payables').length, c: '#065f46' },
    { label: 'Challans', v: filtered.filter(a => a.module === 'Challans').length, c: '#7c2d12' },
    { label: 'Requests', v: filtered.filter(a => a.module === 'Requests').length, c: '#5b21b6' },
    { label: 'Unique Users', v: new Set(filtered.map(a => a.user_name)).size, c: '#16a34a' },
  ], [filtered]);

  const columns: Column<ActivityRecord>[] = [
    { header: '#', width: 40, render: (_item, idx) => <span style={{ color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>{idx + 1}</span> },
    { header: 'User', render: (a) => <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{a.user_name}</span> },
    { header: 'Module', render: (a) => <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: MOD_COLORS[a.module] || '#64748b', borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>{a.module}</span> },
    { header: 'Action', render: (a) => <span style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: ACT_COLORS[a.action_type] || '#64748b', borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>{a.action_type}</span> },
    { header: 'Description', render: (a) => <span style={{ color: '#334155', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{a.description}</span> },
    { header: 'Old Value', render: (a) => <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#64748b', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{a.old_value}</span> },
    { header: 'New Value', render: (a) => <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#64748b', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{a.new_value}</span> },
    { header: 'Timestamp', render: (a) => <span style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>{a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span> },
    { header: 'Site', render: (a) => <span style={{ color: '#ea580c', fontSize: 11 }}>{a.site}</span> },
  ];

  const SI: React.CSSProperties = { padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, outline: 'none', background: '#fff', cursor: 'pointer', width: '100%' };

  const exportExcel = () => {
    import('xlsx').then(XLSX => {
      const headers = ['Activity ID', 'User ID', 'User Name', 'Module', 'Action Type', 'Description', 'Old Value', 'New Value', 'Timestamp', 'Site'];
      const rows = filtered.map(a => [a.id || '', a.user_id, a.user_name, a.module, a.action_type, a.description, a.old_value, a.new_value, a.timestamp, a.site]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [10, 20, 20, 15, 15, 35, 25, 25, 20, 12].map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Activities');
      XLSX.writeFile(wb, `Activities_${dateFrom || 'all'}_to_${dateTo || 'all'}.xlsx`);
    });
  };

  const exportPDF = () => {
    const dateStr = new Date().toLocaleDateString('en-IN');
    const filterDesc: string[] = [];
    if (dateFrom) filterDesc.push('From: ' + dateFrom);
    if (dateTo) filterDesc.push('To: ' + dateTo);
    if (userF) filterDesc.push('User: ' + userF);
    if (moduleF) filterDesc.push('Module: ' + moduleF);
    if (actionF) filterDesc.push('Action: ' + actionF);

    const rows = filtered.slice(0, 500).map(a =>
      `<tr><td style="font-family:monospace;font-size:10px;color:#64748b">${(a.id || '').toString().slice(0, 8)}</td>` +
      `<td>${a.user_name}</td>` +
      `<td><span style="background:#fff7ed;border:1px solid #fed7aa;color:#ea580c;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700">${a.module}</span></td>` +
      `<td><span style="background:#f0f9ff;border:1px solid #bae6fd;color:#0284c7;padding:2px 6px;border-radius:4px;font-size:10px">${a.action_type}</span></td>` +
      `<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.description}</td>` +
      `<td style="font-family:monospace;font-size:10px">${a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN') : ''}</td>` +
      `<td style="font-size:10px;color:#64748b">${a.site}</td></tr>`
    ).join('');

    let html = `<div class="hdr"><div><div class="co">${COMPANY.name}</div><div class="sub">Activity Export &bull; ${dateStr}</div></div><div class="sub">${filtered.length} records</div></div>`;
    if (filterDesc.length) html += `<div style="margin-bottom:14px;padding:8px 12px;background:#fff7ed;border-radius:6px;font-size:11px;color:#92400e">Filters: ${filterDesc.join(' | ')}</div>`;
    html += `<table><thead><tr><th>ID</th><th>User</th><th>Module</th><th>Action</th><th>Description</th><th>Timestamp</th><th>Site</th></tr></thead><tbody>${rows}</tbody></table>`;
    html += `<div class="footer">Exported by SunnyOps &bull; ${COMPANY.name} &bull; ${dateStr}</div>`;

    const css = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px 24px;font-size:11px;color:#1a1a1a}` +
      `.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #f97316;padding-bottom:12px;margin-bottom:16px}` +
      `.co{font-size:14px;font-weight:800;color:#0f172a}.sub{font-size:10px;color:#64748b;margin-top:2px}` +
      `table{width:100%;border-collapse:collapse;font-size:10px}th{background:#0f172a;color:#fff;padding:6px 10px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:1px}` +
      `td{padding:5px 10px;border-bottom:1px solid #f1f5f9}.footer{margin-top:20px;text-align:center;font-size:9px;color:#94a3b8}` +
      `@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

    const w = window.open('', '_blank', 'width=1100,height=700');
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Activity Export</title><style>${css}</style></head><body>${html}</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 600);
    }
  };

  if (loading && activities.length === 0) return <Spinner />;

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.c, fontFamily: 'IBM Plex Mono, monospace' }}>{c.v}</div>
            <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>Filters</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>FROM DATE</div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={SI} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>TO DATE</div>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={SI} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>USER</div>
            <select value={userF} onChange={e => setUserF(e.target.value)} style={SI}>
              <option value="">All Users</option>
              {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>MODULE</div>
            <select value={moduleF} onChange={e => setModuleF(e.target.value)} style={SI}>
              <option value="">All Modules</option>
              {allModules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>ACTION</div>
            <select value={actionF} onChange={e => setActionF(e.target.value)} style={SI}>
              <option value="">All Actions</option>
              {allActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setUserF(''); setModuleF(''); setActionF(''); }}
            style={{ padding: '7px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#64748b' }}
          >
            ✕ Clear
          </button>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>{filtered.length} records</span>
          <Button onClick={exportExcel} style={{ background: '#16a34a', color: '#fff', padding: '7px 16px', fontSize: 11 }}>⬇ Excel</Button>
          <Button onClick={exportPDF} style={{ background: '#f97316', color: '#fff', padding: '7px 16px', fontSize: 11 }}>📄 PDF</Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable<ActivityRecord>
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No activities match the selected filters."
        initialPageSize={50}
        pageSizeOptions={[25, 50, 100, 200]}
      />
    </div>
  );
};
