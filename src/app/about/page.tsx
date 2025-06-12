'use client';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "../components/logo";
import Link from 'next/link';


export default function About() {
    const router = useRouter();
    const [isAnimatingAway, setIsAnimatingAway] = useState(false);

    const handleClick = () => {
        router.back();
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen px-4 md:px-8 pb-8 gap-4 font-[family-name:var(--font-suse)]">
            <main className={`${isAnimatingAway ? "fade-out " : ""} transition-all flex flex-col gap-2 row-start-2 items-center max-w-4xl w-full fade-in`}>
                <div className="scale-75 sm:scale-100 text-center mb-4">
                    {Logo()}
                </div>
                
                <div className="space-y-6 sm:space-y-8 text-base sm:text-lg w-full">
                    {/* About CashCat Section */}
                    <div className="p-6 rounded-xl bg-white/[.05] text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-green">About CashCat</h1>
                        <p className="text-white/80 mb-4 leading-relaxed">
                            CashCat is a zero-based budgeting app that gives you complete control over your finances. 
                            Built on the principle that <strong className="text-green">Income - Assigned Money = 0</strong>, 
                            CashCat ensures every penny has a purpose before you spend it.
                        </p>
                        <div className="grid md:grid-cols-3 gap-4 mt-6">
                            <div className="bg-white/[.03] rounded-lg p-4">
                                <div className="w-12 h-12 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-green mb-2">Zero-Based Budgeting</h3>
                                <p className="text-sm text-white/70">Assign every penny a purpose before you spend it</p>
                            </div>
                            <div className="bg-white/[.03] rounded-lg p-4">
                                <div className="w-12 h-12 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-green mb-2">Real-Time Tracking</h3>
                                <p className="text-sm text-white/70">See instantly how much you can spend in each category</p>
                            </div>
                            <div className="bg-white/[.03] rounded-lg p-4">
                                <div className="w-12 h-12 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green">
                                        <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7Z" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        <path d="M8 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-green mb-2">Multiple Accounts</h3>
                                <p className="text-sm text-white/70">Manage all your bank accounts in one place</p>
                            </div>
                        </div>
                    </div>

                    

                    {/* Meet the Team Section */}
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Meet the CashCat Team</h2>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div onClick={() => {window.open("https://indigonolan.com"); return false;}} className="flex flex-col items-center text-center space-y-3 p-6 rounded-xl bg-white/[.05] transition-all duration-200 cursor-pointer hover:bg-white/[.1] hover:scale-[1.02]">
                                <div className="w-16 h-16 rounded-full bg-green/70 flex items-center justify-center">
                                    <Image
                                        src="/link.svg"
                                        alt="Visit Indigo's website"
                                        width={24}
                                        height={24}
                                        className="opacity-90"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Indigo Nolan</h3>
                                    <p className="text-base text-green font-medium mb-3">Co-Founder</p>
                                    <p className="text-sm text-white/70 leading-relaxed">
                                        Indigo spent years trying to find the perfect way to manage his money - and decided to build CashCat instead! 
                                        He's committed to tools that make personal finance accessible and intuitive.
                                    </p>
                                </div>
                            </div>

                            <div onClick={() => {window.open("https://github.com/Joshua-Wilcox"); return false;}} className="flex flex-col items-center text-center space-y-3 p-6 rounded-xl bg-white/[.05] transition-all duration-200 cursor-pointer hover:bg-white/[.1] hover:scale-[1.02]">
                                <div className="w-16 h-16 rounded-full bg-green/70 flex items-center justify-center">
                                    <Image
                                        src="https://avatars.githubusercontent.com/u/77212082?v=4"
                                        alt="Visit Josh's GitHub"
                                        width={24}
                                        height={24}
                                        className="opacity-90 rounded-full"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Josh Wilcox</h3>
                                    <p className="text-base text-green font-medium mb-3">Co-Founder</p>
                                    <p className="text-sm text-white/70 leading-relaxed">
                                        Josh is a multitalented passionate designer and developer who has clear visions and is committed to his work. 
                                        He brings the creative vision that makes CashCat both beautiful and functional.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-6 rounded-xl bg-white/[.05] text-center">
                            <h3 className="text-lg sm:text-xl font-semibold mb-3">Our Story</h3>
                            <p className="text-white/70 leading-relaxed mb-4">
                                Josh and Indigo are students at the University of Southampton, where we met and discovered our shared interest for building tools 
                                that solve real problems. CashCat started as a personal project to create the budgeting app we wished existed - 
                                one that truly puts you in control of your money.
                            </p>
                            <p className="text-white/60 text-sm">
                                We believe that everyone deserves to feel confident about their finances, and CashCat is our contribution to making that happen.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/learn"
                            className="text-center px-6 py-3 bg-green text-black font-semibold rounded-lg hover:bg-green-dark transition-all text-base"
                        >
                            Learn How CashCat Works
                        </Link>
                        <button
                            onClick={handleClick}
                            className="px-6 py-3 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all text-base"
                        >
                            Back to Budget
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
