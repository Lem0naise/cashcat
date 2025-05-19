'use client';

import { useEffect, useState, useCallback } from 'react';

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
}

export default function Category({name, assigned, rollover, spent, goalAmount, group, showGroup = true, forceFlipMassAssign = false, wasMassAssigningSoShouldClose= false, onAssignmentUpdate}: CategoryProps) {
    const [progress, setProgress] = useState<number>(0);
    const [isAssigning, setIsAssigning] = useState(false);
    const [editedAmount, setEditedAmount] = useState(assigned.toFixed(2));
    const [isUpdating, setIsUpdating] = useState(false);
    const remaining = assigned + rollover - spent;
    const goal = goalAmount || 0;
    
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

    return (
        <div 
            className={` p-3 md:p-4 border-b-4 border-white/70 flex flex-col bg-white/[.05] rounded-lg cursor-pointer transition-all ${onAssignmentUpdate ? 'hover:bg-white/[.08]' : ''}`}
            onClick={!isAssigning ? handleCardClick : undefined}
        >
            {!isAssigning ? (
                // Normal view
                <>
                    <div className="flex justify-between items-start">
                        <h3 className="text-base md:text-lg font-bold">{name}</h3>
                        <div className="text-right">
                            <p className={`text-lg md:text-xl font-bold ${remaining >= 0 ? 'text-green' : 'text-reddy'}`}>
                                £{remaining.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="text-sm text-white/50 mt-1 mb-2 md:mb-3 flex w-full justify-between">
                        <span>
                            Spent <span className="text-white/70 font-medium">£{spent.toFixed(2)}</span> of <span className="text-white/70 font-medium">£{assigned.toFixed(2)}</span>
                        </span>
                        <span>
                            {goal > 0 && assigned < goal && <>Goal: <span className="text-white/70 font-medium">£{goal.toFixed(2)}</span></>}
                            {goal > 0 && assigned > goal && <>Extra: <span className="text-white/70 font-medium">£{(assigned-goal).toFixed(2)}</span></>}
                        </span>
                    </div>

                    <div className="relative">
                        <div className="rounded h-3 md:h-5 bg-green-dark/20 w-full">
                            <div 
                                className="rounded h-full bg-green transition-all duration-500 ease-out absolute top-0 left-0"
                                style={{width: goal ? `${Math.min((assigned / goal), 1) * 100}%` : '100%'}}
                            />
                            {spent > 0 && (
                                <div 
                                    className={`rounded h-full transition-all duration-500 ease-out absolute top-0 left-0 ${
                                        remaining >= 0 ? 'bg-gray-500/100' : 'bg-red-700/70'
                                    }`}
                                    style={{
                                        width: goal ? `${Math.min(spent / goal, assigned / goal) * 100}%` : '0%',
                                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)'
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    <div className="hidden justify-between items-baseline mt-1">
                        {showGroup && group && (
                            <span className="text-xs text-white/50">
                                {group}
                            </span>
                        )}
                        <div className="flex gap-1 items-baseline ml-auto">
                            <span className="text-xs text-white/50">Goal:</span>
                            <p className="text-sm font-medium">£{goal.toFixed(2)}</p>
                        </div>
                    </div>
                </>
            ) : (
                // Assignment mode view
                <>
                <div className="flex justify-between items-start">
                    <h3 className="text-base md:text-lg font-bold">{name}</h3>
                    <div className="text-right">
                        <p className={`text-lg md:text-xl font-bold ${remaining >= 0 ? 'text-green' : 'text-reddy'}`}>
                            £{remaining.toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className="mt-1 flex items-center justify-between h-full">
                    <div className="flex items-center gap-1 xl:gap-2">
                        <input
                            type="tel"
                            data-category-id={name}
                            className="w-18 bg-white/10 rounded px-3 py-2 xl:text-lg text-md focus:outline-none focus:ring-2 focus:ring-primary"
                            value={editedAmount}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            autoFocus={!forceFlipMassAssign}
                        />
                        <span className="text-white/50">/</span>
                        <span className="text-green xl:text-lg text-md font-medium">£{goal.toFixed(2)}</span>
                    </div>
                    <div className={`flex gap-2 ${forceFlipMassAssign ? "hidden" : ""}`}>
                        <button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className="xl:px-4 px-2 py-2 rounded bg-green/20 hover:bg-green/30 text-green transition-colors disabled:opacity-50"
                        >
                            {isUpdating ? "Saving..." : "Save"}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isUpdating}
                            className="xl:px-4 px-2 py-2 rounded bg-reddy/20 hover:bg-reddy/30 text-reddy transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
                </>
            )}
        </div>
    );
}