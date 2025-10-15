import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

// Firewall rule names
const FIREWALL_RULES = {
  backend: 'TurnFix Backend Server',
  frontend: 'TurnFix Frontend Client',
  juryPortal: 'TurnFix Jury Portal'
};

// Ports - frontend port depends on NODE_ENV
const PORTS = {
  backend: 3001,
  frontend: process.env.NODE_ENV === 'production' ? 3001 : 5173, // In production, frontend is served by backend
  juryPortal: 3002
};

/**
 * Check if the current process has administrator privileges
 */
async function checkAdminRights(): Promise<boolean> {
  try {
    // Try to execute a command that requires admin rights (reading firewall config)
    // If this succeeds without "access denied", we have admin rights
    await execAsync('net session', { encoding: 'utf8' });
    return true;
  } catch (error: any) {
    // If error message contains "Access is denied" or "Zugriff verweigert", we don't have admin rights
    if (error.message && (error.message.includes('Access is denied') || error.message.includes('Zugriff verweigert'))) {
      return false;
    }
    // For other errors, assume no admin rights to be safe
    return false;
  }
}

/**
 * Check if a firewall rule exists
 */
async function checkFirewallRule(ruleName: string): Promise<boolean> {
  /**
   * Hinweis:
   * - Die Statusabfrage nutzt PowerShell, um alle Firewall-Regeln zu finden, deren DisplayName mit dem Basisnamen beginnt und die aktiviert sind.
   * - Das ist zuverlässiger als die netsh-Ausgabe, da Windows mehrere Regeln pro Profil und Name verwalten kann.
   * - Die Löschlogik entfernt alle passenden Regeln (mit und ohne Suffix), um alle Profile zu erfassen.
   * - Für manuelle Kontrolle: Get-NetFirewallRule | Where-Object { $_.DisplayName -like '*TurnFix*' } | Format-Table -AutoSize
   * - Die Lösung ist Windows-spezifisch und setzt PowerShell voraus.
   */
  // Nutze PowerShell, um alle passenden Firewall-Regeln zu finden
  try {
    const { stdout } = await execAsync(
      `powershell -Command "Get-NetFirewallRule | Where-Object { $_.DisplayName -like '*${ruleName}*' -and $_.Enabled -eq 'True' } | Select-Object -ExpandProperty DisplayName"`,
      { encoding: 'utf8' }
    );
    if (stdout && stdout.trim().length > 0) {
      if (process.env.DEBUG === 'true') {
        console.log(`[DEBUG] PowerShell found enabled rule(s) for ${ruleName}:`, stdout);
      }
      return true;
    }
  } catch (error: any) {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] PowerShell error for ${ruleName}:`, error.message);
    }
  }
  return false;
}

/**
 * Get the status of all firewall rules
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const hasAdminRights = await checkAdminRights();
    
    // Im Debug-Modus: Regel-Details mitliefern
    let debugDetails: { [key: string]: any } | undefined = undefined;
    if (process.env.DEBUG === 'true') {
      debugDetails = {};
      for (const [service, ruleName] of Object.entries(FIREWALL_RULES)) {
        try {
          const { stdout } = await execAsync(
            `netsh advfirewall firewall show rule name="${ruleName}"`,
            { encoding: 'utf8' }
          );
          debugDetails[service] = stdout;
        } catch (error: any) {
          debugDetails[service] = error.message;
        }
      }
    }

    const status = {
      backend: await checkFirewallRule(FIREWALL_RULES.backend),
      frontend: await checkFirewallRule(FIREWALL_RULES.frontend),
      juryPortal: await checkFirewallRule(FIREWALL_RULES.juryPortal),
      ports: PORTS,
      hasAdminRights,
      debugDetails
    };

    res.json(status);
  } catch (error: any) {
    console.error('Error checking firewall status:', error);
    res.status(500).json({ 
      error: 'Failed to check firewall status',
      message: error.message,
      requiresAdmin: true
    });
  }
});

/**
 * Create a firewall rule
 */
router.post('/enable/:service', async (req: Request, res: Response) => {
  const service = req.params.service as keyof typeof FIREWALL_RULES;
  
  if (!FIREWALL_RULES[service]) {
    return res.status(400).json({ error: 'Invalid service name' });
  }

  const ruleName = FIREWALL_RULES[service];
  const port = PORTS[service];

  try {
    // Check if rule already exists
    const exists = await checkFirewallRule(ruleName);
    
    if (exists) {
      return res.json({ 
        success: true, 
        message: 'Firewall rule already exists',
        ruleName,
        port,
        alreadyExists: true
      });
    }

  // Setze die Regel explizit für alle Profile (public, private, domain) mit eindeutigen Namen
  await execAsync(`netsh advfirewall firewall add rule name="${ruleName} Public" dir=in action=allow protocol=TCP localport=${port} profile=public description="Allows access to ${ruleName} (Port ${port}) [Public]"`);
  await execAsync(`netsh advfirewall firewall add rule name="${ruleName} Private" dir=in action=allow protocol=TCP localport=${port} profile=private description="Allows access to ${ruleName} (Port ${port}) [Private]"`);
  await execAsync(`netsh advfirewall firewall add rule name="${ruleName} Domain" dir=in action=allow protocol=TCP localport=${port} profile=domain description="Allows access to ${ruleName} (Port ${port}) [Domain]"`);

    res.json({ 
      success: true, 
      message: 'Firewall rule created successfully',
      ruleName,
      port
    });
  } catch (error: any) {
    console.error('Error creating firewall rule:', error);
    
    // Check if it's a permission error
    if (error.message.includes('access is denied') || error.message.includes('Zugriff verweigert')) {
      return res.status(403).json({ 
        error: 'Administrator privileges required',
        message: 'Please run the application as administrator to manage firewall rules',
        requiresAdmin: true
      });
    }

    res.status(500).json({ 
      error: 'Failed to create firewall rule',
      message: error.message
    });
  }
});

/**
 * Delete a firewall rule
 */
router.post('/disable/:service', async (req: Request, res: Response) => {
  const service = req.params.service as keyof typeof FIREWALL_RULES;
  
  if (!FIREWALL_RULES[service]) {
    return res.status(400).json({ error: 'Invalid service name' });
  }

  const ruleName = FIREWALL_RULES[service];

  try {
    // Check if rule exists
    const exists = await checkFirewallRule(ruleName);
    
    if (!exists) {
      return res.json({ 
        success: true, 
        message: 'Firewall rule does not exist',
        ruleName,
        notFound: true
      });
    }

    // Lösche alle passenden Firewall-Regeln (mit und ohne Suffix)
    const ruleNames = [ruleName, `${ruleName} Public`, `${ruleName} Private`, `${ruleName} Domain`];
    let deletedAny = false;
    for (const name of ruleNames) {
      try {
        await execAsync(`netsh advfirewall firewall delete rule name="${name}"`);
        deletedAny = true;
      } catch (error: any) {
        if (process.env.DEBUG === 'true') {
          console.log(`[DEBUG] Error deleting rule ${name}:`, error.message);
        }
      }
    }
    if (deletedAny) {
      res.json({ 
        success: true, 
        message: 'Firewall rule(s) deleted successfully',
        ruleName
      });
    } else {
      res.json({ 
        success: false, 
        message: 'No matching firewall rule(s) found to delete',
        ruleName
      });
    }
  } catch (error: any) {
    console.error('Error deleting firewall rule:', error);
    
    // Check if it's a permission error
    if (error.message.includes('access is denied') || error.message.includes('Zugriff verweigert')) {
      return res.status(403).json({ 
        error: 'Administrator privileges required',
        message: 'Please run the application as administrator to manage firewall rules',
        requiresAdmin: true
      });
    }

    res.status(500).json({ 
      error: 'Failed to delete firewall rule',
      message: error.message
    });
  }
});

/**
 * Get network information (IP addresses)
 */
router.get('/network-info', async (req: Request, res: Response) => {
  try {
    const { stdout } = await execAsync('ipconfig');
    
    // Parse IPv4 addresses
    const ipv4Regex = /IPv4.*?:\s*(\d+\.\d+\.\d+\.\d+)/gi;
    const matches = [...stdout.matchAll(ipv4Regex)];
    const ipAddresses = matches
      .map(match => match[1])
      .filter(ip => !ip.startsWith('127.') && !ip.startsWith('169.254.')); // Filter out localhost and APIPA

    res.json({
      ipAddresses,
      ports: PORTS,
      accessUrls: {
        backend: ipAddresses.map(ip => `http://${ip}:${PORTS.backend}/api`),
        frontend: ipAddresses.map(ip => `http://${ip}:${PORTS.frontend}`),
        juryPortal: ipAddresses.map(ip => `http://${ip}:${PORTS.juryPortal}`)
      }
    });
  } catch (error: any) {
    console.error('Error getting network info:', error);
    res.status(500).json({ 
      error: 'Failed to get network information',
      message: error.message
    });
  }
});

