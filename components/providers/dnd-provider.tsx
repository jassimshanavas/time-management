'use client';

// @ts-ignore - react-dnd types are not working properly with Next.js
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export function DndProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    // @ts-ignore - react-dnd types are not working properly with Next.js
    <DndProvider backend={HTML5Backend}>
      {children}
    </DndProvider>
  );
}
