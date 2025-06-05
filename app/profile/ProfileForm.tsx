import { useState, useEffect } from "react";
import { Button, Theme, TextInput, TextArea, useThemeValue, Text, Avatar } from '@gravity-ui/uikit';
import { useToast } from "@/hooks/use-toast";
import { ThemeSelector } from "./ThemeSelector";
import { useProfile } from "../../hooks/useProfile";
import { useAuth } from "../contexts/AuthContext";
import FileUploader from '../auth/components/FileUploader';
import { FaceAlien } from '@gravity-ui/icons';

type FormData = {
  name: string;
  username: string;
  bio: string;
  website: string;
  theme: Theme;
  avatar_url: string | null;
};

export const ProfileForm = () => {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const currentTheme = useThemeValue();

  const [formData, setFormData] = useState<FormData>({
    name: profile?.name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    website: profile?.website || "",
    theme: currentTheme,
    avatar_url: profile?.avatar_url || null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Populate form when profile data loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        website: profile.website || "",
        theme: (profile.theme as Theme) || "system",
        avatar_url: profile.avatar_url || null,
      });
    }
  }, [profile]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleThemeChange = (value: Theme) => {
    setFormData(prev => ({ ...prev, theme: value }));

    // Save theme to localStorage
    localStorage.setItem('app-theme', value);

    // Dispatch a storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'app-theme',
      newValue: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { success, error } = await updateProfile(formData);

      if (!success) throw error;

      // Save theme to localStorage
      localStorage.setItem('app-theme', formData.theme);

      // Dispatch a storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'app-theme',
        newValue: formData.theme
      }));

      toast({
        title: "Профиль обновлен",
        description: "Ваши данные были успешно сохранены",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Ошибка обновления",
        description: "Не удалось обновить профиль",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Text variant="subheader-1" color="primary">Email</Text>
        <TextInput
          size="l"
          id="email"
          value={user?.email || ""}
          disabled
        />
      </div>

      <div className="space-y-2">
        <Text variant="subheader-1" color="primary">Имя</Text>
        <TextInput
          size="l"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Ваше имя"
        />
      </div>

      <div className="space-y-2">
        <Text variant="subheader-1" color="primary">Имя пользователя</Text>
        <TextInput
          size="l"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          placeholder="Имя пользователя"
        />
      </div>

      <div className="space-y-2">
        <Text variant="subheader-1" color="primary">О себе</Text>
        <TextArea
          size="l"
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder="Расскажите о себе..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Text variant="subheader-1" color="primary">Веб-сайт</Text>
        <TextInput
          size="l"
          id="website"
          name="website"
          value={formData.website}
          onChange={handleInputChange}
          placeholder="https://example.com"
        />
      </div>

      <div className="space-y-2">
        <Text variant="subheader-1" color="primary">Аватар</Text>
        {formData.avatar_url && (
          <div className="flex items-center gap-4 mb-4">
            <Avatar 
              imgUrl={formData.avatar_url} 
              fallbackImgUrl="https://loremflickr.com/640/480/cats?lock=3552647338524672" 
              size="l" 
            />
            <Button
              view="flat-danger"
              onClick={() => setFormData(prev => ({ ...prev, avatar_url: null }))}
            >
              Удалить аватар
            </Button>
          </div>
        )}
        <FileUploader
          bucketName="avatars"
          folderPath="profiles"
          onUploadComplete={(url: string) => setFormData(prev => ({ ...prev, avatar_url: url }))}
          existingFileUrl={formData.avatar_url || ''}
          acceptedFileTypes="image/*"
          maxSizeMB={2}
          allowDelete={true}
        />
        <Text variant="caption-2" color="secondary">
          Загрузите изображение для аватара (макс. 2MB)
        </Text>
      </div>

      <div className="space-y-2">
        <Text variant="subheader-1" color="primary">Тема оформления</Text>
        <ThemeSelector
          value={formData.theme}
          onChange={handleThemeChange}
        />
      </div>

      <div className="pt-4">
        <Button
          size="l"
          view="action"
          type="submit"
          className="w-full"
          disabled={isSaving}
        >
          {isSaving ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </div>
    </form>
  );
};