document.addEventListener('DOMContentLoaded', function() {
    // Cek session
    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
    
    if (!userSession) {
        window.location.href = 'login-taskflow.html';
        return;
    }

    loadRaportData(userSession);
});

function loadRaportData(userSession) {
    const allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const allTemplates = JSON.parse(localStorage.getItem('taskFlowTemplates')) || [];
    
    // Filter project untuk kelompok user ini
    const myProjects = allProjects.filter(p => p.kelompok === userSession.kelompok);
    
    // Update subtitle
    document.getElementById('raport-subtitle').textContent = 
        `Raport nilai untuk ${userSession.kelompok} - ${userSession.nama}`;

    if (myProjects.length === 0) {
        showNoData();
        return;
    }

    // Process data untuk raport
    const raportData = processRaportData(myProjects, allTemplates);
    
    // Update stats
    updateStats(raportData);
    
    // Render daftar tugas
    renderTugasList(raportData.tugas);
    
    // Update achievements
    updateAchievements(raportData);
    
    // Update progress ring
    updateProgressRing(raportData.rataRata);
}

function processRaportData(projects, templates) {
    const tugasDinilai = projects.filter(p => p.nilai !== undefined && p.nilai !== null);
    const semuaNilai = tugasDinilai.map(p => p.nilai);
    
    const rataRata = semuaNilai.length > 0 ? 
        (semuaNilai.reduce((a, b) => a + b, 0) / semuaNilai.length) : 0;
    
    const nilaiTertinggi = semuaNilai.length > 0 ? Math.max(...semuaNilai) : 0;
    
    // Process detail setiap tugas
    const tugasDetail = projects.map(project => {
        const template = templates.find(t => t.id === project.templateId);
        return {
            judul: project.judul,
            nilai: project.nilai,
            status: project.status,
            deadline: project.deadline,
            divisi: template ? template.divisiTujuan : 'Umum',
            feedbacks: project.feedbacks || [],
            lampiran: project.lampiran
        };
    });

    return {
        totalTugas: projects.length,
        tugasDinilai: tugasDinilai.length,
        rataRata: rataRata,
        nilaiTertinggi: nilaiTertinggi,
        tugas: tugasDetail
    };
}

function updateStats(raportData) {
    document.getElementById('stat-total-tugas').textContent = raportData.totalTugas;
    document.getElementById('stat-tugas-selesai').textContent = raportData.tugasDinilai;
    document.getElementById('stat-nilai-tertinggi').textContent = raportData.nilaiTertinggi;
}

function updateProgressRing(rataRata) {
    const progressRing = document.getElementById('progress-ring');
    const progressText = document.getElementById('progress-text');
    
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (rataRata / 100) * circumference;
    
    progressRing.style.strokeDasharray = circumference;
    progressRing.style.strokeDashoffset = offset;
    progressText.textContent = `${rataRata.toFixed(1)}%`;
    
    // Update progress ring color based on score
    if (rataRata >= 80) {
        progressRing.style.stroke = '#27ae60';
    } else if (rataRata >= 60) {
        progressRing.style.stroke = '#f39c12';
    } else {
        progressRing.style.stroke = '#e74c3c';
    }
}

