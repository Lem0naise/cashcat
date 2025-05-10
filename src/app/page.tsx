'use client';
import Image from "next/image";
import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";

import Button from "./components/button";
import OpenButton from "./components/openButton";
import Logo from "./components/logo";


export default function Home() {

    const router = useRouter();
    const [isAnimatingAway, setIsAnimatingAway] = useState(false);

    const handleClick = () => {
        setIsAnimatingAway(true);
        setTimeout(() => {
            router.push("/budget/");
        }, 500);
    };


  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-suse)]">
      <main className={`${isAnimatingAway ? "fade-out " : ""} transition-all flex flex-col gap-[32px] row-start-2 items-center `}>
          {Logo()}
        <ol className={`list-inside text-base/6 sm:text-base/6 text-center font-[family-name:var(--font-suse)]`}>
          <li className="mb-2 tracking-[-.01em]">
            Your money should be <b>yours</b>.
          </li>
          <li className="tracking-[-.01em]">
              Get peace of mind that it's going where <b>you want</b>.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          {OpenButton('Open budget', '/budget/', true, handleClick)}
          {Button('Learn more', '', false)}
        </div>
      </main>
    </div>
  );
}
