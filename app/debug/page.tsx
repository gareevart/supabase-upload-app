"use client";

import React, { useState, useEffect } from 'react';
import { Button, Card, Text, Spin } from '@gravity-ui/uikit';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function DebugPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Check if user is authenticated and fetch profile
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setCheckingAuth(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        if (session?.user) {
          setUserInfo({
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at,
          });
          
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            setProfileInfo({ error: profileError.message });
          } else {
            setProfileInfo(profile);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleSetAdminRole = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/set-admin-role');
      
      if (!response.ok) {
        // Handle 401 specifically
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
          
          toast({
            title: 'Session Expired',
            description: 'Redirecting to login page...',
            variant: 'destructive',
          });
          
          // Redirect to auth page
          setTimeout(async () => {
            await supabase.auth.signOut();
            router.push('/auth');
          }, 2000);
          return;
        }
        
        throw new Error(`Failed to set admin role: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
      
      // Refresh profile info
      if (data.success && userInfo) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userInfo.id)
          .single();
        
        if (profile) {
          setProfileInfo(profile);
        }
      }
      
      // If successful, show a message and redirect after 3 seconds
      if (data.success) {
        setTimeout(() => {
          router.push('/broadcasts');
        }, 3000);
      }
    } catch (err) {
      console.error('Error setting admin role:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBroadcastsAccess = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/broadcasts', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle 401 specifically
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
          
          toast({
            title: 'Session Expired',
            description: 'Redirecting to login page...',
            variant: 'destructive',
          });
          
          // Redirect to auth page
          setTimeout(async () => {
            await supabase.auth.signOut();
            router.push('/auth');
          }, 2000);
          return;
        }
        
        setError(`API returned ${response.status}: ${data.error || 'Unknown error'}`);
        setResult({
          success: false,
          status: response.status,
          error: data.error,
          details: data.details,
          code: data.code,
        });
      } else {
        setResult({
          success: true,
          message: 'Successfully accessed broadcasts API!',
          data: data,
        });
      }
    } catch (err) {
      console.error('Error testing broadcasts access:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[400px]">
        <Spin size="l" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Text variant="display-1" className="mb-6">Debug Tools</Text>
      
      {/* User Info Card */}
      {isAuthenticated && userInfo && (
        <Card className="p-6 mb-6">
          <Text variant="subheader-1" className="mb-4">User Information</Text>
          <div className="space-y-2">
            <div>
              <Text variant="body-1" className="font-semibold">User ID:</Text>
              <Text variant="body-2" className="text-gray-600 font-mono">{userInfo.id}</Text>
            </div>
            <div>
              <Text variant="body-1" className="font-semibold">Email:</Text>
              <Text variant="body-2" className="text-gray-600">{userInfo.email}</Text>
            </div>
            <div>
              <Text variant="body-1" className="font-semibold">Created At:</Text>
              <Text variant="body-2" className="text-gray-600">{userInfo.created_at}</Text>
            </div>
          </div>
        </Card>
      )}
      
      {/* Profile Info Card */}
      {isAuthenticated && profileInfo && (
        <Card className="p-6 mb-6">
          <Text variant="subheader-1" className="mb-4">Profile Information</Text>
          {profileInfo.error ? (
            <div className="p-4 bg-red-100 text-red-800 rounded">
              <Text variant="body-1">Error loading profile: {profileInfo.error}</Text>
              <Text variant="body-2" className="mt-2">This might mean your profile doesn&apos;t exist yet. Use the button below to create it.</Text>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <Text variant="body-1" className="font-semibold">Role:</Text>
                <Text variant="body-2" className={`${profileInfo.role ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                  {profileInfo.role || 'No role set'}
                </Text>
              </div>
              {profileInfo.role && profileInfo.role !== 'admin' && profileInfo.role !== 'editor' && (
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded mt-2">
                  <Text variant="body-2">
                    Your role is &quot;{profileInfo.role}&quot; but you need &quot;admin&quot; or &quot;editor&quot; role to access broadcasts.
                  </Text>
                </div>
              )}
              {(profileInfo.role === 'admin' || profileInfo.role === 'editor') && (
                <div className="p-4 bg-green-100 text-green-800 rounded mt-2">
                  <Text variant="body-2">
                    ✓ You have the required role to access broadcasts!
                  </Text>
                </div>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Show full profile data
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                  {JSON.stringify(profileInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </Card>
      )}
      
      <Card className="p-6 mb-6">
        <Text variant="subheader-1" className="mb-4">Admin Tools</Text>
        <Text variant="body-1" className="mb-4">
          Use these tools to diagnose and fix access issues with the broadcast features.
        </Text>
        
        <div className="flex gap-3 mb-4">
          <Button
            view="action"
            size="m"
            onClick={handleSetAdminRole}
            loading={isLoading}
            disabled={!isAuthenticated}
          >
            Set Admin Role
          </Button>
          
          <Button
            view="normal"
            size="m"
            onClick={handleTestBroadcastsAccess}
            loading={isLoading}
            disabled={!isAuthenticated}
          >
            Test Broadcasts Access
          </Button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
            <Text variant="body-1">{error}</Text>
          </div>
        )}
        
        {result && (
          <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
            <Text variant="body-1">{result.message}</Text>
            {result.success && (
              <Text variant="body-2" className="mt-2">
                Redirecting to broadcasts page in 3 seconds...
              </Text>
            )}
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </Card>
      
      {!isAuthenticated && (
        <Card className="p-6 mb-6">
          <Text variant="subheader-1" className="mb-4">Authentication Required</Text>
          <Text variant="body-1" className="mb-4">
            You need to be logged in to use the debug tools and access the broadcast features.
          </Text>
          
          <Button
            view="action"
            size="m"
            onClick={() => router.push('/auth')}
          >
            Go to Login Page
          </Button>
        </Card>
      )}
      
      <Card className="p-6">
        <Text variant="subheader-1" className="mb-4">Troubleshooting</Text>
        <Text variant="body-1" className="mb-2">
          If you{"'"}re experiencing issues with the broadcast feature, try the following:
        </Text>
        
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-2">
            <Text variant="body-1">
              Make sure you{"'"}re logged in by visiting the <a href="/auth" className="text-blue-600 hover:underline">login page</a>
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Set your role to {'"admin"'} using the button above
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Check that the {'"sent_mails"'} table exists in your Supabase database
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Verify that you{"'"}re properly authenticated
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Check that the RESEND_API_KEY environment variable is correctly set in your .env.local file
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Restart your development server after updating environment variables
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Check the browser console for any errors
            </Text>
          </li>
        </ul>
        
        <Button
          view="normal"
          size="m"
          onClick={() => router.push('/broadcasts')}
        >
          Go to Broadcasts
        </Button>
      </Card>
    </div>
  );
}