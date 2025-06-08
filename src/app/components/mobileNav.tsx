'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function MobileNav() {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;
    const router = useRouter();
    
    const handleAddClick = () => {
        // Always navigate with the showModal parameter
        router.push('/budget/transactions?showModal=true');
    };

    return (
        <nav className="iphone-padding-container z-50 fixed bottom-0 left-0 right-0 h-16 border-t border-white/[.15] md:hidden font-[family-name:var(--font-suse)]">
            <div className="iphone-padding relative flex w-full h-full bg-black">
                <div className="w-full grid grid-cols-5 px-2">
                    <Link
                        href="/budget"
                        className={`touch-manipulation flex flex-col items-center justify-center transition-all ${
                            isActive('/budget') 
                            ? 'text-green' 
                            : 'text-white/60'
                        }`}
                    >
                        <div className={`p-2 rounded-full transition-all ${
                            isActive('/budget') 
                            ? 'bg-green' 
                            : 'bg-white/20'
                        }`}>
                            <Image
                                src="/money.svg"
                                alt="Budget"
                                width={20}
                                height={20}
                                className={`transition-opacity ${
                                    isActive('/budget') 
                                    ? 'opacity-100' 
                                    : 'image-black opacity-70'
                                }`}
                            />
                        </div>
                        <span className="text-xs">Budget</span>
                    </Link>

                      <Link
                        href="/stats"
                        className={`touch-manipulation flex flex-col items-center justify-center transition-all ${
                            isActive('/stats') 
                            ? 'text-green' 
                            : 'text-white/60'
                        }`}
                    >
                        <div className={`p-2 rounded-full transition-all ${
                            isActive('/stats') 
                            ? 'bg-green' 
                            : 'bg-white/20'
                        }`}>
                            <Image
                                src="/stats.svg"
                                alt="Home"
                                width={20}
                                height={20}
                                className={`transition-opacity ${
                                    isActive('/stats') 
                                    ? 'opacity-100' 
                                    : 'image-black opacity-70'
                                }`}
                            />
                        </div>
                        <span className="text-xs">Stats</span>
                    </Link>

                      <div></div>

                    <Link
                        href="/budget/transactions"
                        className={`touch-manipulation flex flex-col items-center justify-center transition-all ${
                            isActive('/budget/transactions') 
                            ? 'text-green' 
                            : 'text-white/60'
                        }`}
                    >
                        <div className={`p-2 rounded-full transition-all ${
                            isActive('/budget/transactions') 
                            ? 'bg-green' 
                            : 'bg-white/20'
                        }`}>
                            <Image
                                src="/transactions.svg"
                                alt="Transactions"
                                width={20}
                                height={20}
                                className={`transition-opacity ${
                                    isActive('/budget/transactions') 
                                    ? 'opacity-100' 
                                    : 'opacity-70 image-black'
                                }`}
                            />
                        </div>
                        <span className="text-xs">Transactions</span>
                    </Link>

                      
                    <Link
                        href="/account"
                        className={`touch-manipulation flex flex-col items-center justify-center transition-all ${
                            isActive('/account') 
                            ? 'text-green' 
                            : 'text-white/60'
                        }`}
                    >
                        <div className={`p-2 rounded-full transition-all ${
                            isActive('/account') 
                            ? 'bg-green' 
                            : 'bg-white/20'
                        }`}>
                            <Image
                                src="/account.svg"
                                alt="Account"
                                width={20}
                                height={20}
                                className={`transition-opacity ${
                                    isActive('/account') 
                                    ? 'opacity-100' 
                                    : 'image-black opacity-70'
                                }`}
                            />
                        </div>
                        <span className="text-xs">Account</span>
                    </Link>
                </div>

                {/* Floating add button */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                    <button
                        onClick={handleAddClick}
                        className="flex flex-col items-center touch-manipulation"
                    >
                        <div className="p-4 rounded-full bg-green text-background shadow-lg">
                            <Image
                                src="/plus.svg"
                                alt="Add"
                                width={24}
                                height={24}
                                className="opacity-100"
                            />
                        </div>
                    </button>
                </div>

            
            </div>

        </nav>
    );
}
