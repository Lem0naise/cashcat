import Logo from './components/logo';
import Link from 'next/link';
import FloatingIconsBackground from './components/floating-icon-background';
import { Capacitor } from '@capacitor/core';
import TrafficCop from './components/traffic-cop';
import WaitlistForm from './components/waitlist-form';

export const metadata = {
    title: 'CashCat - The Budgeting App for Data Nerds',
    description: 'The free zero-based budgeting app that gives you total control over your own data. Manage your money with confidence.',
    keywords: [
        'budgeting app',
        'zero-based budgeting',
        'free budget tracker',
        'personal finance',
        'money management',
        'financial planning',
        'expense tracker',
        'budget planner'
    ],
    authors: [{ name: 'Indigo Nolan' }, { name: 'Josh Wilcox' }],
    openGraph: {
        title: 'CashCat - The Budgeting App for Data Nerds',
        description: 'Your money. Your rules. The budgeting app for data nerds who want ultimate control over their own data.',
        url: 'https://cashcat.app',
        siteName: 'CashCat',
        locale: 'en_GB',
        type: 'website',
        images: [
            {
                url: 'https://cashcat.app/media/og.png',
                width: 1464,
                height: 828,
                alt: 'CashCat Dashboard',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'CashCat - The Budgeting App for Data Nerds',
        description: 'Your money. Your rules. The budgeting app for data nerds who want ultimate control over their own data.',
        images: ['https://cashcat.app/media/og.png'],
    },
};

export default function Landing() {
    return (
        <div className="min-h-screen font-[family-name:var(--font-suse)] selection:bg-green selection:text-black">
            <TrafficCop />
            <FloatingIconsBackground />

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 glass-card-blue border-b border-white/5 rounded-none bg-black/20 backdrop-blur-md">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="w-32 pl-6">
                        <Logo />
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-white/80 hover:text-white font-medium transition-colors hidden sm:block"
                        >
                            Log In
                        </Link>
                        <Link
                            href="/signup"
                            className="bg-green text-black px-4 py-2 rounded-lg font-bold hover:bg-green-dark transition-all text-sm"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-4 pt-32 pb-20">
                {/* Hero Section */}
                <div className="flex flex-col items-center justify-center text-center max-w-5xl mx-auto mb-24 md:mb-32">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-green text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="w-2 h-2 rounded-full bg-green animate-pulse"></span>
                        YOUR MONEY. YOUR RULES.
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        The Budgeting App <br className="hidden md:block" />
                        <span className="text-gradient">for Data Nerds</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        The zero-based budgeting app that gives you total control. Available on <span className="text-green font-bold">Web, Android, and iOS</span>.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <Link
                            href="/signup"
                            className="px-8 py-4 bg-green text-black font-bold rounded-xl hover:bg-green-dark transition-all text-lg shadow-[0_0_20px_rgba(132,214,132,0.3)] hover:shadow-[0_0_30px_rgba(132,214,132,0.5)] transform hover:-translate-y-1"
                        >
                            Start Budgeting Free
                        </Link>
                        <Link
                            href="#waitlist"
                            className="px-8 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all text-lg border border-white/10 backdrop-blur-sm"
                        >
                            Join the Waitlist
                        </Link>
                    </div>

                    <div className="mt-8 text-white/40 text-sm animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                        No credit card required.
                    </div>
                </div>

                {/* Features Bento Grid */}
                <div id="features" className="max-w-7xl mx-auto mb-32">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Main Feature - Large */}
                        <div className="md:col-span-2 glass-card-blue p-8 md:p-12 glass-card-hover relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-green/10 rounded-2xl flex items-center justify-center mb-6 text-green border border-green/20">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-4">Zero-Based Budgeting</h3>
                                <p className="text-white/70 text-lg leading-relaxed max-w-lg">
                                    Give every penny a job. Instead of just tracking spending, allocate your income to specific categories before you spend it. This proactive approach eliminates financial stress.
                                </p>
                            </div>
                            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500">
                                <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor" className="text-green">
                                    <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" />
                                </svg>
                            </div>
                        </div>

                        {/* Secondary Feature - Vertical */}
                        <div className="glass-card-blue p-8 glass-card-hover flex flex-col justify-between group">
                            <div>
                                <div className="w-12 h-12 bg-blue/10 rounded-xl flex items-center justify-center mb-6 text-blue border border-blue/20">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue">
                                        <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7Z" stroke="currentColor" strokeWidth="2" />
                                        <path d="M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M8 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Multi-Account</h3>
                                <p className="text-white/70">
                                    Track checking, savings, credit cards, and cash in one view. Handle transfers between accounts with ease.
                                </p>
                            </div>
                        </div>

                        {/* Third Feature */}
                        <div className="glass-card-blue p-8 glass-card-hover group">
                            <div className="w-12 h-12 bg-reddy/10 rounded-xl flex items-center justify-center mb-6 text-reddy border border-reddy/20">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-reddy">
                                    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Future Ready</h3>
                            <p className="text-white/70">
                                Budget for future months today. Plan ahead for big expenses and strictly forecast your savings.
                            </p>
                        </div>

                        {/* Feature 4 - Large Wide */}
                        <div className="md:col-span-2 glass-card-blue p-8 md:p-12 glass-card-hover flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <span className="inline-block px-3 py-1 bg-green/20 text-green rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-green/20">Data Rich</span>
                                <h3 className="text-3xl font-bold text-white mb-4">Ultimate Control Over Your Data</h3>
                                <p className="text-white/70 text-lg mb-6">
                                    We provide the detailed stats, analytics, and raw data access developers and power users crave. See exactly where your money goes with beautiful charts, or export everything to JSON and query it yourself.
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-white/80">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green">
                                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Income vs Spending Reports
                                    </li>
                                    <li className="flex items-center gap-3 text-white/80">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green">
                                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Net Worth Tracking
                                    </li>
                                    <li className="flex items-center gap-3 text-white font-medium">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green">
                                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Raw JSON & CSV Export anytime
                                    </li>
                                </ul>
                            </div>
                            <div className="hidden md:block w-full md:w-1/3 aspect-square bg-gradient-to-br from-green/20 to-blue/20 rounded-2xl flex items-center justify-center p-8 border border-white/5">
                                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                                    <path d="M6,16.5L3,19.44V11H6M11,14.66L9.43,13.32L8,14.64V7H11M16,13L13,16V3H16M18.81,12.81L17,11H22V16L20.21,14.21L13,21.36L9.53,18.34L5.75,22H3L9.47,15.66L13,18.64" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile App Section */}
                <div id="waitlist" className="py-24 max-w-6xl mx-auto border-t border-white/10">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className=" hidden md:block w-full md:w-1/2 relative">
                            {/* Phone Mockup Placeholder */}
                            <div className="relative mx-auto border-gray-800 bg-gray-900 border-[8px] rounded-[2.5rem] h-[500px] w-[280px] shadow-xl flex flex-col justify-center items-center overflow-hidden">
                                <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
                                <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
                                <div className="rounded-[2rem] overflow-hidden w-[260px] h-[480px] bg-[#0a0a0a] relative">
                                    <div className="absolute top-0 left-0 right-0 h-14 bg-black/50 z-20 backdrop-blur-md flex items-end justify-center pb-2">
                                        <div className="w-20 h-6 bg-black rounded-full"></div>
                                    </div>
                                    {/* App UI Representation */}
                                    <div className="p-4 pt-16 space-y-4">
                                        <div className="h-24 bg-green/10 rounded-2xl border border-green/20 p-4">
                                            <div className="w-16 h-4 bg-green/30 rounded mb-2"></div>
                                            <div className="w-24 h-8 bg-green/50 rounded"></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-14 bg-white/5 rounded-xl border border-white/5"></div>
                                            <div className="h-14 bg-white/5 rounded-xl border border-white/5"></div>
                                            <div className="h-14 bg-white/5 rounded-xl border border-white/5"></div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-green/20 to-transparent flex items-end justify-center pb-6">

                                    </div>
                                </div>
                            </div>
                            {/* Decor elements */}
                            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-green/20 rounded-full blur-3xl opacity-30"></div>
                        </div>

                        <div className="w-full md:w-1/2 text-center md:text-left">
                            <span className="inline-block px-3 py-1 bg-white/10 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-4">Coming Soon</span>
                            <h2 className="text-4xl font-bold mb-6 text-white">Budget on Any Device.</h2>
                            <p className="text-lg text-white/70 mb-8 leading-relaxed">
                                CashCat is built for every device and platform. Use our fully-featured web app on any computer, or budget on the go with Android and iOS.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-12">
                                <button disabled className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-xl border border-white/10 opacity-70 cursor-not-allowed">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="text-white">
                                        <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />

                                    </svg>
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-white/60">Coming to</div>
                                        <div className="text-sm font-bold text-white">App Store</div>
                                    </div>
                                </button>
                                <button disabled className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-xl border border-white/10 opacity-70 cursor-not-allowed">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="text-white">
                                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                                    </svg>
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-white/60">Coming to</div>
                                        <div className="text-sm font-bold text-white">Google Play</div>
                                    </div>
                                </button>
                            </div>

                            <div className="pt-8 border-t border-white/10">
                                <p className="text-lg text-white/70 mb-8 leading-relaxed">
                                    While we put the finishing touches on our <span className="text-green font-semibold">native mobile apps</span>, join our waitlist to be the first to know when they drop.
                                </p>
                                <WaitlistForm />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Proof */}
                <div className="text-center py-20 border-t border-white/10">
                    <h2 className="text-3xl font-bold mb-8 text-white">Join the Community</h2>
                    <p className="text-white/70 max-w-2xl mx-auto mb-10 text-lg">
                        We're building CashCat in the open. Join our Discord to share your budgeting wins, request features, or just chat with the team.
                    </p>
                    <Link
                        href="https://discord.gg/C9mYnEdAQA"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-[#5865F2] text-white font-bold rounded-xl hover:bg-[#4752C4] transition-all text-lg"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                        Join Our Discord
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm py-12">
                <div className="container mx-auto px-6 text-center">
                    <div className="mb-8">
                        <Logo />
                    </div>
                    <div className="flex flex-wrap justify-center gap-8 mb-8 text-sm font-medium text-white/60">
                        <Link href="/about" className="hover:text-green transition-colors">About Us</Link>
                        <Link href="/learn" className="hover:text-green transition-colors">How it Works</Link>
                        <Link href="/updates" className="hover:text-green transition-colors">Changelog</Link>
                        <Link href="/docs" className="hover:text-green transition-colors">Documentation</Link>
                        <Link href="/terms" className="hover:text-green transition-colors">Terms & Privacy</Link>
                    </div>
                    <p className="text-white/30 text-xs">
                        &copy; {new Date().getFullYear()} CashCat. Built with ❤️ for financial freedom.
                    </p>
                </div>
            </footer>
        </div>
    );
}
