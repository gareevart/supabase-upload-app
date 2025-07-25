import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useQuotaInfo = (userId: string | undefined, mounted: boolean) => {
    const [dailyQuota, setDailyQuota] = useState('10/10 remaining today');

    useEffect(() => {
        const fetchQuota = async () => {
            if (!mounted || !userId) return;
            
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('daily_image_quota_remaining, quota_last_updated')
                    .eq('id', userId)
                    .single();

                if (!error && data) {
                    const profile = data as unknown as { daily_image_quota_remaining: number, quota_last_updated: string };
                    const today = new Date().toISOString().split('T')[0];
                    const lastUpdated = new Date(profile.quota_last_updated).toISOString().split('T')[0];

                    if (lastUpdated === today) {
                        setDailyQuota(`${profile.daily_image_quota_remaining}/10 remaining today`);
                        return;
                    }
                }
            } catch (err) {
                console.error('Error fetching quota:', err);
            }

            // Fallback to localStorage
            const quotaData = localStorage.getItem(`yaart_quota_${userId}`);
            if (quotaData) {
                const { lastUpdated, count } = JSON.parse(quotaData);
                const today = new Date().toISOString().split('T')[0];
                if (lastUpdated.split('T')[0] === today) {
                    setDailyQuota(`${10 - count}/10 remaining today`);
                    return;
                }
            }
            setDailyQuota('10/10 remaining today');
        };

        fetchQuota();
    }, [mounted, userId]);

    return dailyQuota;
};