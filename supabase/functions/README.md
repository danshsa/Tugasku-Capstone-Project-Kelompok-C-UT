
# Task Reminder System Setup

This folder contains the Edge Function that handles sending automated email reminders for tasks with upcoming deadlines.

## Setup Instructions

### 1. Set the required secrets

In your Supabase project dashboard, navigate to Settings > API > Functions and add the following secrets:

- `RESEND_API_KEY`: Your API key from Resend.com
- `SENDER_EMAIL`: The verified email address to send from (e.g., "noreply@yourdomain.com")
- `SENDER_NAME`: The name to appear as sender (e.g., "AcademiFlow Task Manager")

### 2. Schedule the reminder function to run automatically

To set up automated scheduling, execute the following SQL in your Supabase SQL Editor:

```sql
-- Enable the pg_cron and pg_net extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the function to run every 15 minutes
SELECT cron.schedule(
  'task-reminder-check',
  '*/15 * * * *',  -- Run every 15 minutes
  $$
  SELECT
    net.http_post(
      url:='https://nwxxrlvjfctjgwsjlvyv.supabase.co/functions/v1/send-task-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eHhybHZqZmN0amd3c2psdnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3OTQ0NDEsImV4cCI6MjA2MzM3MDQ0MX0.0M2rqMnj6Dekp1G0kIVk22u0KpES5yFfwf4JX7yyeJg"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

### 3. Verify the cron job is running

You can check if your cron job is scheduled correctly:

```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### 4. Testing the reminder system

You can manually trigger the reminder system using the "Trigger Reminders Manually" button in the application interface, or by making a direct request to the Edge Function:

```javascript
const { data, error } = await supabase.functions.invoke('send-task-reminders');
console.log('Reminder result:', data);
```

### 5. How it works

The reminder system checks for tasks that have deadlines at specific intervals:
- 3 days before deadline (±15 minute window)
- 2 days before deadline (±15 minute window)
- 6 hours before deadline (±15 minute window)
- 1 hour before deadline (±15 minute window)

For each task found, it:
1. Sends an email reminder to the task owner via Resend API
2. Logs the email to the `emails` table for record keeping
3. Updates the corresponding reminder flag (`reminder_3d_sent`, `reminder_2d_sent`, etc.) to prevent duplicate emails

### 6. Troubleshooting

**Emails not being sent:**
- Verify `RESEND_API_KEY` is set correctly
- Check that `SENDER_EMAIL` is verified in your Resend account
- Review the Edge Function logs for error messages

**Cron job not running:**
- Ensure `pg_cron` extension is enabled
- Check cron job status with `SELECT * FROM cron.job;`
- Verify the function URL and authentication token are correct

**Duplicate emails:**
- The system uses reminder flags to prevent duplicates
- If you need to reset flags, you can update tasks: `UPDATE tasks SET reminder_3d_sent = false WHERE id = 'task-id';`

### 7. Required Resend Setup

1. Sign up at https://resend.com
2. Verify your sending domain at https://resend.com/domains
3. Create an API key at https://resend.com/api-keys
4. Add the API key to your Supabase secrets as `RESEND_API_KEY`
