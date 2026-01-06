document.addEventListener('DOMContentLoaded', function() {
    // === AMBIL PARAMETER ID DARI URL ===
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        showError('Proyek tidak ditemukan', 'ID proyek tidak valid.');
        return;
    }

    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
    if (!userSession) {
        window.location.href = 'login-taskflow.html';
        return;
    }

    // === AMBIL DATA PROYEK ===
    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];

    // Cari project dengan matching ID
    const project = allProjects.find(p => p.id.toString() === projectId.toString());

    if (!project) {
        showError('Proyek tidak ditemukan', 'Proyek dengan ID tersebut tidak ditemukan dalam database.');
        return;
    }

    // === CEK HAK AKSES ===
    const isMentor = userSession.peran && userSession.peran.toLowerCase() === 'mentor';
    const isMyProject = project.kelompok === userSession.kelompok;

    if (!isMentor && !isMyProject) {
        showError('Akses Ditolak', 'Anda tidak memiliki akses ke proyek ini.');
        return;
    }

    // === RENDER DETAIL PROYEK ===
    renderProjectDetail(project, isMentor, isMyProject);
    setupEventListeners(project, isMentor, isMyProject);

    // Setup file preview untuk form komentar
    setupFilePreview();
});

function showError(title, message) {
    document.body.innerHTML = `
        <div class="error-container">
            <h2>${title}</h2>
            <p>${message}</p>
            <a href="dashboard.html" class="btn-primary">Kembali ke Dashboard</a>
        </div>
    `;
}

function renderProjectDetail(project, isMentor, isMyProject) {
    // Update judul halaman
    document.title = `${project.judul} - VINIX7 TaskFlow`;

    // Render header
    document.getElementById('detail-judul').textContent = project.judul || 'Tidak ada judul';
    document.getElementById('detail-status').textContent = project.status || 'Baru';
    document.getElementById('detail-status').className = `status status-${(project.status || 'Baru').toLowerCase()}`;
    document.getElementById('detail-status-text').textContent = project.status || 'Baru';

    // Render informasi
    document.getElementById('detail-deskripsi').textContent = project.deskripsi || 'Belum ada deskripsi untuk proyek ini.';
    document.getElementById('detail-kelompok').textContent = project.kelompok || '-';
    document.getElementById('detail-deadline').textContent = formatDate(project.deadline) || 'Belum ditentukan';
    document.getElementById('detail-pembuat').textContent = project.pembuat || 'Mentor';

    // 🚨 TAMBAHAN: Render nilai jika ada
    renderNilaiSection(project, isMentor, isMyProject);

    // Render lampiran project jika ada
    renderProjectAttachment(project);
    
    // Tampilkan dropdown kelompok hanya untuk Mentor
    if (isMentor) {
        renderGroupSwitcher(project);
    }

    // Setup dropdown status untuk MENTOR DAN PESERTA
    const statusSelect = document.getElementById('status-select');
    const statusUpdateSection = document.getElementById('status-update-section');

    if (statusSelect && statusUpdateSection && (isMentor || isMyProject)) {
        statusSelect.value = project.status || 'Baru';
        statusUpdateSection.style.display = 'block';
        
        const statusLabel = statusUpdateSection.querySelector('label');
        if (statusLabel) {
            if (isMentor) {
                statusLabel.innerHTML = '<strong>Update Status:</strong>';
            } else {
                statusLabel.innerHTML = '<strong>Update Progress Kamu:</strong>';
            }
        }
    } else {
        if (statusUpdateSection) statusUpdateSection.style.display = 'none';
    }

    // Render komentar
    renderComments(project.comments || []);
    
    // Tampilkan pesan khusus untuk project yang belum ada aktivitas
    if (!project.comments || project.comments.length === 0) {
        const commentsContainer = document.getElementById('daftar-komentar');
        if (commentsContainer) {
            commentsContainer.innerHTML = `
                <div class="no-activity">
                    <p>📝 Belum ada aktivitas di proyek ini</p>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">
                        ${isMentor ? 'Mentor dapat menambahkan komentar, update status, atau memberikan nilai' : 'Peserta dapat mulai mengerjakan proyek ini dan update progress'}
                    </p>
                </div>
            `;
        }
    }
}

