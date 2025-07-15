import { ImportPreset } from './types';

export const ynabPreset: ImportPreset = {
    name: 'ynab',
    displayName: 'YNAB (You Need A Budget)',
    columns: {
        date: 'Date',
        payee: 'Payee',
        memo: 'Memo',
        outflow: 'Outflow',
        inflow: 'Inflow'
    },
    dateFormat: 'MM/DD/YYYY',
    delimiter: ',',
    hasHeader: true,
    transform: (row) => {
        const outflow = parseFloat(row.Outflow?.replace(/[^0-9.-]+/g, '') || '0');
        const inflow = parseFloat(row.Inflow?.replace(/[^0-9.-]+/g, '') || '0');
        const amount = inflow > 0 ? inflow : -outflow;
        
        return {
            amount,
            vendor: row.Payee || 'Unknown',
            description: row.Memo || '',
            date: row.Date,
            type: amount > 0 ? 'income' : 'payment'
        };
    }
};
