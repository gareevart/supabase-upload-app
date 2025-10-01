
import React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  TextAlignLeft, 
  TextAlignCenter, 
  TextAlignRight, 
  Link, 
  ListUl, 
  ListOl,
  Circle,
  Code,
  Picture
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { ToggleGroup, ToggleGroupItem } from "@/app/components/ui/toggle-group";
import {Button} from '@gravity-ui/uikit';
import { Separator } from "@/app/components/ui/separator";

interface FormattingToolbarProps {
  hasFormat: (prefix: string, suffix?: string) => boolean;
  applyFormatting: (prefix: string, suffix?: string) => void;
  applyList: (prefix: string) => void;
  applyAlignment: (alignment: 'left' | 'center' | 'right') => void;
  onOpenDialog: (type: string) => void;
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  hasFormat,
  applyFormatting,
  applyList,
  applyAlignment,
  onOpenDialog
}) => {
  const formatOptions = [
    { 
      name: 'Bold', 
      icon: <Icon data={Bold} size={16} />, 
      prefix: '**', 
      shortcut: 'Ctrl+B' 
    },
    { 
      name: 'Italic', 
      icon: <Icon data={Italic} size={16} />, 
      prefix: '*', 
      shortcut: 'Ctrl+I' 
    },
    { 
      name: 'Underline', 
      icon: <Icon data={Underline} size={16} />, 
      prefix: '__', 
      shortcut: 'Ctrl+U' 
    },
    { 
      name: 'Strikethrough', 
      icon: <Icon data={Strikethrough} size={16} />, 
      prefix: '~~' 
    }
  ];

  return (
    <div className="mb-2 flex flex-wrap gap-1 border p-2 rounded-md bg-background">
      <div className="flex items-center gap-1 flex-wrap">
        {formatOptions.map((option) => (
          <Button
            key={option.name}
            variant={hasFormat(option.prefix) ? "secondary" : "ghost"}
            size="m"
            onClick={() => applyFormatting(option.prefix)}
            title={`${option.name}${option.shortcut ? ` (${option.shortcut})` : ''}`}
            className="h-8 px-2 min-w-8"
          >
            {option.icon}
          </Button>
        ))}

        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Button
          size="m"
          onClick={() => applyList('- ')}
          title="Bullet List"
          className="h-8 px-2 min-w-8"
        >
          <Icon data={ListUl} size={16} />
        </Button>
        
        <Button
          view="normal"
          size="m"
          onClick={() => applyList('1. ')}
          title="Numbered List"
          className="h-8 px-2 min-w-8"
        >
          <Icon data={ListOl} size={16} />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <ToggleGroup type="single" className="flex">
          <ToggleGroupItem 
            value="left"
            aria-label="Align Left"
            onClick={() => applyAlignment('left')}
            title="Align Left"
            className="h-8 px-2 min-w-8"
          >
            <Icon data={TextAlignLeft} size={16} />
          </ToggleGroupItem>
          
          <ToggleGroupItem 
            value="center"
            aria-label="Align Center"
            onClick={() => applyAlignment('center')}
            title="Align Center"
            className="h-8 px-2 min-w-8"
          >
            <Icon data={TextAlignCenter} size={16} />
          </ToggleGroupItem>
          
          <ToggleGroupItem 
            value="right"
            aria-label="Align Right"
            onClick={() => applyAlignment('right')}
            title="Align Right"
            className="h-8 px-2 min-w-8"
          >
            <Icon data={TextAlignRight} size={16} />
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          variant="ghost"
          size="m"
          onClick={() => applyFormatting('> ')}
          title="Quote"
          className="h-8 px-2 min-w-8"
        >
          <Icon data={Circle} size={16} />
        </Button>
        
        <Button
          variant="ghost"
          size="m"
          onClick={() => applyFormatting('`')}
          title="Inline Code"
          className="h-8 px-2 min-w-8"
        >
          <Icon data={Code} size={16} />
        </Button>

        <Button 
          variant="ghost"
          size="m"
          onClick={() => onOpenDialog('link')}
          title="Insert Link"
          className="h-8 px-2 min-w-8"
        >
          <Icon data={Link} size={16} />
        </Button>
        
        <Button 
          variant="ghost"
          size="m"
          onClick={() => onOpenDialog('image')}
          title="Insert Image"
          className="h-8 px-2 min-w-8"
        >
          <Icon data={Picture} size={16} />
        </Button>
      </div>
    </div>
  );
};

export default FormattingToolbar;
