import { useEffect, useState } from "react";

import { applyMaestroAuthBypass, isMaestroAuthBypassEnabled } from "./maestroAuthBypass";

export function MaestroAuthBypassBootstrap() {
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

  return null;
}
