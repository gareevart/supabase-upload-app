"use client"
import React, { useState, useEffect } from 'react';
import { Button, Card, Icon, Text, TextInput, useThemeValue } from '@gravity-ui/uikit';
import { Eye, EyeSlash, ArrowUpRightFromSquare } from '@gravity-ui/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import './Auth.css';

const Login = () => {
  const router = useRouter();
  const theme = useThemeValue();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logo, setLogo] = useState(theme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg');

  // Update logo when theme changes
  useEffect(() => {
    setLogo(theme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg');
  }, [theme]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Проверяем сохраненный return URL или используем профиль по умолчанию
      const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('returnUrl') : null;
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        router.push(returnUrl);
      } else {
        router.push('/auth/profile');
      }
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
          redirectTo: `${window.location.origin}/auth/callback`,
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

  return (
    <div className="login-container">
      {/* Add logo above the card */}
      <div className="app-logo">
        <Image src={logo} alt="Application Logo" width={180} height={60} loading="eager" style={{ height: 'auto' }} />
      </div>

      <Card className='login' maxWidth="360px" theme="normal" size="l">
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
          <Icon data={ArrowUpRightFromSquare} size={16} />
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
            Don{'\'t'} have an account?
          </Text>
          <Link className="link g-color-text_color_secondary" href="/auth/signup">Sign Up</Link>
        </div>
      </Card>
      
    </div>
  );
};

export default Login;
