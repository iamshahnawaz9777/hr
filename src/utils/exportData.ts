/**
 * Data export utilities — CSV and JSON export for ERP data tables.
 */

/** Convert an array of objects to a CSV string */
export function toCSV(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return '';
  const keys = columns ?? Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = keys.join(',');
  const body = rows.map(row => keys.map(k => escape(row[k])).join(',')).join('\n');
  return `${header}\n${body}`;
}

/** Trigger a browser download for the given content */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Download rows as a CSV file */
export function exportCSV(rows: Record<string, unknown>[], filename: string, columns?: string[]) {
  downloadFile(toCSV(rows, columns), `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/** Download rows as a JSON file */
export function exportJSON(rows: unknown[], filename: string) {
  downloadFile(JSON.stringify(rows, null, 2), `${filename}.json`, 'application/json');
}
