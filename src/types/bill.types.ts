export type BillStatus = 'Pending' | 'Partial' | 'Paid';

export interface Bill {
  id: string;
  site: string;
  inv_no: string;
  invoice_date: string;
  bill_details: string;
  amount: number;
  amount_with_gst: number;
  balance_to_receive?: number;
  tds?: number;
  tds_on_gst?: number;
  security_deposit?: number;
  hra_deduction?: number;
  gst_hold?: number;
  other_deductions?: number;
  credit_note?: number;
  credit_note2?: number;
  hra_received?: number;
  sd_received?: number;
  gst_received?: number;
  others_received?: number;
  amount_credited?: number;
  wo_no?: string;
  bill_status: string;
  gst_status?: string;
  status2?: string;
  remarks?: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
}

export interface WorkOrder {
  id: string;
  wo_no: string;
  site: string;
  description: string;
  wo_value: number;
  start_date?: string;
  end_date?: string;
  parent_wo_no?: string;
  amendment_no?: number;
  created_at: string;
  updated_at?: string;
}

export interface EInvoiceLineItem {
  id?: number | string;
  description?: string;
  desc?: string;
  hsn_sac?: string;
  hsn?: string;
  qty: number | string;
  unit: string;
  rate: number | string;
  amount: number | string;
  gst_rate?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export interface EInvoice {
  id: string;
  inv_no?: string;
  invoice_no: string;
  invoice_date: string;
  firm?: string;
  client_name?: string;
  wo_no?: string;
  site: string;
  items?: EInvoiceLineItem[];
  line_items?: string | EInvoiceLineItem[];
  taxable_value?: number;
  gst_type?: string;
  gst_percent?: number | string;
  gst_amount?: number;
  sub_total?: number;
  total_gst?: number;
  total_amount?: number;
  grand_total?: number;
  tds_amount?: number | string;
  irn?: string;
  eway_bill?: string;
  description?: string;
  remarks?: string;
  bill_id?: string;
  signed_by?: string;
  signed_desig?: string;
  signed_at?: string;
  status: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

export interface CreditDebitNote {
  id: string;
  note_no: string;
  note_type: 'Credit' | 'Debit';
  note_date: string;
  ref_inv_no?: string;
  ref_inv_id?: string;
  ref_inv_date?: string;
  client_name?: string;
  site: string;
  firm?: string;
  gst_percent?: number | string;
  taxable_value: number | string;
  gst_amount?: number | string;
  total_amount: number | string;
  tds_amount?: number | string;
  reason: string;
  description?: string;
  irn?: string;
  status: string;
  bill_id?: string;
  remarks?: string;
  signed_by?: string;
  signed_desig?: string;
  signed_at?: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

export interface Payable {
  id: string;
  vendor: string;
  vendor_gstin?: string;
  site: string;
  category: string;
  invoice_no?: string;
  po_no?: string;
  description?: string;
  amount: number | string;
  gst_percent?: string;
  amount_with_gst?: number | string;
  due_date?: string;
  status: string;
  paid_date?: string;
  payment_mode?: string;
  remarks?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BankAccount {
  name: string;
  account_no: string;
  ifsc: string;
  balance?: number;
  isOD?: boolean;
  odLimit?: number;
}
