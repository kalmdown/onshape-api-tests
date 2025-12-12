const logger = require('./logger');

/**
 * Parses an Onshape URL to extract document, workspace, and element IDs
 * @param {string} url - The Onshape URL to parse
 * @returns {Object} Object containing documentId, workspaceId, and elementId
 */
function parseOnshapeUrl(url) {
    try {
        logger.info('Parsing URL:', url);
        
        // Create URL object to handle URL parsing
        const urlObj = new URL(url);
        
        // Validate hostname
        if (urlObj.hostname !== 'cad.onshape.com') {
            throw new Error('Not a valid Onshape URL');
        }

        // Split pathname into parts and filter out empty strings
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        // Find indices of key parts
        const docIndex = pathParts.indexOf('documents');
        const workspaceIndex = pathParts.indexOf('w');
        const elementIndex = pathParts.indexOf('e');

        if (docIndex === -1 || workspaceIndex === -1 || elementIndex === -1) {
            throw new Error('Invalid Onshape URL structure');
        }

        const result = {
            documentId: pathParts[docIndex + 1],
            workspaceId: pathParts[workspaceIndex + 1],
            elementId: pathParts[elementIndex + 1]
        };

        logger.info('Parsed URL result:', result);
        return result;
    } catch (error) {
        logger.error('URL parsing error:', error);
        throw new Error('Invalid URL format');
    }
}

module.exports = {
    parseOnshapeUrl
}; 