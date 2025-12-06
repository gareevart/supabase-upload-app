
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
import { Icon, Button, Divider } from '@gravity-ui/uikit';

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
            view={hasFormat(option.prefix) ? "normal" : "flat"}
            size="m"
            onClick={() => applyFormatting(option.prefix)}
            title={`${option.name}${option.shortcut ? ` (${option.shortcut})` : ''}`}
            style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
          >
            {option.icon}
          </Button>
        ))}

        <Divider orientation="vertical" style={{ margin: '0 4px', height: '24px' }} />
        
        <Button
          size="m"
          view="flat"
          onClick={() => applyList('- ')}
          title="Bullet List"
          style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
        >
          <Icon data={ListUl} size={16} />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => applyList('1. ')}
          title="Numbered List"
          style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
        >
          <Icon data={ListOl} size={16} />
        </Button>

        <Divider orientation="vertical" style={{ margin: '0 4px', height: '24px' }} />
        
        <div style={{ display: 'flex' }}>
          <Button 
            view="flat"
            size="m"
            onClick={() => applyAlignment('left')}
            title="Align Left"
            style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
          >
            <Icon data={TextAlignLeft} size={16} />
          </Button>
          
          <Button 
            view="flat"
            size="m"
            onClick={() => applyAlignment('center')}
            title="Align Center"
            style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
          >
            <Icon data={TextAlignCenter} size={16} />
          </Button>
          
          <Button 
            view="flat"
            size="m"
            onClick={() => applyAlignment('right')}
            title="Align Right"
            style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
          >
            <Icon data={TextAlignRight} size={16} />
          </Button>
        </div>

        <Divider orientation="vertical" style={{ margin: '0 4px', height: '24px' }} />

        <Button
          view="flat"
          size="m"
          onClick={() => applyFormatting('> ')}
          title="Quote"
          style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
        >
          <Icon data={Circle} size={16} />
        </Button>
        
        <Button
          view="flat"
          size="m"
          onClick={() => applyFormatting('`')}
          title="Inline Code"
          style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
        >
          <Icon data={Code} size={16} />
        </Button>

        <Button 
          view="flat"
          size="m"
          onClick={() => onOpenDialog('link')}
          title="Insert Link"
          style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
        >
          <Icon data={Link} size={16} />
        </Button>
        
        <Button 
          view="flat"
          size="m"
          onClick={() => onOpenDialog('image')}
          title="Insert Image"
          style={{ height: '32px', padding: '0 8px', minWidth: '32px' }}
        >
          <Icon data={Picture} size={16} />
        </Button>
      </div>
    </div>
  );
};

export default FormattingToolbar;
