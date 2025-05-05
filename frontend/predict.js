document.addEventListener('DOMContentLoaded', async () => {
  const tagSelect = document.getElementById('tag-select');
  const generateBtn = document.getElementById('generate-btn');
  const resultDiv = document.getElementById('prediction-result');
  const textDiv = document.getElementById('prediction-text');
  
  // Initial state
  generateBtn.disabled = true;
  resultDiv.classList.add('hidden');

  // Load tags
  try {
    tagSelect.innerHTML = '<option value="">Loading tags...</option>';
    const response = await fetch('http://localhost:3000/api/tags/list');
    
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    
    const tags = await response.json();
    
    tagSelect.innerHTML = '<option value="">Select a tag</option>' + 
      tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
    
    generateBtn.disabled = false;
    
  } catch (error) {
    console.error('Error loading tags:', error);
    tagSelect.innerHTML = '<option value="">Error loading tags</option>';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <p><i class="fas fa-exclamation-circle"></i> ${error.message}</p>
      <button onclick="location.reload()" class="btn btn-primary">
        <i class="fas fa-sync-alt"></i> Retry
      </button>
    `;
    tagSelect.parentNode.appendChild(errorDiv);
  }

  // Generate prediction
  generateBtn.addEventListener('click', async () => {
    const tag = tagSelect.value;
    const months = document.getElementById('time-select').value;
    
    if (!tag) {
      alert('Please select a tag');
      return;
    }
    
    // Set loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Predicting...';
    textDiv.innerHTML = '<div class="spinner"></div>';
    resultDiv.classList.remove('hidden');
    
    try {
      const response = await fetch(`http://localhost:3000/api/predict/${tag}/${months}`);
      
      if (!response.ok) throw new Error(`Prediction failed: ${response.status}`);
      
      const data = await response.json();
      textDiv.innerHTML = `
        <p><strong>${tag} in ${getTimeframeText(months)}:</strong></p>
        <p>${data.prediction}</p>
      `;
      
    } catch (error) {
      console.error('Prediction error:', error);
      textDiv.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${error.message}</p>
        </div>
      `;
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate Prediction';
    }
  });
});

function getTimeframeText(months) {
  return {
    '1': '1 month',
    '3': '3 months',
    '6': '6 months',
    '12': '1 year'
  }[months] || `${months} months`;
}