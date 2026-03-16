import { useNavigate } from "react-router-dom";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  archived: "bg-slate-100 text-slate-600 ring-slate-200",
};

function formatDate(value) {
  if (!value) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProjectCard({ onClick, project }) {
  const navigate = useNavigate();
  const projectId = project?.id || project?._id;
  const memberCount =
    (project?.members?.length || 0) + (project?.owner ? 1 : 0);

  const handleClick = () => {
    if (!projectId) {
      return;
    }

    if (onClick) {
      onClick(project);
      return;
    }

    navigate(`/projects/${projectId}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 transition group-hover:text-slate-700">
            {project?.name || "Untitled project"}
          </h3>
          <p
            className="text-sm leading-6 text-slate-500"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {project?.description || "No description provided for this project."}
          </p>
        </div>

        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
            statusStyles[project?.status] || statusStyles.active,
          ].join(" ")}
        >
          {project?.status || "active"}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
        <span>{memberCount} member{memberCount === 1 ? "" : "s"}</span>
        <span>Updated {formatDate(project?.updatedAt)}</span>
      </div>
    </button>
  );
}
