import React, { useState, useEffect, useMemo } from 'react';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';
import { generateId } from '../utils/id';
import { Plus, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import type { FunctionGraphElement } from '../types/geoElements';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Convert math expression to LaTeX format
const expressionToLaTeX = (expr: string): string => {
    let latex = expr;
    // Common conversions
    latex = latex.replace(/\*\*/g, '^'); // ** to ^
    latex = latex.replace(/\*/g, ' \\cdot '); // * to ·
    latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
    // Inverse trig functions
    latex = latex.replace(/asin\(/g, '\\arcsin(');
    latex = latex.replace(/acos\(/g, '\\arccos(');
    latex = latex.replace(/atan\(/g, '\\arctan(');
    latex = latex.replace(/arcsin\(/g, '\\arcsin(');
    latex = latex.replace(/arccos\(/g, '\\arccos(');
    latex = latex.replace(/arctan\(/g, '\\arctan(');
    // Regular trig
    latex = latex.replace(/sin\(/g, '\\sin(');
    latex = latex.replace(/cos\(/g, '\\cos(');
    latex = latex.replace(/tan\(/g, '\\tan(');
    // Log with base: log(base, x) -> log_base(x)
    latex = latex.replace(/log\((\d+),\s*([^)]+)\)/g, '\\log_{$1}($2)');
    latex = latex.replace(/log\(/g, '\\log(');
    latex = latex.replace(/ln\(/g, '\\ln(');
    latex = latex.replace(/exp\(/g, '\\exp(');
    latex = latex.replace(/abs\(([^)]+)\)/g, '|$1|');
    latex = latex.replace(/pi/g, '\\pi');
    latex = latex.replace(/\^(\d+)/g, '^{$1}'); // x^2 to x^{2}
    latex = latex.replace(/\^([a-z])/g, '^{$1}'); // x^n to x^{n}
    latex = latex.replace(/\^\(([^)]+)\)/g, '^{$1}'); // x^(1/2) to x^{1/2}
    return latex;
};

// Validate expression by trying to compile with mathjs
const validateExpression = (expr: string): { valid: boolean; error?: string } => {
    try {
        // Basic validation - try to parse
        if (!expr.trim()) return { valid: false, error: '请输入公式' };
        // Check for obvious errors
        if (expr.includes('()')) return { valid: false, error: '空括号' };
        if (/[+\-*/^]{2,}/.test(expr.replace(/\*\*/g, '^').replace(/\^\-/g, ''))) return { valid: false, error: '连续运算符' };
        if ((expr.match(/\(/g) || []).length !== (expr.match(/\)/g) || []).length) {
            return { valid: false, error: '括号不匹配' };
        }
        // Check for valid function names (including inverse trig)
        const validFuncs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'arcsin', 'arccos', 'arctan', 'log', 'ln', 'exp', 'sqrt', 'abs', 'pow'];
        const funcMatch = expr.match(/[a-z]+\(/gi);
        if (funcMatch) {
            for (const func of funcMatch) {
                const funcName = func.slice(0, -1).toLowerCase();
                if (!validFuncs.includes(funcName) && funcName !== 'x') {
                    return { valid: false, error: `未知函数: ${funcName}` };
                }
            }
        }
        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message || '语法错误' };
    }
};

export const FormulaInputBar: React.FC = () => {
    const activeTool = useToolStore((state) => state.activeTool);
    const selection = useGeoStore((state) => state.selection);
    const elements = useGeoStore((state) => state.elements);
    const addElement = useGeoStore((state) => state.addElement);
    const updateElement = useGeoStore((state) => state.updateElement);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const setActiveTool = useToolStore((state) => state.setActiveTool);

    const [expression, setExpression] = useState('x^2');

    // Check if a function is selected
    const selectedFunction = selection.length === 1
        ? (elements[selection[0]] as FunctionGraphElement | undefined)
        : undefined;
    const isFunctionSelected = selectedFunction?.type === 'function_graph';

    // Show when: function tool is active OR a function is selected
    const shouldShow = activeTool === 'function' || isFunctionSelected;

    // When a function is selected, load its expression
    useEffect(() => {
        if (isFunctionSelected && selectedFunction?.expression) {
            setExpression(selectedFunction.expression);
        } else if (activeTool === 'function' && !isFunctionSelected) {
            setExpression('x^2');
        }
    }, [isFunctionSelected, selectedFunction?.id, activeTool]);

    // Validate and render LaTeX
    const { latexHtml, isValid, errorMessage } = useMemo(() => {
        const validation = validateExpression(expression);
        if (!validation.valid) {
            return { latexHtml: '', isValid: false, errorMessage: validation.error || '语法错误' };
        }
        try {
            const latex = expressionToLaTeX(expression);
            const html = katex.renderToString(latex, {
                throwOnError: false,
                displayMode: false,
            });
            return { latexHtml: html, isValid: true, errorMessage: undefined };
        } catch (e: any) {
            return { latexHtml: '', isValid: false, errorMessage: '渲染错误' };
        }
    }, [expression]);

    const handleRedraw = () => {
        if (!isValid || !isFunctionSelected || !selectedFunction) return;
        // Update existing function
        updateElement(selectedFunction.id, {
            expression,
            name: `f(x) = ${expression}`
        });
    };

    const handleAddNew = () => {
        if (!isValid) return;
        // Create new function
        addElement({
            id: generateId(),
            type: 'function_graph',
            name: `f(x) = ${expression}`,
            visible: true,
            style: { stroke: '#ef4444', strokeWidth: 1.5 },
            dependencies: [],
            definition: { type: 'function_expression', expression },
            expression: expression
        } as any);
        // Clear for next input
        setExpression('x^2');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isValid) {
            if (isFunctionSelected) {
                handleRedraw();
            } else {
                handleAddNew();
            }
        } else if (e.key === 'Escape') {
            setActiveTool('select');
        }
    };

    if (!shouldShow) {
        return null;
    }

    return (
        <div className={clsx(
            "fixed left-1/2 -translate-x-1/2 bottom-12 rounded-lg shadow-lg px-4 py-3 z-20 flex items-center gap-4",
            darkTheme ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        )} style={{ minWidth: '650px', maxWidth: '90vw' }}>
            {/* Left: Input */}
            <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium whitespace-nowrap">f(x) =</span>
                <input
                    type="text"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="如 x^2, sin(x), log(2,x)"
                    autoFocus
                    className={clsx(
                        "border rounded px-3 py-1.5 flex-1 text-sm font-mono min-w-[180px]",
                        darkTheme ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300",
                        !isValid && expression && "border-red-400"
                    )}
                />
            </div>

            {/* Center: Action Icons */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Redraw button - only show when function is selected */}
                {isFunctionSelected && (
                    <button
                        onClick={handleRedraw}
                        disabled={!isValid}
                        className={clsx(
                            "rounded-full p-2 transition-colors",
                            isValid
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        )}
                        title="重绘函数"
                    >
                        <RefreshCw size={18} />
                    </button>
                )}

                {/* Add new button - always show, centered */}
                <button
                    onClick={handleAddNew}
                    disabled={!isValid}
                    className={clsx(
                        "rounded-full p-2 transition-colors",
                        isValid
                            ? "bg-blue-500 text-white hover:bg-blue-600"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    )}
                    title="新增函数"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Right: LaTeX Preview */}
            <div className={clsx(
                "flex-1 min-w-[180px] text-sm overflow-hidden",
                darkTheme ? "text-gray-200" : "text-gray-700"
            )}>
                {isValid ? (
                    <div
                        className="text-lg leading-relaxed break-words"
                        dangerouslySetInnerHTML={{ __html: latexHtml }}
                    />
                ) : (
                    <div className="text-red-500 text-sm flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{errorMessage}</span>
                    </div>
                )}
            </div>

            {/* Close button - return to default toolbar */}
            <button
                onClick={() => setActiveTool('select')}
                className={clsx(
                    "rounded-full p-2 transition-colors ml-2",
                    darkTheme
                        ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                )}
                title="返回"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
};
