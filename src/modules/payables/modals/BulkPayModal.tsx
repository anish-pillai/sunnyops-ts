import React, { useMemo } from 'react';
import type { Payable } from '@/types/bill.types';
import { Button } from '@/components/ui';

interface BulkPayForm {
  vendor: string;
  amount: string;
  paid_date: string;
  payment_mode: string;
  remarks: string;
}

export interface BulkPayPreviewRow {
  p: Payable;
  pay: number;
  status: string;
  partial: boolean;
}

interface Props {
  payables: Payable[];
  form: BulkPayForm;
  setForm: React.Dispatch<React.SetStateAction<BulkPayForm>>;
  result: { ok: boolean; msg: string } | null;
  setResult: React.Dispatch<React.SetStateAction<{ ok: boolean; msg: string } | null>>;
  onConfirm: (preview: BulkPayPreviewRow[], form: BulkPayForm) => void;
  onClose: () => void;
  saving: boolean;
}

export const BulkPayModal: React.FC<Props> = ({
  payables, form, setForm, result, setResult, onConfirm, onClose, saving
}) => {
  const fmt = (n: number) => n > 0 ? "₹" + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "₹0";

  const uniqueVendors = useMemo(() => {
    return Array.from(new Set(payables.filter(p => p.status !== "Paid").map(p => p.vendor))).sort();
  }, [payables]);

  const pendingForVendor = useMemo(() => {
    return payables.filter(p => p.vendor === form.vendor && p.status !== "Paid" && parseFloat(p.amount as string || "0") > 0)
      .sort((a, b) => (a.due_date || "9999") < (b.due_date || "9999") ? -1 : 1);
  }, [payables, form.vendor]);

  const totalPending = pendingForVendor.reduce((s, p) => s + parseFloat(p.amount as string || "0"), 0);

  const preview = useMemo(() => {
    const arr: BulkPayPreviewRow[] = [];
    let remaining = parseFloat(form.amount || "0");
    if (remaining > 0 && pendingForVendor.length > 0) {
      pendingForVendor.forEach(p => {
        const due = parseFloat(p.amount as string || "0");
        if (remaining <= 0) {
          arr.push({ p, pay: 0, status: "Pending", partial: false });
        } else if (remaining >= due) {
          arr.push({ p, pay: due, status: "Paid", partial: false });
          remaining -= due;
        } else {
          arr.push({ p, pay: remaining, status: "Partial", partial: true });
          remaining = 0;
        }
      });
    }
    return arr;
  }, [form.amount, pendingForVendor]);

  const excess = Math.max(0, parseFloat(form.amount || "0") - totalPending);

  const iStyle = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontFamily: "IBM Plex Mono,monospace", fontSize: 12, outline: "none" };
  const lStyle: React.CSSProperties = { display: "block", fontSize: 10, color: "#64748b", fontFamily: "IBM Plex Mono,monospace", letterSpacing: 1, marginBottom: 4 };

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={lStyle}>VENDOR</label>
          <select value={form.vendor} onChange={e => { setForm(f => ({ ...f, vendor: e.target.value })); setResult(null); }} style={iStyle}>
            <option value="">-- Select Vendor --</option>
            {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={lStyle}>PAYMENT AMOUNT (₹)</label>
          <input type="number" value={form.amount} onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setResult(null); }} placeholder="0" style={iStyle} />
        </div>
        <div>
          <label style={lStyle}>PAYMENT DATE</label>
          <input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} style={iStyle} />
        </div>
        <div>
          <label style={lStyle}>PAYMENT MODE</label>
          <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))} style={iStyle}>
            {["NEFT", "RTGS", "IMPS", "Cheque", "Cash", "UPI"].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lStyle}>REMARKS / UTR NO</label>
        <input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="UTR/Ref number..." style={iStyle} />
      </div>

      {form.vendor && pendingForVendor.length > 0 && parseFloat(form.amount || "0") > 0 && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", fontFamily: "IBM Plex Mono,monospace", letterSpacing: 1, marginBottom: 8 }}>PAYMENT SPLIT PREVIEW — Oldest invoices settled first</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["#", "INVOICE / DESC", "SITE", "DUE DATE", "INVOICE AMT", "PAY NOW", "STATUS"].map((h, i) => (
                    <th key={i} style={{ padding: "6px 8px", textAlign: i >= 4 ? "right" : "left", fontFamily: "IBM Plex Mono,monospace", fontSize: 10, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: r.pay > 0 ? (r.partial ? "#fffbeb" : "#f0fdf4") : "#fff" }}>
                    <td style={{ padding: "6px 8px", fontSize: 11, color: "#94a3b8" }}>{i + 1}</td>
                    <td style={{ padding: "6px 8px", fontFamily: "IBM Plex Mono,monospace", fontSize: 11, color: "#f97316" }}>{r.p.invoice_no || r.p.description || "-"}</td>
                    <td style={{ padding: "6px 8px", fontSize: 11 }}>{r.p.site || "-"}</td>
                    <td style={{ padding: "6px 8px", fontSize: 11, color: "#64748b" }}>{r.p.due_date ? new Date(r.p.due_date).toLocaleDateString("en-IN") : "-"}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "IBM Plex Mono,monospace", fontSize: 11 }}>{fmt(parseFloat(r.p.amount as string || "0"))}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: r.pay > 0 ? 700 : 400, color: r.pay > 0 ? "#16a34a" : "#94a3b8" }}>{r.pay > 0 ? fmt(r.pay) : "-"}</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>
                      {r.pay <= 0 ? <span style={{ fontSize: 9, background: "#f1f5f9", color: "#94a3b8", padding: "2px 8px", borderRadius: 4, fontFamily: "IBM Plex Mono,monospace" }}>PENDING</span> :
                        r.partial ? <span style={{ fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 4, fontFamily: "IBM Plex Mono,monospace" }}>PARTIAL</span> :
                          <span style={{ fontSize: 9, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 4, fontFamily: "IBM Plex Mono,monospace" }}>PAID</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {excess > 0 && <div style={{ marginTop: 8, padding: "6px 10px", background: "#fff7ed", borderRadius: 6, fontSize: 11, color: "#92400e", fontFamily: "IBM Plex Mono,monospace" }}>⚠ EXCESS: {fmt(excess)} — Payment exceeds total pending for this vendor</div>}
          {parseFloat(form.amount || "0") < totalPending && <div style={{ marginTop: 8, padding: "6px 10px", background: "#f0fdf4", borderRadius: 6, fontSize: 11, color: "#166534", fontFamily: "IBM Plex Mono,monospace" }}>Balance remaining after payment: {fmt(totalPending - parseFloat(form.amount || "0"))}</div>}
        </div>
      )}

      {form.vendor && pendingForVendor.length === 0 && (
        <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: 8, fontSize: 12, color: "#166534", textAlign: "center", marginBottom: 12 }}>✅ No pending invoices for {form.vendor}</div>
      )}
      {result && (
        <div style={{ padding: "10px 14px", background: result.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, marginBottom: 12, fontSize: 12, color: result.ok ? "#166534" : "#dc2626", fontFamily: "IBM Plex Mono,monospace" }}>{result.msg}</div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        <Button variant="ghost" onClick={onClose} style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, padding: "8px 20px" }}>CANCEL</Button>
        {preview.filter(r => r.pay > 0).length > 0 && !result && (
          <Button onClick={() => { if (!form.paid_date) { alert("Paid Date is required"); return; } onConfirm(preview, form); }} disabled={saving} style={{ background: saving ? "#94a3b8" : "#7c3aed", borderColor: saving ? "#94a3b8" : "#7c3aed", color: "#fff", fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 700, padding: "8px 24px" }}>
            {saving ? "Processing..." : "✓ CONFIRM & APPLY PAYMENT"}
          </Button>
        )}
      </div>
    </div>
  );
};
