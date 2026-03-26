import React, { useEffect, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { InventoryDetailPopup } from './InventoryDetailPopup';
import { InventoryListPopup } from './InventoryListPopup';
import { ChallanModal } from './components/ChallanModal';
import { ImportPreview } from './components/ImportPreview';
import { db } from '@/config/supabase';
import * as XLSX from 'xlsx';
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
  const [challanModal, setChallanModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const exportItemsXLSX = () => {
    const ObjectRows = [['Name', 'Category', 'Unit', 'Qty', 'Min Qty', 'Unit Cost', 'Site']];
    filtered.forEach(it => {
      ObjectRows.push([it.name || '', it.category || '', it.unit || '', it.qty || 0, it.min_qty || 0, (it as any).unit_cost || 0, it.site || '']);
    });
    const ws = XLSX.utils.aoa_to_sheet(ObjectRows);
    ws['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Store Items');
    XLSX.writeFile(wb, `store_items_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportItemsPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    let html = `<html><head><title>Inventory Report</title><style>
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; font-size: 11px; color: #333; padding: 20px; }
      .header-container { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; }
      .logo-section { display: flex; align-items: center; gap: 15px; }
      .logo-img { height: 50px; width: 50px; object-fit: contain; }
      .company-info h1 { margin: 0; font-size: 18px; color: #e87c38; font-weight: 600; letter-spacing: 0.5px; }
      .company-details { font-size: 10px; color: #64748b; margin-top: 4px; }
      .date-section { font-size: 11px; color: #64748b; margin-bottom: 2px; }
      .divider { height: 3px; background-color: #e87c38; border: none; margin: 15px 0 20px 0; }
      .report-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 15px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background-color: #e87c38; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
      td { border-bottom: 1px solid #f1f5f9; padding: 8px; color: #334155; }
      tr:nth-child(even) { background-color: #fafafa; }
      .qty-cell { font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 11px; }
    </style></head><body>
      <div class="header-container">
        <div class="logo-section">
          <img src="/logo.png" class="logo-img" onerror="this.style.display='none'" />
          <div class="company-info">
            <h1>P. Sunny Engineering Contractors (OPC) Pvt. Ltd.</h1>
            <div class="company-details">Mangaluru, Karnataka 575030 | GSTIN: 29AAOCP5225B1ZE | LL: 08246637172 | M: 8050196063 | sunny@sunnyengg.com</div>
          </div>
        </div>
        <div class="date-section">Date: ${dateStr}</div>
      </div>
      <hr class="divider" />
      <div class="report-title">Inventory Report</div>
      <table>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Equipment</th>
          <th>Alias</th>
          <th>Category</th>
          <th>Site</th>
          <th style="width: 60px;">Qty</th>
          <th style="width: 60px;">Unit</th>
          <th>Condition</th>
          <th>Serial No.</th>
        </tr>`;
    
    filtered.forEach((it, idx) => {
      html += `<tr>
        <td>${idx + 1}</td>
        <td style="font-weight: 600; color: #1e293b; text-transform: uppercase;">${it.name}</td>
        <td>${it.alias || '-'}</td>
        <td>${it.category}</td>
        <td>${it.site}</td>
        <td class="qty-cell">${it.qty}</td>
        <td>${it.unit}</td>
        <td>${it.condition}</td>
        <td>${it.serial_no || '-'}</td>
      </tr>`;
    });
    
    html += `</table>
      <script>
        window.onload = function() { 
          setTimeout(() => { window.print(); }, 500);
        }
      </script>
    </body></html>`;
    
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    } else {
      showToast('Popup blocked! Allow popups to print PDF.', 'err');
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Category', 'Unit', 'Qty', 'Unit Cost', 'Site'],
      ['Example Equipment', 'PPE', 'Nos', 10, 500, 'MRPL']
    ]);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Inventory_Template_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
      
      const headerIdx = raw.findIndex((r: any[]) => r?.[0]?.toString().toLowerCase().trim() === 'name');
      if (headerIdx < 0) return showToast('Invalid template: No "Name" header found', 'err');
      
      const headers = raw[headerIdx].map((h: any) => h?.toString().toLowerCase().trim());
      const rows = raw.slice(headerIdx + 1).filter((r: any[]) => {
        const nCol = headers.indexOf('name');
        return nCol >= 0 && r[nCol]?.toString().trim();
      });
      
      const parsed = rows.map((r: any[]) => {
        const get = (c: string) => r[headers.indexOf(c)];
        return {
          name: get('name')?.toString().trim(),
          category: get('category')?.toString().trim() || 'General',
          unit: get('unit')?.toString().trim() || 'Nos',
          qty: parseFloat(get('qty')) || 0,
          unit_cost: parseFloat(get('unit_cost')) || 0,
          site: get('site')?.toString().trim() || 'MRPL'
        };
      });

      const newItems: any[] = [];
      const updatedItems: any[] = [];
      const errors: any[] = [];

      parsed.forEach((row, i) => {
        if (!row.name || row.qty <= 0) {
          errors.push({ row: i + headerIdx + 2, reason: 'Invalid name or quantity' });
          return;
        }
        const existing = items.find(it => it.name.toLowerCase() === row.name.toLowerCase() && it.site === row.site);
        if (existing) {
          updatedItems.push({ id: existing.id, oldQty: existing.qty, newQty: existing.qty + row.qty, ...row, name: existing.name });
        } else {
          newItems.push(row);
        }
      });

      setImportPreview({ newItems, updatedItems, errors });
    } catch (err: any) {
      showToast(`Import parsing error: ${err.message}`, 'err');
    } finally {
      e.target.value = '';
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setSaving(true);
    const { newItems, updatedItems } = importPreview;
    
    try {
      if (newItems.length > 0) {
        const toAdd = newItems.map((n: any) => ({
          ...n,
          min_qty: 1, condition: 'Good',
          created_at: new Date().toISOString(),
          created_by_name: uName
        }));
        await db.from('inventory').insert(toAdd);
      }
      
      for (const u of updatedItems) {
        await db.from('inventory').update({ qty: u.newQty, updated_by: uName, updated_at: new Date().toISOString() }).eq('id', u.id);
      }
      
      showToast(`Import successful: ${newItems.length} new, ${updatedItems.length} updated`);
      await fetch();
      setImportPreview(null);
    } catch (err: any) {
      showToast(`Database error: ${err.message}`, 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChallan = async (data: any, selectedItem: InventoryItem) => {
    setSaving(true);
    try {
      // Decrement source
      const newSrcQty = Math.max(0, selectedItem.qty - data.qty);
      await db.from('inventory').update({ qty: newSrcQty, updated_by: uName, updated_at: new Date().toISOString() }).eq('id', selectedItem.id);

      // Increment/Create destination
      const dstItem = items.find(i => i.site === data.toSite && i.name.toLowerCase() === selectedItem.name.toLowerCase());
      if (dstItem) {
        await db.from('inventory').update({ qty: dstItem.qty + data.qty, updated_by: uName, updated_at: new Date().toISOString() }).eq('id', dstItem.id);
      } else {
        const payload = { ...selectedItem, site: data.toSite, qty: data.qty, updated_by: uName, updated_at: new Date().toISOString() };
        delete (payload as any).id;
        delete (payload as any).created_at;
        await db.from('inventory').insert([payload]);
      }

      await db.from('challans').insert([{
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        qty: data.qty,
        from_site: data.fromSite,
        to_site: data.toSite,
        remarks: data.remarks,
        requested_by: data.requestedBy,
        created_by: uName
      }]);

      showToast(`Challan created: Transfered ${data.qty} to ${data.toSite}`);
      await fetch();
      setChallanModal(false);
    } catch (err: any) {
      showToast(`Transfer error: ${err.message}`, 'err');
    } finally {
      setSaving(false);
    }
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
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImport} />
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={exportItemsXLSX}>Export</Button>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={exportItemsPDF}>↓ PDF</Button>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => fileInputRef.current?.click()}>Import</Button>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={downloadTemplate}>🔥 Template</Button>
        <Button variant="ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => setChallanModal(true)}>New Challan</Button>
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
          allItems={items}
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
      
      {/* Challan Modal */}
      {challanModal && (
        <ChallanModal
          items={items}
          onClose={() => setChallanModal(false)}
          onSave={handleCreateChallan}
          saving={saving}
        />
      )}
      
      {/* Import Preview */}
      {importPreview && (
        <ImportPreview
          parsed={importPreview}
          onClose={() => setImportPreview(null)}
          onConfirm={confirmImport}
          saving={saving}
        />
      )}
    </div>
  );
};
