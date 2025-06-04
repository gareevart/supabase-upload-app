import React, { useEffect, useState } from 'react';
import { Button, Card, Icon, Text, TextInput } from '@gravity-ui/uikit';
import { Eye, EyeSlash } from '@gravity-ui/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './Auth.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Process the hash parameters from the recovery link
        const handlePasswordRecovery = async () => {
            const hash = location.hash;
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
                    navigate('/login');
                }
            } else {
                // Check if the user is authenticated for password reset
                const { data } = await supabase.auth.getSession();
                if (!data.session) {
                    navigate('/login');
                }
            }
        };

        handlePasswordRecovery();
    }, [navigate, location]);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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

            // Wait 3 seconds before redirecting to login
            setTimeout(() => {
                // Sign out the user after successful password reset
                supabase.auth.signOut();
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className='login' maxWidth="400px" theme="normal" size="l">
            <div className="title">
                <Text variant="header-1" color="primary">
                    Reset Your Password
                </Text>
                <Text variant="body-1" color="secondary">
                    Create a new password for your account
                </Text>
            </div>

            {success ? (
                <div className="success-message">
                    <Text variant="body-1" color="positive">
                        Your password has been reset successfully. You will be redirected to the
                        login page shortly.
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
    );
};

export default ResetPassword;
