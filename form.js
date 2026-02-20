// form.js - FIXED: Working pincode autofetch + Real API

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════

const API_URL = 'https://effort-economics-api.azurewebsites.net/api/calculate';

const TZ_OFFSETS = {
  "Asia/Kolkata": 5.5,
  "Asia/Dubai": 4.0,
  "Asia/Singapore": 8.0,
  "Asia/Tokyo": 9.0,
  "Europe/London": 0.0,
  "Europe/Paris": 1.0,
  "America/New_York": -5.0,
  "America/Chicago": -6.0,
  "America/Los_Angeles": -8.0,
  "Australia/Sydney": 10.0,
  "UTC": 0.0
};

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

const formState = {
  currentStep: 1,
  phoneNumber: null,
  consent: false,
  birthDate: null,
  birthTime: null,
  country: 'IN',
  pincode: null,
  city: null,
  latitude: null,
  longitude: null,
  timezone: null,
  tz_offset: 5.5,
  locationVerified: false
};

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  initializeForm();
});

function initializeForm() {
  const phoneForm = document.getElementById('phoneForm');
  if (phoneForm) {
    phoneForm.addEventListener('submit', handlePhoneSubmit);
  }

  const birthForm = document.getElementById('birthForm');
  if (birthForm) {
    birthForm.addEventListener('submit', handleBirthSubmit);
  }

  const birthTimeInput = document.getElementById('birthTime');
  if (birthTimeInput) {
    birthTimeInput.addEventListener('blur', formatBirthTime);
  }

  // FIX: Pincode auto-geocode with proper debounce
  const pincodeInput = document.getElementById('pincode');
  if (pincodeInput) {
    pincodeInput.addEventListener('input', debounce(autoGeocode, 1000));
    pincodeInput.addEventListener('input', resetLocationVerification);
  }

  const geocodeBtn = document.getElementById('geocodeBtn');
  if (geocodeBtn) {
    geocodeBtn.addEventListener('click', handleGeocode);
  }

  const locationForm = document.getElementById('locationForm');
  if (locationForm) {
    locationForm.addEventListener('submit', handleFinalSubmit);
  }

  // Reset verification when inputs change
  const cityInput = document.getElementById('city');
  const countryInput = document.getElementById('country');
  
  if (cityInput) cityInput.addEventListener('input', resetLocationVerification);
  if (countryInput) countryInput.addEventListener('change', resetLocationVerification);
}

// ═══════════════════════════════════════════════
// STEP 1: PHONE
// ═══════════════════════════════════════════════

function handlePhoneSubmit(e) {
  e.preventDefault();
  
  const countryCode = document.getElementById('countryCode').value;
  const phone = document.getElementById('phone').value.trim();
  const consent = document.getElementById('consent').checked;

  if (!consent) {
    showError('phoneForm', 'Please accept the Terms & Privacy Policy');
    return;
  }

  if (!/^\d{10,15}$/.test(phone)) {
    showError('phoneForm', 'Invalid phone number. Use 10-15 digits only.');
    return;
  }

  formState.phoneNumber = countryCode + phone;
  formState.consent = consent;

  console.log('✓ Phone:', formState.phoneNumber);
  goToStep(2);
}

// ═══════════════════════════════════════════════
// STEP 2: BIRTH
// ═══════════════════════════════════════════════

function formatBirthTime(e) {
  const input = e.target;
  let value = input.value.trim();

  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
    input.value = value + ':00';
  } else if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]:$/.test(value)) {
    input.value = value + '00';
  } else if (/^([01]?[0-9]|2[0-3])$/.test(value)) {
    input.value = value + ':00:00';
  }
}

function handleBirthSubmit(e) {
  e.preventDefault();
  
  const birthDate = document.getElementById('birthDate').value;
  let birthTime = document.getElementById('birthTime').value.trim();

  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(birthTime)) {
    birthTime = birthTime + ':00';
  }

  if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(birthTime)) {
    showError('birthForm', 'Birth time must be in HH:MM:SS format (e.g., 14:30:00)');
    return;
  }

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

  console.log('✓ Birth:', birthDate, birthTime);
  goToStep(3);
}

// ═══════════════════════════════════════════════
// STEP 3: LOCATION WITH PINCODE AUTO-FETCH
// ═══════════════════════════════════════════════

function resetLocationVerification() {
  formState.locationVerified = false;
  document.getElementById('submitBtn').disabled = true;
  
  const preview = document.getElementById('locationPreview');
  if (preview) {
    preview.style.display = 'none';
  }
  
  const geocodeBtn = document.getElementById('geocodeBtn');
  if (geocodeBtn) {
    geocodeBtn.disabled = false;
    geocodeBtn.textContent = 'Verify Location';
    geocodeBtn.style.background = '';
    geocodeBtn.style.color = '';
    geocodeBtn.style.borderColor = '';
  }
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// FIX: Auto-geocode with better error handling
async function autoGeocode() {
  const pincode = document.getElementById('pincode').value.trim();
  
  if (!pincode || pincode.length < 5) {
    return; // Don't try if too short
  }

  console.log('🔍 Auto-geocoding pincode:', pincode);

  try {
    const result = await reverseGeocodeFromPincode(pincode);
    
    if (result && result.city) {
      // Success - populate fields
      document.getElementById('city').value = result.city;
      if (result.countryCode) {
        document.getElementById('country').value = result.countryCode;
      }
      console.log('✓ Auto-populated:', result);
    } else {
      console.log('⚠ No location found for pincode:', pincode);
    }
  } catch (error) {
    console.log('⚠ Auto-geocode error:', error);
    // Silent fail - user can still enter manually
  }
}

// FIX: Pincode lookup with better error handling
async function reverseGeocodeFromPincode(pincode) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(pincode)}&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EffortEconomics/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const address = data[0].address || {};
      
      return {
        city: address.city || address.town || address.village || address.county || address.state_district || '',
        countryCode: address.country_code ? address.country_code.toUpperCase() : ''
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}

