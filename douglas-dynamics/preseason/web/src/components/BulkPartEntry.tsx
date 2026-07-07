import { useState } from 'react';
import { ChevronDown, ChevronRight, ListPlus } from 'lucide-react';
import { useOrder } from '../context/OrderContext';

export function BulkPartEntry() {
  const { bulkAddParts } = useOrder();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ added: number; notFound: string[] } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entries = input
      .split(/[\n,]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [part, qtyStr] = line.split(/[\s\t]+/);
        const qty = qtyStr ? Math.max(1, parseInt(qtyStr, 10) || 1) : 1;
        return { part: part.trim(), qty };
      });

    if (entries.length === 0) return;
    const res = bulkAddParts(entries);
    setResult(res);
    if (res.added > 0) setInput('');
  };

  return (
    <div className="bulk-entry">
      <button type="button" className="bulk-entry-toggle" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <ListPlus size={16} />
        Bulk add parts
      </button>
      {open && (
        <form className="bulk-entry-form" onSubmit={handleSubmit}>
          <p className="bulk-entry-hint">
            Enter one part per line. Optional quantity after part # (e.g. <code>85270 2</code>).
          </p>
          <textarea
            rows={4}
            value={input}
            onChange={(e) => { setInput(e.target.value); setResult(null); }}
            placeholder={'85270\n69500 3\n74340'}
          />
          <button type="submit" className="btn btn-secondary btn-sm">Add to order</button>
          {result && (
            <p className={`bulk-entry-result ${result.notFound.length ? 'warn' : 'ok'}`}>
              Added {result.added} part{result.added === 1 ? '' : 's'}.
              {result.notFound.length > 0 && ` Not found: ${result.notFound.join(', ')}`}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
