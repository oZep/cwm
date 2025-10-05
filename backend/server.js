#!/usr/bin/env node
import { WebSocketServer } from "ws";
import http from "http";
import * as number from "lib0/number";
import { setupWSConnection } from "./utils.js";
import { getProblemDetails } from "./question.js";
import { data } from "react-router-dom";

// Map: { 'room-xyz': Set<ws_A, ws_B> }
const rooms = new Map()
// Map: { 'client-abc': 'room-xyz' } 
const clientRooms = new Map(); 
// Array: Stores clients (their unique ws objects) waiting for a partner.
// A client waiting in the queue is NOT yet in a room.
const waitingQueue = []; 
// Map: Used for connection management and cleanup.
const connections = new Map();
let clientIdCounter = 0; 

function processJoinRequest(wsRequester, clientId) { // ws instance, clientId string
    if (waitingQueue.length > 0) {
        // partner is waiting: Create a new room and pair them immediately. 
        const wsPartner = waitingQueue.shift(); 
        const partnerId = connections.get(wsPartner);

        const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const newRoom = new Set([wsRequester, wsPartner]);
        rooms.set(roomId, newRoom);
        
        // update client-to-room mappings
        clientRooms.set(clientId, roomId);
        clientRooms.set(partnerId, roomId);

        console.log(`Paired ${clientId} and ${partnerId} into new room ${roomId}.`);

        // send "ROOM_READY" message to both clients
        const roomReadyMessage = JSON.stringify({ 
            type: 'ROOM_READY', 
            roomId: roomId, 
            message: 'Partner found. Request the problem now.' 
        });
        
        wsRequester.send(roomReadyMessage);
        wsPartner.send(roomReadyMessage);

    } else {
        // no partner waiting: Place the client in the queue.
        waitingQueue.push(wsRequester);
        
        console.log(`${clientId} placed in waiting queue. Queue size: ${waitingQueue.length}`);

        // send "WAITING" message back to the requester
        wsRequester.send(JSON.stringify({ 
            type: 'WAITING', 
            message: 'Waiting for a partner...' 
        }));
    }
}

function processLeaveRequest(wsLeaver, clientId) {
    const roomId = clientRooms.get(clientId);
    if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
            room.delete(wsLeaver);
        }
    }
}

function handleRequestQuestion(ws, message, messageData) {
  const clientId = connections.get(ws);
  const roomId = clientRooms.get(clientId);

  if (!roomId) {
    ws.send(JSON.stringify({ type: "ERROR", message: "You are not in a room" }));
    return;
  }

  // if the room does not have a question id assigned yet, assign one now
  if (!rooms.get(roomId).problem) {
    const { id, language } = message.data || {};
    const problem = getProblemDetails(id, language);
    rooms.get(roomId).problem = problem;
    response = { type: "QUESTION_DETAILS", success: true, data: problem };

  } else {
    response = { type: "QUESTION_DETAILS", success: true, data: rooms.get(roomId).problem };
  }

  ws.send(JSON.stringify(response));
}

const wss = new WebSocketServer({ noServer: true });
const host = process.env.HOST || "localhost";
const port = number.parseInt(process.env.PORT || "1234");

const server = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("okay");
});

wss.on("connection", setupWSConnection);

server.on("upgrade", (request, socket, head) => {
  // You may check auth of request here..
  // Call `wss.HandleUpgrade` *after* you checked whether the client has access
  // (e.g. by checking cookies, or url parameters).
  // See https://github.com/websockets/ws#client-authentication
  wss.handleUpgrade(
    request,
    socket,
    head,
    /** @param {any} ws */ (ws) => {
      wss.emit("connection", ws, request);
    }
  );
});

server.on("message", (msg) => {
  try {
    // getProblemDetails {"type": "REQUEST_QUESTION", "data": {"id": 1, "language": "javascript"}}'
    const message = JSON.parse(msg.toString());
    const clientId = connections.get(server);

    if (message.type === "JOIN") {
        processJoinRequest(server, clientId); // handles both client waiting and pairing messaging
    }

    if (message.type === "LEAVE") {
        processLeaveRequest(server, clientId);
    }

    if (message.type === "REQUEST_QUESTION") {
      handleRequestQuestion(server, message, message.data || {});
    }

  } catch (error) {
    console.error("Error handling message:", error);
  }
});

server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`);
});