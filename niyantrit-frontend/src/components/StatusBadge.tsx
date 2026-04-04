import { ProjectStatus } from "../context/AppContext";
import { cn } from "../lib/utils";

interface StatusBadgeProps {
  status: ProjectStatus;
}

const statusStyles: Record<ProjectStatus, string> = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Ongoing: "border-success/30 bg-success/10 text-success",
  Completed: "border-primary/30 bg-primary/10 text-primary",
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
