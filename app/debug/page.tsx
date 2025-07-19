"use client";

import React, { useState, useEffect } from 'react';
import { Button, Card, Text } from '@gravity-ui/uikit';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
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
        throw new Error(`Failed to set admin role: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setResult(data);
      
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

  return (
    <div className="container mx-auto py-8 px-4">
      <Text variant="display-1" className="mb-6">Debug Tools</Text>
      
      <Card className="p-6 mb-6">
        <Text variant="subheader-1" className="mb-4">Set Admin Role</Text>
        <Text variant="body-1" className="mb-4">
          This tool will check your user profile and set your role to 'admin' if it's not already set.
          This will give you access to the broadcast features.
        </Text>
        
        <Button
          view="action"
          size="m"
          onClick={handleSetAdminRole}
          loading={isLoading}
        >
          Set Admin Role
        </Button>
        
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
          If you're experiencing issues with the broadcast feature, try the following:
        </Text>
        
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-2">
            <Text variant="body-1">
              Make sure you're logged in by visiting the <a href="/auth" className="text-blue-600 hover:underline">login page</a>
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Set your role to 'admin' using the button above
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Check that the 'sent_mails' table exists in your Supabase database
            </Text>
          </li>
          <li className="mb-2">
            <Text variant="body-1">
              Verify that you're properly authenticated
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