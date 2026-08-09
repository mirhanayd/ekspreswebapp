export const Card = ({ children, className = '' }: any) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}>
    {children}
  </div>
);
export const CardHeader = ({ children, className = '' }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
);
export const CardTitle = ({ children, className = '' }: any) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);
export const CardContent = ({ children, className = '' }: any) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);
export const Badge = ({ children, variant = 'default', className = '' }: any) => {
  const bg =
    variant === 'secondary'
      ? 'bg-secondary text-secondary-foreground'
      : 'bg-primary text-primary-foreground';
  return (
    <div
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${bg} ${className}`}
    >
      {children}
    </div>
  );
};
export const Table = ({ children, className = '' }: any) => (
  <div className="w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className}`}>{children}</table>
  </div>
);
export const TableHeader = ({ children, className = '' }: any) => (
  <thead className={`[&_tr]:border-b ${className}`}>{children}</thead>
);
export const TableBody = ({ children, className = '' }: any) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`}>{children}</tbody>
);
export const TableRow = ({ children, className = '' }: any) => (
  <tr
    className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`}
  >
    {children}
  </tr>
);
export const TableHead = ({ children, className = '' }: any) => (
  <th
    className={`h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}
  >
    {children}
  </th>
);
export const TableCell = ({ children, className = '' }: any) => (
  <td className={`p-2 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</td>
);
