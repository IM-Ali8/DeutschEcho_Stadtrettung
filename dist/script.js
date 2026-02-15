// Hero Rescue Shooter — Ali Moslehi (CodePen JS)
// NO <script> tag

// ---------------- Helpers ----------------
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function circleRectCollide(cx,cy,r, rx,ry,rw,rh){
  const closestX = Math.max(rx, Math.min(cx, rx+rw));
  const closestY = Math.max(ry, Math.min(cy, ry+rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx*dx + dy*dy) <= r*r;
}
function aabb(ax,ay,aw,ah,bx,by,bw,bh){
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

// ---------------- WebAudio Music ----------------
let audioOn = false;
let ac = null;
let master = null;
let musicNodes = [];

function ensureAudio(){
  if(ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain();
  master.gain.value = 0.07;
  master.connect(ac.destination);
}
function stopMusic(){
  for(const n of musicNodes){
    try{ n.stop && n.stop(); }catch{}
    try{ n.disconnect && n.disconnect(); }catch{}
  }
  musicNodes = [];
}
function beep(freq=700, dur=0.06, type="square", gain=0.08){
  if(!audioOn) return;
  ensureAudio();
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g); g.connect(master);
  o.start();
  o.stop(ac.currentTime + dur);
}
function startMusic(){
  if(!audioOn) return;
  ensureAudio();
  stopMusic();

  const tempo = 124;
  const step = 60 / tempo / 4;
  const startT = ac.currentTime + 0.04;

  const musicBus = ac.createGain();
  musicBus.gain.value = 1.0;
  musicBus.connect(master);

  const pump = ac.createGain();
  pump.gain.value = 0.9;
  pump.connect(musicBus);

  const lead = ac.createOscillator();
  lead.type = "sawtooth";
  const leadF = ac.createBiquadFilter();
  leadF.type = "lowpass";
  leadF.frequency.value = 1400;
  const leadG = ac.createGain();
  leadG.gain.value = 0.0;
  lead.connect(leadF); leadF.connect(leadG); leadG.connect(pump);
  lead.start(); musicNodes.push(lead);

  const bass = ac.createOscillator();
  bass.type = "square";
  const bassF = ac.createBiquadFilter();
  bassF.type = "lowpass";
  bassF.frequency.value = 450;
  const bassG = ac.createGain();
  bassG.gain.value = 0.0;
  bass.connect(bassF); bassF.connect(bassG); bassG.connect(pump);
  bass.start(); musicNodes.push(bass);

  const noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for(let i=0;i<nd.length;i++){
    nd[i] = (Math.random()*2-1) * (1 - i/nd.length);
  }
  const hat = ac.createBufferSource();
  hat.buffer = noiseBuf;
  hat.loop = true;

  const hatF = ac.createBiquadFilter();
  hatF.type = "highpass";
  hatF.frequency.value = 7000;

  const hatG = ac.createGain();
  hatG.gain.value = 0.0;

  hat.connect(hatF); hatF.connect(hatG); hatG.connect(pump);
  hat.start(); musicNodes.push(hat);

  function kick(at){
    const k = ac.createOscillator();
    const kg = ac.createGain();
    k.type = "sine";
    k.frequency.setValueAtTime(150, at);
    k.frequency.exponentialRampToValueAtTime(48, at + 0.12);
    kg.gain.setValueAtTime(0.0001, at);
    kg.gain.exponentialRampToValueAtTime(0.45, at + 0.01);
    kg.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    k.connect(kg); kg.connect(musicBus);
    k.start(at); k.stop(at + 0.2);
    musicNodes.push(k);

    pump.gain.cancelScheduledValues(at);
    pump.gain.setValueAtTime(0.65, at);
    pump.gain.linearRampToValueAtTime(0.95, at + 0.12);
  }
  function snare(at){
    const b = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0;i<d.length;i++){
      d[i] = (Math.random()*2-1) * Math.exp(-i/1800);
    }
    const s = ac.createBufferSource(); s.buffer = b;
    const f = ac.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 1600;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.30, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
    s.connect(f); f.connect(g); g.connect(musicBus);
    s.start(at); s.stop(at + 0.16);
    musicNodes.push(s);
  }

  const scale = [0, 3, 5, 7, 10];
  const root = 220;
  const chordRoots = [0, 5, 3, 7];
  const melody = [0,2,3,2,0,2,4,2, 0,2,3,2,0,1,2,1];
  function noteHz(semi){ return root * Math.pow(2, semi/12); }

  let i = 0;
  function schedule(){
    if(!audioOn) return;

    for(let k=0;k<64;k++){
      const tt = startT + (i+k)*step;

      if(((i+k)%16)===0) kick(tt);
      if(((i+k)%32)===16) snare(tt);

      if(((i+k)%8)===0){
        hatG.gain.setValueAtTime(0.0, tt);
        hatG.gain.linearRampToValueAtTime(0.10, tt + 0.002);
        hatG.gain.linearRampToValueAtTime(0.0, tt + 0.035);
      }

      const bar = Math.floor((i+k)/16) % chordRoots.length;
      const chord = chordRoots[bar];

      if(((i+k)%8)===0){
        bass.frequency.setValueAtTime(noteHz(chord), tt);
        bassG.gain.setValueAtTime(0.0, tt);
        bassG.gain.linearRampToValueAtTime(0.12, tt + 0.01);
        bassG.gain.linearRampToValueAtTime(0.0, tt + 0.12);
      }

      const m = melody[(i+k)%melody.length];
      const semi = chord + scale[m%scale.length] + (m>2 ? 12 : 0);
      lead.frequency.setValueAtTime(noteHz(semi), tt);
      leadF.frequency.setValueAtTime(1200 + (m*140), tt);
      leadG.gain.setValueAtTime(0.0, tt);
      leadG.gain.linearRampToValueAtTime(((i+k)%4===0)?0.14:0.09, tt + 0.008);
      leadG.gain.linearRampToValueAtTime(0.0, tt + 0.10);
    }

    i += 64;
    setTimeout(schedule, step*64*1000*0.85);
  }
  schedule();
}
function toggleMusic(){
  audioOn = !audioOn;
  document.getElementById("musicBtn").textContent = "موزیک: " + (audioOn ? "روشن" : "خاموش");
  if(audioOn){
    ensureAudio();
    startMusic();
    beep(700,0.06,"triangle",0.08);
  } else {
    stopMusic();
  }
}

// ---------------- Levels & Word Pools ----------------
const LEVELS = ["A1","A2","B1","B2","C1","C2"];

// ✅ لیست‌ها بزرگ‌تر شدن (تکرار خیلی دیر اتفاق می‌افته)
// ✅ مهم‌تر: مصرف‌شده‌ها توی localStorage ذخیره می‌شن، پس بین ریست‌ها هم تکرار نمی‌بینی
const POOLS = {
  A1: [
    {de:"Wasser", fa:"آب"}, {de:"Haus", fa:"خانه"}, {de:"Buch", fa:"کتاب"},
    {de:"Schule", fa:"مدرسه"}, {de:"Freund", fa:"دوست"}, {de:"Auto", fa:"ماشین"},
    {de:"Tisch", fa:"میز"}, {de:"Stuhl", fa:"صندلی"}, {de:"Brot", fa:"نان"},
    {de:"Hand", fa:"دست"}, {de:"Tür", fa:"در"}, {de:"Fenster", fa:"پنجره"},
    {de:"Apfel", fa:"سیب"}, {de:"Milch", fa:"شیر"}, {de:"Uhr", fa:"ساعت"},
    {de:"Kind", fa:"کودک"}, {de:"Tag", fa:"روز"}, {de:"Nacht", fa:"شب"},
    {de:"Stadt", fa:"شهر"}, {de:"Straße", fa:"خیابان"}, {de:"Geld", fa:"پول"},
    {de:"Arzt", fa:"پزشک"}, {de:"Zimmer", fa:"اتاق"}, {de:"Bett", fa:"تخت"},
    {de:"Hund", fa:"سگ"}, {de:"Katze", fa:"گربه"}, {de:"Essen", fa:"غذا"},
    {de:"Trinken", fa:"نوشیدن"}, {de:"Kaffee", fa:"قهوه"}, {de:"Tee", fa:"چای"},
    {de:"Bahnhof", fa:"ایستگاه قطار"}, {de:"Bus", fa:"اتوبوس"}, {de:"Zug", fa:"قطار"},
    {de:"Markt", fa:"بازار"}, {de:"Telefon", fa:"تلفن"}, {de:"Name", fa:"نام"},
    {de:"Farbe", fa:"رنگ"}, {de:"Bild", fa:"عکس"}, {de:"Weg", fa:"راه"}
  ],
  A2: [
    {de:"Reise", fa:"سفر"}, {de:"Gesundheit", fa:"سلامتی"}, {de:"Termin", fa:"قرار/وقت"},
    {de:"Nachricht", fa:"پیام/خبر"}, {de:"Einkauf", fa:"خرید"}, {de:"Wohnung", fa:"آپارتمان"},
    {de:"Umziehen", fa:"اسباب‌کشی"}, {de:"Freizeit", fa:"اوقات فراغت"}, {de:"Besuch", fa:"دیدار"},
    {de:"Plan", fa:"برنامه"}, {de:"Wetter", fa:"هوا"}, {de:"Kleidung", fa:"لباس"},
    {de:"Anmeldung", fa:"ثبت‌نام"}, {de:"Kündigung", fa:"فسخ/لغو"}, {de:"Verspätung", fa:"تاخیر"},
    {de:"Erholung", fa:"استراحت"}, {de:"Erklärung", fa:"توضیح"}, {de:"Verabredung", fa:"قرار"},
    {de:"Ausflug", fa:"گردش"}, {de:"Gespräch", fa:"گفت‌وگو"}, {de:"Einladung", fa:"دعوت"},
    {de:"Reparatur", fa:"تعمیر"}, {de:"Rechnung", fa:"صورتحساب"}, {de:"Preis", fa:"قیمت"},
    {de:"Rückfahrt", fa:"بازگشت"}, {de:"Vorbereitung", fa:"آماده‌سازی"}, {de:"Entschuldigung", fa:"عذرخواهی"},
    {de:"Bedeutung", fa:"معنا"}, {de:"Meldung", fa:"گزارش/اعلام"}, {de:"Feier", fa:"جشن"},
    {de:"Energie", fa:"انرژی"}, {de:"Gewohnheit", fa:"عادت"}, {de:"Krankheit", fa:"بیماری"},
    {de:"Betrieb", fa:"بنگاه/شرکت"}, {de:"Angebot", fa:"پیشنهاد"}, {de:"Antwort", fa:"پاسخ"},
    {de:"Abfahrt", fa:"حرکت"}, {de:"Ankunft", fa:"رسیدن"}, {de:"Auskunft", fa:"اطلاعات"}
  ],
  B1: [
    {de:"Entscheidung", fa:"تصمیم"}, {de:"Erfahrung", fa:"تجربه"},
    {de:"Unterschied", fa:"تفاوت"}, {de:"Vorteil", fa:"مزیت"},
    {de:"Nachteil", fa:"عیب/ضرر"}, {de:"Alltag", fa:"زندگی روزمره"},
    {de:"Bewerbung", fa:"درخواست/اپلای"}, {de:"Ausbildung", fa:"آوسبیلدونگ"},
    {de:"Vertrauen", fa:"اعتماد"}, {de:"Entwicklung", fa:"توسعه"},
    {de:"Möglichkeit", fa:"امکان"}, {de:"Beziehung", fa:"رابطه"},
    {de:"Einfluss", fa:"تاثیر"}, {de:"Veränderung", fa:"تغییر"}, {de:"Eindruck", fa:"برداشت"},
    {de:"Umgang", fa:"برخورد/رفتار"}, {de:"Ziel", fa:"هدف"}, {de:"Erfolg", fa:"موفقیت"},
    {de:"Anforderung", fa:"نیاز/شرط"}, {de:"Teilnahme", fa:"شرکت"}, {de:"Verantwortung", fa:"مسئولیت"},
    {de:"Kritik", fa:"انتقاد"}, {de:"Meinung", fa:"نظر"}, {de:"Ergebnis", fa:"نتیجه"},
    {de:"Hilfsmittel", fa:"ابزار کمکی"}, {de:"Zusatz", fa:"اضافه"}, {de:"Sicherheit", fa:"امنیت"},
    {de:"Stimmung", fa:"حال‌وهوا"}, {de:"Wunsch", fa:"خواسته"}, {de:"Vorschlag", fa:"پیشنهاد"},
    {de:"Verein", fa:"باشگاه/انجمن"}, {de:"Verlauf", fa:"روند"}, {de:"Vorfall", fa:"حادثه"},
    {de:"Anteil", fa:"سهم"}, {de:"Einsatz", fa:"تلاش/به‌کارگیری"}, {de:"Vermittlung", fa:"میانجی‌گری"},
    {de:"Bewusstsein", fa:"آگاهی"}, {de:"Zufriedenheit", fa:"رضایت"}, {de:"Schwierigkeit", fa:"سختی"}
  ],
  B2: [
    {de:"Zuverlässigkeit", fa:"قابل‌اعتماد بودن"}, {de:"Verhandlung", fa:"مذاکره"},
    {de:"Bedingung", fa:"شرط"}, {de:"Widerspruch", fa:"تناقض/اعتراض"},
    {de:"Bewertung", fa:"ارزیابی"}, {de:"Erwartung", fa:"انتظار"},
    {de:"Hinsicht", fa:"از جنبه"}, {de:"Ausdruck", fa:"بیان"},
    {de:"Vermutung", fa:"حدس/گمان"}, {de:"Umsetzung", fa:"پیاده‌سازی"},
    {de:"Verpflichtung", fa:"تعهد"}, {de:"Vereinbarung", fa:"توافق"}, {de:"Abwägung", fa:"سنجش/موازنه"},
    {de:"Nachweis", fa:"اثبات/مدرک"}, {de:"Wahrnehmung", fa:"ادراک"}, {de:"Zuständigkeit", fa:"مسئولیت/صلاحیت"},
    {de:"Überzeugung", fa:"قانع‌شدن/باور"}, {de:"Einwand", fa:"اعتراض"}, {de:"Auswertung", fa:"تحلیل نتایج"},
    {de:"Entlastung", fa:"کاهش فشار"}, {de:"Belastung", fa:"فشار"}, {de:"Abhängigkeit", fa:"وابستگی"},
    {de:"Vergleich", fa:"مقایسه"}, {de:"Konsequenz", fa:"نتیجه/پیامد"}, {de:"Vorgehen", fa:"رویه"},
    {de:"Rücksicht", fa:"ملاحظه"}, {de:"Maßnahme", fa:"اقدام"}, {de:"Mitwirkung", fa:"مشارکت"},
    {de:"Zielsetzung", fa:"هدف‌گذاری"}, {de:"Begründung", fa:"استدلال"}, {de:"Einschränkung", fa:"محدودیت"},
    {de:"Beteiligung", fa:"مشارکت"}, {de:"Abschluss", fa:"پایان/مدرک"}, {de:"Überlastung", fa:"فشار بیش از حد"},
    {de:"Vorauswahl", fa:"گزینش اولیه"}, {de:"Fortschritt", fa:"پیشرفت"}, {de:"Risikofaktor", fa:"عامل ریسک"}
  ],
  C1: [
    {de:"Verantwortung", fa:"مسئولیت"}, {de:"Glaubwürdigkeit", fa:"اعتبار"},
    {de:"Nachhaltigkeit", fa:"پایداری"}, {de:"Voraussetzung", fa:"پیش‌شرط"},
    {de:"Herausforderung", fa:"چالش"}, {de:"Zusammenhang", fa:"ارتباط/پیوند"},
    {de:"Auswirkung", fa:"پیامد"}, {de:"Standpunkt", fa:"دیدگاه"},
    {de:"Verlässlichkeit", fa:"قابلیت اعتماد"}, {de:"Bewusstsein", fa:"آگاهی"},
    {de:"Differenzierung", fa:"تمایزگذاری"}, {de:"Legitimation", fa:"مشروعیت‌بخشی"},
    {de:"Wechselwirkung", fa:"اثر متقابل"}, {de:"Widerstandsfähigkeit", fa:"تاب‌آوری"},
    {de:"Rahmenbedingung", fa:"شرایط چارچوبی"}, {de:"Zielkonflikt", fa:"تعارض اهداف"},
    {de:"Schlussfolgerung", fa:"نتیجه‌گیری"}, {de:"Handlungsoption", fa:"گزینه اقدام"},
    {de:"Sachverhalt", fa:"واقعیت/موضوع"}, {de:"Auseinandersetzung", fa:"مجادله/بررسی"},
    {de:"Bedeutungswandel", fa:"تغییر معنایی"}, {de:"Präzisierung", fa:"دقیق‌سازی"},
    {de:"Wissensstand", fa:"سطح دانش"}, {de:"Relevanz", fa:"اهمیت"},
    {de:"Verbindlichkeit", fa:"الزام‌آور بودن"}, {de:"Entscheidungsgrundlage", fa:"مبنای تصمیم"},
    {de:"Argumentationslinie", fa:"خط استدلال"}, {de:"Wertvorstellung", fa:"ارزش‌باوری"},
    {de:"Ausdifferenzierung", fa:"جزئی‌سازی"}, {de:"Grundannahme", fa:"فرض بنیادین"},
    {de:"Problemstellung", fa:"صورت مسئله"}, {de:"Kontextualisierung", fa:"قرار دادن در زمینه"},
    {de:"Übertragbarkeit", fa:"قابلیت تعمیم"}, {de:"Interpretationsspielraum", fa:"دامنه تفسیر"},
    {de:"Zielorientierung", fa:"هدف‌محوری"}, {de:"Selbstreflexion", fa:"خودبازتابی"},
    {de:"Langzeitwirkung", fa:"اثر بلندمدت"}, {de:"Verhaltensmuster", fa:"الگوی رفتاری"}
  ],
  C2: [
    {de:"Unverhältnismäßigkeit", fa:"نامتناسب بودن"}, {de:"Wesensmerkmal", fa:"ویژگی ذاتی"},
    {de:"Sinnzusammenhang", fa:"پیوند معنایی"}, {de:"Folgerichtigkeit", fa:"انسجام منطقی"},
    {de:"Zweifelsfall", fa:"مورد مشکوک"}, {de:"Hinterfragbarkeit", fa:"قابل‌پرسش بودن"},
    {de:"Vielschichtigkeit", fa:"چندلایه بودن"}, {de:"Unabdingbarkeit", fa:"ضرورت قطعی"},
    {de:"Selbstverständlichkeit", fa:"بدیهی بودن"}, {de:"Unvereinbarkeit", fa:"ناسازگاری"},
    {de:"Begriffsschärfe", fa:"دقت مفهومی"}, {de:"Deutungshoheit", fa:"سلطه تفسیری"},
    {de:"Wirklichkeitskonstruktion", fa:"ساخت واقعیت"}, {de:"Gegenstandsbereich", fa:"حوزه موضوعی"},
    {de:"Kausalitätsbehauptung", fa:"ادعای علیت"}, {de:"Normativitätsanspruch", fa:"ادعای هنجاری"},
    {de:"Problematisierungsgrad", fa:"سطح مسئله‌سازی"}, {de:"Erkenntnisinteresse", fa:"انگیزه شناخت"},
    {de:"Beurteilungsmaßstab", fa:"معیار ارزیابی"}, {de:"Perspektivenverschiebung", fa:"جابجایی دیدگاه"},
    {de:"Widerspruchsfreiheit", fa:"بی‌تناقضی"}, {de:"Selbstwidersprüchlichkeit", fa:"خودمتناقضی"},
    {de:"Mehrdeutigkeit", fa:"چندمعنایی"}, {de:"Eindeutigkeitsanspruch", fa:"ادعای تک‌معنایی"},
    {de:"Diskursverschiebung", fa:"جابجایی گفتمان"}, {de:"Argumentationskohärenz", fa:"انسجام استدلال"},
    {de:"Komplexitätsreduktion", fa:"کاهش پیچیدگی"}, {de:"Abstraktionsvermögen", fa:"توان انتزاع"},
    {de:"Konzeptualisierung", fa:"مفهوم‌سازی"}, {de:"Rekonstruktionsversuch", fa:"تلاش برای بازسازی"},
    {de:"Voraussetzungsreichweite", fa:"دامنه پیش‌فرض"}, {de:"Deutungsrahmen", fa:"چارچوب تفسیر"},
    {de:"Auslegungsvariante", fa:"نسخه تفسیر"}, {de:"Geltungsanspruch", fa:"ادعای اعتبار"},
    {de:"Kontextsensitivität", fa:"حساسیت به زمینه"}, {de:"Wertungsneutralität", fa:"بی‌طرفی ارزشی"}
  ]
};

// ---------------- Anti-Repeat System (no repeats across resets) ----------------
function usedKeyFor(level){ return `usedWords_${level}`; }
function getUsedSet(level){
  try{
    const raw = localStorage.getItem(usedKeyFor(level));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  }catch{
    return new Set();
  }
}
function saveUsedSet(level, set){
  try{
    localStorage.setItem(usedKeyFor(level), JSON.stringify([...set]));
  }catch{}
}

let usedSets = {};
let decks = {};

function buildDecks(){
  usedSets = {};
  decks = {};
  for(const lv of LEVELS){
    const used = getUsedSet(lv);
    usedSets[lv] = used;

    // deck = pool minus used (so no repeats across resets)
    const fresh = POOLS[lv].filter(w => !used.has(w.de));
    decks[lv] = shuffle(fresh);

    // اگر (خیلی دیر) کل Pool تموم شد، از نو اجازه می‌دیم (در عمل با این لیست‌های بزرگ دیر اتفاق می‌افته)
    if(decks[lv].length === 0){
      used.clear();
      saveUsedSet(lv, used);
      decks[lv] = shuffle(POOLS[lv]);
    }
  }
}
function drawFromDeck(level){
  if(!decks[level] || decks[level].length === 0){
    // به احتمال خیلی کم: دوباره پر کن
    const used = usedSets[level] || getUsedSet(level);
    const fresh = POOLS[level].filter(w => !used.has(w.de));
    decks[level] = shuffle(fresh);
    if(decks[level].length === 0){
      used.clear();
      saveUsedSet(level, used);
      decks[level] = shuffle(POOLS[level]);
    }
  }

  const item = decks[level].pop();

  // mark used immediately (so it won't appear in next reset/game)
  const used = usedSets[level] || getUsedSet(level);
  used.add(item.de);
  usedSets[level] = used;
  saveUsedSet(level, used);

  return item;
}

// ---------------- Game constants ----------------
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const GRAV = 1650;
const GROUND_Y = H-70;
let camX = 0;
const LEVEL_LEN = 3600;

const STATE = { INTRO:0, PLAY:1, WIN:2, LOSE:3, CHOICE:4 };
let state = STATE.INTRO;
let running = false;

let timeLeft = 60;
let timerInt = null;

let score = 0;
let hp = 3;
let extraJumps = 0;
let hasKey = false;

let levelIndex = 0;
let levelName = "A1";

const NEED_CORRECT = 5;
let correctInLevel = 0;
let keyArmed = false;

// Best overall
const BEST_OVERALL_KEY = "bestScore_overall";
function getBestOverall(){ return Number(localStorage.getItem(BEST_OVERALL_KEY) || 0); }
function setBestOverall(v){ localStorage.setItem(BEST_OVERALL_KEY, String(v)); }

const hero = {
  x: 140, y: GROUND_Y-120,
  w: 44, h: 70,
  vx: 0, vy: 0,
  onGround: false,
  invuln: 0,
  face: 1,
  fuel: 1.0,
  jumpBuffered: false,
  _shootCd: 0,
  _kissT: 0,
};

const bullets = [];
const enemies = [];
const pickups = [];
const particles = [];

const cage = { x: LEVEL_LEN-360, y: GROUND_Y-150, w: 150, h: 150, open:false };

const princess = {
  x: cage.x+55, y: cage.y+55, w: 40, h: 70,
  rescued:false,
  ax: cage.x+55, ay: cage.y+55,
  vx:0, vy:0,
  kissing:false
};

let currentTarget = null;

// ---------------- Bubble sizing ----------------
function bubbleRadiusFor(text){
  ctx.save();
  ctx.font = "bold 14px system-ui";
  const w = ctx.measureText(String(text)).width;
  ctx.restore();
  return clamp(Math.ceil(w/2 + 16), 22, 72);
}

// ---------------- Choice UI ----------------
const overlay = document.getElementById("choiceOverlay");
const yesBtn = document.getElementById("yesBtn");
const noBtn  = document.getElementById("noBtn");

function showChoice(){
  state = STATE.CHOICE;
  running = false;
  stopTimer();
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden","false");
  setMsg("✅ نجاتش دادی. انتخاب کن: Ja یا Nein");
  updateHud();
}
function hideChoice(){
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden","true");
}

// ---------------- Input ----------------
const keys = new Set();
window.addEventListener("keydown", (e)=>{
  const block = ["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(e.code);
  if(block) e.preventDefault();
  keys.add(e.code);

  if(e.code==="KeyM") toggleMusic();
  if(e.code==="KeyR") resetAll(true);

  if(state===STATE.CHOICE){
    if(e.code==="KeyY") { goNextLevel(); }
    if(e.code==="KeyN") { resetAll(true); }
    return;
  }

  if(e.code==="Enter"){
    if(state===STATE.INTRO) startGame();
    else if(state===STATE.LOSE) resetAll(true);
  }
}, {capture:true});
window.addEventListener("keyup", (e)=> keys.delete(e.code));

canvas.addEventListener("pointerdown", ()=>{
  if(state===STATE.INTRO) startGame();
});

document.getElementById("musicBtn").addEventListener("click", toggleMusic);
document.getElementById("startBtn").addEventListener("click", ()=>{
  if(state===STATE.INTRO) startGame();
  else resetAll(true);
});
yesBtn.addEventListener("click", goNextLevel);
noBtn.addEventListener("click", ()=> resetAll(true));

// ---------------- UI ----------------
function setMsg(t){ document.getElementById("msg").textContent = t; }
function updateHud(){
  document.getElementById("lvl").textContent = levelName;
  document.getElementById("time").textContent = timeLeft;
  document.getElementById("score").textContent = score;
  document.getElementById("hp").textContent = hp;
  document.getElementById("jumps").textContent = extraJumps;
  document.getElementById("key").textContent = hasKey ? "✔" : "✖";
  document.getElementById("targetFa").textContent = currentTarget ? currentTarget.fa : "—";
  document.getElementById("best").textContent = getBestOverall();
  document.getElementById("c5").textContent = correctInLevel;
}

// ---------------- Timer ----------------
function stopTimer(){
  if(timerInt){ clearInterval(timerInt); timerInt=null; }
}
function startTimer(){
  stopTimer();
  timerInt = setInterval(()=>{
    if(!running) return;
    timeLeft--;
    updateHud();
    if(timeLeft<=0) lose("⏳ زمان تموم شد!");
  }, 1000);
}

// ---------------- Reset / Start ----------------
function resetAll(fullReset){
  stopTimer();
  hideChoice();

  state = STATE.INTRO;
  running = false;

  timeLeft = 60;
  score = 0;
  hp = 3;
  extraJumps = 0;
  hasKey = false;

  levelIndex = 0;
  levelName = "A1";

  correctInLevel = 0;
  keyArmed = false;

  hero.x=140; hero.y=GROUND_Y-120; hero.vx=0; hero.vy=0;
  hero.onGround=false; hero.invuln=0; hero.face=1; hero.fuel=1;
  hero.jumpBuffered=false; hero._shootCd=0; hero._kissT=0;

  bullets.length=0; enemies.length=0; pickups.length=0; particles.length=0;

  cage.open=false;
  princess.rescued=false; princess.kissing=false;
  princess.ax=princess.x; princess.ay=princess.y; princess.vx=0; princess.vy=0;

  camX=0;

  // ✅ مهم: هر ریست، Deck ها از poolِ “استفاده‌نشده” ساخته می‌شن
  buildDecks();
  currentTarget = drawFromDeck(levelName);

  setMsg("برای شروع قهرمان بازی دکمه ی شروع رو بزن — یا Enter / Click");
  updateHud();
}

function startGame(){
  state = STATE.PLAY;
  running = true;

  if(audioOn){
    ensureAudio();
    startMusic();
  }

  spawnPickupsNear(hero.x + 520);
  spawnEnemyWave(1);

  setMsg(`🔥 مرحله ${levelName}! هر درست +5 امتیاز. هر غلط -5 امتیاز. درستِ پنجم = کلید.`);
  startTimer();
  updateHud();
}

// ---------------- Spawns ----------------
function spawnParticle(x,y, n=8){
  for(let i=0;i<n;i++){
    particles.push({
      x, y,
      vx: (Math.random()*2-1)*240,
      vy: (Math.random()*2-1)*240,
      life: 0.55 + Math.random()*0.45
    });
  }
}

function spawnEnemyWave(count){
  const baseX = hero.x + 900 + Math.random()*260;
  for(let i=0;i<count;i++){
    enemies.push({
      x: baseX + i*90,
      y: GROUND_Y-50 - (Math.random()<0.25 ? 80 : 0),
      w: 48, h: 42,
      vx: - (130 + levelIndex*18 + Math.random()*35),
      hp: 1 + (levelIndex>=4 ? 1 : 0),
      hitT: 0
    });
  }
}

function spawnPickupsNear(xCenter){
  xCenter = clamp(xCenter, hero.x + 380, hero.x + 760);

  const correct = currentTarget;

  const wrongs = [];
  while(wrongs.length<2){
    const w = drawFromDeck(levelName);
    if(w.de !== correct.de && !wrongs.some(z=>z.de===w.de)) wrongs.push(w);
  }

  const shouldBeKey = (!hasKey && keyArmed);
  const correctType = shouldBeKey ? "keyWord" : "word";

  const opts = shuffle([
    {pair: correct, correct:true, type: correctType},
    {pair: wrongs[0], correct:false, type:"word"},
    {pair: wrongs[1], correct:false, type:"word"},
  ]);

  const minY = 170;
  const maxY = GROUND_Y - 185;

  const xs = [xCenter-110, xCenter, xCenter+110];

  const baseY = clamp(GROUND_Y - 190, minY, maxY);
  let ys = [
    baseY,
    baseY - 55,
    baseY - 105
  ].map(y => clamp(y, minY, maxY));

  ys = shuffle(ys);

  const MIN_DIST = 70;
  function tooClose(x,y){
    for(const p of pickups){
      const py = p.y;
      const dx = p.x - x;
      const dy = py - y;
      if(dx*dx + dy*dy < MIN_DIST*MIN_DIST) return true;
    }
    return false;
  }

  for(let i=0;i<3;i++){
    let x = xs[i];
    let y = ys[i];

    for(let tries=0; tries<12 && tooClose(x,y); tries++){
      x += (Math.random()<0.5?-1:1) * (20 + Math.random()*25);
      y += (Math.random()<0.5?-1:1) * (18 + Math.random()*18);
      x = clamp(x, hero.x + 300, hero.x + 900);
      y = clamp(y, minY, maxY);
    }

    pickups.push({
      x, y,
      r: bubbleRadiusFor(opts[i].pair.de),
      type: opts[i].type,
      de: opts[i].pair.de,
      fa: opts[i].pair.fa,
      correct: opts[i].correct,
      ttl: 10.0,
      bob: Math.random()*Math.PI*2
    });
  }
}

// ---------------- Combat ----------------
function shoot(){
  if(hero._shootCd > 0) return;
  hero._shootCd = 0.14;
  const dir = hero.face;
  bullets.push({
    x: hero.x + hero.w/2 + dir*26,
    y: hero.y + hero.h*0.45,
    vx: dir*(680),
    life: 0.62
  });
  beep(980,0.03,"square",0.11);
}

function damage(reason){
  if(hero.invuln>0) return;
  hp -= 1;
  hero.invuln = 1.0;
  extraJumps = Math.max(0, extraJumps-1);
  beep(160,0.08,"sawtooth",0.12);
  setMsg("❌ " + reason);
  updateHud();
  spawnParticle(hero.x+hero.w/2, hero.y+hero.h/2, 14);
  if(hp<=0) lose("💀 باختی! جونت تموم شد.");
}

function lose(text){
  state = STATE.LOSE;
  running = false;
  stopTimer();
  setMsg(text + " (Enter یا R برای دوباره)");
}

// ---------------- Stage logic ----------------
function goNextLevel(){
  hideChoice();

  if(levelIndex >= LEVELS.length - 1){
    state = STATE.WIN;
    setMsg("🏆 همه مراحل رو رد کردی! YOU WIN (R برای شروع دوباره)");
    return;
  }

  levelIndex++;
  levelName = LEVELS[levelIndex];

  timeLeft = 60;
  correctInLevel = 0;
  keyArmed = false;
  hasKey = false;

  cage.open = false;
  princess.rescued = false;
  princess.kissing = false;

  bullets.length = 0;
  enemies.length = 0;
  pickups.length = 0;
  particles.length = 0;

  currentTarget = drawFromDeck(levelName);

  hero.x = 140;
  hero.y = GROUND_Y - 120;
  hero.vx = hero.vy = 0;
  camX = 0;

  state = STATE.PLAY;
  running = true;

  spawnPickupsNear(hero.x + 520);
  spawnEnemyWave(1 + Math.floor(levelIndex/2));

  startTimer();
  setMsg(`🚀 مرحله ${levelName} شروع شد! (هر درست +5 / هر غلط -5)`);
  updateHud();
}

// ---------------- Story entities ----------------
function nearCage(){
  return aabb(hero.x,hero.y,hero.w,hero.h, cage.x-10, cage.y, cage.w+20, cage.h);
}
function nearPrincess(){
  const px = princess.rescued ? princess.ax : princess.x;
  const py = princess.rescued ? princess.ay : princess.y;
  return aabb(hero.x,hero.y,hero.w,hero.h, px-10, py, princess.w+20, princess.h);
}

// ---------------- Update loop ----------------
let last = performance.now();

function update(dt){
  if(state !== STATE.PLAY) return;

  hero.invuln = Math.max(0, hero.invuln - dt);
  hero._shootCd = Math.max(0, hero._shootCd - dt);

  const accel = 1850;
  const maxV = 340;
  let ax = 0;
  if(keys.has("ArrowLeft"))  { ax -= accel; hero.face=-1; }
  if(keys.has("ArrowRight")) { ax += accel; hero.face= 1; }
  hero.vx += ax*dt;
  if(ax===0) hero.vx *= Math.pow(0.001, dt);
  hero.vx = clamp(hero.vx, -maxV, maxV);

  if(keys.has("Space") && !hero.jumpBuffered){
    hero.jumpBuffered = true;
    if(hero.onGround){
      hero.vy = -640;
      hero.onGround = false;
      beep(760,0.05,"square",0.09);
    } else if(extraJumps > 0){
      extraJumps -= 1;
      hero.vy = -600;
      beep(860,0.05,"square",0.09);
      updateHud();
    }
  }
  if(!keys.has("Space")) hero.jumpBuffered = false;

  if(keys.has("ArrowUp") && hero.fuel > 0){
    hero.vy -= 980*dt;
    hero.fuel = Math.max(0, hero.fuel - 0.55*dt);
  } else {
    hero.fuel = Math.min(1, hero.fuel + 0.26*dt);
  }

  if(keys.has("KeyX")) shoot();

  hero.vy += GRAV*dt;
  hero.x += hero.vx*dt;
  hero.y += hero.vy*dt;

  if(hero.y + hero.h >= GROUND_Y){
    hero.y = GROUND_Y - hero.h;
    hero.vy = 0;
    hero.onGround = true;
  } else hero.onGround = false;

  hero.x = clamp(hero.x, 40, LEVEL_LEN-80);
  camX = clamp(hero.x - W*0.35, 0, LEVEL_LEN - W + 160);

  // bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.x += b.vx*dt;
    b.life -= dt;
    if(b.life<=0) bullets.splice(i,1);
  }

  // enemies (✅ کشتن انمی امتیاز ندارد)
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    e.x += e.vx*dt;
    e.hitT = Math.max(0, e.hitT - dt);

    if(hero.invuln<=0 && aabb(hero.x,hero.y,hero.w,hero.h, e.x,e.y,e.w,e.h)){
      damage("هیولا خوردت! شلیک کن.");
    }

    for(let j=bullets.length-1;j>=0;j--){
      const b = bullets[j];
      if(aabb(b.x-4,b.y-4,8,8, e.x,e.y,e.w,e.h)){
        bullets.splice(j,1);
        e.hp -= 1;
        e.hitT = 0.12;
        beep(520,0.03,"square",0.09);
        spawnParticle(e.x+e.w/2, e.y+e.h/2, 8);
        if(e.hp<=0){
          enemies.splice(i,1);
          // ❌ no score
          break;
        }
      }
    }

    if(e.x < camX-280) enemies.splice(i,1);
  }

  // pickups (✅ scoring rules)
  for(let i=pickups.length-1;i>=0;i--){
    const p = pickups[i];
    p.ttl -= dt;
    p.bob += dt*4.2;
    if(p.ttl<=0){ pickups.splice(i,1); continue; }

    const py = p.y + Math.sin(p.bob)*6;
    if(circleRectCollide(p.x, py, p.r, hero.x, hero.y, hero.w, hero.h)){
      if(p.correct){
        // ✅ correct: +5
        score += 5;
        extraJumps += 1;

        if(p.type==="keyWord" && !hasKey){
          hasKey = true;
          keyArmed = false;
          correctInLevel = NEED_CORRECT;
          setMsg("🗝️ کلید رو گرفتی! برو قفس (E).");
          beep(880,0.08,"triangle",0.10);
        } else {
          correctInLevel += 1;
          if(!hasKey && correctInLevel === NEED_CORRECT-1){
            keyArmed = true;
            setMsg("✨ یکی دیگه درست بزن… کلید میاد!");
          } else {
            setMsg("✅ درست! +پرش اضافه");
          }
        }

        if(!hasKey){
          currentTarget = drawFromDeck(levelName);
          spawnPickupsNear(hero.x + 650 + Math.random()*220);
        }

        if(Math.random() < 0.55 + levelIndex*0.04) spawnEnemyWave(1 + Math.floor(levelIndex/2));
        updateHud();
      } else {
        // ✅ wrong: -5
        score = Math.max(0, score - 5);
        damage("غلط بود!");
      }

      pickups.splice(i,1);
      updateHud();
    }
  }

  // particles
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.x += p.vx*dt;
    p.y += p.vy*dt;
    p.vy += 700*dt;
    p.life -= dt;
    if(p.life<=0) particles.splice(i,1);
  }

  // cage open
  if(keys.has("KeyE")){
    if(!cage.open && hasKey && nearCage()){
      cage.open = true;
      beep(520,0.10,"triangle",0.12);
      setMsg("🔓 قفس باز شد! نزدیک پرنسس شو.");
    }
  }

  // rescue
  if(cage.open && !princess.rescued && nearPrincess()){
    princess.rescued = true;
    princess.kissing = true;
    princess.ax = princess.x;
    princess.ay = princess.y;
    princess.vx = 220;
    princess.vy = -520;
    setMsg("💋 پرنسس پرید سمتت!");
    beep(880,0.12,"triangle",0.10);
    beep(1100,0.14,"triangle",0.10);
  }

  if(princess.kissing){
    princess.vy += 1200*dt;
    princess.ax += princess.vx*dt;
    princess.ay += princess.vy*dt;

    if(princess.ay + princess.h >= GROUND_Y){
      princess.ay = GROUND_Y - princess.h;
      princess.vy *= -0.25;
    }

    const tx = hero.x + hero.w/2;
    const px = princess.ax + princess.w/2;
    princess.vx += clamp((tx - px)*2.2, -380, 380) * dt;

    const dx = Math.abs(px - tx);
    const dy = Math.abs((princess.ay + princess.h/2) - (hero.y + hero.h/2));
    if(dx < 35 && dy < 45){
      princess.kissing = false;
      hero._kissT = 1.6;
      setMsg("💞 نجات کامل! حالا انتخاب کن.");
      beep(660,0.10,"triangle",0.12);
      beep(880,0.12,"triangle",0.12);

      const best = getBestOverall();
      if(score > best) setBestOverall(score);

      showChoice();
    }
  }

  if(hero._kissT>0) hero._kissT = Math.max(0, hero._kissT - dt);
}

