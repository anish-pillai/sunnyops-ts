import React, { useState, useEffect, useMemo } from 'react';
import type { Challan } from '@/types/challan.types';
import type { InventoryItem } from '@/types/inventory.types';
import { Button } from '@/components/ui';

interface Props {
  sites: string[];
  challans: Challan[];
  items: InventoryItem[];
  user: any;
  uName?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
}

const SI: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, outline: "none", background: "#fff" };
const LS: React.CSSProperties = { display: "block", fontSize: 10, color: "#64748b", letterSpacing: 1, marginBottom: 4, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase" };

export function DemobilizationModal({ sites, challans, saving, onClose, onSave }: Props) {
  const [step, setStep] = useState(1);
  const [selSite, setSelSite] = useState("");
  const [selChallans, setSelChallans] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [dest, setDest] = useState("GODOWN");
  const [destSite, setDestSite] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [remarks, setRemarks] = useState("");

  const mobChallans = useMemo(() => (challans || []).filter(c => c.from_site === "GODOWN"), [challans]);
  const demobRecs = useMemo(() => (challans || []).filter(c => c.remarks && c.remarks.startsWith("DEMOB:")), [challans]);

  const mobSites = useMemo(() => {
    const sitesWithPending = Array.from(new Set(
      mobChallans.filter(c => {
        const demobbed = demobRecs.filter(d =>
          d.from_site === c.to_site && d.item_name === c.item_name &&
          d.remarks?.includes("DEMOB: ref=" + c.challan_no)
        ).reduce((s, d) => s + (parseFloat(d.qty as any) || 0), 0);
        return Math.max(0, (parseFloat(c.qty as any) || 0) - demobbed) > 0;
      }).map(c => c.to_site)
    ));
    return sitesWithPending.sort();
  }, [mobChallans, demobRecs]);

  const siteChallans = useMemo(() => {
    if (!selSite) return [];
    const ObjectValues = Object.values;
    const cnMap: any = {};
    mobChallans.filter(c => c.to_site === selSite).forEach(c => {
      if (!cnMap[c.challan_no]) cnMap[c.challan_no] = { challan_no: c.challan_no, date: c.date, items: [] };
      const demobbed = demobRecs.filter(d =>
        d.from_site === selSite && d.item_name === c.item_name &&
        d.remarks?.includes("ref=" + c.challan_no)
      ).reduce((s, d) => s + (parseFloat(d.qty as any) || 0), 0);
      const balance = Math.max(0, (parseFloat(c.qty as any) || 0) - demobbed);
      cnMap[c.challan_no].items.push({
        item_id: c.item_id, item_name: c.item_name, item_alias: c.item_alias || "",
        unit: c.unit || "Nos", condition: c.condition || "Good",
        mob_challan_no: c.challan_no, mob_qty: parseFloat(c.qty as any) || 0,
        demobbed_qty: demobbed, balance_qty: balance, return_qty: 0, enabled: false
      });
    });
    return ObjectValues(cnMap).map((cn: any) => {
      cn.pendingItems = cn.items.filter((it: any) => it.balance_qty > 0);
      cn.totalBalance = cn.pendingItems.reduce((s: number, it: any) => s + it.balance_qty, 0);
      return cn;
    }).filter((cn: any) => cn.totalBalance > 0).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selSite, mobChallans, demobRecs]);

  useEffect(() => {
    if (!selChallans.length) { setRows([]); return; }
    const merged: any[] = [];
    selChallans.forEach(cn => {
      cn.pendingItems.forEach((it: any) => {
        merged.push({ ...it, return_qty: 0, enabled: false });
      });
    });
    setRows(merged);
  }, [selChallans]);

  const updateRow = (i: number, key: string, val: any) => {
    setRows(prev => { const a = [...prev]; a[i] = { ...a[i], [key]: val }; return a; });
  };

  const activeRows = rows.filter(r => r.enabled && r.return_qty > 0);
  const overLimit = rows.some(r => r.enabled && r.return_qty > r.balance_qty);

  const toggleChallan = (cn: any) => {
    setSelChallans(prev => {
      const has = prev.find(x => x.challan_no === cn.challan_no);
      return has ? prev.filter(x => x.challan_no !== cn.challan_no) : [...prev, cn];
    });
  };

  const handleSubmit = () => {
    if (activeRows.length === 0) { alert("Select at least one item with Return Qty > 0"); return; }
    if (overLimit) { alert("Return Qty exceeds Balance Qty"); return; }
    const finalDest = dest === "GODOWN" ? "GODOWN" : destSite;
    if (!finalDest) { alert("Select destination"); return; }
    const mobRefs = Array.from(new Set(activeRows.map(r => r.mob_challan_no))).join(", ");
    onSave({
      from_site: selSite, to_site: finalDest, vehicle_no: vehicle, remarks, mob_refs: mobRefs,
      items: activeRows.map(r => ({
        item_id: r.item_id, item_name: r.item_name, item_alias: r.item_alias,
        unit: r.unit, condition: r.condition, qty: r.return_qty, mob_challan_ref: r.mob_challan_no
      }))
    });
  };

  const STEPS = ["1. Site", "2. Challans", "3. Items", "4. Destination", "5. Details & Confirm"];
  
  return (
    <div>
      <div style={{ display: "flex", marginBottom: 20, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
        {STEPS.map((lbl, i) => {
          const sn = i + 1; const active = step === sn; const done = step > sn;
          return (
            <div key={lbl} style={{ flex: 1, padding: "7px 2px", textAlign: "center", fontSize: 9, fontWeight: 700, background: done ? "#dcfce7" : active ? "#b45309" : "#f8fafc", color: done ? "#166534" : active ? "#fff" : "#94a3b8", fontFamily: "IBM Plex Mono, monospace", cursor: done ? "pointer" : "default", borderRight: i < 4 ? "1px solid #e2e8f0" : "none" }} onClick={done ? () => setStep(sn) : undefined}>
              {(done ? "✓ " : "") + lbl}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        mobSites.length === 0 ? (
          <div style={{ padding: 24, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 12, textAlign: "center" }}>
            ⚠ No mobilization challans found. Please create mobilization records first.
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>Select the site from which items should be returned:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 16 }}>
              {mobSites.map(site => {
                const isSel = selSite === site;
                return (
                  <div key={site} onClick={() => { setSelSite(site); setSelChallans([]); setRows([]); }} style={{ border: `2px solid ${isSel ? "#b45309" : "#e2e8f0"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", background: isSel ? "#fffbeb" : "#fff", transition: "all 0.15s" }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13, marginBottom: 4 }}>{site}</div>
                    <div style={{ fontSize: 10, color: "#b45309", fontFamily: "monospace" }}>{mobChallans.filter(c => c.to_site === site).length} mob record(s)</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              {selSite && <Button onClick={() => setStep(2)} style={{ backgroundColor: "#b45309", borderColor: "#b45309" }}>Next →</Button>}
            </div>
          </div>
        )
      )}

      {step === 2 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>📋 Mobilization Challans — {selSite}</div>
            <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{selChallans.length} selected</span>
          </div>
          {siteChallans.length === 0 ? (
            <div style={{ padding: 24, background: "#f8fafc", borderRadius: 8, color: "#94a3b8", fontSize: 12, textAlign: "center" }}>No pending balance for {selSite}.</div>
          ) : (
            <div style={{ display: "grid", gap: 8, maxHeight: 380, overflowY: "auto" }}>
              {siteChallans.map((cn: any) => {
                const isSel = !!selChallans.find(x => x.challan_no === cn.challan_no);
                return (
                  <div key={cn.challan_no} style={{ border: `2px solid ${isSel ? "#b45309" : "#e2e8f0"}`, borderRadius: 8, padding: "12px 14px", cursor: "pointer", background: isSel ? "#fffbeb" : "#fff" }} onClick={() => toggleChallan(cn)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={isSel} readOnly style={{ accentColor: "#b45309", width: 14, height: 14 }} />
                        <span style={{ fontWeight: 800, fontSize: 12, fontFamily: "monospace", color: "#b45309" }}>{cn.challan_no}</span>
                        <span style={{ fontSize: 10, color: "#64748b" }}>{new Date(cn.date).toLocaleDateString("en-IN")}</span>
                      </div>
                      <span style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>{cn.pendingItems.length} pending item(s)</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                      {cn.pendingItems.map((it: any) => (
                        <span key={it.item_name} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 8px", fontSize: 10, color: "#475569" }}>{it.item_name} × {it.balance_qty} {it.unit}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              {selChallans.length > 0 && <Button onClick={() => setStep(3)} style={{ backgroundColor: "#b45309", borderColor: "#b45309" }}>Load Items →</Button>}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>Items from {selChallans.length} challan(s) at {selSite}. Check items and enter return qty.</div>
          {rows.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", background: "#f8fafc", borderRadius: 8, color: "#94a3b8" }}>No items loaded</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#b45309" }}>
                    {[["", 30], ["Item", "auto"], ["Unit", 55], ["Mob Challan", 100], ["Mob Qty", 70], ["Demobbed", 70], ["Balance", 70], ["Return Qty", 90]].map((h: any) => (
                      <th key={h[0]} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, color: "#fff", fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap", width: h[1] }}>{h[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const over = row.enabled && row.return_qty > row.balance_qty;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: over ? "#fef2f2" : row.enabled ? "#f0fdf4" : "#fff" }}>
                        <td style={{ padding: "8px 10px" }}><input type="checkbox" checked={row.enabled} style={{ accentColor: "#b45309", width: 14, height: 14 }} onChange={e => { updateRow(i, "enabled", e.target.checked); updateRow(i, "return_qty", e.target.checked ? row.balance_qty : 0); }} /></td>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>{row.item_name}{row.item_alias && <div style={{ fontSize: 9, color: "#94a3b8" }}>{row.item_alias}</div>}</td>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{row.unit}</td>
                        <td style={{ padding: "8px 10px" }}><span style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 4, padding: "2px 6px", fontSize: 9, fontFamily: "monospace" }}>{row.mob_challan_no}</span></td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: "#0369a1" }}>{row.mob_qty}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "monospace", color: "#dc2626" }}>{row.demobbed_qty}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: "#059669" }}>{row.balance_qty}</td>
                        <td style={{ padding: "6px 8px" }}><input type="number" min={0} max={row.balance_qty} value={row.return_qty || ""} disabled={!row.enabled} onChange={e => updateRow(i, "return_qty", Math.min(parseInt(e.target.value) || 0, row.balance_qty))} style={{ width: 72, padding: "5px 7px", border: `1px solid ${over ? "#dc2626" : "#e2e8f0"}`, borderRadius: 5, fontSize: 12, outline: "none", background: !row.enabled ? "#f8fafc" : "#fff", fontWeight: 700, textAlign: "center" }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {overLimit && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", marginTop: 8, fontSize: 12, color: "#dc2626" }}>⚠ Return Qty exceeds Balance Qty for one or more items</div>}
          {activeRows.length > 0 && !overLimit && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "8px 12px", marginTop: 8, fontSize: 11, color: "#166534", fontFamily: "monospace" }}>{activeRows.length} item type(s) | Total return qty: {activeRows.reduce((s, r) => s + r.return_qty, 0)}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              {activeRows.length > 0 && !overLimit && <Button onClick={() => setStep(4)} style={{ backgroundColor: "#b45309", borderColor: "#b45309" }}>Next →</Button>}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 14 }}>Where are the items being sent?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div onClick={() => { setDest("GODOWN"); setDestSite(""); }} style={{ border: `2px solid ${dest === "GODOWN" ? "#b45309" : "#e2e8f0"}`, borderRadius: 10, padding: "22px 16px", cursor: "pointer", textAlign: "center", background: dest === "GODOWN" ? "#fffbeb" : "#fff" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🏢</div>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>Return to GODOWN</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Central store / warehouse</div>
            </div>
            <div onClick={() => setDest("SITE")} style={{ border: `2px solid ${dest === "SITE" ? "#b45309" : "#e2e8f0"}`, borderRadius: 10, padding: "22px 16px", cursor: "pointer", textAlign: "center", background: dest === "SITE" ? "#fffbeb" : "#fff" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🏗</div>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>Transfer to Another Site</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Direct mobilization to another project</div>
            </div>
          </div>
          {dest === "SITE" && (
            <div style={{ marginBottom: 12 }}>
              <label style={LS}>Select Destination Site</label>
              <select value={destSite} onChange={e => setDestSite(e.target.value)} style={SI}>
                <option value="">-- Select Site --</option>
                {(sites || []).filter(s => s !== selSite && s !== "GODOWN").map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <Button variant="ghost" onClick={() => setStep(3)}>← Back</Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              {(dest === "GODOWN" || (dest === "SITE" && destSite)) && <Button onClick={() => setStep(5)} style={{ backgroundColor: "#b45309", borderColor: "#b45309" }}>Next →</Button>}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={LS}>Vehicle No. / Transport (Optional)</label>
              <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="e.g. KA-01-AB-1234" style={SI} />
            </div>
            <div>
              <label style={LS}>Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for demobilization..." rows={3} style={{ ...SI, resize: "vertical" } as any} />
            </div>
          </div>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 16px", fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 10 }}>📦 Demobilization Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div><span style={{ color: "#64748b" }}>From: </span><b>{selSite}</b></div>
              <div><span style={{ color: "#64748b" }}>To: </span><b>{dest === "GODOWN" ? "GODOWN" : destSite}</b></div>
              <div><span style={{ color: "#64748b" }}>Mob refs: </span><b style={{ fontSize: 10, fontFamily: "monospace" }}>{Array.from(new Set(activeRows.map(r => r.mob_challan_no))).join(", ")}</b></div>
              <div><span style={{ color: "#64748b" }}>Items: </span><b>{activeRows.length} type(s), {activeRows.reduce((s, r) => s + r.return_qty, 0)} total qty</b></div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 6 }}>
              <thead>
                <tr style={{ background: "#fde68a" }}>
                  {["Item", "Unit", "Mob Challan", "Return Qty"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, color: "#92400e", fontWeight: 700, letterSpacing: 1 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {activeRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #fde68a" }}>
                    <td style={{ padding: "5px 8px", fontWeight: 600 }}>{r.item_name}</td>
                    <td style={{ padding: "5px 8px", color: "#64748b" }}>{r.unit}</td>
                    <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 10, color: "#92400e" }}>{r.mob_challan_no}</td>
                    <td style={{ padding: "5px 8px", fontFamily: "monospace", fontWeight: 800, color: "#b45309" }}>{r.return_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <Button variant="ghost" onClick={() => setStep(4)}>← Back</Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} style={{ backgroundColor: "#b45309", borderColor: "#b45309", padding: "10px 28px" }}>
                {saving ? "⏳ Saving..." : "✓ GENERATE DEMOB CHALLAN"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
