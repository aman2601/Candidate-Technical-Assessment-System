(function(){
  const el = id => document.getElementById(id);
  const languagesDiv = el('languages');
  const startBtn = el('startBtn');
  const startError = el('startError');
  const numQuestions = el('numQuestions');
  const quizSection = el('quiz-section');
  const languageSection = el('language-section');
  const resultSection = el('result-section');
  const questionArea = el('questionArea');
  const prevBtn = el('prevBtn');
  const nextBtn = el('nextBtn');
  const submitBtn = el('submitBtn');
  const currentEl = el('current');
  const totalEl = el('total');
  const timerEl = el('time');
  const resultEl = el('result');
  const uploadArea = el('uploadArea');
  const uploadForm = el('uploadForm');
  const uploadMsg = el('uploadMsg');
  const tryAgain = el('tryAgain');

  let questions = [];
  let answers = {}; // id -> selectedIndex
  let idx = 0;
  let timeRemaining = 60;
  let timerInterval = null;

  function fetchLanguages(){
    fetch('/api/languages').then(r=>r.json()).then(list=>{
      languagesDiv.innerHTML = '';
      list.forEach(l=>{
        const div = document.createElement('label');
        div.className='lang';
        div.innerHTML = `<input type="checkbox" value="${l}"> ${l}`;
        languagesDiv.appendChild(div);
      });
    });
  }

  function show(elm){ elm.classList.remove('hidden'); }
  function hide(elm){ elm.classList.add('hidden'); }

  function startTimer(){
    clearInterval(timerInterval);
    timeRemaining = 60;
    timerEl.textContent = timeRemaining;
    timerInterval = setInterval(()=>{
      timeRemaining--;
      timerEl.textContent = timeRemaining;
      if(timeRemaining<=0){
        // auto next
        nextQuestion();
      }
    },1000);
  }

  function renderQuestion(){
    const q = questions[idx];
    currentEl.textContent = idx+1;
    totalEl.textContent = questions.length;
    questionArea.innerHTML = `
      <h3>${q.question}</h3>
      <div id="opts"></div>
    `;
    const opts = document.getElementById('opts');
    q.options.forEach((opt,i)=>{
      const label = document.createElement('label');
      label.className='option';
      label.innerHTML = `<input type="radio" name="opt" value="${i}" ${answers[q.id]===i?'checked':''}> ${opt}`;
      opts.appendChild(label);
      label.addEventListener('click', ()=>{
        answers[q.id]=i;
      });
    });
    // reset timer
    startTimer();
  }

  function prevQuestion(){
    if(idx>0){ idx--; renderQuestion(); }
  }
  function nextQuestion(){
    if(idx<questions.length-1){ idx++; renderQuestion(); }
  }

  startBtn.addEventListener('click', ()=>{
    startError.textContent='';
    const checked = Array.from(languagesDiv.querySelectorAll('input:checked')).map(i=>i.value);
    const total = parseInt(numQuestions.value,10) || 10;
    if(!checked.length){ startError.textContent='Select at least one language'; return; }
    startBtn.disabled=true;
    fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({languages:checked,total})})
      .then(r=>r.json())
      .then(data=>{
        questions = data; idx=0; answers={};
        languageSection.classList.add('hidden');
        quizSection.classList.remove('hidden');
        renderQuestion();
      }).catch(err=>{ startError.textContent = err.message || 'Error starting test'; })
      .finally(()=> startBtn.disabled=false);
  });

  prevBtn.addEventListener('click', prevQuestion);
  nextBtn.addEventListener('click', nextQuestion);

  submitBtn.addEventListener('click', ()=>{
    clearInterval(timerInterval);
    submitBtn.disabled=true;
    // ensure latest selection on current question
    const q = questions[idx];
    const radios = document.querySelectorAll('input[name=opt]');
    radios.forEach(r=>{ if(r.checked) answers[q.id]=parseInt(r.value,10); });
    fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers})})
      .then(r=>r.json())
      .then(res=>{
        quizSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        resultEl.innerHTML = `Score: <strong>${res.score}/${res.total}</strong> (${Math.round(res.percentage)}%)`;
        if(res.passed){
          uploadArea.classList.remove('hidden');
          tryAgain.classList.add('hidden');
        }else{
          uploadArea.classList.add('hidden');
          tryAgain.classList.remove('hidden');
        }
      }).catch(err=>{ resultEl.textContent = 'Error submitting test'; })
      .finally(()=> submitBtn.disabled=false);
  });

  uploadForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    uploadMsg.textContent='';
    const file = el('resume').files[0];
    if(!file){ uploadMsg.textContent='Select a file'; return; }
    const allowed = ['.pdf','.doc','.docx'];
    const ext = file.name.slice((file.name.lastIndexOf('.')||0)).toLowerCase();
    if(!allowed.includes(ext)) { uploadMsg.textContent='Invalid file type'; return; }
    if(file.size > 2*1024*1024){ uploadMsg.textContent='File too large (max 2MB)'; return; }
    const fd = new FormData(); fd.append('resume', file);
    fetch('/api/upload',{method:'POST',body:fd})
      .then(r=>r.json())
      .then(j=>{ if(j.error) uploadMsg.textContent = j.error; else uploadMsg.textContent = 'Uploaded successfully'; })
      .catch(()=> uploadMsg.textContent='Upload failed');
  });

  // init
  fetchLanguages();
})();