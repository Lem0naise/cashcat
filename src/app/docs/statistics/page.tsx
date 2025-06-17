import Link from 'next/link';

export const metadata = {
  title: 'Statistics & Reports - CashCat Docs',
  description: 'Learn how to use CashCat\'s statistics and reporting features to analyze your finances.',
};

export default function Statistics() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Statistics & Reports</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Understand your financial patterns with CashCat's powerful statistics and reporting features. Turn your data into actionable insights.
                </p>
            </div>

            {/* Available reports */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Available Reports</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">📊 Spending by Category</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        See how much you spend in each budget category over time. Identify your biggest expenses 
                        and spot trends in your spending patterns.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1">
                        <li>• Monthly category breakdowns</li>
                        <li>• Year-over-year comparisons</li>
                        <li>• Percentage of total spending</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">📈 Budget vs. Actual</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Compare what you planned to spend with what you actually spent. This report helps you 
                        understand how realistic your budget is and where adjustments are needed.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1">
                        <li>• Budget accuracy tracking</li>
                        <li>• Overspending alerts</li>
                        <li>• Underspending opportunities</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">💰 Income vs. Expenses</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Track your overall financial health by comparing total income to total expenses. 
                        See if you're living within your means and building wealth over time.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1">
                        <li>• Monthly surplus/deficit</li>
                        <li>• Savings rate tracking</li>
                        <li>• Financial trajectory</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">🏦 Account Balances</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Monitor how your account balances change over time. Track your net worth growth 
                        and see the impact of your budgeting efforts.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1">
                        <li>• Account balance trends</li>
                        <li>• Net worth calculations</li>
                        <li>• Debt reduction progress</li>
                    </ul>
                </div>
            </div>

            {/* Using statistics */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">How to Use Statistics</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Identify Spending Patterns</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Look for recurring overspending in certain categories. If you consistently spend more on 
                        dining out than budgeted, consider increasing that category's budget or finding ways to reduce spending.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Seasonal Adjustments</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Use historical data to predict seasonal expenses. If utilities spike in summer, 
                        you can budget more for those months and less during milder weather.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Goal Progress Tracking</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Monitor your progress toward financial goals. Are you saving enough for your emergency fund? 
                        Is your debt reduction on track? Statistics help answer these questions.
                    </p>
                </div>
            </div>

            {/* Key metrics */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Key Metrics to Watch</h2>
                
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">📱 Savings Rate</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Percentage of income saved each month
                        </p>
                        <div className="bg-green/10 p-2 rounded text-green text-sm font-medium">
                            Target: 20% or higher
                        </div>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">🎯 Budget Accuracy</h3>
                        <p className="text-white/70 text-sm mb-2">
                            How close actual spending is to planned spending
                        </p>
                        <div className="bg-green/10 p-2 rounded text-green text-sm font-medium">
                            Target: Within 5-10% of budget
                        </div>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">🏠 Housing Ratio</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Percentage of income spent on housing
                        </p>
                        <div className="bg-green/10 p-2 rounded text-green text-sm font-medium">
                            Target: 30% or less
                        </div>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">💳 Debt-to-Income</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Monthly debt payments vs. monthly income
                        </p>
                        <div className="bg-green/10 p-2 rounded text-green text-sm font-medium">
                            Target: 20% or less
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">💡 Statistics Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Review statistics monthly to identify trends and make budget adjustments</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Look for gradual improvements rather than perfection - small changes compound</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use year-over-year comparisons to see long-term financial progress</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Focus on controllable metrics - you can't control income volatility, but you can control spending</span>
                    </li>
                </ul>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Analyze Your Data</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Start exploring your financial statistics:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/stats" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">View Statistics</h4>
                            <p className="text-xs md:text-sm text-white/60">Explore your financial data and reports</p>
                        </div>
                    </Link>
                    <Link href="/docs/budget-management" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Budget Management</h4>
                            <p className="text-xs md:text-sm text-white/60">Use insights to improve your budget</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
