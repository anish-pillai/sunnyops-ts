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

export function NewRequestModal({ sites, items, user, uName, saving, onClose, onSave }: Props) {
  const [f, setF] = useState({
    request_type: "From Stock",
    item_name: "",
    item_id: "",
    qty: 1,
    requesting_site: sites[0] || "MRPL",
    required_by: "",
    priority: "Normal",
    remarks: ""
  });

  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.item_name.trim()) { alert("Item name required"); return; }
    onSave({
      request_type: f.request_type,
      item_name: f.item_name,
      item_id: f.request_type === "From Stock" && f.item_id ? Number(f.item_id) : null,
      qty: Number(f.qty) || 1,
      requesting_site: f.requesting_site,
      required_by: f.required_by || null,
      priority: f.priority,
      remarks: f.remarks,
      status: "Pending",
      raised_by: user?.id,
      raised_by_name: uName,
      created_at: new Date().toISOString()
    });
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {["From Stock", "Purchase New"].map(t => (
          <button
            key={t}
            onClick={() => s("request_type", t)}
            style={{
              flex: 1, padding: "10px", borderRadius: 8,
              border: `2px solid ${f.request_type === t ? "#f97316" : "#e2e8f0"}`,
              background: f.request_type === t ? "#fff7ed" : "#f8fafc",
              color: f.request_type === t ? "#f97316" : "#64748b",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
              fontFamily: "IBM Plex Mono, monospace", letterSpacing: 1
            }}
          >
            {t === "From Stock" ? "📦 From Stock" : "🛒 Purchase New"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Item *">
            {f.request_type === "From Stock" ? (
              <select
                value={f.item_id}
                onChange={e => {
                  const item = items.find(i => String(i.id) === String(e.target.value));
                  s("item_id", e.target.value);
                  if (item) s("item_name", item.name);
                }}
                style={SI}
              >
                <option value="">-- Select from inventory --</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{`${i.name} (${i.site} - Qty: ${i.qty})`}</option>
                ))}
              </select>
            ) : (
              <Inp value={f.item_name} onChange={(e: any) => s("item_name", e.target.value)} placeholder="e.g. Angle Grinder 7 inch" />
            )}
          </Field>
        </div>

        <Field label="Quantity Needed">
          <Inp type="number" value={f.qty} onChange={(e: any) => s("qty", e.target.value)} min="1" />
        </Field>

        <Field label="Requesting Site">
          <select value={f.requesting_site} onChange={e => s("requesting_site", e.target.value)} style={SI}>
            {sites.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </Field>

        <Field label="Required By Date">
          <Inp type="date" value={f.required_by} onChange={(e: any) => s("required_by", e.target.value)} />
        </Field>

        <Field label="Priority">
          <div style={{ display: "flex", gap: 10 }}>
            {["Normal", "Urgent"].map(p => (
              <button
                key={p}
                onClick={() => s("priority", p)}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8,
                  border: `2px solid ${f.priority === p ? (p === "Urgent" ? "#dc2626" : "#16a34a") : "#e2e8f0"}`,
                  background: f.priority === p ? (p === "Urgent" ? "#fef2f2" : "#f0fdf4") : "#f8fafc",
                  color: f.priority === p ? (p === "Urgent" ? "#dc2626" : "#16a34a") : "#64748b",
                  fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "IBM Plex Mono, monospace"
                }}
              >
                {p === "Urgent" ? "🚨 Urgent" : "✅ Normal"}
              </button>
            ))}
          </div>
        </Field>

        <div style={{ gridColumn: "1/-1" }}>
          <Field label="Remarks (optional)">
            <textarea
              value={f.remarks}
              onChange={e => s("remarks", e.target.value)}
              placeholder="Any additional details..."
              style={{ ...SI, height: 70, resize: "vertical" } as any}
            />
          </Field>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Button onClick={submit} disabled={saving} variant="primary" style={{ flex: 1, padding: "10px 0" }}>
          {saving ? "Submitting..." : "Submit Request"}
        </Button>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: "10px 0" }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
