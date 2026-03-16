import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useTaskStore from '../store/taskStore';
import socketService from '../services/socket.service';

const useSocket = (projectId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const { token } = useAuthStore();
  const taskStore = useTaskStore();

  useEffect(() => {
    if (!token || !projectId) return;

    // Connect socket using our token
    socketService.connect(token);
    
    // Once connected, join the room
    const onConnect = () => {
      setIsConnected(true);
      socketService.joinProject(projectId);
    };
    
    const onDisconnect = () => {
      setIsConnected(false);
      setOnlineUsers([]);
    };

    // Register handlers securely
    const registerSocketEvents = () => {
      socketService.on("connect", onConnect);
      socketService.on("disconnect", onDisconnect);
      
      // Task events
      socketService.on("task:created", (payload) => taskStore.handleTaskCreated(payload));
      socketService.on("task:updated", (payload) => taskStore.handleTaskUpdated(payload));
      socketService.on("task:status_changed", (payload) => taskStore.handleTaskStatusChanged(payload));
      socketService.on("task:deleted", (payload) => taskStore.handleTaskDeleted(payload));
      socketService.on("task:assigned", (payload) => taskStore.handleTaskAssigned(payload));
      
      // User presence events (assuming presence tracked in the room)
      socketService.on("user:online", (user) => {
        setOnlineUsers((prev) => {
          if (!prev.find(u => u.id === user.id)) {
             toast(`${user.name} came online`);
             return [...prev, user];
          }
          return prev;
        });
        taskStore.handleUserOnline?.(user);
      });
      
      socketService.on("user:offline", (user) => {
        setOnlineUsers((prev) => prev.filter(u => u.id !== user.id));
        toast(`${user.name} went offline`);
        taskStore.handleUserOffline?.(user);
      });
      
      // Error handling
      socketService.on("error", (error) => {
        toast.error(error.message || "Socket connection error");
        console.error("Socket error:", error);
      });
    };

    registerSocketEvents();

    // If socket is already connected when this runs, join the room immediately
    if (socketService.socket && socketService.socket.connected) {
      onConnect();
    }

    return () => {
      if (projectId) {
        socketService.leaveProject(projectId);
      }
      socketService.removeAllListeners();
      // Only disconnect if your app design doesn't share the socket globally across other pages
    };
  }, [projectId, token]); // Re-run if navigating between projects

  return { isConnected, onlineUsers };
};

export default useSocket;
