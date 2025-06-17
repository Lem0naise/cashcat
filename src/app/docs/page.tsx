
import Link from 'next/link';

export const metadata = {
  title: 'Documentation - CashCat',
  description: 'Learn how to use CashCat effectively.',
};

export default function DocsOverview() {
    return (
        <div className="fade-in">
            <div className="">

                {/* Popular guides */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Popular Guides</h2>
                    <div className="grid gap-4">
                        <Link href="/docs/first-budget" className="group">
                            <div className="p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all flex items-center gap-4">
                                <div className="w-2 h-2 bg-green rounded-full"></div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-green group-hover:text-green-dark">Creating Your First Budget</h4>
                                    <p className="text-sm text-white/60">Step-by-step walkthrough of setting up your budget</p>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-green">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </Link>

                        <Link href="/docs/zero-based-budgeting" className="group">
                            <div className="p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all flex items-center gap-4">
                                <div className="w-2 h-2 bg-green rounded-full"></div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-green group-hover:text-green-dark">Zero-Based Budgeting</h4>
                                    <p className="text-sm text-white/60">Learn the philosophy behind CashCat and how to assign every penny a purpose.</p>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-green">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </Link>

                        <Link href="/docs/best-practices" className="group">
                            <div className="p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all flex items-center gap-4">
                                <div className="w-2 h-2 bg-green rounded-full"></div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-green group-hover:text-green-dark">Best Practices</h4>
                                    <p className="text-sm text-white/60">Tips for successful budgeting with CashCat</p>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-green">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </Link>

                        <Link href="/docs/common-questions" className="group">
                            <div className="p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all flex items-center gap-4">
                                <div className="w-2 h-2 bg-green rounded-full"></div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-green group-hover:text-green-dark">Common Questions</h4>
                                    <p className="text-sm text-white/60">Answers to frequently asked questions</p>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-green">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Get started section */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Ready to Take Control?</h2>
                    <p className="text-white/70 mb-6">
                        Start your zero-based budgeting journey today
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/docs/getting-started"
                            className="px-6 py-3 bg-green text-black font-semibold rounded-lg hover:bg-green-dark transition-all"
                        >
                            Get Started
                        </Link>
                        <Link
                            href="/signup"
                            className="px-6 py-3 glass-card text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all"
                        >
                            Create Account
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
