import React, { useEffect, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { fmtDate } from '@/utils/formatters';
import { INVENTORY_CATEGORIES, CONDITIONS, UNITS, DEFAULT_SITE_DETAILS } from '@/config/constants';
import type { InventoryItem } from '@/types/inventory.types';

interface Props { isAdmin: boolean; uName: string; showToast: (msg: string, type?: 'ok' | 'err') => void; }
const SITES = DEFAULT_SITE_DETAILS.map(s => s.name);
const blank: Omit<InventoryItem, 'id' | 'created_at'> = { name: '', alias: '', serial_no: '', category: 'PPE', site: 'MRPL', qty: 0, min_qty: 1, unit: 'Nos', condition: 'Good', purchased_from: '', purchase_date: '', expiry_date: '', tpi_cert_no: '', tpi_expiry: '' };

export const InventoryTab: React.FC<Props> = ({ isAdmin, uName, showToast }) => {
  const { items, loading, fetch, save, remove } = useInventory();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modal, setModal] = useState<{ type: 'add' | 'edit'; item?: InventoryItem } | null>(null);
  const [form, setForm] = useState<Omit<InventoryItem, 'id' | 'created_at'>>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = items.filter(i => {
    const s = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.alias ?? '').toLowerCase().includes(search.toLowerCase());
    const c = catFilter === 'All' || i.category === catFilter;
    return s && c;
  });

  const sf = (k: keyof typeof form, v: string | number) => setForm(p => ({ ...p, [k]: v }));
  const openAdd = () => { setForm(blank); setModal({ type: 'add' }); };
  const openEdit = (item: InventoryItem) => { setForm({ ...item }); setModal({ type: 'edit', item }); };

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Item name required', 'err');
    setSaving(true);
    const err = await save({ ...form, updated_by: uName }, modal?.item?.id);
    setSaving(false);
    if (err) return showToast(err, 'err');
    showToast(`Item ${modal?.type === 'edit' ? 'updated' : 'added'}`);
    setModal(null);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const err = await remove(item.id);
    err ? showToast(err, 'err') : showToast('Item deleted');
  };

  if (loading) return <Spinner />;

  const inp = (label: string, key: keyof typeof form, type = 'text', span = false) => (
    <div style={span ? { gridColumn: '1/-1' } : {}}>
      <label style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, display: 'block', marginBottom: 4 }}>{label.toUpperCase()}</label>
      <input type={type} value={form[key] as string | number}
        onChange={e => sf(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
    </div>
  );

  const sel = (label: string, key: keyof typeof form, opts: readonly string[]) => (
    <div>
      <label style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, display: 'block', marginBottom: 4 }}>{label.toUpperCase()}</label>
      <select value={form[key] as string} onChange={e => sf(key, e.target.value)}
        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#f8fafc' }}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, minWidth: 180 }} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#f8fafc' }}>
            <option>All</option>
            {INVENTORY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        {isAdmin && <Button onClick={openAdd}>+ Add Equipment</Button>}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['Total Items', items.length, '#0f172a'], ['Low Stock', items.filter(i => i.qty <= i.min_qty).length, '#dc2626'], ['TPI Expiring', items.filter(i => i.tpi_expiry && new Date(i.tpi_expiry) < new Date()).length, '#d97706']].map(([l, v, c]) => (
          <div key={l as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 20px', flex: 1, minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: c as string }}>{v}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Name', 'Category', 'Site', 'Qty', 'Condition', 'Expiry / TPI', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No items found</td></tr>
              : filtered.map(item => {
                const low = item.qty <= item.min_qty;
                const tpiExp = item.tpi_expiry && new Date(item.tpi_expiry) < new Date();
                const condClr = { Good: '#16a34a', Fair: '#d97706', Poor: '#dc2626', Condemned: '#7c3aed' }[item.condition] ?? '#64748b';
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      {item.alias && <div style={{ fontSize: 10, color: '#94a3b8' }}>{item.alias}</div>}
                      {item.serial_no && <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}>{item.serial_no}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{item.category}</td>
                    <td style={{ padding: '12px 14px' }}><span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{item.site}</span></td>
                    <td style={{ padding: '12px 14px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, color: low ? '#dc2626' : '#0f172a', whiteSpace: 'nowrap' }}>{item.qty} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}>{item.unit}</span></td>
                    <td style={{ padding: '12px 14px' }}><span style={{ background: condClr + '18', color: condClr, borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>{item.condition}</span></td>
                    <td style={{ padding: '12px 14px', color: tpiExp ? '#dc2626' : '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {item.tpi_expiry ? `TPI: ${fmtDate(item.tpi_expiry)}` : item.expiry_date ? fmtDate(item.expiry_date) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="info" style={{ fontSize: 9, padding: '3px 8px' }} onClick={() => openEdit(item)}>✎</Button>
                        {isAdmin && <Button variant="danger" style={{ fontSize: 9, padding: '3px 8px' }} onClick={() => handleDelete(item)}>✕</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modal.type === 'edit' ? 'Edit Equipment' : 'Add Equipment'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {inp('Equipment Name *', 'name', 'text', true)}
            {inp('Alias / Short Name', 'alias')}
            {inp('Serial / Tag No', 'serial_no')}
            {sel('Category', 'category', INVENTORY_CATEGORIES)}
            {sel('Site / Location', 'site', SITES)}
            {inp('Current Qty', 'qty', 'number')}
            {inp('Min Qty Alert', 'min_qty', 'number')}
            {sel('Unit', 'unit', UNITS)}
            {sel('Condition', 'condition', CONDITIONS)}
            {inp('Purchased From', 'purchased_from', 'text', true)}
            {inp('Purchase Date', 'purchase_date', 'date')}
            {inp('Expiry / Warranty Date', 'expiry_date', 'date')}
            {form.category === 'Lifting & Rigging' && inp('TPI Cert No', 'tpi_cert_no')}
            {form.category === 'Lifting & Rigging' && inp('TPI Expiry Date', 'tpi_expiry', 'date')}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Button onClick={handleSave} loading={saving} style={{ flex: 1, padding: '11px 0' }}>
              {modal.type === 'edit' ? '✓ Save Changes' : '+ Add Equipment'}
            </Button>
            <Button variant="ghost" onClick={() => setModal(null)} style={{ flex: 1, padding: '11px 0' }}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
