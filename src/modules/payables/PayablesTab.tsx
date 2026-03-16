import React, { useState, useMemo } from 'react';
import { usePayables } from '@/hooks/usePayables';
import { useBills } from '@/hooks/useBills';
import { useAuth } from '@/hooks/useAuth';
import { Button, Modal } from '@/components/ui';
import type { Payable, BankAccount, Bill } from '@/types/bill.types';

import { PayableFormModal } from './modals/PayableFormModal';
import { VendorLedgerModal, VendorLedgerData } from './modals/VendorLedgerModal';
import { BulkPayModal, BulkPayPreviewRow } from './modals/BulkPayModal';

export const PayablesTab: React.FC = () => {
  const auth = useAuth();
  const { payables, loading: pLoading, save: savePayable, remove: removePayable } = usePayables();
  const { bills } = useBills();

  const [vendorSearch, setVendorSearch] = useState('');
  const [modal, setModal] = useState<"form" | null>(null);
  const [vendorLedger, setVendorLedger] = useState<VendorLedgerData | null>(null);

  // Bank State (Local for now, as it's not in DB yet)
  const [banks] = useState<BankAccount[]>([]);
  const [bankBalance] = useState("0");
  const [bbUpdated] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Payable>>({});

  // Card details
  const [cardDetail, setCardDetail] = useState<string | null>(null);
  const [cdFrom, setCdFrom] = useState("");
  const [cdTo, setCdTo] = useState("");
  const [cdSite, setCdSite] = useState("");

  const [showBulkPay, setShowBulkPay] = useState(false);
  const [bpForm, setBpForm] = useState({ vendor: "", amount: "", paid_date: new Date().toISOString().slice(0, 10), payment_mode: "NEFT", remarks: "" });
  const [bpResult, setBpResult] = useState<{ ok: boolean, msg: string } | null>(null);

  const SITES = ["MRPL", "MEIL", "UPCL", "BTPS-Bellary", "Moxi", "Head Office", "GODOWN", "ADANI", "KPCL", "Anpara-Lanco"];

  const isAdmin = auth.userRole === 'admin' || auth.userRole === 'managing-director';
  const canEdit = isAdmin;
  const today = new Date();

  const filteredPayables = useMemo(() => {
    let res = payables;
    if (vendorSearch.trim()) {
      const q = vendorSearch.toLowerCase();
      res = res.filter(p => p.vendor?.toLowerCase().includes(q) || p.invoice_no?.toLowerCase().includes(q) || p.site?.toLowerCase().includes(q));
    }
    return res;
  }, [payables, vendorSearch]);

  const totalPending = payables.filter(p => p.status !== "Paid").reduce((s, p) => s + parseFloat(p.amount as string || "0"), 0);
  const totalPaid = payables.filter(p => p.status === "Paid").reduce((s, p) => s + parseFloat(p.amount as string || "0"), 0);
  const partialPaid = payables.filter(p => p.status === "Partial").reduce((s, p) => s + parseFloat(p.amount as string || "0"), 0);
  const overdue = payables.filter(p => p.status !== "Paid" && p.due_date && new Date(p.due_date) < today).length;

  const sitePay = payables.filter(p => p.status !== "Paid").reduce((acc: any, p) => {
    const s = p.site || "Other";
    if (!acc[s]) acc[s] = { count: 0, amt: 0 };
    acc[s].count++;
    acc[s].amt += parseFloat(p.amount as string || "0");
    return acc;
  }, {});

  const siteOutstanding = Object.keys(sitePay).map(s => ({ site: s, ...sitePay[s] })).sort((a, b) => b.amt - a.amt);

  const getBal = (b: Bill) => {
    const rec = (b.amount_credited || 0) + (b.tds || 0) + (b.tds_on_gst || 0) + (b.security_deposit || 0) + (b.hra_deduction || 0) + (b.gst_hold || 0) + (b.other_deductions || 0) + (b.credit_note || 0) + (b.credit_note2 || 0);
    return parseFloat(b.amount_with_gst as any || "0") - rec;
  };
  const totalReceivable = bills.filter(b => b.bill_status !== "CANCELLED").reduce((s, b) => s + getBal(b), 0);

  const bb = banks.reduce((s, b) => s + parseFloat(b.balance as any || "0"), parseFloat(bankBalance || "0"));
  const odUsed = banks.filter(b => (b as any).isOD && parseFloat(b.balance as any || "0") > 0).reduce((s, b) => s + parseFloat(b.balance as any || "0"), 0);
  const netPos = bb + totalReceivable - totalPending;
  const totalPaidDisplay = totalPaid + partialPaid;

  const fmt = (n: number) => n >= 10000000 ? (n / 10000000).toFixed(2) + "Cr" : n >= 100000 ? (n / 100000).toFixed(2) + "L" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const openForm = (p: Payable | null) => {
    if (p) {
      setForm({ ...p });
    } else {
      setForm({ amount: "", gst_percent: "18", amount_with_gst: "", due_date: "", paid_date: "", status: "Pending", category: "Material", payment_mode: "", site: SITES[0] });
    }
    setModal("form");
  };

  const handleSave = async () => {
    if (!form.vendor || !form.amount || !form.due_date) {
      alert("Vendor, Amount and Due Date are required");
      return;
    }
    if (!form.id && form.invoice_no && payables.find(p => p.vendor === form.vendor && p.invoice_no === form.invoice_no)) {
      if (!window.confirm(`Invoice No ${form.invoice_no} already exists for ${form.vendor}. Add anyway?`)) return;
    }
    setSaving(true);
    const payload = {
      ...form,
      amount: form.amount.toString(),
      amount_with_gst: form.amount_with_gst ? form.amount_with_gst.toString() : "",
      created_by: auth.userName,
    } as Omit<Payable, 'id' | 'created_at'>;
    
    const err = await savePayable(payload, form.id);
    setSaving(false);
    if (err) alert(err);
    else setModal(null);
  };

  const onDelete = async (id: string) => {
    setSaving(true);
    const err = await removePayable(id);
    setSaving(false);
    if (err) alert(err);
  };

  const openVendorLedger = (vendorName: string) => {
    const invs = payables.filter(p => p.vendor === vendorName).sort((a, b) => new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime());
    let tAmt = 0, tPaid = 0;
    invs.forEach(p => {
      const v = parseFloat(p.amount as string || "0");
      tAmt += v;
      if (p.status === "Paid") tPaid += v;
      if (p.status === "Partial" && p.paid_date) tPaid += (v / 2); // Approximation if no precise paid_amt
    });
    
    // Exact mapping for gst calculations 
    let tGst = 0;
    let tWithGst = 0;
    invs.forEach(p => {
       const b = parseFloat(p.amount as string || "0");
       const g = parseFloat(p.gst_percent || "18");
       const inc = p.amount_with_gst ? parseFloat(p.amount_with_gst as string) : b * (1 + g/100);
       tWithGst += inc;
       tGst += (inc - b);
    });

    setVendorLedger({
      vendor: vendorName,
      gstin: invs.find(p => p.vendor_gstin)?.vendor_gstin,
      totalAmt: tAmt,
      totalGst: tGst,
      totalWithGst: tWithGst,
      totalPaidAmt: tPaid,
      totalPendAmt: tAmt - tPaid,
      invoices: invs
    });
  };

  const onBulkPay = async (preview: BulkPayPreviewRow[], submitForm: any) => {
    for (let i = 0; i < preview.length; i++) {
        const row = preview[i];
        if (row.pay > 0) {
            const upd: any = { status: row.status, paid_date: submitForm.paid_date, payment_mode: submitForm.payment_mode };
            if (submitForm.remarks) upd.remarks = submitForm.remarks;
            await savePayable(upd, row.p.id);
        }
    }
    return { ok: true, msg: "Payment applied successfully!" };
  };

  const cardDetailItems = (key: string | null) => {
    if (!key) return [];
    let items = payables;
    if (cdSite) items = items.filter(p => p.site === cdSite);
    if (cdFrom && cdTo) items = items.filter(p => (p.due_date || "") >= cdFrom && (p.due_date || "") <= cdTo);

    if (key.startsWith("site:")) {
      const s = key.slice(5);
      return items.filter(p => p.site === s && p.status !== "Paid");
    }
    if (key === "outstanding") return items.filter(p => p.status !== "Paid");
    if (key === "overdue") return items.filter(p => p.status !== "Paid" && p.due_date && new Date(p.due_date) < today);
    if (key === "paid") return items.filter(p => p.status !== "Pending");
    if (key === "net") return items;
    return items;
  };



  if (pLoading && payables.length === 0) return <div style={{ padding: 40, textAlign: 'center' }}>Loading payables...</div>;

  return (
    <div>
      {siteOutstanding.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>OUTSTANDING BY SITE</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {siteOutstanding.map(s => (
              <div key={s.site} onClick={() => { setCdSite(s.site); setCardDetail("site:" + s.site); }} style={{ background: "#fff", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", cursor: "pointer", minWidth: 110, textAlign: "center", transition: "all .15s" }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>{s.site}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#dc2626", fontFamily: "IBM Plex Mono,monospace" }}>₹{Math.round(s.amt).toLocaleString("en-IN")}</div>
                <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{s.count} {s.count > 1 ? "invoices" : "invoice"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          { key: "outstanding", l: "OUTSTANDING PAYABLE", v: fmt(totalPending), c: "#dc2626", sub: `${payables.filter(p => p.status !== "Paid").length} pending` },
          { key: "overdue", l: "OVERDUE PAYABLES", v: overdue + " bills", c: "#ea580c", sub: "past due date" },
          { key: "receivable", l: "TOTAL RECEIVABLE", v: fmt(totalReceivable), c: "#f97316", sub: "from clients" },
          { key: "bank", l: "BANK BALANCE", v: bb > 0 ? fmt(bb) : "Not set", c: "#2563eb", sub: bbUpdated ? `Updated` : "Not updated yet", clickEdit: false },
          { key: "od", l: "OD UTILISED", v: odUsed > 0 ? fmt(odUsed) : "Nil", c: odUsed > 0 ? "#7c3aed" : "#16a34a", sub: odUsed > 0 ? "overdraft in use" : "no OD used" },
          { key: "net", l: "NET CASH POSITION", v: fmt(netPos), c: netPos >= 0 ? "#16a34a" : "#dc2626", sub: netPos >= 0 ? "surplus" : "deficit" },
          { key: "paid", l: "PAID THIS CYCLE", v: fmt(totalPaidDisplay), c: "#64748b", sub: `${payables.filter(p => p.status === "Paid").length} paid` },
        ].map(card => (
          <div key={card.l} onClick={() => { if (!card.clickEdit) setCardDetail(card.key); }} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 8, color: "#94a3b8", letterSpacing: 2 }}>{card.l}</div>
              <span style={{ fontSize: 8, color: card.c, background: card.c + "15", border: "1px solid " + card.c + "30", padding: "1px 5px", borderRadius: 3, letterSpacing: 0.5 }}>VIEW</span>
            </div>
            <div style={{ fontSize: card.v.length > 10 ? 16 : 22, fontWeight: 700, color: card.c, fontFamily: "IBM Plex Mono,monospace" }}>{card.v}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Payables Register</div>
        <div style={{ display: "flex", gap: 8 }}>
          {canEdit && <Button onClick={() => { setBpForm({ vendor: "", amount: "", paid_date: new Date().toISOString().slice(0, 10), payment_mode: "NEFT", remarks: "" }); setBpResult(null); setShowBulkPay(true); }} style={{ fontSize: 10, background: "#0891b2", borderColor: "#0891b2" }}>💸 Bulk Payment</Button>}
          {canEdit && <Button onClick={() => openForm(null)} style={{ fontSize: 10 }}>+ Add Payable</Button>}
        </div>
      </div>

      <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <input type="text" placeholder="🔍 Search vendor, invoice, site..." value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, outline: "none", background: "#f8fafc" }} />
        {vendorSearch.trim() && <span style={{ fontSize: 11, color: "#64748b" }}>{filteredPayables.length} results</span>}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Vendor", "Site", "Description", "Amount", "GST Amt", "Due Date", "Status", "Paid Date", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 9, color: "#94a3b8", letterSpacing: 1.5, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayables.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>{vendorSearch.trim() ? `No results for "${vendorSearch}"` : "No payables yet. Click + Add Payable to start."}</td>
                </tr>
              )}
              {filteredPayables.map(p => {
                const isOverdue = p.status !== "Paid" && p.due_date && new Date(p.due_date) < today;
                const sc = p.status === "Paid" ? { bg: "#f0fdf4", br: "#bbf7d0", c: "#16a34a" } : isOverdue ? { bg: "#fff1f2", br: "#fecdd3", c: "#e11d48" } : { bg: "#fff7ed", br: "#fed7aa", c: "#ea580c" };
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", background: isOverdue ? "#fff8f8" : "#fff" }}>
                    <td onClick={() => openVendorLedger(p.vendor)} style={{ padding: "10px 12px", fontWeight: 600, color: "#1d4ed8", cursor: "pointer", textDecoration: "underline" }} title="Click to view vendor ledger">{p.vendor}</td>
                    <td style={{ padding: "10px 12px" }}><span style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{p.site}</span></td>
                    <td style={{ padding: "10px 12px", color: "#64748b", maxWidth: 200 }}>{p.description || "—"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#dc2626", fontFamily: "IBM Plex Mono,monospace" }}>₹{parseFloat(p.amount as string || "0").toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: "10px 12px", color: "#7c3aed", fontFamily: "IBM Plex Mono,monospace", fontSize: 11 }}>
                      {p.amount_with_gst ? `₹${(parseFloat(p.amount_with_gst as string || "0") - parseFloat(p.amount as string || "0")).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : `₹${(parseFloat(p.amount as string || "0") * (parseFloat(p.gst_percent || "18") / 100)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                    </td>
                    <td style={{ padding: "10px 12px", color: isOverdue ? "#dc2626" : "#64748b", fontWeight: isOverdue ? 700 : 400 }}>
                      {p.due_date ? new Date(p.due_date).toLocaleDateString("en-IN") : "—"}
                      {isOverdue && <span style={{ fontSize: 9, marginLeft: 4, color: "#dc2626" }}>OVERDUE</span>}
                    </td>
                    <td style={{ padding: "10px 12px" }}><span style={{ background: sc.bg, border: `1px solid ${sc.br}`, color: sc.c, borderRadius: 4, padding: "3px 8px", fontSize: 9, fontWeight: 700 }}>{p.status}</span></td>
                    <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 11 }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString("en-IN") : "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {canEdit && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <Button variant="ghost" onClick={() => openForm(p)} style={{ fontSize: 9, padding: "3px 8px" }}>Edit</Button>
                          {isAdmin && <Button variant="danger" onClick={() => { if (window.confirm("Delete this payable?")) onDelete(p.id); }} style={{ fontSize: 9, padding: "3px 8px", minWidth: "auto", minHeight: "auto" }}>Del</Button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal === "form" && (
        <Modal title={form.id ? "Edit Payable" : "Add Payable"} onClose={() => setModal(null)} wide>
          <PayableFormModal form={form} setForm={setForm} saving={saving} onSave={handleSave} onClose={() => setModal(null)} sites={SITES} />
        </Modal>
      )}

      {vendorLedger && (
        <Modal title={`Vendor Ledger - ${vendorLedger.vendor}`} onClose={() => setVendorLedger(null)} wide>
          <VendorLedgerModal vendorLedger={vendorLedger} onClose={() => setVendorLedger(null)} />
        </Modal>
      )}

      {showBulkPay && (
        <Modal title="💸 Bulk Payment — Split Across Invoices" onClose={() => { setShowBulkPay(false); setBpResult(null); }} wide>
          <BulkPayModal payables={payables} form={bpForm} setForm={setBpForm} result={bpResult} setResult={setBpResult} saving={saving} onClose={() => { setShowBulkPay(false); setBpResult(null); }} onConfirm={onBulkPay} />
        </Modal>
      )}

      {cardDetail && (
        <Modal title={cardDetail && cardDetail.startsWith("site:") ? `Outstanding: ${cardDetail.slice(5)}` : ({ outstanding: "Outstanding Payables", overdue: "Overdue Payables", receivable: "Bills Receivable", net: "All Payables", paid: "Paid This Cycle" } as any)[cardDetail] || cardDetail} onClose={() => { setCardDetail(null); setCdFrom(""); setCdTo(""); setCdSite(""); }} wide>
           {/* Card Detail Content (similar to previous index.html) */}
           <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
             <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                 <tr>
                    {["VENDOR", "SITE", "DESCRIPTION", "BASE AMT", "TOTAL+GST", "DUE DATE", "STATUS", "PAID DATE"].map(h => (
                       <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 9, color: "#94a3b8", letterSpacing: 1.5, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                 </tr>
               </thead>
               <tbody>
                  {cardDetailItems(cardDetail).map(p => {
                      const isOD = p.status !== "Paid" && p.due_date && new Date(p.due_date) < today;
                      return (
                         <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9", background: isOD ? "#fff8f8" : "#fff" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{p.vendor}<br />{p.vendor_gstin && <span style={{ fontSize: 9, color: "#94a3b8" }}>{p.vendor_gstin}</span>}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "#ea580c" }}>{p.site}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "#64748b", maxWidth: 160 }}>{p.description || "-"}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: "#dc2626", fontFamily: "IBM Plex Mono,monospace" }}>₹{parseFloat(p.amount as string || "0").toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                            <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono,monospace", color: "#0f172a" }}>{p.amount_with_gst ? `₹${parseFloat(p.amount_with_gst as string).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "-"}</td>
                            <td style={{ padding: "10px 12px", color: isOD ? "#dc2626" : "#64748b", fontWeight: isOD ? 700 : 400, whiteSpace: "nowrap" }}>{p.due_date ? new Date(p.due_date).toLocaleDateString("en-IN") : "-"}{isOD && <span style={{ fontSize: 9, marginLeft: 4, color: "#dc2626" }}>OVERDUE</span>}</td>
                            <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: p.status === "Paid" ? "#f0fdf4" : isOD ? "#fff1f2" : "#fff7ed", border: `1px solid ${p.status === "Paid" ? "#bbf7d0" : isOD ? "#fecdd3" : "#fed7aa"}`, color: p.status === "Paid" ? "#16a34a" : isOD ? "#dc2626" : "#ea580c" }}>{p.status}</span></td>
                            <td style={{ padding: "10px 12px", fontSize: 11, color: "#64748b" }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString("en-IN") : "-"}</td>
                         </tr>
                      )
                  })}
               </tbody>
             </table>
           </div>
        </Modal>
      )}

    </div>
  );
};
