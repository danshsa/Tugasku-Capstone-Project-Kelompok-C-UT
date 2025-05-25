
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to generate email HTML
function generateReminderEmail(taskTitle: string, deadline: string, userName: string, taskId: string) {
  const appUrl = Deno.env.get("APP_URL") || "https://localhost:8080";
  const taskUrl = `${appUrl}?taskId=${taskId}`;
  const formattedDeadline = new Date(deadline).toLocaleString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  return `
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
            <p>Halo ${userName || "teman"},</p>
            <p>Ini adalah pengingat tentang tugas yang akan segera berakhir:</p>
            <h2>${taskTitle}</h2>
            <p><strong>Tenggat waktu:</strong> ${formattedDeadline}</p>
            <p>Jangan lupa untuk menyelesaikan tugas ini sebelum tenggat waktu!</p>
            <a href="${taskUrl}" class="button" style="color: white;">Lihat Tugas</a>
          </div>
          <div class="footer">
            <p>Ini adalah pengingat otomatis dari Tugasku.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Helper function to check if current time falls within the exact reminder windows
function shouldSendReminder(deadline: Date): { shouldSend: boolean; intervalLabel: string } {
  const now = new Date();
  const timeUntilDeadline = deadline.getTime() - now.getTime();
  const hoursUntilDeadline = timeUntilDeadline / (1000 * 60 * 60);
  
  // For deadlines more than 1 day away, check for exact intervals (3d, 2d, 1d)
  if (hoursUntilDeadline > 24) {
    const toleranceMinutes = 5;
    const toleranceMs = toleranceMinutes * 60 * 1000;
    
    // Check 3 days (72 hours)
    const threeDaysMs = 72 * 60 * 60 * 1000;
    if (Math.abs(timeUntilDeadline - threeDaysMs) <= toleranceMs) {
      return { shouldSend: true, intervalLabel: "3 hari" };
    }
    
    // Check 2 days (48 hours)
    const twoDaysMs = 48 * 60 * 60 * 1000;
    if (Math.abs(timeUntilDeadline - twoDaysMs) <= toleranceMs) {
      return { shouldSend: true, intervalLabel: "2 hari" };
    }
    
    // Check 1 day (24 hours)
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (Math.abs(timeUntilDeadline - oneDayMs) <= toleranceMs) {
      return { shouldSend: true, intervalLabel: "1 hari" };
    }
  }
  
  // For deadlines within 24 hours, check for exact times (6h, 1h)
  if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const deadlineMinute = deadline.getMinutes();
    const deadlineSecond = deadline.getSeconds();
    
    // Check if we're at exactly the right minute and within 1 minute tolerance
    const isExactMinute = Math.abs(currentMinute - deadlineMinute) <= 1 && Math.abs(currentSecond - deadlineSecond) <= 30;
    
    // Check 6 hours exactly
    if (Math.abs(hoursUntilDeadline - 6) < 0.02 && isExactMinute) { // 0.02 hours = ~1 minute
      return { shouldSend: true, intervalLabel: "6 jam" };
    }
    
    // Check 1 hour exactly
    if (Math.abs(hoursUntilDeadline - 1) < 0.02 && isExactMinute) { // 0.02 hours = ~1 minute
      return { shouldSend: true, intervalLabel: "1 jam" };
    }
  }
  
  return { shouldSend: false, intervalLabel: "" };
}

async function checkAndSendReminders() {
  console.log("Starting to check for tasks with upcoming deadlines...");
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const now = new Date();
  const results = [];
  
  // Get all incomplete tasks that have deadlines in the future (within next 3 days)
  const futureTime = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 3 days from now
  
  console.log(`Querying tasks with deadlines between now and ${futureTime.toISOString()}`);
  
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      id, 
      title, 
      deadline, 
      user_id
    `)
    .eq("completed", false)
    .gt("deadline", now.toISOString())
    .lt("deadline", futureTime.toISOString());
  
  if (error) {
    console.error("Error querying tasks:", error);
    throw new Error(`Database query failed: ${error.message}`);
  }
  
  console.log(`Found ${tasks?.length || 0} incomplete tasks with upcoming deadlines`);
  
  if (!tasks || tasks.length === 0) {
    return [{
      status: "info",
      message: "No tasks found with upcoming deadlines",
      totalTasks: 0
    }];
  }
  
  // Check each task for reminder eligibility
  for (const task of tasks) {
    const taskDeadline = new Date(task.deadline);
    const { shouldSend, intervalLabel } = shouldSendReminder(taskDeadline);
    
    if (shouldSend) {
      console.log(`Task "${task.title}" qualifies for ${intervalLabel} reminder`);
      
      try {
        // Get user details
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(task.user_id);
        
        if (userError || !user?.user?.email) {
          console.error(`User email not found for task ${task.id}:`, userError);
          results.push({
            taskId: task.id,
            taskTitle: task.title,
            status: "error",
            error: "User email not found",
            timeUntilDeadline: intervalLabel,
          });
          continue;
        }
        
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
          console.error("RESEND_API_KEY not configured");
          results.push({
            taskId: task.id,
            taskTitle: task.title,
            status: "error",
            error: "Email service not configured",
            timeUntilDeadline: intervalLabel,
          });
          continue;
        }
        
        // Initialize Resend with API key
        const resend = new Resend(resendApiKey);
        
        const userName = user.user.user_metadata?.name || user.user.email?.split('@')[0] || "";
        const userEmail = user.user.email;
        
        console.log(`Attempting to send ${intervalLabel} reminder to ${userEmail} for task "${task.title}"`);
        
        // Send email via Resend
        const response = await resend.emails.send({
          from: "Tugasku <notifications@resend.dev>",
          to: [userEmail],
          subject: `Pengingat: Tugas "${task.title}" berakhir dalam ${intervalLabel}`,
          html: generateReminderEmail(task.title, task.deadline, userName, task.id),
        });
        
        if (response.error) {
          console.error(`Resend error for task ${task.id}:`, response.error);
          results.push({
            taskId: task.id,
            taskTitle: task.title,
            email: userEmail,
            status: "error",
            error: `Email delivery failed: ${response.error.message}`,
            timeUntilDeadline: intervalLabel,
            resendError: response.error
          });
        } else {
          console.log(`Successfully sent ${intervalLabel} reminder for task "${task.title}" to ${userEmail}`);
          results.push({
            taskId: task.id,
            taskTitle: task.title,
            email: userEmail,
            status: "sent",
            timeUntilDeadline: intervalLabel,
            emailId: response.data?.id
          });
        }
      } catch (emailError) {
        console.error(`Error sending reminder for task ${task.id}:`, emailError);
        results.push({
          taskId: task.id,
          taskTitle: task.title,
          status: "error",
          error: emailError.message,
          timeUntilDeadline: intervalLabel,
        });
      }
    }
  }
  
  return results;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function invoked, checking for manual trigger...");
    
    // For manual triggers, check if password is provided (optional for security)
    if (req.method === "POST") {
      try {
        const body = await req.json();
        console.log("Request body received:", body);
        
        const functionPassword = Deno.env.get("FUNCTION_PASSWORD");
        if (functionPassword && body.password !== functionPassword) {
          console.error("Invalid password provided");
          return new Response(
            JSON.stringify({ error: "Unauthorized - Invalid password" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.log("No JSON body or password, continuing without auth check");
      }
    }

    console.log("Starting reminder check...");
    const results = await checkAndSendReminders();
    console.log("Reminder check completed, results:", results);
    
    const successfulEmails = results.filter(r => r.status === 'sent').length;
    const failedEmails = results.filter(r => r.status === 'error').length;
    const totalTasks = results.filter(r => r.taskId).length;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          totalTasksChecked: totalTasks,
          emailsSent: successfulEmails,
          emailsFailed: failedEmails
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-task-reminders function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Check function logs for more information"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
