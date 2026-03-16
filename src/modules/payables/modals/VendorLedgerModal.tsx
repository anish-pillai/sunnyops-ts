import React from 'react';
import type { Payable } from '@/types/bill.types';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui';

export interface VendorLedgerData {
  vendor: string;
  gstin?: string;
  totalAmt: number;
  totalGst: number;
  totalWithGst: number;
  totalPaidAmt: number;
  totalPendAmt: number;
  invoices: Payable[];
}

interface Props {
  vendorLedger: VendorLedgerData;
  onClose: () => void;
}

export const VendorLedgerModal: React.FC<Props> = ({ vendorLedger, onClose }) => {
  const handleCopyWhatsApp = () => {
    let text = `VENDOR LEDGER\n`;
    text += `Vendor: ${vendorLedger.vendor}\n`;
    if (vendorLedger.gstin) text += `GSTIN: ${vendorLedger.gstin}\n`;
    text += `Generated: ${new Date().toLocaleDateString("en-IN")}\n\n`;
    text += `SUMMARY\n`;
    text += `Total Invoiced: ₹${vendorLedger.totalAmt.toLocaleString("en-IN", {maximumFractionDigits:0})}\n`;
    text += `GST Amount:     ₹${vendorLedger.totalGst.toLocaleString("en-IN", {maximumFractionDigits:0})}\n`;
    text += `Amount Paid:    ₹${vendorLedger.totalPaidAmt.toLocaleString("en-IN", {maximumFractionDigits:0})}\n`;
    text += `Balance Due:    ₹${vendorLedger.totalPendAmt.toLocaleString("en-IN", {maximumFractionDigits:0})}\n\n`;
    text += `INVOICES\n`;
    text += `-----------------------------------\n`;
    vendorLedger.invoices.forEach(p => {
      text += `${p.invoice_no || "N/A"} | ${p.site} | ${p.due_date ? new Date(p.due_date).toLocaleDateString("en-IN") : "-"}\n`;
      text += `  Base: ₹${parseFloat(p.amount as string || "0").toLocaleString("en-IN",{maximumFractionDigits:0})}`;
      if (p.amount_with_gst) text += `  Incl.GST: ₹${parseFloat(p.amount_with_gst as string).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
      text += `  Status: ${p.status}`;
      if (p.paid_date) text += `  Paid: ${new Date(p.paid_date).toLocaleDateString("en-IN")}`;
      text += `\n`;
    });
    text += `-----------------------------------\n`;
    text += `Balance Due: ₹${vendorLedger.totalPendAmt.toLocaleString("en-IN",{maximumFractionDigits:0})}\n`;
    text += `\nP. Sunny Engineering Contractors (OPC) Pvt. Ltd.`;
    navigator.clipboard.writeText(text).then(() => { alert("Copied! Paste in WhatsApp."); }).catch(() => { alert("Failed to copy"); });
  };

  const handleExportExcel = () => {
    const rows: any[][] = [["Invoice No", "Site", "Description", "Base Amount", "GST%", "Incl.GST", "GST Amount", "Due Date", "Status", "Paid Date", "Payment Mode", "Remarks"]];
    vendorLedger.invoices.forEach(p => {
      const base = parseFloat(p.amount as string || "0");
      const gp = parseFloat(p.gst_percent || "18");
      const incl = p.amount_with_gst ? parseFloat(p.amount_with_gst as string) : base * (1 + gp / 100);
      rows.push([
        p.invoice_no || "", p.site, p.description || "", base, gp, incl, incl - base, p.due_date || "", p.status, p.paid_date || "", p.payment_mode || "", p.remarks || ""
      ]);
    });
    rows.push(["TOTAL", "", "", vendorLedger.totalAmt, "", vendorLedger.totalWithGst, vendorLedger.totalGst, "", "", "", "", ""]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = rows[0].map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Ledger");
    XLSX.writeFile(wb, `${vendorLedger.vendor.replace(/[^a-zA-Z0-9]/g,"_")}_Ledger_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "80vh" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "#e2e8f0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "1px 0" }}>
        {[
          { l: "Total (Incl. GST)", v: `₹${vendorLedger.totalWithGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, c: "#0f172a" },
          { l: "GST Amount", v: `₹${vendorLedger.totalGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, c: "#7c3aed" },
          { l: "Amount Paid", v: `₹${vendorLedger.totalPaidAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, c: "#16a34a" },
          { l: "Balance Due", v: `₹${vendorLedger.totalPendAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, c: vendorLedger.totalPendAmt > 0 ? "#dc2626" : "#16a34a" }
        ].map(card => (
          <div key={card.l} style={{ background: "#fff", padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>{card.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: card.c, fontFamily: "IBM Plex Mono,monospace" }}>{card.v}</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto", flex: 1, overflowY: "auto", minHeight: 300 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
            <tr>
              {["Invoice No", "Site", "Description", "Base Amt", "GST%", "Incl.GST", "Due Date", "Status", "Paid Date", "Mode"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap", borderBottom: "2px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendorLedger.invoices.map((p, idx) => {
              const isPaid = p.status === "Paid";
              const isOd = !isPaid && p.due_date && new Date(p.due_date) < new Date();
              const rowBg = isPaid ? "#f0fdf4" : isOd ? "#fff8f8" : "#fff";
              const sc = isPaid ? "#16a34a" : isOd ? "#dc2626" : "#ea580c";
              const base = parseFloat(p.amount as string || "0");
              const gstPct = parseFloat(p.gst_percent || "18");
              const inclGst = p.amount_with_gst ? parseFloat(p.amount_with_gst as string) : base * (1 + gstPct / 100);

              return (
                <tr key={p.id || idx} style={{ background: rowBg, borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "IBM Plex Mono,monospace", fontSize: 10, fontWeight: 600, color: "#1d4ed8" }}>{p.invoice_no || "-"}</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 700 }}>{p.site}</span></td>
                  <td style={{ padding: "8px 10px", color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description || "-"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "IBM Plex Mono,monospace", fontWeight: 600, textAlign: "right" }}>₹{base.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center", color: "#7c3aed" }}>{gstPct}%</td>
                  <td style={{ padding: "8px 10px", fontFamily: "IBM Plex Mono,monospace", fontWeight: 600, textAlign: "right", color: "#0f172a" }}>₹{inclGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: "8px 10px", color: isOd ? "#dc2626" : "#64748b", fontWeight: isOd ? 700 : 400 }}>{p.due_date ? new Date(p.due_date).toLocaleDateString("en-IN") : "-"}</td>
                  <td style={{ padding: "8px 10px" }}><span style={{ background: isPaid ? "#f0fdf4" : isOd ? "#fff1f2" : "#fff7ed", border: `1px solid ${isPaid ? "#bbf7d0" : isOd ? "#fecdd3" : "#fed7aa"}`, color: sc, borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 700 }}>{p.status}</span></td>
                  <td style={{ padding: "8px 10px", color: "#64748b" }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString("en-IN") : "-"}</td>
                  <td style={{ padding: "8px 10px", color: "#64748b" }}>{p.payment_mode || "-"}</td>
                </tr>
              );
            })}
            <tr style={{ background: "#f8fafc", fontWeight: 700, borderTop: "2px solid #e2e8f0" }}>
              <td colSpan={3} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700 }}>TOTAL ({vendorLedger.invoices.length} invoices)</td>
              <td style={{ padding: "8px 10px", fontFamily: "IBM Plex Mono,monospace", fontWeight: 800, textAlign: "right" }}>₹{vendorLedger.totalAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
              <td></td>
              <td style={{ padding: "8px 10px", fontFamily: "IBM Plex Mono,monospace", fontWeight: 800, textAlign: "right" }}>₹{vendorLedger.totalWithGst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
              <td colSpan={4}></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", background: "#f8fafc", marginTop: "auto" }}>
        <Button onClick={handleCopyWhatsApp} style={{ background: "#25D366", borderColor: "#25D366", color: "#fff", fontWeight: 700, fontSize: 12 }}>
          📱 Copy for WhatsApp
        </Button>
        <Button onClick={handleExportExcel} style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 12 }}>
          ⬇ Excel
        </Button>
        <Button variant="ghost" onClick={onClose} style={{ fontWeight: 700, fontSize: 12 }}>
          Close
        </Button>
      </div>
    </div>
  );
};
