require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios   = require('axios');
const multer  = require('multer');

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Admin auth ───────────────────────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'wagaring-wizards-admin-2024';
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// ─── Supabase (optional) ──────────────────────────────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  console.log('✅ Supabase connected — persistent storage + image hosting active');
} else {
  console.log('📦 Mode: In-Memory (add SUPABASE_URL + SUPABASE_SERVICE_KEY to .env)');
}

const BUCKET = 'wagering-wizards';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── In-memory seed (fallback) ────────────────────────────────────────────────
let memPredictions = [
  { _id:'1', match:'Arsenal vs Chelsea', league:'Premier League', odds:'2.45', oddsCategory:'2+',
    price:20, date:new Date(Date.now()+86400000).toISOString(), status:'active', result:null,
    content:'Arsenal to Win & Over 2.5 Goals', bookingCode:'ARS-CHE-8821',
    tips:['Arsenal to win','Both teams to score','Over 2.5 goals total'],
    imageUrl:'', proofImageUrl:'', startDay:'Saturday', endDay:'Saturday', createdAt:new Date().toISOString() },
  { _id:'2', match:'Barcelona vs Real Madrid', league:'La Liga', odds:'3.10', oddsCategory:'2+',
    price:30, date:new Date(Date.now()+172800000).toISOString(), status:'active', result:null,
    content:'Real Madrid to Win or Draw & BTTS', bookingCode:'BAR-RMA-4432',
    tips:['Real Madrid win/draw','Both teams to score','Under 3.5 goals'],
    imageUrl:'', proofImageUrl:'', startDay:'Sunday', endDay:'Sunday', createdAt:new Date().toISOString() },
  { _id:'4', match:'Bayern Munich vs Dortmund', league:'Bundesliga', odds:'10.20', oddsCategory:'10+',
    price:80, date:new Date(Date.now()-172800000).toISOString(), status:'completed', result:'win',
    content:'BTTS + Over 2.5 Goals', bookingCode:'BUND-4821', tips:['BTTS','Over 2.5 goals'],
    imageUrl:'', proofImageUrl:'', startDay:'', endDay:'', createdAt:new Date(Date.now()-259200000).toISOString() },
  { _id:'5', match:'Juventus vs AC Milan', league:'Serie A', odds:'4.75', oddsCategory:'2+',
    price:40, date:new Date(Date.now()-345600000).toISOString(), status:'completed', result:'loss',
    content:'Juventus to win', bookingCode:'SERA-2291', tips:['Juventus to win'],
    imageUrl:'', proofImageUrl:'', startDay:'', endDay:'', createdAt:new Date(Date.now()-432000000).toISOString() },
];
let memPayments = [];

// ─── Supabase row mappers (snake_case → camelCase) ────────────────────────────
const toP = r => r ? ({ _id:r.id, match:r.match, league:r.league, odds:r.odds,
  oddsCategory:r.odds_category, price:r.price, content:r.content, bookingCode:r.booking_code,
  tips:r.tips||[], imageUrl:r.image_url, proofImageUrl:r.proof_image_url,
  startDay:r.start_day, endDay:r.end_day, date:r.date, status:r.status,
  result:r.result, createdAt:r.created_at }) : null;

const toMoney = r => r ? ({ _id:r.id, predictionId:r.prediction_id, predictionTitle:r.prediction_title,
  reference:r.reference, email:r.email, amount:r.amount, currency:r.currency,
  status:r.status, accessToken:r.access_token, createdAt:r.created_at }) : null;

