const express = require('express');
const router = express.Router();
const OnshapeApiClient = require('../utils/onshapeApiClient');
const { parseOnshapeUrl } = require('../utils/urlParser');
const logger = require('../utils/logger');

// Create instance of the API client
const apiClient = new OnshapeApiClient();

// Query parameters required for part studio endpoints
const partStudioParams = {
    rollbackBarIndex: -1,
    includeGeometryIds: true,
    noSketchGeometry: false
};

// Endpoint to parse Onshape URL
router.post('/parse', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const { documentId, workspaceId, elementId } = parseOnshapeUrl(url);
        
        // Get the features directly
        const features = await apiClient.callAPI('GET', `/api/v10/partstudios/d/${documentId}/w/${workspaceId}/e/${elementId}/features`, partStudioParams);
        logger.info('Features count:', features.features?.length || 0);

        res.json({
            documentId,
            workspaceId,
            elementId,
            elementType: 'PartStudio', // Since we're getting features, it must be a part studio
            features
        });
    } catch (error) {
        logger.error('Error in parse endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 