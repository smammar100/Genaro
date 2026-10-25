'use client';

import * as React from 'react';

/** document.body once mounted (null during SSR and the first client render). */
export function usePortalTarget(): HTMLElement | null {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setTarget(document.body), []);
  return target;
}
