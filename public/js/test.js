function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

const testIdRaw = localStorage.getItem('testId');
const testId = parseInt(testIdRaw, 10);
if(!Number.isFinite(testId) || testId <= 0){
  // Clear bad value and send user to start page
  localStorage.removeItem('testId');
  window.location.href = '/';
}
const examType = localStorage.getItem('examType') || 'placement';

let questions = [];
let timeLeft = 70 * 60; // 70 minutes in seconds for SAT (60 for Placement)
let timerInterval;
const pageSize = 10;

function startTimer(){
  const saved = localStorage.getItem('timerStart');
  // Bind timer to specific testId so a previous test doesn't affect a new one
  const savedFor = localStorage.getItem('timerStartFor');
  const totalTime = examType === 'sat' ? 70 * 60 : 60 * 60;
  if(saved && savedFor === String(testId)){
    const elapsed = Math.floor((Date.now() - parseInt(saved)) / 1000);
    timeLeft = Math.max(0, totalTime - elapsed);
  } else {
    localStorage.setItem('timerStart', Date.now().toString());
    localStorage.setItem('timerStartFor', String(testId));
    timeLeft = totalTime;
  }
  
  timerInterval = setInterval(()=>{
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    document.getElementById('timer').textContent = `${mins}:${secs.toString().padStart(2,'0')}`;
    
    if(timeLeft <= 5 * 60){
      document.getElementById('timer').style.color = 'var(--danger)';
    }
    
    if(timeLeft <= 0){
      clearInterval(timerInterval);
      toast('Хугацаа дууслаа!');
      autoFinish();
    }
  }, 1000);
}

async function autoFinish(){
  await savePage();
  await fetch(`/api/tests/${testId}/finish-answers`, {method:'POST'});
  if(examType === 'sat'){
    await fetch(`/api/tests/${testId}/finish`, {method:'POST'});
    window.location.href = '/result.html';
  } else {
    window.location.href = '/essay1.html';
  }
}

let page = 1;
let selections = {}; // questionId -> selectedIndex
let textAnswers = {}; // questionId -> text answer

function getPageSize(pageNum){
  // For SAT: pages 1-3 are Module 1 (10, 10, 7), pages 4+ are Module 2 (10 each)
  if(examType === 'sat'){
    if(pageNum === 1 || pageNum === 2) return 10;
    if(pageNum === 3) return 7;
    return 10; // Module 2 onwards
  }
  return 10; // Placement: always 10
}

function getPageStart(pageNum){
  if(examType !== 'sat') return (pageNum - 1) * 10;
  // SAT: calculate start position considering variable page sizes
  if(pageNum === 1) return 0;      // 0-9 (10 items)
  if(pageNum === 2) return 10;     // 10-19 (10 items)
  if(pageNum === 3) return 20;     // 20-26 (7 items)
  // Module 2 onwards (page 4+): starts at q 27
  return 27 + (pageNum - 4) * 10;
}

