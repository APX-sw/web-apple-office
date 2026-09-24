// @ts-nocheck
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'apple_office_super_secret_key_2026';
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no está definido: se usa el valor por defecto del repo (público). Definilo en el .env del servidor.');
}

// Duración de la sesión del admin. El front cierra la sesión solo al vencer.
const TOKEN_EXPIRES_IN = '30d';

// Hora de Argentina calculada en el SERVIDOR: no depende del reloj ni de la zona horaria del
// celular del cliente (que puede estar desajustado) ni de la zona del servidor.
const AR_DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
function formatArgentinaTime(date: Date): string {
    const p: Record<string, string> = {};
    for (const part of AR_DATE_FORMAT.formatToParts(date)) p[part.type] = part.value;
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

// Código corto que identifica la tabla de precios vigente (dólar, stock, canje, tarjetas y planes).
// Cambia si y solo si cambia algún precio: sirve para saber si una cotización quedó vieja.
function computePricesVersion(dollar_value: number, stock: any[], tradeIn: any[], cards: any[], plans: any[]): string {
    const payload = JSON.stringify([
        dollar_value,
        stock.map(s => [s.model, s.capacity_gb, s.battery_status, s.price_usd]),
        tradeIn.map(t => [t.model, t.capacity_gb, t.battery_range, t.price_usd]),
        cards.map(c => [c.card_name, c.base_factor]),
        plans.map(p => [p.card_name, p.installments, p.surcharge_coefficient])
    ]);
    return crypto.createHash('sha1').update(payload).digest('hex').slice(0, 8).toUpperCase();
}

// Identifica qué versión del código está corriendo (ver GET /api/health).
const BUILD_ID = '2026-09-24-sesion-y-precios';
const BOOTED_AT = new Date().toISOString();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage });

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
// Los nombres de archivo llevan Date.now(), así que nunca se reutilizan: se pueden cachear.
app.use('/uploads', express.static(uploadDir, { maxAge: '30d' }));

// Health check: sin DB ni auth. Permite confirmar con un curl qué código está corriendo.
app.get('/api/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok', build_id: BUILD_ID, booted_at: BOOTED_AT, node: process.version });
});

