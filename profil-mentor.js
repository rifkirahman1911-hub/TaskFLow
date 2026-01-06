document.addEventListener('DOMContentLoaded', function() {
    // Ambil data sesi dari localStorage
    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));

    if (userSession) {
        // Jika ada sesi, tampilkan datanya
        
        // --- TAMBAHAN BARU ---
        document.getElementById('mentor-nama').textContent = userSession.nama;
        // --- AKHIR TAMBAHAN ---
        
        document.getElementById('mentor-email').textContent = userSession.email;
        document.getElementById('mentor-peran').textContent = userSession.peran;
        document.getElementById('mentor-divisi').textContent = userSession.divisi;
    } else {
        // Jika tidak ada sesi (belum login), data tidak akan tampil
        // (global.js akan mengurus redirect-nya)
        console.log("Tidak ada sesi ditemukan.");
    }
});