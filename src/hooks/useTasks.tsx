
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type definition for a task
export interface Task {
  id: string;
  title: string;
  deadline: string;
  user_id: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// Custom hook to manage tasks data and operations
export const useTasks = (userId: string | undefined) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all tasks for the current user
  const loadTasks = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Error loading tasks:', error);
        toast.error('Gagal memuat tugas');
        return;
      }

      setTasks(data || []);
      checkForTasksDueToday(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Gagal memuat tugas');
    } finally {
      setLoading(false);
    }
  };

  // Check for tasks due today and show notification
  const checkForTasksDueToday = (taskList: Task[]) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const dueTasks = taskList.filter(task => {
      if (task.completed) return false;
      const taskDeadline = new Date(task.deadline);
      return taskDeadline >= startOfDay && taskDeadline < endOfDay;
    });
    
    if (dueTasks.length > 0) {
      toast(`Anda memiliki ${dueTasks.length} tugas yang jatuh tempo hari ini!`, {
        duration: 5000
      });
    }
  };

  // Add a new task
  const addTask = async (title: string, deadline: string) => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: title.trim(),
          deadline: new Date(deadline).toISOString(),
          user_id: userId,
          completed: false
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding task:', error);
        toast.error('Gagal menambahkan tugas');
        return false;
      }

      setTasks(prevTasks => [...prevTasks, data]);
      toast.success("Tugas berhasil ditambahkan");
      return true;
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Gagal menambahkan tugas");
      return false;
    }
  };

  // Update an existing task
  const updateTask = async (taskId: string, title: string, deadline: string) => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          deadline: new Date(deadline).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        toast.error('Gagal memperbarui tugas');
        return false;
      }

      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? data : task
        )
      );
      
      toast.success("Tugas berhasil diperbarui");
      return true;
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Gagal memperbarui tugas");
      return false;
    }
  };

  // Toggle task completion status
  const toggleTaskCompletion = async (taskId: string) => {
    if (!userId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          completed: !task.completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task completion:', error);
        toast.error('Gagal memperbarui status tugas');
        return;
      }

      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId ? data : t
        )
      );
    } catch (error) {
      console.error('Error updating task completion:', error);
      toast.error('Gagal memperbarui status tugas');
    }
  };

  // Delete a task
  const deleteTask = async (taskId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting task:', error);
        toast.error('Gagal menghapus tugas');
        return;
      }

      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      toast.info("Tugas dihapus");
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Gagal menghapus tugas');
    }
  };

  // Load tasks when userId changes
  useEffect(() => {
    if (userId) {
      loadTasks();
    }
  }, [userId]);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    refreshTasks: loadTasks
  };
};
