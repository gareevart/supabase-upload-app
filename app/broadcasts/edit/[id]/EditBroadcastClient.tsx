"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Text } from '@gravity-ui/uikit';
import EmailBroadcastForm from '@/app/components/broadcasts/EmailBroadcastForm';
import { Broadcast, NewBroadcast } from '@/app/components/broadcasts/types';
import { useToast } from '@/hooks/use-toast';
import withBroadcastAuth from '../../withBroadcastAuth';

interface EditBroadcastClientProps {
  id: string;
}

function EditBroadcastClientBase({ id }: EditBroadcastClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch broadcast data
  useEffect(() => {
    const fetchBroadcast = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/broadcasts/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        console.log('Fetch broadcast response:', response);
        
        if (!response.ok) {
          let errorMessage = 'Failed to fetch broadcast';
          try {
            const errorData = await response.text();
            console.error('Error response:', errorData);
            if (errorData) {
              try {
                const parsedError = JSON.parse(errorData);
                errorMessage = parsedError.message || parsedError.error || errorMessage;
              } catch (parseError) {
                console.error('Error parsing error response:', parseError);
                errorMessage = errorData.length > 100 ? errorData.substring(0, 100) + '...' : errorData;
              }
            }
          } catch (e) {
            console.error('Error handling error response:', e);
          }
          throw new Error(errorMessage);
        }
        
        const { data } = await response.json();
        setBroadcast(data);
      } catch (error) {
        console.error('Error fetching broadcast:', error);
        toast({
          title: 'Error',
          description: 'Failed to load broadcast',
          variant: 'destructive',
        });
        router.push('/broadcasts');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBroadcast();
  }, [id, router, toast]);
  
  // Handle save as draft
  const handleSave = async (data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/broadcasts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          ...data,
          status: 'draft',
          scheduled_for: null,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update broadcast');
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast updated successfully',
      });
      
      // Redirect to broadcasts list
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error updating broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to update broadcast',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle schedule
  const handleSchedule = async (data: NewBroadcast, date: Date) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/broadcasts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          ...data,
          status: 'scheduled',
          scheduled_for: date.toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to schedule broadcast');
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast scheduled successfully',
      });
      
      // Redirect to broadcasts list
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error scheduling broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule broadcast',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle send now
  const handleSend = async (data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      // First update the broadcast
      const updateResponse = await fetch(`/api/broadcasts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(data),
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update broadcast');
      }
      
      // Then send it
      const sendResponse = await fetch('/api/broadcasts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ id }),
      });
      
      if (!sendResponse.ok) {
        throw new Error('Failed to send broadcast');
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast sent successfully',
      });
      
      // Redirect to broadcasts list
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'Error',
        description: 'Failed to send broadcast',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Text variant="display-1" className="mb-6">Edit Broadcast</Text>
        <div className="text-center py-8">
          <Text variant="body-1">Loading broadcast...</Text>
        </div>
      </div>
    );
  }
  
  if (!broadcast) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Text variant="display-1" className="mb-6">Edit Broadcast</Text>
        <div className="text-center py-8">
          <Text variant="body-1">Broadcast not found</Text>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Text variant="display-1" className="mb-6">Edit Broadcast</Text>
      
      <EmailBroadcastForm
        initialData={broadcast}
        onSave={handleSave}
        onSchedule={handleSchedule}
        onSend={handleSend}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

// Apply the HOC and export
const EditBroadcastClient = withBroadcastAuth(EditBroadcastClientBase);
export default EditBroadcastClient;