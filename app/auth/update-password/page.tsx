"use client"

import React, { useEffect, useState } from 'react';
import { Button, Card, Icon, Text, TextInput, useThemeValue } from '@gravity-ui/uikit';
import { Eye, EyeSlash } from '@gravity-ui/icons';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import '../Auth.css';

const ResetPassword = () => {
    const router = useRouter();
    const theme = useThemeValue();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [logo, setLogo] = useState(theme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg');

    // Update logo when theme changes
    useEffect(() => {
        setLogo(theme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg');
    }, [theme]);

    // Only show UI after first client-side render to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Process the hash parameters from the recovery link
        const handlePasswordRecovery = async () => {
            // In Next.js, we need to check if we're in the browser
            if (typeof window !== 'undefined') {
                try {
                    const hash = window.location.hash;
                    if (hash && hash.includes('type=recovery')) {
                        try {
                            // Extract tokens from URL
                            const hashParams = new URLSearchParams(hash.substring(1));
                            const accessToken = hashParams.get('access_token');
                            const refreshToken = hashParams.get('refresh_token');

                            if (!accessToken) {
                                throw new Error('Invalid recovery link');
                            }

                            // Set the session from the recovery link tokens
                            const { error } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken || '',
                            });

                            if (error) throw error;
                        } catch (error: any) {
                            console.error('Recovery error:', error.message);
                            router.push('/auth');
                        }
                    } else {
                        // Check if the user is authenticated for password reset
                        const { data } = await supabase.auth.getSession();
                        if (!data.session) {
                            router.push('/auth');
                        }
                    }
                } finally {
                    setInitializing(false);
                }
            }
        };

        if (mounted) {
            handlePasswordRecovery();
        }
    }, [router, mounted]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Password validation
        if (password.length < 6) {
            setError('Password should be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            // Get the current session to make sure we're authorized
            const { data: sessionData } = await supabase.auth.getSession();

            if (!sessionData.session) {
                throw new Error(
                    'Your password reset session has expired. Please request a new password reset link.',
                );
            }

            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) throw error;
            setSuccess(true);

            // Wait 3 seconds before redirecting to auth page
            setTimeout(async () => {
                // Sign out the user after successful password reset
                await supabase.auth.signOut();
                router.push('/auth');
            }, 3000);
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Don't render until client-side to avoid hydration issues
    if (!mounted || initializing) {
        return null;
    }

    return (
        <div className="login-container">
            {/* Add logo above the card */}
            <div className="app-logo">
                <Image src={logo} alt="Application Logo" width={180} height={60} />
            </div>

            <Card className='login' maxWidth="360px" theme="normal" size="l">
                <div className="title">
                    <Text variant="header-1" color="primary">
                        Update your password
                    </Text>
                    <Text variant="body-1" color="secondary">
                        Create a new password for your account
                    </Text>
                </div>

                {success ? (
                    <div className="success-message">
                        <Text variant="body-1" color="positive">
                            Your password has been reset successfully. You will be redirected to the
                            auth page shortly.
                        </Text>
                    </div>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <Text variant="subheader-1" color="primary">
                            New Password
                        </Text>
                        <TextInput
                            size="l"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            placeholder="Enter new password"
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

                        <Text variant="subheader-1" color="primary">
                            Confirm Password
                        </Text>
                        <TextInput
                            size="l"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            placeholder="Confirm new password"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            endContent={
                                <Button
                                    size="s"
                                    view="flat-secondary"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? (
                                        <Icon data={EyeSlash} />
                                    ) : (
                                        <Icon data={Eye} />
                                    )}
                                </Button>
                            }
                            hasClear
                            disabled={isLoading}
                        />

                        <Button
                            size="l"
                            type="submit"
                            view="action"
                            loading={isLoading}
                            disabled={!password || !confirmPassword}
                        >
                            Reset Password
                        </Button>

                        {error && (
                            <Text color="danger" variant="body-2" className="error-message">
                                {error}
                            </Text>
                        )}
                    </form>
                )}
            </Card>
        </div>
    );
};

export default ResetPassword;
