document.addEventListener('DOMContentLoaded', function() {
    // Cek session dan role
    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
    
    if (!userSession) {
        window.location.href = 'login-taskflow.html';
        return;
    }
    
    if (userSession.peran.toLowerCase() !== 'mentor') {
        alert('Hanya mentor yang dapat mengakses halaman rekap peserta.');
        window.location.href = 'dashboard.html';
        return;
    }

    loadRekapData();
    setupEventListeners();
});

function loadRekapData() {
    const allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const allTemplates = JSON.parse(localStorage.getItem('taskFlowTemplates')) || [];
    const allUsers = JSON.parse(localStorage.getItem('taskFlowUsers')) || [];

    // Process data untuk rekap - SEMUA KELOMPOK 1-10
    const rekapData = processRekapData(allProjects, allTemplates, allUsers);
    
    // Update stats
    updateStats(rekapData, allUsers);
    
    // Render table
    renderRekapTable(rekapData);
    
    // Update filters
    updateFilters(rekapData, allUsers);
}

function processRekapData(projects, templates, users) {
    const rekap = {};
    
    // Buat data untuk SEMUA KELOMPOK 1-10
    for (let i = 1; i <= 10; i++) {
        const kelompok = `Kelompok ${i}`;
        const pesertaKelompok = getPesertaInKelompok(kelompok, users);
        
        // Cari semua project untuk kelompok ini
        const projectsKelompok = projects.filter(p => p.kelompok === kelompok);
        
        // Group tugas dan nilai
        const tugasData = {};
        const detailTugas = [];
        let totalNilai = 0;
        let jumlahTugasDinilai = 0;
        
        projectsKelompok.forEach(project => {
            const template = templates.find(t => t.id === project.templateId);
            const divisi = template ? template.divisiTujuan : 'Umum';
            
            // Simpan nilai (jika ada, jika tidak 0)
            const nilai = project.nilai !== undefined && project.nilai !== null ? project.nilai : 0;
            tugasData[project.judul] = nilai;
            
            if (project.nilai !== undefined && project.nilai !== null) {
                totalNilai += project.nilai;
                jumlahTugasDinilai++;
            }
            
            // Simpan detail tugas untuk expandable row
            detailTugas.push({
                judul: project.judul,
                nilai: project.nilai !== undefined && project.nilai !== null ? project.nilai : 0,
                status: project.status,
                deadline: project.deadline,
                feedbacks: project.feedbacks || [],
                sudahDinilai: project.nilai !== undefined && project.nilai !== null
            });
        });
        
        // Hitung rata-rata (jika ada tugas yang dinilai)
        const rataRata = jumlahTugasDinilai > 0 ? (totalNilai / jumlahTugasDinilai) : 0;
        
        rekap[kelompok] = {
            divisi: projectsKelompok.length > 0 ? 
                (templates.find(t => t.id === projectsKelompok[0].templateId)?.divisiTujuan || 'Umum') : 'Umum',
            peserta: pesertaKelompok,
            tugas: tugasData,
            totalNilai: totalNilai,
            jumlahTugas: projectsKelompok.length,
            jumlahTugasDinilai: jumlahTugasDinilai,
            rataRata: rataRata,
            detailTugas: detailTugas
        };
    }
    
    return rekap;
}

function getPesertaInKelompok(kelompok, users) {
    return users.filter(user => 
        user.kelompok === kelompok && user.peran.toLowerCase() === 'peserta'
    ).map(user => user.nama);
}

function updateStats(rekapData, users) {
    const kelompokUnik = Object.keys(rekapData);
    const totalPeserta = users.filter(u => u.peran.toLowerCase() === 'peserta').length;
    
    // Hitung total tugas dan nilai
    let totalTugas = 0;
    let totalTugasDinilai = 0;
    const semuaNilai = [];
    
    Object.values(rekapData).forEach(kelompok => {
        totalTugas += kelompok.jumlahTugas;
        totalTugasDinilai += kelompok.jumlahTugasDinilai;
        
        // Tambahkan semua nilai yang ada
        Object.values(kelompok.tugas).forEach(nilai => {
            if (nilai > 0) { // Hanya nilai yang > 0 (sudah dinilai)
                semuaNilai.push(nilai);
            }
        });
    });
    
    const rataRata = semuaNilai.length > 0 ? 
        (semuaNilai.reduce((a, b) => a + b, 0) / semuaNilai.length).toFixed(1) : 0;
    
    // Hitung persentase kelompok tuntas (rata-rata >= 70 dan minimal 1 tugas dinilai)
    const kelompokTuntas = Object.values(rekapData).filter(kelompok => 
        kelompok.rataRata >= 70 && kelompok.jumlahTugasDinilai > 0
    ).length;
    
    const persentaseTuntas = Math.round((kelompokTuntas / kelompokUnik.length) * 100);

    // Update DOM
    document.getElementById('stat-total-kelompok').textContent = kelompokUnik.length;
    document.getElementById('stat-total-peserta').textContent = totalPeserta;
    document.getElementById('stat-rata-rata').textContent = rataRata;
    document.getElementById('stat-tuntas').textContent = `${persentaseTuntas}%`;
}

