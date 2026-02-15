// app.js - Handle CTA button clicks

document.addEventListener('DOMContentLoaded', function() {
  
  // Get all buttons that should go to form
  const startBtn = document.getElementById('startBtn');
  const startBtn2 = document.getElementById('startBtn2');
  
  // Navigate to form page
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      window.location.href = 'form.html';
    });
  }
  
  if (startBtn2) {
    startBtn2.addEventListener('click', function() {
      window.location.href = 'form.html';
    });
  }
  
});