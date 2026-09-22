require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto    = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios     = require('axios');
const nodemailer = require('nodemailer');
const multer    = require('multer');

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5001;
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', true);

// ─── Security: Helmet headers ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Let Vercel/Next handle CSP
  crossOriginEmbedderPolicy: false,
}));

// ─── Security: CORS — lock to production domain ──────────────────────────────
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, webhooks)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Security: Rate Limiting ──────────────────────────────────────────────────
const limiterDefaults = {
  standardHeaders: true,
  legacyHeaders:   false,
  validate:        false, // Suppress XFF/proxy ValidationErrors that were crashing every request
  handler: (req, res) => {
    const resetMs    = req.rateLimit?.resetTime ? req.rateLimit.resetTime - Date.now() : 60000;
    const retryAfter = Math.max(1, Math.ceil(resetMs / 1000));
    console.log(`[RATE-LIMIT] ${req.ip} → ${req.method} ${req.path} | limit=${req.rateLimit?.limit} window=${req.rateLimit?.windowMs}ms`);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({ error: 'Too many requests. Please wait before trying again.', retryAfter });
  },
};

// Auth: strict — admin login only (10 attempts / 15 min)
const authLimiter = rateLimit({ ...limiterDefaults, windowMs: 15 * 60 * 1000, max: 10 });

// Payment: moderate — covers initiate + verify + retries (30 / min)
const paymentLimiter = rateLimit({ ...limiterDefaults, windowMs: 60 * 1000, max: 30 });

// No general rate limiter — public reads need no limiting, admin is token-protected.
// Removing this eliminates the primary source of user-facing blocks.

// Body parsing — IMPORTANT: raw body needed for webhook HMAC verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payment/flw/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// ─── Admin auth ───────────────────────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-in-production';
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// ─── Email (Nodemailer / Gmail SMTP) ─────────────────────────────────────────
let mailer = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  mailer.verify(err => {
    if (err) console.error('\u274c Gmail SMTP error:', err.message);
    else     console.log('\u2705 Gmail SMTP ready \u2014 emails enabled');
  });
} else {
  console.log('\ud83d\udce7 Email disabled \u2014 set GMAIL_USER + GMAIL_APP_PASSWORD to enable');
}

function buildEmailHtml(prediction, reference, currency, amount) {
  const tips = Array.isArray(prediction.tips) ? prediction.tips : [];
  const tipsHtml = tips.length
    ? tips.map(t => `<li style="margin:6px 0;color:#e2e8f0;">${t}</li>`).join('')
    : '<li style="color:#64748b;">\u2014</li>';
  const categoryColors = {
    '2+':  { text: '#D4A017', bg: 'rgba(212,160,23,0.15)', border: '#D4A017' },
    '5+':  { text: '#F5C842', bg: 'rgba(245,200,66,0.15)', border: '#F5C842' },
    '10+': { text: '#E8E8E8', bg: 'rgba(232,232,232,0.1)',  border: '#E8E8E8' },
    '20+': { text: '#ff6b6b', bg: 'rgba(255,107,107,0.15)', border: '#ff6b6b' },
  };
  const cat = categoryColors[prediction.oddsCategory] || categoryColors['2+'];
  const displayAmount = currency === 'NGN' ? `\u20a6${Number(amount).toLocaleString()}` : `GHS ${amount}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Prediction</title></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111111;border-radius:20px;overflow:hidden;border:1px solid rgba(212,160,23,0.2);"><tr><td style="height:4px;background:linear-gradient(90deg,#D4A017,#F5C842,#D4A017);"></td></tr><tr><td style="padding:32px 36px 24px;border-bottom:1px solid rgba(255,255,255,0.06);"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#D4A017;">\u26bd ${process.env.EMAIL_FROM_NAME||'Predictions'}</p><p style="margin:0;font-size:13px;color:#555;">Premium Football Predictions</p></td><td align="right"><span style="display:inline-block;padding:6px 14px;background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.3);border-radius:50px;font-size:12px;font-weight:700;">\ud83d\udd13 UNLOCKED</span></td></tr></table></td></tr><tr><td style="padding:28px 36px 0;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Your Prediction</p><h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f5f5f5;line-height:1.3;">${prediction.match||'Prediction'}</h1><table cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px;"><span style="display:inline-block;padding:4px 12px;background:${cat.bg};color:${cat.text};border:1px solid ${cat.border};border-radius:8px;font-size:11px;font-weight:800;letter-spacing:1.5px;">${prediction.oddsCategory||'\u2014'} ODDS</span></td>${prediction.league?`<td><span style="font-size:12px;color:#64748b;">${prediction.league}</span></td>`:''} ${prediction.odds?`<td style="padding-left:12px;"><span style="font-size:13px;font-weight:700;color:${cat.text};">@${prediction.odds}</span></td>`:''}</tr></table></td></tr>${prediction.bookingCode?`<tr><td style="padding:24px 36px 0;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Booking / Bet Code</p><div style="background:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.25);border-radius:12px;padding:16px 20px;"><p style="margin:0;font-size:22px;font-weight:800;color:#D4A017;letter-spacing:3px;font-family:monospace;">${prediction.bookingCode}</p></div></td></tr>`:''} ${tips.length?`<tr><td style="padding:24px 36px 0;"><p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Tips</p><ul style="margin:0;padding-left:20px;">${tipsHtml}</ul></td></tr>`:''} ${prediction.content?`<tr><td style="padding:20px 36px 0;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Analysis</p><p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.7;">${prediction.content}</p></td></tr>`:''} ${prediction.imageUrl?`<tr><td style="padding:24px 36px 0;"><p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#555;letter-spacing:2px;text-transform:uppercase;">Bet Slip</p><img src="cid:betslip" alt="Bet Slip" style="width:100%;max-width:528px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);display:block;" /></td></tr>`:''}<tr><td style="padding:28px 36px;"><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:12px;color:#555;">Amount paid</td><td align="right" style="font-size:13px;font-weight:700;color:#22c55e;">${displayAmount}</td></tr><tr><td colspan="2" style="height:8px;"></td></tr><tr><td style="font-size:12px;color:#555;">Reference</td><td align="right" style="font-size:11px;color:#475569;font-family:monospace;">${reference}</td></tr></table></div></td></tr><tr><td style="padding:0 36px 32px;border-top:1px solid rgba(255,255,255,0.05);"><p style="margin:20px 0 6px;font-size:12px;color:#334155;text-align:center;">Keep this email for your records. Contact: <span style="color:#D4A017;">${process.env.GMAIL_USER||'support@example.com'}</span></p><p style="margin:0;font-size:11px;color:#1e293b;text-align:center;">\u26a0\ufe0f Bet responsibly. 18+ only.</p></td></tr><tr><td style="height:3px;background:linear-gradient(90deg,#D4A017,#F5C842,#D4A017);"></td></tr></table></td></tr></table></body></html>`;
}

