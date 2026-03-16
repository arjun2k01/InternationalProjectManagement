import Button from "../common/Button";
import ProjectCard from "./ProjectCard";

export default function ProjectList({
  onCreateProject,
  onSelectProject,
  projects = [],
}) {
  if (!projects.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">No projects yet. Create one!</h3>
        <p className="mt-2 text-sm text-slate-500">
          Start with a project and organize work across tasks, members, and activity.
        </p>

        {onCreateProject ? (
          <div className="mt-6">
            <Button onClick={onCreateProject}>Create project</Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id || project._id}
          project={project}
          onClick={onSelectProject}
        />
      ))}
    </div>
  );
}
