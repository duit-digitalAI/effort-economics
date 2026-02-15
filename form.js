// form.js - Form handling with all fixes

// State management
const formState = {
  currentStep: 1,
  phone: null,
  phoneHash: null,
  birthDate: null,
  birthTime: null,
  country: 'IN',
  pincode: null,
  city: null,
  latitude: null,
  longitude: null,
  timezone: null,
  locationVerified: false
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  initializeForm();
});

function initializeForm() {
  // Step 1: Phone Form
  const phoneForm = document.getElementById('phoneForm');
  if (phoneForm) {
    phoneForm.addEventListener('submit', handlePhoneSubmit);
  }

  // Step 2: Birth Form
  const birthForm = document.getElementById('birthForm');
  if (birthForm) {
    birthForm.addEventListener('submit', handleBirthSubmit);
  }

  // Birth time auto-format
  const birthTimeInput = document.getElementById('birthTime');
  if (birthTimeInput) {
    birthTimeInput.addEventListener('blur', formatBirthTime);
  }

  // Step 3: Pin code auto-geocode
  const pincodeInput = document.getElementById('pincode');
  if (pincodeInput) {
    pincodeInput.addEventListener('input', debounce(autoGeocode, 1000));
  }

  // Location form
  const geocodeBtn = document.getElementById('geocodeBtn');
  if (geocodeBtn) {
    geocodeBtn.addEventListener('click', handleGeocode);
  }

  const locationForm = document.getElementById('locationForm');
  if (locationForm) {
    locationForm.addEventListener('submit', handleFinalSubmit);
  }

  // Reset location verification when inputs change
  const cityInput = document.getElementById('city');
  const countryInput = document.getElementById('country');
  
  if (cityInput) {
    cityInput.addEventListener('input', resetLocationVerification);
  }
  if (countryInput) {
    countryInput.addEventListener('change', resetLocationVerification);
  }
  if (pincodeInput) {
    pincodeInput.addEventListener('input', resetLocationVerification);
  }
}

// ===== STEP 1: PHONE NUMBER =====

async function handlePhoneSubmit(e) {
  e.preventDefault();
  
  const countryCode = document.getElementById('countryCode').value;
  const phone = document.getElementById('phone').value;
  const consent = document.getElementById('consent').checked;

  if (!consent) {
    showError('phoneForm', 'Please accept the Terms & Privacy Policy');
    return;
  }

  const fullPhone = countryCode + phone;
  formState.phone = fullPhone;

  // Hash phone number (client-side SHA-256)
  formState.phoneHash = await hashPhone(fullPhone);

  console.log('Phone collected:', fullPhone);
  console.log('Phone hash:', formState.phoneHash);

  goToStep(2);
}

// ===== STEP 2: BIRTH DETAILS =====

function formatBirthTime(e) {
  const input = e.target;
  let value = input.value.trim();

  // If format is HH:MM, append :00
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
    input.value = value + ':00';
  }
  // If format is HH:MM: (trailing colon), append 00
  else if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]:$/.test(value)) {
    input.value = value + '00';
  }
  // If only HH, append :00:00
  else if (/^([01]?[0-9]|2[0-3])$/.test(value)) {
    input.value = value + ':00:00';
  }
}

function handleBirthSubmit(e) {
  e.preventDefault();
  
  const birthDate = document.getElementById('birthDate').value;
  let birthTime = document.getElementById('birthTime').value.trim();

  // Auto-format time if needed
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(birthTime)) {
    birthTime = birthTime + ':00';
  }

  // Validate format
  if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(birthTime)) {
    showError('birthForm', 'Birth time must be in HH:MM:SS format (e.g., 14:30:00)');
    return;
  }

  // Validate date
  const date = new Date(birthDate);
  const now = new Date();
  
  if (date > now) {
    showError('birthForm', 'Birth date cannot be in the future');
    return;
  }

  if (date.getFullYear() < 1900) {
    showError('birthForm', 'Birth date must be after 1900');
    return;
  }

  formState.birthDate = birthDate;
  formState.birthTime = birthTime;

  console.log('Birth date:', birthDate);
  console.log('Birth time:', birthTime);

  goToStep(3);
}

// ===== STEP 3: LOCATION & GEOCODING =====

function resetLocationVerification() {
  formState.locationVerified = false;
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('locationPreview').style.display = 'none';
  
  const geocodeBtn = document.getElementById('geocodeBtn');
  geocodeBtn.disabled = false;
  geocodeBtn.textContent = 'Verify Location';
  geocodeBtn.style.background = '';
  geocodeBtn.style.color = '';
  geocodeBtn.style.borderColor = '';
}

