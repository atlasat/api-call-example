import io from "socket.io-client";
import * as fs from "fs";
import "dotenv/config";
import { resolve } from "path";

const audio = [
  {
    format: "alaw",
    total: 9,
    extension: "alaw",
    duration: 25000,
    chunks: [],
  },
  {
    format: "mp3",
    total: 9, //10
    extension: "mp3",
    duration: 27000,
    chunks: [],
  },
  {
    format: "mulaw",
    total: 9,
    extension: "mulaw",
    duration: 25000,
    chunks: [],
  },
  {
    format: "pcm16",
    total: 9,
    extension: "pcm",
    duration: 25000,
    chunks: [],
  },
];

const buildAudio = () => {
  return [
    ...audio.map((item) => ({
      ...item,
      chunks: Array.from({ length: item.total }, (_, i) => i).map((chunk) =>
        fs.readFileSync(
          `./audio/${item.format}/output_${String(chunk).padStart(3, "0")}.${
            item.extension
          }`
        )
      ),
    })),
  ];
};

//const getAllAudio = buildAudio();
const playAudio = (audio, callback) => {
  if (audio.length > 0) {
    const format = audio[0];
    if (format) {
      const chunk = format.chunks.shift();
      if (format.chunks.length === 0) {
        audio.shift();
      }
      if (chunk) {
        callback(
          format.format,
          `label ${format.format} ${format.total - format.chunks.length}`,
          chunk,
          () => {
            if (format.chunks.length === 0) {
              audio.shift();
            }
            playAudio(callback);
          }
        );
      } else {
        audio.shift();
      }
    }
  }
};

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
let allAudioSession = {};
socket.on("newSession", (data) => {
  allAudioSession[data.sessionId] = buildAudio();
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
  playAudio(allAudioSession[data.sessionId], (format, label, audioBuffer) => {
    socket.emit(
      "audio",
      {
        sessionId: data.sessionId,
        audioData: audioBuffer,
        audioFormat: format,
        label: label,
      },
      (ack) => {
        console.log("ack", ack);
      }
    );
  });
});

socket.on("roomJoined", (data) => {
  console.log("room joined", data);
});

socket.on("hangup", (data) => {
  console.log("hangup call", data);
});

socket.on("dialStatus", async (status) => {
  console.log("dial status", status);
  if (status.status === "Connected") {
    playAudio(
      allAudioSession[status.sessionId],
      (format, label, audioBuffer) => {
        socket.emit(
          "audio",
          {
            sessionId: status.sessionId,
            audioData: audioBuffer,
            audioFormat: format,
            label: label,
          },
          (ack) => {
            console.log("ack", ack);
          }
        );
      }
    );
    // socket.emit("audio", {
    //   sessionId: status.sessionId,
    //   audioData: fs.readFileSync("./audio/tomy_G711.org_.wav"),
    //   label: "tomy page",
    //   audioFormat: "mulaw",
    // });
    // const readStream = fs.createReadStream("./audio/tomy_G711.org_.wav", {
    //   highWaterMark: 1024 * 10, // 2KB
    // });
    // const chunks = [];
    // readStream.on("data", async (chunk) => {
    //   console.log(`Received ${chunk.length} bytes`);
    //   // Proses chunk di sini
    //   chunks.push(
    //     new Promise((resolve) => {
    //       socket.emit("audio", {
    //         sessionId: status.sessionId,
    //         audioData: chunk,
    //         label: "tomy page" + Math.random(),
    //         audioFormat: "mulaw",
    //       });
    //       setTimeout(resolve, 1260);
    //     })
    //   );
    // });
    // await Promise.race(chunks);
    // await new Promise((resolve) => {
    //   readStream.on("end", () => {
    //     console.log("Done reading file.");
    //     resolve(true);
    //   });
    // });
    //socket.emit("interruption", { sessionId: status.sessionId });
    // const controller = new AudioController(audio);
    // controller
    //   .playAll((format, label, audioBuffer) => {
    //     console.log(`Playing: ${label}`);
    //     // Process audio buffer here
    //     socket.emit(
    //       "audio",
    //       {
    //         sessionId: status.sessionId,
    //         audioData: audioBuffer,
    //         audioFormat: format,
    //         label: label,
    //       },
    //       (ack) => {
    //         console.log("ack", ack);
    //       }
    //     );
    //   })
    //   .then(() => {
    //     console.log("Controller: All completed and cleared!");
    //   });
  }
});

socket.on("connect_error", (err) => {
  console.log(err); // prints the message associated with the error
});

socket.on("error", (data) => {
  console.log("error: ", data);
});

socket.on("audio", (data) => {});
