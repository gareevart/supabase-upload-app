import { SegmentedRadioGroup } from '@gravity-ui/uikit';
import { Theme } from '@gravity-ui/uikit';
import { Sun, Moon, Palette } from '@gravity-ui/icons';

interface ThemeSelectorProps {
  value: Theme;
  onChange: (theme: Theme) => void;
}

export const ThemeSelector = ({ value, onChange }: ThemeSelectorProps) => {
  const handleThemeChange = (newTheme: Theme) => {
    onChange(newTheme);
  };

  return (
    <SegmentedRadioGroup
      name="theme-selector"
      value={value}
      onUpdate={handleThemeChange}
      size="l"
      width="auto"
    >
      <SegmentedRadioGroup.Option value="light">
        <div className="flex items-center">
          <Sun className="h-5 w-5 mr-2" />
          Светлая
        </div>
      </SegmentedRadioGroup.Option>
      
      <SegmentedRadioGroup.Option value="dark">
        <div className="flex items-center">
          <Moon className="h-5 w-5 mr-2" />
          Темная
        </div>
      </SegmentedRadioGroup.Option>
      
      <SegmentedRadioGroup.Option value="system">
        <div className="flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Системная
        </div>
      </SegmentedRadioGroup.Option>
    </SegmentedRadioGroup>
  );
};
