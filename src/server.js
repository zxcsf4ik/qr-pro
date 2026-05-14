require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const path = require("path");

const db = require("./db");

const app = express();
const SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: `http://localhost:${PORT}`, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Не авторизований" });
    }

    try {
        req.user = jwt.verify(authHeader.split(" ")[1], SECRET);
        next();
    } catch {
        res.status(401).json({ message: "Невірний токен" });
    }
};

app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || password?.length < 8) {
        return res.status(400).json({ message: "Некоректні дані" });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashed],
            (err) => {
                if (err) return res.status(400).json({ message: "Email вже використовується" });
                res.json({ message: "Акаунт успішно створено" });
            }
        );
    } catch (e) {
        res.status(500).json({ message: "Помилка сервера" });
    }
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
        if (err || result.length === 0) return res.status(400).json({ message: "Невірні дані" });

        const valid = await bcrypt.compare(password, result[0].password);
        if (!valid) return res.status(400).json({ message: "Невірний пароль" });

        const token = jwt.sign(
            { id: result[0].id, username: result[0].username },
            SECRET,
            { expiresIn: "30d" }
        );

        res.json({ token, username: result[0].username });
    });
});

app.post("/generate", async (req, res) => {
    const { text, color = "#000000" } = req.body;
    if (!text) return res.status(400).json({ message: "Введіть текст" });

    try {
        const qrImage = await QRCode.toDataURL(text, {
            color: { dark: color, light: "#ffffff" },
            width: 512,
            margin: 1
        });
        res.json({ qrImage });
    } catch (e) {
        res.status(500).json({ message: "Помилка генерації" });
    }
});

app.post("/save-qr", authMiddleware, (req, res) => {
    const { qr_text, qr_image } = req.body;
    db.query(
        "INSERT INTO qr_codes (user_id, qr_text, qr_image) VALUES (?, ?, ?)",
        [req.user.id, qr_text, qr_image],
        (err) => {
            if (err) return res.status(500).json({ message: "Помилка збереження" });
            res.json({ message: "Збережено" });
        }
    );
});

app.get("/my-qrs", authMiddleware, (req, res) => {
    db.query(
        "SELECT id, qr_text, qr_image, created_at FROM qr_codes WHERE user_id = ? ORDER BY created_at DESC",
        [req.user.id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Помилка бази" });
            res.json(result);
        }
    );
});

app.listen(PORT, () => {
    console.log(`QR Pro running -> http://localhost:${PORT}`);
});