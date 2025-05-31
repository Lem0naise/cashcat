'use client';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "../components/logo";
import OpenButton from "../components/openButton";


export default function LearnMore() {
    const router = useRouter();
    const [isAnimatingAway, setIsAnimatingAway] = useState(false);

    const handleClick = () => {
        setIsAnimatingAway(true);
        setTimeout(() => {
            router.push("/");
        }, 500);
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen px-8 pb-8 gap-4 sm:p-20 sm:gap-16 font-[family-name:var(--font-suse)]">
            <main className={`${isAnimatingAway ? "fade-out " : ""} transition-all flex flex-col gap-2 sm:gap-[32px] row-start-2 items-center max-w-2xl w-full fade-in`}>
                <div className="scale-75 sm:scale-100 text-center">
                    {Logo()}</div>
                
                <div className="space-y-4 sm:space-y-6 text-base sm:text-lg">
                    <h1 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Meet the CashCat Team</h1>
                    
                    <div className="flex gap-2">
                        <div onClick={() => {window.open("https://indigonolan.com"); return false;}} className="flex flex-col items-center text-center space-y-3 p-4 rounded-xl bg-white/[.05] transition-bg duration-200 cursor-pointer hover:bg-white/[.2]">
                            <div className="w-12 h-12 rounded-full bg-green/70 flex items-center justify-center">
                                <Image
                                    src="/link.svg"
                                    alt="Co-Founder"
                                    width={24}
                                    height={24}
                                    className="opacity-70"
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Indigo Nolan</h3>
                                <p className="text-base text-white/70">Co-Founder</p>
                                <p className="mt-4 text-sm">
                                    Indigo spent years trying to find the perfect way to manage his money - and decided to build CashCat instead!
                                </p>
                            </div>
                        </div>

                        <div onClick={() => {window.open("https://github.com/Joshua-Wilcox"); return false;}} className="flex flex-col items-center text-center space-y-3 p-4 rounded-xl bg-white/[.05] transition-bg duration-200 cursor-pointer hover:bg-white/[.2]">
                            <div className="w-12 h-12 rounded-full bg-green/70 flex items-center justify-center">
                                <Image
                                    src="/link.svg"
                                    alt="Co-Founder"
                                    width={24}
                                    height={24}
                                    className="opacity-70"
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Josh Wilcox</h3>
                                <p className="text-base text-white/70">Co-Founder </p>
                                <p className="mt-4 text-sm">
                                    Josh is a multitalented passionate designer and developer who won't stop until his vision is complete.
                                </p>
                            </div>
                        </div>

                    </div>

                    <div className="mt-8 sm:mt-12 p-6 rounded-xl bg-white/[.05]">
                        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-center">How CashCat Works</h3>
                        
                        <div className="space-y-4 text-sm sm:text-base">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-0.5">1</div>
                                <div>
                                    <h4 className="font-medium mb-1">Start with Your Money</h4>
                                    <p className="text-white/70">Tell CashCat how much money you have in your account right now.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-0.5">2</div>
                                <div>
                                    <h4 className="font-medium mb-1">Give Every Pound a Job</h4>
                                    <p className="text-white/70">Create categories like "Food", "Bills", "Savings" and assign money to each one until you reach zero.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-0.5">3</div>
                                <div>
                                    <h4 className="font-medium mb-1">Spend Within Your Categories</h4>
                                    <p className="text-white/70">When you buy something, log it and watch your available money in that category adjust instantly.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-0.5">4</div>
                                <div>
                                    <h4 className="font-medium mb-1">Stay in Control</h4>
                                    <p className="text-white/70">Always know exactly how much you can spend in each area. No overspending surprises!</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 p-4 bg-green/10 rounded-lg border border-green/20">
                            <h4 className="font-bold text-green mb-2 text-center">The Zero-Based Secret</h4>
                            <p className="text-sm text-white/80 text-center">
                                 <strong className="font-bold">Income - Assigned Money = 0. </strong><br/> Every penny has a purpose before you spend it. <br/>Never wonder "where did my money go?" again.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-8">
                        
                        <div className="mt-8 flex justify-center">
                            {OpenButton('Done Reading', true, handleClick)}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