function render(){
  window.scrollTo(0, 0);
  const pageSz = getPageSize(page);
  const start = getPageStart(page);
  const pageQs = questions.slice(start, start + pageSz);
  const container = document.getElementById('question-container');
  container.innerHTML = '';
  
  // Module label for SAT
  if(examType === 'sat' && pageQs.length){
    const section = pageQs[0].section === 'math' ? 'Модуль 2: Математик' : 'Модуль 1: Унших ба Бичих';
    const modLabel = document.createElement('div');
    modLabel.className = 'note';
    modLabel.textContent = section;
    modLabel.style.marginBottom = '16px';
    modLabel.style.fontWeight = 'bold';
    container.appendChild(modLabel);
  }
  
  pageQs.forEach((q, idx)=>{
    const wrap = document.createElement('div');
    wrap.className = 'question';
    const num = start + idx + 1;
    const title = document.createElement('h3');
    title.innerHTML = `<strong>${num}.</strong> ${q.text}`;
    wrap.appendChild(title);
    
    // Add image if available
    if(q.image){
      const img = document.createElement('img');
      img.src = q.image;
      img.alt = 'Question image';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.margin = '12px 0';
      img.style.borderRadius = '4px';
      wrap.appendChild(img);
    }

    // Render interactive chart if metadata is present
    if(q.chart && window.Chart){
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.maxWidth = '510px';
      canvas.style.width = '100%';
      canvas.style.margin = '10px 0 12px';
      canvas.style.height = '180px';
      wrap.appendChild(canvas);
      const labels = q.chart.labels || [];
      const values = q.chart.values || [];
      const label = q.chart.label || '';
      new Chart(canvas.getContext('2d'), {
        type: q.chart.type || 'bar',
        data: {
          labels,
          datasets: [{
            label,
            data: values,
            backgroundColor: '#9ca3af',
            borderColor: '#6b7280',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.6,
          scales: { y: { beginAtZero: true } },
          plugins: { legend: { display: false } }
        }
      });
    }

    if(q.type === 'text'){
      const inputWrap = document.createElement('div');
      inputWrap.className = 'option';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.name = `q_${q.id}`;
      inp.placeholder = 'Хариугаа оруулна уу';
      inp.value = textAnswers[q.id] || '';
      inp.addEventListener('input', ()=>{ textAnswers[q.id] = inp.value; });
      inputWrap.appendChild(inp);
      wrap.appendChild(inputWrap);
    } else {
      // Radio button options for multiple choice
      (q.options || []).forEach((opt, i)=>{
          const optDiv = document.createElement('label');
          optDiv.className = 'option';
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = `q_${q.id}`;
          input.value = i;
          input.checked = selections[q.id] === i;
          input.addEventListener('change',()=>{ selections[q.id] = i; });
          const span = document.createElement('span');
          span.textContent = opt;
          optDiv.appendChild(input);
          optDiv.appendChild(span);
          wrap.appendChild(optDiv);
      });
    }
    container.appendChild(wrap);
  });
  
  // Calculate total pages
  let totalPages = 1;
  if(examType === 'sat'){
    // Module 1: pages 1-3 (10+10+7=27 questions)
    // Module 2: pages 4+ (27 questions in 10s = 3 pages)
    // Total: 6 pages
    totalPages = 6;
  } else {
    totalPages = Math.ceil(questions.length / 10) || 1;
  }
  
  document.getElementById('page-indicator').textContent = `${page}/${totalPages}`; 
  const percent = Math.round((start + pageQs.length) / Math.max(1, questions.length) * 100);
  const pb = document.getElementById('progress-bar');
  if(pb) pb.style.width = percent + '%';
  document.getElementById('prev').disabled = page === 1;
  const finalLabel = examType === 'sat' ? 'Дуусгах' : 'Дуусгах (эссэ рүү)';
  document.getElementById('next').textContent = page === totalPages ? finalLabel : 'Дараах';
}

async function savePage(){
  const pageSz = getPageSize(page);
  const start = getPageStart(page);
  const pageQs = questions.slice(start, start + pageSz);
  const answers = [];
  for(const q of pageQs){
    if(q.type === 'text'){
      const val = (textAnswers[q.id] || '').trim();
      if(val) answers.push({ questionId: q.id, textAnswer: val });
    } else {
      const si = selections[q.id];
      if(typeof si === 'number'){
        answers.push({questionId: q.id, selectedIndex: si});
      }
    }
  }
  const res = await fetch(`/api/tests/${testId}/answers`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({answers})});
  if(!res.ok) throw new Error('Save answers failed');
}

async function next(){
  try{
    await savePage();
    
    // Check if transitioning from Module 1 to Module 2 (SAT only)
    // Module 1: pages 1-3 (10+10+7=27 questions)
    if(examType === 'sat' && page === 3){
      // Clear selections to avoid auto-selected answers in module 2
      Object.keys(selections).forEach(k => delete selections[k]);
      Object.keys(textAnswers).forEach(k => delete textAnswers[k]);
      // Show module transition screen
      showModuleBreak();
      return;
    }
    
    const totalPages = examType === 'sat' ? 6 : (Math.ceil(questions.length / 10) || 1);
    if(page < totalPages){
      page += 1; render();
    } else {
      const f = await fetch(`/api/tests/${testId}/finish-answers`, {method:'POST'});
      if(!f.ok) throw new Error('Finish MCQ failed');
      if(examType === 'sat'){
        const fin = await fetch(`/api/tests/${testId}/finish`, {method:'POST'});
        if(!fin.ok) throw new Error('Finish SAT failed');
        window.location.href = '/result.html';
      } else {
        window.location.href = '/essay1.html';
      }
    }
  } catch(e){ toast('Алдаа: ' + e.message); }
}

function showModuleBreak(){
  const main = document.querySelector('main.container');
  const originalContent = main.innerHTML;
  
  main.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div style="margin-bottom:32px">
        <h2 style="font-size:28px;margin:0 0 8px;color:var(--accent)">Модуль 1 дуусгалаа</h2>
        <p style="font-size:16px;color:var(--muted);margin:0">27 / 27 асуулт</p>
      </div>
      
      <div style="margin:24px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:14px;color:var(--muted)">Ахиц</span>
          <span id="m1-percent" style="font-size:14px;font-weight:bold;color:var(--accent)">0%</span>
        </div>
        <div style="background:#e0e7ff;height:8px;border-radius:4px;overflow:hidden">
          <div id="m1-bar" style="background:var(--accent);height:100%;width:0%;transition:width 0.3s ease"></div>
        </div>
      </div>
      
      <div style="background:rgba(99,102,241,0.1);border-left:4px solid var(--accent);padding:16px;margin:24px 0;text-align:center;border-radius:4px">
        <p style="margin:0 0 8px;font-size:14px;color:var(--muted)"><strong>Таны оноо</strong></p>
        <p id="m1-score" style="margin:0;font-size:28px;font-weight:bold;color:var(--accent)">0 / 27</p>
        <p style="margin:8px 0 0;font-size:13px;color:var(--muted)">Одоо Модуль 2 (Математик)-т оролцох хэрэгтэй</p>
      </div>
      
      <div style="display:flex;gap:12px;justify-content:center;margin-top:32px;flex-wrap:wrap">
        <button id="continue-module2" class="primary" style="padding:12px 32px;font-size:16px;border-radius:8px">Үргэлжлүүлэх</button>
        <a href="https://www.indracyber.school/" target="_blank" class="primary" style="padding:12px 32px;font-size:16px;text-decoration:none;display:inline-block;border-radius:8px">Сургалтыг сонирхох</a>
      </div>
    </div>
    
    <section class="promo" style="margin-top:32px">
      <div class="promo-icon">🎓</div>
      <h2 class="promo-title">Та манай сургалтын талаар дэлгэрэнгүй мэдээлэл авахыг хүсч байна уу?</h2>
      <p class="promo-sub">Мэргэжлийн багштай холбогдож, өөрт тохирсон сургалтын талаарх лавлагааг аваарай.</p>
      <a class="promo-btn" href="https://www.facebook.com/indra.cyber.school" target="_blank" rel="noopener">✨ ЭНД ДАРААД МЭДЭЭЛЭЛ АВААРАЙ ✨</a>
    </section>
  `;
  
  document.getElementById('continue-module2').addEventListener('click', ()=>{
    main.innerHTML = originalContent;
    page += 1;
    render();
    // Re-attach event listeners after render
    document.getElementById('next').addEventListener('click', next);
    document.getElementById('prev').addEventListener('click', prev);
  });
  
  // Fetch secure module 1 score from server
  fetch(`/api/tests/${testId}/module-score?section=verbal`).then(r=>r.json()).then(({correct,total})=>{
    const pct = Math.round((correct/Math.max(1,total))*100);
    const bar = document.getElementById('m1-bar');
    const pc = document.getElementById('m1-percent');
    const sc = document.getElementById('m1-score');
    if(bar) bar.style.width = `${(correct/Math.max(1,total))*100}%`;
    if(pc) pc.textContent = `${pct}%`;
    if(sc) sc.textContent = `${correct} / ${total || 27}`;
  }).catch(()=>{/* ignore */});
}

function prev(){ if(page>1){ page -= 1; render(); } }

async function init(){
  const r = await fetch(`/api/tests/${testId}/questions`);
  questions = await r.json();
  render();
  startTimer();
  const chip = document.getElementById('exam-chip');
  if(chip){
    const label = examType==='sat' ? 'SAT' : 'Placement';
    chip.textContent = `${label} · Автоматаар хадгална`;
  }
}

document.getElementById('next').addEventListener('click', next);
document.getElementById('prev').addEventListener('click', prev);
init();
