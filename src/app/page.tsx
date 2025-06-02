'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Logo from './components/logo';
import { useSupabase } from './contexts/supabase-provider';


export default function Landing() {
    const router = useRouter();
    const { user, loading } = useSupabase();


    useEffect(() => {
        if ((!loading && user)) {
            router.push('/budget');
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
            <main className="container mx-auto px-6">
                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center min-h-[100dvh] text-center">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl md:text-6xl font-bold mb-6">
                            <Logo></Logo>
                        </h1>
                        <h2 className="text-2xl md:text-4xl font-bold mb-4 text-white">
                            Take Control of Every Penny
                        </h2>
                        <p className="text-md md:text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
                            Stop wondering where your money went. CashCat's zero-based budgeting gives you complete control over your finances, one category at a time.
                        </p>
                        
                        
                       
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                            <button
                                onClick={() => router.push('/login')}
                                className="px-8 py-4 bg-green text-black font-semibold rounded-lg hover:bg-green-dark transition-all text-lg"
                            >
                                Start Budgeting Free
                            </button>
                            <button
                                onClick={() => document.getElementById('intro')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-4 bg-white/[.08] text-white/90 font-medium rounded-lg hover:bg-white/[.12] transition-all text-lg border border-white/20"
                            >
                                Learn How It Works
                            </button>
                        </div>
                    </div>
                </div>

                {/* Key Benefits Section */}
                <div id='intro' className="py-16 max-w-6xl mx-auto">
                    <h3 className="text-2xl md:text-4xl font-bold text-center mb-4 md:mb-12 text-white">
                        Why Choose Zero-Based Budgeting?
                    </h3>
                    
                    <div className="grid md:grid-cols-3 md:gap-8 md:mb-16">
                        <div className="text-center p-3 md:p-6">
                            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                    <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-white">No Money Left Behind</h4>
                            <p className="text-white/70">
                                Assign every penny a purpose. Know exactly where your money is going before you spend it.
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-white">Real-Time Clarity</h4>
                            <p className="text-white/70">
                                See instantly how much you can spend in each category. No more budget guessing games.
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                    <path d="M16 21V5C16 4.4 15.6 4 15 4H9C8.4 4 8 4.4 8 5V21L12 18L16 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-white">Build Better Habits</h4>
                            <p className="text-white/70">
                                Transform impulse spending into conscious decisions. Watch your savings goals become reality.
                            </p>
                        </div>

                        
                    </div>
                    <div className="mb-8 p-6 bg-green/10 rounded-lg border border-green/20 max-w-xl mx-auto">
                        <h4 className="font-bold text-lg md:text-2xl text-center text-green mb-2">The Zero-Based Secret</h4>
                        <p className="text-md text-white/70 text-center">
                            <strong className="font-bold">Income - Assigned Money = 0. </strong><br/> Every penny has a purpose before you spend it. <br/>Never wonder "where did my money go?" again.
                        </p>
                    </div>
                </div>

                {/* How It Works Section */}
                <div id="how-it-works" className="py-16 bg-white/[.02] rounded-2xl max-w-6xl mx-auto mb-16">
                    <div className="px-8">
                        <h3 className="text-2xl md:text-4xl font-bold text-center mb-12 text-white">
                            Simple Steps to Financial Control
                        </h3>
                        
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-8">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 bg-green rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-1">1</div>
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2 text-white">Set Your Starting Balance</h4>
                                        <p className="text-white/70">Tell CashCat how much money you have right now.</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 bg-green rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-1">2</div>
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2 text-white">Create Budget Categories</h4>
                                        <p className="text-white/70">Organize your spending into groups like "Food", "Bills", and "Entertainment".</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 bg-green rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-1">3</div>
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2 text-white">Assign Every Penny</h4>
                                        <p className="text-white/70">Give every penny in your account a job. Nothing gets left unassigned.</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 bg-green rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-1">4</div>
                                    <div>
                                        <h4 className="text-lg font-semibold mb-2 text-white">Track Your Spending</h4>
                                        <p className="text-white/70">Log purchases and watch your available money adjust in real-time.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white/[.05] rounded-lg p-6 border-l-4 border-green">
                                <h4 className="text-lg font-semibold mb-4 text-green">The CashCat Difference</h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green rounded-full"></div>
                                        <span className="text-white/80">Zero-based budgeting methodology</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green rounded-full"></div>
                                        <span className="text-white/80">Instant spending feedback</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green rounded-full"></div>
                                        <span className="text-white/80">Goal tracking & rollover support</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green rounded-full"></div>
                                        <span className="text-white/80">Simple, distraction-free interface</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Proof Section */}
                <div className="py-16 text-center max-w-4xl mx-auto">
                    <h3 className="text-2xl md:text-3xl font-bold mb-8 text-white">
                        Join Users Taking Control
                    </h3>
                    <p className="text-lg text-white/80 mb-8">
                        CashCat is built by people who actually use zero-based budgeting daily. We understand the frustrations with other tools and built something better.
                    </p>
                    
                    <div className="bg-white/[.03] rounded-lg p-6 border-l-4 border-green mb-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-green/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green">
                                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <div className="text-left">
                                <h4 className="text-lg font-medium mb-2 text-green">Early Access Program</h4>
                                <p className="text-white/70">
                                    CashCat is in early access. Core budgeting features work great, with new features being added regularly. 
                                    Join now to help shape the future of personal finance tools!
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => router.push('/login')}
                            className="px-8 py-4 bg-green text-black font-semibold rounded-lg hover:bg-green-dark transition-all text-lg"
                        >
                            Get Started Free
                        </button>
                        <button
                            onClick={() => router.push('/about')}
                            className="px-8 py-4 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all text-lg"
                        >
                            Meet the Team
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="py-8 text-center text-white/50 text-sm border-t border-white/10">
                    <p>Built with ❤️ for people who want to take control of their money</p>
                </div>
            </main>
        </div>
    );
}
