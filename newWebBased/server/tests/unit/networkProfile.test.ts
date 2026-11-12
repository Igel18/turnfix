import { execFile } from 'child_process';
import { warnAboutPublicNetworkProfiles } from '../../src/utils/networkProfile';

jest.mock('child_process', () => ({ execFile: jest.fn() }));

describe('startup network profile check', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;
  const mockedExecFile = execFile as jest.MockedFunction<typeof execFile>;
  let warning: jest.SpyInstance;

  beforeEach(() => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    mockedExecFile.mockReset();
    warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
    warning.mockRestore();
  });

  function respond(error: Error | null, output: string): void {
    const callback = mockedExecFile.mock.calls[0][3] as (error: Error | null, stdout: string) => void;
    callback(error, output);
  }

  it('warns separately for each public profile', () => {
    warnAboutPublicNetworkProfiles();
    expect(mockedExecFile).toHaveBeenCalledWith('powershell.exe', expect.any(Array), expect.objectContaining({ timeout: 10000 }), expect.any(Function));
    respond(null, JSON.stringify([{ Name: 'Halle', InterfaceAlias: 'LAN' }, { Name: 'Guest', InterfaceAlias: 'WLAN' }]));
    expect(warning).toHaveBeenCalledTimes(2);
    expect(warning.mock.calls[0][0]).toContain('Halle');
    expect(warning.mock.calls[1][0]).toContain('WLAN');
  });

  it('does not warn when there are no public profiles', () => {
    warnAboutPublicNetworkProfiles();
    respond(null, '[]');
    expect(warning).not.toHaveBeenCalled();
  });

  it('reports command failures and invalid output', () => {
    warnAboutPublicNetworkProfiles();
    respond(new Error('unavailable'), '');
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('nicht geprueft'), 'unavailable');
    warning.mockClear();
    warnAboutPublicNetworkProfiles();
    const callback = mockedExecFile.mock.calls[1][3] as (error: Error | null, stdout: string) => void;
    callback(null, '{}');
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('nicht ausgewertet'), expect.any(Error));
  });

  it('does nothing on other operating systems', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    warnAboutPublicNetworkProfiles();
    expect(mockedExecFile).not.toHaveBeenCalled();
  });
});