require('dotenv').config();
const OnshapeApiClient = require('./utils/onshapeApiClient');
const logger = require('./utils/logger');

async function testSession() {
  try {
    const apiClient = new OnshapeApiClient();
    
    console.log('\nTesting /api/v10/users/sessioninfo endpoint:');
    try {
      const sessionInfoResponse = await apiClient.callAPI('GET', '/api/v10/users/sessioninfo', {}, null, {
        'Accept': 'application/json;charset=UTF-8; qs=0.09'
      });
      console.log('Session Info Response:', JSON.stringify(sessionInfoResponse, null, 2));
    } catch (error) {
      console.error('Session Info Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  } catch (error) {
    console.error('General Error:', error.message);
  }
}

testSession(); 