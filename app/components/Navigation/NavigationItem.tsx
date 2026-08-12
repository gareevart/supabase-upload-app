import React from 'react';
import {Button} from '@gravity-ui/uikit';
import './NavigationItem.css';

interface NavigationItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  showLabel?: boolean;
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  icon: Globe,
  label,
  isActive = false,
  onClick,
  showLabel = false,
}) => {
  return (
    <Button
      className={`nav-item ${isActive ? 'active' : ''} ${showLabel ? 'with-label' : ''}`}
      onClick={onClick}
      view={isActive ? 'normal' : 'flat'}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="nav-item-content">
        <div className="icon-container">
          <Globe size={24} />
        </div>
        {showLabel && <span className="nav-item-label">{label}</span>}
      </div>
    </Button>
  );
};

export default NavigationItem;
