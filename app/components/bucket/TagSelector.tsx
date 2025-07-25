'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, TextInput, Card, Text, useToaster, Loader, Icon } from '@gravity-ui/uikit';
import { Plus, Xmark } from '@gravity-ui/icons';
import './TagSelector.css';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  disabled?: boolean;
}

export default function TagSelector({ selectedTags, onTagsChange, disabled = false }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const toaster = useToaster();

  // Загрузка доступных тегов
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error: any) {
      console.error('Ошибка загрузки тегов:', error);
      toaster.add({
        name: 'tags-error',
        title: 'Ошибка',
        content: 'Не удалось загрузить теги',
        theme: 'danger',
        autoHiding: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [toaster]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Создание нового тега
  const createTag = useCallback(async () => {
    if (!newTagName.trim()) return;

    try {
      setCreatingTag(true);
      
      // Генерируем случайный цвет для нового тега
      const colors = [
        '#22c55e', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6',
        '#06b6d4', '#f97316', '#ec4899', '#64748b', '#84cc16'
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const { data, error } = await supabase
        .from('tags')
        .insert([{ name: newTagName.trim(), color: randomColor }])
        .select()
        .single();

      if (error) throw error;

      // Добавляем новый тег в список доступных
      setAvailableTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Автоматически выбираем созданный тег
      onTagsChange([...selectedTags, data]);
      
      setNewTagName('');
      setShowNewTagInput(false);
      
      toaster.add({
        name: 'tag-created',
        title: 'Успешно',
        content: `Тег "${data.name}" создан`,
        theme: 'success',
        autoHiding: 3000
      });
    } catch (error: any) {
      console.error('Ошибка создания тега:', error);
      toaster.add({
        name: 'tag-create-error',
        title: 'Ошибка',
        content: error.message || 'Не удалось создать тег',
        theme: 'danger',
        autoHiding: 3000
      });
    } finally {
      setCreatingTag(false);
    }
  }, [newTagName, selectedTags, onTagsChange, toaster]);

  // Переключение выбора тега
  const toggleTag = useCallback((tag: Tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    if (isSelected) {
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  }, [selectedTags, onTagsChange]);

  // Удаление выбранного тега
  const removeSelectedTag = useCallback((tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.id !== tagId));
  }, [selectedTags, onTagsChange]);

  if (loading) {
    return (
      <Card view="outlined" className="tag-selector">
        <div className="tag-selector-loading">
          <Loader size="s" />
          <Text variant="body-2">Загрузка тегов...</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card view="outlined" className="tag-selector">
      <Text variant="subheader-1" className="tag-selector-title">
        Теги изображения
      </Text>

      {/* Выбранные теги */}
      {selectedTags.length > 0 && (
        <div className="selected-tags">
          <Text variant="body-2" className="selected-tags-label">
            Выбранные теги:
          </Text>
          <div className="selected-tags-list">
            {selectedTags.map(tag => (
              <div
                key={tag.id}
                className="selected-tag"
                style={{ backgroundColor: tag.color }}
              >
                <span className="selected-tag-name">{tag.name}</span>
                {!disabled && (
                  <button
                    className="selected-tag-remove"
                    onClick={() => removeSelectedTag(tag.id)}
                    title="Удалить тег"
                  >
                    <Icon data={Xmark} size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Доступные теги */}
      {!disabled && (
        <div className="available-tags">
          <Text variant="body-2" className="available-tags-label">
            Доступные теги:
          </Text>
          <div className="available-tags-list">
            {availableTags.map(tag => {
              const isSelected = selectedTags.some(t => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  className={`available-tag ${isSelected ? 'selected' : ''}`}
                  style={{ 
                    backgroundColor: isSelected ? tag.color : 'transparent',
                    borderColor: tag.color,
                    color: isSelected ? '#fff' : tag.color
                  }}
                  onClick={() => toggleTag(tag)}
                  disabled={disabled}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Создание нового тега */}
      {!disabled && (
        <div className="new-tag-section">
          {!showNewTagInput ? (
            <Button
              view="outlined"
              size="s"
              onClick={() => setShowNewTagInput(true)}
            >
              <Icon data={Plus} size={16} />
              Создать новый тег
            </Button>
          ) : (
            <div className="new-tag-input">
              <TextInput
                placeholder="Название тега"
                value={newTagName}
                onUpdate={setNewTagName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createTag();
                  } else if (e.key === 'Escape') {
                    setNewTagName('');
                    setShowNewTagInput(false);
                  }
                }}
                disabled={creatingTag}
                autoFocus
              />
              <div className="new-tag-buttons">
                <Button
                  view="action"
                  size="s"
                  onClick={createTag}
                  loading={creatingTag}
                  disabled={!newTagName.trim() || creatingTag}
                >
                  Создать
                </Button>
                <Button
                  view="flat"
                  size="s"
                  onClick={() => {
                    setNewTagName('');
                    setShowNewTagInput(false);
                  }}
                  disabled={creatingTag}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
