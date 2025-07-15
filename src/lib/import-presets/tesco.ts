import { ImportPreset } from './types';

export const tescoPreset: ImportPreset = {
    name: 'tesco',
    displayName: 'Tesco Bank',
    columns: {
        date: 'Date',
        amount: 'Amount',
        payee: 'Description',
        memo: 'Description'
    },
    dateFormat: 'DD/MM/YYYY',
    delimiter: ',',
    hasHeader: true,
    transform: (row) => {
        const amount = parseFloat(row.Amount?.replace(/[^0-9.-]+/g, '') || '0');
        
        return {
            amount,
            vendor: row.Description || 'Unknown',
            description: row.Description || '',
            date: row.Date,
            type: amount > 0 ? 'income' : 'payment'
        };
    }
};
