import Link from 'next/link';
import SpendingActivityDemo from '../components/SpendingActivityDemo';

export const metadata = {
  title: 'Spending Activity Analysis - CashCat Docs',
  description: 'Learn how to analyze your income vs spending patterns with interactive segmented bar charts in CashCat.',
};

export default function SpendingActivity() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Spending Activity Analysis</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Visualize your daily financial activity with interactive bar charts that show exactly where your money comes from and where it goes.
                </p>
            </div>


            {/* Interactive Features */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Interactive Segment Analysis</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">🎯 Hover for Detailed Breakdowns</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Move your mouse over any colored segment within a bar to see detailed information:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• <strong>Segment name:</strong> The specific category, vendor, or group</li>
                        <li>• <strong>Amount:</strong> How much was spent/earned in that segment</li>
                        <li>• <strong>Percentage:</strong> What portion of the total bar this represents</li>
                        <li>• <strong>Date context:</strong> Which day or period this data covers</li>
                    </ul>
                    <div className="bg-green/10 p-2 rounded text-green text-sm font-medium">
                        Try it: Hover over different colored segments to explore your spending patterns
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">📊 Smart Segmentation</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        The chart automatically chooses the best way to break down your spending based on your current filters:
                    </p>
                    <ul className="text-white/60 text-sm space-y-2 mb-3">
                        <li>• <strong>No filters:</strong> Shows spending by category groups (Food, Transport, Bills, etc.)</li>
                        <li>• <strong>Group selected:</strong> Shows individual categories within that group</li>
                        <li>• <strong>Categories selected:</strong> Shows individual vendors within those categories</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">📍 Persistent Details Panel</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        When you hover over a segment, a detailed information panel appears below the chart and stays 
                        visible until you close it. This lets you:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• Study the breakdown without keeping your mouse perfectly positioned</li>
                        <li>• Compare different segments by switching between them</li>
                        <li>• See sub-breakdowns (like vendors within a category)</li>
                    </ul>
                </div>
            </div>

            {/* Understanding Segments */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Understanding Your Segments</h2>
                
                <div className="grid gap-4">
                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">🏷️ By Category Groups</h3>
                        <p className="text-white/70 text-sm mb-2">When no filters are applied, see high-level spending areas:</p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Food & Dining</li>
                            <li>• Transportation</li>
                            <li>• Housing & Utilities</li>
                            <li>• Entertainment</li>
                            <li>• And more...</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">📂 By Categories</h3>
                        <p className="text-white/70 text-sm mb-2">When you filter by a group, see specific budget categories:</p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Groceries vs Restaurant spending</li>
                            <li>• Gas vs Public Transport</li>
                            <li>• Rent vs Utilities</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">🏪 By Vendors</h3>
                        <p className="text-white/70 text-sm mb-2">When you filter by categories, see individual merchants:</p>
                        <ul className="text-white/60 text-sm space-y-1">
                            <li>• Which grocery stores you use most</li>
                            <li>• Your most frequent restaurants</li>
                            <li>• Subscription services and their costs</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Reading Patterns */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Spotting Financial Patterns</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">📈 Healthy Patterns to Look For</h3>
                    <ul className="text-white/70 text-sm space-y-2">
                        <li>• <strong>Consistent income bars:</strong> Regular purple bars of similar height</li>
                        <li>• <strong>Controlled spending:</strong> Red bars generally smaller than purple ones</li>
                        <li>• <strong>Balanced segments:</strong> No single category dominating your spending</li>
                        <li>• <strong>Predictable patterns:</strong> Similar spending distribution from month to month</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-orange-400 mb-2 md:mb-3">⚠️ Warning Signs to Watch</h3>
                    <ul className="text-white/70 text-sm space-y-2">
                        <li>• <strong>Red bars exceeding purple:</strong> Spending more than you earn</li>
                        <li>• <strong>Huge single segments:</strong> One category taking up most of your spending</li>
                        <li>• <strong>Irregular patterns:</strong> Wild swings that are hard to predict</li>
                        <li>• <strong>Missing income bars:</strong> Gaps in regular income sources</li>
                    </ul>
                </div>
            </div>

            {/* Filtering Impact */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">How Filtering Changes Your View</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">🔍 Focused Analysis</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        When you apply category or group filters, the spending activity chart recalculates to show only 
                        the transactions that match your selection. This gives you a focused view of specific spending areas.
                    </p>
                    <div className="bg-blue/10 p-3 rounded border-l-4 border-blue text-blue text-sm">
                        <strong>Example:</strong> Filter by "Food" group to see only your dining and grocery spending. 
                        The bars will be smaller and show just food-related categories and vendors.
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">📊 Dynamic Segmentation</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        The chart's segmentation automatically adapts to provide the most useful breakdown:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1">
                        <li>• Start with no filters to see your overall spending distribution</li>
                        <li>• Add a group filter to drill down into specific spending areas</li>
                        <li>• Select individual categories to see vendor-level detail</li>
                    </ul>
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">💡 Spending Activity Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Look for days where red bars are unusually large to identify big spending events</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use vendor-level segmentation to find opportunities to consolidate spending</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Compare weekdays vs weekends to understand your different spending patterns</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Hover over segments you don't recognize to identify unusual or one-off expenses</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use longer time ranges to spot seasonal patterns in your income and spending</span>
                    </li>
                </ul>
            </div>

            {/* Interactive Demo */}
            <div className="mb-8 md:mb-12">
                <SpendingActivityDemo />
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Explore More Analytics</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Continue analyzing your financial data:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-3">
                    <Link href="/docs/statistics/balance-trends" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Balance Trends</h4>
                            <p className="text-xs md:text-sm text-white/60">Track your account balance over time</p>
                        </div>
                    </Link>
                    <Link href="/docs/statistics/spending-breakdown" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Spending Breakdown</h4>
                            <p className="text-xs md:text-sm text-white/60">Pie chart analysis of spending</p>
                        </div>
                    </Link>
                    <Link href="/stats" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">View Statistics</h4>
                            <p className="text-xs md:text-sm text-white/60">Try these features yourself</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
