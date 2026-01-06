document.addEventListener('DOMContentLoaded', function() {
    
    const loginForm = document.getElementById('form-login');
    const peranSelect = document.getElementById('peran');
    const kelompokGroup = document.getElementById('kelompok-group');
    const kelompokInput = document.getElementById('kelompok');

    // Deklarasikan users di luar agar bisa diisi dari Local Storage
    const users = JSON.parse(localStorage.getItem('taskFlowUsers')) || []; // <-- PERBAIKAN PENTING: Mendefinisikan 'users'

    // Fungsi untuk menampilkan/menyembunyikan form kelompok
    function toggleKelompokVisibility() {
        if (peranSelect.value === 'Peserta') {
            kelompokGroup.classList.remove('hidden');
            kelompokInput.setAttribute('required', 'true');
        } else {
            kelompokGroup.classList.add('hidden');
            kelompokInput.removeAttribute('required');
        }
    }
    toggleKelompokVisibility();
    peranSelect.addEventListener('change', toggleKelompokVisibility);

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        
        // 1. Ambil data
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value; 
        const peran = peranSelect.value;
        const divisi = document.getElementById('divisi').value;
        
        let kelompokSession = '';

        if (peran === 'Mentor') {
            kelompokSession = 'Manajemen'; // Mentor otomatis
        } else if (peran === 'Peserta') {
            kelompokSession = kelompokInput.value; // Ambil dari input
        }

        // 2. Validasi Input Dasar
        if (peran === "" || divisi === "") {
            alert("Harap lengkapi Peran dan Divisi.");
            return;
        }

        // --- HAPUS BLOK FETCH KE login.php DI SINI ---

        // 3. Cari pengguna di Local Storage ("database")
        const foundUser = users.find(user => 
            user.email === email && 
            user.password === password && 
            user.peran === peran && 
            user.divisi === divisi &&
            user.kelompok === kelompokSession 
            // Catatan: Pastikan kelompok juga dicocokkan untuk Peserta
        );

        if (foundUser) {
            // LOGIN BERHASIL (LOCAL STORAGE)
            // 4. Simpan sesi yang sudah diverifikasi
            const userSession = {
                email: foundUser.email,
                peran: foundUser.peran, 
                divisi: foundUser.divisi,
                nama: foundUser.nama,
                kelompok: foundUser.kelompok 
            };
            
            localStorage.setItem('taskFlowSession', JSON.stringify(userSession));
            alert(`Login Berhasil! Selamat datang, ${foundUser.nama}!`);
            window.location.href = 'dashboard.html';

        } else {
            // LOGIN GAGAL
            alert('Login Gagal! Data yang Anda masukkan tidak cocok atau akun belum terdaftar.');
        }
    });
});