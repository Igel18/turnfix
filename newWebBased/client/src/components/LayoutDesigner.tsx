import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  TrashIcon, 
  DocumentTextIcon,
  PhotoIcon,
  MinusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

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

const FIELD_TYPES = [
  { value: 0, label: 'Database Field', icon: DocumentTextIcon, color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { value: 1, label: 'Text Field', icon: DocumentTextIcon, color: 'bg-green-100 border-green-300 text-green-800' },
  { value: 2, label: 'Image', icon: PhotoIcon, color: 'bg-purple-100 border-purple-300 text-purple-800' },
  { value: 3, label: 'Line', icon: MinusIcon, color: 'bg-gray-100 border-gray-300 text-gray-800' }
];

const ALIGN_OPTIONS = [
  { value: 0, label: 'Left' },
  { value: 1, label: 'Center' },
  { value: 2, label: 'Right' }
];

export function LayoutDesigner({ layout, onClose, onSave, onFieldsChange }: LayoutDesignerProps) {
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
  const [loadedImages, setLoadedImages] = useState<{ [key: string]: boolean }>({});

  // Initialize with fit-to-view zoom
  useEffect(() => {
    const containerWidth = 800;
    const containerHeight = 600;
    const scaleToFitWidth = containerWidth / canvasSize.width;
    const scaleToFitHeight = containerHeight / canvasSize.height;
    const fitZoom = Math.min(scaleToFitWidth, scaleToFitHeight) * 0.9;
    setZoom(Math.max(0.1, Math.min(2, fitZoom)));
  }, [canvasSize]);

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
      rel_w: 0.2,
      rel_h: 0.05,
      var_value: type === 1 ? 'Sample Text' : '',
      int_align: 0,
      int_layer: fields.length
    };

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
    await onFieldsChange(updatedFields);
  };

  // Update field properties
  const updateField = async (fieldId: number, updates: Partial<LayoutField>) => {
    const updatedFields = fields.map(field => 
      field.int_layout_felderid === fieldId ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
    
    if (selectedField?.int_layout_felderid === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
    
    await onFieldsChange(updatedFields);
  };

  // Check if an image can be loaded
  const checkImageLoad = useCallback((imagePath: string) => {
    if (!imagePath || loadedImages[imagePath] !== undefined) return;
    
    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => ({ ...prev, [imagePath]: true }));
    };
    img.onerror = () => {
      setLoadedImages(prev => ({ ...prev, [imagePath]: false }));
    };
    img.src = imagePath;
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
    setDragField(field);
    setSelectedField(field);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const fieldX = field.rel_x * canvasSize.width * zoom;
      const fieldY = field.rel_y * canvasSize.height * zoom;
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

  // Convert absolute coordinates to relative (0-1 range)
  // Legacy fields might have absolute coordinates, we need to convert them
  const normalizeFieldCoordinates = (field: LayoutField) => {
    const normalizedField = { ...field };
    
    // The coordinates appear to be in a different unit system
    // Based on the console output showing values like 95, 205.5, 20.75, these look like
    // they could be in millimeters or a coordinate system where:
    // - DIN A4 is roughly 210mm x 297mm
    // - The field with width 20.75 should be about 10% of page width
    
    // Let's assume the original coordinate system was:
    // - Width: 210 units (matching A4 width in mm)
    // - Height: 297 units (matching A4 height in mm)
    
    const originalWidth = 210;  // A4 width in mm or similar units
    const originalHeight = 297; // A4 height in mm or similar units
    
    // Always normalize these coordinates as they appear to be in the original unit system
    normalizedField.rel_x = Math.max(0, Math.min(1, field.rel_x / originalWidth));
    normalizedField.rel_y = Math.max(0, Math.min(1, field.rel_y / originalHeight));
    normalizedField.rel_w = Math.max(0.001, Math.min(1, field.rel_w / originalWidth));
    normalizedField.rel_h = Math.max(0.001, Math.min(1, field.rel_h / originalHeight));
    
    return normalizedField;
  };

  // Get field style for rendering
  const getFieldStyle = (field: LayoutField) => {
    const isSelected = selectedField?.int_layout_felderid === field.int_layout_felderid;
    
    // Normalize coordinates for display
    const normalizedField = normalizeFieldCoordinates(field);
    
    // Debug logging to see actual field values
    if (isSelected) {
      console.log('=== Field Debug Info ===');
      console.log('Original field data:', field);
      console.log('Detected coordinate system: 210x297 units (likely mm-based)');
      console.log('Normalized field data:', normalizedField);
      console.log('Calculated CSS position:', {
        left: `${normalizedField.rel_x * 100}%`,
        top: `${normalizedField.rel_y * 100}%`,
        width: `${normalizedField.rel_w * 100}%`,
        height: `${normalizedField.rel_h * 100}%`
      });
      console.log('Canvas size:', canvasSize);
      console.log('Zoom:', zoom);
      console.log('Expected size on canvas:', {
        width: Math.round(normalizedField.rel_w * canvasSize.width),
        height: Math.round(normalizedField.rel_h * canvasSize.height)
      });
      console.log('========================');
    }
    
    return {
      position: 'absolute' as const,
      left: `${normalizedField.rel_x * 100}%`,
      top: `${normalizedField.rel_y * 100}%`,
      width: `${normalizedField.rel_w * 100}%`,
      height: `${normalizedField.rel_h * 100}%`,
      border: isSelected 
        ? '2px solid #3B82F6' 
        : '1px dashed #9CA3AF',
      backgroundColor: isSelected 
        ? '#EBF8FF' 
        : field.int_typ === 0 ? '#F8FAFC' :  // Database field - blue
          field.int_typ === 1 ? '#F9FDF9' :  // Text field - green
          field.int_typ === 2 ? '#FDFAFF' :  // Image - purple
          '#FFFFFF',  // Default - white
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: field.int_align === 1 ? 'center' : field.int_align === 2 ? 'flex-end' : 'flex-start',
      padding: '2px 4px',
      fontSize: `${Math.max(8, Math.min(14, normalizedField.rel_h * canvasSize.height * zoom / 6))}px`,
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
        return (
          <div style={contentStyle}>
            <span className="text-blue-600 font-mono text-xs mr-1">🗃</span>
            <span className="truncate" title={`Database field: ${field.var_value || 'unknown'}`}>
              {getDatabaseFieldSample(field.var_value)}
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
        const isImageLoaded = imagePath && loadedImages[imagePath] === true;
        
        if (isImageLoaded) {
          return (
            <div style={{ ...contentStyle, padding: 0, overflow: 'hidden' }}>
              <img 
                src={imagePath} 
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
          return (
            <div style={contentStyle}>
              <span className="text-purple-600 mr-1">🖼</span>
              <span className="truncate">{imagePath || 'image.png'}</span>
              {imagePath && loadedImages[imagePath] === false && (
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
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Layout Designer: {layout.var_name}
              </h2>
              <p className="text-sm text-gray-600">{layout.txt_comment}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Paper Format:</label>
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
                <label className="text-sm text-gray-600">Zoom:</label>
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
                  <option value="fit">Fit to View</option>
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
                Properties
              </button>
              <button
                onClick={async () => await onSave({ ...layout, fields })}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                Save Layout
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Toolbar */}
            <div className="w-64 border-r border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Add Elements</h3>
              <div className="space-y-2">
                {FIELD_TYPES.map((fieldType) => {
                  const IconComponent = fieldType.icon;
                  return (
                    <button
                      key={fieldType.value}
                      onClick={() => addField(fieldType.value)}
                      className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {fieldType.label}
                    </button>
                  );
                })}
              </div>

              {/* Fields List */}
              <h3 className="text-sm font-medium text-gray-900 mt-6 mb-4">Fields ({fields.length})</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {fields
                  .sort((a, b) => a.int_layer - b.int_layer)
                  .map((field) => {
                    const fieldType = FIELD_TYPES.find(t => t.value === field.int_typ);
                    const IconComponent = fieldType?.icon || DocumentTextIcon;
                    
                    return (
                      <div
                        key={field.int_layout_felderid}
                        className={`flex items-center justify-between px-2 py-1 text-xs rounded ${
                          selectedField?.int_layout_felderid === field.int_layout_felderid
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div 
                          className="flex items-center flex-1 cursor-pointer"
                          onClick={() => setSelectedField(field)}
                        >
                          <IconComponent className="h-3 w-3 mr-1" />
                          <span className="truncate">
                            {fieldType?.label} {field.int_layer + 1}
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
                <div>Canvas: {PAPER_FORMATS[paperFormat].label} ({canvasSize.width} x {canvasSize.height}px) | Zoom: {Math.round(zoom * 100)}% | Fields: {fields.length}</div>
                {selectedField && (
                  <div className="text-blue-600">
                    Selected: {getFieldTypeLabel(selectedField.int_typ)} | 
                    Position: ({Math.round(normalizeFieldCoordinates(selectedField).rel_x * canvasSize.width)}, {Math.round(normalizeFieldCoordinates(selectedField).rel_y * canvasSize.height)})px | 
                    Size: {Math.round(normalizeFieldCoordinates(selectedField).rel_w * canvasSize.width)} x {Math.round(normalizeFieldCoordinates(selectedField).rel_h * canvasSize.height)}px | 
                    Layer: {selectedField.int_layer}
                  </div>
                )}
              </div>
            </div>

            {/* Properties Panel */}
            {isPropertiesOpen && selectedField && (
              <div className="w-80 border-l border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Field Properties</h3>
                
                <div className="space-y-4">
                  {/* Field Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
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
                      {selectedField.int_typ === 0 ? 'Database Field' : 
                       selectedField.int_typ === 1 ? 'Text Content' :
                       selectedField.int_typ === 2 ? 'Image Path' : 'Line Style'}
                    </label>
                    
                    {selectedField.int_typ === 2 ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={selectedField.var_value || ''}
                          onChange={(e) => updateField(selectedField.int_layout_felderid, { var_value: e.target.value })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="image.png or full path"
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // For local files, we'll use the file name
                                // In a real application, you might upload to a server
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const dataUrl = event.target?.result as string;
                                  updateField(selectedField.int_layout_felderid, { var_value: dataUrl });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-xs flex-1"
                            id="image-upload"
                          />
                        </div>
                        {selectedField.var_value && (
                          <div className="text-xs">
                            {loadedImages[selectedField.var_value] === true && (
                              <span className="text-green-600">✓ Image loaded successfully</span>
                            )}
                            {loadedImages[selectedField.var_value] === false && (
                              <span className="text-red-600">✗ Image not found or failed to load</span>
                            )}
                            {loadedImages[selectedField.var_value] === undefined && (
                              <span className="text-gray-500">Loading...</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={selectedField.var_value || ''}
                        onChange={(e) => updateField(selectedField.int_layout_felderid, { var_value: e.target.value })}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        placeholder={selectedField.int_typ === 0 ? 'participant_name' :
                                    selectedField.int_typ === 1 ? 'Enter text' : 'solid'}
                      />
                    )}
                    
                    {selectedField.int_typ === 0 && (
                      <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-xs text-blue-700 font-medium">Preview:</div>
                        <div className="text-xs text-blue-600 italic">
                          "{getDatabaseFieldSample(selectedField.var_value)}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Position */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Position</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          X ({Math.round(normalizeFieldCoordinates(selectedField).rel_x * canvasSize.width)}px)
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
                          Y ({Math.round(normalizeFieldCoordinates(selectedField).rel_y * canvasSize.height)}px)
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
                      <div className="font-medium mb-1">Coordinate System:</div>
                      <div>• X=0, Y=0 = Top-Left corner</div>
                      <div>• X=1, Y=0 = Top-Right corner</div>
                      <div>• X=0, Y=1 = Bottom-Left corner</div>
                      <div>• X=1, Y=1 = Bottom-Right corner</div>
                      <div className="mt-1 text-blue-600">Values range from 0.0 to 1.0 (relative to paper size)</div>
                    </div>
                  </div>

                  {/* Size */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Size</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Width ({Math.round(normalizeFieldCoordinates(selectedField).rel_w * canvasSize.width)}px)
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          max="1"
                          step="0.001"
                          value={Math.round(selectedField.rel_w * 1000) / 1000}
                          onChange={(e) => updateField(selectedField.int_layout_felderid, { rel_w: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Height ({Math.round(normalizeFieldCoordinates(selectedField).rel_h * canvasSize.height)}px)
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          max="1"
                          step="0.001"
                          value={Math.round(selectedField.rel_h * 1000) / 1000}
                          onChange={(e) => updateField(selectedField.int_layout_felderid, { rel_h: Number(e.target.value) })}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Text Alignment</label>
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">Layer (Z-Index)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={selectedField.int_layer}
                      onChange={(e) => updateField(selectedField.int_layout_felderid, { int_layer: Number(e.target.value) })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      <div>Lower numbers = Background (0, 1, 2)</div>
                      <div>Higher numbers = Foreground (8, 9, 10)</div>
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Font</label>
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
                      Delete Field
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
