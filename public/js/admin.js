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
} else {
  // Only run admin logic if authenticated
  initAdmin();
}

// Store reference to refresh interval for cleanup on logout
let refreshInterval = null;

function initAdmin() {
// Calculate SAT score (200-800 range) or show level
function calculateSATScore(test) {
  if (!test) return '-';
  const examType = (test.exam_type || 'placement').toLowerCase();
  
  // Only calculate SAT score for SAT tests
  if (examType === 'sat') {
    const scoreRaw = test.score_raw || test.score || 0;
    const totalQuestions = test.total_questions || 27;
    const percentage = (scoreRaw / totalQuestions) * 100;
    const satScore = Math.round(200 + (percentage / 100) * 600);
    return Math.min(800, Math.max(200, satScore));
  }
  
  // For placement tests, show CEFR level
  return test.level || '-';
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
  
  // Update contact list
  const contactList = document.getElementById('contact-list');
  if (contactList) {
    contactList.innerHTML = users.map(u => {
      const userTests = tests.filter(t => (t.user_id ?? t.userId) === u.id);
      const lastTest = userTests.sort((a,b) => b.id - a.id)[0];
      let levelBadge = '<span class="tag">Тест өгөөгүй</span>';
      if (lastTest && (lastTest.finished_at || lastTest.status === 'completed')) {
        const displayValue = calculateSATScore(lastTest);
        levelBadge = `<span class="tag success">${displayValue}</span>`;
      }
      
      return `
        <div class="contact-card">
          <div class="contact-info">
            <h3>${u.name}</h3>
            <p><strong>Нас:</strong> ${u.age}</p>
            <p><strong>Email:</strong> ${u.email}</p>
            <p><strong>Утас:</strong> ${u.phone}</p>
            <p><strong>Түвшин:</strong> ${levelBadge}</p>
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
      const displayValue = calculateSATScore(lastTest);
      const score = lastTest.score_raw || lastTest.score || '-';
      const total = lastTest.total_questions || 27;
      testInfo = `<span class="tag success">${displayValue}</span> <span class="tag info">${score}/${total}</span>`;
    } else if(lastTest){
      testInfo = '<span class="tag warn">Өгч байна...</span>';
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><input value="${u.name}" data-k="name"/></td>
      <td><input type="number" value="${u.age}" data-k="age"/></td>
      <td><input value="${u.email}" data-k="email"/></td>
      <td><input value="${u.phone}" data-k="phone"/></td>
      <td>${testInfo}</td>
      <td>
        <button class="secondary" data-act="save">Хадгалах</button>
        <button class="secondary" data-act="del">Устгах</button>
      </td>
    `;
    tr.querySelector('[data-act="save"]').addEventListener('click', async ()=>{
      const inputs = tr.querySelectorAll('input');
      const payload = {}; inputs.forEach(i=>payload[i.dataset.k]= i.type==='number'? parseInt(i.value,10): i.value);
      const res = await fetch(`/api/users/${u.id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      if(res.ok){ toast('Хадгаллаа'); loadUsers(); } else { toast('Алдаа'); }
    });
    tr.querySelector('[data-act="del"]').addEventListener('click', async ()=>{
      if(!confirm('Устгах уу?')) return;
      const res = await fetch(`/api/users/${u.id}`, {method:'DELETE'});
      if(res.ok){ tr.remove(); toast('Устгалаа'); loadUsers(); } else { toast('Алдаа'); }
    });
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

loadUsers();
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
renderAllTests();
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

// SAT materials listing and sending
async function initSatMaterials(){
  const listEl = document.getElementById('satMaterials');
  const emailEl = document.getElementById('satEmail');
  const sendBtn = document.getElementById('sendSatBtn');
  const statusEl = document.getElementById('satSendStatus');
  if(!listEl || !sendBtn) return;
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

initSatMaterials();

// Logout handling
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    stopAutoRefresh();
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
  });
}

} // End of initAdmin function