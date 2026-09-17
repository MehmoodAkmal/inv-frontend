/**
 * Utility function to export data to a CSV file and trigger a download in the browser.
 * Supports both an array of objects (auto-extracting keys as headers)
 * and an explicit object shape: { headers: string[], rows: (string|number)[][] }
 * Includes UTF-8 BOM (\uFEFF) for proper Excel character encoding compatibility.
 */
export function exportToCsv(filename, data) {
  if (!data) return;

  let csvContent = "";

  if (Array.isArray(data)) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const headerRow = headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",");
    const dataRows = data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    csvContent = [headerRow, ...dataRows].join("\r\n");
  } else if (data.headers && Array.isArray(data.rows)) {
    const headerRow = data.headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",");
    const dataRows = data.rows.map((row) =>
      row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",")
    );
    csvContent = [headerRow, ...dataRows].join("\r\n");
  }

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default exportToCsv;
