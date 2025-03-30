# Onshape API Express.js Application

This Express.js application provides a stable and consistent way to interact with the Onshape API, focusing specifically on accessing default planes when posting new features.

## Features

- Access default planes (Top, Front, Right) for use in feature creation
- Create sketches on default planes
- Generate features from sketches (extrude, revolve)
- Proxy pass-through to Onshape API endpoints
- Custom internal routes prefixed with `kd_`
- Comprehensive error handling and logging

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/onshape-api-express.git
   cd onshape-api-express
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your Onshape API credentials:
   ```
   ONSHAPE_API_KEY=your_api_key
   ONSHAPE_SECRET=your_secret_key
   ```

5. Start the server:
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

## Usage Examples

### 1. Get Default Plane IDs

```javascript
// Example: Get IDs for default planes (Top, Front, Right)
const getDefaultPlanes = async () => {
  const did = 'your_document_id';
  const wid = 'your_workspace_id';
  const eid = 'your_element_id';
  
  try {
    const response = await fetch(`http://localhost:3000/kd_default_planes/${did}/${wid}/${eid}`);
    const data = await response.json();
    console.log('Default planes:', data.defaultPlanes);
    return data.defaultPlanes;
  } catch (error) {
    console.error('Error getting default planes:', error);
  }
};
```

### 2. Create a Sketch on a Default Plane

```javascript
// Example: Create a sketch on the Top plane
const createSketch = async () => {
  const did = 'your_document_id';
  const wid = 'your_workspace_id';
  const eid = 'your_element_id';
  
  const sketchData = {
    entities: [
      // Circle in the center
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
  
  try {
    const response = await fetch(`http://localhost:3000/kd_create_sketch/${did}/${wid}/${eid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        planeName: 'top',
        sketchData
      })
    });
    
    const data = await response.json();
    console.log('Sketch created:', data);
    return data.featureId;
  } catch (error) {
    console.error('Error creating sketch:', error);
  }
};
```

### 3. Create an Extrude Feature from a Sketch

```javascript
// Example: Create an extrude feature from a sketch
const createExtrude = async (sketchId) => {
  const did = 'your_document_id';
  const wid = 'your_workspace_id';
  const eid = 'your_element_id';
  
  const featureParams = {
    type: 'extrude',
    depth: 2.0,
    direction: 'OneDirection',
    endType: 'Blind',
    solid: true
  };
  
  try {
    const response = await fetch(`http://localhost:3000/kd_create_feature/${did}/${wid}/${eid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sketchId,
        featureParams
      })
    });
    
    const data = await response.json();
    console.log('Extrude feature created:', data);
    return data.featureId;
  } catch (error) {
    console.error('Error creating extrude feature:', error);
  }
};
```

### 4. Create a Complete Feature (Sketch + Extrude) in One Request

```javascript
// Example: Create a complete feature (sketch on a plane + extrude) in one request
const createCompleteFeature = async () => {
  const did = 'your_document_id';
  const wid = 'your_workspace_id';
  const eid = 'your_element_id';
  
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
    depth: 1.5,
    direction: 'OneDirection',
    endType: 'Blind',
    solid: true
  };
  
  try {
    const response = await fetch(`http://localhost:3000/kd_create_complete_feature/${did}/${wid}/${eid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        planeName: 'top',
        sketchData,
        featureParams
      })
    });
    
    const data = await response.json();
    console.log('Complete feature created:', data);
    return {
      sketchId: data.sketchId,
      featureId: data.featureId
    };
  } catch (error) {
    console.error('Error creating complete feature:', error);
  }
};
```

## API Endpoints

### Internal Routes (prefixed with `kd_`)

- `GET /kd_default_planes/:did/:wid/:eid` - Get IDs for default planes (Top, Front, Right)
- `POST /kd_create_sketch/:did/:wid/:eid` - Create a sketch on a default plane
- `POST /kd_create_feature/:did/:wid/:eid` - Create a feature (extrude, revolve) on a sketch
- `POST /kd_create_complete_feature/:did/:wid/:eid` - Create a complete feature in one request
- `GET /kd_health` - Health check endpoint

### Pass-through Routes

- `/api/*` - All Onshape API endpoints are accessible through pass-through routes

## Project Structure

```
onshape-api-express/
├── app.js             # Main application file
├── package.json       # Project dependencies and scripts
├── .env.example       # Example environment variables
├── logs/              # Log files directory
├── routes/            # Route handlers
│   ├── planesRouter.js       # Default planes and feature creation routes
│   └── onshapeProxyRouter.js # Pass-through routes to Onshape API
└── utils/             # Utility modules
    ├── onshapeApiClient.js   # API client for Onshape
    ├── onshapePlanesUtil.js  # Utilities for default planes and features
    └── logger.js             # Logging utility
```

## Security Considerations

- API keys and secrets are stored in environment variables
- HTTPS is recommended for production deployments
- Rate limiting is implemented to prevent abuse
- Helmet.js is used for HTTP header security

## License

MIT