// Debounce helper for auto-geocode
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Auto-geocode when pincode is entered
async function autoGeocode() {
  const pincode = document.getElementById('pincode').value.trim();
  
  if (!pincode || pincode.length < 5) {
    return;
  }

  console.log('Auto-geocoding pincode:', pincode);

  try {
    const result = await reverseGeocodeFromPincode(pincode);
    
    if (result) {
      // Auto-populate city and country
      if (result.city) {
        document.getElementById('city').value = result.city;
      }
      if (result.countryCode) {
        document.getElementById('country').value = result.countryCode;
      }
      console.log('Auto-populated:', result);
    }
  } catch (error) {
    console.log('Auto-geocode failed:', error);
  }
}

// Reverse geocode from pincode only
async function reverseGeocodeFromPincode(pincode) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(pincode)}&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EffortEconomics/1.0'
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      const address = result.address || {};
      
      return {
        city: address.city || address.town || address.village || address.county || '',
        countryCode: address.country_code ? address.country_code.toUpperCase() : ''
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}

async function handleGeocode() {
  const country = document.getElementById('country').value;
  const pincode = document.getElementById('pincode').value;
  const city = document.getElementById('city').value;

  if (!country || !pincode || !city) {
    showError('locationForm', 'Please enter pin code, city, and select country');
    return;
  }

  const geocodeBtn = document.getElementById('geocodeBtn');
  geocodeBtn.disabled = true;
  geocodeBtn.textContent = 'Verifying...';

  try {
    // Call geocoding service
    const result = await geocodeLocation(country, pincode, city);
    
    if (result) {
      formState.country = country;
      formState.pincode = pincode;
      formState.city = city;
      formState.latitude = result.lat;
      formState.longitude = result.lon;
      formState.timezone = result.timezone;
      formState.locationVerified = true;

      console.log('Location verified:', result);

      // Show location preview
      showLocationPreview(result);

      // Enable submit button
      document.getElementById('submitBtn').disabled = false;
      
      geocodeBtn.textContent = '✓ Location Verified';
      geocodeBtn.style.background = '#34c759';
      geocodeBtn.style.color = 'white';
      geocodeBtn.style.borderColor = '#34c759';
      
    } else {
      throw new Error('Location not found');
    }
  } catch (error) {
    showError('locationForm', 'Could not find location. Please check pin code and city.');
    geocodeBtn.disabled = false;
    geocodeBtn.textContent = 'Verify Location';
  }
}

