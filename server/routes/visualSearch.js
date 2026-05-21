const router  = require('express').Router();
const multer  = require('multer');
const Groq    = require('groq-sdk');
const Product = require('../models/Product');
const auth    = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const rateLimitMap = new Map();
function checkRateLimit(userId) {
  const now   = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

router.post('/', auth, auth.retailerOnly, upload.single('image'), async (req, res) => {

  if (!checkRateLimit(req.user.id)) {
    return res.status(429).json({ msg: 'You have used all 10 photo searches for this hour. Try again later.' });
  }

  if (!req.file) {
    return res.status(400).json({ msg: 'No image uploaded.' });
  }

  let detectedProduct  = '';
  let detectedCategory = 'General';
  let confidence       = 'low';

  try {
    const groq        = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const base64Image = req.file.buffer.toString('base64');
    const mimeType    = req.file.mimetype;

    // ── Step 1: ask Groq to describe the image in plain text first ────────────
    const describeRes = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
          {
            type: 'text',
            text: 'What product or object is in this image? Reply in one short sentence only.',
          },
        ],
      }],
      max_tokens: 60,
      temperature: 0.1,
    });

    const description = describeRes.choices[0]?.message?.content?.trim() || '';
    console.log('Groq image description:', description);

    // ── Step 2: ask Groq to classify from the description (no image needed) ───
    if (description) {
      const classifyRes = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `A retail platform product search assistant in Malawi received this image description: "${description}"

Return ONLY a valid JSON object, no markdown, no explanation:
{"productName":"string","category":"string","confidence":"high|medium|low"}

Rules:
- productName: generic name a wholesaler would use (e.g. "Maize Flour", "Cooking Oil", "Smartphone", "Car", "Banana")
- Do NOT include brand names
- category: one of: Food & Grocery, Electronics, Agriculture, Household, Clothing, Beverages, Health & Beauty, General
- confidence: high if clearly a product, medium if likely a product, low if unclear`,
        }],
        max_tokens: 80,
        temperature: 0.1,
      });

      const raw     = classifyRes.choices[0]?.message?.content?.trim() || '';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      console.log('Groq classification raw:', cleaned);

      const parsed  = JSON.parse(cleaned);
      detectedProduct  = parsed.productName  || '';
      detectedCategory = parsed.category     || 'General';
      confidence       = parsed.confidence   || 'low';

      console.log('Detected:', detectedProduct, '| Category:', detectedCategory, '| Confidence:', confidence);
    }

  } catch (err) {
    console.error('Groq error:', err.message);
  }

  // ── Search the catalogue ────────────────────────────────────────────────────
  let products = [];

  if (detectedProduct) {
    try {
      // Try text index search first
      try {
        products = await Product.find({
          $text:    { $search: detectedProduct },
          isActive: true,
        })
          .populate('wholesaler', 'name businessName city')
          .sort({ score: { $meta: 'textScore' }, stock: -1 })
          .limit(20);
      } catch (textErr) {
        // text index may not exist yet — skip to regex
      }

      // Fallback: regex on name
      if (products.length === 0) {
        const words   = detectedProduct.split(' ').filter(Boolean);
        const regexes = words.map(w => new RegExp(w, 'i'));

        products = await Product.find({
          $or: [
            { name:        { $in: regexes } },
            { description: { $in: regexes } },
          ],
          isActive: true,
        })
          .populate('wholesaler', 'name businessName city')
          .sort({ stock: -1 })
          .limit(20);
      }

      // Last resort: match by category
      if (products.length === 0 && detectedCategory !== 'General') {
        products = await Product.find({ category: detectedCategory, isActive: true })
          .populate('wholesaler', 'name businessName city')
          .sort({ stock: -1 })
          .limit(20);
      }

      // Absolute last resort: return all products so the retailer sees something
      if (products.length === 0) {
        products = await Product.find({ isActive: true })
          .populate('wholesaler', 'name businessName city')
          .sort({ stock: -1 })
          .limit(20);
        // downgrade confidence so banner shows soft message
        confidence = 'low';
      }

    } catch (dbErr) {
      console.error('DB search error:', dbErr.message);
    }
  }

  res.json({ detectedProduct, category: detectedCategory, confidence, products });
});

module.exports = router;