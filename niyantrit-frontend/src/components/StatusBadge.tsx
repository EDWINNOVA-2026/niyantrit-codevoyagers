import { ProjectStatus } from '../context/AppContext';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-[#138808] text-white';
      case 'Ongoing':
        return 'bg-[#FF9933] text-white';
      case 'Pending':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${getStatusColor(status)} ${className}`}>
      {status}
    </span>
  );
}
