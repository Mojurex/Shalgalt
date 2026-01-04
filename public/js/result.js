const testId = localStorage.getItem('testId');
if(!testId){ window.location.href = '/'; }

let resultData = null;

const loadingEl = document.getElementById('result-loading');
const showLoading = () => loadingEl?.classList.remove('hidden');
const hideLoading = () => loadingEl?.classList.add('hidden');

async function init(){
  showLoading();
  try {
    const r = await fetch(`/api/tests/${testId}/result`);
    if(!r.ok){ document.getElementById('result').textContent = 'Үр дүн олдсонгүй'; hideLoading(); return; }
    resultData = await r.json();
    const el = document.getElementById('result');
  const examType = (resultData.exam_type || 'placement').toLowerCase();
  const isSAT = examType === 'sat';
  
  if(isSAT){
    // SAT: Show 200-800 score + Module 1 & 2 breakdown
    const satScore = resultData.score || 200;
    
    // Fetch module scores
    let verbal = { correct: 0, total: 27 };
    let math = { correct: 0, total: 27 };
    try {
      const vRes = await fetch(`/api/tests/${testId}/module-score?section=verbal`);
      if (vRes.ok) verbal = await vRes.json();
      const mRes = await fetch(`/api/tests/${testId}/module-score?section=math`);
      if (mRes.ok) math = await mRes.json();
    } catch (e) { console.error('Module score fetch failed:', e); }
    
    el.innerHTML = `
      <div class="result-hero">
        <div>
          <p class="eyebrow">SAT Mock түвшин</p>
          <h2 class="result-level">${resultData.level}</h2>
          <p class="muted">Оноо: ${satScore} / 800</p>
        </div>
        <div class="badge">${resultData.level}</div>
      </div>
      <div class="result-grid">
        <div class="result-card">
          <p class="label">SAT оноо</p>
          <p class="value">${satScore} / 800</p>
          <p class="hint">200 - 800 шатлалаар</p>
        </div>
        <div class="result-card">
          <p class="label">Модуль 1 (Бодлого)</p>
          <p class="value">${verbal.correct} / ${verbal.total}</p>
          <p class="hint">Module 1 хэсгийн оноо</p>
        </div>
        <div class="result-card">
          <p class="label">Модуль 2 (Математик)</p>
          <p class="value">${math.correct} / ${math.total}</p>
          <p class="hint">Module 2 хэсгийн оноо</p>
        </div>
      </div>
    `;
  } else {
    // Placement: Show score + essays
    const essay1 = resultData.essay1_words || 0;
    const essay2 = resultData.essay2_words || 0;
    el.innerHTML = `
      <div class="result-hero">
        <div>
          <p class="eyebrow">Таны ангилал</p>
          <h2 class="result-level">${resultData.level}</h2>
          <p class="muted">Оноо: ${resultData.score} / 30</p>
        </div>
        <div class="badge">${resultData.level}</div>
      </div>
      <div class="result-grid">
        <div class="result-card">
          <p class="label">Нийт оноо</p>
          <p class="value">${resultData.score} / 30</p>
          <p class="hint">Сонсохгүйгээр автоматаар тооцсон</p>
        </div>
        <div class="result-card">
          <p class="label">Эссэ 1</p>
          <p class="value">${essay1} үг</p>
          <p class="hint">Доод босго: 300 үг</p>
        </div>
        <div class="result-card">
          <p class="label">Эссэ 2</p>
          <p class="value">${essay2} үг</p>
          <p class="hint">Доод босго: 300 үг</p>
        </div>
      </div>
    `;
  }
  hideLoading();
  } catch (e) {
    console.error('Error loading result:', e);
    document.getElementById('result').textContent = 'Алдаа гарлаа';
    hideLoading();
  }
}

init();
