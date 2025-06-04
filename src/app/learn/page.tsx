'use client';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "../components/logo";
import OpenButton from "../components/openButton";
import CategoryCard from '../features/Category';

const BUDGET_TIPS = [
    "If you select an account on the transactions page, you can compare CashCat's balance with your bank's!",
    "If you have leftover money, assign it to next month!",
    "If you overspend in one category, move money from another - don't give up!",
    "Set up a 'Fun Money' category so you don't feel restricted by your budget.",
    "Pay yourself first - assign money to savings before anything else.",
    "Use specific category names like 'Lunch Out' instead of just 'Food'. Set up a 'Food' Group!",
    "Track your spending for a week before creating your first budget.",
    "The goal isn't a perfect world - it's being aware of where your money goes.",
    "Emergency funds should be boring - keep them in a separate, easy-access account.",
    "You can add and subtract in category assignments - try typing '+ 4' while assigning!"
];

export default function LearnMore() {
    const router = useRouter();
    const [isAnimatingAway, setIsAnimatingAway] = useState(false);
    const [mockAssigning, setMockAssigning] = useState(false);
    const [currentTipIndex, setCurrentTipIndex] = useState(0);

    const [mockAssignedValue, setMockAssignedValue] = useState(45);

    const handleClick = () => {
        setIsAnimatingAway(true);
        setTimeout(() => {
            router.push("/budget");
        }, 500);
    };

    const getRandomTip = (ind: number) => {
        console.log(ind);
        console.log(BUDGET_TIPS[ind]);
        console.log(BUDGET_TIPS.length)
        if (ind+2 > BUDGET_TIPS.length){
            setCurrentTipIndex(0);
        }
        else { setCurrentTipIndex(ind+1);}
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen px-1 md:px-8 pb-8 gap-4 font-[family-name:var(--font-suse)]">
            <main className={`${isAnimatingAway ? "fade-out " : ""} transition-all flex flex-col gap-2 row-start-2 items-center max-w-2xl w-full fade-in`}>
                <div className="scale-75 sm:scale-100 text-center">
                    {Logo()}</div>
                
                <div className="space-y-4 sm:space-y-6 text-base sm:text-lg">
                   
                    <div className="mt-8 sm:mt-12 p-3 md:p-6 rounded-xl bg-white/[.05]">
                        <h3 className="text-2xl sm:text-4xl font-bold mb-4 text-center">How CashCat Works</h3>
                        
                        <div className="space-y-4 text-sm sm:text-base">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-0.5">1</div>
                                <div>
                                    <h4 className="font-medium text-xl mb-1">Start with Your Money</h4>
                                    <p className="text-white/70">Tell CashCat how much money you have in your <span className="text-green">Bank Accounts</span> right now.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-0.5">2</div>
                                <div>
                                    <h4 className="font-medium text-xl mb-1">Create Your Budget</h4>
                                    <p className="text-white/70">Create <span className="text-green">Groups</span> like "Food", "Shopping", or "Savings". <br/>Then, create <span className="text-green">Categories</span> like "Groceries", "Rent", "New Car". <br/>Give each of these categories a <span className="text-green">Goal</span> - how much you want to save to, or how much you want to spent each month.</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-0.5">3</div>
                                <div>
                                    <h4 className="font-medium text-xl mb-1">Give Every Penny a Job</h4>
                                    <p className="text-white/70"><span className="text-green">Assign</span> all your money to each <span className="text-green">Category</span> until all your money is assigned. If you have some left over, assign it to next month!</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-0.5">4</div>
                                <div>
                                    <h4 className="font-medium text-xl mb-1">Spend Within Your Categories</h4>
                                    <p className="text-white/70">When you buy something, log it as a <span className="text-green">Transaction</span> and watch your available money in that category adjust instantly. No overspending surprises!</p>
                                    <p className="text-xs text-white/60 mt-4">The CashCat mentality encourages manually logging transactions. This way, spending is a conscious decision. In the future, you will be able to import transactions automatically from your bank.</p>
                            
                                </div>
                            </div>
                            
                        </div>
                        
                        <div className="mt-6 p-4 bg-green/10 rounded-lg border border-green/20">
                            <h4 className="font-bold text-green mb-2 text-center">The Zero-Based Method</h4>
                            <p className="text-sm text-white/80 text-center">
                                 <strong className="font-bold">Income - Assigned Money = 0. </strong><br/> Every penny has a purpose before you spend it - savings, spending, paying of debt. Never wonder "where did my money go?" again.
                            </p>
                        </div>
                    </div>


                    <div className="mt-8 sm:mt-12 p-6 rounded-xl bg-white/[.05]">
                        <h3 className="text-2xl sm:text-4xl font-bold mb-4 text-center">An Example Budget</h3>


                        <h4 className="text-lg sm:text-lg mb-4">Let's say you:</h4>

                        <div className="space-y-4 text-sm sm:text-base">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black text-xs flex-shrink-0 mt-0.5">1</div>
                                <div>
                                    <h4 className="mb-1">Set a monthly goal of £60 for Groceries.</h4>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-0.5">2</div>
                                <div>
                                    <h4 className="mb-1">Last month, you had £10 left over. This will roll over into this month!</h4>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-0.5">3</div>
                                <div>
                                    <h4 className="mb-1">This month, you assign a further £45.</h4>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-0.5">4</div>
                                <div>
                                    <h4 className="mb-1">You made a purchase at Aldi for £32.80. You have £22.20 left to spend.</h4>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 bg-green rounded-full flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-0.5">5</div>
                                <div>
                                    <h4 className="mb-1">There's now 7 days left in the month.</h4>
                                </div>
                            </div>
    
                         <h4 className="text-lg sm:text-xl font-bold mb-4 text-center">Here's what that would look like:</h4>
                              
                            
                        </div>

                        
                        <CategoryCard
                            name={"Groceries"}
                            assigned={mockAssignedValue}
                            rollover={10}
                            spent={32.80}
                            goalAmount={60}
                            forceFlipMassAssign={false}
                            wasMassAssigningSoShouldClose={false}
                            onAssignmentStateChange={(isAssigning) => {setMockAssigning(isAssigning)}}
                            onAssignmentUpdate={async (amount) => {setMockAssignedValue(amount);setMockAssigning(false)}}
                            available={10+mockAssignedValue-32.80}
                            dailyLeft={(10+mockAssignedValue-32.80)/7}
                        />
                        

                        <p className="text-xs text-white/70 mt-4"> {mockAssigning ? "Great! This is how you assign money to categories." : "👆 Click the category card above to try assigning money!" }</p>
                           
                        
                        
                        <div className="mt-6 p-4 bg-green/10 rounded-lg border border-green/20">
                            <h4 className="font-bold text-green mb-2 text-center">The Zero-Based Method - Reminder!</h4>
                            <p className="text-sm text-white/80 text-center">
                                 <strong className="font-bold">Income - Assigned Money = 0. </strong>
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 sm:mt-12 p-6 rounded-xl bg-white/[.05]">
                        <h3 className="text-2xl sm:text-4xl font-bold mb-4 text-center">Tips and Tricks</h3>
                        
                        <div className="bg-white/[.05] rounded-lg p-4 border border-green/20">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 bg-green rounded-full"></div>
                                        <span className="text-xs text-green font-medium">BUDGET TIP</span>
                                    </div>
                                    <p className="text-sm sm:text-base text-white/90">
                                        {BUDGET_TIPS[currentTipIndex]}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {getRandomTip(currentTipIndex)}}
                                    className="flex-shrink-0 w-10 h-10 bg-green/20 hover:bg-green/30 rounded-full flex items-center justify-center transition-colors border border-green/30"
                                    aria-label="Get new tip"
                                >
                                    <svg className="w-5 h-5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-8">
                        
                        <div className="mt-8 flex justify-center">
                            {OpenButton("Done Reading", true, handleClick)}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
