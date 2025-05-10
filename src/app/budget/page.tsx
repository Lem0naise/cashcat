'use client';
import Image from "next/image";
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import MobileNav from "../components/mobileNav";
import Category from "@/app/features/Category";
import {useEffect, useState} from "react";

type Cat = {
    id: number,
    name: string,
    assigned: number,
    spent: number,
    goalAmount: number,
    group: string
}

export default function Home(){
    const [categories, setCategories] = useState<Cat[]>([]);
    const [activeGroup, setActiveGroup] = useState<string>('All');

    useEffect(()=>{
        setCategories([
            // Essentials
            {id:1, name:'Rent', assigned: 460.34, spent: 0, goalAmount: 800, group: 'Essentials'},
            {id:2, name:'Utilities', assigned: 150, spent: 120.50, goalAmount: 150, group: 'Essentials'},
            {id:3, name:'Groceries', assigned: 400, spent: 292.40, goalAmount: 400, group: 'Essentials'},
            {id:4, name:'Transport', assigned: 80, spent: 95.60, goalAmount: 80, group: 'Essentials'},
            
            // Food & Dining
            {id:5, name:'Takeouts', assigned: 90, spent: 122.63, goalAmount: 90, group: 'Food & Dining'},
            {id:6, name:'Restaurants', assigned: 120, spent: 85.20, goalAmount: 150, group: 'Food & Dining'},
            {id:7, name:'Coffee Shops', assigned: 45, spent: 38.40, goalAmount: 50, group: 'Food & Dining'},
            
            // Savings & Goals
            {id:8, name:'Emergency Fund', assigned: 3000, spent: 0, goalAmount: 5000, group: 'Savings & Goals'},
            {id:9, name:'Holiday', assigned: 800, spent: 0, goalAmount: 1200, group: 'Savings & Goals'},
            {id:10, name:'New Laptop', assigned: 600, spent: 0, goalAmount: 1500, group: 'Savings & Goals'},
            
            // Entertainment
            {id:11, name:'Streaming', assigned: 30, spent: 30, goalAmount: 30, group: 'Entertainment'},
            {id:12, name:'Gaming', assigned: 35, spent: 29.99, goalAmount: 40, group: 'Entertainment'},
            {id:13, name:'Movies', assigned: 40, spent: 32.00, goalAmount: 50, group: 'Entertainment'},
            
            // Health & Wellness
            {id:14, name:'Gym', assigned: 35, spent: 35.00, goalAmount: 35, group: 'Health & Wellness'},
            {id:15, name:'Healthcare', assigned: 80, spent: 25.00, goalAmount: 100, group: 'Health & Wellness'},
        ]);
    }, [])

    const totalAssigned = categories.reduce((sum, cat) => sum + cat.assigned, 0);
    const totalGoal = categories.reduce((sum, cat) => sum + cat.goalAmount, 0);
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalAssigned - totalSpent;

    const groups = ['All', ...new Set(categories.map(cat => cat.group))];
    const filteredCategories = activeGroup === 'All' 
        ? categories 
        : categories.filter(cat => cat.group === activeGroup);

    return(
        <div className="min-h-screen bg-background font-[family-name:var(--font-suse)]">
            <Navbar />
            <Sidebar />
            <MobileNav />
            
            <main className="pt- md:pt-18 upb-28 md:pb-6 md:pl-64 p-6 fade-in">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="hidden md:inline text-2xl font-bold tracking-[-.01eddm]">Dashboard</h1>
                        <button className="flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-[#f2f2f2] dark:hover:bg-[#2a2a2a] text-sm opacity-90 hover:opacity-100 md:block hidden">
                            <Image
                                src="/window.svg"
                                alt="Add category"
                                width={16}
                                height={16}
                                className="opacity-70"
                            />
                            Add Category
                        </button>
                    </div>

                    {/* Summary Category */}
                    <div className="mb-8 transform transition-all hover:scale-[1.01] hover:shadow-md">
                        <div className="p-4 bg-black/[.02] dark:bg-white/[.02] rounded-lg border-b-4">
                            <div className="flex flex-col md:flex-row justify-between mb-4">
                                <h3 className="text-lg font-bold mb-2 md:mb-0">Monthly Overview</h3>
                                <div className="flex gap-4 flex-wrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-black/50 dark:text-white/50">Total Goals</span>
                                        <span className="font-medium">£{totalGoal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-black/50 dark:text-white/50">Assigned</span>
                                        <span className="font-medium text-green">£{totalAssigned.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-black/50 dark:text-white/50">Spent so far</span>
                                        <span className="font-medium text-reddy">£{totalSpent.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-black/50 dark:text-white/50">Left</span>
                                        <span className="font-medium text-green">£{totalRemaining.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="rounded h-4 bg-green-dark/20 w-full">
                                    <div 
                                        className="rounded h-full bg-green transition-all duration-500 ease-out absolute top-0 left-0"
                                        style={{width: `${(totalAssigned / totalGoal) * 100}%`}}
                                    />
                                    <div 
                                        className="rounded h-full transition-all duration-500 ease-out absolute top-0 left-0 bg-gray-500/100"
                                        style={{
                                            width: `${(totalSpent / totalGoal) * 100}%`,
                                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)'
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between mt-2 text-sm">
                                <span className="text-black/50 dark:text-white/50">{((totalAssigned / totalGoal) * 100).toFixed(1)}% Assigned</span>
                                <span className="text-reddy">{((totalSpent / totalGoal) * 100).toFixed(1)}% Spent</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto hide-scrollbar -mx-6 px-6 mb-6 bg-gradient-to-r from-black-500/10 to-black-500/100">
                        <div className="flex gap-2 min-w-max">
                            {groups.map((group) => (
                                <button
                                    key={group}
                                    onClick={() => setActiveGroup(group)}
                                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                                        activeGroup === group
                                            ? 'bg-green text-background'
                                            : 'bg-white/15 hover:bg-white/[.05]'
                                    }`}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {filteredCategories.map((category, index) => (
                            <div key={category.id} 
                                className="transform transition-all hover:scale-[1.01] hover:shadow-md"
                                style={{ 
                                    animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards'
                                }}
                            >
                                <Category
                                    name={category.name}
                                    assigned={category.assigned}
                                    spent={category.spent}
                                    goalAmount={category.goalAmount}
                                    group={category.group}
                                    showGroup={activeGroup === 'All'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
