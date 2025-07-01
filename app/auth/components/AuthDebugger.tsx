"use client";

import { useEffect, useState } from 'react';
import { Button, Card, Text } from '@gravity-ui/uikit';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

interface DebugInfo {
  user: any;
  session: any;
  cookies: string;
  localStorage: Record<string, string>;
  url: string;
  timestamp: string;
}

const AuthDebugger = () => {
  const { user, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const collectDebugInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Collect localStorage data
      const localStorageData: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('supabase')) {
            localStorageData[key] = localStorage.getItem(key) || '';
          }
        }
      }

      const info: DebugInfo = {
        user: currentUser,
        session: session,
        cookies: typeof window !== 'undefined' ? document.cookie : '',
        localStorage: localStorageData,
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
      };

      setDebugInfo(info);
      console.log('Auth Debug Info:', info);
    } catch (error) {
      console.error('Error collecting debug info:', error);
    }
  };

  const clearAuthData = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('supabase')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear cookies
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('supabase')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        });
      }
      
      // Refresh debug info
      await collectDebugInfo();
      
      console.log('Auth data cleared');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      collectDebugInfo();
    }
  }, [user, loading]);

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{ marginTop: '20px', maxWidth: '400px' }}>
      <Card theme="normal">
        <div style={{ padding: '10px' }}>
          <Text variant="subheader-2" color="secondary">
            🔧 Auth Debugger (Dev Mode)
          </Text>
          
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button size="s" view="outlined" onClick={collectDebugInfo}>
              Refresh Info
            </Button>
            <Button size="s" view="outlined-danger" onClick={clearAuthData}>
              Clear Auth Data
            </Button>
            <Button size="s" view="flat" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? 'Hide' : 'Show'} Details
            </Button>
          </div>

          {isOpen && (
            <div style={{ marginTop: '15px' }}>
              <Text variant="caption-1" color="secondary">
                Auth Context Status:
              </Text>
              <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                <Text variant="caption-2" color={user ? 'positive' : 'danger'}>
                  User: {user ? `✓ ${user.email}` : '✗ Not authenticated'}
                </Text>
                <br />
                <Text variant="caption-2" color={loading ? 'warning' : 'secondary'}>
                  Loading: {loading ? 'Yes' : 'No'}
                </Text>
              </div>

              {debugInfo && (
                <>
                  <Text variant="caption-1" color="secondary" style={{ marginTop: '10px' }}>
                    Session Info:
                  </Text>
                  <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                    <Text variant="caption-2" color={debugInfo.session ? 'positive' : 'danger'}>
                      Session: {debugInfo.session ? '✓ Active' : '✗ None'}
                    </Text>
                    {debugInfo.session && (
                      <>
                        <br />
                        <Text variant="caption-2" color="secondary">
                          Expires: {new Date(debugInfo.session.expires_at * 1000).toLocaleString()}
                        </Text>
                      </>
                    )}
                  </div>

                  <Text variant="caption-1" color="secondary" style={{ marginTop: '10px' }}>
                    Storage:
                  </Text>
                  <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                    <Text variant="caption-2" color="secondary">
                      LocalStorage keys: {Object.keys(debugInfo.localStorage).length}
                    </Text>
                    <br />
                    <Text variant="caption-2" color="secondary">
                      Cookies: {debugInfo.cookies ? 'Present' : 'None'}
                    </Text>
                  </div>

                  <Text variant="caption-1" color="secondary" style={{ marginTop: '10px' }}>
                    Current URL:
                  </Text>
                  <div style={{ marginLeft: '10px', marginTop: '5px' }}>
                    <Text variant="caption-2" color="secondary" style={{ wordBreak: 'break-all' }}>
                      {debugInfo.url}
                    </Text>
                  </div>

                  <Text variant="caption-1" color="secondary" style={{ marginTop: '10px' }}>
                    Last Updated: {debugInfo.timestamp}
                  </Text>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuthDebugger;
