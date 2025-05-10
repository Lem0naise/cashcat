'use client';

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const isActive = (path: string) => {
        return pathname === path;
    };

    return (
        <aside className="fixed left-0 top-16 bottom-0 w-64 bg-background/95 backdrop-blur-sm border-r border-black/[.09] dark:border-white/[.15] p-4 hidden md:block font-[family-name:var(--font-suse)] fade-in">
            <div className="flex flex-col gap-4">
                <div className="text-sm font-semibold mb-4 text-black/60 dark:text-white/60 uppercase tracking-wider">Menu</div>
                <a
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group ${
                        isActive('/budget') 
                        ? 'bg-green/10 text-green' 
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a]'
                    }`}
                    href="/budget"
                >
                    <Image
                        aria-hidden
                        src="/home.svg"
                        alt="Dashboard icon"
                        width={16}
                        height={16}
                        className={`transition-opacity ${
                            isActive('/budget') 
                            ? 'opacity-100' 
                            : 'opacity-70 group-hover:opacity-100'
                        }`}
                    />
                    <span className="text-sm">Dashboard</span>
                </a>
                <a
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group ${
                        isActive('/budget/transactions') 
                        ? 'bg-green/10 text-green' 
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a]'
                    }`}
                    href="/budget/transactions"
                >
                    <Image
                        aria-hidden
                        src="/file.svg"
                        alt="Transactions icon"
                        width={16}
                        height={16}
                        className={`transition-opacity ${
                            isActive('/budget/transactions') 
                            ? 'opacity-100' 
                            : 'opacity-70 group-hover:opacity-100'
                        }`}
                    />
                    <span className="text-sm">Transactions</span>
                </a>
            </div>
        </aside>
    );
}
