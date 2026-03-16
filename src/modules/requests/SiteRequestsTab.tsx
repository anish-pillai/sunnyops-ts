import React, { useState, useEffect } from 'react';
import { db } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSiteRequests } from '@/hooks/useSiteRequests';
import { useChallans } from '@/hooks/useChallans';
import { useInventory } from '@/hooks/useInventory';
import type { SiteRequest } from '@/types/request.types';
import { Button } from '@/components/ui';
import { ActionRequestModal } from './modals/ActionRequestModal';
import { InvManagerActionModal } from './modals/InvManagerActionModal';
import { MobilizationModal } from './modals/MobilizationModal';
import { DemobilizationModal } from './modals/DemobilizationModal';
import { DemobReportModal } from './modals/DemobReportModal';
import { NewRequestModal } from './modals/NewRequestModal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';

const MOCK_SITES = ["MRPL", "MANGALA", "OMPL"]; // Hardcoded for now, or fetch from settings

const SI: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, outline: "none", background: "#fff" };

export const SiteRequestsTab: React.FC = () => {
  const { user, userName, userRole } = useAuth();
  const { requests, fetch: fetchRequests } = useSiteRequests();
  const { challans, fetch: fetchChallans } = useChallans();
  const { items, fetch: fetchItems } = useInventory();

  const isAdmin = userRole === 'admin';
  const isInvManager = userRole === 'inv-manager' || userRole === 'store-manager' || userRole === 'admin';
  const isPlanningDept = userRole === 'planning_dept' || userRole === 'admin';
  const isDirector = userRole === 'director' || userRole === 'admin';

  const [filter, setFilter] = useState("All");
  const [siteFilt, setSiteFilt] = useState("All");
  const [typeFilt, setTypeFilt] = useState("All");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selReq, setSelReq] = useState<SiteRequest | null>(null);
  const [actionType, setActionType] = useState("");

  useEffect(() => { setLastUpdated(new Date()); }, [requests]);
  useEffect(() => { fetchRequests(); fetchChallans(); fetchItems(); }, [fetchRequests, fetchChallans, fetchItems]);

  const filtered = requests.filter(r => (filter === "All" || r.status === filter) && (siteFilt === "All" || r.requesting_site === siteFilt) && (typeFilt === "All" || r.request_type === typeFilt));

  const counts: Record<string, number> = {
    All: requests.length, "Under Review": requests.filter(r => r.status === "Under Review").length,
    "Stock Checked": requests.filter(r => r.status === "Stock Checked").length,
    "Needs Procurement": requests.filter(r => r.status === "Needs Procurement").length,
    "With Planning": requests.filter(r => r.status === "With Planning").length,
    "With Director": requests.filter(r => r.status === "With Director").length,
    "Forwarded to Admin": requests.filter(r => r.status === "Forwarded to Admin").length,
    Pending: requests.filter(r => r.status === "Pending").length,
    Approved: requests.filter(r => r.status === "Approved").length,
    Rejected: requests.filter(r => r.status === "Rejected").length
  };

  const statusColors: any = {
    Pending: { bg: "#fffbeb", border: "#fde68a", color: "#d97706" },
    "Under Review": { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    "Stock Checked": { bg: "#f5f3ff", border: "#ddd6fe", color: "#6d28d9" },
    "Forwarded to Admin": { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" },
    "With Planning": { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
    "With Director": { bg: "#fdf4ff", border: "#e9d5ff", color: "#7c3aed" },
    Approved: { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a" },
    Rejected: { bg: "#fef2f2", border: "#fecaca", color: "#dc2626" }
  };

  const handleRefresh = () => { fetchRequests(); fetchChallans(); fetchItems(); alert("Refreshed"); };

  const handleNewSave = async (payload: any) => {
    setSaving(true);
    const { error } = await db.from('site_requests').insert([payload]);
    setSaving(false);
    if (error) return alert(error.message);
    alert("Request created");
    setActiveModal(null);
    fetchRequests();
  };

  const handleActionSave = async (payload: any) => {
    if (!selReq) return;
    setSaving(true);
    try {
      if (selReq.request_type === "Mobilization" && payload.status === "Approved") {
        const mobItems = payload.mobItems; delete payload.mobItems; delete payload.challanNo;
        if (!mobItems || mobItems.length === 0) throw new Error("No items selected");
        
        const challanRows = mobItems.map((it: any) => ({
          challan_no: "SR-" + Math.floor(100000 + Math.random() * 900000), date: new Date().toISOString().slice(0, 10),
          item_id: it.item_id, item_name: it.name, unit: it.unit, condition: 'Good',
          from_site: "GODOWN", to_site: selReq.requesting_site, qty: it.qty_final,
          remarks: "Mobilization ref=" + selReq.id, issued_by_name: userName || "Admin", requested_by: selReq.raised_by_name || "-", reviewed_by_name: userName || "Admin"
        }));
        const { error: cErr } = await db.from('challans').insert(challanRows);
        if (cErr) throw cErr;

        for (const it of mobItems) {
          if (it.item_id && String(it.item_id) !== "null") {
            const gi = items.find(i => String(i.id) === String(it.item_id));
            if (gi && gi.qty >= it.qty_final) await db.from('inventory').update({ qty: gi.qty - it.qty_final }).eq('id', it.item_id);
          }
        }
        await db.from('site_requests').update({ status: payload.status, action_note: payload.action_note || "Approved and Mobilized", remarks: JSON.stringify(mobItems) }).eq('id', selReq.id);
      } else if (selReq.request_type === "Demobilization" && payload.status === "Approved") {
        const dp = payload.demobPayload; delete payload.demobPayload; delete payload.challanNo;
        const challanRows = dp.items.map((it: any) => ({
          challan_no: "SR-" + Math.floor(100000 + Math.random() * 900000), date: new Date().toISOString().slice(0, 10),
          item_id: it.item_id, item_name: it.item_name, unit: it.unit, condition: it.condition || "Good",
          from_site: dp.from_site, to_site: dp.to_site, qty: it.qty,
          remarks: `DEMOB: ref=${it.mob_challan_ref}`, issued_by_name: userName || "Admin", requested_by: selReq.raised_by_name || "-", reviewed_by_name: userName || "Admin"
        }));
        const { error: cErr } = await db.from('challans').insert(challanRows);
        if (cErr) throw cErr;

        if (dp.to_site === "GODOWN") {
          for (const it of dp.items) {
            const godownMatch = items.find(i => i.site === "GODOWN" && ((it.item_id && String(i.id) === String(it.item_id)) || (i.name.trim().toLowerCase() === it.item_name.trim().toLowerCase())));
            if (godownMatch) await db.from('inventory').update({ qty: godownMatch.qty + Number(it.qty) }).eq('id', godownMatch.id);
          }
        }
        await db.from('site_requests').update({ status: payload.status, action_note: payload.action_note || "Approved and Demobilized", remarks: JSON.stringify(dp) }).eq('id', selReq.id);
      } else if (selReq.request_type === "From Stock" && payload.status === "Approved" && payload.item_id) {
        const challan = payload.challan; delete payload.challan; delete payload.item_id; delete payload.challan_no;
        const { error: cErr } = await db.from('challans').insert([challan]);
        if (cErr) throw cErr;
        const item = items.find(i => i.id === challan.item_id);
        if (item) await db.from('inventory').update({ qty: item.qty - challan.qty }).eq('id', item.id);
        await db.from('site_requests').update({ status: payload.status, action_note: payload.action_note, challan_no: challan.challan_no }).eq('id', selReq.id);
      } else {
        await db.from('site_requests').update(payload).eq('id', selReq.id);
      }
      alert("Action saved");
      setActiveModal(null);
      fetchRequests(); fetchChallans(); fetchItems();
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleInvActionSave = async (payload: any) => {
    if (!selReq) return;
    setSaving(true);
    const updates: any = { status: payload.status, tat_note: payload.tat_note };
    if (payload.updatedRemarks) updates.remarks = payload.updatedRemarks;
    if (payload.planId) {
      updates.plan_id = payload.planId;
      updates.status = payload.status;
    }
    if (payload.purchaseItems) {
      updates.purchase_items = JSON.stringify(payload.purchaseItems);
    }
    const { error } = await db.from('site_requests').update(updates).eq('id', selReq.id);
    setSaving(false);
    if(error) return alert(error.message);
    alert("Updated");
    setActiveModal(null);
    fetchRequests();
  };

  const handleDemobSave = async (payload: any) => {
    setSaving(true);
    const req = {
      request_type: "Demobilization", item_name: `Demobilize from ${payload.from_site} to ${payload.to_site}`,
      requesting_site: payload.from_site, priority: "Normal", remarks: JSON.stringify(payload),
      status: "Pending", raised_by: user?.id, raised_by_name: userName, created_at: new Date().toISOString()
    };
    const { error } = await db.from('site_requests').insert([req]);
    setSaving(false);
    if(error) return alert(error.message);
    alert("Demobilization Request submitted to Admin");
    setActiveModal(null);
    fetchRequests();
  };

  const urgentCount = requests.filter(r => r.priority === 'Urgent').length;
  const pendingActionCount = requests.filter(r => !['Approved', 'Rejected'].includes(r.status)).length;

  const kpis = [
    { label: 'Total Requests', val: requests.length, color: '#1d4ed8', bg: '#eff6ff', br: '#bfdbfe' },
    { label: 'Pending Action', val: pendingActionCount, color: '#d97706', bg: '#fffbeb', br: '#fcd34d' },
    { label: 'Urgent Priority', val: urgentCount, color: '#dc2626', bg: '#fef2f2', br: '#fecaca' },
    { label: 'Approved', val: counts['Approved'] || 0, color: '#15803d', bg: '#f0fdf4', br: '#bbf7d0' },
  ];

  const columns: Column<SiteRequest>[] = [
    {
      header: 'Date',
      key: 'created_at',
      render: (r) => <span className="mono" style={{ fontSize: 11 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}</span>,
      width: 80
    },
    {
      header: 'Request / Item',
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{r.item_name}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <span style={{ fontSize: 9, padding: "1px 5px", background: "#f1f5f9", borderRadius: 4, border: "1px solid #e2e8f0", color: "#64748b" }}>{r.request_type}</span>
            {r.priority === 'Urgent' && <span style={{ fontSize: 9, padding: "1px 5px", background: "#fef2f2", color: "#dc2626", borderRadius: 4, border: "1px solid #fecaca", fontWeight: 700 }}>URGENT</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Site',
      key: 'requesting_site',
      render: (r) => <b style={{ color: '#f97316' }}>{r.requesting_site}</b>,
      width: 100
    },
    {
      header: 'Qty',
      key: 'qty',
      render: (r) => <b style={{ color: '#0f172a' }}>{r.qty}</b>,
      align: 'center',
      width: 60
    },
    {
      header: 'Status',
      render: (r) => {
        const sc = statusColors[r.status] || statusColors.Pending;
        return (
          <span style={{ 
            background: sc.bg, 
            border: `1px solid ${sc.border}`, 
            color: sc.color, 
            borderRadius: 20, 
            padding: "3px 12px", 
            fontSize: 10, 
            fontWeight: 700,
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}>
            {r.status.toUpperCase()}
          </span>
        );
      },
      width: 130
    },
    {
      header: 'Due / Info',
      render: (r) => {
        const daysLeft = r.required_by ? Math.ceil((new Date(r.required_by).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
        return (
          <div style={{ fontSize: 11 }}>
            {daysLeft !== null && (
              <div style={{ color: daysLeft < 0 ? "#dc2626" : daysLeft <= 3 ? "#d97706" : "#16a34a", fontWeight: 700 }}>
                {daysLeft < 0 ? `Overdue ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Due Today" : `Due in ${daysLeft}d`}
              </div>
            )}
            {r.plan_id && <div style={{ color: '#64748b', fontSize: 10 }}>Plan: {r.plan_id}</div>}
          </div>
        );
      },
      width: 100
    },
    {
      header: 'Actions',
      align: 'right',
      render: (req) => (
        <div style={{ display: "flex", gap: 6, justifyContent: 'flex-end' }}>
          {isInvManager && (req.status === "Pending" || req.status === "Under Review") && (
            <>
              <Button onClick={() => { setSelReq(req); setActionType("review"); setActiveModal("invAction"); }} style={{ fontSize: 9, padding: "4px 8px", background: "#1d4ed8", borderColor: "#1d4ed8", height: "auto" }}>🔍 Review</Button>
              <Button onClick={() => { setSelReq(req); setActionType("stock_checked"); setActiveModal("invAction"); }} style={{ fontSize: 9, padding: "4px 8px", background: "#6d28d9", borderColor: "#6d28d9", height: "auto" }}>✓ Check</Button>
            </>
          )}

          {isInvManager && req.status === "Stock Checked" && (
            <>
              <Button onClick={() => { setSelReq(req); setActionType("forward_admin"); setActiveModal("invAction"); }} style={{ fontSize: 9, padding: "4px 8px", background: "#0369a1", borderColor: "#0369a1", height: "auto" }}>➤ Admin</Button>
              <Button onClick={() => { setSelReq(req); setActionType("forward_planning"); setActiveModal("invAction"); }} style={{ fontSize: 9, padding: "4px 8px", background: "#16a34a", borderColor: "#16a34a", height: "auto" }}>🛒 Plan</Button>
            </>
          )}

          {isPlanningDept && req.status === "With Planning" && (
            <Button onClick={() => { setSelReq(req); setActionType("planning_review"); setActiveModal("invAction"); }} style={{ fontSize: 9, padding: "4px 8px", background: "#0369a1", borderColor: "#0369a1", height: "auto" }}>🔍 Plan</Button>
          )}

          {isDirector && req.status === "With Director" && (
            <>
              <Button onClick={() => { setSelReq(req); setActionType("director_approve"); setActiveModal("invAction"); }} style={{ fontSize: 9, padding: "4px 8px", background: "#22c55e", borderColor: "#22c55e", height: "auto" }}>✓ Appr</Button>
              <Button onClick={() => { setSelReq(req); setActionType("reject"); setActiveModal("action"); }} variant="danger" style={{ fontSize: 9, padding: "4px 8px", height: "auto" }}>Reject</Button>
            </>
          )}

          {isAdmin && req.request_type !== "Mobilization" && (req.status === "Pending" || req.status === "Stock Checked" || req.status === "Under Review") && (
            <>
              <Button onClick={() => { setSelReq(req); setActionType("approve"); setActiveModal("action"); }} style={{ fontSize: 9, padding: "4px 8px", background: "#16a34a", borderColor: "#16a34a", height: "auto" }}>Appr</Button>
              <Button onClick={() => { setSelReq(req); setActionType("reject"); setActiveModal("action"); }} variant="danger" style={{ fontSize: 9, padding: "4px 8px", height: "auto" }}>Reject</Button>
            </>
          )}
        </div>
      ),
      width: 150
    }
  ];

  return (
    <div>
      {/* KPI Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {kpis.map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.br}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>{card.val}</div>
            <div style={{ fontSize: 10, color: card.color, marginTop: 6, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, fontWeight: 700 }}>{card.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {["All", "Pending", "Under Review", "Stock Checked", "Needs Procurement", "With Planning", "With Director", "Forwarded to Admin", "Approved", "Rejected"].map(st => (
            <button key={st} onClick={() => setFilter(st)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === st ? "#f97316" : "#e2e8f0"}`, background: filter === st ? "#f97316" : "#fff", color: filter === st ? "#fff" : "#64748b", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}>
              {st} ({counts[st]})
            </button>
          ))}
          <select value={siteFilt} onChange={e => setSiteFilt(e.target.value)} style={{ ...SI, width: "auto", padding: "6px 12px", fontSize: 11 }}>
            <option value="All">All Sites</option>
            {MOCK_SITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilt} onChange={e => setTypeFilt(e.target.value)} style={{ ...SI, width: "auto", padding: "6px 12px", fontSize: 11 }}>
            {["All", "Normal", "Material", "Service", "Mobilization", "Demobilization"].map(t => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, color: "#64748b", fontFamily: "IBM Plex Mono, monospace" }}>Live • {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            <Button variant="ghost" onClick={handleRefresh} style={{ padding: "4px 10px", fontSize: 11 }}>🔄 Refresh</Button>
          </div>
          <Button onClick={() => setActiveModal("new")} style={{ fontSize: 12 }}>+ New Request</Button>
          <Button onClick={() => setActiveModal("mob")} style={{ background: "#0369a1", borderColor: "#0369a1", fontSize: 11 }}>🏗 Mobilization</Button>
          <Button onClick={() => setActiveModal("demob")} style={{ background: "#b45309", borderColor: "#b45309", fontSize: 11 }}>📦 Demobilize</Button>
          <Button onClick={() => setActiveModal("demobReport")} style={{ background: "#7c3aed", borderColor: "#7c3aed", fontSize: 11 }}>📊 T&P Balance</Button>
        </div>
      </div>

      <DataTable 
        data={filtered} 
        columns={columns} 
        loading={false} 
        emptyMessage="No requests found"
        initialPageSize={25}
      />

      {activeModal === "new" && (
        <Modal onClose={() => setActiveModal(null)} title="New Request">
          <NewRequestModal sites={MOCK_SITES} items={items} user={user} uName={userName} saving={saving} onClose={() => setActiveModal(null)} onSave={handleNewSave} />
        </Modal>
      )}

      {activeModal === "mob" && (
        <Modal onClose={() => setActiveModal(null)} title="New Mobilization">
          <MobilizationModal sites={MOCK_SITES} items={items} user={user} uName={userName} saving={saving} onClose={() => setActiveModal(null)} onSave={handleNewSave} />
        </Modal>
      )}

      {activeModal === "demob" && (
        <Modal onClose={() => setActiveModal(null)} title="Demobilization">
          <DemobilizationModal sites={MOCK_SITES} challans={challans} items={items} user={user} uName={userName} saving={saving} onClose={() => setActiveModal(null)} onSave={handleDemobSave} />
        </Modal>
      )}

      {activeModal === "demobReport" && (
        <Modal onClose={() => setActiveModal(null)} title="T&P Balance Report">
          <DemobReportModal challans={challans} onClose={() => setActiveModal(null)} />
        </Modal>
      )}

      {activeModal === "action" && !!selReq && (
        <Modal onClose={() => { setActiveModal(null); setSelReq(null); }} title="Action Request">
          <ActionRequestModal request={selReq} action={actionType as any} items={items} saving={saving} uName={userName} onClose={() => { setActiveModal(null); setSelReq(null); }} onSave={handleActionSave} />
        </Modal>
      )}

      {activeModal === "invAction" && !!selReq && (
        <Modal onClose={() => { setActiveModal(null); setSelReq(null); }} title="Inventory Action">
          <InvManagerActionModal request={selReq} action={actionType} items={items} saving={saving} onClose={() => { setActiveModal(null); setSelReq(null); }} onSave={handleInvActionSave} />
        </Modal>
      )}

    </div>
  );
};
