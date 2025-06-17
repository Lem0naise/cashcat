import Link from 'next/link';

export const metadata = {
  title: 'Common Questions - CashCat Docs',
  description: 'Frequently asked questions about using CashCat for budgeting and financial management.',
};

export default function CommonQuestions() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Common Questions</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Find answers to frequently asked questions from CashCat users. Get help with common concerns and learn how to make the most of your budgeting experience.
                </p>
            </div>

            {/* Getting started questions */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Getting Started</h2>
                
                <div className="p-4 md:p-6 left-envelope-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">How much money should I budget for each category?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Start by looking at your last 2-3 months of spending to see where your money actually goes. 
                        Use these amounts as your initial budget, then adjust based on your goals and priorities.
                    </p>
                    <p className="text-white/60 text-sm">
                        Common guidelines: Housing 30%, Transportation 15%, Food 12%, but adjust based on your actual needs.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">What if I don't have much money to budget?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Budgeting is even more important when money is tight! Start by tracking where every dollar goes, 
                        then look for small areas to cut back. Even budgeting $50 is better than not budgeting at all.
                    </p>
                    <p className="text-white/60 text-sm">
                        Focus on covering necessities first, then allocate any remaining money to your most important goals.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Do I need to track every single purchase?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Yes, for the best results. Small purchases add up quickly and can derail your budget. 
                        However, if tracking every expense feels overwhelming, start with purchases over £5 or £10.
                    </p>
                    <p className="text-white/60 text-sm">
                        The more accurately you track, the better insights you'll have about your spending patterns.
                    </p>
                </div>
            </div>

            {/* Budgeting questions */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Budgeting Process</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">What happens if I overspend in a category?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Don't panic! Move money from another category to cover the overspending. The key is keeping 
                        your total budget balanced. This flexibility is what makes budgeting sustainable.
                    </p>
                    <p className="text-white/60 text-sm">
                        If you consistently overspend in a category, consider increasing that category's budget next month.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">How often should I update my budget?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Review your budget monthly and make adjustments based on what you learned. 
                        For daily management, check your category balances weekly to stay on track.
                    </p>
                    <p className="text-white/60 text-sm">
                        Your budget should evolve as your life changes - job changes, moving, new goals, etc.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Should I budget money that I'm saving?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Absolutely! Savings goals should be treated as expenses in your budget. This includes 
                        emergency funds, retirement contributions, and saving for specific goals like vacations.
                    </p>
                    <p className="text-white/60 text-sm">
                        In zero-based budgeting, every penny gets assigned a job - including the job of growing your savings.
                    </p>
                </div>
            </div>

            {/* Technical questions */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Using CashCat</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Can I connect my bank accounts automatically?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Currently, CashCat requires manual transaction entry. 
                        This also helps you stay more aware of your spending by actively recording each transaction. We are considering adding bank account integration in the future.
                    </p>
                    <p className="text-white/60 text-sm">
                        Most users find that manual entry only takes a few minutes per day and provides better spending awareness.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">How do I handle shared expenses with roommates or partners?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        For shared expenses, record your portion in the appropriate category. For example, if you split 
                        a £50 dinner bill, record £25 in your "Dining Out" category.
                    </p>
                    <p className="text-white/60 text-sm">
                        You can also create specific categories for shared expenses if you prefer to track them separately.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">What about cash transactions?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        It depends. If you withdraw it after you started CashCat, you can either record it as a transaction whenever you withdraw cash from an ATM. 
                        Alternatively, when you spend the cash, you can record those purchases in their appropriate categories. It depends how commited you are to budgeting!
                    </p>
                    
                </div>
            </div>

            {/* Troubleshooting questions */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Common Challenges</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">I keep forgetting to track my purchases. What can I do?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Try setting a phone reminder every evening to check your bank app.
                        You can also try your best to get into the habit of recording transactions immediately after making them, while you're still at the shop.
                    </p>
                    <p className="text-white/60 text-sm">
                        CashCat works best when you enter transactions quickly - as it relies on you being able to see how much you have left in each category.
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">My income varies each month. How do I budget?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Budget based on your lowest expected monthly income. Use higher-income months to build up 
                        buffers and save for leaner periods. Consider this an "income smoothing" strategy.
                    </p>
                    <p className="text-white/60 text-sm">
                        You might also create separate budgets for different income scenarios (low, medium, high months).
                    </p>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Budgeting feels restrictive. How can I make it more enjoyable?</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Remember that budgeting gives you permission to spend, not restrictions. Include "fun money" 
                        in your budget so you can spend guilt-free. Focus on funding your values and priorities.
                    </p>
                    <p className="text-white/60 text-sm">
                        Think of your budget as a tool for achieving your dreams, not a limitation on your life.
                    </p>
                </div>
            </div>

            {/* Need more help */}
            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">Still Have Questions?</h3>
                <p className="text-white/70 text-sm md:text-base mb-4">
                    If you can't find the answer you're looking for, these resources might help:
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                    <Link href="/docs/troubleshooting" className="text-green hover:text-green-dark underline text-sm">
                        Check the Troubleshooting Guide
                    </Link>
                    <Link href="/about" className="text-green hover:text-green-dark underline text-sm">
                        Contact Support
                    </Link>
                </div>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Ready to Continue?</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Got your questions answered? Here's what to do next:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/docs/best-practices" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Best Practices</h4>
                            <p className="text-xs md:text-sm text-white/60">Learn proven budgeting strategies</p>
                        </div>
                    </Link>
                    <Link href="/budget" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Start Budgeting</h4>
                            <p className="text-xs md:text-sm text-white/60">Put your knowledge into practice</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