// ---------------- Rendering ----------------
function draw(){
  ctx.clearRect(0,0,W,H);
  drawBackground();

  ctx.save();
  ctx.translate(-camX,0);

  drawGround();
  drawStructures();

  for(const p of pickups){
    const py = p.y + Math.sin(p.bob)*6;
    drawPickup(p.x, py, p.r, p.de, p.type);
  }
  for(const e of enemies) drawEnemy(e);
  for(const b of bullets) drawBullet(b);

  drawCage();
  drawPrincess();
  drawHero();
  drawParticles();

  ctx.restore();

  drawFuelBar();
  drawWatermark();

  if(state===STATE.INTRO) drawIntroCutscene();
  if(state===STATE.LOSE) drawEndOverlay("GAME OVER");
  if(state===STATE.WIN) drawEndOverlay("YOU WIN");
}

function drawBackground(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, "rgba(40,60,150,.25)");
  g.addColorStop(0.6, "rgba(10,12,30,.10)");
  g.addColorStop(1, "rgba(0,0,0,.00)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  ctx.globalAlpha = 0.45;
  for(let i=0;i<120;i++){
    const x = (i*97 + camX*0.15) % W;
    const y = (i*53) % 250;
    const r = (i%9===0)?1.8:1.1;
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  parallaxMountains(0.10, "rgba(120,120,255,.12)", 330);
  parallaxMountains(0.18, "rgba(90,220,255,.08)", 360);

  ctx.globalAlpha = 0.14;
  const hz = ctx.createLinearGradient(0, 240, 0, H);
  hz.addColorStop(0, "rgba(200,220,255,.0)");
  hz.addColorStop(1, "rgba(200,220,255,.45)");
  ctx.fillStyle = hz;
  ctx.fillRect(0,0,W,H);
  ctx.globalAlpha = 1;
}
function parallaxMountains(speed, color, baseY){
  const xShift = -(camX*speed) % 420;
  ctx.fillStyle = color;
  for(let i=-1;i<5;i++){
    const x = i*420 + xShift;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x+120, baseY-90);
    ctx.lineTo(x+240, baseY);
    ctx.lineTo(x+340, baseY-120);
    ctx.lineTo(x+420, baseY);
    ctx.closePath();
    ctx.fill();
  }
}
function drawGround(){
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(-200, GROUND_Y, LEVEL_LEN+600, H-GROUND_Y);

  ctx.fillStyle = "rgba(255,209,102,.12)";
  ctx.fillRect(-200, GROUND_Y, LEVEL_LEN+600, 3);

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "rgba(0,0,0,.45)";
  for(let x=-200; x<LEVEL_LEN+400; x+=40){
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawStructures(){
  ctx.fillStyle = "rgba(0,0,0,.25)";
  for(let i=0;i<70;i++){
    const x = i*70;
    const hh = 40 + (i%5)*22;
    ctx.fillRect(x, GROUND_Y - 140 - hh, 44, hh);
  }
}

function drawPickup(x,y,r,text,type){
  const t = String(text);
  const rr = Math.max(r, bubbleRadiusFor(t));

  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(x,y,rr+10,0,Math.PI*2);
  ctx.fillStyle = "rgba(140,170,220,.08)";
  ctx.fill();

  const gg = ctx.createRadialGradient(x-rr*0.3,y-rr*0.3,2, x,y,rr);
  gg.addColorStop(0, "rgba(255,255,255,.90)");
  gg.addColorStop(1, "rgba(140,170,220,.30)");
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(x,y,rr,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if(type==="keyWord"){
    ctx.fillStyle = "rgba(120,255,220,.28)";
    ctx.fillRect(x-rr, y-rr-22, rr*2, 16);
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center"; ctx.textBaseline="middle";
    ctx.fillStyle = "rgba(0,0,0,.70)";
    ctx.fillText("KEY", x, y-rr-14);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,.74)";

  ctx.font = "bold 14px system-ui";
  let tw = ctx.measureText(t).width;
  if(tw > rr*2 - 18){
    ctx.font = "bold 12px system-ui";
    tw = ctx.measureText(t).width;
  }
  if(tw > rr*2 - 18){
    ctx.font = "bold 11px system-ui";
  }

  ctx.fillText(t, x, y);
  ctx.globalAlpha = 1;
}

function drawEnemy(e){
  ctx.save();
  if(e.hitT>0) ctx.globalAlpha = 0.55;

  ctx.fillStyle = "rgba(255,60,120,.14)";
  ctx.fillRect(e.x-4, e.y-4, e.w+8, e.h+8);

  ctx.fillStyle = "rgba(255,93,122,.58)";
  ctx.fillRect(e.x, e.y, e.w, e.h);

  ctx.fillStyle = "rgba(0,0,0,.65)";
  ctx.fillRect(e.x+10, e.y+10, 6, 6);
  ctx.fillRect(e.x+26, e.y+10, 6, 6);

  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.fillRect(e.x+12, e.y+28, 24, 4);
  ctx.restore();
}
function drawBullet(b){
  ctx.fillStyle = "rgba(255,209,102,.75)";
  ctx.fillRect(b.x-4, b.y-2, 10, 4);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "rgba(255,209,102,.35)";
  ctx.fillRect(b.x-12, b.y-2, 12, 4);
  ctx.globalAlpha = 1;
}
function drawCage(){
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fillRect(cage.x, cage.y, cage.w, cage.h);

  ctx.strokeStyle = "rgba(255,255,255,.20)";
  ctx.lineWidth = 2;
  ctx.strokeRect(cage.x, cage.y, cage.w, cage.h);

  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = "rgba(255,255,255,.25)";
  for(let i=1;i<8;i++){
    const x = cage.x + i*(cage.w/8);
    ctx.beginPath();
    ctx.moveTo(x, cage.y);
    ctx.lineTo(x, cage.y+cage.h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if(cage.open){
    ctx.fillStyle = "rgba(120,255,220,.10)";
    ctx.fillRect(cage.x + cage.w-22, cage.y, 22, cage.h);
  } else {
    ctx.fillStyle = hasKey ? "rgba(120,255,220,.28)" : "rgba(255,209,102,.12)";
    ctx.fillRect(cage.x + cage.w-26, cage.y + cage.h/2 - 18, 18, 36);
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center"; ctx.textBaseline="middle";
    ctx.fillStyle = "rgba(255,255,255,.60)";
    ctx.fillText("E", cage.x + cage.w-17, cage.y + cage.h/2);
  }
}
function drawPrincess(){
  const px = princess.rescued ? princess.ax : princess.x;
  const py = princess.rescued ? princess.ay : princess.y;

  ctx.fillStyle = princess.rescued ? "rgba(120,255,220,.55)" : "rgba(255,120,170,.55)";
  ctx.fillRect(px, py, princess.w, princess.h);

  ctx.fillStyle = "rgba(255,209,102,.72)";
  ctx.fillRect(px, py-8, princess.w, 8);

  ctx.fillStyle = "rgba(0,0,0,.60)";
  ctx.fillRect(px+8, py+14, 5, 5);
  ctx.fillRect(px+26, py+14, 5, 5);
}
function drawHero(){
  const blink = (hero.invuln>0) ? (Math.sin(performance.now()*0.02)>0 ? 0.25 : 1) : 1;
  ctx.globalAlpha = blink;

  ctx.globalAlpha *= 0.55;
  ctx.fillStyle = "rgba(0,0,0,.40)";
  ctx.beginPath();
  ctx.ellipse(hero.x+hero.w/2, hero.y+hero.h+6, hero.w*0.55, 7, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = blink;

  if(keys.has("ArrowUp") && hero.fuel>0.02){
    ctx.globalAlpha *= 0.85;
    ctx.fillStyle = "rgba(255,120,30,.55)";
    ctx.fillRect(hero.x-6, hero.y+44, 10, 20);
    ctx.fillStyle = "rgba(255,209,102,.45)";
    ctx.fillRect(hero.x-3, hero.y+48, 6, 12);
    ctx.globalAlpha = blink;
  }

  ctx.fillStyle = "rgba(255,50,110,.30)";
  const capeX = hero.face===1 ? hero.x-12 : hero.x+hero.w;
  ctx.fillRect(capeX, hero.y+18, 12, 38);

  ctx.fillStyle = "rgba(80,220,255,.18)";
  ctx.fillRect(hero.x-3,hero.y-3,hero.w+6,hero.h+6);
  ctx.fillStyle = "rgba(69,240,166,.65)";
  ctx.fillRect(hero.x,hero.y,hero.w,hero.h);

  ctx.fillStyle = "rgba(255,209,102,.70)";
  ctx.fillRect(hero.x, hero.y+38, hero.w, 6);
  ctx.fillStyle = "rgba(255,209,102,.70)";
  ctx.fillRect(hero.x, hero.y-8, hero.w, 10);

  ctx.fillStyle = "rgba(0,0,0,.45)";
  if(hero.face===1) ctx.fillRect(hero.x+hero.w-16, hero.y+16, 8, 7);
  else ctx.fillRect(hero.x+8, hero.y+16, 8, 7);

  ctx.fillStyle = "rgba(255,255,255,.25)";
  const gunX = hero.face===1 ? hero.x+hero.w+3 : hero.x-7;
  ctx.fillRect(gunX, hero.y+28, 4, 18);

  ctx.globalAlpha = 1;
}
function drawParticles(){
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "rgba(255,209,102,.55)";
  for(const p of particles) ctx.fillRect(p.x, p.y, 3, 3);
  ctx.globalAlpha = 1;
}
function drawFuelBar(){
  const x = 20, y = 18, w = 140, h = 10;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(120,255,220,.35)";
  ctx.fillRect(x, y, w*hero.fuel, h);
  ctx.strokeStyle = "rgba(255,255,255,.25)";
  ctx.strokeRect(x, y, w, h);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.textAlign="left"; ctx.textBaseline="bottom";
  ctx.fillText("JETPACK", x, y-2);
  ctx.globalAlpha = 1;
}
function drawWatermark(){
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.font = "bold 14px system-ui";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,255,255,.65)";
  ctx.fillText("Ali Moslehi", W-16, H-12);
  ctx.globalAlpha = 0.35;
  ctx.font = "12px system-ui";
  ctx.fillStyle = "rgba(255,209,102,.55)";
  ctx.fillText("Made by", W-16, H-30);
  ctx.restore();
}

// Intro story
let introT = 0;
function drawIntroCutscene(){
  introT += 1/60;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(0,0,W,H);
  ctx.globalAlpha = 1;

  const px = 80, py = 70, pw = W-160, ph = H-140;
  ctx.fillStyle = "rgba(18,26,51,.88)";
  ctx.fillRect(px,py,pw,ph);
  ctx.strokeStyle = "rgba(255,255,255,.14)";
  ctx.strokeRect(px,py,pw,ph);

  ctx.font = "900 28px system-ui";
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.textAlign="center"; ctx.textBaseline="top";
  ctx.fillText("HERO DEUTSCH RESCUE", W/2, py+20);

  ctx.font = "15px system-ui";
  ctx.fillStyle = "rgba(233,238,255,.82)";
  ctx.textAlign="center"; ctx.textBaseline="top";

  const lines = [
    "هیولا ها شهرو رو گرفتن",
    "قهرمان به کمک تو نیاز داره تا بتونه شهر رو از دست هیولا ها نجات بده و پرنسس رو آزاد کنه",
    "5 کلمه رو درست حدس بزن تا کلید نجات بهت داده بشه",
    "فقط حواست باشه هیولا ها نمیزارن به راحتی موفق بشی",
    "میتونی با دکمه ی X بهشون شلیک کنی",
    "همه چیز دست توئه",
    "",
    "برای شروع قهرمان بازی دکمه ی شروع رو بزن"
  ];

  let yy = py + 78;
  for(const ln of lines){
    ctx.fillText(ln, W/2, yy);
    yy += 24;
  }

  ctx.globalAlpha = 0.9;
  ctx.font = "bold 15px system-ui";
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillText("Enter یا Click برای شروع — M موزیک", W/2, py+ph-60);
  ctx.globalAlpha = 1;

  ctx.restore();
}
function drawEndOverlay(title){
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fillRect(0,0,W,H);
  ctx.globalAlpha = 1;

  ctx.font = "900 42px system-ui";
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(title, W/2, H/2 - 30);

  ctx.font = "16px system-ui";
  ctx.fillStyle = "rgba(255,209,102,.78)";
  ctx.fillText("R برای شروع دوباره", W/2, H/2 + 20);

  ctx.restore();
}

// ---------------- Main loop ----------------
function loop(now){
  const dt = Math.min(0.033, (now-last)/1000);
  last = now;

  if(running){
    update(dt);

    if(state===STATE.PLAY){
      if(!hasKey && pickups.length < 4) spawnPickupsNear(hero.x + 700 + Math.random()*220);

      const needEnemies = 2 + Math.floor(levelIndex/2);
      if(enemies.length < needEnemies){
        if(Math.random() < 0.10 + levelIndex*0.02) spawnEnemyWave(1 + Math.floor(levelIndex/2));
      }
    }
  }

  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Boot
resetAll(true);
const keys={};

window.addEventListener("keydown",e=>{
  keys[e.code]=true;
});

window.addEventListener("keyup",e=>{
  keys[e.code]=false;
});

function hold(btn,key){
  if(!btn)return;

  btn.addEventListener("touchstart",e=>{
    e.preventDefault();
    keys[key]=true;
  });

  btn.addEventListener("touchend",e=>{
    e.preventDefault();
    keys[key]=false;
  });
}

hold(document.getElementById("leftBtn"),"ArrowLeft");
hold(document.getElementById("rightBtn"),"ArrowRight");
hold(document.getElementById("jumpBtn"),"Space");
hold(document.getElementById("shootBtn"),"KeyX");
hold(document.getElementById("flyBtn"),"ArrowUp");
function hold(btn, key){
  if(!btn) return;

  btn.addEventListener("touchstart", e=>{
    e.preventDefault();
    keys[key]=true;
  });

  btn.addEventListener("touchend", e=>{
    e.preventDefault();
    keys[key]=false;
  });
}

hold(document.getElementById("leftBtn"),"ArrowLeft");
hold(document.getElementById("rightBtn"),"ArrowRight");
hold(document.getElementById("jumpBtn"),"Space");
hold(document.getElementById("shootBtn"),"KeyX");
hold(document.getElementById("flyBtn"),"ArrowUp");