/**
 * Debug endpoint: List all TurnFix firewall rules (for troubleshooting)
 */
router.get('/debug/rules', async (req: Request, res: Response) => {
  try {
    const rules = [];
    
    for (const [service, ruleName] of Object.entries(FIREWALL_RULES)) {
      try {
        const { stdout } = await execAsync(
          `netsh advfirewall firewall show rule name="${ruleName}"`,
          { encoding: 'utf8' }
        );
        
        rules.push({
          service,
          ruleName,
          exists: true,
          output: stdout
        });
      } catch (error: any) {
        rules.push({
          service,
          ruleName,
          exists: false,
          error: error.message
        });
      }
    }
    
    // Also list all firewall rules containing "TurnFix"
    try {
      const { stdout } = await execAsync(
        'netsh advfirewall firewall show rule name=all',
        { encoding: 'utf8' }
      );
      
      const turnfixRules = stdout.split('\n').filter(line => 
        line.toLowerCase().includes('turnfix')
      );
      
      res.json({
        checkedRules: rules,
        allTurnfixRules: turnfixRules,
        expectedRules: FIREWALL_RULES
      });
    } catch (error: any) {
      res.json({
        checkedRules: rules,
        expectedRules: FIREWALL_RULES,
        error: 'Could not list all rules: ' + error.message
      });
    }
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to get debug information',
      message: error.message
    });
  }
});

export default router;
