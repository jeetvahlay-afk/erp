export const downloadCsv = (filename, rows = []) => {
  if (!rows.length) return false;
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [keys.map(escape).join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};

export const downloadExcel = (filename, rows = []) => {
  if (!rows.length) return false;
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escapeXml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
  const rowXml = (values, header = false) => `<Row>${values.map((value) => `<Cell${header ? ' ss:StyleID="Header"' : ''}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join('')}</Row>`;
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#EDEFF5" ss:Pattern="Solid"/></Style></Styles>
 <Worksheet ss:Name="TeamHub Export"><Table>
  ${rowXml(keys, true)}
  ${rows.map((row) => rowXml(keys.map((key) => row[key]))).join('')}
 </Table></Worksheet>
</Workbook>`;
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xml') ? filename : `${filename}.xml`;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};
