import Image from "next/image";


export function Button(text: string, link:string, white:boolean) {
  return (
      <a
          className={`rounded-full border border-solid ${white ? 'bg-foreground text-background' : ''} border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center ${white ? "hover:bg-[#494949] dark:hover:bg-[#777777]" : "hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"} hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]`}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
      >
        {text}
      </a>
      )
}

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-suse)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center ">
        <b className = "text-7xl">CashCat</b>
        <ol className="list-inside text-base/6 sm:text-base/6 text-center font-[family-name:var(--font-suse)]">
          <li className="mb-2 tracking-[-.01em]">
            Your money is <b>your</b> money.
          </li>
          <li className="tracking-[-.01em]">
            You deserve peace of mind that it's going to what <b>you</b> want.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          {Button('Deploy now!', '', true)}
          {Button('Say hi to the cat!', '', false)}
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