// 🚨 FUNGSI BARU: Render section nilai
function renderNilaiSection(project, isMentor, isMyProject) {
    const sidebar = document.querySelector('.detail-sidebar');
    if (!sidebar) return;

    // Hapus section nilai lama jika ada
    const existingNilaiSection = document.getElementById('nilai-section');
    if (existingNilaiSection) {
        existingNilaiSection.remove();
    }

    let nilaiHTML = '';

    if (isMentor) {
        // Tampilkan form input nilai untuk mentor
        const currentNilai = project.nilai || '';
        nilaiHTML = `
            <div class="info-card" id="nilai-section">
                <h4>🅰️ Beri Nilai</h4>
                <div class="nilai-input-group">
                    <input type="number" 
                           id="input-nilai" 
                           min="0" 
                           max="100" 
                           value="${currentNilai}"
                           placeholder="0-100"
                           class="nilai-input">
                    <button onclick="simpanNilai('${project.id}')" class="btn-primary btn-small">Simpan Nilai</button>
                </div>
                ${currentNilai ? `<p class="nilai-info">Nilai saat ini: <strong>${currentNilai}</strong></p>` : ''}
                <p style="font-size: 12px; color: #666; margin-top: 8px;">
                    Berikan nilai 0-100 untuk kelompok ${project.kelompok}
                </p>
            </div>
        `;
    } else if (isMyProject && project.nilai) {
        // Tampilkan nilai yang sudah diberikan untuk peserta
        nilaiHTML = `
            <div class="info-card" id="nilai-section">
                <h4>📊 Nilai Kamu</h4>
                <div class="nilai-display">
                    <span class="nilai-score">${project.nilai}</span>
                    <div class="nilai-progress">
                        <div class="nilai-progress-bar" style="width: ${project.nilai}%"></div>
                    </div>
                </div>
                <p style="font-size: 12px; color: #666; margin-top: 8px;">
                    Nilai akhir untuk proyek ini
                </p>
            </div>
        `;
    }

    if (nilaiHTML) {
        // Sisipkan di atas info card pertama
        const firstInfoCard = sidebar.querySelector('.info-card');
        if (firstInfoCard) {
            firstInfoCard.insertAdjacentHTML('beforebegin', nilaiHTML);
        } else {
            sidebar.insertAdjacentHTML('afterbegin', nilaiHTML);
        }
    }
}

// 🚨 FUNGSI BARU: Simpan nilai
function simpanNilai(projectId) {
    const inputNilai = document.getElementById('input-nilai');
    const nilai = parseInt(inputNilai.value);

    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
        alert('Masukkan nilai yang valid antara 0-100');
        return;
    }

    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const projectIndex = allProjects.findIndex(p => p.id.toString() === projectId.toString());

    if (projectIndex !== -1) {
        allProjects[projectIndex].nilai = nilai;
        allProjects[projectIndex].nilaiDiberikanOleh = JSON.parse(localStorage.getItem('taskFlowSession')).nama;
        allProjects[projectIndex].nilaiTanggal = new Date().toISOString();
        
        localStorage.setItem('taskFlowProjects', JSON.stringify(allProjects));

        // Update tampilan
        const project = allProjects[projectIndex];
        renderNilaiSection(project, true, false);
        
        alert(`Nilai ${nilai} berhasil diberikan untuk ${project.kelompok}!`);
        
        // Tambahkan komentar otomatis tentang pemberian nilai
        const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
        const commentText = `📊 Mentor telah memberikan nilai: ${nilai}/100`;
        addComment(projectId, commentText, null);
    }
}

