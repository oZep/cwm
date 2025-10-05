#!/usr/bin/env node
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as number from 'lib0/number';
import { setupWSConnection } from './utils.js';
import { getProblemDetails } from './question.js';

// ----- In-memory state -----
const rooms = new Map(); // roomId -> { clients:Set<WebSocket>, problem:any|null, language:string, languageVotes:Map<clientId,string>, runVotes:Map<clientId,{hash,language,ts}>, languageLockUntil:number }
const clientRooms = new Map(); // clientId -> roomId
const connections = new Map(); // ws -> clientId
const waitingQueue = []; // ws[]
let clientIdCounter = 0;

// Config
const ALLOWED_LANGS = new Set(['javascript', 'python', 'typescript', 'java', 'cpp']);
const LANGUAGE_LOCK_MS = 10000; // lock after a commit to avoid rapid flips
const RUN_VOTE_WINDOW_MS = 15000; // both need to vote within this window

// ----- Helpers -----
function sanitizeLang(lang) {
  if (!lang) return null;
  const l = String(lang).toLowerCase();
  return ALLOWED_LANGS.has(l) ? l : null;
}

function broadcastRoom(room, obj) {
  const msg = JSON.stringify(obj);
  for (const c of room.clients) {
    try { c.send(msg); } catch {}
  }
}

function getRoomFor(ws) {
  const clientId = connections.get(ws);
  const roomId = clientRooms.get(clientId);
  if (!roomId) return null;
  return rooms.get(roomId);
}

function makeRoom(wsA, wsB) {
  const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  rooms.set(roomId, {
    clients: new Set([wsA, wsB]),
    problem: null,
    language: 'javascript',
    languageVotes: new Map(),
    runVotes: new Map(),
    languageLockUntil: 0,
  });
  const idA = connections.get(wsA);
  const idB = connections.get(wsB);
  clientRooms.set(idA, roomId);
  clientRooms.set(idB, roomId);

  const payload = JSON.stringify({ type: 'ROOM_READY', roomId, message: 'Partner found' });
  try { wsA.send(payload); } catch {}
  try { wsB.send(payload); } catch {}
}

function handleJoin(ws) {
  // Drop dead sockets from queue
  while (waitingQueue.length && waitingQueue[0].readyState !== WebSocket.OPEN) {
    waitingQueue.shift();
  }
  if (waitingQueue.length > 0) {
    const partner = waitingQueue.shift();
    makeRoom(ws, partner);
  } else {
    waitingQueue.push(ws);
    ws.send(JSON.stringify({ type: 'WAITING', message: 'Waiting for a partner...' }));
  }
}

// ----- Question flow -----
function handleRequestQuestion(ws, msg) {
  const room = getRoomFor(ws);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not in a room' }));
    return;
  }
  if (!room.problem) {
    const id = msg?.data?.id ?? null;
    const language = msg?.data?.language ?? null;
    room.problem = getProblemDetails(id, language) || null;
  }
  ws.send(JSON.stringify({ type: 'QUESTION_DETAILS', success: true, data: room.problem }));
}

// ----- Language voting (2/2 consensus) -----
function handleLanguageVote(ws, msg) {
  const clientId = connections.get(ws);
  const roomId = clientRooms.get(clientId);
  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not in a room' }));
    return;
  }

  const now = Date.now();
  if (room.languageLockUntil && now < room.languageLockUntil) {
    ws.send(JSON.stringify({
      type: 'LANGUAGE_VOTE_REJECTED',
      data: { reason: 'LOCKED', until: room.languageLockUntil, current: room.language },
    }));
    return;
  }

  const proposed = sanitizeLang(msg?.data?.language);
  if (!proposed) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Unsupported language' }));
    return;
  }

  room.languageVotes.set(clientId, proposed);

  const votesFor = Array.from(room.languageVotes.values()).filter((l) => l === proposed).length;
  broadcastRoom(room, {
    type: 'LANGUAGE_VOTE_PROGRESS',
    data: { language: proposed, votesFor, total: room.clients.size },
  });

  // Require both clients to vote and agree
  if (room.clients.size >= 2 && room.languageVotes.size === room.clients.size) {
    const unique = new Set(room.languageVotes.values());
    if (unique.size === 1) {
      const agreedLang = unique.values().next().value;
      room.language = agreedLang;
      room.languageVotes.clear();
      room.languageLockUntil = now + LANGUAGE_LOCK_MS;
      broadcastRoom(room, {
        type: 'LANGUAGE_SET',
        data: { language: agreedLang, lockMs: LANGUAGE_LOCK_MS },
      });
    }
  }
}

