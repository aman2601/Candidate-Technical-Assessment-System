
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(session({ secret: 'secret', resave:false, saveUninitialized:true }));

// serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json')));

// return available languages
app.get('/api/languages', (req,res)=>{
  res.json(Object.keys(questions));
});

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

// start test: balanced random selection across selected languages
app.post('/api/start', (req,res)=>{
  const { languages, total = 10 } = req.body;
  if(!languages || !languages.length) return res.status(400).json({error:'No languages selected'});
  // collect copies to avoid mutating original
  const perLang = Math.ceil(total / languages.length);
  let pool = [];
  languages.forEach(l => {
    const set = (questions[l] || []).map(q => ({...q, language: l}));
    shuffle(set);
    pool.push(...set.slice(0, perLang));
  });
  shuffle(pool);
  const selected = pool.slice(0, total).map(q=>({
    id: `${Date.now()}_${Math.floor(Math.random()*100000)}`,
    question: q.question,
    options: q.options,
    language: q.language,
    correctAnswer: q.correctAnswer
  }));
  req.session.questions = selected; // keep correctAnswer on server
  req.session.passed = false;
  // send without correctAnswer
  res.json(selected.map(({correctAnswer,...rest})=>rest));
});

// get session info
app.get('/api/session', (req,res)=>{
  res.json({hasQuestions: !!req.session.questions, passed: !!req.session.passed});
});

// submit answers
app.post('/api/submit', (req,res)=>{
  const { answers } = req.body; // answers: {id: selectedIndex}
  const qs = req.session.questions || [];
  if(!qs.length) return res.status(400).json({error:'No active test'});
  let score = 0;
  qs.forEach(q=>{
    const selected = answers[q.id];
    if(typeof selected !== 'undefined' && selected === q.correctAnswer) score++;
  });
  const total = qs.length;
  const percentage = (score/total)*100;
  const threshold = 70; // pass threshold
  req.session.passed = percentage >= threshold;
  res.json({score, total, percentage, passed: req.session.passed, threshold});
});

// upload resume: only allowed if passed
const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, path.join(__dirname,'uploads')),
  filename: (req,file,cb)=> cb(null, `${Date.now()}_${file.originalname}`)
});

function fileFilter(req,file,cb){
  const allowed = ['.pdf','.doc','.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if(!allowed.includes(ext)) return cb(new Error('Invalid file type'), false);
  cb(null, true);
}

const upload = multer({storage, limits:{fileSize:2*1024*1024}, fileFilter});

app.post('/api/upload', upload.single('resume'), (req,res)=>{
  if(!req.session.passed) return res.status(403).json({error:'Not allowed to upload'});
  res.json({message:'Uploaded', file: req.file.filename});
});

// basic error handler
app.use((err,req,res,next)=>{
  console.error(err);
  res.status(400).json({error: err.message || 'Error'});
});

const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>console.log('Server running on', PORT));
