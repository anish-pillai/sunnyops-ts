import { db } from '@/config/supabase';
import type { Bill } from '@/types/bill.types';

/**
 * Corrected balance formula.
 *
 * Balance = Amount(Incl GST)
 *         − TDS − TDS on GST − Credit Notes           ← permanently gone (paid to govt)
 *         − Amount Credited                            ← cash received in bank
 *         − Holds returned (SD/HRA/GST/DLP/Retention/Others/Fines received back)
 */
export function getBal(b: Bill): number {
  const base = Number(b.amount_with_gst || b.amount || 0);

  // Permanent deductions — only TDS and credit notes (irrecoverable)
  const permDed = ['tds', 'tds_on_gst', 'credit_note', 'credit_note2']
    .reduce((s, k) => s + Number((b as any)[k] || 0), 0);

  // Cash received in bank
  const credited = Number(b.amount_credited || 0);

  // Holds returned — these are cash that came back to us
  const holdsReturned = [
    'sd_received', 'hra_received', 'gst_received', 'others_received',
    'fines_received', 'dlp_received', 'retention_received',
  ].reduce((s, k) => s + Number((b as any)[k] || 0), 0);

  return Math.max(0, base - permDed - credited - holdsReturned);
}

/**
 * Live payment status computed from field values.
 * Returns status label and hold breakdown tags.
 */
export interface PaymentStatusResult {
  status: 'RECEIVED' | 'Partially Received' | 'Pending';
  tags: string[];
}

export function getPaymentStatus(b: Bill): PaymentStatusResult {
  const bal = getBal(b);
  const tags: string[] = [];

  // Calculate pending holds
  const sdPend = Math.max(0, Number(b.security_deposit || 0) - Number(b.sd_received || 0));
  const hraPend = Math.max(0, Number(b.hra_deduction || 0) - Number(b.hra_received || 0));
  const gstPend = Math.max(0, Number(b.gst_hold || 0) - Number(b.gst_received || 0));
  const otherPend = Math.max(0, Number(b.other_deductions || 0) - Number(b.others_received || 0));
  const finesPend = Math.max(0, Number(b.fines_penalty || 0) - Number(b.fines_received || 0));
  const dlpPend = Math.max(0, Number(b.dlp_hold || 0) - Number(b.dlp_received || 0));
  const retPend = Math.max(0, Number(b.retention_hold || 0) - Number(b.retention_received || 0));

  if (sdPend > 0) tags.push(`SD Hold: ₹${sdPend.toLocaleString('en-IN')}`);
  if (hraPend > 0) tags.push(`HRA Hold: ₹${hraPend.toLocaleString('en-IN')}`);
  if (gstPend > 0) tags.push(`GST Hold: ₹${gstPend.toLocaleString('en-IN')}`);
  if (dlpPend > 0) tags.push(`DLP Hold: ₹${dlpPend.toLocaleString('en-IN')}`);
  if (retPend > 0) tags.push(`Retention: ₹${retPend.toLocaleString('en-IN')}`);
  if (finesPend > 0) tags.push(`Fines: ₹${finesPend.toLocaleString('en-IN')}`);
  if (otherPend > 0) tags.push(`Other Hold: ₹${otherPend.toLocaleString('en-IN')}`);

  if (bal === 0) return { status: 'RECEIVED', tags };

  const credited = Number(b.amount_credited || 0);
  if (credited > 0 || tags.length > 0) {
    return { status: 'Partially Received', tags };
  }

  return { status: 'Pending', tags };
}

/**
 * Compute changed fields between old and new bill objects.
 */
export function diffBill(
  oldBill: Record<string, any>,
  newBill: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};
  const allKeys = new Set([...Object.keys(oldBill), ...Object.keys(newBill)]);

  for (const key of allKeys) {
    if (['id', 'created_at', 'updated_at', 'updated_by'].includes(key)) continue;
    const oldVal = oldBill[key] ?? '';
    const newVal = newBill[key] ?? '';
    if (String(oldVal) !== String(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }
  return changes;
}

/**
 * Log a bill audit entry to the bill_audit_log table.
 */
export async function logBillAudit(
  billId: string,
  invNo: string,
  action: 'CREATED' | 'EDITED' | 'DELETED' | 'IMPORTED' | 'IMPORT-UPDATE',
  changedFields: Record<string, any>,
  userName: string,
  userRole: string
): Promise<void> {
  try {
    await db.from('bill_audit_log').insert([{
      bill_id: billId,
      inv_no: invNo,
      action,
      changed_fields: changedFields,
      done_by: userName,
      done_by_role: userRole,
    }]);
  } catch (err) {
    console.error('Failed to log bill audit:', err);
  }
}
