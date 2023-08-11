const express = require("express");
const app = express();
const path = require("path");

app.use(express.static("public"));
// require("dotenv").config();

const serverPort = process.env.PORT || 3000;
const httpServerPort = 80;
const server = app.listen(serverPort, () => {
  console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);
});

const WebSocket = require("ws");
const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

// Create HTTP server to serve webpages
const wwwFolderPath = path.join(__dirname, "www");
const httpServer = express();
httpServer.use(express.static(wwwFolderPath));
httpServer.listen(httpServerPort, () => {
  console.log(`HTTP server started on port ${httpServerPort}`);
});

let keepAliveId;

wss.on("connection", function (ws, req) {
  console.log("Connection Opened");
  console.log("Client size: ", wss.clients.size);

  if (wss.clients.size === 1) {
    console.log("first connection. starting keepalive");
    keepServerAlive();
  }

  ws.on("message", (data) => {
    let stringifiedData = data.toString();
    if (stringifiedData === 'pong') {
      console.log('keepAlive');
      return;
    }
    broadcast(ws, stringifiedData, false);
  });

  ws.on("close", (data) => {
    console.log("closing connection");

    if (wss.clients.size === 0) {
      console.log("last client disconnected, stopping keepAlive interval");
      clearInterval(keepAliveId);
    }
  });
});

// Implement broadcast function because ws doesn't have it
const broadcast = (ws, message, includeSelf) => {
  if (includeSelf) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } else {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};

/**
 * Sends a ping message to all connected clients every 50 seconds
 */
const keepServerAlive = () => {
  keepAliveId = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('ping');
      }
    });
  }, 50000);
};
