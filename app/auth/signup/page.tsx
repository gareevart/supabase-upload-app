"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase';
import { Card, Text, Button, TextInput, PasswordInput, useToaster } from '@gravity-ui/uikit'
import Link from 'next/link';
// CSS import removed as it's now in the root layout

const SignUp = () => {
  const [password, setPassword] = React.useState('');
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { add } = useToaster();

  // Only show UI after first client-side render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else
        add({
          name: 'need-confirm',
          title: 'Confirm your email',
          content: 'Check your email for the confirmation link!',
          theme: 'info',
          autoHiding: false,
        });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Don't render until client-side to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div className="login-container">
      <Card maxWidth="400px" theme="normal" size="l" className='login'>
        <div className="title">
          <Text variant="header-1" color="primary">Get started</Text>
          <Text variant="body-1" color="secondary">Create a new account</Text>
        </div>
        
        <form onSubmit={handleSignUp}>
          <Text variant="subheader-1" color="primary">Email</Text>
          <TextInput
            size="l"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          
          <Text variant="subheader-1" color="primary">Password</Text>
          <PasswordInput
            size="l"
            placeholder="Password"
            onUpdate={setPassword}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          
          <Button 
            size="l" 
            view="action" 
            type="submit"
            loading={isLoading}
          >
            Sign up
          </Button>
        </form>
        
        {error && (
          <Text color="danger" variant="body-2" className="error-message">
            {error}
          </Text>
        )}
        
        <div className="signup">
          <Text variant="subheader-1" color="primary">
            Have an account?
          </Text>
          <Link className="link g-color-text_color_secondary" href="/auth/login">Login</Link>
        </div>
      </Card>
    </div>
  )
}

export default SignUp
