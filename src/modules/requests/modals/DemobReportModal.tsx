import { useState, useMemo } from 'react';
import type { Challan } from '@/types/challan.types';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui';

interface Props {
  challans: Challan[];
  onClose: () => void;
}

export function DemobReportModal({ challans, onClose }: Props) {
  const [siteFilt, setSiteFilt] = useState("");

  const mobChallans = (challans || []).filter(c => c.from_site === "GODOWN");
  const demobRecs = (challans || []).filter(c => c.remarks && c.remarks.startsWith("DEMOB:"));

  const reportData = useMemo(() => {
    const map: any = {};
    mobChallans.forEach(c => {
      const key = `${c.to_site}||${c.item_name}||${c.challan_no}`;
      if (!map[key]) {
        map[key] = { site: c.to_site, item_name: c.item_name, unit: c.unit || "Nos", mob_challan: c.challan_no, mob_date: c.date, mob_qty: 0, demob_qty: 0, demob_challans: [] };
      }
      map[key].mob_qty += parseFloat(c.qty as any) || 0;
    });

    demobRecs.forEach(d => {
      Object.values(map).forEach((row: any) => {
        if (row.site === d.from_site && row.item_name === d.item_name && d.remarks?.includes("ref=" + row.mob_challan)) {
          row.demob_qty += parseFloat(d.qty as any) || 0;
          if (!row.demob_challans.includes(d.challan_no)) row.demob_challans.push(d.challan_no);
        }
      });
    });

    return Object.values(map).map((r: any) => {
      const rawBal = r.mob_qty - r.demob_qty;
      return { ...r, balance: Math.max(0, rawBal), has_excess: rawBal < 0 };
    }).sort((a: any, b: any) => a.site.localeCompare(b.site) || a.item_name.localeCompare(b.item_name));
  }, [challans, mobChallans, demobRecs]);

  const sites = Array.from(new Set(reportData.map(r => r.site))).sort();
  const filtered = siteFilt ? reportData.filter(r => r.site === siteFilt) : reportData;

  const totMob = filtered.reduce((s, r) => s + r.mob_qty, 0);
  const totDemob = filtered.reduce((s, r) => s + r.demob_qty, 0);
  const totBal = filtered.reduce((s, r) => s + r.balance, 0);

  const exportXLS = () => {
    const ws_data = [["Site", "Item", "Unit", "Mob Challan", "Mob Date", "Mob Qty", "Demob Challan(s)", "Demob Qty", "Balance Qty", "Status"]];
    filtered.forEach(r => {
      const status = r.has_excess ? "Duplicate ⚠" : r.balance <= 0 ? "Fully Demobbed" : r.demob_qty > 0 ? "Partial" : "Pending";
      ws_data.push([
        r.site, r.item_name, r.unit, r.mob_challan, r.mob_date, r.mob_qty,
        r.demob_challans.join(", ") || "-", r.demob_qty, r.balance, status
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws["!cols"] = [14, 24, 7, 14, 12, 10, 28, 10, 10, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "T&P Balance");
    XLSX.writeFile(wb, `TP_Balance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <select value={siteFilt} onChange={e => setSiteFilt(e.target.value)} style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, outline: "none" }}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <Button onClick={exportXLS} style={{ backgroundColor: "#059669", color: "#fff", borderColor: "#059669" }}>📊 Export Excel</Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { l: "Total Mobilized", v: totMob, c: "#0369a1" },
          { l: "Total Demobilized", v: totDemob, c: "#b45309" },
          { l: "Balance at Sites", v: totBal, c: totBal > 0 ? "#059669" : "#dc2626" }
        ].map(card => (
          <div key={card.l} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>{card.l}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: card.c, fontFamily: "monospace" }}>{card.v}</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#b45309" }}>
              {["Site", "Item", "Unit", "Mob Challan", "Mob Qty", "Demob Challan(s)", "Demob Qty", "Balance", "Status"].map(h => (
                <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 9, color: "#fff", fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}>No mobilization records found</td></tr>
            ) : filtered.map((row: any, i) => {
              const full = row.balance <= 0;
              const partial = !full && row.demob_qty > 0;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: full ? "#f0fdf4" : partial ? "#fffbeb" : "#fff" }}>
                  <td style={{ padding: "7px 10px", fontWeight: 700, color: "#f97316", fontFamily: "monospace", fontSize: 10 }}>{row.site}</td>
                  <td style={{ padding: "7px 10px", fontWeight: 600, color: "#0f172a" }}>{row.item_name}</td>
                  <td style={{ padding: "7px 10px", color: "#64748b" }}>{row.unit}</td>
                  <td style={{ padding: "7px 10px", fontFamily: "monospace", fontSize: 10 }}>
                    <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: 4, padding: "1px 6px", fontSize: 9 }}>{row.mob_challan}</span>
                  </td>
                  <td style={{ padding: "7px 10px", fontFamily: "monospace", fontWeight: 700, color: "#0369a1", textAlign: "center" }}>{row.mob_qty}</td>
                  <td style={{ padding: "7px 10px", fontSize: 10 }}>
                    {row.demob_challans.length > 0
                      ? row.demob_challans.map((cn: any) => (
                        <span key={cn} style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 4, padding: "1px 6px", marginRight: 3, fontSize: 9, fontFamily: "monospace", display: "inline-block", marginBottom: 2 }}>{cn}</span>
                      ))
                      : <span style={{ color: "#94a3b8" }}>—</span>
                    }
                  </td>
                  <td style={{ padding: "7px 10px", fontFamily: "monospace", fontWeight: 700, color: "#b45309", textAlign: "center" }}>{row.demob_qty}</td>
                  <td style={{ padding: "7px 10px", fontFamily: "monospace", fontWeight: 900, fontSize: 13, textAlign: "center", color: full ? "#059669" : partial ? "#d97706" : "#dc2626" }}>{row.balance}</td>
                  <td style={{ padding: "7px 10px" }}>
                    <span style={{ background: full ? "#dcfce7" : partial ? "#fef3c7" : "#fef2f2", border: `1px solid ${full ? "#bbf7d0" : partial ? "#fde68a" : "#fecaca"}`, color: full ? "#166534" : partial ? "#92400e" : "#dc2626", borderRadius: 20, padding: "2px 8px", fontSize: 9, fontWeight: 700, fontFamily: "monospace" }}>
                      {full ? "FULLY DEMOBBED" : partial ? "PARTIAL" : "PENDING"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
