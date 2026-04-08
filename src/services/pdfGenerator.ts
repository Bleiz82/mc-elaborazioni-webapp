import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const generateInvoicePDF = (invoice: any, studioSettings?: any) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(14, 165, 233); // sky-500
  doc.text('M&C Elaborazioni', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Consulenze Aziendali Srl', 14, 28);
  doc.text('Via Roma 123, 00100 Roma (RM)', 14, 34);
  doc.text('P.IVA: 01234567890 | PEC: info@pec.mcelaborazioni.it', 14, 40);

  // Invoice Details
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Parcella N° ${invoice.invoice_number}`, 14, 60);
  
  doc.setFontSize(10);
  doc.text(`Data Emissione: ${format(new Date(invoice.created_at), 'dd/MM/yyyy')}`, 14, 68);
  doc.text(`Data Scadenza: ${format(new Date(invoice.due_date), 'dd/MM/yyyy')}`, 14, 74);

  // Client Details
  doc.text('Spett.le', 120, 60);
  doc.setFontSize(12);
  doc.text(invoice.client_name || 'Cliente', 120, 66);
  doc.setFontSize(10);
  // Add more client details if available in the invoice object
  
  // Table
  const tableData = [
    [
      invoice.description,
      `€ ${invoice.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      `${invoice.tax_rate}%`,
      `€ ${invoice.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
    ]
  ];

  autoTable(doc, {
    startY: 90,
    head: [['Descrizione', 'Imponibile', 'IVA', 'Totale']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233] },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 120;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTALE DA PAGARE: € ${invoice.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 120, finalY + 15);

  // Paid Stamp
  if (invoice.status === 'pagata') {
    doc.setTextColor(34, 197, 94); // emerald-500
    doc.setFontSize(24);
    doc.text('PAGATA', 14, finalY + 15);
    doc.setFontSize(10);
    if (invoice.paid_at) {
      doc.text(`Data: ${format(new Date(invoice.paid_at), 'dd/MM/yyyy')}`, 14, finalY + 22);
    }
    if (invoice.payment_method) {
      doc.text(`Metodo: ${invoice.payment_method}`, 14, finalY + 28);
    }
  }

  // Footer
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Coordinate Bancarie: IT00 A000 0000 0000 0000 0000 000', 14, 270);
  doc.text('Documento privo di valenza fiscale ai sensi dell\'art. 21 Dpr 633/72', 14, 276);

  doc.save(`Parcella_${invoice.invoice_number}.pdf`);
};

export const generateReportPDF = (reportData: any, period: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(14, 165, 233);
  doc.text('M&C Elaborazioni', 14, 22);
  
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`Report ${period}`, 14, 40);

  // KPI Table
  if (reportData.kpi) {
    autoTable(doc, {
      startY: 50,
      head: [['Indicatore', 'Valore']],
      body: [
        ['Fatturato Totale', `€ ${reportData.kpi.revenue.toLocaleString('it-IT')}`],
        ['Pratiche Completate', reportData.kpi.completedPractices.toString()],
        ['Nuovi Clienti', reportData.kpi.newClients.toString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233] }
    });
  }

  // Text Content
  if (reportData.content) {
    const finalY = (doc as any).lastAutoTable?.finalY || 50;
    doc.setFontSize(10);
    doc.setTextColor(100);
    const splitText = doc.splitTextToSize(reportData.content, 180);
    doc.text(splitText, 14, finalY + 15);
  }

  // Footer
  doc.setFontSize(8);
  doc.text('Generato automaticamente - M&C Elaborazioni', 14, 280);

  doc.save(`Report_${period.replace(/\s+/g, '_')}.pdf`);
};

export const generateClientListPDF = (clients: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(14, 165, 233);
  doc.text('M&C Elaborazioni', 14, 22);
  
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Lista Clienti', 14, 40);

  const tableData = clients.map(c => [
    c.displayName || c.email,
    c.clientType || 'N/A',
    c.vatNumber || c.taxId || 'N/A',
    c.status || 'Attivo'
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['Nome', 'Tipo', 'P.IVA / CF', 'Stato']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233] }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(10);
  doc.text(`Totale Clienti: ${clients.length}`, 14, finalY + 10);

  doc.save('Lista_Clienti.pdf');
};

export const generateCSV = (data: any[], columns: { key: string, label: string }[], filename: string) => {
  if (!data || !data.length) return;

  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row => {
    return columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      // Escape quotes and wrap in quotes if contains comma
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(',');
  });

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
