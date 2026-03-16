import api from "./api";

const extractPayload = (response) => response.data?.data ?? response.data;

const normalizeTaskPayload = (data = {}) => ({
  ...data,
  assigneeId: data.assigneeId ?? data.assignee ?? null,
});

const normalizeTaskFilters = (filters = {}) => ({
  ...filters,
  assigneeId: filters.assigneeId ?? filters.assignee,
});

export const getTasks = async (projectId, filters = {}) => {
  const response = await api.get(`/projects/${projectId}/tasks`, {
    params: normalizeTaskFilters(filters),
  });

  return extractPayload(response);
};

export const getTask = async (projectId, taskId) => {
  const response = await api.get(`/projects/${projectId}/tasks/${taskId}`);
  return extractPayload(response);
};

export const createTask = async (projectId, data) => {
  const response = await api.post(
    `/projects/${projectId}/tasks`,
    normalizeTaskPayload(data)
  );

  return extractPayload(response);
};

export const updateTask = async (projectId, taskId, data) => {
  const response = await api.put(
    `/projects/${projectId}/tasks/${taskId}`,
    normalizeTaskPayload(data)
  );

  return extractPayload(response);
};

export const updateTaskStatus = async (projectId, taskId, status) => {
  const payload =
    typeof status === "string"
      ? { status }
      : {
          status: status?.status,
          order: status?.order,
        };

  const response = await api.patch(
    `/projects/${projectId}/tasks/${taskId}/status`,
    payload
  );

  return extractPayload(response);
};

export const deleteTask = async (projectId, taskId) => {
  const response = await api.delete(`/projects/${projectId}/tasks/${taskId}`);
  return extractPayload(response);
};

export const assignTask = async (projectId, taskId, assigneeId) => {
  const response = await api.patch(`/projects/${projectId}/tasks/${taskId}/assign`, {
    assigneeId,
  });

  return extractPayload(response);
};
