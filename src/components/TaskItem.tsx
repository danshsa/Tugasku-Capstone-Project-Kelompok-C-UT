
import React from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Edit, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  deadline: string;
  user_id: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskItemProps {
  task: Task;
  onToggleComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleComplete, onDelete, onEdit }) => {
  // Format the deadline to show both date and time
  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if the task is overdue
  const isOverdue = () => {
    const now = new Date();
    const deadline = new Date(task.deadline);
    return !task.completed && deadline < now;
  };

  // Check if the task is due soon (within 24 hours)
  const isDueSoon = () => {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    return !task.completed && hoursUntilDeadline > 0 && hoursUntilDeadline <= 24;
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border",
      isOverdue() && "border-red-200 bg-red-50",
      isDueSoon() && !isOverdue() && "border-gray-200 bg-white"
    )}>
      <div className="flex items-center gap-3 flex-1">
        <Checkbox 
          id={`task-${task.id}`}
          checked={task.completed}
          onCheckedChange={onToggleComplete}
        />
        <div className="flex-1">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              "text-sm cursor-pointer text-indigo-600 block font-medium",
              task.completed && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </label>
          <div className={cn(
            "flex items-center gap-1 text-xs mt-1",
            isOverdue() ? "text-red-600" : isDueSoon() ? "text-gray-600" : "text-muted-foreground"
          )}>
            <Clock className="h-3 w-3" />
            <span>{formatDeadline(task.deadline)}</span>
            {isOverdue() && <span className="font-medium">(Terlambat)</span>}
            {isDueSoon() && !isOverdue() && <span className="font-medium">(Segera berakhir)</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 text-muted-foreground hover:text-indigo-600" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default TaskItem;
