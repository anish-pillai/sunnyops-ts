import React, { useState, useMemo } from 'react';
import type { SiteRequest } from '@/types/request.types';
import type { InventoryItem } from '@/types/inventory.types';
import { Button } from '@/components/ui';

interface Props {
  request: SiteRequest;
  action: string;
  saving: boolean;
  items: InventoryItem[];
  allPlanIds?: string[];
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

export function InvManagerActionModal({ request, action, saving, items, onClose, onSave }: Props) {
  const isMobilization = request.request_type === "Mobilization";
  const parsedItems = useMemo(() => {
    try { return JSON.parse(request.remarks || "[]"); } catch (e) { return []; }
  }, [request.remarks]);

  const [rows, setRows] = useState<any[]>(() => {
    return parsedItems.map((it: any) => {
      const gi = items && items.find(i => (it.item_id && String(i.id) === String(it.item_id)) || (i.site === "GODOWN" && i.name.trim().toLowerCase() === it.name.trim().toLowerCase()));
      const liveStock = gi ? gi.qty : (it.godown_stock || 0);
      return {
        ...it,
        godown_stock: liveStock,
        qty_approved: liveStock > 0 ? Math.min(it.qty_requested, liveStock) : 0,
        inv_status: liveStock <= 0 ? "zero" : (liveStock < it.qty_requested ? "partial" : "available")
      };
    });
  });

  const updateRow = (idx: number, key: string, val: any) => {
    setRows(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [key]: val };
      return arr;
    });
  };

  const [tatNote, setTatNote] = useState("");
  const [tatDays, setTatDays] = useState("");

  const isReview = action === "review";
  const isStockChecked = action === "stock_checked";
  const isForward = action === "forward_admin";
  const isFwdPlanningBtn = action === "forward_planning";
  const isPlanningRevBtn = action === "planning_review";
  const isFwdDirBtn = action === "forward_director";
  const isDirApproveBtn = action === "director_approve";

  const accentColor = isReview ? "#1d4ed8" : isStockChecked ? "#6d28d9" : isFwdPlanningBtn ? "#16a34a" : isFwdDirBtn ? "#7c3aed" : isDirApproveBtn ? "#0f172a" : "#0369a1";
  
  const zeroRows = rows.filter(r => r.inv_status === "zero");
  const availRows = rows.filter(r => r.inv_status !== "zero");

  const submit = () => {
    const isFwdPlanning = action === "forward_planning";
    const isPlanningRev = action === "planning_review";
    const isFwdDirector = action === "forward_director";
    const isDirApprove = action === "director_approve";
    const planFwdAdmin = action === "planning_fwd_admin";
    const planFwdDir = action === "planning_fwd_director";

    const newStatus = isReview ? "Under Review" : isStockChecked ? "Stock Checked" : isForward ? "Forwarded to Admin" : isFwdPlanning ? "With Planning" : isPlanningRev ? "With Planning" : planFwdAdmin ? "Forwarded to Admin" : planFwdDir ? "With Director" : isFwdDirector ? "With Director" : isDirApprove ? "Forwarded to Admin" : "Stock Checked";

    const updatedRows = rows.map(r => {
      const approvedQty = r.inv_status === "zero" ? 0 : Math.min(r.qty_approved || 0, r.godown_stock);
      return { ...r, qty_approved: approvedQty, inv_status: r.godown_stock <= 0 ? "zero" : (approvedQty < r.qty_requested ? "partial" : "available") };
    });

    const stockSummary = availRows.length + " available, " + zeroRows.length + " zero stock";
    const planningNote = isFwdPlanning ? " | PURCHASE REQUIRED for " + zeroRows.length + " item(s)" : isDirApprove ? " | Director Approved - proceed to purchase" : "";
    const fullNote = (tatDays ? "TAT: " + tatDays + " days | " : "") + stockSummary + planningNote + (tatNote ? " | " + tatNote : "");
    const purchaseItems = (isFwdPlanning || planFwdDir) ? rows.filter(r => r.inv_status === "zero") : [];

    const planId = (isFwdPlanning || planFwdAdmin || planFwdDir) ? (() => {
      const site = request.requesting_site || "GEN";
      const yr = new Date().getFullYear();
      const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
      return "PLAN-" + site.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4) + "-" + yr + "-" + rnd;
    })() : undefined;

    onSave({ status: newStatus, tat_note: fullNote, forward: isForward || isDirApprove || planFwdAdmin, updatedRemarks: JSON.stringify(updatedRows), planId, purchaseItems });
  };

  return (
    <div>
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: accentColor, marginBottom: 6, fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1 }}>
          📋 {isReview ? "REVIEW REQUEST" : isStockChecked ? "MARK STOCK CHECKED" : isFwdPlanningBtn ? "FORWARD TO PLANNING DEPT" : isPlanningRevBtn ? "PLANNING DEPT REVIEW" : isFwdDirBtn ? "FORWARD TO DIRECTOR" : isDirApproveBtn ? "DIRECTOR FINAL APPROVAL" : "FORWARD TO ADMIN"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: "#374151" }}>
          {[
            ["Request", request.item_name],
            ["Site", request.requesting_site],
            ["Priority", request.priority],
            ["Raised By", request.raised_by_name]
          ].map(pair => (
            <div key={pair[0]}><span style={{ color: "#64748b", fontSize: 11 }}>{pair[0]}: </span><b>{pair[1]}</b></div>
          ))}
        </div>
      </div>

      {isMobilization && rows.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", fontFamily: "IBM Plex Mono, monospace", marginBottom: 8 }}>ITEM LIST — SET APPROVED QUANTITY</div>
          {zeroRows.length > 0 && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 11, color: "#c2410c" }}>
              ⚠ {zeroRows.length} item(s) have zero GODOWN stock — flagged for procurement and forwarded to Admin
            </div>
          )}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", maxHeight: 280, overflowY: "auto" }}>
            <div style={{ background: "#f8fafc", padding: "7px 12px", borderBottom: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 70px 90px 80px 80px", gap: 8, fontSize: 9, fontWeight: 700, color: "#64748b", fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1 }}>
              <span>ITEM</span><span>REQ QTY</span><span>GODOWN STK</span><span>APPROVE</span><span>STATUS</span>
            </div>
            {rows.map((it, idx) => {
              const isZero = it.inv_status === "zero";
              const isPartial = it.inv_status === "partial";
              return (
                <div key={idx} style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", background: isZero ? "#fff7ed" : isPartial ? "#fffbeb" : "#f0fdf4", display: "grid", gridTemplateColumns: "1fr 70px 90px 80px 80px", gap: 8, alignItems: "center" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}>{it.name}</div><div style={{ fontSize: 10, color: "#64748b" }}>{it.unit || "Nos"}</div></div>
                  <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }}>{it.qty_requested}</span>
                  <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: isZero ? "#dc2626" : "#16a34a", fontWeight: 700 }}>{it.godown_stock}</span>
                  {isZero ? (
                    <span style={{ fontSize: 10, color: "#dc2626", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>0 — N/A</span>
                  ) : (
                    <input type="number" min={0} max={it.godown_stock} value={it.qty_approved} onChange={e => updateRow(idx, "qty_approved", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }} />
                  )}
                  <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: isZero ? "#fee2e2" : isPartial ? "#fef3c7" : "#dcfce7", color: isZero ? "#dc2626" : isPartial ? "#d97706" : "#16a34a" }}>
                    {isZero ? "❌ ZERO" : isPartial ? "⚠ PARTIAL" : "✓ OK"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <Field label="Expected TAT (days)"><Inp type="number" min={0} value={tatDays} onChange={(e: any) => setTatDays(e.target.value)} placeholder="e.g. 3" /></Field>
        <Field label="Note to Admin / Requester"><Inp value={tatNote} onChange={(e: any) => setTatNote(e.target.value)} placeholder="Stock checked, forwarding to admin..." /></Field>
      </div>

      {isForward && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginTop: 12, fontSize: 12, color: "#1d4ed8" }}>
          ➤ Forward to Admin for final approval.
        </div>
      )}

      {isPlanningRevBtn && (
        <div style={{ marginTop: 14 }}>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#166534", marginBottom: 10, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>
            📋 PLANNING REVIEW — Adjust quantities. Zero-stock items go to Director for purchase approval.
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
            <div style={{ background: "#0f172a", padding: "7px 12px", display: "grid", gridTemplateColumns: "1fr 55px 75px 75px 75px 80px", gap: 6, fontSize: 9, fontWeight: 700, color: "#94a3b8", fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1 }}>
              <span>ITEM</span><span>REQ</span><span>GODOWN</span><span>MOB QTY</span><span>PUR QTY</span><span>ACTION</span>
            </div>
            {rows.map((it, idx) => {
              const isZero = it.inv_status === "zero";
              const isPartial = it.inv_status === "partial";
              return (
                <div key={idx} style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", background: isZero ? "#fff7ed" : isPartial ? "#fffbeb" : "#f0fdf4", display: "grid", gridTemplateColumns: "1fr 55px 75px 75px 75px 80px", gap: 6, alignItems: "center" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 12 }}>{it.name}</div><div style={{ fontSize: 10, color: "#64748b" }}>{it.unit || "Nos"}</div></div>
                  <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{it.qty_requested}</span>
                  <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: isZero ? "#dc2626" : "#16a34a", fontWeight: 700 }}>{it.godown_stock}</span>
                  {isZero ? <span style={{ fontSize: 10, color: "#94a3b8" }}>-</span> : <input type="number" min={0} max={it.godown_stock} value={it.qty_approved} onChange={e => updateRow(idx, "qty_approved", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }} />}
                  {isZero ? <input type="number" min={0} value={it.purchase_qty != null ? it.purchase_qty : it.qty_requested} onChange={e => updateRow(idx, "purchase_qty", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "4px 6px", border: "1px solid #fde68a", borderRadius: 5, fontSize: 12, fontFamily: "IBM Plex Mono, monospace", background: "#fffbeb" }} /> : <span style={{ fontSize: 10, color: "#94a3b8" }}>-</span>}
                  <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: isZero ? "#fef3c7" : "#dcfce7", color: isZero ? "#b45309" : "#15803d" }}>
                    {isZero ? "🛒 PURCHASE" : "✓ GODOWN"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => {
              if (availRows.length === 0) { alert("No items in stock to send to Admin. Use Director path for purchase approval."); return; }
              const sSum = availRows.length + " available" + (zeroRows.length > 0 ? " (" + zeroRows.length + " zero-stock routed to Director separately)" : "");
              const fNote = (tatDays ? "TAT: " + tatDays + " days | " : "") + sSum + (tatNote ? " | " + tatNote : "");
              onSave({ status: "Forwarded to Admin", tat_note: fNote, forward: true, updatedRemarks: JSON.stringify(availRows), purchaseItems: zeroRows.length > 0 ? zeroRows : [] });
            }} disabled={saving} style={{ flex: 1, backgroundColor: "#0369a1", borderColor: "#0369a1" }}>
              {saving ? "Saving..." : "➤ All from Stock → Admin"}
            </Button>
            <Button onClick={() => {
              const purchItems = rows.filter(r => r.inv_status === "zero").map(r => ({ ...r, purchase_qty: r.purchase_qty != null ? r.purchase_qty : r.qty_requested }));
              if (purchItems.length === 0) { alert("No zero-stock items. Use All from Stock instead."); return; }
              const sSum = zeroRows.length + " item(s) need purchase" + (availRows.length > 0 ? " (" + availRows.length + " available forwarded to Admin)" : "");
              const fNote = (tatDays ? "TAT: " + tatDays + " days | " : "") + sSum + (tatNote ? " | " + tatNote : "");
              onSave({ status: "With Director", tat_note: fNote, forward: false, updatedRemarks: JSON.stringify(purchItems), purchaseItems: purchItems });
            }} disabled={saving} style={{ flex: 1, backgroundColor: "#ea580c", borderColor: "#ea580c" }}>
              {saving ? "Saving..." : "🛒 Purchase → Director"}
            </Button>
            <Button variant="ghost" onClick={onClose} style={{ padding: "10px 14px", minWidth: 100 }}>Cancel</Button>
          </div>
        </div>
      )}

      {!isPlanningRevBtn && !isDirApproveBtn && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Button onClick={submit} disabled={saving} style={{ flex: 1, backgroundColor: accentColor, borderColor: accentColor }}>
            {saving ? "Saving..." : (isForward ? "➤ Forward to Admin" : isStockChecked ? "✓ Mark Stock Checked" : "🔍 Start Review")}
          </Button>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: "10px 0" }}>Cancel</Button>
        </div>
      )}

      {isDirApproveBtn && (() => {
        let pItems: any[] = []; try { pItems = JSON.parse(request.purchase_items || "[]"); } catch (e) { }
        return (
          <div>
            {pItems.length > 0 && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "12px 14px", marginBottom: 12, marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 11, color: "#ea580c", fontFamily: "IBM Plex Mono, monospace", marginBottom: 8 }}>🛒 ITEMS FOR PURCHASE APPROVAL</div>
                {pItems.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #fed7aa", fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{it.name}</span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "#ea580c" }}>{(it.purchase_qty || it.qty_requested || 0)} {(it.unit || "Nos")}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <Button onClick={() => {
                const sSum = "Director approved " + pItems.length + " purchase item(s)";
                const fNote = (tatDays ? "TAT: " + tatDays + " days | " : "") + sSum + (tatNote ? " | " + tatNote : "");
                onSave({ status: "Forwarded to Admin", tat_note: fNote, forward: true, updatedRemarks: request.remarks, purchaseItems: pItems });
              }} disabled={saving} style={{ flex: 1, backgroundColor: "#16a34a", borderColor: "#16a34a" }}>
                {saving ? "Saving..." : "✓ Approve → Admin"}
              </Button>
              <Button onClick={() => {
                const fNote = "Purchase Rejected by Director" + (tatNote ? ": " + tatNote : "");
                onSave({ status: "Rejected", tat_note: fNote, forward: false, updatedRemarks: request.remarks, purchaseItems: [] });
              }} disabled={saving} style={{ flex: 1, backgroundColor: "#dc2626", borderColor: "#dc2626" }}>
                {saving ? "Saving..." : "❌ Reject"}
              </Button>
              <Button variant="ghost" onClick={onClose} style={{ minWidth: 70 }}>Cancel</Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
