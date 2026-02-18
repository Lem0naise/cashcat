'use client';

import { useEffect, useState, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Parser } from 'expr-eval';

interface MoneyInputProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    currencySymbol?: boolean;
    className?: string;
    autoFocus?: boolean;
    inputRef?: RefObject<HTMLInputElement | null>;
    dataCategoryId?: string;
    canBeNegative?: boolean | false;
    inline?: boolean | false;
    disabled?: boolean | false;
}

export default function MoneyInput({
    value,
    onChange,
    onBlur,
    placeholder = "0.00",
    className = "",
    currencySymbol = false,
    autoFocus = false,
    inputRef,
    disabled = false,
    dataCategoryId,
    canBeNegative = false,
    inline = false,
}: MoneyInputProps) {
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [shouldReplaceValue, setShouldReplaceValue] = useState(true);

    useEffect(() => {
        // Detect mobile device
        const checkMobile = () => {
            return ((/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && window.innerWidth <= 768) || window.innerWidth <= 420);
        };
        setIsMobile(checkMobile());
    }, []);

    useEffect(() => {
        if (autoFocus && isMobile) {
            setShowKeypad(true);
        }
    }, [autoFocus, isMobile]);


    const evaluateExpression = (expression: string): number => {
        try {
            // Only allow numbers, +, -, *, /, ., and parentheses
            const sanitized = expression.replace(/[^0-9+\-*/.()]/g, '');
            if (!sanitized) return 0;

            const parser = new Parser();
            const result = parser.evaluate(sanitized);
            if (typeof result === 'number' && !isNaN(result)) {
                if (canBeNegative) return result;
                return Math.max(0, result);
            } else return 0;
        } catch {
            return 0;
        }
    };

    const handleKeypadInput = (input: string) => {
        if (input === 'backspace') {
            onChange(value.slice(0, -1));
            setShouldReplaceValue(false);
        } else if (input === '.') {
            if (shouldReplaceValue) {
                onChange('0.');
                setShouldReplaceValue(false);
            }
            else {
                // Allow decimal points after operators or at start
                const lastChar = value.slice(-1);
                if (value === '' || lastChar === '+' || lastChar === '-' || lastChar === '*' || lastChar === '/') {
                    onChange(value + '.');
                } else {
                    // Check if current number already has a decimal
                    const parts = value.split(/[+\-*/]/);
                    const currentNumber = parts[parts.length - 1];
                    if (!currentNumber.includes('.')) {
                        onChange(value + '.');
                    }
                }
            }
        } else if (input === '+') {
            onChange(value + '+');
            setShouldReplaceValue(false);
        } else if (input === '-') {
            onChange(value + '-');
            setShouldReplaceValue(false);
        } else if (input === '=') {
            // Evaluate expression in-place
            if (value && value !== '') {
                try {
                    const result = evaluateExpression(value);
                    onChange(result.toFixed(2));
                    setShouldReplaceValue(true);
                } catch {
                    // If evaluation fails, keep original value
                }
            }
        } else if (input === 'done') {
            if (value && value !== '') {
                // Evaluate the expression before closing
                try {
                    const result = evaluateExpression(value);
                    onChange(result.toFixed(2));
                    setShouldReplaceValue(true);
                } catch {
                    // If evaluation fails, keep original value
                }
            }
            if (onBlur) {
                onBlur();
            }
            setShowKeypad(false);


        } else {
            // Number input (0-9)
            if (shouldReplaceValue) {
                onChange(input);
                setShouldReplaceValue(false);
            }
            else if (value === '0' && input !== '.') {
                onChange(input);
            } else {
                onChange(value + input);
            }
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            // Evaluate expression before closing if there's a value
            if (value && value !== '') {
                try {
                    const result = evaluateExpression(value);
                    onChange(result.toFixed(2));
                    setShouldReplaceValue(true);
                } catch {
                    // If evaluation fails, keep original value
                }
            }
            if (onBlur) {
                onBlur();
            }
            setShowKeypad(false);
        }
    };

    const handleInputClick = () => {
        if (isMobile) {
            setShowKeypad(true);
        }
    };

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value.replace(/[^0-9+\-*/.()]/g, '');

        // Allow multiple decimal points for mathematical expressions
        if (inputValue === '' || /^[0-9+\-*/.()]*$/.test(inputValue)) {
            onChange(inputValue);
            setShouldReplaceValue(false);
        }
    };

    const handleNativeBlur = () => {
        if (value && value !== '') {
            try {
                const result = evaluateExpression(value);
                onChange(result.toFixed(2));
                setShouldReplaceValue(true);
            } catch {
                // If evaluation fails, keep original value
            }
        }
        if (onBlur) {
            onBlur();
        }
    };

    return (
        <>
            <div className="relative">
                {currencySymbol && (<span className={`absolute left-3 top-1/2 -translate-y-1/2 ${inline ? "text-lg" : "text-3xl"} text-white/50`}>£</span>)}
                <input
                    ref={inputRef}
                    onFocus={handleInputClick}
                    type={isMobile ? "text" : "tel"}
                    inputMode={isMobile ? "none" : "decimal"}
                    readOnly={isMobile}
                    value={value}
                    onChange={handleNativeChange}
                    onBlur={handleNativeBlur}
                    onClick={handleInputClick}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={`w-full p-4 ${currencySymbol ? 'pl-8' : ''} text-3xl rounded-lg bg-white/[.05] border border-white/[.15] focus:border-green focus:outline-none transition-colors touch-manipulation ${className}`}
                    data-category-id={dataCategoryId}
                />
            </div>

            {/* Custom Mobile Keypad - Rendered as Portal */}
            {isMobile && showKeypad && typeof window !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 bg-black/30 z-[9999] flex flex-col justify-end"
                    onClick={handleBackdropClick}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, fontFamily: 'var(--font-suse' }}
                >
                    <div
                        className="iphone-padding bg-black border-t border-white/[.15] p-3 rounded-t-xl"
                        style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
                    >
                        {/* Display */}
                        <div className="bg-white/[.05] rounded-lg p-3 mb-3">
                            <div className="text-left font-medium">
                                {currencySymbol && (<span className="text-white/50">£</span>)}
                                <span className="text-white text-xl ml-1 font-medium">
                                    {value || placeholder}
                                </span>
                            </div>
                        </div>

                        {/* Keypad - More compact 4x4 grid */}
                        <div className="grid grid-cols-4 gap-2">
                            {/* Row 1 */}
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('1')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                1
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('2')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                2
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('3')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                3
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('+')}
                                className="h-12 bg-green/20 hover:bg-green/30 rounded-lg text-green text-lg font-medium transition-colors border border-green/20"
                            >
                                +
                            </button>

                            {/* Row 2 */}
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('4')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                4
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('5')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                5
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('6')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                6
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('-')}
                                className="h-12 bg-green/20 hover:bg-green/30 rounded-lg text-green text-lg font-medium transition-colors border border-green/20"
                            >
                                -
                            </button>

                            {/* Row 3 */}
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('7')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                7
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('8')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                8
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('9')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                9
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('=')}
                                className="h-12 bg-blue/20 hover:bg-blue/30 rounded-lg text-blue text-lg font-medium transition-colors border border-blue/20"
                            >
                                =
                            </button>

                            {/* Row 4 */}
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('0')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('.')}
                                className="h-12 bg-white/[.05] hover:bg-white/[.1] rounded-lg text-white text-lg font-medium transition-colors border border-white/[.1]"
                            >
                                .
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('backspace')}
                                className="h-12 bg-reddy/20 hover:bg-reddy/30 rounded-lg text-reddy text-sm font-medium transition-colors border border-reddy/20 flex items-center justify-center"
                            >
                                ⌫
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadInput('done')}
                                className="h-12 bg-green hover:bg-green-dark rounded-lg text-black text-base font-medium transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>,
                document.getElementById("portal-root") || document.body
            )}
        </>
    );
}
