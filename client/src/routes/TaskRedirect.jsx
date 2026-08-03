import { Navigate, useParams } from 'react-router-dom';
import { useGetTaskByIdQuery } from '../services/taskApi';

// Task module was removed — all task functionality now lives on the project page.
// Redirect legacy /tasks/:id links (old notifications/emails) to the project.
export default function TaskRedirect() {
  const { id } = useParams();
  const { data, isLoading } = useGetTaskByIdQuery(id);
  if (isLoading) return <div className="flex items-center justify-center h-64 text-sm text-zinc-400">Redirecting...</div>;
  const projectId = data?.data?.task?.project?._id || data?.data?.task?.project || data?.data?.project?._id || data?.data?.project;
  return <Navigate to={projectId ? `/projects/${projectId}` : '/projects'} replace />;
}
