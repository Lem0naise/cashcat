'use client';

import Logo from "./logo";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
    const router = useRouter();

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-b border-black/[.09] dark:border-white/[.15] px-4 flex items-center justify-between z-50 fade-in font-[family-name:var(--font-suse)]">
            <div className="flex items-center gap-4">
                <div className="scale-50 origin-left transition-transform hover:scale-[0.52] cursor-pointer">
                    <Logo />
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <a
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a]"
                    href="/learn"
                    rel="noopener noreferrer"
                >
                    <Image
                        aria-hidden
                        src="/globe.svg"
                        alt="Learn icon"
                        width={16}
                        height={16}
                        className="opacity-70"
                    />
                    <span className="text-sm">Learn</span>
                </a>
                <a
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a]"
                    href="/account"
                    rel="noopener noreferrer"
                >
                    <Image
                        aria-hidden
                        src="/account.svg"
                        alt="Account icon"
                        width={16}
                        height={16}
                        className="opacity-70"
                    />
                    <span className="text-sm">Account</span>
                </a>
            </div>
        </nav>
    );
}
