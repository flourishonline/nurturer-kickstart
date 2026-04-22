// =========================================================
// Nurturer Brand Kick Start Generator - Frontend
// =========================================================

const state = {
  accessCode: null,
  retrievalCode: null,
  currentStep: 1,
  formData: {},
  results: null
};

// =========================================================
// VIEW MANAGEMENT
// =========================================================
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showStep(stepNum) {
  state.currentStep = stepNum;
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.querySelector(`.step-${stepNum}`).classList.add('active');

  document.querySelectorAll('.step-indicator').forEach(ind => {
    const stepIndex = parseInt(ind.dataset.step);
    ind.classList.remove('active', 'complete');
    if (stepIndex === stepNum) ind.classList.add('active');
    else if (stepIndex < stepNum) ind.classList.add('complete');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================
// FORM HANDLERS
// =========================================================
document.getElementById('form-access').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('access-code').value.trim().toUpperCase();
  const errorEl = document.getElementById('access-error');
  errorEl.hidden = true;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Checking...';
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: code })
    });
    const data = await res.json();

    if (res.ok && data.valid) {
      state.accessCode = code;
      sessionStorage.setItem('nurturer_access', code);
      showView('view-form');
      showStep(1);
    } else {
      errorEl.textContent = data.error || "That code didn't work. Please check it and try again.";
      errorEl.hidden = false;
    }
  } catch (err) {
    errorEl.textContent = "Something went wrong. Please try again in a moment.";
    errorEl.hidden = false;
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

document.getElementById('form-load').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('retrieval-code').value.trim().toUpperCase();
  const errorEl = document.getElementById('load-error');
  errorEl.hidden = true;

  if (!code) {
    errorEl.textContent = "Please enter a retrieval code.";
    errorEl.hidden = false;
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Loading...';

  try {
    const res = await fetch('/api/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retrievalCode: code })
    });
    const data = await res.json();

    if (res.ok && data.found) {
      state.retrievalCode = code;
      state.accessCode = data.accessCode;

      if (data.results) {
        // Already generated - go straight to results
        state.results = data.results;
        state.formData = data.formData;
        renderResults();
        showView('view-results');
        document.getElementById('retrieval-banner').hidden = false;
        document.getElementById('retrieval-display').textContent = code;
      } else if (data.formData) {
        // Form in progress - restore and show form
        state.formData = data.formData;
        restoreFormData(data.formData);
        showView('view-form');
        showStep(1);
      }
    } else {
      errorEl.textContent = data.error || "We couldn't find that code. Please check and try again.";
      errorEl.hidden = false;
    }
  } catch (err) {
    errorEl.textContent = "Something went wrong. Please try again.";
    errorEl.hidden = false;
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Step navigation
document.querySelectorAll('[data-next]').forEach(btn => {
  btn.addEventListener('click', () => {
    const nextStep = parseInt(btn.dataset.next);
    if (validateCurrentStep()) {
      collectCurrentStepData();
      showStep(nextStep);
    }
  });
});

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => {
    collectCurrentStepData();
    showStep(parseInt(btn.dataset.back));
  });
});

function validateCurrentStep() {
  const step = document.querySelector(`.step-${state.currentStep}`);
  const requiredFields = step.querySelectorAll('[required]');
  let valid = true;
  let firstInvalid = null;

  requiredFields.forEach(field => {
    if (!field.value.trim()) {
      field.style.borderColor = 'var(--crimson)';
      if (!firstInvalid) firstInvalid = field;
      valid = false;
    } else {
      field.style.borderColor = '';
    }
  });

  if (!valid && firstInvalid) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

function collectCurrentStepData() {
  const form = document.getElementById('form-main');
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    state.formData[key] = value;
  }
}

