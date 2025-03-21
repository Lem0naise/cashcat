'use client'

import {useRouter} from "next/navigation";
import Image from "next/image";

const Footer = ()=> {
    return (
        <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
            <a
                className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                href="/"
                rel="noopener noreferrer"
            >
                <Image
                    aria-hidden
                    src="/file.svg"
                    alt="File icon"
                    width={16}
                    height={16}
                />
                Home
            </a>
            <a
                className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                href="/account"
                rel="noopener noreferrer"
            >
                <Image
                    aria-hidden
                    src="/globe.svg"
                    alt="Globe icon"
                    width={16}
                    height={16}
                />
                Account
            </a>
        </footer>
    )
}

export default Footer;
