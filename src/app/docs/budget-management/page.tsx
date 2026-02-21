import Link from 'next/link';

export const metadata = {
    title: 'Budget Management - CashCat Docs',
    description: 'Advanced techniques for managing and optimizing your budget in CashCat.',
};

export default function BudgetManagement() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Budget Management</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Master advanced budgeting techniques to optimize your financial plan. Learn how to adjust, refine, and perfect your budget over time.
                </p>
            </div>

            {/* Core management concepts */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Core Management Principles</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Budget Flexibility</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Your budget isn't set in stone. When you overspend in one category, move money from another
                        category to cover it. The key is keeping your total budget balanced. You don't need to feel guilty about adjusting your budget - as long as you try to stick to it while making purchases.
                    </p>

                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Monthly Reviews</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        At the end of each month, review your spending patterns. Look for categories where you
                        consistently over or underspend and adjust next month's budget accordingly. You should <strong>adjust goals over time as you learn your habits.</strong>
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Emergency Adjustments</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        When unexpected expenses arise, don't abandon your budget. Instead, temporarily adjust
                        other categories to accommodate the emergency while staying within your total income. This keeps you in control even when life inevitably throws curveballs at you.
                    </p>
                </div>
            </div>

            {/* Advanced techniques */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Key Techniques</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Sinking Funds</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Set aside small amounts each month for large, irregular expenses like car maintenance,
                        holiday gifts, or annual subscriptions. This prevents these expenses from derailing your budget.
                    </p>
                    <div className="bg-green/10 p-3 rounded-lg mt-3">
                        <p className="text-green text-sm font-medium">Example: Save £50/month for a £600 annual car insurance payment</p>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">The Buffer Category</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Create a "Buffer" or "Miscellaneous" category for small, unexpected expenses, whatever they could be. This prevents
                        minor overspending from throwing off your entire budget. You should always be prepared for anything.
                    </p>
                    <div className="bg-green/10 p-3 rounded-lg mt-3">
                        <p className="text-green text-sm font-medium">Suggested amount: 5-10% of your monthly spending</p>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Income Allocation Strategy</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Consider the 50/30/20 rule as a starting framework: 50% for needs, 30% for wants,
                        and 20% for savings and debt repayment. Adjust based on your specific situation.
                    </p>
                    <div className="grid gap-2 mt-3 text-sm">
                        <div className="flex justify-between bg-green/10 p-2 rounded">
                            <span className="text-white/70">Needs (Housing, Food, Transportation)</span>
                            <span className="text-green font-medium">≤50%</span>
                        </div>
                        <div className="flex justify-between bg-blue/10 p-2 rounded">
                            <span className="text-white/70">Wants (Entertainment, Dining Out)</span>
                            <span className="text-blue font-medium">≤30%</span>
                        </div>
                        <div className="flex justify-between bg-reddy/10 p-2 rounded">
                            <span className="text-white/70">Savings & Debt</span>
                            <span className="text-reddy font-medium">≥20%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Future budgeting */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Future Month Planning</h2>

                <div className="p-4 md:p-6 glass-card-blue rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-blue mb-2 md:mb-3">Why Plan Future Months</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        <strong>Future budgeting is highly recommended</strong> and is one of the most effective ways to gain financial control.
                        Planning 1-3 months ahead helps you anticipate expenses, reduce stress, and make better financial decisions.
                    </p>
                    <div className="bg-blue/10 p-3 rounded-lg mt-3">
                        <p className="text-blue text-sm font-medium">Best practice: Plan next month's budget during the last week of the current month</p>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Multi-Month Planning Strategy</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Look at your calendar 2-3 months ahead and identify upcoming expenses. This allows you to save gradually
                        rather than scrambling when large expenses arrive.
                    </p>
                    <ul className="space-y-2 text-sm md:text-base text-white/70 mt-3">
                        <li className="flex items-start gap-2 md:gap-3">
                            <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                            <span><strong>Seasonal expenses:</strong> Holiday gifts, summer vacation, back-to-school costs</span>
                        </li>
                        <li className="flex items-start gap-2 md:gap-3">
                            <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                            <span><strong>Annual bills:</strong> Insurance premiums, property taxes, subscription renewals</span>
                        </li>
                        <li className="flex items-start gap-2 md:gap-3">
                            <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                            <span><strong>Irregular income:</strong> Plan for months with lower or variable income</span>
                        </li>
                        <li className="flex items-start gap-2 md:gap-3">
                            <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                            <span><strong>Life events:</strong> Birthdays, anniversaries, planned home improvements</span>
                        </li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Monthly Planning Routine</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Establish a routine for planning future months. This 15-20 minute monthly habit will transform your financial confidence.
                    </p>
                    <div className="space-y-2 text-sm md:text-base text-white/70">
                        <div className="flex items-start gap-3">
                            <span className="bg-green text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                            <span>Review current month's spending patterns and adjust next month accordingly</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="bg-green text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                            <span>Check your calendar for upcoming events and special expenses</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="bg-green text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                            <span>Adjust category goals based on known changes in income or expenses</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="bg-green text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                            <span>Set savings targets for larger future goals or sinking funds</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Common challenges */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Common Challenges & Solutions</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Irregular Income</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        If your income varies month to month, budget based on your lowest expected monthly income.
                        Use higher-income months to build buffers and save for leaner periods. You'll thank yourself later when you find more than you expected in your savings category.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Overspending Patterns</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        If you consistently overspend in certain categories, either increase the budget for those
                        categories or find ways to reduce spending. Your budget should reflect reality, not wishful thinking. This is <strong>very important - don't routinely overspend.</strong>
                    </p>
                </div>

            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">Management Pro Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Schedule weekly budget check-ins to stay on track and make small adjustments</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Celebrate budget wins, even small ones - positive reinforcement builds habits</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use your spending history to predict and budget for seasonal expenses</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Don't let perfect be the enemy of good - an imperfect budget is better than no budget</span>
                    </li>
                </ul>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Take Action</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Apply these management techniques to your budget:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/budget" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Manage Your Budget</h4>
                            <p className="text-xs md:text-sm text-white/60">Apply these techniques to your current budget</p>
                        </div>
                    </Link>
                    <Link href="/docs/statistics" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">View Statistics</h4>
                            <p className="text-xs md:text-sm text-white/60">Analyze your spending patterns</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
