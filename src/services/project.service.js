import api from "./api";

const extractPayload = (response) => response.data?.data ?? response.data;

export const getProjects = async () => {
  const response = await api.get("/projects");
  return extractPayload(response);
};

export const getProject = async (id) => {
  const response = await api.get(`/projects/${id}`);
  return extractPayload(response);
};

export const createProject = async (data) => {
  const response = await api.post("/projects", data);
  return extractPayload(response);
};

export const updateProject = async (id, data) => {
  const response = await api.put(`/projects/${id}`, data);
  return extractPayload(response);
};

export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);
  return extractPayload(response);
};

export const addMember = async (projectId, email, role) => {
  const response = await api.post(`/projects/${projectId}/members`, {
    email,
    role,
  });

  return extractPayload(response);
};

export const removeMember = async (projectId, userId) => {
  const response = await api.delete(`/projects/${projectId}/members/${userId}`);
  return extractPayload(response);
};

export const getActivities = async (projectId, page = 1, limit = 20) => {
  const response = await api.get(`/projects/${projectId}/activities`, {
    params: { page, limit },
  });

  return extractPayload(response);
};
