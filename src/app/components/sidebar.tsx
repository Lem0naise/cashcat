'use client';

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className="fixed left-0 top-16 bottom-0 w-64 bg-background/95 backdrop-blur-sm border-r border-white/[.15] p-4 hidden md:block font-[family-name:var(--font-suse)] fade-in">
            <div className="flex flex-col gap-4">
                <div className="text-sm font-semibold mb-4 text-white/60 uppercase tracking-wider">Menu</div>
               
                <a
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group ${
                        isActive('/budget') 
                        ? 'bg-green/10 text-green' 
                        : 'hover:bg-white/[.05]'
                    }`}
                    href="/budget"
                >
                    <Image
                        aria-hidden
                        src="/money.svg"
                        alt="Money icon"
                        width={16}
                        height={16}
                        className={` image-black transition-opacity ${
                            isActive('/budget') 
                            ? 'opacity-100' 
                            : 'opacity-70 group-hover:opacity-100'
                        }`}
                    />
                    <span className="text-sm">Money</span>
                </a>
                 <a
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group ${
                        isActive('/stats') 
                        ? 'bg-green/10 text-green' 
                        : 'hover:bg-white/[.05]'
                    }`}
                    href="/stats"
                >
                    <Image
                        aria-hidden
                        src="/stats.svg"
                        alt="Home icon"
                        width={16}
                        height={16}
                        className={`image-black transition-opacity ${
                            isActive('/stats') 
                            ? 'opacity-100' 
                            : 'opacity-70 group-hover:opacity-100'
                        }`}
                    />
                    <span className="text-sm">Stats</span>
                </a>
                <a
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group ${
                        isActive('/budget/transactions') 
                        ? 'bg-green/10 text-green' 
                        : 'hover:bg-white/[.05]'
                    }`}
                    href="/budget/transactions"
                >
                    <Image
                        aria-hidden
                        src="/transactions.svg"
                        alt="Transactions icon"
                        width={16}
                        height={16}
                        className={`image-black transition-opacity ${
                            isActive('/budget/transactions') 
                            ? 'opacity-100' 
                            : 'opacity-70 group-hover:opacity-100'
                        }`}
                    />
                    <span className="text-sm">Transactions</span>
                </a>
                <a
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 group ${
                        isActive('/account') 
                        ? 'bg-green/10 text-green' 
                        : 'hover:bg-white/[.05]'
                    }`}
                    href="/account"
                >
                    <Image
                        aria-hidden
                        src="/account.svg"
                        alt="Account icon"
                        width={16}
                        height={16}
                        className={`image-black transition-opacity ${
                            isActive('/account') 
                            ? 'opacity-100' 
                            : 'opacity-70 group-hover:opacity-100'
                        }`}
                    />
                    <span className="text-sm">Account</span>
                </a>
            </div>
        </aside>
    );
}
