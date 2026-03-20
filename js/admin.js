/* =========================================================
   ADMIN.JS — Authentication + Admin form logic
   Default password: admin123
   ========================================================= */

const Admin = {
  isLoggedIn() {
    try { return sessionStorage.getItem('re_admin') === 'true'; }
    catch (e) { return false; }
  },

  async getAuthDoc() {
    const settings = (await DB.settings.get()) || [];
    let authDoc = settings.find(s => s.type === 'admin_auth');
    if (!authDoc) {
      const defaultAuth = {
        type: 'admin_auth',
        passwordHash: btoa('admin123'),
        sqQuestion: 'What is the name of your first pet?',
        sqAnswerHash: btoa('fluffy'.toLowerCase().trim())
      };
      const added = await DB.settings.add(defaultAuth);
      authDoc = { id: added.id, ...defaultAuth };
    }
    return authDoc;
  },

  async login(pw) {
    try {
      const authDoc = await this.getAuthDoc();
      if (btoa(pw) === authDoc.passwordHash) {
        try { sessionStorage.setItem('re_admin', 'true'); } catch (e) { }
        return true;
      }
    } catch (err) {
      console.error('Login error:', err);
    }
    return false;
  },

  logout() {
    try { sessionStorage.removeItem('re_admin'); } catch (e) { }
  },
};

// ---- UI helpers ----
function applyAdminUI() {
  const isAdmin = Admin.isLoggedIn();
  document.body.classList.toggle('admin-mode', isAdmin);

  const btn = document.getElementById('admin-btn');
  const badge = document.getElementById('admin-badge');
  const fab = document.getElementById('admin-fab');

  if (btn) {
    btn.innerHTML = isAdmin
      ? '🔓 <span>Admin Mode</span>'
      : '🔐 <span>Admin</span>';
  }
  if (badge) badge.style.display = isAdmin ? 'inline-block' : 'none';

  // Fix: control FAB with inline style here (overrides any stale inline style from loadPage)
  if (fab) {
    const listingPages = ['plots', 'flats', 'apartments', 'villas', 'commercial'];
    const currentPage = (location.hash || '#about').replace('#', '');
    fab.style.display = (isAdmin && listingPages.includes(currentPage)) ? 'flex' : 'none';
  }

  // Toggle Change Password button
  const cpwbtn = document.getElementById('admin-cpw-btn');
  if (cpwbtn) cpwbtn.style.display = isAdmin ? 'inline-block' : 'none';
}

// ---- Admin Modals ----
function showAdminLoginModal() {
  if (Admin.isLoggedIn()) {
    openModal('admin-logout-modal');
    return;
  }
  document.getElementById('admin-pw-error').textContent = '';
  document.getElementById('admin-pw-input').value = '';
  openModal('admin-login-modal');
}

function confirmLogout() {
  Admin.logout();
  closeModal('admin-logout-modal');
  applyAdminUI();
  showToast('Logged out of admin mode.');
  if (window._currentPage) window._currentPage();
}

async function handleAdminLogin() {
  const pw = document.getElementById('admin-pw-input').value;
  const err = document.getElementById('admin-pw-error');
  const btn = document.getElementById('admin-login-submit-btn');

  if (!pw) { err.textContent = 'Please enter a password.'; return; }

  if (btn) btn.disabled = true;
  if (window.showToast) showToast('Verifying...', 'info');

  const success = await Admin.login(pw);

  if (btn) btn.disabled = false;

  if (success) {
    closeModal('admin-login-modal');
    document.getElementById('admin-pw-input').value = '';
    err.textContent = '';
    applyAdminUI();
    showToast('✅ Admin mode activated!', 'success');
    if (window._currentPage) window._currentPage();
  } else {
    err.textContent = 'Incorrect password. Please try again.';
    document.getElementById('admin-pw-input').value = '';
    document.getElementById('admin-pw-input').focus();
  }
}

// ==== CHANGE PASSWORD ====
function openChangePasswordModal() {
  closeModal('admin-logout-modal');
  document.getElementById('cpw-current').value = '';
  document.getElementById('cpw-new').value = '';
  document.getElementById('cpw-sq').value = '';
  document.getElementById('cpw-sa').value = '';
  document.getElementById('cpw-error').textContent = '';
  openModal('admin-change-pw-modal');
}

