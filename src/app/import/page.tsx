'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import ProtectedRoute from '../components/protected-route';
import Navbar from '../components/navbar';
import Sidebar from '../components/sidebar';
import MobileNav from '../components/mobileNav';
import FileUploadStep from './components/FileUploadStep';
import CategorizationChoice from './components/CategorizationChoice';
import VendorCategorizer from './components/VendorCategorizer';
import TransactionCategorizer from './components/TransactionCategorizer';
import ImportSummary from './components/ImportSummary';
import { importPresets } from '@/lib/import-presets';
import { CSVParser } from '@/lib/csv-parser';
import { ParsedTransaction, VendorCategorization } from '@/lib/import-presets/types';
import { submitTransaction } from '@/app/utils/transactions';

type ImportStep = 'upload' | 'choice' | 'vendor-categorize' | 'transaction-categorize' | 'summary';

interface ImportState {
    file: File | null;
    presetName: string;
    parsedTransactions: ParsedTransaction[];
    uniqueVendors: { vendor: string; count: number }[];
    categorizationChoice: 'vendor' | 'transaction' | null;
    vendorCategorizations: VendorCategorization[];
    finalTransactions: ParsedTransaction[];
}

export default function ImportPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
    const [loading, setLoading] = useState(false);
    const [importState, setImportState] = useState<ImportState>({
        file: null,
        presetName: '',
        parsedTransactions: [],
        uniqueVendors: [],
        categorizationChoice: null,
        vendorCategorizations: [],
        finalTransactions: []
    });

    const handleFileUpload = useCallback(async (file: File, presetName: string) => {
        setLoading(true);
        try {
            const preset = importPresets.find(p => p.name === presetName);
            if (!preset) {
                throw new Error('Invalid preset selected');
            }

            const parser = new CSVParser(preset);
            const transactions = await parser.parseFile(file);
            const uniqueVendors = CSVParser.extractUniqueVendors(transactions);

            setImportState(prev => ({
                ...prev,
                file,
                presetName,
                parsedTransactions: transactions,
                uniqueVendors
            }));

            setCurrentStep('choice');
            toast.success(`Parsed ${transactions.length} transactions from your CSV file`);
        } catch (error) {
            console.error('Error parsing CSV:', error);
            toast.error('Failed to parse CSV file. Please check the format and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCategorizationChoice = useCallback((choice: 'vendor' | 'transaction') => {
        setImportState(prev => ({
            ...prev,
            categorizationChoice: choice
        }));

        if (choice === 'vendor') {
            setCurrentStep('vendor-categorize');
        } else {
            setCurrentStep('transaction-categorize');
        }
    }, []);

    const handleVendorCategorizations = useCallback((categorizations: VendorCategorization[]) => {
        // Apply vendor categorizations to transactions
        const finalTransactions = importState.parsedTransactions.map(transaction => {
            const vendorCat = categorizations.find(cat => cat.vendor === transaction.vendor);
            return {
                ...transaction,
                category_id: vendorCat?.category_id || undefined
            };
        });

        setImportState(prev => ({
            ...prev,
            vendorCategorizations: categorizations,
            finalTransactions
        }));

        setCurrentStep('summary');
    }, [importState.parsedTransactions]);

    const handleTransactionCategorizations = useCallback((transactions: ParsedTransaction[]) => {
        setImportState(prev => ({
            ...prev,
            finalTransactions: transactions
        }));

        setCurrentStep('summary');
    }, []);

    const handleFinalImport = useCallback(async (accountId: string) => {
        setLoading(true);
        try {
            const importPromises = importState.finalTransactions.map(transaction => 
                submitTransaction({
                    amount: transaction.amount,
                    type: transaction.type,
                    date: transaction.date,
                    vendor: transaction.vendor,
                    account_id: accountId,
                    description: transaction.description,
                    category_id: transaction.category_id || null
                })
            );

            await Promise.all(importPromises);
            
            toast.success(`Successfully imported ${importState.finalTransactions.length} transactions!`);
            
            // Navigate to transactions page
            router.push('/budget/transactions');
        } catch (error) {
            console.error('Error importing transactions:', error);
            toast.error('Failed to import some transactions. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [importState.finalTransactions, router]);

    const handleReset = useCallback(() => {
        setImportState({
            file: null,
            presetName: '',
            parsedTransactions: [],
            uniqueVendors: [],
            categorizationChoice: null,
            vendorCategorizations: [],
            finalTransactions: []
        });
        setCurrentStep('upload');
    }, []);

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 'upload':
                return (
                    <FileUploadStep
                        onFileUpload={handleFileUpload}
                        loading={loading}
                    />
                );
            
            case 'choice':
                return (
                    <CategorizationChoice
                        transactionCount={importState.parsedTransactions.length}
                        vendorCount={importState.uniqueVendors.length}
                        onChoice={handleCategorizationChoice}
                        onBack={handleReset}
                    />
                );
            
            case 'vendor-categorize':
                return (
                    <VendorCategorizer
                        vendors={importState.uniqueVendors}
                        onComplete={handleVendorCategorizations}
                        onBack={() => setCurrentStep('choice')}
                    />
                );
            
            case 'transaction-categorize':
                return (
                    <TransactionCategorizer
                        transactions={importState.parsedTransactions}
                        onComplete={handleTransactionCategorizations}
                        onBack={() => setCurrentStep('choice')}
                    />
                );
            
            case 'summary':
                return (
                    <ImportSummary
                        transactions={importState.finalTransactions}
                        onImport={handleFinalImport}
                        onBack={() => {
                            const prevStep = importState.categorizationChoice === 'vendor' 
                                ? 'vendor-categorize' 
                                : 'transaction-categorize';
                            setCurrentStep(prevStep);
                        }}
                        loading={loading}
                    />
                );
            
            default:
                return null;
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-900 text-white font-[family-name:var(--font-suse)]">
                <Navbar />
                <Sidebar />
                <MobileNav />
                
                <div className="md:ml-64 p-4 md:p-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold mb-4">Import Transactions</h1>
                            <p className="text-white/70 text-lg">
                                Import your transaction history from CSV files exported by banks and financial services.
                            </p>
                        </div>

                        {/* Progress Indicator */}
                        <div className="mb-8">
                            <div className="flex items-center gap-4 text-sm">
                                <div className={`flex items-center gap-2 ${
                                    currentStep === 'upload' ? 'text-green' : 
                                    ['choice', 'vendor-categorize', 'transaction-categorize', 'summary'].includes(currentStep) ? 'text-green' : 'text-white/40'
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        currentStep === 'upload' ? 'bg-green text-black' : 
                                        ['choice', 'vendor-categorize', 'transaction-categorize', 'summary'].includes(currentStep) ? 'bg-green text-black' : 'bg-white/10'
                                    }`}>
                                        1
                                    </div>
                                    <span>Upload</span>
                                </div>
                                
                                <div className="flex-1 h-px bg-white/20"></div>
                                
                                <div className={`flex items-center gap-2 ${
                                    currentStep === 'choice' ? 'text-green' : 
                                    ['vendor-categorize', 'transaction-categorize', 'summary'].includes(currentStep) ? 'text-green' : 'text-white/40'
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        currentStep === 'choice' ? 'bg-green text-black' : 
                                        ['vendor-categorize', 'transaction-categorize', 'summary'].includes(currentStep) ? 'bg-green text-black' : 'bg-white/10'
                                    }`}>
                                        2
                                    </div>
                                    <span>Choose Method</span>
                                </div>
                                
                                <div className="flex-1 h-px bg-white/20"></div>
                                
                                <div className={`flex items-center gap-2 ${
                                    ['vendor-categorize', 'transaction-categorize'].includes(currentStep) ? 'text-green' : 
                                    currentStep === 'summary' ? 'text-green' : 'text-white/40'
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        ['vendor-categorize', 'transaction-categorize'].includes(currentStep) ? 'bg-green text-black' : 
                                        currentStep === 'summary' ? 'bg-green text-black' : 'bg-white/10'
                                    }`}>
                                        3
                                    </div>
                                    <span>Categorize</span>
                                </div>
                                
                                <div className="flex-1 h-px bg-white/20"></div>
                                
                                <div className={`flex items-center gap-2 ${
                                    currentStep === 'summary' ? 'text-green' : 'text-white/40'
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        currentStep === 'summary' ? 'bg-green text-black' : 'bg-white/10'
                                    }`}>
                                        4
                                    </div>
                                    <span>Import</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        {renderCurrentStep()}
                    </div>
                </div>
                
                <Toaster position="top-right" />
            </div>
        </ProtectedRoute>
    );
}
