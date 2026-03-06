import React, { useState, useEffect, useRef, useCallback } from 'react'
import { debugLog, isDebugEnabled } from '@/utils/debug'
import { DATABASE_FIELD_DESCRIPTIONS, getDatabaseFieldDescription } from '@/pages/CertificateLayouts'
import { resolveImageUrl, isLocalFilePath, isUploadingPath, extractFilename } from '@/utils/imageUrlUtils'
import { useTranslation } from 'react-i18next'
import { 
  TrashIcon, 
  DocumentTextIcon,
  PhotoIcon,
  MinusIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';
import ImagePicker from './ImagePicker';

interface LayoutField {
  int_layout_felderid: number;
  int_layoutid: number;
  int_typ: number;
  var_font: string | null;
  rel_x: number;
  rel_y: number;
  rel_w: number;
  rel_h: number;
  var_value: string | null;
  int_align: number;
  int_layer: number;
}

interface Layout {
  int_layoutid: number;
  var_name: string;
  txt_comment: string | null;
  fieldCount?: number;
  fields?: LayoutField[];
}

interface LayoutDesignerProps {
  layout: Layout;
  onClose: () => void;
  onSave: (layout: Layout) => Promise<void>;
  onFieldsChange: (fields: LayoutField[]) => Promise<void>;
}

export function LayoutDesigner({ layout, onClose, onSave, onFieldsChange }: LayoutDesignerProps) {
  const { t } = useTranslation()
  
  const FIELD_TYPES = [
    { value: 0, label: t('layoutDesigner.fieldTypes.databaseField'), icon: DocumentTextIcon, color: 'bg-blue-100 border-blue-300 text-blue-800' },
    { value: 1, label: t('layoutDesigner.fieldTypes.textField'), icon: DocumentTextIcon, color: 'bg-green-100 border-green-300 text-green-800' },
    { value: 2, label: t('layoutDesigner.fieldTypes.image'), icon: PhotoIcon, color: 'bg-purple-100 border-purple-300 text-purple-800' },
    { value: 3, label: t('layoutDesigner.fieldTypes.line'), icon: MinusIcon, color: 'bg-gray-100 border-gray-300 text-gray-800' }
  ];

  const ALIGN_OPTIONS = [
    { value: 0, label: t('layoutDesigner.alignment.left') },
    { value: 1, label: t('layoutDesigner.alignment.center') },
    { value: 2, label: t('layoutDesigner.alignment.right') }
  ];
  
  // Paper format definitions (all in pixels at 300 DPI)
  const PAPER_FORMATS = {
    'A4': { width: 2480, height: 3508, label: 'DIN A4 (210 × 297 mm)' },
    'A3': { width: 3508, height: 4961, label: 'DIN A3 (297 × 420 mm)' },
    'A5': { width: 1748, height: 2480, label: 'DIN A5 (148 × 210 mm)' },
    'Letter': { width: 2550, height: 3300, label: 'US Letter (8.5 × 11 in)' },
    'Legal': { width: 2550, height: 4200, label: 'US Legal (8.5 × 14 in)' },
    'Custom': { width: 800, height: 600, label: 'Custom Size' }
  };

  const [fields, setFields] = useState<LayoutField[]>(layout.fields || []);
  const [selectedField, setSelectedField] = useState<LayoutField | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [dragField, setDragField] = useState<LayoutField | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [paperFormat, setPaperFormat] = useState<keyof typeof PAPER_FORMATS>('A4');
  const [canvasSize, setCanvasSize] = useState(PAPER_FORMATS.A4);
  const [zoom, setZoom] = useState(0.3); // Smaller default zoom for larger paper formats
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: boolean | string }>({});
  const [aspectRatioLocked, setAspectRatioLocked] = useState<{ [fieldId: number]: boolean }>({});
  
  // Local state for layout metadata (name and description)
  const [layoutName, setLayoutName] = useState(layout.var_name);
  const [layoutComment, setLayoutComment] = useState(layout.txt_comment || '');

  // Convert absolute coordinates to relative (0-1 range)
  // Legacy fields might have absolute coordinates, we need to convert them
  const normalizeFieldCoordinates = (field: LayoutField) => {
    const normalizedField = { ...field };
    
    // More robust detection: check if ANY coordinate is > 1
    // Legacy coordinates often have values like 95, 205.5, 20.75 etc.
    const hasLegacyCoordinates = field.rel_x > 1 || field.rel_y > 1 || 
                                field.rel_w > 1 || field.rel_h > 1;
    
    if (!hasLegacyCoordinates) {
      // Coordinates are already in 0-1 range, no conversion needed
      // But ensure they're within valid bounds
      normalizedField.rel_x = Math.max(0, Math.min(1, field.rel_x));
      normalizedField.rel_y = Math.max(0, Math.min(1, field.rel_y));
      normalizedField.rel_w = Math.max(0.001, Math.min(1, field.rel_w));
      normalizedField.rel_h = Math.max(0.001, Math.min(1, field.rel_h));
      return normalizedField;
    }
    
    // Legacy conversion for old coordinate system
    // Based on the console output showing values like 95, 205.5, 20.75, these look like
    // they could be in millimeters or a coordinate system where:
    // - DIN A4 is roughly 210mm x 297mm
    // - The field with width 20.75 should be about 10% of page width
    
    const originalWidth = 210;  // A4 width in mm or similar units
    const originalHeight = 297; // A4 height in mm or similar units
    
    // Normalize coordinates from original unit system to 0-1 range
    normalizedField.rel_x = Math.max(0, Math.min(1, field.rel_x / originalWidth));
    normalizedField.rel_y = Math.max(0, Math.min(1, field.rel_y / originalHeight));
    normalizedField.rel_w = Math.max(0.001, Math.min(1, field.rel_w / originalWidth));
    normalizedField.rel_h = Math.max(0.001, Math.min(1, field.rel_h / originalHeight));
    
    return normalizedField;
  };

  // Normalize fields on component mount and when layout changes
  useEffect(() => {
    const normalizedFields = (layout.fields || []).map(field => normalizeFieldCoordinates(field));
    
    // Only update if fields have actually changed (to avoid infinite loops)
    const fieldsChanged = normalizedFields.some((normalized, index) => {
      const current = fields[index];
      if (!current) return true;
      return normalized.rel_x !== current.rel_x || 
             normalized.rel_y !== current.rel_y ||
             normalized.rel_w !== current.rel_w ||
             normalized.rel_h !== current.rel_h;
    }) || normalizedFields.length !== fields.length;
    
    if (fieldsChanged) {
      setFields(normalizedFields);
    }
  }, [layout.fields]);

  // Initialize with fit-to-view zoom
  useEffect(() => {
    const containerWidth = 800;
    const containerHeight = 600;
    const scaleToFitWidth = containerWidth / canvasSize.width;
    const scaleToFitHeight = containerHeight / canvasSize.height;
    const fitZoom = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.9;
    setZoom(Math.max(0.1, Math.min(2, fitZoom)));
  }, [canvasSize]);

  // Keyboard shortcut: Ctrl+S to save and close
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's default save dialog
        
        // Save the layout
        await onSave({ 
          ...layout, 
          fields,
          var_name: layoutName,
          txt_comment: layoutComment || null
        });
        
        // Close the designer
        onClose();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [layout, fields, layoutName, layoutComment, onSave, onClose]);

  // Handle paper format change
  const handlePaperFormatChange = (format: keyof typeof PAPER_FORMATS) => {
    setPaperFormat(format);
    setCanvasSize(PAPER_FORMATS[format]);
    
    // Calculate zoom so 100% fits the entire paper in the available space
    // Assuming the canvas container is about 800px wide and 600px tall
    const containerWidth = 800;
    const containerHeight = 600;
    
    const scaleToFitWidth = containerWidth / PAPER_FORMATS[format].width;
    const scaleToFitHeight = containerHeight / PAPER_FORMATS[format].height;
    const scaleToFit = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.9; // 90% to leave some margin
    
    // Set a reasonable default zoom (not necessarily 100%)
    setZoom(Math.max(0.1, Math.min(1, scaleToFit)));
  };

  // Generate temporary ID for new fields
  const getNextTempId = () => {
    const maxId = Math.max(0, ...fields.map(f => f.int_layout_felderid));
    return maxId >= 0 ? -(maxId + 1) : -1;
  };

  // Add new field
  const addField = async (type: number) => {
    const newField: LayoutField = {
      int_layout_felderid: getNextTempId(),
      int_layoutid: layout.int_layoutid,
      int_typ: type,
      var_font: 'Arial,12,-1,5,50,0,0,0,0,0',
      rel_x: 0.1,
      rel_y: 0.1,
      rel_w: type === 2 ? 0.3 : 0.2, // Larger default width for images
      rel_h: type === 2 ? 0.2 : 0.05, // Better aspect ratio for images (1.5:1)
      var_value: type === 1 ? 'Sample Text' : '',
      int_align: 0,
      int_layer: fields.length
    };

    // Set aspect ratio lock for new image fields by default
    if (type === 2) {
      setAspectRatioLocked(prev => ({
        ...prev,
        [newField.int_layout_felderid]: true
      }));
    }

    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    setSelectedField(newField);
    await onFieldsChange(updatedFields);
  };

  // Delete field
  const deleteField = async (fieldId: number) => {
    const updatedFields = fields.filter(f => f.int_layout_felderid !== fieldId);
    setFields(updatedFields);
    if (selectedField?.int_layout_felderid === fieldId) {
      setSelectedField(null);
    }
    
    // Clean up aspect ratio lock state
    setAspectRatioLocked(prev => {
      const updated = { ...prev };
      delete updated[fieldId];
      return updated;
    });
    
    await onFieldsChange(updatedFields);
  };

  // Update field properties
  const updateField = async (fieldId: number, updates: Partial<LayoutField>) => {
    // Ensure coordinates stay within valid bounds
    const validatedUpdates = { ...updates };
    
    if ('rel_x' in validatedUpdates) {
      validatedUpdates.rel_x = Math.max(0, Math.min(1, validatedUpdates.rel_x!));
    }
    if ('rel_y' in validatedUpdates) {
      validatedUpdates.rel_y = Math.max(0, Math.min(1, validatedUpdates.rel_y!));
    }
    if ('rel_w' in validatedUpdates) {
      validatedUpdates.rel_w = Math.max(0.001, Math.min(1, validatedUpdates.rel_w!));
    }
    if ('rel_h' in validatedUpdates) {
      validatedUpdates.rel_h = Math.max(0.001, Math.min(1, validatedUpdates.rel_h!));
    }
    
    const updatedFields = fields.map(field => 
      field.int_layout_felderid === fieldId ? { ...field, ...validatedUpdates } : field
    );
    setFields(updatedFields);
    
    if (selectedField?.int_layout_felderid === fieldId) {
      setSelectedField({ ...selectedField, ...validatedUpdates });
    }
    
    await onFieldsChange(updatedFields);
  };

  // Toggle aspect ratio lock for any field type
  const toggleAspectRatioLock = (fieldId: number) => {
    setAspectRatioLocked(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  // Update field size while maintaining aspect ratio if locked
  const updateFieldSize = async (fieldId: number, dimension: 'width' | 'height', value: number) => {
    const field = fields.find(f => f.int_layout_felderid === fieldId);
    if (!field) return;

    const isLocked = aspectRatioLocked[fieldId];
    if (!isLocked) {
      await updateField(fieldId, dimension === 'width' ? { rel_w: value } : { rel_h: value });
      return;
    }

    // Ensure minimum values and limit to paper size
    const minValue = 0.001;
    const maxValue = 1.0; // Limit to paper/canvas size (100% of canvas)
    const clampedValue = Math.max(minValue, Math.min(maxValue, value));
    
    // Calculate current aspect ratio (width/height)
    const currentAspectRatio = field.rel_w / field.rel_h;
    
    if (dimension === 'width') {
      // Width is driving - calculate new height to maintain aspect ratio
      const newHeight = clampedValue / currentAspectRatio;
      const finalHeight = Math.max(minValue, Math.min(maxValue, newHeight));
      await updateField(fieldId, { rel_w: clampedValue, rel_h: finalHeight });
    } else {
      // Height is driving - calculate new width to maintain aspect ratio  
      const newWidth = clampedValue * currentAspectRatio;
      const finalWidth = Math.max(minValue, Math.min(maxValue, newWidth));
      await updateField(fieldId, { rel_h: clampedValue, rel_w: finalWidth });
    }
  };

  // Check if an image can be loaded
  const checkImageLoad = useCallback((imagePath: string) => {
    if (!imagePath || loadedImages[imagePath] !== undefined) return;
    
    if (isLocalFilePath(imagePath)) {
      setLoadedImages(prev => ({ ...prev, [imagePath]: 'local' as any }));
      return;
    }
    
    if (isUploadingPath(imagePath)) {
      setLoadedImages(prev => ({ ...prev, [imagePath]: 'uploading' as any }));
      return;
    }
    
    // Resolve bare filenames to full URL
    const resolvedUrl = resolveImageUrl(imagePath);
    
    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => ({ ...prev, [imagePath]: true }));
    };
    img.onerror = () => {
      setLoadedImages(prev => ({ ...prev, [imagePath]: false }));
    };
    img.src = resolvedUrl;
  }, [loadedImages]);

  // Check images when fields change
  useEffect(() => {
    fields.forEach(field => {
      if (field.int_typ === 2 && field.var_value) {
        checkImageLoad(field.var_value);
      }
    });
  }, [fields, checkImageLoad]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, field: LayoutField) => {
    e.preventDefault();
    // Normalize field coordinates for consistent handling
    const normalizedField = normalizeFieldCoordinates(field);
    setDragField(normalizedField);
    setSelectedField(normalizedField);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const fieldX = normalizedField.rel_x * canvasSize.width * zoom;
      const fieldY = normalizedField.rel_y * canvasSize.height * zoom;
      setDragOffset({
        x: e.clientX - rect.left - fieldX,
        y: e.clientY - rect.top - fieldY
      });
    }
  };

  // Handle drag
  const handleDrag = useCallback((e: MouseEvent) => {
    if (!dragField || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const newX = Math.max(0, Math.min(1, (e.clientX - rect.left - dragOffset.x) / (canvasSize.width * zoom)));
    const newY = Math.max(0, Math.min(1, (e.clientY - rect.top - dragOffset.y) / (canvasSize.height * zoom)));

    updateField(dragField.int_layout_felderid, {
      rel_x: newX,
      rel_y: newY
    });
  }, [dragField, dragOffset, canvasSize, zoom]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragField(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Add event listeners for drag
  useEffect(() => {
    if (dragField) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragField, handleDrag, handleDragEnd]);

  // Get field type label
  const getFieldTypeLabel = (type: number) => {
    const fieldType = FIELD_TYPES.find(t => t.value === type);
    return fieldType?.label || 'Unknown';
  };

  // Get field style for rendering
  const getFieldStyle = (field: LayoutField) => {
    const isSelected = selectedField?.int_layout_felderid === field.int_layout_felderid;
    
    // Fields are already normalized, use them directly
    
    // Debug logging to see actual field values (only when debug is enabled)
    if (isSelected && isDebugEnabled()) {
      debugLog('=== Field Debug Info ===');
      debugLog('Field data (should be normalized):', field);
      debugLog('Calculated CSS position:', {
        left: `${field.rel_x * 100}%`,
        top: `${field.rel_y * 100}%`,
        width: `${field.rel_w * 100}%`,
        height: `${field.rel_h * 100}%`
      });
      debugLog('Canvas size:', canvasSize);
      console.log('Zoom:', zoom);
      console.log('Expected size on canvas:', {
        width: Math.round(field.rel_w * canvasSize.width),
        height: Math.round(field.rel_h * canvasSize.height)
      });
      console.log('========================');
    }
    
    return {
      position: 'absolute' as const,
      left: `${field.rel_x * 100}%`,
      top: `${field.rel_y * 100}%`,
      width: `${field.rel_w * 100}%`,
      height: `${field.rel_h * 100}%`,
      border: isSelected 
        ? '2px solid #3B82F6' 
        : field.int_typ === 0 
          ? '2px solid #60A5FA'  // Database field - blue border
          : field.int_typ === 1 
            ? '2px solid #4ADE80'  // Text field - green border
            : field.int_typ === 2 
              ? '2px solid #C084FC'  // Image - purple border
              : '1px dashed #9CA3AF',  // Default - gray dashed
      backgroundColor: isSelected 
        ? '#EBF8FF' 
        : field.int_typ === 0 ? '#EFF6FF' :  // Database field - light blue
          field.int_typ === 1 ? '#F0FDF4' :  // Text field - light green
          field.int_typ === 2 ? '#FAF5FF' :  // Image - light purple
          '#FFFFFF',  // Default - white
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: field.int_align === 1 ? 'center' : field.int_align === 2 ? 'flex-end' : 'flex-start',
      padding: '2px 4px',
      fontSize: `${Math.max(8, Math.min(14, field.rel_h * canvasSize.height * zoom / 6))}px`,
      overflow: 'hidden',
      userSelect: 'none' as const,
      zIndex: field.int_layer + 1,
      minWidth: '20px',
      minHeight: '12px',
      boxShadow: isSelected ? '0 2px 8px rgba(59, 130, 246, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      borderRadius: '2px',
      transition: 'all 0.15s ease'
    };
  };

  // Enhanced sample data for database fields based on TurnFix mapping
  const getDatabaseFieldSample = (fieldValue: string | null) => {
    if (!fieldValue) return 'Max Mustermann';
    
    const value = fieldValue.toLowerCase();
    
    // First check if it's a descriptive field name (for manually entered field names)
    if (value.includes('name') || value.includes('nachname') || value.includes('surname')) {
      return 'Mustermann';
    }
    if (value.includes('vorname') || value.includes('firstname') || value.includes('given')) {
      return 'Max';
    }
    if (value.includes('verein') || value.includes('club') || value.includes('team')) {
      return 'TV Musterstadt 1895';
    }
    if (value.includes('platz') || value.includes('rang') || value.includes('place') || value.includes('rank')) {
      return '1. Platz';
    }
    if (value.includes('punkte') || value.includes('point') || value.includes('score') || value.includes('wertung')) {
      return '15,250';
    }
    if (value.includes('datum') || value.includes('date')) {
      return '15.03.2025';
    }
    if (value.includes('ort') || value.includes('location') || value.includes('venue')) {
      return 'Musterstadt';
    }
    if (value.includes('wettkampf') || value.includes('competition') || value.includes('event')) {
      return 'Bezirksmeisterschaft';
    }
    
    // TurnFix database field mapping based on the C++ code analysis
    // These correspond to the switch cases in printCustomPage function
    if (/^\d+$/.test(fieldValue)) {
      const fieldNum = parseInt(fieldValue);
      switch (fieldNum) {
        case 0: return 'Bezirksmeisterschaft 2025'; // Event name
        case 1: return '15.03.2025 - 16.03.2025'; // Event dates  
        case 2: return 'Sporthalle Musterstadt, Musterstraße 1'; // Location
        case 3: return 'Max Mustermann'; // Participant name 1
        case 4: return 'TV Musterstadt 1895'; // Club name
        case 5: return '1.'; // Place/Rank
        case 6: return '15,250'; // Score/Points
        case 7: return 'Kür AK 12 männlich'; // Competition name
        case 8: return 'Kür AK 12 männlich (Einzel)'; // Competition + designation
        case 9: return 'Turngau Musterstadt'; // Gau (District)
        case 10: return 'Württembergischer Turnerbund'; // Verband (Association)
        case 11: return 'Baden-Württemberg'; // Land (State)
        case 12: return 'Siegerurkunde'; // Type string
        case 13: return '15,250'; // Score (alternative)
        case 14: return 'Max Mustermann, Anna Schmidt, Tom Weber'; // Team members
        case 15: return 'WK-01'; // Competition number
        default: return `Feld ${fieldNum}`; // Unknown field number
      }
    }
    
    // Default: show the field name as is if it's descriptive
    return fieldValue || 'Beispieltext';
  };

  // Get field display content
  const getFieldContent = (field: LayoutField) => {
    const isSelected = selectedField?.int_layout_felderid === field.int_layout_felderid;
    
    const contentStyle = {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      fontSize: 'inherit',
      fontWeight: isSelected ? '600' : '400',
      color: isSelected ? '#1E40AF' : '#374151'
    };

    switch (field.int_typ) {
      case 0: // Database field
        const fieldNum = field.var_value ? parseInt(field.var_value) : null;
        const fieldDescription = fieldNum !== null ? getDatabaseFieldDescription(fieldNum) : 'Select DB Field';
        return (
          <div style={contentStyle}>
            <span className="text-blue-600 font-mono text-xs mr-1">🗃</span>
            <span className="truncate" title={`${fieldDescription}: ${getDatabaseFieldSample(field.var_value)}`}>
              {fieldDescription}
            </span>
          </div>
        );
      case 1: // Text field
        return (
          <div style={contentStyle}>
            <span className="text-green-600 mr-1">📝</span>
            <span className="truncate">{field.var_value || 'Static Text'}</span>
          </div>
        );
      case 2: // Image
        const imagePath = field.var_value;
        const isLocalPath = imagePath && isLocalFilePath(imagePath);
        const isUploading = imagePath && isUploadingPath(imagePath);
        const isImageLoaded = imagePath && loadedImages[imagePath] === true;
        
        if (isImageLoaded && !isLocalPath && !isUploading) {
          return (
            <div style={{ ...contentStyle, padding: 0, overflow: 'hidden' }}>
              <img 
                src={resolveImageUrl(imagePath)} 
                alt="Layout Image"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onError={(e) => {
                  // Fallback to text display if image fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          );
        } else {
          // Show path info for local files, uploading state, or when image can't be loaded
          let displayText = '';
          let statusIndicator = '';
          
          if (isUploading) {
            displayText = 'Uploading...';
            statusIndicator = '🔄';
          } else if (isLocalPath) {
            displayText = extractFilename(imagePath);
            statusIndicator = '📁';
          } else if (imagePath) {
            displayText = extractFilename(imagePath);
            statusIndicator = '🖼';
          } else {
            displayText = 'image.png';
            statusIndicator = '🖼';
          }
          
          return (
            <div style={contentStyle}>
              <span className="text-purple-600 mr-1">{statusIndicator}</span>
              <span className="truncate" title={imagePath || ''}>
                {displayText}
              </span>
              {isLocalPath && (
                <span className="text-blue-500 text-xs ml-1">(local)</span>
              )}
              {imagePath && loadedImages[imagePath] === false && !isLocalPath && !isUploading && (
                <span className="text-red-500 text-xs ml-1">(not found)</span>
              )}
            </div>
          );
        }
      case 3: // Line
        return (
          <div style={contentStyle}>
            <div className="w-full border-t-2 border-gray-400" style={{ borderStyle: field.var_value || 'solid' }}></div>
          </div>
        );
      default:
        return (
          <div style={contentStyle}>
            <span className="text-gray-500 mr-1">❓</span>
            <span className="truncate">Unknown Type</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative min-h-screen mx-auto p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('layoutDesigner.layoutName')}
                  </label>
                  <input
                    type="text"
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('layoutDesigner.enterLayoutName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('layoutDesigner.description')}
                  </label>
                  <input
                    type="text"
                    value={layoutComment}
                    onChange={(e) => setLayoutComment(e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('layoutDesigner.enterDescription')}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">{t('layoutDesigner.paperFormat')}:</label>
                <select
                  value={paperFormat}
                  onChange={(e) => handlePaperFormatChange(e.target.value as keyof typeof PAPER_FORMATS)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {Object.entries(PAPER_FORMATS).map(([key, format]) => (
                    <option key={key} value={key}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">{t('layoutDesigner.zoom')}:</label>
                <select
                  value={zoom}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'fit') {
                      // Calculate fit-to-view zoom
                      const containerWidth = 800;
                      const containerHeight = 600;
                      const scaleToFitWidth = containerWidth / canvasSize.width;
                      const scaleToFitHeight = containerHeight / canvasSize.height;
                      const fitZoom = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.9;
                      setZoom(Math.max(0.1, Math.min(2, fitZoom)));
                    } else {
                      setZoom(Number(value));
                    }
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="fit">{t('layoutDesigner.fitToView')}</option>
                  <option value={0.1}>10%</option>
                  <option value={0.2}>20%</option>
                  <option value={0.3}>30%</option>
                  <option value={0.5}>50%</option>
                  <option value={0.75}>75%</option>
                  <option value={1}>100%</option>
                  <option value={1.25}>125%</option>
                  <option value={1.5}>150%</option>
                  <option value={2}>200%</option>
                </select>
              </div>
              <button
                onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  isPropertiesOpen
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Cog6ToothIcon className="h-4 w-4 mr-1 inline" />
                {t('layoutDesigner.properties')}
              </button>
              <button
                onClick={async () => await onSave({ 
                  ...layout, 
                  fields,
                  var_name: layoutName,
                  txt_comment: layoutComment || null
                })}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 flex items-center"
                title={t('layoutDesigner.saveShortcut', { defaultValue: 'Save and close (Ctrl+S)' })}
              >
                {t('layoutDesigner.saveLayout')}
                <span className="ml-2 text-xs opacity-75">Ctrl+S</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
              >
                {t('layoutDesigner.close')}
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Toolbar */}
            <div className="w-64 border-r border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">{t('layoutDesigner.addElements')}</h3>
              <div className="space-y-2">
                {FIELD_TYPES.map((fieldType) => {
                  const IconComponent = fieldType.icon;
                  // Determine color based on field type
                  const colorClasses = fieldType.value === 0 
                    ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-900 border-l-4 border-l-blue-500'
                    : fieldType.value === 1 
                      ? 'bg-green-50 border-green-300 hover:bg-green-100 text-green-900 border-l-4 border-l-green-500'
                      : fieldType.value === 2 
                        ? 'bg-purple-50 border-purple-300 hover:bg-purple-100 text-purple-900 border-l-4 border-l-purple-500'
                        : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700';
                  
                  const iconColorClass = fieldType.value === 0 
                    ? 'text-blue-600'
                    : fieldType.value === 1 
                      ? 'text-green-600'
                      : fieldType.value === 2 
                        ? 'text-purple-600'
                        : 'text-gray-600';
                  
                  return (
                    <button
                      key={fieldType.value}
                      onClick={() => addField(fieldType.value)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium border rounded-md ${colorClasses}`}
                    >
                      <IconComponent className={`h-4 w-4 mr-2 ${iconColorClass}`} />
                      {fieldType.label}
                    </button>
                  );
                })}
              </div>

              {/* Fields List */}
              <h3 className="text-sm font-medium text-gray-900 mt-6 mb-4">{t('layoutDesigner.fields')} ({fields.length})</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {fields
                  .sort((a, b) => a.int_layer - b.int_layer)
                  .map((field) => {
                    const fieldType = FIELD_TYPES.find(t => t.value === field.int_typ);
                    const IconComponent = fieldType?.icon || DocumentTextIcon;
                    
                    // Get descriptive label for the field
                    let fieldLabel = fieldType?.label || t('layoutDesigner.unknown');
                    if (field.int_typ === 0 && field.var_value) {
                      // Database field - show description
                      const fieldNum = parseInt(field.var_value);
                      fieldLabel = getDatabaseFieldDescription(fieldNum);
                    } else if (field.int_typ === 1 && field.var_value) {
                      // Text field - show truncated content
                      fieldLabel = field.var_value.substring(0, 30) + (field.var_value.length > 30 ? '...' : '');
                    }
                    
                    return (
                      <div
                        key={field.int_layout_felderid}
                        className={`flex items-center justify-between px-2 py-1 text-xs rounded border-l-2 ${
                          selectedField?.int_layout_felderid === field.int_layout_felderid
                            ? 'bg-blue-100 text-blue-800'
                            : field.int_typ === 0 
                              ? 'bg-blue-50 text-blue-900 hover:bg-blue-100 border-blue-400'
                              : field.int_typ === 1
                                ? 'bg-green-50 text-green-900 hover:bg-green-100 border-green-400'
                                : field.int_typ === 2
                                  ? 'bg-purple-50 text-purple-900 hover:bg-purple-100 border-purple-400'
                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-400'
                        }`}
                      >
                        <div 
                          className="flex items-center flex-1 cursor-pointer"
                          onClick={() => setSelectedField(field)}
                        >
                          <IconComponent className={`h-3 w-3 mr-1 ${
                            field.int_typ === 0 ? 'text-blue-600' : 
                            field.int_typ === 1 ? 'text-green-600' :
                            field.int_typ === 2 ? 'text-purple-600' : 'text-gray-600'
                          }`} />
                          <span className="truncate">
                            {fieldLabel}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteField(field.int_layout_felderid)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-4">
              <div className="border border-gray-300 bg-white relative overflow-hidden" style={{ height: '600px' }}>
                <div 
                  ref={canvasRef}
                  className="relative bg-white"
                  style={{ 
                    width: `${canvasSize.width * zoom}px`, 
                    height: `${canvasSize.height * zoom}px`,
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                  }}
                >
                  {/* Grid */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, #000 1px, transparent 1px),
                        linear-gradient(to bottom, #000 1px, transparent 1px)
                      `,
                      backgroundSize: `${20 * zoom}px ${20 * zoom}px`
                    }}
                  />

                  {/* Fields */}
                  {fields.map((field) => (
                    <div
                      key={field.int_layout_felderid}
                      style={getFieldStyle(field)}
                      onMouseDown={(e) => handleDragStart(e, field)}
                      onClick={() => setSelectedField(field)}
                    >
                      {getFieldContent(field)}
                      
                      {/* Resize handles for selected field */}
                      {selectedField?.int_layout_felderid === field.int_layout_felderid && (
                        <>
                          {/* Corner handles */}
                          <div 
                            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-600 border border-white cursor-nw-resize rounded-full shadow-md"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // TODO: Implement resize functionality
                            }}
                            title="Resize from top-left"
                          />
                          <div 
                            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 border border-white cursor-ne-resize rounded-full shadow-md"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // TODO: Implement resize functionality
                            }}
                            title="Resize from top-right"
                          />
                          <div 
                            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-600 border border-white cursor-sw-resize rounded-full shadow-md"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // TODO: Implement resize functionality
                            }}
                            title="Resize from bottom-left"
                          />
                          <div 
                            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 border border-white cursor-se-resize rounded-full shadow-md"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // TODO: Implement resize functionality
                            }}
                            title="Resize from bottom-right"
                          />
                          
                          {/* Side handles */}
                          <div 
                            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-600 border border-white cursor-n-resize rounded-full shadow-md"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // TODO: Implement resize functionality
                            }}
                            title="Resize from top"
                          />
                          <div 
                            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-600 border border-white cursor-s-resize rounded-full shadow-md"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // TODO: Implement resize functionality
                            }}
                            title="Resize from bottom"
                          />
                          <div 
                            className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-3 h-3 bg-blue-600 border border-white cursor-w-resize rounded-full shadow-md"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // TODO: Implement resize functionality
                            }}
                            title="Resize from left"
                          />
                          <div 
                            className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-3 h-3 bg-blue-600 border border-white cursor-e-resize rounded-full shadow-md"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // TODO: Implement resize functionality
                            }}
                            title="Resize from right"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Canvas Info */}
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>{t('layoutDesigner.canvas')}: {PAPER_FORMATS[paperFormat].label} ({canvasSize.width} × {canvasSize.height}px) | {t('layoutDesigner.zoom')}: {Math.round(zoom * 100)}% | {t('layoutDesigner.fields')}: {fields.length}</div>
                {selectedField && (
                  <div className="text-blue-600">
                    {t('layoutDesigner.selected')}: {getFieldTypeLabel(selectedField.int_typ)} | 
                    {t('layoutDesigner.position')}: ({Math.round(selectedField.rel_x * canvasSize.width)}, {Math.round(selectedField.rel_y * canvasSize.height)})px | 
                    {t('layoutDesigner.size')}: {Math.round(selectedField.rel_w * canvasSize.width)} × {Math.round(selectedField.rel_h * canvasSize.height)}px | 
                    {t('layoutDesigner.layer')}: {selectedField.int_layer}
                  </div>
                )}
              </div>
            </div>

            {/* Properties Panel */}
            {isPropertiesOpen && selectedField && (
              <div className="w-80 border-l border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">{t('layoutDesigner.fieldProperties')}</h3>
                
                <div className="space-y-4">
                  {/* Field Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('layoutDesigner.type')}</label>
                    <select
                      value={selectedField.int_typ}
                      onChange={(e) => updateField(selectedField.int_layout_felderid, { int_typ: Number(e.target.value) })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      {FIELD_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Value */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {selectedField.int_typ === 0 ? t('layoutDesigner.databaseField') : 
                       selectedField.int_typ === 1 ? t('layoutDesigner.textContent') :
                       selectedField.int_typ === 2 ? t('layoutDesigner.imagePath') : t('layoutDesigner.lineStyle')}
                    </label>
                    
                    {selectedField.int_typ === 2 ? (
                      <div className="space-y-2">
                        <ImagePicker
                          value={selectedField.var_value || ''}
                          onChange={async (val) => {
                            await updateField(selectedField.int_layout_felderid, { var_value: val });
                            if (val) {
                              // Force re-check of image loading
                              setLoadedImages(prev => {
                                const updated = { ...prev };
                                delete updated[val];
                                return updated;
                              });
                              setTimeout(() => { checkImageLoad(val); }, 100);
                            }
                          }}
                          category="images"
                          allowUpload
                          allowClear
                          placeholder={t('layoutDesigner.imagePathPlaceholder')}
                          columns={3}
                          thumbnailSize="w-12 h-12"
                        />
                        {selectedField.var_value && (
                          <div className="text-xs">
                            {loadedImages[selectedField.var_value] === true && (
                              <span className="text-green-600">✓ Image loaded successfully</span>
                            )}
                            {loadedImages[selectedField.var_value] === false && (
                              <span className="text-red-600">✗ Image not found or failed to load</span>
                            )}
                            {loadedImages[selectedField.var_value] === 'local' && (
                              <span className="text-blue-600">📁 Local file path</span>
                            )}
                            {loadedImages[selectedField.var_value] === 'uploading' && (
                              <span className="text-orange-600">🔄 Uploading image...</span>
                            )}
                            {selectedField.var_value.startsWith('/uploads/') && loadedImages[selectedField.var_value] === undefined && (
                              <span className="text-gray-500">Loading...</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : selectedField.int_typ === 0 ? (
                      // Database field dropdown with descriptive names
                      <select
                        value={selectedField.var_value || ''}
                        onChange={(e) => updateField(selectedField.int_layout_felderid, { var_value: e.target.value })}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">{t('layoutDesigner.selectDatabaseField')}</option>
                        {Object.entries(DATABASE_FIELD_DESCRIPTIONS).map(([key, description]) => (
                          <option key={key} value={key}>
                            {key}: {description}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedField.var_value || ''}
                        onChange={(e) => updateField(selectedField.int_layout_felderid, { var_value: e.target.value })}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        placeholder={selectedField.int_typ === 1 ? t('layoutDesigner.enterText') : 'solid'}
                      />
                    )}
                    
                    {selectedField.int_typ === 0 && selectedField.var_value && (
                      <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-xs text-blue-700 font-medium mb-1">
                          {getDatabaseFieldDescription(parseInt(selectedField.var_value))}
                        </div>
                        <div className="text-xs text-gray-600">{t('layoutDesigner.preview')}:</div>
                        <div className="text-xs text-blue-600 italic">
                          "{getDatabaseFieldSample(selectedField.var_value)}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Position */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">{t('layoutDesigner.position')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {t('layoutDesigner.xPosition')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.001"
                          value={Math.round(selectedField.rel_x * 1000) / 1000}
                          onChange={(e) => updateField(selectedField.int_layout_felderid, { rel_x: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          {t('layoutDesigner.yPosition')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.001"
                          value={Math.round(selectedField.rel_y * 1000) / 1000}
                          onChange={(e) => updateField(selectedField.int_layout_felderid, { rel_y: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                      <div className="font-medium mb-1">{t('layoutDesigner.coordinateSystem')}:</div>
                      <div>• X=0, Y=0 = {t('layoutDesigner.topLeft')}</div>
                      <div>• X=1, Y=0 = {t('layoutDesigner.topRight')}</div>
                      <div>• X=0, Y=1 = {t('layoutDesigner.bottomLeft')}</div>
                      <div>• X=1, Y=1 = {t('layoutDesigner.bottomRight')}</div>
                      <div className="mt-1 text-blue-600">{t('layoutDesigner.valuesRange')}</div>
                    </div>
                  </div>

                  {/* Size */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">{t('layoutDesigner.size')}</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          {t('layoutDesigner.width')}
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          max="1"
                          step="0.001"
                          value={Math.round(selectedField.rel_w * 1000) / 1000}
                          onChange={(e) => updateFieldSize(selectedField.int_layout_felderid, 'width', Number(e.target.value))}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                      
                      {/* Aspect ratio lock button for all field types */}
                      <div className="flex flex-col items-center pt-5">
                        <button
                          onClick={() => toggleAspectRatioLock(selectedField.int_layout_felderid)}
                          className={`p-1 rounded ${
                            aspectRatioLocked[selectedField.int_layout_felderid] 
                              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                              : 'bg-gray-100 text-gray-600 border border-gray-300'
                          } hover:opacity-80 transition-opacity`}
                          title={aspectRatioLocked[selectedField.int_layout_felderid] ? t('layoutDesigner.unlockAspectRatio') : t('layoutDesigner.lockAspectRatio')}
                        >
                          {aspectRatioLocked[selectedField.int_layout_felderid] ? (
                            <LockClosedIcon className="h-4 w-4" />
                          ) : (
                            <LockOpenIcon className="h-4 w-4" />
                          )}
                        </button>
                        {aspectRatioLocked[selectedField.int_layout_felderid] && (
                          <div className="text-xs text-blue-600 mt-1 text-center">
                            {Math.round((selectedField.rel_w / selectedField.rel_h) * 100) / 100}:1
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          {t('layoutDesigner.height')}
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          max="1"
                          step="0.001"
                          value={Math.round(selectedField.rel_h * 1000) / 1000}
                          onChange={(e) => updateFieldSize(selectedField.int_layout_felderid, 'height', Number(e.target.value))}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('layoutDesigner.textAlignment')}</label>
                    <select
                      value={selectedField.int_align}
                      onChange={(e) => updateField(selectedField.int_layout_felderid, { int_align: Number(e.target.value) })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      {ALIGN_OPTIONS.map(align => (
                        <option key={align.value} value={align.value}>{align.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Layer */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('layoutDesigner.layer')}</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={selectedField.int_layer}
                      onChange={(e) => updateField(selectedField.int_layout_felderid, { int_layer: Number(e.target.value) })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      <div>{t('layoutDesigner.layerBackground')}</div>
                      <div>{t('layoutDesigner.layerForeground')}</div>
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('layoutDesigner.font')}</label>
                    <input
                      type="text"
                      value={selectedField.var_font || ''}
                      onChange={(e) => updateField(selectedField.int_layout_felderid, { var_font: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                      placeholder="Arial,12,-1,5,50,0,0,0,0,0"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => deleteField(selectedField.int_layout_felderid)}
                      className="w-full px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700"
                    >
                      <TrashIcon className="h-3 w-3 mr-1 inline" />
                      {t('layoutDesigner.deleteField')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayoutDesigner;
