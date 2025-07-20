import Link from 'next/link';

export const metadata = {
  title: 'First Budget - CashCat Docs',
  description: 'Learn how to create your first zero-based budget with CashCat.',
};

export default function FirstBudget() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Create Your First Budget</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Learn how to create a zero-based budget that gives every penny a purpose. This step-by-step guide will help you build your first budget in CashCat.
                </p>
            </div>

            <Link
                href="/learn"
                className="bg-green text-black px-6 py-3 rounded-lg hover:bg-green-dark transition-colors text-sm font-medium sm:order-none"
            >
                View a sample category card
            </Link>

            {/* Steps */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12 mt-8">
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            1
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Calculate Your Monthly Income</h3>
                            <p className="text-white/70 text-sm md:text-base mb-3 md:mb-4">
                                Start by determining your total monthly inflow to your bank accounts. Include all sources like salary, any freelance work, and side hustles. This will be your starting point to your monthly budget.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            2
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Create Budget Categories</h3>
                            <p className="text-white/70 text-sm md:text-base mb-3 md:mb-4">
                                Set up categories for your expenses like housing, food, transportation, and entertainment. You can group related categories together. 
                            </p>
                            <Link
                                href="/docs/categories-groups"
                                className="inline-flex items-center text-green hover:text-green-dark underline text-xs md:text-sm"
                            >
                                Learn about recommended Categories & Groups
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
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Assign Every Penny</h3>
                            <p className="text-white/70 text-sm md:text-base mb-3 md:mb-4">
                                Allocate your entire income to categories until you reach zero. Remember: Income minus expenses should equal zero.
                            </p>
                            <Link
                                href="/docs/zero-based-budgeting"
                                className="inline-flex items-center text-green hover:text-green-dark underline text-xs md:text-sm"
                            >
                                Learn Zero-Based Budgeting
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
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Start Tracking</h3>
                            <p className="text-white/70 text-sm md:text-base mb-3 md:mb-4">
                                Begin recording your transactions and assign them to your budget categories. Monitor your progress throughout the month.
                            </p>
                            <Link
                                href="/budget"
                                className="inline-flex items-center px-3 py-2 md:px-4 bg-green/20 text-green rounded-lg hover:bg-green/30 transition-all text-xs md:text-sm"
                            >
                                Go to Budget
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-2 md:w-4 md:h-4">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">💡 First Budget Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Your first budget won't be perfect - adjust as you learn your spending patterns</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Include a "miscellaneous" category for unexpected small expenses</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Budget for fun money - being too restrictive can lead to budget failure</span>
                    </li>
                </ul>
            </div>

            {/* Future planning */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-blue">Plan for Future Months</h2>
                <p className="text-white/70 text-sm md:text-base mb-4">
                    <strong>We highly recommend budgeting for next month and beyond.</strong> Future planning is one of the most powerful ways to take control of your finances and reduce stress.
                </p>
                <div className="space-y-3 md:space-y-4">
                    <div>
                        <h4 className="font-semibold text-blue mb-2">Why Budget for Future Months?</h4>
                        <ul className="space-y-2 text-sm md:text-base text-white/70">
                            <li className="flex items-start gap-2 md:gap-3">
                                <div className="w-2 h-2 bg-blue rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                                <span><strong>Reduce financial stress:</strong> Know exactly where your money will go before the month starts</span>
                            </li>
                            <li className="flex items-start gap-2 md:gap-3">
                                <div className="w-2 h-2 bg-blue rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                                <span><strong>Plan for irregular expenses:</strong> Christmas gifts, car maintenance, annual subscriptions</span>
                            </li>
                            <li className="flex items-start gap-2 md:gap-3">
                                <div className="w-2 h-2 bg-blue rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                                <span><strong>Make better financial decisions:</strong> See the bigger picture of your financial goals</span>
                            </li>
                            <li className="flex items-start gap-2 md:gap-3">
                                <div className="w-2 h-2 bg-blue rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                                <span><strong>Build savings momentum:</strong> Plan exactly how much you'll save each month</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-blue mb-2">How to Plan Ahead</h4>
                        <p className="text-sm md:text-base text-white/70 mb-2">
                            Once you complete your first month's budget, immediately start planning next month. Look at your calendar and identify any special expenses, then adjust your categories accordingly.
                        </p>
                        <p className="text-sm md:text-base text-white/70">
                            <strong>Pro tip:</strong> Set aside time at the end of each month to plan the next month's budget. This 15-minute habit will transform your financial life.
                        </p>
                    </div>
                </div>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Next Steps</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Now that you have your first budget, here's what to do next:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/docs/transactions" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Track Transactions</h4>
                            <p className="text-xs md:text-sm text-white/60">Learn how to record your spending</p>
                        </div>
                    </Link>
                    <Link href="/docs/budget-management" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Budget Management</h4>
                            <p className="text-xs md:text-sm text-white/60">Advanced budgeting techniques</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
