// File: buat-tugas-template.js (VERSI FIXED - SEMUA KELOMPOK DAPAT TUGAS)

document.addEventListener('DOMContentLoaded', function() {
    const templateForm = document.getElementById('form-tugas-template');
    const userSession = JSON.parse(localStorage.getItem('taskFlowSession'));
    
    const fileInput = document.getElementById('lampiran');
    const filePreviewName = document.getElementById('file-preview-name'); 
    
    if (fileInput && filePreviewName && typeof formatFileSize === 'function') {
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                filePreviewName.textContent = `File: ${this.files[0].name} (${formatFileSize(this.files[0].size)})`;
            } else {
                filePreviewName.textContent = '';
            }
        });
    }

    templateForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const judul = document.getElementById('judul-template').value;
        const divisi = document.getElementById('divisi-tujuan').value;
        const deadline = document.getElementById('deadline-template').value;
        const deskripsi = document.getElementById('deskripsi-template').value;
        const fileInput = document.getElementById('lampiran');
        
        let attachmentData = null; 

        // 1. KONVERSI FILE KE BASE64
        if (fileInput.files.length > 0) {
            try {
                attachmentData = await fileToBase64(fileInput.files[0]);
            } catch (error) {
                alert('Gagal membaca file lampiran. Silakan coba lagi.');
                console.error("Error reading file:", error);
                return; 
            }
        }

        let templates = JSON.parse(localStorage.getItem('taskFlowTemplates')) || [];
        
        const newTemplate = {
            id: Date.now(),
            judul: judul,
            divisiTujuan: divisi,
            deadline: deadline,
            deskripsi: deskripsi,
            lampiran: attachmentData, 
            dibuatOleh: userSession.nama,
            createdAt: new Date().toISOString()
        };

        templates.push(newTemplate);
        localStorage.setItem('taskFlowTemplates', JSON.stringify(templates));

        // 2. 🚨 PERBAIKAN BESAR: AUTO-CREATE PROJECT UNTUK SEMUA KELOMPOK 1-10 🚨
        let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
        
        // 🎯 FIX: BUAT PROJECT UNTUK SEMUA KELOMPOK 1-10, TIDAK PERLU CEK USER
        const semuaKelompok = [
            'Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4', 'Kelompok 5',
            'Kelompok 6', 'Kelompok 7', 'Kelompok 8', 'Kelompok 9', 'Kelompok 10'
        ];

        // Bersihkan data duplikat dulu
        removeDuplicateProjects();

        semuaKelompok.forEach((kelompokNama, index) => { 
            // Cek apakah project sudah ada (lebih ketat)
            const projectExists = allProjects.some(project =>
                project.templateId === newTemplate.id && 
                project.kelompok === kelompokNama &&
                project.judul === newTemplate.judul
            );

            if (!projectExists) {
                const newProject = {
                    id: generateUniqueProjectId(),
                    templateId: newTemplate.id,
                    judul: newTemplate.judul,
                    deskripsi: newTemplate.deskripsi,
                    deadline: newTemplate.deadline,
                    lampiran: newTemplate.lampiran, 
                    status: 'Baru',
                    kelompok: kelompokNama, 
                    divisi: divisi, // 🎯 TAMBAH DIVISI
                    pembuat: newTemplate.dibuatOleh,
                    comments: [],
                    createdAt: new Date().toISOString(),
                    source: 'template-creation'
                };
                allProjects.push(newProject);
                console.log(`Created project for ${kelompokNama}:`, newProject.id);
            }
        });

        localStorage.setItem('taskFlowProjects', JSON.stringify(allProjects));

        alert('Template Tugas Baru Berhasil Dibuat dan Proyek Telah Ditugaskan ke SEMUA 10 KELOMPOK!');
        window.location.href = 'dashboard.html';
    });
});

// FUNGSI BARU: Generate ID yang benar-benar unik
function generateUniqueProjectId() {
    return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// FUNGSI BARU: Hapus data duplikat sebelum create baru
function removeDuplicateProjects() {
    let allProjects = JSON.parse(localStorage.getItem('taskFlowProjects')) || [];
    const seen = new Set();
    
    const cleanedProjects = allProjects.filter(project => {
        const key = `${project.kelompok}-${project.judul}-${project.templateId || 'no-template'}`;
        
        if (seen.has(key)) {
            console.log('Removing duplicate during template creation:', project);
            return false;
        }
        seen.add(key);
        return true;
    });

    if (cleanedProjects.length !== allProjects.length) {
        localStorage.setItem('taskFlowProjects', JSON.stringify(cleanedProjects));
        console.log(`Removed ${allProjects.length - cleanedProjects.length} duplicate projects`);
    }
}

// Fungsi utilitas untuk membaca file dan mengkonversinya menjadi Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result,
            isImage: file.type.startsWith('image/')
        });
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}