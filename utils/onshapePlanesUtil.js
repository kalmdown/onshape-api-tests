// utils/onshapePlanesUtil.js
const axios = require('axios');
const logger = require('./logger');

class OnshapePlanesUtil {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get IDs for all default planes (Top, Front, Right)
   * @param {string} did - Document ID
   * @param {string} wid - Workspace ID
   * @param {string} eid - Element ID
   * @returns {Promise<Object>} Object containing plane IDs
   */
  async getDefaultPlaneIds(did, wid, eid) {
    try {
      logger.info(`Getting default plane IDs for document ${did}, workspace ${wid}, element ${eid}`);
      
      // Return the known deterministic IDs for the default planes
      const planeIds = {
        top: ["JDC"],
        front: ["JCC"],
        right: ["JEC"]
      };

      logger.info('Default plane IDs retrieved successfully:', planeIds);
      return planeIds;
    } catch (error) {
      logger.error(`Error getting default plane IDs: ${error.message}`);
      if (error.response) {
        logger.error('API Error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  /**
   * Create a sketch on a specified default plane
   * @param {string} did - Document ID
   * @param {string} wid - Workspace ID
   * @param {string} eid - Element ID
   * @param {string} planeName - Plane name ('top', 'front', or 'right')
   * @returns {Promise<Object>} Created feature information
   */
  async createSketchOnDefaultPlane(did, wid, eid, planeName) {
    try {
      // Get default plane IDs
      const defaultPlanes = await this.getDefaultPlaneIds(did, wid, eid);
      
      // Select the correct plane ID based on the requested plane name
      let planeId;
      switch(planeName) {
        case 'Top':
          planeId = defaultPlanes.top[0]; // Take the first ID from the array
          break;
        case 'Front':
          planeId = defaultPlanes.front[0];
          break;
        case 'Right':
          planeId = defaultPlanes.right[0];
          break;
        default:
          throw new Error(`Invalid plane name: ${planeName}. Must be one of: Top, Front, Right`);
      }
      
      logger.info(`Creating sketch on ${planeName} plane with ID ${planeId}`);
      
      // Build the feature creation request for an empty sketch
      const requestBody = {
        feature: {
          btType: "BTMSketch-151",
          featureType: "newSketch",
          name: "Sketch 1",
          parameters: [
            {
              btType: "BTMParameterQueryList-148",
              queries: [
                {
                  btType: "BTMIndividualQuery-138",
                  deterministicIds: [planeId]
                }
              ],
              parameterId: "sketchPlane"
            }
          ],
          entities: [],
          constraints: []
        }
      };
      
      const url = `/api/v10/partstudios/d/${did}/w/${wid}/e/${eid}/features`;
      logger.logApiCall('Creating sketch on default plane', 'POST', url, requestBody);
      
      const response = await this.apiClient.callAPI('POST', url, {}, requestBody);

      if (!response || !response.feature) {
        logger.error('Invalid API response:', response);
        throw new Error('Invalid response from Onshape API');
      }

      logger.info('Sketch created successfully:', response.feature);
      return response.feature;
    } catch (error) {
      logger.error(`Error creating sketch on default plane: ${error.message}`);
      if (error.response) {
        logger.error('API Error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  /**
   * Create a feature (like extrude) on a sketch
   * @param {string} did - Document ID
   * @param {string} wid - Workspace ID
   * @param {string} eid - Element ID
   * @param {string} sketchId - ID of the sketch to use for the feature
   * @param {Object} featureParams - Parameters for the feature
   * @returns {Promise<Object>} Created feature information
   */
  async createFeatureOnSketch(did, wid, eid, sketchId, featureParams) {
    try {
      logger.info(`Creating feature on sketch ${sketchId}`);
      
      // Build the feature creation request based on feature type
      let requestBody;
      
      if (featureParams.type === 'extrude') {
        requestBody = this._buildExtrudeFeature(sketchId, featureParams);
      } else if (featureParams.type === 'revolve') {
        requestBody = this._buildRevolveFeature(sketchId, featureParams);
      } else {
        throw new Error(`Unsupported feature type: ${featureParams.type}`);
      }
      
      const response = await this.apiClient.callAPI('POST', 
        `/api/v6/partstudios/d/${did}/w/${wid}/e/${eid}/features`, 
        {}, 
        requestBody
      );
      
      logger.info(`Feature created successfully on sketch ${sketchId}`);
      return response;
    } catch (error) {
      logger.error(`Error creating feature on sketch: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build the request body for an extrude feature
   * @private
   * @param {string} sketchId - ID of the sketch to extrude
   * @param {Object} params - Extrude parameters
   * @returns {Object} Request body for extrude feature
   */
  _buildExtrudeFeature(sketchId, params) {
    return {
      feature: {
        type: 138,
        typeName: "BTMFeature",
        message: {
          featureType: "extrude",
          featureId: "",
          name: params.name || "Extrude 1",
          parameters: [
            {
              type: 147,
              typeName: "BTMParameterQuantity",
              message: {
                expression: `${params.depth || "1.0"} * inch`,
                parameterId: "",
                parameter: "depth"
              }
            },
            {
              type: 148,
              typeName: "BTMParameterQueryList",
              message: {
                queries: [
                  {
                    type: 138,
                    typeName: "BTMIndividualQuery",
                    message: {
                      featureId: sketchId,
                      isEntireFeature: true
                    }
                  }
                ],
                parameterId: "",
                parameter: "entities"
              }
            },
            {
              type: 146,
              typeName: "BTMParameterEnum",
              message: {
                enumValue: params.direction || "OneDirection",
                parameterId: "",
                parameter: "direction"
              }
            },
            {
              type: 146,
              typeName: "BTMParameterEnum",
              message: {
                enumValue: params.endType || "Blind",
                parameterId: "",
                parameter: "endType"
              }
            },
            {
              type: 145,
              typeName: "BTMParameterBoolean",
              message: {
                value: params.solid !== false, // Default to true
                parameterId: "",
                parameter: "solid"
              }
            }
          ]
        }
      }
    };
  }

  /**
   * Build the request body for a revolve feature
   * @private
   * @param {string} sketchId - ID of the sketch to revolve
   * @param {Object} params - Revolve parameters
   * @returns {Object} Request body for revolve feature
   */
  _buildRevolveFeature(sketchId, params) {
    return {
      feature: {
        type: 138,
        typeName: "BTMFeature",
        message: {
          featureType: "revolve",
          featureId: "",
          name: params.name || "Revolve 1",
          parameters: [
            {
              type: 147,
              typeName: "BTMParameterQuantity",
              message: {
                expression: `${params.angle || "360.0"} * degree`,
                parameterId: "",
                parameter: "angle"
              }
            },
            {
              type: 148,
              typeName: "BTMParameterQueryList",
              message: {
                queries: [
                  {
                    type: 138,
                    typeName: "BTMIndividualQuery",
                    message: {
                      featureId: sketchId,
                      isEntireFeature: true
                    }
                  }
                ],
                parameterId: "",
                parameter: "entities"
              }
            },
            {
              type: 148,
              typeName: "BTMParameterQueryList",
              message: {
                queries: [
                  {
                    type: 138,
                    typeName: "BTMIndividualQuery",
                    message: {
                      geometryIds: [params.axisEntityId]
                    }
                  }
                ],
                parameterId: "",
                parameter: "axis"
              }
            },
            {
              type: 145,
              typeName: "BTMParameterBoolean",
              message: {
                value: params.solid !== false, // Default to true
                parameterId: "",
                parameter: "solid"
              }
            }
          ]
        }
      }
    };
  }

  async extrudeSketch(did, wid, eid, sketchId, circleId, height) {
    try {
      logger.info(`Extruding circle ${circleId} from sketch ${sketchId}`);
      
      // Create the extrude feature using the circle's region
      const extrudeBody = {
        btType: "BTFeatureDefinitionCall-1406",
        feature: {
          btType: "BTMFeature-134",
          featureType: "extrude",
          name: "Extrude 1",
          parameters: [
            {
              btType: "BTMParameterEnum-145",
              value: "SOLID",
              enumName: "ExtendedToolBodyType",
              parameterId: "bodyType"
            },
            {
              btType: "BTMParameterEnum-145",
              value: "NEW",
              enumName: "NewBodyOperationType",
              parameterId: "operationType"
            },
            {
              btType: "BTMParameterQueryList-148",
              queries: [
                {
                  btType: "BTMIndividualSketchRegionQuery-140",
                  featureId: sketchId,
                  entityId: circleId
                }
              ],
              parameterId: "entities"
            },
            {
              btType: "BTMParameterEnum-145",
              value: "BLIND",
              enumName: "BoundingType",
              parameterId: "endBound"
            },
            {
              btType: "BTMParameterQuantity-147",
              expression: `${height} in`,
              parameterId: "depth"
            }
          ],
          returnAfterSubfeatures: false,
          suppressed: false
        }
      };

      const url = `/api/v10/partstudios/d/${did}/w/${wid}/e/${eid}/features`;
      logger.logApiCall('Extruding sketch', 'POST', url, extrudeBody);
      
      const response = await this.apiClient.callAPI('POST', url, {}, extrudeBody);

      if (!response || !response.feature) {
        logger.error('Invalid API response:', response);
        throw new Error('Invalid response from Onshape API');
      }

      logger.info('Extrusion created successfully:', response.feature);
      return response.feature;
    } catch (error) {
      logger.error(`Error extruding sketch: ${error.message}`);
      if (error.response) {
        logger.error('API Error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  /**
   * Get details of a specific sketch
   * @param {string} did - Document ID
   * @param {string} wid - Workspace ID
   * @param {string} eid - Element ID
   * @param {string} sketchId - ID of the sketch to get details for
   * @returns {Promise<Object>} Sketch details
   */
  async getSketchDetails(did, wid, eid, sketchId) {
    try {
      logger.info(`Getting details for sketch ${sketchId}`);
      
      // Get all features and find the sketch
      const url = `/api/v10/partstudios/d/${did}/w/${wid}/e/${eid}/features`;
      logger.logApiCall('Getting features', 'GET', url);
      
      const response = await this.apiClient.callAPI('GET', url, {});
      
      if (!response || !response.features) {
        logger.error('Invalid API response:', response);
        throw new Error('Invalid response from Onshape API');
      }

      // Find the specific sketch
      const sketch = response.features.find(feature => feature.featureId === sketchId);
      if (!sketch) {
        throw new Error(`Sketch with ID ${sketchId} not found`);
      }

      logger.info('Sketch details retrieved successfully');
      return sketch;
    } catch (error) {
      logger.error(`Error getting sketch details: ${error.message}`);
      if (error.response) {
        logger.error('API Error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  /**
   * Add a circle to an existing sketch
   * @param {string} did - Document ID
   * @param {string} wid - Workspace ID
   * @param {string} eid - Element ID
   * @param {string} sketchId - ID of the sketch to add the circle to
   * @param {Object} circleData - Circle parameters (radius, center coordinates)
   * @returns {Promise<Object>} Created circle entity information
   */
  async addCircleToSketch(did, wid, eid, sketchId, circleData) {
    try {
      logger.info(`Adding circle to sketch ${sketchId}`);
      
      // Generate a unique entity ID for the circle
      const entityId = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
      
      // Build the request body for adding a circle to the sketch
      const requestBody = {
        feature: {
          btType: "BTMFeature-141",
          featureType: "sketch",
          name: "Update Sketch",
          suppressed: false,
          featureId: sketchId,
          entities: [
            {
              btType: "BTMSketchCurve-4",
              entityId: entityId,
              geometry: {
                btType: "BTCurveGeometryCircle-115",
                radius: circleData.radius || 0.0127,
                xCenter: circleData.centerX || 0.0,
                yCenter: circleData.centerY || 0.0,
                xDir: 1,
                yDir: 0,
                clockwise: false
              },
              centerId: `${entityId}.center`
            }
          ]
        }
      };

      const url = `/api/v10/partstudios/d/${did}/w/${wid}/e/${eid}/features`;
      logger.logApiCall('Adding circle to sketch', 'POST', url, requestBody);
      
      const response = await this.apiClient.callAPI('POST', url, {}, requestBody);

      if (!response || !response.feature) {
        logger.error('Invalid API response:', response);
        throw new Error('Invalid response from Onshape API');
      }

      logger.info('Circle added successfully');
      return response.feature;
    } catch (error) {
      logger.error(`Error adding circle to sketch: ${error.message}`);
      if (error.response) {
        logger.error('API Error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }

  /**
   * Get all sketches from a part studio
   * @param {string} did - Document ID
   * @param {string} wid - Workspace ID
   * @param {string} eid - Element ID
   * @returns {Promise<Array>} Array of sketch features
   */
  async getSketches(did, wid, eid) {
    try {
      logger.info(`Getting sketches for document ${did}, workspace ${wid}, element ${eid}`);
      
      const url = `/api/v10/partstudios/d/${did}/w/${wid}/e/${eid}/features`;
      logger.logApiCall('Getting features', 'GET', url);
      
      const response = await this.apiClient.callAPI('GET', url, {});
      
      if (!response || !response.features) {
        logger.error('Invalid API response:', response);
        throw new Error('Invalid response from Onshape API');
      }

      // Filter for sketch features
      const sketches = response.features.filter(feature => 
        feature.btType === 'BTMSketch-151' || 
        feature.featureType === 'newSketch'
      );

      logger.info(`Found ${sketches.length} sketches`);
      return sketches;
    } catch (error) {
      logger.error(`Error getting sketches: ${error.message}`);
      if (error.response) {
        logger.error('API Error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }
}

module.exports = OnshapePlanesUtil;