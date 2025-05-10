'use client';
import Image from "next/image";
import Navbar from "../../components/navbar";
import Sidebar from "../../components/sidebar";
import MobileNav from "../../components/mobileNav";

export default function Transactions() {
    return(
        <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
            <Navbar />
            <Sidebar />
            <MobileNav />
            
            <main className="pt-16 pb-24 md:pb-6 md:pl-64 p-6 fade-in">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-bold tracking-[-.01em]">Transactions</h1>
                        <button className="flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a] text-sm opacity-90 hover:opacity-100 md:block hidden">
                            <Image
                                src="/file.svg"
                                alt="Add transaction"
                                width={16}
                                height={16}
                                className="opacity-70"
                            />
                            Add Transaction
                        </button>
                    </div>
                    
                    <div className="text-center text-black/60 dark:text-white/60 mt-20">
                        <Image
                            src="/file.svg"
                            alt="No transactions"
                            width={48}
                            height={48}
                            className="opacity-40 mx-auto mb-4"
                        />
                        <h2 className="text-xl font-semibold mb-2">No transactions yet</h2>
                        <p className="text-sm">Start adding your transactions to track your spending</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
