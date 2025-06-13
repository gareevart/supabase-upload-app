import { SegmentedRadioGroup , Theme, Icon } from '@gravity-ui/uikit';
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
