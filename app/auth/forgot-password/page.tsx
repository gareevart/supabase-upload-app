"use client"

import React, { useState, useEffect } from 'react';
import { Button, Card, Text, TextInput } from '@gravity-ui/uikit';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
// CSS import removed as it's now in the root layout

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Only show UI after first client-side render to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        if (!email.trim()) {
            setError('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });

            if (error) throw error;
            setSuccess(true);
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Don't render until client-side to avoid hydration issues
    if (!mounted) {
        return null;
    }

    return (
        <div className="login-container">
            <Card className='login' maxWidth="400px" theme="normal" size="l">
                <div className="title">
                    <Text variant="header-1" color="primary">
                        Forgot Password
                    </Text>
                    <Text variant="body-1" color="secondary">
                        Enter your email address and we'll send you a link to reset your password.
                    </Text>
                </div>

                {success ? (
                    <div className="success-message">
                        <Text variant="body-1" color="positive">
                            Password reset link has been sent to your email. Please check your inbox and
                            follow the instructions.
                        </Text>
                        <Button
                            size="l"
                            view="outlined"
                            onClick={() => {
                                setSuccess(false);
                                setEmail('');
                            }}
                        >
                            Send Another Link
                        </Button>
                        <div className="signup">
                            <Text variant="body-1" color="secondary">
                                Remember your password? <Link className="link g-color-text_color_secondary" href="/auth/login">Sign In</Link>
                            </Text>
                        </div>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleResetPassword}>
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

                            <Button
                                size="l"
                                type="submit"
                                view="action"
                                loading={isLoading}
                                disabled={!email}
                            >
                                Send Reset Link
                            </Button>
                        </form>

                        {error && (
                            <Text color="danger" variant="body-2" className="error-message">
                                {error}
                            </Text>
                        )}

                        <div className="signup">
                            <Text variant="subheader-1" color="primary">
                                Remember your password?
                            </Text>
                            <Link className="link g-color-text_color_secondary" href="/auth/login">Sign In</Link>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};

export default ForgotPassword;
