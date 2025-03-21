'use client';
import Image from "next/image";
import Footer from "../components/footer";
import Logo from "../components/logo";
import Button from "../components/button";
import Category from "@/app/features/Category";
import {useEffect, useState} from "react";


type Cat = {
    id: number,
    name: string,
    currentAmount: number,
    goalAmount: number
}

export default function Home(){

    const [categories, setCategories] = useState<Cat[]>([]);

    useEffect(()=>{
        setCategories([...categories,
        {id:1, name:'Groceries', currentAmount:92.40, goalAmount: 400},
        {id:2, name:'Takeouts', currentAmount:22.63, goalAmount: 90},
        {id:3, name:'Savings', currentAmount:720.08, goalAmount: 1000},
    ]);
    }, [])

    return(
        <div className=" grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-suse)]">
            <main className="fade-in flex flex-col gap-[32px] row-start-2 items-center ">
                <Logo/>
                <div className={` grid-cols-2 gap-4 items-center flex-col sm:flex-row`}>
                    <ol className="list-inside text-base/6 sm:text-base/6 text-center font-[family-name:var(--font-suse)]">
                        <li className="mb-2 tracking-[-.01em]">
                            Welcome to <b>your</b> budget.
                        </li>
                    </ol>
                </div>

                <div className={` grid-cols-4 gap-4 items-center flex-col sm:flex-row`}>
                    {categories.map((category, index) => (
                        <Category
                        key={index}
                        name={category.name}
                        amount={category.currentAmount}
                        goal={category.goalAmount}
                        />
                    ))}
                </div>

                <div className="flex gap-4 items-center flex-col sm:flex-row">
                </div>
            </main>
            <Footer/>
        </div>
    );
}