// Main loader for Frontend (Simulator uses this instantly)
app.get('/api/data', async (req, res) => {
    try {
        // Precios y cotización: nunca deben servirse desde una caché (navegador, proxy o CDN).
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');

        // 🔹 Ejecutar queries por separado para detectar cuál rompe
        const configs = await prisma.config.findMany();
        const models = await prisma.baseModel.findMany();
        const capacities = await prisma.baseCapacity.findMany();
        const batteries = await prisma.baseBattery.findMany();
        // Con orden determinístico: si alguna vez hubiera dos filas para la misma combinación,
        // el simulador y el admin ven siempre la misma primero.
        const iphoneStock = await prisma.iphoneStock.findMany({
            orderBy: [{ model: 'asc' }, { capacity_gb: 'asc' }, { battery_status: 'asc' }, { id: 'asc' }]
        });
        const tradeInPrices = await prisma.tradeInPrice.findMany({
            orderBy: [{ model: 'asc' }, { capacity_gb: 'asc' }, { battery_range: 'asc' }, { id: 'asc' }]
        });
        const cards = await prisma.financingCard.findMany({ orderBy: { card_name: 'asc' } });
        const plans = await prisma.financingPlan.findMany({
            orderBy: [{ card_name: 'asc' }, { installments: 'asc' }, { id: 'asc' }]
        });
        const landingIphones = await prisma.landingIphone.findMany({
            orderBy: { order_index: 'asc' }
        });
        const landingAccessories = await prisma.landingAccessory.findMany({
            orderBy: { order_index: 'asc' }
        });
        let faqs: any[] = [];
        try {
            faqs = await prisma.faq.findMany({ orderBy: { order: 'asc' } });
        } catch (e) {
            console.error("❌ Error faqs:", e);
        }

        let gallery: any[] = [];

        let storeGallery: any[] = [];

        try {
            gallery = await prisma.clientGallery.findMany({
                orderBy: { created_at: 'desc' }
            });
        } catch (e) {
            console.error("❌ Error gallery:", e);
        }

        try {
            storeGallery = await prisma.storeGallery.findMany({
                orderBy: { created_at: 'desc' }
            });
        } catch (e) {
            console.error("❌ Error storeGallery:", e);
        }

        // 🔹 Config dólar
        const dollarValConfig = configs.find(c => c.key === 'dollar_value');
        // Si el valor guardado no es un número válido (ej. "undefined"), no dejamos que
        // NaN contamine todos los precios en pesos.
        const parsedDollar = Number(dollarValConfig?.value);
        const dollar_value = Number.isFinite(parsedDollar) && parsedDollar > 0 ? parsedDollar : 1000;

        // 🔹 Feature cards (PROTEGIDO)
        const defaultFeatureCards = [
            { icon: 'Package', title: 'Equipos Nuevos', desc: 'Sellados en caja, directo de fábrica.' },
            { icon: 'ShieldCheck', title: 'Garantía Oficial', desc: '12 meses de garantía Apple.' },
            { icon: 'RefreshCw', title: 'Plan Canje', desc: 'Dejá tu equipo como parte de pago.' },
            { icon: 'MessageCircleHeart', title: 'Atención Premium', desc: 'Te guiamos en todo el proceso.' }
        ];

        let feature_cards = defaultFeatureCards;

        const featureCardsConfig = configs.find(c => c.key === 'feature_cards');

        if (featureCardsConfig && featureCardsConfig.value) {
            try {
                feature_cards = JSON.parse(featureCardsConfig.value);
            } catch (e) {
                console.error("❌ Error parsing feature_cards:", featureCardsConfig.value);
                feature_cards = defaultFeatureCards;
            }
        }

        // 🔹 RESPUESTA FINAL
        const now = new Date();
        res.json({
            config: { dollar_value },
            // Metadatos de la cotización: el front los incluye en el mensaje de WhatsApp.
            meta: {
                server_time_iso: now.toISOString(),
                quoted_at_ar: formatArgentinaTime(now),
                dollar_value,
                prices_version: computePricesVersion(dollar_value, iphoneStock, tradeInPrices, cards, plans),
                valid_hours: 24
            },
            feature_cards,
            models: models.map((m: any) => m.name),
            capacities: capacities.map((c: any) => c.size),
            batteries: batteries.map((b: any) => b.status),
            iphoneStock,
            tradeInPrices,
            cards,
            plans,
            gallery,
            storeGallery,
            landingIphones,
            landingAccessories,
            faqs
        });


    } catch (err) {
        console.error("🔥 ERROR GENERAL /api/data:", err);
        res.status(500).json({ error: 'Failed fetching data' });
    }
});


// Authentication Middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;

    if (!token) {
        res.status(401).json({ error: 'Acceso Denegado' });
        return;
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            res.status(403).json({ error: 'Token Inválido' });
            return;
        }
        (req as any).user = user;
        next();
    });
};

// Login Endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
        res.json({ token, username: user.username });
    } catch (e) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// User Management Endpoints
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const users = await prisma.user.findMany({ select: { id: true, username: true } });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    const { username, password } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { username, password: passwordHash }
        });
        res.json({ id: newUser.id, username: newUser.username });
    } catch (e) {
        res.status(400).json({ error: 'El usuario ya existe o hubo un error' });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// Update Config
app.post('/api/config', authenticateToken, async (req, res) => {
    const value = Number(req.body?.dollar_value);
    // Un dólar en 0, negativo o no numérico rompe todos los precios en pesos del sitio.
    if (!Number.isFinite(value) || value <= 0 || value > 100000) {
        return res.status(400).json({ error: 'Valor de dólar inválido' });
    }
    try {
        await prisma.config.upsert({
            where: { key: 'dollar_value' },
            update: { value: String(value) },
            create: { key: 'dollar_value', value: String(value) }
        });
        res.json({ success: true, dollar_value: value });
    } catch (e) {
        console.error("Error saving dollar:", e);
        res.status(500).json({ error: 'No se pudo guardar la cotización' });
    }
});

// Save feature cards
app.post('/api/feature-cards', authenticateToken, async (req, res) => {
    const { feature_cards } = req.body;
    try {
        await prisma.config.upsert({
            where: { key: 'feature_cards' },
            update: { value: JSON.stringify(feature_cards) },
            create: { key: 'feature_cards', value: JSON.stringify(feature_cards) }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error saving feature cards' });
    }
});

// Base Entities Add
app.post('/api/base/:entity', authenticateToken, async (req, res) => {
    const { entity } = req.params;
    const { value } = req.body;

    try {
        if (entity === 'model') await prisma.baseModel.create({ data: { name: value } });
        if (entity === 'capacity') await prisma.baseCapacity.create({ data: { size: Number(value) } });
        if (entity === 'battery') await prisma.baseBattery.create({ data: { status: value } });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: 'Could not create or already exists' });
    }
});

// Base Entities Delete
app.delete('/api/base/:entity', authenticateToken, async (req, res) => {
    const { entity } = req.params;
    const { value } = req.body;
    try {
        if (entity === 'model') await prisma.baseModel.delete({ where: { name: value } });
        if (entity === 'capacity') await prisma.baseCapacity.delete({ where: { size: Number(value) } });
        if (entity === 'battery') await prisma.baseBattery.delete({ where: { status: value } });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: 'Failed deletion' });
    }
});


