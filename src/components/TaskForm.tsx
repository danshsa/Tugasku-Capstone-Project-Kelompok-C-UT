
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";

interface TaskFormProps {
  initialTitle?: string;
  initialDeadline?: string;
  onSubmit: (title: string, deadline: string) => Promise<boolean>;
  onCancel: () => void;
  submitButtonText: string;
  isLoading: boolean;
}

// Reusable form component for adding and editing tasks
const TaskForm: React.FC<TaskFormProps> = ({
  initialTitle = '',
  initialDeadline = '',
  onSubmit,
  onCancel,
  submitButtonText,
  isLoading
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [deadline, setDeadline] = useState(initialDeadline);

  // Get current datetime formatted for datetime-local input
  const getCurrentDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!title.trim()) {
      return;
    }

    if (!deadline) {
      return;
    }

    // Try to submit the form
    const success = await onSubmit(title, deadline);
    
    // Reset form if successful
    if (success) {
      setTitle('');
      setDeadline('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="task-title" className="text-indigo-600">
          Judul Tugas
        </Label>
        <Input 
          id="task-title"
          placeholder="Contoh: Kumpulkan Tugas Matematika" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="focus:border-indigo-600 focus:ring-indigo-600"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="task-deadline" className="text-indigo-600">
          Tenggat Waktu
        </Label>
        <Input 
          id="task-deadline"
          type="datetime-local" 
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          min={getCurrentDatetime()}
          required
          className="focus:border-indigo-600 focus:ring-indigo-600"
        />
      </div>
      
      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Batal
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isLoading ? "Memproses..." : submitButtonText}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default TaskForm;
