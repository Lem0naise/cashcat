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
import AccountMappingStep from './components/AccountMappingStep';
import CategoryMappingStep from './components/CategoryMappingStep';
import EnhancedImportSummary from './components/EnhancedImportSummary';
import { importPresets } from '@/lib/import-presets';
import { CSVParser } from '@/lib/csv-parser';
import { 
    ParsedTransaction, 
    VendorCategorization, 
    SourceAccount, 
    SourceCategoryGroup,
    AccountMapping,
    CategoryMapping,
    EnhancedImportData
} from '@/lib/import-presets/types';
import { submitTransaction } from '@/app/utils/transactions';

type ImportStep = 'upload' | 'choice' | 'vendor-categorize' | 'transaction-categorize' | 'summary' | 
                  'account-mapping' | 'category-mapping' | 'enhanced-summary';

interface ImportState {
    file: File | null;
    presetName: string;
    parsedTransactions: ParsedTransaction[];
    uniqueVendors: { vendor: string; count: number }[];
    categorizationChoice: 'vendor' | 'transaction' | null;
    vendorCategorizations: VendorCategorization[];
    finalTransactions: ParsedTransaction[];
    // Enhanced import data
    isEnhancedService: boolean;
    sourceAccounts: SourceAccount[];
    sourceCategoryGroups: SourceCategoryGroup[];
    accountMappings: AccountMapping[];
    categoryMappings: CategoryMapping[];
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
        finalTransactions: [],
        // Enhanced import data
        isEnhancedService: false,
        sourceAccounts: [],
        sourceCategoryGroups: [],
        accountMappings: [],
        categoryMappings: []
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
            
            console.log('Parsed transactions:', transactions.length);
            console.log('Sample transaction:', transactions[0]);
            
            // Check if this is an enhanced service (like YNAB)
            const isEnhanced = preset.isEnhancedService || false;
            
            console.log('Is enhanced service:', isEnhanced, 'Preset name:', preset.name);
            
            if (isEnhanced) {
                // Extract enhanced data
                const sourceAccounts = CSVParser.extractSourceAccounts(transactions);
                const sourceCategoryGroups = CSVParser.extractSourceCategoryGroups(transactions);
                
                console.log('Source accounts:', sourceAccounts);
                console.log('Source category groups:', sourceCategoryGroups);
                
                setImportState(prev => ({
                    ...prev,
                    file,
                    presetName,
                    parsedTransactions: transactions,
                    isEnhancedService: true,
                    sourceAccounts,
                    sourceCategoryGroups
                }));

                setCurrentStep('account-mapping');
                toast.success(`Parsed ${transactions.length} transactions from YNAB export`);
            } else {
                // Standard flow
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
            }
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

    // Enhanced import handlers
    const handleAccountMappings = useCallback((mappings: AccountMapping[]) => {
        setImportState(prev => ({
            ...prev,
            accountMappings: mappings
        }));
        setCurrentStep('category-mapping');
    }, []);

    const handleCategoryMappings = useCallback((mappings: CategoryMapping[]) => {
        setImportState(prev => ({
            ...prev,
            categoryMappings: mappings
        }));
        setCurrentStep('enhanced-summary');
    }, []);

