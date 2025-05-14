'use client';
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import MobileNav from "../components/mobileNav";
import ProtectedRoute from "../components/protected-route";
import { createClient } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import { useSupabase } from '../contexts/supabase-provider';
import { isDevelopment, mockUser } from '../utils/mocks';
import Logo from "../components/logo";

export default function Account() {
    const router = useRouter();
    const supabase = createClient();
    const { user } = useSupabase();

    const handleSignOut = async () => {
        if (!isDevelopment) {
            await supabase.auth.signOut();
        }
        router.push('/login');
    };

    const displayUser = isDevelopment ? mockUser : user;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
                <Navbar />
                <Sidebar />
                <MobileNav />
                
                <main className="pt-16 pb-28 md:pb-6 md:pl-64 p-6 fade-in">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                           <h1 className="text-2xl font-bold tracking-[-.01em]">Account & Settings</h1>
                        </div>
                        
                        <div className="p-4 bg-white/[.02] rounded-lg border-b-4">
                            {isDevelopment ? (
                                <div className="mb-4 p-3 bg-green/10 text-green rounded-lg">
                                    Development Mode Active - All data is mocked
                                </div>
                            ) : null}
                            <p className={`${displayUser ? 'inline' : 'hidden'}`}>
                                You're signed into CashCat! Your budget is saved to the cloud, you can rest safely.
                            </p>
                            <div className="mt-4 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-white/50">Email</p>
                                        <p className="font-medium">{displayUser?.email}</p>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={handleSignOut}
                                    className="px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                        
                        {/* Budget Settings */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <h2 className="text-lg font-semibold mb-4">Budget Settings</h2>
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm text-white/50 mb-2">Currency</label>
                                    <select
                                        className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm disabled:opacity-50"
                                        disabled
                                    >
                                        <option value="GBP">£ GBP (Coming Soon)</option>
                                        <option value="USD">$ USD (Coming Soon)</option>
                                        <option value="EUR">€ EUR (Coming Soon)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-white/50 mb-2">Import Transactions</label>
                                    <button
                                        className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white disabled:opacity-50 disabled:hover:bg-white/[.05] disabled:hover:text-white/70"
                                        disabled
                                    >
                                        Import from CSV (Coming Soon)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Premium Features */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Premium Features</h2>
                                <span className="px-2 py-1 bg-green/20 text-green text-xs rounded-full">Coming Soon</span>
                            </div>
                            <p className="text-sm text-white/70 mb-4">Get early access to new features and support CashCat's development.</p>
                            <button
                                className="w-full px-4 py-2 bg-green text-black rounded-lg transition-all hover:bg-green-dark disabled:opacity-50"
                                disabled
                            >
                                Upgrade to Premium
                            </button>
                        </div>

                        {/* Help & Resources */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <h2 className="text-lg font-semibold mb-4">Help & Resources</h2>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => router.push('/learn')}
                                    className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white text-left"
                                >
                                    How CashCat Works
                                </button>
                            </div>
                        </div>

                        {/* Privacy Notice */}
                        <div className="mt-6 p-4 bg-white/[.02] rounded-lg border-b-4">
                            <h2 className="text-lg font-semibold mb-4">Privacy & Security</h2>
                            <p className="text-sm text-white/70">
                                Your data is securely stored and encrypted. If you are an early-access tester and wish to delete your account, please get in touch with a member of the team.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
