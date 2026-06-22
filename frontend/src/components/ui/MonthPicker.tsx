import { Input } from './Field';

export function MonthPicker({
  value,
  onChange,
  label = 'Mês',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return <Input label={label} type="month" value={value} onChange={(e) => onChange(e.target.value)} />;
}
