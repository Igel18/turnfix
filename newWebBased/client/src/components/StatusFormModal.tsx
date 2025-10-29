import React, { useState, useEffect } from 'react';
import UnifiedModal from './UnifiedModal';

interface Status {
  int_statusid: number;
  var_name: string;
  ary_colorcode: string;
  bol_bogen: boolean;
  bol_karte: boolean;
}

interface StatusFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (status: Partial<Status>) => Promise<void>;
  status?: Status | null;
  isEditing: boolean;
}

const StatusFormModal: React.FC<StatusFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  status,
  isEditing
}) => {
  const [formData, setFormData] = useState({
    var_name: '',
    ary_colorcode: '{255,0,0}',
    bol_bogen: true,
    bol_karte: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to convert {R,G,B} to hex
  const rgbToHex = (rgbString: string): string => {
    try {
      const match = rgbString.match(/\{(\d+),(\d+),(\d+)\}/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    } catch (error) {
      console.error('Error converting RGB to hex:', error);
    }
    return '#FF0000';
  };

  // Helper function to convert hex to {R,G,B}
  const hexToRgb = (hex: string): string => {
    try {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `{${r},${g},${b}}`;
      }
    } catch (error) {
      console.error('Error converting hex to RGB:', error);
    }
    return '{255,0,0}';
  };

  // Get hex color for display
  const getHexColor = () => rgbToHex(formData.ary_colorcode);

  // Set hex color and convert to RGB format
  const setHexColor = (hex: string) => {
    setFormData(prev => ({ ...prev, ary_colorcode: hexToRgb(hex) }));
  };

  useEffect(() => {
    if (isEditing && status) {
      setFormData({
        var_name: status.var_name || '',
        ary_colorcode: status.ary_colorcode || '{255,0,0}',
        bol_bogen: status.bol_bogen ?? true,
        bol_karte: status.bol_karte ?? true
      });
    } else {
      setFormData({
        var_name: '',
        ary_colorcode: '{255,0,0}',
        bol_bogen: true,
        bol_karte: true
      });
    }
  }, [isEditing, status, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to save status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Status' : 'Add New Status'}
      size="md"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Name *
            </label>
            <input
              type="text"
              required
              value={formData.var_name}
              onChange={(e) => setFormData(prev => ({ ...prev, var_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter status name"
              disabled={isSubmitting}
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color *
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={getHexColor()}
                onChange={(e) => setHexColor(e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded-md cursor-pointer"
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={getHexColor()}
                onChange={(e) => setHexColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="#FF0000"
                pattern="^#[0-9A-Fa-f]{6}$"
                disabled={isSubmitting}
              />
              <div 
                className="w-10 h-10 rounded-md border border-gray-300"
                style={{ backgroundColor: getHexColor() }}
                title="Color Preview"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Use hex format (e.g., #FF0000 for red). Storage format: {formData.ary_colorcode}
            </p>
          </div>

          {/* Visibility Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Visibility Settings</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="bol_bogen"
                checked={formData.bol_bogen}
                onChange={(e) => setFormData(prev => ({ ...prev, bol_bogen: e.target.checked }))}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="bol_bogen" className="ml-2 text-sm text-gray-700">
                Show in Results Sheet (Bogen)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="bol_karte"
                checked={formData.bol_karte}
                onChange={(e) => setFormData(prev => ({ ...prev, bol_karte: e.target.checked }))}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="bol_karte" className="ml-2 text-sm text-gray-700">
                Show in Score Card (Karte)
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Status' : 'Create Status')}
            </button>
          </div>
        </form>
    </UnifiedModal>
  );
};

export default StatusFormModal;
