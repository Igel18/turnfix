/**
 * FileUploadButton Component Tests
 *
 * Tests the reusable upload button: hidden file input, button trigger,
 * FormData construction, success/error callbacks, and disabled state.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../renderWithProviders';
import FileUploadButton from '../../components/FileUploadButton';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: any) => {
      if (typeof fallback === 'string') return fallback;
      return key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// ── Test helpers ───────────────────────────────────────────────────────────

function createMockFile(name: string, size: number, type: string): File {
  const content = new Array(size).fill('x').join('');
  return new File([content], name, { type });
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

// ── Tests ──────────────────────────────────────────────────────────────────

describe('FileUploadButton', () => {
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('should render a button', () => {
    renderWithProviders(
      <FileUploadButton category="icons" />
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should render custom label text', () => {
    renderWithProviders(
      <FileUploadButton category="icons" label="Upload Icon" />
    );

    expect(screen.getByText('Upload Icon')).toBeInTheDocument();
  });

  it('should render a hidden file input', () => {
    const { container } = renderWithProviders(
      <FileUploadButton category="icons" accept="image/png" />
    );

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    expect(fileInput?.getAttribute('accept')).toBe('image/png');
  });

  // ── Disabled state ───────────────────────────────────────────────────────

  it('should not trigger file input when disabled', () => {
    const { container } = renderWithProviders(
      <FileUploadButton category="icons" disabled />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // When disabled, the hidden input should NOT be clicked
    expect(clickSpy).not.toHaveBeenCalled();
  });

  // ── Upload success ───────────────────────────────────────────────────────

  it('should upload file and call onUploaded callback', async () => {
    const uploadedFile = {
      filename: 'barren.png',
      originalName: 'barren.png',
      category: 'icons',
      size: 2048,
      mimetype: 'image/png',
      url: '/public/icons/barren.png',
    };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ file: uploadedFile }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const onUploaded = vi.fn();
    const { container } = renderWithProviders(
      <FileUploadButton category="icons" onUploaded={onUploaded} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('barren.png', 2048, 'image/png');

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(uploadedFile);
    });

    // Verify fetch was called with correct endpoint and method
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/documents/upload',
      expect.objectContaining({ method: 'POST' })
    );

    // Verify FormData contains category
    const fetchCall = fetchSpy.mock.calls[0];
    const body = fetchCall[1]?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('category')).toBe('icons');
    expect(body.get('file')).toBeInstanceOf(File);
  });

  it('should use custom endpoint when provided', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ file: { filename: 'test.xml' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { container } = renderWithProviders(
      <FileUploadButton category="xml" endpoint="/api/custom-upload" />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('test.xml', 1024, 'application/xml');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/custom-upload',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ── Upload error ─────────────────────────────────────────────────────────

  it('should call onError when upload fails (HTTP error)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'File too large' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const onError = vi.fn();
    const { container } = renderWithProviders(
      <FileUploadButton category="icons" onError={onError} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('huge.png', 999999, 'image/png');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('File too large'));
    });
  });

  it('should call onError when fetch throws', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const onError = vi.fn();
    const { container } = renderWithProviders(
      <FileUploadButton category="icons" onError={onError} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('test.png', 1024, 'image/png');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Network error');
    });
  });

  it('should handle non-JSON error response', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    const onError = vi.fn();
    const { container } = renderWithProviders(
      <FileUploadButton category="icons" onError={onError} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('test.png', 1024, 'image/png');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  // ── Reset after upload ───────────────────────────────────────────────────

  it('should reset file input after upload (allows re-upload of same file)', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ file: { filename: 'test.png' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { container } = renderWithProviders(
      <FileUploadButton category="icons" onUploaded={vi.fn()} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('test.png', 1024, 'image/png');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(fileInput.value).toBe('');
    });
  });

  // ── No file selected ────────────────────────────────────────────────────

  it('should do nothing when no file is selected', () => {
    const onUploaded = vi.fn();
    const { container } = renderWithProviders(
      <FileUploadButton category="icons" onUploaded={onUploaded} />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    // Change event with no files
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  // ── Category propagation ─────────────────────────────────────────────────

  it('should send correct category in FormData for "images"', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ file: { filename: 'photo.jpg' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { container } = renderWithProviders(
      <FileUploadButton category="images" />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('photo.jpg', 5000, 'image/jpeg');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const body = fetchSpy.mock.calls[0][1]?.body as FormData;
      expect(body.get('category')).toBe('images');
    });
  });

  it('should send correct category in FormData for "xml"', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ file: { filename: 'data.xml' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { container } = renderWithProviders(
      <FileUploadButton category="xml" />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('data.xml', 2000, 'application/xml');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const body = fetchSpy.mock.calls[0][1]?.body as FormData;
      expect(body.get('category')).toBe('xml');
    });
  });
});
