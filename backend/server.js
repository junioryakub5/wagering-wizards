require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const axios      = require('axios');
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const Prediction = require('./models/Prediction');
const Payment    = require('./models/Payment');

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));

// ─── Cloudinary ───────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder        : 'wagering-wizards',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation : [{ width: 1200, crop: 'limit', quality: 'auto' }],
  },
});
const upload = multer({ storage });

// ─── Admin auth middleware ─────────────────────────────────────────────────────
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB connection error:', err.message); process.exit(1); });

// ─── Routes: Image Upload ─────────────────────────────────────────────────────
// POST /api/upload  (admin only, returns { url })
app.post('/api/upload', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ success: true, url: req.file.path });
});

// ─── Routes: Public Predictions ───────────────────────────────────────────────
// GET /api/predictions  — active only, strips content, exposes blurred preview
app.get('/api/predictions', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'active' };
    if (category && category !== 'all') filter.oddsCategory = category;

    const raw = await Prediction.find(filter).sort({ date: 1 }).lean();

    // Strip actual content — expose imageUrl as previewImageUrl for blurred card
    const safe = raw.map(({ content, imageUrl, bookingCode, tips, proofImageUrl, ...rest }) => ({
      ...rest,
      previewImageUrl: imageUrl || null,
    }));

    res.json({ success: true, data: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/predictions/history  — completed, all fields public (result is known)
app.get('/api/predictions/history', async (req, res) => {
  try {
    const history = await Prediction.find({ status: 'completed' }).sort({ date: -1 }).lean();
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Routes: Payment ──────────────────────────────────────────────────────────
// POST /api/payment/initiate — create a Paystack payment link
app.post('/api/payment/initiate', async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });

    const prediction = await Prediction.findById(predictionId).lean();
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const reference = `WW_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount       : prediction.price * 100,  // kobo/pesewas
        currency     : 'GHS',
        reference,
        callback_url : `${process.env.CLIENT_URL}/unlock/${reference}`,
        metadata     : { predictionId: predictionId.toString(), predictionTitle: prediction.match },
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    res.json({
      success      : true,
      reference,
      authorization_url: paystackRes.data.data.authorization_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/verify — verify Paystack reference, create Payment record
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { reference, predictionId, email } = req.body;
    if (!reference || !predictionId) return res.status(400).json({ error: 'reference and predictionId required' });

    // Idempotency — already verified?
    const existing = await Payment.findOne({ reference, status: 'success' });
    if (existing) return res.json({ success: true, reference: existing.reference, accessToken: existing.accessToken, message: 'Already verified' });

    // Verify with Paystack
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const txn = paystackRes.data.data;
    if (!txn || txn.status !== 'success') return res.status(402).json({ error: 'Payment not successful on Paystack' });

    const prediction = await Prediction.findById(predictionId).lean();
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const accessToken = uuidv4();
    await Payment.create({
      predictionId,
      predictionTitle : prediction.match,
      reference,
      email           : email || txn.customer?.email || '',
      amount          : txn.amount / 100,
      currency        : txn.currency || 'GHS',
      status          : 'success',
      accessToken,
    });

    res.json({ success: true, reference, accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/restore — restore access by email + predictionId
app.post('/api/payment/restore', async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });

    const payment = await Payment.findOne({
      email     : email.toLowerCase().trim(),
      predictionId,
      status    : 'success',
    });

    if (!payment) return res.status(404).json({ error: 'No successful payment found for this email and prediction' });

    res.json({ success: true, reference: payment.reference, accessToken: payment.accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/access/:reference — return full prediction for a paid reference
app.get('/api/access/:reference', async (req, res) => {
  try {
    const payment = await Payment.findOne({ reference: req.params.reference, status: 'success' });
    if (!payment) return res.status(403).json({ error: 'Invalid or unverified reference' });

    const prediction = await Prediction.findById(payment.predictionId).lean();
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    res.json({ success: true, data: prediction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Routes: Admin ────────────────────────────────────────────────────────────
// GET /api/admin/predictions
app.get('/api/admin/predictions', adminAuth, async (req, res) => {
  try {
    const list = await Prediction.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: list });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/predictions
app.post('/api/admin/predictions', adminAuth, async (req, res) => {
  try {
    const { match, league, odds, oddsCategory, price, content, bookingCode, tips,
            imageUrl, proofImageUrl, date, status, result, startDay, endDay } = req.body;

    const prediction = await Prediction.create({
      match, league, odds, oddsCategory,
      price: Number(price),
      content: content || '',
      bookingCode: bookingCode || '',
      tips: Array.isArray(tips) ? tips : [],
      imageUrl: imageUrl || '',
      proofImageUrl: proofImageUrl || '',
      date: new Date(date),
      status: status || 'active',
      result: result || null,
      startDay: startDay || '',
      endDay: endDay || '',
    });

    res.status(201).json({ success: true, data: prediction });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT /api/admin/predictions/:id
app.put('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.date) updates.date = new Date(updates.date);
    if (updates.tips && !Array.isArray(updates.tips)) updates.tips = [];

    const prediction = await Prediction.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/admin/predictions/:id
app.delete('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const prediction = await Prediction.findByIdAndDelete(req.params.id);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success: true, message: 'Prediction deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/payments
app.get('/api/admin/payments', adminAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Payment.find({ status: 'success' }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments({ status: 'success' }),
    ]);

    res.json({ success: true, data, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/stats
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const [totalSlips, activeSlips, completedSlips, successPayments, recentActivity] = await Promise.all([
      Prediction.countDocuments(),
      Prediction.countDocuments({ status: 'active' }),
      Prediction.countDocuments({ status: 'completed' }),
      Payment.find({ status: 'success' }).lean(),
      Payment.find({ status: 'success' }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const totalRevenue = successPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalSales   = successPayments.length;

    res.json({
      success: true,
      data: {
        totalSlips, activeSlips, completedSlips,
        totalRevenue, totalSales,
        recentActivity: recentActivity.map(p => ({
          _id: p._id, email: p.email, predictionTitle: p.predictionTitle || '—',
          amount: p.amount, currency: p.currency || 'GHS', status: p.status,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ success: true, token: process.env.ADMIN_TOKEN });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Wagering Wizards API running on port ${PORT}`);
  console.log(`📦 Mode: MongoDB (${process.env.MONGO_URI ? 'configured' : 'MONGO_URI missing!'})`);
});
