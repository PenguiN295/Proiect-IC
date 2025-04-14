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
      const response = await fetch('http://localhost:3000/api/tags/list');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tags = await response.json();
      
      if (!tags || tags.length === 0) {
        tagSelect.innerHTML = '<option value="">No tags available</option>';
      } else {
        tagSelect.innerHTML = '<option value="">Select a tag</option>' + 
          tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
        generateBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error loading tags:', error);
      tagSelect.innerHTML = '<option value="">Error loading tags</option>';
      
      // Add retry button
      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Retry Loading Tags';
      retryBtn.className = 'retry-btn';
      retryBtn.onclick = () => window.location.reload();
      tagSelect.parentNode.appendChild(retryBtn);
    }
  
    // Generate prediction
    generateBtn.addEventListener('click', async () => {
      const tag = tagSelect.value;
      const months = document.getElementById('time-select').value;
      
      if (!tag) {
        alert('Please select a tag');
        return;
      }
      
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
      
      try {
        const response = await fetch(`http://localhost:3000/api/predict/${tag}/${months}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        textDiv.textContent = data.prediction;
        resultDiv.classList.remove('hidden');
      } catch (error) {
        console.error('Prediction error:', error);
        textDiv.textContent = 'Failed to generate prediction. Please try again.';
        resultDiv.classList.remove('hidden');
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Prediction';
      }
    });
  });