function renderProjectAttachment(project) {
    const container = document.getElementById('project-attachment-container');
    
    if (project.lampiran) {
        // Jika lampiran adalah string (nama file)
        if (typeof project.lampiran === 'string') {
            container.innerHTML = `
                <div class="project-attachment">
                    <h4>Lampiran Project</h4>
                    <div class="file-preview">
                        <div class="file-icon">📎</div>
                        <div class="file-info">
                            <span class="file-name">${project.lampiran}</span>
                            <span class="file-note">(File template project)</span>
                        </div>
                    </div>
                </div>
            `;
        } 
        // Jika lampiran adalah objek dengan data base64
        else if (typeof project.lampiran === 'object' && project.lampiran.data) {
            const isImage = project.lampiran.type && project.lampiran.type.startsWith('image/');
            let clickableElement;
            
            if (isImage) {
                clickableElement = `
                    <div class="file-preview image-preview-container">
                        <img src="${project.lampiran.data}" 
                             alt="${project.lampiran.name}" 
                             class="comment-image-preview" 
                             style="max-height: 150px; cursor: zoom-in;"
                             onclick="openImageModal('${project.lampiran.data}', 'Lampiran Project: ${project.lampiran.name}')">
                        <div class="image-info">
                            <span class="image-name">${project.lampiran.name}</span>
                            <span class="image-size">${formatFileSize(project.lampiran.size)}</span>
                        </div>
                    </div>
                `;
            } else {
                clickableElement = `
                    <div class="file-preview">
                        <div class="file-icon">📎</div>
                        <div class="file-info">
                            <a href="${project.lampiran.data}" 
                               download="${project.lampiran.name}" 
                               class="file-link">
                                ${project.lampiran.name}
                            </a>
                            <span class="file-size">${formatFileSize(project.lampiran.size)}</span>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="project-attachment">
                    <h4>Lampiran Project</h4>
                    ${clickableElement}
                </div>
            `;
        }
    } else {
        container.innerHTML = '';
    }
}

function setupEventListeners(project, isMentor, isMyProject) {
    const statusSelect = document.getElementById('status-select');
    const commentForm = document.getElementById('form-komentar');

    // Event listener untuk update status (Mentor DAN Peserta yang punya project)
    if (statusSelect && (isMentor || isMyProject)) { 
        statusSelect.addEventListener('change', function() {
            updateProjectStatus(project.id, this.value, isMentor);
        });
    }

    // Event listener untuk tambah komentar
    if (commentForm) {
        commentForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const commentInput = document.getElementById('input-komentar');
            const fileInput = document.getElementById('lampiran-komentar');

            addComment(project.id, commentInput.value, fileInput.files[0]);
            commentInput.value = '';
            fileInput.value = '';
            document.getElementById('file-preview-name').textContent = '';
        });
    }
}

function setupFilePreview() {
    const fileInput = document.getElementById('lampiran-komentar');
    const previewName = document.getElementById('file-preview-name');

    if (fileInput && previewName) {
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                const file = this.files[0];
                previewName.textContent = `File: ${file.name} (${formatFileSize(file.size)})`;
            } else {
                previewName.textContent = '';
            }
        });
    }
}

function updateProjectStatus(projectId, newStatus, isMentor) {
    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const projectIndex = allProjects.findIndex(p => p.id.toString() === projectId.toString());

    if (projectIndex !== -1) {
        allProjects[projectIndex].status = newStatus;
        localStorage.setItem('taskFlowProjects', JSON.stringify(allProjects));

        // Update tampilan
        document.getElementById('detail-status').textContent = newStatus;
        document.getElementById('detail-status').className = `status status-${newStatus.toLowerCase()}`;
        document.getElementById('detail-status-text').textContent = newStatus;

        // Pesan konfirmasi yang berbeda untuk mentor vs peserta
        if (isMentor) {
            alert('Status proyek berhasil diperbarui!');
        } else {
            alert('Progress kamu berhasil diperbarui!');
        }
    }
}

function addComment(projectId, text, file) {
    if (!text.trim() && !file) {
        alert('Harap isi komentar atau lampirkan file.');
        return;
    }

    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const projectIndex = allProjects.findIndex(p => p.id.toString() === projectId.toString());

    if (projectIndex !== -1) {
        const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));

        // Handle file upload - convert ke base64
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const attachmentData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result,
                    isImage: file.type.startsWith('image/')
                };

                saveCommentWithAttachment(projectId, text, attachmentData, userSession);
            };
            reader.readAsDataURL(file);
        } else {
            saveCommentWithAttachment(projectId, text, null, userSession);
        }
    }
}

