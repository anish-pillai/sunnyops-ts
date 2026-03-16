import React, { useState } from 'react';
import type { InventoryItem } from '@/types/inventory.types';
import { Button } from '@/components/ui';

interface Props {
  sites: string[];
  items: InventoryItem[];
  user: any;
  uName?: string;
  saving: boolean;
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

export function MobilizationModal({ sites, items, user, uName, saving, onClose, onSave }: Props) {
  const GODOWN_ITEMS = items.filter(i => i.site === "GODOWN");
  
  const [f, setF] = useState({ site: sites[0] || "MRPL", purpose: "", priority: "Normal", required_by: "" });
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  
  const makeRow = (name: string) => {
    const gi = GODOWN_ITEMS.find(i => i.name.trim().toLowerCase() === name.toLowerCase());
    return { name, qty_requested: 1, qty_approved: 0, godown_stock: gi ? gi.qty : 0, item_id: gi ? gi.id : null, unit: gi ? gi.unit : "Nos", inv_status: "pending", enabled: true };
  };

  const [checklist, setChecklist] = useState<any[]>([]);
  const [customItem, setCustomItem] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [hlIdx, setHlIdx] = useState(-1);

  const updateItem = (idx: number, key: string, val: any) => {
    setChecklist(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [key]: val };
      return arr;
    });
  };

  const filteredSuggestions = customItem.trim().length > 0
    ? GODOWN_ITEMS.filter(i => i.name.toLowerCase().includes(customItem.trim().toLowerCase()) && !checklist.some(c => c.name.trim().toLowerCase() === i.name.trim().toLowerCase())).slice(0, 8)
    : [];

  const addCustom = (selItem: any) => {
    const name = selItem ? selItem.name : customItem.trim();
    if (!name) return;
    setChecklist(prev => [...prev, makeRow(name)]);
    setCustomItem("");
    setShowDrop(false);
  };

  const submit = () => {
    if (!f.site || !f.purpose.trim()) { alert("Site and Purpose are required"); return; }
    const selected = checklist.filter(it => it.qty_requested > 0);
    if (selected.length === 0) { alert("Select at least one item with quantity"); return; }
    onSave({
      request_type: "Mobilization",
      item_name: "Mobilization: " + f.purpose,
      qty: selected.length,
      requesting_site: f.site,
      required_by: f.required_by || null,
      priority: f.priority,
      remarks: JSON.stringify(selected),
      status: "Pending",
      raised_by: user?.id,
      raised_by_name: uName,
      created_at: new Date().toISOString()
    });
  };

  const activeCount = checklist.filter(it => it.enabled && it.qty_requested > 0).length;
  const shortfallCount = checklist.filter(it => it.enabled && it.qty_requested > 0 && it.godown_stock < it.qty_requested).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Field label="Destination Site *">
          <select value={f.site} onChange={e => s("site", e.target.value)} style={SI}>
            {sites.map(st => <option key={st}>{st}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={f.priority} onChange={e => s("priority", e.target.value)} style={SI}>
            {["Normal", "Urgent"].map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Purpose / Work Description *">
            <Inp value={f.purpose} onChange={(e: any) => s("purpose", e.target.value)} placeholder="e.g. Shutdown - MRPL Unit 4" />
          </Field>
        </div>
        <Field label="Required By Date">
          <Inp type="date" value={f.required_by} onChange={(e: any) => s("required_by", e.target.value)} />
        </Field>
      </div>

      {activeCount > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#166534" }}>
            <b>{activeCount}</b> items selected
          </div>
          {shortfallCount > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#dc2626" }}>
              ⚠ <b>{shortfallCount}</b> items below GODOWN stock
            </div>
          )}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginBottom: 12, maxHeight: 340, overflowY: "auto" }}>
        <div style={{ background: "#f8fafc", padding: "8px 14px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 90px 80px", gap: 8, fontSize: 10, fontWeight: 700, color: "#64748b", fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1 }}>
            <span /><span>ITEM</span><span>QTY NEED</span><span>GODOWN STK</span><span>STATUS</span>
          </div>
        </div>
        {checklist.map((it, idx) => {
          const shortfall = it.enabled && it.qty_requested > 0 && it.godown_stock < it.qty_requested;
          const ok = it.enabled && it.qty_requested > 0 && it.godown_stock >= it.qty_requested;
          return (
            <div key={idx} style={{ padding: "8px 14px", borderBottom: "1px solid #f1f5f9", background: it.enabled ? (shortfall ? "#fff8f8" : "#f0fdf4") : "#fff" }}>
              <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 90px 80px", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={it.enabled} onChange={e => { updateItem(idx, "enabled", e.target.checked); if (e.target.checked && it.qty_requested === 0) updateItem(idx, "qty_requested", 1); }} />
                <span style={{ fontWeight: it.enabled ? 700 : 400, color: it.enabled ? "#0f172a" : "#64748b", fontSize: 13 }}>{it.name}</span>
                <input type="number" min={0} value={it.qty_requested} onChange={e => updateItem(idx, "qty_requested", parseInt(e.target.value) || 0)} disabled={!it.enabled} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 12, fontFamily: "IBM Plex Mono, monospace", background: it.enabled ? "#fff" : "#f8fafc" }} />
                <span style={{ fontSize: 12, color: it.godown_stock > 0 ? "#16a34a" : "#94a3b8", fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>{it.godown_stock > 0 ? `${it.godown_stock} ${it.unit}` : "Not in GODOWN"}</span>
                {ok ? <span style={{ fontSize: 10, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 6px", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>✓ OK</span>
                  : shortfall ? <span style={{ fontSize: 10, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 4, padding: "2px 6px", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>⚠ SHORT</span>
                    : <span />}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={customItem}
            onChange={e => { setCustomItem(e.target.value); setShowDrop(true); setHlIdx(-1); }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => { setShowDrop(false); setHlIdx(-1); }, 200)}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setShowDrop(true); setHlIdx(h => Math.min(h + 1, filteredSuggestions.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHlIdx(h => Math.max(h - 1, -1)); }
              else if (e.key === "Enter") { e.preventDefault(); if (hlIdx >= 0 && filteredSuggestions[hlIdx]) { addCustom(filteredSuggestions[hlIdx]); setHlIdx(-1); } else { addCustom(null); } }
              else if (e.key === "Escape") { setShowDrop(false); setHlIdx(-1); }
            }}
            placeholder="Search GODOWN inventory to add items..."
            style={{ ...SI, flex: 1, outline: "none" } as any}
            autoComplete="off"
          />
          <Button variant="ghost" onClick={() => addCustom(null)} style={{ fontSize: 11, whiteSpace: "nowrap" }}>+ Add</Button>
        </div>
        {showDrop && filteredSuggestions.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 48, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", zIndex: 999, maxHeight: 220, overflowY: "auto" }}>
            {filteredSuggestions.map((item, idx2) => {
              const isHl = idx2 === hlIdx;
              return (
                <div key={item.id} onMouseDown={e => { e.preventDefault(); addCustom(item); setHlIdx(-1); }} style={{ padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: isHl ? "#eff6ff" : "#fff" }} onMouseEnter={() => setHlIdx(idx2)} onMouseLeave={() => setHlIdx(-1)}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: isHl ? "#0369a1" : "#0f172a" }}>{item.name}</span>
                  <span style={{ fontSize: 11, color: "#16a34a", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>GODOWN: {item.qty} {item.unit}</span>
                </div>
              );
            })}
          </div>
        )}
        {showDrop && customItem.trim().length > 0 && filteredSuggestions.length === 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 48, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e", zIndex: 999 }}>
            ⚠ {customItem} not found in GODOWN — will be added without stock check
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Button onClick={submit} disabled={saving} variant="primary" style={{ flex: 1, padding: "10px 0" }}>{saving ? "Submitting..." : "🏢 Submit Mobilization Request"}</Button>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: "10px 0" }}>Cancel</Button>
      </div>
    </div>
  );
}
