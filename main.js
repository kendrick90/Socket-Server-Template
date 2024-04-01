const express = require("express");
const app = express();
const path = require("path");
const WebSocket = require("ws");

app.use(express.static("public")); // Serve static files from the "public" directory

const serverPort = process.env.PORT || 3000; // Set server port from environment variable or default to 3000
const httpServerPort = 80; // Port for HTTP server

const server = app.listen(serverPort, () => {
  console.log(`Server started on port ${serverPort}`);
});

const wss = new WebSocket.Server({ server }); // Create WebSocket server with existing HTTP server

// Create HTTP server to serve webpages
const wwwFolderPath = path.join(__dirname, "www");
const httpServer = express();
httpServer.use(express.static(wwwFolderPath)); // Serve static files from the "www" directory
httpServer.listen(httpServerPort, () => {
  console.log(`HTTP server started on port ${httpServerPort}`);
});

let keepAliveId; // Initialize variable to store the interval ID for keep-alive

wss.on("connection", function (ws, req) {
  console.log("Connection Opened");
  console.log("Client size: ", wss.clients.size);

  if (wss.clients.size === 1) {
    // Check if this is the first connection
    console.log("first connection. starting keepalive");
    keepServerAlive(); // Start the keep-alive interval
  }

  ws.on("message", (data) => {
    let stringifiedData = data.toString();
    if (stringifiedData === "pong") {
      // If received "pong" message, log and return
      console.log("keepAlive");
      return;
    }
    broadcast(ws, stringifiedData, false); // Broadcast message to other clients
  });

  ws.on("close", (data) => {
    // Event handler for closing connection
    console.log("closing connection");

    if (wss.clients.size === 0) {
      // If no clients remaining, stop keep-alive interval
      console.log("last client disconnected, stopping keepAlive interval");
      clearInterval(keepAliveId);
    }
  });
});

// Implement broadcast function because ws doesn't have it
const broadcast = (ws, message, includeSelf) => {
  if (includeSelf) {
    // Broadcast message to all clients including the sender
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } else {
    // Broadcast message to all clients except the sender
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
        client.send("ping"); // Send "ping" message to each client
      }
    });
  }, 50000); // Interval set to 50 seconds
};
