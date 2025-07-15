import { ImportPreset } from './types';

export const natwestPreset: ImportPreset = {
    name: 'natwest',
    displayName: 'NatWest',
    columns: {
        date: 'Date',
        amount: 'Value',
        payee: 'Description',
        memo: 'Description'
    },
    dateFormat: 'DD/MM/YYYY',
    delimiter: ',',
    hasHeader: true,
    transform: (row) => {
        const amount = parseFloat(row.Value?.replace(/[^0-9.-]+/g, '') || '0');
        
        return {
            amount,
            vendor: row.Description || 'Unknown',
            description: row.Description || '',
            date: row.Date,
            type: amount > 0 ? 'income' : 'payment'
        };
    }
};
