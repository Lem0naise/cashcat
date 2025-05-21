'use client';

import { useRouter } from "next/navigation";


const OpenButton = (text: string, white:boolean, click:()=>void) => {
    const router = useRouter();
    return (
        <a
            className={`cursor-pointer rounded-full border border-solid ${white ? 'bg-green text-background' : ''} border-black/[.09] dark:border-white/[.15] transition-all duration-400 flex items-center justify-center ${white ? "hover:bg-[#494949] dark:hover:bg-green-dark hover:text-foreground" : "hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a]"} hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]`}
            rel="noopener noreferrer"
            onClick={click}
        >
            {text}
        </a>
    )
}

export default OpenButton;