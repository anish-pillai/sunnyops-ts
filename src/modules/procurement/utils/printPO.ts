import type { PurchaseOrder } from '@/types/procurement.types';
import { FIRMS, OUR_STATE_CODE } from '@/config/constants';

export const printPO = (po: PurchaseOrder) => {
  const items = Array.isArray(po.items) ? po.items : [];
  const subtotal = items.reduce((s, it) => s + (parseFloat(String(it.rate || 0)) * parseFloat(String(it.qty || 0))), 0);
  const vendorStateCode = (po.vendor_gstin || "").trim().substring(0, 2);
  const isIntraState = vendorStateCode === OUR_STATE_CODE && vendorStateCode.length === 2;
  
  const sgstAmt = isIntraState ? subtotal * 0.09 : 0;
  const cgstAmt = isIntraState ? subtotal * 0.09 : 0;
  const igstAmt = isIntraState ? 0 : subtotal * 0.18;
  const grandTotal = subtotal + (isIntraState ? (sgstAmt + cgstAmt) : igstAmt);

  let css = "*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:30px;max-width:900px;margin:0 auto;color:#1a1a1a;font-size:12px}";
  if (po.status === 'Draft') css += ".wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:120px;font-weight:900;color:rgba(220,38,38,0.12);letter-spacing:12px;pointer-events:none;z-index:9999;white-space:nowrap;font-family:Arial,sans-serif;}";
  css += ".hdr{border-bottom:3px solid #f97316;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start}";
  css += ".co-name{font-size:17px;font-weight:800;color:#0f172a}.co-sub{font-size:10px;color:#555;margin-top:3px}.co-gst{font-size:10px;color:#f97316;font-weight:700;margin-top:2px}";
  css += ".po-title{text-align:right}.po-title h2{font-size:14px;color:#f97316;font-weight:800;letter-spacing:1px}.po-no{font-size:13px;font-weight:800;margin-top:4px;color:#0f172a}.po-dt{font-size:11px;color:#555;margin-top:2px}";
  css += ".ig{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}";
  css += ".ib{border:1px solid #fed7aa;border-radius:6px;padding:10px 13px;background:#fff7ed}.il{font-size:8px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#ea580c;margin-bottom:4px}";
  css += ".in{font-size:12px;font-weight:700;color:#0f172a}.is{font-size:10px;color:#555;margin-top:2px;line-height:1.5}";
  css += "table{width:100%;border-collapse:collapse;margin:10px 0}th,td{padding:8px 10px;border:1px solid #ddd;text-align:left;font-size:11px}";
  css += "th{background:#f97316;color:#fff;font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700}tr:nth-child(even) td{background:#fff7ed}";
  css += ".tr-sub td{font-weight:700;background:#fff7ed!important;color:#92400e}.tr-gst td{color:#64748b;background:#f8fafc!important}";
  css += ".tr-total td{font-weight:800;background:#fff7ed!important;border-top:2px solid #f97316}.tot-val{color:#f97316;font-size:13px}";
  css += ".terms-wrap{margin-top:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}";
  css += ".terms-section{border-bottom:1px solid #e2e8f0}.terms-section:last-child{border-bottom:none}";
  css += ".terms-hdr{background:#fff7ed;padding:7px 14px;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#ea580c;border-bottom:1px solid #fed7aa}";
  css += ".terms-body{padding:10px 14px}.scope-text{font-size:11px;color:#374151;line-height:1.8;white-space:pre-wrap}";
  css += ".sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:40px;margin-top:22px}.sb{border-top:2px solid #f97316;padding-top:10px}";
  css += ".sl{font-size:9px;color:#555;text-transform:uppercase;letter-spacing:1px}.sn{font-weight:700;margin-top:22px;font-size:11px}";
  css += ".ftr{margin-top:18px;border-top:1px solid #fed7aa;padding-top:8px;font-size:9px;color:#999;text-align:center}";
  css += "@media print{button,.no-print{display:none}}";

  const dt = po.date ? new Date(po.date).toLocaleDateString("en-IN") : "-";
  let html = `<!DOCTYPE html><html><head><title>PO ${po.po_no}</title><style>${css}</style></head><body>`;
  if (po.status === 'Draft') html += '<div class="wm">DRAFT</div>';

  const firm = FIRMS.find(f => f.key === (po as any).firm) || FIRMS[0];
  
  html += `<div class='hdr'>
    <div style='display:flex;align-items:center'>
      <div>
        <div class='co-name'>${firm.name}</div>
        <div class='co-sub'>Door No 1-144 A30, Shree Siddi Vinayaka Building, Mangaluru - 575030, Karnataka | LL: 08246637172 | M: 8050196063 | sunny@sunnyengg.com</div>
        <div class='co-gst'>GSTIN: ${firm.gst}</div>
      </div>
    </div>
    <div class='po-title'>
      <h2>PURCHASE ORDER</h2>
      <div class='po-no'>${po.po_no}</div>
      <div class='po-dt'>Date: ${dt}</div>
    </div>
  </div>`;

  html += `<div class='ig'>
    <div class='ib'>
      <div class='il'>To (Vendor / Supplier)</div>
      <div class='in'>${po.vendor_name || "&mdash;"}</div>
      ${po.vendor_gstin ? `<div class='is'>GSTIN: ${po.vendor_gstin}</div>` : ''}
      ${po.vendor_address ? `<div class='is'>${po.vendor_address}</div>` : ''}
    </div>
    <div class='ib'>
      <div class='il'>Deliver To</div>
      <div class='in'>${po.site || "&mdash;"}</div>
      <div class='is'>Prepared By: ${po.created_by || "-"}</div>
    </div>
  </div>`;

  html += `<table>
    <thead><tr><th>#</th><th>Description / Item</th><th>Unit</th><th>Qty</th><th>Rate (Rs.)</th><th>Amount (Rs.)</th></tr></thead>
    <tbody>`;
  
  items.forEach((it, i) => {
    const amt = parseFloat(String(it.rate || 0)) * parseFloat(String(it.qty || 0));
    html += `<tr>
      <td>${i + 1}</td>
      <td><b>${it.description}</b></td>
      <td>${it.unit || "Nos"}</td>
      <td style='text-align:center'>${it.qty || 0}</td>
      <td style='text-align:right'>${parseFloat(String(it.rate || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style='text-align:right'>${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
    </tr>`;
  });

  html += `<tr class='tr-sub'><td colspan='5' style='text-align:right'>Sub Total (Before GST)</td><td style='text-align:right'>${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`;
  if (isIntraState) {
    html += `<tr class='tr-gst'><td colspan='5' style='text-align:right'>SGST @ 9%</td><td style='text-align:right'>₹${sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
    html += `<tr class='tr-gst'><td colspan='5' style='text-align:right'>CGST @ 9%</td><td style='text-align:right'>₹${cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
  } else {
    html += `<tr class='tr-gst'><td colspan='5' style='text-align:right'>IGST @ 18%</td><td style='text-align:right'>₹${igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
  }
  html += `<tr class='tr-total'><td colspan='5' style='text-align:right;font-size:12px'>TOTAL (Incl. GST)</td><td class='tot-val' style='text-align:right'>${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`;
  html += `</tbody></table>`;

  html += `<div class='terms-wrap'>
    <div class='terms-section'><div class='terms-hdr'>Terms & Conditions</div><div class='terms-body'><div class='scope-text'>${po.terms || "As per company policy"}</div></div></div>
  </div>`;

  html += `<div class='sign'>
    <div class='sb'><div class='sl'>Prepared By</div><div class='sn'>${po.created_by || ""}</div></div>
    <div class='sb'><div class='sl'>Authorized Signatory</div><div class='sn'>${firm.short}</div></div>
    <div class='sb'><div class='sl'>Vendor Acceptance</div><div class='sn'>&nbsp;</div></div>
  </div>`;

  html += `<div class='ftr'>Computer Generated Purchase Order — ${firm.short} — Mangaluru, Karnataka</div>`;
  html += `<button class='no-print' style='margin-top:20px;padding:10px 24px;background:#f97316;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:700' onclick='window.print()'>Print / Save PDF</button></body></html>`;

  const w = window.open("", "_blank", "width=940,height=760");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};
