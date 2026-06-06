import { Invoice } from '../../core/models/invoice.model';

function pad2(n: number): string { return String(n).padStart(2, '0'); }
function frDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function totalHT(inv: Invoice): number {
  return (inv.lines ?? []).reduce((s, l) => s + (l.quantity ?? 0) * (l.unitPrice ?? 0), 0);
}
export function totalTTC(inv: Invoice): number {
  return (inv.lines ?? []).reduce((s, l) => {
    const ht = (l.quantity ?? 0) * (l.unitPrice ?? 0);
    return s + ht + ht * ((l.vatRate ?? 0) / 100);
  }, 0);
}
function vatBreakdown(inv: Invoice): { rate: number; base: number; amount: number }[] {
  const map: Record<number, { base: number; amount: number }> = {};
  for (const l of inv.lines ?? []) {
    const ht = (l.quantity ?? 0) * (l.unitPrice ?? 0);
    const r = l.vatRate ?? 0;
    if (!map[r]) map[r] = { base: 0, amount: 0 };
    map[r].base   += ht;
    map[r].amount += ht * (r / 100);
  }
  return Object.entries(map)
    .map(([rate, v]) => ({ rate: Number(rate), ...v }))
    .sort((a, b) => a.rate - b.rate);
}

function fmt(n: number): string { return n.toFixed(2) + ' €'; }

export async function generateInvoicePdf(inv: Invoice, profile: any): Promise<void> {
  const pdfMakeModule  = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default;
  (pdfMake as any).vfs = (pdfFontsModule as any).default?.pdfMake?.vfs ?? (pdfFontsModule as any).pdfMake?.vfs;

  const companyName    = profile?.companyName    || profile?.firstName + ' ' + profile?.lastName || '';
  const companyAddress = profile?.companyAddress || '';
  const siret          = profile?.siret          || '';

  const vat = vatBreakdown(inv);
  const ht  = totalHT(inv);
  const ttc = totalTTC(inv);

  const lineTypeLabel: Record<string, string> = {
    BOOKING: 'Hébergement', CLEANING: 'Ménage',
    TOURIST_TAX: 'Taxe de séjour', CUSTOM: ''
  };

  const docDef: any = {
    pageMargins: [40, 40, 40, 60],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: [
      // En-tête
      {
        columns: [
          {
            stack: [
              { text: companyName, style: 'companyName' },
              companyAddress ? { text: companyAddress, style: 'companyAddr' } : '',
              siret ? { text: `SIRET : ${siret}`, style: 'companyAddr' } : ''
            ],
            width: '*'
          },
          {
            stack: [
              { text: `FACTURE`, style: 'invoiceTitle' },
              { text: `N° ${inv.invoiceNumber ?? '—'}`, style: 'invoiceNumber' },
              { text: `Date : ${frDate(inv.issueDate)}`, style: 'invoiceMeta' },
              inv.dueDate ? { text: `Échéance : ${frDate(inv.dueDate)}`, style: 'invoiceMeta' } : ''
            ],
            alignment: 'right',
            width: 'auto'
          }
        ],
        marginBottom: 20
      },
      // Séparateur
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#1976d2' }], marginBottom: 16 },
      // Client
      {
        stack: [
          { text: 'FACTURER À', style: 'sectionLabel' },
          { text: inv.guestName || '—', style: 'clientName' },
          inv.guestEmail ? { text: inv.guestEmail, style: 'clientDetail' } : '',
          inv.guestAddress ? { text: inv.guestAddress, style: 'clientDetail' } : ''
        ],
        marginBottom: 20
      },
      // Tableau des lignes
      {
        table: {
          headerRows: 1,
          widths: ['*', 50, 70, 45, 70],
          body: [
            [
              { text: 'Description',  style: 'tableHeader' },
              { text: 'Qté',          style: 'tableHeader', alignment: 'center' },
              { text: 'P.U. HT',      style: 'tableHeader', alignment: 'right' },
              { text: 'TVA',          style: 'tableHeader', alignment: 'center' },
              { text: 'Total HT',     style: 'tableHeader', alignment: 'right' }
            ],
            ...(inv.lines ?? []).map(l => {
              const ht = (l.quantity ?? 0) * (l.unitPrice ?? 0);
              const typeLabel = lineTypeLabel[l.lineType] ? `[${lineTypeLabel[l.lineType]}] ` : '';
              return [
                { text: typeLabel + (l.description || ''), style: 'tableCell' },
                { text: String(l.quantity ?? 0), style: 'tableCell', alignment: 'center' },
                { text: fmt(l.unitPrice ?? 0), style: 'tableCell', alignment: 'right' },
                { text: (l.vatRate ?? 0) + '%', style: 'tableCell', alignment: 'center' },
                { text: fmt(ht), style: 'tableCell', alignment: 'right' }
              ];
            })
          ]
        },
        layout: {
          hLineColor: () => '#e0e0e0',
          vLineColor: () => '#e0e0e0',
          fillColor: (i: number) => i === 0 ? '#1976d2' : i % 2 === 0 ? '#f9f9f9' : null
        },
        marginBottom: 16
      },
      // Totaux
      {
        columns: [
          { text: inv.notes ? `Notes :\n${inv.notes}` : '', style: 'notes', width: '*' },
          {
            stack: [
              { columns: [{ text: 'Total HT', width: '*' }, { text: fmt(ht), alignment: 'right' }], style: 'totalRow' },
              ...vat.map(v => ({
                columns: [
                  { text: `TVA ${v.rate}%`, width: '*' },
                  { text: fmt(v.amount), alignment: 'right' }
                ],
                style: 'totalRow'
              })),
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, lineColor: '#aaa' }], margin: [0, 4] },
              {
                columns: [
                  { text: 'TOTAL TTC', width: '*', bold: true },
                  { text: fmt(ttc), alignment: 'right', bold: true }
                ],
                style: 'totalRowBig'
              }
            ],
            width: 200
          }
        ]
      }
    ],
    styles: {
      companyName:   { fontSize: 14, bold: true, color: '#1976d2' },
      companyAddr:   { fontSize: 9, color: '#555', lineHeight: 1.4 },
      invoiceTitle:  { fontSize: 20, bold: true, color: '#1976d2' },
      invoiceNumber: { fontSize: 13, bold: true, color: '#333' },
      invoiceMeta:   { fontSize: 9, color: '#666' },
      sectionLabel:  { fontSize: 8, bold: true, color: '#999', letterSpacing: 1, marginBottom: 4 },
      clientName:    { fontSize: 12, bold: true },
      clientDetail:  { fontSize: 9, color: '#555', lineHeight: 1.4 },
      tableHeader:   { fontSize: 9, bold: true, color: '#fff', margin: [4, 6, 4, 6] },
      tableCell:     { fontSize: 10, margin: [4, 5, 4, 5] },
      totalRow:      { fontSize: 10, margin: [0, 2] },
      totalRowBig:   { fontSize: 12, margin: [0, 4] },
      notes:         { fontSize: 9, color: '#666', italic: true, lineHeight: 1.5 }
    }
  };

  pdfMake.createPdf(docDef).download(`facture-${inv.invoiceNumber ?? 'draft'}.pdf`);
}
