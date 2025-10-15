import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000';
const socket = io(API_BASE_URL);

function App() {
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState({
    name: '',
    perMinute: 50,
    perDay: 1000
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // API Tester state
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [endpointPath, setEndpointPath] = useState('/protected');
  const [requestMethod, setRequestMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('');
  const [requestResponse, setRequestResponse] = useState(null);
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  
  // Simulation state
  const [simulationApiKey, setSimulationApiKey] = useState('');
  const [simulationResponse, setSimulationResponse] = useState(null);
  const [isSimulationLoading, setIsSimulationLoading] = useState(false);

  // Fetch all API keys on component mount
  useEffect(() => {
    fetchKeys();

    // Socket.io event listeners
    socket.on('connect', () => {
      console.log('Socket.io connected');
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
      setSocketConnected(false);
    });

    socket.on('usage.update', (data) => {
      console.log('Usage update received:', data);
      updateKeyUsage(data);
    });

    // Clean up event listeners
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('usage.update');
    };
  }, []);

  // Fetch all API keys
  const fetchKeys = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/keys`);
      
      // For each key, fetch its current usage metrics
      const keysWithUsage = await Promise.all(
        response.data.map(async (key) => {
          try {
            const usageResponse = await axios.get(`${API_BASE_URL}/metrics/keys/${key._id}`);
            return {
              ...key,
              minute: usageResponse.data.minute || 0,
              day: usageResponse.data.day || 0
            };
          } catch (err) {
            console.error(`Error fetching usage for key ${key._id}:`, err);
            return {
              ...key,
              minute: 0,
              day: 0
            };
          }
        })
      );
      
      setKeys(keysWithUsage);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching API keys:', err);
      setError('Failed to fetch API keys');
      setLoading(false);
    }
  };

  // Update key usage when socket event received
  const updateKeyUsage = (data) => {
    setKeys(prevKeys => 
      prevKeys.map(key => 
        key._id === data.keyId 
          ? { ...key, minute: data.minute, day: data.day }
          : key
      )
    );
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewKey(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseInt(value, 10)
    }));
  };

  // Create new API key
  const handleCreateKey = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/keys`, newKey);
      setKeys(prev => [...prev, { ...response.data, minute: 0, day: 0 }]);
      setNewKey({ name: '', perMinute: 50, perDay: 1000 });
    } catch (err) {
      console.error('Error creating API key:', err);
      setError('Failed to create API key');
    }
  };

  // Toggle API key active status
  const toggleKeyStatus = async (id, currentStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/admin/keys/${id}`, {
        active: !currentStatus
      });
      
      setKeys(prevKeys =>
        prevKeys.map(key =>
          key._id === id ? { ...key, active: !key.active } : key
        )
      );
    } catch (err) {
      console.error('Error updating API key status:', err);
      setError('Failed to update API key');
    }
  };
  
  // Delete API key
  const deleteKey = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete API key for "${name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API_BASE_URL}/admin/keys/${id}`);
      
      // Remove the key from state
      setKeys(prevKeys => prevKeys.filter(key => key._id !== id));
      
      // Show success message
      setError(null); // Clear any existing errors
    } catch (err) {
      console.error('Error deleting API key:', err);
      setError('Failed to delete API key');
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Rate Limiter & Monitoring Dashboard</h1>
        <p>
          Socket.io Status: {socketConnected ? 
            <span style={{ color: 'green' }}>Connected</span> : 
            <span style={{ color: 'red' }}>Disconnected</span>}
        </p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </header>

      <section>
        <h2>Create New API Key</h2>
        <form onSubmit={handleCreateKey}>
          <div className="form-group">
            <label htmlFor="name">Service Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newKey.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="perMinute">Requests Per Minute:</label>
            <input
              type="number"
              id="perMinute"
              name="perMinute"
              min="1"
              value={newKey.perMinute}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="perDay">Requests Per Day:</label>
            <input
              type="number"
              id="perDay"
              name="perDay"
              min="1"
              value={newKey.perDay}
              onChange={handleInputChange}
              required
            />
          </div>
          <button type="submit">Create API Key</button>
        </form>
      </section>

      <section>
        <h2>API Keys</h2>
        {loading ? (
          <p>Loading API keys...</p>
        ) : keys.length === 0 ? (
          <p>No API keys found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>API Key</th>
                <th>Limits</th>
                <th>Current Usage (Used/Limit)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr 
                  key={key._id} 
                  className={`key-row ${key.minute > key.perMinute || key.day > key.perDay ? 'rate-exceeded' : ''}`}
                >
                  <td>{key.name}</td>
                  <td><span className="api-key">{key.key}</span></td>
                  <td>{key.perMinute} / {key.perDay}</td>
                  <td>
                    <div>
                      {key.minute}/{key.perMinute} · {key.day}/{key.perDay}
                    </div>
                    <div className="usage-bar">
                      <div 
                        className={`usage-fill ${key.minute > key.perMinute || key.day > key.perDay ? 'exceeded' : ''}`}
                        style={{ width: `${Math.min(100, (key.minute / key.perMinute) * 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td>
                    <span className={`status ${key.active ? 'active' : 'inactive'}`}></span>
                    {key.active ? 'Active' : 'Inactive'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => toggleKeyStatus(key._id, key.active)}
                        className="toggle-btn"
                      >
                        {key.active ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        onClick={() => deleteKey(key._id, key.name)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Test API Endpoints</h2>
        <div className="api-tester">
          <div className="form-group">
            <label htmlFor="selectedApiKey">Select API Key:</label>
            <select 
              id="selectedApiKey" 
              value={selectedApiKey} 
              onChange={(e) => setSelectedApiKey(e.target.value)}
              required
            >
              <option value="">-- Select an API Key --</option>
              {keys.filter(key => key.active).map(key => (
                <option key={key._id} value={key.key}>
                  {key.name} ({key.key})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="requestMethod">Request Method:</label>
            <select 
              id="requestMethod" 
              value={requestMethod} 
              onChange={(e) => setRequestMethod(e.target.value)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="endpointPath">Endpoint:</label>
            <div className="endpoint-input">
              <span>{API_BASE_URL}</span>
              <input
                type="text"
                id="endpointPath"
                value={endpointPath}
                onChange={(e) => setEndpointPath(e.target.value)}
                placeholder="/protected"
              />
            </div>
          </div>

          {(requestMethod === 'POST' || requestMethod === 'PUT') && (
            <div className="form-group">
              <label htmlFor="requestBody">Request Body (JSON):</label>
              <textarea
                id="requestBody"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={4}
                placeholder={'{\n  "key": "value"\n}'}
              />
            </div>
          )}

          <button 
            onClick={handleSendRequest} 
            disabled={!selectedApiKey || isRequestLoading}
            className="send-request-btn"
          >
            {isRequestLoading ? 'Sending...' : 'Send Request'}
          </button>

          {requestResponse && (
            <div className="response-container">
              <h3>Response {requestResponse.status} {requestResponse.statusText}</h3>
              
              {requestResponse.endpointInfo && (
                <div className="endpoint-info">
                  <div><strong>Endpoint:</strong> {endpointPath}</div>
                  <div><strong>Description:</strong> {requestResponse.endpointInfo.description}</div>
                  <div><strong>Purpose:</strong> {requestResponse.endpointInfo.purpose}</div>
                  {requestResponse.endpointInfo.rateLimited && (
                    <div className="rate-limited-notice">
                      ⚠️ This endpoint is rate-limited according to your API key settings
                    </div>
                  )}
                </div>
              )}
              
              <div className={`response-status ${requestResponse.status < 400 ? 'success' : 'error'}`}>
                {requestResponse.status < 400 ? '✓ Success' : '✗ Error'}
              </div>
              
              {requestResponse.data?.usage && requestResponse.endpointInfo?.rateLimited && (
                <div className="usage-info">
                  <strong>Current Usage:</strong> 
                  <span className="usage-counters">
                    <span className={requestResponse.data.usage.minute > (keys.find(k => k.key === selectedApiKey)?.perMinute || 0) ? 'exceeded-text' : ''}>
                      Minute: {requestResponse.data.usage.minute}/{keys.find(k => k.key === selectedApiKey)?.perMinute || '?'}
                    </span>, 
                    <span className={requestResponse.data.usage.day > (keys.find(k => k.key === selectedApiKey)?.perDay || 0) ? 'exceeded-text' : ''}>
                      Day: {requestResponse.data.usage.day}/{keys.find(k => k.key === selectedApiKey)?.perDay || '?'}
                    </span>
                  </span>
                </div>
              )}
              
              <div className="response-headers">
                <strong>Headers:</strong>
                <pre>{JSON.stringify(requestResponse.headers, null, 2)}</pre>
              </div>
              
              <div className="response-body">
                <strong>Body:</strong>
                <pre>{JSON.stringify(requestResponse.data, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </section>
      
      <section>
        <h2>Rate Limit Simulation</h2>
        <div className="simulation-controls">
          <p>Send multiple requests to test rate limiting behavior:</p>
          
          <div className="form-group">
            <label htmlFor="simulationApiKey">API Key to Test:</label>
            <select 
              id="simulationApiKey" 
              value={simulationApiKey} 
              onChange={(e) => setSimulationApiKey(e.target.value)}
            >
              <option value="">-- Select an API Key --</option>
              {keys.filter(key => key.active).map(key => (
                <option key={key._id} value={key.key}>
                  {key.name} ({key.key}) - {key.perMinute}/min
                </option>
              ))}
            </select>
          </div>
          
          <div className="simulation-buttons">
            <button 
              onClick={() => handleBurstRequests(5)} 
              disabled={!simulationApiKey || isSimulationLoading}
              className="simulation-btn"
            >
              Send 5 Requests
            </button>
            <button 
              onClick={() => handleBurstRequests(10)} 
              disabled={!simulationApiKey || isSimulationLoading}
              className="simulation-btn"
            >
              Send 10 Requests
            </button>
            <button 
              onClick={() => handleBurstRequests(20)} 
              disabled={!simulationApiKey || isSimulationLoading}
              className="simulation-btn"
            >
              Send 20 Requests
            </button>
          </div>
          
          {isSimulationLoading && (
            <div className="simulation-status">
              <p>Running simulation... Please wait.</p>
            </div>
          )}
          
          {simulationResponse && (
            <div className="response-container simulation-results">
              <h3>Simulation Results</h3>
              <div className="simulation-summary">
                <div className="simulation-metric">
                  <span className="metric-label">Total Requests:</span>
                  <span className="metric-value">{simulationResponse.data.summary.totalRequests}</span>
                </div>
                <div className="simulation-metric">
                  <span className="metric-label">Successful:</span>
                  <span className="metric-value success">{simulationResponse.data.summary.successful}</span>
                </div>
                <div className="simulation-metric">
                  <span className="metric-label">Rate Limited:</span>
                  <span className="metric-value error">{simulationResponse.data.summary.failed}</span>
                </div>
              </div>
              
              <h4>Request Details:</h4>
              <div className="simulation-details">
                {simulationResponse.data.responses.map((resp, idx) => (
                  <div 
                    key={idx} 
                    className={`simulation-request ${resp.status === 200 ? 'success' : 'error'}`}
                  >
                    <div className="request-number">Request #{idx + 1}</div>
                    <div className="request-status">Status: {resp.status}</div>
                    <div className="request-data">
                      {resp.status === 200 ? (
                        <span>
                          Usage: 
                          <span className={
                            resp.data?.usage?.minute > (keys.find(k => k.key === simulationApiKey)?.perMinute || 0) 
                            ? 'exceeded-text' : ''
                          }>
                            Minute: {resp.data?.usage?.minute}/{keys.find(k => k.key === simulationApiKey)?.perMinute || '?'}
                          </span>, 
                          <span className={
                            resp.data?.usage?.day > (keys.find(k => k.key === simulationApiKey)?.perDay || 0)
                            ? 'exceeded-text' : ''
                          }>
                            Day: {resp.data?.usage?.day}/{keys.find(k => k.key === simulationApiKey)?.perDay || '?'}
                          </span>
                        </span>
                      ) : (
                        <span>Error: {resp.error?.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  // Function to handle sending a single API request
  async function handleSendRequest() {
    if (!selectedApiKey) {
      setError('Please select an API key');
      return;
    }

    setIsRequestLoading(true);
    setRequestResponse(null);
    
    try {
      // Display information about the endpoint being called
      const endpointInfo = getEndpointInfo(endpointPath);
      
      const config = {
        method: requestMethod,
        url: `${API_BASE_URL}${endpointPath}`,
        headers: {
          'x-api-key': selectedApiKey,
          'Content-Type': 'application/json'
        }
      };

      if ((requestMethod === 'POST' || requestMethod === 'PUT') && requestBody) {
        try {
          config.data = JSON.parse(requestBody);
        } catch (e) {
          setError('Invalid JSON in request body');
          setIsRequestLoading(false);
          return;
        }
      }

      const response = await axios(config);
      
      setRequestResponse({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        endpointInfo: endpointInfo
      });
      
      // Fetch keys to update usage data in the UI
      if (endpointPath === '/protected') {
        // Socket.io will handle real-time updates, but we'll fetch after a small delay
        // to make sure all changes are propagated
        setTimeout(() => fetchKeys(), 500);
      }
      
    } catch (err) {
      setRequestResponse({
        status: err.response?.status || 500,
        statusText: err.response?.statusText || 'Error',
        headers: err.response?.headers || {},
        data: err.response?.data || { error: err.message },
        endpointInfo: getEndpointInfo(endpointPath)
      });
    } finally {
      setIsRequestLoading(false);
    }
  }
  
  // Function to provide helpful information about the endpoint being called
  function getEndpointInfo(path) {
    switch(path) {
      case '/protected':
        return {
          description: 'Protected endpoint that requires API key authentication',
          rateLimited: true,
          purpose: 'This endpoint demonstrates the rate limiting functionality'
        };
      case '/admin/keys':
        return {
          description: 'Administrative endpoint for API key management',
          rateLimited: false,
          purpose: 'Use GET to list keys or POST to create a new key'
        };
      default:
        if (path.startsWith('/admin/keys/')) {
          return {
            description: 'Single API key management endpoint',
            rateLimited: false,
            purpose: 'Use PUT to update key properties or GET for key details'
          };
        }
        if (path.startsWith('/metrics/keys/')) {
          return {
            description: 'API key metrics endpoint',
            rateLimited: false,
            purpose: 'Retrieve current usage metrics for a specific API key'
          };
        }
        return {
          description: 'Custom endpoint',
          rateLimited: path.startsWith('/protected'),
          purpose: 'Custom endpoint path'
        };
    }
  }

  // Function to send multiple requests in sequence
  async function handleBurstRequests(count) {
    if (!simulationApiKey) {
      setError('Please select an API key for simulation');
      return;
    }

    setIsSimulationLoading(true);
    setSimulationResponse(null);
    
    const results = {
      success: 0,
      errors: 0,
      responses: []
    };

    // Get the selected key object to update usage counts in UI
    const selectedKey = keys.find(k => k.key === simulationApiKey);
    
    for (let i = 0; i < count; i++) {
      try {
        const response = await axios({
          method: 'GET',
          url: `${API_BASE_URL}/protected`,
          headers: {
            'x-api-key': simulationApiKey
          }
        });
        
        results.success++;
        results.responses.push({
          index: i,
          status: response.status,
          data: response.data
        });
        
        // No need to manually update UI here as Socket.io will handle it
        
      } catch (err) {
        results.errors++;
        results.responses.push({
          index: i,
          status: err.response?.status || 500,
          error: err.response?.data || { message: err.message }
        });
      }
      
      // Small delay to make the UI updates more visible
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setSimulationResponse({
      status: 200,
      statusText: 'Burst Complete',
      headers: {},
      data: {
        summary: {
          totalRequests: count,
          successful: results.success,
          failed: results.errors
        },
        responses: results.responses
      }
    });
    
    setIsSimulationLoading(false);
    
    // Refresh key data after simulation is complete to ensure accurate counts
    fetchKeys();
  }
}

export default App;
