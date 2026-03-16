import React, { useEffect, useState } from 'react';
import useProjectStore from '../store/projectStore';
import ProjectList from '../components/projects/ProjectList';
import CreateProjectModal from '../components/projects/CreateProjectModal';

const ProjectsPage = () => {
  const projectStore = useProjectStore();
  const { fetchProjects, projects, isLoading, error } = projectStore;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Projects</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create Project
        </button>
      </div>

      {error && (
         <div className="rounded-md bg-red-50 p-4 mb-6">
           <div className="flex">
             <div className="ml-3">
               <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
               <div className="mt-2 text-sm text-red-700">
                 <p>{error}</p>
               </div>
             </div>
           </div>
         </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ProjectList
          projects={projects}
          onCreateProject={() => setIsCreateModalOpen(true)}
        />
      )}

      {isCreateModalOpen && (
        <CreateProjectModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          projectStore={projectStore}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
