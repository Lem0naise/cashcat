'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import { Database } from '../../types/supabase';
type Transaction = Database['public']['Tables']['transactions']['Row'];


type TransactionModalProps = {
    transaction: Transaction|null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (transaction: {
        amount: number;
        date: string;
        vendor: string;
        description?: string;
    }) => void;
    onDelete : () => void;
};

export default function TransactionModal({transaction, isOpen, onClose, onSubmit, onDelete }: TransactionModalProps) {
    const [type, setType] = useState<'payment' | 'income'>('payment');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [vendor, setVendor] = useState('');
    const [description, setDescription] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const [isClosing, setIsClosing] = useState(false);


    
    useEffect(() => {
        if (transaction){
            setType(transaction.amount>0 ? 'income' : 'payment');
            setAmount((Math.abs(transaction.amount).toString()));
            setDate(transaction.date);
            setDescription(transaction.description ? transaction.description : '')
            setVendor(transaction.vendor);
            // console.log(transaction)
        }
        else {
            setType('payment');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('')
            setVendor('');
        }
    }, [isOpen]);

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
        onSubmit({
            amount: type === 'payment' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
            date,
            vendor,
            description: description || undefined
        });
        // Reset form
        setAmount('');
        setVendor('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
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
                        <div className="grid grid-cols-2 gap-2">
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

                    <div>
                        <label className="block text-sm text-white/50 mb-1">Vendor</label>
                        <input
                            type="text"
                            required
                            value={vendor}
                            onChange={(e) => setVendor(e.target.value)}
                            placeholder="Tesco"
                            className="w-full p-3 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                        />
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
