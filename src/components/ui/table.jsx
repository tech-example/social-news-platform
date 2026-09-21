export function Table({ children, className = "" }) {
  return (
    <div className={`w-full overflow-x-auto border border-[var(--line)] rounded-lg ${className}`}>
      <table className="w-full text-left border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }) {
  return (
    <thead className="bg-[var(--surface)] text-[var(--ink-muted)] text-xs font-semibold uppercase tracking-wider border-b border-[var(--line)]">
      {children}
    </thead>
  );
}

export function TableBody({ children }) {
  return (
    <tbody className="divide-y divide-[var(--line)] bg-[var(--bg)]">
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = "" }) {
  return (
    <tr className={`hover:bg-[var(--surface)] transition-colors ${className}`}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = "" }) {
  return (
    <th scope="col" className={`px-4 py-3 font-semibold text-[var(--ink-muted)] ${className}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = "" }) {
  return (
    <td className={`px-4 py-3 text-[var(--ink)] align-middle ${className}`}>
      {children}
    </td>
  );
}
