#!/usr/bin/env node
import http from 'http';
import fs from 'node:fs';
import path from "node:path"
import { WebSocketServer, WebSocket } from 'ws';
import * as number from 'lib0/number';
import { setupWSConnection } from './utils.js';
import {
  getProblemDetails,
  getProblemRaw,
  getSolutionCode,
  getEntryName,
  getTests
} from './question.js';

// ----- In-memory state -----
const rooms = new Map(); // roomId -> { clients:Set<WebSocket>, problem:any|null, language:string, languageVotes:Map<clientId,string>, submitVotes:Map<clientId,{hash,language,code,ts}>, languageLockUntil:number }
const clientRooms = new Map(); // clientId -> roomId
const connections = new Map(); // ws -> clientId
const waitingQueue = []; // ws[]
let clientIdCounter = 0;

// Config
const ALLOWED_LANGS = new Set(['javascript', 'python']); // extend as you implement harnesses
const LANGUAGE_LOCK_MS = 10000;
const SUBMIT_VOTE_WINDOW_MS = 20000;

// Piston config
const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston';
const PISTON = {
  javascript: {
    language: 'javascript',
    version: process.env.PISTON_JS_VERSION || '18.15.0',
    filename: 'main.js'
  },
  python: {
    language: 'python',
    version: process.env.PISTON_PY_VERSION || '3.10.0',
    filename: 'main.py'
  }
};

// ----- Helpers -----
function sanitizeLang(lang) {
  if (!lang) return null;
  const l = String(lang).trim().toLowerCase();
  const alias = {
    js: 'javascript',
    node: 'javascript',
    'node.js': 'javascript',
    nodejs: 'javascript',
    py: 'python',
    python3: 'python',
    py3: 'python',
  };
  const mapped = alias[l] || l;
  return ALLOWED_LANGS.has(mapped) ? mapped : null;
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
    submitVotes: new Map(),
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

  const rawLang = msg?.data?.language;
  const proposed = sanitizeLang(rawLang);
  if (!proposed) {
    ws.send(JSON.stringify({
      type: 'LANGUAGE_VOTE_REJECTED',
      data: { reason: 'UNSUPPORTED_LANGUAGE', requested: rawLang, allowed: Array.from(ALLOWED_LANGS) },
    }));
    return;
  }

  room.languageVotes.set(clientId, proposed);

  const votesFor = Array.from(room.languageVotes.values()).filter((l) => l === proposed).length;
  broadcastRoom(room, {
    type: 'LANGUAGE_VOTE_PROGRESS',
    data: { language: proposed, votesFor, total: room.clients.size },
  });

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
    // Optional: else you could clear votes and broadcast a conflict, but not required
  }
}

// ----- Submit voting (2/2 same hash + language) -----
async function handleSubmitRequest(ws, msg) {
  const clientId = connections.get(ws);
  const roomId = clientRooms.get(clientId);
  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not in a room' }));
    return;
  }
  if (!room.problem) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'No problem set for this room yet' }));
    return;
  }

  const now = Date.now();
  const lang = sanitizeLang(msg?.data?.language) || room.language;
  const codeHash = String(msg?.data?.codeHash || '');
  const code = String(msg?.data?.code || '');

  // prune stale votes
  for (const [cid, info] of room.submitVotes.entries()) {
    if (now - info.ts > SUBMIT_VOTE_WINDOW_MS) room.submitVotes.delete(cid);
  }

  room.submitVotes.set(clientId, { hash: codeHash, language: lang, code, ts: now });

  broadcastRoom(room, {
    type: 'SUBMIT_PROGRESS',
    data: { votes: room.submitVotes.size, total: room.clients.size },
  });

  if (room.submitVotes.size === room.clients.size) {
    const values = Array.from(room.submitVotes.values());
    const sameLang = values.every((v) => v.language === values[0].language);
    const sameHash = values.every((v) => v.hash === values[0].hash);

    if (!sameLang || !sameHash) {
      broadcastRoom(room, {
        type: 'SUBMIT_CONFLICT',
        data: {
          reason: !sameLang ? 'LANGUAGE_MISMATCH' : 'HASH_MISMATCH',
        },
      });
      // Reset the vote round so users don’t get stuck comparing against stale votes
      room.submitVotes.clear();
      return;
    }

    // Both agreed: evaluate
    broadcastRoom(room, { type: 'SUBMIT_STARTED', data: {} });

    try {
      const chosen = values[0]; // both are identical by hash; take first
      const problemRaw = getProblemRaw(room.problem.id);
      if (!problemRaw) throw new Error('Problem not found for evaluation');

      const evalResult = await evaluateSubmission(problemRaw, chosen.language, chosen.code);
      if (evalResult.ok) {
        broadcastRoom(room, {
          type: 'SUBMIT_SUCCESS',
          data: { message: 'Outputs matched on all tests' },
        });
      } else {
        broadcastRoom(room, {
          type: 'SUBMIT_FAIL',
          data: {
            message: 'Outputs did not match or runtime error',
            details: evalResult.details || null,
          },
        });
      }
    } catch (e) {
      broadcastRoom(room, {
        type: 'SUBMIT_FAIL',
        data: { message: 'Evaluation error', error: String(e?.message || e) },
      });
    } finally {
      room.submitVotes.clear();
    }
  }
}