function renderTugasList(tugas) {
    const container = document.getElementById('tugas-list-content');
    
    if (tugas.length === 0) {
        container.innerHTML = '<div class="no-data">Belum ada tugas yang diberikan.</div>';
        return;
    }

    let html = '';
    
    tugas.forEach((tugasItem, index) => {
        const nilaiClass = getNilaiClass(tugasItem.nilai);
        const nilaiDisplay = tugasItem.nilai !== undefined ? tugasItem.nilai : 'Belum dinilai';
        const hasFeedback = tugasItem.feedbacks && tugasItem.feedbacks.length > 0;
        
        html += `
            <div class="tugas-item">
                <div class="tugas-info">
                    <div class="tugas-judul">${tugasItem.judul}</div>
                    <div class="tugas-meta">
                        ${tugasItem.divisi} • ${formatDate(tugasItem.deadline)} • Status: ${tugasItem.status}
                    </div>
                </div>
                <div class="tugas-nilai">
                    <div class="nilai-score ${nilaiClass}">${nilaiDisplay}</div>
                    ${hasFeedback ? 
                        `<div class="feedback-badge" onclick="showFeedback(${index})">
                            💬 Feedback
                         </div>` : 
                        '<div style="height: 20px;"></div>'
                    }
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function getNilaiClass(nilai) {
    if (nilai === undefined || nilai === null) {
        return 'nilai-kosong';
    }
    
    if (nilai >= 80) return 'nilai-tinggi';
    if (nilai >= 60) return 'nilai-sedang';
    return 'nilai-rendah';
}

function updateAchievements(raportData) {
    const container = document.getElementById('achievement-grid');
    const achievements = [
        {
            id: 'first_task',
            icon: '🎯',
            title: 'Pemula',
            desc: 'Selesaikan tugas pertama',
            achieved: raportData.totalTugas >= 1
        },
        {
            id: 'consistent',
            icon: '📈',
            title: 'Konsisten',
            desc: 'Selesaikan 3 tugas',
            achieved: raportData.totalTugas >= 3
        },
        {
            id: 'excellent',
            icon: '⭐',
            title: 'Excellent',
            desc: 'Dapat nilai ≥ 90',
            achieved: raportData.nilaiTertinggi >= 90
        },
        {
            id: 'good',
            icon: '👍',
            title: 'Good Job',
            desc: 'Dapat nilai ≥ 80',
            achieved: raportData.nilaiTertinggi >= 80
        },
        {
            id: 'improver',
            icon: '🚀',
            title: 'Improver',
            desc: 'Rata-rata ≥ 75',
            achieved: raportData.rataRata >= 75
        },
        {
            id: 'feedback',
            icon: '💬',
            title: 'Active Learner',
            desc: 'Dapat feedback mentor',
            achieved: raportData.tugas.some(t => t.feedbacks && t.feedbacks.length > 0)
        }
    ];

    let html = '';
    
    achievements.forEach(achievement => {
        html += `
            <div class="achievement-item ${achievement.achieved ? 'achieved' : ''}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-title">${achievement.title}</div>
                <div class="achievement-desc">${achievement.desc}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showFeedback(tugasIndex) {
    const allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
    const myProjects = allProjects.filter(p => p.kelompok === userSession.kelompok);
    const project = myProjects[tugasIndex];
    
    if (!project || !project.feedbacks || project.feedbacks.length === 0) {
        return;
    }

    const modal = document.getElementById('feedback-modal');
    const content = document.getElementById('feedback-modal-content');
    
    let html = '';
    
    project.feedbacks.forEach(feedback => {
        html += `
            <div class="feedback-item">
                <div class="feedback-mentor">${feedback.mentor}</div>
                <div class="feedback-date">${formatTime(feedback.timestamp)} • Nilai: ${feedback.nilai}</div>
                <div class="feedback-text">${feedback.text}</div>
            </div>
        `;
    });
    
    content.innerHTML = html;
    modal.style.display = 'block';
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    modal.style.display = 'none';
}

function showNoData() {
    const container = document.getElementById('tugas-list-content');
    container.innerHTML = `
        <div class="no-data">
            <h3>📝 Belum Ada Tugas</h3>
            <p>Belum ada tugas yang diberikan untuk kelompok Anda.</p>
            <p>Tunggu mentor untuk memberikan tugas pertama!</p>
        </div>
    `;
    
    // Reset stats
    document.getElementById('stat-total-tugas').textContent = '0';
    document.getElementById('stat-tugas-selesai').textContent = '0';
    document.getElementById('stat-nilai-tertinggi').textContent = '0';
    document.getElementById('progress-text').textContent = '0%';
}

// Utility functions
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

function formatTime(timestamp) {
    if (!timestamp) return '-';
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return timestamp;
    }
}

// Close modal ketika klik di luar
window.addEventListener('click', function(event) {
    const modal = document.getElementById('feedback-modal');
    if (event.target === modal) {
        closeFeedbackModal();
    }
});