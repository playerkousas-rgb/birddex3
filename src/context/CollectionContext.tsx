import React, { createContext, useContext } from 'react';
import { useCollection } from '../hooks/useCollection';

type CollectionHook = ReturnType<typeof useCollection>;

const CollectionContext = createContext<CollectionHook | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const collection = useCollection();
  return (
    <CollectionContext.Provider value={collection}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollectionContext() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollectionContext must be used within CollectionProvider');
  return ctx;
}
