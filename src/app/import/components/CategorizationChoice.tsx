'use client';

interface CategorizationChoiceProps {
    transactionCount: number;
    vendorCount: number;
    onChoice: (choice: 'vendor' | 'transaction') => void;
    onBack: () => void;
}

export default function CategorizationChoice({ 
    transactionCount, 
    vendorCount, 
    onChoice, 
    onBack 
}: CategorizationChoiceProps) {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Choose Your Categorization Strategy</h2>
                <p className="text-white/70 text-lg">
                    We've parsed <span className="text-green font-medium">{transactionCount} transactions</span> with{' '}
                    <span className="text-green font-medium">{vendorCount} unique vendors</span> from your CSV file.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Vendor Categorization */}
                <div 
                    onClick={() => onChoice('vendor')}
                    className="glass-card rounded-lg p-6 cursor-pointer hover:bg-white/[.05] transition-all border border-transparent hover:border-green/30 group"
                >
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-green/20 flex items-center justify-center group-hover:bg-green/30 transition-colors">
                            <svg className="w-8 h-8 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-semibold text-green mb-2">Categorize by Vendor</h3>
                            <p className="text-sm text-white/60 mb-3">The Fast Way</p>
                            <p className="text-white/70">
                                Assign a category to each of the {vendorCount} unique vendors. 
                                All transactions from each vendor will automatically get the same category.
                            </p>
                        </div>

                        <div className="bg-green/10 rounded-lg p-3">
                            <p className="text-sm text-green font-medium">
                                ⚡ Recommended for large imports
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transaction Categorization */}
                <div 
                    onClick={() => onChoice('transaction')}
                    className="glass-card rounded-lg p-6 cursor-pointer hover:bg-white/[.05] transition-all border border-transparent hover:border-green/30 group"
                >
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-semibold text-blue-400 mb-2">Categorize Each Transaction</h3>
                            <p className="text-sm text-white/60 mb-3">The Precise Way</p>
                            <p className="text-white/70">
                                Review and categorize each of the {transactionCount} individual transactions 
                                for maximum accuracy and control.
                            </p>
                        </div>

                        <div className="bg-blue-500/10 rounded-lg p-3">
                            <p className="text-sm text-blue-400 font-medium">
                                🎯 Perfect for detailed tracking
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison */}
            <div className="glass-card-blue rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Which Should You Choose?</h3>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div>
                        <h4 className="font-medium text-green mb-2">Vendor Categorization is great for:</h4>
                        <ul className="text-white/70 space-y-1">
                            <li>• Large CSV files with hundreds of transactions</li>
                            <li>• When you shop at the same places regularly</li>
                            <li>• Quick initial setup and bulk import</li>
                            <li>• When vendor names are consistent and clear</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-blue-400 mb-2">Transaction Categorization is better for:</h4>
                        <ul className="text-white/70 space-y-1">
                            <li>• Smaller files or when you want maximum control</li>
                            <li>• When the same vendor serves multiple categories</li>
                            <li>• Complex spending patterns that need individual review</li>
                            <li>• When you want to verify every transaction</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
                >
                    ← Back to Upload
                </button>
                
                <p className="text-sm text-white/60 self-center">
                    Don't worry - you can always edit categories later in your budget
                </p>
            </div>
        </div>
    );
}
