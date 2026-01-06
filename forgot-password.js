// File: forgot-password.js (KONSEP LOGIKA)

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-forgot-password');
    const btnSubmit = document.getElementById('btn-submit');
    const resetSection = document.getElementById('reset-section');
    const inputEmail = document.getElementById('email');
    const selectPeran = document.getElementById('peran');
    const inputNewPassword = document.getElementById('new-password');
    const inputConfirmPassword = document.getElementById('confirm-password');

    let isVerified = false;
    let targetUserIndex = -1;

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        // --- Tahap 1: Verifikasi Identitas ---
        if (!isVerified) {
            const users = JSON.parse(localStorage.getItem('taskFlowUsers')) || [];
            
            // Cari pengguna berdasarkan email dan peran
            const userIndex = users.findIndex(u => 
                u.email === inputEmail.value && u.peran === selectPeran.value
            );

            if (userIndex !== -1) {
                // VERIFIKASI BERHASIL
                targetUserIndex = userIndex;
                isVerified = true;
                
                // Ubah tampilan
                inputEmail.disabled = true;
                selectPeran.disabled = true;
                resetSection.classList.remove('hidden');
                inputNewPassword.disabled = false;
                inputConfirmPassword.disabled = false;
                
                btnSubmit.textContent = 'Atur Ulang Kata Sandi';
                alert('Verifikasi berhasil! Silakan masukkan kata sandi baru Anda.');
                
            } else {
                // VERIFIKASI GAGAL
                alert('Verifikasi gagal. Email atau Peran tidak ditemukan dalam sistem.');
            }
            return;
        } 
        
        // --- Tahap 2: Reset Kata Sandi ---
        if (isVerified) {
            const newPassword = inputNewPassword.value;
            const confirmPassword = inputConfirmPassword.value;

            if (newPassword !== confirmPassword) {
                alert('Kata sandi baru dan konfirmasi harus sama!');
                return;
            }
            
            if (newPassword.length < 6) {
                alert('Kata sandi minimal 6 karakter.');
                return;
            }

            // Lakukan Reset Kata Sandi di localStorage
            let users = JSON.parse(localStorage.getItem('taskFlowUsers')) || [];
            
            // Catatan: Dalam aplikasi nyata, Anda HARUS menggunakan hashing (seperti bcrypt) 
            // dan menggunakan API, bukan menyimpan password plain text.
            users[targetUserIndex].password = newPassword; 
            
            localStorage.setItem('taskFlowUsers', JSON.stringify(users));

            alert('Kata sandi berhasil diatur ulang! Anda sekarang dapat login dengan kata sandi baru.');
            window.location.href = 'login-taskflow.html'; 
        }
    });
});