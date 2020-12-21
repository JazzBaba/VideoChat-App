import * as express from "express";
import { Application } from "express";
// import * as socketIO from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
 
const socketIO = require("socket.io");
const path = require('path'); 

export class Server {
 private httpServer: HTTPServer;
 private app: Application;
 private io: SocketIOServer;
 private activeSockets: string[] = [];
 
 private readonly DEFAULT_PORT = 443;
 
 constructor() {
   this.initialize();
   this.handleRoutes();
 }
 
 private initialize(): void {
   this.app = express();
   this.httpServer = createServer(this.app);
   this.io = socketIO(this.httpServer);
   
   this.configureApp();
   this.handleSocketConnection();

 }

 private configureApp(): void {
  this.app.use(express.static(path.join(__dirname, "../public")));
}
 
 private handleRoutes(): void {
   this.app.get("/", (req, res) => {
     res.send(`<h1>Hello World</h1>`); 
   });
 }
 
 private handleSocketConnection(): void {
  this.io.on("connection", socket => {
    const existingSocket = this.activeSockets.find(
      existingSocket => existingSocket === socket.id
    );

    if (!existingSocket) {
      console.log("Connected ",socket.id);
      this.activeSockets.push(socket.id);

      socket.emit("update-user-list", {
        users: this.activeSockets.filter(
          existingSocket => existingSocket !== socket.id
        )
      });

      socket.broadcast.emit("update-user-list", {
        users: [socket.id]
      });
    }

    socket.on("call-user", (data: any) => {
      socket.to(data.to).emit("call-made", {
        offer: data.offer,
        socket: socket.id
      });
    });

    socket.on("make-answer", data => {
      socket.to(data.to).emit("answer-made", {
        socket: socket.id,
        answer: data.answer
      });
    });

    socket.on("reject-call", data => {
      socket.to(data.from).emit("call-rejected", {
        socket: socket.id
      });
    });

    socket.on("disconnect", () => {
      this.activeSockets = this.activeSockets.filter(
        existingSocket => existingSocket !== socket.id
      );
      console.log("Disconect ",socket.id);
      socket.broadcast.emit("remove-user", {
        socketId: socket.id
      });
    });
  });
}

 
 public listen(callback: (port: number) => void): void {
   this.httpServer.listen( process.env.PORT, () =>
     callback(parseInt(process.env.PORT))
   );
 }
}