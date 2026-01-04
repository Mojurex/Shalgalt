function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

// Auth check - only run if logged in
function checkAuth() {
  return sessionStorage.getItem('adminLoggedIn') === 'true';
}

// Exit early if not authenticated - don't redirect, just stop execution
if (!checkAuth()) {
  console.log('Not authenticated, waiting for login...');
  // Don't throw or redirect - let the inline script handle login UI
}

// Store reference to refresh interval for cleanup on logout
let refreshInterval = null;

const loadingEl = document.getElementById('admin-loading');
const showLoading = () => loadingEl?.classList.add('show');
const hideLoading = () => loadingEl?.classList.remove('show');

// Expose to window for inline script to call after login
window.initAdmin = async function initAdmin() {
// Calculate display value for tests
// SAT: return 200-800 score only
// Placement: return CEFR level
function getDisplayValue(test) {
  if (!test) return { label: 'Түвшин', value: '-' };
  const examType = (test.exam_type || 'placement').toLowerCase();
  if (examType === 'sat') {
    const scoreRaw = test.score_raw || test.score || 0;
    // SAT has 54 questions total (27 verbal + 27 math)
    const totalQuestions = test.total_questions || 54;
    const percentage = (scoreRaw / totalQuestions) * 100;
    const satScore = Math.round(200 + (percentage / 100) * 600);
    const value = Math.min(800, Math.max(200, satScore));
    return { label: 'Оноо', value };
  }
  return { label: 'Түвшин', value: test.level || '-' };
}

async function loadUsers(){
  const r = await fetch('/api/users');
  const users = await r.json();
  const r2 = await fetch('/api/tests/all');
  const tests = await r2.json();
  
  // Load statistics
  const statsRes = await fetch('/api/stats');
  const stats = await statsRes.json();
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-avg').textContent = stats.avgScore;
  document.getElementById('stat-a').textContent = (stats.levels.A1 || 0) + (stats.levels.A2 || 0);
  document.getElementById('stat-b').textContent = (stats.levels.B1 || 0) + (stats.levels.B2 || 0);
  document.getElementById('stat-c').textContent = stats.levels.C1 || 0;
  
  // Update contact list - show ALL users with test status
  const contactList = document.getElementById('contact-list');
  if (contactList) {
    contactList.innerHTML = users.map(u => {
      const userTests = tests.filter(t => (t.user_id ?? t.userId) === u.id);
      const allTests = userTests.sort((a,b) => b.id - a.id);
      const lastTest = allTests[0];
      let levelBadge = '<span class="tag">Тест өгөөгүй</span>';
      if (lastTest) {
        if (lastTest.finished_at || lastTest.status === 'completed') {
          const { value, label } = getDisplayValue(lastTest);
          levelBadge = `<span class="tag success">${value}</span>`;
        } else {
          levelBadge = '<span class="tag warn">Өгч байна...</span>';
        }
      }
      
      return `
        <div class="contact-card">
          <div class="contact-info">
            <h3>${u.name}</h3>
            <p><strong>Нас:</strong> ${u.age}</p>
            <p><strong>Email:</strong> ${u.email}</p>
            <p><strong>Утас:</strong> ${u.phone}</p>
            <p><strong>Төлөв:</strong> ${levelBadge}</p>
          </div>
          <div class="contact-actions">
            <a href="tel:${u.phone}" class="phone-call-btn">📞 Залгах</a>
            <a href="sms:${u.phone}" class="secondary" style="padding: 6px 12px;">💬 SMS</a>
            <a href="mailto:${u.email}" class="secondary" style="padding: 6px 12px;">✉️ Email</a>
          </div>
        </div>
      `;
    }).join('');
  }
  
  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML='';
  users.forEach(u=>{
    const userTests = tests.filter(t => (t.user_id ?? t.userId) === u.id);
    const lastTest = userTests.sort((a,b) => b.id - a.id)[0];
    let testInfo = '-';
    if(lastTest && (lastTest.finished_at || lastTest.status === 'completed')){
      const { value } = getDisplayValue(lastTest);
      const score = lastTest.score_raw || lastTest.score || '-';
      const total = lastTest.total_questions || 27;
      testInfo = `<span class="tag success">${value}</span> <span class="tag info">${score}/${total}</span>`;
    } else if(lastTest){
      testInfo = '<span class="tag warn">Өгч байна...</span>';
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.age}</td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td>${testInfo}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function addUser(e){
  e.preventDefault();
  const name = document.getElementById('a-name').value.trim();
  const age = parseInt(document.getElementById('a-age').value,10);
  const email = document.getElementById('a-email').value.trim();
  const phone = document.getElementById('a-phone').value.trim();
  if(!name||!age||!email||!phone){ toast('Мэдээлэл дутуу байна'); return; }
  const r = await fetch('/api/users', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, age, email, phone})});
  if(r.ok){ toast('Нэмлээ/Шинэчлэв'); loadUsers(); }
  else{ toast('Алдаа'); }
}

// Also render a full tests table if present on the page
async function renderAllTests(){
  try{
    const r2 = await fetch('/api/tests/all');
    const tests = await r2.json();
    const wrap = document.getElementById('all-tests');
    if(!wrap) return;
    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Test ID</th>
              <th>User</th>
              <th>Exam</th>
              <th>Status</th>
              <th>Level</th>
              <th>Score</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${tests.map(t=>`
              <tr>
                <td>${t.id ?? '-'}</td>
                <td>${t.userName ?? t.user_id ?? t.userId ?? '-'}</td>
                <td>${t.exam_type ?? '-'}</td>
                <td>${t.status ?? (t.finished_at? 'completed':'in-progress')}</td>
                <td>${t.level ?? '-'}</td>
                <td>${t.score ?? '-'}</td>
                <td>${t.createdAt ?? '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }catch(e){ console.error(e); }
}

async function initialLoad(){
  showLoading();
  try {
    await Promise.all([loadUsers(), renderAllTests(), loadSatMaterials()]);
  } catch (e) {
    console.error(e);
    toast('Ачааллахад алдаа гарлаа');
  } finally {
    hideLoading();
  }
}

if (checkAuth()) {
  initialLoad();
  initSatSend();
}
document.getElementById('add-form').addEventListener('submit', addUser);

// Auto-refresh every 10 seconds with interval tracking
function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
      loadUsers();
      renderAllTests();
    } else {
      // Auth removed, stop refresh and redirect
      stopAutoRefresh();
      window.location.href = '/admin.html';
    }
  }, 10000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

startAutoRefresh();

// SAT materials listing
async function loadSatMaterials(){
  const listEl = document.getElementById('satMaterials');
  if(!listEl) return;
  try{
    const res = await fetch('/api/sat/materials');
    const data = await res.json();
    const files = data.files || [];
    if(files.length === 0){
      listEl.innerHTML = '<p class="muted">Материал олдсонгүй.</p>';
    }else{
      listEl.innerHTML = files.map(f => `
        <label style="display:flex;align-items:center;gap:8px;margin:6px 0;">
          <input type="checkbox" class="sat-file" value="${f.name}">
          <span>${f.name}</span>
          <a href="${f.url}" target="_blank" class="secondary" style="margin-left:auto;">Татах</a>
        </label>
      `).join('');
    }
  }catch(e){ listEl.innerHTML = '<p class="error">Алдаа гарлаа.</p>'; }
}

// SAT send handler
function initSatSend(){
  const sendBtn = document.getElementById('sendSatBtn');
  const emailEl = document.getElementById('satEmail');
  const statusEl = document.getElementById('satSendStatus');
  if(!sendBtn) return;

  sendBtn.addEventListener('click', async () => {
    statusEl.textContent = '';
    const email = emailEl?.value?.trim();
    const selected = Array.from(document.querySelectorAll('.sat-file:checked')).map(el => el.value);
    if(!email){ statusEl.textContent = 'Имэйл оруулна уу.'; return; }
    if(selected.length === 0){ statusEl.textContent = 'Файл сонгоно уу.'; return; }
    sendBtn.disabled = true;
    try{
      const res = await fetch('/api/sat/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, files: selected })
      });
      const data = await res.json();
      if(res.ok){ statusEl.textContent = `Илгээлээ: ${data.sent} файл.`; }
      else { statusEl.textContent = data.error || 'Илгээхэд алдаа гардлаа.'; }
    }catch(e){ statusEl.textContent = 'Сүлжээний алдаа.'; }
    sendBtn.disabled = false;
  });
}

// Logout handling
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    stopAutoRefresh();
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
  });
}

}; // End of initAdmin function


// If already logged in on page load, call initAdmin immediately (after it's defined)
if (checkAuth()) {
  window.initAdmin();
}