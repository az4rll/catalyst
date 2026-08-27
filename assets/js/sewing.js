(function() {
            const d = new Date();
            const pinSuffix = (d.getMonth() + 1).toString() + d.getFullYear().toString().slice(-2);
            
            const expectedPin = 'SEW' + pinSuffix;
            const globalPin = 'CATALYSTD1';
            
            const tiketArea = localStorage.getItem('tiket_sewing');
            const tiketGlobal = localStorage.getItem('qc_token_global');
            const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
            
            // DEMO MODE: gerbang password dinonaktifkan agar portofolio bisa diakses bebas
        })();
    


    const SCRIPT_URL = "DEMO_MODE_NO_BACKEND";


        // ================= DEMO MODE MOCK BACKEND =================
        // Portofolio CATALYST — koneksi ke server asli diputus total.
        // Semua request otomatis dianggap sukses dengan data dummy.
        (function () {
            function seededRandom(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }
            function fmtDate(d) { return d.toISOString().slice(0, 10); }
            function generateDummyRows(n, prefix) {
                const rows = [];
                const lines = ['LINE 1', 'LINE 2', 'LINE 3'];
                const defects = ['SKIP STITCH', 'BROKEN STITCH', 'NEEDLE MARK', 'STAIN', 'MEASUREMENT'];
                for (let i = 0; i < n; i++) {
                    const d = new Date(); d.setDate(d.getDate() - i);
                    rows.push({
                        tanggal: fmtDate(d), line: lines[i % lines.length],
                        qty: Math.round(150 + seededRandom(i) * 80),
                        defect: Math.round(seededRandom(i * 2) * 12),
                        jenis: defects[i % defects.length],
                        status: 'ORI', operator: prefix + ' Demo ' + ((i % 3) + 1),
                        buyer: 'BUYER A'
                    });
                }
                return rows;
            }
            const dummyRows = generateDummyRows(30, 'SEW');

            const realFetch = window.fetch;
            window.fetch = function (url, opts) {
                if (typeof url === 'string' && (url === SCRIPT_URL || url.includes('script.google.com'))) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            result: 'success',
                            status: 'success',
                            message: 'Demo mode: data tidak benar-benar tersimpan.',
                            data: dummyRows,
                            produksi: dummyRows,
                            defects: dummyRows,
                            list: dummyRows
                        })
                    });
                }
                return realFetch.apply(this, arguments);
            };
        })();
        // ================= END DEMO MODE MOCK BACKEND =================
    const APP_VERSION = "1.0"; 

    let validDashboardDate = ""; 
    let submittedLinesData = [];
    let currentSpvPassword = ""; 
    let defectChart; 
    
    function initChart() {
        const ctx = document.getElementById('defectChart');
        if(!ctx) return;
        defectChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['GOOD', 'DEFECT'],
                datasets: [{ data: [1, 0], backgroundColor: ['#cbd5e1', '#ef4444'], borderWidth: 0 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: { duration: 500 }
            }
        });
    }

    let selectedLineDaily = "";
    let selectedLineLKH = "";
    let lkhLineContext = "DAILY"; 
    const TLS_ONLY_LINES = ["18", "MINILINE", "PREPARATION"];

    function applyTlsOnlyLogic() {
        let isTlsOnly = TLS_ONLY_LINES.includes(selectedLineDaily);
        let elsToDisable = ['qty_insp_100', 'qc_endline', 'buyer_select', 'style_select'];
        
        elsToDisable.forEach(id => {
            let el = document.getElementById(id);
            if(el) {
                if(isTlsOnly) {
                    el.disabled = true;
                    if(el.tagName === 'INPUT') el.readOnly = true;
                    el.style.opacity = '0.4';
                    el.style.pointerEvents = 'none';
                    if(el.tagName === 'INPUT' || el.tagName === 'SELECT') el.value = '';
                } else {
                    el.disabled = false;
                    if(el.tagName === 'INPUT') el.readOnly = false;
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                }
            }
        });

        let statusEl = document.getElementById('status');
        if(statusEl) {
            if(isTlsOnly) {
                statusEl.value = "START";
                statusEl.disabled = true;
                statusEl.style.backgroundColor = "var(--bg-readonly)";
            } else {
                statusEl.disabled = false;
                statusEl.style.backgroundColor = "var(--bg-input)";
            }
        }

        let lblBuyer = document.getElementById('lbl_buyer');
        if(lblBuyer) {
            if(isTlsOnly) lblBuyer.classList.remove('req');
            else lblBuyer.classList.add('req');
        }
    }
    
    let lastActiveTime = Date.now();
    document.addEventListener("visibilitychange", function() {
        if (document.visibilityState === "visible") {
            if (Date.now() - lastActiveTime > 7200000) window.location.reload(true);
            lastActiveTime = Date.now();
        }
    });

    function switchAppTab(tabName) {
        document.getElementById('tab-daily').classList.remove('active');
        document.getElementById('tab-lkh').classList.remove('active');
        document.getElementById('tab-rc').classList.remove('active');
        document.getElementById('tab-btl').classList.remove('active');
        document.getElementById('view-daily').style.display = 'none';
        document.getElementById('view-lkh').style.display = 'none';
        document.getElementById('view-rc').style.display = 'none';
        document.getElementById('view-btl').style.display = 'none';
        document.getElementById('daily-action-buttons').style.display = 'none';

        if(tabName === 'DAILY') {
            document.getElementById('tab-daily').classList.add('active');
            document.getElementById('view-daily').style.display = 'block';
            document.getElementById('daily-action-buttons').style.display = 'flex';
        } else if(tabName === 'LKH') {
            document.getElementById('tab-lkh').classList.add('active');
            document.getElementById('view-lkh').style.display = 'block';
        } else if(tabName === 'RC') {
            document.getElementById('tab-rc').classList.add('active');
            document.getElementById('view-rc').style.display = 'block';
            if(!document.getElementById('rc_tanggal').value) {
                const d = new Date(); 
                document.getElementById('rc_tanggal').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        } else if(tabName === 'BTL') {
            document.getElementById('tab-btl').classList.add('active');
            document.getElementById('view-btl').style.display = 'block';
            if(!document.getElementById('btl_tanggal').value) {
                const d = new Date(); 
                document.getElementById('btl_tanggal').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        }
    }

    function toggleMoreMenu() {
        document.getElementById('moreMenu').classList.toggle('show');
    }
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('moreMenu');
        const trigger = document.querySelector('.btn-menu-trigger');
        if (menu && menu.classList.contains('show') && !menu.contains(e.target) && !trigger.contains(e.target)) {
            menu.classList.remove('show');
        }
    });

    const listLineMaster = [
        "PREPARATION", "1", "1B", "2", "3A", "3B", "4", "5", "6", "6B", "7", "8A", "8B", "9A", "9B", 
        "10", "11", "12", "13", "14", "15", "16", "16A", "16B", "17A", "17B", "18", "19A", "19B", "20", "21", "MINILINE"
    ];
    
    const listQCInspectorRC = ["Haura", "Fitri", "Nafisah"];

    const listQC = [
        "Haura", "Fitri", "Nafisah"
    ];

    const defectAreas = [
        "COLLAR/NECK", "SHOULDER", "ARMHOLE", "SLEEVE", "MANSET", "SLIT/VENT", 
        "BOTTOM HEMMING", "FRONT PLACKET", "SIDE SEAM", "POCKET", 
        "MAIN LABEL/CARE LABEL", "FRONT/BACK RISE", "LINING", "DECORATIVE", 
        "BUTTON", "BUTTON HOLE", "BARTACK", "HANDMADE", "STEAM/IRONING", 
        "FRONT BODY", "BACK BODY", "WAIST", "INSEAM/OUTSEAM", "OVERLOOK", "TRIMMING", "STAIN", "MEASUREMENT"
    ];
    
    const defectTypes = [
        "RUN OF STITCH", "BROKEN STITCH", "PLEATED", "SKIP STITCH", "MISSING STITCH", 
        "SHADING", "LOOSE STITCH", "PUCKERING", "FABRIC DEFECT", "TWIST/ROPPING/FULLNESS", 
        "UNMATCH/HIGH LOW", "YARNPULL", "INCONSISTENT", "POORSHAPE/POINTED/EXPOSED"
    ];
    
    let activeDefects = {}; 

    function toggleTheme() { 
        document.body.classList.toggle('dark-mode'); 
        const isDark = document.body.classList.contains('dark-mode');
        const logoMatahari = '<img src="logolight.png" style="width: 40px; height: 40px; object-fit: contain;">';
        const logoBulan = '<img src="logodark.png" style="width: 40px; height: 40px; object-fit: contain;">';
        document.getElementById('themeBtn').innerHTML = isDark ? logoMatahari : logoBulan; 
        localStorage.setItem('darkMode', isDark); 
    }
    
    function setDefaultDate() { 
        const d = new Date(); 
        document.getElementById('tanggal').value = validDashboardDate !== "" ? validDashboardDate : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; 
    }
    
    function formatAntiMinus(input) { 
        input.value = input.value.replace(/[^0-9]/g, ''); 
    }

    function calculateShiftHours() {
        let start = document.getElementById('shift_start').value;
        let end = document.getElementById('shift_end').value;
        let displaySpan = document.getElementById('shift_hours');
        
        if(start && end) {
            let t1 = start.split(":"); let t2 = end.split(":");
            let d1 = new Date(2000, 0, 1, parseInt(t1[0],10), parseInt(t1[1],10)); 
            let d2 = new Date(2000, 0, 1, parseInt(t2[0],10), parseInt(t2[1],10));
            if(d2 < d1) d2.setDate(d2.getDate() + 1); 
            
            let diff = (d2 - d1) / (1000 * 60 * 60);
            let hours = Math.floor(diff); let mins = Math.round((diff % 1) * 60);
            displaySpan.innerText = `(${hours} Jam ${mins > 0 ? mins + ' Mnt' : ''})`;
        } else { displaySpan.innerText = ""; }
    }

    function fetchValidationFromGS() {
        if(!SCRIPT_URL) return;
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_validation", version: APP_VERSION }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            if(data.result === "success") {
                validDashboardDate = data.validDate;
                submittedLinesData = data.submittedLines;
                
                if(validDashboardDate !== "") {
                    let tglInput = document.getElementById('tanggal');
                    tglInput.value = validDashboardDate;
                }
            }
        }).catch(err => {
            console.log("Koneksi lambat, gagal memuat validasi dari server awal.");
        });
    }

    function validateDate() {
        let tglEl = document.getElementById('tanggal');
        if (validDashboardDate !== "" && tglEl.value !== validDashboardDate) {
            Swal.fire('Tanggal Tidak Valid', `Anda hanya diizinkan mengisi data untuk tanggal ${validDashboardDate}`, 'warning');
            tglEl.value = validDashboardDate;
            saveData();
        }
    }

    function openLineModal(context) {
        lkhLineContext = context;
        if(context === 'DAILY') {
            document.getElementById('lineModalTitle').innerText = "PILIH NAMA LINE (DAILY)";
        } else if(context === 'LKH') {
            document.getElementById('lineModalTitle').innerText = "PILIH NAMA LINE (LKH)";
        } else {
            document.getElementById('lineModalTitle').innerText = "PILIH NAMA LINE (RANDOM CHECK)";
        }
        renderLineSelection();
        document.getElementById('lineModal').style.display = 'flex';
    }

    function selectLine(line) {
        if (lkhLineContext === 'DAILY' && submittedLinesData.includes(line)) {
            Swal.fire('Line Sudah Diisi', `Data QC untuk Line ${line} sudah ada di Dashboard hari ini!`, 'warning');
            document.getElementById('lineModal').style.display = 'none';
            return;
        }
        document.getElementById('lineModal').style.display = 'none';
        
        if(lkhLineContext === 'DAILY') {
            selectedLineDaily = line;
            document.getElementById('line_name').value = line;
            applyTlsOnlyLogic(); 
            updateBuyerDropdown();
            saveData();
        } else if(lkhLineContext === 'LKH') {
            selectedLineLKH = line;
            document.getElementById('lkh_line_name').value = line;
        } else if(lkhLineContext === 'RC') {
            selectedLineRC = line;
            document.getElementById('rc_line_name').value = line;
            updateRcBuyerDropdown();
        } else {
            selectedLineBTL = line;
            document.getElementById('btl_line_name').value = line;
            updateBtlBuyerDropdown();
        }
    }

    function closeLineModal() { document.getElementById('lineModal').style.display = 'none'; }

    function renderLineSelection() {
        let activeSel = lkhLineContext === 'DAILY' ? selectedLineDaily : (lkhLineContext === 'LKH' ? selectedLineLKH : (lkhLineContext === 'RC' ? selectedLineRC : selectedLineBTL));
        let sortedLines = [...listLineMaster].sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        let gridHtml = sortedLines.map(line => {
            let isSel = (activeSel === line) ? 'selected' : '';
            let isWide = (line === "PREPARATION" || line === "MINILINE") ? 'wide' : '';
            return `<button class="line-btn btn-neo ${isSel} ${isWide}" onclick="selectLine('${line}')">${line}</button>`;
        }).join('');
        document.getElementById('gridLineSelection').innerHTML = gridHtml;
    }

    function calculateLKH() {
        const getV = (id) => parseInt(document.getElementById(id).value) || 0;
        let ass = getV('lkh_ass');
        let sup = getV('lkh_supply');
        let insp = getV('lkh_insp');
        let def = getV('lkh_defect');
        
        let good = insp - def;
        if(good < 0) good = 0; 

        let blc = good - ass;
        let siap = sup - insp;
        let pct = insp > 0 ? ((def/insp)*100).toFixed(1) : 0;

        document.getElementById('lkh_good').value = good;
        document.getElementById('lkh_good_txt').innerText = good;
        
        document.getElementById('lkh_balance').value = blc;
        document.getElementById('lkh_balance_txt').innerText = blc;
        
        document.getElementById('lkh_siapcek').value = siap;
        document.getElementById('lkh_siapcek_txt').innerText = siap;
        
        document.getElementById('lkh_pctdef').value = pct + "%";
        document.getElementById('lkh_pctdef_txt').innerText = pct + "%";
    }

    function submitLKHToServer() {
        if(!SCRIPT_URL) return;
        
        const getV = (id) => parseInt(document.getElementById(id).value) || 0;
        let line = document.getElementById('lkh_line_name').value;
        
        if(!line) { 
            Swal.fire('Perhatian', 'Silakan pilih Nama Line terlebih dahulu!', 'warning'); 
            return; 
        }

        let payload = {
            action: "submit_lkh",
            version: APP_VERSION,
            line: line,
            ass: getV('lkh_ass'),
            sup: getV('lkh_supply'),
            insp: getV('lkh_insp'),
            good: parseInt(document.getElementById('lkh_good').value) || 0,
            def: getV('lkh_defect'),
            blc: parseInt(document.getElementById('lkh_balance').value) || 0,
            siap: parseInt(document.getElementById('lkh_siapcek').value) || 0,
            pct: document.getElementById('lkh_pctdef').value,
            dom: document.getElementById('lkh_dominan').value || "-"
        };

        let btnSub = document.getElementById('btnSubmitLKH');
        btnSub.disabled = true; 
        btnSub.innerHTML = 'MENGIRIM...';
        
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENYIMPAN DATA LKH...";
        
        fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload), 
            headers: {'Content-Type': 'text/plain;charset=utf-8'} 
        })
        .then(r => r.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            btnSub.disabled = false; 
            btnSub.innerHTML = 'SUBMIT LKH KE SERVER';
            
            if(data.result === 'success') {
                Swal.fire('Terkirim!', `Data LKH Line ${line} berhasil disimpan di Server.`, 'success');
                document.getElementById('lkh_line_name').value = "";
                selectedLineLKH = "";
                ['lkh_ass','lkh_supply','lkh_insp','lkh_defect','lkh_dominan'].forEach(id => {
                    document.getElementById(id).value = "";
                });
                calculateLKH();
            } else if (data.error === "VERSION_MISMATCH") {
                Swal.fire('Versi Usang!', 'Aplikasi mendeteksi update. Halaman akan dimuat ulang.', 'error').then(()=>{
                    window.location.reload(true);
                });
            } else {
                Swal.fire('Error', data.error, 'error');
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            btnSub.disabled = false; 
            btnSub.innerHTML = 'SUBMIT LKH KE SERVER';
            Swal.fire('Gagal', 'Koneksi internet bermasalah. Pastikan terhubung internet untuk mengirim LKH.', 'error');
        });
    }

    function generateWaSPV() {
        const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
        
        if (isSpv) {
            fetchLKHFromServer('DEMO'); 
            return;
        }

        Swal.fire({
            title: 'Masukkan Password',
            input: 'password',
            inputPlaceholder: 'Masukkan Password SPV...',
            showCancelButton: true,
            confirmButtonColor: '#0f172a',
            confirmButtonText: 'TARIK DATA LKH'
        }).then(res => {
            if(res.isConfirmed) {
                if(false) {
                    Swal.fire('Ditolak', 'Password salah!', 'error');
                    return;
                }
                fetchLKHFromServer(res.value);
            }
        });
    }

    function fetchLKHFromServer(pwd) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENARIK REKAP LKH...";
        
        const d = new Date();
        const tglSPV = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_lkh", version: APP_VERSION, password: pwd, tgl_spv: tglSPV }), 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(r => r.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === 'success') {
                previewLKHData(data.data);
            } else if (data.error === "VERSION_MISMATCH") {
                Swal.fire('Versi Usang', 'Refresh aplikasi Anda.', 'error');
            } else {
                Swal.fire('Error', data.error, 'error');
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Gagal', 'Koneksi ke server terputus.', 'error');
        });
    }
    
    function previewLKHData(lkhData) {
        if(!lkhData || lkhData.length === 0) {
            Swal.fire('Kosong', 'Belum ada tim QC yang mengirim data LKH hari ini.', 'info');
            return;
        }
        
        let previewHtml = `<div style="text-align:left; font-size:12px; max-height:40vh; overflow-y:auto; background:var(--bg-input); padding:15px; border-radius:4px; border:1px solid var(--border-line); color:var(--text-main); font-family: 'Inter', sans-serif;">`;
        
        lkhData.forEach(d => {
            let textDom = d.dom || "";
            textDom = textDom.split('\n').join('<br>');
            
            previewHtml += `<b style="color:var(--text-main); font-size:14px; font-family:'Outfit', sans-serif;">Line ${d.line}</b><br>Ass: ${d.ass} | Sup: ${d.sup} | Insp: ${d.insp} | Good: ${d.good} | Blc: ${d.blc} | Siap: ${d.siap} | Def: ${d.pct}<br>Dom:<br>${textDom}<br><hr style="border-color:var(--border-line); margin:12px 0;">`;
        });
        
        previewHtml += `</div>`;

        Swal.fire({
            title: 'DATA LKH SEMENTARA',
            html: previewHtml,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'ACC & BUAT WA',
            cancelButtonText: 'BATAL'
        }).then(res => {
            if(res.isConfirmed) {
                promptWADateTime(lkhData);
            }
        });
    }

    function promptWADateTime(lkhData) {
        const today = new Date();
        const defDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const defTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

        Swal.fire({
            title: 'WAKTU REPORT',
            html: `
                <div style="text-align:left; font-size:12px; margin-bottom:10px;">Atur Tanggal dan Jam untuk Pesan WA:</div>
                <div style="display:flex; gap:10px;">
                    <input type="date" id="swal-lkh-date" class="swal2-input" value="${defDate}" style="margin:0; width:50%; font-size:14px;">
                    <input type="time" id="swal-lkh-time" class="swal2-input" value="${defTime}" style="margin:0; width:50%; font-size:14px;">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#0f172a',
            confirmButtonText: 'COPY WA',
            preConfirm: () => {
                return {
                    date: document.getElementById('swal-lkh-date').value,
                    time: document.getElementById('swal-lkh-time').value
                }
            }
        }).then(res => {
            if(res.isConfirmed) {
                formatAndCopyWA(lkhData, res.value.date, res.value.time);
            }
        });
    }

    function formatAndCopyWA(lkhData, dateStr, timeStr) {
        let dArr = dateStr.split('-');
        let fmtDate = `${dArr[1]}/${dArr[2]}`; 
        
        let waText = `*UPDATE MONITORING LINE CONDITION*\n\nDate: ${fmtDate}\n*Dear: B. Dami, B. Jume, B. Supatemi, B. Maria, B. Trilestari, B. Umi, B. Purti, B. Faidah, B. Yuni*\nCc : B. Yayuk, P. Anto\nCc : P. Yogi, P. Budi\n\nBerikut Kami sampaikan Update Condition per line in Sewing:\n\n*UPDATE AT ${timeStr}*\n\n`;

        let sortedData = lkhData.sort((a,b) => a.line.localeCompare(b.line, undefined, {numeric: true, sensitivity: 'base'}));

        sortedData.forEach(d => {
            waText += `Line ${d.line}\nAss.    : ${d.ass}\nSupply : ${d.sup}\nInsp.   : ${d.insp}\nGood.  : ${d.good}\nBlc.     : ${d.blc}\nSiap cek: ${d.siap}\n%Def.  : ${d.pct}\nDominan defect :\n${d.dom}\n\n`;
        });

        waText += `Thanks\nRegards\nRafi, Tya`;

        navigator.clipboard.writeText(waText).then(() => {
            Swal.fire({
                title: 'Berhasil di-Copy!',
                html: `<textarea readonly style="width:100%; height:150px; font-size:13px; padding:12px; border-radius:4px; border:1px solid var(--border-line); background:var(--bg-input); font-family: 'Inter', sans-serif;">${waText}</textarea>`,
                icon: 'success'
            });
        }).catch(err => {
            Swal.fire('Gagal Copy', 'Browser Anda tidak mengizinkan Auto-Copy. Silakan copy manual teks di bawah:\n\n' + waText, 'error');
        });
    }

    let dynamicDB = [];

    function buildDatabase(serverRows = null) {
        dynamicDB = [];
        let rows = serverRows ? serverRows : (JSON.parse(localStorage.getItem('cached_dbbuyer_sew')) || []);
        if (serverRows) localStorage.setItem('cached_dbbuyer_sew', JSON.stringify(rows));

        if (rows.length > 1) { 
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][1]) {
                    dynamicDB.push({
                        buyer: rows[i][0].toString().trim().toUpperCase(),
                        style: rows[i][1].toString().trim().toUpperCase()
                    });
                }
            }
        }
        updateBuyerDropdown();
    }

    function fetchMasterDataFromServer() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "SINKRONISASI DATA BUYER...";
        fetch(SCRIPT_URL, {
         method: 'POST', body: JSON.stringify({ action: "get_master_data", version: APP_VERSION }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") {
                buildDatabase(data.data); 
                updateBuyerDropdown(); 
                
                const saved = JSON.parse(localStorage.getItem('qcAutoSave_sew') || '{}');
                if(saved.buyer_select) {
                    let sel = document.getElementById('buyer_select');
                    if(Array.from(sel.options).some(o => o.value === saved.buyer_select)) { 
                        sel.value = saved.buyer_select; 
                    }
                    updateStyleDropdown();
                    
                    if(saved.style_select) {
                        let selS = document.getElementById('style_select'); 
                        if(Array.from(selS.options).some(o => o.value === saved.style_select)) { 
                            selS.value = saved.style_select; 
                        }
                    }
                }
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none'; 
            buildDatabase(); 
            updateBuyerDropdown();
        });
    }

    function updateBuyerDropdown() {
        const sel = document.getElementById('buyer_select'); 
        if (!sel) return;

        let mappedBuyers = [...new Set(dynamicDB.map(r => r.buyer))].filter(Boolean).sort();

        if (mappedBuyers.length > 0) {
            sel.innerHTML = '<option value="" disabled selected>-- Pilih Buyer --</option>' + 
                            mappedBuyers.map(b => `<option value="${b}">${b}</option>`).join('');
        } else {
            sel.innerHTML = '<option value="" disabled selected>-- Menunggu Sinkronisasi... --</option>';
        }
        
        updateStyleDropdown();
    }

    function handleBuyerChange() {
        updateStyleDropdown(); 
        saveData();
    }

    function updateStyleDropdown() {
        const selBuyer = document.getElementById('buyer_select'); 
        let buyer = selBuyer.value;
        const sel = document.getElementById('style_select'); 
        
        if (!sel) return;
        
        let currentVal = sel.value;
        sel.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>';
        
        if (buyer) {
            let validStyles = [...new Set(dynamicDB.filter(row => row.buyer === buyer).map(row => row.style))].filter(Boolean).sort();
            validStyles.forEach(s => { sel.innerHTML += `<option value="${s}">${s}</option>`; });

            if (validStyles.includes(currentVal) && currentVal !== "") { 
                sel.value = currentVal; 
            } else { 
                sel.value = ""; 
            }
        }
    }

    function handleStyleChange() {
        saveData();
    }

    function initDropdowns() {
        let htmlQC = '<option value="" disabled selected>-- Pilih --</option><option value="-" style="color:var(--danger);">TIDAK ADA/KOSONG</option>';
        listQC.forEach(qc => { htmlQC += `<option value="${qc}">${qc}</option>`; });
        document.getElementById('qc_inline').innerHTML = htmlQC;
        document.getElementById('qc_endline').innerHTML = htmlQC;
        document.getElementById('rc_qc').innerHTML = htmlQC;
        document.getElementById('btl_qc').innerHTML = htmlQC;

        let sortedInspectors = [...listQCInspectorRC].sort((a, b) => a.localeCompare(b));
        let htmlInspector = '<option value="" disabled selected>-- Pilih --</option>';
        sortedInspectors.forEach(nm => { htmlInspector += `<option value="${nm}">${nm}</option>`; });
        document.getElementById('rc_inspector').innerHTML = htmlInspector;

        let selArea = document.getElementById('sel_area');
        let selType = document.getElementById('sel_type');
        let rcSelArea = document.getElementById('rc_sel_area');
        let rcSelType = document.getElementById('rc_sel_type');
        
        selArea.innerHTML = '<option value="" disabled selected>-- Pilih Area --</option>';
        if(rcSelArea) rcSelArea.innerHTML = '<option value="" disabled selected>-- Pilih Area --</option>';
        
        let sortedAreas = defectAreas.map((name, index) => ({ name, index })).sort((a, b) => a.name.localeCompare(b.name));
        sortedAreas.forEach((obj) => { 
            selArea.innerHTML += `<option value="${obj.index}">${obj.name}</option>`; 
            if(rcSelArea) rcSelArea.innerHTML += `<option value="${obj.index}">${obj.name}</option>`; 
        });

        let defaultTypeHTML = '<option value="" disabled selected>-- Pilih Jenis --</option>';
        let sortedTypes = defectTypes.map((name, index) => ({ name, index })).sort((a, b) => a.name.localeCompare(b.name));
        sortedTypes.forEach((obj) => { defaultTypeHTML += `<option value="${obj.index}">${obj.name}</option>`; });
        
        selType.innerHTML = defaultTypeHTML;
        selType.setAttribute('data-default', defaultTypeHTML); 
        if(rcSelType) {
            rcSelType.innerHTML = defaultTypeHTML;
            rcSelType.setAttribute('data-default', defaultTypeHTML);
        }
        
        selArea.addEventListener('change', function() {
            let aIdx = this.value;
            let areaName = defectAreas[aIdx];
            let typeSelect = document.getElementById('sel_type');
            if (areaName === "TRIMMING") {
                typeSelect.innerHTML = `<option value="SP_TRIM" selected>TRIMMING</option>`;
                typeSelect.style.pointerEvents = "none"; typeSelect.style.opacity = "0.5"; 
            } else if (areaName === "STAIN") {
                typeSelect.innerHTML = `<option value="SP_STN" selected>STAIN</option>`;
                typeSelect.style.pointerEvents = "none"; typeSelect.style.opacity = "0.5"; 
            } else if (areaName === "MEASUREMENT") {
                typeSelect.innerHTML = `<option value="SP_MEAS" selected>MEASUREMENT</option>`;
                typeSelect.style.pointerEvents = "none"; typeSelect.style.opacity = "0.5"; 
            } else {
                typeSelect.innerHTML = typeSelect.getAttribute('data-default');
                typeSelect.value = ""; typeSelect.style.pointerEvents = "auto"; typeSelect.style.opacity = "1";
            }
        });

        if(rcSelArea) {
            rcSelArea.addEventListener('change', function() {
                let aIdx = this.value;
                let areaName = defectAreas[aIdx];
                let typeSelect = document.getElementById('rc_sel_type');
                if (areaName === "TRIMMING") {
                    typeSelect.innerHTML = `<option value="SP_TRIM" selected>TRIMMING</option>`;
                    typeSelect.style.pointerEvents = "none"; typeSelect.style.opacity = "0.5"; 
                } else if (areaName === "STAIN") {
                    typeSelect.innerHTML = `<option value="SP_STN" selected>STAIN</option>`;
                    typeSelect.style.pointerEvents = "none"; typeSelect.style.opacity = "0.5"; 
                } else if (areaName === "MEASUREMENT") {
                    typeSelect.innerHTML = `<option value="SP_MEAS" selected>MEASUREMENT</option>`;
                    typeSelect.style.pointerEvents = "none"; typeSelect.style.opacity = "0.5"; 
                } else {
                    typeSelect.innerHTML = typeSelect.getAttribute('data-default');
                    typeSelect.value = ""; typeSelect.style.pointerEvents = "auto"; typeSelect.style.opacity = "1";
                }
            });
        }
    }

    function addDefectToList() {
        let aIdx = document.getElementById('sel_area').value;
        let tIdx = document.getElementById('sel_type').value;
        
        if(aIdx === "" || tIdx === "") {
            Swal.fire('Perhatian', 'Pilih Area dan Jenis Defect terlebih dahulu.', 'warning'); 
            return;
        }

        let key = `${aIdx}_${tIdx}`;
        if(activeDefects[key]) {
            Swal.fire('Info', 'Defect ini sudah ada di daftar rangkuman.', 'info'); 
            return;
        }

        activeDefects[key] = { aIdx: aIdx, tIdx: tIdx, tls: "", qty100: "" };
        
        document.getElementById('sel_area').value = "";
        let typeSelect = document.getElementById('sel_type');
        typeSelect.innerHTML = typeSelect.getAttribute('data-default');
        typeSelect.value = "";
        typeSelect.style.pointerEvents = "auto";
        typeSelect.style.opacity = "1";
        
        renderDefectList();
        if (window.navigator && window.navigator.vibrate) navigator.vibrate(50);
    }

    function renderDefectList() {
        let container = document.getElementById('active_defects_container');
        let html = "";
        let count = 0;
        
        let isTlsOnly = TLS_ONLY_LINES.includes(selectedLineDaily);
        let disable100 = isTlsOnly ? 'style="opacity:0.3; pointer-events:none;"' : '';

        for(let key in activeDefects) {
            count++;
            let item = activeDefects[key];
            let areaName = defectAreas[item.aIdx];
            
            let typeName = "";
            if(item.tIdx === "SP_TRIM") typeName = "TRIMMING";
            else if(item.tIdx === "SP_STN") typeName = "STAIN";
            else if(item.tIdx === "SP_MEAS") typeName = "MEASUREMENT";
            else typeName = defectTypes[item.tIdx];

            html += `
            <div class="summary-card" id="card_${key}">
                <div class="summary-header">
                    <div class="summary-title">
                        <span>${areaName}</span>
                        <span class="summary-subtitle">↳ ${typeName}</span>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="btn-del btn-neo" style="background:var(--accent);border-color:var(--accent);" onclick="showDefectInfo('${typeName.replace(/'/g, "\\'")}','${areaName.replace(/'/g, "\\'")}')">?</button>
                        <button class="btn-del btn-neo" onclick="removeDefect('${key}')">X</button>
                    </div>
                </div>
                <div class="flex-inputs">
                    <div class="stepper">
                        <button onclick="adjVal('${key}', 'tls', -1)">-</button>
                        <input type="number" id="inp_tls_${key}" value="${item.tls}" oninput="manualInput('${key}', 'tls', this.value)" placeholder="TLS">
                        <button onclick="adjVal('${key}', 'tls', 1)">+</button>
                    </div>
                    <div class="stepper" ${disable100}>
                        <button onclick="adjVal('${key}', 'qty100', -1)">-</button>
                        <input type="number" id="inp_100_${key}" value="${item.qty100}" oninput="manualInput('${key}', 'qty100', this.value)" placeholder="100%">
                        <button onclick="adjVal('${key}', 'qty100', 1)">+</button>
                    </div>
                </div>
            </div>`;
        }

        if(count === 0) {
            container.innerHTML = `<div class="empty-state" id="empty_state">BELUM ADA DEFECT YANG DITAMBAHKAN.<br><span style="font-weight:600; font-size:11px; margin-top: 8px; display:block; text-transform:none;">Silakan pilih Area & Jenis di atas lalu klik Tambahkan.</span></div>`;
        } else {
            container.innerHTML = html;
        }
        calculate();
    }

    function adjVal(key, field, amount) {
        let val = parseInt(activeDefects[key][field]) || 0;
        let newVal = val + amount;
        if(newVal < 0) newVal = 0;
        
        activeDefects[key][field] = newVal > 0 ? newVal : "";
        document.getElementById(field === 'tls' ? `inp_tls_${key}` : `inp_100_${key}`).value = newVal > 0 ? newVal : "";
        if (window.navigator && window.navigator.vibrate) navigator.vibrate(40); 
        calculate();
    }

    function manualInput(key, field, value) {
        let cleanVal = value.replace(/[^0-9]/g, '');
        let num = parseInt(cleanVal) || 0;
        activeDefects[key][field] = num > 0 ? num : "";
        document.getElementById(field === 'tls' ? `inp_tls_${key}` : `inp_100_${key}`).value = num > 0 ? num : "";
        calculate();
    }

    function removeDefect(key) { 
        delete activeDefects[key]; 
        renderDefectList(); 
    }

    function calculate() {
        let totalSumTls = 0, totalSum100 = 0;
        for(let key in activeDefects) {
            totalSumTls += parseInt(activeDefects[key].tls) || 0;
            totalSum100 += parseInt(activeDefects[key].qty100) || 0;
        }

        let ttls = document.getElementById('tot_def_tls'); 
        if(ttls) ttls.value = totalSumTls;
        
        let t100 = document.getElementById('tot_def_100'); 
        if(t100) t100.value = totalSum100;

        let elInspTls = document.getElementById('qty_insp_tls');
        const inspTls = elInspTls ? (parseInt(elInspTls.value) || 0) : 0;
        
        let elInsp100 = document.getElementById('qty_insp_100');
        const insp100 = elInsp100 ? (parseInt(elInsp100.value) || 0) : 0;
        
        let pTls = document.getElementById('pct_def_tls'); 
        if(pTls) {
            pTls.value = inspTls > 0 ? ((totalSumTls / inspTls) * 100).toFixed(1) + "%" : "0%";
        }
        
        let p100 = document.getElementById('pct_def_100');
        if(p100) {
            p100.value = insp100 > 0 ? ((totalSum100 / insp100) * 100).toFixed(1) + "%" : "0%";
        }
        
        let isTlsOnly = TLS_ONLY_LINES.includes(selectedLineDaily);
        let totalInspChart = isTlsOnly ? inspTls : insp100;
        let totalDefChart = isTlsOnly ? totalSumTls : totalSum100;
        let totalGoodChart = totalInspChart - totalDefChart;
        
        if(totalGoodChart < 0) totalGoodChart = 0;

        let goodPctStr = totalInspChart > 0 ? ((totalGoodChart / totalInspChart) * 100).toFixed(1) + "%" : "0%";

        let cg = document.getElementById('chart_good'); 
        if(cg) cg.innerText = `${totalGoodChart} (${goodPctStr})`; 
        
        let cd = document.getElementById('chart_def'); 
        if(cd) cd.innerText = totalDefChart; 
        
        let pctLabel = document.getElementById('chart_pct');
        if(pctLabel) {
            if (totalInspChart === 0) {
                pctLabel.innerText = "0% DEFECT";
                pctLabel.style.color = "var(--text-sub)";
                if(defectChart) {
                    defectChart.data.datasets[0].data = [1, 0]; 
                    defectChart.data.datasets[0].backgroundColor = ['#cbd5e1', '#ef4444'];
                    defectChart.update();
                }
            } else {
                let overAllDefPct = (((totalDefChart) / totalInspChart) * 100).toFixed(1);
                pctLabel.innerText = overAllDefPct + "% DEFECT"; 
                pctLabel.style.color = totalDefChart > 0 ? "var(--danger)" : "var(--success)";
                if(defectChart) {
                    defectChart.data.datasets[0].data = [totalGoodChart, totalDefChart]; 
                    defectChart.data.datasets[0].backgroundColor = ['#10b981', '#ef4444'];
                    defectChart.update();
                }
            }
        }
        saveData(); 
    }

    function saveData() { 
        const data = {}; 
        document.querySelectorAll('#view-daily input, #view-daily select').forEach(input => { 
            if(input.id && !input.readOnly && !input.id.startsWith('inp_') && !input.id.endsWith('_select')) {
                data[input.id] = input.value; 
            }
            if (input.id === 'buyer_select' || input.id === 'style_select') {
                data[input.id] = input.value;
            }
        }); 
        localStorage.setItem('qcActiveDefects_sew', JSON.stringify(activeDefects));
        localStorage.setItem('qcAutoSave_sew', JSON.stringify(data)); 
        localStorage.setItem('qcSavedLine_sew', document.getElementById('line_name').value);
    }
    
    function loadData() { 
        initDropdowns(); 
        initChart(); 
        
        fetchMasterDataFromServer();
        fetchValidationFromGS();

        const savedLKH = localStorage.getItem('qcLkhData_sew');
        if(savedLKH) { dataLKH = JSON.parse(savedLKH); }

        const saved = JSON.parse(localStorage.getItem('qcAutoSave_sew') || '{}');
        const activeDefRaw = localStorage.getItem('qcActiveDefects_sew');
        const savedLine = localStorage.getItem('qcSavedLine_sew');

        if(activeDefRaw && activeDefRaw !== "undefined") {
            activeDefects = JSON.parse(activeDefRaw); 
            renderDefectList(); 
        } else {
            activeDefects = {};
        }
        
        if(saved && Object.keys(saved).length > 0) { 
            document.querySelectorAll('#view-daily input, #view-daily select').forEach(input => { 
                if(saved[input.id] !== undefined && !['buyer_select', 'style_select', 'color'].includes(input.id)) {
                    input.value = saved[input.id]; 
                }
            }); 
            calculateShiftHours(); 
            calculate(); 
        } 
        
        if(savedLine) {
            document.getElementById('line_name').value = savedLine;
            selectedLineDaily = savedLine;
            applyTlsOnlyLogic();
        }

        if(!saved.tanggal) { setDefaultDate(); } 
        
        const logoMatahari = '<img src="logolight.png" style="width: 40px; height: 40px; object-fit: contain;">';
        const logoBulan = '<img src="logodark.png" style="width: 40px; height: 40px; object-fit: contain;">';

        if(localStorage.getItem('darkMode') === 'true') { 
            document.body.classList.add('dark-mode'); 
            document.getElementById('themeBtn').innerHTML = logoMatahari;
        } else {
            document.getElementById('themeBtn').innerHTML = logoBulan;
        }
        checkOfflineBadge();
    }

    function showSummaryAndSubmit() {
        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
        
        const line = getVal('line_name'); 
        const buyer = getVal('buyer_select'); 
        const status = getVal('status');
        const qcInline = getVal('qc_inline');
        const qcEndline = getVal('qc_endline');

        const t_tls = parseInt(getVal('tot_def_tls')) || 0; 
        const t_100 = parseInt(getVal('tot_def_100')) || 0;
        const i_tls = parseInt(getVal('qty_insp_tls')) || 0; 
        const i_100 = parseInt(getVal('qty_insp_100')) || 0;

        let isTlsOnly = TLS_ONLY_LINES.includes(line);

        if (submittedLinesData.includes(line)) {
            Swal.fire('Ditolak', `Data untuk Line ${line} sudah disubmit hari ini, tidak bisa ditumpuk!`, 'error');
            return;
        }

        if((!qcInline || qcInline === "") && (!isTlsOnly && (!qcEndline || qcEndline === ""))) {
            Swal.fire('Perhatian', 'Minimal satu Nama QC wajib diisi!', 'warning'); 
            return;
        }

        if(!line || status === "") { 
            Swal.fire('Perhatian', 'Kolom STATUS PRODUKSI dan NAMA LINE wajib diisi!', 'warning'); 
            return; 
        }

        if(!isTlsOnly && (!buyer || buyer === "")) {
            Swal.fire('Perhatian', 'Kolom BUYER wajib diisi untuk line standar!', 'warning'); 
            return;
        }

        if(t_tls > 0 && i_tls === 0) { 
            Swal.fire('Data Tidak Valid', 'Jumlah Defect TLS ada isinya, tapi QTY INSPECT TLS masih KOSONG.', 'error'); 
            return; 
        }
        if(!isTlsOnly && (t_100 > 0 && i_100 === 0)) { 
            Swal.fire('Data Tidak Valid', 'Jumlah Defect 100% ada isinya, tapi QTY INSPECT 100% masih KOSONG.', 'error'); 
            return; 
        }

        if(t_tls > i_tls || (!isTlsOnly && t_100 > i_100)) { 
            Swal.fire('Data Tidak Valid', 'Mustahil Jumlah Defect lebih banyak dari Jumlah Baju yang di-Inspect!', 'error'); 
            return; 
        }

        Swal.fire({
            title: 'KONFIRMASI REKAP',
            html: `Pastikan data akhir shift ini benar:<br><br><b>Status:</b> ${status}<br><b>Line:</b> ${line} | <b>Buyer:</b> ${buyer || "-"}<br><b>Total Inspect (TLS${isTlsOnly ? '' : '/100'}):</b> ${i_tls} ${isTlsOnly ? '' : '/ ' + i_100}<br><b>Total Defect:</b> <span style="color:red; font-weight:bold;">${t_tls} ${isTlsOnly ? '' : '/ ' + t_100}</span><br><hr>Apakah sudah sesuai untuk dikirim?`,
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#dc2626', 
            confirmButtonText: 'Ya, Kirim Sekarang!', 
            cancelButtonText: 'Cek Lagi'
        }).then((result) => { 
            if (result.isConfirmed) {
                executeSendToServer(line, isTlsOnly); 
            }
        });
    }

    function checkOfflineBadge() {
        localStorage.removeItem('qcOfflineQueue');
        let btnSync = document.getElementById('btnSync');
        if(btnSync) btnSync.style.display = 'none';
    }

    function executeSendToServer(line, isTlsOnly) {
        if(!SCRIPT_URL) { 
            fallbackOffline(line, {}); 
            return; 
        }

        let btnSub = document.getElementById('btnSubmitMain');
        btnSub.disabled = true; 
        btnSub.innerHTML = 'MENGIRIM...';
        
        document.getElementById('loading').style.display = 'flex'; 
        document.getElementById('loading-text').innerText = "SYNC TO CLOUD...";

        let defectsArray = [];
        for(let key in activeDefects) {
            let item = activeDefects[key];
            
            let tName = "";
            if (item.tIdx === "SP_TRIM") tName = "TRIMMING";
            else if (item.tIdx === "SP_STN") tName = "STAIN";
            else if (item.tIdx === "SP_MEAS") tName = "MEASUREMENT";
            else tName = defectTypes[item.tIdx];

            defectsArray.push({
                area: defectAreas[item.aIdx], 
                type: tName,
                tls: parseInt(item.tls) || 0, 
                qty100: isTlsOnly ? 0 : (parseInt(item.qty100) || 0)
            });
        }

        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

        let i_100 = parseInt(getVal('qty_insp_100')) || 0;
        let t_100 = parseInt(getVal('tot_def_100')) || 0;
        let i_tls = parseInt(getVal('qty_insp_tls')) || 0; 
        let t_tls = parseInt(getVal('tot_def_tls')) || 0; 

        let qtyProd = 0;
        if(isTlsOnly) {
            qtyProd = i_tls - t_tls;
        } else {
            qtyProd = i_100 - t_100;
        }
        if(qtyProd < 0) qtyProd = 0;

        let valInline = getVal('qc_inline');
        let valEndline = getVal('qc_endline');

        const payload = {
            action: "submit",
            version: APP_VERSION,
            qc_inline: valInline === "-" ? "" : valInline,
            qc_endline: isTlsOnly ? "" : (valEndline === "-" ? "" : valEndline),
            status: getVal('status'),
            tanggal: getVal('tanggal'), 
            line_name: line, 
            shift_start: getVal('shift_start'), 
            shift_end: getVal('shift_end'),
            buyer: getVal('buyer_select') || "-", 
            style: getVal('style_select') || "-",
            color: "-", 
            jam_istirahat: getVal('jam_istirahat') || "0",
            qty_prod: qtyProd, 
            tot_def_tls: t_tls, 
            tot_def_100: isTlsOnly ? 0 : t_100,
            qty_insp_tls: i_tls, 
            qty_insp_100: isTlsOnly ? 0 : i_100,
            pct_def_tls: getVal('pct_def_tls') || "0%", 
            pct_def_100: isTlsOnly ? "0%" : (getVal('pct_def_100') || "0%"),
            qty_trans: getVal('qty_trans') || "0",
            keterangan: getVal('keterangan'), 
            defects: defectsArray
        };

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none'; 
            btnSub.disabled = false; 
            btnSub.innerHTML = 'CONFIRM & SUBMIT';
            
            if(data.result === "success") { 
                Swal.fire('Sukses', 'Data Line ' + line + ' berhasil disinkronisasi ke Dashboard!', 'success').then(() => { 
                    clearAfterSubmit(); 
                }); 
            } else if(data.error === "VERSION_MISMATCH") {
                let queue = JSON.parse(localStorage.getItem('qcOfflineQueue') || '[]'); 
                queue.shift(); 
                localStorage.setItem('qcOfflineQueue', JSON.stringify(queue));
                Swal.fire('Versi Usang!', 'Antrean ditolak server karena versi lama. Memperbarui otomatis...', 'error').then(() => {
                    window.location.reload(true); 
                });
                checkOfflineBadge();
                if(queue.length > 0) pushOfflineData();
            } else { 
                Swal.fire('Gagal', 'Coba lagi nanti.', 'error'); 
            }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; 
            btnSub.disabled = false; 
            btnSub.innerHTML = 'CONFIRM & SUBMIT';
            fallbackOffline(line, payload);
        });
    }

    function fallbackOffline(line, payload) {
        Swal.fire('Gagal Terkirim', 'Koneksi internet bermasalah. Data TIDAK tersimpan. Silakan cek sinyal lalu submit ulang.', 'error');
    }

    function clearAfterSubmit() {
        activeDefects = {}; 
        renderDefectList();
        
        ['line_name','status','buyer_select','style_select','shift_start','shift_end','qty_insp_tls','qty_insp_100','qty_trans','keterangan'].forEach(id => { 
            let el = document.getElementById(id); 
            if(el) el.value = ""; 
        });
        
        let bs = document.getElementById('buyer_select'); 
        if(bs) {
            bs.innerHTML = '<option value="" disabled selected>-- Pilih Line Dulu --</option>'; 
            bs.style.display='block';
        }
        
        let ss = document.getElementById('style_select'); 
        if(ss) {
            ss.innerHTML = '<option value="" disabled selected>-- Pilih Buyer Dulu --</option>'; 
            ss.style.display='block';
        }

        selectedLineDaily = ""; 
        let sh = document.getElementById('shift_hours'); 
        if(sh) sh.innerText = "";
        
        applyTlsOnlyLogic(); 
        calculate(); 
        saveData();
    }

    function pushOfflineData() {
        localStorage.removeItem('qcOfflineQueue');
    }

    window.toggleLineInputs = function(chk, line) {
        let inputs = document.getElementById('r-inputs-' + line);
        if(chk.checked) {
            inputs.style.opacity = '0.3';
            inputs.style.pointerEvents = 'none';
            document.getElementById('target-' + line).value = "";
        } else {
            inputs.style.opacity = '1';
            inputs.style.pointerEvents = 'auto';
        }
    }

    function openSpvMenu() {
        const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
        
        if (isSpv) {
            currentSpvPassword = 'DEMO'; 
            document.getElementById('spvMenuModal').style.display = 'flex';
            backToSpvMainMenu();
            return;
        }

        Swal.fire({
            title: 'AKSES SUPERVISOR', 
            input: 'password', 
            inputPlaceholder: 'Ketik Password...',
            inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
            showCancelButton: true, 
            confirmButtonColor: '#0f172a', 
            confirmButtonText: 'MASUK', 
            cancelButtonText: 'BATAL'
        }).then((result) => {
            if (result.isConfirmed) {
                if (true) {
                    currentSpvPassword = result.value;
                    document.getElementById('spvMenuModal').style.display = 'flex';
                    backToSpvMainMenu();
                } else {
                    Swal.fire('Akses Ditolak', 'Password Salah!', 'error');
                }
            }
        });
    }

    function showExportMenu() {
        document.getElementById('spvMainMenu').style.display = 'none';
        document.getElementById('spvExportMenu').style.display = 'block';
        document.getElementById('spvModalTitle').innerText = "EXPORT LAPORAN (EXCEL)";
    }

    function backToSpvMainMenu() {
        document.getElementById('spvExportMenu').style.display = 'none';
        document.getElementById('spvMainMenu').style.display = 'block';
        document.getElementById('spvModalTitle').innerText = "MENU SUPERVISOR";
    }

    function closeSpvMenu() {
        document.getElementById('spvMenuModal').style.display = 'none';
        setTimeout(() => { backToSpvMainMenu(); }, 300);
    }

    function triggerTutupShift() {
        closeSpvMenu();
        fetchDailySummary(currentSpvPassword);
    }

    function openMasterDataModal() {
        closeSpvMenu();
        setTimeout(() => {
            const buyers = [...new Set(dynamicDB.map(r => r.buyer))].sort();
            const buyerOpts = buyers.map(b => `<option value="${b}">${b}</option>`).join('');

            Swal.fire({
                title: 'KELOLA MASTER DATA',
                html: `
                    <div style="text-align:left; display:flex; flex-direction:column; gap:10px;">
                        <label style="font-size:11px; font-weight:800; font-family:'Inter', sans-serif;">1. PILIH BUYER:</label>
                        <select id="sw-b" class="swal2-select" style="width:100%; margin:0;" onchange="updateSwalStyles(this.value)">
                            <option value="" disabled selected>-- Pilih --</option>
                            ${buyerOpts}
                            <option value="MANUAL" style="color:var(--danger); font-weight:800;">+ KETIK BUYER BARU</option>
                        </select>
                        <input id="sw-b-manual" class="swal2-input" placeholder="Nama Buyer Baru..." style="display:none; margin:0; width:100%; text-transform:uppercase;">

                        <label style="font-size:11px; font-weight:800; margin-top:10px; font-family:'Inter', sans-serif;">2. PILIH STYLE:</label>
                        <select id="sw-s" class="swal2-select" style="width:100%; margin:0;" onchange="toggleManualStyle(this.value)">
                            <option value="" disabled selected>-- Pilih Buyer Dulu --</option>
                        </select>
                        <input id="sw-s-manual" class="swal2-input" placeholder="Nama Style Baru..." style="display:none; margin:0; width:100%; text-transform:uppercase;">

                        <label style="font-size:11px; font-weight:800; margin-top:10px; font-family:'Inter', sans-serif;">3. AKSI DATABASE:</label>
                        <select id="sw-action" class="swal2-select" style="width:100%; margin:0;">
                            <option value="add" selected>TAMBAH / UPDATE DATA</option>
                            <option value="delete" style="color:var(--danger); font-weight:800;">HAPUS DATA</option>
                        </select>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#0f172a',
                confirmButtonText: 'KIRIM KE SERVER',
                didOpen: () => {
                    window.updateSwalStyles = (b) => {
                        const bInp = document.getElementById('sw-b-manual');
                        const sSel = document.getElementById('sw-s');
                        const sInp = document.getElementById('sw-s-manual');

                        if(b === 'MANUAL') {
                            bInp.style.display = 'block';
                            sSel.innerHTML = '<option value="MANUAL" selected>+ KETIK STYLE BARU</option>';
                            window.toggleManualStyle('MANUAL');
                        } else {
                            bInp.style.display = 'none';
                            const filteredStyles = [...new Set(dynamicDB.filter(x => x.buyer === b).map(x => x.style))].sort();
                            sSel.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>' +
                                             filteredStyles.map(s => `<option value="${s}">${s}</option>`).join('') +
                                             '<option value="MANUAL" style="color:var(--danger); font-weight:800;">+ KETIK STYLE BARU</option>';
                            sInp.style.display = 'none';
                        }
                    };

                    window.toggleManualStyle = (s) => {
                        document.getElementById('sw-s-manual').style.display = (s === 'MANUAL') ? 'block' : 'none';
                    };
                },
                preConfirm: () => {
                    const bSel = document.getElementById('sw-b').value;
                    const bMan = document.getElementById('sw-b-manual').value.trim().toUpperCase();
                    const sSel = document.getElementById('sw-s').value;
                    const sMan = document.getElementById('sw-s-manual').value.trim().toUpperCase();
                    const dbAction = document.getElementById('sw-action').value;

                    const finalB = (bSel === 'MANUAL') ? bMan : bSel;
                    const finalS = (sSel === 'MANUAL') ? sMan : sSel;

                    if(!finalB || !finalS) {
                        Swal.showValidationMessage('Buyer dan Style wajib diisi!');
                        return false;
                    }

                    return { action: "add_custom_data", buyer: finalB, style: finalS, mode: dbAction, version: APP_VERSION };
                }
            }).then(res => {
                if(res.isConfirmed) {
                    sendMasterDataToServer(res.value);
                }
            });
        }, 300);
    }

    function sendMasterDataToServer(payload) {
        document.getElementById('loading').style.display = 'flex';
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(r => r.json())
        .then(d => {
            document.getElementById('loading').style.display = 'none';
            if(d.result === "success") {
                let msg = payload.mode === 'delete' ? 'Data berhasil dihapus.' : 'Data tersimpan di server.';
                Swal.fire({
                    title: 'Berhasil!',
                    text: msg,
                    icon: 'success',
                    timer: 1200,
                    showConfirmButton: false
                });
                refreshMasterDataThenReopen();
            } else {
                Swal.fire('Error', d.error || 'Terjadi kesalahan.', 'error');
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Gagal', 'Koneksi ke server bermasalah.', 'error');
        });
    }

    function refreshMasterDataThenReopen() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "SINKRONISASI DATA BUYER...";
        fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: "get_master_data", version: APP_VERSION }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") {
                buildDatabase(data.data);
                updateBuyerDropdown();
            }
            openMasterDataModal();
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            openMasterDataModal();
        });
    }

    function openDeleteSheetModal() {
        closeSpvMenu();
        
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENCARI SHEET...";
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_deletable_sheets", version: APP_VERSION, password: currentSpvPassword }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === "success") {
                if (data.data.length === 0) {
                    Swal.fire('Info', 'Tidak ada sheet yang memenuhi kriteria untuk dihapus.', 'info');
                } else {
                    showDeleteCheckboxes(data.data);
                }
            } else {
                Swal.fire('Error', data.error, 'error');
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Gagal', 'Koneksi bermasalah.', 'error');
        });
    }

    function showDeleteCheckboxes(sheets) {
        let listHtml = sheets.map(s => `
            <label style="display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:14px; font-weight:800; color:var(--text-main); background:var(--bg-input); padding:12px; border-radius:4px; border:1px solid var(--border-line);">
                <input type="checkbox" class="del-sheet-chk" value="${s}" checked style="width:20px; height:20px; accent-color:var(--danger);">
                ${s}
            </label>
        `).join('');

        Swal.fire({
            title: 'PILIH SHEET DIHAPUS',
            html: `<div style="text-align:left; font-size:12px; color:var(--danger); margin-bottom:12px; font-weight:800;">PERINGATAN: Pastikan Anda sudah Backup Data bulan ini!</div>
                   <div style="max-height: 40vh; overflow-y: auto;">${listHtml}</div>`,
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'HAPUS TERPILIH',
            cancelButtonText: 'BATAL',
            preConfirm: () => {
                let checkboxes = document.querySelectorAll('.del-sheet-chk:checked');
                let selected = Array.from(checkboxes).map(chk => chk.value);
                if (selected.length === 0) {
                    Swal.showValidationMessage('Pilih minimal 1 sheet untuk dihapus!');
                    return false;
                }
                return selected;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                executeDeleteSheets(result.value);
            }
        });
    }

    function executeDeleteSheets(selectedSheets) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENGHAPUS SHEET...";
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete_sheets", version: APP_VERSION, password: currentSpvPassword, sheets: selectedSheets }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === "success") {
                Swal.fire('Berhasil!', `${data.count} Sheet telah dihapus.`, 'success');
            } else {
                Swal.fire('Error', data.error, 'error');
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Gagal', 'Koneksi bermasalah.', 'error');
        });
    }

    function fetchDailySummary(password) {
        document.getElementById('loading').style.display = 'flex'; 
        document.getElementById('loading-text').innerText = "MENGAMBIL DATA...";

        const payload = { action: "get_summary", version: APP_VERSION, password: password };
        
        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") {
                showReviewMenu(data.data, password);
            } else {
                Swal.fire('Error', data.error, 'error'); 
            }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; 
            Swal.fire('Koneksi Gagal', 'Gagal mengambil data harian dari server.', 'error'); 
        });
    }

    function showReviewMenu(summaryData, password) {
        if(summaryData.length === 0) { 
            Swal.fire('Info', 'Belum ada data produksi yang masuk hari ini.', 'info'); 
            return; 
        }

        let listHtml = summaryData.map(item => `
            <div class="r-card" data-line="${item.line}">
                <div class="r-head"><span class="r-title">LINE ${item.line}</span><span class="r-badge">${item.pct}% DEFECT</span></div>
                <span class="r-stats">Aktual: ${item.def} Defect / ${item.insp} Insp</span>
                <div class="r-body" style="margin-top: 12px;">
                    <label class="r-chk-area"><input type="checkbox" class="r-chk whitelist-chk" data-line="${item.line}" onchange="toggleLineInputs(this, '${item.line}')"> Abaikan</label>
                    <div class="r-inputs" id="r-inputs-${item.line}"><input type="number" id="target-${item.line}" class="r-input target-val" placeholder="Target %" step="0.1"></div>
                </div>
            </div>`).join('');

        Swal.fire({
            title: 'SET TARGET PER LINE',
            html: `<div style="text-align: left; background: var(--bg-section); padding: 12px; border-radius: 4px; border: 1px solid var(--border-line);"><div style="font-size: 11px; color: var(--text-sub); margin-bottom: 16px; line-height:1.5;"><i>*Sistem menyesuaikan defect ke target. Centang <b>"Abaikan"</b> jika line tidak diubah.</i></div><div style="max-height: 55vh; overflow-y: auto; padding-right: 5px;">${listHtml}</div></div>`,
            customClass: { popup: 'swal-custom-popup' }, 
            focusConfirm: false, 
            showCancelButton: true, 
            allowOutsideClick: false,
            confirmButtonColor: '#0f172a', 
            confirmButtonText: 'PROSES DATA', 
            cancelButtonText: 'BATAL',
            preConfirm: () => {
                let lineTargets = {}; 
                let isValid = true;

                summaryData.forEach(item => {
                    let ln = item.line; 
                    let isWhitelist = document.querySelector(`.whitelist-chk[data-line="${ln}"]`).checked;
                    
                    if(isWhitelist) {
                        lineTargets[ln] = "WHITELIST";
                    } else {
                        let target = document.getElementById(`target-${ln}`).value;
                        if(!target) {
                            isValid = false; 
                        } else {
                            lineTargets[ln] = { target: target };
                        }
                    }
                });

                if(!isValid) { 
                    Swal.showValidationMessage('Pastikan semua Target % diisi dengan angka!'); 
                    return false; 
                }
                return { password: password, lineTargets: lineTargets };
            }
        }).then((res) => { 
            if(res.isConfirmed) {
                executeRecap(res.value.password, res.value.lineTargets); 
            } else if (res.isDismissed) {
                Swal.fire({
                    title: 'Tinggalkan Menu?',
                    text: 'Data target yang sedang Anda ubah akan hilang. Ingin kembali ke Dashboard?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Ya, Tinggalkan',
                    cancelButtonText: 'Batal, Kembali Edit'
                }).then((conf) => {
                    if (!conf.isConfirmed) {
                        showReviewMenu(summaryData, password);
                    }
                });
            }
        });
    }

    function executeRecap(password, lineTargets) {
        if(!SCRIPT_URL) return;
        document.getElementById('loading').style.display = 'flex'; 
        document.getElementById('loading-text').innerText = "MEMBUAT REVIEW...";

        const payload = { action: "recap", version: APP_VERSION, password: password, lineTargets: lineTargets };

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") {
                Swal.fire('Sukses', 'Dashboard & Review berhasil dibuat.', 'success');
            } else {
                Swal.fire('Error', data.error, 'error'); 
            }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; 
            Swal.fire('Koneksi Gagal', 'Periksa internet.', 'error'); 
        });
    }

    function getRangeText(startStr, endStr) {
        const d1 = new Date(startStr);
        const d2 = new Date(endStr);
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        
        if (d1.getTime() === d2.getTime()) {
            return `${d1.getDate()} ${months[d1.getMonth()]} ${d1.getFullYear()}`;
        } else if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
            return `${d1.getDate()}-${d2.getDate()} ${months[d1.getMonth()]} ${d1.getFullYear()}`;
        } else if (d1.getFullYear() === d2.getFullYear()) {
            return `${d1.getDate()} ${months[d1.getMonth()]}-${d2.getDate()} ${months[d2.getMonth()]} ${d1.getFullYear()}`;
        } else {
            return `${d1.getDate()} ${months[d1.getMonth()]} ${d1.getFullYear()} - ${d2.getDate()} ${months[d2.getMonth()]} ${d2.getFullYear()}`;
        }
    }

    function executeExportReport() {
        const tipe = document.getElementById('exp_tipe').value;
        const sumber = document.getElementById('exp_sumber').value;
        const start = document.getElementById('exp_start').value;
        const end = document.getElementById('exp_end').value;
        const chart = document.getElementById('exp_chart').value;

        if(!start || !end) return Swal.fire('Perhatian', 'Isi rentang tanggal (Awal & Akhir) dengan lengkap!', 'warning');
        if(new Date(start) > new Date(end)) return Swal.fire('Perhatian', 'Tanggal Akhir tidak boleh lebih kecil dari Tanggal Awal', 'warning');

        closeSpvMenu();
        document.getElementById('loading').style.display = 'flex'; 
        document.getElementById('loading-text').innerText = "MENYUSUN EXCEL...";

        const payload = { 
            action: "export_excel", 
            version: APP_VERSION, 
            password: currentSpvPassword,
            tipe: tipe,
            sumber: sumber,
            start: start,
            end: end,
            includeChart: chart
        };

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            if(data.result === "success") {
                downloadSpvExcel(data, payload);
            } else {
                document.getElementById('loading').style.display = 'none';
                Swal.fire('Error', data.error, 'error'); 
            }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; 
            Swal.fire('Koneksi Gagal', 'Periksa koneksi internet Anda.', 'error'); 
        });
    }

    async function downloadSpvExcel(serverData, payload) {
        try {
            const workbook = new ExcelJS.Workbook();
            const fontStyle = { name: 'Inter', size: 12, bold: true, color: { argb: 'FF000000' } };
            const borderStyle = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

            if(serverData.dashboards && serverData.dashboards.length > 0) {
                serverData.dashboards.forEach(dash => {
                    dash.rows = dash.rows.map((row, rIndex) => {
                        return row.map((cell, cIndex) => {
                            if (cIndex >= 3) {
                                let isTargetRow = [5, 6, 7, 9, 10].includes(rIndex) || rIndex >= 14;
                                if (isTargetRow) {
                                    let v = String(cell).trim();
                                    if (v === "0" || v === "0%" || v === "0.0%" || v === "0,0%" || v === "#DIV/0!" || v === "-") {
                                        return null;
                                    }
                                    if (/^-?\d+(\.\d+)?$/.test(v)) {
                                        return Number(v);
                                    }
                                }
                            }
                            return cell;
                        });
                    });

                    const sheet = workbook.addWorksheet(dash.sheetName, { views: [{ showGridLines: false }] });
                    sheet.addRows(dash.rows);

                    let maxCol = dash.rows[0] ? dash.rows[0].length : 0;
                    let maxRow = dash.rows.length;

                    sheet.eachRow((row, rowNumber) => {
                        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                            let isGapRow = rowNumber >= 354 && rowNumber <= 360;
                            if (colNumber <= maxCol && rowNumber <= maxRow && !isGapRow) {
                                cell.font = fontStyle;
                                cell.border = borderStyle;
                                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                            }
                        });
                    });

                    sheet.getColumn(1).width = 5; 
                    sheet.getColumn(2).width = 18;
                    sheet.getColumn(3).width = 25;
                    for(let c = 4; c <= maxCol; c++) sheet.getColumn(c).width = 12;

                    for(let r = 1; r <= 13; r++) {
                        sheet.mergeCells(r, 1, r, 3);
                        sheet.getCell(r, 1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true};
                    }

                    for(let c = 4; c <= maxCol; c++) {
                        let headerVal = dash.rows[0][c-1]; 
                        if (headerVal && headerVal !== "") {
                            if (c < maxCol && dash.rows[0][c] === "") {
                                let rowsToMerge = [1, 2, 3, 4, 5, 9, 10, 11, 12];
                                for(let r of rowsToMerge) {
                                    sheet.mergeCells(r, c, r, c+1);
                                }
                                c++; 
                            }
                        }
                    }
                    
                    for(let r = 15; r <= 337; r += 14) {
                        sheet.mergeCells(r, 1, r+13, 1); 
                        sheet.mergeCells(r, 2, r+13, 2); 
                        sheet.getCell(r, 1).alignment = { vertical: 'middle', horizontal: 'center' };
                        sheet.getCell(r, 2).alignment = { vertical: 'middle', horizontal: 'middle', indent: 1 };
                    }

                    if (dash.sheetName.startsWith("SUMMARY_")) {
                        const areaTitleRow = 361;
                        const areaHeader1Row = 362;

                        if (maxCol >= 4) {
                            sheet.mergeCells(areaTitleRow, 4, areaTitleRow, maxCol);
                            sheet.getCell(areaTitleRow, 4).alignment = { vertical: 'middle', horizontal: 'center' };
                            sheet.getCell(areaTitleRow, 4).font = fontStyle;
                        }

                        for (let c = 4; c <= maxCol; c += 2) {
                            let headerVal = dash.rows[areaHeader1Row - 1] ? dash.rows[areaHeader1Row - 1][c - 1] : "";
                            if (headerVal && headerVal !== "") {
                                sheet.mergeCells(areaHeader1Row, c, areaHeader1Row, c + 1);
                                sheet.getCell(areaHeader1Row, c).alignment = { vertical: 'middle', horizontal: 'center' };
                            }
                        }
                    }
                });
            } else {
                const emptySheet = workbook.addWorksheet("Data Kosong");
                emptySheet.addRow(["Tidak ada data Dashboard pada range tanggal yang dipilih."]);
            }

            if(payload.includeChart === "YES") {
                if(serverData.db && serverData.db.length > 0) {
                    const sheetDb = workbook.addWorksheet("DATABASE");
                    sheetDb.addRows(serverData.db);
                    sheetDb.getRow(1).font = { bold: true };
                    sheetDb.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
                }
                if(serverData.def && serverData.def.length > 0) {
                    const sheetDef = workbook.addWorksheet("DB_DEFECTS");
                    sheetDef.addRows(serverData.def);
                    sheetDef.getRow(1).font = { bold: true };
                    sheetDef.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
                }
            }

            const rangeText = getRangeText(payload.start, payload.end);
            const fileName = `${payload.tipe}_QC Sewing Report_D1_${rangeText}.xlsx`;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), fileName);
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Berhasil', 'Laporan Excel berhasil diunduh secara instan!', 'success');
        } catch(e) {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Terjadi kesalahan saat memproses file Excel di browser.', 'error');
            console.error(e);
        }
    }
    let selectedLineRC = "";
    let selectedLineBTL = "";
    let activeRcDefects = {};

    function updateRcBuyerDropdown() {
        const sel = document.getElementById('rc_buyer_select'); 
        if (!sel) return;
        let mappedBuyers = [...new Set(dynamicDB.map(r => r.buyer))].filter(Boolean).sort();
        if (mappedBuyers.length > 0) {
            sel.innerHTML = '<option value="" disabled selected>-- Pilih Buyer --</option>' + 
                            mappedBuyers.map(b => `<option value="${b}">${b}</option>`).join('');
        } else {
            sel.innerHTML = '<option value="" disabled selected>-- Menunggu Sinkronisasi... --</option>';
        }
        updateRcStyleDropdown();
    }

    function handleRcBuyerChange() { updateRcStyleDropdown(); }

    function updateRcStyleDropdown() {
        const selBuyer = document.getElementById('rc_buyer_select'); 
        let buyer = selBuyer.value;
        const sel = document.getElementById('rc_style_select'); 
        if (!sel) return;
        let currentVal = sel.value;
        sel.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>';
        if (buyer) {
            let validStyles = [...new Set(dynamicDB.filter(row => row.buyer === buyer).map(row => row.style))].filter(Boolean).sort();
            validStyles.forEach(s => { sel.innerHTML += `<option value="${s}">${s}</option>`; });
            if (validStyles.includes(currentVal) && currentVal !== "") sel.value = currentVal; 
            else sel.value = ""; 
        }
    }

    function addRcDefectToList() {
        let aIdx = document.getElementById('rc_sel_area').value;
        let tIdx = document.getElementById('rc_sel_type').value;
        if(aIdx === "" || tIdx === "") {
            Swal.fire('Perhatian', 'Pilih Area dan Jenis Defect terlebih dahulu.', 'warning'); 
            return;
        }
        let key = `${aIdx}_${tIdx}`;
        if(activeRcDefects[key]) {
            Swal.fire('Info', 'Defect ini sudah ada di daftar rangkuman.', 'info'); 
            return;
        }
        activeRcDefects[key] = { aIdx: aIdx, tIdx: tIdx, qty: "" };
        document.getElementById('rc_sel_area').value = "";
        let typeSelect = document.getElementById('rc_sel_type');
        typeSelect.innerHTML = typeSelect.getAttribute('data-default');
        typeSelect.value = "";
        typeSelect.style.pointerEvents = "auto";
        typeSelect.style.opacity = "1";
        renderRcDefectList();
        if (window.navigator && window.navigator.vibrate) navigator.vibrate(50);
    }

    function renderRcDefectList() {
        let container = document.getElementById('rc_active_defects_container');
        let html = "";
        let count = 0;
        for(let key in activeRcDefects) {
            count++;
            let item = activeRcDefects[key];
            let areaName = defectAreas[item.aIdx];
            let typeName = "";
            if(item.tIdx === "SP_TRIM") typeName = "TRIMMING";
            else if(item.tIdx === "SP_STN") typeName = "STAIN";
            else if(item.tIdx === "SP_MEAS") typeName = "MEASUREMENT";
            else typeName = defectTypes[item.tIdx];

            html += `
            <div class="summary-card" id="rc_card_${key}">
                <div class="summary-header">
                    <div class="summary-title">
                        <span>${areaName}</span>
                        <span class="summary-subtitle">↳ ${typeName}</span>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="btn-del btn-neo" style="background:var(--accent);border-color:var(--accent);" onclick="showDefectInfo('${typeName.replace(/'/g, "\\'")}','${areaName.replace(/'/g, "\\'")}')">?</button>
                        <button class="btn-del btn-neo" onclick="removeRcDefect('${key}')">X</button>
                    </div>
                </div>
                <div class="flex-inputs">
                    <div class="stepper">
                        <button onclick="adjRcVal('${key}', -1)">-</button>
                        <input type="number" id="rc_inp_${key}" value="${item.qty}" oninput="manualRcInput('${key}', this.value)" placeholder="QTY">
                        <button onclick="adjRcVal('${key}', 1)">+</button>
                    </div>
                </div>
            </div>`;
        }
        if(count === 0) {
            container.innerHTML = `<div class="empty-state" id="rc_empty_state">BELUM ADA DEFECT YANG DITAMBAHKAN.<br><span style="font-weight:600; font-size:11px; margin-top: 8px; display:block; text-transform:none;">Silakan pilih Area & Jenis di atas lalu klik Tambahkan.</span></div>`;
        } else {
            container.innerHTML = html;
        }
        calculateRc();
    }

    function adjRcVal(key, amount) {
        let val = parseInt(activeRcDefects[key].qty) || 0;
        let newVal = val + amount;
        if(newVal < 0) newVal = 0;
        activeRcDefects[key].qty = newVal > 0 ? newVal : "";
        document.getElementById(`rc_inp_${key}`).value = newVal > 0 ? newVal : "";
        if (window.navigator && window.navigator.vibrate) navigator.vibrate(40); 
        calculateRc();
    }

    function manualRcInput(key, value) {
        let cleanVal = value.replace(/[^0-9]/g, '');
        let num = parseInt(cleanVal) || 0;
        activeRcDefects[key].qty = num > 0 ? num : "";
        document.getElementById(`rc_inp_${key}`).value = num > 0 ? num : "";
        calculateRc();
    }

    function removeRcDefect(key) { 
        delete activeRcDefects[key]; 
        renderRcDefectList(); 
    }

    function calculateRc() {
        let totalSum = 0;
        for(let key in activeRcDefects) { totalSum += parseInt(activeRcDefects[key].qty) || 0; }
        let tdef = document.getElementById('rc_tot_def'); 
        if(tdef) tdef.value = totalSum;
        let elInsp = document.getElementById('rc_qty_insp');
        const insp = elInsp ? (parseInt(elInsp.value) || 0) : 0;
        let pDef = document.getElementById('rc_pct_def'); 
        if(pDef) {
            pDef.value = insp > 0 ? ((totalSum / insp) * 100).toFixed(1) + "%" : "0%";
        }
    }

    function submitRcToServer() {
        if(!SCRIPT_URL) return;
        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
        
        let line = getVal('rc_line_name');
        let tgl = getVal('rc_tanggal');
        let qc = getVal('rc_qc');
        let inspector = getVal('rc_inspector');
        let buyer = getVal('rc_buyer_select');
        let style = getVal('rc_style_select');
        let insp = parseInt(getVal('rc_qty_insp')) || 0;
        let def = parseInt(getVal('rc_tot_def')) || 0;
        let pct = getVal('rc_pct_def');
        let ket = getVal('rc_keterangan');

        if(!line || !qc || !inspector || !tgl || insp === 0) {
            Swal.fire('Perhatian', 'NAMA LINE, TANGGAL, NAMA QC LINE, NAMA QC INSPECTOR, dan QTY INSPECT wajib diisi!', 'warning');
            return;
        }
        if(!TLS_ONLY_LINES.includes(line) && (!buyer || !style)) {
            Swal.fire('Perhatian', 'BUYER dan STYLE wajib diisi!', 'warning');
            return;
        }
        if(def > insp) {
            Swal.fire('Data Tidak Valid', 'Total Defect tidak boleh melebihi Qty Inspect!', 'error');
            return;
        }

        let defectsArray = [];
        for(let key in activeRcDefects) {
            let item = activeRcDefects[key];
            let tName = "";
            if (item.tIdx === "SP_TRIM") tName = "TRIMMING";
            else if (item.tIdx === "SP_STN") tName = "STAIN";
            else if (item.tIdx === "SP_MEAS") tName = "MEASUREMENT";
            else tName = defectTypes[item.tIdx];

            defectsArray.push({ area: defectAreas[item.aIdx], type: tName, qty: parseInt(item.qty) || 0 });
        }

        let btnSub = document.getElementById('btnSubmitRC');
        btnSub.disabled = true; 
        btnSub.innerHTML = 'MENGIRIM...';
        document.getElementById('loading').style.display = 'flex'; 
        document.getElementById('loading-text').innerText = "MENYIMPAN DATA...";

        let payload = {
            action: "submit_rc", version: APP_VERSION, line_name: line, tanggal: tgl,
            qc: qc, inspector: inspector, buyer: buyer || "-", style: style || "-", qty_insp: insp,
            tot_def: def, pct_def: pct, keterangan: ket, defects: defectsArray
        };

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none'; 
            btnSub.disabled = false; 
            btnSub.innerHTML = 'CONFIRM & SUBMIT RANDOM CHECK';
            if(data.result === "success") { 
                Swal.fire('Sukses', 'Data Random Check berhasil dikirim!', 'success').then(() => {
                    activeRcDefects = {};
                    renderRcDefectList();
                    ['rc_line_name','rc_buyer_select','rc_style_select','rc_qty_insp','rc_keterangan','rc_inspector'].forEach(id => {
                        let el = document.getElementById(id); if(el) el.value = "";
                    });
                    calculateRc();
                }); 
            } else { 
                Swal.fire('Gagal', data.error || 'Coba lagi nanti.', 'error'); 
            }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; 
            btnSub.disabled = false; 
            btnSub.innerHTML = 'CONFIRM & SUBMIT RANDOM CHECK';
            Swal.fire('Koneksi Gagal', 'Periksa internet.', 'error');
        });
    }

    function updateBtlBuyerDropdown() {
        const sel = document.getElementById('btl_buyer_select');
        if (!sel) return;
        let mappedBuyers = [...new Set(dynamicDB.map(r => r.buyer))].filter(Boolean).sort();
        if (mappedBuyers.length > 0) {
            sel.innerHTML = '<option value="" disabled selected>-- Pilih Buyer --</option>' +
                            mappedBuyers.map(b => `<option value="${b}">${b}</option>`).join('');
        } else {
            sel.innerHTML = '<option value="" disabled selected>-- Menunggu Sinkronisasi... --</option>';
        }
        updateBtlStyleDropdown();
    }

    function handleBtlBuyerChange() { updateBtlStyleDropdown(); }

    function updateBtlStyleDropdown() {
        const selBuyer = document.getElementById('btl_buyer_select');
        let buyer = selBuyer.value;
        const sel = document.getElementById('btl_style_select');
        if (!sel) return;
        let currentVal = sel.value;
        sel.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>';
        if (buyer) {
            let validStyles = [...new Set(dynamicDB.filter(row => row.buyer === buyer).map(row => row.style))].filter(Boolean).sort();
            validStyles.forEach(s => { sel.innerHTML += `<option value="${s}">${s}</option>`; });
            if (validStyles.includes(currentVal) && currentVal !== "") sel.value = currentVal;
            else sel.value = "";
        }
    }

    function submitBtlToServer() {
        if(!SCRIPT_URL) return;
        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

        let line = getVal('btl_line_name');
        let tgl = getVal('btl_tanggal');
        let qc = getVal('btl_qc');
        let buyer = getVal('btl_buyer_select');
        let style = getVal('btl_style_select');
        let qty = parseInt(getVal('btl_qty')) || 0;

        if(!line || !tgl || !qc || qty <= 0) {
            Swal.fire('Perhatian', 'NAMA LINE, TANGGAL, NAMA QC ENDLINE, dan QTY BTL wajib diisi!', 'warning');
            return;
        }
        if(!buyer || !style) {
            Swal.fire('Perhatian', 'BUYER dan STYLE wajib diisi!', 'warning');
            return;
        }

        let btnSub = document.getElementById('btnSubmitBTL');
        btnSub.disabled = true;
        btnSub.innerHTML = 'MENGIRIM...';
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENYIMPAN DATA BTL...";

        let payload = {
            action: "submit_btl",
            version: APP_VERSION,
            tanggal: tgl,
            line_name: line,
            qc_endline: qc,
            buyer: buyer,
            style: style,
            qty_btl: qty
        };

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            btnSub.disabled = false;
            btnSub.innerHTML = 'CONFIRM & SUBMIT BTL';
            if(data.result === "success") {
                Swal.fire('Sukses', 'Data BTL Line ' + line + ' berhasil dikirim!', 'success').then(() => {
                    document.getElementById('btl_line_name').value = "";
                    document.getElementById('btl_qc').value = "";
                    document.getElementById('btl_qty').value = "";
                    document.getElementById('btl_buyer_select').innerHTML = '<option value="" disabled selected>-- Pilih Line Dulu --</option>';
                    document.getElementById('btl_style_select').innerHTML = '<option value="" disabled selected>-- Pilih Buyer Dulu --</option>';
                    selectedLineBTL = "";
                });
            } else if (data.error === "VERSION_MISMATCH") {
                Swal.fire('Versi Usang!', 'Aplikasi mendeteksi update. Halaman akan dimuat ulang.', 'error').then(()=>{
                    window.location.reload(true);
                });
            } else {
                Swal.fire('Gagal', data.error || 'Coba lagi nanti.', 'error');
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            btnSub.disabled = false;
            btnSub.innerHTML = 'CONFIRM & SUBMIT BTL';
            Swal.fire('Koneksi Gagal', 'Periksa internet.', 'error');
        });
    }

    function resetForm() {
        Swal.fire({
            title: 'Hapus Semua Formulir?', text: "Data akan dibersihkan.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#64748b', confirmButtonText: 'Ya, Bersihkan!'
        }).then((result) => {
            if (result.isConfirmed) {
                activeDefects = {}; 
                selectedLineDaily = ""; 
                renderDefectList();
                
                ['line_name','status','buyer_select','style_select','shift_start','shift_end','qty_insp_tls','qty_insp_100','qty_trans','keterangan'].forEach(id => { 
                    let el = document.getElementById(id); 
                    if(el) el.value = ""; 
                });
                
                let bs = document.getElementById('buyer_select'); 
                if(bs) {
                    bs.innerHTML = '<option value="" disabled selected>-- Pilih Line Dulu --</option>'; 
                    bs.style.display='block';
                }
                
                let ss = document.getElementById('style_select'); 
                if(ss) {
                    ss.innerHTML = '<option value="" disabled selected>-- Pilih Buyer Dulu --</option>'; 
                    ss.style.display='block';
                }
                
                let sh = document.getElementById('shift_hours'); 
                if(sh) sh.innerText = ""; 
                
                document.getElementById('qc_inline').value = ""; 
                document.getElementById('qc_endline').value = "";
                
                applyTlsOnlyLogic(); 
                calculate(); 
                saveData();
                Swal.fire('Bersih!', 'Form sudah di-reset.', 'success');
            }
        });
    }

    const txtDominan = document.getElementById('lkh_dominan');
    if(txtDominan) {
        txtDominan.addEventListener('focus', function() {
            if(this.value.trim() === '') {
                this.value = '• ';
            }
        });

        txtDominan.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); 
                
                const start = this.selectionStart;
                const end = this.selectionEnd;
                const val = this.value;
                
                this.value = val.substring(0, start) + '\n• ' + val.substring(end);
                this.selectionStart = this.selectionEnd = start + 3;
            }
        });
    }
    
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered in Sewing', reg.scope))
                .catch(err => console.log('SW Failed in Sewing', err));
        });
    }

    window.onload = loadData;