import React, { useState, useMemo } from 'react';
import type { SiteRequest } from '@/types/request.types';
import type { InventoryItem } from '@/types/inventory.types';
import { Button } from '@/components/ui';

interface Props {
  request: SiteRequest;
  action: 'approve' | 'reject';
  items: InventoryItem[];
  saving: boolean;
  uName?: string;
  onClose: () => void;
  onSave: (payload: any) => void;
}

const SI: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, outline: "none", background: "#fff" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 10, color: "#64748b", letterSpacing: 1, marginBottom: 4, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function Inp(props: any) {
  return <input style={SI} {...props} />;
}

export function ActionRequestModal({ request, action, items, saving, uName, onClose, onSave }: Props) {
  const [fromSite, setFromSite] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const isApprove = action === "approve";
  const isMobilization = request.request_type === "Mobilization";
  const isDemobilization = request.request_type === "Demobilization";
  
  const stockItem = request.item_id ? items.find(i => String(i.id) === String(request.item_id)) : null;

  const parsedItems = useMemo(() => {
    try { return JSON.parse(request.remarks || "[]"); } catch (e) { return []; }
  }, [request.remarks]);

  const demobPayload = useMemo(() => {
    if (!isDemobilization) return null;
    try { const p = JSON.parse(request.remarks || "{}"); return p && p.items ? p : null; } catch (e) { return null; }
  }, [request.remarks, isDemobilization]);

  const [mobRows, setMobRows] = useState<any[]>(() => {
    if (isMobilization) {
      const itemsForAdmin = (request.status === "Forwarded to Admin")
        ? parsedItems.filter((it: any) => it.inv_status !== "zero" && (it.godown_stock || 0) > 0)
        : parsedItems;
      return itemsForAdmin.map((it: any) => ({ ...it, admin_approved: true }));
    }
    if (isDemobilization) {
      try {
        const dp2 = JSON.parse(request.remarks || "{}");
        return (dp2.items || []).map((it: any) => ({ ...it, admin_approved: true, admin_qty: it.qty }));
      } catch (e) { return []; }
    }
    return [];
  });

  const updateRow = (idx: number, key: string, val: any) => {
    setMobRows(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [key]: val };
      return arr;
    });
  };

  const approvedRows = mobRows.filter(r => r.admin_approved);

  const submit = () => {
    const now = new Date();
    const challanNo = "SR-" + Math.floor(100000 + Math.random() * 900000);
    const payload: any = { status: isApprove ? "Approved" : "Rejected", actioned_at: now.toISOString(), action_note: note };

    if (isApprove && isMobilization) {
      payload.mobItems = mobRows.filter(r => r.admin_approved && (r.admin_qty !== undefined ? r.admin_qty : (r.qty_approved || r.qty_requested)) > 0)
        .map(r => ({ ...r, qty_final: r.admin_qty !== undefined ? r.admin_qty : (r.qty_approved || r.qty_requested) }));
      payload.challanNo = challanNo;
    } else if (isApprove && isDemobilization && demobPayload) {
      payload.demobPayload = {
        ...demobPayload,
        items: mobRows.filter(r => r.admin_approved).map(r => ({ ...r, qty: r.admin_qty !== undefined ? r.admin_qty : r.qty }))
      };
      payload.challanNo = challanNo;
    } else if (isApprove && request.request_type === "From Stock" && stockItem) {
      payload.item_id = stockItem.id;
      payload.challan_no = challanNo;
      payload.challan = {
        challan_no: challanNo, date: now.toISOString().slice(0, 10),
        item_id: stockItem.id, item_name: stockItem.name, category: stockItem.category,
        unit: stockItem.unit, condition: stockItem.condition,
        from_site: fromSite || stockItem.site, to_site: request.requesting_site,
        qty: request.qty, remarks: "Site Request approved",
        issued_by: null, issued_by_name: uName || "Admin",
        requested_by: request.raised_by_name || "-", reviewed_by_name: request.approved_by || "-"
      };
    }
    onSave(payload);
  };

  return (
    <div>
      <div style={{ background: isApprove ? "#f0fdf4" : "#fef2f2", border: `1px solid ${isApprove ? "#bbf7d0" : "#fecaca"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: isApprove ? "#16a34a" : "#dc2626", marginBottom: 6 }}>
          {isApprove ? "Approving Request" : "Rejecting Request"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: "#374151" }}>
          {[
            ["Request", request.item_name],
            ["Site", request.requesting_site],
            ["Priority", request.priority],
            ["Raised By", request.raised_by_name]
          ].map(pair => (
            <div key={pair[0]}>
              <span style={{ color: "#64748b", fontSize: 11 }}>{pair[0]}: </span>
              <b>{pair[1]}</b>
            </div>
          ))}
        </div>
      </div>

      {isApprove && isMobilization && mobRows.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", fontFamily: "IBM Plex Mono, monospace" }}>📋 ITEM-WISE APPROVAL</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setMobRows(p => p.map(r => ({ ...r, admin_approved: true })))} style={{ fontSize: 10, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>✓ Approve All</button>
              <button type="button" onClick={() => setMobRows(p => p.map(r => ({ ...r, admin_approved: false })))} style={{ fontSize: 10, background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>✕ Reject All</button>
            </div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
            <div style={{ background: "#f8fafc", padding: "7px 12px", borderBottom: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 50px 58px 58px 70px 60px", gap: 6, fontSize: 9, fontWeight: 700, color: "#64748b", fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1 }}>
              <span>ITEM</span><span>REQ</span><span>INV-APV</span><span>STOCK</span><span>ADMIN QTY</span><span>INCL.</span>
            </div>
            {mobRows.map((it, idx) => {
              const isZero = it.inv_status === "zero" || (it.godown_stock || 0) === 0;
              const invApproved = it.qty_approved || it.qty_requested;
              const adminQty = it.admin_qty !== undefined ? it.admin_qty : invApproved;
              return (
                <div key={idx} style={{ padding: "7px 12px", borderBottom: "1px solid #f1f5f9", background: it.admin_approved ? (isZero ? "#fffbeb" : "#f0fdf4") : "#fff8f8", display: "grid", gridTemplateColumns: "1fr 50px 58px 58px 70px 60px", gap: 6, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}>{it.name}</div>
                    {isZero && <div style={{ fontSize: 9, color: "#ea580c", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>⚠ ZERO STK</div>}
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#374151" }}>{it.qty_requested}</span>
                  <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#1d4ed8", fontWeight: 700 }}>{invApproved}</span>
                  <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: isZero ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{it.godown_stock || 0}</span>
                  <input type="number" min={0} value={adminQty} disabled={!it.admin_approved} onChange={e => updateRow(idx, "admin_qty", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "3px 5px", border: `1px solid ${it.admin_approved ? "#f97316" : "#e2e8f0"}`, borderRadius: 5, fontSize: 11, fontFamily: "IBM Plex Mono, monospace", background: it.admin_approved ? "#fff" : "#f8fafc", color: it.admin_approved ? "#0f172a" : "#94a3b8" }} />
                  <div style={{ display: "flex", gap: 3 }}>
                    <button type="button" onClick={() => { updateRow(idx, "admin_approved", true); if (it.admin_qty === undefined) updateRow(idx, "admin_qty", invApproved); }} style={{ flex: 1, fontSize: 10, background: it.admin_approved ? "#16a34a" : "#f1f5f9", color: it.admin_approved ? "#fff" : "#64748b", border: "none", borderRadius: 4, padding: "4px 0", cursor: "pointer", fontWeight: 700 }}>✓</button>
                    <button type="button" onClick={() => updateRow(idx, "admin_approved", false)} style={{ flex: 1, fontSize: 10, background: !it.admin_approved ? "#dc2626" : "#f1f5f9", color: !it.admin_approved ? "#fff" : "#64748b", border: "none", borderRadius: 4, padding: "4px 0", cursor: "pointer", fontWeight: 700 }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>{approvedRows.length} of {mobRows.length} items included for dispatch</div>
        </div>
      )}

      {isApprove && isDemobilization && demobPayload && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
              <div><span style={{ color: "#64748b", fontSize: 11 }}>From Site: </span><b>{demobPayload.from_site || request.requesting_site}</b></div>
              <div><span style={{ color: "#64748b", fontSize: 11 }}>To: </span><b>{demobPayload.to_site || "GODOWN"}</b></div>
              <div><span style={{ color: "#64748b", fontSize: 11 }}>Vehicle: </span><b>{demobPayload.vehicle_no || "—"}</b></div>
              <div><span style={{ color: "#64748b", fontSize: 11 }}>Mob Refs: </span><b style={{ fontSize: 10, fontFamily: "monospace" }}>{demobPayload.mob_refs || "—"}</b></div>
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", fontFamily: "IBM Plex Mono, monospace", marginBottom: 8 }}>📋 DEMOBILIZATION ITEMS — REVIEW & APPROVE</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button type="button" onClick={() => setMobRows(p => p.map(r => ({ ...r, admin_approved: true })))} style={{ fontSize: 10, background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>✓ Approve All</button>
            <button type="button" onClick={() => setMobRows(p => p.map(r => ({ ...r, admin_approved: false })))} style={{ fontSize: 10, background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>✕ Reject All</button>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: "#f8fafc", padding: "7px 12px", borderBottom: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 50px", gap: 6, fontSize: 9, fontWeight: 700, color: "#64748b", fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1 }}>
              <span>ITEM</span><span>MOB REF</span><span>UNIT</span><span>RETURN QTY</span><span>INCL.</span>
            </div>
            {mobRows.map((it, ridx) => {
              const adminQty = it.admin_qty !== undefined ? it.admin_qty : it.qty;
              return (
                <div key={ridx} style={{ padding: "7px 12px", borderBottom: "1px solid #f1f5f9", background: it.admin_approved ? "#f0fdf4" : "#fff8f8", display: "grid", gridTemplateColumns: "1fr 70px 55px 70px 50px", gap: 6, alignItems: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{it.item_name}</div>
                  <span style={{ fontSize: 9, fontFamily: "monospace", color: "#92400e", background: "#fef3c7", borderRadius: 3, padding: "1px 5px" }}>{it.mob_challan_ref || "—"}</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{it.unit || "Nos"}</span>
                  <input type="number" min={0} max={it.qty} value={adminQty} disabled={!it.admin_approved} onChange={e => updateRow(ridx, "admin_qty", Math.min(parseInt(e.target.value) || 0, it.qty))} style={{ width: "100%", padding: "3px 5px", border: `1px solid ${it.admin_approved ? "#b45309" : "#e2e8f0"}`, borderRadius: 5, fontSize: 11, fontFamily: "IBM Plex Mono, monospace", background: it.admin_approved ? "#fff" : "#f8fafc" }} />
                  <div style={{ display: "flex", gap: 3 }}>
                    <button type="button" onClick={() => updateRow(ridx, "admin_approved", true)} style={{ flex: 1, fontSize: 10, background: it.admin_approved ? "#16a34a" : "#f1f5f9", color: it.admin_approved ? "#fff" : "#64748b", border: "none", borderRadius: 4, padding: "4px 0", cursor: "pointer", fontWeight: 700 }}>✓</button>
                    <button type="button" onClick={() => updateRow(ridx, "admin_approved", false)} style={{ flex: 1, fontSize: 10, background: !it.admin_approved ? "#dc2626" : "#f1f5f9", color: !it.admin_approved ? "#fff" : "#64748b", border: "none", borderRadius: 4, padding: "4px 0", cursor: "pointer", fontWeight: 700 }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isApprove && request.request_type === "From Stock" && stockItem && (
        <div style={{ marginBottom: 14 }}>
          <Field label={`Dispatch From Site (stock: ${stockItem.qty} at ${stockItem.site})`}>
            <Inp value={fromSite || stockItem.site} onChange={(e: any) => setFromSite(e.target.value)} placeholder={stockItem.site} />
          </Field>
        </div>
      )}

      <Field label={isApprove ? "Approval Note (optional)" : "Reason for Rejection *"}>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={isApprove ? "Instructions for site..." : "Reason for rejection..."} style={{ ...SI, height: 70, resize: "vertical" } as any} />
      </Field>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {isApprove && (isMobilization || isDemobilization) && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, background: confirmed ? "#f0fdf4" : "#fffbeb", border: `1px solid ${confirmed ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", marginBottom: 8, fontSize: 12, fontWeight: 600, color: confirmed ? "#15803d" : "#92400e" }}>
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
            I have reviewed all items and quantities. Ready to approve.
          </label>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {isApprove && (isMobilization || isDemobilization) ? (
          <Button onClick={() => submit()} disabled={saving || !confirmed} variant="primary" style={{ flex: 1, backgroundColor: "#16a34a", borderColor: "#16a34a", padding: "10px 0", opacity: (saving || !confirmed) ? 0.5 : 1 }}>
            {saving ? "Processing..." : `✓ Approve (${mobRows.filter(r => r.admin_approved).length} items)`}
          </Button>
        ) : (
          <Button onClick={() => submit()} disabled={saving} variant={isApprove ? "success" : "danger"} style={{ flex: 1, padding: "10px 0", backgroundColor: isApprove ? "#16a34a" : "#dc2626", color: "#fff", borderColor: isApprove?"#16a34a":"#dc2626" }}>
            {saving ? "Processing..." : (isApprove ? "Approve & Confirm" : "Reject Request")}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: "10px 0" }}>
          Cancel
        </Button>
      </div>

    </div>
  );
}
