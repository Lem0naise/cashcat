import Link from 'next/link';

export const metadata = {
  title: 'Zero-Based Budgeting - CashCat Docs',
  description: 'Understanding the zero-based budgeting methodology used in CashCat.',
};

export default function ZeroBasedBudgeting() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Zero-Based Budgeting</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Learn about the zero-based budgeting philosophy that powers CashCat. Give every penny a purpose and say goodbye to guesswork. Budget with the money you <strong>have</strong>, not <strong>estimates</strong> of how much you might have.
                </p>
            </div>

            {/* Core concept */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-semibold text-green mb-3 md:mb-4">The Zero-Based Formula</h2>
                <div className="text-center p-4 bg-green/10 rounded-lg mb-4">
                    <p className="text-lg md:text-xl font-mono text-green">
                        Income - Expenses = Zero
                    </p>
                </div>
                <p className="text-white/70 text-sm md:text-base">
                    In zero-based budgeting, every penny of your income should be assigned to a specific category before the month begins. 
                    This <strong>doesn't mean you spend everything</strong> - savings, emergency funds and debt payments are also categories that receive assignments.
                </p>
            </div>

            {/* Principles */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Core Principles</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Every Penny Has a Purpose</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        Before the month begins, assign every penny to a specific category. Whether it's rent, bills, groceries, emergency fund, entertainment or savings - every penny should know where it's going. This way, you know exactly where all of your money lives and what it is for.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Proactive Planning</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        Make spending decisions before you're in the shop or online checkout. When you've already 
                        allocated money for dining out, you can spend guilt-free within that limit.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Savings <strong>is</strong> a Category</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        Savings goals, emergency funds, and investments are treated as expenses in your budget. 
                        Pay yourself first by budgeting for these important financial goals as a priority. Once your emergency fund is set up, you can start putting your money into savings. Once you're happy with your savings, you can then start giving money to your fun categories!.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">What If I Overspend?</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        If you overspend in one category, move money from another category to cover it. Overspending is not a disaster! You have flexibility in your budget.
                        The total budget remains balanced, but you can adjust as life happens.
                    </p>
                </div>
            </div>

            {/* Benefits */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">Why Zero-Based Budgeting Works</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Eliminates mystery spending - you know exactly where your money goes</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Forces you to prioritize what's truly important to you</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Makes savings an instinct rather than hoping money is left over</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Reduces financial stress through intentional planning</span>
                    </li>
                </ul>
            </div>

            {/* Getting started */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Ready to Start?</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Put zero-based budgeting into practice with CashCat:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/docs/first-budget" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Create Your First Budget</h4>
                            <p className="text-xs md:text-sm text-white/60">Step-by-step budget creation guide</p>
                        </div>
                    </Link>
                    <Link href="/budget" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Start Budgeting</h4>
                            <p className="text-xs md:text-sm text-white/60">Go to the budget interface</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
