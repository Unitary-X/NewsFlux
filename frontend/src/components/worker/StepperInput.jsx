import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function StepperInput({ value, onChange, min = 0, label }) {
    const handleDecrement = () => {
        if (value > min) onChange(value - 1);
    };

    const handleIncrement = () => {
        onChange(value + 1);
    };

    return (
        <div className="flex flex-col gap-2">
            {label && <span className="text-sm font-semibold text-slate-500">{label}</span>}
            <div className="flex items-center bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                <button
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="flex-1 p-4 flex justify-center items-center bg-white hover:bg-slate-50 active:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Minus className="w-5 h-5 text-slate-700" />
                </button>
                <div className="flex-1 text-center font-bold text-xl text-slate-800 border-x border-slate-200">
                    {value}
                </div>
                <button
                    onClick={handleIncrement}
                    className="flex-1 p-4 flex justify-center items-center bg-white hover:bg-slate-50 active:bg-slate-200 transition-colors"
                >
                    <Plus className="w-5 h-5 text-slate-700" />
                </button>
            </div>
        </div>
    );
}
