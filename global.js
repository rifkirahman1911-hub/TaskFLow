// File: global.js (VERSI REVISI AKHIR DAN BENAR)
(function() {
    
    // --- 0. DEKLARASI VARIABEL GLOBAL ---
    // Dipindahkan ke sini agar kode lain dapat mengaksesnya jika diperlukan
    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
    const currentPage = window.location.pathname.split('/').pop() || window.location.href;
    
    // --- 1. CEK SESI LOGIN (Perbaikan Logika Redirect) ---
    if (!userSession && !currentPage.includes('login-taskflow.html') && !currentPage.includes('register.html') && !currentPage.includes('forgot-password.html')) {
        alert('Anda harus login terlebih dahulu.');
        window.location.href = 'login-taskflow.html';
        return;
    }

    // --- 2. FUNGSI UTILITY GLOBAL (Untuk dashboard.js atau file lain) ---
    
    // a. Format Ukuran File
    window.formatFileSize = function(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' bytes';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    // b. Cek Deadline Kritis (PENTING untuk TaskFlow Mentor)
    window.isDeadlineCritical = function(dateString, daysThreshold = 3) {
        if (!dateString) return false;
        const deadline = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= daysThreshold;
    };
    
    // --- 3. LOGIKA DOM DAN EVENT LISTENERS ---
    document.addEventListener('DOMContentLoaded', function() {
        const logoutButton = document.getElementById('nav-logout');
        const mentorOnlyElements = document.querySelectorAll('.mentor-only');
        const pesertaOnlyElements = document.querySelectorAll('.peserta-only');
        const notificationDot = document.querySelector('.notification-dot');
        const dashboardTitle = document.getElementById('dashboard-title'); // Dipakai di dashboard.html

        // A. Fungsikan Tombol Logout
        if (logoutButton) {
            logoutButton.addEventListener('click', function(event) {
                event.preventDefault(); 
                if (confirm('Apakah Anda yakin ingin logout?')) {
                    localStorage.removeItem('taskFlowSession');
                    window.location.href = 'login-taskflow.html';
                }
            });
        }
        
        // B. Logika Pemisahan Peran Tampilan di Navigasi
        if (userSession) {
            const role = userSession.peran.toLowerCase();
            
            // Kontrol tampilan menu
            if (role === 'mentor') {
                pesertaOnlyElements.forEach(el => el.style.display = 'none');
                mentorOnlyElements.forEach(el => el.style.display = 'block');
                if (dashboardTitle) dashboardTitle.textContent = `Dashboard Mentor (${userSession.divisi})`;
            } else {
                mentorOnlyElements.forEach(el => el.style.display = 'none');
                pesertaOnlyElements.forEach(el => el.style.display = 'block');
                if (dashboardTitle) dashboardTitle.textContent = `Dashboard Peserta (${userSession.kelompok})`;
            }
        }
        
        // C. Logika Lonceng Notifikasi (Diperbarui dengan cek Deadline Kritis)
        if (notificationDot && userSession) { 
            const notifications = JSON.parse(localStorage.getItem('taskFlowNotifications')) || [];
            const allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
            let hasUnread = false;

            // 1. Cek Notifikasi Pesan/Feedback Baru
            if (userSession.peran === 'Mentor') {
                hasUnread = notifications.some(notif => 
                    notif.penerimaNama === userSession.nama && notif.peranTujuan === 'Mentor' && !notif.sudahDibaca
                );
            } else {
                hasUnread = notifications.some(notif => 
                    notif.kelompokTujuan === userSession.kelompok && notif.peranTujuan === 'Peserta' && !notif.sudahDibaca
                );
            }

            // 2. Cek Notifikasi Deadline Kritis (Khusus TaskFlow Mentor)
            if (userSession.peran.toLowerCase() === 'mentor' && !hasUnread) {
                const criticalProjects = allProjects.filter(p => 
                    window.isDeadlineCritical(p.deadline) && p.status !== 'Selesai'
                );
                if (criticalProjects.length > 0) {
                    hasUnread = true;
                }
            }

            if (hasUnread) {
                notificationDot.classList.remove('hidden');
            } else {
                notificationDot.classList.add('hidden');
            }
        } else if (notificationDot) {
            notificationDot.classList.add('hidden');
        }
    });

})();