import React, { useEffect, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { InventoryDetailPopup } from './InventoryDetailPopup';
import { InventoryListPopup } from './InventoryListPopup';
import { INVENTORY_CATEGORIES, CONDITIONS, UNITS, DEFAULT_SITE_DETAILS } from '@/config/constants';
import type { InventoryItem } from '@/types/inventory.types';

interface Props { isAdmin: boolean; uName: string; showToast: (msg: string, type?: 'ok' | 'err') => void; }
const SITES = DEFAULT_SITE_DETAILS.map(s => s.name);
const blank: Omit<InventoryItem, 'id' | 'created_at'> = { name: '', alias: '', serial_no: '', category: 'PPE', site: 'MRPL', qty: 0, min_qty: 1, unit: 'Nos', condition: 'Good', purchased_from: '', purchase_date: '', expiry_date: '', tpi_cert_no: '', tpi_expiry: '' };

export const InventoryTab: React.FC<Props> = ({ isAdmin, uName, showToast }) => {
  const { items, loading, fetch, save, remove } = useInventory();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [siteFilter, setSiteFilter] = useState('All');
  const [condFilter, setCondFilter] = useState('All');
  const [modal, setModal] = useState<{ type: 'add' | 'edit'; item?: InventoryItem } | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [listPopup, setListPopup] = useState<{ type: 'low_stock' | 'tpi_expiring'; items: InventoryItem[] } | null>(null);
  const [form, setForm] = useState<Omit<InventoryItem, 'id' | 'created_at'>>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = items.filter(i => {
    const s = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.alias ?? '').toLowerCase().includes(search.toLowerCase());
    const c = catFilter === 'All' || i.category === catFilter;
    const l = siteFilter === 'All' || i.site === siteFilter;
    const d = condFilter === 'All' || i.condition === condFilter;
    return s && c && l && d;
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
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input placeholder="Search equipment..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, minWidth: 200, flex: 1 }} />
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', minWidth: 140 }}>
          <option value="All">All Locations</option>
          {SITES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', minWidth: 140 }}>
          <option value="All">All Categories</option>
          {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={condFilter} onChange={e => setCondFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', minWidth: 140 }}>
          <option value="All">All Conditions</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => showToast('Export coming soon')}>Export</Button>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => showToast('PDF coming soon')}>↓ PDF</Button>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => showToast('Import coming soon')}>Import</Button>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => showToast('Template coming soon')}>🔥 Template</Button>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => showToast('New Challan coming soon')}>New Challan</Button>
        <div style={{ flex: 1 }} />
        {isAdmin && <Button onClick={openAdd} style={{ padding: '8px 20px' }}>+ Add Item</Button>}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Items', value: items.length, color: '#0f172a', onClick: null },
          { label: 'Low Stock', value: items.filter(i => i.qty <= i.min_qty).length, color: '#dc2626', onClick: () => setListPopup({ type: 'low_stock', items: items.filter(i => i.qty <= i.min_qty) }) },
          { label: 'TPI Expiring', value: items.filter(i => i.tpi_expiry && new Date(i.tpi_expiry) < new Date()).length, color: '#d97706', onClick: () => setListPopup({ type: 'tpi_expiring', items: items.filter(i => i.tpi_expiry && new Date(i.tpi_expiry) < new Date()) }) }
        ].map((s) => (
          <div 
            key={s.label} 
            onClick={s.onClick || undefined}
            style={{ 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: 8, 
              padding: '12px 20px', 
              flex: 1, 
              minWidth: 110,
              cursor: s.onClick ? 'pointer' : 'default',
              transition: 'all 0.2s',
              ...(s.onClick ? { ':hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderColor: s.color + '44' } } : {})
            }}
            onMouseOver={e => s.onClick && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)', e.currentTarget.style.borderColor = s.color + '44')}
            onMouseOut={e => s.onClick && (e.currentTarget.style.transform = 'none', e.currentTarget.style.boxShadow = 'none', e.currentTarget.style.borderColor = '#e2e8f0')}
          >
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <DataTable<InventoryItem>
        columns={[
          { header: 'Equipment', render: (item) => (
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', textDecoration: 'underline', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setDetailItem(item); }}>{item.name}</div>
              {item.alias && <div style={{ fontSize: 10, color: '#f97316', fontFamily: 'IBM Plex Mono, monospace' }}>{item.alias}</div>}
            </div>
          )},
          { header: 'Serial No.', render: (item) => <span style={{ color: '#64748b', fontSize: 11 }}>{item.serial_no || '—'}</span> },
          { header: 'Category', render: (item) => <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 600 }}>{item.category}</span> },
          { header: 'Location', render: (item) => <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{item.site}</span> },
          { header: 'Qty', render: (item) => (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 800, fontSize: 16, color: item.qty <= item.min_qty ? '#dc2626' : '#0f172a' }}>{item.qty}</span>
              <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10, marginLeft: 4 }}>{item.unit}</span>
            </div>
          ), align: 'right' },
          { header: 'Status', render: (item) => {
            const low = item.qty <= item.min_qty;
            const condBad = item.condition === 'Poor' || item.condition === 'Condemned';
            const tpiExp = item.tpi_expiry && new Date(item.tpi_expiry) < new Date();
            if (condBad) return <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{item.condition}</span>;
            if (tpiExp) return <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>TPI EXP</span>;
            if (low) return <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>LOW</span>;
            return <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>OK</span>;
          }},
          { header: '', render: (item) => (
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="info" style={{ fontSize: 9, padding: '3px 8px' }} onClick={(e) => { e.stopPropagation(); openEdit(item); }}>✎</Button>
              {isAdmin && <Button variant="danger" style={{ fontSize: 9, padding: '3px 8px' }} onClick={(e) => { e.stopPropagation(); handleDelete(item); }}>✕</Button>}
            </div>
          )},
        ]}
        data={filtered}
        onRowClick={setDetailItem}
        emptyMessage="No items found"
        initialPageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
      />

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
      
      {/* Detail Popup */}
      {detailItem && (
        <InventoryDetailPopup
          item={detailItem}
          isAdmin={isAdmin}
          onClose={() => setDetailItem(null)}
          onEdit={openEdit}
        />
      )}
      {/* List Popup */}
      {listPopup && (
        <InventoryListPopup
          title={listPopup.type === 'low_stock' ? 'Low Stock Items' : 'TPI Expiring Items'}
          items={listPopup.items}
          type={listPopup.type}
          onClose={() => setListPopup(null)}
          onItemClick={(item) => {
            setListPopup(null);
            setDetailItem(item);
          }}
        />
      )}
    </div>
  );
};
