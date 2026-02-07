// ─── CSV Parser ──────────────────────────────────────────────────────────────
// Handles reading CSV files, splitting into rows/columns, handling quoted fields.

/**
 * Parse a CSV file into headers and rows.
 * Handles quoted fields, commas within quotes, and varied line endings.
 */
export async function parseCSVFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
    const text = await file.text();
    const lines = parseCSVText(text);

    if (lines.length === 0) {
        throw new Error('CSV file is empty');
    }

    const headers = lines[0].map(h => h.trim());
    const rows = lines.slice(1).filter(row => row.some(cell => cell.trim() !== ''));

    if (rows.length === 0) {
        throw new Error('CSV file has headers but no data rows');
    }

    return { headers, rows };
}

/**
 * Parse CSV text into a 2D array of strings.
 * Properly handles:
 * - Quoted fields with commas inside
 * - Escaped quotes (double-quote within quoted field)
 * - \r\n, \n, \r line endings
 */
function parseCSVText(text: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const char = text[i];
        const nextChar = i + 1 < text.length ? text[i + 1] : '';

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i += 2;
            } else if (char === '"') {
                // End of quoted field
                inQuotes = false;
                i++;
            } else {
                currentField += char;
                i++;
            }
        } else {
            if (char === '"' && currentField === '') {
                // Start of quoted field
                inQuotes = true;
                i++;
            } else if (char === ',') {
                // Field separator
                currentRow.push(currentField.trim());
                currentField = '';
                i++;
            } else if (char === '\r' && nextChar === '\n') {
                // CRLF line ending
                currentRow.push(currentField.trim());
                currentField = '';
                rows.push(currentRow);
                currentRow = [];
                i += 2;
            } else if (char === '\n' || char === '\r') {
                // LF or CR line ending
                currentRow.push(currentField.trim());
                currentField = '';
                rows.push(currentRow);
                currentRow = [];
                i++;
            } else {
                currentField += char;
                i++;
            }
        }
    }

    // Don't forget the last field/row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    return rows;
}

/**
 * Normalize a vendor name for comparison/matching.
 * Lowercase, strip extra whitespace, remove common suffixes.
 */
export function normalizeVendor(vendor: string): string {
    return vendor
        .toLowerCase()
        .replace(/[''`]/g, "'")
        .replace(/[^\w\s'-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parse a date string into YYYY-MM-DD format.
 * Supports multiple formats with explicit format hint.
 */
export function parseDate(dateStr: string, format: 'auto' | 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'DD-MM-YYYY' = 'auto'): string | null {
    const cleaned = dateStr.trim();
    if (!cleaned) return null;

    if (format === 'auto') {
        return autoParseDate(cleaned);
    }

    try {
        switch (format) {
            case 'YYYY-MM-DD': {
                const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (match) return formatYMD(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
                break;
            }
            case 'DD/MM/YYYY': {
                const match = cleaned.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
                if (match) return formatYMD(parseInt(match[3]), parseInt(match[2]), parseInt(match[1]));
                break;
            }
            case 'MM/DD/YYYY': {
                const match = cleaned.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
                if (match) return formatYMD(parseInt(match[3]), parseInt(match[1]), parseInt(match[2]));
                break;
            }
            case 'DD-MM-YYYY': {
                const match = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                if (match) return formatYMD(parseInt(match[3]), parseInt(match[2]), parseInt(match[1]));
                break;
            }
        }
    } catch {
        return null;
    }

    return autoParseDate(cleaned);
}

function autoParseDate(dateStr: string): string | null {
    // Try YYYY-MM-DD first (ISO)
    let match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) return formatYMD(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));

    // Try DD/MM/YYYY or DD-MM-YYYY (UK format, most common in bank CSVs)
    match = dateStr.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (match) {
        const a = parseInt(match[1]);
        const b = parseInt(match[2]);
        const year = parseInt(match[3]);
        // If first number > 12, it must be DD/MM/YYYY
        if (a > 12) return formatYMD(year, b, a);
        // If second number > 12, it must be MM/DD/YYYY
        if (b > 12) return formatYMD(year, a, b);
        // Ambiguous — default to DD/MM/YYYY (UK, more common for bank exports)
        return formatYMD(year, b, a);
    }

    // Try DD-Mon-YYYY or DD Mon YYYY (e.g., "05-Feb-2024", "5 Feb 2024")
    match = dateStr.match(/^(\d{1,2})[\s-](\w{3,9})[\s-](\d{4})$/);
    if (match) {
        const day = parseInt(match[1]);
        const month = monthNameToNumber(match[2]);
        const year = parseInt(match[3]);
        if (month) return formatYMD(year, month, day);
    }

    // Try Mon DD, YYYY (e.g., "Feb 05, 2024")
    match = dateStr.match(/^(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
    if (match) {
        const month = monthNameToNumber(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        if (month) return formatYMD(year, month, day);
    }

    return null;
}

function monthNameToNumber(name: string): number | null {
    const months: Record<string, number> = {
        jan: 1, january: 1,
        feb: 2, february: 2,
        mar: 3, march: 3,
        apr: 4, april: 4,
        may: 5,
        jun: 6, june: 6,
        jul: 7, july: 7,
        aug: 8, august: 8,
        sep: 9, september: 9,
        oct: 10, october: 10,
        nov: 11, november: 11,
        dec: 12, december: 12,
    };
    return months[name.toLowerCase()] ?? null;
}

function formatYMD(year: number, month: number, day: number): string | null {
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
        return null;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse a monetary amount string into a number.
 * Handles: £1,234.56, -$50.00, (100.00), 1234.56, 1.234,56 (European)
 */
export function parseAmount(amountStr: string): number | null {
    let cleaned = amountStr.trim();
    if (!cleaned) return null;

    // Check for parentheses notation (negative)
    const isParens = cleaned.startsWith('(') && cleaned.endsWith(')');
    if (isParens) {
        cleaned = cleaned.slice(1, -1);
    }

    // Remove currency symbols and whitespace
    cleaned = cleaned.replace(/[£$€¥₹\s]/g, '');

    // Detect if comma is decimal separator (European format: 1.234,56)
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot && lastComma === cleaned.length - 3) {
        // European format: replace dots (thousands) and comma (decimal)
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        // Standard format: remove commas (thousands separator)
        cleaned = cleaned.replace(/,/g, '');
    }

    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    return isParens ? -num : num;
}

/**
 * Detect the most likely date format from a sample of date strings.
 */
export function detectDateFormat(dateSamples: string[]): 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'auto' {
    const samples = dateSamples.slice(0, 20).map(s => s.trim()).filter(Boolean);
    if (samples.length === 0) return 'auto';

    // Check for ISO format
    if (samples.every(s => /^\d{4}-\d{1,2}-\d{1,2}$/.test(s))) {
        return 'YYYY-MM-DD';
    }

    // Check for separator-based formats
    const slashOrDash = samples.filter(s => /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(s));
    if (slashOrDash.length === samples.length) {
        // Check if any first number > 12 (must be day-first)
        const firstParts = slashOrDash.map(s => parseInt(s.split(/[\/.-]/)[0]));
        if (firstParts.some(n => n > 12)) return 'DD/MM/YYYY';
        // Check if any second number > 12 (must be month-first)
        const secondParts = slashOrDash.map(s => parseInt(s.split(/[\/.-]/)[1]));
        if (secondParts.some(n => n > 12)) return 'MM/DD/YYYY';
        // Ambiguous — default to DD/MM/YYYY
        return 'DD/MM/YYYY';
    }

    return 'auto';
}
