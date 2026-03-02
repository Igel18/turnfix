# TurnFix Licensing

**License**: GNU Affero General Public License v3.0 (AGPL-3.0)  
**Copyright**: © 2025 Dominik Prudlo  
**Point**: 50

---

## License Choice: AGPL-3.0

TurnFix uses the **AGPL-3.0** license. This was chosen because:

1. **Copyleft**: All modifications must be shared as open source under the same license
2. **Network Clause**: Since TurnFix is a web application, the AGPL's network clause (Section 13) ensures that users accessing TurnFix over a network also have the right to receive the source code — even if TurnFix is only hosted (not distributed as a binary)
3. **Open Source Requirement**: Anyone modifying, improving, extending, or fixing bugs must make those changes available as open source

### Key AGPL-3.0 Obligations

| Obligation | Description |
|---|---|
| Source code access | Users (including network users) must be able to access the source code |
| Copyleft | Derivative works must also be AGPL-3.0 |
| Attribution | Original copyright notice must be preserved |
| State changes | Modifications must be clearly marked |
| No additional restrictions | Cannot add further restrictions beyond AGPL-3.0 |

---

## Where the License is Enforced

### 1. LICENSE File
- **Location**: Repository root (`turnfix/LICENSE`)
- Contains the full AGPL-3.0 license text
- Downloaded from https://www.gnu.org/licenses/agpl-3.0.txt

### 2. Windows Installer (Inno Setup)
- **File**: `setup/installer/turnfix-setup.iss`
- `LicenseFile` directive shows the license during installation
- User must accept the license to proceed with installation
- LICENSE file is also installed to the application directory

### 3. package.json Files
All package.json files contain:
```json
{
  "author": "Dominik Prudlo",
  "license": "AGPL-3.0"
}
```

Updated packages:
- `turnfix/package.json` (root)
- `newWebBased/package.json`
- `newWebBased/client/package.json`
- `newWebBased/server/package.json`
- `newWebBased/jury-portal/package.json`
- `newWebBased/jury-server/package.json`
- `newWebBased/shared/package.json`
- `newWebBased/api-dummy/package.json`

### 4. Source Code Headers
Main entry points contain the standard AGPL-3.0 header:
- `server/src/index.ts`
- `client/src/main.tsx`

### 5. Build Pipeline
- `setup/installer/build-installer.ps1` copies LICENSE to the staging directory so it's included in the installer

---

## Summary

TurnFix is currently open source and free to use. If modified, improved, extended, or bug-fixed, those changes must also be made available as open source under the AGPL-3.0 license.
