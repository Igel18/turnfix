import React, { useState, useEffect } from 'react';

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
}

export default function DatabaseConfigWorking() {
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

  // Load current configuration on component mount
  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/admin/database-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to load database configuration:', error);
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
      const response = await fetch('http://localhost:3002/api/admin/test-database-connection', {
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

    try {
      const response = await fetch('http://localhost:3002/api/admin/database-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setConnectionStatus({
          connected: true,
          message: 'Configuration saved successfully! Please restart the server for changes to take effect.'
        });
      } else {
        const error = await response.json();
        setConnectionStatus({
          connected: false,
          message: 'Failed to save configuration: ' + error.message
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

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    marginBottom: '24px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '8px'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: 'white'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#6b7280',
    color: 'white'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>DB</span>
        </div>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Database Configuration</h1>
          <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>Configure your PostgreSQL database connection</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Configuration Form */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>Connection Settings</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Host</label>
              <input
                style={inputStyle}
                type="text"
                value={config.host}
                onChange={(e) => handleInputChange('host', e.target.value)}
                placeholder="localhost"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Port</label>
              <input
                style={inputStyle}
                type="number"
                value={config.port}
                onChange={(e) => handleInputChange('port', e.target.value)}
                placeholder="5432"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Database Name</label>
            <input
              style={inputStyle}
              type="text"
              value={config.database}
              onChange={(e) => handleInputChange('database', e.target.value)}
              placeholder="turnfix3"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Username</label>
            <input
              style={inputStyle}
              type="text"
              value={config.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="postgres"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Password</label>
            <input
              style={inputStyle}
              type="password"
              value={config.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter database password"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Schema</label>
            <input
              style={inputStyle}
              type="text"
              value={config.schema}
              onChange={(e) => handleInputChange('schema', e.target.value)}
              placeholder="public"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', paddingTop: '16px' }}>
            <button
              onClick={testConnection}
              disabled={testingConnection}
              style={secondaryButtonStyle}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={saveConfiguration}
              disabled={loading}
              style={primaryButtonStyle}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Connection String Preview */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>Connection Preview</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Connection String</label>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db',
              fontFamily: 'monospace',
              fontSize: '12px',
              wordBreak: 'break-all',
              color: '#374151'
            }}>
              {generateConnectionString()}
            </div>
          </div>

          {connectionStatus && (
            <div style={{ 
              padding: '12px',
              borderRadius: '6px',
              border: connectionStatus.connected ? '1px solid #d1fae5' : '1px solid #fee2e2',
              backgroundColor: connectionStatus.connected ? '#f0fdf4' : '#fef2f2',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: connectionStatus.connected ? '#10b981' : '#ef4444'
                }}></div>
                <span style={{ 
                  fontSize: '14px',
                  color: connectionStatus.connected ? '#065f46' : '#991b1b',
                  fontWeight: '500'
                }}>
                  {connectionStatus.message}
                </span>
              </div>
            </div>
          )}

          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <h4 style={{ fontWeight: '500', marginBottom: '8px', color: '#374151' }}>Configuration Notes:</h4>
            <ul style={{ paddingLeft: '16px', margin: 0 }}>
              <li style={{ marginBottom: '4px' }}>Make sure PostgreSQL is running and accessible</li>
              <li style={{ marginBottom: '4px' }}>Ensure the database exists before testing connection</li>
              <li style={{ marginBottom: '4px' }}>The user must have appropriate permissions</li>
              <li style={{ marginBottom: '4px' }}>Changes require server restart to take effect</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
