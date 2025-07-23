import Link from 'next/link';
import BalanceTrendsDemo from '../components/BalanceTrendsDemo';

export const metadata = {
  title: 'Account Balance Trends - CashCat Docs',
  description: 'Learn how to analyze your account balance trends and compare different time periods in CashCat.',
};

export default function BalanceTrends() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Account Balance Trends</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Track how your account balance changes over time and compare different periods to understand your financial progress.
                </p>
            </div>


            
            {/* Interactive Features */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Interactive Features</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Drag to Compare Periods</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Click and drag across any part of the chart to select a time period. You'll instantly see:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• Starting and ending balance for your selection</li>
                        <li>• Total change amount and percentage</li>
                        <li>• Number of days in the selected period</li>
                        <li>• Breakdown by individual categories (when filtered)</li>
                    </ul>
                    <div className="bg-green/10 p-2 rounded text-green text-sm font-medium">
                        Try it: Drag across different months to compare your financial performance
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Hover for Quick Info</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Move your mouse over any point on the line to see detailed information for that specific date, 
                        including your exact balance and recent changes.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Goal Progress Tracking</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        When you filter by categories that have spending goals, the chart transforms to show your 
                        distance from those goals over time:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• Positive values = getting closer to your goal</li>
                        <li>• Negative values = moving away from your goal</li>
                        <li>• Compare progress across multiple categories</li>
                    </ul>
                </div>
            </div>

            {/* Time Range Options */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Time Range Options</h2>
                
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">⚡ Quick Ranges</h3>
                        <ul className="text-white/70 text-sm space-y-2">
                            <li><strong>7 Days:</strong> Recent daily activity</li>
                            <li><strong>30 Days:</strong> Monthly trends</li>
                            <li><strong>3 Months:</strong> Quarterly patterns</li>
                            <li><strong>12 Months:</strong> Annual overview</li>
                            <li><strong>All Time:</strong> Complete history</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">Special Periods</h3>
                        <ul className="text-white/70 text-sm space-y-2">
                            <li><strong>Month to Date:</strong> Current month progress</li>
                            <li><strong>Year to Date:</strong> Current year progress</li>
                            <li><strong>Custom Range:</strong> Any specific period</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Filtering Features */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Smart Filtering</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Focus on What Matters</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Apply filters to analyze specific aspects of your finances while maintaining an accurate balance view:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• <strong>Category Groups:</strong> Focus on broad spending areas (Food, Transport, etc.)</li>
                        <li>• <strong>Specific Categories:</strong> Drill down to individual budget categories</li>
                        <li>• <strong>Goal Tracking:</strong> Monitor progress on categories with spending goals</li>
                    </ul>
                    <div className="bg-blue/10 p-3 rounded border-l-4 border-blue text-blue text-sm">
                        <strong>Important:</strong> Filtering affects the goal tracking view and comparison analysis, 
                        but your main balance line always shows the complete picture of your accounts.
                    </div>
                </div>
            </div>

            {/* Reading the Chart */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">How to Read Your Balance Trends</h2>
                
                <div className="grid gap-4">
                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">Upward Trends</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Rising lines indicate financial growth
                        </p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Income exceeding expenses</li>
                            <li>• Successful saving periods</li>
                            <li>• Debt reduction progress</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">Downward Trends</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Declining lines show money flowing out
                        </p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Expenses exceeding income</li>
                            <li>• Large purchases or investments</li>
                            <li>• Seasonal spending patterns</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">Flat Trends</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Steady lines show balanced periods
                        </p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Income matching expenses</li>
                            <li>• Consistent spending habits</li>
                            <li>• Stable financial periods</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">Balance Trends Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Compare the same periods across different years to see long-term progress</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use drag selection to measure the impact of specific financial decisions</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Look for patterns that repeat monthly or seasonally to predict future needs</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Set up spending goals on problem categories and track your improvement over time</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use the "All Time" view to see your complete financial journey and celebrate progress</span>
                    </li>
                </ul>
            </div>
            {/* Interactive Demo */}
            <div className="mb-8 md:mb-12">
                <BalanceTrendsDemo />
            </div>
            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Explore Your Financial Data</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Ready to dive deeper into your statistics?
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-3">
                    <Link href="/docs/statistics/spending-activity" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Spending Activity</h4>
                            <p className="text-xs md:text-sm text-white/60">See income vs spending patterns</p>
                        </div>
                    </Link>
                    <Link href="/docs/statistics/spending-breakdown" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Spending Breakdown</h4>
                            <p className="text-xs md:text-sm text-white/60">Analyze where your money goes</p>
                        </div>
                    </Link>
                    <Link href="/stats" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">View Statistics</h4>
                            <p className="text-xs md:text-sm text-white/60">Start exploring your data</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
