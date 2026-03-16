import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { SiteDetail } from '@/config/constants';
import { OUR_STATE_CODE } from '@/config/constants';

interface Props {
  sites: SiteDetail[];
  onSave: (sites: SiteDetail[]) => Promise<void>;
  loading: boolean;
}

const STATE_CODES: Record<string, string> = {
  "Karnataka": "29",
  "Maharashtra": "27",
  "Tamil Nadu": "33",
  "Kerala": "32",
  "Andhra Pradesh": "37",
  "Telangana": "36",
  "Gujarat": "24",
  "Delhi": "07",
  "Uttar Pradesh": "09",
  "West Bengal": "19"
};

export const SiteManagementTab: React.FC<Props> = ({ sites, onSave, loading }) => {
  const [localSites, setLocalSites] = useState<SiteDetail[]>([...sites]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSite, setNewSite] = useState<SiteDetail>({
    name: '',
    gstin: '',
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    state_code: OUR_STATE_CODE
  });

  const handleUpdate = (idx: number, k: keyof SiteDetail, v: string) => {
    const arr = [...localSites];
    arr[idx] = { ...arr[idx], [k]: v };
    if (k === 'state') arr[idx].state_code = STATE_CODES[v] || '';
    setLocalSites(arr);
  };

  const handleAdd = () => {
    if (!newSite.name.trim()) return alert('Site name required');
    setLocalSites([...localSites, newSite]);
    setNewSite({
      name: '',
      gstin: '',
      address: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
      state_code: OUR_STATE_CODE
    });
    setShowAdd(false);
  };

  const lS: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block' };
  const iS: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>Site Management</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => setShowAdd(!showAdd)}>+ Add Site</Button>
          <Button onClick={() => onSave(localSites)} disabled={loading}>{loading ? 'Saving...' : 'Save All Changes'}</Button>
        </div>
      </div>

      {showAdd && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#f97316', letterSpacing: 2, marginBottom: 12 }}>NEW SITE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lS}>Site Name</label>
              <input style={iS} value={newSite.name} onChange={e => setNewSite({ ...newSite, name: e.target.value })} />
            </div>
            <div>
              <label style={lS}>GSTIN</label>
              <input style={iS} value={newSite.gstin} onChange={e => setNewSite({ ...newSite, gstin: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lS}>Address</label>
              <input style={iS} value={newSite.address} onChange={e => setNewSite({ ...newSite, address: e.target.value })} />
            </div>
            <div>
              <label style={lS}>City</label>
              <input style={iS} value={newSite.city} onChange={e => setNewSite({ ...newSite, city: e.target.value })} />
            </div>
            <div>
              <label style={lS}>State</label>
              <select style={iS} value={newSite.state} onChange={e => setNewSite({ ...newSite, state: e.target.value, state_code: STATE_CODES[e.target.value] || '' })}>
                {Object.keys(STATE_CODES).map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleAdd} style={{ marginTop: 12 }}>Confirm Add</Button>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {localSites.map((site, idx) => (
          <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
            {editingIdx === idx ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lS}>Site Name</label>
                  <input style={iS} value={site.name} onChange={e => handleUpdate(idx, 'name', e.target.value)} />
                </div>
                <div>
                  <label style={lS}>GSTIN</label>
                  <input style={iS} value={site.gstin} onChange={e => handleUpdate(idx, 'gstin', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lS}>Address</label>
                  <input style={iS} value={site.address} onChange={e => handleUpdate(idx, 'address', e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button onClick={() => setEditingIdx(null)} style={{ fontSize: 11 }}>Done</Button>
                  <Button variant="danger" onClick={() => { setLocalSites(localSites.filter((_, i) => i !== idx)); setEditingIdx(null); }} style={{ fontSize: 11 }}>Remove</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#f97316', fontSize: 14, marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>{site.name}</div>
                  {site.gstin && <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>GSTIN: <b>{site.gstin}</b></div>}
                  <div style={{ fontSize: 12, color: '#64748b' }}>{[site.address, site.city, site.state, site.pincode].filter(Boolean).join(', ')}</div>
                </div>
                <Button variant="ghost" onClick={() => setEditingIdx(idx)} style={{ fontSize: 10 }}>Edit</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
