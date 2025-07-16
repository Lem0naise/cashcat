# Import Presets

This directory contains presets for importing CSV files from various banks and financial services into CashCat. Each preset defines how to map CSV columns to CashCat transaction fields.

## Overview

Import presets allow users to easily import transaction data from their bank's CSV exports without having to manually map columns. Each preset handles the specific format and quirks of different financial institutions.

## How Presets Work

Each preset is a JavaScript/TypeScript file that exports an `ImportPreset` object containing:

- **Metadata**: Name and display name for the bank/service
- **Column Mapping**: Maps CSV column headers to CashCat fields
- **Date Format**: Expected date format in the CSV
- **Transform Function**: Optional custom logic to process each row

## Creating a New Preset

### 1. Analyze the CSV Format

First, examine a sample CSV file from the bank:

- Check for metadata rows at the top (account info, balances, etc.)
- Identify the header row with column names
- Note the date format used
- Look for separate inflow/outflow columns vs. single amount column
- Check for any special formatting (currency symbols, commas, etc.)

### 2. Create the Preset File

Create a new TypeScript file in this directory (e.g., `my-bank.ts`):

```typescript
import { ImportPreset } from './types';

export const myBankPreset: ImportPreset = {
    name: 'my-bank',                    // Unique identifier (lowercase, hyphens)
    displayName: 'My Bank Name',        // User-friendly name for dropdown
    columns: {
        date: 'Date',                   // CSV column name for transaction date
        payee: 'Description',           // CSV column name for vendor/payee
        memo: 'Description',            // CSV column name for description/memo
        amount: 'Amount',               // CSV column for single amount field
        // OR for separate inflow/outflow:
        inflow: 'Credit',               // CSV column for money received
        outflow: 'Debit'                // CSV column for money spent
    },
    dateFormat: 'DD/MM/YYYY',          // Expected date format in CSV
    delimiter: ',',                     // CSV delimiter (usually comma)
    hasHeader: true,                    // Whether CSV has header row
    transform: (row) => {               // Optional: custom processing
        // Your transformation logic here
        return {
            amount: calculatedAmount,
            vendor: cleanedVendorName,
            description: row.Description || '',
            date: row.Date,
            type: amount > 0 ? 'income' : 'payment'
        };
    }
};
```

### 3. Handle Common CSV Variations

#### Files with Metadata Rows
Many bank CSVs include account information at the top:

```csv
"Account Name:","My Account"
"Balance:","£1,234.56"

"Date","Description","Amount"
"01/01/2025","Purchase","£10.00"
```

The CSV parser automatically detects and skips metadata rows to find the actual transaction data.

#### Separate Inflow/Outflow Columns
Some banks use separate columns for money in vs. money out:

```typescript
transform: (row) => {
    const paidOut = parseFloat(row['Paid out']?.replace(/[^0-9.-]+/g, '') || '0');
    const paidIn = parseFloat(row['Paid in']?.replace(/[^0-9.-]+/g, '') || '0');
    
    // Positive for income, negative for expenses
    const amount = paidIn > 0 ? paidIn : -paidOut;
    
    return {
        amount,
        vendor: row.Description || 'Unknown',
        description: row.Description || '',
        date: row.Date,
        type: amount > 0 ? 'income' : 'payment'
    };
}
```

#### Cleaning Vendor Names
Extract meaningful vendor names from transaction descriptions:

```typescript
transform: (row) => {
    let vendor = row.Description || 'Unknown';
    
    // Remove common prefixes/suffixes
    if (vendor.includes('Card Payment')) {
        vendor = vendor.replace('Card Payment', '').trim();
    }
    
    // Extract from specific patterns
    if (vendor.includes('Direct Debit')) {
        const match = vendor.match(/Direct Debit.*?([A-Z\s]+)$/);
        if (match) {
            vendor = match[1].trim();
        }
    }
    
    return {
        // ... other fields
        vendor: vendor || 'Unknown'
    };
}
```

#### Multi-Type Transaction Handling
For platforms like Trading 212 with various transaction types:

```typescript
transform: (row) => {
    const action = row.Action || '';
    const merchantName = row['Merchant name'] || '';
    
    // Determine vendor based on transaction type
    let vendor = 'Trading 212';
    if (merchantName && merchantName.trim()) {
        // External merchant transactions
        vendor = merchantName.replace(/^CRV\*/, '').trim();
    } else {
        // Internal platform transactions
        switch (action) {
            case 'Interest on cash':
                vendor = 'Trading 212 Interest';
                break;
            case 'Spending cashback':
                vendor = 'Trading 212 Cashback';
                break;
            case 'Deposit':
                vendor = 'Bank Transfer (In)';
                break;
            default:
                vendor = `Trading 212 ${action}`;
        }
    }
    
    return {
        // ... other fields
        vendor,
        type: row.Total > 0 ? 'income' : 'payment'
    };
}
```

### 4. Add to Index File

Update `index.ts` to include your new preset:

```typescript
import { myBankPreset } from './my-bank';

export const importPresets: ImportPreset[] = [
    // ... existing presets
    myBankPreset,
];

export { myBankPreset };
```

### 5. Test Your Preset

Test with real CSV files from the bank:

1. Upload a CSV file using your preset
2. Check that transactions are parsed correctly
3. Verify dates are formatted properly
4. Ensure vendor names are clean and readable
5. Test with different CSV files to handle variations

## Common Patterns by Institution Type

### UK Banks
- Often use DD/MM/YYYY date format
- May include metadata rows with account info
- Separate debit/credit columns are common
- Transaction descriptions often include location codes

### US Banks
- Typically use MM/DD/YYYY date format
- Single amount column (negative for debits)
- May include transaction IDs or reference numbers

### Credit Cards
- Often show all amounts as positive with separate transaction types
- May include merchant category codes
- Foreign transaction fees might be separate line items

### Financial Apps (YNAB, Mint, etc.)
- Usually clean, standardized formats
- May include category assignments
- Often have consistent naming conventions

### Investment Platforms (Trading 212, etc.)
- Often include timestamps in addition to dates
- Multiple transaction types (deposits, withdrawals, card payments, interest, cashback)
- May have merchant category codes for spending transactions
- Internal platform transactions (interest, dividends) vs external transactions
- Currency information may be included

## Best Practices

1. **Start Simple**: Begin with basic column mapping, add complexity as needed
2. **Handle Edge Cases**: Test with various CSV formats from the same bank
3. **Clean Vendor Names**: Remove prefixes/suffixes to improve categorization
4. **Preserve Original Data**: Keep original description in the description field
5. **Date Flexibility**: The parser tries multiple date formats automatically
6. **Error Handling**: The transform function should be defensive against missing data
7. **Transaction Type Logic**: Use action/type fields to determine income vs payment classification
8. **Vendor Extraction**: For platforms with multiple transaction types, extract meaningful vendor names

## Contributing

When contributing new presets:

1. Use the bank's official name for `displayName`
2. Use a clear, lowercase identifier for `name`
3. Test with multiple CSV files from the institution
4. Include examples in comments if the format is complex
5. Add the bank to the README examples

## Existing Presets

- **YNAB**: You Need A Budget export format
- **NatWest**: UK bank with standard format
- **Chase UK**: Chase bank UK format
- **Tesco Bank**: UK bank format
- **Nationwide**: Building society with metadata rows
- **Trading 212**: Investment platform with multiple transaction types