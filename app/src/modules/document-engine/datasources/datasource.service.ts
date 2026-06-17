export type DataRow = Record<string, string>;

export interface DataSource {
  name: string;
  type: "manual" | "json" | "excel" | "api";
  rows: DataRow[];
  columns: string[];
}

export function createManualSource(rows: DataRow[]): DataSource {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { name: "manual", type: "manual", rows, columns };
}

export function createJsonSource(json: string): DataSource {
  try {
    const parsed = JSON.parse(json);
    const rows: DataRow[] = Array.isArray(parsed) ? parsed : [parsed];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { name: "json", type: "json", rows, columns };
  } catch {
    return { name: "json", type: "json", rows: [], columns: [] };
  }
}

export function createExcelSource(data: Record<string, string>[]): DataSource {
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  return { name: "excel", type: "excel", rows: data, columns };
}

export function flattenDataSource(
  source: DataSource,
  listVar: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  source.rows.forEach((row, idx) => {
    for (const [key, val] of Object.entries(row)) {
      result[`${listVar}_${idx}_${key}`] = val;
    }
  });
  result[`${listVar}_COUNT`] = String(source.rows.length);
  return result;
}
