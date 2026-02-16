'use client';
import Image from "next/image";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmButtonClass?: string;
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    confirmButtonClass = "bg-reddy hover:bg-old-reddy",
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 pt-[calc(env(safe-area-inset-top)+1rem)]"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1a1a] rounded-xl max-w-sm w-full border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Image src="/plus.svg" alt="Close" width={16} height={16} className="invert rotate-45" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line mb-6">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-2 px-4 rounded-lg border border-white/20 hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${confirmButtonClass}`}
                        >
                            {isLoading ? 'Loading...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
