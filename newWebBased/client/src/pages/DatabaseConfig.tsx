import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircleIcon, XCircleIcon, CircleStackIcon, Cog6ToothIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema: string;
}

interface ConnectionStatus {
  connected: boolean;
  message: string;
  tablesFound?: number;
  sampleTables?: string[];
}

interface DatabaseConfigResponse {
  config?: DatabaseConfig;
  message?: string;
}

export default function DatabaseConfig() {
  const [config, setConfig] = useState<DatabaseConfig>({
    host: 'localhost',
    port: 5432,
    database: 'turnfix3',
    username: 'postgres',
    password: '',
    schema: 'public'
  });

  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [serverRestart, setServerRestart] = useState(false);

  // Load current configuration on component mount
  useEffect(() => {
    loadCurrentConfig();
    // Test current connection on load
    setTimeout(() => {
      testConnection();
    }, 500);
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('/api/admin/database-config');
      if (response.ok) {
        const data: DatabaseConfigResponse = await response.json();
        if (data.config) {
          // Load the stored password from localStorage for convenience
          const storedPassword = localStorage.getItem('db_password') || '';
          setConfig({
            ...data.config,
            password: storedPassword
          });
          setConfigLoaded(true);
        }
      } else {
        // If no config found, try to load password from localStorage
        const storedPassword = localStorage.getItem('db_password') || '';
        setConfig(prev => ({
          ...prev,
          password: storedPassword
        }));
        setConfigLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load database configuration:', error);
      setConfigLoaded(true);
    }
  };

  const handleInputChange = (field: keyof DatabaseConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: field === 'port' ? Number(value) : value
    }));
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const response = await fetch('/api/admin/test-database-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      setConnectionStatus({
        connected: response.ok,
        message: result.message || (response.ok ? 'Connection successful!' : 'Connection failed')
      });
    } catch (error) {
      setConnectionStatus({
        connected: false,
        message: 'Failed to test connection: ' + (error as Error).message
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    setConnectionStatus(null);

    try {
      // Store password in localStorage for convenience
      if (config.password) {
        localStorage.setItem('db_password', config.password);
      }

      const response = await fetch('/api/admin/database-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (response.ok) {
        setConnectionStatus({
          connected: true,
          message: result.message || 'Configuration saved successfully! Please restart the server for changes to take effect.'
        });
        setServerRestart(true);
      } else {
        setConnectionStatus({
          connected: false,
          message: result.message || 'Failed to save configuration'
        });
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        message: 'Failed to save configuration: ' + (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  const generateConnectionString = () => {
    return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?schema=${config.schema}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CircleStackIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Database Configuration</h1>
            <p className="text-gray-600">Configure your PostgreSQL database connection</p>
          </div>
        </div>
        <Link 
          to="/" 
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Status Alert */}
      {connectionStatus && (
        <Alert className={`mb-6 ${connectionStatus.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            {connectionStatus.connected ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-600" />
            )}
            <AlertDescription className={connectionStatus.connected ? 'text-green-800' : 'text-red-800'}>
              {connectionStatus.message}
              {connectionStatus.tablesFound !== undefined && (
                <div className="mt-1 text-sm">
                  Found {connectionStatus.tablesFound} tables
                  {connectionStatus.sampleTables && connectionStatus.sampleTables.length > 0 && (
                    <span className="text-gray-600"> (e.g., {connectionStatus.sampleTables.join(', ')})</span>
                  )}
                </div>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {serverRestart && connectionStatus?.connected && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <ArrowPathIcon className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Server restart required:</strong> The database configuration has been saved but won't take effect until you restart the development server.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog6ToothIcon className="h-5 w-5" />
              Connection Settings
            </CardTitle>
            <CardDescription>
              Enter your PostgreSQL database connection details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  type="text"
                  value={config.host}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  placeholder="localhost"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={config.port}
                  onChange={(e) => handleInputChange('port', e.target.value)}
                  placeholder="5432"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="database">Database Name</Label>
              <Input
                id="database"
                type="text"
                value={config.database}
                onChange={(e) => handleInputChange('database', e.target.value)}
                placeholder="turnfix3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={config.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="postgres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={config.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter database password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schema">Schema</Label>
              <Input
                id="schema"
                type="text"
                value={config.schema}
                onChange={(e) => handleInputChange('schema', e.target.value)}
                placeholder="public"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={testConnection}
                disabled={testingConnection}
                variant="outline"
                className="flex-1"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                onClick={saveConfiguration}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connection String Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Preview</CardTitle>
            <CardDescription>
              Preview of the generated connection string
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Connection String</Label>
                <div className="mt-2 p-3 bg-gray-100 rounded-md">
                  <code className="text-sm break-all">
                    {generateConnectionString()}
                  </code>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <h4 className="font-medium mb-2">Configuration Notes:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Make sure PostgreSQL is running and accessible</li>
                  <li>• Ensure the database exists before testing connection</li>
                  <li>• The user must have appropriate permissions</li>
                  <li>• Changes require server restart to take effect</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
