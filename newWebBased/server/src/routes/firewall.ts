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

const PORTS = {
  backend: 3001,
  frontend: 5173,
  juryPortal: 5174
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
  try {
    const { stdout, stderr } = await execAsync(
      `netsh advfirewall firewall show rule name="${ruleName}"`,
      { encoding: 'utf8' }
    );
    
    // Debug logging
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] Checking firewall rule: ${ruleName}`);
      console.log(`[DEBUG] stdout:`, stdout);
      console.log(`[DEBUG] stderr:`, stderr);
    }
    
    // Check if the rule exists by looking for the rule name in output
    const exists = stdout.includes('Rule Name:') && stdout.includes(ruleName);
    
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] Rule exists: ${exists}`);
    }
    
    return exists;
  } catch (error: any) {
    // If the command fails, the rule doesn't exist
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] Error checking rule ${ruleName}:`, error.message);
    }
    return false;
  }
}

/**
 * Get the status of all firewall rules
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const hasAdminRights = await checkAdminRights();
    
    const status = {
      backend: await checkFirewallRule(FIREWALL_RULES.backend),
      frontend: await checkFirewallRule(FIREWALL_RULES.frontend),
      juryPortal: await checkFirewallRule(FIREWALL_RULES.juryPortal),
      ports: PORTS,
      hasAdminRights
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

    // Create the firewall rule
    const command = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=TCP localport=${port} profile=private,domain description="Allows access to ${ruleName} (Port ${port})"`;
    
    await execAsync(command);

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

    // Delete the firewall rule
    const command = `netsh advfirewall firewall delete rule name="${ruleName}"`;
    
    await execAsync(command);

    res.json({ 
      success: true, 
      message: 'Firewall rule deleted successfully',
      ruleName
    });
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
