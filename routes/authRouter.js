const express = require('express');
const router = express.Router();
const OnshapeApiClient = require('../utils/onshapeApiClient');
const logger = require('../utils/logger');

// Create instance of the API client
const apiClient = new OnshapeApiClient();

/**
 * @route   GET /auth/health
 * @desc    Check if the API is running and authenticated with Onshape
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const sessionInfo = await apiClient.callAPI('GET', '/api/v10/users/sessioninfo', {}, null, {
      'Accept': 'application/json;charset=UTF-8; qs=0.09'
    });

    logger.info('Session info response:', sessionInfo);

    // Check if we have the special value 4103 which grants all main permissions
    const hasAllPermissions = sessionInfo.oauth2Scopes === 4103;
    
    // Define the required scopes
    const requiredScopes = ['OAuth2Read', 'OAuth2Write', 'OAuth2ReadPII'];
    
    // Determine if we have sufficient permissions
    const hasSufficientPermissions = hasAllPermissions;
    
    // Build the response
    const response = {
      status: 'ok',
      authenticated: true,
      permissions: {
        hasAllPermissions,
        hasSufficientPermissions,
        requiredScopes,
        grantedScopes: hasAllPermissions ? 'All permissions granted (4103)' : []
      },
      user: {
        name: sessionInfo.name,
        email: sessionInfo.email,
        roles: sessionInfo.roles
      }
    };

    if (!hasSufficientPermissions) {
      response.status = 'warning';
      response.message = 'Missing required OAuth scopes';
      logger.warn('Missing required OAuth scopes');
    }

    res.json(response);
  } catch (error) {
    logger.error('Health check failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router; 