// ----- Run voting (2/2 same hash + language) -----
function handleRunRequest(ws, msg) {
  const clientId = connections.get(ws);
  const roomId = clientRooms.get(clientId);
  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not in a room' }));
    return;
  }

  const now = Date.now();
  const lang = sanitizeLang(msg?.data?.language) || room.language;
  const codeHash = String(msg?.data?.codeHash || '');

  // prune stale votes
  for (const [cid, info] of room.runVotes.entries()) {
    if (now - info.ts > RUN_VOTE_WINDOW_MS) room.runVotes.delete(cid);
  }

  room.runVotes.set(clientId, { hash: codeHash, language: lang, ts: now });

  broadcastRoom(room, {
    type: 'RUN_PROGRESS',
    data: { votes: room.runVotes.size, total: room.clients.size },
  });

  if (room.runVotes.size === room.clients.size) {
    const values = Array.from(room.runVotes.values());
    const sameLang = values.every((v) => v.language === values[0].language);
    const sameHash = values.every((v) => v.hash === values[0].hash);

    if (sameLang && sameHash) {
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      broadcastRoom(room, {
        type: 'RUN_APPROVED',
        data: { runId, language: values[0].language, codeHash: values[0].hash },
      });
      room.runVotes.clear();
    } else {
      broadcastRoom(room, {
        type: 'RUN_CONFLICT',
        data: {
          reason: !sameLang ? 'LANGUAGE_MISMATCH' : 'HASH_MISMATCH',
          requested: values,
        },
      });
    }
  }
}

function cleanupClient(ws) {
  const clientId = connections.get(ws);
  connections.delete(ws);
  const idx = waitingQueue.indexOf(ws);
  if (idx >= 0) waitingQueue.splice(idx, 1);

  if (clientId) {
    const roomId = clientRooms.get(clientId);
    if (roomId) {
      clientRooms.delete(clientId);
      const room = rooms.get(roomId);
      if (room) {
        room.clients.delete(ws);
        if (room.clients.size === 0) rooms.delete(roomId);
      }
    }
  }
}

// ----- WebSocket servers -----
const yjsWSS = new WebSocketServer({ noServer: true });    // Binary Yjs protocol
yjsWSS.on('connection', (ws, req, opts) => setupWSConnection(ws, req, opts));

const signalWSS = new WebSocketServer({ noServer: true }); // JSON signaling
signalWSS.on('connection', (ws) => {
  const clientId = `client-${++clientIdCounter}`;
  connections.set(ws, clientId);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }));
      return;
    }
    switch (msg.type) {
      case 'JOIN': handleJoin(ws); break;
      case 'REQUEST_QUESTION': handleRequestQuestion(ws, msg); break;
      case 'LANGUAGE_VOTE': handleLanguageVote(ws, msg); break;
      case 'RUN_REQUEST': handleRunRequest(ws, msg); break;
      default:
        ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown type: ${msg.type}` }));
    }
  });

  ws.on('close', () => cleanupClient(ws));
  ws.on('error', () => cleanupClient(ws));
});

// ----- HTTP + Upgrade routing -----
const host = process.env.HOST || 'localhost';
const port = number.parseInt(process.env.PORT || '1234');

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('okay');
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/yjs/')) {
    const roomId = pathname.replace('/yjs/', '') || 'default';
    yjsWSS.handleUpgrade(request, socket, head, (ws) => {
      yjsWSS.emit('connection', ws, request, { docName: roomId, gc: true });
    });
  } else if (pathname === '/yjs') {
    const roomId = url.searchParams.get('roomId') || 'default';
    yjsWSS.handleUpgrade(request, socket, head, (ws) => {
      yjsWSS.emit('connection', ws, request, { docName: roomId, gc: true });
    });
  } else if (pathname === '/signal') {
    signalWSS.handleUpgrade(request, socket, head, (ws) => {
      signalWSS.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`);
});