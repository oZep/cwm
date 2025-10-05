#!/usr/bin/env node
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as number from 'lib0/number';
import { setupWSConnection } from './utils.js';
import { getProblemDetails } from './question.js';

// State
const rooms = new Map(); // roomId -> { clients: Set<WebSocket>, problem?: any }
const clientRooms = new Map(); // clientId -> roomId
const connections = new Map(); // ws -> clientId
const waitingQueue = []; // clients waiting to be paired
let clientIdCounter = 0;

// Pairing logic
function makeRoom(wsA, wsB) {
  const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  rooms.set(roomId, { clients: new Set([wsA, wsB]), problem: null });
  const idA = connections.get(wsA);
  const idB = connections.get(wsB);
  clientRooms.set(idA, roomId);
  clientRooms.set(idB, roomId);
  const payload = JSON.stringify({ type: 'ROOM_READY', roomId, message: 'Partner found' });
  try { wsA.send(payload); } catch {}
  try { wsB.send(payload); } catch {}
}

function handleJoin(ws, clientId) {
  // drop dead sockets from queue
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

function handleRequestQuestion(ws, msg) {
  const clientId = connections.get(ws);
  const roomId = clientRooms.get(clientId);
  if (!roomId) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not in a room' }));
    return;
  }
  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
    return;
  }
  if (!room.problem) {
    const id = msg.data?.id ?? null;
    const language = msg.data?.language ?? null;
    room.problem = getProblemDetails(id, language); // ensure this returns { id, language, content, ... }
  }
  ws.send(JSON.stringify({ type: 'QUESTION_DETAILS', success: true, data: room.problem }));
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

// WebSocket servers
const yjsWSS = new WebSocketServer({ noServer: true });    // binary (Yjs)
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
      case 'JOIN':
        handleJoin(ws, clientId);
        break;
      case 'REQUEST_QUESTION':
        handleRequestQuestion(ws, msg);
        break;
      default:
        ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown type: ${msg.type}` }));
    }
  });

  ws.on('close', () => cleanupClient(ws));
  ws.on('error', () => cleanupClient(ws));
});

// HTTP + Upgrade
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
      // Pass docName so Yjs uses the roomId as the doc
      yjsWSS.emit('connection', ws, request, { docName: roomId, gc: true });
    });
  } else if (pathname === '/yjs') {
    // allow ws://host:port/yjs?roomId=...
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