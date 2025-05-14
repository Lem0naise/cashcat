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
                    <h1 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-6">Take Control of Your Money with CashCat</h1>
                    
                    <section>
                        <p className="text-sm sm:text-base">CashCat uses digital envelopes to help you budget. We call these Categories - like "Groceries" or "Rent". Categories are organized into Groups like "Essentials" or "Entertainment", making it easy to track similar expenses together.</p>
                    </section>

                    <section>
                        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Getting Started is Easy</h2>
                        <ol className="list-decimal list-inside space-y-1 sm:space-y-2 text-sm sm:text-base leading-tight sm:leading-normal">
                            <li>Create Groups to organize your spending (like "Bills", "Essentialls")</li>
                            <li>Add Categories within each Group (like "Groceries" in "Essentials")</li>
                            <li>Set a monthly budget for each Category</li>
                            <li>Record your Transactions in the right Categories</li>
                            <li>Watch your spending and stay within budget</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Why It Works</h2>
                        <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base">
                            <li>See exactly where your money is going</li>
                            <li>Make spending money a conscious decision</li>
                            <li>Track progress towards savings goals</li>
                            <li>Keep your budget organised</li>
                        </ul>
                    </section>

                    <p className="text-sm sm:text-base text-white/80">CashCat makes it simple to manage your money by showing you exactly how much you can spend this month in each Category. Try not to go over!</p>

                    <div className="mt-8 flex justify-center">
                        {OpenButton('Start Budgeting', true, handleClick)}
                    </div>
                </div>

                {/* Team Content */}
                <div className={`space-y-4 sm:space-y-6 text-base sm:text-lg transition-all duration-200 ${activeTab === 'team' ? 'opacity-100' : 'hidden opacity-0'}`}>
                    <h1 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">Meet the CashCat Team</h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 p-4 sm:p-6 rounded-xl bg-white/[.03]">
                            <div className="w-24 h-24 rounded-full bg-green/20 flex items-center justify-center">
                                <Image
                                    src="/window.svg"
                                    alt="Team member"
                                    width={32}
                                    height={32}
                                    className="opacity-70"
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Indigo Nolan</h3>
                                <p className="text-base text-white/70">
                                    Lead Engineer & Designer
                                </p>
                                <p className="mt-4 text-sm">
                                    Passionate about creating easy-to-use financial tools to help people manage their money.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl bg-black/[.03] dark:bg.white/[.03]">
                            <div className="w-24 h-24 rounded-full bg-green/20 flex items-center justify-center">
                                <Image
                                    src="/window.svg"
                                    alt="Team Member"
                                    width={32}
                                    height={32}
                                    className="opacity-70"
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Josh Wilcox</h3>
                                <p className="text-base text-black/70 dark:text.white/70">
                                    Developer
                                </p>
                                <p className="mt-4 text-sm">
                                    A skilled developer who wants to deliver the best experience to all our users. 
                                </p>
                            </div>
                        </div>

                    </div>

                    <div className="mt-6 sm:mt-8">
                        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Our Mission</h3>

                        <ol className="text-sm sm:text-base text.white/70 text-left list-decimal list-inside space-y-1.5 sm:space-y-2 leading-tight sm:leading-normal">
                            <li>We know that envelope budgeting works well</li>
                            <li>We believe everybody deserves access to a simple, effective tool to manage their finances</li>
                            <li>We also believe it shouldn't cost an arm and a leg</li>
                            <li>What's the point of a budgeting app that loses you money!</li>
                            <li>CashCat is built with love and attention to detail. All of our team use it daily for our own budgeting!</li>
                        </ol>
                        <div className="mt-8 flex justify-center">
                            {OpenButton('Join Us Now', true, handleClick)}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
