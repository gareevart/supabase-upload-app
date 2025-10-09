import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToaster } from '@gravity-ui/uikit';
import { Subscription } from '../types';

export const useSubscription = (userId: string | undefined, userEmail: string | undefined, mounted: boolean) => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
    const { add } = useToaster();

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!mounted || !userId || !userEmail) return;
            
            try {
                // First look by user_id
                let { data, error } = await supabase
                    .from('subscribe')
                    .select('*')
                    .eq('user_id', userId)
                    .maybeSingle();

                // If not found by user_id, look by email
                if (!data && userEmail) {
                    const { data: emailData } = await supabase
                        .from('subscribe')
                        .select('*')
                        .eq('mail', userEmail)
                        .maybeSingle();
                    data = emailData;
                }

                if (error) throw error;

                if (data) {
                    setSubscription(data);
                } else {
                    // If no subscription exists, create an object with default values
                    setSubscription({
                        mail: userEmail,
                        subscribe_status: false,
                        user_id: userId,
                    });
                }
            } catch (err) {
                console.error('Error fetching subscription:', err);
                add({
                    name: 'subscription-error',
                    title: 'Ошибка',
                    content: 'Не удалось получить статус подписки',
                    theme: 'danger',
                    autoHiding: 5000,
                });
            }
        };
        
        fetchSubscription();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, userId, userEmail]);

    const handleSubscriptionToggle = async () => {
        if (!userId || !userEmail || !subscription) return;

        setIsSubscriptionLoading(true);
        try {
            const newStatus = !subscription.subscribe_status;

            let error: any = null;
            let updatedSubscription = null;

            if (subscription.id) {
                // Update existing subscription
                const { data, error: updateError } = await supabase
                    .from('subscribe')
                    .update({
                        subscribe_status: newStatus,
                        // Always save the date, even when unsubscribing
                        subscribe_started_date:
                            subscription.subscribe_started_date || new Date().toISOString(),
                    })
                    .eq('id', subscription.id)
                    .select()
                    .single();

                error = updateError;
                updatedSubscription = data;
            } else {
                // Create new subscription
                const { data, error: insertError } = await supabase
                    .from('subscribe')
                    .insert([
                        {
                            mail: userEmail,
                            user_id: userId,
                            subscribe_status: newStatus,
                            subscribe_started_date: new Date().toISOString(), // Always set the date
                        },
                    ])
                    .select()
                    .single();

                error = insertError;
                updatedSubscription = data;
            }

            if (error) {
                console.error('Supabase error details:', error);
                throw error;
            }

            if (!updatedSubscription) {
                throw new Error('No data returned from update/insert');
            }

            setSubscription(updatedSubscription);

            add({
                name: 'subscription-success',
                title: 'Успех',
                content: newStatus
                    ? 'Вы успешно подписались на рассылку'
                    : 'Вы успешно отписались от рассылки',
                theme: 'success',
                autoHiding: 5000,
            });
        } catch (err) {
            console.error('Full error updating subscription:', err);
            add({
                name: 'subscription-error',
                title: 'Ошибка',
                content: 'Не удалось обновить статус подписки. Пожалуйста, попробуйте позже.',
                theme: 'danger',
                autoHiding: 10000,
            });
        } finally {
            setIsSubscriptionLoading(false);
        }
    };

    return { subscription, isSubscriptionLoading, handleSubscriptionToggle };
};