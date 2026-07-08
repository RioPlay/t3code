import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { applyMaestroAuthBypass } from "./maestroAuthBypass";
import { isMaestroAuthBypassEnabled } from "./maestroMode";

export function MaestroAuthBypassBootstrap(props: { readonly children: ReactNode }) {
  const [ready, setReady] = useState(!isMaestroAuthBypassEnabled());

  useEffect(() => {
    if (!isMaestroAuthBypassEnabled()) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await applyMaestroAuthBypass();
      if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return null;
  }

  return props.children;
}
