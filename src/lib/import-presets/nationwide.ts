import { ImportPreset } from './types';

export const nationwidePreset: ImportPreset = {
    name: 'nationwide',
    displayName: 'Nationwide Building Society',
    columns: {
        date: 'Date',
        payee: 'Description',
        memo: 'Description',
        outflow: 'Paid out',
        inflow: 'Paid in'
    },
    dateFormat: 'DD MMM YYYY',
    delimiter: ',',
    hasHeader: true,
    transform: (row) => {
        // Parse amounts, handling currency symbols and empty values
        const paidOut = parseFloat(row['Paid out']?.replace(/[^0-9.-]+/g, '') || '0');
        const paidIn = parseFloat(row['Paid in']?.replace(/[^0-9.-]+/g, '') || '0');
        
        // Determine net amount (positive for income, negative for payments)
        const amount = paidIn > 0 ? paidIn : -paidOut;
        
        // Clean up description
        let vendor = row.Description || 'Unknown';
        
        // Extract meaningful vendor names from common transaction patterns
        if (vendor.includes('Contactless Payment')) {
            // Extract vendor from "Contactless Payment VENDOR_NAME LOCATION APPLEPAY"
            const match = vendor.match(/Contactless Payment\s+(.+?)\s+(GB|UK|[A-Z]{2})\s/);
            if (match) {
                vendor = match[1].trim();
            }
        } else if (vendor.includes('Payment to')) {
            // Extract payee from "Payment to PAYEE_NAME"
            vendor = vendor.replace('Payment to', '').trim();
        } else if (vendor.includes('Direct Debit')) {
            // Extract company from "Direct Debit - Description COMPANY"
            const match = vendor.match(/Direct Debit.*?([A-Z\s]+)$/);
            if (match) {
                vendor = match[1].trim();
            }
        } else if (vendor.includes('Bank credit')) {
            // Extract source from "Bank credit SOURCE"
            vendor = vendor.replace('Bank credit', '').trim();
        } else if (vendor.includes('Transfer from')) {
            // Extract source from "Transfer from SOURCE"
            vendor = vendor.replace('Transfer from', '').trim();
        }
        
        return {
            amount,
            vendor: vendor || 'Unknown',
            description: row.Description || '',
            date: row.Date,
            type: amount > 0 ? 'income' : 'payment'
        };
    }
};
