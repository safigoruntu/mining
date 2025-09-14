const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- VERİTABANI SİMÜLASYONU ---
// Gerçek bir uygulamada, bu veriler MongoDB, PostgreSQL gibi bir veritabanında saklanmalıdır.
let users = {
    '123456789': { // Telegram ID'si anahtar olarak kullanılır
        username: 'testuser',
        email: 'test@example.com',
        telegramUser: 'testuser',
        totalPoints: 1250.5,
        isMining: false,
        miningEndTime: null,
        tasks: { telegram: true, x: false },
        referralMultiplier: 1.2
    }
};

// --- API ROTALARI (ENDPOINTS) ---

// Kullanıcı bilgilerini getir
app.get('/api/user/:telegramId', (req, res) => {
    const { telegramId } = req.params;
    const user = users[telegramId];

    if (user) {
        res.json({ success: true, user });
    } else {
        // Kullanıcı bulunamazsa, yeni bir kullanıcı taslağı oluşturup dönebiliriz.
        const newUser = {
            username: `user_${telegramId}`,
            email: '',
            telegramUser: `user_${telegramId}`, // Gerçek veri Telegram'dan alınmalı
            totalPoints: 0,
            isMining: false,
            miningEndTime: null,
            tasks: { telegram: false, x: false },
            referralMultiplier: 1.0
        };
        users[telegramId] = newUser;
        res.json({ success: true, user: newUser, isNew: true });
    }
});

// Kayıt/Giriş (Telegram'dan gelen bilgilerle kullanıcıyı günceller)
app.post('/api/auth', (req, res) => {
    const { telegramId, username, email } = req.body;
    if (!users[telegramId]) {
        users[telegramId] = {
            totalPoints: 0,
            isMining: false,
            miningEndTime: null,
            tasks: { telegram: false, x: false },
            referralMultiplier: 1.0
        };
    }
    users[telegramId].username = username;
    users[telegramId].email = email;
    users[telegramId].telegramUser = username; // Telegram username'ini de saklayalım

    res.json({ success: true, user: users[telegramId] });
});


// Mining işlemini başlat
app.post('/api/mining/start', (req, res) => {
    const { telegramId } = req.body;
    const user = users[telegramId];

    if (!user) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    if (user.isMining) {
        return res.status(400).json({ success: false, message: 'Zaten bir kazım işlemi devam ediyor.' });
    }
    
    const allTasksDone = Object.values(user.tasks).every(Boolean);
    if (!allTasksDone) {
        return res.status(400).json({ success: false, message: 'Lütfen önce tüm görevleri tamamlayın.' });
    }

    user.isMining = true;
    user.miningEndTime = Date.now() + 24 * 60 * 60 * 1000; // 24 saat ekle

    // Puanları sunucu tarafında periyodik olarak güncellemek daha doğrudur,
    // ancak şimdilik sadece başlangıç ve bitiş zamanını saklıyoruz.
    // Puanlar, kullanıcı uygulamayı bir sonraki açtığında geçen süreye göre hesaplanabilir.

    res.json({ success: true, user });
});

// Görevi tamamla
app.post('/api/tasks/complete', (req, res) => {
    const { telegramId, taskKey } = req.body; // taskKey: 'telegram' veya 'x'
    const user = users[telegramId];

    if (!user || !user.tasks.hasOwnProperty(taskKey)) {
        return res.status(404).json({ success: false, message: 'Geçersiz kullanıcı veya görev.' });
    }

    user.tasks[taskKey] = true;
    res.json({ success: true, user });
});

// Airdrop talep et
app.post('/api/airdrop/claim', (req, res) => {
    const { telegramId, cost, walletAddress } = req.body;
    const user = users[telegramId];

    if (!user) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    if (user.totalPoints < cost) {
        return res.status(400).json({ success: false, message: 'Yetersiz puan.' });
    }

    // Gerçek cüzdana gönderim işlemi burada tetiklenir. (örn: bir smart contract ile etkileşim)
    console.log(`CÜZDANA GÖNDERİM: ${walletAddress} adresine ${cost} puanlık airdrop gönderiliyor.`);
    
    user.totalPoints -= cost;

    res.json({ success: true, user });
});


// Sunucuyu başlat
app.listen(port, () => {
    console.log(`Backend sunucusu http://localhost:${port} adresinde çalışıyor.`);
});


// Madenciliği başlat
app.post('/api/mining/start', (req, res) => {
    const { telegramId } = req.body;
    const user = users[telegramId];

    if (!user) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    user.isMining = true;
    // Mining başlangıç zamanını kaydedin, bu sayede ne kadar kazandığını hesaplayabilirsiniz.
    user.miningStartTime = new Date(); 

    res.json({ success: true, user });
});

// Madenciliği durdur
app.post('/api/mining/stop', (req, res) => {
    const { telegramId } = req.body;
    const user = users[telegramId];

    if (!user) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    if (!user.isMining) {
        return res.status(400).json({ success: false, message: 'Madencilik zaten durdurulmuş.' });
    }

    // Kazılan puanı hesaplayın
    const timeElapsedInMinutes = (new Date() - new Date(user.miningStartTime)) / (1000 * 60);
    const pointsGained = timeElapsedInMinutes * 1; // Her dakika için 1 puan kazandığını varsayalım
    user.totalPoints += pointsGained;
    user.isMining = false;
    user.miningStartTime = null;

    res.json({ success: true, pointsGained });
});
