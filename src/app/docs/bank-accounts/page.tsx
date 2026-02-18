import Link from 'next/link';

export const metadata = {
    title: 'Bank Accounts - CashCat Docs',
    description: 'Learn how to set up and manage bank accounts in CashCat.',
};

export default function BankAccounts() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Bank Accounts</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Learn how to add and manage your bank accounts in CashCat. Track multiple accounts to get a complete picture of your finances.
                </p>
            </div>

            {/* Account types */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Account Types</h2>
                <p className="text-white/70 text-sm md:text-base mb-3">
                    The names of these accounts can vary depending on which country you live in. For the purpose of the documentation, we are using UK terminology. For US residents, a 'current' account is a 'checking' account.
                </p>
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Current Accounts</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Your primary spending account where most transactions occur. This includes debit card purchases,
                        bill payments, and direct credits.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1">
                        <li>• Daily spending and bill payments</li>
                        <li>• Direct credit from employers</li>
                        <li>• ATM withdrawals</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Savings Accounts</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Accounts for building your emergency fund, saving for goals, or earning interest on money
                        you don't need immediate access to.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1">
                        <li>• Emergency fund storage</li>
                        <li>• Goal-specific savings</li>
                        <li>• High-yield savings accounts</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Credit Cards</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Track credit card spending and balances. Remember that credit card purchases should still
                        come from your budgeted categories. We do not encourage using credit you cannot pay back.
                    </p>
                </div>
            </div>

            {/* Adding accounts */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Adding Accounts</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <div className="flex items-start gap-3 md:gap-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-green text-black rounded-full flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
                            1
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Navigate to Account Settings</h3>
                            <p className="text-white/70 text-sm md:text-base">
                                Go to the Transactions page and look for the "All Accounts" button at the top-left to start adding your bank accounts.
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
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Enter Account Details</h3>
                            <p className="text-white/70 text-sm md:text-base">
                                Provide a name for your account (like "HSBC Current" or "Lloyds Savings") and enter the current balance that you can check in your bank's app.
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
                            <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Select Account Type</h3>
                            <p className="text-white/70 text-sm md:text-base">
                                Choose whether this is a current, savings, or credit card account. This helps with organization and reporting.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Best practices */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">Account Management Tips</h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Use descriptive names that help you identify accounts quickly</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Regularly compare the account balances in CashCat for accurate budget tracking</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Include all accounts you regularly use for spending or saving</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Consider separate savings accounts for different goals</span>
                    </li>
                </ul>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Next Steps</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    With your accounts set up, you're ready to start budgeting:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/docs/first-budget" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Create Your First Budget</h4>
                            <p className="text-xs md:text-sm text-white/60">Set up budget categories and allocations</p>
                        </div>
                    </Link>
                    <Link href="/account" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Manage Accounts</h4>
                            <p className="text-xs md:text-sm text-white/60">Add or edit your bank accounts</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
