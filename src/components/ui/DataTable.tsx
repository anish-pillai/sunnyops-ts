import React, { useState, useMemo } from 'react';
import { Button } from './Button';

export interface Column<T> {
  header: string;
  key?: keyof T | string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  rowStyle?: (item: T) => React.CSSProperties;
  emptyMessage?: string;
  pageSizeOptions?: number[];
  initialPageSize?: number;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  onRowClick,
  rowStyle,
  emptyMessage = 'No records found',
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 25
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalRecords = data.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  // Reset to first page when data or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length, pageSize]);

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  style={{ 
                    padding: '12px 14px', 
                    textAlign: col.align || 'left', 
                    fontSize: 9, 
                    color: '#64748b', 
                    fontFamily: 'IBM Plex Mono, monospace', 
                    fontWeight: 700, 
                    letterSpacing: 1, 
                    whiteSpace: 'nowrap',
                    width: col.width
                  }}
                >
                  {col.header.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>Loading data...</div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  onClick={() => onRowClick?.(item)}
                  style={{ 
                    borderBottom: '1px solid #f1f5f9', 
                    cursor: onRowClick ? 'pointer' : 'default',
                    ...(rowStyle ? rowStyle(item) : {})
                  }}
                >
                  {columns.map((col, colIdx) => (
                    <td 
                      key={colIdx} 
                      style={{ 
                        padding: '10px 14px', 
                        textAlign: col.align || 'left',
                        verticalAlign: 'middle'
                      }}
                    >
                      {col.render ? col.render(item, (currentPage - 1) * pageSize + rowIdx) : (col.key ? (item[col.key as keyof T] as any) : null)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ 
        padding: '12px 16px', 
        borderTop: '1px solid #e2e8f0', 
        background: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
          Showing <span style={{ color: '#0f172a', fontWeight: 700 }}>{startRecord}</span> to <span style={{ color: '#0f172a', fontWeight: 700 }}>{endRecord}</span> of <span style={{ color: '#0f172a', fontWeight: 700 }}>{totalRecords}</span> records
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Per Page</span>
            <select 
              value={pageSize} 
              onChange={e => setPageSize(Number(e.target.value))}
              style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11, background: '#fff' }}
            >
              {pageSizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <Button 
              variant="ghost" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ padding: '4px 10px', fontSize: 10 }}
            >
              Previous
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8, fontSize: 11, fontWeight: 700, color: '#f97316' }}>
              {currentPage} / {totalPages || 1}
            </div>
            <Button 
              variant="ghost" 
              disabled={currentPage === totalPages || totalPages === 0} 
              onClick={() => setCurrentPage(p => p + 1)}
              style={{ padding: '4px 10px', fontSize: 10 }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
