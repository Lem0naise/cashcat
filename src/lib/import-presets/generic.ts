import { ImportPreset } from './types';

export const genericPreset: ImportPreset = {
    name: 'generic',
    displayName: 'Generic CSV',
    columns: {
        date: 'Date',
        amount: 'Amount',
        payee: 'Payee',
        memo: 'Description'
    },
    dateFormat: 'YYYY-MM-DD',
    delimiter: ',',
    hasHeader: true,
    transform: (row) => {
        const amount = parseFloat(row.Amount?.replace(/[^0-9.-]+/g, '') || '0');
        
        return {
            amount,
            vendor: row.Payee || 'Unknown',
            description: row.Description || row.Memo || '',
            date: row.Date,
            type: amount > 0 ? 'income' : 'payment'
        };
    }
};
