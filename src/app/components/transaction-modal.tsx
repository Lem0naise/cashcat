'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Category } from '../types/budget';
import { Database } from '../../types/supabase';
import { useCallback } from 'react';
import { debounce } from 'lodash';

type Transaction = Database['public']['Tables']['transactions']['Row'];

type Vendor = {
    id: string;
    name: string;
};

type TransactionModalProps = {
    transaction: Transaction|null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (transaction: {
        amount: number;
        date: string;
        vendor: string;
        description?: string;
        category_id: string;
    }) => void;
    onDelete : () => void;
};

export default function TransactionModal({transaction, isOpen, onClose, onSubmit, onDelete }: TransactionModalProps) {
    const supabase = createClientComponentClient();
    const [type, setType] = useState<'payment' | 'income'>('payment');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [vendor, setVendor] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [vendorSuggestions, setVendorSuggestions] = useState<Vendor[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [vendorInputFocused, setVendorInputFocused] = useState(false);
    const vendorRef = useRef<HTMLDivElement>(null);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('*')
                    .order('name');
                
                if (error) throw error;
                setCategories(data || []);
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        };

        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    useEffect(() => {
        if (transaction){
            setType(transaction.amount > 0 ? 'income' : 'payment');
            setAmount((Math.abs(transaction.amount).toString()));
            setDate(transaction.date);
            setDescription(transaction.description ? transaction.description : '');
            setVendor(transaction.vendor);
            setCategoryId(transaction.category_id || '');
        } else {
            setType('payment');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setVendor('');
            setCategoryId('');
        }
    }, [isOpen, transaction]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (vendorRef.current && !vendorRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced vendor search
    const searchVendors = useCallback(
        debounce(async (searchTerm: string) => {
            if (!searchTerm.trim()) {
                setVendorSuggestions([]);
                return;
            }

            try {
                const { data: vendors } = await supabase
                    .from('vendors')
                    .select('id, name')
                    .order('name')
                    .limit(5)
                    .filter('name', 'ilike', `${searchTerm}%`);

                setVendorSuggestions(vendors || []);
            } catch (error) {
                console.error('Error searching vendors:', error);
                setVendorSuggestions([]);
            }
        }, 300),
        [supabase]
    );

    const handleVendorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setVendor(value);
        setShowSuggestions(true);
        searchVendors(value);
    };

    const selectVendor = async (vendorName: string) => {
        setVendor(vendorName);
        setShowSuggestions(false);

        // Find the most recent transaction for this vendor
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('category_id')
                .eq('vendor', vendorName)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            // If we found a transaction, set its category
            if (transactions && transactions.length > 0) {
                setCategoryId(transactions[0].category_id);
            }
        } catch (error) {
            console.error('Error fetching vendor category:', error);
        }
    };

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200); // Match animation duration
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (!categoryId) return; // Prevent submission if no category selected
        
        onSubmit({
            amount: type === 'payment' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
            date,
            vendor,
            description: description || undefined,
            category_id: categoryId
        });
        // Reset form
        setAmount('');
        setVendor('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategoryId('');
        handleClose();
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <div 
            className={`fixed inset-0 bg-black md:bg-black/50 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center md:p-4 font-[family-name:var(--font-suse)] ${
                isClosing ? 'animate-[fadeOut_0.2s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'
            }`}
            onClick={handleBackdropClick}
        >
            <div 
                className={`bg-white/[.03] md:rounded-lg border-b-4 w-full md:max-w-md p-6 md:p-6 min-h-[100dvh] md:min-h-0 ${
                    isClosing ? 'animate-[slideOut_0.2s_ease-out]' : 'animate-[slideIn_0.2s_ease-out]'
                }`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{transaction ? "Edit Transaction" : "New Transaction"}</h2>
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/50 mb-1">Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setType('payment')}
                                className={`p-3 rounded-lg border transition-colors ${
                                    type === 'payment'
                                        ? 'bg-reddy/20 border-reddy text-reddy'
                                        : 'bg-white/[.05] border-white/[.15] hover:bg-white/[.1]'
                                }`}
                            >
                                Payment
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('income')}
                                className={`p-3 rounded-lg border transition-colors ${
                                    type === 'income'
                                        ? 'bg-green/20 border-green text-green'
                                        : 'bg-white/[.05] border-white/[.15] hover:bg-white/[.1]'
                                }`}
                            >
                                Income
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-white/50 mb-1">Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">£</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full p-3 pl-7 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-white/50 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div ref={vendorRef} className="relative">
                        <label className="block text-sm text-white/50 mb-1">Vendor</label>
                        <input
                            type="text"
                            required
                            value={vendor}
                            onChange={handleVendorChange}
                            onFocus={() => {
                                setVendorInputFocused(true);
                                setShowSuggestions(true);
                                if (vendor) searchVendors(vendor);
                            }}
                            placeholder="Shop"
                            className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                        />
                        {showSuggestions && vendorSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white/[0.05] border border-white/[.15] rounded-lg overflow-hidden shadow-lg">
                                {vendorSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.id}
                                        type="button"
                                        onClick={() => selectVendor(suggestion.name)}
                                        className="w-full px-4 py-2 text-left md:bg-black/0.6 bg-black/[0.9] hover:bg-green/[.5] hover:text-black transition-colors"
                                    >
                                        {suggestion.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm text-white/50 mb-1">Category</label>
                        <select
                            required
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                            disabled={loadingCategories}
                        >
                            <option value="" disabled>
                                {loadingCategories ? 'Loading categories...' : 'Select a category'}
                            </option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    



                    
                    <div>
                        <label className="block text-sm text-white/50 mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Weekly groceries..."
                            className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors resize-none h-24"
                        />
                    </div>

                    <div className="flex gap-8">
                            <button
                            type="button"
                            onClick={() => isDeleting ? (setIsDeleting(false), onDelete()) :setIsDeleting(true)}
                            className={`${transaction ? 'block': 'hidden'} w-full py-3 ${isDeleting ? "bg-old-reddy" : "bg-reddy"} text-black font-medium rounded-lg hover:bg-old-reddy transition-colors mt-6`}
                        >
                            {isDeleting ? "Are you sure?" : "Delete Transaction"}
                        </button>
                        <button
                            type="submit"
                            className="w-full py-3 bg-green text-black font-medium rounded-lg hover:bg-green-dark transition-colors mt-6"
                        >
                            {transaction ? "Update Transaction" : "Add Transaction"}
                        </button>
                    </div>
                    
                </form>
            </div>
        </div>
    );
}
