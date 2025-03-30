// routes/onshapeProxyRouter.js
const express = require('express');
const router = express.Router();
const OnshapeApiClient = require('../utils/onshapeApiClient');
const logger = require('../utils/logger');

const apiClient = new OnshapeApiClient();

/**
 * Generic proxy route that passes requests through to the Onshape API
 * This preserves the Onshape API structure for pass-through requests
 */
router.all('*', async (req, res) => {
  try {
    const method = req.method;
    const path = req.path;
    const query = req.query;
    const body = req.body;
    
    logger.info(`Proxying ${method} request to Onshape API: ${path}`);
    
    try {
      const response = await apiClient.callAPI(method, path, query, body);
      return res.status(200).json(response);
    } catch (error) {
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else {
        logger.error(`Error proxying request to Onshape: ${error.message}`);
        return res.status(500).json({
          error: {
            message: `Error communicating with Onshape API: ${error.message}`,
            status: 500
          }
        });
      }
    }
  } catch (error) {
    logger.error(`Unhandled error in proxy route: ${error.message}`);
    return res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        status: 500
      }
    });
  }
});

module.exports = router;