document.addEventListener('DOMContentLoaded', function() {
    
    const registerForm = document.getElementById('form-register');
    const peranSelect = document.getElementById('peran');
    const kelompokGroup = document.getElementById('kelompok-group');
    const kelompokInput = document.getElementById('kelompok');
    const paketSelect = document.getElementById('paket');
    const hargaDisplay = document.getElementById('harga-display');
    const buktiTransferInput = document.getElementById('bukti-transfer');
    const paymentProofSection = document.getElementById('payment-proof-section'); // BARU

    // --- UTILITY: FORMAT HARGA ---
    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    };

    // --- LOGIKA: UPDATE HARGA, KELOMPOK, dan BUKTI TRANSFER (PENTING!) ---

    function updateHarga() {
        const selectedOption = paketSelect.options[paketSelect.selectedIndex];
        const price = selectedOption.getAttribute('data-price') || 0;
        hargaDisplay.value = formatRupiah(price);
        
        // LOGIKA BARU: Tampilkan/Sembunyikan Bukti Transfer
        if (price === '0' || selectedOption.value === 'Free Access') {
            paymentProofSection.classList.add('hidden');
            buktiTransferInput.removeAttribute('required');
        } else {
            paymentProofSection.classList.remove('hidden');
            buktiTransferInput.setAttribute('required', 'required');
        }
    }

    function toggleKelompokVisibility() {
        if (peranSelect.value === 'Peserta') {
            kelompokGroup.classList.remove('hidden');
            kelompokInput.setAttribute('required', 'required');
        } else {
            kelompokGroup.classList.add('hidden');
            kelompokInput.removeAttribute('required');
        }
    }
    
    // Initial load calls
    updateHarga(); 
    toggleKelompokVisibility();
    
    // Event Listeners
    peranSelect.addEventListener('change', toggleKelompokVisibility);
    paketSelect.addEventListener('change', updateHarga);

    // --- LOGIKA PENDAFTARAN & VERIFIKASI PEMBAYARAN ---

    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // 1. Ambil data formulir
        const nama = document.getElementById('nama').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const peran = peranSelect.value;
        const divisi = document.getElementById('divisi').value;
        const paket = paketSelect.value;
        const hargaDibayar = paketSelect.options[paketSelect.selectedIndex].getAttribute('data-price') || 0;
        
        // 2. Validasi Wajib
        if (peran === "" || divisi === "" || paket === "") {
            alert("Harap lengkapi semua pilihan (Peran, Divisi, dan Paket).");
            return;
        }
        if (password.length < 6) {
            alert("Password minimal harus 6 karakter.");
            return;
        }
        
        let kelompok = '';
        if (peran === 'Peserta') {
            kelompok = kelompokInput.value;
            if (kelompok.trim() === "") {
                alert("Peserta wajib mengisi Nama Kelompok.");
                return;
            }
        } else if (peran === 'Mentor') {
            kelompok = 'Manajemen'; 
        }

        // 3. Cek Bukti Transfer hanya jika paket tidak GRATIS
        let buktiTransferName = null;
        let statusAkun = "ACTIVE"; // Default status untuk Free Access
        
        if (hargaDibayar > 0) {
            if (buktiTransferInput.files.length === 0) {
                alert("Anda memilih paket berbayar. Harap unggah bukti transfer pembayaran.");
                return;
            }
            buktiTransferName = buktiTransferInput.files[0].name; // Simulasikan nama file
            statusAkun = "PENDING"; // Status untuk paket berbayar, menunggu verifikasi
        }

        // 4. Logika Penyimpanan Lokal (LocalStorage)
        let users = JSON.parse(localStorage.getItem('taskFlowUsers')) || [];
        
        // Cek apakah email sudah terdaftar
        const userExists = users.find(user => user.email === email);
        if (userExists) {
            alert('Email ini sudah terdaftar. Silakan login.');
            return;
        }
        
        const newUser = {
            nama,
            email,
            password,
            peran,
            divisi,
            kelompok,
            // DATA PEMBAYARAN DAN STATUS VERIFIKASI
            paketDibeli: paket,
            hargaDibayar: hargaDibayar,
            buktiTransfer: buktiTransferName, 
            statusAkun: statusAkun, // Bisa ACTIVE (Gratis) atau PENDING (Berbayar)
            tanggalDaftar: new Date().toISOString()
        };

        // Simpan
        users.push(newUser);
        localStorage.setItem('taskFlowUsers', JSON.stringify(users));

        // Pendaftaran berhasil (LOKAL)
        if (statusAkun === "PENDING") {
             alert(`Pendaftaran Berhasil! Akun Anda berstatus 'PENDING'. Mohon tunggu verifikasi pembayaran oleh Mentor.`);
        } else {
             alert("Pendaftaran berhasil! Anda sekarang dapat login.");
        }
       
        window.location.href = "login-taskflow.html";
    });
});