// form.js - Production connected to Azure Function

const formState = {
  currentStep: 1,
  phone: null,
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

document.addEventListener('DOMContentLoaded', function () {
  initializeForm();
});

function initializeForm() {
  const phoneForm = document.getElementById('phoneForm');
  if (phoneForm) phoneForm.addEventListener('submit', handlePhoneSubmit);

  const birthForm = document.getElementById('birthForm');
  if (birthForm) birthForm.addEventListener('submit', handleBirthSubmit);

  const birthTimeInput = document.getElementById('birthTime');
  if (birthTimeInput) birthTimeInput.addEventListener('blur', formatBirthTime);

  const pincodeInput = document.getElementById('pincode');
  if (pincodeInput)
    pincodeInput.addEventListener('input', debounce(autoGeocode, 1000));

  const geocodeBtn = document.getElementById('geocodeBtn');
  if (geocodeBtn) geocodeBtn.addEventListener('click', handleGeocode);

  const locationForm = document.getElementById('locationForm');
  if (locationForm)
    locationForm.addEventListener('submit', handleFinalSubmit);
}

// STEP 1

async function handlePhoneSubmit(e) {
  e.preventDefault();

  const countryCode = document.getElementById('countryCode').value;
  const phone = document.getElementById('phone').value;
  const consent = document.getElementById('consent').checked;

  if (!consent) {
    showError('phoneForm', 'Please accept the Terms & Privacy Policy');
    return;
  }

  formState.phone = countryCode + phone;
  goToStep(2);
}

// STEP 2

function formatBirthTime(e) {
  const input = e.target;
  let value = input.value.trim();

  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value))
    input.value = value + ':00';
}

function handleBirthSubmit(e) {
  e.preventDefault();

  const birthDate = document.getElementById('birthDate').value;
  let birthTime = document.getElementById('birthTime').value.trim();

  if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(birthTime)) {
    showError('birthForm', 'Birth time must be HH:MM:SS');
    return;
  }

  formState.birthDate = birthDate;
  formState.birthTime = birthTime;

  goToStep(3);
}

// STEP 3

async function handleGeocode() {
  const country = document.getElementById('country').value;
  const pincode = document.getElementById('pincode').value;
  const city = document.getElementById('city').value;

  if (!country || !pincode || !city) {
    showError('locationForm', 'Please enter pin code, city and country');
    return;
  }

  const result = await geocodeLocation(country, pincode, city);
  if (!result) {
    showError('locationForm', 'Location not found');
    return;
  }

  formState.latitude = result.lat;
  formState.longitude = result.lon;
  formState.locationVerified = true;

  document.getElementById('submitBtn').disabled = false;
}

async function geocodeLocation(country, pincode, city) {
  const query = `${city}, ${pincode}, ${country}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data || data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}

// FINAL SUBMIT — CONNECTED TO AZURE

async function handleFinalSubmit(e) {
  e.preventDefault();

  if (!formState.locationVerified) {
    showError('locationForm', 'Please verify location first');
    return;
  }

  document.getElementById('loadingIndicator').style.display = 'block';
  document.getElementById('submitBtn').disabled = true;

  try {
    const response = await fetch(
      'https://effort-economics-api.azurewebsites.net/api/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: formState.phone.replace(/\D/g, ''),
          consent: true,
          birth_date: formState.birthDate,
          birth_time: formState.birthTime,
          latitude: formState.latitude,
          longitude: formState.longitude,
          tz_offset: 5.5
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Calculation failed");
    }

    localStorage.setItem('effortResult', JSON.stringify(result.output));
    window.location.href = 'result.html';

  } catch (error) {
    console.error(error);
    showError('locationForm', 'Calculation failed. Please try again.');
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('submitBtn').disabled = false;
  }
}

// HELPERS

function goToStep(stepNumber) {
  document.querySelectorAll('.form-step').forEach(step =>
    step.classList.remove('active')
  );
  document.getElementById(`step${stepNumber}`).classList.add('active');
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
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
}
