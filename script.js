const locations = {
    inside: { count: 0 },
    outside: { count: 0 }
};

const themeButton = document.getElementById('theme-button');
const refreshButton = document.getElementById('refresh-button');
const connectionStatus = document.getElementById('connection-status');
const lastSyncTime = document.getElementById('last-sync-time');

// === ISIKAN URL GOOGLE APPS SCRIPT ANDA DI SINI ===
// Pastikan menambahkan ?action=read di ujung URL-nya
const DATA_ENDPOINT = 'https://script.google.com/macros/s/AKfycbygvbljSFKTB1EwZBVWT56zuMbygk2ve4zwQmL4XZ7Hc-__KSeuPA14Pgz9dsZcqfBY/exec?action=read';

const POLL_INTERVAL = 10000; // Cek data baru dari Google Sheets setiap 10 detik

let latestInsideTime = '';
let latestOutsideTime = '';

function setSyncStatus(label, now = new Date()) {
    connectionStatus.textContent = label;
    lastSyncTime.textContent = now.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function addReading(location, values = {}) {
    const state = locations[location];
    const temperature = values.temperature == null ? 0 : Number(values.temperature);
    const humidity = values.humidity == null ? 0 : Number(values.humidity);
    const readingTime = values.timestamp ? new Date(values.timestamp) : new Date();
    const list = document.getElementById(location + '-recent-list');

    // Update Kartu Utama (Angka Suhu & Kelembapan)
    document.getElementById(location + '-temperature-value').textContent =
        temperature.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    document.getElementById(location + '-humidity-value').textContent = humidity.toLocaleString('id-ID');

    // Update Keterangan Status
    document.getElementById(location + '-temperature-status').textContent =
        temperature < 25 ? 'Terasa lebih sejuk' : temperature > 29 ? 'Terasa lebih hangat' : 'Dalam rentang nyaman';
    document.getElementById(location + '-humidity-status').textContent =
        humidity < 50 ? 'Udara relatif kering' : humidity > 70 ? 'Udara relatif lembap' : 'Kelembapan sedang';

    // Reset list jika data pada tampilan sudah 12 baris
    if (state.count >= 12) {
        list.replaceChildren();
        state.count = 0;
    }

    // Tambah Baris Riwayat (Recent)
    const row = document.getElementById('reading-template').content.firstElementChild.cloneNode(true);
    const time = row.querySelector('[data-template-id="recent-time"]');
    time.dateTime = readingTime.toISOString();
    time.textContent = readingTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    row.querySelector('[data-template-id="recent-date"]').textContent =
        readingTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    row.querySelector('[data-template-id="recent-temperature"]').textContent =
        temperature.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' °C';
    row.querySelector('[data-template-id="recent-humidity"]').textContent = humidity + ' %';
    
    list.prepend(row);
    state.count++;
    document.getElementById(location + '-recent-empty').hidden = true;
}

async function pollEndpoint() {
    if (!DATA_ENDPOINT || DATA_ENDPOINT.includes('PASTE_URL_WEB_APP_APPS_SCRIPT_ANDA_DI_SINI')) {
        setSyncStatus('Mode simulasi (URL belum diisi)');
        return;
    }

    try {
        const response = await fetch(DATA_ENDPOINT, { cache: 'no-store' });
        if (!response.ok) throw new Error('Endpoint tidak dapat diakses');
        
        const payload = await response.json();
        const data = payload.data || payload;

        // Update Dalam Ruangan jika data baru terdeteksi
        if (data.inside && data.inside.timestamp && data.inside.timestamp !== latestInsideTime) {
            latestInsideTime = data.inside.timestamp;
            addReading('inside', data.inside);
        }

        // Update Luar Ruangan jika data baru terdeteksi
        if (data.outside && data.outside.timestamp && data.outside.timestamp !== latestOutsideTime) {
            latestOutsideTime = data.outside.timestamp;
            addReading('outside', data.outside);
        }

        // Update Waktu Sinkronisasi Terakhir
        const updatedTime = document.getElementById('updated-time');
        const now = new Date();
        updatedTime.dateTime = now.toISOString();
        updatedTime.textContent = now.toLocaleString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        setSyncStatus('Terhubung ke Google Sheets', now);
    } catch (error) {
        console.error(error);
        setSyncStatus('Gagal mengambil data dari Google Sheets');
    }
}

// Fitur Mode Malam/Siang
themeButton.addEventListener('click', () => {
    const night = document.body.classList.toggle('night');
    document.getElementById('night-label').classList.toggle('hidden', night);
    document.getElementById('day-label').classList.toggle('hidden', !night);
    document.getElementById('night-icon').classList.toggle('hidden', night);
    document.getElementById('day-icon').classList.toggle('hidden', !night);
    themeButton.setAttribute('aria-pressed', String(night));
    themeButton.setAttribute('aria-label', night ? 'Aktifkan mode siang' : 'Aktifkan mode malam');
});

// Tombol Refresh Manual
refreshButton.addEventListener('click', () => {
    refreshButton.disabled = true;
    pollEndpoint();
    window.setTimeout(() => { refreshButton.disabled = false; }, 500);
});

// Inisialisasi
lucide.createIcons();
window.setTimeout(() => {
    document.getElementById('splash-screen').classList.add('is-hidden');
}, 850);

// Cek data saat pertama kali dibuka, lalu cek ulang setiap 10 detik
pollEndpoint();
window.setInterval(pollEndpoint, POLL_INTERVAL);