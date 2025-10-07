# Broadcasts Authentication Cookie Fix

## Problem

Users with admin role were getting 401 Unauthorized errors when trying to access `/api/broadcasts` endpoint:

```
GET http://localhost:3000/api/broadcasts 401 (Unauthorized)
Error: Auth session missing!
```

The console showed "User role: admin" on the client side, but the server-side API was not finding the authentication session.

## Root Cause

The issue was a mismatch between client-side and server-side session storage:

1. **Client-side**: The Supabase client (`lib/supabase.ts`) was using `localStorage` for session persistence with `createClient` from `@supabase/supabase-js`
2. **Server-side**: The API routes (`app/auth/withApiAuth.ts`) were trying to read the session from cookies using `createServerClient` from `@supabase/ssr`

This mismatch meant that:
- The user's session was stored in `localStorage` in the browser
- The server-side API routes couldn't access `localStorage` and were looking for cookies
- Result: Server couldn't find the session even though the user was authenticated

## Solution

### 1. Updated Client-Side Supabase Client

Changed `lib/supabase.ts` to use `createBrowserClient` from `@supabase/ssr`:

```typescript
// Before
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});

// After
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Why this works**: `createBrowserClient` automatically uses cookie-based session storage that is accessible to both client and server.

### 2. Simplified Server-Side Auth Middleware

Cleaned up `app/auth/withApiAuth.ts` to remove hardcoded cookie name and complex token extraction logic:

```typescript
// Removed hardcoded cookie name
const cookieValue = req.cookies.get('sb-rajacaayhzgjoitquqvt-auth-token')?.value;

// Simplified to use standard createServerClient
const supabase = createServerClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        req.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        req.cookies.delete(name);
      },
    },
  }
);
```

**Why this works**: `createServerClient` automatically determines the correct cookie name based on the Supabase URL, so we don't need to hardcode it.

## Files Changed

1. `lib/supabase.ts` - Updated to use `createBrowserClient`
2. `app/auth/withApiAuth.ts` - Simplified cookie handling logic

## Impact

- ✅ Users can now access broadcasts API with proper authentication
- ✅ Session is automatically synced between client and server
- ✅ No need to hardcode cookie names
- ⚠️ Existing users with localStorage-based sessions will need to log in again to get cookie-based sessions

## Testing

After applying this fix:

1. Log out if currently logged in
2. Log in again (this will create a cookie-based session)
3. Navigate to `/broadcasts`
4. Verify that broadcasts load without 401 errors

## Technical Details

### Cookie-Based Session Storage

When using `createBrowserClient`, Supabase stores the session in cookies with the following pattern:

```
sb-{project-ref}-auth-token
```

Where `{project-ref}` is derived from your Supabase URL. This cookie is:
- HttpOnly: No (needs to be accessible to JavaScript)
- Secure: Yes (in production)
- SameSite: Lax
- Accessible to both client and server

### Why Not Use Authorization Header?

The `withApiAuth` middleware does support Bearer token authentication via the `Authorization` header, but the `BroadcastApi` class in `shared/api/broadcast.ts` was not configured to send it. Using cookie-based sessions is simpler and more secure for same-origin requests.

## Related Issues

- Fixes the "Auth session missing!" error in broadcasts
- Ensures consistent authentication between client and server
- Removes dependency on hardcoded cookie names

## Future Improvements

Consider adding:
1. Better error messages when session is missing
2. Automatic retry with token refresh if session expires
3. Client-side session validation before making API requests