function restoreFormData(data) {
  Object.entries(data).forEach(([key, value]) => {
    const field = document.querySelector(`[name="${key}"]`);
    if (!field) return;
    if (field.type === 'radio') {
      const radio = document.querySelector(`[name="${key}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else {
      field.value = value;
    }
  });
}

// Save progress button
document.getElementById('btn-save-progress').addEventListener('click', async () => {
  collectCurrentStepData();
  if (!Object.keys(state.formData).length) {
    alert("Fill in at least a few fields before saving.");
    return;
  }

  const btn = document.getElementById('btn-save-progress');
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/save-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode: state.accessCode,
        formData: state.formData,
        retrievalCode: state.retrievalCode
      })
    });
    const data = await res.json();

    if (res.ok) {
      state.retrievalCode = data.retrievalCode;
      alert(`Your progress has been saved.\n\nYour retrieval code is:\n${data.retrievalCode}\n\nSave this code. You can return anytime to continue where you left off.`);
    } else {
      alert(data.error || "Something went wrong. Please try again.");
    }
  } catch (err) {
    alert("Something went wrong. Please try again.");
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// Main form submission
document.getElementById('form-main').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateCurrentStep()) return;
  collectCurrentStepData();

  showView('view-loading');
  updateLoadingMessage();

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode: state.accessCode,
        formData: state.formData,
        retrievalCode: state.retrievalCode
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Generation failed');
    }

    const data = await res.json();
    state.results = data.results;
    state.retrievalCode = data.retrievalCode;

    renderResults();
    showView('view-results');
    document.getElementById('retrieval-banner').hidden = false;
    document.getElementById('retrieval-display').textContent = data.retrievalCode;
  } catch (err) {
    alert(`Something went wrong generating your Kick Start: ${err.message}\n\nPlease try again in a moment. If it keeps failing, email hello@flourishonline.com.`);
    showView('view-form');
  }
});

// =========================================================
// LOADING MESSAGES (rotating)
// =========================================================
const loadingMessages = [
  "Reading your answers...",
  "Shaping your brand foundation...",
  "Writing your social bio...",
  "Crafting your tagline options...",
  "Building your content pillars...",
  "Designing your offer structure...",
  "Mapping your 90 day plan...",
  "Almost there, putting it all together..."
];

function updateLoadingMessage() {
  let i = 0;
  const msgEl = document.getElementById('loading-message');
  const interval = setInterval(() => {
    if (document.getElementById('view-loading').classList.contains('active')) {
      msgEl.textContent = loadingMessages[i % loadingMessages.length];
      i++;
    } else {
      clearInterval(interval);
    }
  }, 8000);
}

// =========================================================
// RESULTS RENDERING
// =========================================================
function renderResults() {
  const r = state.results;
  const name = state.formData.yourName || 'You';
  document.getElementById('results-name').textContent = name;

  const container = document.getElementById('results-content');
  container.innerHTML = '';

  // Section 1: Brand Foundation
  container.appendChild(makeSection('1 · Your Brand Foundation', `
    <h3>Your Why</h3>
    <p>${escapeHtml(r.brandFoundation.why)}</p>

    <h3>Your Vision</h3>
    <p>${escapeHtml(r.brandFoundation.vision)}</p>

    <h3>Your Mission</h3>
    <p>${escapeHtml(r.brandFoundation.mission)}</p>

    <h3>Your Values</h3>
    ${renderList(r.brandFoundation.values)}

    <h3>Your Weird</h3>
    <p>${escapeHtml(r.brandFoundation.weird)}</p>

    <h3>Your Love Factor</h3>
    <p>${escapeHtml(r.brandFoundation.loveFactor)}</p>
  `));

  // Section 2: Tagline Options
  const taglines = r.taglines.map(t => `<div class="tagline-option">${escapeHtml(t)}</div>`).join('');
  container.appendChild(makeSection('2 · Tagline Options', taglines));

  // Section 3: Social Bio
  container.appendChild(makeSection('3 · Social Bio', `
    <h4>Short version (Instagram, Twitter, etc.)</h4>
    <p>${escapeHtml(r.socialBio.short)}</p>

    <h4>Long version (LinkedIn, About page, Substack)</h4>
    <p>${escapeHtml(r.socialBio.long).replace(/\n/g, '<br>')}</p>
  `));

  // Section 4: Content Pillars
  const pillars = r.contentPillars.map(p => `
    <h3>${escapeHtml(p.pillar)}</h3>
    <p>${escapeHtml(p.description)}</p>
    <h4>Post ideas</h4>
    ${renderList(p.postIdeas)}
  `).join('');
  container.appendChild(makeSection('4 · Content Pillars and Post Ideas', pillars));

  // Section 5: Offer Structure
  container.appendChild(makeSection('5 · Offer Structure Recommendations', `
    <h3>Your current offers, reviewed</h3>
    <p>${escapeHtml(r.offerStructure.review).replace(/\n/g, '<br>')}</p>

    <h3>Recommended offer suite</h3>
    ${renderOffers(r.offerStructure.recommendedSuite)}

    <h3>Key refinements</h3>
    ${renderList(r.offerStructure.refinements)}
  `));

  // Section 6: 90 Day Plan
  const weeks = r.ninetyDayPlan.weeks.map((w, i) => `
    <div class="week-block">
      <h4>Week ${i + 1} · ${escapeHtml(w.theme)}</h4>
      ${renderList(w.tasks)}
    </div>
  `).join('');
  container.appendChild(makeSection('6 · Your 90 Day Kick Start Plan', `
    <p><em>${escapeHtml(r.ninetyDayPlan.intro)}</em></p>
    ${weeks}
  `));
}

function makeSection(title, innerHtml) {
  const section = document.createElement('section');
  section.className = 'result-section';
  section.innerHTML = `<h2>${escapeHtml(title)}</h2>${innerHtml}`;
  return section;
}

function renderList(items) {
  if (!items || !items.length) return '';
  return `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

function renderOffers(offers) {
  if (!offers || !offers.length) return '';
  return offers.map(o => `
    <h4>${escapeHtml(o.tier)}: ${escapeHtml(o.name)}</h4>
    <p>${escapeHtml(o.description)}</p>
  `).join('');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =========================================================
// DOWNLOAD HANDLERS
// =========================================================
document.getElementById('btn-download-pdf').addEventListener('click', async () => {
  await downloadFile('pdf');
});

document.getElementById('btn-download-docx').addEventListener('click', async () => {
  await downloadFile('docx');
});

async function downloadFile(format) {
  const btn = format === 'pdf' ? document.getElementById('btn-download-pdf') : document.getElementById('btn-download-docx');
  const originalText = btn.textContent;
  btn.textContent = 'Preparing...';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/download?format=${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        results: state.results,
        formData: state.formData
      })
    });

    if (!res.ok) throw new Error('Download failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (state.formData.yourName || 'My').replace(/\s+/g, '_');
    a.href = url;
    a.download = `${name}_Nurturer_Kick_Start.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Download failed. Please try again.');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// Save results button (same endpoint as save-progress but with results)
document.getElementById('btn-save-results').addEventListener('click', async () => {
  if (!state.retrievalCode) {
    alert("Your retrieval code is shown above. Save it somewhere safe to return to your Kick Start later.");
    return;
  }
  alert(`Your retrieval code is:\n\n${state.retrievalCode}\n\nSave this code. You can return anytime to view your Kick Start.`);
});

// =========================================================
// SESSION RESTORE
// =========================================================
(function init() {
  const savedAccess = sessionStorage.getItem('nurturer_access');
  // Don't auto-advance; always require re-entry for security
  // But we could pre-fill the access code field if desired
})();
