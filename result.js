// result.js - Stable Safe Version (No Flow Changes)

document.addEventListener('DOMContentLoaded', function () {
  loadResults();
  initializeActions();
});

function loadResults() {
  const resultData = localStorage.getItem('effortResult');

  if (!resultData) {
    window.location.href = 'form.html';
    return;
  }

  let result;
  try {
    result = JSON.parse(resultData);
  } catch (e) {
    console.error("Invalid result data:", e);
    window.location.href = 'form.html';
    return;
  }

  // Support both snake_case and camelCase (no breaking)
  populateList('whatWentWell',
    result.what_went_well || result.whatWentWell || []);

  populateList('whatCouldBeBetter',
    result.what_could_be_better || result.whatCouldBeBetter || []);

  populateList('whatWillNeverWork',
    result.what_will_never_work || result.whatWillNeverWork || []);

  populateList('whatWillCompound',
    result.what_will_compound || result.whatWillCompound || []);

  const ruleEl = document.getElementById('operatingRule');
  if (ruleEl) {
    ruleEl.textContent =
      result.operating_rule ||
      result.operatingRule ||
      '';
  }
}

function populateList(elementId, items) {
  const list = document.getElementById(elementId);
  if (!list) return;

  list.innerHTML = '';

  if (!Array.isArray(items)) return;

  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

function initializeActions() {
  const downloadBtn = document.getElementById('downloadBtn');
  const shareBtn = document.getElementById('shareBtn');
  const newCalcBtn = document.getElementById('newCalcBtn');

  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownload);
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', handleShare);
  }

  if (newCalcBtn) {
    newCalcBtn.addEventListener('click', function () {
      localStorage.removeItem('effortResult');
      window.location.href = 'form.html';
    });
  }
}

function handleDownload() {
  window.print();
}

function handleShare() {
  const url = window.location.href;

  if (navigator.share) {
    navigator.share({
      title: "Effort Economics",
      url: url
    }).catch(() => {});
    return;
  }

  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('shareBtn');
    if (!btn) return;

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

  }).catch(() => {
    alert('Could not copy link. Please copy manually: ' + url);
  });
}
