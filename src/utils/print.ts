import { COMPANY, DEFAULT_SITE_DETAILS, FIRMS, EI_CLIENTS, EI_DEFAULT_HSN } from '@/config/constants';
import { fmtDate } from './formatters';
import { amountInWords } from './gst';
import type { Challan } from '@/types/request.types';
import type { PurchaseOrder } from '@/types/procurement.types';
import type { EInvoice, EInvoiceLineItem, CreditDebitNote } from '@/types/bill.types';

function openPrint(html: string): void {
  const w = window.open('', '_blank', 'width=1000,height=780');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 700);
}

function fA(n: number | string | undefined): string {
  return 'Rs.' + parseFloat(String(n || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fN(n: number | string | undefined): string {
  return parseFloat(String(n || 0)).toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function calcItemAmt(item: EInvoiceLineItem): number {
  return Math.round(Number(item.qty || 0) * Number(item.rate || 0) * 100) / 100;
}

// ── E-Invoice Print (Professional Tax Invoice) ──────────────────────

export function printEInvoice(inv: EInvoice): void {
  const firm = FIRMS.find(f => f.key === (inv.firm || 'opc')) || FIRMS[0];
  const client = EI_CLIENTS.find(c => c.name === inv.client_name) || { name: inv.client_name || '', gstin: '', address: '', state: 'Karnataka', state_code: '29' };
  const isIntra = firm.gst.slice(0, 2) === (client.state_code || '29');
  const invNo = inv.inv_no || inv.invoice_no;

  const tv = parseFloat(String(inv.taxable_value || inv.sub_total || 0));
  const gp = parseFloat(String(inv.gst_percent || 18));
  const ga = parseFloat(String(inv.gst_amount || tv * gp / 100));
  const total = parseFloat(String(inv.total_amount || inv.grand_total || tv + ga));
  const tds = parseFloat(String(inv.tds_amount || 0));
  const netPayable = total - tds;
  const half = ga / 2;
  const ti = Math.round(netPayable);
  const wrd = amountInWords(ti);
  const invDt = inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  let lineItems: EInvoiceLineItem[] = [];
  try { lineItems = typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : (inv.line_items || inv.items || []); } catch { /* empty */ }
  if (!lineItems || !lineItems.length) lineItems = [{ desc: inv.description || 'Construction/Erection Services', hsn: EI_DEFAULT_HSN, qty: 1, unit: 'LS', rate: String(tv), amount: String(tv) }];

  let css = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a}';
  css += '.inv{max-width:860px;margin:0 auto;position:relative;overflow:hidden;border:1px solid #bbb;box-shadow:0 2px 18px rgba(0,0,0,.12);background:#fff}';
  css += '.ic{position:relative;z-index:2}';
  css += '.hdr{padding:14px 18px 10px;background:#fff;display:flex;justify-content:space-between;align-items:center}';
  css += '.lw{display:flex;align-items:center;gap:12px}';
  css += '.cn{font-size:13px;font-weight:800;color:#2d3748;line-height:1.3}';
  css += '.cs{font-size:8.5px;color:#64748b;margin-top:3px;line-height:1.65}';
  css += '.cg{font-size:8.5px;font-weight:700;color:#e09c3a;margin-top:2px}';
  css += '.ib{text-align:right}';
  css += '.db{display:inline-block;padding:3px 10px;background:#2d3748;color:#fff;font-size:8px;font-weight:800;letter-spacing:2px;text-transform:uppercase;border-radius:3px}';
  css += '.in{font-size:17px;font-weight:800;font-family:monospace;color:#2d3748;margin-top:4px}';
  css += '.ab{height:4px;background:linear-gradient(90deg,#2d3748 0%,#e09c3a 45%,#2d3748 100%)}';
  css += '.ms{display:grid;grid-template-columns:repeat(5,1fr);background:#f7f7f6;border-bottom:1px solid #e2e8f0;border-top:1px solid #e2e8f0}';
  css += '.mc{padding:8px 12px;border-right:1px solid #e2e8f0}.mc:last-child{border-right:none}';
  css += '.ml{font-size:7px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}';
  css += '.mv{font-size:10px;font-weight:700;color:#1a1a1a}';
  css += '.pt{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e2e8f0}';
  css += '.py{padding:10px 16px}';
  css += '.pl{border-right:1px solid #e2e8f0;border-left:3px solid #2d3748}';
  css += '.pr{border-left:3px solid #e09c3a}';
  css += '.pb{font-size:7px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;color:#94a3b8}';
  css += '.pn{font-size:11px;font-weight:800;color:#2d3748;margin-bottom:2px}';
  css += '.pa{font-size:9px;color:#475569;line-height:1.65}';
  css += '.pg{font-size:9px;font-weight:700;color:#e09c3a;margin-top:3px}';
  css += 'table.it{width:100%;border-collapse:collapse}';
  css += 'table.it thead tr{background:#2d3748}';
  css += 'table.it th{padding:7px 9px;text-align:left;font-size:8px;letter-spacing:.8px;text-transform:uppercase;font-weight:700;color:#fff;white-space:nowrap}';
  css += 'table.it th.r,table.it td.r{text-align:right}';
  css += 'table.it td{padding:6px 9px;font-size:10px;color:#1a1a1a;background:#fff;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0}';
  css += 'table.it td:last-child{border-right:none}';
  css += 'table.it tfoot td{padding:7px 9px;font-weight:800;font-size:10px;background:#f7f7f6;color:#2d3748;border-top:2px solid #2d3748;border-right:none}';
  css += '.tw{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #e2e8f0}';
  css += '.rs{padding:12px 16px;border-right:1px solid #e2e8f0}';
  css += '.ts{padding:12px 16px}';
  css += '.sl{font-size:7px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}';
  css += '.ar{display:flex;justify-content:space-between;padding:3px 0;font-size:10px;color:#374151}';
  css += '.ar.st{padding-top:6px;border-top:1px dashed #e2e8f0;margin-top:4px;font-weight:700;color:#2d3748}';
  css += '.ar.dc{color:#dc2626}';
  css += '.ar.gd{border-top:2px solid #2d3748;margin-top:5px;padding-top:7px;font-weight:800;font-size:13px;color:#2d3748}';
  css += '.iw{padding:7px 16px;font-size:9px;font-style:italic;color:#475569;background:#f7f7f6;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}';
  css += '.ia{margin:8px 16px;padding:7px 11px;border-radius:4px;font-size:9px;background:#fff7ed;border:1px solid #fed7aa;color:#92400e}';
  css += '.irn{margin:8px 16px;padding:7px 11px;border-radius:4px;font-size:9px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}';
  css += '.sr{display:grid;grid-template-columns:1fr 1fr;padding:12px 16px;border-top:1px solid #e2e8f0;gap:16px}';
  css += '.sf{font-size:8px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}';
  css += '.sb{display:inline-block;border:1px solid #2d3748;border-top:3px solid #e09c3a;border-radius:0 0 4px 4px;padding:10px 24px 8px;min-width:170px;text-align:center}';
  css += '.ss{height:36px;border-bottom:1px dashed #cbd5e1;margin-bottom:6px}';
  css += '.su{font-size:9px;color:#2d3748;font-weight:700;margin-top:4px}';
  css += '.ft{padding:7px 16px;font-size:8px;color:#64748b;text-align:center;border-top:1px solid #e2e8f0}';
  css += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

  let h = `<!DOCTYPE html><html><head><title>${invNo}</title><style>${css}</style></head><body><div class='inv'>`;
  h += `<div class='ic'>`;
  h += `<div class='hdr'><div class='lw'>`;
  h += `<div><div class='cn'>${firm.name}</div>`;
  h += `<div class='cs'>Kutherthooru, Mangaluru, Karnataka 574 143 &nbsp;|&nbsp; LL: 08246637172 &nbsp;|&nbsp; M: 8050196063<br>Email: sunny@sunnyengg.com &nbsp;|&nbsp; sunnyengg.com</div>`;
  h += `<div class='cg'>GSTIN: ${firm.gst} &nbsp;|&nbsp; State: Karnataka (29) &nbsp;|&nbsp; PAN: AAOCP5225B</div>`;
  h += `</div></div>`;
  h += `<div class='ib'><div class='db'>Tax Invoice</div><div class='in'>${invNo}</div><div style='font-size:8.5px;color:#64748b;margin-top:4px'>Original for Recipient</div></div></div>`;
  h += `<div class='ab'></div>`;

  // Meta strip
  h += `<div class='ms'>`;
  h += `<div class='mc'><div class='ml'>Invoice Date</div><div class='mv'>${invDt}</div></div>`;
  h += `<div class='mc'><div class='ml'>Work Order No.</div><div class='mv'>${inv.wo_no || '—'}</div></div>`;
  h += `<div class='mc'><div class='ml'>WO Date</div><div class='mv'>—</div></div>`;
  h += `<div class='mc'><div class='ml'>Site</div><div class='mv'>${inv.site || '—'}</div></div>`;
  h += `<div class='mc'><div class='ml'>Place of Supply</div><div class='mv'>${client.state || 'Karnataka'} (${client.state_code || '29'})</div></div>`;
  h += `</div>`;

  // Parties
  h += `<div class='pt'>`;
  h += `<div class='py pl'><div class='pb'>Billed From</div><div class='pn'>${firm.name}</div><div class='pa'>Kutherthooru, Mangaluru, Karnataka 574 143</div><div class='pg'>GSTIN: ${firm.gst}</div></div>`;
  h += `<div class='py pr'><div class='pb'>Billed To</div><div class='pn'>${client.name || ''}</div><div class='pa'>${client.address || ''}</div>${client.gstin ? `<div class='pg'>GSTIN: ${client.gstin}</div>` : ''}</div>`;
  h += `</div>`;

  // Line items table
  h += `<table class='it'><thead><tr>`;
  h += `<th style='width:26px'>#</th><th>Description of Service</th><th style='width:66px'>HSN/SAC</th>`;
  h += `<th class='r' style='width:48px'>Qty</th><th style='width:42px'>Unit</th>`;
  h += `<th class='r' style='width:90px'>Rate (&#8377;)</th><th class='r' style='width:100px'>Amount (&#8377;)</th>`;
  h += `</tr></thead><tbody>`;
  lineItems.forEach((item, idx) => {
    const amt = parseFloat(String(item.amount || calcItemAmt(item) || 0));
    h += `<tr><td style='color:#94a3b8;font-size:9px;text-align:center'>${idx + 1}</td>`;
    h += `<td>${item.desc || item.description || ''}</td>`;
    h += `<td style='color:#64748b;font-family:monospace;font-size:9px'>${item.hsn || item.hsn_sac || EI_DEFAULT_HSN}</td>`;
    h += `<td class='r'>${fN(item.qty)}</td>`;
    h += `<td style='font-size:9px'>${item.unit}</td>`;
    h += `<td class='r'>${fA(item.rate)}</td>`;
    h += `<td class='r' style='font-weight:700'>${fA(amt)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td colspan='6' style='text-align:right;font-size:8px;letter-spacing:1px;text-transform:uppercase'>Total Taxable Value</td><td class='r' style='font-family:monospace'>${fA(tv)}</td></tr></tfoot></table>`;

  // Totals
  h += `<div class='tw'>`;
  h += `<div class='rs'><div class='sl'>Remarks / Description</div>`;
  h += `<div style='font-size:9.5px;color:#374151;line-height:1.65'>${inv.remarks || 'As per work order and site instructions.'}</div>`;
  if (inv.eway_bill) h += `<div style='margin-top:8px;font-size:9px;color:#374151'><b>E-Way Bill:</b> ${inv.eway_bill}</div>`;
  h += `</div>`;
  h += `<div class='ts'>`;
  h += `<div class='ar'><span>Taxable Value</span><span style='font-family:monospace;color:#1a1a1a'>${fA(tv)}</span></div>`;
  if (isIntra) {
    h += `<div class='ar' style='color:#94a3b8;font-size:9px'><span>GST Type: CGST + SGST (intra-state KA)</span></div>`;
    h += `<div class='ar' style='padding-left:8px'><span>CGST @ ${gp / 2}%</span><span style='font-family:monospace;color:#1a1a1a'>${fA(half)}</span></div>`;
    h += `<div class='ar' style='padding-left:8px'><span>SGST @ ${gp / 2}%</span><span style='font-family:monospace;color:#1a1a1a'>${fA(half)}</span></div>`;
  } else {
    h += `<div class='ar' style='color:#94a3b8;font-size:9px'><span>GST Type: IGST (inter-state)</span></div>`;
    h += `<div class='ar' style='padding-left:8px'><span>IGST @ ${gp}%</span><span style='font-family:monospace;color:#1a1a1a'>${fA(ga)}</span></div>`;
  }
  h += `<div class='ar st'><span>Total (incl. GST)</span><span style='font-family:monospace'>${fA(total)}</span></div>`;
  if (tds > 0) h += `<div class='ar dc'><span>TDS deduction</span><span style='font-family:monospace'>- ${fA(tds)}</span></div>`;
  h += `<div class='ar gd'><span>Net Payable</span><span style='font-family:monospace'>${fA(netPayable)}</span></div>`;
  h += `</div></div>`;

  // Amount in words
  h += `<div class='iw'><b>Amount in Words:</b> ${wrd}</div>`;

  // IRN
  if (inv.irn) {
    h += `<div class='irn'>&#10004; <b>IRN:</b> ${inv.irn}${inv.eway_bill ? ` &nbsp;|&nbsp; <b>E-Way Bill:</b> ${inv.eway_bill}` : ''}<div style='font-size:8px;margin-top:3px;color:#15803d'>Computer-generated e-invoice. IRN obtained from GST portal.</div></div>`;
  } else {
    h += `<div class='ia'>&#9888; IRN not yet obtained — submit on GST portal to get IRN &amp; QR code before dispatch.</div>`;
  }

  // Signature & footer
  h += `<div class='sr'><div><div class='sl'>Declaration</div><div style='font-size:9.5px;color:#374151;line-height:1.7'>We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.</div></div>`;
  h += `<div style='text-align:right'><div class='sf'>For ${firm.name}</div><div class='sb'><div class='ss'></div><div class='su'>Authorised Signatory</div></div></div></div>`;
  h += `<div class='ft'>${firm.name} &nbsp;|&nbsp; GSTIN: ${firm.gst} &nbsp;|&nbsp; ${invNo} &nbsp;|&nbsp; Subject to Mangaluru jurisdiction</div>`;
  h += `</div></div></body></html>`;

  openPrint(h);
}

// ── CN/DN Print (Credit/Debit Note) ─────────────────────────────────

export function printCdnNote(note: CreditDebitNote): void {
  const firm = FIRMS.find(f => f.key === (note.firm || 'opc')) || FIRMS[0];
  const client = EI_CLIENTS.find(c => c.name === note.client_name) || { name: note.client_name || '', gstin: '', address: '', state: 'Karnataka', state_code: '29' };
  const isIntra = firm.gst.slice(0, 2) === (client.state_code || '29');
  const isCredit = note.note_type === 'Credit';
  const accentColor = isCredit ? '#dc2626' : '#2563eb';

  const tv = parseFloat(String(note.taxable_value || 0));
  const gp = parseFloat(String(note.gst_percent || 18));
  const ga = parseFloat(String(note.gst_amount || tv * gp / 100));
  const total = parseFloat(String(note.total_amount || tv + ga));
  const half = ga / 2;
  const ti = Math.round(total);
  const wrd = amountInWords(ti);
  const refDate = note.ref_inv_date ? new Date(note.ref_inv_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const noteDate = note.note_date ? new Date(note.note_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const docType = isCredit ? 'Credit Note' : 'Debit Note';

  let css = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a}';
  css += '.page{max-width:820px;margin:0 auto;border:1.5px solid #1a1a1a}';
  css += `.banner{background:${accentColor};padding:16px 20px;display:flex;justify-content:space-between;align-items:center}`;
  css += '.cn{color:#fff;font-size:14px;font-weight:800}.cs{color:rgba(255,255,255,.75);font-size:9px;margin-top:3px}.cg{color:rgba(255,255,255,.9);font-size:9px;font-weight:700;margin-top:2px}';
  css += '.ib{text-align:right}.ibt{color:rgba(255,255,255,.8);font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase}.ibn{color:#fff;font-size:16px;font-weight:800;font-family:monospace}';
  css += '.ref-bar{background:#fff3cd;border-bottom:1px solid #ffc107;padding:8px 16px;font-size:10px;color:#7c4f00;display:flex;gap:20px;align-items:center}';
  css += '.parties{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #1a1a1a}';
  css += '.party{padding:12px 16px}.plbl{font-size:8px;font-weight:800;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}';
  css += `.pn{font-size:12px;font-weight:800;color:#0f172a;margin-bottom:3px}.pa{font-size:10px;color:#374151;line-height:1.7}.pg{font-size:10px;font-weight:700;color:${accentColor};margin-top:4px}`;
  css += '.inv-meta{display:grid;grid-template-columns:repeat(3,1fr);background:#f8fafc;border-bottom:1px solid #d1d5db}';
  css += '.mc{padding:10px 14px;border-right:1px solid #d1d5db}.mc:last-child{border-right:none}';
  css += '.ml{font-size:8px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}.mv{font-size:11px;font-weight:700;color:#0f172a}';
  css += `.it{width:100%;border-collapse:collapse}.it th{background:${accentColor};color:#fff;padding:8px 12px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;font-weight:700}`;
  css += '.it td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:11px}.r{text-align:right;font-family:monospace}';
  css += '.totals{display:grid;grid-template-columns:1fr 1fr}';
  css += '.ns{padding:14px 16px;border-right:1px solid #e2e8f0}.nlbl{font-size:8px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}';
  css += `.as{padding:14px 16px}.ar{display:flex;justify-content:space-between;padding:4px 0;font-size:11px}.ar.tot{border-top:2px solid ${accentColor};margin-top:6px;padding-top:8px;font-weight:800;font-size:13px;color:${accentColor}}`;
  css += '.iw{background:#f8fafc;border-top:1px solid #e2e8f0;padding:8px 16px;font-size:10px;font-style:italic;color:#374151}';
  css += '.sr{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #e2e8f0;padding:16px}';
  css += '.slbl{font-size:8px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}';
  css += `.ftr{background:${accentColor};padding:8px 16px;font-size:9px;color:rgba(255,255,255,.75);text-align:center}`;
  css += '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

  let h = `<!DOCTYPE html><html><head><title>${note.note_no}</title><style>${css}</style></head><body><div class='page'>`;
  // Banner
  h += `<div class='banner'><div><div class='cn'>${firm.name}</div><div class='cs'>Kutherthooru, Mangaluru, Karnataka 574 143 | LL: 08246637172 | M: 8050196063 | sunny@sunnyengg.com</div><div class='cg'>GSTIN: ${firm.gst} | State: Karnataka (29)</div></div>`;
  h += `<div class='ib'><div class='ibt'>${docType}</div><div class='ibn'>${note.note_no}</div></div></div>`;
  // Reference bar
  h += `<div class='ref-bar'>📄 <b>Reference Invoice:</b>&nbsp;${note.ref_inv_no || '—'}&nbsp;&nbsp;|&nbsp;&nbsp;<b>Invoice Date:</b>&nbsp;${refDate}&nbsp;&nbsp;|&nbsp;&nbsp;<b>Reason:</b>&nbsp;${note.reason || '—'}</div>`;
  // Parties
  h += `<div class='parties'><div class='party' style='border-right:1px solid #1a1a1a'><div class='plbl'>Issued By</div><div class='pn'>${firm.name}</div><div class='pa'>Kutherthooru, Mangaluru, Karnataka 574 143</div><div class='pg'>GSTIN: ${firm.gst}</div></div>`;
  h += `<div class='party'><div class='plbl'>Issued To</div><div class='pn'>${client.name || ''}</div><div class='pa'>${client.address || ''}</div>${client.gstin ? `<div class='pg'>GSTIN: ${client.gstin}</div>` : ''}</div></div>`;
  // Meta
  h += `<div class='inv-meta'><div class='mc'><div class='ml'>${docType} Date</div><div class='mv'>${noteDate}</div></div><div class='mc'><div class='ml'>Note Number</div><div class='mv'>${note.note_no}</div></div><div class='mc'><div class='ml'>Site</div><div class='mv'>${note.site || '—'}</div></div></div>`;
  // Table
  h += `<table class='it'><thead><tr><th>#</th><th>Description</th><th class='r'>Taxable Amount (₹)</th></tr></thead><tbody><tr><td>1</td><td>${note.description || note.reason || docType + ' against ' + (note.ref_inv_no || '—')}</td><td class='r'>${fA(tv)}</td></tr></tbody></table>`;
  // Totals
  h += `<div class='totals'><div class='ns'><div class='nlbl'>Remarks</div><div style='font-size:11px;color:#374151'>${note.remarks || '—'}</div></div>`;
  h += `<div class='as'><div class='ar'><span>Taxable Value</span><span>₹${fA(tv)}</span></div>`;
  if (isIntra) {
    h += `<div class='ar'><span>CGST @ ${gp / 2}%</span><span>₹${fA(half)}</span></div><div class='ar'><span>SGST @ ${gp / 2}%</span><span>₹${fA(half)}</span></div>`;
  } else {
    h += `<div class='ar'><span>IGST @ ${gp}%</span><span>₹${fA(ga)}</span></div>`;
  }
  h += `<div class='ar tot'><span>${isCredit ? 'Credit Amount' : 'Debit Amount'}</span><span>₹${fA(total)}</span></div></div></div>`;
  // Amount in words
  h += `<div class='iw'><b>Amount in Words:</b> ${wrd}</div>`;
  // IRN
  if (note.irn) {
    h += `<div style='margin:10px 16px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;font-size:9px'>✔ <b>IRN:</b> ${note.irn}<div style='font-size:8px;margin-top:3px;color:#64748b'>Computer-generated e-document. IRN obtained from GST portal.</div></div>`;
  } else {
    h += `<div style='margin:10px 16px;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;font-size:9px;color:#92400e'>⚠ IRN not yet obtained — this is a draft document only.</div>`;
  }
  // Signature & footer
  h += `<div class='sr'><div><div class='slbl'>Declaration</div><div style='font-size:10px;color:#374151;line-height:1.7'>We declare that this ${isCredit ? 'credit' : 'debit'} note is issued in accordance with Section 34 of the CGST Act, 2017, and reflects actual adjustments to the original supply.</div></div>`;
  h += `<div style='text-align:right'><div class='slbl'>For ${firm.short}</div><div style='display:inline-block;border:1px solid #1a1a1a;border-top:3px solid ${accentColor};border-radius:0 0 4px 4px;padding:10px 24px 8px;min-width:170px;text-align:center'><div style='height:36px;border-bottom:1px dashed #cbd5e1;margin-bottom:6px'></div><div style='font-size:10px;color:#64748b;margin-top:4px'>Authorised Signatory</div></div></div></div>`;
  h += `<div class='ftr'>${docType} — ${firm.name} | GSTIN: ${firm.gst} | Ref: ${note.ref_inv_no || '—'} | Subject to Mangaluru jurisdiction</div></div></body></html>`;

  openPrint(h);
}

// ── Challan Print ───────────────────────────────────────────────────

export function printChallan(challan: Challan, issuedByName: string, designation: string): void {
  const from = DEFAULT_SITE_DETAILS.find(s => s.name === challan.from_site);
  const to = DEFAULT_SITE_DETAILS.find(s => s.name === challan.to_site);
  const itemDesc = challan.item_name + (challan.item_alias ? ` (${challan.item_alias})` : '');
  const rows = `<tr><td>${itemDesc}</td><td>—</td><td style="text-align:right">${challan.qty}</td><td>${challan.unit ?? 'Nos'}</td></tr>`;

  const html = `<!DOCTYPE html><html><head><title>Delivery Challan — ${challan.challan_no}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;padding:24px}
  h2{color:#0f172a;margin:0 0 2px}
  table{width:100%;border-collapse:collapse}
  th{background:#0f172a;color:#fff;padding:8px;text-align:left;font-size:10px}
  td{padding:8px;border-bottom:1px solid #e2e8f0}
  .header{display:flex;justify-content:space-between;margin-bottom:16px}
  .sig{margin-top:40px;display:flex;justify-content:space-between}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="header">
  <div>
    <h2>${COMPANY.name}</h2>
    <div>GSTIN: ${COMPANY.gstin} | ${COMPANY.phone}</div>
  </div>
  <div style="text-align:right">
    <h2>DELIVERY CHALLAN</h2>
    <div>No: ${challan.challan_no} | Date: ${fmtDate(challan.date || challan.created_at)}</div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
  <div style="background:#f8fafc;padding:12px;border-radius:6px">
    <div style="font-weight:700;margin-bottom:4px">FROM</div>
    <div>${challan.from_site}</div>
    ${from ? `<div>${from.address}, ${from.city}</div>` : ''}
    ${from?.gstin ? `<div>GSTIN: ${from.gstin}</div>` : ''}
  </div>
  <div style="background:#f8fafc;padding:12px;border-radius:6px">
    <div style="font-weight:700;margin-bottom:4px">TO</div>
    <div>${challan.to_site}</div>
    ${to ? `<div>${to.address}, ${to.city}</div>` : ''}
    ${to?.gstin ? `<div>GSTIN: ${to.gstin}</div>` : ''}
  </div>
</div>
<table>
  <thead><tr><th>Item Description</th><th>Serial / Tag No</th><th style="text-align:right">Qty</th><th>Unit</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
${challan.remarks ? `<p style="margin-top:12px;font-size:10px;color:#64748b">Remarks: ${challan.remarks}</p>` : ''}
<div class="sig">
  <div><div style="border-top:1px solid #000;padding-top:4px;width:200px">Received By</div></div>
  <div style="text-align:right">
    <div>${issuedByName}</div>
    <div style="color:#64748b">${designation}</div>
    <div style="border-top:1px solid #000;padding-top:4px;width:200px">Issued By</div>
  </div>
</div>
</body></html>`;
  openPrint(html);
}




export function printPO(po: PurchaseOrder): void {
  const rows = po.items.map((item, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${item.description}</td>
      <td style="text-align:center">${item.hsn_sac ?? '—'}</td>
      <td style="text-align:right">${item.qty}</td>
      <td>${item.unit}</td>
      <td style="text-align:right">₹${item.rate.toLocaleString('en-IN')}</td>
      <td style="text-align:right">₹${item.amount.toLocaleString('en-IN')}</td>
      <td style="text-align:center">${item.gst_rate}%</td>
      <td style="text-align:right">₹${((item.cgst ?? 0) + (item.sgst ?? 0) + (item.igst ?? 0)).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>PO — ${po.po_no}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;padding:20px}
  h2{margin:0}table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#0f172a;color:#fff;padding:6px;font-size:9px}
  td{padding:6px;border:1px solid #e2e8f0}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div style="display:flex;justify-content:space-between;margin-bottom:16px">
  <div><h2>${COMPANY.name}</h2><div>GSTIN: ${COMPANY.gstin}</div><div>${COMPANY.address}, ${COMPANY.city}</div></div>
  <div style="text-align:right"><h2>PURCHASE ORDER</h2><div>PO No: ${po.po_no}</div><div>Date: ${fmtDate(po.date)}</div><div>Site: ${po.site}</div></div>
</div>
<div style="background:#f8fafc;padding:12px;margin-bottom:16px;border-radius:6px">
  <strong>Vendor:</strong> ${po.vendor_name}<br/>
  ${po.vendor_gstin ? `<strong>GSTIN:</strong> ${po.vendor_gstin}<br/>` : ''}
  ${po.vendor_address ? `<strong>Address:</strong> ${po.vendor_address}` : ''}
</div>
<table>
  <thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th><th>GST%</th><th>GST Amt</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr><td colspan="6" style="text-align:right;font-weight:700">Sub Total</td><td colspan="3">₹${po.sub_total.toLocaleString('en-IN')}</td></tr>
    <tr><td colspan="6" style="text-align:right;font-weight:700">Total GST</td><td colspan="3">₹${po.total_gst.toLocaleString('en-IN')}</td></tr>
    <tr style="background:#f0fdf4"><td colspan="6" style="text-align:right;font-weight:800">Grand Total</td><td colspan="3" style="font-weight:800">₹${po.grand_total.toLocaleString('en-IN')}</td></tr>
    <tr><td colspan="9">${amountInWords(po.grand_total)}</td></tr>
  </tfoot>
</table>
${po.terms ? `<p style="margin-top:12px"><strong>Terms:</strong> ${po.terms}</p>` : ''}
<div style="margin-top:40px;text-align:right"><div style="border-top:1px solid #000;padding-top:4px;width:200px;display:inline-block">Authorised Signatory</div></div>
</body></html>`;
  openPrint(html);
}