    const handleEnhancedImport = useCallback(async () => {
        setLoading(true);
        try {
            // Apply account and category mappings to transactions and distribute to appropriate accounts
            const transactionsWithMappings = importState.parsedTransactions.map(transaction => {
                // Find the account mapping for this transaction's source account
                const accountMapping = importState.accountMappings.find(
                    mapping => mapping.sourceAccount === transaction.sourceAccount
                );

                // Find the category mapping for this transaction's category
                const categoryMapping = importState.categoryMappings.find(
                    mapping => mapping.sourceCategory === transaction.sourceCategory &&
                               mapping.sourceCategoryGroup === transaction.sourceCategoryGroup
                );

                if (!accountMapping) {
                    throw new Error(`No account mapping found for source account: ${transaction.sourceAccount}`);
                }

                return {
                    ...transaction,
                    account_id: accountMapping.targetAccountId,
                    category_id: categoryMapping?.targetCategoryId || null
                };
            });

            console.log(`Importing ${transactionsWithMappings.length} transactions across ${importState.accountMappings.length} accounts`);
            
            const importPromises = transactionsWithMappings.map(transaction => 
                submitTransaction({
                    amount: transaction.amount,
                    type: transaction.type,
                    date: transaction.date,
                    vendor: transaction.vendor,
                    account_id: transaction.account_id!,
                    description: transaction.description,
                    category_id: transaction.category_id
                })
            );

            await Promise.all(importPromises);
            
            // Count transactions per account for success message
            const accountCounts = transactionsWithMappings.reduce((acc, t) => {
                acc[t.account_id!] = (acc[t.account_id!] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            const accountCount = Object.keys(accountCounts).length;
            
            toast.success(`Successfully imported ${importState.parsedTransactions.length} transactions across ${accountCount} accounts!`);
            
            // Navigate to transactions page
            router.push('/budget/transactions');
        } catch (error) {
            console.error('Error importing transactions:', error);
            toast.error('Failed to import some transactions. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [importState.parsedTransactions, importState.accountMappings, importState.categoryMappings, router]);

    const handleReset = useCallback(() => {
        setImportState({
            file: null,
            presetName: '',
            parsedTransactions: [],
            uniqueVendors: [],
            categorizationChoice: null,
            vendorCategorizations: [],
            finalTransactions: [],
            // Enhanced import data
            isEnhancedService: false,
            sourceAccounts: [],
            sourceCategoryGroups: [],
            accountMappings: [],
            categoryMappings: []
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
            
            case 'account-mapping':
                return (
                    <AccountMappingStep
                        sourceAccounts={importState.sourceAccounts}
                        onComplete={handleAccountMappings}
                        onBack={handleReset}
                    />
                );
            
            case 'category-mapping':
                return (
                    <CategoryMappingStep
                        sourceCategoryGroups={importState.sourceCategoryGroups}
                        onComplete={handleCategoryMappings}
                        onBack={() => setCurrentStep('account-mapping')}
                    />
                );
            
            case 'enhanced-summary':
                return (
                    <EnhancedImportSummary
                        transactions={importState.parsedTransactions}
                        accountMappings={importState.accountMappings}
                        categoryMappings={importState.categoryMappings}
                        onImport={handleEnhancedImport}
                        onBack={() => setCurrentStep('category-mapping')}
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
            <div className="min-h-screen bg-background text-white font-[family-name:var(--font-suse)]">
                <Navbar />
                <Sidebar />
                <MobileNav />
                
                <main className="pt-16 pb-28 md:pb-6 sm:ml-20 lg:ml-[max(16.66%,100px)] p-6 fade-in">
                    <div className="max-w-4xl mx-auto">
                        {/* Mobile header */}
                        <div className="md:hidden mb-6">
                            <h1 className="text-2xl font-bold tracking-[-.01em]">Import Transactions</h1>
                            <p className="text-white/70">
                                Import your transaction history from CSV files exported by banks and financial services.
                            </p>
                        </div>

                        {/* Desktop header */}
                        <div className="hidden md:flex items-center justify-between mb-8 md:mt-8">
                            <div>
                                <h1 className="text-3xl font-bold mb-4">Import Transactions</h1>
                                <p className="text-white/70 text-lg">
                                    Import your transaction history from CSV files exported by banks and financial services.
                                </p>
                            </div>
                        </div>

                        {/* Progress Indicator */}
                        <div className="mb-8">
                            {importState.isEnhancedService ? (
                                // Enhanced service progress
                                <div className="flex items-center gap-2 text-sm overflow-x-auto">
                                    <div className={`flex items-center gap-2 whitespace-nowrap ${
                                        currentStep === 'upload' ? 'text-green' : 
                                        ['account-mapping', 'group-mapping', 'category-mapping', 'enhanced-summary'].includes(currentStep) ? 'text-green' : 'text-white/40'
                                    }`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                            currentStep === 'upload' ? 'bg-green text-black' : 
                                            ['account-mapping', 'group-mapping', 'category-mapping', 'enhanced-summary'].includes(currentStep) ? 'bg-green text-black' : 'bg-white/10'
                                        }`}>
                                            1
                                        </div>
                                        <span className="text-xs">Upload</span>
                                    </div>
                                    
                                    <div className="flex-1 h-px bg-white/20 min-w-4"></div>
                                    
                                    <div className={`flex items-center gap-2 whitespace-nowrap ${
                                        currentStep === 'account-mapping' ? 'text-green' : 
                                        ['category-mapping', 'enhanced-summary'].includes(currentStep) ? 'text-green' : 'text-white/40'
                                    }`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                            currentStep === 'account-mapping' ? 'bg-green text-black' : 
                                            ['category-mapping', 'enhanced-summary'].includes(currentStep) ? 'bg-green text-black' : 'bg-white/10'
                                        }`}>
                                            2
                                        </div>
                                        <span className="text-xs">Accounts</span>
                                    </div>
                                    
                                    <div className="flex-1 h-px bg-white/20 min-w-4"></div>
                                    
                                    <div className={`flex items-center gap-2 whitespace-nowrap ${
                                        currentStep === 'category-mapping' ? 'text-green' : 
                                        currentStep === 'enhanced-summary' ? 'text-green' : 'text-white/40'
                                    }`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                            currentStep === 'category-mapping' ? 'bg-green text-black' : 
                                            currentStep === 'enhanced-summary' ? 'bg-green text-black' : 'bg-white/10'
                                        }`}>
                                            3
                                        </div>
                                        <span className="text-xs">Categories</span>
                                    </div>
                                    
                                    <div className="flex-1 h-px bg-white/20 min-w-4"></div>
                                    
                                    <div className={`flex items-center gap-2 whitespace-nowrap ${
                                        currentStep === 'enhanced-summary' ? 'text-green' : 'text-white/40'
                                    }`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                            currentStep === 'enhanced-summary' ? 'bg-green text-black' : 'bg-white/10'
                                        }`}>
                                            4
                                        </div>
                                        <span className="text-xs">Import</span>
                                    </div>
                                </div>
                            ) : (
                                // Standard import progress
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
                            )}
                        </div>

                        {/* Main Content */}
                        {renderCurrentStep()}
                    </div>
                </main>
                
                <Toaster position="top-right" />
            </div>
        </ProtectedRoute>
    );
}
