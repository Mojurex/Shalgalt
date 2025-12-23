function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

let questions = [];

async function loadQuestions(){
  const r = await fetch('/api/questions/admin');
  questions = await r.json();
  const list = document.getElementById('questions-list');
  list.innerHTML = questions.map(q => `
    <div class="qa-card" style="margin:10px 0;position:relative">
      <h3><strong>${q.id}.</strong> ${q.text}</h3>
      <div class="qa-grid">
        ${q.options.map((opt, i) => `
          <div class="qa-opt ${i === q.correct_index ? 'correct' : 'normal'}">
            ${i + 1}. ${opt} ${i === q.correct_index ? '✓' : ''}
          </div>
        `).join('')}
      </div>
      <div class="actions" style="margin-top:8px">
        <button class="secondary" onclick="editQuestion(${q.id})">Засах</button>
        <button class="secondary" onclick="deleteQuestion(${q.id})" style="background:var(--danger)">Устгах</button>
      </div>
    </div>
  `).join('');
}

window.editQuestion = (id) => {
  const q = questions.find(x => x.id === id);
  if(!q) return;
  document.getElementById('q-id').value = q.id;
  document.getElementById('q-text').value = q.text;
  document.getElementById('q-opt1').value = q.options[0] || '';
  document.getElementById('q-opt2').value = q.options[1] || '';
  document.getElementById('q-opt3').value = q.options[2] || '';
  document.getElementById('q-opt4').value = q.options[3] || '';
  document.getElementById('q-correct').value = q.correct_index;
  window.scrollTo(0, 0);
};

window.deleteQuestion = async (id) => {
  if(!confirm('Устгах уу?')) return;
  const r = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
  if(r.ok){ toast('Устгалаа'); loadQuestions(); }
  else { toast('Алдаа гарлаа'); }
};

document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    id: parseInt(document.getElementById('q-id').value),
    text: document.getElementById('q-text').value,
    options: [
      document.getElementById('q-opt1').value,
      document.getElementById('q-opt2').value,
      document.getElementById('q-opt3').value,
      document.getElementById('q-opt4').value
    ],
    correct_index: parseInt(document.getElementById('q-correct').value)
  };
  
  const r = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if(r.ok){
    toast('Хадгаллаа');
    e.target.reset();
    loadQuestions();
  } else {
    toast('Алдаа гарлаа');
  }
});

loadQuestions();
