import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money, numberValue } from '../../utils/format';

const colors = ['#071A3D', '#0B2D5C', '#2563eb', '#16a34a', '#f59e0b', '#dc2626'];

type CategoryDatum = {
  category: string;
  total?: string | number;
  amount?: string | number;
};

function compactMoney(value: string | number) {
  const n = numberValue(value);
  if (Math.abs(n) >= 1000000) return `R$ ${(n / 1000000).toFixed(1)} mi`;
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(1)} mil`;
  return money(n).replace(',00', '');
}

export function CategoryPie({ data }: { data: CategoryDatum[] }) {
  const rows = data.map((row) => ({
    name: row.category,
    value: numberValue(row.total ?? row.amount),
  }));
  return (
    <div className="h-[320px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="76%"
            paddingAngle={2}
          >
            {rows.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => money(Number(value))} />
          <Legend
            verticalAlign="bottom"
            height={48}
            iconType="circle"
            wrapperStyle={{ fontSize: 12, lineHeight: '18px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeExpenseBars({
  income,
  expenses,
}: {
  income: string | number;
  expenses: string | number;
}) {
  const rows = [
    { name: 'Receitas', valor: numberValue(income) },
    { name: 'Despesas', valor: numberValue(expenses) },
  ];
  return (
    <div className="h-[320px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 26, right: 18, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis
            width={72}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => compactMoney(Number(value))}
          />
          <Tooltip formatter={(value) => money(Number(value))} />
          <Bar dataKey="valor" radius={[8, 8, 0, 0]} fill="#0B2D5C" maxBarSize={96}>
            <LabelList
              dataKey="valor"
              position="top"
              formatter={(value) => compactMoney(Number(value ?? 0))}
              className="fill-slate-700 text-xs font-semibold"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvolutionLine({ data }: { data: Array<{ month: string; total: string | number }> }) {
  const rows = data.map((row) => ({ month: row.month, total: numberValue(row.total) }));
  return (
    <div className="h-[320px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 24, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            width={72}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => compactMoney(Number(value))}
          />
          <Tooltip formatter={(value) => money(Number(value))} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#0B2D5C"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
