const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const lostPostRoutes = require("./routes/lostPostRoutes");
const foundPostRoutes = require("./routes/foundPostRoutes");
const chatRoutes = require("./routes/chatRoutes");
const errorHandler = require("./middleware/errorHandler");
const userRoutes = require("./routes/userRoutes");

dotenv.config();

const DB_URI = process.env.MONGODB_URI;

//establishing mongodb connection
// mongoose
//   .connect(DB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => {
//     console.log("Connected to MongoDB");
//   })
//   .catch((error) => {
//     console.error("Error connecting to MongoDB:", error.message);
//     process.exit(1);
//   });
// mongoose.connect(DB_URI)
//   .then(() => {
//     console.log("Connected to MongoDB");
//   })
//   .catch((error) => {
//     console.error("Error connecting to MongoDB:", error.message);
//     process.exit(1);
//   });

// Ensure this variable is set correctly in Vercel
async function connectToDatabase() {
  try {
    await mongoose.connect(DB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1); // Exit process if unable to connect
  }
}

// Call the function to establish the connection
connectToDatabase();



const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://lost-and-found-3ddca.web.app",
    methods: ["GET", "POST"],
  },
});

// Set 'io' globally to access it in the routes
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/posts/lost", lostPostRoutes);
app.use("/posts/found", foundPostRoutes);
app.use("/chat", chatRoutes);
app.use("/user", userRoutes);

// Health Check
app.get("/", (req, res) => {
  res.send("Lost and Found Server is running...");
});

// Error Handling
app.use(errorHandler);

// Store socket connections by user ID
const userSockets = new Map();

// Handle socket connection
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Store user socket on connection
  socket.on("setup", (userData) => {
    userSockets.set(userData.id, socket.id);
    socket.emit("connected");
  });

  // Handle sending a message
  socket.on("sendMessage", ({ senderID, receiverID, message }) => {
    const receiverSocket = userSockets.get(receiverID);
    if (receiverSocket) {
      io.to(receiverSocket).emit("receiveMessage", {
        senderID,
        receiverID,
        message,
        timestamp: new Date().toISOString(),
      });
      console.log(`Message sent from ${senderID} to ${receiverID}`);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    userSockets.delete(socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });
});

//define port
const PORT = process.env.PORT || 5002;

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
