import Link from 'next/link';

export const metadata = {
  title: 'Getting Started - CashCat Docs',
  description: 'Quick start guide for CashCat budgeting app.',
};

export default function GettingStarted() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Quick Start</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Get up and running with CashCat in just a few minutes. This guide will walk you through the essential steps to start budgeting effectively.
                </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            1
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Create Your Account</h3>
                            <p className="text-white/70 text-sm md:text-base mb-3 md:mb-4">
                                Sign up for a free CashCat account to get started. All you need is an email address.
                            </p>
                            <Link
                                href="/signup"
                                className="inline-flex items-center px-3 py-2 md:px-4 bg-green/20 text-green rounded-lg hover:bg-green/30 transition-all text-xs md:text-sm"
                            >
                                Create Account
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-2 md:w-4 md:h-4">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            2
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Set Up Your Bank Accounts</h3>
                            <p className="text-white/70 text-sm md:text-base mb-3 md:mb-4">
                                Add your checking, savings, and credit card accounts to get a complete picture of your finances.
                            </p>
                            <Link
                                href="/docs/bank-accounts"
                                className="inline-flex items-center text-green hover:text-green-dark underline text-xs md:text-sm"
                            >
                                Learn about Bank Accounts
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-1 md:w-4 md:h-4">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            3
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Create Your First Budget</h3>
                            <p className="text-white/70 text-sm md:text-base mb-3 md:mb-4">
                                Follow our step-by-step guide to create your first zero-based budget and assign every penny a purpose.
                            </p>
                            <Link
                                href="/docs/first-budget"
                                className="inline-flex items-center text-green hover:text-green-dark underline text-xs md:text-sm"
                            >
                                Create First Budget
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-1 md:w-4 md:h-4">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            4
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Track Your Spending</h3>
                            <p className="text-white/70 text-sm md:text-base mb-3 md:mb-4">
                                Start recording transactions and watch your budget come to life. Every purchase should be assigned to a category.
                            </p>
                            <Link
                                href="/docs/transactions"
                                className="inline-flex items-center text-green hover:text-green-dark underline text-xs md:text-sm"
                            >
                                Learn about Transactions
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-1 md:w-4 md:h-4">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">💡 Pro Tips for Success</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use your last month's expenses to get realistic budget amounts</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Don't forget to budget for irregular expenses like car maintenance</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Check your budget daily for the first month to build the habit</span>
                    </li>
                </ul>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">What's Next?</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Ready to dive deeper? Here are the next steps:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/docs/zero-based-budgeting" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Learn Zero-Based Budgeting</h4>
                            <p className="text-xs md:text-sm text-white/60">Understand the philosophy behind CashCat</p>
                        </div>
                    </Link>
                    <Link href="/docs/best-practices" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Best Practices</h4>
                            <p className="text-xs md:text-sm text-white/60">Tips for budgeting success</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
