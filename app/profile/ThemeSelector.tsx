import { SegmentedRadioGroup, Icon } from '@gravity-ui/uikit';
import { Sun, Moon, Palette } from '@gravity-ui/icons';

type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeSelectorProps {
  value: string;
  onChange: (theme: ThemeOption) => void;
}

export const ThemeSelector = ({ value, onChange }: ThemeSelectorProps) => {
  // Ensure we have a valid theme value
  const safeValue: ThemeOption =
    value === 'light' || value === 'dark' || value === 'system'
      ? value
      : 'system';
  
  const handleThemeChange = (newTheme: string) => {
    if (newTheme === 'light' || newTheme === 'dark' || newTheme === 'system') {
      onChange(newTheme);
    }
  };

  return (
    <SegmentedRadioGroup
      name="theme-selector"
      value={safeValue}
      onUpdate={handleThemeChange}
      size="l"
      width="auto"
    >
      <SegmentedRadioGroup.Option value="light">
        <div className="flex items-center">
          <Icon data={Sun} size={16} />
          Light
        </div>
      </SegmentedRadioGroup.Option>
      
      <SegmentedRadioGroup.Option value="dark">
        <div className="flex items-center">
          <Icon data={Moon} size={16} />
          Dark
        </div>
      </SegmentedRadioGroup.Option>
      
      <SegmentedRadioGroup.Option value="system">
        <div className="flex items-center">
          <Icon data={Palette} size={16} />
          System
        </div>
      </SegmentedRadioGroup.Option>
    </SegmentedRadioGroup>
  );
};
