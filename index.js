import io from "socket.io-client";
import * as fs from "fs";

const audio = [
  {
    format: "ulaw",
    total: 5,
  },
];

const socket = io(process.env.SOCKET_SERVER, {
  reconnectionDelayMax: 10000,
  transports: ["websocket"],
  auth: {
    token: process.env.API_KEY,
  },
});

socket.on("connect", () => {
  console.log(socket.id); // "G5p5..."
});

let sessionId;
socket.on("newSession", (data) => {
  console.log("newSession", data);
  socket.emit("joinRoom", { sessionId: data.sessionId });
  sessionId = data.sessionId;
});

/**
 * added audio to queue
 */
socket.on("audioStarted", (data) => {
  console.log("audio started: ", data);
});

socket.on("audioCompleted", (data) => {
  console.log("audio completed: ", data);
});

socket.on("audioPlaying", (data) => {
  console.log("audio playing: ", data);
});

socket.on("roomJoined", (data) => {
  console.log("room joined", data);
});

socket.on("hangup", (data) => {
  console.log("hangup call", data);
});

socket.on("dialStatus", (status) => {
  console.log("dial status", status);
});

socket.on("connect_error", (err) => {
  console.log(err); // prints the message associated with the error
});

socket.on("audio", (data) => {});
