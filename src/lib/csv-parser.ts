import Papa from 'papaparse';
import { ImportPreset, ParsedTransaction, SourceAccount, SourceCategoryGroup, SourceCategory } from './import-presets/types';
import { format, parse } from 'date-fns';

export class CSVParser {
    private preset: ImportPreset;

    constructor(preset: ImportPreset) {
        this.preset = preset;
    }

    async parseFile(file: File): Promise<ParsedTransaction[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: false, // We'll handle headers manually
                delimiter: this.preset.delimiter,
                skipEmptyLines: true,
                complete: (results: Papa.ParseResult<any>) => {
                    try {
                        const transactions = this.processRows(results.data);
                        resolve(transactions);
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error: Error) => {
                    reject(error);
                }
            });
        });
    }

    private processRows(rows: any[]): ParsedTransaction[] {
        const transactions: ParsedTransaction[] = [];
        
        // Find the header row and data start
        let headerRowIndex = -1;
        let dataStartIndex = -1;
        
        if (this.preset.hasHeader) {
            // Look for the header row based on expected column names
            const expectedColumns = Object.values(this.preset.columns);
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (Array.isArray(row) && row.length > 0) {
                    // Check if this row contains our expected column headers
                    const hasExpectedColumns = expectedColumns.some(col => 
                        row.some((cell: string) => cell && cell.toLowerCase().includes(col.toLowerCase()))
                    );
                    
                    if (hasExpectedColumns) {
                        headerRowIndex = i;
                        dataStartIndex = i + 1;
                        break;
                    }
                }
            }
            
            // Fallback: if no header found, assume first non-empty row is header
            if (headerRowIndex === -1) {
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (Array.isArray(row) && row.length > 1) {
                        headerRowIndex = i;
                        dataStartIndex = i + 1;
                        break;
                    }
                }
            }
        } else {
            dataStartIndex = 0;
        }

        if (dataStartIndex === -1) {
            throw new Error('Could not find valid data in CSV file');
        }

        // Convert array rows to objects using header
        const headers = headerRowIndex >= 0 ? rows[headerRowIndex] : [];
        const dataRows = rows.slice(dataStartIndex);

        for (const row of dataRows) {
            if (!Array.isArray(row) || row.length === 0) continue;
            
            try {
                let rowObj: any = {};
                
                if (headerRowIndex >= 0) {
                    // Create object from headers and row data
                    for (let i = 0; i < Math.min(headers.length, row.length); i++) {
                        if (headers[i]) {
                            rowObj[headers[i]] = row[i] || '';
                        }
                    }
                } else {
                    // No headers - use column indices
                    rowObj = row;
                }

                if (this.preset.transform) {
                    const transformed = this.preset.transform(rowObj);
                    const normalizedDate = this.normalizeDate(transformed.date);
                    
                    transactions.push({
                        ...transformed,
                        date: normalizedDate
                    });
                } else {
                    // Fallback if no transform function
                    const amount = parseFloat(rowObj[this.preset.columns.amount || '']?.replace(/[^0-9.-]+/g, '') || '0');
                    const vendor = rowObj[this.preset.columns.payee] || 'Unknown';
                    const description = rowObj[this.preset.columns.memo || this.preset.columns.description || ''] || '';
                    const date = this.normalizeDate(rowObj[this.preset.columns.date]);
                    
                    transactions.push({
                        amount,
                        vendor,
                        description,
                        date,
                        type: amount > 0 ? 'income' : 'payment'
                    });
                }
            } catch (error) {
                console.warn('Failed to process row:', row, error);
            }
        }

        return transactions;
    }

    private normalizeDate(dateString: string): string {
        try {
            // Try the preset's specified date format first
            if (this.preset.dateFormat) {
                try {
                    const parsed = parse(dateString, this.preset.dateFormat, new Date());
                    if (!isNaN(parsed.getTime())) {
                        return format(parsed, 'yyyy-MM-dd');
                    }
                } catch (e) {
                    console.warn(`Failed to parse date with preset format ${this.preset.dateFormat}:`, dateString);
                }
            }

            // Fallback to common date formats
            const formats = [
                'MM/dd/yyyy',
                'dd/MM/yyyy', 
                'yyyy-MM-dd',
                'MM-dd-yyyy',
                'dd-MM-yyyy',
                'yyyy/MM/dd'
            ];

            for (const formatStr of formats) {
                try {
                    const parsed = parse(dateString, formatStr, new Date());
                    if (!isNaN(parsed.getTime())) {
                        return format(parsed, 'yyyy-MM-dd');
                    }
                } catch (e) {
                    continue;
                }
            }

            // If none work, try native Date parsing
            const fallback = new Date(dateString);
            if (!isNaN(fallback.getTime())) {
                return format(fallback, 'yyyy-MM-dd');
            }

            throw new Error(`Unable to parse date: ${dateString}`);
        } catch (error) {
            console.warn('Date parsing failed for:', dateString);
            return format(new Date(), 'yyyy-MM-dd'); // Fallback to today
        }
    }

    static extractUniqueVendors(transactions: ParsedTransaction[]): { vendor: string; count: number }[] {
        const vendorCounts = new Map<string, number>();
        
        for (const transaction of transactions) {
            const current = vendorCounts.get(transaction.vendor) || 0;
            vendorCounts.set(transaction.vendor, current + 1);
        }

        return Array.from(vendorCounts.entries())
            .map(([vendor, count]) => ({ vendor, count }))
            .sort((a, b) => b.count - a.count);
    }

    // Enhanced service methods
    static extractSourceAccounts(transactions: ParsedTransaction[]): SourceAccount[] {
        const accountCounts = new Map<string, number>();
        
        for (const transaction of transactions) {
            if (transaction.sourceAccount) {
                const current = accountCounts.get(transaction.sourceAccount) || 0;
                accountCounts.set(transaction.sourceAccount, current + 1);
            }
        }

        const result = Array.from(accountCounts.entries())
            .map(([name, transactionCount]) => ({ name, transactionCount }))
            .sort((a, b) => b.transactionCount - a.transactionCount);
            
        return result;
    }

    static extractSourceCategoryGroups(transactions: ParsedTransaction[]): SourceCategoryGroup[] {
        const groupCategories = new Map<string, Map<string, number>>();
        
        for (const transaction of transactions) {
            if (transaction.sourceCategoryGroup && transaction.sourceCategory) {
                if (!groupCategories.has(transaction.sourceCategoryGroup)) {
                    groupCategories.set(transaction.sourceCategoryGroup, new Map());
                }
                
                const categoryMap = groupCategories.get(transaction.sourceCategoryGroup)!;
                const current = categoryMap.get(transaction.sourceCategory) || 0;
                categoryMap.set(transaction.sourceCategory, current + 1);
            }
        }

        const result = Array.from(groupCategories.entries()).map(([groupName, categoryMap]) => ({
            name: groupName,
            categories: Array.from(categoryMap.entries()).map(([categoryName, transactionCount]) => ({
                name: categoryName,
                groupName,
                transactionCount
            })).sort((a, b) => b.transactionCount - a.transactionCount)
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        return result;
    }
}