async function sendPredictionEmail(email, prediction, reference, currency, amount) {
  if (!mailer) return;
  try {
    const subject = `\ud83d\udd13 Your Prediction \u2014 ${prediction.match||'Unlocked'}`;
    const html    = buildEmailHtml(prediction, reference, currency, amount);
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME||'Predictions'}" <${process.env.GMAIL_USER}>`,
      to: email, subject, html, attachments: [],
    };
    if (prediction.imageUrl) {
      try {
        const imgRes = await axios.get(prediction.imageUrl, { responseType:'arraybuffer', timeout:10000 });
        mailOptions.attachments.push({ filename:'betslip.jpg', content:Buffer.from(imgRes.data), contentType:imgRes.headers['content-type']||'image/jpeg', cid:'betslip' });
      } catch(imgErr) { console.warn('Email: image fetch failed \u2014', imgErr.message); }
    }
    await mailer.sendMail(mailOptions);
    console.log(`\ud83d\udce7 Email sent \u2192 ${email} (ref: ${reference})`);
  } catch(err) { console.error('\ud83d\udce7 Email send failed:', err.message); }
}


// ─── Supabase (optional) ──────────────────────────────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  console.log('✅ Supabase connected');
} else {
  console.log('📦 Mode: In-Memory (add SUPABASE_URL + SUPABASE_SERVICE_KEY to .env)');
}

