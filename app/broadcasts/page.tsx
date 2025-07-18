"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Text, Icon, SegmentedRadioGroup } from '@gravity-ui/uikit';
import { Plus } from '@gravity-ui/icons';
import { Broadcast } from '@/app/components/broadcasts/types';
import BroadcastList from '@/app/components/broadcasts/BroadcastList';
import { useToast } from '@/hooks/use-toast';
import withBroadcastAuth from './withBroadcastAuth';
import { supabase } from '@/lib/supabase';

type StatusFilter = 'all' | 'draft' | 'scheduled' | 'sent' | 'failed';

function BroadcastsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        // If not authenticated, redirect to login page
        if (!session) {
          toast({
            title: 'Authentication Required',
            description: 'Please log in to access the broadcast features',
            variant: 'destructive',
          });
          
          router.push('/auth');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        
        toast({
          title: 'Authentication Error',
          description: 'Failed to check authentication status',
          variant: 'destructive',
        });
        
        router.push('/auth');
      }
    };
    
    checkAuth();
  }, [router, toast]);
  
  // Fetch broadcasts
  useEffect(() => {
    let isMounted = true;
    
    const fetchBroadcasts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build query params
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        
        // Fetch broadcasts from API with debug headers
        console.log('Making API request to /api/broadcasts with params:', params.toString());
        const response = await fetch(`/api/broadcasts?${params.toString()}`, {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session': 'true',
          },
        });
        console.log('API response status:', response.status);
        
        // Get the response text first to help with debugging
        const responseText = await response.text();
        let data;
        
        try {
          // Try to parse the response as JSON
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          console.log('Response text:', responseText);
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
        }
        
        if (!response.ok) {
          // Extract error details from the response
          const errorMessage = data.error || 'Failed to fetch broadcasts';
          const errorDetails = data.details || '';
          const errorCode = data.code || '';
          
          console.error('API error:', { errorMessage, errorDetails, errorCode, status: response.status });
          
          let userErrorMessage = 'Failed to load broadcasts';
          
          // Provide more specific error messages based on the error code
          if (errorCode === 'TABLE_NOT_FOUND') {
            userErrorMessage = 'The broadcasts table does not exist. Please run the database migration.';
          } else if (errorCode === 'PERMISSION_DENIED') {
            userErrorMessage = 'You do not have permission to access broadcasts. Please visit the debug page to set your role.';
          } else if (response.status === 401) {
            userErrorMessage = 'You are not authenticated. Please sign in.';
            // Set authentication state to false to show login button
            setIsAuthenticated(false);
            
            toast({
              title: 'Authentication Required',
              description: 'Please log in to access the broadcast features',
              variant: 'destructive',
            });
          }
          
          setError(userErrorMessage);
          throw new Error(`${errorMessage}: ${errorDetails}`);
        }
        
        // Only update state if component is still mounted
        if (isMounted) {
          setBroadcasts(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching broadcasts:', error);
        
        // Only update state if component is still mounted
        if (isMounted) {
          // Set a user-friendly error message
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(errorMessage);
          
          toast({
            title: 'Error',
            description: 'Failed to load broadcasts. Please try again or visit the debug page.',
            variant: 'destructive',
          });
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchBroadcasts();
    
    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [statusFilter]); // Remove toast from dependencies to prevent unnecessary re-renders
  
  // Handle create new broadcast
  const handleCreateNew = () => {
    router.push('/broadcasts/new');
  };
  
  // Handle edit broadcast
  const handleEdit = (id: string) => {
    router.push(`/broadcasts/edit/${id}`);
  };
  
  // Handle view broadcast details
  const handleView = (id: string) => {
    router.push(`/broadcasts/${id}`);
  };
  
  // Handle delete broadcast
  const handleDelete = async (id: string) => {
    // In a real app, you would show a confirmation dialog here
    try {
      const response = await fetch(`/api/broadcasts/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete broadcast');
      }
      
      // Remove the deleted broadcast from the list
      setBroadcasts(broadcasts.filter(broadcast => broadcast.id !== id));
      
      toast({
        title: 'Success',
        description: 'Broadcast deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete broadcast',
        variant: 'destructive',
      });
    }
  };
  
  // Handle send broadcast
  const handleSend = async (id: string) => {
    try {
      const response = await fetch('/api/broadcasts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send broadcast');
      }
      
      // Update the broadcast status in the list
      setBroadcasts(broadcasts.map(broadcast => 
        broadcast.id === id ? { ...broadcast, status: 'sent' } : broadcast
      ));
      
      toast({
        title: 'Success',
        description: 'Broadcast sent successfully',
      });
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to send broadcast',
        variant: 'destructive',
      });
    }
  };
  
  // Handle cancel scheduled broadcast
  const handleCancelSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/broadcasts/schedule?id=${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel scheduled broadcast');
      }
      
      // Update the broadcast status in the list
      setBroadcasts(broadcasts.map(broadcast => 
        broadcast.id === id ? { ...broadcast, status: 'draft', scheduled_for: null } : broadcast
      ));
      
      toast({
        title: 'Success',
        description: 'Broadcast schedule cancelled',
      });
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel scheduled broadcast',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <Text variant="display-1" className="mb-2">Email Broadcasts</Text>
          <Text variant="body-1" className="text-gray-500">
            Create, schedule, and manage email broadcasts
          </Text>
        </div>
        
        <Button
          view="action"
          size="m"
          onClick={handleCreateNew}
        >
          <Icon data={Plus} size={16} />
          New Broadcast
        </Button>
      </div>
      
      <div className="mb-6">
        <SegmentedRadioGroup
          size="m"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as unknown as StatusFilter)}
          options={[
            { value: 'all', content: 'All' },
            { value: 'draft', content: 'Drafts' },
            { value: 'scheduled', content: 'Scheduled' },
            { value: 'sent', content: 'Sent' },
            { value: 'failed', content: 'Failed' },
          ]}
        />
      </div>
      
      {isAuthenticated === false ? (
        <div className="text-center py-8">
          <Text variant="body-1" className="mb-4">You need to be logged in to access this feature</Text>
          <Button
            view="action"
            size="m"
            onClick={() => router.push('/auth')}
          >
            Go to Login Page
          </Button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <Text variant="body-1">Loading broadcasts...</Text>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <Text variant="body-1" className="text-red-500 mb-4">{error}</Text>
          <Button
            view="normal"
            size="m"
            onClick={() => router.push('/debug')}
          >
            Go to Debug Page
          </Button>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-8">
          <Text variant="body-1" className="mb-4">No broadcasts found</Text>
          <Button
            view="action"
            size="m"
            onClick={handleCreateNew}
          >
            Create Your First Broadcast
          </Button>
        </div>
      ) : (
        <BroadcastList
          broadcasts={broadcasts}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSend={handleSend}
          onCancelSchedule={handleCancelSchedule}
        />
      )}
    </div>
  );
}

export default withBroadcastAuth(BroadcastsPage);