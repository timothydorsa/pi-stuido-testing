import React, { useState, useEffect, useRef } from 'react';
import './ApiClient.css';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/atom-one-dark.css';

// Register JSON language for syntax highlighting
hljs.registerLanguage('json', json);

const ApiClient = () => {
  const [swaggerUrl, setSwaggerUrl] = useState('http://localhost:8001/api-docs');
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [response, setResponse] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [collections, setCollections] = useState([]);
  const [currentCollection, setCurrentCollection] = useState({ name: 'Default', requests: [] });
  const [loading, setLoading] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');

  // Fetch Swagger docs on component mount
  useEffect(() => {
    fetchSwaggerDocs();
  }, []);

  const fetchSwaggerDocs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${swaggerUrl.replace('/api-docs', '')}/api-docs.json`);
      const data = await response.json();
      
      // Parse endpoints from swagger docs
      const paths = data.paths || {};
      const parsedEndpoints = [];
      
      Object.keys(paths).forEach(path => {
        Object.keys(paths[path]).forEach(method => {
          const endpoint = paths[path][method];
          parsedEndpoints.push({
            path,
            method: method.toUpperCase(),
            summary: endpoint.summary || '',
            description: endpoint.description || '',
            parameters: endpoint.parameters || [],
            tags: endpoint.tags || [],
            responses: endpoint.responses || {}
          });
        });
      });
      
      setEndpoints(parsedEndpoints);
    } catch (error) {
      console.error('Error fetching Swagger docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndpointSelect = (endpoint) => {
    setSelectedEndpoint(endpoint);
    
    // Generate curl command
    const baseUrl = swaggerUrl.replace('/api-docs', '');
    const curlCmd = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}"`;
    setCurlCommand(curlCmd);
  };

  const handleSendRequest = async () => {
    if (!selectedEndpoint) return;
    
    try {
      setLoading(true);
      const baseUrl = swaggerUrl.replace('/api-docs', '');
      const startTime = performance.now();
      
      const response = await fetch(`${baseUrl}${selectedEndpoint.path}`, {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      const data = await response.json();
      setResponse({
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries([...response.headers])
      });
      
      // Add to current collection
      const newRequest = {
        id: Date.now(),
        name: `${selectedEndpoint.method} ${selectedEndpoint.path}`,
        endpoint: selectedEndpoint,
        response: {
          status: response.status,
          data
        }
      };
      
      setCurrentCollection(prev => ({
        ...prev,
        requests: [...prev.requests, newRequest]
      }));
      
    } catch (error) {
      console.error('Error sending request:', error);
      setResponse({
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCollection = () => {
    const name = prompt('Enter collection name:', currentCollection.name);
    if (!name) return;
    
    const newCollection = {
      ...currentCollection,
      name,
      id: Date.now()
    };
    
    setCollections([...collections, newCollection]);
    setCurrentCollection({ name: 'New Collection', requests: [] });
  };

  const loadCollection = (collection) => {
    setCurrentCollection(collection);
  };

  const exportCollection = () => {
    if (!currentCollection.requests || currentCollection.requests.length === 0) {
      alert('No requests to export in this collection');
      return;
    }
    
    const format = window.confirm('Export as Postman collection? (Cancel for standard format)') ? 'postman' : 'standard';
    
    let dataStr;
    
    if (format === 'postman') {
      // Convert to Postman format
      const postmanCollection = {
        info: {
          name: currentCollection.name,
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: currentCollection.requests.map(req => {
          return {
            name: req.name,
            request: {
              method: req.method,
              header: req.headers.filter(h => h.key).map(h => ({ key: h.key, value: h.value })),
              url: {
                raw: req.url,
                query: req.params.filter(p => p.key).map(p => ({ key: p.key, value: p.value }))
              },
              body: req.body ? {
                mode: "raw",
                raw: req.body,
                options: {
                  raw: {
                    language: "json"
                  }
                }
              } : undefined
            }
          };
        })
      };
      
      dataStr = JSON.stringify(postmanCollection, null, 2);
    } else {
      // Standard format
      dataStr = JSON.stringify(currentCollection, null, 2);
    }
    
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const suffix = format === 'postman' ? '_postman' : '';
    const exportFileDefaultName = `${currentCollection.name.replace(/\s+/g, '_')}${suffix}_collection.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importCollection = (event) => {
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const content = JSON.parse(e.target.result);
        
        // Handle Postman collections
        if (content.info && content.item) {
          // This is a Postman collection
          const postmanCollection = {
            name: content.info.name || 'Imported Postman Collection',
            id: Date.now(),
            requests: []
          };
          
          // Convert Postman items to our format
          const processItems = (items) => {
            items.forEach(item => {
              if (item.item) {
                // This is a folder
                processItems(item.item);
              } else if (item.request) {
                // This is a request
                const req = item.request;
                const url = typeof req.url === 'string' ? req.url : req.url?.raw || '';
                
                const newRequest = {
                  name: item.name || 'Unnamed Request',
                  url: url,
                  method: req.method || 'GET',
                  headers: req.header?.map(h => ({ key: h.key, value: h.value })) || [],
                  params: [],
                  body: req.body?.raw || '',
                  id: Date.now() + Math.random()
                };
                
                if (typeof req.url === 'object' && req.url.query) {
                  newRequest.params = req.url.query.map(q => ({ key: q.key, value: q.value }));
                }
                
                postmanCollection.requests.push(newRequest);
              }
            });
          };
          
          processItems(content.item);
          setCollections([...collections, postmanCollection]);
          alert(`Imported Postman collection: ${postmanCollection.name} with ${postmanCollection.requests.length} requests`);
        } else {
          // Standard format
          setCollections([...collections, content]);
          alert(`Imported collection: ${content.name}`);
        }
      } catch (error) {
        console.error('Error importing collection:', error);
        alert('Failed to import collection. Invalid format.');
      }
    };
  };
  
  const openSwaggerUI = () => {
    window.open('http://localhost:8001/api-docs', '_blank');
  };
  
  const formatJSON = (json) => {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, null, 2);
    }
    
    return hljs.highlight(json, { language: 'json' }).value;
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="api-client">
      <div className="api-client-header">
        <h2>API Client</h2>
        <div className="api-client-controls">
          <input 
            type="text" 
            value={swaggerUrl} 
            onChange={(e) => setSwaggerUrl(e.target.value)} 
            placeholder="Swagger URL"
          />
          <button onClick={fetchSwaggerDocs}>Connect</button>
          <button onClick={openSwaggerUI} className="swagger-btn">Open Swagger UI</button>
        </div>
      </div>
      
      <div className="api-client-container">
        <div className="sidebar">
          <div className="collections-panel">
            <h3>Collections</h3>
            <div className="collection-actions">
              <button onClick={saveCollection}>Save</button>
              <button onClick={exportCollection}>Export</button>
              <input 
                type="file" 
                id="import-collection" 
                style={{ display: 'none' }} 
                onChange={importCollection} 
                accept=".json" 
              />
              <button onClick={() => document.getElementById('import-collection').click()}>
                Import
              </button>
            </div>
            <div className="collections-list">
              {collections.map(collection => (
                <div 
                  key={collection.id} 
                  className="collection-item"
                  onClick={() => loadCollection(collection)}
                >
                  <span>{collection.name}</span>
                  <span className="collection-count">{collection.requests.length}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="endpoints-panel">
            <h3>Endpoints</h3>
            {loading && <div className="loading">Loading...</div>}
            <div className="endpoints-list">
              {endpoints.map((endpoint, index) => (
                <div 
                  key={index} 
                  className={`endpoint-item ${selectedEndpoint === endpoint ? 'selected' : ''}`}
                  onClick={() => handleEndpointSelect(endpoint)}
                >
                  <span className={`method ${endpoint.method.toLowerCase()}`}>
                    {endpoint.method}
                  </span>
                  <span className="path">{endpoint.path}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="main-panel">
          {selectedEndpoint ? (
            <div className="request-panel">
              <div className="request-header">
                <h3>{selectedEndpoint.summary || `${selectedEndpoint.method} ${selectedEndpoint.path}`}</h3>
                <div className="curl-command">
                  <code>{curlCommand}</code>
                  <button 
                    className="copy-button"
                    onClick={() => copyToClipboard(curlCommand)}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="request-description">
                {selectedEndpoint.description && <p>{selectedEndpoint.description}</p>}
                <div className="tags">
                  {selectedEndpoint.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
              
              <div className="request-actions">
                <button 
                  className="send-button"
                  onClick={handleSendRequest}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
              
              {response && (
                <div className="response-panel">
                  <div className="response-header">
                    <h4>Response {responseTime && `(${responseTime}ms)`}</h4>
                    <span className={`status status-${Math.floor(response.status / 100)}xx`}>
                      {response.status} {response.statusText}
                    </span>
                  </div>
                  
                  <div className="response-body">
                    <pre 
                      dangerouslySetInnerHTML={{ 
                        __html: formatJSON(response.data)
                      }} 
                      className="json-response"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Select an endpoint from the sidebar</h3>
              <p>API documentation and testing interface</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiClient;
