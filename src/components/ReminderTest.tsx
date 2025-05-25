
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle, Info, Mail } from "lucide-react";

// Component to test email reminder functionality
const ReminderTest = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Trigger the email reminder function manually
  const triggerReminders = async () => {
    setIsLoading(true);
    
    try {
      console.log('Triggering reminder function...');
      
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('send-task-reminders', {
        body: { password: 'test-password' },
      });
      
      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }
      
      console.log('Function response:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const { summary, results } = data;
      
      // Show appropriate toast messages based on results
      if (summary?.totalTasksChecked === 0) {
        toast.info('Tidak ada tugas dengan tenggat waktu yang akan datang ditemukan.', {
          icon: <Info className="h-5 w-5" />,
          duration: 5000
        });
      } else if (summary?.emailsSent > 0) {
        toast.success(`Berhasil mengirim ${summary.emailsSent} email pengingat.`, {
          icon: <CheckCircle className="h-5 w-5" />,
          duration: 5000
        });
        
        // Log details about sent emails
        const sentEmails = results?.filter((r: any) => r.status === 'sent') || [];
        sentEmails.forEach((email: any) => {
          console.log(`Email sent to ${email.email} for task "${email.taskTitle}" (${email.timeUntilDeadline} remaining)`);
        });
      }
      
      // Handle any errors in sending emails
      if (summary?.emailsFailed > 0) {
        const failedEmails = results?.filter((r: any) => r.status === 'error') || [];
        failedEmails.forEach((failed: any) => {
          console.error(`Failed to send email for task "${failed.taskTitle}":`, failed.error);
          
          // Show specific error messages
          if (failed.error?.includes('verify a domain')) {
            toast.error('Email gagal dikirim: Domain belum diverifikasi di Resend.', {
              icon: <AlertCircle className="h-5 w-5" />,
              duration: 8000
            });
          } else if (failed.error?.includes('testing emails')) {
            toast.warning('Email hanya dapat dikirim ke alamat yang diverifikasi di mode sandbox.', {
              icon: <Mail className="h-5 w-5" />,
              duration: 8000
            });
          } else {
            toast.error(`Email gagal dikirim: ${failed.error}`, {
              icon: <AlertCircle className="h-5 w-5" />,
              duration: 8000
            });
          }
        });
      }
      
      console.log('Reminder results:', results);
    } catch (error: any) {
      console.error('Error triggering reminders:', error);
      
      // Create user-friendly error message
      let errorMessage = 'Gagal mengirim pengingat. ';
      
      if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        errorMessage += 'Fungsi pengingat mengalami kesalahan internal.';
      } else if (error.message?.includes('Unauthorized')) {
        errorMessage += 'Tidak ada akses untuk menjalankan fungsi ini.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Lihat konsol untuk detail.';
      }
      
      toast.error(errorMessage, {
        icon: <AlertCircle className="h-5 w-5" />,
        duration: 8000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 mt-6 border-gray-200 bg-white">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2 text-indigo-600 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pengujian Sistem Pengingat Email
          </h3>
        </div>
        
        <Button 
          onClick={triggerReminders} 
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          size="lg"
        >
          {isLoading ? 'Memproses...' : 'Picu Pengingat Secara Manual'}
        </Button>
      </div>
    </Card>
  );
};

export default ReminderTest;
