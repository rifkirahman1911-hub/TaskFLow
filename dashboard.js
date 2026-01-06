// FILE: dashboard.js (VERSI FIXED - TANPA AUTO-CREATE)

document.addEventListener('DOMContentLoaded', function() {
    
    // === 1. AMBIL SEMUA DATA & SESI ===
    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
    if (!userSession) {
        window.location.href = 'login-taskflow.html';
        return;
    }

    let allTemplates = JSON.parse(localStorage.getItem('taskFlowTemplates')) || [];
    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];

    // DEBUG: Tampilkan data awal
    console.log('=== DEBUG DASHBOARD ===');
    console.log('User Session:', userSession);
    console.log('Total Projects:', allProjects.length);
    console.log('Projects by Kelompok:');
    allProjects.forEach(p => {
        console.log(`- ${p.judul} | Kelompok: ${p.kelompok} | ID: ${p.id} | Status: ${p.status}`);
    });

    // Ambil elemen HTML
    const tableBody = document.getElementById('project-table-body');
    const dashboardTitle = document.getElementById('dashboard-title');
    const createTicketBtn = document.getElementById('btn-buat-tiket');
    const filterStatus = document.getElementById('filter-status');
    const filterKelompokGroup = document.getElementById('filter-kelompok-group');
    const filterKelompokInput = document.getElementById('filter-kelompok'); 
    const statTotal = document.getElementById('stat-total');
    const statBaru = document.getElementById('stat-baru');
    const statDikerjakan = document.getElementById('stat-dikerjakan');
    const statSelesai = document.getElementById('stat-selesai');

    let projectsToDisplay = [];

    // === 2. FUNGSI UTAMA: MENYARING DATA BERDASARKAN PERAN ===
    function calculateDisplayList(masterList, session) {
        if (session.peran.toLowerCase() === 'mentor') {
            return masterList; // Mentor lihat semua
        } else {
            const filtered = masterList.filter(p => p.kelompok === session.kelompok);
            console.log(`Filtered for ${session.kelompok}:`, filtered);
            return filtered;
        }
    }

    // === 🚨 PERBAIKAN BESAR: HAPUS SEMUA AUTO-CREATE LOGIC 🚨 ===
    // TIDAK ADA LAGI AUTO-CREATE UNTUK PESERTA!
    // HANYA MENTOR YANG BISA BUAT PROJECT/TEMPLATE

    // === 3. BERSIHKAN DATA DUPLIKAT SEBELUM RENDER ===
    cleanupCorruptedData();

    // === 4. MUAT DATA TAMPILAN AWAL ===
    projectsToDisplay = calculateDisplayList(allProjects, userSession);
    
    console.log('Projects to display:', projectsToDisplay);

    // Konfigurasi Tampilan Awal
    if (userSession.peran.toLowerCase() === 'mentor') {
        dashboardTitle.textContent = `Dashboard Mentor (${userSession.divisi})`;
        createTicketBtn.style.display = 'block';
        filterKelompokGroup.style.display = 'block';
    } else {
        dashboardTitle.textContent = `Dashboard Peserta (${userSession.kelompok})`;
        createTicketBtn.style.display = 'none';
        filterKelompokGroup.style.display = 'none';
    }

    // === 5. FUNGSI RENDER ===
    function applyFiltersAndRender() {
        const statusValue = filterStatus.value;
        const kelompokValue = filterKelompokInput.value.toLowerCase(); 
        let filteredList = projectsToDisplay;

        if (statusValue !== 'Semua Status') {
            filteredList = filteredList.filter(p => p.status === statusValue);
        }
        if (userSession.peran.toLowerCase() === 'mentor' && kelompokValue.trim() !== '') {
            filteredList = filteredList.filter(p => p.kelompok.toLowerCase().includes(kelompokValue));
        }

        console.log('Filtered list after filters:', filteredList);

        tableBody.innerHTML = ''; 
        if (filteredList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Tidak ada proyek.</td></tr>';
            return;
        }

        filteredList.forEach(project => {
            let statusClass = '';
            switch (project.status.toLowerCase()) {
                case 'desain': statusClass = 'status-desain'; break;
                case 'coding': statusClass = 'status-coding'; break;
                case 'selesai': statusClass = 'status-selesai'; break;
                case 'review': statusClass = 'status-baru'; break;
                default: statusClass = 'status-baru';
            }

            const isMentor = userSession.peran.toLowerCase() === 'mentor';
            const deleteButtonHTML = isMentor 
                ? `<button class="btn-hapus" data-id="${project.id}" data-kelompok="${project.kelompok}" data-judul="${project.judul}">Hapus</button>` 
                : '';
                
            const row = `
                <tr>
                    <td><strong>${project.judul}</strong></td>
                    <td>${project.kelompok}</td>
                    <td><span class="status ${statusClass}">${project.status}</span></td>
                    <td>${formatDate(project.deadline)}</td>
                    <td class="aksi-buttons">
                        <a href="detail-tiket.html?id=${project.id}" class="btn-detail">Lihat</a>
                        ${deleteButtonHTML}
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // === 6. FUNGSI LAINNYA ===
    function updateStatCards() {
        const total = projectsToDisplay.length;
        const baru = projectsToDisplay.filter(p => p.status === 'Baru' || p.status === 'Review').length;
        const dikerjakan = projectsToDisplay.filter(p => p.status === 'Desain' || p.status === 'Coding').length;
        const selesai = projectsToDisplay.filter(p => p.status === 'Selesai').length;
        statTotal.textContent = total;
        statBaru.textContent = baru;
        statDikerjakan.textContent = dikerjakan;
        statSelesai.textContent = selesai;
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isNaN(dateObj.getTime())) return dateString;
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return dateObj.toLocaleDateString('id-ID', options);
    }

    // === 7. SISTEM HAPUS YANG WORK 100% ===
    tableBody.addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-hapus')) {
            
            // Cek Izin
            if (userSession.peran.toLowerCase() !== 'mentor') {
                alert('Hanya mentor yang dapat menghapus proyek.');
                return;
            }

            const projectIdString = event.target.getAttribute('data-id');
            const projectKelompok = event.target.getAttribute('data-kelompok');
            const projectJudul = event.target.getAttribute('data-judul');
            
            console.log(`Attempting to delete project:`, {
                id: projectIdString,
                kelompok: projectKelompok,
                judul: projectJudul,
                allProjectsBefore: allProjects.length
            });

            if (confirm(`Apakah Anda yakin ingin menghapus proyek "${projectJudul}" untuk ${projectKelompok}?`)) {
                
                // HAPUS PROJECT BERDASARKAN ID (BUKAN kelompok+judul)
                const initialLength = allProjects.length;
                allProjects = allProjects.filter(p => p.id !== projectIdString);
                
                console.log(`Deleted 1 project for ${projectKelompok}`);

                // SIMPAN ke localStorage
                localStorage.setItem('taskFlowProjects', JSON.stringify(allProjects));
                
                // PERBAIKAN: Juga hapus template jika ini project dari template
                const deletedProject = allProjects.find(p => p.id === projectIdString);
                if (deletedProject && deletedProject.templateId) {
                    let allTemplates = JSON.parse(localStorage.getItem('taskFlowTemplates')) || [];
                    allTemplates = allTemplates.filter(t => t.id !== deletedProject.templateId);
                    localStorage.setItem('taskFlowTemplates', JSON.stringify(allTemplates));
                    console.log('Also removed related template');
                }
                
                // Perbarui variabel lokal
                allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
                
                // Perbarui tampilan
                projectsToDisplay = calculateDisplayList(allProjects, userSession);
                
                // Render ulang
                applyFiltersAndRender();
                updateStatCards(); 
                
                alert(`Proyek "${projectJudul}" berhasil dihapus untuk ${projectKelompok}!`);
                
                console.log('Final state - All projects:', allProjects);
            }
        }
    });

    // === 8. FUNGSI CLEANUP DATA ===
    function cleanupCorruptedData() {
        let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
        let needsCleanup = false;
        
        const uniqueProjects = [];
        const seen = new Set();
        
        const cleanedProjects = allProjects.filter(project => {
            if (!project.id || !project.judul || !project.kelompok) {
                console.log('Removing corrupted project (missing data):', project);
                needsCleanup = true;
                return false;
            }
            
            // Cek duplikat: ID harus unik
            if (seen.has(project.id)) {
                console.log('Removing duplicate project ID:', project.id);
                needsCleanup = true;
                return false;
            }
            seen.add(project.id);
            return true;
        });

        if (needsCleanup) {
            localStorage.setItem('taskFlowProjects', JSON.stringify(cleanedProjects));
            allProjects = cleanedProjects;
            console.log('Data cleanup completed');
        }
        return needsCleanup;
    }

    // === 9. EVENT LISTENERS UNTUK FILTER ===
    if (filterStatus) {
        filterStatus.addEventListener('change', applyFiltersAndRender);
    }
    if (filterKelompokInput) {
        filterKelompokInput.addEventListener('input', applyFiltersAndRender);
    }
// === 🚨 TAMBAHKAN INI SETELAH EVENT LISTENERS 🚨 ===
// RESET FILTER KELOMPOK SETIAP MENTOR BUKA DASHBOARD
if (userSession.peran.toLowerCase() === 'mentor' && filterKelompokInput) {
    filterKelompokInput.value = ''; // Kosongkan filter kelompok
    console.log('Reset kelompok filter untuk mentor');
}

applyFiltersAndRender();
updateStatCards();
});

// === FUNGSI TAMBAHAN UNTUK DEBUGGING ===
function debugShowAllProjects() {
    const allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    console.log('=== ALL PROJECTS IN LOCALSTORAGE ===');
    allProjects.forEach((p, index) => {
        console.log(`${index + 1}. ${p.judul} | ${p.kelompok} | ID: ${p.id} | Status: ${p.status}`);
    });
    alert(`Total projects: ${allProjects.length}\nCheck console for details`);
}

function debugResetAllProjects() {
    if (confirm('⚠️ HAPUS SEMUA PROYEK? Ini akan menghapus semua data proyek dari sistem.')) {
        localStorage.removeItem('taskFlowProjects');
        localStorage.removeItem('taskFlowTemplates'); // 🚨 HAPUS JUGA TEMPLATES
        alert('Semua proyek dan template telah dihapus. Halaman akan direfresh.');
        window.location.reload();
    }
}