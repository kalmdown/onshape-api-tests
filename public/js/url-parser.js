// Helper function to truncate long objects/arrays for logging
function truncateForLog(obj, maxLength = 100) {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;
    
    const str = JSON.stringify(obj);
    if (str.length <= maxLength) return obj;
    
    return str.substring(0, maxLength) + '...';
}

document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('onshapeUrl');
    const parseButton = document.getElementById('parseButton');
    const resultDiv = document.getElementById('result');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Add event delegation for global toggle buttons
    resultDiv.addEventListener('click', function(event) {
        const button = event.target.closest('.global-toggles .btn');
        if (button) {
            const section = button.dataset.section;
            toggleAllDetails(section);
        }
    });

    // Add event delegation for tree toggles
    resultDiv.addEventListener('click', function(event) {
        const treeToggle = event.target.closest('.tree-toggle');
        if (treeToggle) {
            const content = treeToggle.nextElementSibling;
            if (content) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                treeToggle.querySelector('.toggle-icon').textContent = isHidden ? '▼' : '▶';
            }
        }

        // Handle detail section toggles
        const detailToggle = event.target.closest('.detail-toggle');
        if (detailToggle) {
            const section = detailToggle.dataset.section;
            const featureInfo = detailToggle.closest('.feature-info');
            const content = featureInfo.querySelector(`.${section}-content`);
            if (content) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                detailToggle.querySelector('.toggle-icon').textContent = isHidden ? '▼' : '▶';
            }
        }

        // Handle JSON tree toggles
        const jsonToggle = event.target.closest('.json-toggle');
        if (jsonToggle) {
            const content = jsonToggle.nextElementSibling;
            const icon = jsonToggle.querySelector('.toggle-icon');
            if (content) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                icon.textContent = isHidden ? '▼' : '▶';
            }
        }
    });

    parseButton.addEventListener('click', async function() {
        const url = urlInput.value.trim();
        if (!url) {
            showError('Please enter an Onshape URL');
            return;
        }

        try {
            loadingSpinner.style.display = 'block';
            resultDiv.innerHTML = '';

            const response = await fetch('/api/url-parser/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to parse URL');
            }

            const data = await response.json();
            console.log('Received data:', data); // Debug log
            displayResult(data);
        } catch (error) {
            showError(error.message);
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });

    function displayResult(data) {
        let html = `
            <div class="mb-4">
                <h3>Document Information</h3>
                <p><strong>Document ID:</strong> ${data.documentId}</p>
                <p><strong>Workspace ID:</strong> ${data.workspaceId}</p>
                <p><strong>Element ID:</strong> ${data.elementId}</p>
                <p><strong>Element Type:</strong> ${data.elementType}</p>
            </div>
        `;

        if (data.features && data.features.features) {
            console.log('Features data:', data.features.features); // Debug log
            html += `
                <div class="mb-4">
                    <h3>Features (${data.features.features.length})</h3>
                    <div class="global-toggles">
                        <button class="btn btn-sm btn-outline-primary" data-section="entities">Entities</button>
                        <button class="btn btn-sm btn-outline-primary" data-section="constraints">Constraints</button>
                        <button class="btn btn-sm btn-outline-primary" data-section="parameters">Parameters</button>
                        <button class="btn btn-sm btn-outline-primary" data-section="all">All</button>
                    </div>
                    <div class="feature-tree">
                        ${renderFeatures(data.features.features)}
                    </div>
                </div>
            `;
        }

        resultDiv.innerHTML = html;
    }

    function renderFeatures(features, level = 0) {
        if (!features) return '';
        
        return features.map(feature => {
            console.log('Rendering feature:', feature); // Debug log
            const hasSubfeatures = feature.subfeatures && feature.subfeatures.length > 0;
            const featureInfo = renderFeatureInfo(feature);
            
            return `
                <div class="tree-node" style="margin-left: ${level * 20}px">
                    ${hasSubfeatures ? `
                        <div class="tree-content" style="display: none">
                            ${renderFeatures(feature.subfeatures, level + 1)}
                        </div>
                    ` : ''}
                    ${featureInfo}
                </div>
            `;
        }).join('');
    }

    function renderFeatureInfo(feature) {
        console.log('Rendering feature info:', feature); // Debug log
        return `
            <div class="feature-info">
                <div class="detail-section">
                    <div class="json-toggle" data-level="0">
                        <span class="toggle-icon">▶</span>
                        <strong>${feature.name || 'Unnamed Feature'}</strong>
                        <span class="feature-type">(${feature.btType})</span>
                    </div>
                    <div class="json-content" style="display: none">
                        ${renderJsonTree(feature, 0, true)}
                    </div>
                </div>
            </div>
        `;
    }

    function renderJsonTree(obj, level = 0, isRoot = false) {
        if (obj === null) return '<span class="json-null">null</span>';
        if (typeof obj !== 'object') return `<span class="json-value">${JSON.stringify(obj)}</span>`;
        
        let html = '';
        
        if (Array.isArray(obj)) {
            const hasChildren = obj.some(item => typeof item === 'object' && item !== null);
            const arrayLength = obj.length;
            
            if (hasChildren || isRoot) {
                html += `<div class="json-array">`;
                html += `<div class="json-toggle" data-level="${level}">`;
                html += `<span class="toggle-icon">▶</span>`;
                html += `<span class="json-preview">Array(${arrayLength})</span>`;
                html += `</div>`;
                html += `<div class="json-content" style="display: none">`;
                obj.forEach((item, index) => {
                    html += `<div class="json-item">${renderJsonTree(item, level + 1)}</div>`;
                });
                html += `</div></div>`;
            } else {
                html += `[${obj.map(item => JSON.stringify(item)).join(' ')}]`;
            }
        } else {
            const entries = Object.entries(obj);
            const hasChildren = entries.some(([_, value]) => typeof value === 'object' && value !== null);
            
            if (hasChildren || isRoot) {
                html += `<div class="json-object">`;
                if (!isRoot) {
                    html += `<div class="json-toggle" data-level="${level}">`;
                    html += `<span class="toggle-icon">▶</span>`;
                    html += `<span class="json-preview">Object</span>`;
                    html += `</div>`;
                }
                html += `<div class="json-content" style="display: ${isRoot ? 'block' : 'none'}">`;
                entries.forEach(([key, value], index) => {
                    html += `<div class="json-item"><span class="json-key">"${key}"</span>: ${renderJsonTree(value, level + 1)}</div>`;
                });
                html += `</div></div>`;
            } else {
                html += `{${entries.map(([key, value]) => `"${key}": ${JSON.stringify(value)}`).join(' ')}}`;
            }
        }
        
        return html;
    }

    function renderReferencedEntities(entityQueries) {
        return entityQueries.map(query => {
            let details = [];
            
            if (query.queries) {
                query.queries.forEach(q => {
                    details.push('<div class="query-details">');
                    details.push(`<strong>Query Type:</strong> ${q.btType}`);
                    
                    // Parse and display the query string in a more readable format
                    if (q.queryString) {
                        const queryInfo = parseQueryString(q.queryString);
                        details.push('<div class="query-info">');
                        details.push('<strong>Query Details:</strong>');
                        details.push('<div class="nested-details">');
                        
                        if (queryInfo.entityType) {
                            details.push(`<strong>Entity Type:</strong> ${queryInfo.entityType}`);
                        }
                        if (queryInfo.operationId) {
                            details.push(`<strong>Operation ID:</strong> ${queryInfo.operationId}`);
                        }
                        if (queryInfo.sketchEntityId) {
                            details.push(`<strong>Sketch Entity ID:</strong> ${queryInfo.sketchEntityId}`);
                        }
                        if (queryInfo.queryType) {
                            details.push(`<strong>Query Type:</strong> ${queryInfo.queryType}`);
                        }
                        
                        details.push('</div>');
                        details.push('</div>');
                    }
                    
                    if (q.deterministicIds && q.deterministicIds.length > 0) {
                        details.push('<div class="referenced-ids">');
                        details.push('<strong>Referenced IDs:</strong>');
                        details.push('<div class="nested-details">');
                        q.deterministicIds.forEach(id => {
                            details.push(`<div class="referenced-id">${id}</div>`);
                        });
                        details.push('</div>');
                        details.push('</div>');
                    }
                    
                    if (q.nodeId) {
                        details.push(`<strong>Node ID:</strong> ${q.nodeId}`);
                    }
                    
                    details.push('</div>');
                });
            }
            
            return `<div class="detail-item">${details.join('<br>')}</div>`;
        }).join('');
    }

    function parseQueryString(queryString) {
        const result = {};
        
        // Extract entity type
        const entityTypeMatch = queryString.match(/EntityTypeS(\d+)\$([^$]+)/);
        if (entityTypeMatch) {
            result.entityType = entityTypeMatch[2];
        }
        
        // Extract operation ID
        const operationIdMatch = queryString.match(/operationIdB(\d+)\$IdA(\d+)S(\d+)\.(\d+)\$([^$]+)/);
        if (operationIdMatch) {
            result.operationId = operationIdMatch[5];
        }
        
        // Extract sketch entity ID
        const sketchEntityIdMatch = queryString.match(/sketchEntityIdSc\.(\d+)\$([^$]+)/);
        if (sketchEntityIdMatch) {
            result.sketchEntityId = sketchEntityIdMatch[2];
        }
        
        // Extract query type
        const queryTypeMatch = queryString.match(/queryTypeS(\d+)\$([^$]+)/);
        if (queryTypeMatch) {
            result.queryType = queryTypeMatch[2];
        }
        
        return result;
    }

    function renderEntities(entities) {
        console.log('Rendering entities:', entities); // Debug log
        return entities.map(entity => {
            let details = [];
            
            // Basic info
            details.push(`<strong>Type:</strong> ${entity.btType || 'Unknown'}`);
            details.push(`<strong>ID:</strong> ${entity.entityId || 'N/A'}`);
            if (entity.name) details.push(`<strong>Name:</strong> ${entity.name}`);
            
            // Geometry details
            if (entity.geometry) {
                console.log('Entity geometry:', entity.geometry); // Debug log
                details.push('<div class="geometry-details">');
                details.push('<strong>Geometry:</strong>');
                details.push('<div class="nested-details">');
                
                // Handle different geometry types
                if (entity.geometry.btType) {
                    details.push(`<strong>Geometry Type:</strong> ${entity.geometry.btType}`);
                }
                
                // Handle specific geometry properties based on type
                switch(entity.geometry.btType) {
                    case 'BTCurveGeometryCircle-115':
                        details.push(`<strong>Radius:</strong> ${entity.geometry.radius}`);
                        details.push(`<strong>Center:</strong> (${entity.geometry.xCenter}, ${entity.geometry.yCenter})`);
                        details.push(`<strong>Direction:</strong> (${entity.geometry.xDir}, ${entity.geometry.yDir})`);
                        details.push(`<strong>Clockwise:</strong> ${entity.geometry.clockwise}`);
                        break;
                    case 'BTCurveGeometryLine-117':
                        details.push(`<strong>Point:</strong> (${entity.geometry.pntX}, ${entity.geometry.pntY})`);
                        details.push(`<strong>Direction:</strong> (${entity.geometry.dirX}, ${entity.geometry.dirY})`);
                        break;
                    case 'BTCurveGeometryEllipse-1189':
                        details.push(`<strong>Major Radius:</strong> ${entity.geometry.radius}`);
                        details.push(`<strong>Minor Radius:</strong> ${entity.geometry.minorRadius}`);
                        details.push(`<strong>Center:</strong> (${entity.geometry.xCenter}, ${entity.geometry.yCenter})`);
                        details.push(`<strong>Direction:</strong> (${entity.geometry.xDir}, ${entity.geometry.yDir})`);
                        details.push(`<strong>Clockwise:</strong> ${entity.geometry.clockwise}`);
                        break;
                    case 'BTCurveGeometryControlPointSpline-2197':
                        details.push(`<strong>Degree:</strong> ${entity.geometry.degree}`);
                        details.push(`<strong>Is Bezier:</strong> ${entity.geometry.isBezier}`);
                        details.push(`<strong>Is Periodic:</strong> ${entity.geometry.isPeriodic}`);
                        if (entity.geometry.controlPoints) {
                            details.push('<div class="control-points">');
                            details.push('<strong>Control Points:</strong>');
                            details.push('<div class="nested-details">');
                            entity.geometry.controlPoints.forEach((point, index) => {
                                details.push(`<div class="control-point">Point ${index + 1}: (${point.x}, ${point.y})</div>`);
                            });
                            details.push('</div>');
                            details.push('</div>');
                        }
                        break;
                    case 'BTCurveGeometryInterpolatedSpline-116':
                        details.push(`<strong>Start Derivative:</strong> (${entity.geometry.startDerivativeX}, ${entity.geometry.startDerivativeY})`);
                        details.push(`<strong>End Derivative:</strong> (${entity.geometry.endDerivativeX}, ${entity.geometry.endDerivativeY})`);
                        if (entity.geometry.interpolationPoints) {
                            details.push('<div class="interpolation-points">');
                            details.push('<strong>Interpolation Points:</strong>');
                            details.push('<div class="nested-details">');
                            entity.geometry.interpolationPoints.forEach((point, index) => {
                                details.push(`<div class="interpolation-point">Point ${index + 1}: (${point.x}, ${point.y})</div>`);
                            });
                            details.push('</div>');
                            details.push('</div>');
                        }
                        break;
                    default:
                        // For any other geometry type, show all properties
                        for (const [key, value] of Object.entries(entity.geometry)) {
                            if (key === 'btType') continue;
                            if (typeof value === 'object') {
                                details.push(`<div class="geometry-property">`);
                                details.push(`<strong>${key}:</strong>`);
                                details.push(`<div class="nested-details">`);
                                if (Array.isArray(value)) {
                                    value.forEach((item, index) => {
                                        if (typeof item === 'object') {
                                            details.push(`<div class="array-item">Item ${index + 1}: ${JSON.stringify(item, null, 2)}</div>`);
                                        } else {
                                            details.push(`<div class="array-item">Item ${index + 1}: ${item}</div>`);
                                        }
                                    });
                                } else {
                                    for (const [subKey, subValue] of Object.entries(value)) {
                                        details.push(`<strong>${subKey}:</strong> ${subValue}`);
                                    }
                                }
                                details.push(`</div>`);
                                details.push(`</div>`);
                            } else {
                                details.push(`<strong>${key}:</strong> ${value}`);
                            }
                        }
                }
                
                details.push('</div>');
                details.push('</div>');
            }
            
            // Constraints
            if (entity.constraints) {
                console.log('Entity constraints:', entity.constraints); // Debug log
                details.push('<div class="constraints-details">');
                details.push('<strong>Constraints:</strong>');
                details.push('<div class="nested-details">');
                entity.constraints.forEach(constraint => {
                    details.push('<div class="constraint-item">');
                    for (const [key, value] of Object.entries(constraint)) {
                        if (typeof value === 'object') {
                            details.push(`<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`);
                        } else {
                            details.push(`<strong>${key}:</strong> ${value}`);
                        }
                    }
                    details.push('</div>');
                });
                details.push('</div>');
                details.push('</div>');
            }
            
            // Additional properties
            for (const [key, value] of Object.entries(entity)) {
                if (!['btType', 'entityId', 'name', 'geometry', 'constraints'].includes(key)) {
                    if (typeof value === 'object') {
                        details.push(`<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`);
                    } else {
                        details.push(`<strong>${key}:</strong> ${value}`);
                    }
                }
            }
            
            return `<div class="detail-item">${details.join('<br>')}</div>`;
        }).join('');
    }

    function renderConstraints(constraints) {
        return constraints.map(constraint => {
            let details = [];
            
            // Basic info
            details.push(`<strong>Type:</strong> ${constraint.btType || 'Unknown'}`);
            if (constraint.name) details.push(`<strong>Name:</strong> ${constraint.name}`);
            
            // Parameters
            if (constraint.parameters) {
                details.push('<div class="parameters-details">');
                details.push('<strong>Parameters:</strong>');
                details.push('<div class="nested-details">');
                constraint.parameters.forEach(param => {
                    details.push('<div class="parameter-item">');
                    for (const [key, value] of Object.entries(param)) {
                        if (typeof value === 'object') {
                            details.push(`<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`);
                        } else {
                            details.push(`<strong>${key}:</strong> ${value}`);
                        }
                    }
                    details.push('</div>');
                });
                details.push('</div>');
                details.push('</div>');
            }
            
            // Queries
            if (constraint.queries) {
                details.push('<div class="queries-details">');
                details.push('<strong>Queries:</strong>');
                details.push('<div class="nested-details">');
                constraint.queries.forEach(query => {
                    details.push('<div class="query-item">');
                    for (const [key, value] of Object.entries(query)) {
                        if (typeof value === 'object') {
                            details.push(`<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`);
                        } else {
                            details.push(`<strong>${key}:</strong> ${value}`);
                        }
                    }
                    details.push('</div>');
                });
                details.push('</div>');
                details.push('</div>');
            }
            
            // Additional properties
            for (const [key, value] of Object.entries(constraint)) {
                if (!['btType', 'name', 'parameters', 'queries'].includes(key)) {
                    if (typeof value === 'object') {
                        details.push(`<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`);
                    } else {
                        details.push(`<strong>${key}:</strong> ${value}`);
                    }
                }
            }
            
            return `<div class="detail-item">${details.join('<br>')}</div>`;
        }).join('');
    }

    function renderParameters(parameters) {
        return parameters.map(param => {
            let details = [];
            
            // Basic info
            details.push(`<strong>Type:</strong> ${param.btType || 'Unknown'}`);
            details.push(`<strong>ID:</strong> ${param.parameterId || 'N/A'}`);
            if (param.name) details.push(`<strong>Name:</strong> ${param.name}`);
            
            // Value details
            if (param.value) {
                details.push('<div class="value-details">');
                details.push('<strong>Value:</strong>');
                details.push('<div class="nested-details">');
                if (typeof param.value === 'object') {
                    for (const [key, value] of Object.entries(param.value)) {
                        if (typeof value === 'object') {
                            details.push(`<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`);
                        } else {
                            details.push(`<strong>${key}:</strong> ${value}`);
                        }
                    }
                } else {
                    details.push(param.value);
                }
                details.push('</div>');
                details.push('</div>');
            }
            
            // Expression
            if (param.expression) {
                details.push(`<strong>Expression:</strong> ${param.expression}`);
            }
            
            // Additional properties
            for (const [key, value] of Object.entries(param)) {
                if (!['btType', 'parameterId', 'name', 'value', 'expression'].includes(key)) {
                    if (typeof value === 'object') {
                        details.push(`<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`);
                    } else {
                        details.push(`<strong>${key}:</strong> ${value}`);
                    }
                }
            }
            
            return `<div class="detail-item">${details.join('<br>')}</div>`;
        }).join('');
    }

    function renderAdditionalDetails(feature) {
        const details = [];
        for (const [key, value] of Object.entries(feature)) {
            if (!['btType', 'featureId', 'name', 'entities', 'constraints', 'parameters'].includes(key)) {
                details.push(`<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`);
            }
        }
        return details.map(detail => `<div class="detail-item">${detail}</div>`).join('');
    }

    function showError(message) {
        resultDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                ${message}
            </div>
        `;
    }
});

// Global function for toggling all details of a specific type
function toggleAllDetails(section) {
    const contents = document.querySelectorAll(`.${section}-content`);
    const toggles = document.querySelectorAll(`.detail-toggle[data-section="${section}"]`);
    const isHidden = contents[0]?.style.display === 'none';
    
    contents.forEach(content => {
        if (content) content.style.display = isHidden ? 'block' : 'none';
    });
    
    toggles.forEach(toggle => {
        if (toggle) toggle.querySelector('.toggle-icon').textContent = isHidden ? '▼' : '▶';
    });
} 