import React, { useState } from 'react'
import { supabase } from '../../lib/supabase';
import { Card, Text, Button, TextInput, PasswordInput, useToaster } from '@gravity-ui/uikit'
import Link from 'next/link';
import './Auth.css'

const SignUp = () => {
  const [password, setPassword] = React.useState('');
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { add } = useToaster();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
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
  }

  return (
    <div>
      <Card maxWidth="400px" theme="normal" size="l" className='login'>
        <Text variant="header-1">Get started</Text>
        <Text variant="body-1" color="secondary">Create a new account</Text>
        <form onSubmit={handleSignUp}>
          <Text variant="subheader-1" color="primary">Email</Text>
          <TextInput
            size="l"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <Text variant="subheader-1" color="primary">Password</Text>
          <PasswordInput
            size="l"
            placeholder="Password"
            onUpdate={setPassword}
            value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <Button size="l" view="action" type="submit">Sign up</Button>
        </form>
        {error && <p>{error}</p>}
        <div className="signup">
          <Text variant="subheader-1" color="primary">
            Have an account?
          </Text>
          <Link className="link g-color-text_color_secondary" href="/auth">Login</Link>
        </div>
      </Card>
    </div>
  )
}

export default SignUp