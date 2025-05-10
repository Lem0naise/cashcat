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
        <div className="category p-3 md:p-4 border-b-4 flex flex-col bg-white/[.05] rounded-lg">
            <div className="flex justify-between items-start">
                <h3 className="text-base md:text-lg font-bold">{name}</h3>
                <div className="text-right">
                    <p className={`text-lg md:text-xl font-bold ${remaining >= 0 ? 'text-green' : 'text-reddy'}`}>
                        £{remaining.toFixed(2)}
                    </p>
                </div>
            </div>
            
            <p className="text-sm text-white/50 mt-1 mb-2 md:mb-3">
                Spent <span className="text-white/70 font-medium">£{spent.toFixed(2)}</span> of <span className="text-white/70 font-medium">£{assigned.toFixed(2)}</span> {assigned < goalAmount && <>(goal <span className="text-white/70 font-medium">£{goalAmount.toFixed(2)}</span>)</>}
            </p>

            <div className="relative">
                <div className="rounded h-3 md:h-5 bg-green-dark/20 w-full">
                    <div 
                        className="rounded h-full bg-green transition-all duration-500 ease-out absolute top-0 left-0"
                        style={{width: `${(assigned / goalAmount) * 100}%`}}
                    />
                    {spent > 0 && (
                        <div 
                            className={`rounded h-full transition-all duration-500 ease-out absolute top-0 left-0 ${
                                remaining >= 0 ? 'bg-gray-500/100' : 'bg-red-700/70'
                            }`}
                            style={{
                                width: `${Math.min(spent / goalAmount, assigned / goalAmount) * 100}%`,
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)'
                            }}
                        />
                    )}
                </div>
            </div>

            <div className="hidden md:flex justify-between items-baseline mt-1">
                {showGroup && group && (
                    <span className="text-xs text-white/50">
                        {group}
                    </span>
                )}
                <div className="flex gap-1 items-baseline ml-auto">
                    <span className="text-xs text-white/50">Goal:</span>
                    <p className="text-sm font-medium">£{goalAmount.toFixed(2)}</p>
                </div>
            </div>

            
        </div>
    )
}