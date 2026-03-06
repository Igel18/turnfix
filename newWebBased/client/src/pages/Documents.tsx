/**
 * Documents — Unified file management page.
 *
 * Follows the DatabaseManagementTemplate pattern used by Regions, Areas, etc.
 * Shows files from four categories: Icons, Images, XML, JSON.
 * Supports upload, download, delete, search, and category filtering.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  CodeBracketIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import DatabaseManagementTemplate from '@/components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '@/components/SortableTableHeader';
import FileUploadButton, { UploadedFile } from '@/components/FileUploadButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileEntry {
  filename: string;
  category: string;
  size: number;
  modified: string;
  created: string;
  mimetype: string;
  url: string;
}

interface CategoryInfo {
  key: string;
  fileCount: number;
  uploadAllowed: boolean;
  deleteAllowed: boolean;
  maxFileSize: number;
  allowedMimes: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable file size */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Category → icon component */
function categoryIcon(cat: string) {
  switch (cat) {
    case 'icons': return PhotoIcon;
    case 'images': return PhotoIcon;
    case 'xml': return CodeBracketIcon;
    case 'json': return DocumentTextIcon;
    default: return DocumentIcon;
  }
}

/** Category → badge color */
function categoryColor(cat: string): string {
  switch (cat) {
    case 'icons': return 'bg-amber-100 text-amber-800';
    case 'images': return 'bg-blue-100 text-blue-800';
    case 'xml': return 'bg-green-100 text-green-800';
    case 'json': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/** Check if file is an image */
function isImage(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

/** Accept string for upload input per category */
function acceptForCategory(cat: string): string {
  switch (cat) {
    case 'icons': return 'image/png,image/svg+xml,image/jpeg,image/gif,image/webp';
    case 'images': return 'image/*';
    case 'xml': return '.xml,text/xml,application/xml';
    case 'json': return '.json,application/json';
    default: return '*';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Documents: React.FC = () => {
  const { t } = useTranslation();

  // Data
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('filename', 'asc');

  // Upload target category (defaults to first uploadable or 'icons')
  const [uploadCategory, setUploadCategory] = useState('icons');

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const [filesRes, catsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/documents/categories'),
      ]);
      if (filesRes.ok) {
        const data = await filesRes.json();
        setFiles(data.files || []);
      }
      if (catsRes.ok) {
        const data = await catsRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // ---------------------------------------------------------------------------
  // Filter & sort
  // ---------------------------------------------------------------------------

  const getFilterOptions = () => [
    {
      label: t('documents.filters.category', 'Kategorie'),
      value: '',
      selectedValue: categoryFilter,
      options: categories.map(c => ({
        value: c.key,
        label: t(`documents.category.${c.key}`, c.key) + ` (${c.fileCount})`,
      })),
      onChange: (value: string) => setCategoryFilter(value),
    },
  ];

  const sortedFiles = sortData(files, (file) => {
    const key = sortKey as keyof FileEntry;
    if (key === 'size') return file.size;
    return (file as any)[key];
  });

  const filteredFiles = sortedFiles.filter(file => {
    const matchesSearch =
      !searchTerm || file.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !categoryFilter || file.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDelete = async (file: FileEntry) => {
    const cat = categories.find(c => c.key === file.category);
    if (!cat?.deleteAllowed) return;

    if (!window.confirm(t('documents.confirmDelete', { name: file.filename }))) return;

    try {
      const res = await fetch(`/api/documents/${file.category}/${file.filename}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDownload = (file: FileEntry) => {
    // For icons/images/xml served by express static, use url directly.
    // For json (served via API), use download endpoint.
    const downloadUrl = file.category === 'json'
      ? `/api/documents/download/json/${file.filename}`
      : file.url;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleUploaded = (_file: UploadedFile) => {
    loadFiles(); // Refresh list
  };

  const handleUploadError = (msg: string) => {
    alert(msg);
  };

  const handleClearAllFilters = () => {
    setCategoryFilter('');
  };

  // ---------------------------------------------------------------------------
  // Upload target selector
  // ---------------------------------------------------------------------------

  const uploadableCategories = categories.filter(c => c.uploadAllowed);

  const renderUploadArea = () => (
    <div className="flex items-center gap-3">
      <select
        value={uploadCategory}
        onChange={e => setUploadCategory(e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
      >
        {uploadableCategories.map(c => (
          <option key={c.key} value={c.key}>
            {t(`documents.category.${c.key}`, c.key)}
          </option>
        ))}
      </select>
      <FileUploadButton
        category={uploadCategory}
        accept={acceptForCategory(uploadCategory)}
        onUploaded={handleUploaded}
        onError={handleUploadError}
        label={t('documents.uploadFile', 'Datei hochladen')}
      />
    </div>
  );

  // ---------------------------------------------------------------------------
  // Table rendering
  // ---------------------------------------------------------------------------

  const renderTableHeaders = () => (
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
        {/* Preview */}
      </th>
      <SortableTableHeader
        label={t('documents.table.filename', 'Dateiname')}
        sortKey="filename"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('documents.table.category', 'Kategorie')}
        sortKey="category"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('documents.table.size', 'Größe')}
        sortKey="size"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('documents.table.modified', 'Geändert')}
        sortKey="modified"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t('common.actions', 'Aktionen')}
      </th>
    </tr>
  );

  const renderTableRow = (file: FileEntry) => {
    const CatIcon = categoryIcon(file.category);
    const cat = categories.find(c => c.key === file.category);
    const canDelete = cat?.deleteAllowed ?? false;

    return (
      <tr key={`${file.category}-${file.filename}`} className="hover:bg-gray-50">
        {/* Preview / icon */}
        <td className="px-6 py-4 whitespace-nowrap">
          {isImage(file.mimetype) ? (
            <img
              src={file.url}
              alt={file.filename}
              className="w-8 h-8 object-contain rounded border"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <CatIcon className="h-6 w-6 text-gray-400" />
          )}
        </td>

        {/* Filename */}
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {file.filename}
        </td>

        {/* Category badge */}
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColor(file.category)}`}>
            {t(`documents.category.${file.category}`, file.category)}
          </span>
        </td>

        {/* Size */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {formatSize(file.size)}
        </td>

        {/* Modified */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(file.modified).toLocaleString()}
        </td>

        {/* Actions */}
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload(file)}
              title={t('documents.download', 'Herunterladen')}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                onClick={() => handleDelete(file)}
                title={t('documents.delete', 'Löschen')}
                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ---------------------------------------------------------------------------
  // Card rendering
  // ---------------------------------------------------------------------------

  const renderCard = (file: FileEntry) => {
    const CatIcon = categoryIcon(file.category);
    const cat = categories.find(c => c.key === file.category);
    const canDelete = cat?.deleteAllowed ?? false;

    return (
      <div
        key={`${file.category}-${file.filename}`}
        className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-4"
      >
        {/* Preview */}
        <div className="flex items-center justify-center h-24 mb-3 bg-gray-50 rounded">
          {isImage(file.mimetype) ? (
            <img
              src={file.url}
              alt={file.filename}
              className="max-h-20 max-w-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <CatIcon className="h-12 w-12 text-gray-300" />
          )}
        </div>

        {/* Info */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-900 truncate" title={file.filename}>
            {file.filename}
          </p>
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(file.category)}`}>
              {t(`documents.category.${file.category}`, file.category)}
            </span>
            <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <button
            onClick={() => handleDownload(file)}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            {t('documents.download', 'Download')}
          </button>
          {canDelete && (
            <button
              onClick={() => handleDelete(file)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {t('documents.delete', 'Löschen')}
            </button>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DatabaseManagementTemplate
      title={t('documents.title', 'Dokumente & Dateien')}
      subtitle={t('documents.subtitle', '{{count}} Dateien in {{cats}} Kategorien', {
        count: files.length,
        cats: categories.length,
      })}
      icon={DocumentIcon}
      data={filteredFiles}
      isLoading={loading}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={t('documents.searchPlaceholder', 'Dateiname suchen...')}
      filterOptions={getFilterOptions()}
      onClearAllFilters={handleClearAllFilters}
      viewStorageKey="documents-view"
      itemsPerPage={20}
      renderTableHeaders={renderTableHeaders}
      renderTableRow={renderTableRow}
      renderCard={renderCard}
      additionalContent={renderUploadArea()}
    />
  );
};

export default Documents;
