'use client';


import {useEffect, useState} from "react";

type CategoryProps = {
    name: string,
    amount: number,
    goal:number,
}

export default function Category({name, amount, goal}: CategoryProps) {

    const [progress, setProgress] = useState<number>(0);
    useEffect(() => {
        setProgress(amount/goal);
    }, [])

    return (
        <div className="category p-4 border-b-4 flex flex-col">
            <div className="flex gap-3">
                <h3><strong>{name}:</strong></h3>
                <p>£{amount.toFixed(2)}</p>
                <p>/</p>
                <p>£{goal.toFixed(2)}</p>
            </div>
            <div className=" rounded progress-bar h-4 bg-green-dark w-full mb-2">
                <div className="rounded progress bg-green h-4 float-right"
                     style={{width:`${progress*100}%`}}>
                </div>
            </div>
        </div>
    )
}