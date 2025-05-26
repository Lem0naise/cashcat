'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CategoryProps {
    name: string;
    assigned: number;
    rollover: number | 0;
    spent: number;
    goalAmount: number | null;
    group?: string;
    showGroup?: boolean;
    forceFlipMassAssign?: boolean;
    wasMassAssigningSoShouldClose? : boolean;
    onAssignmentUpdate?: (amount: number) => Promise<void>;
    available?: number;
    dailyLeft?: number;
}

export default function Category({name, assigned, rollover, spent, goalAmount, group, showGroup = true, forceFlipMassAssign = false, wasMassAssigningSoShouldClose= false, onAssignmentUpdate, available, dailyLeft}: CategoryProps) {
    const [progress, setProgress] = useState<number>(0);
    const [isAssigning, setIsAssigning] = useState(false);
    const [editedAmount, setEditedAmount] = useState(assigned.toFixed(2));
    const [isUpdating, setIsUpdating] = useState(false);
    const [hideBudgetValues, setHideBudgetValues] = useState(false);
    const displayAvailable = available !== undefined ? available : (assigned + rollover - spent);
    const goal = goalAmount || 0;
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Handle autoFocus
    useEffect(() => {
        if (isAssigning && !forceFlipMassAssign && inputRef.current) {
            const focusTimer = setTimeout(() => {
                inputRef.current?.setSelectionRange(100, 100);
                inputRef.current?.focus();
            }, 200);
            return () => clearTimeout(focusTimer);
        }
    }, [isAssigning, forceFlipMassAssign]);

    // Handle forceFlipMassAssign changes with debounce
    useEffect(() => {
        setIsAssigning(forceFlipMassAssign);
        // Don't reset edited amount immediately when force assign mode is toggled
        if (!forceFlipMassAssign) {
            const timeout = setTimeout(() => {
                setEditedAmount(assigned.toFixed(2));
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [forceFlipMassAssign, assigned]);

    // Keep values in sync with props using debounce to prevent flashing
    useEffect(() => {
        const timeout = setTimeout(() => {
            setProgress(goal ? assigned/goal : 0);
            if (!isAssigning || !isUpdating) {
                setEditedAmount(assigned.toFixed(2));
            }
        }, 50);
        return () => clearTimeout(timeout);
    }, [assigned, goal, isAssigning, isUpdating]);

    // Listen for hide budget values changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedHideBudgetValues = localStorage.getItem('hideBudgetValues') === 'true';
            setHideBudgetValues(savedHideBudgetValues);

            const handleHideBudgetValuesChange = (event: CustomEvent) => {
                setHideBudgetValues(event.detail.hideBudgetValues);
            };

            window.addEventListener('hideBudgetValuesChanged', handleHideBudgetValuesChange as EventListener);
            return () => {
                window.removeEventListener('hideBudgetValuesChanged', handleHideBudgetValuesChange as EventListener);
            };
        }
    }, []);

    const handleCardClick = useCallback(() => {
        if (!onAssignmentUpdate || forceFlipMassAssign) return;
        setIsAssigning(true);
    }, [onAssignmentUpdate, forceFlipMassAssign]);

    const handleSave = useCallback(async () => {
        if (!onAssignmentUpdate) return;
        try {
            setIsUpdating(true);
            await onAssignmentUpdate(Number(editedAmount));
            if (!forceFlipMassAssign) {
                setIsAssigning(false);
            }
        } catch (error) {
            console.error('Failed to update assignment:', error);
            setEditedAmount(assigned.toFixed(2));
        } finally {
            setIsUpdating(false);
        }
    }, [onAssignmentUpdate, editedAmount, forceFlipMassAssign, assigned]);

    const handleCancel = useCallback(() => {
        setEditedAmount(assigned.toFixed(2));
        if (!forceFlipMassAssign) {
            setIsAssigning(false);
        }
    }, [forceFlipMassAssign, assigned]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9+\-*/.]/g, '');
        setEditedAmount(value);
    }, []);

    const handleInputBlur = useCallback(() => {
        if (editedAmount !== '') {
            const result = new Function(`return ${editedAmount}`)();
            const sanitized = typeof result === 'number' && !isNaN(result) ? Math.max(0, result) : 0;
            setEditedAmount(sanitized.toFixed(2));
        }
    }, [editedAmount]);

    // Helper function to format currency or return asterisks
    const formatCurrency = (amount: number) => {
        if (hideBudgetValues) return '****';
        return `${amount<0?'-':''}£${Math.abs(amount).toFixed(2)}`;
    };

    return (
        <div 
            className={`relative p-2 md:p-4 border-b-4 border-white/70 flex flex-col bg-white/[.05] rounded-lg cursor-pointer transition-all ${onAssignmentUpdate ? 'hover:bg-white/[.08]' : ''}`}
            onClick={!isAssigning ? handleCardClick : undefined}
        >
            <div className="flex justify-between items-start">
                <h3 className="text-sm md:text-lg font-medium leading-tight">{name}</h3>
                <div className="text-right">
                    <div className="flex items-baseline gap-1.5">
                        {dailyLeft !== undefined && Math.round(dailyLeft*100)/100 > 0 && displayAvailable > 0 && (
                            <span className="text-xs text-white/50">
                                ({formatCurrency(dailyLeft)}/day)
                            </span>
                        )}
                        <p className={`text-base text-lg md:text-xl font-bold ${displayAvailable >= -0.01 ? 'text-green' : 'text-reddy'}`}>
                            {formatCurrency(displayAvailable)}
                        </p>
                        
                    </div>
                </div>
            </div>

            <div className="relative h-[32px] md:h-[40px]">
                {/* Normal view */}
                <div 
                    className={`absolute inset-x-0 transition-all duration-300 ${
                        isAssigning 
                        ? 'opacity-0 translate-y-2 pointer-events-none' 
                        : 'opacity-100 translate-y-0'
                    }`}
                >
                    <div className="text-xs md:text-sm text-white/50 mt-0.5 md:mt-1 mb-1 flex w-full justify-between">
                        <span>
                            Spent <span className="text-white/70 font-medium">{formatCurrency(spent)}</span> of <span className="text-white/70 font-medium">{formatCurrency(assigned)} {rollover > 0 && (
                                <>
                                    + <span className="text-white/70 font-medium">{formatCurrency(rollover)}</span> rolled 
                                </>
                            )}</span> 
                        </span>
                        <span>
                            {goal > 0 && (assigned + rollover) < goal && <>Need: <span className="text-white/70 font-medium">{formatCurrency(goal-(assigned+rollover))}</span></>}
                            {goal > 0 && (assigned + rollover) > goal && <>Extra: <span className="text-white/70 font-medium">{formatCurrency((rollover+assigned)-goal)}</span></>}
                        </span>
                    </div>
                </div>

                {/* Assignment mode view */}
                <div 
                    className={`absolute inset-x-0 transition-all duration-300 ${
                        isAssigning 
                        ? 'opacity-100 translate-y-0 delay-150' 
                        : 'opacity-0 -translate-y-2'
                    }`}
                >
                    <div className={`flex items-center justify-between mt-0.5 ${!isAssigning ? 'pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-1 xl:gap-2">
                            <input
                                ref={inputRef}
                                type="tel"
                                data-category-id={name}
                                className="w-16 lg:w-18 bg-white/10 rounded px-2 md:px-3 py-1 md:py-2 text-sm xl:text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                value={hideBudgetValues ? '****' : editedAmount}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                inputMode="decimal"
                                pattern="[0-9]*\.?[0-9]*"
                                disabled={hideBudgetValues}
                            />
                            <span className="text-white/50 text-sm md:text-base">/</span>
                            <span className="text-green text-sm xl:text-lg font-medium">{formatCurrency(goal)}</span>
                        </div>
                        <div className={`flex gap-1 md:gap-2 ${forceFlipMassAssign ? "hidden" : ""}`}>
                            <button
                                onClick={handleSave}
                                disabled={isUpdating}
                                className="px-2 lg:px-4 py-2 rounded bg-green/20 hover:bg-green/30 text-green transition-colors disabled:opacity-50 text-xs lg:text-sm"
                            >
                                {isUpdating ? "Saving..." : "Save"}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isUpdating}
                                className="px-2 lg:px-4 py-2 rounded bg-reddy/20 hover:bg-reddy/30 text-reddy transition-colors disabled:opacity-50 text-xs lg:text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress bar - now outside conditional render */}
            <div className={`relative w-full overflow-hidden transition-[opacity, margin] duration-300 will-change-[opacity, margin] ${isAssigning ? 'opacity-100 mb-1' : 'mb-0'}`}>
                <div className={`rounded bg-green-dark/20 w-full transition-[height] duration-300 will-change-[height] ${isAssigning ? "h-0" : "h-2 md:h-3"}`}>
                    <div 
                        className="rounded h-full bg-green will-change-[width] transition-[width] duration-1000 ease-out absolute top-0 left-0"
                        style={{width: goal ? `${Math.min(((assigned + rollover) / goal), 1) * 100}%` : '100%'}}
                    />
                    {spent > 0 && (
                        <div 
                            className={`rounded h-full will-change-[width] transition-[width] duration-1000 ease-out absolute top-0 left-0 ${
                                displayAvailable >= 0 ? 'bg-gray-500/100' : 'bg-red-700/70'
                            }`}
                            style={{
                                width: goal ? `${Math.min(spent / goal, (assigned + rollover) / goal) * 100}%` : '0%',
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)'
                            }}
                        />
                    )}
                </div>
            </div>

            {!isAssigning && (
                <div className="hidden justify-between items-baseline mt-1">
                    
                    <div className="flex gap-1 items-baseline ml-auto">
                        <span className="text-xs text-white/50">Goal:</span>
                        <p className="text-sm font-medium">{formatCurrency(goal)}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
