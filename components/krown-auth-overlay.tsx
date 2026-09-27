'use client';

import { useEffect, useRef, useState } from 'react';
import { KrownAuthGate } from '@/components/krown-auth-gate';
import '@/lib/dataStore-hardening';

const SESSION_KEY = 'krown_active_session';
const TOKEN_KEY = 'krown_session_token';
const PROFILE_KEY = 'krown_staff_profile';

function hasActivePageSession() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function clearPersistedStaffSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem('krown_organization_id');
  localStorage.removeItem('krown_branch_id');
}

export function KrownAuthOverlay() {
  const [show, setShow] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (window.location.pathname !== '/') return;
    const sync = () => {
      const activePageSession = hasActivePageSession();
      const hasCredentials = !!localStorage.getItem(TOKEN_KEY) && !!localStorage.getItem(PROFILE_KEY);

      if (activePageSession && hasCredentials) {
        dismissedRef.current = true;
        setShow(false);
        return;
      }

      if (dismissedRef.current) return;

      if (!activePageSession) {
        if (hasCredentials) clearPersistedStaffSession();
        setShow(true);
        return;
      }
      setShow(!hasCredentials);
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('krown-authenticated', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('krown-authenticated', sync as EventListener);
    };
  }, []);

  if (!show) return null;
  return <KrownAuthGate />;
}
