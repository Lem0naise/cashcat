import { ImportPreset } from './types';

export const chaseUkPreset: ImportPreset = {
    name: 'chase-uk',
    displayName: 'Chase UK',
    columns: {
        date: 'Transaction date',
        amount: 'Amount',
        payee: 'Description',
        memo: 'Description'
    },
    dateFormat: 'YYYY-MM-DD',
    delimiter: ',',
    hasHeader: true,
    transform: (row) => {
        const amount = parseFloat(row.Amount?.replace(/[^0-9.-]+/g, '') || '0');
        
        return {
            amount,
            vendor: row.Description || 'Unknown',
            description: row.Description || '',
            date: row['Transaction date'],
            type: amount > 0 ? 'income' : 'payment'
        };
    }
};
