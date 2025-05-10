'use client';

import {useEffect, useState} from "react";

type CategoryProps = {
    name: string,
    assigned: number,
    spent: number,
    goalAmount: number,
    group?: string,
    showGroup?: boolean
}

export default function Category({name, assigned, spent, goalAmount, group, showGroup = true}: CategoryProps) {
    const [progress, setProgress] = useState<number>(0);
    const remaining = assigned - spent;
    
    useEffect(() => {
        setProgress(assigned/goalAmount);
    }, [assigned, goalAmount])

    return (
        <div className="category p-3 md:p-4 border-b-4 flex flex-col bg-black/[.02] dark:bg-white/[.02] rounded-lg">
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                    <div className="flex justify-between md:block">
                        <h3 className="text-sm md:text-base"><strong>{name}</strong></h3>
                        {showGroup && group && (
                            <span className="text-xs text-black/50 dark:text-white/50 md:hidden">
                                {group}
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xs text-black/50 dark:text-white/50">Goal:</span>
                        <p className="text-sm">£{goalAmount.toFixed(2)}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`font-bold ${remaining >= 0 ? 'text-green' : 'text-reddy'}`}>
                        £{remaining.toFixed(2)}
                    </p>
                    <p className='text-xs text-white/50'>{remaining >= 0 ? "left" : "overspent"}</p>
                </div>
            </div>

            <div className="mt-3">
                <div className="relative">
                    <div className="rounded h-2 md:h-4 bg-green-dark/20 w-full">
                        <div 
                            className="rounded h-full bg-green transition-all duration-500 ease-out absolute top-0 left-0"
                            style={{width: `${(assigned / goalAmount) * 100}%`}}
                        />
                        {spent > 0 && (
                            <div 
                                className={`rounded h-full transition-all duration-500 ease-out absolute top-0 left-0 ${remaining >= 0 ? 'bg-gray-500/100' : 'bg-red-700/70'}`}
                                style={{
                                    width: `${Math.min(spent / goalAmount, assigned / goalAmount) * 100}%`,
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)'
                                }}
                            />
                        )}
                    </div>
                </div>
                <div className="flex justify-between mt-2">
                    <div className="flex gap-1 items-baseline">
                        <span className="text-xs text-black/50 dark:text-white/50">Assigned:</span>
                        <p className="text-sm">£{assigned.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1 items-baseline">
                        <span className="text-xs text-black/50 dark:text-white/50">Spent:</span>
                        <p className="text-sm text-reddy">£{spent.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {showGroup && group && (
                <span className="text-xs text-black/50 dark:text-white/50 hidden md:block mt-2">
                    {group}
                </span>
            )}
        </div>
    )
}