'use client';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "../components/logo";
import OpenButton from "../components/openButton";


export default function About() {
    const router = useRouter();
    const [isAnimatingAway, setIsAnimatingAway] = useState(false);

    const handleClick = () => {
        setIsAnimatingAway(true);
        setTimeout(() => {
            router.push("/budget");
        }, 500);
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen px-8 pb-8 gap-4 font-[family-name:var(--font-suse)]">
            <main className={`${isAnimatingAway ? "fade-out " : ""} transition-all flex flex-col gap-2 row-start-2 items-center max-w-2xl w-full fade-in`}>
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
                                    Josh is a multitalented passionate designer and developer who has clear visions and is commited to his work.
                                </p>
                            </div>
                        </div>

                    </div>

                    <div className="mt-8 sm:mt-12 p-6 rounded-xl bg-white/[.05] flex flex-col items-center gap-4">
                        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-center">Who We Are</h3>
                        <p className="text-white/70">Josh and I are students at the University of Southampton, where we met.</p>

                        <button
                                onClick={() => router.push('/learn')}
                                className="px-2 py-2 bg-green text-black font-semibold rounded-lg hover:bg-green-dark transition-all text-lg w-1/2 "
                            >
                                Learn how CashCat works
                        </button>
                        <button
                            onClick={handleClick}
                            className="px-2 py-2 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all text-lg w-1/2"
                        >
                            Done Reading
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
