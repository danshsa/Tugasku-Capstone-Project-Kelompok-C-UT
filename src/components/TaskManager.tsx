
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  PlusCircle, 
  CalendarIcon
} from "lucide-react";
import TaskItem from "@/components/TaskItem";
import TaskForm from "@/components/TaskForm";
import ReminderTest from "@/components/ReminderTest";
import { useTasks, Task } from "@/hooks/useTasks";

interface TaskManagerProps {
  user: any;
}

const TaskManager: React.FC<TaskManagerProps> = ({ user }) => {
  // Use custom hooks for cleaner state management
  const { 
    tasks, 
    loading: tasksLoading, 
    addTask, 
    updateTask, 
    toggleTaskCompletion, 
    deleteTask 
  } = useTasks(user?.id);

  // Local state for UI interactions
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Handle adding a new task
  const handleAddTask = async (title: string, deadline: string) => {
    setFormLoading(true);
    const success = await addTask(title, deadline);
    setFormLoading(false);
    
    if (success) {
      setIsAddDialogOpen(false);
    }
    
    return success;
  };

  // Handle editing an existing task
  const handleEditTask = async (title: string, deadline: string) => {
    if (!editingTask) return false;

    setFormLoading(true);
    const success = await updateTask(editingTask.id, title, deadline);
    setFormLoading(false);
    
    if (success) {
      setEditingTask(null);
      setIsEditDialogOpen(false);
    }
    
    return success;
  };

  // Start editing a task
  const startEditTask = (task: Task) => {
    // Format the datetime for the datetime-local input
    const formattedDeadline = new Date(task.deadline).toISOString().slice(0, 16);
    setEditingTask({ ...task, deadline: formattedDeadline });
    setIsEditDialogOpen(true);
  };

  // Group tasks by date for better organization
  const groupTasksByDate = (taskList: Task[]) => {
    // Sort tasks by completion status and deadline
    const sortedTasks = [...taskList].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    // Group by date
    const grouped: { [key: string]: Task[] } = {};
    sortedTasks.forEach(task => {
      const dateKey = new Date(task.deadline).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });

    return grouped;
  };

  // Format date for display
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const isToday = dateStr === today;
    
    const formattedDate = date.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return { formattedDate, isToday };
  };

  // Show loading state
  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Memuat tugas...</p>
        </div>
      </div>
    );
  }

  const groupedTasks = groupTasksByDate(tasks);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-indigo-600">Tugas Anda</h2>
          
          {/* Add Task Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                <PlusCircle className="h-5 w-5" />
                Tambah Tugas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-indigo-600">Tambah Tugas Baru</DialogTitle>
              </DialogHeader>
              <TaskForm
                onSubmit={handleAddTask}
                onCancel={() => setIsAddDialogOpen(false)}
                submitButtonText="Tambah Tugas"
                isLoading={formLoading}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Tasks Display */}
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-indigo-600">Belum ada tugas</h3>
            <p className="mt-2 text-sm text-gray-500">
              Tambahkan tugas pertama Anda untuk memulai
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedTasks).sort().map(date => {
              const { formattedDate, isToday } = formatDateHeader(date);
              
              return (
                <div key={date} className="space-y-2">
                  <h3 className="text-md font-medium flex items-center gap-2 pb-2 border-b text-indigo-600">
                    <CalendarIcon className="h-4 w-4" />
                    {formattedDate}
                    {isToday && (
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        HARI INI
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {groupedTasks[date].map(task => (
                      <TaskItem 
                        key={task.id}
                        task={task}
                        onToggleComplete={() => toggleTaskCompletion(task.id)}
                        onDelete={() => deleteTask(task.id)}
                        onEdit={() => startEditTask(task)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-indigo-600">Edit Tugas</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              initialTitle={editingTask.title}
              initialDeadline={editingTask.deadline}
              onSubmit={handleEditTask}
              onCancel={() => setIsEditDialogOpen(false)}
              submitButtonText="Simpan Perubahan"
              isLoading={formLoading}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Email Reminder Test Component */}
      <ReminderTest />
    </div>
  );
};

export default TaskManager;
