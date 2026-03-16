import React from 'react';
import { Button } from '@/components/ui';
import type { Payable } from '@/types/bill.types';

interface Payload extends Omit<Payable, 'id'> {
  id?: string;
}

interface Props {
  form: Partial<Payload>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Payload>>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  sites: string[];
}

export const PayableFormModal: React.FC<Props> = ({
  form,
  setForm,
  saving,
  onSave,
  onClose,
  sites,
}) => {
  const CATEGORIES = [
    "Material", "Labour", "Equipment Hire", "Transport", "Service",
    "Subcontract", "Utility", "Monthly Salary", "Site Expense",
    "Head Office Expense", "Other"
  ];

  const STATUSES = ["Pending", "Paid", "On Hold", "Partial"];

  const PAYMENT_MODES = ["NEFT", "RTGS", "Cheque", "Cash", "UPI"];

  const handleAmountChange = (val: string) => {
    const a = val;
    const g = parseFloat(form.gst_percent || "0");
    setForm(f => ({
      ...f,
      amount: a,
      amount_with_gst: a && g >= 0 ? String(Math.round(parseFloat(a || "0") * (1 + g / 100))) : ""
    }));
  };

  const handleGstChange = (val: string) => {
    const g = parseFloat(val || "0");
    setForm(f => ({
      ...f,
      gst_percent: val,
      amount_with_gst: f.amount ? String(Math.round(parseFloat(f.amount as string || "0") * (1 + g / 100))) : ""
    }));
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, outline: "none" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "0 4px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label="Vendor / Supplier *">
        <input style={inputStyle} value={form.vendor || ""} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Supplier name" />
      </Field>
      <Field label="Vendor GSTIN">
        <input style={inputStyle} value={form.vendor_gstin || ""} onChange={e => setForm(f => ({ ...f, vendor_gstin: e.target.value }))} placeholder="29XXXXX" />
      </Field>
      <Field label="Site">
        <select style={inputStyle} value={form.site || ""} onChange={e => setForm(f => ({ ...f, site: e.target.value }))}>
          <option value="">Select a site</option>
          {sites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select style={inputStyle} value={form.category || "Material"} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Invoice No.">
        <input style={inputStyle} value={form.invoice_no || ""} onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))} placeholder="Vendor invoice ref" />
      </Field>
      <Field label="PO / WO No.">
        <input style={inputStyle} value={form.po_no || ""} onChange={e => setForm(f => ({ ...f, po_no: e.target.value }))} placeholder="Purchase / work order no." />
      </Field>
      <Field label="Base Amount (₹) *">
        <input style={inputStyle} type="number" value={form.amount || ""} onChange={e => handleAmountChange(e.target.value)} placeholder="0" />
      </Field>
      <Field label="GST %">
        <select style={inputStyle} value={form.gst_percent || "18"} onChange={e => handleGstChange(e.target.value)}>
          {["0", "5", "12", "18", "28"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Total with GST (₹)">
        <input style={inputStyle} type="number" value={form.amount_with_gst || ""} onChange={e => setForm(f => ({ ...f, amount_with_gst: e.target.value }))} placeholder="Auto-calculated" />
      </Field>
      <Field label="Due Date *">
        <input style={inputStyle} type="date" value={form.due_date || ""} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
      </Field>
      <Field label="Status">
        <select style={inputStyle} value={form.status || "Pending"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Paid Date">
        <input style={inputStyle} type="date" value={form.paid_date || ""} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
      </Field>
      <Field label="Payment Mode">
        <select style={inputStyle} value={form.payment_mode || ""} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}>
          <option value="">Select</option>
          {PAYMENT_MODES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <div style={{ gridColumn: "1/-1" }}>
        <Field label="Description / Work Details">
          <input style={inputStyle} value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Materials supplied / work done for..." />
        </Field>
      </div>
      <div style={{ gridColumn: "1/-1" }}>
        <Field label="Remarks">
          <input style={inputStyle} value={form.remarks || ""} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Any additional notes" />
        </Field>
      </div>

      <div style={{ gridColumn: "1/-1", display: "flex", gap: 10, marginTop: 12 }}>
        <Button onClick={onSave} disabled={saving} variant="primary" style={{ flex: 1, padding: "10px 0" }}>
          {saving ? "Saving..." : (form.id ? "Update Payable" : "Save Payable")}
        </Button>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1, padding: "10px 0" }}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
