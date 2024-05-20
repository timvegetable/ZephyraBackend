import { WebSocketServer } from "ws";
import * as fs from "fs";
import * as items from "./items.js";
import * as clients from "./clients.js";

//Starting code for creating the server, and what should happen to the client immediately after joining
const WSS = new WebSocketServer({ port: 3000 });
WSS.on("connection", (client) => {
  console.log("Client connected");
  client.send(
    JSON.stringify({
      cmd: "init",
      logo: fs.readFileSync("images/logo.png", "base64"),
      departments: items.DEPT_PATHS.map((path) => path.slice(0, -4)),
      // items: undefined,
      featured: [],
    }),
  );
  client.onmessage = (message) => clients.handleMessage(client, message);
  client.onclose = () => console.log("Client disconnected");
});

function startIfDone() {
  
}