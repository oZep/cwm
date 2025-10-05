'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

type Outgoing =
  | { type: 'JOIN' }
  | { type: 'REQUEST_QUESTION'; data?: { id?: number | null; language?: string | null } }
  | { type: 'LANGUAGE_VOTE'; data: { language: string } }
  | { type: 'SUBMIT_REQUEST'; data: { language: string; codeHash: string; code: string } };

type Incoming =
  | { type: 'WAITING'; message: string }
  | { type: 'ROOM_READY'; roomId: string; message?: string }
  | { type: 'QUESTION_DETAILS'; success: boolean; data: any }
  | { type: 'LANGUAGE_VOTE_PROGRESS'; data: { language: string; votesFor: number; total: number } }
  | { type: 'LANGUAGE_SET'; data: { language: string; lockMs: number } }
  | { type: 'LANGUAGE_VOTE_REJECTED'; data: { reason: string; until?: number; current?: string } }
  | { type: 'SUBMIT_PROGRESS'; data: { votes: number; total: number } }
  | { type: 'SUBMIT_CONFLICT'; data: { reason: string } }
  | { type: 'SUBMIT_STARTED'; data: {} }
  | { type: 'SUBMIT_SUCCESS'; data: { message: string } }
  | { type: 'SUBMIT_FAIL'; data: { message: string; error?: string; details?: any } }
  | { type: 'ERROR'; message: string };

type WSStatus = 'connecting' | 'open' | 'closed' | 'error';
type Listener = (msg: Incoming) => void;

type Ctx = {
  ws: WebSocket | null;
  status: WSStatus;
  send: (msg: Outgoing) => boolean;
  on: (type: Incoming['type'], handler: Listener) => () => void;
};

const SignalWSContext = createContext<Ctx | null>(null);

export function SignalWSProvider({
  url = 'ws://localhost:10000/signal',
  children,
}: {
  url?: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<WSStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  useEffect(() => {
    const ws = new WebSocket(`ws://https://cwm.definitelynotaniplogger.com/:10000/signal`);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => setStatus('open');
    ws.onerror = () => setStatus('error');
    ws.onclose = () => setStatus('closed');

    ws.onmessage = (evt) => {
      try {
        const msg: Incoming = JSON.parse(evt.data);
        const set = listenersRef.current.get(msg.type);
        set?.forEach((fn) => fn(msg));
      } catch (_) {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [url]);

  const value = useMemo<Ctx>(
    () => ({
      ws: wsRef.current,
      status,
      send: (msg) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        ws.send(JSON.stringify(msg));
        return true;
      },
      on: (type, handler) => {
        const map = listenersRef.current;
        const set = map.get(type) ?? new Set<Listener>();
        set.add(handler);
        map.set(type, set);
        return () => {
          const s = map.get(type);
          s?.delete(handler);
          if (s && s.size === 0) map.delete(type);
        };
      },
    }),
    [status]
  );

  return <SignalWSContext.Provider value={value}>{children}</SignalWSContext.Provider>;
}

export function useSignalWS() {
  const ctx = useContext(SignalWSContext);
  if (!ctx) throw new Error('useSignalWS must be used within SignalWSProvider');
  return ctx;
}
