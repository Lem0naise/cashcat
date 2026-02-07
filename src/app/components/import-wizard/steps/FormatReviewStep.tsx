'use client';

import { useMemo } from 'react';
import Dropdown from '../../dropdown';
import type { ColumnMapping, DateFormatOption, DetectedFormat } from '../types';

interface FormatReviewStepProps {
    headers: string[];
    rows: string[][];
    detectedFormat: DetectedFormat;
    columnMapping: ColumnMapping;
    dateFormat: DateFormatOption;
    onUpdateMapping: (mapping: Partial<ColumnMapping>) => void;
    onDateFormatChange: (format: DateFormatOption) => void;
}

const FORMAT_LABELS: Record<DetectedFormat, string> = {
    ynab: 'YNAB (You Need A Budget)',
    starling: 'Starling Bank',
    custom: 'Custom CSV',
};

const FORMAT_COLORS: Record<DetectedFormat, string> = {
    ynab: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    starling: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    custom: 'bg-white/10 text-white/70 border-white/20',
};

export default function FormatReviewStep({
    headers,
    rows,
    detectedFormat,
    columnMapping,
    dateFormat,
    onUpdateMapping,
    onDateFormatChange,
}: FormatReviewStepProps) {
    const previewRows = rows.slice(0, 4);
    const isYNAB = detectedFormat === 'ynab';

    // Build dropdown options from headers
    const headerOptions = useMemo(() => {
        return [
            { value: '-1', label: '— Not mapped —' },
            ...headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` })),
        ];
    }, [headers]);

    const mappingFields = useMemo((): { key: keyof ColumnMapping; label: string; required: boolean }[] => {
        const base: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
            { key: 'date', label: 'Date', required: true },
            { key: 'vendor', label: 'Vendor / Payee', required: true },
        ];

        if (isYNAB) {
            base.push(
                { key: 'inflow', label: 'Inflow', required: true },
                { key: 'outflow', label: 'Outflow', required: true },
            );
        } else {
            base.push({ key: 'amount', label: 'Amount', required: true });
        }

        base.push(
            { key: 'description', label: 'Description / Memo', required: false },
            { key: 'category', label: 'Category', required: false },
        );

        return base;
    }, [isYNAB]);

    return (
        <div className="space-y-5">
            {/* Format badge */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Column Mapping</h3>
                    <p className="text-sm text-white/50 mt-0.5">Confirm how your CSV columns map to CashCat fields</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${FORMAT_COLORS[detectedFormat]}`}>
                    {FORMAT_LABELS[detectedFormat]}
                </span>
            </div>

            {/* Column mapping */}
            <div className="space-y-3">
                {mappingFields.map(field => {
                    const currentValue = columnMapping[field.key];
                    return (
                        <div key={field.key} className="flex items-center gap-3">
                            <div className="w-36 shrink-0">
                                <p className="text-sm text-white/80">
                                    {field.label}
                                    {field.required && <span className="text-reddy ml-1">*</span>}
                                </p>
                            </div>
                            <div className="flex-1">
                                <Dropdown
                                    options={headerOptions}
                                    value={String(currentValue ?? -1)}
                                    onChange={(val) => {
                                        const num = parseInt(val);
                                        onUpdateMapping({ [field.key]: num >= 0 ? num : undefined } as Partial<ColumnMapping>);
                                    }}
                                    placeholder="Select column"
                                />
                            </div>
                        </div>
                    );
                })}

                {/* Date format selector */}
                <div className="flex items-center gap-3">
                    <div className="w-36 shrink-0">
                        <p className="text-sm text-white/80">Date Format</p>
                    </div>
                    <div className="flex-1">
                        <Dropdown
                            options={[
                                { value: 'auto', label: 'Auto-detect' },
                                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-01-31)' },
                                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/01/2024)' },
                                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/31/2024)' },
                                { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-01-2024)' },
                            ]}
                            value={dateFormat}
                            onChange={(val) => onDateFormatChange(val as DateFormatOption)}
                        />
                    </div>
                </div>
            </div>

            {/* Preview table */}
            <div>
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">Preview (first {previewRows.length} rows)</p>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-white/[.03]">
                                {headers.map((h, i) => {
                                    // Highlight mapped columns
                                    const mappedAs = mappingFields.find(f => {
                                        const val = columnMapping[f.key];
                                        return val === i;
                                    });
                                    return (
                                        <th key={i} className={`px-3 py-2 text-left text-xs font-medium whitespace-nowrap ${mappedAs ? 'text-green' : 'text-white/40'}`}>
                                            {h || `Col ${i + 1}`}
                                            {mappedAs && (
                                                <span className="ml-1 text-[10px] text-green/60">→ {mappedAs.label}</span>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {previewRows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-t border-white/[.05]">
                                    {row.map((cell, cellIdx) => (
                                        <td key={cellIdx} className="px-3 py-2 text-white/70 whitespace-nowrap max-w-[200px] truncate">
                                            {cell || <span className="text-white/20">—</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
