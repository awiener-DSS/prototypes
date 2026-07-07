import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CatalogKey, Product } from '../types';

export interface PartPreviewTarget {
  product: Product;
  catalogKey: CatalogKey;
}

interface PartPreviewContextValue {
  preview: PartPreviewTarget | null;
  openPartPreview: (product: Product, catalogKey: CatalogKey) => void;
  closePartPreview: () => void;
  lookupPart: (partNumber: string) => PartPreviewTarget | null;
}

const PartPreviewContext = createContext<PartPreviewContextValue | null>(null);

export function PartPreviewProvider({
  children,
  catalog,
}: {
  children: ReactNode;
  catalog: Record<string, Product[]>;
}) {
  const [preview, setPreview] = useState<PartPreviewTarget | null>(null);

  const partIndex = useMemo(() => {
    const map = new Map<string, PartPreviewTarget>();
    for (const [catalogKey, products] of Object.entries(catalog)) {
      for (const product of products) {
        map.set(product.part.toLowerCase(), { product, catalogKey: catalogKey as CatalogKey });
      }
    }
    return map;
  }, [catalog]);

  const lookupPart = useCallback(
    (partNumber: string): PartPreviewTarget | null => {
      const trimmed = partNumber.trim();
      if (!trimmed) return null;
      return partIndex.get(trimmed.toLowerCase()) ?? null;
    },
    [partIndex],
  );

  const openPartPreview = useCallback((product: Product, catalogKey: CatalogKey) => {
    setPreview({ product, catalogKey });
  }, []);

  const closePartPreview = useCallback(() => setPreview(null), []);

  return (
    <PartPreviewContext.Provider value={{ preview, openPartPreview, closePartPreview, lookupPart }}>
      {children}
    </PartPreviewContext.Provider>
  );
}

export function usePartPreview() {
  const ctx = useContext(PartPreviewContext);
  if (!ctx) throw new Error('usePartPreview must be used within PartPreviewProvider');
  return ctx;
}
