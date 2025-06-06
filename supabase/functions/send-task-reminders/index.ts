import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const senderEmail = Deno.env.get('SENDER_EMAIL');
    const senderName = Deno.env.get('SENDER_NAME');
    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey || !senderEmail || !senderName) {
      throw new Error('Missing required environment variables');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Get current time in UTC
    const now = new Date();
    const nowUtc = now.getTime();
    // Define reminder intervals in milliseconds
    const threeDays = 3 * 24 * 60 * 60 * 1000 // 3 days
    ;
    const twoDays = 2 * 24 * 60 * 60 * 1000 // 2 days
    ;
    const oneDay = 24 * 60 * 60 * 1000 // 1 day
    ;
    const twelveHours = 12 * 60 * 60 * 1000 // 12 hours
    ;
    const twoHours = 2 * 60 * 60 * 1000 // 2 hours
    ;
    console.log('Starting reminder check at:', now.toISOString());
    // Get incomplete tasks that need reminders
    const { data: tasks, error: tasksError } = await supabase.from('tasks').select(`
        id,
        title,
        due_date,
        user_id,
        last_reminder_sent,
        profiles!inner(email, name)
      `).eq('completed', false).gte('due_date', now.toISOString()) // Only future tasks
    ;
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }
    console.log(`Found ${tasks?.length || 0} incomplete tasks`);
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({
        message: 'No tasks found',
        sent: 0
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let emailsSent = 0;
    const appUrl = 'https://academi-flow-tasks.vercel.app';
    for (const task of tasks){
      const deadlineTime = new Date(task.due_date).getTime();
      const timeUntilDeadline = deadlineTime - nowUtc;
      const lastReminderSent = task.last_reminder_sent || 0;
      let shouldSendReminder = false;
      let reminderType = '';
      // Determine if we should send a reminder
      if (timeUntilDeadline <= twoHours && timeUntilDeadline > 0) {
        // 2 hours before deadline (final reminder)
        if (nowUtc - lastReminderSent > 30 * 60 * 1000) {
          shouldSendReminder = true;
          reminderType = '2 jam';
        }
      } else if (timeUntilDeadline <= twelveHours) {
        // 12 hours before deadline
        if (nowUtc - lastReminderSent > 6 * 60 * 60 * 1000) {
          shouldSendReminder = true;
          reminderType = '12 jam';
        }
      } else if (timeUntilDeadline <= oneDay) {
        // 1 day before deadline
        if (nowUtc - lastReminderSent > 12 * 60 * 60 * 1000) {
          shouldSendReminder = true;
          reminderType = '1 hari';
        }
      } else if (timeUntilDeadline <= twoDays) {
        // 2 days before deadline
        if (nowUtc - lastReminderSent > 24 * 60 * 60 * 1000) {
          shouldSendReminder = true;
          reminderType = '2 hari';
        }
      } else if (timeUntilDeadline <= threeDays) {
        // 3 days before deadline
        if (nowUtc - lastReminderSent > 24 * 60 * 60 * 1000) {
          shouldSendReminder = true;
          reminderType = '3 hari';
        }
      }
      if (!shouldSendReminder) {
        console.log(`Skipping task ${task.id} - no reminder needed`);
        continue;
      }
      const profile = Array.isArray(task.profiles) ? task.profiles[0] : task.profiles;
      if (!profile?.email) {
        console.log(`Skipping task ${task.id} - no email found`);
        continue;
      }
      // Calculate actual time remaining for subject line
      const hoursRemaining = Math.floor(timeUntilDeadline / (60 * 60 * 1000));
      const daysRemaining = Math.floor(hoursRemaining / 24);
      let timeRemainingText = '';
      if (daysRemaining >= 1) {
        const remainingHours = hoursRemaining % 24;
        if (remainingHours > 0) {
          timeRemainingText = `${daysRemaining} hari ${remainingHours} jam`;
        } else {
          timeRemainingText = `${daysRemaining} hari`;
        }
      } else if (hoursRemaining >= 1) {
        const minutesRemaining = Math.floor(timeUntilDeadline % (60 * 60 * 1000) / (60 * 1000));
        if (minutesRemaining > 0) {
          timeRemainingText = `${hoursRemaining} jam ${minutesRemaining} menit`;
        } else {
          timeRemainingText = `${hoursRemaining} jam`;
        }
      } else {
        const minutesRemaining = Math.floor(timeUntilDeadline / (60 * 1000));
        timeRemainingText = `${minutesRemaining} menit`;
      }
      // Format deadline for display
      const deadlineDate = new Date(task.due_date);
      const formattedDeadline = deadlineDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      });
      // Create simple email content using your provided template
      const emailHtml = `
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #5c6bc0; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; padding: 10px 20px; background-color: #5c6bc0; color: white; 
                       text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #999; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Pengingat Tenggat Waktu Tugas</h1>
              </div>
              <div class="content">
                <p>Halo ${profile.name || "teman"},</p>
                <p>Ini adalah pengingat tentang tugas yang akan segera berakhir:</p>
                <h2>${task.title}</h2>
                <p><strong>Tenggat waktu:</strong> ${formattedDeadline}</p>
                <p>Jangan lupa untuk menyelesaikan tugas ini sebelum tenggat waktu!</p>
                <a href="${appUrl}" class="button" style="color: white;">Lihat Tugas</a>
              </div>
              <div class="footer">
                <p>Ini adalah pengingat otomatis dari Tugasku.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      // Send email using Resend
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${senderName} <${senderEmail}>`,
            to: [
              profile.email
            ],
            subject: `Pengingat: "${task.title}" - Tersisa ${timeRemainingText}`,
            html: emailHtml
          })
        });
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email for task ${task.id}:`, errorText);
          continue;
        }
        console.log(`Email sent successfully for task ${task.id} to ${profile.email}`);
        emailsSent++;
        // Update last_reminder_sent timestamp
        const { error: updateError } = await supabase.from('tasks').update({
          last_reminder_sent: nowUtc,
          updated_at: now.toISOString()
        }).eq('id', task.id);
        if (updateError) {
          console.error(`Error updating task ${task.id}:`, updateError);
        }
      } catch (error) {
        console.error(`Error sending email for task ${task.id}:`, error);
      }
    }
    console.log(`Reminder check complete. Emails sent: ${emailsSent}`);
    return new Response(JSON.stringify({
      message: 'Reminder check completed',
      emailsSent,
      tasksChecked: tasks.length
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in send-task-reminders function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
