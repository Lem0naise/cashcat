import { ImportPreset } from './types';

export const ynabPreset: ImportPreset = {
    name: 'ynab',
    displayName: 'YNAB (You Need A Budget)',
    isEnhancedService: true,
    columns: {
        date: 'Date',
        payee: 'Payee',
        memo: 'Memo',
        inflow: 'Inflow',
        outflow: 'Outflow',
        account: 'Account',
        category: 'Category',
        categoryGroup: 'Category Group'
    },
    dateFormat: 'dd/MM/yyyy',
    delimiter: ',',
    hasHeader: true,
    transform: (row) => {
        // Parse amounts, removing currency symbols and converting to numbers
        const inflowStr = row.Inflow || '£0.00';
        const outflowStr = row.Outflow || '£0.00';
        
        const inflow = parseFloat(inflowStr.replace(/[^0-9.-]+/g, '') || '0');
        const outflow = parseFloat(outflowStr.replace(/[^0-9.-]+/g, '') || '0');
        
        // Calculate net amount (positive for income, negative for expenses)
        const amount = inflow > 0 ? inflow : -outflow;
        
        // Clean up vendor name
        let vendor = row.Payee || 'Unknown';
        if (vendor.trim() === '') {
            vendor = 'Unknown';
        }
        
        // Determine transaction type
        const type = amount > 0 ? 'income' : 'payment';
        
        return {
            amount,
            vendor,
            description: row.Memo || '',
            date: row.Date,
            type,
            sourceAccount: row.Account || '',
            sourceCategory: row.Category || '',
            sourceCategoryGroup: row['Category Group'] || ''
        };
    }
};
