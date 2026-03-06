/**
 * ImagePicker — Reusable dropdown for picking an image from the server.
 *
 * Shows a toggle button with the currently selected image (or a placeholder).
 * Clicking it opens a dropdown grid of thumbnail previews with a search/filter.
 * Supports two categories:
 *   • "icons"  → discipline icons from /api/documents/icons
 *   • "images" → uploaded images from /api/documents?category=images
 *
 * Props:
 *   value        — currently selected filename/path (e.g. "barren.png" or "/uploads/images/foo.png")
 *   onChange      — called with the new value when the user picks an image
 *   category     — "icons" | "images" (default "icons")
 *   placeholder  — text shown when no image is selected
 *   className    — extra CSS on outer wrapper
 *   allowClear   — show a clear button (default true)
 *   allowUpload  — show an upload button inside the picker (default false)
 *   columns      — grid columns for thumbnails (default 6 for icons, 4 for images)
 *   thumbnailSize — CSS class for thumbnail size (default "w-6 h-6" for icons, "w-12 h-12" for images)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getIconUrl } from '../utils/iconUtils';

export interface ImagePickerProps {
  value: string;
  onChange: (value: string) => void;
  category?: 'icons' | 'images';
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  allowUpload?: boolean;
  columns?: number;
  thumbnailSize?: string;
}

interface ImageItem {
  filename: string;
  url: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  value,
  onChange,
  category = 'icons',
  placeholder,
  className = '',
  allowClear = true,
  allowUpload = false,
  columns,
  thumbnailSize,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ImageItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Defaults per category
  const cols = columns ?? (category === 'icons' ? 6 : 4);
  const thumbSize = thumbnailSize ?? (category === 'icons' ? 'w-6 h-6' : 'w-12 h-12');

  // ── Fetch available images ───────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    try {
      if (category === 'icons') {
        const res = await fetch('/api/documents/icons');
        if (!res.ok) { setItems([]); return; }
        const data = await res.json();
        const icons: ImageItem[] = (data.icons || []).map((icon: any) => {
          const filename = typeof icon === 'string' ? icon : icon.filename;
          return { filename, url: getIconUrl(filename) || '' };
        });
        setItems(icons);
      } else {
        // images category
        const res = await fetch('/api/documents?category=images');
        if (!res.ok) { setItems([]); return; }
        const data = await res.json();
        const images: ImageItem[] = (data.files || []).map((f: any) => ({
          filename: f.filename,
          url: f.url,
        }));
        setItems(images);
      }
    } catch {
      setItems([]);
    }
  }, [category]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── Outside-click to close ───────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // ── Filtered list ────────────────────────────────────────────────────────

  const filtered = items.filter(item =>
    !search || item.filename.toLowerCase().includes(search.toLowerCase())
  );

  // ── Resolve display URL for current value ────────────────────────────────

  const resolveDisplayUrl = (val: string): string => {
    if (!val) return '';
    if (category === 'icons') return getIconUrl(val) || '';
    // images: value is typically "/uploads/images/foo.png"
    if (val.startsWith('/') || val.startsWith('http')) return val;
    return `/uploads/images/${val}`;
  };

  // ── Upload handler ───────────────────────────────────────────────────────

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      if (category === 'icons') {
        formData.append('file', file);
        formData.append('category', 'icons');
        const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          const newFilename = data.file?.filename || file.name;
          await fetchItems();
          onChange(newFilename);
          setIsOpen(false);
          setSearch('');
        }
      } else {
        formData.append('image', file);
        const res = await fetch('/api/images/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          await fetchItems();
          onChange(data.imagePath);
          setIsOpen(false);
          setSearch('');
        }
      }
    } catch (err) {
      console.error('[ImagePicker] Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const displayUrl = resolveDisplayUrl(value);
  const displayName = value ? value.split('/').pop() || value : '';

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {/* Toggle button */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left min-h-[38px]"
        >
          {value ? (
            <>
              <img
                src={displayUrl}
                alt=""
                className={`${thumbSize} object-contain flex-shrink-0`}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="text-sm text-gray-900 truncate">{displayName}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400">
              {placeholder || t('imagePicker.placeholder', 'Bild auswählen...')}
            </span>
          )}
        </button>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-red-500 p-1"
            title={t('common.clear', 'Leeren')}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={t('imagePicker.search', 'Suchen...')}
              autoFocus
            />
            {allowUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 flex-shrink-0"
                  title={t('imagePicker.upload', 'Hochladen')}
                >
                  {uploading ? '⏳' : '📤'}
                </button>
              </>
            )}
          </div>

          {/* Thumbnail grid */}
          <div className={`overflow-y-auto max-h-56 p-2 grid gap-1`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {filtered.map(item => (
              <button
                key={item.filename}
                type="button"
                onClick={() => {
                  onChange(category === 'icons' ? item.filename : item.url);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`p-1.5 rounded hover:bg-blue-50 border flex flex-col items-center ${
                  (value === item.filename || value === item.url)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent'
                }`}
                title={item.filename}
              >
                <img
                  src={item.url}
                  alt={item.filename}
                  className={`${thumbSize} object-contain mx-auto`}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                {category === 'images' && (
                  <span className="text-[9px] text-gray-500 truncate w-full text-center mt-0.5">
                    {item.filename.length > 15 ? item.filename.slice(0, 12) + '…' : item.filename}
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className={`text-xs text-gray-400 text-center py-2`} style={{ gridColumn: `1 / -1` }}>
                {items.length === 0
                  ? t('imagePicker.noImages', 'Keine Bilder vorhanden')
                  : t('common.noResults', 'Keine Ergebnisse')
                }
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
