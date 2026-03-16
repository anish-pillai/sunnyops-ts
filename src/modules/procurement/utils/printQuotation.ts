import type { Quotation } from '@/types/procurement.types';
import { FIRMS } from '@/config/constants';

export const printQuotation = (q: Quotation) => {
  const items = Array.isArray(q.items) ? q.items : [];
  const subtotal = items.reduce((s: number, it: any) => s + (parseFloat(String(it.rate || 0)) * parseFloat(String(it.qty || 0))), 0);
  const clientGSTIN = (q as any).client_gstin || "";
  const vendorSC = clientGSTIN.trim().substring(0, 2);
  const isIntra = vendorSC === "29";
  const gstAmt = subtotal * 0.18;
  const grandTotal = subtotal + gstAmt;
  const isBUD = (q as any).type === "BUD";

  let css = "*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:30px;max-width:900px;margin:0 auto;color:#1a1a1a;font-size:12px}";
  if (isBUD) css += ".wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(220,38,38,0.08);letter-spacing:6px;pointer-events:none;z-index:9999;white-space:nowrap;font-family:Arial,sans-serif;text-align:center;line-height:1.4}";
  css += ".hdr{border-bottom:3px solid #f97316;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start}";
  css += ".co-name{font-size:17px;font-weight:800;color:#0f172a}.co-sub{font-size:10px;color:#555;margin-top:3px}.co-gst{font-size:10px;color:#f97316;font-weight:700;margin-top:2px}";
  css += "table{width:100%;border-collapse:collapse;margin:14px 0}th{background:#fff7ed;color:#ea580c;font-size:10px;text-transform:uppercase;padding:8px 10px;border:1px solid #fed7aa;text-align:left}td{padding:8px 10px;border:1px solid #e2e8f0;font-size:11px}";
  css += ".tr-sub td,.tr-gst td{color:#64748b;background:#f8fafc}.tr-total td{font-weight:800;background:#fff7ed;font-size:12px}";
  css += ".terms{margin-top:16px;font-size:10px;color:#374151;line-height:1.7;white-space:pre-line}";
  css += ".sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}.sb{border-top:2px solid #f97316;padding-top:8px;text-align:center;font-size:10px;color:#555}";
  css += "@media print{button,.no-print{display:none}}";

  const firm = FIRMS.find(f => f.key === (q as any).firm) || FIRMS[0];
  
  let h = `<!DOCTYPE html><html><head><title>${isBUD ? "[BUDGETARY] " : ""}Quotation ${q.ref_no}</title><style>${css}</style></head><body>`;
  if (isBUD) h += "<div class='wm'>BUDGETARY<br>SUBJECT TO<br>CHANGE</div>";

  h += `<div class='hdr'><div style='display:flex;gap:14px;align-items:flex-start'><div><div class='co-name'>${firm.name}</div><div class='co-sub'>Mangaluru, Karnataka | LL: 08246637172 | M: 8050196063 | sunny@sunnyengg.com</div><div class='co-gst'>GSTIN: ${firm.gst}</div></div></div>`;
  h += `<div style='text-align:right'><h2 style='font-size:14px;color:#f97316;font-weight:800;letter-spacing:1px'>${isBUD ? "BUDGETARY OFFER" : "QUOTATION"}</h2><div style='font-size:13px;font-weight:800;margin-top:4px'>${q.ref_no}</div><div style='font-size:11px;color:#555;margin-top:2px'>Date: ${new Date(q.date || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div></div></div>`;
  
  h += `<div style='display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px'>`;
  h += `<div style='border:1px solid #fed7aa;border-radius:6px;padding:10px 13px;background:#fff7ed'><div style='font-size:8px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#ea580c;margin-bottom:4px'>To</div>`;
  h += `<div style='font-size:13px;font-weight:800;color:#0f172a'>${(q as any).client_name || q.client || ""}</div>`;
  if (clientGSTIN) h += `<div style='font-size:10px;color:#555;margin-top:2px'>GSTIN: ${clientGSTIN}</div>`;
  if ((q as any).client_address) h += `<div style='font-size:10px;color:#555;margin-top:2px'>${(q as any).client_address}</div>`;
  h += `</div>`;
  h += `<div style='border:1px solid #e2e8f0;border-radius:6px;padding:10px 13px;background:#f8fafc'><div style='font-size:11px;color:#374151;line-height:1.8'>`;
  if (q.site) h += `<div><b>Site:</b> ${q.site}</div>`;
  h += `<div><b>GST Type:</b> ${isIntra ? "Intra-State - SGST+CGST" : "Inter-State - IGST"}</div>`;
  h += `</div></div></div>`;
  
  if ((q as any).scope) h += `<div style='margin-bottom:12px;padding:10px 13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px'><div style='font-size:8px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:6px'>Scope of Work</div><div style='font-size:11px;color:#374151;white-space:pre-line'>${(q as any).scope}</div></div>`;
  
  h += `<table><thead><tr><th style='width:40%'>Description</th><th style='text-align:center'>Unit</th><th style='text-align:right'>Qty</th><th style='text-align:right'>Rate</th><th style='text-align:right'>Amount</th></tr></thead><tbody>`;
  items.forEach((it: any, idx: number) => {
    const amt = parseFloat(String(it.rate || 0)) * parseFloat(String(it.qty || 0));
    h += `<tr><td>${idx + 1}. ${(it as any).name || (it as any).description || ""}</td><td style='text-align:center'>${(it as any).unit || "Nos"}</td><td style='text-align:right'>${it.qty || 0}</td><td style='text-align:right'>₹${parseFloat(String(it.rate || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td><td style='text-align:right'>₹${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`;
  });
  
  h += `<tr class='tr-sub'><td colspan='4' style='text-align:right'>Sub Total</td><td style='text-align:right'>₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`;
  if (isIntra) {
    h += `<tr class='tr-gst'><td colspan='4' style='text-align:right'>SGST @ 9%</td><td style='text-align:right'>₹${(subtotal * 0.09).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`;
    h += `<tr class='tr-gst'><td colspan='4' style='text-align:right'>CGST @ 9%</td><td style='text-align:right'>₹${(subtotal * 0.09).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`;
  } else {
    h += `<tr class='tr-gst'><td colspan='4' style='text-align:right'>IGST @ 18%</td><td style='text-align:right'>₹${gstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`;
  }
  h += `<tr class='tr-total'><td colspan='4' style='text-align:right'>TOTAL (Incl. GST)</td><td style='text-align:right;font-size:13px'>₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr></tbody></table>`;
  
  if (q.terms) h += `<div class='terms'><b>Terms & Conditions:</b>\n${q.terms}</div>`;
  
  h += `<div class='sign'><div class='sb'>Client Acceptance<br><br><br></div><div class='sb'>For ${firm.short}<br>Authorised Signatory</div></div>`;
  h += `<button class='no-print' style='margin-top:20px;padding:10px 24px;background:#f97316;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:700' onclick='window.print()'>Print / Save PDF</button></body></html>`;
  
  const w = window.open("", "_blank", "width=900,height=700");
  if (w) {
    w.document.write(h);
    w.document.close();
  }
};
