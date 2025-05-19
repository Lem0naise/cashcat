'use client';
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "../components/logo";
import OpenButton from "../components/openButton";
import Image from "next/image";

export default function LearnMore() {
    const router = useRouter();
    const [isAnimatingAway, setIsAnimatingAway] = useState(false);
    const [activeTab, setActiveTab] = useState('envelope');

    const handleClick = () => {
        setIsAnimatingAway(true);
        setTimeout(() => {
            router.push("/budget");
        }, 500);
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen px-8 pb-8 gap-4 sm:p-20 sm:gap-16 font-[family-name:var(--font-suse)]">
            <main className={`${isAnimatingAway ? "fade-out " : ""} transition-all flex flex-col gap-2 sm:gap-[32px] row-start-2 items-center max-w-2xl w-full fade-in`}>
                <div className="scale-75 sm:scale-100">
                    {Logo()}</div>
                
                {/* Tabs */}
                <div className="flex gap-2 sm:gap-4 border-b border-white/[.15] w-full text-sm sm:text-base">
                    <button 
                        onClick={() => setActiveTab('envelope')}
                        className={`px-4 py-2 transition-all duration-200 ${
                            activeTab === 'envelope' 
                            ? 'text-green border-b-2 border-green' 
                            : 'dark:text-white/60 hover:text-white'
                        }`}
                    >
                        Envelope Budgeting
                    </button>
                    <button 
                        onClick={() => setActiveTab('team')}
                        className={`px-4 py-2 transition-all duration-200 ${
                            activeTab === 'team' 
                            ? 'text-green border-b-2 border-green' 
                            : 'text-white/60 hover:text-white'
                        }`}
                    >
                        About the Team
                    </button>
                </div>

                <div className={`space-y-3 sm:space-y-6 text-sm sm:text-lg transition-all duration-200 ${activeTab === 'envelope' ? 'opacity-100' : 'hidden opacity-0'}`}>
                    <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-6">Take Control of Your Money</h1>
                    
                    <section>
                        <p className="text-sm sm:text-base text-white/70">CashCat uses digital envelopes to help you budget. Learn to think using <span className="text-green">Groups</span>, <span className="text-green">Categories</span> and <span className="text-green">Assignments</span>.</p>
                    </section>

                    <section>
                        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Getting Started is Easy</h2>
                        <ol className="list-decimal list-inside space-y-1 sm:space-y-2 text-sm sm:text-base leading-tight sm:leading-normal">
                            <li>Set your <span className="text-green">Starting Balance</span> - the money in your bank account right now.</li>
                            <li>Create <span className="text-green">Groups</span> to organize your spending (like "Bills", "Food").</li>
                            <li>Add <span className="text-green">Categories</span> within each <span className="text-green">Group</span> (like "Groceries" in "Food").</li>
                            <li>Set a monthly budget for each <span className="text-green">Category</span>.</li>
                            <li><span className="text-green">Assign</span> money each month to every <span className="text-green">Category</span> by tapping on it.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Why It Works</h2>
                        <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base">
                            <li>Each transaction is categorised.</li>
                            <li>See exactly where your money is going.</li>
                            <li>Make spending money a conscious decision.</li>
                            <li>Track progress towards savings goals.</li>
                        </ul>
                    </section>

                    <div className="mt-8 flex justify-center">
                        {OpenButton('Done Reading', true, handleClick)}
                    </div>
                </div>

                {/* Team Content */}
                <div className={`space-y-4 sm:space-y-6 text-base sm:text-lg transition-all duration-200 ${activeTab === 'team' ? 'opacity-100' : 'hidden opacity-0'}`}>
                    <h1 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">Meet the CashCat Team</h1>
                    
                    <div className="flex gap-2">
                        <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-xl bg-white/[.05]">
                            <div className="w-12 h-12 rounded-full bg-green/20 flex items-center justify-center">
                                <Image
                                    src="/money.svg"
                                    alt="Team member"
                                    width={24}
                                    height={24}
                                    className="opacity-70"
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Indigo Nolan</h3>
                                <p className="text-base text-white/70">Co-Founder</p>
                                <p className="mt-4 text-sm">
                                    No other money management tool  worked for me - so I made one myself!
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-xl bg-white/[.05]">
                            <div className="w-12 h-12 rounded-full bg-green/20 flex items-center justify-center">
                                <Image
                                    src="/money.svg"
                                    alt="Team Member"
                                    width={24}
                                    height={24}
                                    className="opacity-70"
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Josh Wilcox</h3>
                                <p className="text-base text-white/70">Co-Founder </p>
                                <p className="mt-4 text-sm">
                                    Josh is yet to write a description for himself, but he's an amazing developer!
                                </p>
                            </div>
                        </div>

                    </div>

                    <div className="mt-6 sm:mt-8">
                        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Our Mission</h3>

                        <ol className="text-sm sm:text-base text.white/70 text-left list-decimal list-inside space-y-1.5 sm:space-y-2 leading-tight sm:leading-normal">
                            <li>We know envelope budgeting works.</li>
                            <li>We believe everybody deserves access to a simple tool to manage their money.</li>
                            <li>We also believe it shouldn't be expensive - otherwise what's the point!</li>
                            <li>CashCat is built with love and attention to detail. All of our team use it daily for our own budgeting!</li>
                        </ol>
                        <div className="mt-8 flex justify-center">
                            {OpenButton('Done Reading', true, handleClick)}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
