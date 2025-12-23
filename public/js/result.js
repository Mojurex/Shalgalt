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

document.getElementById('download-pdf')?.addEventListener('click', async ()=>{
  if(!window.jspdf) return alert('PDF library not loaded');
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('English Placement Test Certificate', 105, 30, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('Test Result', 105, 50, { align: 'center' });
  
  // Content
  doc.setFontSize(14);
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName') || 'Student';
  
  doc.text(`Name: ${userName}`, 20, 80);
  doc.text(`Score: ${resultData.score} / 30`, 20, 100);
  doc.text(`Level: ${resultData.level}`, 20, 120);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 140);
  
  // Footer
  doc.setFontSize(10);
  doc.text('This certificate confirms the completion of the English placement test.', 105, 260, { align: 'center' });
  
  doc.save(`English_Test_Certificate_${resultData.level}.pdf`);
});

init();
