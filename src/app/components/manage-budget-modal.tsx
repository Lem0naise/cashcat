'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Group, Category } from '../types/budget';

type ManageBudgetModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function ManageBudgetModal({ isOpen, onClose }: ManageBudgetModalProps) {
    const supabase = createClientComponentClient();
    const [activeTab, setActiveTab] = useState<'groups'|'categories'|'starting'>('groups');
    const [groups, setGroups] = useState<Group[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [startingBalance, setStartingBalance] = useState('');
    const [startingBalanceId, setStartingBalanceId] = useState<string | null>(null);
    const [isInitialSetup, setIsInitialSetup] = useState(true);
    
    // Form states
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [newCategoryData, setNewCategoryData] = useState({
        name: '',
        group: '',
        assigned: '',
        goal: '',
        timeframe: 'monthly' as const
    });
    const [isClosing, setIsClosing] = useState(false);


    useEffect(() => {
        if (!startingBalance) {
            setActiveTab('starting');
        }
        else {
            setActiveTab('groups');
        }
    }, [startingBalanceId])

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

    const fetchStartingBalance = async () => {
        try {
            const {data: {user}, error: userError} = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            const {data, error} = await supabase
                .from('transactions')
                .select('id, amount')
                .eq('user_id', user.id)
                .eq('type', 'starting')
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

            if (data) {
                setStartingBalance(Math.abs(data.amount).toString());
                setStartingBalanceId(data.id);
                setIsInitialSetup(false);
            } else {
                setStartingBalance('');
                setStartingBalanceId(null);
                setIsInitialSetup(true);
            }
        } catch (error) {
            console.error('Error fetching starting balance:', error);
            setError('Failed to load starting balance');
        }
    };

    // Group CRUD operations
    const createGroup = async (name: string) => {
        try {
            const { error } = await supabase
                .from('groups')
                .insert({ name });
            
            if (error) throw error;
            
            await fetchGroups();
            setNewGroupName('');
        } catch (error) {
            console.error('Error creating group:', error);
            setError('Failed to create group');
        }
    };

    const updateGroup = async (id: string, name: string) => {
        try {
            const { error } = await supabase
                .from('groups')
                .update({ name })
                .eq('id', id);
            
            if (error) throw error;
            
            await fetchGroups();
            setEditingGroup(null);
        } catch (error) {
            console.error('Error updating group:', error);
            setError('Failed to update group');
        }
    };

    const deleteGroup = async (id: string) => {
        try {
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            await fetchGroups();
            await fetchCategories(); // Refresh categories as they might be affected
        } catch (error) {
            console.error('Error deleting group:', error);
            setError('Make sure you delete or reassign all categories in this group before deleting it.');
        }
    };

    // Category CRUD operations
    const createCategory = async (categoryData: typeof newCategoryData) => {
        try {
            if (!categoryData.group) {
                throw new Error('Group is required');
            }
            
            const { error } = await supabase
                .from('categories')
                .insert({
                    name: categoryData.name,
                    group: categoryData.group,
                    assigned: categoryData.assigned ? parseFloat(categoryData.assigned) : 0,
                    goal: categoryData.goal ? parseFloat(categoryData.goal) : null,
                    timeframe: { type: categoryData.timeframe }
                });
            
            if (error) throw error;
            
            await fetchCategories();
            setNewCategoryData({
                name: '',
                group: '',
                assigned: '',
                goal: '',
                timeframe: 'monthly'
            });
        } catch (error) {
            console.error('Error creating category:', error);
            setError('Failed to create category');
        }
    };

    const updateCategory = async (id: string, categoryData: Partial<Category>) => {
        try {
            const { error } = await supabase
                .from('categories')
                .update(categoryData)
                .eq('id', id);
            
            if (error) throw error;
            
            await fetchCategories();
            setEditingCategory(null);
        } catch (error) {
            console.error('Error updating category:', error);
            setError('Failed to update category');
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            await fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            setError('Failed to delete category - make sure all transactions in this category are reassigned!');
        }
    };

    // Function to save or update starting balance
    const saveStartingBalance = async () => {
        try {
            const {data: {user}, error: userError} = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            const parsedBalance = parseFloat(startingBalance);
            if (isNaN(parsedBalance)) throw new Error('Invalid amount');

            const transactionData = {
                amount: parsedBalance,
                type: 'starting',
                date: new Date().toISOString().split('T')[0],
                vendor: 'Starting Balance',
                created_at: new Date().toISOString(),
            };

            let error;
            if (startingBalanceId) {
                // Update existing starting balance
                const response = await supabase
                    .from('transactions')
                    .update({ ...transactionData, user_id: user.id })
                    .eq('id', startingBalanceId);
                error = response.error;
            } else {
                // Create new starting balance
                const response = await supabase
                    .from('transactions')
                    .insert({ ...transactionData, user_id: user.id });
                error = response.error;
            }

            if (error) throw error;

            await fetchStartingBalance();
            setError(null);
        } catch (error) {
            console.error('Error saving starting balance:', error);
            setError('Failed to save starting balance');
        }
    };

    // Initial data fetch
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Existing useEffect for data fetching
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            Promise.all([fetchGroups(), fetchCategories(), fetchStartingBalance()])
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
            setNewCategoryData({
                name: '',
                group: '',
                assigned: '',
                goal: '',
                timeframe: 'monthly'
            });
        }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Check if there are any categories or transactions to determine if this is initial setup
    const checkIsInitialSetup = async () => {
        try {
            const {data: {user}} = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const [categoriesResponse, transactionsResponse] = await Promise.all([
                supabase
                    .from('categories')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1),
                supabase
                    .from('transactions')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('type', 'starting')
                    .limit(1)
            ]);

            if (categoriesResponse.error) throw categoriesResponse.error;
            if (transactionsResponse.error) throw transactionsResponse.error;

            setIsInitialSetup(!categoriesResponse.data?.length && !transactionsResponse.data?.length);
        } catch (error) {
            console.error('Error checking setup status:', error);
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
                className={`relative bg-white/[.09] md:rounded-lg border-b-4 w-full md:max-w-xl h-screen md:h-auto md:max-h-[90vh] flex flex-col ${
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
                                src="/minus.svg"
                                alt="Close"
                                width={16}
                                height={16}
                                className="opacity-100 invert"
                            />
                        </button>
                    </div>

                    <div className="flex gap-4 mt-6">
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
                         <button 
                            onClick={() => setActiveTab('starting')}
                            className={`px-4 py-2 transition-all duration-200 ${
                                activeTab === 'starting' 
                                ? 'text-green border-b-2 border-green' 
                                : 'text-white/60 hover:text-white'
                            }`}
                        >
                            Starting Balance
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
                            
                            
                            {activeTab === 'starting' ? (
                                <div className="bg-white/[.03] rounded-lg p-6 mb-8">
                                    <h3 className="text-lg font-medium text-green mb-4">Starting Balance</h3>
                                    <p className="text-sm text-white/70 mb-6">
                                        {startingBalanceId 
                                            ? "Update your starting balance if you need to correct it."
                                            : "Set your starting balance to begin tracking your finances."}
                                    </p>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        saveStartingBalance();
                                    }} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-white/50 mb-1">Balance Amount</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">£</span>
                                                <input
                                                    type="tel"
                                                    value={startingBalance}
                                                    onChange={(e) => setStartingBalance(e.target.value)}
                                                    required
                                                    placeholder="0.00"
                                                    className="w-full p-2 pl-7 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full bg-green text-black px-4 py-2 rounded-lg hover:bg-green-dark transition-colors text-sm font-medium"
                                        >
                                            {startingBalanceId ? "Update Balance" : "Save Balance"}
                                        </button>
                                    </form>
                                </div>
                            ) : activeTab === 'groups' ? (
                                <div className="space-y-4">
                                    

                                    {/* Add new group form */}
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        createGroup(newGroupName);
                                    }} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-white/50 mb-1">New Group Name</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newGroupName}
                                                    onChange={(e) => setNewGroupName(e.target.value)}
                                                    placeholder="Enter group name"
                                                    className="flex-1 p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
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

                                    {/* List of existing groups */}
                                    <div className="space-y-2">
                                        {groups.map((group) => (
                                            <div key={group.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[.03] group">
                                                {editingGroup?.id === group.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingGroup.name}
                                                        onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                                                        className="flex-1 p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm mr-2"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span>{group.name}</span>
                                                )}
                                                
                                                <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    {editingGroup?.id === group.id ? (
                                                        <>
                                                            <button
                                                                onClick={() => updateGroup(group.id, editingGroup.name)}
                                                                className="p-2 rounded-lg hover:bg-green/20 transition-colors"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingGroup(null)}
                                                                className="p-2 rounded-lg hover:bg-white/[.05] transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingGroup(group)}
                                                                className="p-2 rounded-lg hover:bg-white/[.05] active:bg-white/[.05] transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => deleteGroup(group.id)}
                                                                className="p-2 rounded-lg hover:bg-reddy/20 active:bg-reddy/20 transition-colors text-reddy"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Add new category form */}
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        createCategory(newCategoryData);
                                    }} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-white/50 mb-1">Category Name</label>
                                            <input
                                                type="text"
                                                value={newCategoryData.name}
                                                onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})}
                                                placeholder="Enter category name"
                                                className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-white/50 mb-1">Group</label>
                                            <select
                                                value={newCategoryData.group}
                                                onChange={(e) => setNewCategoryData({...newCategoryData, group: e.target.value})}
                                                className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                required
                                            >
                                                <option value="" disabled>Select a Group</option>
                                                {groups.map((group) => (
                                                    <option key={group.id} value={group.id}>{group.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-white/50 mb-1">Monthly Goal (Optional)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">£</span>
                                                    <input
                                                        type="number"
                                                        value={newCategoryData.goal}
                                                        onChange={(e) => setNewCategoryData({...newCategoryData, goal: e.target.value})}
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        className="w-full p-2 pl-7 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm text-white/50 mb-1">Assigned Amount</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">£</span>
                                                    <input
                                                        type="number"
                                                        value={newCategoryData.assigned}
                                                        onChange={(e) => setNewCategoryData({...newCategoryData, assigned: e.target.value})}
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        className="w-full p-2 pl-7 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={!newCategoryData.name.trim() || !newCategoryData.group}
                                            className="w-full bg-green text-black px-4 py-2 rounded-lg hover:bg-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                        >
                                            Add Category
                                        </button>
                                    </form>

                                    {/* List of existing categories */}
                                    <div className="space-y-6 mt-6">
                                        {groups.map(group => {
                                            const groupCategories = categories.filter(cat => cat.group === group.id);
                                            if (groupCategories.length === 0) return null;
                                            
                                            return (
                                                <div key={group.id} className="space-y-2">
                                                    <h3 className="text-sm font-medium text-white/70 px-3">{group.name}</h3>
                                                    {groupCategories.map((category) => (
                                                        <div key={category.id} className="p-3 rounded-lg bg-white/[.03] group">
                                                            {editingCategory?.id === category.id ? (
                                                                <form onSubmit={(e) => {
                                                                    e.preventDefault();
                                                                    if (!editingCategory.group) return;
                                                                    updateCategory(category.id, {
                                                                        name: editingCategory.name,
                                                                        group: editingCategory.group,
                                                                        assigned: editingCategory.assigned,
                                                                        goal: editingCategory.goal
                                                                    });
                                                                }} className="space-y-3">
                                                                    <div className="flex gap-4">
                                                                        <div className="flex-1">
                                                                            <input
                                                                                type="text"
                                                                                value={editingCategory.name}
                                                                                onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                                                                                className="w-full p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                                                autoFocus
                                                                            />
                                                                        </div>
                                                                        <select
                                                                            value={editingCategory.group || ''}
                                                                            onChange={(e) => setEditingCategory({...editingCategory, group: e.target.value})}
                                                                            className="w-48 p-2 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                                            required
                                                                        >
                                                                            {groups.map((g) => (
                                                                                <option key={g.id} value={g.id}>{g.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">£</span>
                                                                            <input
                                                                                type="number"
                                                                                value={editingCategory.goal || ''}
                                                                                onChange={(e) => setEditingCategory({...editingCategory, goal: parseFloat(e.target.value) || null})}
                                                                                placeholder="Goal Amount"
                                                                                step="0.01"
                                                                                className="w-full p-2 pl-7 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                                            />
                                                                        </div>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">£</span>
                                                                            <input
                                                                                type="number"
                                                                                value={editingCategory.assigned || ''}
                                                                                onChange={(e) => setEditingCategory({...editingCategory, assigned: parseFloat(e.target.value) || 0})}
                                                                                placeholder="Assigned Amount"
                                                                                step="0.01"
                                                                                className="w-full p-2 pl-7 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-sm"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-end gap-2 mt-3">
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
                                                                        <span className="block">{category.name}</span>
                                                                        <div className="flex items-center gap-2 text-sm text-white/50">
                                                                            <span>Goal: £{category.goal || 0}</span>
                                                                            <span>•</span>
                                                                            <span>Assigned: £{category.assigned || 0}</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => setEditingCategory(category)}
                                                                            className="p-2 rounded-lg hover:bg-white/[.05] active:bg-white/[.05] transition-colors"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteCategory(category.id)}
                                                                            className="p-2 rounded-lg hover:bg-reddy/20 active:bg-reddy/20 transition-colors text-reddy"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
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
