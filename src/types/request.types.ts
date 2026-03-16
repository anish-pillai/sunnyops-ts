export type RequestType = 'Mobilization' | 'Demobilization' | 'From Stock' | 'Material' | 'Service' | 'Normal' | string;

export type RequestStatus =
  | 'Pending'
  | 'Under Review'
  | 'Stock Checked'
  | 'Needs Procurement'
  | 'With Planning'
  | 'With Director'
  | 'Forwarded to Admin'
  | 'Approved'
  | 'Rejected'
  | string;

export interface SiteRequest {
  id: string;
  request_type: RequestType;
  requesting_site: string;
  status: RequestStatus;
  priority?: string;
  item_name?: string;
  item_id?: number | string;
  qty?: number;
  remarks?: string;
  required_by?: string;
  raised_by?: string;
  raised_by_name?: string;
  created_at: string;
  tat_note?: string;
  action_note?: string;
  purchase_items?: string;
  challan_no?: string;
  plan_id?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface Challan {
  id: string;
  challan_no: string;
  date: string;
  item_id?: number | string;
  item_name: string;
  item_alias?: string;
  category?: string;
  unit?: string;
  condition?: string;
  from_site: string;
  to_site: string;
  qty: number;
  remarks?: string;
  issued_by?: string;
  issued_by_name?: string;
  created_by_name?: string;
  requested_by?: string;
  reviewed_by_name?: string;
  purpose?: string;
  ewb_no?: string;
  ewb_valid_upto?: string;
  created_at: string;
}
