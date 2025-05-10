'use client';

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function MobileNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="z-50 fixed bottom-0 left-0 right-0 h-16 border-t border-white/[.15] md:hidden">
            <div className="flex items-center justify-around h-full px-6 bg-black">
                <Link
                    href="/budget"
                    className={`flex flex-col items-center gap-1 transition-all ${
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
                            src="/home.svg"
                            alt="Dashboard"
                            width={20}
                            height={20}
                            className={`transition-opacity ${
                                isActive('/budget') 
                                ? 'opacity-100' 
                                : 'opacity-70'
                            }`}
                        />
                    </div>
                    <span className="text-xs">Dashboard</span>
                </Link>

                <div className="relative -top-6">
                    <Link
                        href="/budget/transactions/new"
                        className="flex flex-col items-center gap-1"
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
                    </Link>
                </div>

                <Link
                    href="/budget/transactions"
                    className={`flex flex-col items-center gap-1 transition-all ${
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
                            src="/file.svg"
                            alt="Transactions"
                            width={20}
                            height={20}
                            className={`transition-opacity ${
                                isActive('/budget/transactions') 
                                ? 'opacity-100' 
                                : 'opacity-70'
                            }`}
                        />
                    </div>
                    <span className="text-xs">Transactions</span>
                </Link>
            </div>
        </nav>
    );
}