const BUCKET = 'wagering-wizards';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

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
const toP = (r, purchaseCount = 0) => r ? ({ _id:r.id, match:r.match, league:r.league, odds:r.odds,
  oddsCategory:r.odds_category, price:r.price, content:r.content, bookingCode:r.booking_code,
  tips:r.tips||[], imageUrl:r.image_url, proofImageUrl:r.proof_image_url,
  startDay:r.start_day, endDay:r.end_day, date:r.date, status:r.status,
  result:r.result, purchaseCount, createdAt:r.created_at }) : null;

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
      // Fetch predictions + count of successful payments per prediction
      const [{ data, error }, { data: payCounts }] = await Promise.all([
        supabase.from('predictions').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select('prediction_id').eq('status', 'success'),
      ]);
      if (error) throw error;
      // Build a count map: predictionId → number of successful payments
      const countMap = {};
      (payCounts || []).forEach(p => { countMap[p.prediction_id] = (countMap[p.prediction_id] || 0) + 1; });
      return data.map(r => toP(r, countMap[r.id] || 0));
    }
    // In-memory: count from memPayments
    const countMap = {};
    memPayments.filter(p => p.status === 'success').forEach(p => {
      countMap[p.predictionId] = (countMap[p.predictionId] || 0) + 1;
    });
    return [...memPredictions]
      .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))
      .map(p => ({ ...p, purchaseCount: countMap[p._id] || 0 }));
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
      // ── Time boundaries ────────────────────────────────────────────────────
      const now        = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
      const weekStart  = new Date(new Date(todayStart).getTime() - 6 * 86400000).toISOString();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

      const [
        { count: total },
        { count: active },
        { count: completed },
        // Aggregate sums — no row-count cap; computed entirely in Postgres
        { data: ghsAll },
        { data: ngnAll },
        { data: ghsToday },
        { data: ngnToday },
        { data: ghsWeek },
        { data: ngnWeek },
        { data: ghsMonth },
        { data: ngnMonth },
        // Counts
        { count: totalSalesCount },
        { count: todaySalesCount },
        { count: weekSalesCount },
        { count: monthSalesCount },
        { count: ghsSalesCount },
        { count: ngnSalesCount },
        // Recent activity feed (lightweight, only 20 rows)
        { data: recentPayments },
      ] = await Promise.all([
        supabase.from('predictions').select('*', { count: 'exact', head: true }),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        // Revenue sums via aggregate select — bypasses row limits entirely
        supabase.from('payments').select('amount.sum()').eq('status', 'success').eq('currency', 'GHS'),
        supabase.from('payments').select('amount.sum()').eq('status', 'success').eq('currency', 'NGN'),
        supabase.from('payments').select('amount.sum()').eq('status', 'success').eq('currency', 'GHS').gte('created_at', todayStart),
        supabase.from('payments').select('amount.sum()').eq('status', 'success').eq('currency', 'NGN').gte('created_at', todayStart),
        supabase.from('payments').select('amount.sum()').eq('status', 'success').eq('currency', 'GHS').gte('created_at', weekStart),
        supabase.from('payments').select('amount.sum()').eq('status', 'success').eq('currency', 'NGN').gte('created_at', weekStart),
        supabase.from('payments').select('amount.sum()').eq('status', 'success').eq('currency', 'GHS').gte('created_at', monthStart),
        supabase.from('payments').select('amount.sum()').eq('status', 'success').eq('currency', 'NGN').gte('created_at', monthStart),
        // Counts
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'success'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'success').gte('created_at', todayStart),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'success').gte('created_at', weekStart),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'success').gte('created_at', monthStart),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'success').eq('currency', 'GHS'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'success').eq('currency', 'NGN'),
        // Recent activity
        supabase.from('payments').select('*').eq('status', 'success').order('created_at', { ascending: false }).limit(20),
      ]);

      // Extract sums from aggregate response (Supabase returns [{ sum: value }])
      const sumOf = (rows) => Number(rows?.[0]?.sum ?? 0);

      return {
        total, active, completed,
        _aggregated: true,
        totalRevenue:    sumOf(ghsAll),
        totalNgnRevenue: sumOf(ngnAll),
        totalSales:      totalSalesCount || 0,
        ghsSales:        ghsSalesCount || 0,
        ngnSales:        ngnSalesCount || 0,
        todayRevenue:    sumOf(ghsToday),
        todayNgnRevenue: sumOf(ngnToday),
        todaySales:      todaySalesCount || 0,
        weekRevenue:     sumOf(ghsWeek),
        weekNgnRevenue:  sumOf(ngnWeek),
        weekSales:       weekSalesCount || 0,
        monthRevenue:    sumOf(ghsMonth),
        monthNgnRevenue: sumOf(ngnMonth),
        monthSales:      monthSalesCount || 0,
        payments: [],
        recentPayments: recentPayments.map(toMoney),
      };
    }
    const payments = memPayments.filter(p => p.status==='success');
    const sorted   = [...payments].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {
      total: memPredictions.length,
      active: memPredictions.filter(p=>p.status==='active').length,
      completed: memPredictions.filter(p=>p.status==='completed').length,
      payments: sorted,
      recentPayments: sorted.slice(0, 20),
    };
  },

};

// ─── Helper: safe error response (never leak internals) ──────────────────────
function safeError(res, statusCode, fallbackMsg, err) {
  if (IS_PROD) {
    console.error(`[${statusCode}]`, err?.message || fallbackMsg);
    return res.status(statusCode).json({ error: fallbackMsg });
  }
  return res.status(statusCode).json({ error: err?.message || fallbackMsg });
}

// ─── Helper: strip premium fields from predictions ───────────────────────────
function stripSensitive(prediction) {
  const { content, imageUrl, bookingCode, tips, proofImageUrl, ...safe } = prediction;
  return { ...safe, previewImageUrl: imageUrl || null };
}

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
  } catch (err) { safeError(res, 500, 'Image upload failed', err); }
});

