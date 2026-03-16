import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useProjectStore from '../store/projectStore';
import useTaskStore from '../store/taskStore';
import useSocket from '../hooks/useSocket';

// Components
import TaskBoard from '../components/tasks/TaskBoard';
import MemberManager from '../components/projects/MemberManager';
import Loader from '../components/common/Loader';

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const authStore = useAuthStore();
  const projectStore = useProjectStore();
  const taskStore = useTaskStore();
  const { isConnected, onlineUsers } = useSocket(projectId);
  const { user } = authStore;
  const {
    addMember,
    activities,
    currentProject,
    fetchActivities,
    fetchProjectById,
    isLoading: isProjectLoading,
    error: projectError,
    removeMember,
  } = projectStore;
  const {
    fetchTasks,
    isLoading: isTasksLoading,
    error: taskError,
    tasks,
  } = taskStore;

  const [isMemberManagerOpen, setIsMemberManagerOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectById(projectId).catch(() => {});
      fetchActivities(projectId).catch(() => {});
      fetchTasks(projectId).catch(() => {});
    }
  }, [projectId, fetchActivities, fetchProjectById, fetchTasks]);

  if (projectError) return <Navigate to="/projects" replace />;

  const isLoading = isProjectLoading || isTasksLoading || !currentProject;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader size="lg" />
      </div>
    );
  }

  const currentUserId = user?.id || user?._id;
  const ownerId = currentProject?.owner?.id || currentProject?.owner?._id;
  const members = currentProject?.members || [];
  const membership = members.find((member) => {
    const memberUserId = member?.user?.id || member?.user?._id;
    return String(memberUserId) === String(currentUserId);
  });
  const canManage =
    String(ownerId) === String(currentUserId) ||
    ["admin", "project_manager"].includes(user?.role) ||
    membership?.role === "manager";
  const activeMembersCount = members.length;

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen">
      <header className="bg-white border-b px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex flex-col gap-1 mb-4 md:mb-0">
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-gray-900 leading-tight">
               {currentProject.name}
             </h1>
             {/* Small live connection blip */}
             <div className="flex items-center gap-1.5 px-2 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`}></span>
                {isConnected ? 'Real-time On' : 'Connecting...'}
             </div>
          </div>
          
          <p className="text-sm text-gray-500 max-w-2xl">
            {currentProject.description || "No description provided."}
          </p>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setIsMemberManagerOpen((prev) => !prev)}
            className="flex items-center px-4 py-2 border border-blue-500 text-blue-600 hover:bg-blue-50 bg-transparent rounded-md text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          >
            <svg className="w-5 h-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Members ({activeMembersCount})
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex relative">
         <div className="flex-1 overflow-auto bg-gray-50/50 p-4 sm:p-6 lg:p-8">
           {taskError && (
             <div className="mb-4 bg-red-50 p-4 rounded-md">
               <p className="text-sm text-red-700">{taskError}</p>
             </div>
           )}
           <TaskBoard
             activities={activities}
             members={members}
             onlineUsers={onlineUsers}
             projectId={projectId}
             tasks={tasks}
             taskStore={taskStore}
           />
         </div>

         {isMemberManagerOpen && (
           <div className="w-80 flex-shrink-0 border-l bg-white overflow-hidden shadow-lg z-10 hidden lg:block">
             <MemberManager 
               canManage={canManage}
               members={members}
               onAddMember={(email, role) => addMember(projectId, email, role)}
               onRemoveMember={(userId) => removeMember(projectId, userId)}
               owner={currentProject.owner}
             />
           </div>
         )}
      </main>

       {isMemberManagerOpen && (
          <div className="lg:hidden absolute inset-0 z-50 flex justify-end">
             <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMemberManagerOpen(false)}></div>
             <div className="relative w-full max-w-sm bg-white shadow-xl h-full pb-safe">
               <MemberManager 
                 canManage={canManage}
                 members={members}
                 onAddMember={(email, role) => addMember(projectId, email, role)}
                 onRemoveMember={(userId) => removeMember(projectId, userId)}
                 owner={currentProject.owner}
               />
             </div>
          </div>
       )}
    </div>
  );
};

export default ProjectDetailPage;
