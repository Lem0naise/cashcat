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
            router.push("/budget/");
        }, 500);
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-suse)]">
            <main className={`${isAnimatingAway ? "fade-out " : ""} transition-all flex flex-col gap-[32px] row-start-2 items-center max-w-2xl`}>
                {Logo()}
                
                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/[.15] w-full">
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

                {/* Envelope Budgeting Content */}
                <div className={`space-y-6 text-lg transition-all duration-200 ${activeTab === 'envelope' ? 'opacity-100' : 'hidden opacity-0'}`}>
                    <h1 className="text-2xl font-bold mb-6">Envelope Budgeting: A Simple Way to Master Your Money</h1>
                    
                    <section>
                        <h2 className="text-xl font-semibold mb-3">What is Envelope Budgeting?</h2>
                        <p>Envelope budgeting is a simple yet powerful method where you divide your income into different categories (envelopes) at the beginning of each month. Each envelope represents a specific expense category like groceries, rent, or entertainment.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">How It Works</h2>
                        <ol className="list-decimal list-inside space-y-2">
                            <li>Determine your monthly income</li>
                            <li>Create categories for all your expenses</li>
                            <li>Allocate your income across these categories</li>
                            <li>Only spend what's in each envelope</li>
                            <li>When an envelope is empty, stop spending in that category</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">Benefits</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Better spending awareness</li>
                            <li>Prevents overspending</li>
                            <li>Helps achieve savings goals</li>
                            <li>Makes budgeting tangible and practical</li>
                        </ul>
                    </section>

                    Envelope budgeting is essential for CashCat to allow you to manage your money with ease!

                    <div className="mt-8 flex justify-center">
                        {OpenButton('Start Budgeting Now', '/budget/', true, handleClick)}
                    </div>
                </div>

                {/* Team Content */}
                <div className={`space-y-6 text-lg transition-all duration-200 ${activeTab === 'team' ? 'opacity-100' : 'hidden opacity-0'}`}>
                    <h1 className="text-2xl font-bold mb-6">Meet the CashCat Team</h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl bg-white/[.03]">
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

                        <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-xl bg.white/[.03]">
                            <div className="w-24 h-24 rounded-full bg-green/20 flex items-center justify-center">
                                <Image
                                    src="/globe.svg"
                                    alt="CashCat"
                                    width={32}
                                    height={32}
                                    className="opacity-70"
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">CashCat</h3>
                                <p className="text-base text-black/70 dark:text.white/70">
                                    Financial Companion
                                </p>
                                <p className="mt-4 text-sm">
                                    Your friendly guide to better financial habits and smarter money management.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <h3 className="text-xl font-semibold mb-4">Our Mission</h3>
                        <p className="text-base text-black/70 dark:text.white/70">
                            We believe everyone deserves access to simple, effective tools for managing their finances. 
                            CashCat is built with love and attention to detail, focusing on making budgeting accessible and even enjoyable.
                        </p>
                        <div className="mt-8 flex justify-center">
                            {OpenButton('Join Us Now', '/budget/', true, handleClick)}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
