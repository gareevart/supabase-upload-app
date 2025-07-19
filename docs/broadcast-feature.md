# Email Broadcast Feature Documentation

This document provides instructions for setting up and using the email broadcast feature in the application.

## Overview

The email broadcast feature allows users with admin or editor roles to create, schedule, and send email broadcasts to multiple recipients. It uses the Resend API for email delivery and provides analytics for tracking open and click rates.

## Features

- Create and save draft broadcasts
- Schedule broadcasts for future delivery
- Send broadcasts immediately
- Track open and click rates
- Role-based access control (admin and editor roles only)
- Rich text editing with TipTap editor

## Setup Instructions

### 1. Authentication and Login

The broadcast feature requires authentication to access. Users must be logged in and have the appropriate role (admin or editor) to use the feature.

1. A login page is available at `/auth` for users to sign in or create an account
2. After signing up, users should visit the debug page at `/debug` to set their role to 'admin'
3. Once authenticated with the correct role, users can access the broadcast features

If you see an "Unauthorized: Auth session missing!" error, it means you need to log in first. Visit the login page to authenticate before accessing the broadcasts feature.

### 2. User Roles and Permissions

The broadcast feature is restricted to users with admin or editor roles. To set up user roles:

1. Make sure the user has a profile in the `profiles` table with a `role` field set to either 'admin' or 'editor'
2. You can use the debug page at `/debug` to automatically set your role to 'admin'
3. Alternatively, you can manually set the role in the Supabase dashboard:
   - Go to your Supabase project
   - Navigate to the SQL Editor
   - Run the following query, replacing `USER_ID` with the actual user ID:
     ```sql
     UPDATE profiles
     SET role = 'admin'
     WHERE id = 'USER_ID';
     ```

### 2. Environment Variables

Ensure the following environment variables are set in your `.env.local` file:

```
# Resend API for email broadcasts
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=your-verified-sender-email

# Cron job security
CRON_SECRET=your-secure-cron-secret-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

- `RESEND_API_KEY`: Your API key from Resend.com
- `RESEND_FROM_EMAIL`: A verified sender email address in your Resend account
- `CRON_SECRET`: A secure random string to protect your cron job endpoint
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (found in your Supabase project settings)

### 2. Database Setup

The feature uses a `sent_mails` table in your Supabase database. The migration file is located at `migrations/create_sent_mails_table.sql`.

### 3. Setting Up the Cron Job

To enable automatic sending of scheduled broadcasts, you need to set up a cron job that calls the API endpoint periodically.

#### Using Vercel Cron Jobs (Recommended)

If your application is deployed on Vercel, you can use Vercel Cron Jobs:

1. Add the following to your `vercel.json` file:

```json
{
  "crons": [
    {
      "path": "/api/broadcasts/cron",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This will run the cron job every 15 minutes.

2. Make sure to set the `Authorization` header in your Vercel project settings:
   - Go to your Vercel project
   - Navigate to Settings > Environment Variables
   - Add a new environment variable: `CRON_SECRET`

#### Using External Cron Services

Alternatively, you can use external cron services like Upstash, Cronitor, or EasyCron:

1. Set up an account with your preferred cron service
2. Create a new cron job that makes a GET request to your API endpoint:
   ```
   https://your-domain.com/api/broadcasts/cron
   ```
3. Set the request to include the Authorization header:
   ```
   Authorization: Bearer your-cron-secret-key
   ```
4. Schedule the cron job to run every 15 minutes (or your preferred interval)

## Usage Guide

### Creating a Broadcast

1. Navigate to the Broadcasts page
2. Click "New Broadcast"
3. Fill in the subject, recipients, and content
4. Click "Save Draft" to save for later, or "Send" to send immediately

### Scheduling a Broadcast

1. Create a new broadcast or edit an existing draft
2. Click "Schedule"
3. Select a date and time in the future
4. Click "Schedule Broadcast"

### Canceling a Scheduled Broadcast

1. Navigate to the Broadcasts page
2. Find the scheduled broadcast in the list
3. Click on it to view details
4. Click "Cancel Schedule"

### Viewing Broadcast Analytics

1. Navigate to the Broadcasts page
2. Click on a sent broadcast to view its details
3. The analytics section shows open rate, click rate, and other statistics

## Role-Based Access Control

The broadcast feature is restricted to users with admin or editor roles. Users with other roles will not be able to access the broadcast pages or API endpoints.

## Troubleshooting

### Error Handling and Debugging

The broadcast feature includes comprehensive error handling and debugging features:

1. Detailed error messages in the UI with specific guidance on how to fix issues
2. Suggestions to visit the debug page when permission issues are detected
3. Console logging with detailed error information for developers
4. API responses with error codes and detailed error messages

When you encounter an error, the system will:
1. Display a toast notification with the error message
2. Log detailed error information to the console
3. Suggest actions to fix the issue, such as visiting the debug page

### Resend API Key Issues

If you see an error like "Missing API key" related to Resend:

1. Make sure the `RESEND_API_KEY` environment variable is correctly set in your `.env.local` file
2. Verify that you're using the correct API key format (it should start with `re_`)
3. Remember that the Resend API can only be used on the server side (in API routes), not in client components
4. If you're developing locally, restart your development server after updating environment variables

### Access Denied or Permission Issues

If you're seeing "Access Denied" messages, "Failed to fetch broadcasts" errors, or "Failed to save broadcast" errors:

1. Make sure you're logged in by visiting the login page at `/auth`
2. After logging in, visit the debug page at `/debug` and click the "Set Admin Role" button
3. This will check your user profile and set your role to 'admin' if it's not already set
4. You should now have access to the broadcast features
5. If you still have issues, check the browser console for more detailed error messages

The system will automatically suggest visiting the debug page when it detects permission-related errors.

### Authentication Errors

If you see "Unauthorized: Auth session missing!" errors:

1. Visit the login page at `/auth` to sign in
2. If you don't have an account, you can sign up on the same page
3. After signing up, you'll be redirected to the debug page to set your role
4. Once authenticated with the correct role, you can access the broadcasts feature

### Scheduled Broadcasts Not Sending

1. Check that your cron job is properly configured and running
2. Verify that the `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` environment variables are correctly set
3. Check the server logs for any errors related to the cron job

### Email Delivery Issues

1. Verify that your Resend API key is valid
2. Check that your sender email is verified in your Resend account
3. Review the Resend dashboard for any delivery issues or rate limiting
4. Make sure the `RESEND_API_KEY` environment variable is correctly set in your `.env.local` file
5. Restart your development server after updating environment variables

If you see an error like "Missing API key" related to Resend, the system has been updated to handle this gracefully and provide clear guidance on how to fix the issue.

## API Endpoints

- `POST /api/broadcasts`: Create or update a broadcast
- `GET /api/broadcasts`: List all broadcasts
- `GET /api/broadcasts/:id`: Get a specific broadcast
- `DELETE /api/broadcasts/:id`: Delete a broadcast
- `POST /api/broadcasts/send`: Send a broadcast immediately
- `POST /api/broadcasts/schedule`: Schedule a broadcast for future delivery
- `DELETE /api/broadcasts/schedule`: Cancel a scheduled broadcast
- `GET /api/broadcasts/cron`: Cron job endpoint for sending scheduled broadcasts (protected by CRON_SECRET)