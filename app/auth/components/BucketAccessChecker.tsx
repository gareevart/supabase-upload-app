'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Text } from '@gravity-ui/uikit';

interface BucketAccessCheckerProps {
  bucketName: string;
}

const BucketAccessChecker = ({ bucketName }: BucketAccessCheckerProps) => {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Checking bucket access...');

  useEffect(() => {
    const checkBucketAccess = async () => {
      try {
        // Try to list files in the bucket to check access
        const { data, error } = await supabase
          .storage
          .from(bucketName)
          .list('', {
            limit: 1,
          });

        if (error) {
          if (error.message.includes('row-level security policy')) {
            setStatus('error');
            setMessage(`Access error: You need to configure RLS policies for the "${bucketName}" bucket in Supabase.`);
          } else {
            setStatus('error');
            setMessage(`Error accessing "${bucketName}" bucket: ${error.message}`);
          }
        } else {
          setStatus('success');
          setMessage(`Successfully connected to "${bucketName}" bucket.`);
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(`Error: ${err.message}`);
      }
    };

    checkBucketAccess();
  }, [bucketName]);

  return (
    <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: status === 'success' ? 'rgba(0, 128, 0, 0.1)' : status === 'error' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}>
      <Text variant="body-2" color={status === 'success' ? 'positive' : status === 'error' ? 'danger' : 'secondary'}>
        {message}
      </Text>
    </div>
  );
};

export default BucketAccessChecker;