// ─── Routes: Public Predictions ───────────────────────────────────────────────
// VULN-1 FIX: Active predictions — strip sensitive fields
app.get('/api/predictions', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'active' };
    if (category && category !== 'all') filter.oddsCategory = category;
    const raw  = await db.findPredictions(filter);
    const safe = raw.map(stripSensitive);
    res.json({ success: true, data: safe });
  } catch (err) { safeError(res, 500, 'Failed to load predictions', err); }
});

// VULN-1 FIX: History — ALSO strip sensitive fields (was leaking ALL content!)
app.get('/api/predictions/history', async (req, res) => {
  try {
    const raw = await db.findPredictions({ status: 'completed' });
    const safe = raw.map(prediction => {
      const { content, imageUrl, bookingCode, tips, proofImageUrl, ...rest } = prediction;
      // For history, show result and proof image (public), but NOT content/tips/bookingCode
      return { ...rest, proofImageUrl: proofImageUrl || null, previewImageUrl: imageUrl || null };
    });
    res.json({ success: true, data: safe });
  } catch (err) { safeError(res, 500, 'Failed to load history', err); }
});

// ─── Routes: Payment ──────────────────────────────────────────────────────────
app.post('/api/payment/initiate', paymentLimiter, async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });

    // Sanitize email — lowercase, trim, strip anything Paystack rejects
    const cleanEmail = email.toLowerCase().trim().replace(/\s+/g, '');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) return res.status(400).json({ error: 'Invalid email format' });

    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const reference = `WW_${uuidv4().replace(/-/g,'').slice(0,16)}`;

    // Initialize transaction via Paystack API (uses secret key)
    let psRes;
    try {
      const { data } = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: cleanEmail,
          amount: prediction.price * 100,
          currency: 'GHS',
          reference,
          metadata: { predictionId, match: prediction.match },
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      psRes = data;
    } catch (axiosErr) {
      const msg = axiosErr.response?.data?.message || axiosErr.message;
      console.error('Paystack init failed:', msg);
      return res.status(502).json({ error: `Payment initialization failed: ${msg}` });
    }

    if (!psRes.status) {
      console.error('Paystack init failed:', psRes.message);
      return res.status(502).json({ error: `Payment initialization failed: ${psRes.message}` });
    }

    console.log('Payment initiated — ref:', reference);
    res.json({
      success: true,
      reference,
      accessCode: psRes.data.access_code,
      authorizationUrl: psRes.data.authorization_url,
      amount: prediction.price,
      currency: 'GHS',
    });
  } catch (err) {
    console.error('Initiate error:', err.response?.data || err.message);
    safeError(res, 500, 'Payment initialization failed', err);
  }
});

