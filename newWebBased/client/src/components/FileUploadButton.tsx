/**
 * FileUploadButton — Reusable upload button component.
 *
 * Used by the Documents page and the LayoutDesigner.
 * Renders a hidden <input type="file"> + a styled trigger button/label.
 *
 * Props:
 *   category    — target upload category (icons, images, xml)
 *   accept      — file input accept string (e.g. "image/*,.xml")
 *   onUploaded  — callback after successful upload with file info
 *   onError     — callback on upload failure
 *   label       — button text (default: "Upload")
 *   className   — extra CSS classes for outer wrapper
 *   disabled    — disable the button
 *   endpoint    — override the API endpoint (default: /api/documents/upload)
 */

import React, { useRef, useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export interface UploadedFile {
  filename: string;
  originalName: string;
  category: string;
  size: number;
  mimetype: string;
  url: string;
}

interface FileUploadButtonProps {
  category: string;
  accept?: string;
  onUploaded?: (file: UploadedFile) => void;
  onError?: (error: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  endpoint?: string;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  category,
  accept,
  onUploaded,
  onError,
  label,
  className = '',
  disabled = false,
  endpoint = '/api/documents/upload',
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${response.status})`);
      }

      const result = await response.json();
      onUploaded?.(result.file || result);
    } catch (err: any) {
      console.error('[FileUploadButton] Upload error:', err);
      onError?.(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-uploaded
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || uploading}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowUpTrayIcon className="h-4 w-4" />
        {uploading
          ? t('documents.uploading', 'Wird hochgeladen...')
          : label || t('documents.upload', 'Hochladen')}
      </button>
    </div>
  );
};

export default FileUploadButton;
