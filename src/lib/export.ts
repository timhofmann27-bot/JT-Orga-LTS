/**
 * Exports an array of objects to a CSV file and triggers download
 */
export function downloadCSV(data: any[], filename: string, headers?: string[]) {
  if (data.length === 0) return;

  // Use provided headers or auto-detect from first object
  const csvHeaders = headers || Object.keys(data[0]);

  // Build CSV content
  const rows = [
    csvHeaders.join(','),
    ...data.map(row =>
      csvHeaders.map(header => {
        const value = row[header] ?? '';
        // Escape values with commas, quotes, or newlines
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];

  const csvContent = rows.join('\n');

  // Add BOM for Excel compatibility with German characters
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Formats invitees data for CSV export
 */
export function formatInviteesForCSV(invitees: any[]): any[] {
  return invitees.map(inv => ({
    Name: inv.name_snapshot || inv.current_name || 'Unbekannt',
    Status: inv.status === 'yes' ? 'Zusage' : inv.status === 'no' ? 'Absage' : inv.status === 'maybe' ? 'Vielleicht' : 'Offen',
    Gäste: inv.guests_count || 0,
    Antwort_Datum: inv.responded_at ? new Date(inv.responded_at).toLocaleDateString('de-DE') : '-',
    Erstellt_Am: inv.created_at ? new Date(inv.created_at).toLocaleDateString('de-DE') : '-',
    Link: inv.token ? `${window.location.origin}/invite/${inv.token}` : '-'
  }));
}

/**
 * Exports stats data as CSV
 */
export function formatStatsForCSV(stats: any): any[] {
  return [
    { Kennzahl: 'Gesamt Aktionen', Wert: stats.events },
    { Kennzahl: 'Aktive Personen', Wert: stats.persons },
    { Kennzahl: 'Versendete Einladungen', Wert: stats.invites },
    { Kennzahl: 'Zusagen', Wert: stats.yes_count || 0 },
    { Kennzahl: 'Absagen', Wert: stats.no_count || 0 },
    { Kennzahl: 'Vielleicht', Wert: stats.maybe_count || 0 },
    { Kennzahl: 'Offen', Wert: stats.pending_count || 0 },
    { Kennzahl: 'Archivierte Events', Wert: stats.archived_events || 0 },
    { Kennzahl: 'Archivierungsrate', Wert: `${stats.archived_pct?.toFixed(0) || 0}%` }
  ];
}