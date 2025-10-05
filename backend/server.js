#!/usr/bin/env node
import { WebSocketServer } from "ws";
import http from "http";
import * as number from "lib0/number";
import { setupWSConnection } from "./utils.js";
import { getProblemDetails } from "./question.js";

// Map: { 'room-xyz': Set<ws_A, ws_B> }
const rooms = new Map();
// Map: { 'client-abc': 'room-xyz' } 
const clientRooms = new Map(); 
// Array: Stores clients (their unique ws objects) waiting for a partner.
const waitingQueue = []; 
// Map: Used for connection management and cleanup.
const connections = new Map();
let clientIdCounter = 0; 

function generateClientId() {
  return `client-${++clientIdCounter}`;
}

function processJoinRequest(ws, clientId) {
  if (waitingQueue.length > 0) {
    const wsPartner = waitingQueue.shift(); 
    const partnerId = connections.get(wsPartner);

    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newRoom = new Set([ws, wsPartner]);
    rooms.set(roomId, newRoom);
    
    clientRooms.set(clientId, roomId);
    clientRooms.set(partnerId, roomId);

    console.log(`Paired ${clientId} and ${partnerId} into new room ${roomId}.`);

    const roomReadyMessage = JSON.stringify({ 
      type: 'ROOM_READY', 
      roomId: roomId, 
      message: 'Partner found. Request the problem now.' 
    });
    
    ws.send(roomReadyMessage);
    wsPartner.send(roomReadyMessage);

  } else {
    waitingQueue.push(ws);
    console.log(`${clientId} placed in waiting queue. Queue size: ${waitingQueue.length}`);
    ws.send(JSON.stringify({ 
      type: 'WAITING', 
      message: 'Waiting for a partner...' 
    }));
  }
}

function handleRequestQuestion(ws, messageData) {
  const clientId = connections.get(ws);
  const roomId = clientRooms.get(clientId);

  if (!roomId) {
    ws.send(JSON.stringify({ type: "ERROR", message: "You are not in a room" }));
    return;
  }

  const room = rooms.get(roomId);
  if (!room.problem) {
    const { id, language } = messageData || {};
    const problem = getProblemDetails(id, language);
    room.problem = problem;
  }

  ws.send(JSON.stringify({ 
    type: "QUESTION_DETAILS", 
    success: true, 
    data: room.problem 
  }));
}

const wss = new WebSocketServer({ noServer: true });
const host = process.env.HOST || "localhost";
const port = number.parseInt(process.env.PORT || "1234");

const server = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("okay");
});

wss.on("connection", (ws, request) => {
  // Extract room from URL
  const url = new URL(request.url, `http://${request.headers.host}`);
  const roomId = url.pathname.substring(1) || 'default-room';
  
  const clientId = generateClientId();
  connections.set(ws, clientId);
  
  console.log(`New connection: ${clientId} for room ${roomId}`);
  
  // Handle messages
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      console.log("Received message:", message);
      
      if (message.type === "JOIN") {
        processJoinRequest(ws, clientId);
      } 
      else if (message.type === "REQUEST_QUESTION") {
        handleRequestQuestion(ws, message.data || {});
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  ws.on("close", () => {
    console.log(`Connection closed: ${clientId}`);
    connections.delete(ws);
    
    // Clean up from waiting queue
    const queueIndex = waitingQueue.indexOf(ws);
    if (queueIndex !== -1) {
      waitingQueue.splice(queueIndex, 1);
      console.log(`Removed ${clientId} from waiting queue`);
    }
    
    // Clean up from rooms
    const roomId = clientRooms.get(clientId);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`Deleted empty room: ${roomId}`);
        }
      }
      clientRooms.delete(clientId);
    }
  });
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`);
});