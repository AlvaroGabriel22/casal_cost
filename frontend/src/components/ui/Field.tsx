import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { DatePickerField } from './DatePickerField';

type BaseProps = {
  label: string;
  error?: string;
  helper?: string;
};

const control =
  'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#103B73] focus:ring-2 focus:ring-[#103B73]/20 disabled:bg-slate-100';

export const Input = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  function Input({ label, error, helper, className = '', ...props }, ref) {
    if (props.type === 'date' || props.type === 'month') {
      const pickerType = props.type === 'date' ? 'date' : 'month';
      return (
        <DatePickerField
          {...props}
          inputRef={ref}
          pickerType={pickerType}
          inputClassName={`${control} ${className}`}
          label={label}
          error={error}
          helper={helper}
        />
      );
    }

    return (
      <label className="block text-sm font-medium text-slate-700">
        {label}
        <input ref={ref} className={`${control} ${className}`} {...props} />
        {helper && !error && <span className="mt-1 block text-xs text-slate-500">{helper}</span>}
        {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, BaseProps & SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ label, error, helper, className = '', children, ...props }, ref) {
    return (
      <label className="block text-sm font-medium text-slate-700">
        {label}
        <select ref={ref} className={`${control} ${className}`} {...props}>
          {children}
        </select>
        {helper && !error && <span className="mt-1 block text-xs text-slate-500">{helper}</span>}
        {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ label, error, helper, className = '', ...props }, ref) {
    return (
      <label className="block text-sm font-medium text-slate-700">
        {label}
        <textarea ref={ref} className={`${control} min-h-24 resize-y ${className}`} {...props} />
        {helper && !error && <span className="mt-1 block text-xs text-slate-500">{helper}</span>}
        {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
    );
  },
);
