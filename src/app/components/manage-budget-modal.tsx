'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MoneyInput from './money-input';
import Dropdown, { DropdownOption } from './dropdown';
import type { Category, Group } from '@/types/supabase';
type ManageBudgetModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function ManageBudgetModal({ isOpen, onClose }: ManageBudgetModalProps) {
    const supabase = createClientComponentClient();
    const [activeTab, setActiveTab] = useState<'categories'|'settings'>('categories');
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hideBudgetValues, setHideBudgetValues] = useState(false);

    // Form states
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [showAddGroup, setShowAddGroup] = useState(false);
    const [editingGoalAsString, setEditingGoalAsString] = useState('');
    const [showAddCategoryForGroup, setShowAddCategoryForGroup] = useState<string | null>(null);
    const [newGroupCategoryData, setNewGroupCategoryData] = useState({
        name: '',
        goal: '',
        timeframe: 'monthly' as const
    });
    // Load settings from localStorage on component mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedHideBudgetValues = localStorage.getItem('hideBudgetValues') === 'true';
            setHideBudgetValues(savedHideBudgetValues);
        }
    }, []);

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setEditingGoalAsString(category.goal?.toFixed(2) || '');
    }

    // Save hide budget values setting to localStorage and update global state
    const toggleHideBudgetValues = () => {
        const newValue = !hideBudgetValues;
        setHideBudgetValues(newValue);
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('hideBudgetValues', newValue.toString());
            // Dispatch custom event to notify other components
            window.dispatchEvent(new CustomEvent('hideBudgetValuesChanged', { 
                detail: { hideBudgetValues: newValue } 
            }));
        }
    };

    // Fetch data functions
    const fetchGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('groups')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setGroups(data || []);
        } catch (error) {
            console.error('Error fetching groups:', error);
            setError('Failed to load groups');
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select(`
                    *,
                    groups (
                        id,
                        name
                    )
                `)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError('Failed to load categories');
        }
    };

    // Group CRUD operations
    const createGroup = async (name: string) => {
        try {
            
            const promise = (async () => {
                const {error} = await supabase
                .from('groups')
                .insert({ name });
                if (error) throw error;
            })();
            
            await toast.promise(promise, {
                loading: 'Creating group...',
                success: 'Group created successfully!',
                error: 'Failed to create group'
            });
            
            await fetchGroups();
            setNewGroupName('');
        } catch (error) {
            console.error('Error creating group:', error);
            setError('Failed to create group');
        }
    };

    const updateGroup = async (id: string, name: string) => {
        try {            
            const promise = (async () => {
                const {error} = await supabase
                .from('groups')
                .update({ name })
                .eq('id', id);
                if (error) throw error;
            })();

            await toast.promise(promise, {
                loading: 'Updating group...',
                success: 'Group updated successfully!',
                error: 'Failed to update group'
            });
            
            await fetchGroups();
            setEditingGroup(null);
        } catch (error) {
            console.error('Error updating group:', error);
            setError('Failed to update group');
        }
    };

    const deleteGroup = async (id: string) => {
        try {
            const promise = (async () => {
                const {error} = await supabase
                .from('groups')
                .delete()
                .eq('id', id);
                if (error) throw error;
            })();
            
            await toast.promise(promise, {
                loading: 'Deleting group...',
                success: 'Group deleted successfully!',
                error: 'Failed to delete group - make sure you delete or reassign all categories in this group first'
            });
            
            await fetchGroups();
            await fetchCategories(); // Refresh categories as they might be affected
        } catch (error) {
            console.error('Error deleting group:', error);
            setError('Make sure you delete or reassign all categories in this group before deleting it.');
        }
    };

    const createCategoryForGroup = async (groupId: string, categoryData: typeof newGroupCategoryData) => {
        try {
            const promise = (async () => {
                const {error} = await supabase
                .from('categories')
                .insert({
                    name: categoryData.name,
                    group: groupId,
                    goal: categoryData.goal ? parseFloat(categoryData.goal) : null,
                    timeframe: { type: 'monthly' as const }
                })
                if (error) throw error;
            })();
            
            await toast.promise(promise, {
                loading: 'Creating category...',
                success: 'Category created successfully!',
                error: 'Failed to create category'
            });
            
            await fetchCategories();
            setNewGroupCategoryData({
                name: '',
                goal: '',
                timeframe: 'monthly' as const
            });
            setShowAddCategoryForGroup(null);
        } catch (error) {
            console.error('Error creating category:', error);
            setError('Failed to create category');
        }
    };

    const updateCategory = async (id: string, categoryData: Partial<Category>) => {
        try {
            const promise = (async () => {
                const {error} = await supabase
                .from('categories')
                .update(categoryData)
                .eq('id', id);
                if (error) throw error;
            })();
            
            await toast.promise(promise, {
                loading: 'Updating category...',
                success: 'Category updated successfully!',
                error: 'Failed to update category'
            });
            
            await fetchCategories();
            setEditingCategory(null);
        } catch (error) {
            console.error('Error updating category:', error);
            setError('Failed to update category');
        }
    };

    const deleteCategory = async (id: string) => {
        try {
        
            const promise = (async () => {
                const {error} = await supabase
                .from('categories')
                .delete()
                .eq('id', id);
                if (error) throw error;
            })();
            
            
            await toast.promise(promise, {
                loading: 'Deleting category...',
                success: 'Category deleted successfully!',
                error: 'Failed to delete category - make sure all transactions in this category are reassigned first'
            });
            
            await fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            setError('Failed to delete category - make sure all transactions in this category are reassigned!');
        }
    };

    

    // Initial data fetch
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflowY = 'hidden';
        } else {
            document.body.style.overflowY = 'unset';
        }
        return () => {
            document.body.style.overflowY = 'unset';
        };
    }, [isOpen]);

    // Existing useEffect for data fetching
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            Promise.all([fetchGroups(), fetchCategories()])
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    useEffect(() => {
        setError("");
    }, [activeTab]); // clear error if active tab

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
            // Reset all form states
            setEditingGroup(null);
            setEditingCategory(null);
            setNewGroupName('');
            setShowAddGroup(false);
            setShowAddCategoryForGroup(null);
            setNewGroupCategoryData({
                name: '',
                goal: '',
                timeframe: 'monthly' as const
            });
        }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className={`fixed inset-0 bg-black md:bg-black/70 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center font-[family-name:var(--font-suse)] overflow-hidden ${
                isClosing ? 'animate-[fadeOut_0.2s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'
            }`}
            onClick={handleBackdropClick}
        >
            <div 
                className={`relative bg-white/[.09] md:rounded-lg md:border-b-4 w-full md:max-w-xl h-screen md:h-auto md:max-h-[90vh] flex flex-col ${
                    isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'
                }`}
            >
                {/* Header Section */}
                <div className="flex-none p-6 border-b border-white/[.1]">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Manage Budget</h2>
                        <button 
                            onClick={handleClose}
                            className="p-2 hover:bg-white/[.05] rounded-full transition-colors text-white"
                        >
                            <Image
                                src="/plus.svg"
                                alt="Close"
                                width={16}
                                height={16}
                                className="opacity-100 invert rotate-45"
                            />
                        </button>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button 
                            onClick={() => setActiveTab('categories')}
                            className={`px-4 py-2 transition-all duration-200 ${
                                activeTab === 'categories'
                                ? 'text-green border-b-2 border-green' 
                                : 'text-white/60 hover:text-white'
                            }`}
                        >
                            Categories & Groups
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-2 transition-all duration-200 ${
                                activeTab === 'settings' 
                                ? 'text-green border-b-2 border-green' 
                                : 'text-white/60 hover:text-white'
                            }`}
                        >
                            Other Settings
                        </button>
                         
                        
                    </div>
                </div>

                {/* Scrollable Content Section */}
                <div className="flex-1 overflow-y-auto p-6 pb-30">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {error && (
                                <div className="bg-reddy/20 text-reddy p-3 rounded-lg text-sm mb-4">
                                    {error}
                                </div>
                            )}
                            
                            {activeTab === 'settings' ? (
                                <div className="space-y-6">
                                    <div className="bg-white/[.03] rounded-lg p-6">
                                        <h3 className="text-lg font-medium text-green mb-4">Display</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-white/[.03] rounded-lg">
                                                <div>
                                                    <h4 className="font-medium text-white">Hide Budget Values</h4>
                                                    <p className="text-sm text-white/60 mt-1">
                                                        Replace all monetary values with asterisks for screen sharing
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={toggleHideBudgetValues}
                                                    className={`relative min-w-10 h-6 rounded-full transition-colors duration-200 ${
                                                        hideBudgetValues ? 'bg-green' : 'bg-white/20'
                                                    }`}
                                                >
                                                    <div
                                                        className={`absolute w-5 h-5 bg-white rounded-full transition-transform duration-200 top-0.5 ${
                                                            hideBudgetValues ? 'translate-x-5' : 'translate-x-0.5'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            <div className="flex  justify-between p-4 bg-white/[.03] rounded-lg flex-col">
                                                <p className="block font-medium text-white mb-2">Currency</p>
                                                <Dropdown
                                                    value="GBP"
                                                    onChange={() => {}}
                                                    options={[
                                                        { value: "GBP", label: "£ GBP (Coming Soon)", disabled: true },
                                                        { value: "USD", label: "$ USD (Coming Soon)", disabled: true },
                                                        { value: "EUR", label: "€ EUR (Coming Soon)", disabled: true }
                                                    ]}
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    </div>

                                     {/* Budget Settings */}
                                    <div className="bg-white/[.03] rounded-lg p-6">
                                         <h3 className="text-lg font-medium text-green mb-4">Import</h3>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex text-left justify-between p-4 bg-white/[.03] rounded-lg flex-col">
                                                <p className="block font-medium text-white mb-2">Import Transactions</p>
                                                <button
                                                    className="w-full px-4 py-2 bg-white/[.05] hover:bg-white/[.08] rounded-lg transition-all text-white/70 hover:text-white disabled:opacity-50 disabled:hover:bg-white/[.05] disabled:hover:text-white/70"
                                                    disabled
                                                >
                                                    Import from CSV (Coming Soon)
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Add new group form */}
                                    <div className="bg-white/[.03] rounded-lg overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddGroup(!showAddGroup)}
                                            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[.02] transition-colors"
                                        >
                                            <h3 className="text-lg font-medium text-green">Add New Group</h3>
                                            <Image
                                                src={showAddGroup ? "/minus.svg" : "/plus.svg"}
                                                alt={showAddGroup ? "Collapse" : "Expand"}
                                                width={16}
                                                height={16}
                                                className="opacity-70 invert transition-transform duration-200"
                                            />
                                        </button>
                                        {showAddGroup && (
                                            <div className="px-4 pb-4 border-t border-white/[.05]">
                                                <form onSubmit={(e) => {
                                                    e.preventDefault();
                                                    createGroup(newGroupName);
                                                    setShowAddGroup(false);
                                                }} className="space-y-4 mt-4">
                                                    <div>
                                                        <label className="block text-sm text-white/50 mb-1">Group Name</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={newGroupName}
                                                                onChange={(e) => setNewGroupName(e.target.value)}
                                                                placeholder="Enter group name"
                                                                className="flex-1 p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                                autoFocus={showAddGroup}
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={!newGroupName.trim()}
                                                                className="bg-green text-black px-4 py-2 rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                                            >
                                                                Add Group
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </div>

                                    {/* Groups and their categories */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-white/80">Your Groups & Categories</h3>
                                        {groups.map(group => {
                                            const groupCategories = categories.filter(cat => cat.group === group.id);
                                            
                                            return (
                                                <div key={group.id} className="bg-white/[.03] rounded-lg p-4">
                                                    {/* Group header */}
                                                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[.1]">
                                                        {editingGroup?.id === group.id ? (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <input
                                                                    type="text"
                                                                    value={editingGroup.name}
                                                                    onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                                                                    className="flex-1 p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                                    
                                                                />
                                                                <button
                                                                    onClick={() => updateGroup(group.id, editingGroup.name)}
                                                                    className="px-3 py-1 rounded-lg bg-green/20 hover:bg-green/30 text-green transition-colors text-sm"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingGroup(null)}
                                                                    className="px-3 py-1 rounded-lg hover:bg-white/[.05] transition-colors text-sm"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div>
                                                                    <h4 className="font-medium text-lg text-green">{group.name}</h4>
                                                                    <p className="text-sm text-white/50">{groupCategories.length} categories</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setEditingGroup(group)}
                                                                        className="p-2 rounded-lg hover:bg-white/[.05] transition-colors text-sm"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteGroup(group.id)}
                                                                        className="p-2 rounded-lg hover:bg-reddy/20 transition-colors text-reddy text-sm"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Categories in this group */}
                                                    <div className="space-y-2">
                                                        {/* Add category button for this group */}
                                                        <div className="mb-3">
                                                            {showAddCategoryForGroup === group.id ? (
                                                                <div className="p-3 rounded-lg bg-white/[.03] border border-white/[.1]">
                                                                    <form onSubmit={(e) => {
                                                                        e.preventDefault();
                                                                        createCategoryForGroup(group.id, newGroupCategoryData);
                                                                    }} className="space-y-3">
                                                                        <div>
                                                                            <input
                                                                                type="text"
                                                                                value={newGroupCategoryData.name}
                                                                                onChange={(e) => setNewGroupCategoryData({...newGroupCategoryData, name: e.target.value})}
                                                                                placeholder="Category name"
                                                                                className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                                                autoFocus
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm text-white/50 mb-1">Monthly Goal (Optional)</label>
                                                                            <MoneyInput
                                                                                value={newGroupCategoryData.goal}
                                                                                onChange={(value) => setNewGroupCategoryData({...newGroupCategoryData, goal: value})}
                                                                                placeholder="0.00"
                                                                                currencySymbol={true}
                                                                                className="text-lg"
                                                                                inline={true}
                                                                            />
                                                                        </div>
                                                                        <div className="flex justify-end gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setShowAddCategoryForGroup(null);
                                                                                    setNewGroupCategoryData({name: '', goal: '', timeframe: 'monthly' as const});
                                                                                }}
                                                                                className="px-3 py-1 rounded-lg hover:bg-white/[.05] transition-colors text-sm text-white/70"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                type="submit"
                                                                                disabled={!newGroupCategoryData.name.trim()}
                                                                                className="px-3 py-1 rounded-lg bg-green/20 hover:bg-green/30 text-green transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                Add Category
                                                                            </button>
                                                                        </div>
                                                                    </form>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setShowAddCategoryForGroup(group.id)}
                                                                    className="w-full p-2 rounded-lg bg-white/[.02] hover:bg-white/[.05] border border-dashed border-white/[.15] transition-colors text-sm text-white/70 hover:text-white flex items-center justify-center gap-2"
                                                                >
                                                                    <Image
                                                                        src="/plus.svg"
                                                                        alt="Add"
                                                                        width={12}
                                                                        height={12}
                                                                        className="opacity-70 invert"
                                                                    />
                                                                    Add category to {group.name}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {groupCategories.length === 0 ? (
                                                            <p className="text-white/40 text-sm italic">No categories in this group yet</p>
                                                        ) : (
                                                            groupCategories.map((category) => (
                                                                <div key={category.id} className="p-3 rounded-lg bg-white/[.05] group border-l-2 border-green/30">
                                                                    {editingCategory?.id === category.id ? (
                                                                        <form onSubmit={(e) => {
                                                                            e.preventDefault();
                                                                            if (!editingCategory.group) return;
                                                                            updateCategory(category.id, {
                                                                                name: editingCategory.name,
                                                                                group: editingCategory.group,
                                                                                goal: parseFloat(editingGoalAsString) || null
                                                                            });
                                                                        }} className="space-y-3">
                                                                            <div className="flex gap-4">
                                                                                <div className="flex-1">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editingCategory.name}
                                                                                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                                                                                        className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                                                        
                                                                                    />
                                                                                </div>
                                                                                <Dropdown
                                                                                    value={editingCategory.group || ''}
                                                                                    onChange={(value) => setEditingCategory({...editingCategory, group: value})}
                                                                                    options={groups.map((g): DropdownOption => ({
                                                                                        value: g.id,
                                                                                        label: g.name,
                                                                                    }))}
                                                                                    required
                                                                                    className="w-1/3"
                                                                                />
                                                                            </div>
                                                                            <div className="flex gap-4">
                                                                                <div className="relative flex-1">
                                                                                    <label className="block text-sm text-white/50 mb-1">Monthly Goal</label>
                                                                                    <MoneyInput
                                                                                        value={editingGoalAsString}
                                                                                        onChange={(value) => setEditingGoalAsString(value)}
                                                                                        placeholder="0.00"
                                                                                        currencySymbol={true}
                                                                                        className="text-lg"
                                                                                        inline={true}
                                                                                    />
                                                                                    
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-end gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setEditingCategory(null)}
                                                                                    className="px-3 py-1 rounded-lg hover:bg-white/[.05] transition-colors text-sm"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                                <button
                                                                                    type="submit"
                                                                                    disabled={!editingCategory.name.trim() || !editingCategory.group}
                                                                                    className="px-3 py-1 rounded-lg bg-green/20 hover:bg-green/30 text-green transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    Save Changes
                                                                                </button>
                                                                            </div>
                                                                        </form>
                                                                    ) : (
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <span className="block font-medium">{category.name}</span>
                                                                                <span className="text-sm text-white/50">
                                                                                    Goal: £{category.goal || 0}
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => handleEditCategory(category)}
                                                                                    className="p-2 rounded-lg hover:bg-white/[.05] transition-colors text-sm"
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => deleteCategory(category.id)}
                                                                                    className="p-2 rounded-lg hover:bg-reddy/20 transition-colors text-reddy text-sm"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {groups.length === 0 && (
                                            <p className="text-white/40 text-center py-8">No groups created yet. Add your first group above to get started.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