app.post('/api/stock', authenticateToken, async (req, res) => {
    try {
        const { model, capacity_gb, battery_status, price_usd } = req.body;
        await prisma.iphoneStock.create({ 
            data: {
                model,
                capacity_gb: Number(capacity_gb),
                battery_status,
                price_usd: Number(price_usd)
            } 
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create stock' });
    }
});
app.put('/api/stock/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { model, capacity_gb, battery_status, price_usd } = req.body;
        await prisma.iphoneStock.update({
            where: { id },
            data: {
                model,
                capacity_gb: Number(capacity_gb),
                battery_status,
                price_usd: Number(price_usd)
            }
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Error updating stock:", e);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});
app.delete('/api/stock/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.iphoneStock.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting stock:', e);
        res.status(500).json({ error: 'No se pudo eliminar' });
    }
});

// Trade-In CRUD
app.post('/api/tradein', authenticateToken, async (req, res) => {
    try {
        const { model, capacity_gb, battery_range, price_usd } = req.body;
        await prisma.tradeInPrice.create({ 
            data: { model, capacity_gb: Number(capacity_gb), battery_range, price_usd: Number(price_usd) } 
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});
app.put('/api/tradein/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { model, capacity_gb, battery_range, price_usd } = req.body;
        await prisma.tradeInPrice.update({
            where: { id },
            data: {
                model,
                capacity_gb: Number(capacity_gb),
                battery_range,
                price_usd: Number(price_usd)
            }
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Error updating tradein:", e);
        res.status(500).json({ error: 'Failed to update tradein' });
    }
});
app.delete('/api/tradein/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.tradeInPrice.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting tradein:', e);
        res.status(500).json({ error: 'No se pudo eliminar' });
    }
});

// Financing Options
app.post('/api/cards', authenticateToken, async (req, res) => {
    try {
        const { card_name, base_factor } = req.body;
        await prisma.financingCard.create({ data: { card_name, base_factor: Number(base_factor) } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});
app.delete('/api/cards/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.financingCard.delete({ where: { card_name: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting cards:', e);
        res.status(500).json({ error: 'No se pudo eliminar' });
    }
});
app.put('/api/cards/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.financingCard.update({
            where: { card_name: req.params.id },
            data: {
                base_factor: Number(req.body.base_factor)
            }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update card' });
    }
});

app.post('/api/plans', authenticateToken, async (req, res) => {
    try {
        const { card_name, installments, surcharge_coefficient } = req.body;
        await prisma.financingPlan.create({ 
            data: { 
                card_name, 
                installments: Number(installments), 
                surcharge_coefficient: Number(surcharge_coefficient) 
            } 
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});
app.delete('/api/plans/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.financingPlan.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting plans:', e);
        res.status(500).json({ error: 'No se pudo eliminar' });
    }
});
app.put('/api/plans/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.financingPlan.update({
            where: { id: req.params.id },
            data: {
                installments: Number(req.body.installments),
                surcharge_coefficient: Number(req.body.surcharge_coefficient)
            }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

// Gallery CRUD
app.get('/api/gallery', async (req, res) => {
    const gallery = await prisma.clientGallery.findMany({ orderBy: { created_at: 'desc' } });
    res.json(gallery);
});

app.post('/api/gallery', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { description } = req.body;
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

        const imageUrl = `/uploads/${req.file.filename}`;
        const newEntry = await prisma.clientGallery.create({
            data: {
                image_url: imageUrl,
                description
            }
        });
        res.json(newEntry);
    } catch (e) {
        res.status(500).json({ error: 'Failed to upload' });
    }
});

