import Link from 'next/link';

export const metadata = {
    title: 'Transactions - CashCat Docs',
    description: 'Learn how to track and manage transactions in CashCat.',
};

export default function Transactions() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Transactions</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Learn how to effectively track your spending with transactions. Turn your budget plan into reality by recording every purchase and payment. CashCat encourages manual transaction tracking, as it helps with improving your budgeting mentality and keeps your money in your control. In the future, we may add an option for automatic bank integration for periodic transaction syncing.
                </p>
            </div>

            {/* What are transactions */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Understanding Transactions</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">What is a Transaction?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        A transaction is any money movement - whether it's spending money (like buying groceries) or
                        receiving money (like your paycheck). Each transaction should be assigned to a budget category.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Types of Transactions</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <h4 className="font-semibold text-green mb-2">Expenses (Outflow)</h4>
                            <ul className="text-white/70 text-sm space-y-1">
                                <li>• Shop purchases</li>
                                <li>• Bill payments</li>
                                <li>• Transfers to savings</li>
                                <li>• ATM withdrawals</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-green mb-2">Income (Inflow)</h4>
                            <ul className="text-white/70 text-sm space-y-1">
                                <li>• Salary / wages</li>
                                <li>• Freelance payments</li>
                                <li>• Investment returns</li>
                                <li>• Refunds</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recording transactions */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Recording Transactions</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            1
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Enter Transaction Details</h3>
                            <p className="text-white/70 text-sm md:text-base">
                                Record the amount, vendor, and date of your transaction. We recommend adding a description so
                                that you'll remember what it was for later.
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
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Select Account</h3>
                            <p className="text-white/70 text-sm md:text-base">
                                Choose which bank account or credit card was used for this transaction.
                                This keeps your account balances accurate.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            3
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Assign to Category</h3>
                            <p className="text-white/70 text-sm md:text-base">
                                Choose the budget category this transaction belongs to. This is how your
                                spending gets tracked against your budget plan.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction tips */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Smart Transaction Habits</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Record Transactions Quickly</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        Enter transactions as soon as possible after making them. The longer you wait,
                        the harder it becomes to remember details and categorize accurately. We recommend logging transactions immediately after making them if online or in-store purchases, and if that's not possible, in the evening of the same day.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Split Complex Transactions</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        If one purchase covers multiple categories (like buying groceries AND household items at Aldi),
                        split it into separate transactions for accurate category tracking.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Include Transfers</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        Record transfers between accounts (like moving money to savings) as transactions.
                        This keeps all your account balances accurate in CashCat. If the other account is also in CashCat, the inflow as a 'refund' will cancel out the 'outflow' and it won't affect your budget.
                    </p>
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">Transaction Tracking Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use consistent naming for similar transactions (e.g., always "Esso" not sometimes "That Corner Shop")</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Review transactions weekly to ensure everything is categorized correctly</span>
                    </li>
                </ul>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Start Tracking</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Ready to start recording your transactions?
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/budget/transactions" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Record Transactions</h4>
                            <p className="text-xs md:text-sm text-white/60">Go to the transactions page</p>
                        </div>
                    </Link>
                    <Link href="/docs/budget-management" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Budget Management</h4>
                            <p className="text-xs md:text-sm text-white/60">Learn advanced budgeting techniques</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
