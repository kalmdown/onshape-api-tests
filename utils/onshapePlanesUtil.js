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
      
      // This script retrieves transient IDs for the default planes
      const script = `
        function(context is Context, queries) {
          const results = {};
          
          // Get Top plane ID
          results.top = transientQueriesToStrings(
            evaluateQuery(context, qCreatedBy(makeId("Top"), EntityType.FACE))
          );
          
          // Get Front plane ID
          results.front = transientQueriesToStrings(
            evaluateQuery(context, qCreatedBy(makeId("Front"), EntityType.FACE))
          );
          
          // Get Right plane ID
          results.right = transientQueriesToStrings(
            evaluateQuery(context, qCreatedBy(makeId("Right"), EntityType.FACE))
          );
          
          return results;
        }
      `;
      
      const response = await this.apiClient.callAPI('POST', 
        `/api/v6/partstudios/d/${did}/w/${wid}/e/${eid}/featurescript`, 
        { rollbackBarIndex: -1 }, 
        { script }
      );
      
      if (!response.result) {
        throw new Error('Failed to retrieve default plane IDs');
      }
      
      logger.debug('Default plane IDs retrieved successfully', response.result);
      return response.result;
    } catch (error) {
      logger.error(`Error getting default plane IDs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a sketch on a specified default plane
   * @param {string} did - Document ID
   * @param {string} wid - Workspace ID
   * @param {string} eid - Element ID
   * @param {string} planeName - Plane name ('top', 'front', or 'right')
   * @param {Object} sketchData - Sketch entities and constraints
   * @returns {Promise<Object>} Created feature information
   */
  async createSketchOnDefaultPlane(did, wid, eid, planeName, sketchData) {
    try {
      // Get default plane IDs
      const defaultPlanes = await this.getDefaultPlaneIds(did, wid, eid);
      
      // Select the correct plane ID based on the requested plane name
      let planeId;
      switch(planeName.toLowerCase()) {
        case 'top':
          planeId = defaultPlanes.top[0]; // Take the first ID from the array
          break;
        case 'front':
          planeId = defaultPlanes.front[0];
          break;
        case 'right':
          planeId = defaultPlanes.right[0];
          break;
        default:
          throw new Error(`Invalid plane name: ${planeName}. Must be one of: top, front, right`);
      }
      
      if (!planeId) {
        throw new Error(`Could not find ID for plane: ${planeName}`);
      }
      
      logger.info(`Creating sketch on ${planeName} plane with ID ${planeId}`);
      
      // Build the feature creation request body
      const requestBody = {
        feature: {
          type: 151, // BTMSketch type
          typeName: "BTMSketch",
          message: {
            entities: sketchData.entities || [],
            constraints: sketchData.constraints || [],
            parameters: [
              {
                type: 148,
                typeName: "BTMParameterQueryList",
                message: {
                  queries: [
                    {
                      type: 138,
                      typeName: "BTMIndividualQuery",
                      message: {
                        geometryIds: [planeId]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      };
      
      const response = await this.apiClient.callAPI('POST', 
        `/api/v6/partstudios/d/${did}/w/${wid}/e/${eid}/features`, 
        {}, 
        requestBody
      );
      
      logger.info(`Sketch created successfully on ${planeName} plane`);
      return response;
    } catch (error) {
      logger.error(`Error creating sketch on default plane: ${error.message}`);
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
}

module.exports = OnshapePlanesUtil;