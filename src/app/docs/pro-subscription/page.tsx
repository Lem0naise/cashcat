import React from 'react';
import Link from 'next/link';

export const metadata = {
    title: 'CashCat Pro Subscription | CashCat Documentation',
    description: 'Learn about the CashCat Pro subscription, what is included, and how to upgrade to support independent development.',
};

export default function ProSubscriptionDocs() {
    return (
        <article className="prose prose-invert prose-green max-w-none font-[family-name:var(--font-suse)]">
            <h1 className="text-4xl font-black mb-6">CashCat Pro Subscription</h1>

            <p className="text-xl text-white/70 mb-8 leading-relaxed">
                CashCat is designed to be free and completely robust for everyday use. However, for power users who want more advanced tools and analytics (and who want to support the ongoing development of the app), we offer <strong>CashCat Pro</strong>.
            </p>

            <div className="bg-green/10 border border-green/20 rounded-xl p-6 mb-12">
                <h3 className="text-xl font-bold text-green mb-3 flex items-center gap-2 mt-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Why CashCat Pro?
                </h3>
                <p className="text-white/80 m-0">
                    CashCat doesn't sell your data, show you ads, or push sketchy financial products. The only way we keep the servers running and continue building new features is through direct support from users like you.
                </p>
                <div className="mt-4">
                    <Link href="https://pro.cashcat.app" className="inline-block bg-green text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-dark transition-colors no-underline">View Pricing via Storefront</Link>
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-4">What's in the Free Tier?</h2>
            <p className="mb-4 text-white/80">Every essential piece of our zero-based budgeting engine is completely free forever. This includes:</p>
            <ul className="mb-8 text-white/80 space-y-2">
                <li>Full zero-based budgeting (give every penny a job).</li>
                <li>Tracking across multiple accounts (checking, savings, credit cards).</li>
                <li>Budgeting for future months and rollovers.</li>
                <li>Basic income vs. spending analytics and net worth tracking.</li>
            </ul>

            <h2 className="text-2xl font-bold mb-4">Premium Features</h2>
            <p className="mb-4 text-white/80">Upgrading to CashCat Pro unlocks powerful data analysis tools and lifts account limitations:</p>

            <div className="space-y-6 mb-12">
                <div className="glass-card-blue p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-2 mt-0">Unlimited Accounts</h3>
                    <p className="text-white/70 text-sm m-0">The free version is great for a basic checking/savings setup, but power users often have dozens of accounts. Pro lets you add as many accounts as you need.</p>
                </div>

                <div className="glass-card-blue p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-2 mt-0">Money Flow Diagram</h3>
                    <p className="text-white/70 text-sm m-0">Our flagship premium feature is an interactive Sankey diagram that visually maps exactly how money flows in from your income sources, moves between accounts, and exits to your spending categories.</p>
                </div>

                <div className="glass-card-blue p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-2 mt-0">Unlimited Data Imports & Exports</h3>
                    <p className="text-white/70 text-sm m-0">Need to bring in historical data or export your ledger for a detailed spreadsheet analysis? Pro gives you unlimited CSV import/export capabilities, asserting ultimate control over your own raw data.</p>
                </div>

                <div className="glass-card-blue p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-2 mt-0">Custom Date Range Analytics</h3>
                    <p className="text-white/70 text-sm m-0">Dial into exactly how you performed over highly specific lengths of time. Filter your analytics views beyond basic monthly tracking to exact date ranges.</p>
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-4 mt-8">How to Upgrade</h2>
            <p className="mb-4 text-white/80">
                You can easily subscribe to CashCat Pro via Lemon Squeezy, our merchant of record. We offer secure processing and instant access upon purchase.
            </p>
            <ul className="mb-8 text-white/80">
                <li>Navigate to <Link href="/pricing" className="text-green hover:underline">the Pricing Page</Link> for an overview.</li>
                <li>Check out securely at <Link href="https://pro.cashcat.app/checkout" className="text-green hover:underline">CashCat Checkout</Link>.</li>
                <li>Access your customer portal to manage details via <Link href="https://pro.cashcat.app" className="text-green hover:underline">pro.cashcat.app</Link>.</li>
            </ul>
        </article>
    );
}
