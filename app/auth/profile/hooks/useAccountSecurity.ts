import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gravity-ui/uikit';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { useI18n } from '@/app/contexts/I18nContext';

// Business logic for the profile "Danger zone": change password (with current
// password re-authentication) and permanent account deletion.
export const useAccountSecurity = (email: string | undefined) => {
    const { add } = useToaster();
    const { t } = useI18n();
    const router = useRouter();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const changePassword = async (
        currentPassword: string,
        newPassword: string,
    ): Promise<boolean> => {
        if (!email) return false;

        setIsChangingPassword(true);
        try {
            // Re-authenticate to verify the current password before changing it.
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: currentPassword,
            });

            if (signInError) {
                add({
                    name: 'change-password-current-error',
                    title: t('dangerZone.toast.error'),
                    content: t('dangerZone.changePassword.invalidCurrent'),
                    theme: 'danger',
                    autoHiding: 5000,
                });
                return false;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            add({
                name: 'change-password-success',
                title: t('dangerZone.toast.success'),
                content: t('dangerZone.changePassword.success'),
                theme: 'success',
                autoHiding: 5000,
            });
            return true;
        } catch (error) {
            add({
                name: 'change-password-error',
                title: t('dangerZone.toast.error'),
                content: error instanceof Error ? error.message : t('dangerZone.changePassword.error'),
                theme: 'danger',
                autoHiding: 5000,
            });
            return false;
        } finally {
            setIsChangingPassword(false);
        }
    };

    const deleteAccount = async (): Promise<void> => {
        setIsDeleting(true);
        try {
            const response = await authFetch('/api/auth/delete-account', {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || t('dangerZone.delete.error'));
            }

            await supabase.auth.signOut();
            router.push('/auth');
        } catch (error) {
            add({
                name: 'delete-account-error',
                title: t('dangerZone.toast.error'),
                content: error instanceof Error ? error.message : t('dangerZone.delete.error'),
                theme: 'danger',
                autoHiding: 5000,
            });
            setIsDeleting(false);
        }
    };

    return { changePassword, deleteAccount, isChangingPassword, isDeleting };
};