function saveCommentWithAttachment(projectId, text, attachmentData, userSession) {
    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const projectIndex = allProjects.findIndex(p => p.id.toString() === projectId.toString());

    if (projectIndex !== -1) {
        const newComment = {
            id: Date.now(),
            author: userSession.nama,
            text: text,
            timestamp: new Date().toISOString(),
            attachment: attachmentData
        };

        if (!allProjects[projectIndex].comments) {
            allProjects[projectIndex].comments = [];
        }

        allProjects[projectIndex].comments.push(newComment);
        localStorage.setItem('taskFlowProjects', JSON.stringify(allProjects));

        // Render ulang komentar
        renderComments(allProjects[projectIndex].comments);
    }
}

function renderComments(comments) {
    const commentsContainer = document.getElementById('daftar-komentar');
    if (!commentsContainer) return;
    
    commentsContainer.innerHTML = '';

    if (comments.length === 0) {
        commentsContainer.innerHTML = '<p class="no-comments">Belum ada komentar.</p>';
        return;
    }

    // Urutkan komentar dari yang tertua -> paling atas (terbaru di bawah)
    comments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';

        let attachmentHTML = '';
        if (comment.attachment) {
            if (comment.attachment.isImage) {
                // Tampilkan gambar langsung dengan fitur zoom
                attachmentHTML = `
                    <div class="comment-attachment">
                        <div class="image-preview-container">
                            <img src="${comment.attachment.data}" 
                                alt="${comment.attachment.name}" 
                                class="comment-image-preview"
                                onclick="openImageModal('${comment.attachment.data}', '${comment.attachment.name}')">
                            <div class="image-info">
                                <span class="image-name">${comment.attachment.name}</span>
                                <span class="image-size">${formatFileSize(comment.attachment.size)}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Untuk file non-gambar, tampilkan sebagai link download
                attachmentHTML = `
                    <div class="comment-attachment">
                        <div class="file-preview">
                            <div class="file-icon">📄</div>
                            <div class="file-info">
                                <a href="${comment.attachment.data}" 
                                    download="${comment.attachment.name}" 
                                    class="file-link">
                                     ${comment.attachment.name}
                                </a>
                                <span class="file-size">${formatFileSize(comment.attachment.size)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        commentElement.innerHTML = `
            <div class="comment-header">
                <div class="comment-author">${comment.author}</div>
                <div class="comment-time">${formatTime(comment.timestamp)}</div>
            </div>
            ${comment.text ? `<div class="comment-text">${comment.text}</div>` : ''}
            ${attachmentHTML}
        `;
        commentsContainer.appendChild(commentElement);
    });
}

// === FUNGSI GROUP SWITCHER ===
function renderGroupSwitcher(currentProject) {
    const allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const allTemplates = JSON.parse(localStorage.getItem('taskFlowTemplates')) || [];
    
    // Cari template yang sesuai berdasarkan templateId atau judul
    let template;
    if (currentProject.templateId) {
        template = allTemplates.find(t => t.id === currentProject.templateId);
    } else {
        // Fallback: cari template berdasarkan judul
        template = allTemplates.find(t => t.judul === currentProject.judul);
    }
    
    // Jika tidak ada template, gunakan project saat ini sebagai referensi
    if (!template) {
        template = {
            judul: currentProject.judul,
            divisiTujuan: currentProject.divisi || 'Umum'
        };
    }

    // Cari semua project dengan template yang sama (judul sama)
    const relatedProjects = allProjects.filter(p => 
        p.judul === template.judul || 
        (p.templateId && p.templateId === template.id)
    );
    
    // Buat map untuk mempermudah pencarian
    let projectMap = {};
    relatedProjects.forEach(p => {
        projectMap[p.kelompok] = p;
    });

    let optionsHTML = '';
    
    // Iterasi dari Kelompok 1 hingga 10
    for (let i = 1; i <= 10; i++) {
        const groupName = `Kelompok ${i}`;
        const project = projectMap[groupName];
        let isSelected = currentProject.kelompok === groupName ? 'selected' : '';
        
        if (project) {
            // Kelompok memiliki proyek - tampilkan dengan status
            const statusBadge = project.status ? ` (${project.status})` : '';
            optionsHTML += `<option value="${project.id}" ${isSelected}>${groupName}${statusBadge}</option>`;
        } else {
            // Kelompok belum memiliki proyek - buat project otomatis
            const newProjectId = createEmptyProjectForGroup(template, groupName);
            if (newProjectId) {
                optionsHTML += `<option value="${newProjectId}" ${isSelected}>${groupName} (Baru)</option>`;
            } else {
                optionsHTML += `<option value="" ${isSelected}>${groupName}</option>`;
            }
        }
    }

    const switcherHTML = `
        <div class="info-card" style="margin-top: 20px;">
            <h4>Progress Semua Kelompok</h4>
            <select id="group-switcher">
                ${optionsHTML}
            </select>
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                Pilih kelompok untuk melihat progress
            </p>
        </div>
    `;

    const sidebar = document.querySelector('.detail-sidebar');
    if (sidebar) {
        sidebar.insertAdjacentHTML('afterbegin', switcherHTML);
        
        // Tambahkan event listener untuk switcher
        const switcher = document.getElementById('group-switcher');
        if (switcher) {
            switcher.addEventListener('change', function() {
                if (this.value) {
                    window.location.href = `detail-tiket.html?id=${this.value}`;
                }
            });
        }
    }
}

// Fungsi untuk membuat project kosong untuk kelompok yang belum ada
function createEmptyProjectForGroup(template, kelompok) {
    try {
        let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
        
        // Cek dulu apakah sudah ada project untuk kelompok ini
        const existingProject = allProjects.find(p => 
            p.kelompok === kelompok && 
            (p.judul === template.judul || p.templateId === template.id)
        );
        
        if (existingProject) {
            return existingProject.id;
        }
        
        // Buat project baru
        const newProject = {
            id: (Date.now() + Math.random()).toString(),
            templateId: template.id,
            judul: template.judul,
            deskripsi: template.deskripsi || 'Deskripsi proyek akan ditambahkan',
            deadline: template.deadline,
            lampiran: template.lampiran,
            status: 'Baru',
            kelompok: kelompok,
            pembuat: template.dibuatOleh || 'Mentor',
            comments: [],
            createdAt: new Date().toISOString()
        };
        
        allProjects.push(newProject);
        localStorage.setItem('taskFlowProjects', JSON.stringify(allProjects));
        
        return newProject.id;
    } catch (error) {
        console.error('Error creating empty project:', error);
        return null;
    }
}

// === VARIABLES GLOBAL UNTUK ZOOM DAN PANNING ===
let currentScale = 1;
const minScale = 0.5;
const maxScale = 5;
const scaleStep = 0.25;

let isDragging = false;
let startX, startY;
let translateX = 0;
let translateY = 0;

function openImageModal(imageSrc, imageName) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-zoomed-image');
    const modalTitle = document.getElementById('modal-image-title');
    const downloadLink = document.getElementById('modal-download-link');

    if (!modal || !modalImage || !modalTitle || !downloadLink) {
        console.error('Modal elements not found');
        return;
    }

    // Reset zoom dan panning state
    currentScale = 1;
    translateX = 0;
    translateY = 0;
    modalImage.style.transform = `scale(${currentScale}) translate(0px, 0px)`;
    modalImage.style.cursor = 'zoom-in';

    updateZoomLevel();

    modalImage.src = imageSrc;
    modalImage.alt = imageName;
    modalTitle.textContent = imageName;
    downloadLink.href = imageSrc;
    downloadLink.download = imageName;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    setupImageZoom(modalImage);
}

