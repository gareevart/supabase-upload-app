"use client";

import { useState } from 'react';
import { Button, Card, Dialog, Icon, Text, TextInput } from '@gravity-ui/uikit';
import { Eye, EyeSlash, TriangleExclamation } from '@gravity-ui/icons';
import { useI18n } from '@/app/contexts/I18nContext';
import { useAccountSecurity } from '../hooks/useAccountSecurity';
import './DangerZoneSection.css';

interface DangerZoneSectionProps {
    email: string | undefined;
    role: string | null;
}

const MIN_PASSWORD_LENGTH = 6;
const DELETE_CONFIRMATION = 'DELETE';

// Categories of personal data removed on account deletion, surfaced to the user.
const DATA_CATEGORY_KEYS = [
    'dangerZone.delete.data.profile',
    'dangerZone.delete.data.posts',
    'dangerZone.delete.data.chats',
    'dangerZone.delete.data.images',
    'dangerZone.delete.data.apiKeys',
    'dangerZone.delete.data.widgets',
    'dangerZone.delete.data.broadcasts',
];

export const DangerZoneSection = ({ email, role }: DangerZoneSectionProps) => {
    const { t } = useI18n();
    const { changePassword, deleteAccount, isChangingPassword, isDeleting } =
        useAccountSecurity(email);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    const isAdmin = role === 'admin';

    const renderVisibilityToggle = (visible: boolean, onToggle: () => void) => (
        <Button
            size="s"
            view="flat-secondary"
            onClick={onToggle}
            disabled={isChangingPassword}
        >
            <Icon data={visible ? EyeSlash : Eye} />
        </Button>
    );

    const closePasswordDialog = () => {
        setIsPasswordDialogOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        setPasswordError(null);
    };

    const handleApplyPassword = async () => {
        setPasswordError(null);

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setPasswordError(t('dangerZone.changePassword.tooShort'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(t('dangerZone.changePassword.mismatch'));
            return;
        }

        const success = await changePassword(currentPassword, newPassword);
        if (success) {
            closePasswordDialog();
        }
    };

    const handleConfirmDelete = async () => {
        await deleteAccount();
    };

    const closeDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setDeleteConfirmation('');
    };

    return (
        <Card theme="warning" size="l" className="responsive-card danger-zone">
            <div className="danger-zone__header">
                <Icon data={TriangleExclamation} size={18} />
                <Text variant="subheader-3" color="danger">
                    {t('dangerZone.title')}
                </Text>
            </div>

            <div className="danger-zone__actions">
                <Button
                    size="l"
                    view="normal"
                    onClick={() => setIsPasswordDialogOpen(true)}
                >
                    {t('dangerZone.changePassword.title')}
                </Button>

                {!isAdmin && (
                    <Button
                        size="l"
                        view="outlined-danger"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        {t('dangerZone.delete.button')}
                    </Button>
                )}
            </div>

            <Dialog
                open={isPasswordDialogOpen}
                onClose={closePasswordDialog}
                aria-labelledby="change-password-dialog-title"
            >
                <Dialog.Header
                    caption={t('dangerZone.changePassword.title')}
                    id="change-password-dialog-title"
                />
                <Dialog.Body>
                    <div className="danger-zone__dialog">
                        <Text variant="body-2" color="secondary">
                            {t('dangerZone.changePassword.description')}
                        </Text>

                        <div className="danger-zone__field">
                            <Text variant="body-2">{t('dangerZone.changePassword.current')}</Text>
                            <TextInput
                                size="l"
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                endContent={renderVisibilityToggle(showCurrent, () =>
                                    setShowCurrent(!showCurrent),
                                )}
                                disabled={isChangingPassword}
                            />
                        </div>

                        <div className="danger-zone__field">
                            <Text variant="body-2">{t('dangerZone.changePassword.new')}</Text>
                            <TextInput
                                size="l"
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                endContent={renderVisibilityToggle(showNew, () =>
                                    setShowNew(!showNew),
                                )}
                                disabled={isChangingPassword}
                            />
                        </div>

                        <div className="danger-zone__field">
                            <Text variant="body-2">{t('dangerZone.changePassword.confirm')}</Text>
                            <TextInput
                                size="l"
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                endContent={renderVisibilityToggle(showConfirm, () =>
                                    setShowConfirm(!showConfirm),
                                )}
                                disabled={isChangingPassword}
                            />
                        </div>

                        {passwordError && (
                            <Text color="danger" variant="body-2">
                                {passwordError}
                            </Text>
                        )}
                    </div>
                </Dialog.Body>
                <Dialog.Footer
                    onClickButtonCancel={closePasswordDialog}
                    onClickButtonApply={handleApplyPassword}
                    textButtonApply={t('dangerZone.changePassword.submit')}
                    textButtonCancel={t('dangerZone.delete.cancelButton')}
                    propsButtonApply={{
                        loading: isChangingPassword,
                        disabled: !currentPassword || !newPassword || !confirmPassword,
                    }}
                />
            </Dialog>

            <Dialog
                open={isDeleteDialogOpen}
                onClose={closeDeleteDialog}
                aria-labelledby="delete-account-dialog-title"
            >
                <Dialog.Header
                    caption={t('dangerZone.delete.dialogTitle')}
                    id="delete-account-dialog-title"
                />
                <Dialog.Body>
                    <div className="danger-zone__dialog">
                        <Text variant="body-1">{t('dangerZone.delete.dialogIntro')}</Text>
                        <ul className="danger-zone__data-list">
                            {DATA_CATEGORY_KEYS.map((key) => (
                                <li key={key}>
                                    <Text variant="body-2">{t(key)}</Text>
                                </li>
                            ))}
                        </ul>
                        <Text variant="body-2" color="danger">
                            {t('dangerZone.delete.warning')}
                        </Text>
                        <Text variant="body-2">
                            {t('dangerZone.delete.confirmHint')}
                        </Text>
                        <TextInput
                            size="l"
                            value={deleteConfirmation}
                            placeholder={DELETE_CONFIRMATION}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            disabled={isDeleting}
                        />
                    </div>
                </Dialog.Body>
                <Dialog.Footer
                    onClickButtonCancel={closeDeleteDialog}
                    onClickButtonApply={handleConfirmDelete}
                    textButtonApply={t('dangerZone.delete.confirmButton')}
                    textButtonCancel={t('dangerZone.delete.cancelButton')}
                    propsButtonApply={{
                        view: 'outlined-danger',
                        loading: isDeleting,
                        disabled: deleteConfirmation !== DELETE_CONFIRMATION,
                    }}
                />
            </Dialog>
        </Card>
    );
};
