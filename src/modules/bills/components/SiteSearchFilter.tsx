import React, { useState, useRef, useEffect } from 'react';

interface Props {
  sites: string[];
  value: string;
  onChange: (v: string) => void;
}

/**
 * SiteSearchFilter — autocomplete dropdown for site selection.
 * Built dynamically from actual data (sites extracted from bills).
 */
export const SiteSearchFilter: React.FC<Props> = ({ sites, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value === 'All' ? '' : value);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = sites.filter(s =>
    !query || s.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 150 }}>
      <input
        value={query}
        placeholder="Filter site..."
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange('All');
        }}
        style={{
          padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6,
          fontSize: 12, width: '100%', background: '#f8fafc', boxSizing: 'border-box',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
          maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <div
            onClick={() => { onChange('All'); setQuery(''); setOpen(false); }}
            style={{
              padding: '8px 12px', cursor: 'pointer', fontSize: 12,
              fontWeight: value === 'All' ? 700 : 400,
              background: value === 'All' ? '#fff7ed' : '#fff',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            All Sites
          </div>
          {filtered.map(s => (
            <div
              key={s}
              onClick={() => { onChange(s); setQuery(s); setOpen(false); }}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 12,
                fontWeight: value === s ? 700 : 400,
                background: value === s ? '#fff7ed' : '#fff',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
