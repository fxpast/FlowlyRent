interface ChargeTask {
  scheduledDate: string;
  type: string;
  propertyName?: string;
  beds24PropertyId?: string;
  extraHours?: number;
  hourlyRate?: number;
  housekeeper?: { hourlyRate?: number | null };
}

interface ChargesEntry {
  hk: { name: string; phone?: string };
  tasks: ChargeTask[];
  totalHours: number;
  totalCost: number;
}

function pad2(n: number): string { return String(n).padStart(2, '0'); }
function frDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmt(n: number): string { return n.toFixed(2) + ' €'; }

export async function generateHousekeepingChargesPdf(
  entry: ChargesEntry,
  periodLabel: string,
  profile: any,
  typeLabel: (type: string) => string
): Promise<void> {
  const pdfMakeModule  = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default;
  (pdfMake as any).vfs = (pdfFontsModule as any).default?.pdfMake?.vfs ?? (pdfFontsModule as any).pdfMake?.vfs;

  const companyName    = profile?.companyName    || `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  const companyAddress = profile?.companyAddress || '';

  const sortedTasks = [...entry.tasks].sort((a, b) => (a.scheduledDate ?? '') < (b.scheduledDate ?? '') ? -1 : 1);

  const taskCost = (t: ChargeTask): number => {
    if (!t.extraHours) return 0;
    return t.extraHours * Number(t.hourlyRate ?? t.housekeeper?.hourlyRate ?? 0);
  };

  const docDef: any = {
    pageMargins: [40, 40, 40, profile?.invoiceFooter ? 80 : 40],
    footer: profile?.invoiceFooter ? (_: number, __: number) => ({
      text: profile.invoiceFooter,
      alignment: 'center',
      fontSize: 8,
      color: '#888',
      margin: [40, 12, 40, 0]
    }) : undefined,
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: [
      // En-tête
      {
        columns: [
          {
            stack: [
              { text: companyName, style: 'companyName' },
              companyAddress ? { text: companyAddress, style: 'companyAddr' } : ''
            ],
            width: '*'
          },
          {
            stack: [
              { text: 'RELEVÉ DE FRAIS DE MÉNAGE', style: 'docTitle' },
              { text: periodLabel, style: 'docMeta' }
            ],
            alignment: 'right',
            width: 'auto'
          }
        ],
        marginBottom: 20
      },
      // Séparateur
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#1976d2' }], marginBottom: 16 },
      // Prestataire
      {
        stack: [
          { text: 'PRESTATAIRE', style: 'sectionLabel' },
          { text: entry.hk.name || '—', style: 'clientName' },
          entry.hk.phone ? { text: entry.hk.phone, style: 'clientDetail' } : ''
        ],
        marginBottom: 20
      },
      // Tableau des missions
      {
        table: {
          headerRows: 1,
          widths: [55, '*', '*', 55, 70],
          body: [
            [
              { text: 'Date',     style: 'tableHeader' },
              { text: 'Type',     style: 'tableHeader' },
              { text: 'Logement', style: 'tableHeader' },
              { text: 'Heures',   style: 'tableHeader', alignment: 'center' },
              { text: 'Montant',  style: 'tableHeader', alignment: 'right' }
            ],
            ...sortedTasks.map(t => [
              { text: frDate(t.scheduledDate), style: 'tableCell' },
              { text: typeLabel(t.type), style: 'tableCell' },
              { text: t.propertyName || t.beds24PropertyId || '—', style: 'tableCell' },
              { text: t.extraHours != null ? t.extraHours.toFixed(1) : '—', style: 'tableCell', alignment: 'center' },
              { text: taskCost(t) > 0 ? fmt(taskCost(t)) : '—', style: 'tableCell', alignment: 'right' }
            ])
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
          { text: '', width: '*' },
          {
            stack: [
              { columns: [{ text: 'Total heures', width: '*' }, { text: entry.totalHours.toFixed(1) + ' h', alignment: 'right' }], style: 'totalRow' },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, lineColor: '#aaa' }], margin: [0, 4] },
              {
                columns: [
                  { text: 'TOTAL', width: '*', bold: true },
                  { text: fmt(entry.totalCost), alignment: 'right', bold: true }
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
      companyName:  { fontSize: 14, bold: true, color: '#1976d2' },
      companyAddr:  { fontSize: 9, color: '#555', lineHeight: 1.4 },
      docTitle:     { fontSize: 16, bold: true, color: '#1976d2' },
      docMeta:      { fontSize: 10, color: '#666' },
      sectionLabel: { fontSize: 8, bold: true, color: '#999', letterSpacing: 1, marginBottom: 4 },
      clientName:   { fontSize: 12, bold: true },
      clientDetail: { fontSize: 9, color: '#555', lineHeight: 1.4 },
      tableHeader:  { fontSize: 9, bold: true, color: '#fff', margin: [4, 6, 4, 6] },
      tableCell:    { fontSize: 9, margin: [4, 5, 4, 5] },
      totalRow:     { fontSize: 10, margin: [0, 2] },
      totalRowBig:  { fontSize: 12, margin: [0, 4] }
    }
  };

  const safeName = (entry.hk.name || 'prestataire').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  pdfMake.createPdf(docDef).download(`frais-menage-${safeName}-${periodLabel.replace(/\s+/g, '-')}.pdf`);
}
