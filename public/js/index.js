function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

async function startTest(examType = 'placement'){
  const name = document.getElementById('name').value.trim();
  const age = parseInt(document.getElementById('age').value, 10);
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  if(!name || !age || !email || !phone){
    toast('Мэдээлэл дутуу байна');
    return;
  }
  try{
    const uRes = await fetch('/api/users', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, age, email, phone})});
    if(!uRes.ok){
      let msg = 'User save failed';
      try{ msg = (await uRes.text()) || msg; }catch{}
      throw new Error(msg);
    }
    const user = await uRes.json();
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userName', user.name);
    // Reset any previous test/timer state to avoid auto-skip
    localStorage.removeItem('testId');
    localStorage.removeItem('timerStart');
    
    // Try to start test - first try /api/tests, fallback to /api/tests/start
    let tRes = await fetch('/api/tests', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({userId: user.id, examType})});
    if(!tRes.ok) {
      tRes = await fetch('/api/tests/start', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({userId: user.id, examType})});
    }
    
    if(!tRes.ok){
      let msg = 'Start test failed';
      try{ msg = (await tRes.text()) || msg; }catch{}
      throw new Error(msg);
    }
    const test = await tRes.json();
    localStorage.setItem('testId', test.id);
    localStorage.setItem('examType', test.exam_type || examType);
    window.location.href = '/test.html';
  }catch(e){
    toast('Алдаа: ' + e.message);
  }
}

document.getElementById('start-sat')?.addEventListener('click', ()=>startTest('sat'));
