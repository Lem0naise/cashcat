'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type ManageBudgetModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function ManageBudgetModal({ isOpen, onClose }: ManageBudgetModalProps) {
    const [activeTab, setActiveTab] = useState<'groups'|'categories'>('groups');
    const [isClosing, setIsClosing] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200); // Match animation duration
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <div 
            className={`fixed inset-0 bg-black md:bg-black/70 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center md:p-4 font-[family-name:var(--font-suse)] ${
                isClosing ? 'animate-[fadeOut_0.2s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'
            }`}
            onClick={handleBackdropClick}
        >
            <div 
                className={`bg-white/[.09] md:rounded-lg border-b-4 w-full md:max-w-xl p-6 md:p-6 min-h-[100dvh] md:min-h-0 ${
                    isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'
                }`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Manage Budget</h2>
                    <button 
                        onClick={handleClose}
                        className="p-2 hover:bg-white/[.05] rounded-full transition-colors text-white"
                    >
                        <Image
                            src="/minus.svg"
                            alt="Close"
                            width={16}
                            height={16}
                            className="opacity-100 invert"
                        />
                    </button>
                </div>

                <div className="flex gap-4 border-b border-white/[.15] mb-6">
                    <button 
                        onClick={() => setActiveTab('groups')}
                        className={`px-4 py-2 transition-all duration-200 ${
                            activeTab === 'groups' 
                            ? 'text-green border-b-2 border-green' 
                            : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Groups
                    </button>
                    <button 
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 transition-all duration-200 ${
                            activeTab === 'categories'
                            ? 'text-green border-b-2 border-green' 
                            : 'text-white/60 hover:text-white'
                        }`}
                    >
                        Categories
                    </button>
                </div>

                <div className="space-y-4">
                    {activeTab === 'groups' ? (
                        <div>
                            <button className="flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-white/[.05] text-sm">
                                <Image
                                    src="/plus.svg"
                                    alt="Add group"
                                    width={16}
                                    height={16}
                                    className="opacity-70"
                                />
                                Add Group
                            </button>
                        </div>
                    ) : (
                        <div>
                            <button className="flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-white/[.05] text-sm">
                                <Image
                                    src="/plus.svg"
                                    alt="Add category" 
                                    width={16}
                                    height={16}
                                    className="opacity-70"
                                />
                                Add Category
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
