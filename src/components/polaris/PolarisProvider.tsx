'use client';

import * as React from 'react';

/** Any router link that renders an anchor from `href`, e.g. `Link` from `next/link`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LinkLikeComponent = React.ComponentType<any>;

interface PolarisContextValue {
  linkComponent?: LinkLikeComponent;
}

const PolarisContext = React.createContext<PolarisContextValue>({});

export interface PolarisProviderProps {
  /** Router link used for internal URLs (`url` props on Button, Link, Navigation items…). In Next.js pass `Link` from `next/link`. */
  linkComponent?: LinkLikeComponent;
  children?: React.ReactNode;
}

/**
 * Optional app-level provider. Wrap your app once (from a 'use client' file) so internal `url`s
 * navigate client-side through your router instead of doing full page loads.
 */
export function PolarisProvider({ linkComponent, children }: PolarisProviderProps) {
  const value = React.useMemo(() => ({ linkComponent }), [linkComponent]);
  return <PolarisContext.Provider value={value}>{children}</PolarisContext.Provider>;
}

export interface UnstyledLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  url: string;
  /** Opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
}

const HAS_SCHEME = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/** An anchor that routes internal URLs through the provider's linkComponent. Used by every component that takes a `url`. */
export function UnstyledLink({ url, external, target, rel, ...rest }: UnstyledLinkProps) {
  const { linkComponent: LinkComponent } = React.useContext(PolarisContext);
  if (external) {
    return <a href={url} target={target ?? '_blank'} rel={rel ?? 'noopener noreferrer'} {...rest} />;
  }
  if (LinkComponent && !HAS_SCHEME.test(url) && !url.startsWith('#')) {
    return <LinkComponent href={url} target={target} rel={rel} {...rest} />;
  }
  return <a href={url} target={target} rel={rel} {...rest} />;
}
