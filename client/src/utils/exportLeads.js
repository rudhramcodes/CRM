import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './formatters';
import { LEAD_STATUS, LEAD_BRANDS } from '../constants';

const EXPORT_COLUMNS = ['Name', 'Email', 'Phone', 'Company', 'Brand', 'Source', 'Status', 'Assigned To', 'Created'];

function toExportRow(lead) {
  const status = LEAD_STATUS.find((s) => s.value === lead.status);
  const brand = LEAD_BRANDS.find((b) => b.value === lead.brand);
  const source = lead.source ? lead.source.replace(/_/g, ' ') : 'Other';
  return {
    Name: lead.name,
    Email: lead.email,
    Phone: lead.phone || '',
    Company: lead.company || '',
    Brand: brand?.label || '—',
    Source: source.charAt(0).toUpperCase() + source.slice(1),
    Status: status?.label || lead.status,
    'Assigned To': lead.assignedTo?.name || 'Unassigned',
    Created: formatDate(lead.createdAt),
  };
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function downloadLeadsCsv(leads) {
  const rows = leads.map(toExportRow);
  const csv = [
    EXPORT_COLUMNS.join(','),
    ...rows.map((row) => EXPORT_COLUMNS.map((col) => escapeCsv(row[col])).join(',')),
  ].join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `leads-export-${dateStamp()}.csv`);
}

export function downloadLeadsExcel(leads) {
  const worksheet = XLSX.utils.json_to_sheet(leads.map(toExportRow));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  XLSX.writeFile(workbook, `leads-export-${dateStamp()}.xlsx`);
}

export function downloadLeadsPdf(leads) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Leads Export', 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [EXPORT_COLUMNS],
    body: leads.map((lead) => {
      const row = toExportRow(lead);
      return EXPORT_COLUMNS.map((col) => row[col]);
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });
  doc.save(`leads-export-${dateStamp()}.pdf`);
}
