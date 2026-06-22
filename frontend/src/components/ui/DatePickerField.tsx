import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEventHandler,
  type InputHTMLAttributes,
  type Ref,
} from 'react';

type PickerType = 'date' | 'month';

type DatePickerFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helper?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement>;
  pickerType: PickerType;
};

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});
const shortMonthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function dateToValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthToValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseDateValue(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseMonthValue(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;

  return new Date(year, month, 1);
}

function valueToString(value: InputHTMLAttributes<HTMLInputElement>['value']) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function normalizeViewDate(value: string, pickerType: PickerType) {
  return (
    (pickerType === 'date' ? parseDateValue(value) : parseMonthValue(value)) ??
    new Date()
  );
}

function buildDateCells(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function isOutsideLimit(value: string, min?: string | number, max?: string | number) {
  const minValue = min === undefined ? '' : String(min);
  const maxValue = max === undefined ? '' : String(max);
  return Boolean((minValue && value < minValue) || (maxValue && value > maxValue));
}

function setRef(ref: Ref<HTMLInputElement> | undefined, node: HTMLInputElement | null) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(node);
    return;
  }
  ref.current = node;
}

function monthLabel(date: Date) {
  const label = monthFormatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function makeInputEvent(input: HTMLInputElement) {
  return {
    target: input,
    currentTarget: input,
    type: 'change',
  } as ChangeEvent<HTMLInputElement>;
}

export function DatePickerField({
  label,
  error,
  helper,
  inputClassName = '',
  inputRef,
  pickerType,
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  required,
  min,
  max,
  name,
  id,
  placeholder,
  ...props
}: DatePickerFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const controlledValue = valueToString(value);
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(valueToString(defaultValue));
  const fieldValue = isControlled ? controlledValue : uncontrolledValue;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => normalizeViewDate(fieldValue, pickerType));
  const today = useMemo(() => new Date(), []);
  const dateCells = useMemo(() => buildDateCells(viewDate), [viewDate]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function assignHiddenInput(node: HTMLInputElement | null) {
    hiddenInputRef.current = node;
    setRef(inputRef, node);
  }

  function emitChange(nextValue: string) {
    if (!isControlled) setUncontrolledValue(nextValue);

    const input = hiddenInputRef.current;
    if (!input) return;

    input.value = nextValue;
    onChange?.(makeInputEvent(input));
  }

  function emitBlur() {
    const input = hiddenInputRef.current;
    if (!input) return;
    onBlur?.({
      target: input,
      currentTarget: input,
      type: 'blur',
    } as Parameters<NonNullable<typeof onBlur>>[0]);
  }

  const handleRootBlur: FocusEventHandler<HTMLDivElement> = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      emitBlur();
    }
  };

  function selectDate(date: Date) {
    emitChange(dateToValue(date));
    setOpen(false);
  }

  function selectMonth(monthIndex: number) {
    const nextDate = new Date(viewDate.getFullYear(), monthIndex, 1);
    emitChange(monthToValue(nextDate));
    setViewDate(nextDate);
    setOpen(false);
  }

  function moveView(amount: number) {
    setViewDate((current) => {
      const next = new Date(current);
      if (pickerType === 'date') {
        next.setMonth(current.getMonth() + amount);
      } else {
        next.setFullYear(current.getFullYear() + amount);
      }
      return next;
    });
  }

  const displayValue =
    fieldValue && pickerType === 'date'
      ? dateFormatter.format(parseDateValue(fieldValue) ?? new Date())
      : fieldValue && pickerType === 'month'
        ? monthLabel(parseMonthValue(fieldValue) ?? new Date())
        : placeholder || (pickerType === 'date' ? 'Selecionar data' : 'Selecionar mês');

  const selectedDateValue = pickerType === 'date' ? fieldValue : '';
  const selectedMonthValue = pickerType === 'month' ? fieldValue : '';
  const currentMonthValue = monthToValue(today);
  const currentDateValue = dateToValue(today);

  return (
    <div ref={rootRef} className="relative block text-sm font-medium text-slate-700" onBlur={handleRootBlur}>
      <span>{label}</span>
      <input
        {...props}
        ref={assignHiddenInput}
        type="hidden"
        name={name}
        id={id}
        value={fieldValue}
        defaultValue={undefined}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        onChange={onChange}
      />
      <button
        type="button"
        className={`${inputClassName} flex items-center justify-between gap-3 text-left ${
          !fieldValue ? 'text-slate-500' : ''
        }`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) setViewDate(normalizeViewDate(fieldValue, pickerType));
          setOpen((current) => !current);
        }}
      >
        <span className="truncate">{displayValue}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-[#103B73]" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={pickerType === 'date' ? 'Selecionar data' : 'Selecionar mês'}
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/70 bg-white/90 p-3 text-slate-800 shadow-2xl shadow-slate-900/15 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-[#103B73]/10 hover:text-[#103B73] focus:outline-none focus:ring-2 focus:ring-[#103B73]/30"
              onClick={() => moveView(-1)}
              aria-label={pickerType === 'date' ? 'Mês anterior' : 'Ano anterior'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-slate-950">
              {pickerType === 'date' ? monthLabel(viewDate) : viewDate.getFullYear()}
            </p>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-[#103B73]/10 hover:text-[#103B73] focus:outline-none focus:ring-2 focus:ring-[#103B73]/30"
              onClick={() => moveView(1)}
              aria-label={pickerType === 'date' ? 'Próximo mês' : 'Próximo ano'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {pickerType === 'date' ? (
            <>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-[#103B73]">
                {weekdays.map((weekday, index) => (
                  <span key={`${weekday}-${index}`} className="py-1">
                    {weekday}
                  </span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {dateCells.map((date) => {
                  const valueForDate = dateToValue(date);
                  const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                  const isSelected = valueForDate === selectedDateValue;
                  const isToday = valueForDate === currentDateValue;
                  const unavailable = isOutsideLimit(valueForDate, min, max);

                  return (
                    <button
                      key={valueForDate}
                      type="button"
                      disabled={unavailable}
                      className={`flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#103B73]/30 disabled:cursor-not-allowed disabled:opacity-35 ${
                        isSelected
                          ? 'bg-[#071A3D] text-white shadow-sm'
                          : isToday
                            ? 'bg-[#103B73]/10 text-[#103B73]'
                            : isCurrentMonth
                              ? 'text-slate-800 hover:bg-slate-100'
                              : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      onClick={() => selectDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const monthDate = new Date(viewDate.getFullYear(), monthIndex, 1);
                const valueForMonth = monthToValue(monthDate);
                const isSelected = valueForMonth === selectedMonthValue;
                const isCurrentMonth = valueForMonth === currentMonthValue;
                const unavailable = isOutsideLimit(valueForMonth, min, max);

                return (
                  <button
                    key={valueForMonth}
                    type="button"
                    disabled={unavailable}
                    className={`min-h-10 rounded-xl px-2 text-sm font-semibold capitalize transition focus:outline-none focus:ring-2 focus:ring-[#103B73]/30 disabled:cursor-not-allowed disabled:opacity-35 ${
                      isSelected
                        ? 'bg-[#071A3D] text-white shadow-sm'
                        : isCurrentMonth
                          ? 'bg-[#103B73]/10 text-[#103B73]'
                          : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => selectMonth(monthIndex)}
                  >
                    {shortMonthFormatter.format(monthDate).replace('.', '')}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-3">
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-xs font-bold text-[#103B73] transition hover:bg-[#103B73]/10 focus:outline-none focus:ring-2 focus:ring-[#103B73]/30"
              onClick={() => {
                const next = new Date();
                emitChange(pickerType === 'date' ? dateToValue(next) : monthToValue(next));
                setViewDate(next);
                setOpen(false);
              }}
            >
              {pickerType === 'date' ? 'Hoje' : 'Mês atual'}
            </button>
            {!required && fieldValue && (
              <button
                type="button"
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#103B73]/30"
                onClick={() => {
                  emitChange('');
                  setOpen(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {helper && !error && <span className="mt-1 block text-xs text-slate-500">{helper}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  );
}
