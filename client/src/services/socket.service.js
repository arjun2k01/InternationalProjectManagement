import { io } from "socket.io-client";

const SOCKET_EVENTS = [
  "task:created",
  "task:updated",
  "task:status_changed",
  "task:deleted",
  "task:assigned",
  "user:online",
  "user:offline",
  "error",
];

const rawApiUrl = import.meta.env.VITE_API_URL;
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;

const normalizeBaseUrl = (url) => String(url).replace(/\/+$/, "");

const resolveSocketUrl = () =>
  rawSocketUrl
    ? normalizeBaseUrl(rawSocketUrl)
    : rawApiUrl
      ? normalizeBaseUrl(rawApiUrl).replace(/\/api$/, "")
      : window.location.origin;

class SocketService {
  constructor() {
    this.socket = null;
    this.connectionPromise = null;
    this.currentToken = null;
  }

  createSocket(token) {
    this.currentToken = token;

    this.socket = io(resolveSocketUrl(), {
      autoConnect: false,
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.io.on("reconnect_attempt", () => {
      this.socket.auth = { token: this.currentToken };
    });

    return this.socket;
  }

  connect(token) {
    if (!token) {
      return Promise.reject(new Error("A socket token is required."));
    }

    if (this.socket && this.currentToken && this.currentToken !== token) {
      this.disconnect();
    }

    if (!this.socket) {
      this.createSocket(token);
    } else {
      this.currentToken = token;
      this.socket.auth = { token };
    }

    if (this.socket.connected) {
      return Promise.resolve(this.socket);
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const cleanup = () => {
        this.socket.off("connect", handleConnect);
        this.socket.off("connect_error", handleConnectError);
      };

      const handleConnect = () => {
        cleanup();
        this.connectionPromise = null;
        resolve(this.socket);
      };

      const handleConnectError = (error) => {
        cleanup();
        this.connectionPromise = null;
        reject(
          error instanceof Error
            ? error
            : new Error(error?.message || "Socket connection failed.")
        );
      };

      this.socket.once("connect", handleConnect);
      this.socket.once("connect_error", handleConnectError);
      this.socket.connect();
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (!this.socket) {
      return;
    }

    this.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.connectionPromise = null;
    this.currentToken = null;
  }

  joinProject(projectId) {
    this.socket?.emit("join:project", { projectId });
  }

  leaveProject(projectId) {
    this.socket?.emit("leave:project", { projectId });
  }

  addListener(eventName, callback) {
    if (!this.socket || typeof callback !== "function") {
      return () => {};
    }

    this.socket.on(eventName, callback);
    return () => {
      this.socket?.off(eventName, callback);
    };
  }

  onTaskCreated(callback) {
    return this.addListener("task:created", callback);
  }

  onTaskUpdated(callback) {
    return this.addListener("task:updated", callback);
  }

  onTaskStatusChanged(callback) {
    return this.addListener("task:status_changed", callback);
  }

  onTaskDeleted(callback) {
    return this.addListener("task:deleted", callback);
  }

  onTaskAssigned(callback) {
    return this.addListener("task:assigned", callback);
  }

  onUserOnline(callback) {
    return this.addListener("user:online", callback);
  }

  onUserOffline(callback) {
    return this.addListener("user:offline", callback);
  }

  onError(callback) {
    return this.addListener("error", callback);
  }

  removeAllListeners() {
    if (!this.socket) {
      return;
    }

    SOCKET_EVENTS.forEach((eventName) => {
      this.socket.removeAllListeners(eventName);
    });
  }
}

export default new SocketService();
