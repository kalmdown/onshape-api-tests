// server.js - Main Express application
const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const axios = require('axios');
const cors = require('cors');
const { 
  createHmac, 
  randomBytes, 
  createHash 
} = require('crypto');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Onshape API Configuration
const ONSHAPE_BASE_URL = process.env.ONSHAPE_BASE_URL || 'https://cad.onshape.com';
const ONSHAPE_API_KEY = process.env.ONSHAPE_API_KEY;
const ONSHAPE_SECRET = process.env.ONSHAPE_SECRET;

// Utility functions for Onshape API authentication
const buildHeaders = (method, path, query = {}, contentType = 'application/json') => {
  const date = new Date().toUTCString();
  const nonce = randomBytes(16).toString('hex');
  
  // Build the normalized query string
  const queryString = Object.keys(query)
    .sort()
    .map(key => `${key}=${encodeURIComponent(query[key])}`)
    .join('&');
  
  const hmacString = [
    method,
    nonce,
    date,
    contentType,
    path,
    queryString
  ].join('\n').toLowerCase();
  
  const signature = createHmac('sha256', ONSHAPE_SECRET)
    .update(hmacString)
    .digest('base64');
  
  return {
    'Content-Type': contentType,
    'Date': date,
    'On-Nonce': nonce,
    'Authorization': `On ${ONSHAPE_API_KEY}:${signature}`,
    'Accept': 'application/json'
  };
};

// =======================================
// Default Planes Access Implementation
// =======================================

// Route to get default plane IDs
app.get('/kd_default_planes/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    
    const defaultPlanes = await getDefaultPlaneIds(did, wid, eid);
    
    res.json({
      success: true,
      defaultPlanes
    });
  } catch (error) {
    console.error('Error getting default planes:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get default planes',
      error: error.message
    });
  }
});

// Function to get transient IDs for default planes (Top, Front, Right)
async function getDefaultPlaneIds(did, wid, eid) {
  const path = `/api/v6/partstudios/d/${did}/w/${wid}/e/${eid}/featurescript`;
  const query = { rollbackBarIndex: -1 };
  
  const headers = buildHeaders('POST', path, query);
  
  // This script gets IDs for all three default planes
  const requestBody = {
    script: `
      function(context is Context, queries) {
        const results = {};
        
        // Get Top plane ID
        results.top = transientQueriesToStrings(
          evaluateQuery(context, qCreatedBy(makeId("Top"), EntityType.FACE))
        );
        
        // Get Front plane ID
        results.front = transientQueriesToStrings(
          evaluateQuery(context, qCreatedBy(makeId("Front"), EntityType.FACE))
        );
        
        // Get Right plane ID
        results.right = transientQueriesToStrings(
          evaluateQuery(context, qCreatedBy(makeId("Right"), EntityType.FACE))
        );
        
        return results;
      }
    `
  };
  
  try {
    const response = await axios({
      method: 'POST',
      url: `${ONSHAPE_BASE_URL}${path}`,
      headers,
      params: query,
      data: requestBody
    });
    
    return response.data.result;
  } catch (error) {
    console.error('Error evaluating FeatureScript:', error.response?.data || error.message);
    throw new Error(`Failed to get default plane IDs: ${error.message}`);
  }
}

// Function to create a sketch on a default plane
async function createSketchOnDefaultPlane(did, wid, eid, planeId, sketchData) {
  const path = `/api/v6/partstudios/d/${did}/w/${wid}/e/${eid}/features`;
  const headers = buildHeaders('POST', path);
  
  // Build the feature creation request body
  const requestBody = {
    feature: {
      type: 151, // BTMSketch type
      typeName: "BTMSketch",
      message: {
        entities: sketchData.entities || [],
        constraints: sketchData.constraints || [],
        parameters: [
          {
            type: 148,
            typeName: "BTMParameterQueryList",
            message: {
              queries: [
                {
                  type: 138,
                  typeName: "BTMIndividualQuery",
                  message: {
                    geometryIds: [planeId]
                  }
                }
              ]
            }
          }
        ]
      }
    }
  };
  
  try {
    const response = await axios({
      method: 'POST',
      url: `${ONSHAPE_BASE_URL}${path}`,
      headers,
      data: requestBody
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating sketch:', error.response?.data || error.message);
    throw new Error(`Failed to create sketch: ${error.message}`);
  }
}

// Route to create a new sketch on a default plane
app.post('/kd_create_sketch/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    const { planeName, sketchData } = req.body;
    
    // Get default plane IDs
    const defaultPlanes = await getDefaultPlaneIds(did, wid, eid);
    
    // Select the correct plane ID based on the requested plane name
    let planeId;
    switch(planeName.toLowerCase()) {
      case 'top':
        planeId = defaultPlanes.top[0]; // Take the first ID from the array
        break;
      case 'front':
        planeId = defaultPlanes.front[0];
        break;
      case 'right':
        planeId = defaultPlanes.right[0];
        break;
      default:
        throw new Error(`Invalid plane name: ${planeName}. Must be one of: top, front, right`);
    }
    
    if (!planeId) {
      throw new Error(`Could not find ID for plane: ${planeName}`);
    }
    
    // Create the sketch on the selected plane
    const result = await createSketchOnDefaultPlane(did, wid, eid, planeId, sketchData);
    
    res.json({
      success: true,
      message: `Sketch created on ${planeName} plane`,
      featureId: result.id
    });
  } catch (error) {
    console.error('Error creating sketch on default plane:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create sketch',
      error: error.message
    });
  }
});

// Pass through routes to Onshape API - follow Onshape API structure
app.use('/api/*', async (req, res) => {
  try {
    const path = req.path;
    const method = req.method;
    const query = req.query;
    const body = req.body;
    
    const headers = buildHeaders(method, path, query);
    
    const response = await axios({
      method,
      url: `${ONSHAPE_BASE_URL}${path}`,
      headers,
      params: query,
      data: method !== 'GET' ? body : undefined
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { message: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;