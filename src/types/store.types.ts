export interface StoreItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  site: string;
  qty: number;
  min_qty: number;
  unit: string;
  unit_cost: number;
  bill_no?: string;
  supplier?: string;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface StoreIssue {
  id: string;
  item_id: string;
  item_name: string;
  site: string;
  qty: number;
  issued_to: string;
  work_order?: string;
  purpose?: string;
  type?: 'Issue' | 'Transfer' | 'Return' | 'Stock In';
  issued_by: string;
  issued_at: string;
}

export interface GRNImportRow {
  name: string;
  category: string;
  unit: string;
  qty: number;
  unit_cost: number;
  site: string;
}
