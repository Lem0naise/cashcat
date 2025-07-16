'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import toast from 'react-hot-toast';
import MoneyInput from '../../components/money-input';
import Image from 'next/image';

type Category = Database['public']['Tables']['categories']['Row'] & {
    groups?: {
        id: string;
        name: string;
    } | null;
};

type Group = Database['public']['Tables']['groups']['Row'];

interface CategoryDropdownProps {
    value: string;
    onChange: (categoryId: string) => void;
    placeholder?: string;
    className?: string;
    onNewCategoryCreated?: () => void;
    categories?: Category[];
    groups?: Group[];
}

interface NewCategoryForm {
    name: string;
    group: string;
    goal: string;
}

export default function CategoryDropdown({ 
    value, 
    onChange, 
    placeholder = "Select category...",
    className = "",
    onNewCategoryCreated,
    categories = [],
    groups = []
}: CategoryDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
    const [newCategoryData, setNewCategoryData] = useState<NewCategoryForm>({
        name: '',
        group: '',
        goal: ''
    });
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
    const [mounted, setMounted] = useState(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const supabase = createClientComponentClient<Database>();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const updateButtonRect = () => {
            if (buttonRef.current) {
                setButtonRect(buttonRef.current.getBoundingClientRect());
            }
        };

        if (isOpen) {
            updateButtonRect();
            window.addEventListener('scroll', updateButtonRect);
            window.addEventListener('resize', updateButtonRect);
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updateButtonRect);
            window.removeEventListener('resize', updateButtonRect);
        };
    }, [isOpen]);

    const createCategory = async () => {
        if (!newCategoryData.name.trim() || !newCategoryData.group) {
            toast.error('Please fill in required fields');
            return;
        }

        setCreatingCategory(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('categories')
                .insert({
                    name: newCategoryData.name.trim(),
                    group: newCategoryData.group,
                    goal: newCategoryData.goal ? parseFloat(newCategoryData.goal) : null,
                    goal_type: 'monthly', // Consistent with main app
                    rollover_enabled: false, // Default for new categories
                    timeframe: { type: 'monthly' }, // Consistent with main app default
                    user_id: user.id
                })
                .select(`
                    *,
                    groups (
                        id,
                        name
                    )
                `)
                .single();

            if (error) throw error;

            // Select the newly created category
            onChange(data.id);
            
            // Close modal and reset form
            setShowNewCategoryModal(false);
            setNewCategoryData({
                name: '',
                group: '',
                goal: ''
            });
            setIsOpen(false);

            toast.success('Category created successfully!');
            
            // Notify parent component to refresh categories
            if (onNewCategoryCreated) {
                onNewCategoryCreated();
            }
        } catch (error) {
            console.error('Error creating category:', error);
            toast.error('Failed to create category');
        } finally {
            setCreatingCategory(false);
        }
    };

    const calculateDropdownStyle = (rect: DOMRect) => {
        const dropdownHeight = Math.min(400, window.innerHeight - 100); // Much taller dropdown, but leave space for other UI
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        let top = rect.bottom + 4; // Remove window.scrollY as we're using fixed positioning
        let left = rect.left; // Remove window.scrollX as we're using fixed positioning
        
        // Check if dropdown would go below viewport
        if (rect.bottom + dropdownHeight > viewportHeight) {
            // Position above the button instead
            top = rect.top - dropdownHeight - 4;
        }
        
        // Check if dropdown would go beyond right edge
        if (left + rect.width > viewportWidth) {
            left = viewportWidth - rect.width - 8;
        }
        
        // Check if dropdown would go beyond left edge
        if (left < 8) {
            left = 8;
        }
        
        return {
            top,
            left,
            width: rect.width,
            maxHeight: dropdownHeight,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
        };
    };

    const selectedCategory = categories.find(cat => cat.id === value);
    
    // Group categories by their groups
    const groupedCategories = categories.reduce((acc, category) => {
        const groupName = category.groups?.name || 'Ungrouped';
        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(category);
        return acc;
    }, {} as Record<string, Category[]>);

    return (
        <>
            <div className={`relative z-[1000] ${className}`} ref={dropdownRef}>
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => {
                        if (buttonRef.current) {
                            setButtonRect(buttonRef.current.getBoundingClientRect());
                        }
                        setIsOpen(!isOpen);
                    }}
                    className="w-full p-2 rounded bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm text-left flex items-center justify-between"
                >
                    <span className={selectedCategory ? 'text-white' : 'text-white/50'}>
                        {selectedCategory ? selectedCategory.name : placeholder}
                    </span>
                    <svg 
                        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && mounted && buttonRect && createPortal(
                    <>
                        {/* Invisible backdrop to prevent click-through */}
                        <div 
                            className="fixed inset-0 z-[9999]"
                            style={{ 
                                pointerEvents: 'auto',
                                backgroundColor: 'transparent'
                            }}
                            onClick={() => setIsOpen(false)}
                        />
                        <div 
                            ref={dropdownRef}
                            className="fixed z-[10000] border border-white/15 rounded-lg shadow-2xl overflow-y-auto"
                            style={{
                                ...calculateDropdownStyle(buttonRect),
                                backgroundColor: '#1a1a1a',
                                pointerEvents: 'auto',
                                opacity: 1
                            }}
                        >
                        {Object.keys(groupedCategories).length === 0 ? (
                            <div className="p-4 text-center text-white/60 text-sm">
                                No categories found
                            </div>
                        ) : (
                            Object.entries(groupedCategories).map(([groupName, groupCategories]) => (
                                <div key={groupName}>
                                    <div className="px-3 py-2 text-xs font-medium text-green bg-white/[.05] border-b border-white/10">
                                        {groupName}
                                    </div>
                                    {groupCategories.map(category => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => {
                                                onChange(category.id);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-white/[.05] transition-colors ${
                                                value === category.id ? 'bg-green/20 text-green' : 'text-white'
                                            }`}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                        
                        {/* Add new category button */}
                        <div className="border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewCategoryModal(true);
                                    setIsOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-green hover:bg-green/10 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add new category
                            </button>
                        </div>
                    </div>
                    </>,
                    document.body
                )}
            </div>

            {/* New Category Modal */}
            {showNewCategoryModal && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10001] flex items-center justify-center p-4"
                    style={{ 
                        pointerEvents: 'auto',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)'
                    }}
                >
                    <div className="rounded-lg border border-white/20 w-full max-w-md"
                        style={{
                            backgroundColor: '#111827',
                            opacity: 1
                        }}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-green">Add New Category</h3>
                                <button
                                    onClick={() => {
                                        setShowNewCategoryModal(false);
                                        setNewCategoryData({
                                            name: '',
                                            group: '',
                                            goal: ''
                                        });
                                    }}
                                    className="p-2 hover:bg-white/[.05] rounded-full transition-colors"
                                >
                                    <Image
                                        src="/plus.svg"
                                        alt="Close"
                                        width={16}
                                        height={16}
                                        className="opacity-70 invert rotate-45"
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                createCategory();
                            }}
                            className="p-6 space-y-4"
                        >
                            {/* Category Name */}
                            <div>
                                <label className="block text-sm text-white/70 mb-2">
                                    Category Name *
                                </label>
                                <input
                                    type="text"
                                    value={newCategoryData.name}
                                    onChange={(e) => setNewCategoryData({
                                        ...newCategoryData,
                                        name: e.target.value
                                    })}
                                    placeholder="Enter category name"
                                    className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                                    autoFocus
                                    required
                                />
                            </div>

                            {/* Group Selection */}
                            <div>
                                <label className="block text-sm text-white/70 mb-2">
                                    Group *
                                </label>
                                <select
                                    value={newCategoryData.group}
                                    onChange={(e) => setNewCategoryData({
                                        ...newCategoryData,
                                        group: e.target.value
                                    })}
                                    className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                                    required
                                >
                                    <option value="">Select a group...</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Monthly Goal */}
                            <div>
                                <label className="block text-sm text-white/70 mb-2">
                                    Monthly Goal (Optional)
                                </label>
                                <MoneyInput
                                    value={newCategoryData.goal}
                                    onChange={(value: string) => setNewCategoryData({
                                        ...newCategoryData,
                                        goal: value
                                    })}
                                    placeholder="0.00"
                                    currencySymbol={true}
                                    className="text-lg"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewCategoryModal(false);
                                        setNewCategoryData({
                                            name: '',
                                            group: '',
                                            goal: ''
                                        });
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingCategory || !newCategoryData.name.trim() || !newCategoryData.group}
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                        creatingCategory || !newCategoryData.name.trim() || !newCategoryData.group
                                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                            : 'bg-green text-black hover:bg-green-dark'
                                    }`}
                                >
                                    {creatingCategory ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            Creating...
                                        </div>
                                    ) : (
                                        'Create Category'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
