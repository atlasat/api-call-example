import io from "socket.io-client";
import * as fs from "fs";
import "dotenv/config";

const audio = [
  {
    format: "alaw",
    total: 9,
    extension: "alaw",
    chunks: [],
  },
  {
    format: "mp3",
    total: 10,
    extension: "mp3",
    chunks: [],
  },
  {
    format: "mulaw",
    total: 9,
    extension: "mulaw",
    chunks: [],
  },
  {
    format: "pcm16",
    total: 9,
    extension: "pcm",
    chunks: [],
  },
];

const buildAudio = () => {
  return audio.map((item) => ({
    ...item,
    chunks: Array.from({ length: 9 }, (_, i) => i).map((chunk) =>
      fs.readFileSync(
        `./audio/${item.format}/output_${String(chunk).padStart(3, "0")}.${
          item.extension
        }`
      )
    ),
  }));
};

const audioData = buildAudio();

const sendAudio = async (callback) => {
  const format = audioData.shift();
  if (format) {
    const sending = (callback) => {
      const audio = format.chunks.shift();
      if (audio) {
        setTimeout(() => {
          callback(
            format.format,
            `label ${format} ${format.total - format.chunks.length}`,
            audio
          );
          sending(callback);
        }, 200);
      } else {
        sendAudio(callback);
      }
    };
    sending(callback);
  }
};

//process.exit();

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
  if (status.status === "Connected") {
    sendAudio((format, label, chunk) => {
      socket.emit("audio", {
        sessionId: status.sessionId,
        audioData: chunk,
        audioFormat: format,
        label: label,
      });
    });
  }
});

socket.on("connect_error", (err) => {
  console.log(err); // prints the message associated with the error
});

socket.on("audio", (data) => {});
