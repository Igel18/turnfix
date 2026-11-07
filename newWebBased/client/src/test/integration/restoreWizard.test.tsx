import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import RestoreWizard from '../../pages/Configuration/RestoreWizard';
import * as api from '../../utils/api';

describe('restore wizard', () => {
  let previousLanguage: string;
  let post: ReturnType<typeof vi.spyOn>;
  const onClose = vi.fn();
  const onBack = vi.fn();

  beforeEach(async () => {
    previousLanguage = i18n.language;
    await act(async () => { await i18n.changeLanguage('de'); });
    post = vi.spyOn(api, 'apiPost');
    onClose.mockClear();
    onBack.mockClear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(async () => { await i18n.changeLanguage(previousLanguage); });
  });

  const open = () => render(<I18nextProvider i18n={i18n}><RestoreWizard onBack={onBack} onClose={onClose} /></I18nextProvider>);
  const fill = () => {
    fireEvent.change(screen.getByLabelText(/backup-verzeichnis/i), { target: { value: "C:\\Backups\\O'Brien" } });
    fireEvent.change(screen.getByLabelText(/staging-verzeichnis/i), { target: { value: 'D:\\Staging\\empty' } });
    fireEvent.change(screen.getByLabelText(/neuer datenbankname/i), { target: { value: 'turnfix_restore' } });
  };
  const confirm = () => fireEvent.click(screen.getByRole('checkbox'));
  const submit = () => screen.getByRole('button', { name: /wiederherstellung starten/i });

  it('requires absolute paths, a valid new database name and explicit confirmation', () => {
    open();
    expect(submit()).toBeDisabled();
    fill();
    expect(submit()).toBeDisabled();
    confirm();
    expect(submit()).toBeEnabled();
    fireEvent.change(screen.getByLabelText(/backup-verzeichnis/i), { target: { value: 'relative/path' } });
    expect(submit()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/backup-verzeichnis/i), { target: { value: '/backups/one' } });
    fireEvent.change(screen.getByLabelText(/staging-verzeichnis/i), { target: { value: 'D:relative' } });
    expect(submit()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/staging-verzeichnis/i), { target: { value: '\\\\server\\share\\empty' } });
    fireEvent.change(screen.getByLabelText(/neuer datenbankname/i), { target: { value: 'invalid name' } });
    expect(submit()).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/passwort/i)).not.toBeInTheDocument();
  });

  it.each(['1restore', '_restore', 'Restore', 'restore-db', 'restore$db'])('rejects database name %s which the server cannot create', databaseName => {
    open();
    fill();
    confirm();
    fireEvent.change(screen.getByLabelText(/neuer datenbankname/i), { target: { value: databaseName } });
    expect(submit()).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
  });

  it('posts the contract once, blocks navigation during execution, and explains manual activation on success', async () => {
    let resolveRequest!: (value: unknown) => void;
    post.mockReturnValue(new Promise(resolve => { resolveRequest = resolve; }));
    open();
    fill();
    confirm();
    fireEvent.click(submit());
    expect(post).toHaveBeenCalledWith('/configuration/backup/restore', {
      backupPath: "C:\\Backups\\O'Brien", stagingPath: 'D:\\Staging\\empty', databaseName: 'turnfix_restore',
    }, { headers: { 'Content-Type': 'application/json', 'X-TurnFix-Restore': '1' }, retryOnRateLimit: false });
    expect(screen.getByRole('button', { name: /wiederherstellung läuft/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /wiederherstellung läuft/i }));
    expect(screen.getByRole('button', { name: /zurück zur einrichtung/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /schließen/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
    await act(async () => { resolveRequest({ success: true, databaseName: 'turnfix_restore', stagingPath: 'D:\\Staging\\empty' }); });
    expect(await screen.findByText('turnfix_restore')).toBeInTheDocument();
    expect(screen.getByText('D:\\Staging\\empty')).toBeInTheDocument();
    expect(screen.getByText(/aktive datenbank.*nicht.*umgestellt/i)).toBeInTheDocument();
    expect(within(screen.getByRole('status')).getByText(/server.*stoppen.*manuell/i)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it.each([
    ['DATABASE_EXISTS', /existiert bereits/i],
    ['RESTORE_IN_PROGRESS', /bereits.*wiederherstellung/i],
    ['FORBIDDEN', /lokalen browser/i],
    ['INVALID_BACKUP_OR_STAGING', /sicherung.*staging/i],
    ['DATABASE_CREATE_FAILED', /datenbank.*erstellt werden/i],
    ['RESTORE_FAILED', /wiederherstellung.*fehlgeschlagen/i],
    ['INVALID_REQUEST', /anfrage.*ungültig/i],
    ['INVALID_TARGET_DATABASE', /datenbankname.*ungültig/i],
    ['SOMETHING_ELSE', /unerwarteter fehler/i],
  ])('localizes %s without exposing server details', async (code, message) => {
    post.mockRejectedValue({ response: { data: { code, error: 'secret database password', databaseCreated: false } } });
    open();
    fill();
    confirm();
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('alert')).not.toHaveTextContent('secret database password');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/datenbank.*verbleiben/i);
  });

  it.each([true, undefined])('warns when databaseCreated is %s', async databaseCreated => {
    post.mockRejectedValue({ response: { data: { code: 'RESTORE_FAILED', databaseCreated } } });
    open();
    fill();
    confirm();
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent(/datenbank.*verbleiben/i);
  });

  it('warns on network failure and supports English', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    post.mockRejectedValue(new Error('secret connection information'));
    open();
    fireEvent.change(screen.getByLabelText(/backup directory/i), { target: { value: '/backups/one' } });
    fireEvent.change(screen.getByLabelText(/staging directory/i), { target: { value: '/staging/empty' } });
    fireEvent.change(screen.getByLabelText(/new database name/i), { target: { value: 'restore_db' } });
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /start restore/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/database.*may remain/i));
    expect(screen.getByRole('alert')).not.toHaveTextContent('secret connection information');
  });

  it('sends the real JSON request once and surfaces rate limiting without retrying', async () => {
    post.mockRestore();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 'RESTORE_IN_PROGRESS', error: 'secret', databaseCreated: false,
    }), { status: 429, headers: { 'Content-Type': 'application/json' } }));
    open();
    fill();
    confirm();
    fireEvent.click(submit());
    expect(await screen.findByRole('alert', {}, { timeout: 500 })).toHaveTextContent(/bereits.*wiederherstellung/i);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/configuration/backup/restore');
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json', 'X-TurnFix-Restore': '1' });
    expect(JSON.parse(String(options?.body))).toEqual({
      backupPath: "C:\\Backups\\O'Brien", stagingPath: 'D:\\Staging\\empty', databaseName: 'turnfix_restore',
    });
  });
});