// Main geocode button handler
async function handleGeocode() {
  const country = document.getElementById('country').value;
  const pincode = document.getElementById('pincode').value.trim();
  const city = document.getElementById('city').value.trim();

  if (!country || !pincode || !city) {
    showError('locationForm', 'Please enter pin code, city, and select country');
    return;
  }

  const geocodeBtn = document.getElementById('geocodeBtn');
  geocodeBtn.disabled = true;
  geocodeBtn.textContent = 'Verifying...';

  try {
    const result = await geocodeLocation(country, pincode, city);
    
    if (result) {
      formState.country = country;
      formState.pincode = pincode;
      formState.city = city;
      formState.latitude = result.lat;
      formState.longitude = result.lon;
      formState.timezone = result.timezone;
      formState.tz_offset = TZ_OFFSETS[result.timezone] || 5.5;
      formState.locationVerified = true;

      console.log('✓ Location verified:', result);

      showLocationPreview(result);
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

async function geocodeLocation(country, pincode, city) {
  try {
    const query = `${city}, ${pincode}, ${getCountryName(country)}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'EffortEconomics/1.0' }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
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

async function getTimezone(lat, lon) {
  try {
    const url = `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.timeZone || guessTimezone(lat, lon);
  } catch (error) {
    return guessTimezone(lat, lon);
  }
}

function guessTimezone(lat, lon) {
  if (lat > 8 && lat < 35 && lon > 68 && lon < 97) return 'Asia/Kolkata';
  if (lat > 25 && lat < 48 && lon > -85 && lon < -65) return 'America/New_York';
  if (lat > 32 && lat < 49 && lon > -125 && lon < -114) return 'America/Los_Angeles';
  if (lat > 50 && lat < 60 && lon > -8 && lon < 2) return 'Europe/London';
  if (lat > 22 && lat < 27 && lon > 51 && lon < 57) return 'Asia/Dubai';
  if (lat > 1 && lat < 2 && lon > 103 && lon < 104) return 'Asia/Singapore';
  if (lat > -35 && lat < -33 && lon > 150 && lon < 152) return 'Australia/Sydney';
  return 'UTC';
}

function getCountryName(code) {
  const countries = {
    'IN': 'India', 'US': 'United States', 'GB': 'United Kingdom',
    'AE': 'United Arab Emirates', 'SG': 'Singapore', 'AU': 'Australia',
    'CA': 'Canada', 'DE': 'Germany', 'FR': 'France', 'JP': 'Japan',
    'CN': 'China', 'BR': 'Brazil', 'MX': 'Mexico'
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

// ═══════════════════════════════════════════════
// FINAL SUBMIT - REAL API CALL
// ═══════════════════════════════════════════════

async function handleFinalSubmit(e) {
  e.preventDefault();

  if (!formState.locationVerified) {
    showError('locationForm', 'Please verify location first');
    return;
  }

  const loadingIndicator = document.getElementById('loadingIndicator');
  const submitBtn = document.getElementById('submitBtn');
  
  loadingIndicator.style.display = 'block';
  submitBtn.disabled = true;

  const payload = {
    phone_number: formState.phone.replace(/\D/g, ''),
    consent: formState.consent,
    birth_date: formState.birthDate,
    birth_time: formState.birthTime,
    latitude: formState.latitude,
    longitude: formState.longitude,
    tz_offset: formState.tz_offset
  };

  console.log('→ Calling API:', API_URL);
  console.log('→ Payload:', payload);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('← Response status:', response.status);

    if (response.status === 429) {
      throw new Error('Maximum 3 calculations reached for this phone number.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('← Response data:', data);

    if (!data.success) {
      throw new Error(data.error || 'Calculation failed');
    }

    // Store result
    localStorage.setItem('effortResult', JSON.stringify(data.output));
    localStorage.setItem('effortMeta', JSON.stringify(data.meta));

    // Redirect
    window.location.href = 'result.html';

  } catch (error) {
    console.error('✗ API error:', error);
    showError('locationForm', error.message || 'Calculation failed. Please try again.');
    loadingIndicator.style.display = 'none';
    submitBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════

function goToStep(stepNumber) {
  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.remove('active');
  });

  document.getElementById(`step${stepNumber}`).classList.add('active');
  updateProgress(stepNumber);
  formState.currentStep = stepNumber;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
  if (!form) return;
  
  let errorDiv = form.querySelector('.error-message');
  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    form.appendChild(errorDiv);
  }
  
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
  
  setTimeout(() => errorDiv.classList.remove('show'), 6000);
}
