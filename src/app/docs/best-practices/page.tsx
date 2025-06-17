import Link from 'next/link';

export const metadata = {
  title: 'Best Practices - CashCat Docs',
  description: 'Learn budgeting best practices and tips for success with CashCat.',
};

export default function BestPractices() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Best Practices</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Master the art of budgeting with proven strategies and best practices. Learn from common mistakes and build habits that lead to financial success.
                </p>
            </div>

            {/* Foundation practices */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Foundation Practices</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Start with Reality, Not Dreams</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Base your first budget on actual spending history, not what you wish you spent. 
                        Look at your last 2-3 months of expenses to create realistic category amounts. Don't lie to yourself - there is no need, CashCat is a low-judgment environment. This is for <strong>you</strong>.
                    </p>
                    <div className="bg-green/10 p-3 rounded-lg mt-3">
                        <p className="text-green text-sm font-medium">💡 It's better to budget £300 for dining out and stick to it than budget £200 and overspend</p>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Pay Yourself First</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Budget for savings and debt payments before discretionary spending. Treat these as 
                        non-negotiable expenses, just like rent or utilities.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mt-3">
                        <li>• Emergency fund: ideally 3-6 months of expenses</li>
                        <li>• Savings: At least 10-15% of income</li>
                        <li>• Debt payments if applicable: Minimum plus extra when possible</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Build in Flexibility</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Life happens. Include buffer categories for unexpected expenses and don't make your 
                        budget so tight that any deviation feels like failure.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mt-3">
                        <li>• Miscellaneous category: 5-10% of spending</li>
                        <li>• Fun money: Budget for guilt-free spending</li>
                        <li>• Sinking funds: Save monthly for irregular expenses</li>
                    </ul>
                </div>
            </div>

            {/* Behavioral practices */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Building Good Habits</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Track Spending Immediately</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Record transactions as soon as possible after making them. The longer you wait, 
                        the more details you'll forget and the less accurate your budget becomes.
                    </p>
                    <div className="bg-blue/10 p-3 rounded-lg mt-3">
                        <p className="text-blue text-sm font-medium">📱 Make it a habit to enter transactions while waiting in line, or walking out of the shop just after you tapped your card.</p>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Weekly Check-ins</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Schedule a weekly 15-minute budget review. Check your progress, catch any missed 
                        transactions, and make small adjustments before problems become big.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1 mt-3">
                        <li>• Review category balances</li>
                        <li>• Look for missing transactions</li>
                        <li>• Plan for upcoming expenses</li>
                        <li>• Celebrate wins and progress</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Use the Envelope Method</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Think of each budget category as an envelope with cash. When the envelope is empty, 
                        you're done spending in that category (or you need to move money from another envelope).
                    </p>
                </div>
            </div>

            {/* Common mistakes */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Avoid These Common Mistakes</h2>
                
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-red mb-3">❌ Making It Too Complicated</h3>
                        <p className="text-white/70 text-sm">
                            Starting with 50+ categories and complex rules. Keep it simple at first.
                        </p>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-red mb-3">❌ Forgetting Irregular Expenses</h3>
                        <p className="text-white/70 text-sm">
                            Not budgeting for car maintenance, gifts, or annual fees that derail your plan.
                        </p>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-red mb-3">❌ All-or-Nothing Thinking</h3>
                        <p className="text-white/70 text-sm">
                            Giving up entirely when you overspend instead of adjusting and continuing.
                        </p>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-red mb-3">❌ Ignoring Small Purchases</h3>
                        <p className="text-white/70 text-sm">
                            Thinking £5 purchases don't matter. They add up quickly.
                        </p>
                    </div>
                </div>
            </div>

            {/* Success indicators */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">🎯 Signs of Budgeting Success</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>You can make spending decisions without anxiety or guilt</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Your emergency fund is growing consistently</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>You're achieving financial goals on schedule</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Budgeting feels automatic, not burdensome</span>
                    </li>
                </ul>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Put It Into Practice</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Ready to implement these best practices?
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/budget" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Apply to Your Budget</h4>
                            <p className="text-xs md:text-sm text-white/60">Start implementing these strategies</p>
                        </div>
                    </Link>
                    <Link href="/docs/common-questions" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Common Questions</h4>
                            <p className="text-xs md:text-sm text-white/60">Get answers to frequent concerns</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
