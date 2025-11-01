/**
 * Port Checker Utility
 * Detects if a port is blocked by another process and provides options to kill it
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PortBlocker {
  port: number;
  pid: number;
  processName: string;
  commandLine?: string;
}

/**
 * Check if a port is in use
 * @param port Port number to check
 * @returns Promise<boolean> True if port is in use
 */
export async function isPortInUse(port: number): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      // Windows: Use netstat to check port
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      return stdout.trim().length > 0;
    } else {
      // Linux/Mac: Use lsof or netstat
      try {
        const { stdout } = await execAsync(`lsof -i :${port}`);
        return stdout.trim().length > 0;
      } catch {
        // Fallback to netstat
        const { stdout } = await execAsync(`netstat -an | grep ${port}`);
        return stdout.trim().length > 0;
      }
    }
  } catch (error) {
    // If command fails, port is likely not in use
    return false;
  }
}

/**
 * Get process information that is blocking a port
 * @param port Port number to check
 * @returns Promise<PortBlocker | null> Information about the blocking process
 */
export async function getPortBlocker(port: number): Promise<PortBlocker | null> {
  try {
    if (process.platform === 'win32') {
      // Windows: Get PID from netstat
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      
      if (!stdout || stdout.trim().length === 0) {
        return null;
      }
      
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        // Look for LISTENING state
        if (line.includes('LISTENING')) {
          // Extract PID (last column)
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1]);
          
          if (!isNaN(pid) && pid > 0) {
            // Get process name using tasklist
            try {
              const { stdout: taskOutput } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
              
              if (!taskOutput || taskOutput.trim().length === 0) {
                console.log(`   ⚠️ No task info found for PID ${pid}`);
                // Return basic info even if tasklist fails
                return {
                  port,
                  pid,
                  processName: 'Unknown',
                  commandLine: undefined
                };
              }
              
              const taskParts = taskOutput.trim().split(',');
              const processName = taskParts[0]?.replace(/"/g, '') || 'Unknown';
              
              // Get command line
              let commandLine: string | undefined;
              try {
                const { stdout: wmicOutput } = await execAsync(`wmic process where ProcessId=${pid} get CommandLine /FORMAT:LIST`);
                const match = wmicOutput.match(/CommandLine=(.*)/);
                commandLine = match ? match[1].trim() : undefined;
              } catch {
                // Command line retrieval failed, not critical
              }
              
              return {
                port,
                pid,
                processName,
                commandLine
              };
            } catch (error) {
              console.error(`   ⚠️ Failed to get process info for PID ${pid}:`, error);
              // Return basic info even if we can't get full details
              return {
                port,
                pid,
                processName: 'Unknown',
                commandLine: undefined
              };
            }
          }
        }
      }
    } else {
      // Linux/Mac: Use lsof
      try {
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        const pid = parseInt(stdout.trim());
        
        if (!isNaN(pid)) {
          // Get process name
          const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o comm=`);
          const processName = psOutput.trim();
          
          // Get command line
          const { stdout: cmdOutput } = await execAsync(`ps -p ${pid} -o args=`);
          const commandLine = cmdOutput.trim();
          
          return {
            port,
            pid,
            processName,
            commandLine
          };
        }
      } catch {
        // lsof failed, port might not be in use
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting port blocker:', error);
    return null;
  }
}

/**
 * Kill process by PID
 * @param pid Process ID to kill
 * @param force Force kill (SIGKILL on Unix, /F on Windows)
 * @returns Promise<boolean> True if process was killed successfully
 */
export async function killProcess(pid: number, force: boolean = false): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      // Windows: Use taskkill with /F flag for force kill
      const forceFlag = force ? '/F' : '';
      const command = `taskkill /PID ${pid} ${forceFlag}`.trim();
      console.log(`   Executing: ${command}`);
      await execAsync(command);
      console.log(`✅ Process ${pid} killed successfully`);
      
      // Wait a bit longer for Windows to release the port
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    } else {
      // Linux/Mac: Use kill
      const signal = force ? '-9' : '-15';
      await execAsync(`kill ${signal} ${pid}`);
      console.log(`✅ Process ${pid} killed successfully`);
      
      // Wait for process to die
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    }
  } catch (error: any) {
    console.error(`❌ Failed to kill process ${pid}:`, error.message);
    return false;
  }
}

/**
 * Check port and optionally kill blocking process
 * @param port Port number to check
 * @param autoKill Automatically kill blocking process
 * @param force Force kill if autoKill is true
 * @returns Promise<boolean> True if port is now available
 */
export async function ensurePortAvailable(
  port: number,
  autoKill: boolean = false,
  force: boolean = false
): Promise<boolean> {
  const inUse = await isPortInUse(port);
  
  if (!inUse) {
    console.log(`✅ Port ${port} is available`);
    return true;
  }
  
  console.log(`⚠️  Port ${port} is already in use`);
  
  const blocker = await getPortBlocker(port);
  
  if (blocker) {
    console.log(`📋 Port ${port} is blocked by:`);
    console.log(`   - Process: ${blocker.processName} (PID: ${blocker.pid})`);
    if (blocker.commandLine) {
      console.log(`   - Command: ${blocker.commandLine}`);
    }
    
    if (autoKill) {
      console.log(`🔨 Attempting to kill process ${blocker.pid}...`);
      const killed = await killProcess(blocker.pid, force);
      
      if (killed) {
        // Wait for port to be released (increased wait time)
        console.log(`⏳ Waiting for port ${port} to be released...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if port is now available (retry up to 3 times)
        for (let i = 0; i < 3; i++) {
          const stillInUse = await isPortInUse(port);
          if (!stillInUse) {
            console.log(`✅ Port ${port} is now available`);
            return true;
          }
          
          if (i < 2) {
            console.log(`   Retry ${i + 1}/2 - Port still blocked, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        console.log(`❌ Port ${port} is still in use after killing process`);
        console.log(`💡 Try manually: taskkill /PID ${blocker.pid} /F`);
        return false;
      }
      
      return false;
    } else {
      console.log(`💡 To kill this process, run:`);
      if (process.platform === 'win32') {
        console.log(`   taskkill /PID ${blocker.pid} /F`);
      } else {
        console.log(`   kill -9 ${blocker.pid}`);
      }
      return false;
    }
  } else {
    console.log(`⚠️  Port ${port} appears in use, but no process found`);
    console.log(`   This might be a timing issue - port may be freeing up (Windows TIME_WAIT)`);
    
    if (autoKill) {
      // In PM2 restart scenarios, the port might be in TIME_WAIT state
      // We need to wait longer for Windows to release it
      console.log(`⏳ Waiting for port ${port} to be released (up to 30 seconds)...`);
      
      // Try up to 10 times with 3 second intervals (30 seconds total)
      for (let attempt = 1; attempt <= 10; attempt++) {
        console.log(`   Attempt ${attempt}/10 - Checking port availability...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const stillInUse = await isPortInUse(port);
        if (!stillInUse) {
          console.log(`✅ Port ${port} is now available (freed after ${attempt * 3} seconds)`);
          return true;
        }
      }
      
      console.log(`❌ Port ${port} is still in use after 30 seconds - cannot identify blocking process`);
      console.log(`💡 Possible causes:`);
      console.log(`   - Windows TIME_WAIT state (may need up to 60 seconds)`);
      console.log(`   - Another instance is starting simultaneously`);
      console.log(`   - Port is held by a system service`);
      return false;
    }
    
    return false;
  }
}

/**
 * Check multiple ports
 * @param ports Array of port numbers to check
 * @returns Promise<Map<number, PortBlocker | null>> Map of port to blocker info
 */
export async function checkMultiplePorts(ports: number[]): Promise<Map<number, PortBlocker | null>> {
  const results = new Map<number, PortBlocker | null>();
  
  for (const port of ports) {
    const blocker = await getPortBlocker(port);
    results.set(port, blocker);
  }
  
  return results;
}
