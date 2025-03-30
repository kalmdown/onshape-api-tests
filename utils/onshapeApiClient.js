// utils/onshapeApiClient.js
const axios = require('axios');
const { createHmac, randomBytes } = require('crypto');
const logger = require('./logger');

class OnshapeApiClient {
  constructor() {
    this.baseUrl = process.env.ONSHAPE_BASE_URL || 'https://cad.onshape.com';
    this.apiKey = process.env.ONSHAPE_API_KEY;
    this.secretKey = process.env.ONSHAPE_SECRET;
    
    if (!this.apiKey || !this.secretKey) {
      logger.error('Missing Onshape API credentials');
      throw new Error('Missing Onshape API credentials. Please set ONSHAPE_API_KEY and ONSHAPE_SECRET environment variables.');
    }
  }

  /**
   * Build the authentication headers for Onshape API requests
   * @param {string} method - HTTP method
   * @param {string} path - API endpoint path
   * @param {Object} query - Query parameters
   * @param {string} contentType - Content type
   * @returns {Object} Headers object
   */
  buildAuthHeaders(method, path, query = {}, contentType = 'application/json') {
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
    
    const signature = createHmac('sha256', this.secretKey)
      .update(hmacString)
      .digest('base64');
    
    return {
      'Content-Type': contentType,
      'Date': date,
      'On-Nonce': nonce,
      'Authorization': `On ${this.apiKey}:${signature}`,
      'Accept': 'application/json'
    };
  }

  /**
   * Make an API call to the Onshape API
   * @param {string} method - HTTP method
   * @param {string} path - API endpoint path
   * @param {Object} query - Query parameters
   * @param {Object} body - Request body for POST/PUT requests
   * @returns {Promise<Object>} API response
   */
  async callAPI(method, path, query = {}, body = null) {
    try {
      const headers = this.buildAuthHeaders(method, path, query);
      
      const config = {
        method,
        url: `${this.baseUrl}${path}`,
        headers,
        params: query,
        data: (method !== 'GET' && body) ? body : undefined
      };
      
      logger.debug(`Making ${method} request to ${path}`, { query });
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        logger.error(`API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(`API error: ${error.message}`);
      }
      throw error;
    }
  }
}

module.exports = OnshapeApiClient;