const testId = localStorage.getItem('testId');
if(!testId){ window.location.href = '/'; }

let resultData = null;

async function init(){
  const r = await fetch(`/api/tests/${testId}/result`);
  if(!r.ok){ document.getElementById('result').textContent = 'Үр дүн олдсонгүй'; return; }
  resultData = await r.json();
  const el = document.getElementById('result');
  const examType = (resultData.exam_type || 'placement').toLowerCase();
  const isSAT = examType === 'sat';
  
  if(isSAT){
    // SAT: Show 200-800 score
    const satScore = resultData.score || 200;
    const rawScore = resultData.score_raw || 0;
    const totalQs = resultData.total_questions || 54;
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
          <p class="label">Зөв хариулт</p>
          <p class="value">${rawScore} / ${totalQs}</p>
          <p class="hint">Бодит зөв хариулты ны тоо</p>
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
}

init();