// ─── DB helpers (Supabase or in-memory) ──────────────────────────────────────
const db = {
  async findPredictions(filter = {}) {
    if (supabase) {
      let q = supabase.from('predictions').select('*');
      if (filter.status)       q = q.eq('status', filter.status);
      if (filter.oddsCategory) q = q.eq('odds_category', filter.oddsCategory);
      q = filter.status === 'completed'
        ? q.order('date', { ascending: false })
        : q.order('date', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return data.map(toP);
    }
    let list = [...memPredictions];
    if (filter.status)       list = list.filter(p => p.status === filter.status);
    if (filter.oddsCategory) list = list.filter(p => p.oddsCategory === filter.oddsCategory);
    return list;
  },
  async findPredictionById(id) {
    if (supabase) {
      const { data, error } = await supabase.from('predictions').select('*').eq('id', id).single();
      return error ? null : toP(data);
    }
    return memPredictions.find(p => p._id === id) || null;
  },
  async createPrediction(data) {
    if (supabase) {
      const { data: d, error } = await supabase.from('predictions').insert({
        match:data.match, league:data.league, odds:data.odds, odds_category:data.oddsCategory,
        price:Number(data.price), content:data.content||'', booking_code:data.bookingCode||'',
        tips:data.tips||[], image_url:data.imageUrl||'', proof_image_url:data.proofImageUrl||'',
        start_day:data.startDay||'', end_day:data.endDay||'', date:data.date,
        status:data.status||'active', result:data.result||null,
      }).select().single();
      if (error) throw error;
      return toP(d);
    }
    const p = { _id:uuidv4(), ...data, createdAt:new Date().toISOString() };
    memPredictions.unshift(p); return p;
  },
  async updatePrediction(id, upd) {
    if (supabase) {
      const row = {};
      if (upd.match!==undefined)          row.match          = upd.match;
      if (upd.league!==undefined)         row.league         = upd.league;
      if (upd.odds!==undefined)           row.odds           = upd.odds;
      if (upd.oddsCategory!==undefined)   row.odds_category  = upd.oddsCategory;
      if (upd.price!==undefined)          row.price          = Number(upd.price);
      if (upd.content!==undefined)        row.content        = upd.content;
      if (upd.bookingCode!==undefined)    row.booking_code   = upd.bookingCode;
      if (upd.tips!==undefined)           row.tips           = upd.tips;
      if (upd.imageUrl!==undefined)       row.image_url      = upd.imageUrl;
      if (upd.proofImageUrl!==undefined)  row.proof_image_url= upd.proofImageUrl;
      if (upd.startDay!==undefined)       row.start_day      = upd.startDay;
      if (upd.endDay!==undefined)         row.end_day        = upd.endDay;
      if (upd.date!==undefined)           row.date           = new Date(upd.date);
      if (upd.status!==undefined)         row.status         = upd.status;
      if (upd.result!==undefined)         row.result         = upd.result;
      const { data, error } = await supabase.from('predictions').update(row).eq('id', id).select().single();
      if (error) throw error;
      return toP(data);
    }
    const idx = memPredictions.findIndex(p => p._id === id);
    if (idx === -1) return null;
    memPredictions[idx] = { ...memPredictions[idx], ...upd };
    return memPredictions[idx];
  },
  async deletePrediction(id) {
    if (supabase) {
      const { data, error } = await supabase.from('predictions').delete().eq('id', id).select().single();
      return error ? null : toP(data);
    }
    const idx = memPredictions.findIndex(p => p._id === id);
    return idx === -1 ? null : memPredictions.splice(idx, 1)[0];
  },
  async allPredictions() {
    if (supabase) {
      const { data, error } = await supabase.from('predictions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toP);
    }
    return [...memPredictions].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  },
  async findPayment(query) {
    if (supabase) {
      let q = supabase.from('payments').select('*');
      if (query.reference)    q = q.eq('reference',     query.reference);
      if (query.status)       q = q.eq('status',        query.status);
      if (query.email)        q = q.eq('email',         query.email);
      if (query.predictionId) q = q.eq('prediction_id', query.predictionId);
      if (query.accessToken)  q = q.eq('access_token',  query.accessToken);
      const { data, error } = await q.maybeSingle();
      return error ? null : toMoney(data);
    }
    return memPayments.find(p => Object.entries(query).every(([k,v]) => p[k]===v)) || null;
  },
  async createPayment(data) {
    if (supabase) {
      const { data: d, error } = await supabase.from('payments').insert({
        prediction_id:data.predictionId, prediction_title:data.predictionTitle,
        reference:data.reference, email:data.email.toLowerCase().trim(),
        amount:data.amount, currency:data.currency||'GHS',
        status:data.status, access_token:data.accessToken||uuidv4(),
      }).select().single();
      if (error) throw error;
      return toMoney(d);
    }
    const p = { _id:uuidv4(), ...data, createdAt:new Date().toISOString() };
    memPayments.unshift(p); return p;
  },
  async allPayments(page=1, limit=20) {
    if (supabase) {
      const from = (page-1)*limit;
      const { data, count, error } = await supabase.from('payments')
        .select('*', { count:'exact' }).eq('status','success')
        .order('created_at', { ascending:false }).range(from, from+limit-1);
      if (error) throw error;
      return { data:data.map(toMoney), total:count };
    }
    const success = memPayments.filter(p => p.status==='success');
    return { data:success.slice((page-1)*limit, page*limit), total:success.length };
  },
  async stats() {
    if (supabase) {
      const [{ count:total }, { count:active }, { count:completed }, { data:payments }] = await Promise.all([
        supabase.from('predictions').select('*',{count:'exact',head:true}),
        supabase.from('predictions').select('*',{count:'exact',head:true}).eq('status','active'),
        supabase.from('predictions').select('*',{count:'exact',head:true}).eq('status','completed'),
        supabase.from('payments').select('*').eq('status','success'),
      ]);
      return { total, active, completed, payments:payments.map(toMoney) };
    }
    const payments = memPayments.filter(p => p.status==='success');
    return {
      total:memPredictions.length,
      active:memPredictions.filter(p=>p.status==='active').length,
      completed:memPredictions.filter(p=>p.status==='completed').length,
      payments,
    };
  },
};

// ─── Routes: Image Upload ─────────────────────────────────────────────────────
app.post('/api/upload', adminAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured — image uploads unavailable' });
  try {
    const ext      = req.file.originalname.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(filename, req.file.buffer, {
      contentType: req.file.mimetype, upsert: false,
    });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    res.json({ success: true, url: publicUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Routes: Public Predictions ───────────────────────────────────────────────
app.get('/api/predictions', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'active' };
    if (category && category !== 'all') filter.oddsCategory = category;
    const raw  = await db.findPredictions(filter);
    const safe = raw.map(({ content, imageUrl, bookingCode, tips, proofImageUrl, ...rest }) => ({
      ...rest, previewImageUrl: imageUrl || null,
    }));
    res.json({ success: true, data: safe });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/predictions/history', async (req, res) => {
  try {
    res.json({ success: true, data: await db.findPredictions({ status: 'completed' }) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Routes: Payment ──────────────────────────────────────────────────────────
app.post('/api/payment/initiate', async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });
    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    const reference = `WW_${uuidv4().replace(/-/g,'').slice(0,16)}`;
    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email, amount:prediction.price*100, currency:'GHS', reference,
        callback_url:`${process.env.CLIENT_URL}/unlock/${reference}`,
        metadata:{ predictionId:predictionId.toString(), predictionTitle:prediction.match } },
      { headers:{ Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    res.json({ success:true, reference, authorization_url:paystackRes.data.data.authorization_url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/payment/verify', async (req, res) => {
  try {
    const { reference, predictionId, email } = req.body;
    if (!reference || !predictionId) return res.status(400).json({ error: 'reference and predictionId required' });
    const existing = await db.findPayment({ reference, status:'success' });
    if (existing) return res.json({ success:true, reference:existing.reference, accessToken:existing.accessToken, message:'Already verified' });
    const { data: pRes } = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers:{ Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const txn = pRes.data;
    if (!txn || txn.status !== 'success') return res.status(402).json({ error: 'Payment not successful on Paystack' });
    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    const accessToken = uuidv4();
    await db.createPayment({
      predictionId, predictionTitle:prediction.match, reference,
      email:email||txn.customer?.email||'', amount:txn.amount/100,
      currency:txn.currency||'GHS', status:'success', accessToken,
    });
    res.json({ success:true, reference, accessToken });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/payment/restore', async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });
    const payment = await db.findPayment({ email:email.toLowerCase().trim(), predictionId, status:'success' });
    if (!payment) return res.status(404).json({ error: 'No payment found for this email and prediction' });
    res.json({ success:true, reference:payment.reference, accessToken:payment.accessToken });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/access/:reference', async (req, res) => {
  try {
    const payment = await db.findPayment({ reference:req.params.reference, status:'success' });
    if (!payment) return res.status(403).json({ error: 'Invalid or unverified reference' });
    const prediction = await db.findPredictionById(payment.predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, data:prediction });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Routes: Admin ────────────────────────────────────────────────────────────
app.get('/api/admin/predictions', adminAuth, async (req, res) => {
  try { res.json({ success:true, data:await db.allPredictions() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/predictions', adminAuth, async (req, res) => {
  try {
    const { match, league, odds, oddsCategory, price, content, bookingCode, tips,
            imageUrl, proofImageUrl, date, status, result, startDay, endDay } = req.body;
    const prediction = await db.createPrediction({
      match, league, odds, oddsCategory, price:Number(price),
      content:content||'', bookingCode:bookingCode||'',
      tips:Array.isArray(tips)?tips:[], imageUrl:imageUrl||'',
      proofImageUrl:proofImageUrl||'', date:new Date(date),
      status:status||'active', result:result||null,
      startDay:startDay||'', endDay:endDay||'',
    });
    res.status(201).json({ success:true, data:prediction });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const upd = { ...req.body };
    if (upd.tips && !Array.isArray(upd.tips)) upd.tips = [];
    const prediction = await db.updatePrediction(req.params.id, upd);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, data:prediction });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const prediction = await db.deletePrediction(req.params.id);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, message:'Prediction deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/payments', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page)||1, limit = parseInt(req.query.limit)||20;
    const { data, total } = await db.allPayments(page, limit);
    res.json({ success:true, data, total, pages:Math.ceil(total/limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const { total, active, completed, payments } = await db.stats();
    const totalRevenue = payments.reduce((s,p) => s+(p.amount||0), 0);
    const recentActivity = [...payments]
      .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,20)
      .map(p => ({ _id:p._id, email:p.email, predictionTitle:p.predictionTitle||'—',
        amount:p.amount, currency:p.currency||'GHS', status:p.status, createdAt:p.createdAt }));
    res.json({ success:true, data:{
      totalSlips:total, activeSlips:active, completedSlips:completed,
      totalRevenue, totalSales:payments.length, recentActivity,
    }});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_TOKEN) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ success:true, token:ADMIN_TOKEN });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', mode: supabase ? 'supabase' : 'in-memory' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Wagering Wizards API on port ${PORT}`);
  console.log(`🔑 Admin token: ${ADMIN_TOKEN}`);
});