async function submitChangePassword() {
  const currentPw = document.getElementById('cpw-current').value;
  const newPw = document.getElementById('cpw-new').value;
  const sq = document.getElementById('cpw-sq').value.trim();
  const sa = document.getElementById('cpw-sa').value.trim().toLowerCase();
  const err = document.getElementById('cpw-error');

  if (!currentPw || !newPw || !sq || !sa) {
    err.textContent = 'All fields are required.';
    return;
  }

  const btn = document.getElementById('cpw-submit-btn');
  btn.disabled = true;

  try {
    const authDoc = await Admin.getAuthDoc();
    if (btoa(currentPw) !== authDoc.passwordHash) {
      err.textContent = 'Current password is incorrect.';
      btn.disabled = false;
      return;
    }

    await DB.settings.update(authDoc.id, {
      passwordHash: btoa(newPw),
      sqQuestion: sq,
      sqAnswerHash: btoa(sa)
    });

    closeModal('admin-change-pw-modal');
    showToast('✅ Password changed successfully!', 'success');
  } catch (error) {
    console.error(error);
    err.textContent = 'Failed to save changes.';
  }
  btn.disabled = false;
}

// ==== FORGOT PASSWORD ====
async function openForgotPasswordModal() {
  closeModal('admin-login-modal');
  document.getElementById('fpw-answer').value = '';
  document.getElementById('fpw-error').textContent = '';
  document.getElementById('forgot-pw-step-1').style.display = 'block';
  document.getElementById('forgot-pw-footer-1').style.display = 'flex';
  document.getElementById('forgot-pw-step-2').style.display = 'none';
  document.getElementById('forgot-pw-footer-2').style.display = 'none';

  const authDoc = await Admin.getAuthDoc();
  document.getElementById('fpw-question-text').textContent = authDoc.sqQuestion;

  openModal('admin-forgot-pw-modal');
}

async function verifySecurityAnswer() {
  const ans = document.getElementById('fpw-answer').value.trim().toLowerCase();
  const err = document.getElementById('fpw-error');

  if (!ans) { err.textContent = 'Please enter an answer.'; return; }

  const authDoc = await Admin.getAuthDoc();
  if (btoa(ans) === authDoc.sqAnswerHash) {
    // Correct
    document.getElementById('forgot-pw-step-1').style.display = 'none';
    document.getElementById('forgot-pw-footer-1').style.display = 'none';
    document.getElementById('forgot-pw-step-2').style.display = 'block';
    document.getElementById('forgot-pw-footer-2').style.display = 'flex';
    document.getElementById('fpw-new-pw').value = '';
    document.getElementById('fpw-reset-error').textContent = '';
  } else {
    err.textContent = 'Incorrect answer.';
  }
}

async function submitResetPassword() {
  const newPw = document.getElementById('fpw-new-pw').value;
  const err = document.getElementById('fpw-reset-error');

  if (!newPw) { err.textContent = 'Please enter a new password.'; return; }

  const btn = document.getElementById('fpw-reset-btn');
  btn.disabled = true;

  try {
    const authDoc = await Admin.getAuthDoc();
    await DB.settings.update(authDoc.id, {
      passwordHash: btoa(newPw)
    });

    closeModal('admin-forgot-pw-modal');
    showToast('✅ Password has been reset!', 'success');
  } catch (error) {
    console.error(error);
    err.textContent = 'Failed to reset password.';
  }
  btn.disabled = false;
}

// ---- Generic Property Form ----
// type: 'plots' | 'flats' | 'villas'
// editItem: existing item to edit (or null for add)
function showPropertyForm(type, editItem = null) {
  if (!Admin.isLoggedIn()) { showToast('Please login as admin first.', 'error'); return; }

  const isEdit = !!editItem;
  const title = isEdit ? `Edit ${capitalize(type.slice(0, -1))}` : `Add New ${capitalize(type.slice(0, -1))}`;

  const formHtml = buildFormHtml(type, editItem ?? {});

  document.getElementById('prop-form-modal-title').textContent = title;
  document.getElementById('prop-form-fields').innerHTML = formHtml;
  document.getElementById('prop-form-type').value = type;
  document.getElementById('prop-form-id').value = editItem ? editItem.id : '';
  document.getElementById('prop-form-submit').textContent = isEdit ? '💾 Save Changes' : '✅ Add Listing';

  // Pre-load existing images into the preview grid (edit mode)
  if (editItem && Array.isArray(editItem.images) && editItem.images.length > 0) {
    const grid = document.getElementById('pf-image-grid');
    if (grid) editItem.images.forEach(src => addImagePreview(src, grid));
  }

  openModal('prop-form-modal');
}

