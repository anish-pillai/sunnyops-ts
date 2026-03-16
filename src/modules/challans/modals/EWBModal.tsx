import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { db } from '@/config/supabase';
import type { Challan } from '@/types/challan.types';
import { DEFAULT_SITE_DETAILS } from '@/config/constants';

interface Props {
  challan: Challan;
  onClose: () => void;
  onSaved: (ewbNo: string) => void;
}

export const EWBModal: React.FC<Props> = ({ challan, onClose, onSaved }) => {
  const [vehicleNo, setVehicleNo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ ewbNo: string; validUpto?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const ewbAlready = challan.ewb_no || null;
  const from = DEFAULT_SITE_DETAILS.find(s => s.name === challan.from_site) || { name: challan.from_site };
  const to = DEFAULT_SITE_DETAILS.find(s => s.name === challan.to_site) || { name: challan.to_site };

  const prefillFields = [
    { label: "Supply Type", value: "Branch Transfer (Own Use)" },
    { label: "Document Type", value: "Delivery Challan" },
    { label: "Document No.", value: challan.challan_no },
    { label: "Document Date", value: challan.date ? new Date(challan.date).toLocaleDateString("en-IN") : '' },
    { label: "From GSTIN", value: (from as any).gstin || "29AAOCP5225B1ZE" },
    { label: "From Pincode", value: (from as any).pincode || "575030" },
    { label: "To GSTIN", value: (to as any).gstin || "N/A" },
    { label: "To Pincode", value: (to as any).pincode || "" },
    { label: "Item", value: challan.item_name },
  ];

  const generate = async () => {
    if (!vehicleNo.trim()) {
      alert("Enter vehicle number first");
      return;
    }
    setGenerating(true);
    setErr(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ewb`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: "generate",
          challan: challan,
          vehicleNo: vehicleNo.trim().toUpperCase(),
          siteDetails: DEFAULT_SITE_DETAILS
        })
      });

      const data = await response.json();
      setGenerating(false);

      if (data.success) {
        setResult({ ewbNo: data.ewbNo, validUpto: data.validUpto });
        await db.from("challans").update({ 
          ewb_no: data.ewbNo, 
          ewb_valid_upto: data.validUpto 
        }).eq("id", challan.id);
        onSaved(data.ewbNo);
      } else {
        setErr(data.error || "Generation failed");
      }
    } catch (e: any) {
      setGenerating(false);
      setErr(e.message || "Network error");
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
      {ewbAlready && !result && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>E-WAY BILL ALREADY GENERATED</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a", letterSpacing: 2 }}>{ewbAlready}</div>
          </div>
          <Button variant="ghost" onClick={() => copy(ewbAlready)} style={{ background: "#fff", borderColor: "#bbf7d0", color: "#16a34a", fontSize: 11 }}>COPY</Button>
        </div>
      )}

      {result && (
        <div style={{ background: "#f0fdf4", border: "2px solid #16a34a", borderRadius: 10, padding: "16px 20px", marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>✅ E-WAY BILL GENERATED</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#16a34a", letterSpacing: 3, marginBottom: 6 }}>{result.ewbNo}</div>
          {result.validUpto && <div style={{ fontSize: 12, color: "#64748b" }}>Valid upto: <b>{result.validUpto}</b></div>}
          <Button onClick={() => copy(result.ewbNo)} style={{ marginTop: 10, background: "#fff", borderColor: "#bbf7d0", color: "#16a34a", fontSize: 12 }}>COPY EWB NUMBER</Button>
        </div>
      )}

      {err && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#dc2626" }}>
          ⚠️ Error: {err}
        </div>
      )}

      {!result && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: 1, marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #e2e8f0" }}>CHALLAN DETAILS (auto-filled)</div>
          <div style={{ display: "grid", gap: 6 }}>
            {prefillFields.map(f => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px" }}>
                <span style={{ color: "#64748b", fontSize: 10, minWidth: 120 }}>{f.label}</span>
                <span style={{ color: "#0f172a", fontSize: 11, flex: 1, fontWeight: 600 }}>{f.value || "-"}</span>
                <Button variant="ghost" onClick={() => copy(f.value || "")} style={{ padding: "2px 8px", height: 'auto', fontSize: 9 }}>COPY</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#ea580c", marginBottom: 10, letterSpacing: 1 }}>PART B — VEHICLE DETAILS</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input 
              value={vehicleNo} 
              onChange={e => setVehicleNo(e.target.value.toUpperCase())} 
              placeholder="e.g. KA19AB1234" 
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 13, fontWeight: 700, letterSpacing: 2, outline: 'none' }} 
              maxLength={12} 
            />
            <Button 
              onClick={generate} 
              disabled={generating} 
              style={{ background: generating ? "#94a3b8" : "#16a34a", color: "#fff", padding: "10px 20px", fontWeight: 800, fontSize: 12 }}
            >
              {generating ? "Generating..." : "⬆️ Generate EWB"}
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Close</Button>
      </div>
    </div>
  );
};
