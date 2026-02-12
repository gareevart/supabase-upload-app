"use client";

import React, { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { Text, Icon } from '@gravity-ui/uikit';
import { Xmark } from '@gravity-ui/icons';
import { validateEmail } from '@/lib/resend';
import { useI18n } from '@/app/contexts/I18nContext';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  setTags,
  placeholder = 'Add email addresses...',
  disabled = false,
  maxTags = 100,
  className = '',
}) => {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (email: string) => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) return;
    
    // Validate email format
    if (!validateEmail(trimmedEmail)) {
      setError(`${t('broadcast.tagInput.invalidEmail')}: ${trimmedEmail}`);
      return;
    }
    
    // Check if email already exists
    if (tags.includes(trimmedEmail)) {
      setError(`${t('broadcast.tagInput.alreadyAdded')}: ${trimmedEmail}`);
      return;
    }
    
    // Check if max tags limit reached
    if (tags.length >= maxTags) {
      setError(`${t('broadcast.tagInput.maxReached')}: ${maxTags}`);
      return;
    }
    
    // Add the email to tags
    setTags([...tags, trimmedEmail]);
    setInputValue('');
    setError(null);
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    // Add tag on Enter or comma
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
    
    // Remove last tag on Backspace if input is empty
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Split pasted text by commas, semicolons, or newlines
    const emails = pastedText.split(/[,;\n]/).map(email => email.trim()).filter(Boolean);
    
    // Process each email
    emails.forEach(email => {
      if (tags.length < maxTags) {
        addTag(email);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError(null);
  };

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div 
        className={`flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-background cursor-text'} ${className}`}
        onClick={handleContainerClick}
      >
        {tags.map((tag, index) => (
          <div 
            key={index} 
            className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-md"
          >
            <span>{tag}</span>
            {!disabled && (
              <button 
                type="button" 
                onClick={() => removeTag(index)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Icon data={Xmark} size={12} />
              </button>
            )}
          </div>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled || tags.length >= maxTags}
          className="flex-grow min-w-[120px] outline-none bg-transparent"
        />
      </div>
      
      {error && (
        <Text variant="body-2" className="text-red-500 mt-1">
          {error}
        </Text>
      )}
      
      <Text variant="caption-1" className="text-gray-500 mt-1">
        {t('broadcast.tagInput.hint')}
      </Text>
    </div>
  );
};

export default TagInput;