import { useCallback, useEffect, useState } from "react";

import { loadPreferences, savePreferencesPatch } from "./storage";

export function useComposerStripCoachMark(enabled: boolean) {
  const [coachResolved, setCoachResolved] = useState(!enabled);
  const [coachSeen, setCoachSeen] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setCoachResolved(true);
      setCoachSeen(true);
      return;
    }

    let cancelled = false;
    void loadPreferences()
      .then((preferences) => {
        if (!cancelled) {
          setCoachSeen(preferences.stripComposerCoachSeen === true);
          setCoachResolved(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoachSeen(false);
          setCoachResolved(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const dismissCoachMark = useCallback(() => {
    setCoachSeen(true);
    void savePreferencesPatch({ stripComposerCoachSeen: true }).catch(() => {});
  }, []);

  return {
    coachSeen,
    dismissCoachMark,
    showCoachMark: enabled && coachResolved && !coachSeen,
  };
}
