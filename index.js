// Import library yang dibutuhkan
const express = require('express');
const cors = require('cors');

// Inisialisasi aplikasi Express
const app = express();
const port = process.env.PORT || 5000; // Gunakan port dari hosting atau 5000 jika lokal

// --- Middleware ---
// Mengaktifkan CORS agar bisa diakses dari Camunda
app.use(cors());
// Mengaktifkan body parser agar bisa membaca JSON dari request POST
app.use(express.json());

// --- DATABASE SIMULASI (Sama seperti di Python) ---
let database_karyawan = {
    "k001": { "nama": "Budi", "sisa_cuti": 12 },
    "k002": { "nama": "Ani", "sisa_cuti": 3 },
    "k003": { "nama": "Rahmat (Manajer)", "sisa_cuti": 10 }
};

// --- ENDPOINTS API ---

// Endpoint untuk cek kuota cuti (GET)
app.get('/cek-kuota', (req, res) => {
    const karyawan_id = req.query.karyawanId;
    console.log(`Menerima request GET /cek-kuota untuk karyawanId: ${karyawan_id}`);

    if (!karyawan_id) {
        return res.status(400).json({ error: "Parameter 'karyawanId' tidak ditemukan" });
    }

    const karyawan = database_karyawan[karyawan_id];

    if (karyawan) {
        console.log(`Data karyawan ditemukan:`, karyawan);
        return res.status(200).json({
            karyawan_id: karyawan_id,
            nama: karyawan.nama,
            sisa_cuti: karyawan.sisa_cuti
        });
    } else {
        console.error(`Karyawan dengan ID ${karyawan_id} tidak ditemukan`);
        return res.status(404).json({ error: "Karyawan tidak ditemukan" });
    }
});

// Endpoint untuk update database (POST)
app.post('/update-database', (req, res) => {
    const { karyawanId, jumlahHari } = req.body;
    console.log(`Menerima request POST /update-database dengan data:`, req.body);
    
    if (!karyawanId) {
        return res.status(400).json({ error: "'karyawanId' wajib ada di body" });
    }

    if (database_karyawan[karyawanId]) {
        const sisa_cuti_sebelum = database_karyawan[karyawanId].sisa_cuti;
        database_karyawan[karyawanId].sisa_cuti -= jumlahHari;
        const sisa_cuti_setelah = database_karyawan[karyawanId].sisa_cuti;

        console.log(`DATABASE UPDATE: ${karyawanId} - Sisa cuti sebelum: ${sisa_cuti_sebelum}, setelah: ${sisa_cuti_setelah}`);

        return res.status(200).json({
            status: "sukses",
            message: `Kuota cuti untuk ${karyawanId} berhasil diupdate.`,
            sisa_cuti_terbaru: sisa_cuti_setelah
        });
    } else {
        console.error(`Karyawan dengan ID ${karyawanId} tidak ditemukan`);
        return res.status(404).json({ error: "Karyawan tidak ditemukan" });
    }
});

// Endpoint root untuk cek status
app.get('/', (req, res) => {
    res.status(200).json({
        service: "Node.js Cuti API",
        status: "running",
        database: database_karyawan
    });
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});
