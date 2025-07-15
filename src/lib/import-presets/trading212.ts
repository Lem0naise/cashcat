import { ImportPreset } from './types';

export const trading212Preset: ImportPreset = {
    name: 'trading212',
    displayName: 'Trading 212',
    columns: {
        date: 'Time',
        amount: 'Total',
        payee: 'Merchant name',
        memo: 'Notes'
    },
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    delimiter: ',',
    hasHeader: true,
    transform: (row) => {
        const amount = parseFloat(row.Total?.replace(/[^0-9.-]+/g, '') || '0');
        const action = row.Action || '';
        const notes = row.Notes || '';
        const merchantName = row['Merchant name'] || '';
        
        // Determine vendor based on action type and available data
        let vendor = 'Trading 212';
        if (merchantName && merchantName.trim()) {
            // For card transactions, clean up merchant name
            vendor = merchantName.replace(/^CRV\*/, '').replace(/^000\*/, '').trim();
        } else {
            // For internal Trading 212 transactions, use action as vendor
            switch (action) {
                case 'Interest on cash':
                    vendor = 'Trading 212 Interest';
                    break;
                case 'Spending cashback':
                    vendor = 'Trading 212 Cashback';
                    break;
                case 'Deposit':
                    vendor = notes.includes('Bank Transfer') ? 'Bank Transfer (In)' : 'Trading 212 Deposit';
                    break;
                case 'Withdrawal':
                    vendor = 'Bank Transfer (Out)';
                    break;
                case 'Card credit':
                    vendor = 'Trading 212 Refund';
                    break;
                case 'Dividend adjustment':
                    vendor = 'Trading 212 Dividend';
                    break;
                default:
                    vendor = `Trading 212 ${action}`;
            }
        }
        
        // Create description combining action and notes
        let description = action;
        if (notes && notes !== action) {
            description += notes ? ` - ${notes}` : '';
        }
        if (merchantName && row['Merchant category']) {
            description += ` (${row['Merchant category']})`;
        }
        
        // Clean up time format - Trading 212 uses various formats
        let dateString = row.Time || '';
        if (dateString.includes('.')) {
            // Handle format like "2024-11-18 13:59:42.597"
            dateString = dateString.split('.')[0];
        }
        // Extract just the date part
        const datePart = dateString.split(' ')[0];
        
        return {
            amount,
            vendor: vendor || 'Trading 212',
            description: description.trim(),
            date: datePart,
            type: amount > 0 ? 'income' : 'payment'
        };
    }
};