// GEOCODING FUNCTION (Using free OpenStreetMap Nominatim API)
async function geocodeLocation(country, pincode, city) {
  try {
    // Build query
    let query = `${city}, ${pincode}, ${getCountryName(country)}`;

    // Use Nominatim (OpenStreetMap's free geocoding)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EffortEconomics/1.0'
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      
      // Get timezone from lat/lon
      const timezone = await getTimezone(result.lat, result.lon);

      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        displayName: result.display_name,
        timezone: timezone
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Get timezone from coordinates (using free TimeAPI)
async function getTimezone(lat, lon) {
  try {
    const url = `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.timeZone || guessTimezone(lat, lon);
  } catch (error) {
    console.error('Timezone error:', error);
    return guessTimezone(lat, lon);
  }
}

// Fallback timezone guesser
function guessTimezone(lat, lon) {
  // India
  if (lat > 8 && lat < 35 && lon > 68 && lon < 97) {
    return 'Asia/Kolkata';
  }
  // US East
  if (lat > 25 && lat < 48 && lon > -85 && lon < -65) {
    return 'America/New_York';
  }
  // US West
  if (lat > 32 && lat < 49 && lon > -125 && lon < -114) {
    return 'America/Los_Angeles';
  }
  // UK
  if (lat > 50 && lat < 60 && lon > -8 && lon < 2) {
    return 'Europe/London';
  }
  // UAE
  if (lat > 22 && lat < 27 && lon > 51 && lon < 57) {
    return 'Asia/Dubai';
  }
  // Singapore
  if (lat > 1 && lat < 2 && lon > 103 && lon < 104) {
    return 'Asia/Singapore';
  }
  // Australia (Sydney)
  if (lat > -35 && lat < -33 && lon > 150 && lon < 152) {
    return 'Australia/Sydney';
  }
  return 'UTC';
}

function getCountryName(code) {
  const countries = {
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom',
    'AE': 'United Arab Emirates',
    'SG': 'Singapore',
    'AU': 'Australia',
    'CA': 'Canada',
    'DE': 'Germany',
    'FR': 'France'
  };
  return countries[code] || code;
}

function showLocationPreview(result) {
  const preview = document.getElementById('locationPreview');
  document.getElementById('detectedLocation').textContent = result.displayName;
  document.getElementById('displayLat').textContent = result.lat.toFixed(4);
  document.getElementById('displayLon').textContent = result.lon.toFixed(4);
  preview.style.display = 'block';
}

// ===== FINAL SUBMIT =====

async function handleFinalSubmit(e) {
  e.preventDefault();

  if (!formState.locationVerified) {
    showError('locationForm', 'Please verify location first');
    return;
  }

  // Show loading
  document.getElementById('loadingIndicator').style.display = 'block';
  document.getElementById('submitBtn').disabled = true;

  // Prepare payload for backend
  const payload = {
    phone_hash: formState.phoneHash,
    birth_date: formState.birthDate,
    birth_time: formState.birthTime,
    latitude: formState.latitude,
    longitude: formState.longitude,
    timezone: formState.timezone
  };

  console.log('Final payload:', payload);

  try {
    // In production: Call Azure Function
    // const response = await fetch('https://your-function-app.azurewebsites.net/api/calculate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
    // const result = await response.json();

    // For now: Simulate API call
    await simulateApiCall();

    // Store in localStorage for result page
    const mockResult = generateMockResult();
    localStorage.setItem('effortResult', JSON.stringify(mockResult));

    // Redirect to result page
    window.location.href = 'result.html';

  } catch (error) {
    console.error('Calculation error:', error);
    showError('locationForm', 'Calculation failed. Please try again.');
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('submitBtn').disabled = false;
  }
}

// ===== HELPER FUNCTIONS =====

function goToStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.remove('active');
  });

  // Show target step
  document.getElementById(`step${stepNumber}`).classList.add('active');

  // Update progress
  updateProgress(stepNumber);
  
  // Update state
  formState.currentStep = stepNumber;
  
  // Scroll to top
  window.scrollTo(0, 0);
}

// Make goToStep available globally
window.goToStep = goToStep;

function updateProgress(stepNumber) {
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    const num = index + 1;
    if (num < stepNumber) {
      step.classList.add('completed');
      step.classList.remove('active');
    } else if (num === stepNumber) {
      step.classList.add('active');
      step.classList.remove('completed');
    } else {
      step.classList.remove('active', 'completed');
    }
  });
}

function showError(formId, message) {
  const form = document.getElementById(formId);
  let errorDiv = form.querySelector('.error-message');
  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    form.appendChild(errorDiv);
  }
  
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
  
  setTimeout(() => errorDiv.classList.remove('show'), 5000);
}

async function hashPhone(phone) {
  const msgBuffer = new TextEncoder().encode(phone + 'EFFORT_SALT_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function simulateApiCall() {
  return new Promise(resolve => setTimeout(resolve, 2000));
}

function generateMockResult() {
  return {
    what_went_well: [
      "Sustained effort in structured, rule-based environments produced measurable returns.",
      "Authority built through written documentation and systematic processes showed consistent compounding.",
      "Effort invested in mastering technical systems with clear evaluation criteria converted reliably into recognition."
    ],
    what_could_be_better: [
      "Authority built through communication channels shows initial momentum but requires recalibration to sustain gains.",
      "Effort in collaborative environments produces visible short-term results but stability depends on maintaining control over attribution.",
      "Institutional advancement through relationship leverage needs alignment with formal evaluation structures to hold."
    ],
    what_will_never_work: [
      "Pursuing authority through traditional linear career progression faces permanent structural resistance.",
      "Effort invested in seeking validation from gatekeepers in established hierarchies dissipates without conversion.",
      "Building influence through purely consensus-based decision structures encounters systematic decay."
    ],
    what_will_compound: [
      "Effort invested in building formal institutional authority has structural support and compounds over time.",
      "Authority developed through demonstrable expertise in constrained technical domains shows maximum leverage.",
      "Sustained effort in environments with transparent performance measurement and individual attribution mechanisms."
    ],
    operating_rule: "Operate in contexts where individual authorship is visible and measurable; avoid systems that diffuse attribution."
  };
}