function buildFormHtml(type, d = {}) {
  const commonTop = `
    <div class="form-group">
      <label class="form-label">Title *</label>
      <input class="form-control" id="pf-title" placeholder="e.g. Prime Plot in Koramangala" value="${esc(d.title || '')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">District</label>
        <input class="form-control" id="pf-district" placeholder="e.g. Hyderabad" value="${esc(d.district || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Village / Area</label>
        <input class="form-control" id="pf-village" placeholder="e.g. Madhapur" value="${esc(d.village || '')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Location *</label>
      <input class="form-control" id="pf-location" placeholder="e.g. Whitefield, Bangalore" value="${esc(d.location || '')}">
    </div>`;

  const getPriceAndDesc = (type, d) => `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Contact Number</label>
        <input class="form-control" id="pf-contactNumber" type="tel" placeholder="e.g. +91 98765 43210" value="${esc(d.contactNumber || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Google Map Location</label>
        <input class="form-control" id="pf-mapUrl" placeholder="Paste a Google Maps link..." value="${esc(d.mapUrl || '')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1">
        <label class="form-label">${type === 'plots' ? 'Price per Sq Yard *' : 'Price *'}</label>
        <input class="form-control" id="pf-price" placeholder="${type === 'plots' ? 'e.g. \u20b915,000' : 'e.g. \u20b945 Lakhs'}" value="${esc(d.price || '')}">
      </div>
      <div class="form-group" style="flex:1">
        <label class="form-label">Status *</label>
        <select class="form-control" id="pf-status">
          <option value="Available" ${d.status !== 'Sold Out' ? 'selected' : ''}>Available</option>
          <option value="Sold Out" ${d.status === 'Sold Out' ? 'selected' : ''}>Sold Out</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-control" id="pf-description" maxlength="5000" placeholder="Brief description of the property...">${esc(d.description || '')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Location Advantages <span style="font-weight:400;color:var(--mid-grey)">(optional)</span></label>
        <textarea class="form-control" id="pf-locationAdvantages" maxlength="2000" placeholder="Nearby schools, hospitals, transport...">${esc(d.locationAdvantages || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Project Highlights <span style="font-weight:400;color:var(--mid-grey)">(optional)</span></label>
        <textarea class="form-control" id="pf-projectHighlights" maxlength="2000" placeholder="Key features of the project...">${esc(d.projectHighlights || '')}</textarea>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Legal & Investment Benefits <span style="font-weight:400;color:var(--mid-grey)">(optional)</span></label>
        <textarea class="form-control" id="pf-legalBenefits" maxlength="2000" placeholder="Clear title, high ROI, etc...">${esc(d.legalBenefits || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Investment Potential <span style="font-weight:400;color:var(--mid-grey)">(optional)</span></label>
        <textarea class="form-control" id="pf-investmentPotential" maxlength="2000" placeholder="Future growth drivers...">${esc(d.investmentPotential || '')}</textarea>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Property Images <span style="color:var(--mid-grey);font-weight:400">(up to 4 photos)</span></label>
      <div class="img-upload-area" id="pf-drop-zone">
        <div class="img-preview-grid" id="pf-image-grid"></div>
        <label class="img-browse-btn" for="pf-image-input">
          <span>📁 Browse Images</span>
          <input type="file" id="pf-image-input" accept="image/*" multiple
            style="position:absolute;width:0;height:0;opacity:0"
            onchange="handleImageUpload(event)">
        </label>
        <p class="img-upload-hint">JPG / PNG / WEBP &nbsp;·&nbsp; Max 2 MB each &nbsp;·&nbsp; Up to 4 images</p>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">YouTube Video Link <span style="color:var(--mid-grey);font-weight:400">(optional)</span></label>
      <input class="form-control" id="pf-videoUrl"
        placeholder="e.g. https://www.youtube.com/watch?v=..."
        value="${esc(d.videoUrl || '')}">
      <small style="color:var(--mid-grey);font-size:0.78rem;margin-top:4px;display:block">Paste a YouTube link to embed a property tour video in the detail view.</small>
    </div>`;

  if (type === 'plots') {
    return commonTop + `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Area</label>
          <input class="form-control" id="pf-area" placeholder="e.g. 2400 sq ft" value="${esc(d.area || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Facing</label>
          <select class="form-control" id="pf-facing">
            ${['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West']
        .map(f => `<option ${d.facing === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Approved By</label>
          <input class="form-control" id="pf-approvedBy" placeholder="e.g. DTCP, BMRDA, Panchayat" value="${esc(d.approvedBy || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">LP Number</label>
          <input class="form-control" id="pf-lpNumber" placeholder="e.g. LP No. 123/2024" value="${esc(d.lpNumber || '')}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">RERA Approved</label>
          <div style="display:flex;gap:24px;margin-top:10px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.92rem;color:var(--navy)">
              <input type="radio" name="pf-rera" id="pf-rera-yes" value="Yes" ${d.reraApproved === 'Yes' ? 'checked' : ''} style="accent-color:var(--gold);width:16px;height:16px"> Yes
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.92rem;color:var(--navy)">
              <input type="radio" name="pf-rera" id="pf-rera-no" value="No" ${d.reraApproved !== 'Yes' ? 'checked' : ''} style="accent-color:var(--gold);width:16px;height:16px"> No
            </label>
          </div>
        </div>
      </div>` + getPriceAndDesc(type, d);
  }

  if (type === 'flats') {
    return commonTop + `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">BHK Type *</label>
          <select class="form-control" id="pf-bhk">
            ${['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', 'Studio']
        .map(b => `<option ${d.bhk === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Carpet Area</label>
          <input class="form-control" id="pf-area" placeholder="e.g. 1400 sq ft" value="${esc(d.area || '')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Floor</label>
          <input class="form-control" id="pf-floor" placeholder="e.g. 8th of 15" value="${esc(d.floor || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Furnishing</label>
          <select class="form-control" id="pf-furnishing">
            ${['Unfurnished', 'Semi-Furnished', 'Fully Furnished']
        .map(f => `<option ${d.furnishing === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Amenities</label>
        <input class="form-control" id="pf-amenities" placeholder="e.g. Pool, Gym, Clubhouse" value="${esc(d.amenities || '')}">
      </div>` + getPriceAndDesc(type, d);
  }

  if (type === 'apartments') {
    return commonTop + `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Total Acres</label>
          <input class="form-control" id="pf-acres" placeholder="e.g. 5 Acres" value="${esc(d.acres || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Number of Blocks</label>
          <input class="form-control" id="pf-blocks" placeholder="e.g. 4 Blocks" value="${esc(d.blocks || '')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Flat Sizes (BHK)</label>
          <input class="form-control" id="pf-flatSizes" placeholder="e.g. 2 BHK, 3 BHK" value="${esc(d.flatSizes || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Total Units</label>
          <input class="form-control" id="pf-totalUnits" placeholder="e.g. 400 Units" value="${esc(d.totalUnits || '')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Total Floors</label>
          <input class="form-control" id="pf-floors" placeholder="e.g. G+15 Floors" value="${esc(d.floors || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Club House Size</label>
          <input class="form-control" id="pf-clubHouseSize" placeholder="e.g. 20,000 sq ft" value="${esc(d.clubHouseSize || '')}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Amenities</label>
        <input class="form-control" id="pf-amenities" placeholder="e.g. Pool, Gym, Park" value="${esc(d.amenities || '')}">
      </div>` + getPriceAndDesc(type, d);
  }

  if (type === 'villas') {
    return commonTop + `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Bedrooms</label>
          <select class="form-control" id="pf-bedrooms">
            ${['2 Bedrooms', '3 Bedrooms', '4 Bedrooms', '5 Bedrooms', '6+ Bedrooms']
        .map(b => `<option ${d.bedrooms === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Land Area</label>
          <input class="form-control" id="pf-landArea" placeholder="e.g. 4800 sq ft" value="${esc(d.landArea || '')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Built-up Area</label>
          <input class="form-control" id="pf-builtUpArea" placeholder="e.g. 3200 sq ft" value="${esc(d.builtUpArea || '')}">
        </div>
        <div class="form-group" style="display:flex;flex-direction:column;gap:14px;justify-content:center;padding-top:8px">
          <label class="checkbox-group">
            <input type="checkbox" id="pf-hasPool" ${d.hasPool ? 'checked' : ''}>
            <span class="form-label" style="margin-bottom:0">🏊 Swimming Pool</span>
          </label>
          <label class="checkbox-group">
            <input type="checkbox" id="pf-hasGarden" ${d.hasGarden ? 'checked' : ''}>
            <span class="form-label" style="margin-bottom:0">🌿 Garden / Lawn</span>
          </label>
        </div>
      </div>` + getPriceAndDesc(type, d);
  } else if (type === 'commercial') {
    return commonTop + `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Super Built-up Area</label>
          <input class="form-control" id="pf-area" placeholder="e.g. 5000 sq ft" value="${esc(d.area || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Floor</label>
          <input class="form-control" id="pf-floor" placeholder="e.g. 3rd Floor" value="${esc(d.floor || '')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Washrooms</label>
          <input class="form-control" id="pf-washrooms" placeholder="e.g. 2 Attached, 1 Common" value="${esc(d.washrooms || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Parking Spaces</label>
          <input class="form-control" id="pf-parking" placeholder="e.g. 3 Covered" value="${esc(d.parking || '')}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Furnishing Status</label>
        <select class="form-control" id="pf-furnishing">
          ${['Bare Shell', 'Plug & Play', 'Fully Furnished', 'Semi-Furnished']
        .map(fu => `<option ${d.furnishing === fu ? 'selected' : ''}>${fu}</option>`).join('')}
        </select>
      </div>` + getPriceAndDesc(type, d);
  }
  return '';
}

function collectFormData(type) {
  const g = id => { const el = document.getElementById(id); return el && el.value ? el.value.trim() : ''; };
  const gb = id => { const el = document.getElementById(id); return el ? el.checked : false; };

  // Collect base64 images from preview grid
  const imgEls = document.querySelectorAll('#pf-image-grid .img-thumb');
  const images = Array.from(imgEls).map(img => img.src).filter(Boolean);

  const base = {
    title: g('pf-title'),
    location: g('pf-location'),
    district: g('pf-district'),
    village: g('pf-village'),
    contactNumber: g('pf-contactNumber'),
    mapUrl: g('pf-mapUrl'),
    price: g('pf-price'),
    status: g('pf-status') || 'Available',
    description: g('pf-description'),
    locationAdvantages: g('pf-locationAdvantages'),
    projectHighlights: g('pf-projectHighlights'),
    legalBenefits: g('pf-legalBenefits'),
    investmentPotential: g('pf-investmentPotential'),
    videoUrl: g('pf-videoUrl'),
    images,           // array of up to 4 base64/URL strings
    imageUrl: images[0] || '',   // keep for backward compat with card renderer
  };

  if (type === 'plots') {
    return {
      ...base, area: g('pf-area'), facing: g('pf-facing'),
      approvedBy: g('pf-approvedBy'),
      lpNumber: g('pf-lpNumber'),
      reraApproved: (document.getElementById('pf-rera-yes')?.checked ? 'Yes' : 'No'),
    };
  }
  if (type === 'flats') {
    return { ...base, bhk: g('pf-bhk'), area: g('pf-area'), floor: g('pf-floor'), furnishing: g('pf-furnishing'), amenities: g('pf-amenities') };
  }
  if (type === 'apartments') {
    return { ...base, acres: g('pf-acres'), blocks: g('pf-blocks'), flatSizes: g('pf-flatSizes'), totalUnits: g('pf-totalUnits'), amenities: g('pf-amenities'), floors: g('pf-floors'), clubHouseSize: g('pf-clubHouseSize') };
  }
  if (type === 'villas') {
    return { ...base, bedrooms: g('pf-bedrooms'), landArea: g('pf-landArea'), builtUpArea: g('pf-builtUpArea'), hasPool: gb('pf-hasPool'), hasGarden: gb('pf-hasGarden') };
  }
  if (type === 'commercial') {
    return { ...base, area: g('pf-area'), floor: g('pf-floor'), washrooms: g('pf-washrooms'), parking: g('pf-parking'), furnishing: g('pf-furnishing') };
  }
}

async function submitPropertyForm() {
  const type = document.getElementById('prop-form-type').value;
  const editId = document.getElementById('prop-form-id').value;

  // collectFormData needs to be handled properly. Wait, collectFormData is defined below submitPropertyForm in the original but above in my file? 
  // Let me check lines 276-304. Yes, it's defined right above it.
  let data;
  try {
    data = collectFormData(type);
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
  } catch (e) {
    console.error(e);
    showToast('Validation Error: ' + e.message, 'error');
    return;
  }

  if (!data.title) { showToast('Please enter a title.', 'error'); return; }
  if (!data.location) { showToast('Please enter a location.', 'error'); return; }
  if (!data.price) { showToast('Please enter a price.', 'error'); return; }

  const btn = document.getElementById('prop-form-submit');
  if (btn) btn.disabled = true;
  showToast('Saving property...', 'info');

  try {
    if (editId) {
      await DB[type].update(editId, data);
      showToast('✏️ Listing updated successfully!', 'success');
      closeModal('prop-form-modal');
      if (window._currentPage) window._currentPage();
    } else {
      const newItem = await DB[type].add(data);
      showToast('✅ New listing added!', 'success');
      closeModal('prop-form-modal');
      promptNotifySubscribers(newItem, type); // Trigger the notification flow
    }
  } catch (e) {
    console.error(e);
    showToast('Failed to save listing. Error: ' + (e.message || e), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---- Image Upload Helpers ----
async function handleImageUpload(event) {
  const grid = document.getElementById('pf-image-grid');
  const files = Array.from(event.target.files);
  let count = grid ? grid.querySelectorAll('.img-preview-item').length : 0;

  for (const file of files) {
    if (count >= 4) {
      showToast('Maximum 4 images allowed.', 'error');
      break;
    }

    // We can allow larger original files now because we compress them immediately
    if (file.size > 10 * 1024 * 1024) {
      showToast(`"${file.name}" is too large (>10MB).`, 'error');
      continue;
    }

    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      // Show a temporary "optimizing" toast if it's a large file
      if (file.size > 1 * 1024 * 1024) {
        showToast(`Optimizing ${file.name}...`, 'info');
      }

      const compressed = await compressImage(base64);
      addImagePreview(compressed, grid);
      count++;
    } catch (err) {
      console.error('Compression error:', err);
      showToast(`Failed to process ${file.name}`, 'error');
    }
  }
  // Reset input so same files can be re-selected if needed
  event.target.value = '';
}

function addImagePreview(src, grid) {
  if (!grid) return;
  if (grid.querySelectorAll('.img-preview-item').length >= 4) {
    showToast('Maximum 4 images allowed.', 'error');
    return;
  }
  const item = document.createElement('div');
  item.className = 'img-preview-item';
  item.innerHTML = `
    <img class="img-thumb" src="${src}" alt="Preview">
    <button type="button" class="img-remove-btn" title="Remove" onclick="this.closest('.img-preview-item').remove()">✕</button>
  `;
  grid.appendChild(item);
}

/** Client-side image compression using Canvas */
async function compressImage(base64Str, maxWidth = 1200, maxHeight = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      // Export as compressed JPEG
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}

// ---- Utilities ----
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function esc(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ---- WhatsApp Notifications ----
async function promptNotifySubscribers(property, type) {
  const listEl = document.getElementById('subscribers-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--mid-grey)">Loading subscribers...</div>';
  openModal('notify-subscribers-modal');

  try {
    const subscribers = await DB.subscribers.get();

    if (subscribers.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--mid-grey)">No subscribers have registered yet.</div>';
      return;
    }

    // Build the message text
    const propType = type === 'plots' ? 'plot' : type === 'flats' ? 'flat' : 'villa';
    const rawMsg = `*New ${capitalize(propType)} Alert!* 🏡\n\n` +
      `*${property.title}*\n` +
      `📍 ${property.location}\n` +
      `💰 ${property.price}\n\n` +
      `Visit our website to see the photos and full details!`;

    // URI encode the message
    const msg = encodeURIComponent(rawMsg);

    listEl.innerHTML = subscribers.map(sub => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--off-white);border-radius:var(--radius-md);border:1px solid var(--light-grey)">
        <div>
          <div style="font-weight:600;color:var(--navy);margin-bottom:2px">${esc(sub.name)}</div>
          <div style="font-size:0.85rem;color:var(--mid-grey)">${esc(sub.phone)}</div>
        </div>
        <a href="https://wa.me/${sub.phone.replace('+', '')}?text=${msg}" 
           target="_blank" rel="noopener"
           class="btn btn-primary btn-sm"
           onclick="this.textContent = '✅ Sent'; this.classList.replace('btn-primary', 'btn-ghost');"
           style="background-color:#25D366;border-color:#25D366;color:white">
          💬 Send
        </a>
      </div>
    `).join('');

  } catch (e) {
    console.error(e);
    listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--orange)">Failed to load subscribers.</div>';
  }
}

// ---- Contact Info Editing ----
function openEditContactModal(id) {
  if (!Admin.isLoggedIn()) {
    showToast('Please login as admin first.', 'error');
    return;
  }

  // Read current display values from DOM to populate form initially
  const getC = id => { const e = document.getElementById(id); return e ? e.innerHTML.replace(/<br>/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : ''; };

  document.getElementById('ec-id').value = id || '';
  document.getElementById('ec-phone').value = getC('c-disp-phone');
  document.getElementById('ec-email').value = getC('c-disp-email');
  document.getElementById('ec-address').value = getC('c-disp-address');
  document.getElementById('ec-hours').value = getC('c-disp-hours');

  openModal('edit-contact-modal');
}

async function submitEditContact() {
  if (!Admin.isLoggedIn()) return;
  const id = document.getElementById('ec-id').value;
  const data = {
    phone: document.getElementById('ec-phone').value.trim(),
    email: document.getElementById('ec-email').value.trim(),
    address: document.getElementById('ec-address').value.trim(),
    hours: document.getElementById('ec-hours').value.trim(),
  };

  const btn = document.getElementById('ec-submit');
  btn.disabled = true;
  showToast('Saving contact info...', 'info');

  try {
    if (id) {
      await DB.contact.update(id, data);
    } else {
      await DB.contact.add(data);
    }
    showToast('✅ Contact info updated!', 'success');
    closeModal('edit-contact-modal');
    if (window._currentPage) window._currentPage();
  } catch (e) {
    console.error(e);
    showToast('Failed to save contact info.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---- About Info Editing ----
function openEditAboutModal(id) {
  if (!Admin.isLoggedIn()) {
    showToast('Please login as admin first.', 'error');
    return;
  }

  const getC = id => { const e = document.getElementById(id); return e ? e.innerHTML.replace(/<br>/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : ''; };

  document.getElementById('ea-id').value = id || '';
  document.getElementById('ea-name').value = getC('a-disp-name');
  document.getElementById('ea-tagline').value = getC('a-disp-tagline');
  document.getElementById('ea-title').value = getC('a-disp-title');
  document.getElementById('ea-bio1').value = getC('a-disp-bio1');
  document.getElementById('ea-bio2').value = getC('a-disp-bio2');
  document.getElementById('ea-mission').value = getC('a-disp-mission');
  document.getElementById('ea-vision').value = getC('a-disp-vision');

  openModal('edit-about-modal');
}

async function submitEditAbout() {
  if (!Admin.isLoggedIn()) return;
  const id = document.getElementById('ea-id').value;
  const data = {
    name: document.getElementById('ea-name').value.trim(),
    tagline: document.getElementById('ea-tagline').value.trim(),
    title: document.getElementById('ea-title').value.trim(),
    bio1: document.getElementById('ea-bio1').value.trim(),
    bio2: document.getElementById('ea-bio2').value.trim(),
    mission: document.getElementById('ea-mission').value.trim(),
    vision: document.getElementById('ea-vision').value.trim(),
  };

  const btn = document.getElementById('ea-submit');
  btn.disabled = true;
  showToast('Saving about info...', 'info');

  try {
    if (id) {
      await DB.about.update(id, data);
    } else {
      await DB.about.add(data);
    }
    showToast('✅ About info updated!', 'success');
    closeModal('edit-about-modal');
    if (window._currentPage) window._currentPage();
  } catch (e) {
    console.error(e);
    showToast('Failed to save about info.', 'error');
  } finally {
    btn.disabled = false;
  }
}
