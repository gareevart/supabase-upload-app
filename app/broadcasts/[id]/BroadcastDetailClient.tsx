"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Broadcast, BroadcastStats } from '@/app/components/broadcasts/types';
import BroadcastDetail from '@/app/components/broadcasts/BroadcastDetail';
import { useToast } from '@/hooks/use-toast';
import { Text } from '@gravity-ui/uikit';
import withBroadcastAuth from '../withBroadcastAuth';

interface BroadcastDetailClientProps {
  id: string;
}

function BroadcastDetailClientBase({ id }: BroadcastDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [stats, setStats] = useState<BroadcastStats | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch broadcast data
  useEffect(() => {
    let isMounted = true;
    
    const fetchBroadcast = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/broadcasts/${id}`, {
          credentials: 'include', // Include cookies for authentication
        });
        
        if (!response.ok) {
          // Check for authentication error
          if (response.status === 401) {
            console.error('Authentication error: User not authenticated');
            toast({
              title: 'Authentication Required',
              description: 'Please log in to access the broadcast features',
              variant: 'destructive',
            });
            router.push('/auth');
            return;
          }
          throw new Error('Failed to fetch broadcast');
        }
        
        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          setBroadcast(data.data);
          
          // Calculate stats if broadcast is sent
          if (data.data.status === 'sent') {
            try {
              const total = data.data.total_recipients || 0;
              const opened = data.data.opened_count || 0;
              const clicked = data.data.clicked_count || 0;
              
              const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
              const clickRate = total > 0 ? Math.round((clicked / total) * 100) : 0;
              
              setStats({
                total,
                opened,
                clicked,
                openRate,
                clickRate,
              });
            } catch (statsError) {
              console.error('Error calculating stats:', statsError);
              // Set default stats
              setStats({
                total: 0,
                opened: 0,
                clicked: 0,
                openRate: 0,
                clickRate: 0,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching broadcast:', error);
        
        // Only show toast and redirect if component is still mounted
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Failed to load broadcast',
            variant: 'destructive',
          });
          router.push('/broadcasts');
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchBroadcast();
    
    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [id]); // Remove router and toast from dependencies to prevent infinite re-renders
  
  // Handle navigation back to broadcasts list
  const handleBack = () => {
    router.push('/broadcasts');
  };
  
  // Handle edit broadcast
  const handleEdit = (id: string) => {
    router.push(`/broadcasts/edit/${id}`);
  };
  
  // Handle delete broadcast
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/broadcasts/${id}`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete broadcast');
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast deleted successfully',
      });
      
      router.push('/broadcasts');
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
      
      toast({
        title: 'Success',
        description: 'Broadcast sent successfully',
      });
      
      // Update broadcast status locally instead of refreshing
      setBroadcast(prev => prev ? { ...prev, status: 'sent' } : prev);
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to send broadcast',
        variant: 'destructive',
      });
    }
  };
  
  // Handle schedule broadcast
  const handleSchedule = async (id: string, date: Date) => {
    try {
      const response = await fetch('/api/broadcasts/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ id, scheduled_for: date.toISOString() }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to schedule broadcast');
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast scheduled successfully',
      });
      
      // Update broadcast status locally instead of refreshing
      setBroadcast(prev => prev ? { ...prev, status: 'scheduled', scheduled_for: date.toISOString() } : prev);
    } catch (error) {
      console.error('Error scheduling broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule broadcast',
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
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel scheduled broadcast');
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast schedule cancelled',
      });
      
      // Update broadcast status locally instead of refreshing
      setBroadcast(prev => prev ? { ...prev, status: 'draft', scheduled_for: null } : prev);
    } catch (error) {
      console.error('Error cancelling schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel scheduled broadcast',
        variant: 'destructive',
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8">
          <Text variant="body-1">Loading broadcast details...</Text>
        </div>
      </div>
    );
  }
  
  if (!broadcast) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-8">
          <Text variant="body-1">Broadcast not found</Text>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <BroadcastDetail
        broadcast={broadcast}
        stats={stats}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSend={handleSend}
        onSchedule={handleSchedule}
        onCancelSchedule={handleCancelSchedule}
      />
    </div>
  );
}

// Apply the HOC and export
const BroadcastDetailClient = withBroadcastAuth(BroadcastDetailClientBase);
export default BroadcastDetailClient;