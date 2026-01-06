document.addEventListener('DOMContentLoaded', function() {
    
    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
    const allNotifications = JSON.parse(localStorage.getItem('taskFlowNotifications')) || [];
    const container = document.getElementById('notification-list-container');

    if (!userSession) {
        container.innerHTML = '<p>Anda harus login untuk melihat notifikasi.</p>';
        return;
    }

    // === LOGIKA FILTER NOTIFIKASI (DIPERBARUI) ===
    let myNotifications = [];
    const myName = userSession.nama;
    const myKelompok = userSession.kelompok;

    if (userSession.peran === 'Mentor') {
        // Mentor melihat notif yang ditujukan ke namanya
        myNotifications = allNotifications.filter(notif => 
            notif.penerimaNama === myName &&
            notif.peranTujuan === 'Mentor'
        );
    } else {
        // Peserta melihat notif yang ditujukan ke kelompoknya
        myNotifications = allNotifications.filter(notif => 
            notif.kelompokTujuan === myKelompok && 
            notif.peranTujuan === 'Peserta'
        );
    }

    myNotifications.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));

    if (myNotifications.length === 0) {
        container.innerHTML = '<p>Tidak ada notifikasi baru.</p>';
        return;
    }

    // ... (Sisa fungsi render notifikasi tetap sama) ...
    myNotifications.forEach(notif => {
        const notifItem = document.createElement('div');
        notifItem.classList.add('notification-item');
        if (!notif.sudahDibaca) {
            notifItem.classList.add('unread');
        }
        notifItem.innerHTML = `
            <p>${notif.teks}</p>
            <span class="notif-time">${new Date(notif.waktu).toLocaleString('id-ID')}</span>
        `;
        container.appendChild(notifItem);
        
        const originalNotif = allNotifications.find(n => n.id === notif.id);
        if (originalNotif) {
            originalNotif.sudahDibaca = true;
        }
    });

    localStorage.setItem('taskFlowNotifications', JSON.stringify(allNotifications));
});