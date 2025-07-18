'use client';
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface DropdownOption {
    value: string;
    label: string;
    disabled?: boolean;
    subtitle?: string;
}

interface DropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    loading?: boolean;
    className?: string;
    icon?: string;
    showChevron?: boolean;
    searchable?: boolean;
    maxHeight?: string;
}

export default function Dropdown({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    disabled = false,
    required = false,
    loading = false,
    className = "",
    icon,
    showChevron = true,
    searchable = false,
    maxHeight = "max-h-60"
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen, searchable]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isOpen) return;

            const filteredOptions = searchable 
                ? options.filter(opt => !opt.disabled && opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
                : options.filter(opt => !opt.disabled);
            const currentIndex = filteredOptions.findIndex(opt => opt.value === value);

            switch (event.key) {
                case 'Escape':
                    setIsOpen(false);
                    setSearchTerm("");
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    const nextIndex = currentIndex < filteredOptions.length - 1 ? currentIndex + 1 : 0;
                    if (filteredOptions[nextIndex]) {
                        onChange(filteredOptions[nextIndex].value);
                    }
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredOptions.length - 1;
                    if (filteredOptions[prevIndex]) {
                        onChange(filteredOptions[prevIndex].value);
                    }
                    break;
                case 'Enter':
                case ' ':
                    if (!searchable) {
                        event.preventDefault();
                        setIsOpen(false);
                        setSearchTerm("");
                    }
                    break;
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, options, value, onChange, searchable, searchTerm]);

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = loading ? 'Loading...' : selectedOption ? selectedOption.label : placeholder;

    const handleOptionSelect = (optionValue: string) => {
        if (disabled || loading) return;
        
        const selectedOpt = options.find(opt => opt.value === optionValue);
        if (selectedOpt && !selectedOpt.disabled) {
            onChange(optionValue);
            setIsOpen(false);
        }
    };

    const toggleDropdown = () => {
        if (disabled || loading) return;
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchTerm("");
        }
    };

    // Filter options based on search term
    const filteredOptions = searchable && searchTerm 
        ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={toggleDropdown}
                className={`w-full p-2.5 pr-5 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-left flex items-center justify-between
                    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[.08]'}
                    ${!selectedOption && !loading ? 'text-white/50' : ''}
                `}
                disabled={disabled || loading}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-required={required}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {icon && (
                        <Image
                            src={icon}
                            alt=""
                            width={16}
                            height={16}
                            className="opacity-60 flex-shrink-0 invert"
                        />
                    )}
                    <span className="truncate">{displayText}</span>
                </div>
                
                {showChevron && (
                    <Image
                        src="/chevron-right.svg"
                        alt=""
                        width={16}
                        height={16}
                        className={`opacity-60 transition-transform flex-shrink-0 ${
                            isOpen ? 'rotate-270' : 'rotate-90'
                        }`}
                    />
                )}
            </button>

            {isOpen && !disabled && !loading && (
                <div className={`absolute top-full left-0 mt-2 w-full bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg z-50 ${maxHeight} overflow-hidden`}>
                    {searchable && (
                        <div className="p-2 border-b border-white/10">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search options..."
                                className="w-full p-2 text-sm rounded-md bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors"
                            />
                        </div>
                    )}
                    <div className="py-2 overflow-y-auto max-h-52">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-white/50">
                                {searchable && searchTerm ? 'No matching options' : 'No options available'}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleOptionSelect(option.value)}
                                    className={`w-full text-left px-4 py-2 transition-colors text-sm ${
                                        option.disabled
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:bg-white/10'
                                    } ${
                                        value === option.value
                                            ? 'bg-white/5 text-green'
                                            : ''
                                    }`}
                                    disabled={option.disabled}
                                    role="option"
                                    aria-selected={value === option.value}
                                >
                                    <div>
                                        <div className="font-medium">{option.label}</div>
                                        {option.subtitle && (
                                            <div className="text-xs text-white/60">{option.subtitle}</div>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
