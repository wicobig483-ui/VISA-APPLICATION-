<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VISA APPLICATION · streamline</title>
  <!-- Font Awesome for Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    body {
      background: linear-gradient(145deg, #eef2f7 0%, #d9e2ec 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }

    /* main card */
    .visa-container {
      max-width: 1200px;
      width: 100%;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 2.5rem;
      box-shadow: 0 30px 50px -20px rgba(0, 20, 40, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.6) inset;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    /* header */
    .visa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 2.5rem;
      background: rgba(255, 255, 255, 0.5);
      border-bottom: 1px solid rgba(0, 40, 80, 0.1);
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      background: #0b2a4f;
      color: white;
      width: 48px;
      height: 48px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      box-shadow: 0 8px 18px -6px #0b2a4f50;
    }

    .logo-text h1 {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #0b2a4f;
      line-height: 1.2;
    }

    .logo-text span {
      font-size: 0.85rem;
      font-weight: 500;
      color: #4d6278;
      letter-spacing: 0.3px;
    }

    .step-indicator {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .step-badge {
      background: white;
      border-radius: 40px;
      padding: 0.45rem 1.2rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #0b2a4f;
      box-shadow: 0 4px 10px -6px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(11, 42, 79, 0.15);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .step-badge i {
      color: #1e7e6c;
      font-size: 0.9rem;
    }

    /* main content area */
    .visa-main {
      display: flex;
      flex-direction: row;
      min-height: 600px;
    }

    /* left sidebar – application summary / progress */
    .summary-panel {
      width: 300px;
      background: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(8px);
      padding: 2rem 1.5rem;
      border-right: 1px solid rgba(0, 40, 80, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .progress-block h3 {
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #405b73;
      margin-bottom: 1.8rem;
      font-weight: 600;
    }

    .step-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      opacity: 0.6;
      transition: 0.2s;
    }

    .step-item.active {
      opacity: 1;
    }

    .step-item.completed .step-circle {
      background: #1e7e6c;
      color: white;
      border-color: #1e7e6c;
    }

    .step-item.completed .step-circle i {
      font-size: 0.9rem;
    }

    .step-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: white;
      border: 1.5px solid #b6c9db;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #2e4b68;
      font-size: 0.95rem;
      transition: 0.2s;
    }

    .step-item.active .step-circle {
      background: #0b2a4f;
      color: white;
      border-color: #0b2a4f;
      box-shadow: 0 6px 14px -6px #0b2a4f90;
    }

    .step-info {
      font-weight: 600;
      color: #1b344b;
      font-size: 0.95rem;
    }

    .step-info small {
      display: block;
      font-weight: 400;
      font-size: 0.75rem;
      color: #5d748b;
      margin-top: 2px;
    }

    .security-note {
      background: rgba(30, 126, 108, 0.08);
      border-radius: 20px;
      padding: 1.2rem;
      margin-top: 2rem;
      border: 1px solid rgba(30, 126, 108, 0.2);
      font-size: 0.85rem;
      color: #1e5a4f;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .security-note i {
      font-size: 1.2rem;
      margin-top: 2px;
    }

    /* right side – form */
    .form-panel {
      flex: 1;
      padding: 2rem 2.5rem;
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(4px);
    }

    .form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
    }

    .form-header h2 {
      font-size: 1.8rem;
      font-weight: 700;
      color: #0b2a4f;
      letter-spacing: -0.02em;
    }

    .form-header p {
      font-size: 0.9rem;
      color: #4a627a;
      margin-top: 0.2rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .application-id {
      background: white;
      padding: 0.4rem 1rem;
      border-radius: 40px;
      font-weight: 500;
      font-size: 0.8rem;
      color: #0b2a4f;
      border: 1px solid #d0dfec;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem 1.8rem;
    }

    .full-width {
      grid-column: span 2;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .input-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #1d3d5a;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .input-group label i {
      color: #587b9c;
      font-size: 0.9rem;
    }

    .input-group input,
    .input-group select,
    .input-group textarea {
      background: white;
      border: 1px solid #cfdeed;
      border-radius: 16px;
      padding: 0.9rem 1.2rem;
      font-size: 0.95rem;
      color: #102a41;
      transition: 0.2s;
      outline: none;
      font-weight: 500;
      width: 100%;
    }

    .input-group input:focus,
    .input-group select:focus,
    .input-group textarea:focus {
      border-color: #1e7e6c;
      box-shadow: 0 0 0 4px rgba(30, 126, 108, 0.15);
      background: #ffffff;
    }

    .input-group input::placeholder {
      color: #91a9c1;
      font-weight: 400;
      font-size: 0.9rem;
    }

    .radio-group {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      padding-top: 0.3rem;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      color: #1d3d5a;
    }

    .radio-option input[type="radio"] {
      width: 18px;
      height: 18px;
      accent-color: #1e7e6c;
      margin: 0;
    }

    .document-section {
      margin-top: 1.8rem;
      padding-top: 1rem;
      border-top: 1px dashed #c0d3e5;
    }

    .document-section h4 {
      font-size: 0.95rem;
      font-weight: 600;
      color: #0b2a4f;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .file-upload-area {
      background: #f6faff;
      border: 2px dashed #b8cde0;
      border-radius: 20px;
      padding: 1.5rem;
      text-align: center;
      color: #3e5c78;
      transition: 0.2s;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }

    .file-upload-area i {
      font-size: 2rem;
      color: #1e7e6c;
      opacity: 0.8;
    }

    .file-upload-area span {
      font-weight: 500;
      font-size: 0.9rem;
    }

    .file-upload-area small {
      font-size: 0.75rem;
      color: #7a94ac;
    }

    .file-upload-area:hover {
      background: #eaf2fc;
      border-color: #1e7e6c;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2.5rem;
      align-items: center;
    }

    .btn {
      border: none;
      padding: 0.9rem 2rem;
      border-radius: 40px;
      font-weight: 600;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      cursor: pointer;
      transition: 0.2s;
      background: white;
      color: #1d3d5a;
      border: 1px solid #c7d9e9;
      box-shadow: 0 4px 10px -8px rgba(0, 0, 0, 0.1);
    }

    .btn-primary {
      background: #0b2a4f;
      color: white;
      border: none;
      box-shadow: 0 10px 20px -10px #0b2a4f;
    }

    .btn-primary:hover {
      background: #123a66;
      transform: scale(1.02);
    }

    .btn-secondary:hover {
      background: #f0f6fe;
      border-color: #9bb5cd;
    }

    .btn i {
      font-size: 0.9rem;
    }

    /* toast / success message */
    .toast-message {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #1e7e6c;
      color: white;
      padding: 1rem 2rem;
      border-radius: 50px;
      font-weight: 600;
      box-shadow: 0 20px 30px -12px #0b2a4f;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      transform: translateY(100px);
      opacity: 0;
      transition: 0.3s ease;
      z-index: 999;
    }

    .toast-message.show {
      transform: translateY(0);
      opacity: 1;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .visa-main {
        flex-direction: column;
      }
      .summary-panel {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid rgba(0, 40, 80, 0.08);
        flex-direction: row;
        flex-wrap: wrap;
        padding: 1.5rem;
      }
      .progress-block {
        flex: 1;
      }
      .step-list {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 0.8rem;
      }
      .security-note {
        display: none;
      }
    }

    @media (max-width: 600px) {
      .visa-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        padding: 1.2rem 1.5rem;
      }
      .form-panel {
        padding: 1.5rem;
      }
      .form-grid {
        grid-template-columns: 1fr;
        gap: 1.2rem;
      }
      .full-width {
        grid-column: span 1;
      }
      .form-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .step-list {
        flex-direction: column;
      }
      .form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }
      .btn {
        justify-content: center;
      }
    }
  </style>
</head>
<body>

<div class="visa-container">
  <!-- HEADER -->
  <header class="visa-header">
    <div class="logo-area">
      <div class="logo-icon">
        <i class="fas fa-passport"></i>
      </div>
      <div class="logo-text">
        <h1>VISA·APPLY</h1>
        <span>streamlined entry system</span>
      </div>
    </div>
    <div class="step-indicator">
      <div class="step-badge">
        <i class="fas fa-shield-alt"></i> secure · encrypted
      </div>
    </div>
  </header>

  <!-- MAIN -->
  <div class="visa-main">
    <!-- LEFT SUMMARY / PROGRESS -->
    <aside class="summary-panel">
      <div class="progress-block">
        <h3><i class="fas fa-tasks" style="margin-right: 8px;"></i> Application progress</h3>
        <ul class="step-list">
          <li class="step-item completed">
            <div class="step-circle"><i class="fas fa-check"></i></div>
            <div class="step-info">Personal info <small>Completed</small></div>
          </li>
          <li class="step-item completed">
            <div class="step-circle"><i class="fas fa-check"></i></div>
            <div class="step-info">Travel details <small>Completed</small></div>
          </li>
          <li class="step-item active">
            <div class="step-circle">3</div>
            <div class="step-info">Documents <small>In progress</small></div>
          </li>
          <li class="step-item">
            <div class="step-circle">4</div>
            <div class="step-info">Review & submit <small>Pending</small></div>
          </li>
        </ul>
      </div>
      <div class="security-note">
        <i class="fas fa-lock"></i>
        <span>Your data is protected with 256-bit encryption. All documents are securely stored.</span>
      </div>
    </aside>

    <!-- RIGHT FORM PANEL -->
    <section class="form-panel">
      <div class="form-header">
        <div>
          <h2>Visa application</h2>
          <p><i class="fas fa-globe-americas"></i> All fields are required unless marked optional</p>
        </div>
        <div class="application-id">
          <i class="fas fa-hashtag"></i> VA-2025-0842
        </div>
      </div>

      <!-- FORM -->
      <form id="visaForm">
        <div class="form-grid">
          <!-- PERSONAL INFO -->
          <div class="input-group">
            <label><i class="fas fa-user"></i> Full name (as in passport)</label>
            <input type="text" placeholder="e.g. Sarah Chen" value="Sarah Chen" required>
          </div>
          <div class="input-group">
            <label><i class="fas fa-calendar-alt"></i> Date of birth</label>
            <input type="date" value="1988-04-12" required>
          </div>
          <div class="input-group">
            <label><i class="fas fa-passport"></i> Passport number</label>
            <input type="text" placeholder="e.g. AB1234567" value="X2849103" required>
          </div>
          <div class="input-group">
            <label><i class="fas fa-flag"></i> Nationality</label>
            <select required>
              <option value="United States" selected>United States</option>
              <option value="Canada">Canada</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Germany">Germany</option>
              <option value="Australia">Australia</option>
              <option value="Japan">Japan</option>
            </select>
          </div>

          <!-- TRAVEL INFO -->
          <div class="input-group">
            <label><i class="fas fa-plane-departure"></i> Purpose of visit</label>
            <select required>
              <option value="Tourism" selected>Tourism</option>
              <option value="Business">Business</option>
              <option value="Study">Study</option>
              <option value="Transit">Transit</option>
              <option value="Family visit">Family visit</option>
            </select>
          </div>
          <div class="input-group">
            <label><i class="fas fa-calendar-check"></i> Intended arrival date</label>
            <input type="date" value="2025-08-20" required>
          </div>
          <div class="input-group">
            <label><i class="fas fa-clock"></i> Duration of stay (days)</label>
            <input type="number" placeholder="30" value="21" min="1" required>
          </div>
          <div class="input-group">
            <label><i class="fas fa-building"></i> Accommodation address</label>
            <input type="text" placeholder="Hotel or residence" value="Grand Plaza Hotel, 123 Main St" required>
          </div>

          <!-- CONTACT -->
          <div class="input-group full-width">
            <label><i class="fas fa-envelope"></i> Email address</label>
            <input type="email" placeholder="you@example.com" value="sarah.chen@example.com" required>
          </div>
          <div class="input-group full-width">
            <label><i class="fas fa-phone-alt"></i> Phone number</label>
            <input type="tel" placeholder="+1 (555) 123-4567" value="+1 (415) 892-3344" required>
          </div>

          <!-- GENDER (radio) -->
          <div class="input-group full-width">
            <label><i class="fas fa-venus-mars"></i> Gender</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="gender" value="female" checked> Female
              </label>
              <label class="radio-option">
                <input type="radio" name="gender" value="male"> Male
              </label>
              <label class="radio-option">
                <input type="radio" name="gender" value="other"> Other
              </label>
            </div>
          </div>
        </div>

        <!-- DOCUMENT UPLOAD -->
        <div class="document-section">
          <h4><i class="fas fa-paperclip"></i> Upload supporting documents</h4>
          <div class="file-upload-area" id="fileUploadArea">
            <i class="fas fa-cloud-upload-alt"></i>
            <span>Click or drag to upload passport copy</span>
            <small>PDF, JPG, PNG up to 5MB</small>
            <input type="file" id="fileInput" style="display: none;" accept=".pdf,.jpg,.jpeg,.png">
          </div>
          <div style="margin-top: 0.8rem; font-size: 0.8rem; color: #3b6b5e;" id="fileNameDisplay"></div>
        </div>

        <!-- ACTIONS -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="saveDraftBtn">
            <i class="fas fa-save"></i> Save draft
          </button>
          <button type="submit" class="btn btn-primary" id="submitBtn">
            <i class="fas fa-paper-plane"></i> Submit application
          </button>
        </div>
      </form>
    </section>
  </div>
</div>

<!-- Toast message -->
<div class="toast-message" id="toast">
  <i class="fas fa-check-circle"></i> <span id="toastText">Application submitted successfully!</span>
</div>

<script>
  (function() {
    // DOM elements
    const form = document.getElementById('visaForm');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const submitBtn = document.getElementById('submitBtn');

    // ----- File upload interaction -----
    fileUploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // drag & drop
    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.style.background = '#e0f0ea';
      fileUploadArea.style.borderColor = '#1e7e6c';
    });

    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.style.background = '#f6faff';
      fileUploadArea.style.borderColor = '#b8cde0';
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.style.background = '#f6faff';
      fileUploadArea.style.borderColor = '#b8cde0';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        updateFileNameDisplay(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (fileInput.files.length > 0) {
        updateFileNameDisplay(fileInput.files[0]);
      } else {
        fileNameDisplay.textContent = '';
      }
    });

    function updateFileNameDisplay(file) {
      if (file) {
        fileNameDisplay.innerHTML = `<i class="fas fa-check-circle" style="color:#1e7e6c;"></i> ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      } else {
        fileNameDisplay.textContent = '';
      }
    }

    // ----- Toast helper -----
    function showToast(message, isSuccess = true) {
      toastText.textContent = message;
      toast.style.background = isSuccess ? '#1e7e6c' : '#b13a3a';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
    }

    // ----- Save draft (simulated) -----
    saveDraftBtn.addEventListener('click', () => {
      // simulate saving - collect form values (not really stored, just UX)
      showToast('Draft saved securely. You can continue later.', true);
    });

    // ----- Form submission (with validation) -----
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Basic validation: check required fields (HTML5 already does, but we double-check)
      const inputs = form.querySelectorAll('input[required], select[required]');
      let allFilled = true;
      inputs.forEach(input => {
        if (!input.value.trim()) {
          allFilled = false;
          input.style.borderColor = '#b13a3a';
        } else {
          input.style.borderColor = '#cfdeed';
        }
      });

      if (!allFilled) {
        showToast('Please fill in all required fields.', false);
        return;
      }

      // Additional: check if file uploaded (optional, just as a soft reminder)
      if (!fileInput.files.length) {
        // Not strictly required for the demo, but we can show info
        showToast('Note: You have not uploaded a passport copy. You can upload later.', false);
        // but we still continue because it's not "required" in this demo
      }

      // Success simulation
      showToast('✅ Application submitted successfully! Reference: VA-2025-0842', true);

      // Change submit button state
      submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Submitted';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.8';
      submitBtn.style.cursor = 'default';

      // Optionally reset after a few seconds? We'll keep it disabled for demo.

      // Also update progress steps to "completed" (visual)
      const stepItems = document.querySelectorAll('.step-item');
      stepItems.forEach(item => item.classList.add('completed'));
      // Remove active from all, maybe keep last as active? but fine.
      document.querySelectorAll('.step-item.active').forEach(el => el.classList.remove('active'));
    });

    // Reset border color on input
    form.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', function() {
        this.style.borderColor = '#cfdeed';
      });
    });

    // Tooltip for file upload (small UX)
    fileUploadArea.addEventListener('mouseenter', () => {
      fileUploadArea.style.transition = '0.2s';
    });
  })();
</script>

<!-- tiny extra style for disabled button -->
<style>
  .btn-primary:disabled {
    background: #2c577e;
    transform: none;
    box-shadow: none;
    opacity: 0.7;
    cursor: default;
  }
  .btn-primary:disabled:hover {
    background: #2c577e;
    transform: none;
  }
</style>

</body>
</html>