"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Text } from '@gravity-ui/uikit';
import EmailBroadcastForm from '@/app/components/broadcasts/EmailBroadcastForm';
import { NewBroadcast } from '@/app/components/broadcasts/types';
import { useToast } from '@/hooks/use-toast';
import withBroadcastAuth from '../withBroadcastAuth';

function NewBroadcastClientBase() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle save as draft
  const handleSave = async (data: NewBroadcast, retryCount = 0) => {
    try {
      setIsSubmitting(true);
      const maxRetries = 2;
      
      const response = await fetch('/api/broadcasts', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // Get the response text first to help with debugging
      const responseText = await response.text();
      let responseData;
      
      try {
        // Try to parse the response as JSON
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        console.log('Response text:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        // Extract error details from the response
        const errorMessage = responseData.error || 'Failed to save broadcast';
        const errorDetails = responseData.details || '';
        const errorCode = responseData.code || '';
        
        console.error('API Error Details:', {
          url: '/api/broadcasts',
          method: 'POST',
          status: response.status,
          error: errorMessage,
          details: errorDetails,
          code: errorCode,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          requestHeaders: {
            'Content-Type': 'application/json',
            credentials: 'include'
          },
          retryCount
        });
        
        let userErrorMessage = 'Failed to save broadcast';
        
        // Provide more specific error messages based on the error code
        if (errorCode === 'TABLE_NOT_FOUND') {
          userErrorMessage = 'The broadcasts table does not exist. Please run the database migration.';
        } else if (errorCode === 'PERMISSION_DENIED') {
          userErrorMessage = 'You do not have permission to create broadcasts. Please visit the debug page to set your role.';
        } else if (response.status === 401 && retryCount < maxRetries) {
          console.log(`Attempting retry ${retryCount + 1} of ${maxRetries}...`);
          return handleSave(data, retryCount + 1);
        } else if (response.status === 401) {
          userErrorMessage = 'You are not authenticated. Please sign in.';
        }
        
        throw new Error(`${errorMessage}: ${errorDetails}`);
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast saved as draft',
      });
      
      // Redirect to broadcasts list
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error saving broadcast:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        } : error,
        timestamp: new Date().toISOString(),
        userAction: 'save_broadcast'
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: 'Error',
        description: `Failed to save broadcast: ${errorMessage}`,
        variant: 'destructive',
      });
      
      // If the error is related to permissions, suggest visiting the debug page
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        toast({
          title: 'Suggestion',
          description: 'Try visiting the debug page to set your role to admin',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle schedule
  const handleSchedule = async (data: NewBroadcast, date: Date) => {
    try {
      setIsSubmitting(true);
      
      // Add scheduled_for to the data
      const scheduledData = {
        ...data,
        scheduled_for: date.toISOString(),
      };
      
      const response = await fetch('/api/broadcasts', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduledData),
      });
      
      // Get the response text first to help with debugging
      const responseText = await response.text();
      let responseData: {
        error?: string;
        details?: string;
        code?: string;
        data?: any;
      } = {};
      
      try {
        // Try to parse the response as JSON
        responseData = JSON.parse(responseText);
        if (!responseData || typeof responseData !== 'object') {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        console.error('Error parsing response:', {
          error: parseError,
          responseText,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Failed to process server response (status ${response.status})`);
      }
      
      if (!response.ok) {
        // Extract error details from the response
        const errorMessage = responseData.error || 'Failed to schedule broadcast';
        const errorDetails = responseData.details || '';
        const errorCode = responseData.code || '';
        
        console.error('API Error Details:', {
          url: '/api/broadcasts',
          method: 'POST',
          status: response.status,
          error: errorMessage,
          details: errorDetails,
          code: errorCode,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          requestHeaders: {
            'Content-Type': 'application/json',
            credentials: 'include'
          },
          timestamp: new Date().toISOString()
        });
        
        if (response.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please sign in again.',
            variant: 'destructive',
          });
          router.push('/auth');
        }
        
        throw new Error(`${errorMessage}: ${errorDetails}`);
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast scheduled successfully',
      });
      
      // Redirect to broadcasts list
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error scheduling broadcast:', error);
      
      // Provide a more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: 'Error',
        description: `Failed to schedule broadcast: ${errorMessage}`,
        variant: 'destructive',
      });
      
      // If the error is related to permissions, suggest visiting the debug page
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        toast({
          title: 'Suggestion',
          description: 'Try visiting the debug page to set your role to admin',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle send now
  const handleSend = async (data: NewBroadcast) => {
    try {
      setIsSubmitting(true);
      
      // First save the broadcast
      const saveResponse = await fetch('/api/broadcasts', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // Get the response text first to help with debugging
      const saveResponseText = await saveResponse.text();
      let savedBroadcast;
      
      try {
        // Try to parse the response as JSON
        savedBroadcast = JSON.parse(saveResponseText);
      } catch (parseError) {
        console.error('Error parsing save response:', parseError);
        console.log('Response text:', saveResponseText);
        throw new Error(`Invalid JSON response: ${saveResponseText.substring(0, 100)}...`);
      }
      
      if (!saveResponse.ok) {
        // Extract error details from the response
        const errorMessage = savedBroadcast.error || 'Failed to create broadcast';
        const errorDetails = savedBroadcast.details || '';
        
        throw new Error(`${errorMessage}: ${errorDetails}`);
      }
      
      // Then send it
      const sendResponse = await fetch('/api/broadcasts/send', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: savedBroadcast.data.id }),
      });
      
      // Get the response text first to help with debugging
      const sendResponseText = await sendResponse.text();
      let sendResponseData;
      
      try {
        // Try to parse the response as JSON
        sendResponseData = JSON.parse(sendResponseText);
      } catch (parseError) {
        console.error('Error parsing send response:', parseError);
        console.log('Response text:', sendResponseText);
        throw new Error(`Invalid JSON response: ${sendResponseText.substring(0, 100)}...`);
      }
      
      if (!sendResponse.ok) {
        // Extract error details from the response
        const errorMessage = sendResponseData.error || 'Failed to send broadcast';
        const errorDetails = sendResponseData.details || '';
        const errorCode = sendResponseData.code || '';
        
        console.error('Send API Error:', {
          url: '/api/broadcasts/send',
          method: 'POST',
          status: sendResponse.status,
          error: errorMessage,
          details: errorDetails,
          code: errorCode,
          responseHeaders: Object.fromEntries(sendResponse.headers.entries()),
          requestHeaders: {
            'Content-Type': 'application/json',
            credentials: 'include'
          },
          timestamp: new Date().toISOString()
        });
        
        if (sendResponse.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please sign in again.',
            variant: 'destructive',
          });
          router.push('/auth');
        }
        
        throw new Error(`${errorMessage}: ${errorDetails}`);
      }
      
      toast({
        title: 'Success',
        description: 'Broadcast sent successfully',
      });
      
      // Redirect to broadcasts list
      router.push('/broadcasts');
    } catch (error) {
      console.error('Error sending broadcast:', error);
      
      // Provide a more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: 'Error',
        description: `Failed to send broadcast: ${errorMessage}`,
        variant: 'destructive',
      });
      
      // If the error is related to permissions, suggest visiting the debug page
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        toast({
          title: 'Suggestion',
          description: 'Try visiting the debug page to set your role to admin',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Text variant="display-1" className="mb-6">Create New Broadcast</Text>
      
      <EmailBroadcastForm
        onSave={handleSave}
        onSchedule={handleSchedule}
        onSend={handleSend}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

// Apply the HOC and export
const NewBroadcastClient = withBroadcastAuth(NewBroadcastClientBase);
export default NewBroadcastClient;