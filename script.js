let base64Image = null;
const imageInput = document.getElementById('newsImage');
const previewContainer = document.getElementById('imagePreviewContainer');
const previewImg = document.getElementById('previewImg');

// Attach & Convert Image to Base64
imageInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    base64Image = event.target.result.split(',')[1];
    previewImg.src = event.target.result;
    previewContainer.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

function clearImage() {
  imageInput.value = '';
  base64Image = null;
  previewContainer.style.display = 'none';
  previewImg.src = '';
}

// Typewriter effect function to print output onto screen box
function printToScreen(textElement, fullText, callback) {
  textElement.textContent = '';
  textElement.style.display = 'block';
  let index = 0;

  const timer = setInterval(() => {
    if (index < fullText.length) {
      textElement.textContent += fullText.charAt(index);
      index++;
    } else {
      clearInterval(timer);
      if (callback) callback();
    }
  }, 20);
}

async function runAnalysis() {
  const text = document.getElementById('newsText').value.trim();
  const output = document.getElementById('analysisOutput');
  const placeholder = document.getElementById('outputPlaceholder');
  const verdictBadge = document.getElementById('verdictBadge');
  const statusIndicator = document.getElementById('statusIndicator');
  const wordCountDisplay = document.getElementById('wordCountDisplay');
  const analyzeBtn = document.getElementById('analyzeBtn');

  if (!text && !base64Image) {
    alert('Please enter a news statement or upload a screenshot.');
    return;
  }

  // Update UI to running state
  analyzeBtn.disabled = true;
  statusIndicator.textContent = 'Analyzing with Google Gemini...';
  verdictBadge.textContent = 'CHECKING';
  verdictBadge.className = 'verdict-tag pending';
  placeholder.style.display = 'block';
  placeholder.textContent = '> Querying AI OSINT models & checking facts...';
  output.style.display = 'none';

  try {
    const response = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        imageBase64: base64Image
      })
    });

    const data = await response.json();

    if (data.error) {
      alert(`Error: ${data.error}`);
      statusIndicator.textContent = 'Failed';
      placeholder.textContent = `> Error: ${data.error}`;
      return;
    }

    placeholder.style.display = 'none';

    // 1. Set One-Word Badge ('REAL' or 'FAKE')
    const isReal = data.verdict.toUpperCase().includes('REAL');
    verdictBadge.textContent = isReal ? 'REAL' : 'FAKE';
    verdictBadge.className = 'verdict-tag ' + (isReal ? 'real' : 'fake');

    // 2. Count words
    const words = data.explanation.trim().split(/\s+/).filter(Boolean).length;
    wordCountDisplay.textContent = `Words: ${words} / 30`;

    // 3. Print text smoothly on the output screen
    printToScreen(output, data.explanation, () => {
      statusIndicator.textContent = 'Completed';
    });

  } catch (err) {
    placeholder.style.display = 'block';
    placeholder.textContent = `> Connection error: Could not reach backend server at http://localhost:5000.`;
    statusIndicator.textContent = 'Connection Error';
    alert(`Could not connect to backend server. Make sure "node server.js" is running in terminal.\n\nDetails: ${err.message}`);
  } finally {
    analyzeBtn.disabled = false;
  }
}