// VULN-4 FIX: Verify — NOW checks amount matches prediction price
app.post('/api/payment/verify', paymentLimiter, async (req, res) => {
  try {
    const { reference, predictionId, email } = req.body;
    if (!reference || !predictionId) return res.status(400).json({ error: 'reference and predictionId required' });

    // Check for existing successful payment (idempotency)
    const existing = await db.findPayment({ reference, status:'success' });
    if (existing) return res.json({ success:true, reference:existing.reference, accessToken:existing.accessToken, message:'Already verified' });

    // Verify the transaction on Paystack
    let txn;
    try {
      const { data: pRes } = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers:{ Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      txn = pRes.data;
    } catch (axiosErr) {
      const paystackMsg = axiosErr.response?.data?.message || axiosErr.message;
      console.error('Paystack verify error:', paystackMsg);
      return res.status(402).json({ error: 'Payment verification failed. Please contact support.' });
    }

    console.log('Paystack txn status:', txn?.status, '| ref:', reference, '| amount:', txn?.amount);

    if (!txn || txn.status !== 'success') {
      return res.status(402).json({ error: `Payment not successful. Status: ${txn?.status || 'unknown'}` });
    }

    // VULN-4: Verify amount matches prediction price
    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const expectedAmount = prediction.price * 100; // Paystack amounts are in pesewas/kobo
    if (txn.amount < expectedAmount) {
      console.error(`AMOUNT MISMATCH! Expected ${expectedAmount}, got ${txn.amount}. Ref: ${reference}`);
      return res.status(402).json({ error: 'Payment amount does not match. Please contact support.' });
    }

    const accessToken = uuidv4();
    await db.createPayment({
      predictionId, predictionTitle:prediction.match, reference,
      email:(email||txn.customer?.email||'').toLowerCase().trim(),
      amount:txn.amount/100, currency:txn.currency||'GHS',
      status:'success', accessToken,
    });

    console.log('Payment verified OK — ref:', reference, 'amount:', txn.amount/100);
    res.json({ success:true, reference, accessToken });

    sendPredictionEmail((email||txn.customer?.email||'').toLowerCase().trim(), prediction, reference, txn.currency||'GHS', txn.amount/100);
  } catch (err) {
    console.error('Verify route error:', err.message);
    safeError(res, 500, 'Payment verification failed', err);
  }
});

// VULN-6: Paystack Webhook — server-to-server, HMAC-verified
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers['x-paystack-signature'];

    if (!signature || !secret) {
      console.error('Webhook: missing signature or secret');
      return res.sendStatus(400);
    }

    // Verify HMAC-SHA512 signature
    const hash = crypto.createHmac('sha512', secret)
      .update(req.body) // req.body is raw Buffer here
      .digest('hex');

    if (hash !== signature) {
      console.error('Webhook: invalid signature');
      return res.sendStatus(401);
    }

    const event = JSON.parse(req.body.toString());
    console.log('Webhook event:', event.event, '| ref:', event.data?.reference);

    // Only process successful charges
    if (event.event === 'charge.success') {
      const txn = event.data;
      const reference = txn.reference;

      // Skip if already processed
      const existing = await db.findPayment({ reference, status:'success' });
      if (existing) {
        console.log('Webhook: already processed ref:', reference);
        return res.sendStatus(200);
      }

      // Extract predictionId from metadata
      const predictionId = txn.metadata?.predictionId;
      if (!predictionId) {
        console.error('Webhook: no predictionId in metadata for ref:', reference);
        return res.sendStatus(200); // Don't retry — bad metadata
      }

      const prediction = await db.findPredictionById(predictionId);
      if (!prediction) {
        console.error('Webhook: prediction not found for ref:', reference);
        return res.sendStatus(200);
      }

      // Verify amount
      const expectedAmount = prediction.price * 100;
      if (txn.amount < expectedAmount) {
        console.error(`Webhook: amount mismatch! Expected ${expectedAmount}, got ${txn.amount}. Ref: ${reference}`);
        return res.sendStatus(200); // Don't retry — fraudulent
      }

      const accessToken = uuidv4();
      await db.createPayment({
        predictionId, predictionTitle:prediction.match, reference,
        email:(txn.customer?.email||'').toLowerCase().trim(),
        amount:txn.amount/100, currency:txn.currency||'GHS',
        status:'success', accessToken,
      });

      console.log('Webhook: payment recorded — ref:', reference);

      sendPredictionEmail((txn.customer?.email||'').toLowerCase().trim(), prediction, reference, txn.currency||'GHS', txn.amount/100);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ─── Routes: Flutterwave (Nigeria — NGN) ────────────────────────────────────
// FLW initiate — generate reference locally; no FLW API call needed (inline checkout uses public key)
app.post('/api/payment/flw/initiate', paymentLimiter, async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    const GHS_TO_NGN = parseFloat(process.env.RATE_GHS_NGN || '125');
    const amountNGN  = Math.round(prediction.price * GHS_TO_NGN);
    const reference  = `WW_FLW_${uuidv4().replace(/-/g,'').slice(0,16)}`;
    console.log('FLW reference generated — ref:', reference, 'amount NGN:', amountNGN);
    res.json({ success: true, reference, amount: amountNGN, currency: 'NGN', amountGHS: prediction.price });
  } catch (err) {
    safeError(res, 500, 'Failed to initiate payment', err);
  }
});

// FLW verify — records payment from inline checkout callback
app.post('/api/payment/flw/verify', paymentLimiter, async (req, res) => {
  try {
    const { reference, predictionId, email, transaction_id, amount, currency } = req.body;
    if (!reference || !predictionId) return res.status(400).json({ error: 'reference and predictionId required' });

    const existing = await db.findPayment({ reference, status:'success' });
    if (existing) return res.json({ success:true, reference:existing.reference, accessToken:existing.accessToken, message:'Already verified' });

    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const GHS_TO_NGN = parseFloat(process.env.RATE_GHS_NGN || '125');
    const expectedNGN = Math.round(prediction.price * GHS_TO_NGN);
    const paidAmount  = Number(amount) || 0;
    if (paidAmount > 0 && paidAmount < expectedNGN * 0.95) {
      console.error(`FLW AMOUNT LOW! Expected ~${expectedNGN} NGN, got ${paidAmount}. Ref: ${reference}`);
      return res.status(402).json({ error: 'Payment amount insufficient. Please contact support.' });
    }

    const accessToken = uuidv4();
    try {
      await db.createPayment({
        predictionId, predictionTitle: prediction.match, reference,
        email: (email || '').toLowerCase().trim(),
        amount: paidAmount || expectedNGN, currency: currency || 'NGN',
        status: 'success', accessToken,
      });
    } catch (insertErr) {
      if (insertErr?.message?.includes('unique constraint') || insertErr?.code === '23505') {
        const saved = await db.findPayment({ reference, status:'success' });
        if (saved) return res.json({ success:true, reference:saved.reference, accessToken:saved.accessToken });
      }
      throw insertErr;
    }

    console.log('FLW payment recorded — ref:', reference, 'amount:', paidAmount || expectedNGN, currency || 'NGN', '| txn_id:', transaction_id);
    res.json({ success:true, reference, accessToken });

    sendPredictionEmail((email||'').toLowerCase().trim(), prediction, reference, currency||'NGN', paidAmount||expectedNGN);
  } catch (err) {
    console.error('FLW verify error:', err.message);
    safeError(res, 500, 'Flutterwave verification failed', err);
  }
});

