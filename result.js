// result.js - Display results and handle actions

document.addEventListener('DOMContentLoaded', function() {
  loadResults();
  initializeActions();
});

function loadResults() {
  // Get results from localStorage
  const resultData = localStorage.getItem('effortResult');
  
  if (!resultData) {
    // No results found - redirect to form
    window.location.href = 'form.html';
    return;
  }

  const result = JSON.parse(resultData);

  // Populate sections
  populateList('whatWentWell', result.what_went_well);
  populateList('whatCouldBeBetter', result.what_could_be_better);
  populateList('whatWillNeverWork', result.what_will_never_work);
  populateList('whatWillCompound', result.what_will_compound);
  
  // Populate operating rule
  document.getElementById('operatingRule').textContent = result.operating_rule;
}

function populateList(elementId, items) {
  const list = document.getElementById(elementId);
  list.innerHTML = '';
  
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

function initializeActions() {
  // Download PDF
  document.getElementById('downloadBtn').addEventListener('click', handleDownload);
  
  // Share
  document.getElementById('shareBtn').addEventListener('click', handleShare);
  
  // New Calculation
  document.getElementById('newCalcBtn').addEventListener('click', function() {
    localStorage.removeItem('effortResult');
    window.location.href = 'form.html';
  });
}

function handleDownload() {
  // In production: Generate PDF using library like jsPDF
  // For now: Print to PDF
  window.print();
}

function handleShare() {
  // Copy current URL to clipboard
  const url = window.location.href;
  
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('shareBtn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Link Copied!';
    btn.style.background = '#34c759';
    btn.style.color = 'white';
    btn.style.borderColor = '#34c759';
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2000);
  }).catch(err => {
    alert('Could not copy link. Please copy manually: ' + url);
  });
}