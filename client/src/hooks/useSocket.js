import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import useAuthStore from "../store/authStore";
import socketService from "../services/socket.service";
import useTaskStore from "../store/taskStore";

const normalizePresenceUser = (payload) => {
  const user = payload?.user ?? payload;
  const userId = user?.id || user?._id || payload?.userId;

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    _id: userId,
    name: user?.name || user?.email || `User ${String(userId).slice(-4)}`,
    email: user?.email || "",
    role: user?.role || "",
  };
};

const useSocket = (projectId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const token = useAuthStore((state) => state.token);
  const handleTaskCreated = useTaskStore((state) => state.handleTaskCreated);
  const handleTaskUpdated = useTaskStore((state) => state.handleTaskUpdated);
  const handleTaskStatusChanged = useTaskStore((state) => state.handleTaskStatusChanged);
  const handleTaskDeleted = useTaskStore((state) => state.handleTaskDeleted);
  const handleTaskAssigned = useTaskStore((state) => state.handleTaskAssigned);
  const handleUserOnline = useTaskStore((state) => state.handleUserOnline);
  const handleUserOffline = useTaskStore((state) => state.handleUserOffline);

  useEffect(() => {
    if (!token || !projectId) {
      return undefined;
    }

    let isActive = true;
    const disposers = [];

    const onConnect = () => {
      if (!isActive) {
        return;
      }

      setIsConnected(true);
      socketService.joinProject(projectId);
    };

    const onDisconnect = () => {
      if (!isActive) {
        return;
      }

      setIsConnected(false);
      setOnlineUsers([]);
    };

    const register = (eventName, handler) => {
      disposers.push(socketService.on(eventName, handler));
    };

    register("connect", onConnect);
    register("disconnect", onDisconnect);
    register("task:created", (payload) => handleTaskCreated(payload));
    register("task:updated", (payload) => handleTaskUpdated(payload));
    register("task:status_changed", (payload) => handleTaskStatusChanged(payload));
    register("task:deleted", (payload) => handleTaskDeleted(payload));
    register("task:assigned", (payload) => handleTaskAssigned(payload));
    register("user:online", (payload) => {
        const user = normalizePresenceUser(payload);

        if (!user) {
          return;
        }

        setOnlineUsers((prev) => {
          if (!prev.find((entry) => String(entry.id) === String(user.id))) {
            toast(`${user.name} came online`);
            return [...prev, user];
          }

          return prev;
        });
        handleUserOnline?.(user);
      });
    register("user:offline", (payload) => {
        const user = normalizePresenceUser(payload);

        if (!user) {
          return;
        }

        setOnlineUsers((prev) => prev.filter((entry) => String(entry.id) !== String(user.id)));
        toast(`${user.name} went offline`);
        handleUserOffline?.(user);
      });
    register("error", (error) => {
        if (!isActive) {
          return;
        }

        toast.error(error?.message || "Socket connection error");
        console.error("Socket error:", error);
      });

    socketService.connect(token).catch((error) => {
      if (!isActive) {
        return;
      }

      setIsConnected(false);
      toast.error(error?.message || "Unable to connect to real-time updates.");
    });

    if (socketService.socket && socketService.socket.connected) {
      onConnect();
    }

    return () => {
      isActive = false;

      if (projectId) {
        socketService.leaveProject(projectId);
      }
      disposers.forEach((dispose) => dispose());
    };
  }, [
    handleTaskAssigned,
    handleTaskCreated,
    handleTaskDeleted,
    handleTaskStatusChanged,
    handleTaskUpdated,
    handleUserOffline,
    handleUserOnline,
    projectId,
    token,
  ]);

  return { isConnected, onlineUsers };
};

export default useSocket;
