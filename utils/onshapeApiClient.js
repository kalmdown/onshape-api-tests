// utils/onshapeApiClient.js
const axios = require('axios');
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

    // Create base64 encoded credentials
    const credentials = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');
    this.basicAuth = `Basic ${credentials}`;
  }

  /**
   * Make an API call to the Onshape API
   * @param {string} method - HTTP method
   * @param {string} path - API endpoint path
   * @param {Object} query - Query parameters
   * @param {Object} body - Request body for POST/PUT requests
   * @param {Object} additionalHeaders - Additional headers to include in the request
   * @returns {Promise<Object>} API response
   */
  async callAPI(method, path, query = {}, body = null, additionalHeaders = {}) {
    try {
      const headers = {
        'Authorization': this.basicAuth,
        'Accept': 'application/json;charset=UTF-8; qs=0.09',
        ...additionalHeaders
      };
      
      const config = {
        method,
        url: `${this.baseUrl}${path}`,
        headers,
        params: query,
        data: (method !== 'GET' && body) ? body : undefined
      };
      
      // Log the API call with more context
      if (method === 'GET') {
        const queryString = Object.keys(query).length > 0 
          ? `?${Object.entries(query).map(([k, v]) => `${k}=${v}`).join('&')}`
          : '';
        logger.logApiCall(`Retrieving data from Onshape API`, method, path + queryString);
      } else {
        logger.logApiCall(`Making ${method} request to Onshape API`, method, path, body);
      }
      
      const response = await axios(config);
      
      // Log the response with more context
      if (method === 'GET') {
        logger.info(`Response from GET ${path}:`, {
          status: response.status,
          data: response.data,
          query: query
        });
      } else {
        logger.info(`Response from ${method} ${path}:`, {
          status: response.status,
          data: response.data
        });
      }
      
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