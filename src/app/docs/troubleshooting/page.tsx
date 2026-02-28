import Link from 'next/link';

export const metadata = {
    title: 'Troubleshooting - CashCat Docs',
    description: 'Troubleshooting guide for common issues and problems with CashCat.',
};

export default function Troubleshooting() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Troubleshooting</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Having issues with CashCat? Find solutions to common problems and learn how to get back on track with your budgeting.
                </p>
            </div>

            {/* Account issues */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Account & Login Issues</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Can't log in to my account</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        First, make sure you're using the correct email address and password. Check for caps lock
                        and try copying/pasting your password to avoid typos.
                    </p>
                    <div className="bg-blue/10 p-3 rounded-lg mt-3">
                        <p className="text-blue text-sm font-medium mb-2">Steps to try:</p>
                        <ul className="text-blue text-sm space-y-1">
                            <li>1. Clear your browser cache and cookies</li>
                            <li>2. Try logging in from an incognito/private window</li>
                            <li>3. Reset your password using the "Forgot Password" link</li>
                            <li>4. Try a different browser or device</li>
                        </ul>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Not receiving password reset emails</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Check your spam/junk folder first. Password reset emails sometimes get filtered.
                        Also verify you're using the same email address you signed up with.
                    </p>
                    <div className="bg-orange/10 p-3 rounded-lg mt-3">
                        <p className="text-orange text-sm">
                            Add team@cashcat.app to your contacts to prevent future emails from being filtered
                        </p>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Account appears to be missing data</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Make sure you're logged into the correct account. If you have multiple email addresses,
                        you might have created separate accounts. Try logging in with different email addresses.
                    </p>
                </div>
            </div>

            {/* Budget & transaction issues */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Budget & Transaction Issues</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">My budget doesn't add up to zero</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        In zero-based budgeting, your income minus all budget allocations should equal zero.
                        If it doesn't, you need to adjust your category amounts.
                    </p>
                    <div className="bg-green/10 p-3 rounded-lg mt-3">
                        <p className="text-green text-sm font-medium mb-2">To fix this:</p>
                        <ul className="text-green text-sm space-y-1">
                            <li>• If you have money left over: Add it to next month's budget!</li>
                            <li>• If you're over budget: Reduce some category amounts</li>
                            <li>• Remember: Every penny should be assigned to a category</li>
                        </ul>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Transaction won't save or keeps disappearing</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        This usually happens due to a poor internet connection or browser issues.
                        Make sure all required fields are filled out correctly.
                    </p>
                    <div className="bg-blue/10 p-3 rounded-lg mt-3">
                        <p className="text-blue text-sm font-medium mb-2">Required fields check:</p>
                        <ul className="text-blue text-sm space-y-1">
                            <li>• Amount (must be a valid number)</li>
                            <li>• Account selection</li>
                            <li>• Vendor / payee (cannot be empty)</li>
                            <li>• Category assignment</li>
                            <li>• Date (cannot be empty)</li>
                        </ul>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Account balances don't match my bank</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        This usually means you have missing transactions or incorrect starting balances.
                        Use the inbuilt CashCat 'comparison' tool to fix this. You can find this by going to the Transactions page, and then selecting your account from the dropdown menu. The option should appear below your balance.
                    </p>

                </div>
            </div>

            {/* Technical issues */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Technical Issues</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">CashCat is loading slowly or not at all</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Slow loading is usually caused by poor internet connection or browser cache issues.
                        Try these steps in order:
                    </p>
                    <div className="bg-blue/10 p-3 rounded-lg mt-3">
                        <ol className="text-blue text-sm space-y-1 list-decimal list-inside">
                            <li>Check your internet connection</li>
                            <li>Clear your browser cache and cookies</li>
                            <li>Try a different browser or incognito mode</li>
                            <li>Disable browser extensions temporarily</li>
                            <li>Restart your browser or device</li>
                        </ol>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Buttons or features not working</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        If buttons don't respond or features aren't working, this is often a JavaScript issue.
                        Make sure JavaScript is enabled in your browser settings.
                    </p>
                    <div className="bg-orange/10 p-3 rounded-lg mt-3">
                        <p className="text-orange text-sm">
                            Browser extensions like ad blockers can sometimes interfere with functionality. Try disabling them temporarily. CashCat doesn't run ads or track you!
                        </p>
                    </div>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Data not syncing across devices</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Make sure you're logged into the same account on all devices. Changes should sync automatically
                        when you have an internet connection.
                    </p>
                    <div className="bg-green/10 p-3 rounded-lg mt-3">
                        <p className="text-green text-sm">
                            Try refreshing the page or logging out and back in to force a sync.
                        </p>
                    </div>
                </div>
            </div>

            {/* Browser compatibility */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Browser Compatibility</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Supported Browsers</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        CashCat works best with modern browsers. For the best experience, use:
                    </p>
                    <div className="grid gap-2 mt-3">
                        <div className="flex justify-between bg-green/10 p-2 rounded">
                            <span className="text-white/70 text-sm">Chrome</span>
                            <span className="text-green text-sm font-medium">Recommended</span>
                        </div>
                        <div className="flex justify-between bg-green/10 p-2 rounded">
                            <span className="text-white/70 text-sm">Firefox</span>
                            <span className="text-green text-sm font-medium">Recommended</span>
                        </div>
                        <div className="flex justify-between bg-green/10 p-2 rounded">
                            <span className="text-white/70 text-sm">Safari</span>
                            <span className="text-green text-sm font-medium">Supported</span>
                        </div>
                        <div className="flex justify-between bg-orange/10 p-2 rounded">
                            <span className="text-white/70 text-sm">Internet Explorer</span>
                            <span className="text-orange text-sm font-medium">Not Recommended</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscription & billing issues */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Subscription &amp; Billing Issues</h2>

                <div className="p-4 md:p-6 glass-card rounded-lg border border-yellow-500/20">
                    <h3 className="text-lg md:text-xl font-semibold text-yellow-400 mb-2 md:mb-3">I bought CashCat Pro but it's not showing up in my account</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        This usually happens if the Lemon Squeezy checkout was completed before signing into CashCat, so we couldn't automatically link the purchase to your account. Your purchase is <strong className="text-white">not lost</strong>.
                    </p>
                    <div className="bg-yellow-500/10 p-3 rounded-lg mt-3 mb-4">
                        <p className="text-yellow-300 text-sm font-medium mb-1">To fix this:</p>
                        <ol className="text-yellow-200/80 text-sm space-y-1 list-decimal list-inside">
                            <li>Create or sign into your CashCat account at <Link href="/login" className="underline hover:text-yellow-300">/login</Link>.</li>
                            <li>Email us with the email address you used during checkout.</li>
                            <li>We'll manually attach the purchase to your account straight away.</li>
                        </ol>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <a href="mailto:cashcat@indigonolan.com" className="text-yellow-400 hover:text-yellow-300 underline text-sm font-medium">cashcat@indigonolan.com</a>
                        <span className="text-white/30 hidden sm:inline">or</span>
                        <a href="mailto:support@lemonaise.dev" className="text-yellow-400 hover:text-yellow-300 underline text-sm font-medium">support@lemonaise.dev</a>
                    </div>
                </div>
            </div>

            {/* Getting help */}

            <div className="p-4 md:p-6 glass-card-blue rounded-lg mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-semibold text-green mb-3 md:mb-4">Still Need Help?</h3>
                <p className="text-white/70 text-sm md:text-base mb-4">
                    If you've tried these solutions and are still experiencing issues, we're here to help!
                </p>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                            <Link
                                href="https://discord.gg/C9mYnEdAQA"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white font-medium rounded-lg hover:bg-[#4752C4] transition-all text-sm"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                Ask in our Discord
                            </Link>
                            <Link
                                href="mailto:lemonaise.dev@gmail.com"
                                className="block mt-4 text-sm text-green hover:text-green-dark underline"
                            >
                                Or email support here
                            </Link>

                            <p className="text-white/60 text-xs">
                                Include details about what you were trying to do and any error messages you saw.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                            <p className="text-white/70 text-sm mb-1">
                                <strong>What to Include:</strong>
                            </p>
                            <ul className="text-white/60 text-xs space-y-1">
                                <li>• What browser and device you're using</li>
                                <li>• What you were trying to do when the problem occurred</li>
                                <li>• Any error messages you saw</li>
                                <li>• Screenshots if applicable</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Back to Budgeting</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Issues resolved? Get back to managing your finances:
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/budget" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Return to Budget</h4>
                            <p className="text-xs md:text-sm text-white/60">Continue managing your budget</p>
                        </div>
                    </Link>
                    <Link href="/docs/common-questions" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Common Questions</h4>
                            <p className="text-xs md:text-sm text-white/60">Find answers to other questions</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
