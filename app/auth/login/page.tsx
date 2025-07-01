"use client"

import React, { useState, useEffect, memo } from 'react';
import { Button, Card, Icon, Text, TextInput, useThemeValue } from '@gravity-ui/uikit';
import { Eye, EyeSlash } from '@gravity-ui/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
// CSS import removed as it's now in the root layout
import Image from 'next/image';
import AuthDebugger from '../components/AuthDebugger';

// Memoized logo component to prevent unnecessary re-renders
const LogoImage = memo(({ theme }: { theme: string }) => {
  const logoSrc = theme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg';
  
  return (
    <div className="app-logo">
      <Image 
        src={logoSrc} 
        alt="Application Logo" 
        width={180} 
        height={60} 
        priority
      />
    </div>
  );
});

LogoImage.displayName = 'LogoImage';

const Login = () => {
  const router = useRouter();
  const theme = useThemeValue();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only show UI after first client-side render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/auth/profile');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/profile`,
          queryParams: {
            prompt: 'select_account', // Force Google to show account selection
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Don't render until client-side to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div className="login-container">
      {/* Use the memoized logo component */}
      <LogoImage theme={theme} />

      <Card className='login' maxWidth="400px" theme="normal" size="l">
        <div className="title">
          <Text variant="header-1" color="primary">
            Welcome back
          </Text>
          <Text variant="body-1" color="secondary">
            Sign in to your account
          </Text>
        </div>

        <Button size="l" onClick={handleGoogleLogin} loading={isLoading}>
          Login with Google
        </Button>

        <div className="continue">
          <div className="divider"></div>
          <p>or continue with</p>
          <div className="divider"></div>
        </div>

        <form onSubmit={handleLogin}>
          <Text variant="subheader-1" color="primary">
            Email
          </Text>
          <TextInput
            size="l"
            type="email"
            value={email}
            placeholder="your@mail.com"
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <div className="password">
            <Text variant="subheader-1" color="primary">
              Password
            </Text>
            <Text variant="body-1" color="secondary">
              <Link className="link g-color-text_color_secondary" href="/auth/forgot-password">Forgot your password?</Link>
            </Text>
          </div>

          <TextInput
            size="l"
            type={showPassword ? 'text' : 'password'}
            value={password}
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            endContent={
              <Button
                size="s"
                view="flat-secondary"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <Icon data={EyeSlash} /> : <Icon data={Eye} />}
              </Button>
            }
            hasClear
            disabled={isLoading}
          />

          <Button size="l" type="submit" view="action" loading={isLoading}>
            Sign In
          </Button>
        </form>

        {error && (
          <Text color="danger" variant="body-2" className="error-message">
            {error}
          </Text>
        )}

        <div className="signup">
          <Text variant="subheader-1" color="primary">
            Don't have an account?
          </Text>
          <Link className="link g-color-text_color_secondary" href="/auth/signup">Sign Up</Link>
        </div>
      </Card>
      
      {/* Add Auth Debugger for troubleshooting */}
      <AuthDebugger />
    </div>
  );
};

export default Login;
