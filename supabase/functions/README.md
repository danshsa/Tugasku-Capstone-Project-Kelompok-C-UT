
# Task Reminder System Setup

This folder contains the Edge Function that handles sending automated email reminders for tasks with upcoming deadlines.

## Setup Instructions

### 1. Set the required secrets

In your Supabase project dashboard, navigate to Settings > API > Functions and add the following secrets:

- `RESEND_API_KEY`: Your API key from Resend.com
- `APP_URL`: The URL of your application (e.g., "https://yourdomain.com")
- `FUNCTION_PASSWORD`: A password of your choice to protect manual function invocation

### 2. Schedule the reminder function to run automatically

To set up automated scheduling, execute the following SQL in your Supabase SQL Editor:

```sql
-- Enable the pg_cron and pg_net extensions (if not already enabled)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the function to run every hour
select cron.schedule(
  'hourly-task-reminder-check',
  '0 * * * *',  -- Run every hour at minute 0
  $$
  select
    net.http_post(
      url:='https://nwxxrlvjfctjgwsjlvyv.supabase.co/functions/v1/send-task-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eHhybHZqZmN0amd3c2psdnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3OTQ0NDEsImV4cCI6MjA2MzM3MDQ0MX0.0M2rqMnj6Dekp1G0kIVk22u0KpES5yFfwf4JX7yyeJg"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

### 3. Testing the reminder system

You can manually trigger the reminder system using the "Trigger Reminders Manually" button in the application interface, or by making a direct request to the Edge Function:

```javascript
const { data, error } = await supabase.functions.invoke('send-task-reminders', {
  body: { password: 'YOUR_FUNCTION_PASSWORD' }
});
```

### 4. How it works

The reminder system checks for tasks that have deadlines at specific intervals:
- 3 days before deadline
- 2 days before deadline
- 1 day before deadline
- 6 hours before deadline
- 3 hours before deadline
- 1 hour before deadline

For each task found, it sends an email reminder to the task owner with details about the upcoming deadline.
