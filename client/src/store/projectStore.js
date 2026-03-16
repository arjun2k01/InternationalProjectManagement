import { create } from "zustand";

import * as projectService from "../services/project.service";

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getProjectId = (project) => project?.id || project?._id;

const upsertProject = (projects, nextProject) => {
  const nextProjectId = getProjectId(nextProject);

  if (!nextProjectId) {
    return projects;
  }

  const hasMatch = projects.some(
    (project) => String(getProjectId(project)) === String(nextProjectId)
  );

  if (!hasMatch) {
    return [nextProject, ...projects];
  }

  return projects.map((project) =>
    String(getProjectId(project)) === String(nextProjectId) ? nextProject : project
  );
};

const useProjectStore = create((set) => ({
  projects: [],
  currentProject: null,
  activities: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });

    try {
      const projects = await projectService.getProjects();
      set({
        projects: Array.isArray(projects) ? projects : [],
        isLoading: false,
      });
      return projects;
    } catch (error) {
      set({
        isLoading: false,
        error: extractErrorMessage(error, "Unable to load projects."),
      });
      throw error;
    }
  },

  fetchProjectById: async (projectId) => {
    if (!projectId) {
      return null;
    }

    set({ isLoading: true, error: null });

    try {
      const project = await projectService.getProject(projectId);
      set((state) => ({
        currentProject: project,
        projects: upsertProject(state.projects, project),
        isLoading: false,
      }));
      return project;
    } catch (error) {
      set({
        currentProject: null,
        activities: [],
        isLoading: false,
        error: extractErrorMessage(error, "Unable to load the project."),
      });
      throw error;
    }
  },

  fetchActivities: async (projectId, page = 1, limit = 20) => {
    if (!projectId) {
      return [];
    }

    try {
      const result = await projectService.getActivities(projectId, page, limit);
      const activities = Array.isArray(result?.activities) ? result.activities : [];
      set({ activities });
      return activities;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to load project activity."),
      });
      throw error;
    }
  },

  createProject: async (data) => {
    set({ error: null });

    try {
      const project = await projectService.createProject(data);
      set((state) => ({
        projects: upsertProject(state.projects, project),
        currentProject:
          String(getProjectId(state.currentProject)) === String(getProjectId(project))
            ? project
            : state.currentProject,
      }));
      return project;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to create the project."),
      });
      throw error;
    }
  },

  updateProject: async (projectId, data) => {
    set({ error: null });

    try {
      const project = await projectService.updateProject(projectId, data);
      set((state) => ({
        projects: upsertProject(state.projects, project),
        currentProject:
          String(getProjectId(state.currentProject)) === String(getProjectId(project))
            ? project
            : state.currentProject,
      }));
      return project;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to update the project."),
      });
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    set({ error: null });

    try {
      await projectService.deleteProject(projectId);
      set((state) => ({
        projects: state.projects.filter(
          (project) => String(getProjectId(project)) !== String(projectId)
        ),
        currentProject:
          String(getProjectId(state.currentProject)) === String(projectId)
            ? null
            : state.currentProject,
      }));
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to delete the project."),
      });
      throw error;
    }
  },

  addMember: async (projectId, email, role) => {
    set({ error: null });

    try {
      const project = await projectService.addMember(projectId, email, role);
      set((state) => ({
        currentProject: project,
        projects: upsertProject(state.projects, project),
      }));
      return project;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to add the member."),
      });
      throw error;
    }
  },

  removeMember: async (projectId, userId) => {
    set({ error: null });

    try {
      const project = await projectService.removeMember(projectId, userId);
      set((state) => ({
        currentProject: project,
        projects: upsertProject(state.projects, project),
      }));
      return project;
    } catch (error) {
      set({
        error: extractErrorMessage(error, "Unable to remove the member."),
      });
      throw error;
    }
  },
}));

export default useProjectStore;
