function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

let currentSection = 'verbal';

document.querySelectorAll('input[name="section"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    currentSection = e.target.value;
    loadQuestions();
  });
});

async function loadQuestions(){
  const endpoint = currentSection === 'verbal' ? '/api/sat-questions' : '/api/sat-math-questions';
  const r = await fetch(endpoint);
  if(!r.ok){ toast('Асуулт татахад алдаа гарлаа'); return; }
  const questions = await r.json();
  const container = document.getElementById('questions-list');
  container.innerHTML = '';
  
  if(questions.length === 0){
    container.innerHTML = '<p class="note">Асуулт олдсонгүй</p>';
    return;
  }
  
  questions.sort((a,b) => a.id - b.id).forEach(q => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.style.cssText = 'border:1px solid #e5e7eb;padding:16px;border-radius:8px;margin-bottom:12px';
    
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
    header.innerHTML = `
      <strong>ID: ${q.id}</strong>
      <div style="display:flex;gap:8px">
        <button class="secondary" onclick="editQuestion(${q.id})">Засах</button>
        <button class="danger" onclick="deleteQuestion(${q.id})">Устгах</button>
      </div>
    `;
    card.appendChild(header);
    
    const text = document.createElement('p');
    text.textContent = q.text;
    text.style.margin = '8px 0';
    card.appendChild(text);
    
    if(q.image){
      const img = document.createElement('img');
      img.src = q.image;
      img.style.maxWidth = '200px';
      img.style.height = 'auto';
      img.style.borderRadius = '4px';
      img.style.margin = '8px 0';
      card.appendChild(img);
    }
    
    const optList = document.createElement('ul');
    optList.style.margin = '8px 0';
    q.options.forEach((opt, i) => {
      const li = document.createElement('li');
      li.textContent = opt;
      if(i === q.correct_index) li.style.color = 'var(--accent)';
      optList.appendChild(li);
    });
    card.appendChild(optList);
    
    container.appendChild(card);
  });
}

async function editQuestion(id){
  const endpoint = currentSection === 'verbal' ? '/api/sat-questions' : '/api/sat-math-questions';
  const r = await fetch(endpoint);
  const questions = await r.json();
  const q = questions.find(x => x.id === id);
  if(!q){ toast('Асуулт олдсонгүй'); return; }
  
  document.getElementById('q-id').value = q.id;
  document.getElementById('q-text').value = q.text;
  document.getElementById('q-image').value = q.image || '';
  document.getElementById('q-opt1').value = q.options[0];
  document.getElementById('q-opt2').value = q.options[1];
  document.getElementById('q-opt3').value = q.options[2];
  document.getElementById('q-opt4').value = q.options[3];
  document.getElementById('q-correct').value = q.correct_index;
  
  window.scrollTo({top: 0, behavior: 'smooth'});
}

async function deleteQuestion(id){
  if(!confirm('Устгах уу?')) return;
  const endpoint = currentSection === 'verbal' ? '/api/sat-questions' : '/api/sat-math-questions';
  const r = await fetch(`${endpoint}/${id}`, {method: 'DELETE'});
  if(!r.ok){ toast('Устгахад алдаа гарлаа'); return; }
  toast('Устгагдлаа');
  loadQuestions();
}

document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = parseInt(document.getElementById('q-id').value);
  const text = document.getElementById('q-text').value.trim();
  const image = document.getElementById('q-image').value.trim();
  const opt1 = document.getElementById('q-opt1').value.trim();
  const opt2 = document.getElementById('q-opt2').value.trim();
  const opt3 = document.getElementById('q-opt3').value.trim();
  const opt4 = document.getElementById('q-opt4').value.trim();
  const correctIndex = parseInt(document.getElementById('q-correct').value);
  
  if(!text || !opt1 || !opt2 || !opt3 || !opt4 || isNaN(correctIndex)){
    toast('Бүх талбарыг бөглөнө үү');
    return;
  }
  
  const data = {
    id,
    text,
    image: image || undefined,
    options: [opt1, opt2, opt3, opt4],
    correct_index: correctIndex
  };
  
  const endpoint = currentSection === 'verbal' ? '/api/sat-questions' : '/api/sat-math-questions';
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  
  if(!r.ok){ toast('Хадгалахад алдаа гарлаа'); return; }
  toast('Хадгалагдлаа');
  e.target.reset();
  loadQuestions();
});

loadQuestions();