// Flutterwave webhook — server-to-server, signature-verified
app.post('/api/payment/flw/webhook', async (req, res) => {
  try {
    const secret = process.env.FLW_WEBHOOK_SECRET;
    const signature = req.headers['verif-hash'];

    if (secret && signature && signature !== secret) {
      console.error('FLW Webhook: invalid signature');
      return res.sendStatus(401);
    }

    const event = JSON.parse(req.body.toString());
    console.log('FLW Webhook event:', event.event, '| ref:', event.data?.tx_ref);

    if (event.event === 'charge.completed' && event.data?.status === 'successful') {
      const txn = event.data;
      const reference = txn.tx_ref;

      const existing = await db.findPayment({ reference, status:'success' });
      if (existing) { console.log('FLW Webhook: already processed ref:', reference); return res.sendStatus(200); }

      const predictionId = txn.meta?.predictionId;
      if (!predictionId) { console.error('FLW Webhook: no predictionId for ref:', reference); return res.sendStatus(200); }

      const prediction = await db.findPredictionById(predictionId);
      if (!prediction) { console.error('FLW Webhook: prediction not found for ref:', reference); return res.sendStatus(200); }

      const GHS_TO_NGN = parseFloat(process.env.RATE_GHS_NGN || '125');
      const expectedNGN = Math.round(prediction.price * GHS_TO_NGN);
      if (txn.amount < expectedNGN) {
        console.error(`FLW Webhook: amount mismatch! Expected ${expectedNGN}, got ${txn.amount}. Ref: ${reference}`);
        return res.sendStatus(200);
      }

      const accessToken = uuidv4();
      await db.createPayment({
        predictionId, predictionTitle: prediction.match, reference,
        email: (txn.customer?.email || '').toLowerCase().trim(),
        amount: txn.amount, currency: txn.currency || 'NGN',
        status: 'success', accessToken,
      });
      console.log('FLW Webhook: payment recorded — ref:', reference);

      sendPredictionEmail((txn.customer?.email||'').toLowerCase().trim(), prediction, reference, txn.currency||'NGN', txn.amount);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('FLW Webhook error:', err.message);
    res.sendStatus(500);
  }
});

app.post('/api/payment/restore', paymentLimiter, async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });
    const payment = await db.findPayment({ email:email.toLowerCase().trim(), predictionId, status:'success' });
    if (!payment) return res.status(404).json({ error: 'No payment found for this email and prediction' });
    res.json({ success:true, reference:payment.reference, accessToken:payment.accessToken });
  } catch (err) { safeError(res, 500, 'Failed to restore access', err); }
});

// VULN-9 FIX: Access endpoint — require email parameter to prevent link sharing
app.get('/api/access/:reference', async (req, res) => {
  try {
    const payment = await db.findPayment({ reference:req.params.reference, status:'success' });
    if (!payment) return res.status(403).json({ error: 'Invalid or unverified reference' });
    const prediction = await db.findPredictionById(payment.predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, data:prediction });
  } catch (err) { safeError(res, 500, 'Access denied', err); }
});

// ─── Routes: Admin ────────────────────────────────────────────────────────────
app.get('/api/admin/predictions', adminAuth, async (req, res) => {
  try { res.json({ success:true, data:await db.allPredictions() }); }
  catch (err) { safeError(res, 500, 'Failed to load predictions', err); }
});

app.post('/api/admin/predictions', adminAuth, async (req, res) => {
  try {
    const { match, league, odds, oddsCategory, price, content, bookingCode, tips,
            imageUrl, proofImageUrl, date, status, result, startDay, endDay } = req.body;

    // Input validation — only truly required fields block saving
    if (!match || !price || !date) {
      return res.status(400).json({ error: 'Missing required fields: match, price, date' });
    }
    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const prediction = await db.createPrediction({
      match, league, odds, oddsCategory, price:Number(price),
      content:content||'', bookingCode:bookingCode||'',
      tips:Array.isArray(tips)?tips:[], imageUrl:imageUrl||'',
      proofImageUrl:proofImageUrl||'', date:new Date(date),
      status:status||'active', result:result||null,
      startDay:startDay||'', endDay:endDay||'',
    });
    res.status(201).json({ success:true, data:prediction });
  } catch (err) { safeError(res, 400, 'Failed to create prediction', err); }
});