function setupImageZoom(imageElement) {
    if (!imageElement) return;

    // Double click to zoom
    imageElement.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        
        if (currentScale === 1) {
            currentScale = 2;
            imageElement.style.cursor = 'grab';
        } else {
            currentScale = 1;
            imageElement.style.cursor = 'zoom-in';
            // Reset panning ketika zoom out ke normal
            translateX = 0;
            translateY = 0;
        }
        
        imageElement.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
        updateZoomLevel();
    });

    // Mouse wheel zoom
    imageElement.addEventListener('wheel', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
        zoomImage(delta);
    });

    // === FITUR PANNING (GESER GAMBAR) ===
    imageElement.addEventListener('mousedown', function(e) {
        if (currentScale > 1) {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            imageElement.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        translateX = e.clientX - startX;
        translateY = e.clientY - startY;

        const imageElement = document.getElementById('modal-zoomed-image');
        if (imageElement) {
            imageElement.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        const imageElement = document.getElementById('modal-zoomed-image');
        if (imageElement && currentScale > 1) {
            imageElement.style.cursor = 'grab';
        }
    });

    // Touch events untuk mobile
    imageElement.addEventListener('touchstart', function(e) {
        if (currentScale > 1 && e.touches.length === 1) {
            e.preventDefault();
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        }
    });

    document.addEventListener('touchmove', function(e) {
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault();

        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;

        const imageElement = document.getElementById('modal-zoomed-image');
        if (imageElement) {
            imageElement.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
        }
    });

    document.addEventListener('touchend', function() {
        isDragging = false;
    });
}

function zoomIn() {
    zoomImage(scaleStep);
}

function zoomOut() {
    zoomImage(-scaleStep);
}

function resetZoom() {
    currentScale = 1;
    translateX = 0;
    translateY = 0;
    const imageElement = document.getElementById('modal-zoomed-image');
    if (imageElement) {
        imageElement.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
        imageElement.style.cursor = 'zoom-in';
    }
    updateZoomLevel();
}

function zoomImage(delta) {
    const newScale = currentScale + delta;
    
    if (newScale >= minScale && newScale <= maxScale) {
        currentScale = newScale;
        const imageElement = document.getElementById('modal-zoomed-image');
        if (imageElement) {
            imageElement.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
            
            if (currentScale > 1) {
                imageElement.style.cursor = 'grab';
            } else {
                imageElement.style.cursor = 'zoom-in';
                // Reset panning ketika zoom out ke normal
                translateX = 0;
                translateY = 0;
                imageElement.style.transform = `scale(${currentScale}) translate(0px, 0px)`;
            }
            
            updateZoomLevel();
        }
    }
}

function updateZoomLevel() {
    const zoomLevelElement = document.getElementById('zoom-level');
    if (zoomLevelElement) {
        zoomLevelElement.textContent = `${Math.round(currentScale * 100)}%`;
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetZoom();
    }
}

// === FUNGSI UTILITAS ===
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

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// Close modal dengan ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeImageModal();
    }
    // 🚨 VARIABEL GLOBAL UNTUK NILAI MODAL
