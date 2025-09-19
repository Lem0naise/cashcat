'use client';
import {useEffect, useRef, useState, useMemo} from 'react';
import Image from 'next/image';

export interface GroupedDropdownOption {
    value: string;
    label: string;
    subtitle?: string;
    group?: string;
}

interface GroupedDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: GroupedDropdownOption[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    icon?: string;
}

export default function GroupedDropdown({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    required = false,
    disabled = false,
    loading = false,
    className = '',
    icon
}: GroupedDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Group and sort options
    const groupedOptions = useMemo(() => {
        const groups: { [key: string]: GroupedDropdownOption[] } = {};
        
        // Group options by their group property
        options.forEach(option => {
            const groupName = option.group || 'Other';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(option);
        });

        // Sort groups alphabetically and sort options within each group
        const sortedGroups = Object.keys(groups)
            .sort((a, b) => a.localeCompare(b))
            .map(groupName => ({
                name: groupName,
                options: groups[groupName].sort((a, b) => a.label.localeCompare(b.label))
            }));

        return sortedGroups;
    }, [options]);

    const selectedOption = options.find(option => option.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
                disabled={disabled || loading}
                className={`w-full p-2.5 rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors text-left flex items-center justify-between ${
                    disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/[.1]'
                } ${className}`}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {icon && (
                        <Image
                            src={icon}
                            alt=""
                            width={16}
                            height={16}
                            className="opacity-50 invert flex-shrink-0"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        {selectedOption ? (
                            <div>
                                <div className="truncate">{selectedOption.label}</div>
                                {selectedOption.subtitle && (
                                    <div className="text-xs text-white/50 truncate">{selectedOption.subtitle}</div>
                                )}
                            </div>
                        ) : (
                            <span className="text-white/50">{placeholder}</span>
                        )}
                    </div>
                </div>
                <Image
                    src="/chevron-right.svg"
                    alt=""
                    width={16}
                    height={16}
                    className={`opacity-50 invert transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : 'rotate-270'}`}
                />
            </button>

            {isOpen && !disabled && !loading && (
                <div className="absolute z-50 w-full mt-1 bg-white/[.05] border border-white/[.15] rounded-lg overflow-hidden shadow-lg max-h-64 overflow-y-auto">
                    {groupedOptions.map((group, groupIndex) => (
                        <div key={group.name}>
                            {groupIndex > 0 && (
                                <div className="border-t border-white/[.1]" />
                            )}
                            <div className="px-3 py-2 text-sm font-medium text-green bg-bz">
                                {group.name}
                            </div>
                            {group.options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full px-4 py-2.5 text-left md:bg-black/[0.9] bg-black/[0.9] hover:bg-green/[0.9] transition-colors ${
                                        value === option.value ? 'bg-green/[.2] text-green' : ''
                                    }`}
                                >
                                    <div>
                                        <div className="truncate">{option.label}</div>
                                        {option.subtitle && (
                                            <div className="text-xs opacity-70 truncate">{option.subtitle}</div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))}
                    {groupedOptions.length === 0 && (
                        <div className="px-4 py-2.5 text-white/50">No options available</div>
                    )}
                </div>
            )}
        </div>
    );
}