// ----- Evaluation via Piston -----
function composeProgram(language, baseCode, entryName, tests) {
  if (language === 'javascript') {
    const testsJson = JSON.stringify(tests);
    return `
${baseCode}

const __tests = ${testsJson};
const __out = __tests.map(args => ${entryName}(...args));
console.log(JSON.stringify(__out));
`;
  }
  if (language === 'python') {
    const testsJson = JSON.stringify(tests);
    return `
${baseCode}

import json
__tests_json = r'''${testsJson}'''
__tests = json.loads(__tests_json)
__out = []
for args in __tests:
    res = ${entryName}(*args)
    __out.append(res)
print(json.dumps(__out))
`;
  }
  throw new Error(`Unsupported language for composeProgram: ${language}`);
}

async function runOnPiston(language, program) {
  const cfg = PISTON[language];
  if (!cfg) throw new Error(`Unsupported language: ${language}`);

  const body = {
    language: cfg.language,
    version: cfg.version,
    files: [{ name: cfg.filename, content: program }],
    stdin: '',
    args: [],
    compile_timeout: 10000,
    run_timeout: 8000,
    run_memory_limit: 256000000,
  };

  const res = await fetch(`${PISTON_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Piston HTTP ${res.status}`);
  }
  const json = await res.json();
  const run = json.run || {};
  return {
    stdout: run.stdout || '',
    stderr: run.stderr || '',
    code: typeof run.code === 'number' ? run.code : 0,
  };
}

function lastJsonFromStdout(stdout) {
  // Pick the last well-formed JSON on stdout
  const lines = String(stdout || '').split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const v = JSON.parse(lines[i]);
      return { ok: true, value: v };
    } catch (_) {}
  }
  // fallback: try whole buffer
  try {
    return { ok: true, value: JSON.parse(stdout) };
  } catch (_) {
    return { ok: false, value: null };
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function evaluateSubmission(problemRaw, language, submittedCode) {
  if (!ALLOWED_LANGS.has(language)) {
    return { ok: false, details: { reason: 'UNSUPPORTED_LANGUAGE' } };
  }

  // Extract official solution and build harness
  const solutionCodeRaw = getSolutionCode(problemRaw, language);
  if (!solutionCodeRaw) {
    return { ok: false, details: { reason: 'NO_OFFICIAL_SOLUTION' } };
  }

  const entryName =
    getEntryName(problemRaw, language) ||
    (problemRaw.slug === 'two-sum' ? (language === 'python' ? 'twoSum' : 'twoSum') : null); // basic fallback

  if (!entryName) {
    return { ok: false, details: { reason: 'NO_ENTRY_NAME' } };
  }

  const tests = getTests(problemRaw) ||
    (problemRaw.slug === 'two-sum'
      ? [[[2,7,11,15], 9], [[3,2,4], 6], [[3,3], 6]]
      : null);

  if (!tests || !Array.isArray(tests) || !Array.isArray(tests[0])) {
    return { ok: false, details: { reason: 'NO_TESTS' } };
  }

  const solProgram = composeProgram(language, solutionCodeRaw, entryName, tests);
  const subProgram = composeProgram(language, submittedCode, entryName, tests);

  const [solRun, subRun] = await Promise.all([
    runOnPiston(language, solProgram),
    runOnPiston(language, subProgram),
  ]);

  if (solRun.code !== 0 || subRun.code !== 0) {
    return {
      ok: false,
      details: { reason: 'RUNTIME_ERROR', sol: solRun, sub: subRun }
    };
  }

  const solParsed = lastJsonFromStdout(solRun.stdout);
  const subParsed = lastJsonFromStdout(subRun.stdout);
  if (!solParsed.ok || !subParsed.ok) {
    return { ok: false, details: { reason: 'INVALID_OUTPUT_JSON', sol: solRun.stdout, sub: subRun.stdout } };
  }

  const equal = deepEqual(solParsed.value, subParsed.value);
  return {
    ok: equal,
    details: { sol: solParsed.value, sub: subParsed.value }
  };
}

// ----- Cleanup -----
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

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }));
      return;
    }
    switch (msg.type) {
      case 'JOIN': handleJoin(ws); break;
      case 'REQUEST_QUESTION': handleRequestQuestion(ws, msg); break;
      case 'LANGUAGE_VOTE': handleLanguageVote(ws, msg); break;
      case 'SUBMIT_REQUEST': await handleSubmitRequest(ws, msg); break;
      default:
        ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown type: ${msg.type}` }));
    }
  });

  ws.on('close', () => cleanupClient(ws));
  ws.on('error', () => cleanupClient(ws));
});

// ----- HTTP + Upgrade routing -----
const host = process.env.HOST || 'localhost';
const port = number.parseInt(process.env.PORT || '10000');

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

// this is terrible code: - Mentor
(async () => { server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`);
});})()

const host2 = process.env.HOST || 'localhost';
const port2 = number.parseInt(process.env.SRVPORT || '8080');

http.createServer((req, res) => {
    var filePath = '' + req.url;
    if (filePath == '/')  {
        filePath = '/index.html';
    }

    // SCUFF
    filePath = "./dist" + filePath

    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;      
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
    }

    fs.readFile(filePath, function(error, content) {
        if (error) {
            fs.readFile('./404.html', function(error, content) {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            });

            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    });
}).listen(port2, host2, () => {
    console.log("running CDN on port " + port2)
});


