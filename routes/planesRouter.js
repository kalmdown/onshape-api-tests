// routes/planesRouter.js
const express = require('express');
const router = express.Router();
const OnshapePlanesUtil = require('../utils/onshapePlanesUtil');
const OnshapeApiClient = require('../utils/onshapeApiClient');
const logger = require('../utils/logger');

// Create instances of the utilities
const apiClient = new OnshapeApiClient();
const planesUtil = new OnshapePlanesUtil(apiClient);

/**
 * @route   GET /kd_default_planes/:did/:wid/:eid
 * @desc    Get default plane IDs (Top, Front, Right)
 * @access  Public
 */
router.get('/kd_default_planes/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    
    logger.info(`Request to get default planes for d/${did}/w/${wid}/e/${eid}`);
    
    // Validate parameters
    if (!did || !wid || !eid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
        required: ['did', 'wid', 'eid']
      });
    }
    
    const defaultPlanes = await planesUtil.getDefaultPlaneIds(did, wid, eid);
    
    res.json({
      success: true,
      message: 'Default planes retrieved successfully',
      data: {
        documentId: did,
        workspaceId: wid,
        elementId: eid,
        defaultPlanes
      }
    });
  } catch (error) {
    logger.error(`Error getting default planes: ${error.message}`);
    
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'API request failed';
      
      return res.status(status).json({
        success: false,
        message,
        error: error.message,
        details: error.response.data
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Failed to get default planes',
      error: error.message
    });
  }
});

/**
 * @route   POST /kd_create_sketch/:did/:wid/:eid
 * @desc    Create a new sketch on a default plane
 * @access  Public
 */
router.post('/kd_create_sketch/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    const { planeName, sketchData } = req.body;

    if (!planeName || !sketchData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: planeName and sketchData'
      });
    }

    const result = await planesUtil.createSketchOnDefaultPlane(did, wid, eid, planeName, sketchData);
    
    res.json({
      success: true,
      message: `Sketch created on ${planeName} plane`,
      featureId: result.featureId
    });
  } catch (error) {
    logger.error('Error in create sketch endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sketch',
      error: error.message
    });
  }
});

/**
 * @route   POST /kd_create_feature/:did/:wid/:eid
 * @desc    Create a feature (extrude, revolve) on a sketch
 * @access  Public
 */
router.post('/kd_create_feature/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    const { sketchId, featureParams } = req.body;
    
    if (!sketchId) {
      return res.status(400).json({
        success: false,
        message: 'Sketch ID is required'
      });
    }
    
    if (!featureParams || !featureParams.type) {
      return res.status(400).json({
        success: false,
        message: 'Feature parameters and type are required'
      });
    }
    
    logger.info(`Request to create ${featureParams.type} feature on sketch ${sketchId} for d/${did}/w/${wid}/e/${eid}`);
    
    const result = await planesUtil.createFeatureOnSketch(
      did, wid, eid, sketchId, featureParams
    );
    
    res.json({
      success: true,
      message: `${featureParams.type} feature created successfully`,
      featureId: result.featureId || result.id
    });
  } catch (error) {
    logger.error(`Error creating feature: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Failed to create ${req.body.featureParams?.type || 'feature'}`,
      error: error.message
    });
  }
});

/**
 * @route   POST /kd_create_complete_feature/:did/:wid/:eid
 * @desc    Create a complete feature from sketch to final feature in one request
 * @access  Public
 */
router.post('/kd_create_complete_feature/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    const { planeName, sketchData, featureParams } = req.body;
    
    if (!planeName) {
      return res.status(400).json({
        success: false,
        message: 'Plane name is required'
      });
    }
    
    if (!featureParams || !featureParams.type) {
      return res.status(400).json({
        success: false,
        message: 'Feature parameters and type are required'
      });
    }
    
    logger.info(`Request to create complete feature on ${planeName} plane for d/${did}/w/${wid}/e/${eid}`);
    
    // Step 1: Create the sketch on the default plane
    const sketchResult = await planesUtil.createSketchOnDefaultPlane(
      did, wid, eid, planeName, sketchData || {}
    );
    
    const sketchId = sketchResult.featureId || sketchResult.id;
    
    // Step 2: Create the feature using the sketch
    const featureResult = await planesUtil.createFeatureOnSketch(
      did, wid, eid, sketchId, featureParams
    );
    
    res.json({
      success: true,
      message: `Complete feature created successfully`,
      sketchId,
      featureId: featureResult.featureId || featureResult.id
    });
  } catch (error) {
    logger.error(`Error creating complete feature: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to create complete feature',
      error: error.message
    });
  }
});

// Extrude a sketch
router.post('/kd_extrude_sketch/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    const { sketchId, circleId, height } = req.body;

    if (!sketchId || !circleId || height === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: sketchId, circleId, and height'
      });
    }

    const result = await planesUtil.extrudeSketch(did, wid, eid, sketchId, circleId, height);
    
    res.json({
      success: true,
      message: 'Sketch extruded successfully',
      featureId: result.featureId
    });
  } catch (error) {
    logger.error('Error in extrude sketch endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extrude sketch',
      error: error.message
    });
  }
});

/**
 * @route   POST /kd_add_circle/:did/:wid/:eid
 * @desc    Add a circle to an existing sketch
 * @access  Public
 */
router.post('/kd_add_circle/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    const { sketchId, circleData } = req.body;

    if (!sketchId || !circleData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: sketchId and circleData'
      });
    }

    const result = await planesUtil.addCircleToSketch(did, wid, eid, sketchId, circleData);
    
    res.json({
      success: true,
      message: 'Circle added to sketch successfully',
      entities: result
    });
  } catch (error) {
    logger.error('Error in add circle endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add circle to sketch',
      error: error.message
    });
  }
});

/**
 * @route   GET /kd_get_sketches/:did/:wid/:eid
 * @desc    Get all sketches from a part studio
 * @access  Public
 */
router.get('/kd_get_sketches/:did/:wid/:eid', async (req, res) => {
  try {
    const { did, wid, eid } = req.params;
    
    logger.info(`Request to get sketches for d/${did}/w/${wid}/e/${eid}`);
    
    // Validate parameters
    if (!did || !wid || !eid) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
        required: ['did', 'wid', 'eid']
      });
    }
    
    const sketches = await planesUtil.getSketches(did, wid, eid);
    
    res.json({
      success: true,
      message: 'Sketches retrieved successfully',
      data: {
        documentId: did,
        workspaceId: wid,
        elementId: eid,
        sketches
      }
    });
  } catch (error) {
    logger.error(`Error getting sketches: ${error.message}`);
    
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'API request failed';
      
      return res.status(status).json({
        success: false,
        message,
        error: error.message,
        details: error.response.data
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Failed to get sketches',
      error: error.message
    });
  }
});

module.exports = router;