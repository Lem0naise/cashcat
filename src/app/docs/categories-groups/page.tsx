import Link from 'next/link';

export const metadata = {
    title: 'Categories & Groups - CashCat Docs',
    description: 'Learn how to organize your budget with categories and groups in CashCat.',
};

export default function CategoriesGroups() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Categories & Groups</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Organize your budget effectively with categories and groups. Learn how to structure your spending plan for maximum clarity and control.
                </p>
            </div>

            {/* Understanding categories */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Understanding Categories</h2>

                <div className="p-4 md:p-6 left-envelope-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">What are Categories?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Categories are specific spending buckets where you allocate money for different purposes.
                        Examples include "Groceries," "Fuel," "Netflix," or "Emergency Fund."
                    </p>
                    <p className="text-white/60 text-sm">
                        Each category gets a very specific amount that you can spend during the month.
                    </p>
                </div>

                <div className="p-4 md:p-6 left-envelope-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">What are Groups?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Groups are collections of related categories that help you organize your budget.
                        For example, a "Housing" group might contain categories like "Rent," "Utilities," and "Internet."
                        A "Food" group might contain categories like "Groceries," "Dining Out," and "Takeaways."
                    </p>
                    <p className="text-white/60 text-sm">
                        Groups make it easier to see spending patterns and manage related expenses together.
                    </p>
                </div>
            </div>

            {/* Common group examples */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Common Budget Groups</h2>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            <span>House</span>
                        </h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• Rent</li>
                            <li>• Utilities</li>
                            <li>• Maintenance</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M7 22V18" /><path d="M17 22V18" /></svg>
                            <span>Transport</span>
                        </h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• Fuel</li>
                            <li>• Maintenance</li>
                            <li>• Public Transit</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                            <span>Shopping</span>
                        </h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• Essential Purchases</li>
                            <li>• Impulse Buy</li>
                            <li>• Charity Shops</li>
                            <li>• Clothes</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><title>food-apple</title><path d="M20,10C22,13 17,22 15,22C13,22 13,21 12,21C11,21 11,22 9,22C7,22 2,13 4,10C6,7 9,7 11,8V5C5.38,8.07 4.11,3.78 4.11,3.78C4.11,3.78 6.77,0.19 11,5V3H13V8C15,7 18,7 20,10Z" /></svg>
                            <span>Food</span>
                        </h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• Groceries</li>
                            <li>• Restaurants</li>
                            <li>• Lunch / Coffee</li>
                            <li>• Takeaways</li>
                        </ul>
                    </div>

                    <div className="p-4 md:p-6 glass-card rounded-lg">
                        <h3 className="text-lg font-semibold text-green mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                            <span>Savings & Debt</span>
                        </h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• Emergency Fund</li>
                            <li>• General Savings</li>
                            <li>• Student Loans</li>
                            <li>• Summer Holiday Plans</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Best practices */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Best Practices</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Start Simple</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        Begin with broad categories and add detail as needed. It's easier to create more detailed and niche categories
                        later than to track overly specific ones from the start.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Use Clear Names</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        Choose category and group names that are immediately clear to you. "Subscriptions" is better than
                        "Monthly Stuff" because you'll know exactly what belongs there. "Netflix" is even better.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Include Irregular Expenses</h3>
                    <p className="text-white/70 text-sm md:text-base">
                        Create categories for expenses that don't happen every month, like car maintenance,
                        gifts, or annual subscriptions. Budget a small amount each month to prepare. This is <strong>vital</strong> to good budgeting habits, and is a key part of zero-based budgeting.
                    </p>
                </div>
            </div>

            {/* Tips section */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4 flex items-center gap-3">
                    <svg className="w-5 h-5 text-green flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z" /></svg>
                    <span>Organization Tips</span>
                </h3>
                <ul className="space-y-2 md:space-y-3 text-white/70 text-sm md:text-base">
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Limit yourself to 15-20 categories total to keep things manageable</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Create a "Miscellaneous" category for small, unexpected expenses</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>Group similar categories together for easier budget management</span>
                    </li>
                    <li className="flex items-start gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 md:mt-2 flex-shrink-0"></div>
                        <span>You can review and adjust your category structure after a few months if you find it isn't working</span>
                    </li>
                </ul>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Ready to Organize?</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Now that you understand categories and groups, start building your budget:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/docs/first-budget" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Create Your First Budget</h4>
                            <p className="text-xs md:text-sm text-white/60">Set up your categories and groups</p>
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