function renderRekapTable(rekapData) {
    const container = document.getElementById('rekap-table-content');
    const kelompokUnik = Object.keys(rekapData).sort();
    
    // Get semua judul tugas unik dari SEMUA KELOMPOK
    const semuaTugas = new Set();
    Object.values(rekapData).forEach(kelompok => {
        Object.keys(kelompok.tugas).forEach(tugas => {
            semuaTugas.add(tugas);
        });
    });
    
    const tugasList = Array.from(semuaTugas);

    let html = `
        <table class="rekap-table">
            <thead>
                <tr>
                    <th>Kelompok & Peserta</th>
                    <th>Divisi</th>
    `;
    
    // Header untuk setiap tugas
    tugasList.forEach(tugas => {
        // Potong judul jika terlalu panjang
        const judulPendek = tugas.length > 15 ? tugas.substring(0, 15) + '...' : tugas;
        html += `<th title="${tugas}">${judulPendek}</th>`;
    });
    
    html += `
                    <th>Rata-rata</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Data untuk setiap kelompok
    kelompokUnik.forEach((kelompok, index) => {
        const data = rekapData[kelompok];
        const pesertaList = data.peserta.length > 0 ? data.peserta.join(', ') : 'Belum ada peserta';
        const progressWidth = data.jumlahTugasDinilai > 0 ? data.rataRata : 0;
        
        html += `
            <tr class="kelompok-header" onclick="toggleDetail(${index})">
                <td>
                    <strong>${kelompok}</strong>
                    <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                        ${data.peserta.length} peserta: ${pesertaList}
                    </div>
                </td>
                <td>${data.divisi}</td>
        `;
        
        // Nilai untuk setiap tugas
        tugasList.forEach(tugas => {
            const nilai = data.tugas[tugas];
            const nilaiClass = getNilaiClass(nilai);
            const displayNilai = nilai !== undefined ? 
                (nilai > 0 ? nilai : '0*') : 
                '-';
            
            html += `<td class="nilai-cell ${nilaiClass}" title="${nilai > 0 ? 'Sudah dinilai' : 'Belum dinilai'}">${displayNilai}</td>`;
        });
        
        // Rata-rata, progress bar, status, dan aksi
        const statusClass = data.jumlahTugas === 0 ? 'status-kosong' : 
                           data.jumlahTugasDinilai === 0 ? 'status-belum' : 
                           data.rataRata >= 70 ? 'status-tinggi' : 
                           data.rataRata >= 60 ? 'status-sedang' : 'status-rendah';
        
        const statusText = data.jumlahTugas === 0 ? 'Belum ada tugas' :
                          data.jumlahTugasDinilai === 0 ? 'Belum dinilai' :
                          data.rataRata >= 70 ? 'Tuntas' :
                          data.rataRata >= 60 ? 'Cukup' : 'Perlu Improvement';
        
        html += `
                <td class="rata-rata-cell ${getNilaiClass(data.rataRata)}">
                    ${data.jumlahTugasDinilai > 0 ? data.rataRata.toFixed(1) : '-'}
                </td>
                <td class="progress-cell">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressWidth}%"></div>
                    </div>
                    <div class="progress-text">${data.jumlahTugasDinilai > 0 ? getProgressStatus(data.rataRata) : 'Belum dinilai'}</div>
                </td>
                <td class="${statusClass}">${statusText}</td>
                <td>
                    <button class="view-detail-btn" onclick="event.stopPropagation(); toggleDetail(${index})">
                        📋 Detail
                    </button>
                </td>
            </tr>
        `;
        
        // Detail row (expandable)
        html += `
            <tr class="detail-row" id="detail-${index}">
                <td colspan="${5 + tugasList.length}" class="detail-cell">
                    <div style="margin-bottom: 10px;">
                        <strong>Detail Tugas ${kelompok}</strong>
                        <span style="font-size: 0.9em; color: #666; margin-left: 10px;">
                            ${data.jumlahTugas} tugas • ${data.jumlahTugasDinilai} sudah dinilai
                        </span>
                    </div>
                    <div class="detail-grid">
        `;
        
        if (data.detailTugas.length === 0) {
            html += `
                <div class="detail-item" style="grid-column: 1 / -1; text-align: center; color: #95a5a6;">
                    📝 Belum ada tugas untuk kelompok ini
                </div>
            `;
        } else {
            data.detailTugas.forEach(tugas => {
                const feedbackCount = tugas.feedbacks ? tugas.feedbacks.length : 0;
                const statusBadge = tugas.sudahDinilai ? 
                    `<span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">✓ Dinilai</span>` :
                    `<span style="background: #95a5a6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em;">⌛ Belum</span>`;
                
                html += `
                    <div class="detail-item">
                        <div class="detail-judul">${tugas.judul}</div>
                        <div class="detail-meta">
                            ${formatDate(tugas.deadline)} • ${tugas.status}
                            ${feedbackCount > 0 ? ` • ${feedbackCount} feedback` : ''}
                            <div style="margin-top: 5px;">${statusBadge}</div>
                        </div>
                        <div class="detail-nilai ${getNilaiClass(tugas.nilai)}">
                            ${tugas.sudahDinilai ? tugas.nilai : 'Belum dinilai'}
                        </div>
                    </div>
                `;
            });
        }
        
        html += `
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function toggleDetail(index) {
    const detailRow = document.getElementById(`detail-${index}`);
    detailRow.classList.toggle('show');
}

function getNilaiClass(nilai) {
    if (nilai === undefined || nilai === null) {
        return 'nilai-kosong';
    }
    
    const num = parseFloat(nilai);
    if (num === 0) return 'nilai-belum'; // Nilai 0 = belum dinilai
    if (num >= 80) return 'nilai-tinggi';
    if (num >= 60) return 'nilai-sedang';
    return 'nilai-rendah';
}

function getProgressStatus(rataRata) {
    const num = parseFloat(rataRata);
    if (num >= 80) return 'Sangat Baik';
    if (num >= 70) return 'Baik';
    if (num >= 60) return 'Cukup';
    if (num >= 50) return 'Perlu Improvement';
    return 'Perhatian Khusus';
}

function updateFilters(rekapData, users) {
    const divisiSelect = document.getElementById('filter-divisi');
    const kelompokSelect = document.getElementById('filter-kelompok');
    
    // Get unique divisi
    const divisiUnik = [...new Set(Object.values(rekapData).map(k => k.divisi))];
    
    // Update divisi filter
    divisiSelect.innerHTML = '<option value="semua">Semua Divisi</option>';
    divisiUnik.forEach(divisi => {
        divisiSelect.innerHTML += `<option value="${divisi}">${divisi}</option>`;
    });
    
    // Update kelompok filter
    kelompokSelect.innerHTML = '<option value="semua">Semua Kelompok</option>';
    Object.keys(rekapData).sort().forEach(kelompok => {
        kelompokSelect.innerHTML += `<option value="${kelompok}">${kelompok}</option>`;
    });
}

function setupEventListeners() {
    document.getElementById('filter-divisi').addEventListener('change', applyFilters);
    document.getElementById('filter-kelompok').addEventListener('change', applyFilters);
}

function applyFilters() {
    // Implementasi filter akan ditambahkan
    loadRekapData(); // Temporary reload
}

function showNoData() {
    const container = document.getElementById('rekap-table-content');
    container.innerHTML = `
        <div class="no-data">
            <h3>📝 Belum Ada Data</h3>
            <p>Belum ada tugas yang diberikan untuk peserta.</p>
            <p>Mulai buat tugas di halaman template!</p>
        </div>
    `;
    
    // Reset stats
    document.getElementById('stat-total-kelompok').textContent = '0';
    document.getElementById('stat-total-peserta').textContent = '0';
    document.getElementById('stat-rata-rata').textContent = '0';
    document.getElementById('stat-tuntas').textContent = '0%';
}

function exportToCSV() {
    const allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const allTemplates = JSON.parse(localStorage.getItem('taskFlowTemplates')) || [];
    
    // Create CSV content
    let csv = 'Kelompok,Divisi,Tugas,Nilai,Status,Deadline,Sudah_Dinilai,Mentor,Tanggal_Input\n';
    
    // Loop melalui semua kelompok 1-10
    for (let i = 1; i <= 10; i++) {
        const kelompok = `Kelompok ${i}`;
        const projectsKelompok = allProjects.filter(p => p.kelompok === kelompok);
        
        if (projectsKelompok.length === 0) {
            // Export data untuk kelompok yang belum ada tugas
            csv += `"${kelompok}","-","-",0,"Tidak ada tugas","-","Tidak","-","-"\n`;
        } else {
            projectsKelompok.forEach(project => {
                const template = allTemplates.find(t => t.id === project.templateId);
                const divisi = template ? template.divisiTujuan : 'Umum';
                const mentor = project.nilaiDiberikanOleh || '-';
                const tanggal = project.nilaiTanggal ? new Date(project.nilaiTanggal).toLocaleDateString('id-ID') : '-';
                const sudahDinilai = project.nilai !== undefined && project.nilai !== null ? 'Ya' : 'Tidak';
                const nilai = project.nilai !== undefined && project.nilai !== null ? project.nilai : 0;
                
                csv += `"${kelompok}","${divisi}","${project.judul}",${nilai},"${project.status}","${project.deadline}","${sudahDinilai}","${mentor}","${tanggal}"\n`;
            });
        }
    }
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap-semua-kelompok-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility function
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isNaN(dateObj.getTime())) return dateString;
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return dateObj.toLocaleDateString('id-ID', options);
    } catch (error) {
        return dateString;
    }
}