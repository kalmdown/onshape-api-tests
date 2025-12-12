console.log('main.js loaded');

// Get DOM elements
const logArea = document.getElementById('logArea');
console.log('logArea element:', logArea);

// Function to show error messages
function showError(message) {
    const time = new Date().toLocaleTimeString();
    logArea.innerHTML += `<div class="log-entry"><span class="log-entry-time">[${time}]</span> <span class="log-entry-status log-entry-status-error">ERROR</span> ${message}</div>`;
    logArea.scrollTop = logArea.scrollHeight;
}

// Function to show success messages
function showSuccess(message) {
    const time = new Date().toLocaleTimeString();
    logArea.innerHTML += `<div class="log-entry"><span class="log-entry-time">[${time}]</span> <span class="log-entry-status log-entry-status-success">SUCCESS</span> ${message}</div>`;
    logArea.scrollTop = logArea.scrollHeight;
}

// Function to load sketches into the dropdown
async function loadSketches() {
    const documentId = document.getElementById('documentId').value;
    const workspaceId = document.getElementById('workspaceId').value;
    const elementId = document.getElementById('elementId').value;
    const serverUrl = document.getElementById('serverUrl').value;
    const sketchSelect = document.getElementById('addCircleSketchId');

    console.log('Loading sketches with:', { documentId, workspaceId, elementId, serverUrl });
    showError('Loading sketches...');

    try {
        const url = `${serverUrl}/planes/kd_get_sketches/${documentId}/${workspaceId}/${elementId}`;
        console.log('Fetching from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch sketches: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch sketches');
        }

        // Clear existing options except the first one
        while (sketchSelect.options.length > 1) {
            sketchSelect.remove(1);
        }

        // Add sketch options
        if (!data.data || !data.data.sketches) {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format from server');
        }

        console.log('Found sketches:', data.data.sketches);
        data.data.sketches.forEach(sketch => {
            const option = document.createElement('option');
            option.value = sketch.featureId || sketch.id;
            option.textContent = `${sketch.name} (${sketch.featureId || sketch.id})`;
            sketchSelect.appendChild(option);
        });

        // Update the first option
        sketchSelect.options[0].textContent = 'Select a sketch...';
        showSuccess(`Loaded ${data.data.sketches.length} sketches`);
    } catch (error) {
        console.error('Error loading sketches:', error);
        sketchSelect.innerHTML = '<option value="">Error loading sketches</option>';
        showError(`Failed to load sketches: ${error.message}`);
    }
}

// Add event listeners for document/workspace/element ID changes
document.getElementById('documentId').addEventListener('change', loadSketches);
document.getElementById('workspaceId').addEventListener('change', loadSketches);
document.getElementById('elementId').addEventListener('change', loadSketches);

// Update the add circle button click handler
document.getElementById('addCircleBtn').addEventListener('click', async function() {
    const documentId = document.getElementById('documentId').value;
    const workspaceId = document.getElementById('workspaceId').value;
    const elementId = document.getElementById('elementId').value;
    const serverUrl = document.getElementById('serverUrl').value;
    const sketchId = document.getElementById('addCircleSketchId').value;
    const radius = document.getElementById('addCircleRadius').value;
    const centerX = document.getElementById('addCircleCenterX').value;
    const centerY = document.getElementById('addCircleCenterY').value;

    if (!sketchId) {
        showError('Please select a sketch');
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/planes/kd_add_circle/${documentId}/${workspaceId}/${elementId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sketchId,
                circleData: {
                    radius: parseFloat(radius),
                    centerX: parseFloat(centerX),
                    centerY: parseFloat(centerY)
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add circle');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to add circle');
        }

        showSuccess('Circle added successfully');
        loadSketches(); // Reload sketches to get updated data
    } catch (error) {
        showError(error.message);
    }
});

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Initialize with a welcome message
    logArea.innerHTML = '<div class="log-entry"><span class="log-entry-time">[' + 
      new Date().toLocaleTimeString() + 
      ']</span> <span class="log-entry-status log-entry-status-success">READY</span> Onshape API Express interface loaded</div>';
      
    // Load sketches initially
    console.log('Calling loadSketches...');
    loadSketches();
}); 