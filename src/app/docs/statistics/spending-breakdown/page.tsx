import Link from 'next/link';
import SpendingBreakdownDemo from '../components/SpendingBreakdownDemo';

export const metadata = {
  title: 'Spending Breakdown Analysis - CashCat Docs',
  description: 'Learn how to analyze your spending patterns with interactive pie charts that adapt based on your selections in CashCat.',
};

export default function SpendingBreakdown() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Spending Breakdown Analysis</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Visualize where your money goes with smart pie charts that automatically adapt to show the most relevant breakdown of your spending.
                </p>
            </div>

            {/* Interactive Drill-Down */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Smart Drill-Down System</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">🔄 Automatic Mode Switching</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        The chart automatically chooses the most useful way to break down your spending based on your current selection:
                    </p>
                    <div className="space-y-3">
                        <div className="bg-green/10 p-3 rounded border-l-4 border-green">
                            <p className="text-green text-sm"><strong>Group Mode:</strong> No filters applied - shows broad spending categories (Food, Transport, etc.)</p>
                        </div>
                        <div className="bg-green/10 p-3 rounded border-l-4 border-green">
                            <p className="text-green text-sm"><strong>Category Mode:</strong> Group selected - shows specific budget categories within that group</p>
                        </div>
                        <div className="bg-green/10 p-3 rounded border-l-4 border-green">
                            <p className="text-green text-sm"><strong>Vendor Mode:</strong> Categories selected - shows individual merchants and stores</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">👆 Click to Navigate</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Click on any segment to automatically apply filters and drill down to the next level of detail:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• Click a group segment → See categories within that group</li>
                        <li>• Click a category segment → See vendors within that category</li>
                        <li>• Use the chart controls to clear filters and zoom back out</li>
                    </ul>
                    <div className="bg-green/10 p-2 rounded text-green text-sm font-medium">
                        Try it: Click on your largest spending segment to see what's inside
                    </div>
                </div>
            </div>

            {/* Hover Features */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Interactive Hover Analysis</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">🎯 Center Display</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        The center of the doughnut acts as an information hub:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• <strong>Default:</strong> Shows total spending amount and current breakdown mode</li>
                        <li>• <strong>On hover:</strong> Displays segment name, amount, and percentage of total</li>
                        <li>• <strong>Live updates:</strong> Changes instantly as you move between segments</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">✨ Visual Feedback</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Hover effects help you explore your data:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• Segments lift outward when hovered</li>
                        <li>• Cursor changes to indicate clickable segments</li>
                        <li>• Smooth animations guide your attention</li>
                    </ul>
                </div>
            </div>

            {/* Responsive Design */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Adaptive Display</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">📱 Screen Size Optimization</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        The chart adapts to your device and available space:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• <strong>Large screens:</strong> Shows segment labels directly on the chart</li>
                        <li>• <strong>Small screens:</strong> Hides labels to maximize chart size and clarity</li>
                        <li>• <strong>Dynamic sizing:</strong> Adjusts chart proportions based on container size</li>
                        <li>• <strong>Smart cutout:</strong> Center hole size adjusts for optimal readability</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">🏷️ Intelligent Labeling</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Labels appear only when they enhance understanding:
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mb-3">
                        <li>• Only segments representing 5% or more of spending get labels</li>
                        <li>• Font sizes scale with available space</li>
                        <li>• Labels position intelligently to avoid overlap</li>
                    </ul>
                </div>
            </div>

            {/* Understanding the Modes */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Understanding Each View Mode</h2>
                
                <div className="grid gap-4">
                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">📊 Group Mode (Starting View)</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Perfect for understanding your high-level spending distribution
                        </p>
                        <ul className="text-white/60 text-sm space-y-1 mb-3">
                            <li>• Food & Dining</li>
                            <li>• Transportation</li>
                            <li>• Housing & Bills</li>
                            <li>• Entertainment & Lifestyle</li>
                            <li>• Healthcare</li>
                        </ul>
                        <div className="text-white/50 text-xs">Use this to: Identify your biggest spending areas</div>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">📂 Category Mode (Drill-Down)</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Shows specific budget categories within a selected group
                        </p>
                        <ul className="text-white/60 text-sm space-y-1 mb-3">
                            <li>• Groceries vs Restaurant spending</li>
                            <li>• Gas vs Public Transport vs Parking</li>
                            <li>• Rent vs Utilities vs Internet</li>
                        </ul>
                        <div className="text-white/50 text-xs">Use this to: Compare related spending categories</div>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3">🏪 Vendor Mode (Detailed View)</h3>
                        <p className="text-white/70 text-sm mb-2">
                            Shows individual merchants and service providers
                        </p>
                        <ul className="text-white/60 text-sm space-y-1 mb-3">
                            <li>• Which grocery stores you prefer</li>
                            <li>• Your most frequent restaurants</li>
                            <li>• Subscription services and their costs</li>
                        </ul>
                        <div className="text-white/50 text-xs">Use this to: Find opportunities to consolidate or negotiate</div>
                    </div>
                </div>
            </div>

            {/* Analysis Tips */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">How to Analyze Your Breakdown</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">🔍 Look for Imbalances</h3>
                    <ul className="text-white/70 text-sm space-y-2">
                        <li>• <strong>Dominant segments:</strong> One category taking up 40%+ of spending might need attention</li>
                        <li>• <strong>Surprising segments:</strong> Categories larger than you expected indicate areas to review</li>
                        <li>• <strong>Tiny segments:</strong> Very small categories might be candidates for budget consolidation</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">📈 Track Changes Over Time</h3>
                    <ul className="text-white/70 text-sm space-y-2">
                        <li>• Compare the same time periods across different months or years</li>
                        <li>• Look for seasonal patterns (higher utilities in winter, travel in summer)</li>
                        <li>• Notice when new segments appear or existing ones change significantly</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">🎯 Use Different Time Ranges</h3>
                    <ul className="text-white/70 text-sm space-y-2">
                        <li>• <strong>Weekly view:</strong> Spot daily spending habits and weekend patterns</li>
                        <li>• <strong>Monthly view:</strong> See your typical spending distribution</li>
                        <li>• <strong>Quarterly/Yearly:</strong> Identify longer-term trends and seasonal changes</li>
                    </ul>
                </div>
            </div>

            {/* No Data States */}
            <div className="p-4 md:p-6 glass-card rounded-lg mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">When No Data Appears</h2>
                <p className="text-white/70 text-sm md:text-base mb-3">
                    If you see "No Spending Data" it means no payment transactions were found for your selected time 
                    period and filters. This could happen when:
                </p>
                <ul className="text-white/60 text-sm space-y-1 mb-3">
                    <li>• The selected time period has no transactions</li>
                    <li>• Current filters exclude all spending (only income exists)</li>
                    <li>• You're looking at a future date range</li>
                </ul>
                <div className="bg-blue/10 p-2 rounded text-blue text-sm">
                    Try adjusting your time range or clearing filters to see your data.
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">💡 Spending Breakdown Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Start with Group Mode to see your spending at a high level, then drill down into problem areas</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Click on your largest segment to understand what's driving your biggest expenses</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use Vendor Mode to identify opportunities to consolidate spending or find better deals</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Compare different time periods to spot trends and seasonal patterns in your spending</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Look for segments that are surprisingly large or small compared to your expectations</span>
                    </li>
                </ul>
            </div>

            {/* Interactive Demo */}
            <div className="mb-8 md:mb-12">
                <SpendingBreakdownDemo />
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Complete Your Analysis</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Explore all aspects of your financial data:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-3">
                    <Link href="/docs/statistics/balance-trends" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Balance Trends</h4>
                            <p className="text-xs md:text-sm text-white/60">See how your balance changes</p>
                        </div>
                    </Link>
                    <Link href="/docs/statistics/spending-activity" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Spending Activity</h4>
                            <p className="text-xs md:text-sm text-white/60">Daily income vs spending</p>
                        </div>
                    </Link>
                    <Link href="/budget/stats" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Try It Now</h4>
                            <p className="text-xs md:text-sm text-white/60">Explore your own data</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
