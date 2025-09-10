import React from 'react';
import { 
  InformationCircleIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface InfoBoxProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

// Blue Info Box - General information
export const BlueInfoBox: React.FC<InfoBoxProps> = ({ 
  children, 
  title, 
  icon: Icon = InformationCircleIcon,
  className = "" 
}) => (
  <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
    {title && (
      <div className="flex items-center mb-2">
        <Icon className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="text-sm font-medium text-blue-900">{title}</h3>
      </div>
    )}
    <div className="text-sm text-blue-800">
      {children}
    </div>
  </div>
);

// Green Info Box - Success/Positive information
export const GreenInfoBox: React.FC<InfoBoxProps> = ({ 
  children, 
  title, 
  icon: Icon = CheckCircleIcon,
  className = "" 
}) => (
  <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
    {title && (
      <div className="flex items-center mb-2">
        <Icon className="h-5 w-5 text-green-600 mr-2" />
        <h3 className="text-sm font-medium text-green-900">{title}</h3>
      </div>
    )}
    <div className="text-sm text-green-800">
      {children}
    </div>
  </div>
);

// Red Info Box - Warnings/Errors
export const RedInfoBox: React.FC<InfoBoxProps> = ({ 
  children, 
  title, 
  icon: Icon = XCircleIcon,
  className = "" 
}) => (
  <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
    {title && (
      <div className="flex items-center mb-2">
        <Icon className="h-5 w-5 text-red-600 mr-2" />
        <h3 className="text-sm font-medium text-red-900">{title}</h3>
      </div>
    )}
    <div className="text-sm text-red-800">
      {children}
    </div>
  </div>
);

// Yellow Info Box - Warnings/Cautions
export const YellowInfoBox: React.FC<InfoBoxProps> = ({ 
  children, 
  title, 
  icon: Icon = ExclamationTriangleIcon,
  className = "" 
}) => (
  <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
    {title && (
      <div className="flex items-center mb-2">
        <Icon className="h-5 w-5 text-yellow-600 mr-2" />
        <h3 className="text-sm font-medium text-yellow-900">{title}</h3>
      </div>
    )}
    <div className="text-sm text-yellow-800">
      {children}
    </div>
  </div>
);

// Rosa/Pink Info Box - Special notices
export const RosaInfoBox: React.FC<InfoBoxProps> = ({ 
  children, 
  title, 
  icon: Icon = ClipboardDocumentListIcon,
  className = "" 
}) => (
  <div className={`bg-pink-50 border border-pink-200 rounded-lg p-4 ${className}`}>
    {title && (
      <div className="flex items-center mb-2">
        <Icon className="h-5 w-5 text-pink-600 mr-2" />
        <h3 className="text-sm font-medium text-pink-900">{title}</h3>
      </div>
    )}
    <div className="text-sm text-pink-800">
      {children}
    </div>
  </div>
);

// Helper component for creating structured info content
interface InfoListProps {
  items: Array<{
    label: string;
    value: string | React.ReactNode;
  }>;
}

export const InfoList: React.FC<InfoListProps> = ({ items }) => (
  <ul className="space-y-1">
    {items.map((item, index) => (
      <li key={index} className="flex items-start">
        <span className="font-medium mr-2">• {item.label}:</span>
        <span>{item.value}</span>
      </li>
    ))}
  </ul>
);

// Helper component for feature lists
interface FeatureListProps {
  features: string[];
  type?: 'check' | 'bullet' | 'arrow';
}

export const FeatureList: React.FC<FeatureListProps> = ({ features, type = 'bullet' }) => {
  const getIcon = () => {
    switch (type) {
      case 'check':
        return '✓';
      case 'arrow':
        return '→';
      default:
        return '•';
    }
  };

  return (
    <ul className="space-y-1">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          <span className="mr-2 text-green-600 font-medium">{getIcon()}</span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
};

export default {
  BlueInfoBox,
  GreenInfoBox,
  RedInfoBox,
  YellowInfoBox,
  RosaInfoBox,
  InfoList,
  FeatureList
};
