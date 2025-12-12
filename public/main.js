// main.js - Frontend JavaScript for Onshape API Express
document.addEventListener('DOMContentLoaded', function() {
    // UI Elements
    const logArea = document.getElementById('logArea');
    const clearLogBtn = document.getElementById('clearLog');
    
    // Configuration inputs
    const documentIdInput = document.getElementById('documentId');
    const workspaceIdInput = document.getElementById('workspaceId');
    const elementIdInput = document.getElementById('elementId');
    const serverUrlInput = document.getElementById('serverUrl');
    
    // Example buttons
    const healthCheckBtn = document.getElementById('healthCheck');
    const getDefaultPlanesBtn = document.getElementById('getDefaultPlanes');
    const createSketchBtn = document.getElementById('createSketch');
    const createExtrudeBtn = document.getElementById('createExtrude');
    const createCompleteBtn = document.getElementById('createComplete');
    
    // Add circle to sketch button
    const addCircleBtn = document.getElementById('addCircleBtn');
    
    // Logging functions
    function logToConsole(method, url, status, message = '') {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      
      const time = new Date().toLocaleTimeString();
      const statusClass = status >= 200 && status < 300 ? 'log-entry-status-success' : 'log-entry-status-error';
      
      logEntry.innerHTML = `
        <span class="log-entry-time">[${time}]</span>
        <span class="log-entry-method">${method}</span>
        <span class="log-entry-url">${url}</span>
        <span class="log-entry-status ${statusClass}">${status}</span>
        ${message ? `<div class="log-entry-message">${formatJson(message)}</div>` : ''}
      `;
      
      logArea.appendChild(logEntry);
      logArea.scrollTop = logArea.scrollHeight;
    }
    
    function formatJson(json) {
      if (typeof json === 'string') {
        try {
          json = JSON.parse(json);
        } catch (e) {
          return json;
        }
      }
      return JSON.stringify(json, null, 2);
    }
    
    // Utility functions
    function getConfig() {
      const documentId = documentIdInput.value.trim();
      const workspaceId = workspaceIdInput.value.trim();
      const elementId = elementIdInput.value.trim();
      const serverUrl = serverUrlInput.value.trim();
      
      if (!documentId || !workspaceId || !elementId) {
        alert('Please enter Document ID, Workspace ID, and Element ID');
        return null;
      }
      
      return {
        documentId,
        workspaceId,
        elementId,
        serverUrl: serverUrl || 'http://localhost:3000'
      };
    }
    
    async function makeApiCall(method, endpoint, body = null) {
      try {
        const config = getConfig();
        if (!config) return;
        
        const url = `${config.serverUrl}${endpoint}`;
        
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        if (body && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(body);
        }
        
        logToConsole(method, url, 'PENDING', body);
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        logToConsole(method, url, response.status, data);
        
        return {
          status: response.status,
          data
        };
      } catch (error) {
        logToConsole(method, endpoint, 'ERROR', error.message);
        console.error('API call error:', error);
        return {
          status: 'ERROR',
          data: { error: error.message }
        };
      }
    }
    
    // Health check function
    async function checkHealth() {
      try {
        const config = getConfig();
        const response = await fetch(`${config.serverUrl}/auth/health`);
        const data = await response.json();
        
        logToConsole('GET', '/auth/health', response.status, data);
        
        if (!data.authenticated) {
          alert('Warning: Onshape API authentication failed. Please check your API credentials.');
        } else if (!data.permissions.hasSufficientPermissions) {
          alert(`Warning: Missing required OAuth scopes: ${data.permissions.requiredScopes.join(', ')}\n\nPlease update your API key permissions in the Onshape portal.`);
        } else {
          // Log successful authentication with user info
          logToConsole('INFO', 'Authentication', 200, {
            message: 'Successfully authenticated with Onshape API',
            user: data.user.name,
            email: data.user.email,
            roles: data.user.roles,
            permissions: data.permissions
          });
        }
      } catch (error) {
        logToConsole('GET', '/auth/health', 500, { error: error.message });
        alert('Health check failed. Please check the console for details.');
      }
    }
    
    // Run health check on page load
    checkHealth();
    
    // Event listeners for buttons
    clearLogBtn.addEventListener('click', function() {
      logArea.innerHTML = '';
    });
    
    healthCheckBtn.addEventListener('click', checkHealth);
    
    getDefaultPlanesBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      await makeApiCall('GET', `/planes/kd_default_planes/${config.documentId}/${config.workspaceId}/${config.elementId}`);
    });
    
    createSketchBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      const plane = document.getElementById('sketchPlane').value;
      
      // Create an empty sketch
      const sketchData = {
        entities: [],
        constraints: []
      };
      
      const response = await makeApiCall(
        'POST',
        `/planes/kd_create_sketch/${config.documentId}/${config.workspaceId}/${config.elementId}`,
        {
          planeName: plane,
          sketchData
        }
      );

      if (response.status === 200 && response.data.featureId) {
        // Update the add circle form with the new sketch ID
        document.getElementById('addCircleSketchId').value = response.data.featureId;
      }
    });
    
    createExtrudeBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      const sketchId = document.getElementById('extrudeSketchId').value.trim();
      const circleId = document.getElementById('extrudeCircleId').value.trim();
      const depth = document.getElementById('extrudeDepth').value.trim();
      
      if (!sketchId || !circleId) {
        alert('Please enter both Sketch ID and Circle Entity ID');
        return;
      }
      
      await makeApiCall(
        'POST',
        `/planes/kd_extrude_sketch/${config.documentId}/${config.workspaceId}/${config.elementId}`,
        {
          sketchId,
          circleId,
          height: parseFloat(depth) || 1.0
        }
      );
    });
    
    createCompleteBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      const plane = document.getElementById('completePlane').value;
      const depth = document.getElementById('completeDepth').value.trim();
      
      // Circle sketch data
      const sketchData = {
        entities: [
          {
            type: 4,
            typeName: 'BTMSketchCurveCircle',
            message: {
              centerX: 0,
              centerY: 0,
              radius: 1.0,
              parameter: 'circle1'
            }
          }
        ],
        constraints: []
      };
      
      await makeApiCall(
        'POST',
        `/planes/kd_create_complete_feature/${config.documentId}/${config.workspaceId}/${config.elementId}`,
        {
          planeName: plane,
          sketchData,
          featureParams: {
            type: 'extrude',
            depth: parseFloat(depth) || 1.0,
            direction: 'OneDirection',
            endType: 'Blind',
            solid: true
          }
        }
      );
    });
    
    // Add circle to sketch button
    addCircleBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      const sketchId = document.getElementById('addCircleSketchId').value.trim();
      const radius = parseFloat(document.getElementById('addCircleRadius').value.trim()) || 1.0;
      const centerX = parseFloat(document.getElementById('addCircleCenterX').value.trim()) || 0;
      const centerY = parseFloat(document.getElementById('addCircleCenterY').value.trim()) || 0;
      
      if (!sketchId) {
        alert('Please enter a Sketch ID');
        return;
      }
      
      const response = await makeApiCall(
        'POST',
        `/planes/kd_add_circle/${config.documentId}/${config.workspaceId}/${config.elementId}`,
        {
          sketchId,
          circleData: {
            radius,
            centerX,
            centerY
          }
        }
      );

      if (response.status === 200 && response.data.entities) {
        // Get the circle entity ID from the response
        const circleId = response.data.entities[0].entityId;
        // Update the extrude form with both IDs
        document.getElementById('extrudeSketchId').value = sketchId;
        document.getElementById('extrudeCircleId').value = circleId;
      }
    });
    
    // Initialize with a welcome message
    logArea.innerHTML = '<div class="log-entry"><span class="log-entry-time">[' + 
      new Date().toLocaleTimeString() + 
      ']</span> <span class="log-entry-status log-entry-status-success">READY</span> Onshape API Express interface loaded</div>';
  });