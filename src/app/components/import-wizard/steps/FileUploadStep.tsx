'use client';

import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';

interface FileUploadStepProps {
    onFileSelected: (file: File) => Promise<void>;
}

export default function FileUploadStep({ onFileSelected }: FileUploadStepProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(async (file: File) => {
        setError(null);

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError('Please upload a CSV file (.csv)');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            setError('File is too large. Maximum size is 10MB.');
            return;
        }

        setIsProcessing(true);
        try {
            await onFileSelected(file);
        } catch (err: any) {
            setError(err.message || 'Failed to process file');
        } finally {
            setIsProcessing(false);
        }
    }, [onFileSelected]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }, [handleFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    }, [handleFile]);

    return (
        <div className="space-y-6">
            <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-white mb-1">Upload CSV File</h3>
                <p className="text-sm text-white/50">
                    Import transactions from your bank&apos;s CSV export
                </p>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragOver
                        ? 'border-green bg-green/5 scale-[1.02]'
                        : 'border-white/20 hover:border-white/40 hover:bg-white/[.02]'
                    }
                    ${isProcessing ? 'pointer-events-none opacity-60' : ''}
                `}
            >
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
                        <p className="text-white/70 text-sm">Processing file...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 font-medium">
                                {isDragOver ? 'Drop your file here' : 'Drag & drop your CSV file'}
                            </p>
                            <p className="text-white/40 text-sm mt-1">
                                or <span className="text-green underline">browse files</span>
                            </p>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                />
            </div>

            {/* Error message */}
            {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-reddy/10 border border-reddy/30">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-reddy mt-0.5 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <p className="text-sm text-reddy/90">{error}</p>
                </div>
            )}

            {/* Supported formats */}
            <div className="space-y-2">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Supported Formats</p>
                <div className="grid grid-cols-3 gap-2">
                    {['YNAB', 'Starling', 'Custom CSV'].map(format => (
                        <div key={format} className="text-center py-2 px-3 rounded-lg bg-white/[.03] border border-white/[.06]">
                            <p className="text-xs text-white/60">{format}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
