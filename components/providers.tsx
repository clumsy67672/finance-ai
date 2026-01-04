'use client';

import { ReactNode } from 'react';
import { SWRConfig } from 'swr';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: async (url: string, init?: RequestInit) => {
          const response = await fetch(url, init);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Request failed');
          }
          return response.json();
        },
        revalidateOnFocus: false
      }}
    >
      {children}
    </SWRConfig>
  );
}
