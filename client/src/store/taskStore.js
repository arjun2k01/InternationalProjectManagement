import { create } from "zustand";

import * as taskService from "../services/task.service";

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getTaskId = (task) => task?.id || task?._id;
const getUserId = (user) => user?.id || user?._id || user?.email;

const upsertTask = (tasks, nextTask) => {
  const nextTaskId = getTaskId(nextTask);

  if (!nextTaskId) {
    return tasks;
  }

  const hasMatch = tasks.some(
    (task) => String(getTaskId(task)) === String(nextTaskId)
  );

  if (!hasMatch) {
    return [nextTask, ...tasks];
  }

  return tasks.map((task) =>
    String(getTaskId(task)) === String(nextTaskId) ? nextTask : task
  );
};

const patchTask = (tasks, taskId, updates) =>
  tasks.map((task) =>
    String(getTaskId(task)) === String(taskId) ? { ...task, ...updates } : task
  );

const useTaskStore = create((set) => ({
  tasks: [],
  onlineUsers: [],
  isLoading: false,
  error: null,

  fetchTasks: async (projectId, filters = {}) => {
    if (!projectId) {
      return [];
    }

    set({ isLoading: true, error: null });

    try {
      const tasks = await taskService.getTasks(projectId, filters);
      set({
        tasks: Array.isArray(tasks) ? tasks : [],
        isLoading: false,
      });
      return tasks;
    } catch (error) {
      set({
        isLoading: false,
        error: extractErrorMessage(error, "Unable to load tasks."),
      });
      throw error;
    }
  },

  createTask: async (projectId, data) => {
    set({ error: null });

    try {
      const task = await taskService.createTask(projectId, data);
      set((state) => ({ tasks: upsertTask(state.tasks, task) }));
      return task;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to create the task."),
      });
      throw error;
    }
  },

  updateTask: async (projectId, taskId, data) => {
    set({ error: null });

    try {
      const task = await taskService.updateTask(projectId, taskId, data);
      set((state) => ({ tasks: upsertTask(state.tasks, task) }));
      return task;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to update the task."),
      });
      throw error;
    }
  },

  updateTaskStatus: async (projectId, taskId, status) => {
    set({ error: null });

    try {
      const task = await taskService.updateTaskStatus(projectId, taskId, status);
      set((state) => ({ tasks: upsertTask(state.tasks, task) }));
      return task;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to update the task status."),
      });
      throw error;
    }
  },

  deleteTask: async (projectId, taskId) => {
    set({ error: null });

    try {
      await taskService.deleteTask(projectId, taskId);
      set((state) => ({
        tasks: state.tasks.filter(
          (task) => String(getTaskId(task)) !== String(taskId)
        ),
      }));
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to delete the task."),
      });
      throw error;
    }
  },

  assignTask: async (projectId, taskId, assigneeId) => {
    set({ error: null });

    try {
      const task = await taskService.assignTask(projectId, taskId, assigneeId);
      set((state) => ({ tasks: upsertTask(state.tasks, task) }));
      return task;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to assign the task."),
      });
      throw error;
    }
  },

  handleTaskCreated: (payload) =>
    set((state) => ({
      tasks: upsertTask(state.tasks, payload?.task || payload),
    })),

  handleTaskUpdated: (payload) =>
    set((state) => ({
      tasks: upsertTask(state.tasks, payload?.task || payload),
    })),

  handleTaskStatusChanged: (payload) =>
    set((state) => ({
      tasks: payload?.task
        ? upsertTask(state.tasks, payload.task)
        : patchTask(state.tasks, payload?.taskId, {
            status: payload?.newStatus,
          }),
    })),

  handleTaskDeleted: (payload) =>
    set((state) => ({
      tasks: state.tasks.filter(
        (task) => String(getTaskId(task)) !== String(payload?.taskId || payload?.id)
      ),
    })),

  handleTaskAssigned: (payload) =>
    set((state) => ({
      tasks: payload?.task
        ? upsertTask(state.tasks, payload.task)
        : patchTask(state.tasks, payload?.taskId, {
            assignee: payload?.assignee || null,
          }),
    })),

  handleUserOnline: (user) =>
    set((state) => {
      const userId = getUserId(user);
      const hasUser = state.onlineUsers.some(
        (entry) => String(getUserId(entry)) === String(userId)
      );

      return hasUser
        ? state
        : { onlineUsers: [...state.onlineUsers, user] };
    }),

  handleUserOffline: (user) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter(
        (entry) => String(getUserId(entry)) !== String(getUserId(user))
      ),
    })),
}));

export default useTaskStore;
