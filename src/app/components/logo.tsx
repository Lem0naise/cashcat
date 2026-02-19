import Image from 'next/image';
import Link from 'next/link';
export default function Logo() {
    return (
        <Link href="/">
            <div className="flex items-center gap-3 sm:justify-center">
                <Image
                    src="/logo.png"
                    alt="CashCat Logo"
                    width={48}
                    height={48}
                    className="rounded-xl"
                />
                <div className={`text-green text-3xl`}><strong>Cash<span className='inline text-white'>Cat</span></strong></div>
            </div>
        </Link>
    );
}

