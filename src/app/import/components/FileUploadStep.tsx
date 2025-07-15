'use client';

import { useState, useRef } from 'react';
import { importPresets } from '@/lib/import-presets';

interface FileUploadStepProps {
    onFileUpload: (file: File, presetName: string) => void;
    loading: boolean;
}

export default function FileUploadStep({ onFileUpload, loading }: FileUploadStepProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                setSelectedFile(file);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            setSelectedFile(files[0]);
        }
    };

    const handleSubmit = () => {
        if (selectedFile && selectedPreset) {
            onFileUpload(selectedFile, selectedPreset);
        }
    };

    const canSubmit = selectedFile && selectedPreset && !loading;

    return (
        <div className="space-y-8">
            {/* File Upload */}
            <div className="glass-card rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
                
                <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive 
                            ? 'border-green bg-green/10' 
                            : 'border-white/20 hover:border-white/40'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        
                        {selectedFile ? (
                            <div>
                                <p className="text-green font-medium">{selectedFile.name}</p>
                                <p className="text-sm text-white/60">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-lg font-medium mb-2">
                                    Drop your CSV file here, or{' '}
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-green hover:text-green-dark underline"
                                    >
                                        browse
                                    </button>
                                </p>
                                <p className="text-sm text-white/60">
                                    Supports .csv files up to 10MB
                                </p>
                            </div>
                        )}
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>
                </div>
            </div>

            {/* Preset Selection */}
            <div className="glass-card rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Select Bank/Service Preset</h2>
                <p className="text-white/70 mb-4">
                    Choose your bank or financial service to automatically map CSV columns to CashCat fields.
                </p>
                
                <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full p-4 rounded-lg bg-white/5 border border-white/15 focus:border-green focus:outline-none transition-colors"
                >
                    <option value="">Select your bank or service...</option>
                    {importPresets.map(preset => (
                        <option key={preset.name} value={preset.name}>
                            {preset.displayName}
                        </option>
                    ))}
                </select>
            </div>

            {/* Continue Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                        canSubmit
                            ? 'bg-green text-black hover:bg-green-dark'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Parsing CSV...
                        </div>
                    ) : (
                        'Parse CSV File'
                    )}
                </button>
            </div>

            {/* Help Text */}
            <div className="glass-card-blue rounded-lg p-4">
                <h3 className="font-semibold text-green mb-2">💡 Tips for CSV Import</h3>
                <ul className="text-sm text-white/70 space-y-1">
                    <li>• Make sure your CSV file includes headers (first row with column names)</li>
                    <li>• Export from your bank with date, amount, and payee/description columns</li>
                    <li>• If your bank isn't listed, try "Generic CSV" and we'll help you map the columns</li>
                    <li>• Larger files may take a moment to process</li>
                </ul>
            </div>
        </div>
    );
}
