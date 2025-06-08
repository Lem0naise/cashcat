'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Logo from './components/logo';
import { useSupabase } from './contexts/supabase-provider';
import Link from 'next/link';

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
                        <p className="text-md md:text-xl text-white/80 mb-2 md:mb-6 max-w-2xl mx-auto leading-relaxed">
                            The <span className="text-green font-semibold">free</span> zero-based budgeting app that gives you complete control over your finances, one purchase at a time.
                            
                        </p>
                        
                        {/* Key highlights */}
                        <div className="flex flex-wrap justify-center gap-4 mb-4 md:mb-8 text-xs md:text-base">
                            <div className="flex items-center gap-2 bg-green/10 px-4 py-2 rounded-full border border-green/20">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green">
                                    <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="text-green font-medium">Budget for Free</span>
                            </div>
                            <div className="flex items-center gap-2 bg-green/10 px-4 py-2 rounded-full border border-green/20">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green">
                                    <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7Z" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <path d="M8 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <span className="text-green font-medium">Multiple Bank Accounts</span>
                            </div>
                            <div className="flex items-center gap-2 bg-green/10 px-4 py-2 rounded-full border border-green/20">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green">
                                    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="text-green font-medium">Detailed Statistics</span>
                            </div>
                        </div>
                       
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                            <Link
                                href="/signup"
                                className="px-8 py-4 bg-green text-black font-semibold rounded-lg hover:bg-green-dark transition-all text-lg"
                            >
                                Start Budgeting Free
                            </Link>
                            <button
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-4 bg-white/[.08] text-white/90 font-medium rounded-lg hover:bg-white/[.12] transition-all text-lg border border-white/20"
                            >
                                See How It Works
                            </button>
                        </div>
                    </div>
                </div>

                {/* Key Features Section */}
                <div id='features' className="py-16 max-w-6xl mx-auto leading-4.5 md:leading-6">
                    <h3 className="text-3xl md:text-4xl font-bold text-center mb-4 md:mb-12 text-white">
                        Why Choose CashCat?
                    </h3>
                    
                    <div className="grid md:grid-cols-3 md:gap-8 md:mb-16">
                        <div className="text-center p-3 md:p-6">
                            <div className="flex text-center justify-center items-center md:block">
                                <div className="w-16 h-16 bg-green/20 rounded-full hidden md:flex items-center justify-center mx-auto mb-4">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-green">Free Forever</h4>
                            </div>
                            <p className="text-white/70 ">
                                No hidden fees, no free trial. CashCat is built to be accessible to everyone who wants better financial control.
                                <span className="text-sm block mt-1 text-white/60">*Core budgeting features always free, small fees may apply to optional external bank integration</span>

                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="flex text-center justify-center items-center md:block">
                                <div className="w-16 h-16 bg-green/20 rounded-full hidden md:flex items-center justify-center mb-4 mx-auto">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7Z" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        <path d="M8 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-green ">All Your Accounts in One Place</h4>
                            </div>
                            <p className="text-white/70">
                                Track spending across multiple bank accounts, credit cards, and cash. Get a complete picture of your finances without switching between apps.
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="flex text-center justify-center items-center md:block">
                                <div className="w-16 h-16 bg-green/20 rounded-full hidden md:flex items-center justify-center mx-auto mb-4">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-green">Real-Time Budget Tracking</h4>
                            </div>
                            <p className="text-white/70">
                                See instantly how much you can spend in each category. Watch your available money update as you log purchases throughout the day.
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 md:gap-8 md:mb-16">
                        
                        <div className="text-center p-6">
                            <div className="flex text-center justify-center items-center md:block">
                                <div className="w-16 h-16 bg-green/20 rounded-full hidden md:flex items-center justify-center mx-auto mb-4">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-green">Give Everything a Purpose</h4>
                            </div>
                            <p className="text-white/70">
                                Assign every penny a purpose before you spend it. Know exactly where your money is going with zero-based budgeting principles.
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="flex text-center justify-center items-center md:block">
                                <div className="w-16 h-16 bg-green/20 rounded-full hidden md:flex items-center justify-center mx-auto mb-4">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M16 21V5C16 4.4 15.6 4 15 4H9C8.4 4 8 4.4 8 5V21L12 18L16 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-green">Build Better Money Habits</h4>
                            </div>
                            <p className="text-white/70">
                                Transform impulse spending into conscious decisions. Making yourself log each purchase becomes an intentional choice aligned with your goals.
                            </p>
                        </div>
                    </div>
                </div>

                {/* What is Zero-Based Budgeting */}
                <div id='intro' className="md:py-4 max-w-6xl mx-auto">
                    <div className="mb-8 p-6 bg-green/10 rounded-lg border border-green/20 max-w-4xl mx-auto">
                        <h3 className="font-bold text-2xl md:text-4xl text-center text-green mb-4">What is Zero-Based Budgeting?</h3>
                        <p className="text-lg md:text-xl text-white/80 text-center mb-4">
                            <strong className="font-bold text-green">Income - Assigned Money = 0</strong>
                        </p>
                        <p className="text-md text-white/70 text-center leading-relaxed">
                            Every penny has a purpose before you spend it - savings, spending, paying off debt. 
                            Instead of tracking where your money went, you decide where it's going. Never wonder "where did my money go?" again.
                        </p>
                    </div>
                </div>


                {/* Common Questions */}
                <div id="common-questions" className="py-16 bg-white/[.02] rounded-2xl max-w-6xl mx-auto mb-16">
                    <div className="md:px-8">
                        <h3 className="text-2xl md:text-4xl font-bold text-center mb-4 md:mb-12 text-white">
                            Common Questions
                        </h3>
                        <div className="space-y-6">
                        
                            <div className="bg-white/[.03] rounded-lg p-6 border-l-4 border-green">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "I've tried budgeting before and failed. How is this different?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    Traditional budgets fail because they're based on estimates. Zero-based budgeting uses your actual money right now. 
                                    You're not guessing what you'll spend - you're deciding what each pound will do before you spend it.
                                </p>
                            </div>

                            <div className="bg-white/[.03] rounded-lg p-6 border-l-4 border-green">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "Can I really track multiple bank accounts in one place?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    Absolutely! Add as many accounts as you need - checking, savings, credit cards, cash. See your complete financial picture and track spending across all accounts from one dashboard.
                                </p>
                            </div>
                            
                            
                            <div className="bg-white/[.03] rounded-lg p-6 border-l-4 border-green">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "This sounds complicated. How much time does it take?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    Initial setup: <span className="text-green">15-20 minutes</span>. Daily use: <span className="text-green">2 minutes</span> to log purchases and check your budget. 
                                    The time you save not worrying about money and the clarity you gain makes it completely worth it.
                                </p>
                            </div>

                            <div className="bg-white/[.03] rounded-lg p-6 border-l-4 border-green">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "Is CashCat really free? What's the catch?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    Yes! With one small exception - automatic syncing with your bank account. Every core budgeting feature is completely free. However, if we want to add automatic bank syncing, we have to pay the banks a lot! We just need to cover our costs - we may implement a small subscription fee for users who wish to use this feature.
                                </p>
                            </div>
                            
                            <div className="bg-white/[.03] rounded-lg p-6 border-l-4 border-green">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "What if I have irregular income?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    CashCat is perfect for irregular income! Budget only the money you have right now. 
                                    When new money comes in, assign it then. No more stress about traditional monthly budgets that don't fit your reality.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Social Proof Section */}
                <div className="md:py-4 text-center max-w-4xl mx-auto">
                    <h3 className="text-2xl md:text-3xl font-bold mb-8 text-white">
                        Join Users Taking Control
                    </h3>
                    <p className="text-lg text-white/80 mb-8">
                        CashCat is built by people who actually use zero-based budgeting daily. We understand the frustrations with other tools and are building something better.
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
                        <Link
                            href="/signup"
                            className="px-8 py-4 bg-green text-black font-semibold rounded-lg hover:bg-green-dark transition-all text-lg"
                        >
                            Get Started Free
                        </Link>
                        <Link
                            href="/about"
                            className="px-8 py-4 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all text-lg"
                        >
                            Meet the Team
                        </Link>
                         <Link
                            href="/learn"
                            className="px-8 py-4 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all text-lg"
                        >
                            A More Detailed How-To
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="py-8 text-center text-white/50 text-sm border-t border-white/10">
                    <p>Built with ❤️ for people who want to take control of their money</p>
                    <div className="flex gap-4 mt-2 justify-center">
                            <Link
                                href="/terms"
                                className="text-green hover:text-green-dark transition-colors text-sm underline"
                            >
                                Terms of Service & Privacy Policy
                            </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
