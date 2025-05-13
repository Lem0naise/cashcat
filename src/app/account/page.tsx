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
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
