import Link from 'next/link';

export const metadata = {
  title: 'Account Settings - CashCat Docs',
  description: 'Learn how to manage your account settings and preferences in CashCat.',
};

export default function AccountSettings() {
    return (
        <div className="fade-in">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Account Settings</h1>
                <p className="text-white/70 text-base md:text-lg">
                    Customize your CashCat experience and manage your account preferences. Learn about security settings and data management options.
                </p>
            </div>

            {/* Data management */}
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Data Management</h2>
                
                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Data Export</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        Export your financial data for backup purposes or to use with other tools. 
                        Download your transactions, budgets, and account information in various formats.
                    </p>
                    <ul className="text-white/60 text-sm space-y-1">
                        <li>• CSV export for spreadsheets</li>
                        <li>• JSON export for developers</li>
                        <li>• PDF reports for records</li>
                    </ul>
                </div>

                <div className="p-4 md:p-6 glass-card rounded-lg">
                    <h3 className="text-lg md:text-xl font-semibold text-green mb-2 md:mb-3">Account Deletion</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">
                        If you decide to stop using CashCat, you can permanently delete your account and all associated data via the account page. 
                        This action cannot be undone, so export any data you want to keep first.
                    </p>
                    <div className="bg-red/10 p-3 rounded-lg mt-3">
                        <p className="text-red text-sm font-medium">⚠️ Account deletion is permanent and cannot be reversed</p>
                    </div>
                </div>
            </div>

            {/* Next steps */}
            <div className="text-center mt-6 md:mt-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Manage Your Account</h2>
                <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6">
                    Ready to customize your CashCat experience?
                </p>
                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <Link href="/account" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Account Settings</h4>
                            <p className="text-xs md:text-sm text-white/60">Update your profile and preferences</p>
                        </div>
                    </Link>
                    <Link href="/docs/troubleshooting" className="group">
                        <div className="p-3 md:p-4 glass-card rounded-lg hover:bg-white/[.05] transition-all">
                            <h4 className="font-medium text-green group-hover:text-green-dark mb-1 md:mb-2 text-sm md:text-base">Troubleshooting</h4>
                            <p className="text-xs md:text-sm text-white/60">Get help with common issues</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
