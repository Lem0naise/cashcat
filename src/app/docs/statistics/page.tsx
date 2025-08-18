import Link from 'next/link';

export const metadata = {
  title: 'Statistics & Analytics - CashCat Docs',
  description: 'Learn how to use CashCat\'s interactive charts and analytics features to analyze your financial data.',
};

export default function Statistics() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Statistics & Analytics</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Understand your financial patterns with CashCat's interactive charts and analytics. Explore your data with powerful filtering and comparison tools.
                </p>
            </div>

            {/* Available charts */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Interactive Charts</h2>
                
                <Link href="/docs/statistics/balance-trends" className="block group">
                    <div className="p-4 md:p-6 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                        <h3 className="text-lg md:text-xl font-semibold text-green group-hover:text-green-dark mb-2 md:mb-3">Account Balance Trends</h3>
                        <p className="text-white/70 text-sm md:text-base mb-3">
                            Track how your account balance changes over time with an interactive line chart. 
                            Drag to compare time periods and see the impact of your financial decisions.
                        </p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Interactive period comparison</li>
                            <li>• Goal progress tracking</li>
                            <li>• Hover for detailed analysis</li>
                            <li>• Complete financial timeline</li>
                        </ul>
                    </div>
                </Link>

                <Link href="/docs/statistics/spending-activity" className="block group">
                    <div className="p-4 md:p-6 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                        <h3 className="text-lg md:text-xl font-semibold text-green group-hover:text-green-dark mb-2 md:mb-3">Income vs Spending Activity</h3>
                        <p className="text-white/70 text-sm md:text-base mb-3">
                            Visualize your daily financial activity with segmented bar charts. See exactly where 
                            your money comes from and where it goes, broken down by categories and vendors.
                        </p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Segmented spending breakdown</li>
                            <li>• Interactive hover details</li>
                            <li>• Smart category grouping</li>
                            <li>• Vendor-level analysis</li>
                        </ul>
                    </div>
                </Link>

                <Link href="/docs/statistics/spending-breakdown" className="block group">
                    <div className="p-4 md:p-6 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                        <h3 className="text-lg md:text-xl font-semibold text-green group-hover:text-green-dark mb-2 md:mb-3">Spending Breakdown</h3>
                        <p className="text-white/70 text-sm md:text-base mb-3">
                            Explore your spending patterns with smart pie charts that automatically adapt their 
                            breakdown based on your selections. Click segments to drill down for deeper insights.
                        </p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Smart drill-down navigation</li>
                            <li>• Automatic mode switching</li>
                            <li>• Responsive design</li>
                            <li>• Percentage breakdowns</li>
                        </ul>
                    </div>
                </Link>
            </div>

            {/* Interactive features */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Powerful Interactive Features</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Drag-to-Compare Analysis</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Select any time period on your balance chart by clicking and dragging. Instantly see 
                        detailed comparisons including percentage changes, category breakdowns, and goal progress.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Smart Filtering System</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Filter by category groups or specific categories to focus your analysis. Charts automatically 
                        adapt to show the most relevant breakdown while maintaining accurate balance calculations.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Hover for Details</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Hover over any chart element for instant detailed information. See segment breakdowns, 
                        exact amounts, percentages, and vendor details without clicking or navigating away.
                    </p>
                </div>
            </div>

            {/* Time range options */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Flexible Time Analysis</h2>
                
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">⚡ Quick Time Ranges</h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• <strong>7 Days:</strong> Recent activity patterns</li>
                            <li>• <strong>30 Days:</strong> Monthly spending habits</li>
                            <li>• <strong>3 Months:</strong> Quarterly trends</li>
                            <li>• <strong>12 Months:</strong> Annual overview</li>
                            <li>• <strong>All Time:</strong> Complete financial history</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">📅 Smart Periods</h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• <strong>Month to Date:</strong> Current month progress</li>
                            <li>• <strong>Year to Date:</strong> Current year progress</li>
                            <li>• <strong>Custom Range:</strong> Any specific date range</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Analysis insights */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">What You Can Discover</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Spending Pattern Analysis</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Identify where your money actually goes versus where you think it goes. Find unexpected 
                        spending patterns and discover opportunities to optimize your budget.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Goal Progress Monitoring</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Track your progress toward spending goals with visual indicators. See whether you're getting 
                        closer to or further from your targets over time.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Financial Trend Identification</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Spot seasonal patterns, gradual improvements, or concerning trends in your financial behavior. 
                        Use this insight to make proactive budget adjustments.
                    </p>
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">💡 Analytics Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Start with the pie chart to understand your overall spending distribution</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use the balance trends chart to see the long-term impact of your spending habits</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Drag-select different time periods to measure the success of budget changes</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use filters to drill down into problem areas and find specific improvement opportunities</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Compare similar time periods across different months or years to track progress</span>
                    </li>
                </ul>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Start Analyzing Your Data</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Ready to dive into your financial analytics?
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/budget/stats" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Explore Statistics</h4>
                            <p className="text-xs md:text-sm text-white/60">Start analyzing your financial data</p>
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