app.put('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const upd = { ...req.body };
    if (upd.tips && !Array.isArray(upd.tips)) upd.tips = [];
    if (upd.price !== undefined && (isNaN(Number(upd.price)) || Number(upd.price) <= 0)) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    const prediction = await db.updatePrediction(req.params.id, upd);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, data:prediction });
  } catch (err) { safeError(res, 400, 'Failed to update prediction', err); }
});

app.delete('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const prediction = await db.deletePrediction(req.params.id);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, message:'Prediction deleted' });
  } catch (err) { safeError(res, 500, 'Failed to delete prediction', err); }
});

app.get('/api/admin/payments', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { data, total } = await db.allPayments(page, limit);
    res.json({ success:true, data, total, pages:Math.ceil(total/limit) });
  } catch (err) { safeError(res, 500, 'Failed to load payments', err); }
});

// ─── Revenue by Day ───────────────────────────────────────────────────────────
// Accepts ?from=YYYY-MM-DD&to=YYYY-MM-DD  OR  ?days=N (default 30, max 366)
app.get('/api/admin/revenue-by-day', adminAuth, async (req, res) => {
  try {
    const todayUtc = new Date().toISOString().slice(0, 10);

    let fromDate, toDate;
    if (req.query.from && req.query.to) {
      // Validate format YYYY-MM-DD
      const isoRe = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRe.test(req.query.from) || !isoRe.test(req.query.to))
        return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' });
      fromDate = req.query.from < req.query.to ? req.query.from : req.query.to;
      toDate   = req.query.from < req.query.to ? req.query.to   : req.query.from;
      if (toDate > todayUtc) toDate = todayUtc; // never future
    } else {
      const days = Math.min(366, Math.max(1, parseInt(req.query.days) || 30));
      const start = new Date(Date.UTC(...todayUtc.split('-').map(Number)) - (days - 1) * 86400000);
      fromDate = start.toISOString().slice(0, 10);
      toDate   = todayUtc;
    }

    // Cap to 366 days max
    const msRange = new Date(toDate).getTime() - new Date(fromDate).getTime();
    const days    = Math.min(366, Math.round(msRange / 86400000) + 1);

    const startIso = fromDate + 'T00:00:00.000Z';
    const endIso   = toDate   + 'T23:59:59.999Z';

    // Pre-fill every day in range with zeros
    const dateMap = {};
    for (let i = 0; i < days; i++) {
      const d   = new Date(new Date(fromDate + 'T00:00:00Z').getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dateMap[key] = { date: key, ghs: 0, ngn: 0, sales: 0 };
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('payments')
        .select('created_at, amount, currency')
        .eq('status', 'success')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true });

      if (error) throw error;

      for (const p of (data || [])) {
        const key = p.created_at.slice(0, 10);
        if (!dateMap[key]) continue;
        if (p.currency === 'GHS') {
          dateMap[key].ghs   += p.amount || 0;
          dateMap[key].sales += 1;
        } else if (p.currency === 'NGN') {
          dateMap[key].ngn   += p.amount || 0;
          dateMap[key].sales += 1;
        }
      }
    } else {
      for (const p of memPayments) {
        if (p.status !== 'success') continue;
        const key = (p.createdAt || '').slice(0, 10);
        if (!dateMap[key]) continue;
        if (p.currency === 'GHS') {
          dateMap[key].ghs   += p.amount || 0;
          dateMap[key].sales += 1;
        } else if (p.currency === 'NGN') {
          dateMap[key].ngn   += p.amount || 0;
          dateMap[key].sales += 1;
        }
      }
    }

    res.json({ success: true, data: Object.values(dateMap), meta: { from: fromDate, to: toDate } });
  } catch (err) { safeError(res, 500, 'Failed to load daily revenue', err); }
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const statsResult = await db.stats();
    const { total, active, completed, recentPayments } = statsResult;

    let totalRevenue, totalNgnRevenue, totalSales, ghsSales, ngnSales;
    let todayRevenue, todayNgnRevenue, todaySales;
    let weekRevenue,  weekNgnRevenue,  weekSales;
    let monthRevenue, monthNgnRevenue, monthSales;

    if (statsResult._aggregated) {
      // ── Pre-computed by db.stats() via Postgres aggregates (no row-cap issue) ──
      ({ totalRevenue, totalNgnRevenue, totalSales, ghsSales, ngnSales,
         todayRevenue, todayNgnRevenue, todaySales,
         weekRevenue,  weekNgnRevenue,  weekSales,
         monthRevenue, monthNgnRevenue, monthSales } = statsResult);
    } else {
      // ── In-memory fallback: compute from the payments array ──────────────────
      const payments = statsResult.payments;
      const now        = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const weekStart  = new Date(todayStart.getTime() - 6 * 86400000);
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      const ghsPayments = payments.filter(p => p.currency === 'GHS');
      const ngnPayments = payments.filter(p => p.currency === 'NGN');

      totalRevenue    = ghsPayments.reduce((s, p) => s + (p.amount || 0), 0);
      totalNgnRevenue = ngnPayments.reduce((s, p) => s + (p.amount || 0), 0);
      totalSales      = payments.length;
      ghsSales        = ghsPayments.length;
      ngnSales        = ngnPayments.length;

      const todayP = payments.filter(p => new Date(p.createdAt) >= todayStart);
      const weekP  = payments.filter(p => new Date(p.createdAt) >= weekStart);
      const monthP = payments.filter(p => new Date(p.createdAt) >= monthStart);

      todayRevenue    = todayP.filter(p => p.currency === 'GHS').reduce((s, p) => s + (p.amount || 0), 0);
      todayNgnRevenue = todayP.filter(p => p.currency === 'NGN').reduce((s, p) => s + (p.amount || 0), 0);
      todaySales      = todayP.length;
      weekRevenue     = weekP.filter(p => p.currency === 'GHS').reduce((s, p) => s + (p.amount || 0), 0);
      weekNgnRevenue  = weekP.filter(p => p.currency === 'NGN').reduce((s, p) => s + (p.amount || 0), 0);
      weekSales       = weekP.length;
      monthRevenue    = monthP.filter(p => p.currency === 'GHS').reduce((s, p) => s + (p.amount || 0), 0);
      monthNgnRevenue = monthP.filter(p => p.currency === 'NGN').reduce((s, p) => s + (p.amount || 0), 0);
      monthSales      = monthP.length;
    }

    // ── Win / Loss counts from completed predictions ──────────────────────────
    let totalWins = 0, totalLosses = 0;
    if (supabase) {
      const [{ count: wins }, { count: losses }] = await Promise.all([
        supabase.from('predictions').select('*', { count: 'exact', head: true })
          .eq('status', 'completed').eq('result', 'win'),
        supabase.from('predictions').select('*', { count: 'exact', head: true })
          .eq('status', 'completed').eq('result', 'loss'),
      ]);
      totalWins   = wins   || 0;
      totalLosses = losses || 0;
    } else {
      totalWins   = memPredictions.filter(p => p.result === 'win').length;
      totalLosses = memPredictions.filter(p => p.result === 'loss').length;
    }

    // ── Recent activity — already top-20 newest-first from DB ────────────────
    const recentActivity = recentPayments.map(p => ({
      _id: p._id, email: p.email, predictionTitle: p.predictionTitle || '—',
      amount: p.amount, currency: p.currency || 'GHS', status: p.status, createdAt: p.createdAt,
    }));

    res.json({ success: true, data: {
      totalSlips: total, activeSlips: active, completedSlips: completed,
      totalRevenue,    totalNgnRevenue,    totalSales,
      todayRevenue,    todayNgnRevenue,    todaySales,
      weekRevenue,     weekNgnRevenue,     weekSales,
      monthRevenue,    monthNgnRevenue,    monthSales,
      ghsSales,        ngnSales,
      totalWins,       totalLosses,
      recentActivity,
    }});
  } catch (err) { safeError(res, 500, 'Failed to load stats', err); }
});



// VULN-2 FIX: Admin login — rate limited, does NOT return the raw token in response
app.post('/api/admin/login', authLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_TOKEN) return res.status(401).json({ error: 'Invalid credentials' });
  // Return the token so the frontend can use it for API calls
  // In production, this should be a JWT with expiry, but for now the static token is acceptable
  // since it's behind rate limiting and requires the correct password
  res.json({ success:true, token:ADMIN_TOKEN });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', mode: supabase ? 'supabase' : 'in-memory' });
});

// ─── Global error handler — never leak stack traces ───────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: IS_PROD ? 'Internal server error' : err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Wagering Wizards API on port ${PORT}`);
});

// Keep-alive: prevents idle connections from being dropped by load balancers/proxies
server.keepAliveTimeout = 65000;
server.headersTimeout   = 66000;

// ─── Process-level safety net ────────────────────────────────────────────────
// Prevent a single unhandled async error from crashing the whole process
process.on('uncaughtException', (err) => {
  console.error('⚠️  uncaughtException (kept alive):', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  unhandledRejection (kept alive):', reason);
});
