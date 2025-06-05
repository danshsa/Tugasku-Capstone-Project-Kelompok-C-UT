import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRecord {
  to_email: string;
  subject: string;
  body: string;
  task_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting task reminder check at:', new Date().toISOString())

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const senderEmail = Deno.env.get('SENDER_EMAIL') || 'noreply@tugaskuu.xyz'
    const senderName = Deno.env.get('SENDER_NAME') || 'Tugasku'

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not found, emails will only be logged to database')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resend = resendApiKey ? new Resend(resendApiKey) : null

    // Get current time in UTC
    const now = new Date()
    const nowUtc = now.getTime()

    // Calculate time windows (±15 minutes)
    const windowMs = 15 * 60 * 1000 // 15 minutes in milliseconds
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000 // 3 days
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000 // 2 days
    const sixHoursMs = 6 * 60 * 60 * 1000 // 6 hours
    const oneHourMs = 60 * 60 * 1000 // 1 hour

    // Query incomplete tasks due within next 3 days
    const threeDaysFromNow = new Date(nowUtc + threeDaysMs).toISOString()
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        user_id,
        reminder_3d_sent,
        reminder_2d_sent,
        reminder_6h_sent,
        reminder_1h_sent,
        profiles!inner(email, name)
      `)
      .eq('completed', false)
      .lte('due_date', threeDaysFromNow)
      .gte('due_date', now.toISOString()) // Only future tasks

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      throw tasksError
    }

    console.log(`Found ${tasks?.length || 0} incomplete tasks due within 3 days`)

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No tasks found within 3 day window', 
          emailsSent: 0,
          emailsFailed: 0,
          tasksChecked: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailsToSend: EmailRecord[] = []
    const taskUpdates: Array<{ id: string; updates: any }> = []
    let emailsSent = 0
    let emailsFailed = 0

    for (const task of tasks) {
      const dueDate = new Date(task.due_date)
      const dueDateMs = dueDate.getTime()
      const timeUntilDue = dueDateMs - nowUtc

      const profile = Array.isArray(task.profiles) ? task.profiles[0] : task.profiles
      if (!profile?.email) {
        console.log(`Skipping task ${task.id} - no email found`)
        continue
      }

      let reminderSent = false
      let reminderType = ''
      let updateField = ''

      // Check 3 days reminder (±15 minutes)
      if (Math.abs(timeUntilDue - threeDaysMs) <= windowMs && !task.reminder_3d_sent) {
        reminderType = '3 hari'
        updateField = 'reminder_3d_sent'
        reminderSent = true
      }
      // Check 2 days reminder (±15 minutes)
      else if (Math.abs(timeUntilDue - twoDaysMs) <= windowMs && !task.reminder_2d_sent) {
        reminderType = '2 hari'
        updateField = 'reminder_2d_sent'
        reminderSent = true
      }
      // Check 6 hours reminder (±15 minutes)
      else if (Math.abs(timeUntilDue - sixHoursMs) <= windowMs && !task.reminder_6h_sent) {
        reminderType = '6 jam'
        updateField = 'reminder_6h_sent'
        reminderSent = true
      }
      // Check 1 hour reminder (±15 minutes)
      else if (Math.abs(timeUntilDue - oneHourMs) <= windowMs && !task.reminder_1h_sent) {
        reminderType = '1 jam'
        updateField = 'reminder_1h_sent'
        reminderSent = true
      }

      if (reminderSent) {
        // Format deadline for display
        const formattedDeadline = dueDate.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta'
        })

        // Create email content
        const emailSubject = `⏰ Pengingat: "${task.title}" - Tersisa ${reminderType}!`
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pengingat Tugas - ${task.title}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">⏰ Pengingat Tugas</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tugasku</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #495057; margin-top: 0;">Halo ${profile.name || 'Pengguna'}!</h2>
              
              <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #dc3545; margin: 20px 0;">
                <h3 style="color: #dc3545; margin-top: 0; font-size: 20px;">📋 ${task.title}</h3>
                <p style="margin: 15px 0; font-size: 16px; color: #6c757d;">
                  <strong>Deadline:</strong> ${formattedDeadline}
                </p>
                <p style="margin: 15px 0; font-size: 16px; color: #dc3545;">
                  <strong>⚠️ Tersisa ${reminderType} lagi!</strong>
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://tugaskuu.xyz" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          font-weight: bold; 
                          font-size: 16px;
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  🎯 Lihat Tugas
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              
              <p style="color: #6c757d; font-size: 14px; text-align: center; margin: 0;">
                Email ini dikirim secara otomatis oleh AcademiFlow Task Manager.<br>
                <a href="https://tugaskuu.xyz" style="color: #667eea;">Kelola tugas Anda</a>
              </p>
            </div>
          </body>
          </html>
        `

        // Store email record for database insert
        const emailRecord: EmailRecord = {
          to_email: profile.email,
          subject: emailSubject,
          body: emailHtml,
          task_id: task.id
        }

        // Try to send email via Resend if API key is available
        if (resend) {
          try {
            const emailResult = await resend.emails.send({
              from: `${senderName} <${senderEmail}>`,
              to: [profile.email],
              subject: emailSubject,
              html: emailHtml
            })

            if (emailResult.error) {
              console.error(`Failed to send email to ${profile.email}:`, emailResult.error)
              emailsFailed++
            } else {
              console.log(`Email sent successfully to ${profile.email} for task ${task.id}`)
              emailsSent++
            }
          } catch (error) {
            console.error(`Error sending email to ${profile.email}:`, error)
            emailsFailed++
          }
        } else {
          console.log(`Would send email to ${profile.email} for task ${task.id} (${reminderType} reminder)`)
        }

        // Add to database queue regardless of send status
        emailsToSend.push(emailRecord)

        // Mark for update
        taskUpdates.push({
          id: task.id,
          updates: { [updateField]: true }
        })
      }
    }

    // Insert all emails into the emails table for record keeping
    if (emailsToSend.length > 0) {
      const { error: emailError } = await supabase
        .from('emails')
        .insert(emailsToSend)

      if (emailError) {
        console.error('Error inserting emails:', emailError)
      } else {
        console.log(`Successfully logged ${emailsToSend.length} emails to database`)
      }
    }

    // Update reminder flags for all affected tasks
    let tasksUpdated = 0
    for (const taskUpdate of taskUpdates) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(taskUpdate.updates)
        .eq('id', taskUpdate.id)

      if (updateError) {
        console.error(`Error updating task ${taskUpdate.id}:`, updateError)
      } else {
        tasksUpdated++
      }
    }

    const summary = {
      message: 'Task reminder check completed',
      emailsSent: emailsSent,
      emailsFailed: emailsFailed,
      tasksChecked: tasks.length,
      tasksUpdated: tasksUpdated,
      timestamp: now.toISOString()
    }

    console.log('Summary:', summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-task-reminders function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
