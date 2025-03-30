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
    
    // Event listeners for buttons
    clearLogBtn.addEventListener('click', function() {
      logArea.innerHTML = '';
    });
    
    healthCheckBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      await makeApiCall('GET', '/kd_health');
    });
    
    getDefaultPlanesBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      await makeApiCall('GET', `/kd_default_planes/${config.documentId}/${config.workspaceId}/${config.elementId}`);
    });
    
    createSketchBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      const plane = document.getElementById('sketchPlane').value;
      
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
        `/kd_create_sketch/${config.documentId}/${config.workspaceId}/${config.elementId}`,
        {
          planeName: plane,
          sketchData
        }
      );
    });
    
    createExtrudeBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      const sketchId = document.getElementById('extrudeSketchId').value.trim();
      const depth = document.getElementById('extrudeDepth').value.trim();
      
      if (!sketchId) {
        alert('Please enter a Sketch ID');
        return;
      }
      
      const featureParams = {
        type: 'extrude',
        depth: parseFloat(depth) || 2.0,
        direction: 'OneDirection',
        endType: 'Blind',
        solid: true
      };
      
      await makeApiCall(
        'POST',
        `/kd_create_feature/${config.documentId}/${config.workspaceId}/${config.elementId}`,
        {
          sketchId,
          featureParams
        }
      );
    });
    
    createCompleteBtn.addEventListener('click', async function() {
      const config = getConfig();
      if (!config) return;
      
      const plane = document.getElementById('completePlane').value;
      const depth = document.getElementById('completeDepth').value.trim();
      
      // Rectangle sketch data
      const sketchData = {
        entities: [
          // Rectangle centered at origin
          {
            type: 2,
            typeName: 'BTMSketchCurveSegment',
            message: {
              startPointX: -1.0,
              startPointY: -1.0,
              endPointX: 1.0,
              endPointY: -1.0,
              startParam: 0,
              endParam: 1,
              parameter: 'line1'
            }
          },
          {
            type: 2,
            typeName: 'BTMSketchCurveSegment',
            message: {
              startPointX: 1.0,
              startPointY: -1.0,
              endPointX: 1.0,
              endPointY: 1.0,
              startParam: 0,
              endParam: 1,
              parameter: 'line2'
            }
          },
          {
            type: 2,
            typeName: 'BTMSketchCurveSegment',
            message: {
              startPointX: 1.0,
              startPointY: 1.0,
              endPointX: -1.0,
              endPointY: 1.0,
              startParam: 0,
              endParam: 1,
              parameter: 'line3'
            }
          },
          {
            type: 2,
            typeName: 'BTMSketchCurveSegment',
            message: {
              startPointX: -1.0,
              startPointY: 1.0,
              endPointX: -1.0,
              endPointY: -1.0,
              startParam: 0,
              endParam: 1,
              parameter: 'line4'
            }
          }
        ],
        constraints: []
      };
      
      const featureParams = {
        type: 'extrude',
        depth: parseFloat(depth) || 1.5,
        direction: 'OneDirection',
        endType: 'Blind',
        solid: true
      };
      
      await makeApiCall(
        'POST',
        `/kd_create_complete_feature/${config.documentId}/${config.workspaceId}/${config.elementId}`,
        {
          planeName: plane,
          sketchData,
          featureParams
        }
      );
    });
  
    // Initialize with a welcome message
    logArea.innerHTML = '<div class="log-entry"><span class="log-entry-time">[' + 
      new Date().toLocaleTimeString() + 
      ']</span> <span class="log-entry-status log-entry-status-success">READY</span> Onshape API Express interface loaded</div>';
  });