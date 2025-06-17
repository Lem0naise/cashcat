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
                            💡 Add lemonaise.dev@gmail.com to your contacts to prevent future emails from being filtered
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
                            <p className="text-white/70 text-sm mb-1">
                                <strong>Email Support:</strong> lemonaise.dev@gmail.com
                            </p>
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
