import Logo from './components/logo';
import Link from 'next/link';
import FloatingIconsBackground from './components/floating-icon-background';

export const metadata = {
  title: 'CashCat - Say Goodbye to Financial Worries',
  description: 'Say goodbye to financial guesswork - manage your money for free with CashCat.',
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
  authors: [{ name: 'Indigo Nolan' },{ name: 'Josh Wilcox' }],
  creator: 'CashCat',
  publisher: 'CashCat',
  openGraph: {
    title: 'CashCat - Free Zero-Based Budgeting App',
    description: 'Say goodbye to financial guesswork. The free budgeting app that stops you worrying about money, no matter your situation.',
    url: 'https://cashcat.app',
    siteName: 'CashCat',
    images: [
      {
        url: 'https://cashcat.app/media/og.png',
        width: 1464,
        height: 828,
        alt: 'CashCat - Free Budgeting App Dashboard',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CashCat - Free Zero-Based Budgeting App',
    description: 'The free budgeting app that stops you worrying about money.',
    images: [
      {
        url: 'https://cashcat.app/media/og.png',
        width: 1464,
        height: 828,
        alt: 'CashCat - Free Budgeting App Dashboard',
      },
    ],
  },
};

export default function Landing() {
    return (
        <div className="min-h-screen font-[family-name:var(--font-suse)]">

            <FloatingIconsBackground/>    

            <main className="container mx-auto md:px-6">
                    
                <div className="flex flex-col items-center justify-center min-h-[100dvh] text-center">

                    <div className="relative max-w-4xl mx-auto">

                        <div className="relative bg-white/5 glass-card-blue p-6 md:p-12 shadow-2xl">
                            
                            <div className="relative z-10">
                                <h1 className="text-3xl md:text-6xl font-bold mb-6">
                                    <Logo></Logo>
                                </h1>
                                <h2 className="text-2xl md:text-4xl font-bold mb-4 text-white">
                                    Say Goodbye to Guesswork
                                </h2>
                                <p className="text-md md:text-xl text-white/80 mb-2 md:mb-6 max-w-2xl mx-auto leading-relaxed">
                                    The <span className="text-green font-semibold">free</span> budgeting app that stops you worrying about money, no matter your situation.
                                    
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
                                    <Link
                                        href="#features"
                                        className="px-8 py-4 bg-white/[.08] text-white/90 font-medium rounded-lg hover:bg-white/[.12] transition-all text-lg border border-white/20"
                                    >
                                        See How It Works
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Features Section */}
                <div id='features' className="py-16 max-w-6xl mx-auto leading-4.5 md:leading-6">
                    <h3 className="text-3xl md:text-4xl font-bold text-center mb-4 md:mb-12 text-white">
                        Why CashCat?
                    </h3>
                    
                    <div className="grid md:grid-cols-3 md:gap-8 md:mb-16">
                        <div className="md:text-center p-6 glass-card-blue">
                            <div className="flex text-center justify-center items-center md:block">
                                <div className="w-16 h-16 bg-green/20 rounded-full hidden md:flex items-center justify-center mx-auto mb-4">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-green">Budget For Free</h4>
                            </div>
                            <p className="text-white/70 ">
                                No hidden fees, no free trial. CashCat is built to be accessible to everyone who wants better financial control.
                                <span className="text-xs md:text-sm block mt-1 text-white/60">*Core budgeting features always free, small fee may apply to optional bank syncing</span>
                            </p>
                        </div>

                        <div className="md:text-center p-6 glass-card-blue">
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

                        <div className="md:text-center p-6 glass-card-blue">
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

                    <h3 className="text-3xl md:text-4xl font-bold text-center mt-4 md:mt-6 mb-4 md:mb-12 text-white/90">
                        Say Hello to Control
                    </h3>

                    <div className="grid md:grid-cols-2 md:gap-8 md:mb-16">
                        
                        <div className="md:text-center p-6 glass-card-blue">
                            <div className="flex text-center justify-center items-center md:block">
                                <div className="w-16 h-16 bg-green/20 rounded-full hidden md:flex items-center justify-center mx-auto mb-4">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-green">Take Control of Every Penny</h4>
                            </div>
                            <p className="text-white/70">
                                Assign every penny a purpose before you spend it. You'll know exactly where your money is going with zero-based budgeting principles.
                            </p>
                        </div>

                        <div className="md:text-center p-6 glass-card-blue">
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
                    <div className="p-6 max-w-4xl mx-auto glass-card-blue">
                        <h3 className="font-bold text-2xl md:text-4xl text-center text-green mb-4">What is Zero-Based Budgeting?</h3>
                        <p className="text-lg md:text-xl text-white/80 text-center mb-4">
                            <strong className="font-bold text-green">Income - Assigned Money = 0</strong>
                        </p>
                        <p className="text-md text-white/70 text-center leading-4.5 md:leading-6">
                            Assign every penny a purpose before you spend it - savings, shopping, bills, paying off debt. 
                            Instead of tracking where your money went, you decide where it's going. Never wonder "where did my money go?" again.
                        </p>
                    </div>
                </div>


                {/** discord button/ */}
                <div className="text-center mt-4 mb-8">
                    <Link
                        href="https://discord.gg/C9mYnEdAQA"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-6 py-3 bg-[#5865F2] text-white font-medium rounded-lg hover:bg-[#4752C4] transition-all"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        Join our Discord Community
                    </Link>
                </div>


                {/* Common Questions */}
                <div id="common-questions" className="py-5 md:py-12 bg-white/[.02] rounded-2xl max-w-6xl mx-auto mb-16 glass-card-blue">
                    <div className="md:px-8">
                        <h3 className="text-2xl md:text-4xl font-bold text-center mb-4 md:mb-12 text-white">
                            Common Questions
                        </h3>
                        <div className="space-y-6">
                        
                            <div className="left-envelope-card">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "I've tried budgeting before and failed. How is this different?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    Traditional budgets fail because they're based on estimates. Zero-based budgeting uses the money in your accounts right now. 
                                    You're not guessing what you'll spend - you're deciding what each penny will do before you spend it.
                                </p>
                            </div>


                             <div className="left-envelope-card">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "What if I don't have much money to budget?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                     Budgeting is even more important when money is tight! Start by tracking where every penny goes, then look for small areas to cut back. Even budgeting £50 is better than not budgeting at all. 
                                </p>
                            </div>
                            
                            
                            <div className="left-envelope-card">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "This sounds complicated. How much time does it take?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    Initial setup: <span className="text-green">15-20 minutes</span>. Daily use: <span className="text-green">2 minutes</span> to log purchases and check your budget. 
                                    The time you save not worrying about money and the clarity you gain makes it completely worth it.
                                </p>
                            </div>

                            <div className="left-envelope-card">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "Is CashCat really free? What's the catch?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    Every core budgeting feature is completely free! Optional bank syncing has a small fee to cover third-party banking costs - we're not trying to profit from this feature, but we need to cover our costs.
                                </p>
                            </div>
                            
                            <div className="left-envelope-card">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "Can I really track multiple bank accounts in one place?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    Absolutely! Add as many accounts as you need - current, savings, credit cards, cash. See your complete financial picture and track spending across all accounts from one dashboard.
                                </p>
                            </div>

                            <div className="left-envelope-card">
                                <h4 className="text-lg font-semibold mb-2 text-green">
                                    "What if I have irregular income?"
                                </h4>
                                <p className="text-white/70 text-sm">
                                    CashCat is perfect for irregular income! Budget only the money you have right now. 
                                    When new money comes in, assign it immediately. No more stress about traditional monthly budgets that don't fit your reality.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Social Proof Section */}
                <div className="md:py-4 text-center max-w-5xl mx-auto glass-card-blue mt-9 py-4 md:px-10">
                    <h3 className="text-2xl md:text-3xl font-bold mb-8 text-white">
                        Join Users Taking Control
                    </h3>
                    <p className="text-lg text-white/80 mb-8">
                        CashCat is built by people who actually use zero-based budgeting daily. We understand the frustrations with other tools and are building something better.
                    </p>
                    
                    <div className="left-envelope-card mb-8">
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



                    <h4 className="text-2xl font-semibold mb-4 mt-8 md:mt-8 text-green">Coming Soon</h4>
                        <div className="grid gap-4 text-left md:justify-center">
                        
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-green rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <p className="text-white font-medium">CSV Imports and Exports</p>
                                    <p className="text-white/60 text-sm">Importing and exporting transactions (e.g. from bank statements)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-green/60 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <p className="text-white font-medium">Bank Integration</p>
                                    <p className="text-white/60 text-sm">Optional automatic transaction syncing (for a small fee to cover our costs)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-green/60 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <p className="text-white font-medium">Shared Budgets</p>
                                    <p className="text-white/60 text-sm">Share your budgets with friends, family, or roommates!</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-green/60 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <p className="text-white font-medium">Native Mobile App</p>
                                    <p className="text-white/60 text-sm">Budget on-the-go with native iOS and Android apps (don't worry, the webapp already works perfectly on mobile!)</p>
                                </div>
                            </div>
                        </div>
                            


                         {/** discord button/ */}
                        <div className="text-center mt-6">
                            <Link
                                href="https://discord.gg/C9mYnEdAQA"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white font-medium rounded-lg hover:bg-[#4752C4] transition-all text-sm"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                                </svg>
                                Chat with the community
                            </Link>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:p-0">
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
                            Demo
                        </Link>
                        <Link
                            href="/docs"
                            className="px-8 py-4 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all text-lg"
                        >
                            Documentation
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

                