function toast(msg){
  const t = document.getElementById('toast');
  if(!t) return; t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

const testId = localStorage.getItem('testId');
if(!testId){ window.location.href = '/'; }
const examType = localStorage.getItem('examType') || 'placement';
if(examType === 'sat'){
  window.location.href = '/result.html';
}

const textarea = document.getElementById('essay');
const counter = document.getElementById('word-count');
const hint = document.getElementById('progress-hint');

function countWords(txt){
  return (txt || '')
    .trim()
    .replace(/\s+/g,' ')
    .split(' ')
    .filter(w => w.length > 0).length;
}

function update(){
  const w = countWords(textarea.value);
  counter.textContent = w;
  
  // Update hint color and text
  if(hint){
    if(w < 300){
      hint.style.color = 'var(--danger)';
      hint.textContent = `⚠ ${300 - w} үг дутуу`;
    } else {
      hint.style.color = 'var(--accent-2)';
      hint.textContent = '✓ Хангалттай үг';
    }
  }
  const bar = document.getElementById('word-bar');
  if(bar){
    const pct = Math.min(100, Math.floor((w/300)*100));
    bar.style.width = `${pct}%`;
  }
  
  const btnNext = document.getElementById('next');
  const btnFinish = document.getElementById('finish');
  if(btnNext) btnNext.disabled = false;
  if(btnFinish) btnFinish.disabled = false;
}

let t; 
textarea.addEventListener('input', ()=>{ clearTimeout(t); t = setTimeout(update, 100); });
update();

// Auto-save every 5 seconds
setInterval(async ()=>{
  const topic = window.ESSAY_TOPIC;
  const text = textarea.value;
  if(!text.trim()) return;
  try{
    await fetch(`/api/tests/${testId}/${topic}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text})
    });
  } catch(e){ /* silent fail */ }
}, 5000);

async function proceed(){
  const topic = window.ESSAY_TOPIC;
  const text = textarea.value;
  try{
    if(topic === 'essay1'){
      const r = await fetch(`/api/tests/${testId}/essay1`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text})});
      if(!r.ok) throw new Error('Save essay1 failed');
      window.location.href = '/essay2.html';
    } else {
      const r1 = await fetch(`/api/tests/${testId}/essay2`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text})});
      if(!r1.ok) throw new Error('Save essay2 failed');
      const r2 = await fetch(`/api/tests/${testId}/finish`, {method:'POST'});
      if(!r2.ok){
        const err = await r2.json().catch(()=>({error:'Finish failed'}));
        throw new Error(err.error || 'Finish failed');
      }
      window.location.href = '/result.html';
    }
  }catch(e){ toast('Алдаа: ' + e.message); }
}

const next = document.getElementById('next');
if(next) next.addEventListener('click', proceed);
const finish = document.getElementById('finish');
if(finish) finish.addEventListener('click', proceed);