let currentProjectIdForNilai = '';

// 🚨 FUNGSI BARU: Buka modal nilai & feedback
function openNilaiModal(projectId) {
    const modal = document.getElementById('nilai-modal');
    const project = getProjectById(projectId);
    
    if (!modal || !project) return;
    
    currentProjectIdForNilai = projectId;
    
    // Reset form
    document.getElementById('modal-input-nilai').value = project.nilai || '';
    document.getElementById('modal-input-feedback').value = '';
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// 🚨 FUNGSI BARU: Tutup modal nilai
function closeNilaiModal() {
    const modal = document.getElementById('nilai-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// 🚨 FUNGSI BARU: Simpan nilai dengan feedback
function simpanNilaiDenganFeedback() {
    const inputNilai = document.getElementById('modal-input-nilai');
    const inputFeedback = document.getElementById('modal-input-feedback');
    const nilai = parseInt(inputNilai.value);
    const feedback = inputFeedback.value.trim();

    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
        alert('Masukkan nilai yang valid antara 0-100');
        return;
    }

    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const projectIndex = allProjects.findIndex(p => p.id.toString() === currentProjectIdForNilai.toString());

    if (projectIndex !== -1) {
        const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
        
        // Simpan nilai
        allProjects[projectIndex].nilai = nilai;
        allProjects[projectIndex].nilaiDiberikanOleh = userSession.nama;
        allProjects[projectIndex].nilaiTanggal = new Date().toISOString();
        
        // Simpan feedback jika ada
        if (feedback) {
            if (!allProjects[projectIndex].feedbacks) {
                allProjects[projectIndex].feedbacks = [];
            }
            
            const newFeedback = {
                id: Date.now(),
                mentor: userSession.nama,
                nilai: nilai,
                text: feedback,
                timestamp: new Date().toISOString()
            };
            
            allProjects[projectIndex].feedbacks.push(newFeedback);
        }
        
        localStorage.setItem('taskFlowProjects', JSON.stringify(allProjects));

        // Update tampilan
        const project = allProjects[projectIndex];
        renderNilaiSection(project, true, false);
        
        // Tutup modal
        closeNilaiModal();
        
        alert(`Nilai ${nilai} berhasil diberikan untuk ${project.kelompok}!`);
        
        // Tambahkan komentar otomatis tentang pemberian nilai
        let commentText = `📊 Mentor telah memberikan nilai: ${nilai}/100`;
        if (feedback) {
            commentText += `\n\n💬 Feedback:\n${feedback}`;
        }
        addComment(currentProjectIdForNilai, commentText, null);
    }
}

// 🚨 PERBAIKAN FUNGSI: Render section nilai dengan feedback
function renderNilaiSection(project, isMentor, isMyProject) {
    const sidebar = document.querySelector('.detail-sidebar');
    if (!sidebar) return;

    // Hapus section nilai lama jika ada
    const existingNilaiSection = document.getElementById('nilai-section');
    if (existingNilaiSection) {
        existingNilaiSection.remove();
    }

    let nilaiHTML = '';

    if (isMentor) {
        // Tampilkan form input nilai untuk mentor
        const currentNilai = project.nilai || '';
        nilaiHTML = `
            <div class="info-card" id="nilai-section">
                <h4>🅰️ Beri Nilai</h4>
                <div class="nilai-input-group">
                    <input type="number" 
                           id="input-nilai" 
                           min="0" 
                           max="100" 
                           value="${currentNilai}"
                           placeholder="0-100"
                           class="nilai-input">
                    <button onclick="openNilaiModal('${project.id}')" class="btn-primary btn-small">Beri Nilai & Feedback</button>
                </div>
                ${currentNilai ? `<p class="nilai-info">Nilai saat ini: <strong>${currentNilai}</strong></p>` : ''}
                <p style="font-size: 12px; color: #666; margin-top: 8px;">
                    Klik tombol untuk memberikan nilai dan feedback
                </p>
            </div>
        `;
    } else if (isMyProject && project.nilai) {
        // Tampilkan nilai dan feedback untuk peserta
        let feedbackHTML = '';
        
        if (project.feedbacks && project.feedbacks.length > 0) {
            const latestFeedback = project.feedbacks[project.feedbacks.length - 1]; // Ambil feedback terbaru
            feedbackHTML = `
                <div class="feedback-section">
                    <h5>📝 Feedback Mentor</h5>
                    <div class="feedback-item">
                        <div class="feedback-header">
                            <span class="feedback-mentor">${latestFeedback.mentor}</span>
                            <span class="nilai-badge">Nilai: ${latestFeedback.nilai}</span>
                        </div>
                        <div class="feedback-date">${formatTime(latestFeedback.timestamp)}</div>
                        <div class="feedback-text">${latestFeedback.text}</div>
                    </div>
                </div>
            `;
        }
        
        nilaiHTML = `
            <div class="info-card" id="nilai-section">
                <h4>📊 Nilai Kamu</h4>
                <div class="nilai-display">
                    <span class="nilai-score">${project.nilai}</span>
                    <div class="nilai-progress">
                        <div class="nilai-progress-bar" style="width: ${project.nilai}%"></div>
                    </div>
                </div>
                ${feedbackHTML}
                <p style="font-size: 12px; color: #666; margin-top: 8px;">
                    Nilai akhir untuk proyek ini
                </p>
            </div>
        `;
    }

    if (nilaiHTML) {
        // Sisipkan di atas info card pertama
        const firstInfoCard = sidebar.querySelector('.info-card');
        if (firstInfoCard) {
            firstInfoCard.insertAdjacentHTML('beforebegin', nilaiHTML);
        } else {
            sidebar.insertAdjacentHTML('afterbegin', nilaiHTML);
        }
    }
}

// 🚨 FUNGSI BARU: Helper untuk mendapatkan project by ID
function getProjectById(projectId) {
    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    return allProjects.find(p => p.id.toString() === projectId.toString());
}

// 🚨 HAPUS FUNGSI simpanNilai LAMA (diganti dengan yang baru)

// Tambahkan event listener untuk ESC key pada modal nilai
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeImageModal();
        closeNilaiModal();
    }
});

// CSS untuk modal feedback
const additionalCSS = `
    .feedback-textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        min-height: 100px;
    }
    .form-group {
        margin-bottom: 15px;
    }
    .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
    }
    .feedback-tips {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 4px;
        margin-top: 10px;
    }
`;

// Inject CSS tambahan
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
});