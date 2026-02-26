/**
 * Generic CSV Parser
 * 
 * Handles parsing CSV files with proper quoting, escaping, and various delimiters.
 * Returns parsed rows as arrays of strings and header detection.
 */

export type ParsedCSV = {
    headers: string[];
    rows: string[][];
    rawText: string;
};

/**
 * Parse a CSV string into headers and rows.
 * Handles quoted fields, escaped quotes, and various line endings.
 */
export function parseCSV(text: string, delimiter: string = ','): ParsedCSV {
    const rawText = text.trim();
    if (!rawText) {
        return { headers: [], rows: [], rawText };
    }

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < rawText.length) {
        const char = rawText[i];

        if (inQuotes) {
            if (char === '"') {
                // Check for escaped quote (double quote)
                if (i + 1 < rawText.length && rawText[i + 1] === '"') {
                    currentField += '"';
                    i += 2;
                    continue;
                }
                // End of quoted field
                inQuotes = false;
                i++;
                continue;
            }
            currentField += char;
            i++;
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            i++;
            continue;
        }

        if (char === delimiter) {
            currentRow.push(currentField.trim());
            currentField = '';
            i++;
            continue;
        }

        if (char === '\r') {
            // Handle \r\n or standalone \r
            currentRow.push(currentField.trim());
            currentField = '';
            rows.push(currentRow);
            currentRow = [];
            if (i + 1 < rawText.length && rawText[i + 1] === '\n') {
                i += 2;
            } else {
                i++;
            }
            continue;
        }

        if (char === '\n') {
            currentRow.push(currentField.trim());
            currentField = '';
            rows.push(currentRow);
            currentRow = [];
            i++;
            continue;
        }

        currentField += char;
        i++;
    }

    // Don't forget the last field/row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    // Filter out empty rows
    const nonEmptyRows = rows.filter(row => row.some(cell => cell !== ''));

    if (nonEmptyRows.length === 0) {
        return { headers: [], rows: [], rawText };
    }

    const headers = nonEmptyRows[0];
    const dataRows = nonEmptyRows.slice(1);

    return { headers, rows: dataRows, rawText };
}

/**
 * Try to detect the delimiter used in a CSV file.
 * Checks comma, semicolon, tab, and pipe.
 */
export function detectDelimiter(text: string): string {
    const firstLine = text.split(/\r?\n/)[0] || '';
    const delimiters = [',', ';', '\t', '|'];
    let bestDelimiter = ',';
    let bestCount = 0;

    for (const d of delimiters) {
        // Count occurrences outside of quoted strings
        let count = 0;
        let inQuotes = false;
        for (const char of firstLine) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === d && !inQuotes) {
                count++;
            }
        }
        if (count > bestCount) {
            bestCount = count;
            bestDelimiter = d;
        }
    }

    return bestDelimiter;
}

/**
 * Parse a date string in various formats into YYYY-MM-DD.
 * Supports: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, MM-DD-YYYY,
 *           DD.MM.YYYY, "Month DD, YYYY", etc.
 */
export function parseDate(dateStr: string): string | null {
    if (!dateStr || !dateStr.trim()) return null;

    const cleaned = dateStr.trim();

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
    }

    // YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleaned)) {
        return cleaned.replace(/\//g, '-');
    }

    // DD/MM/YYYY or MM/DD/YYYY - try DD/MM/YYYY first (more common internationally)
    const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const [, a, b, year] = slashMatch;
        const aNum = parseInt(a);
        const bNum = parseInt(b);

        // If first number > 12, it must be day
        if (aNum > 12) {
            return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        }
        // If second number > 12, first must be month
        if (bNum > 12) {
            return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
        }
        // Ambiguous - default to DD/MM/YYYY (international standard)
        return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }

    // DD-MM-YYYY or MM-DD-YYYY
    const dashMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
        const [, a, b, year] = dashMatch;
        const aNum = parseInt(a);
        const bNum = parseInt(b);

        if (aNum > 12) {
            return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        }
        if (bNum > 12) {
            return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
        }
        return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }

    // DD.MM.YYYY
    const dotMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotMatch) {
        const [, day, month, year] = dotMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try native Date parsing as fallback
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
}

/**
 * Parse a monetary amount string into a number.
 * Handles currency symbols, thousand separators, negative signs, parentheses for negatives.
 */
export function parseAmount(amountStr: string): number | null {
    if (!amountStr || !amountStr.trim()) return null;

    let cleaned = amountStr.trim();

    // Check for parentheses (negative in accounting)
    const isParenthesisNegative = /^\(.*\)$/.test(cleaned);
    if (isParenthesisNegative) {
        cleaned = cleaned.slice(1, -1);
    }

    // Remove currency symbols and whitespace
    cleaned = cleaned.replace(/[£$€¥₹\s]/g, '');

    // Check for negative sign
    const isNegative = cleaned.startsWith('-') || isParenthesisNegative;
    cleaned = cleaned.replace(/^-/, '');

    // Handle thousand separators
    // If there's a comma followed by exactly 2 digits at the end, comma is decimal
    if (/,\d{2}$/.test(cleaned)) {
        // European format: 1.234,56 or 100,50
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
        // Standard format: 1,234.56
        cleaned = cleaned.replace(/,/g, '');
    }

    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    return isNegative ? -num : num;
}

/**
 * Read a File object as text.
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