app.put('/api/gallery/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { description } = req.body;

        const existing = await prisma.clientGallery.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        let imageUrl = existing.image_url;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const updated = await prisma.clientGallery.update({
            where: { id },
            data: { image_url: imageUrl, description }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

app.delete('/api/gallery/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.clientGallery.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Store Gallery CRUD
app.post('/api/store-gallery', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { description } = req.body;
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
        const imageUrl = `/uploads/${req.file.filename}`;
        const newEntry = await prisma.storeGallery.create({
            data: { image_url: imageUrl, description }
        });
        res.json(newEntry);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/store-gallery/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.storeGallery.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting store-gallery:', e);
        res.status(500).json({ error: 'No se pudo eliminar' });
    }
});

// Landing Iphones CRUD
app.get('/api/landing-iphones', async (req, res) => {
    const list = await prisma.landingIphone.findMany({ orderBy: { order_index: 'asc' } });
    res.json(list);
});

app.post('/api/landing-iphones', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { name, price_string, order_index } = req.body;
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
        const imageUrl = `/uploads/${req.file.filename}`;
        const newEntry = await prisma.landingIphone.create({
            data: {
                name,
                price_string,
                image_url: imageUrl,
                order_index: Number(order_index) || 0
            }
        });
        res.json(newEntry);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.put('/api/landing-iphones/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price_string, order_index } = req.body;
        const existing = await prisma.landingIphone.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        let imageUrl = existing.image_url;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const updated = await prisma.landingIphone.update({
            where: { id },
            data: {
                name,
                price_string,
                image_url: imageUrl,
                order_index: Number(order_index) || 0
            }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/landing-iphones/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.landingIphone.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting landing-iphones:', e);
        res.status(500).json({ error: 'No se pudo eliminar' });
    }
});

// Landing Accessories CRUD
app.get('/api/landing-accessories', async (req, res) => {
    const list = await prisma.landingAccessory.findMany({ orderBy: { order_index: 'asc' } });
    res.json(list);
});

app.post('/api/landing-accessories', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { name, price_string, order_index } = req.body;
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
        const imageUrl = `/uploads/${req.file.filename}`;
        const newEntry = await prisma.landingAccessory.create({
            data: {
                name,
                price_string,
                image_url: imageUrl,
                order_index: Number(order_index) || 0
            }
        });
        res.json(newEntry);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.put('/api/landing-accessories/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price_string, order_index } = req.body;
        const existing = await prisma.landingAccessory.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Not found' });

        let imageUrl = existing.image_url;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const updated = await prisma.landingAccessory.update({
            where: { id },
            data: {
                name,
                price_string,
                image_url: imageUrl,
                order_index: Number(order_index) || 0
            }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/landing-accessories/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.landingAccessory.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        console.error('Error deleting landing-accessories:', e);
        res.status(500).json({ error: 'No se pudo eliminar' });
    }
});

// FAQ CRUD
app.get('/api/faqs', async (req, res) => {
    const list = await prisma.faq.findMany({ orderBy: { order: 'asc' } });
    res.json(list);
});

app.post('/api/faqs', authenticateToken, async (req, res) => {
    try {
        const { question, answer, order } = req.body;
        const newEntry = await prisma.faq.create({
            data: { question, answer, order: Number(order) || 0 }
        });
        res.json(newEntry);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.put('/api/faqs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer, order } = req.body;
        const updated = await prisma.faq.update({
            where: { id },
            data: { question, answer, order: Number(order) || 0 }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/faqs/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.faq.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Backend Server running intensely on http://localhost:${PORT}`);
});
