'use client';
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import MobileNav from "../components/mobileNav";

export default function Account() {
    return (
        <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
            <Navbar />
            <Sidebar />
            <MobileNav />
            
            <main className="pt-16 pb-28 md:pb-6 md:pl-64 p-6 fade-in">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-bold tracking-[-.01em]">Account</h1>
                    </div>
                    
                    {/* Account content will go here */}
                    <div className="p-4 bg-white/[.02] rounded-lg border-b-4">
                        <p className="text-white/50">Account settings coming soon</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
