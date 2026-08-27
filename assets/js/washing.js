(function() {
            const d = new Date();
            const pinSuffix = (d.getMonth() + 1).toString() + d.getFullYear().toString().slice(-2);
            const expectedPin = 'WAS' + pinSuffix;
            const globalPin   = 'CATALYSTD1';
            
            const tiketArea   = localStorage.getItem('tiket_washing');
            const tiketGlobal = localStorage.getItem('qc_token_global');
            const isSpv       = localStorage.getItem('qc_spv_logged_in') === 'true';
            
            // DEMO MODE: gerbang password dinonaktifkan agar portofolio bisa diakses bebas
        })();
    


    document.addEventListener('contextmenu', e => e.preventDefault());

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
            const dummyRows = generateDummyRows(30, 'WAS');

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

    let defectChart;
    let activeDefects    = {};
    let currentCategory  = "WASHING";
    let dynamicDB        = [];

    let selectedNum   = "";
    let selectedSuf   = "";
    let selectedLines = [];

    let selectedTSData      = null;
    let completedTSItems    = [];
    let totalTSItems        = 0;
    let selectedTrackerData = null;
    let completedGenItems   = [];
    let selectedPreviewData = null;

    let hourlyLocalCache = {}; 
    let serverHourlyDone = {}; 
    const listSemuaQC = [
        "AFRIL", "AMELIA", "ANGGRAINI", "DILA CHAIRUNNISA", "DINDA", "DITA", "DEVI", 
        "ELSA OLIFIA", "ENITA DWI", "HAMIDAH PUTRI", "HANIFAH", "HAYUN ARISKA", "INA", "LILI KURNIAWATI", 
        "MIA SAELANI", "NADIFA", "NANDA SALWA", "ROSSI BERLIANA", "TARISKA", "TIAS AURALIA", "ULFI", "ZILFI NAILIS",
        "AMBAR", "ERNA", "TIWI", "MARCELLA", "RIFCHA"
    ];

        
    let modalStackOpen = false;
    let activeModalId = null;
    let suppressPopConfirm = false;

    function openModalWithHistory(modalId) {
        activeModalId = modalId;
        modalStackOpen = true;
        history.pushState({ modalOpen: modalId }, '');
    }

    function closeModalWithHistory() {
        if (modalStackOpen) {
            suppressPopConfirm = true;
            modalStackOpen = false;
            activeModalId = null;
            history.back();
        }
    }

    window.addEventListener('popstate', function() {
        if (suppressPopConfirm) { suppressPopConfirm = false; return; }
        if (modalStackOpen && activeModalId) {
            const idToClose = activeModalId;
            history.pushState({ modalOpen: idToClose }, ''); 
            Swal.fire({
                title: 'Tutup Menu?',
                text: 'Yakin ingin keluar dari menu ini?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Ya, Tutup',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#dc2626'
            }).then((result) => {
                if (result.isConfirmed) closeAnyModalById(idToClose);
            });
        }
    });

    function closeAnyModalById(id) {
        if (id === 'spvMenuModal') closeSPVMenuModal();
        else if (id === 'absenModal') closeMenuAbsen();
        else if (id === 'tutupShiftModal') closeTutupShiftModal();
        else if (id === 'summaryBuyerModal') closeGenBuyerModal();
        else if (id === 'lineModal') closeLineModal();
    }

    window.onload = function() {
        initChart();
        switchCategory("WASHING");
        loadCacheDb();
        fetchMasterDataFromServer();
        loadData();
        initHourlyEngine();
        initEmbroEngine();
    };

    const EMBRO_DEFECT_LIST = ["BROKEN STITCH","POORSHAPE","THREAD STAIN","STAIN","SEPUL NAIK","YARNPULL","CACAT","MINUS DARI POLA"];
    let embroDefects = {};

    function initEmbroEngine() {
        const d = new Date();
        document.getElementById('embro_tanggal').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        let namaSel = document.getElementById('embro_nama_qc');
        namaSel.innerHTML = '<option value="" disabled selected>-- Pilih QC --</option>' +
            listSemuaQC.map(q => `<option value="${q}">${q}</option>`).join('');

        renderEmbroDefects();
        populateEmbroBuyerSelect();
        loadEmbroData();
    }

    function populateEmbroBuyerSelect() {
        const el = document.getElementById('embro_buyer');
        if (!el) return;
        const cur = el.value;
        const buyers = [...new Set(dynamicDB.map(r => r.buyer))].filter(Boolean).sort();
        el.innerHTML = '<option value="" disabled selected>-- Pilih Buyer --</option>' +
            buyers.map(b => `<option value="${b}">${b}</option>`).join('');
        if (buyers.includes(cur)) el.value = cur;
    }

    function updateEmbroDropdowns(source) {
        const elBuyer = document.getElementById('embro_buyer');
        const elStyle = document.getElementById('embro_style');
        const elColor = document.getElementById('embro_color');
        const curBuyer = elBuyer.value;
        const curStyle = elStyle.value;

        if (source === 'buyer') {
            elStyle.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>';
            elColor.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>';
        }

        if (curBuyer) {
            const styles = [...new Set(dynamicDB.filter(r => r.buyer === curBuyer).map(r => r.style))].filter(Boolean).sort();
            if (source !== 'style' && source !== 'color') {
                elStyle.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>' +
                    styles.map(s => `<option value="${s}">${s}</option>`).join('');
                if (styles.includes(curStyle)) elStyle.value = curStyle;
            }
        }

        const nowStyle = elStyle.value;
        if (curBuyer && nowStyle) {
            const colors = [...new Set(dynamicDB.filter(r => r.buyer === curBuyer && r.style === nowStyle).map(r => r.color))].filter(Boolean).sort();
            elColor.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>' +
                colors.map(c => `<option value="${c}">${c}</option>`).join('');
        }
        saveEmbroData();
    }

    function renderEmbroDefects() {
        const cont = document.getElementById('embro_defect_list');
        cont.innerHTML = EMBRO_DEFECT_LIST.map(name => {
            const val = embroDefects[name] || '';
            return `
            <div class="summary-card" style="margin-bottom:0;">
                <div class="summary-header" style="border-bottom:none;padding-bottom:0;">
                    <div class="summary-title"><span>${name}</span></div>
                </div>
                <div class="flex-inputs">
                    <div class="stepper">
                        <button onclick="adjEmbroVal('${name}',-1)">-</button>
                        <input type="number" id="embro_inp_${name.replace(/\s/g,'_')}" value="${val}" oninput="manualEmbroInput('${name}',this.value)">
                        <button onclick="adjEmbroVal('${name}',1)">+</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function adjEmbroVal(name, amount) {
        const val = parseInt(embroDefects[name]) || 0;
        const newVal = val + amount;
        embroDefects[name] = newVal > 0 ? newVal : '';
        const el = document.getElementById(`embro_inp_${name.replace(/\s/g,'_')}`);
        if (el) el.value = newVal > 0 ? newVal : '';
        if (navigator.vibrate) navigator.vibrate(40);
        calculateEmbro();
    }

    function manualEmbroInput(name, value) {
        const num = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        embroDefects[name] = num > 0 ? num : '';
        calculateEmbro();
    }

    function calculateEmbro() {
        let totalDefect = 0;
        EMBRO_DEFECT_LIST.forEach(name => { totalDefect += parseInt(embroDefects[name]) || 0; });
        const qtyGood = parseInt(document.getElementById('embro_qty_good').value) || 0;
        const qtyInsp = qtyGood + totalDefect;
        const pct = qtyInsp > 0 ? ((totalDefect / qtyInsp) * 100).toFixed(1) + '%' : '0%';

        document.getElementById('embro_qty_defect').value = totalDefect;
        document.getElementById('embro_qty_insp').value = qtyInsp;
        document.getElementById('embro_pct_def').value = pct;
        saveEmbroData();
    }

    function saveEmbroData() {
        const data = {};
        ['embro_nama_qc','embro_tanggal','embro_buyer','embro_style','embro_color','embro_check_in','embro_remark','embro_qty_good'].forEach(id => {
            const el = document.getElementById(id);
            if (el) data[id] = el.value;
        });
        localStorage.setItem('qcEmbroDefects_wash', JSON.stringify(embroDefects));
        localStorage.setItem('qcEmbroAutoSave_wash', JSON.stringify(data));
    }

    function loadEmbroData() {
        const savedDefects = localStorage.getItem('qcEmbroDefects_wash');
        if (savedDefects) { try { embroDefects = JSON.parse(savedDefects); } catch(e) { embroDefects = {}; } renderEmbroDefects(); }

        const saved = localStorage.getItem('qcEmbroAutoSave_wash');
        if (saved) {
            const data = JSON.parse(saved);
            if (data['embro_buyer']) { document.getElementById('embro_buyer').value = data['embro_buyer']; updateEmbroDropdowns('buyer'); }
            if (data['embro_style']) { document.getElementById('embro_style').value = data['embro_style']; updateEmbroDropdowns('style'); }
            if (data['embro_color']) { document.getElementById('embro_color').value = data['embro_color']; }
            ['embro_nama_qc','embro_tanggal','embro_check_in','embro_remark','embro_qty_good'].forEach(id => {
                if (data[id] !== undefined) { const el = document.getElementById(id); if (el) el.value = data[id]; }
            });
        }
        calculateEmbro();
    }

    function showSummaryAndSubmitEmbro() {
        const namaQC = document.getElementById('embro_nama_qc').value;
        const tanggal = document.getElementById('embro_tanggal').value;
        const buyer = document.getElementById('embro_buyer').value;
        const style = document.getElementById('embro_style').value;
        const color = document.getElementById('embro_color').value;
        const qtyGood = parseInt(document.getElementById('embro_qty_good').value) || 0;
        const tDef = parseInt(document.getElementById('embro_qty_defect').value) || 0;
        const tInsp = qtyGood + tDef;

        if (!namaQC || !tanggal || !buyer || !style || !color) {
            Swal.fire('Perhatian', 'NAMA QC, TANGGAL, BUYER, STYLE, COLOR wajib diisi!', 'warning');
            return;
        }
        if (tInsp === 0) {
            Swal.fire('Data Tidak Valid', 'Qty Good atau Defect harus diisi!', 'error');
            return;
        }

        const currentSignatureEmbro = JSON.stringify({ namaQC, tanggal, buyer, style, color, qtyGood, tDef, embroDefects });
        if (localStorage.getItem('lastSubmitSignatureEmbro_wash') === currentSignatureEmbro) {
            Swal.fire('Data Ganda Terdeteksi!', 'Data EMBRO ini sama persis dengan pengiriman terakhir. Cek dulu Spreadsheet sebelum kirim ulang, supaya tidak dobel.', 'warning');
            return;
        }

        Swal.fire({
            title: 'KONFIRMASI REKAP EMBRO',
            html: `<div style="font-family:'Inter', sans-serif;"><b>QC:</b> ${namaQC}<br><b>Buyer:</b> ${buyer}<br><b>Style:</b> ${style} | <b>Color:</b> ${color}<br><b>Total Inspect:</b> ${tInsp} pcs<br><b>Total Defect:</b> <span style="color:red;font-weight:bold;">${tDef}</span> pcs<br><b>Total Good:</b> <span style="color:green;font-weight:bold;">${qtyGood}</span> pcs<hr>Kirim ke Server?</div>`,
            icon: 'question', showCancelButton: true,
            confirmButtonColor: '#8b5cf6', cancelButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Kirim!'
        }).then(result => {
            if (result.isConfirmed) executeSendEmbroToServer(currentSignatureEmbro);
        });
    }

    function executeSendEmbroToServer(currentSignatureEmbro) {
        const btn = document.getElementById('btnSubmitEmbro');
        btn.disabled = true;
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'SYNC EMBRO TO CLOUD...';

        const payload = {
            action: 'submit_embro',
            nama_qc: document.getElementById('embro_nama_qc').value,
            tanggal: document.getElementById('embro_tanggal').value,
            buyer: document.getElementById('embro_buyer').value,
            style: document.getElementById('embro_style').value,
            color: document.getElementById('embro_color').value,
            check_in: document.getElementById('embro_check_in').value,
            remark: document.getElementById('embro_remark').value,
            qty_good: document.getElementById('embro_qty_good').value,
            defects: embroDefects
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            signal: controller.signal
        })
        .then(res => { clearTimeout(timeoutId); return res.text(); })
        .then(text => {
            document.getElementById('loading').style.display = 'none';
            btn.disabled = false;
            let data;
            try {
                data = JSON.parse(text);
            } catch(e) {
                Swal.fire('Perhatian', 'Respon server tidak normal, tapi data KEMUNGKINAN sudah tersimpan. Cek Spreadsheet dulu sebelum kirim ulang!', 'warning');
                return;
            }
            if (data.result === 'success') {
                localStorage.setItem('lastSubmitSignatureEmbro_wash', currentSignatureEmbro);
                Swal.fire('Sukses', 'Data EMBRO berhasil dikirim!', 'success').then(() => {
                    embroDefects = {};
                    renderEmbroDefects();
                    document.getElementById('embro_qty_good').value = '';
                    document.getElementById('embro_check_in').value = '';
                    document.getElementById('embro_remark').value = '';
                    calculateEmbro();
                });
            } else {
                Swal.fire('Error', 'Gagal dari server: ' + data.error, 'error');
            }
        })
        .catch(() => {
            clearTimeout(timeoutId);
            document.getElementById('loading').style.display = 'none';
            btn.disabled = false;
            Swal.fire('Koneksi Terputus', 'Tidak bisa memastikan status kiriman. Cek Spreadsheet dulu apakah data EMBRO sudah masuk sebelum kirim ulang, biar tidak dobel.', 'error');
        });
    }

    let selectedGenEmbroData = null;
    function openGenEmbroModal() {
        closeSPVMenuModal();
        setTimeout(() => {
            const modal = document.getElementById('embroSummaryModal');
            document.getElementById('ge_step2').style.display = 'block';
            document.getElementById('ge_list_view').style.display = 'block';
            document.getElementById('ge_form_view').style.display = 'none';
            selectedGenEmbroData = null;
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
            openModalWithHistory('embroSummaryModal');
            fetchTrackerDataEmbro();
        }, 300);
    }
    function closeGenEmbroModal(e) {
        if (e && e.target !== e.currentTarget) return;
        closeModalWithHistory();
        const modal = document.getElementById('embroSummaryModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
        ['ge_supplier','ge_qty_order','ge_shipment','ge_sub','ge_panel'].forEach(id => document.getElementById(id).value = '');
        selectedGenEmbroData = null;
    }
    function fetchTrackerDataEmbro() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MEMUAT DATA TRACKER EMBRO...';
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_tracker_embro', password: 'DEMO' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            renderTrackerListEmbro(data.result === 'success' ? data.tracker_data : []);
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            renderTrackerListEmbro([]);
            Swal.fire('Error', 'Gagal terhubung ke server.', 'error');
        });
    }
    function renderTrackerListEmbro(items) {
        const list = document.getElementById('ge_tracker_list');
        if (!items || items.length === 0) {
            list.innerHTML = `<div class="empty-state">TIDAK ADA DATA DI SHEET EMBRO SAAT INI.</div>`;
            return;
        }
        list.innerHTML = items.map((item, i) => `
            <div class="tracker-item" onclick="selectGenEmbroItem('${escJS(item.buyer)}','${escJS(item.style)}','${escJS(item.color)}')">
                <div style="display:flex;flex-direction:column;gap:5px;">
                    <span class="tracker-badge">${item.buyer}</span>
                    <span>${item.style} - ${item.color}</span>
                </div>
            </div>`).join('');
    }
    function selectGenEmbroItem(buyer, style, color) {
        selectedGenEmbroData = { buyer, style, color };
        document.getElementById('ge_selected_label').innerText = `${buyer} | ${style} - ${color}`;
        ['ge_supplier','ge_qty_order','ge_shipment','ge_sub','ge_panel'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('ge_list_view').style.display = 'none';
        document.getElementById('ge_form_view').style.display = 'block';
    }
    function backToGenEmbroList() {
        document.getElementById('ge_list_view').style.display = 'block';
        document.getElementById('ge_form_view').style.display = 'none';
        selectedGenEmbroData = null;
    }
    function executeGenerateSummaryEmbro() {
        if (!selectedGenEmbroData) return;
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'GENERATING SUMMARY EMBRO...';

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'generate_summary_embro', password: 'DEMO',
                buyer: selectedGenEmbroData.buyer, style: selectedGenEmbroData.style, color: selectedGenEmbroData.color,
                supplier: document.getElementById('ge_supplier').value,
                qty_order: document.getElementById('ge_qty_order').value,
                shipment: document.getElementById('ge_shipment').value,
                sub: document.getElementById('ge_sub').value,
                panel: document.getElementById('ge_panel').value
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === 'success') {
                Swal.fire({ title: '✅ BERHASIL', text: 'Summary EMBRO berhasil digenerate! Cek Spreadsheet.', icon: 'success', timer: 1800, showConfirmButton: false });
                backToGenEmbroList();
            } else {
                Swal.fire('Error', data.error || 'Gagal generate.', 'error');
            }
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Gagal terhubung ke server.', 'error');
        });
    }

    async function downloadEmbroSummaryExcel() {
        if (!selectedGenEmbroData) return;
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENYUSUN FILE EXCEL...';

        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'preview_generate_summary_embro', password: 'DEMO',
                    buyer: selectedGenEmbroData.buyer, style: selectedGenEmbroData.style, color: selectedGenEmbroData.color,
                    supplier: document.getElementById('ge_supplier').value,
                    qty_order: document.getElementById('ge_qty_order').value,
                    shipment: document.getElementById('ge_shipment').value,
                    sub: document.getElementById('ge_sub').value,
                    panel: document.getElementById('ge_panel').value
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const data = await res.json();
            document.getElementById('loading').style.display = 'none';

            if (data.result !== 'success') {
                Swal.fire('Error', data.error || 'Gagal menyusun data untuk diunduh.', 'error');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Summary Embro', { views: [{ showGridLines: false }] });

            data.values.forEach(row => sheet.addRow(row));
            sheet.columns.forEach(col => { col.width = 16; });

            const blackFont = { name: 'Inter', size: 10, color: { argb: 'FF000000' } };
            const borderStyle = {
                top:    { style: 'thin', color: { argb: 'FF000000' } }, left:   { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } }, right:  { style: 'thin', color: { argb: 'FF000000' } }
            };
            sheet.eachRow((row) => {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.font = blackFont;
                    cell.border = borderStyle;
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Summary_Embro_${selectedGenEmbroData.buyer}_${selectedGenEmbroData.style}_${selectedGenEmbroData.color}.xlsx`.replace(/\s+/g, '_');
            saveAs(new Blob([buffer]), fileName);
        } catch (e) {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Gagal terhubung ke server saat menyiapkan file excel.', 'error');
        }
    }

    function initHourlyEngine() {
        const d = new Date();
        document.getElementById('hourly_tanggal').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        
        const gridCont = document.getElementById('hourly_jam_grid');
        let htmlGrid = "";
        for (let i = 7; i <= 21; i++) {
            let formatJam = String(i + 1).padStart(2, '0') + ":00";
            htmlGrid += `<button type="button" class="hour-btn" id="btn_hr_${i}" onclick="selectHourlyHour('${formatJam}', ${i})">${i}-${i+1}</button>`;
        }
        gridCont.innerHTML = htmlGrid;

        const savedCache = localStorage.getItem('spv_hourly_local_cache');
        if (savedCache) {
            try { hourlyLocalCache = JSON.parse(savedCache); } catch(e) { hourlyLocalCache = {}; }
        }

        selectHourlyHour("08:00", 7);
    }

    function switchMainTab(tab) {
        document.getElementById('tab-daily').style.display = tab === 'daily' ? 'flex' : 'none';
        document.getElementById('tab-hourly').style.display = tab === 'hourly' ? 'flex' : 'none';
        document.getElementById('tab-embro').style.display = tab === 'embro' ? 'flex' : 'none';

        document.getElementById('main_tab_daily').classList.toggle('active', tab === 'daily');
        document.getElementById('main_tab_hourly').classList.toggle('active', tab === 'hourly');
        document.getElementById('main_tab_embro').classList.toggle('active', tab === 'embro');

        document.getElementById('btnSubmitMain').style.display = tab === 'daily' ? 'flex' : 'none';
        document.getElementById('btnSubmitHourly').style.display = tab === 'hourly' ? 'flex' : 'none';
        document.getElementById('btnSubmitEmbro').style.display = tab === 'embro' ? 'flex' : 'none';

        if (tab === 'hourly') renderHourlyMonitor();
        if (tab === 'embro') populateEmbroBuyerSelect();
    }

    function selectHourlyHour(jamStr, idNum) {
        document.getElementById('hourly_selected_jam').value = jamStr;
        document.getElementById('lbl_selected_hour').innerText = jamStr;
        document.getElementById('lbl_selected_hour_table').innerText = jamStr;

        
        for (let i = 7; i <= 21; i++) {
            const btn = document.getElementById(`btn_hr_${i}`);
            if (btn) btn.classList.remove('selected');
        }
        document.getElementById(`btn_hr_${idNum}`).classList.add('selected');

        fetchServerHourlyStatus(document.getElementById('hourly_tanggal').value, jamStr);
    }

    function changeHourlyDate() {
        const tgl = document.getElementById('hourly_tanggal').value;
        const jam = document.getElementById('hourly_selected_jam').value;
        fetchServerHourlyStatus(tgl, jam);
    }

    function fetchServerHourlyStatus(tgl, jam) {
        if (!tgl || !jam) { renderHourlyMonitor(); return; }
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENGECEK RIWAYAT JAM INI...';

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_hourly_data' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            let doneList = [];
            if (data.result === 'success' && data.data) {
                doneList = data.data
                    .filter(r => r.tanggal === tgl && r.jam === jam)
                    .map(r => r.nama_qc.toString().trim().toUpperCase());
            }
            if (!serverHourlyDone[tgl]) serverHourlyDone[tgl] = {};
            serverHourlyDone[tgl][jam] = [...new Set(doneList)];
            renderHourlyMonitor();
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            renderHourlyMonitor();
        });
    }

    function getOrCreateHourContext() {
        const tgl = document.getElementById('hourly_tanggal').value;
        const jam = document.getElementById('hourly_selected_jam').value;
        if (!tgl || !jam) return null;

        if (!hourlyLocalCache[tgl]) hourlyLocalCache[tgl] = {};
        if (!hourlyLocalCache[tgl][jam]) hourlyLocalCache[tgl][jam] = {};

        return hourlyLocalCache[tgl][jam];
    }

    function saveHourlyToLocal() {
        const context = getOrCreateHourContext();
        if (!context) return;

        let nama = document.getElementById('hourly_nama').value;
        if (nama === 'MANUAL') nama = document.getElementById('hourly_nama_manual').value.trim().toUpperCase();
        const good = document.getElementById('hourly_qty_good').value;
        const defect = document.getElementById('hourly_qty_defect').value;

        if (!nama || good === '' || defect === '') {
            Swal.fire('Perhatian', 'Pilih/Ketik Nama QC, Isi Qty Good & Defect terlebih dahulu!', 'warning');
            return;
        }

        const gNum = parseInt(good) || 0;
        const dNum = parseInt(defect) || 0;

        context[nama] = {
            qty_good: gNum,
            qty_defect: dNum,
            qty_inspect: gNum + dNum
        };

        localStorage.setItem('spv_hourly_local_cache', JSON.stringify(hourlyLocalCache));
        
        
        document.getElementById('hourly_nama').value = "";
        document.getElementById('hourly_nama_manual').value = "";
        toggleHourlyManualQC("");
        document.getElementById('hourly_qty_good').value = "";
        document.getElementById('hourly_qty_defect').value = "";

        if (navigator.vibrate) navigator.vibrate(40);
        renderHourlyMonitor();
    }

    function renderHourlyMonitor() {
        const tgl = document.getElementById('hourly_tanggal').value;
        const jam = document.getElementById('hourly_selected_jam').value;
        const tbody = document.getElementById('hourly_monitor_body');
        
        if (!tgl || !jam) return;
        
        const currentDataJam = (hourlyLocalCache[tgl] && hourlyLocalCache[tgl][jam]) ? hourlyLocalCache[tgl][jam] : {};
        const doneOnServer = (serverHourlyDone[tgl] && serverHourlyDone[tgl][jam]) ? serverHourlyDone[tgl][jam] : [];

        let htmlRows = "";
        listSemuaQC.forEach(qc => {
            const dataQC = currentDataJam[qc];
            const isOnServer = doneOnServer.includes(qc);

            if (isOnServer) {
                htmlRows += `
                <tr style="background: rgba(16, 185, 129, 0.25); font-weight:600;">
                    <td style="padding:10px; border:1px solid var(--border-line); text-align:left;">${qc}</td>
                    <td style="border:1px solid var(--border-line);" colspan="3">-</td>
                    <td style="border:1px solid var(--border-line); color:var(--success); font-size:11px;">☁️ SUDAH DI SERVER</td>
                </tr>`;
            } else if (dataQC) {
                htmlRows += `
                <tr style="background: rgba(16, 185, 129, 0.15); font-weight:600;">
                    <td style="padding:10px; border:1px solid var(--border-line); text-align:left;">${qc}</td>
                    <td style="border:1px solid var(--border-line);">${dataQC.qty_good}</td>
                    <td style="border:1px solid var(--border-line);">${dataQC.qty_defect}</td>
                    <td style="border:1px solid var(--border-line);">${dataQC.qty_inspect}</td>
                    <td style="border:1px solid var(--border-line);">
                        <span style="color:var(--success);">✅ OK LOKAL</span>
                        <button onclick="deleteHourlyLocal('${qc}')" style="margin-left:6px; background:var(--danger); color:#fff; border:none; border-radius:3px; width:22px; height:22px; cursor:pointer; font-weight:900;">×</button>
                    </td>
                </tr>`;
            } else {
                htmlRows += `
                <tr style="color:var(--text-sub);">
                    <td style="padding:10px; border:1px solid var(--border-line); text-align:left;">${qc}</td>
                    <td style="border:1px solid var(--border-line);">-</td>
                    <td style="border:1px solid var(--border-line);">-</td>
                    <td style="border:1px solid var(--border-line);">-</td>
                    <td style="border:1px solid var(--border-line); font-style:italic; font-size:11px;">⚠️ BELUM ISI</td>
                </tr>`;
            }
        });
        tbody.innerHTML = htmlRows;

        populateHourlyNamaOptions(currentDataJam, doneOnServer);
    }

    function deleteHourlyLocal(qc) {
        const tgl = document.getElementById('hourly_tanggal').value;
        const jam = document.getElementById('hourly_selected_jam').value;
        if (!tgl || !jam) return;
        Swal.fire({
            title: 'Hapus Data?',
            text: `Hapus data lokal ${qc} untuk jam ${jam}? (Data ini belum terkirim ke server)`,
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#dc2626', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal'
        }).then(result => {
            if (result.isConfirmed) {
                if (hourlyLocalCache[tgl] && hourlyLocalCache[tgl][jam]) {
                    delete hourlyLocalCache[tgl][jam][qc];
                    localStorage.setItem('spv_hourly_local_cache', JSON.stringify(hourlyLocalCache));
                    renderHourlyMonitor();
                }
            }
        });
    }

    function populateHourlyNamaOptions(currentDataJam, doneOnServer) {
        const sel = document.getElementById('hourly_nama');
        const curVal = sel.value;
        let optsHtml = '<option value="" disabled selected>-- Pilih QC --</option>';
        listSemuaQC.forEach(qc => {
            const alreadyDone = doneOnServer.includes(qc) || !!currentDataJam[qc];
            if (!alreadyDone) optsHtml += `<option value="${qc}">${qc}</option>`;
        });
        optsHtml += '<option value="MANUAL">+ QC LAINNYA (KETIK MANUAL)</option>';
        sel.innerHTML = optsHtml;
        if ([...sel.options].some(o => o.value === curVal)) sel.value = curVal;
        toggleHourlyManualQC(sel.value);
    }

    function toggleHourlyManualQC(val) {
        const manInp = document.getElementById('hourly_nama_manual');
        if (!manInp) return;
        manInp.style.display = (val === 'MANUAL') ? 'block' : 'none';
        if (val !== 'MANUAL') manInp.value = '';
    }

    function submitHourlyMassalToServer() {
        const tgl = document.getElementById('hourly_tanggal').value;
        const jam = document.getElementById('hourly_selected_jam').value;
        if (!tgl || !jam) return;

        const currentDataJam = (hourlyLocalCache[tgl] && hourlyLocalCache[tgl][jam]) ? hourlyLocalCache[tgl][jam] : {};
        
        
        const rowsToSend = [];
        listSemuaQC.forEach(qc => {
            if (currentDataJam[qc]) {
                rowsToSend.push({
                    nama_qc: qc,
                    qty_good: currentDataJam[qc].qty_good,
                    qty_defect: currentDataJam[qc].qty_defect,
                    qty_inspect: currentDataJam[qc].qty_inspect
                });
            }
        });

        if (rowsToSend.length === 0) {
            Swal.fire('Data Kosong', 'Belum ada satu pun data QC yang diisi di hp lokal untuk jam ini!', 'warning');
            return;
        }

        
        if (rowsToSend.length < listSemuaQC.length) {
            Swal.fire({
                title: 'Belum Semua QC Diisi',
                text: `Baru ${rowsToSend.length} dari ${listSemuaQC.length} QC terisi. Tetap submit data jam ${jam} yang ada ke server?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d97706',
                confirmButtonText: 'Ya, Submit Saja',
                cancelButtonText: 'Batal'
            }).then(result => {
                if (result.isConfirmed) pushHourlyPayload(tgl, jam, rowsToSend);
            });
        } else {
            pushHourlyPayload(tgl, jam, rowsToSend);
        }
    }

    function pushHourlyPayload(tanggal, jam, rows) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENGIRIM REKAP MASSAL HOURLY...';

        const payload = {
            action: 'submit_hourly',
            tanggal,
            jam,
            rows
        };

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === 'success') {
                Swal.fire('Berhasil', `Data Jam ${jam} sebanyak ${rows.length} record sukses masuk Cloud Server!`, 'success');
                
                
                delete hourlyLocalCache[tanggal][jam];
                localStorage.setItem('spv_hourly_local_cache', JSON.stringify(hourlyLocalCache));
                renderHourlyMonitor();
            } else {
                Swal.fire('Error Server', 'Gagal: ' + data.error, 'error');
            }
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Koneksi Error', 'Gagal mentransfer data. Periksa sinyal internet!', 'error');
        });
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const dark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode_wash', dark);
        const img = document.getElementById('themeImg');
        if (img) img.src = dark ? 'logodark.png' : 'logolight.png';
    }

    function loadCacheDb() {
        const cached = localStorage.getItem('dbbuyer_wash');
        if (cached) {
            try {
                dynamicDB = JSON.parse(cached);
                populateBuyerSelect();
            } catch(e) { dynamicDB = []; }
        }
    }

    function fetchMasterDataFromServer() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENYINKRONKAN DATABASE...";

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_master_data" }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === "success" && data.data) {
                if (data.master_date) {
                    const tgl = document.getElementById('tanggal');
                    tgl.value = data.master_date;
                    tgl.classList.add('readonly-locked');
                    tgl.setAttribute('readonly', 'true');
                }
                buildDatabase(data.data);
                populateBuyerSelect();
                populateEmbroBuyerSelect();
                
                const saved = JSON.parse(localStorage.getItem('qcAutoSave3_wash') || '{}');
                if (saved.buyer) {
                    document.getElementById('buyer').value = saved.buyer;
                    updateDropdowns('buyer');
                    if (saved.style) {
                        document.getElementById('style').value = saved.style;
                        updateDropdowns('style');
                        if (saved.color) document.getElementById('color').value = saved.color;
                    }
                }
            }
        })
        .catch(() => { 
            document.getElementById('loading').style.display = 'none';
            console.warn("Offline: Menggunakan data lokal (HP).");
            buildDatabase();
            populateBuyerSelect();
        });
    }

    function buildDatabase(serverRows = null) {
        dynamicDB = [];
        let rows;

        if (serverRows) {
            rows = serverRows;
            localStorage.setItem('cached_raw_dbbuyer_wash', JSON.stringify(rows));
        } else {
            const cached = localStorage.getItem('cached_raw_dbbuyer_wash');
            rows = cached ? JSON.parse(cached) : [];
        }

        if (rows.length > 1) { 
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][1]) {
                    dynamicDB.push({
                        buyer: rows[i][0].toString().trim().toUpperCase(),
                        style: rows[i][1].toString().trim().toUpperCase(),
                        color: rows[i][2] ? rows[i][2].toString().trim().toUpperCase() : "-"
                    });
                }
            }
        }
        localStorage.setItem('dbbuyer_wash', JSON.stringify(dynamicDB));
    }

    function populateBuyerSelect() {
        const el = document.getElementById('buyer');
        const cur = el.value;
        const buyers = [...new Set(dynamicDB.map(r => r.buyer))].filter(Boolean).sort();
        el.innerHTML = '<option value="" disabled selected>-- Pilih Buyer --</option>' +
            buyers.map(b => `<option value="${b}">${b}</option>`).join('');
        if (buyers.includes(cur)) el.value = cur;
    }

    function updateDropdowns(source) {
        const elBuyer = document.getElementById('buyer');
        const elStyle = document.getElementById('style');
        const elColor = document.getElementById('color');
        const curBuyer = elBuyer.value;
        const curStyle = elStyle.value;

        if (source === 'buyer') {
            elStyle.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>';
            elColor.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>';
        }
        if (source === 'style') {
            elColor.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>';
        }

        if (curBuyer) {
            const filtered = dynamicDB.filter(r => r.buyer === curBuyer);
            const styles = [...new Set(filtered.map(r => r.style))].filter(Boolean).sort();
            if (source !== 'style' && source !== 'color') {
                elStyle.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>' +
                    styles.map(s => `<option value="${s}">${s}</option>`).join('');
                if (styles.includes(curStyle)) elStyle.value = curStyle;
            }
        }

        const nowStyle = elStyle.value;
        if (curBuyer && nowStyle) {
            const colors = [...new Set(dynamicDB.filter(r => r.buyer === curBuyer && r.style === nowStyle).map(r => r.color))].filter(Boolean).sort();
            elColor.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>' +
                colors.map(c => `<option value="${c}">${c}</option>`).join('');
        }
    }

    function openMenuSPV() {
        const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
        if (!isSpv) {
            Swal.fire({
                title: 'AKSES SPV DIPERLUKAN',
                html: `<div style="font-size:12px;font-weight:600;color:var(--text-sub);line-height:1.5;">Mode SPV belum aktif di perangkat ini.<br><br>Silakan login SPV lewat menu utama (halaman depan) terlebih dahulu. Setelah itu Menu SPV di sini akan otomatis terbuka tanpa perlu password lagi.</div>`,
                icon: 'warning',
                confirmButtonColor: '#0f172a',
                confirmButtonText: 'MENGERTI'
            });
            return;
        }
        const modal = document.getElementById('spvMenuModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        openModalWithHistory('spvMenuModal');
    }

    function openPreviewSummaryModal() {
        closeSPVMenuModal();
        setTimeout(() => {
            document.getElementById('ps_search_view').style.display = 'block';
            document.getElementById('ps_data_view').style.display = 'none';
            selectedPreviewData = null;
            const modal = document.getElementById('previewSummaryModal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
            openModalWithHistory('previewSummaryModal');
            fetchTrackerDataForPreview();
        }, 300);
    }
    function closePreviewSummaryModal(e) {
        if (e && e.target !== e.currentTarget) return;
        closeModalWithHistory();
        const modal = document.getElementById('previewSummaryModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
        selectedPreviewData = null;
    }
    function fetchTrackerDataForPreview() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MEMUAT DATA TRACKER...';
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_tracker', password: 'DEMO' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            renderPreviewTrackerList(data.result === 'success' && data.tracker_data ? data.tracker_data : []);
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            renderPreviewTrackerList([]);
            Swal.fire('Error', 'Gagal terhubung ke server.', 'error');
        });
    }
    function renderPreviewTrackerList(items) {
        const list = document.getElementById('ps_sheet_list');
        if (!items || items.length === 0) {
            list.innerHTML = `<div class="empty-state">TIDAK ADA DATA DI DB_DEFECTS SAAT INI.</div>`;
            return;
        }
        list.innerHTML = items.map((item, i) => `
            <div class="tracker-item" onclick="selectPreviewItem(${i},'${escJS(item.buyer)}','${escJS(item.style)}','${escJS(item.color)}')">
                <div style="display:flex;flex-direction:column;gap:5px;">
                    <span class="tracker-badge">${item.buyer}</span>
                    <span>${item.style} - ${item.color}</span>
                </div>
            </div>`).join('');
    }
    function selectPreviewItem(index, buyer, style, color) {
        selectedPreviewData = { buyer, style, color };
        executePreviewSummary();
    }
    function executePreviewSummary() {
        if (!selectedPreviewData) return;

        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENYUSUN PREVIEW...';

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'preview_generate_summary',
                password: 'DEMO',
                buyer: selectedPreviewData.buyer,
                style: selectedPreviewData.style,
                color: selectedPreviewData.color
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === 'success') {
                document.getElementById('ps_sheet_title').innerText = `${selectedPreviewData.buyer} - ${selectedPreviewData.style} - ${selectedPreviewData.color}`;
                const table = document.getElementById('ps_table');
                table.innerHTML = data.values.map(row =>
                    '<tr>' + row.map(cell => `<td style="border:1px solid var(--border-line);padding:4px 6px;">${cell !== null && cell !== undefined ? cell : ''}</td>`).join('') + '</tr>'
                ).join('');
                document.getElementById('ps_search_view').style.display = 'none';
                document.getElementById('ps_data_view').style.display = 'block';
            } else {
                Swal.fire('Error', data.error || 'Gagal memuat preview.', 'error');
            }
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Gagal terhubung ke server.', 'error');
        });
    }
    function backToPSList() {
        document.getElementById('ps_search_view').style.display = 'block';
        document.getElementById('ps_data_view').style.display = 'none';
        selectedPreviewData = null;
    }

    function closeSPVMenuModal(e) {
        if (e && e.target !== e.currentTarget) return;
        closeModalWithHistory();
        const modal = document.getElementById('spvMenuModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    function openMenuAbsen() {
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        document.getElementById('absen_tanggal').value = dateStr;
        document.getElementById('absen_nama').value = '';
        document.getElementById('absen_alasan').value = '';

        const modal = document.getElementById('absenModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        openModalWithHistory('absenModal');
    }

    function closeMenuAbsen(e) {
        if (e && e.target !== e.currentTarget) return;
        closeModalWithHistory();
        const modal = document.getElementById('absenModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    function submitAbsen() {
        const tanggal = document.getElementById('absen_tanggal').value;
        const nama = document.getElementById('absen_nama').value;
        const alasan = document.getElementById('absen_alasan').value.trim();

        if (!tanggal || !nama || !alasan) {
            Swal.fire('Perhatian', 'Semua kolom (Tanggal, Nama, Alasan) harus diisi!', 'warning');
            return;
        }

        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENGIRIM ABSEN...';

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'submit_absen',
                version: APP_VERSION,
                tanggal: tanggal,
                nama_qc: nama,
                status_absen: 'ABSEN',
                alasan: alasan,
                shift_start: '00:00',
                shift_end: '00:00',
                kerja_kotor: 0,
                jam_istirahat: 0,
                efektif_kerja: 0,
                qty_inspect: 0,
                qty_good: 0,
                qty_defect: 0,
                pct_defect: '0',
                pph: 0
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === 'success' || data.status === 'success') {
                Swal.fire('Berhasil', `Absen untuk ${nama} telah tercatat!`, 'success');
                closeMenuAbsen();
            } else {
                Swal.fire('Error', 'Gagal dari server: ' + (data.error || 'Server Error'), 'error');
            }
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Gagal terhubung ke server', 'error');
        });
    }

    function openKelolaDataSPV() {
        closeSPVMenuModal();
        setTimeout(() => {
            openMasterDataModal();
        }, 300);
    }

    function openMasterDataModal() {
        const buyers = [...new Set(dynamicDB.map(r => r.buyer))].sort();
        const buyerOpts = buyers.map(b => `<option value="${b}">${b}</option>`).join('');

        Swal.fire({
            title: 'KELOLA MASTER DATA',
            html: `
                <div style="text-align:left;display:flex;flex-direction:column;gap:10px;">
                    <label style="font-size:11px;font-weight:800;color:#6b7280;font-family:'Inter', sans-serif;">1. PILIH / KETIK BUYER:</label>
                    <select id="sw-b" class="swal2-select" style="width:100%;margin:0;font-family:'Inter', sans-serif;" onchange="updateSwalStyles(this.value)">
                        <option value="" disabled selected>-- Pilih Buyer --</option>
                        ${buyerOpts}
                        <option value="MANUAL" style="color:red;">+ KETIK BUYER BARU</option>
                    </select>
                    <input id="sw-b-manual" class="swal2-input" placeholder="Nama Buyer Baru (HURUF KAPITAL)..." style="display:none;margin:0;width:100%;font-family:'Inter', sans-serif;">
                    <label style="font-size:11px;font-weight:800;color:#6b7280;font-family:'Inter', sans-serif;">2. PILIH / KETIK STYLE:</label>
                    <select id="sw-s" class="swal2-select" style="width:100%;margin:0;font-family:'Inter', sans-serif;" onchange="toggleManualStyle(this.value)">
                        <option value="" disabled selected>-- Pilih Buyer Dulu --</option>
                    </select>
                    <input id="sw-s-manual" class="swal2-input" placeholder="Nama Style Baru..." style="display:none;margin:0;width:100%;font-family:'Inter', sans-serif;">
                    <label style="font-size:11px;font-weight:800;color:#6b7280;font-family:'Inter', sans-serif;">3. NAMA COLOR BARU:</label>
                    <input id="sw-c" class="swal2-input" placeholder="Cth: NEON GREEN" style="margin:0;width:100%;text-transform:uppercase;font-family:'Inter', sans-serif;">
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'SIMPAN KE SERVER',
            cancelButtonText: 'BATAL',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            preConfirm: () => {
                const bSel  = document.getElementById('sw-b').value;
                const bMan  = (document.getElementById('sw-b-manual').value || '').trim().toUpperCase();
                const sSel  = document.getElementById('sw-s').value;
                const sMan  = (document.getElementById('sw-s-manual').value || '').trim().toUpperCase();
                const color = (document.getElementById('sw-c').value || '').trim().toUpperCase();
                const finalBuyer = bSel === 'MANUAL' ? bMan : bSel;
                const finalStyle = sSel === 'MANUAL' ? sMan : sSel;
                
                if (!finalBuyer || !finalStyle || !color) {
                    Swal.showValidationMessage('Semua kolom data harus diisi!');
                    return false;
                }
                return { buyer: finalBuyer, style: finalStyle, color };
            }
        }).then(result => {
            if (result.isConfirmed) submitNewMasterData(result.value);
        });
    }

    function updateSwalStyles(buyer) {
        const bManual = document.getElementById('sw-b-manual');
        const sDrop   = document.getElementById('sw-s');
        const sManual = document.getElementById('sw-s-manual');
        if (buyer === 'MANUAL') {
            bManual.style.display = 'block';
            sDrop.innerHTML = '<option value="MANUAL" selected>+ KETIK STYLE BARU</option>';
            sManual.style.display = 'block';
        } else {
            bManual.style.display = 'none';
            sManual.style.display = 'none';
            const styles = [...new Set(dynamicDB.filter(r => r.buyer === buyer).map(r => r.style))].sort();
            sDrop.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>' +
                styles.map(s => `<option value="${s}">${s}</option>`).join('') +
                '<option value="MANUAL" style="color:red;">+ KETIK STYLE BARU</option>';
        }
    }

    function toggleManualStyle(style) {
        document.getElementById('sw-s-manual').style.display = style === 'MANUAL' ? 'block' : 'none';
    }

    function submitNewMasterData(data) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENYIMPAN KE MASTER...';
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_custom_data', buyer: data.buyer, style: data.style, color: data.color }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(res => {
            document.getElementById('loading').style.display = 'none';
            if (res.result === 'success' || res.status === 'success') {
                Swal.fire('Berhasil!', `${data.buyer} / ${data.style} / ${data.color} ditambahkan ke database master.`, 'success');
                fetchMasterDataFromServer();
            } else {
                throw new Error(res.error || 'Gagal simpan');
            }
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Gagal terhubung ke server. Periksa koneksi internet.', 'error');
        });
    }

    function fetchStaticData() {
        const buyer = document.getElementById('buyer').value;
        const style = document.getElementById('style').value;
        const color = document.getElementById('color').value;
        const lockFields = ['qty_order','deliver','from_sewing','send_washing','received_washing'];

        if (!buyer || !style || !color) {
            lockFields.forEach(id => {
                const el = document.getElementById(id);
                el.classList.remove('readonly-locked');
                el.removeAttribute('readonly');
            });
            return;
        }

        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENGECEK DATA...';

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'check_static', buyer, style, color }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === 'success') {
                document.getElementById('qty_order').value        = data.qty_order;
                document.getElementById('deliver').value          = data.deliver;
                document.getElementById('from_sewing').value      = data.from_sewing;
                document.getElementById('send_washing').value     = data.send_washing;
                document.getElementById('received_washing').value = data.received_washing;
                lockFields.forEach(id => {
                    const el = document.getElementById(id);
                    el.classList.add('readonly-locked');
                    el.setAttribute('readonly', 'true');
                });
                if (data.line_name) {
                    const lineVal = document.getElementById('line_name').value;
                    if (!lineVal) {
                        document.getElementById('line_name').value = data.line_name;
                        selectedLines = data.line_name.split(',').map(x => x.trim()).filter(x => x);
                    }
                }
            } else {
                lockFields.forEach(id => {
                    const el = document.getElementById(id);
                    el.classList.remove('readonly-locked');
                    el.removeAttribute('readonly');
                });
            }
            saveData();
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
        });
    }

    function openActionSheet() {
        const sheet = document.getElementById('actionSheet');
        sheet.style.display = 'flex';
        setTimeout(() => sheet.classList.add('show'), 10);
    }
    function closeActionSheet(e) {
        if (e && e.target !== e.currentTarget) return;
        const sheet = document.getElementById('actionSheet');
        sheet.classList.remove('show');
        setTimeout(() => sheet.style.display = 'none', 300);
    }
    function runAction(func) {
        closeActionSheet();
        setTimeout(func, 300);
    }

    function openTutupShiftModal() {
        closeSPVMenuModal();
        setTimeout(() => {
            const modal = document.getElementById('tutupShiftModal');
            document.getElementById('ts_step2').style.display = 'block';
            selectedTSData = null;
            completedTSItems = [];
            totalTSItems = 0;
            document.getElementById('ts_date_label').innerText = '';
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
            openModalWithHistory('tutupShiftModal');
            fetchTodayData();
        }, 300);
    }

    function fetchTodayData() {
        const tanggal = document.getElementById('tanggal').value;
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MEMUAT DATA HARI INI...';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_today_data', password: 'DEMO', tanggal }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            signal: controller.signal
        })
        .then(res => { clearTimeout(timeoutId); return res.text(); })
        .then(text => {
            document.getElementById('loading').style.display = 'none';
            try {
                const data = JSON.parse(text);
                if (data.tanggal_dashboard) {
                    document.getElementById('ts_date_label').innerText = '(' + data.tanggal_dashboard + ')';
                }
                renderTSList(data.result === 'success' && data.data_hari_ini && data.data_hari_ini.length > 0 ? data.data_hari_ini : []);
            } catch(e) {
                renderTSList([]);
                Swal.fire('Error', 'Gagal membaca data dari server.', 'error');
            }
        })
        .catch(() => {
            clearTimeout(timeoutId);
            document.getElementById('loading').style.display = 'none';
            renderTSList([]);
            Swal.fire('Error Koneksi', 'Gagal terhubung ke server.', 'error');
        });
    }
    
    function closeTutupShiftModal(e) {
        if (e && e.target !== e.currentTarget) return;
        closeModalWithHistory();
        const modal = document.getElementById('tutupShiftModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
        ['ts_qty_send','ts_qty_receive','ts_handfeel','ts_color','ts_result'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('ts_list_view').style.display = 'block';
        document.getElementById('ts_form_view').style.display = 'none';
        selectedTSData = null;
    }

    function renderTSList(items) {
        document.getElementById('ts_step2').style.display = 'block';
        document.getElementById('ts_list_view').style.display = 'block';
        document.getElementById('ts_form_view').style.display = 'none';
        const list = document.getElementById('ts_item_list');
        selectedTSData = null;
        if (!items || items.length === 0) {
            totalTSItems = 0;
            list.innerHTML = `<div class="empty-state">TIDAK ADA DATA HARI INI DI DATABASE.</div>`;
            return;
        }
        totalTSItems = items.length;
        list.innerHTML = items.map((item, i) => `
            <div class="tracker-item ${completedTSItems.includes(i) ? 'done' : ''}" id="ts_item_${i}" onclick="selectTSItem(${i},'${escJS(item.buyer)}','${escJS(item.style)}','${escJS(item.color)}')">
                <div style="display:flex;flex-direction:column;gap:5px;">
                    <span class="tracker-badge">${item.buyer}</span>
                    <span>${item.style} - ${item.color}</span>
                </div>
                <span class="badge-done">✅</span>
            </div>`).join('');
    }
    function selectTSItem(index, buyer, style, color) {
        selectedTSData = { index, buyer, style, color };
        document.getElementById('ts_selected_label').innerText = `${buyer} | ${style} - ${color}`;
        ['ts_qty_send','ts_qty_receive','ts_handfeel','ts_color','ts_result'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('ts_list_view').style.display = 'none';
        document.getElementById('ts_form_view').style.display = 'block';
    }
    function backToTSList() {
        document.getElementById('ts_list_view').style.display = 'block';
        document.getElementById('ts_form_view').style.display = 'none';
        selectedTSData = null;
    }
    function executeRecapSPV() {
        if (!selectedTSData) return;
        const payload = {
            action: 'recap', password: 'DEMO',
            tanggal: document.getElementById('tanggal').value,
            buyer: selectedTSData.buyer, style: selectedTSData.style, color: selectedTSData.color,
            qty_send: document.getElementById('ts_qty_send').value,
            qty_receive: document.getElementById('ts_qty_receive').value,
            handfeel: document.getElementById('ts_handfeel').value.trim(),
            color_eval: document.getElementById('ts_color').value.trim(),
            result_wash: document.getElementById('ts_result').value.trim()
        };
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENYIMPAN EVALUASI...';
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
            if (!completedTSItems.includes(selectedTSData.index)) completedTSItems.push(selectedTSData.index);
            const el = document.getElementById(`ts_item_${selectedTSData.index}`);
            if (el) el.classList.add('done');
            Swal.fire({ title: '✅ TERSIMPAN', text: 'Data evaluasi berhasil disimpan!', icon: 'success', timer: 1500, showConfirmButton: false });
            backToTSList();
        });
    }
    function finalizeTutupShift() {
        if (totalTSItems === 0) { closeTutupShiftModal(); return; }
        if (completedTSItems.length < totalTSItems) {
            Swal.fire('Belum Selesai!', 'Pastikan semua item sudah diklik dan disave (tercentang hijau).', 'warning');
            return;
        }
        Swal.fire({
            title: 'Tutup Shift?',
            text: 'Semua data sudah dievaluasi. Akan mencetak lembar Dashboard baru untuk shift berikutnya.',
            icon: 'question', showCancelButton: true,
            confirmButtonText: 'Ya, Tutup Shift!', confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444'
        }).then(result => {
            if (result.isConfirmed) {
                const tanggal = document.getElementById('tanggal').value;
                document.getElementById('loading').style.display = 'flex';
                document.getElementById('loading-text').innerText = 'MEMUAT DASHBOARD BARU...';
                fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'finalize_shift', password: 'DEMO', tanggal }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                })
                .then(res => res.json())
                .then(data => {
                    document.getElementById('loading').style.display = 'none';
                    if (data.result === 'success') {
                        Swal.fire('Sukses', 'Shift berhasil ditutup!', 'success');
                        closeTutupShiftModal();
                    } else {
                        Swal.fire('Error', data.error || 'Terjadi kesalahan.', 'error');
                    }
                })
                .catch(() => {
                    document.getElementById('loading').style.display = 'none';
                    Swal.fire('Error', 'Koneksi terputus.', 'error');
                });
            }
        });
    }

    function openGenBuyerModal() {
        closeSPVMenuModal();
        setTimeout(() => {
            const modal = document.getElementById('summaryBuyerModal');
            document.getElementById('gen_step2').style.display = 'block';
            selectedTrackerData = null;
            completedGenItems = [];
            document.getElementById('tracker_list').innerHTML = '';
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
            openModalWithHistory('summaryBuyerModal');
            fetchTrackerData();
        }, 300);
    }
    function closeGenBuyerModal(e) {
        if (e && e.target !== e.currentTarget) return;
        closeModalWithHistory();
        const modal = document.getElementById('summaryBuyerModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
        ['gen_supplier','gen_shipment'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('gen_list_view').style.display = 'block';
        document.getElementById('gen_form_view').style.display = 'none';
        selectedTrackerData = null;
    }

    function fetchTrackerData() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MEMUAT DATA TRACKER...';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_tracker', password: 'DEMO' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            signal: controller.signal
        })
        .then(res => { clearTimeout(timeoutId); return res.text(); })
        .then(text => {
            document.getElementById('loading').style.display = 'none';
            try {
                const data = JSON.parse(text);
                renderTrackerList(data.result === 'success' && data.tracker_data && data.tracker_data.length > 0 ? data.tracker_data : []);
            } catch(e) {
                renderTrackerList([]);
                Swal.fire('Error', 'Gagal membaca data dari server.', 'error');
            }
        })
        .catch(() => {
            clearTimeout(timeoutId);
            document.getElementById('loading').style.display = 'none';
            renderTrackerList([]);
            Swal.fire('Error Koneksi', 'Gagal terhubung ke server.', 'error');
        });
    }
    function renderTrackerList(items) {
        document.getElementById('gen_step2').style.display = 'block';
        document.getElementById('gen_list_view').style.display = 'block';
        document.getElementById('gen_form_view').style.display = 'none';
        const list = document.getElementById('tracker_list');
        selectedTrackerData = null;
        if (!items || items.length === 0) {
            list.innerHTML = `<div class="empty-state">TIDAK ADA DATA DI D_DEFECT SAAT INI.</div>`;
            return;
        }
        list.innerHTML = items.map((item, i) => `
            <div class="tracker-item ${completedGenItems.includes(i) ? 'done' : ''}" id="gen_item_${i}" onclick="selectTrackerItem(${i},'${escJS(item.buyer)}','${escJS(item.style)}','${escJS(item.color)}')">
                <div style="display:flex;flex-direction:column;gap:5px;">
                    <span class="tracker-badge">${item.buyer}</span>
                    <span>${item.style} - ${item.color}</span>
                </div>
                <span class="badge-done">✅</span>
            </div>`).join('');
    }
    function selectTrackerItem(index, buyer, style, color) {
        selectedTrackerData = { index, buyer, style, color };
        document.getElementById('gen_selected_label').innerText = `${buyer} | ${style} - ${color}`;
        ['gen_supplier','gen_shipment'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('gen_per_style').checked = false;
        document.getElementById('gen_list_view').style.display = 'none';
        document.getElementById('gen_form_view').style.display = 'block';
    }
    function backToGenList() {
        document.getElementById('gen_list_view').style.display = 'block';
        document.getElementById('gen_form_view').style.display = 'none';
        selectedTrackerData = null;
    }
    function executeGenerateSummaryBuyer() {
        if (!selectedTrackerData) return;
        const supplier = document.getElementById('gen_supplier').value.trim();
        const shipment = document.getElementById('gen_shipment').value;
        if (!supplier) { Swal.fire('Perhatian', 'Nama Supplier wajib diisi!', 'warning'); return; }
        if (!shipment) { Swal.fire('Perhatian', 'Tanggal Shipment wajib diisi!', 'warning'); return; }
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'GENERATING SUMMARY BUYER...';
        
        const perStyle = document.getElementById('gen_per_style').checked;
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'generate_summary', password: 'DEMO', buyer: selectedTrackerData.buyer, style: selectedTrackerData.style, color: selectedTrackerData.color, supplier, shipment, per_style: perStyle }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
            if (!completedGenItems.includes(selectedTrackerData.index)) completedGenItems.push(selectedTrackerData.index);
            const el = document.getElementById(`gen_item_${selectedTrackerData.index}`);
            if (el) el.classList.add('done');
            setTimeout(() => {
                Swal.fire({ title: '✅ BERHASIL', text: 'Summary Buyer berhasil digenerate! Silakan cek Spreadsheet Anda.', icon: 'success', timer: 1500, showConfirmButton: false });
            }, 400);
            backToGenList();
        });
    }

    function openLineModal() {
        if (document.getElementById('line_name').classList.contains('readonly-locked')) return;
        const cur = document.getElementById('line_name').value;
        selectedLines = cur ? cur.split(',').map(x => x.trim()).filter(x => x) : [];
        selectedNum = "";
        selectedSuf = "";
        renderLineModal();
        const modal = document.getElementById('lineModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        openModalWithHistory('lineModal');
    }

    function closeLineModal(e) {
        if (e && e.target !== e.currentTarget) return;
        _dismissLineModal();
    }

    function saveAndCloseLineModal() {
        _dismissLineModal();
    }

    function _dismissLineModal() {
        closeModalWithHistory();
        const modal = document.getElementById('lineModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
        document.getElementById('line_name').value = selectedLines.join(', ');
        saveData();
    }

    function pickNum(n) { selectedNum = n; renderLineModal(); }
    function pickSuf(s) { selectedSuf = (selectedSuf === s) ? "" : s; renderLineModal(); }

    function addLineToTag() {
        if (!selectedNum) { Swal.fire('Perhatian', 'Pilih angka line terlebih dahulu!', 'warning'); return; }
        const newLine = selectedNum + selectedSuf;
        if (!selectedLines.includes(newLine)) selectedLines.push(newLine);
        selectedNum = ""; selectedSuf = "";
        renderLineModal();
        if (navigator.vibrate) navigator.vibrate(50);
    }

    function removeLineTag(line) {
        selectedLines = selectedLines.filter(x => x !== line);
        renderLineModal();
    }

    function renderLineModal() {
        const tagsHtml = selectedLines.length
            ? selectedLines.map(l => `<div class="line-tag">${l} <span onclick="removeLineTag('${l}'); event.stopPropagation();">×</span></div>`).join('')
            : `<span style="color:var(--text-sub);font-size:11px;margin:auto;">Pilih angka di bawah...</span>`;
        document.getElementById('lineTags').innerHTML = tagsHtml;

        let numsHtml = '';
        for (let i = 1; i <= 20; i++) {
            numsHtml += `<button class="num-btn ${selectedNum == i ? 'selected' : ''}" onclick="pickNum('${i}')">${i}</button>`;
        }
        document.getElementById('gridNumbers').innerHTML = numsHtml;

        const sufs = [{ val: "", label: "ANGKA SAJA" }, { val: "A", label: "A" }, { val: "B", label: "B" }];
        document.getElementById('gridSuffix').innerHTML = sufs.map(s =>
            `<button class="suf-btn ${selectedSuf === s.val ? 'selected' : ''}" onclick="pickSuf('${s.val}')">${s.label}</button>`
        ).join('');
    }
    const typeSewingGeneral = [
        "BROKEN STITCH","FABRIC DEFECT","INCONSISTENT","MISSING","PLEATED",
        "POORSHAPE/POINTED/EXPOSED","PUCKERING","RUN OF STITCH","SHADING",
        "SKIP STITCH","STAIN","TRIMMING","TWIST/ROPPING/FULLNESS","UNMATCH/HIGH LOW"
    ];
    const defectMaster = {
        "SEWING": {
            "ARMHOLE": typeSewingGeneral,"BACK BODY": typeSewingGeneral,"BARTACK": typeSewingGeneral,
            "BOTTOM HEMMING": typeSewingGeneral,"BUTTON": typeSewingGeneral,"BUTTON HOLE": typeSewingGeneral,
            "COLLAR/NECK": typeSewingGeneral,"DECORATIVE": typeSewingGeneral,"FRONT BODY": typeSewingGeneral,
            "FRONT PLACKET": typeSewingGeneral,"FRONT/BACK RISE": typeSewingGeneral,"HANDMADE": typeSewingGeneral,
            "INSEAM/OUTSEAM": typeSewingGeneral,"LINING": typeSewingGeneral,"MAIN LABEL/CARE LABEL": typeSewingGeneral,
            "MANSET": typeSewingGeneral,"OVERLOOK": typeSewingGeneral,"POCKET": typeSewingGeneral,
            "SHOULDER": typeSewingGeneral,"SIDE SEAM": typeSewingGeneral,"SLEEVE": typeSewingGeneral,
            "SLIT/VENT": typeSewingGeneral,"STEAM/IRONING": typeSewingGeneral,"UNCORRECT SEAM ALLOWANCE":typeSewingGeneral,"WAIST": typeSewingGeneral
        },
        "FINISHING": {
            "BUTTON": ["BROKEN","MISSING"],"BUTTON HOLE": ["BROKEN"],"HAND MADE": ["BROKEN","MISSING"],
            "IRONING": ["CREASEMARK","EXPOSED","SHINING"],"OTHER": ["-"],"SHADING": ["-"],
            "SIZE SPEC": ["-"],"STAIN": ["ENVIRONMENT","OIL"],"TRIMMING": ["-"],
            "WEAVING DEFFECT": ["HOLE","SLUB","YARNPULL"]
        },
        "WASHING": {
            "BALD VALVET": ["-"],"BLEEDING": ["-"],"CREASEMARK": ["-"],"CRUMPLE": ["-"],
            "HARSH HANDFEEL": ["-"],"LESS EFFECT": ["-"],"LINE EFFECT": ["-"],"ODOR": ["-"],
            "OUT OF SHADE": ["-"],"SOBEK": ["-"],"TOO SOFT HANDFEEL": ["-"],"UNEVEN COLOR": ["-"],
            "UNLEVEL EFFECT": ["-"],"WHITE MARK": ["-"]
        }
    };

    function switchCategory(cat) {
        currentCategory = cat;
        ['SEWING','FINISHING','WASHING'].forEach(c => {
            document.getElementById(`tab_${c.toLowerCase()}`).classList.toggle('active', c === cat);
        });
        const typeCont = document.getElementById('type_container');
        const areaCont = document.getElementById('area_container');
        if (cat === 'WASHING') {
            typeCont.style.display = 'none';
            areaCont.style.gridColumn = 'span 2';
        } else {
            typeCont.style.display = 'flex';
            areaCont.style.gridColumn = 'span 1';
        }
        populateArea();
    }

    function populateArea() {
        const selArea = document.getElementById('sel_area');
        selArea.innerHTML = '<option value="" disabled selected>-- Pilih Area --</option>';
        Object.keys(defectMaster[currentCategory]).sort().forEach(area => {
            selArea.innerHTML += `<option value="${area}">${area}</option>`;
        });
        document.getElementById('sel_type').innerHTML = '<option value="" disabled selected>-- Pilih Jenis --</option>';
    }

    function populateType() {
        const area = document.getElementById('sel_area').value;
        const selType = document.getElementById('sel_type');
        selType.innerHTML = '<option value="" disabled selected>-- Pilih Jenis --</option>';
        if (area && defectMaster[currentCategory][area]) {
            const types = [...defectMaster[currentCategory][area]].sort();
            if (types.length === 1 && types[0] === '-') {
                selType.innerHTML = '<option value="-">TIDAK ADA SUB-JENIS</option>';
                selType.value = '-';
            } else {
                types.forEach(t => selType.innerHTML += `<option value="${t}">${t}</option>`);
                if (types.length === 1) selType.value = types[0];
            }
        }
    }

    function initChart() {
        const ctx = document.getElementById('defectChart').getContext('2d');
        defectChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Good','Defect'], datasets: [{ data: [1,0], backgroundColor: ['#cbd5e1','#ef4444'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }

    function addDefectToList() {
        const area = document.getElementById('sel_area').value;
        const type = currentCategory === 'WASHING' ? '-' : document.getElementById('sel_type').value;
        if (!area || !type) { Swal.fire('Perhatian', 'Pilih Area dan Jenis Defect terlebih dahulu.', 'warning'); return; }
        const key = `${currentCategory}_${area}_${type}`;
        if (activeDefects[key]) { Swal.fire('Info', 'Defect ini sudah ada di daftar.', 'info'); return; }
        activeDefects[key] = { cat: currentCategory, area, type, qty: '' };
        document.getElementById('sel_area').value = '';
        document.getElementById('sel_type').value = '';
        renderDefectList();
        if (navigator.vibrate) navigator.vibrate(50);
    }

    function renderDefectList() {
        const container = document.getElementById('active_defects_container');
        const keys = Object.keys(activeDefects);
        if (keys.length === 0) {
            container.innerHTML = `<div class="empty-state">BELUM ADA DEFECT YANG DITAMBAHKAN.<br><span style="font-weight:600;font-size:10px;display:block;margin-top:8px;text-transform:none;letter-spacing:0px;">Silakan pilih Area &amp; Jenis di atas lalu klik Tambahkan.</span></div>`;
        } else {
            container.innerHTML = keys.map(key => {
                const item = activeDefects[key];
                const typeSubtitle = item.type === '-' ? '' : `<span class="summary-subtitle">&#8627; ${item.type}</span>`;
                return `
                <div class="summary-card">
                    <div class="summary-header">
                        <div class="summary-title"><span>${item.area}</span>${typeSubtitle}</div>
                        <div style="display:flex;gap:6px;align-items:center;">
                        <button class="btn-del" style="background:var(--accent-gold);border-color:var(--accent-gold);" onclick="showDefectInfo('${item.type.replace(/'/g, "\\'")}','${item.area.replace(/'/g, "\\'")}')">?</button>
                        <button class="btn-del" onclick="removeDefect('${key}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                            </svg>
                        </button>
                        </div>
                    </div>
                    <div class="flex-inputs">
                        <div class="stepper">
                            <button onclick="adjVal('${key}',-1)">-</button>
                            <input type="number" id="inp_qty_${key}" value="${item.qty}" oninput="manualInput('${key}',this.value)">
                            <button onclick="adjVal('${key}',1)">+</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
        calculate();
    }

    function adjVal(key, amount) {
        const val = parseInt(activeDefects[key].qty) || 0;
        const newVal = val + amount;
        activeDefects[key].qty = newVal > 0 ? newVal : '';
        const el = document.getElementById(`inp_qty_${key}`);
        if (el) el.value = newVal > 0 ? newVal : '';
        if (navigator.vibrate) navigator.vibrate(40);
        calculate();
    }

    function manualInput(key, value) {
        const num = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        activeDefects[key].qty = num > 0 ? num : '';
        const el = document.getElementById(`inp_qty_${key}`);
        if (el) el.value = num > 0 ? num : '';
        calculate();
    }

    function removeDefect(key) {
        delete activeDefects[key];
        renderDefectList();
    }

    function calculate() {
        let totalDefect = 0;
        for (const key in activeDefects) {
            totalDefect += parseInt(activeDefects[key].qty) || 0;
        }
        document.getElementById('tot_def').value = totalDefect;

        const qtyGood = parseInt(document.getElementById('qty_good').value) || 0;
        const qtyInsp = qtyGood + totalDefect;

        let defPctStr = '0%', goodPctStr = '0%';
        if (qtyInsp > 0) {
            defPctStr  = ((totalDefect / qtyInsp) * 100).toFixed(1) + '%';
            goodPctStr = ((qtyGood / qtyInsp) * 100).toFixed(1) + '%';
        }
        document.getElementById('qty_insp').value  = qtyInsp;
        document.getElementById('pct_def').value   = defPctStr;
        document.getElementById('chart_good').innerText = `${qtyGood} (${goodPctStr})`;
        document.getElementById('chart_def').innerText  = totalDefect;

        const pctLabel = document.getElementById('chart_pct');
        if (qtyInsp === 0) {
            pctLabel.innerText = '0%';
            pctLabel.style.color = 'var(--text-sub)';
            if (defectChart) { 
                defectChart.data.datasets[0].data = [1,0]; 
                defectChart.data.datasets[0].backgroundColor = ['#cbd5e1','#ef4444']; 
                defectChart.update(); 
            }
        } else {
            pctLabel.innerText = defPctStr;
            pctLabel.style.color = totalDefect > 0 ? 'var(--danger)' : 'var(--success)';
            if (defectChart) { 
                defectChart.data.datasets[0].data = [qtyGood, totalDefect]; 
                defectChart.data.datasets[0].backgroundColor = ['#10b981','#ef4444']; 
                defectChart.update(); 
            }
        }
        saveData();
    }

    function calculateShiftHours() {
        const start = document.getElementById('shift_start').value;
        const end   = document.getElementById('shift_end').value;
        const istirahat = parseInt(document.getElementById('istirahat').value) || 0;
        const span  = document.getElementById('shift_hours');
        
        if (start && end) {
            const [h1,m1] = start.split(':').map(Number);
            const [h2,m2] = end.split(':').map(Number);
            let d1 = new Date(2000,0,1,h1,m1), d2 = new Date(2000,0,1,h2,m2);
            if (d2 < d1) d2.setDate(d2.getDate()+1);
            
            const diffMs = d2 - d1;
            const netMs = diffMs - (istirahat * 60 * 1000);
            
            if (netMs > 0) {
                const diffHours = netMs / (1000*60*60);
                const hours = Math.floor(diffHours);
                const mins  = Math.round((diffHours % 1) * 60);
                span.innerText = `(${hours} Jam${mins > 0 ? ' '+mins+' Menit' : ''})`;
            } else {
                span.innerText = '(0 Jam)';
            }
        } else {
            span.innerText = '';
        }
    }

    function saveData() {
        const data = {};
        document.querySelectorAll('input, textarea, select').forEach(input => {
            if (input.id &&
                !input.id.startsWith('inp_') &&
                !input.id.startsWith('filter_') &&
                !input.id.startsWith('swal-') &&
                !input.id.startsWith('gen_') &&
                !input.id.startsWith('absen_') &&
                !input.id.startsWith('ts_') &&
                !input.readOnly) {
                data[input.id] = input.value;
            }
        });
        
        const valLine = document.getElementById('line_name').value;
        if(valLine) data['line_name'] = valLine;
        
        localStorage.setItem('qcActiveDefects_wash', JSON.stringify(activeDefects));
        localStorage.setItem('qcAutoSave3_wash', JSON.stringify(data));
    }

    function loadData() {
        const saved        = localStorage.getItem('qcAutoSave3_wash');
        const savedDefects = localStorage.getItem('qcActiveDefects_wash');

        if (savedDefects) {
            try { activeDefects = JSON.parse(savedDefects); } catch(e) { activeDefects = {}; }
            renderDefectList();
        }

        if (saved) {
            const data = JSON.parse(saved);

            if (data['buyer']) { document.getElementById('buyer').value = data['buyer']; updateDropdowns('buyer'); }
            if (data['style']) { document.getElementById('style').value = data['style']; updateDropdowns('style'); }
            if (data['color']) { document.getElementById('color').value = data['color']; }

            document.querySelectorAll('input, textarea, select').forEach(input => {
                if (input.id &&
                    !['buyer','style','color'].includes(input.id) &&
                    !input.id.startsWith('inp_') &&
                    !input.id.startsWith('gen_') &&
                    !input.id.startsWith('absen_') &&
                    !input.id.startsWith('ts_') &&
                    data[input.id] !== undefined) {
                    input.value = data[input.id];
                }
            });

            const lineVal = document.getElementById('line_name').value;
            if (lineVal) selectedLines = lineVal.split(',').map(x => x.trim()).filter(x => x);

            calculateShiftHours();
            calculate();
        } else {
            setDefaultDate();
        }

        if (localStorage.getItem('darkMode_wash') === 'true') {
            document.body.classList.add('dark-mode');
            const img = document.getElementById('themeImg');
            if (img) img.src = 'logodark.png';
        }

        if (document.getElementById('buyer').value &&
            document.getElementById('style').value &&
            document.getElementById('color').value) {
            fetchStaticData();
        }

        checkOfflineBadge();
    }

    function setDefaultDate() {
        const tgl = document.getElementById('tanggal');
        if (tgl.hasAttribute('readonly')) return;
        const d = new Date();
        tgl.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function formatAntiMinus(input) { input.value = input.value.replace(/[^0-9]/g, ''); }

    function escJS(str) {
        return String(str || '').replace(/'/g,"&#39;").replace(/"/g,"&#34;");
    }

    function resetForm() {
        Swal.fire({
            title: 'Hapus Semua Formulir?', text: 'Data akan dibersihkan.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Bersihkan!'
        }).then(result => {
            if (result.isConfirmed) {
                activeDefects = {};
                renderDefectList();
                selectedLines = [];
                ['line_name','shift_start','shift_end','qty_order','deliver',
                 'from_sewing','send_washing','received_washing','qty_good','nama_qc','step'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = '';
                        el.classList.remove('readonly-locked');
                        if (id !== 'line_name') el.removeAttribute('readonly');
                    }
                });
                document.getElementById('istirahat').value = '0';
                document.getElementById('shift_hours').innerText = '';
                populateBuyerSelect();
                updateDropdowns('buyer');
                setDefaultDate();
                calculate();
                saveData();
                Swal.fire('Bersih!', 'Form sudah di-reset.', 'success');
            }
        });
    }

    function showSummaryAndSubmit() {
        const namaQC  = document.getElementById('nama_qc').value;
        const step    = document.getElementById('step').value;
        const buyer   = document.getElementById('buyer').value;
        const line    = document.getElementById('line_name').value || '-';
        const style   = document.getElementById('style').value;
        const color   = document.getElementById('color').value;
        const qtyGood = parseInt(document.getElementById('qty_good').value) || 0;
        const tDef    = parseInt(document.getElementById('tot_def').value) || 0;
        const tInsp   = qtyGood + tDef;

        if (!namaQC || !line || line === '-' || !buyer || !style || !color || !step) {
            Swal.fire('Perhatian', 'Semua kolom Wajib (NAMA QC, STEP PROSES, RUN IN LINE, BUYER, STYLE, COLOR) harus diisi!', 'warning');
            return;
        }
        if (tInsp === 0) {
            Swal.fire('Data Tidak Valid', 'Total Lulus (Good) atau Defect harus diisi!', 'error');
            return;
        }
        
        const currentDataSignature = JSON.stringify({
            buyer, style, color, step, line, qtyGood, tDef, defects: activeDefects
        });

        if (localStorage.getItem('lastSubmitSignature_wash') === currentDataSignature) {
            Swal.fire('Data Ganda Terdeteksi!', 'Kamu tidak bisa mengirim data yang sama persis berturut-turut. Cek kembali!', 'error');
            return;
        }

        Swal.fire({
            title: 'KONFIRMASI REKAP',
            html: `<div style="font-family:'Inter', sans-serif;"><b>QC:</b> ${namaQC}<br><b>Buyer:</b> ${buyer}<br><b>Run In Line:</b> ${line} | <b>Style:</b> ${style}<br><b>Color:</b> ${color}<br><b>Total Inspect:</b> ${tInsp} pcs<br><b>Total Defect:</b> <span style="color:red;font-weight:bold;">${tDef}</span> pcs<br><b>Total Lulus:</b> <span style="color:green;font-weight:bold;">${qtyGood}</span> pcs<hr>Kirim ke Server?</div>`,
            icon: 'question', showCancelButton: true,
            confirmButtonColor: '#0f172a', cancelButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Kirim!'
        }).then(result => {
            if (result.isConfirmed) executeSendToServer(line, currentDataSignature);
        });
    }

    function executeSendToServer(line, currentDataSignature) {
        const btn = document.getElementById('btnSubmitMain');
        btn.disabled = true;
        btn.innerHTML = 'MENGIRIM...';
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'SYNC TO CLOUD...';

        const defectsArray = [];
        for (const key in activeDefects) {
            const item = activeDefects[key];
            defectsArray.push({ cat: item.cat, area: item.area, type: item.type, qty: parseInt(item.qty) || 0 });
        }

        const d = new Date();
        const currentJam = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

        const payload = {
            action: 'submit', version: APP_VERSION,
            nama_qc:          document.getElementById('nama_qc').value,
            tanggal:          document.getElementById('tanggal').value,
            jam:              currentJam,
            line_name:        line,
            buyer:            document.getElementById('buyer').value || '-',
            style:            document.getElementById('style').value || '-',
            color:            document.getElementById('color').value || '-',
            qty_order:        document.getElementById('qty_order').value || 0,
            deliver:          document.getElementById('deliver').value || '-',
            qty_send:         0, 
            qty_receive:      0, 
            qty_rar:          0, 
            from_sewing:      document.getElementById('from_sewing').value || '-',
            send_washing:     document.getElementById('send_washing').value || '-',
            received_washing: document.getElementById('received_washing').value || '-',
            shift_start:      document.getElementById('shift_start').value,
            shift_end:        document.getElementById('shift_end').value,
            jam_istirahat:    document.getElementById('istirahat').value,
            qty_good:         document.getElementById('qty_good').value,
            qty_insp:         document.getElementById('qty_insp').value,
            tot_def:          document.getElementById('tot_def').value,
            pct_def:          document.getElementById('pct_def').value,
            defects:          defectsArray,
            step:             document.getElementById('step').value,
            handfeel:         '',
            color_eval:       '',
            result_wash:      ''
        };

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            btn.disabled = false;
            btn.innerHTML = 'CONFIRM &amp; SUBMIT';
            if (data.result === 'success') {
                localStorage.setItem('lastSubmitSignature_wash', currentDataSignature); 
                Swal.fire('Sukses', 'Data Washing berhasil dikirim!', 'success').then(clearAfterSubmit);
            } else if (data.error === 'VERSION_MISMATCH') {
                Swal.fire('Versi Usang!', 'Aplikasi yang Anda gunakan sudah usang. Minta file HTML versi terbaru ke SPV.', 'error');
            } else {
                Swal.fire('Error', 'Gagal dari server: ' + data.error, 'error');
            }
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            btn.disabled = false;
            btn.innerHTML = 'CONFIRM &amp; SUBMIT';
            fallbackOffline(line, payload);
        });
    }

    function openBuatDataBaruModal() {
        closeSPVMenuModal();
        setTimeout(() => {
            ['bd_buyer','bd_style','bd_color','bd_qty_order','bd_line'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('bd_qty_send').value = 0;
            document.getElementById('bd_qty_receive').value = 0;
            const modal = document.getElementById('buatDataModal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
            openModalWithHistory('buatDataModal');
        }, 300);
    }
    function closeBuatDataBaruModal(e) {
        if (e && e.target !== e.currentTarget) return;
        closeModalWithHistory();
        const modal = document.getElementById('buatDataModal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
    function submitBuatDataBaru() {
        const buyer = document.getElementById('bd_buyer').value.trim().toUpperCase();
        const style = document.getElementById('bd_style').value.trim().toUpperCase();
        const color = document.getElementById('bd_color').value.trim().toUpperCase();
        if (!buyer || !style || !color) {
            Swal.fire('Perhatian', 'Buyer, Style, Color wajib diisi!', 'warning');
            return;
        }
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENYIMPAN DATA BARU...';
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'spv_manual_entry',
                password: 'DEMO',
                tanggal: document.getElementById('tanggal').value || new Date().toISOString().slice(0,10),
                buyer, style, color,
                qty_order: document.getElementById('bd_qty_order').value || 0,
                line_name: document.getElementById('bd_line').value.trim().toUpperCase(),
                qty_send: document.getElementById('bd_qty_send').value || 0,
                qty_receive: document.getElementById('bd_qty_receive').value || 0
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === 'success') {
                Swal.fire('Berhasil', 'Data baru berhasil dibuat di SUMMARY!', 'success');
                closeBuatDataBaruModal();
            } else {
                Swal.fire('Error', data.error || 'Gagal menyimpan.', 'error');
            }
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Gagal terhubung ke server.', 'error');
        });
    }

    function fallbackOffline(line, payload) {
        Swal.fire('Gagal Terkirim', 'Koneksi internet bermasalah. Data TIDAK tersimpan. Silakan cek sinyal lalu submit ulang.', 'error');
    }

    function clearAfterSubmit() {
        activeDefects = {};
        renderDefectList();
        document.getElementById('qty_good').value = '';
        document.getElementById('step').value = '';
        calculate();
        saveData();
    }

    function checkOfflineBadge() {
        localStorage.removeItem('qcOfflineQueue_wash');
        const btn = document.getElementById('btnSync');
        if(btn) btn.style.display = 'none';
    }

    function pushOfflineData() {
        localStorage.removeItem('qcOfflineQueue_wash');
    }

    function handleExportClick() {
        const embroVisible = document.getElementById('tab-embro').style.display !== 'none';
        if (embroVisible) {
            exportEmbroToExcel();
        } else {
            exportToExcel();
        }
    }

    async function exportEmbroToExcel() {
        const buyer   = document.getElementById('embro_buyer').value || '';
        const dateStr = document.getElementById('embro_tanggal').value || 'Hari_ini';

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('QC Embro', { views: [{ showGridLines: false }] });
        sheet.getColumn('A').width = 20;
        sheet.getColumn('B').width = 25;

        const qtyGood = parseInt(document.getElementById('embro_qty_good').value) || 0;
        const qtyDef  = parseInt(document.getElementById('embro_qty_defect').value) || 0;
        const qtyInsp = parseInt(document.getElementById('embro_qty_insp').value) || 0;
        const pctDef  = document.getElementById('embro_pct_def').value || '0%';

        const headerRows = [
            ["NAMA QC",     document.getElementById('embro_nama_qc').value],
            ["TANGGAL",     dateStr],
            ["BUYER",       buyer],
            ["STYLE",       document.getElementById('embro_style').value],
            ["COLOR",       document.getElementById('embro_color').value],
            ["CHECK IN",    document.getElementById('embro_check_in').value],
            ["QTY GOOD",    qtyGood],
            ["QTY DEFECT",  qtyDef],
            ["QTY INSPECT", qtyInsp],
            ["% DEFECT",    pctDef],
            ["REMARK",      document.getElementById('embro_remark').value]
        ];
        headerRows.forEach(row => sheet.addRow(row));

        sheet.addRow([]);
        sheet.addRow(["JENIS DEFECT", "QTY"]);
        EMBRO_DEFECT_LIST.forEach(name => {
            sheet.addRow([name, parseInt(embroDefects[name]) || 0]);
        });

        const blackFont   = { name: 'Inter', size: 11, color: { argb: 'FF000000' }, bold: true };
        const borderStyle = {
            top:    { style: 'thin', color: { argb: 'FF000000' } }, left:   { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } }, right:  { style: 'thin', color: { argb: 'FF000000' } }
        };
        const greyFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        sheet.eachRow((row) => {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.font = blackFont;
                cell.border = borderStyle;
                cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center' };
                if (colNumber === 1) cell.fill = greyFill;
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `QC_Embro_${buyer || 'Offline'}_${dateStr}.xlsx`);
    }

    async function exportToExcel() {
        const buyer   = document.getElementById('buyer').value   || '';
        const dateStr = document.getElementById('tanggal').value || 'Hari_ini';

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('QC Washing', { views: [{ showGridLines: false }] });
        sheet.getColumn('A').width = 8;
        sheet.getColumn('B').width = 15;
        sheet.getColumn('C').width = 25;
        sheet.getColumn('D').width = 25;
        sheet.getColumn('E').width = 12;

        const headers1_13 = [
            ["ORDER/BUYER",  document.getElementById('buyer').value],
            ["LINE",         document.getElementById('line_name').value],
            ["TANGGAL",      dateStr],
            ["STYLE",        document.getElementById('style').value],
            ["COLOR",        document.getElementById('color').value],
            ["QTY ORDER",    document.getElementById('qty_order').value],
            ["QTY DEFECT",   document.getElementById('tot_def').value],
            ["QTY GOOD",     document.getElementById('qty_good').value],
            ["QTY INSPECT",  document.getElementById('qty_insp').value],
            ["% DEFECT",     document.getElementById('pct_def').value],
            ["QTY DELIVER",  document.getElementById('deliver').value],
            ["QTY SEND",     "Diisi oleh SPV"],
            ["QTY RECEIVE",  "Diisi oleh SPV"]
        ];
        headers1_13.forEach((row, i) => {
            sheet.addRow([row[0],"","",row[1]]);
            sheet.mergeCells(`A${i+1}:C${i+1}`);
        });

        sheet.addRow(["FIRST OUTPUT DATE","","FROM SEWING",      document.getElementById('from_sewing').value]);
        sheet.addRow(["","","SEND WASHING",    document.getElementById('send_washing').value]);
        sheet.addRow(["","","RECEIVED WASHING",document.getElementById('received_washing').value]);
        sheet.mergeCells('A14:B16');

        sheet.addRow(["NO","KATEGORI","AREA / PROSES","JENIS DEFECT","QTY"]);

        let rowIdx = 1, startRow = 18;
        let lastCat = "", mergeCatStart = startRow;
        let lastArea = "", mergeAreaStart = startRow;

        for (const key in activeDefects) {
            const item = activeDefects[key];
            const outputType = item.type === '-' ? '' : item.type;
            sheet.addRow([rowIdx++, item.cat, item.area, outputType, item.qty]);
            const currentRow = startRow + rowIdx - 2;
            if (item.cat !== lastCat && rowIdx > 2) {
                if (currentRow-1 > mergeCatStart) sheet.mergeCells(`B${mergeCatStart}:B${currentRow-1}`);
                mergeCatStart = currentRow;
            }
            lastCat = item.cat;
            if (item.area !== lastArea && rowIdx > 2) {
                if (currentRow-1 > mergeAreaStart) sheet.mergeCells(`C${mergeAreaStart}:C${currentRow-1}`);
                mergeAreaStart = currentRow;
            }
            lastArea = item.area;
        }

        const finalRow = startRow + rowIdx - 2;
        if (finalRow > mergeCatStart)  sheet.mergeCells(`B${mergeCatStart}:B${finalRow}`);
        if (finalRow > mergeAreaStart) sheet.mergeCells(`C${mergeAreaStart}:C${finalRow}`);

        const blackFont   = { name: 'Inter', size: 11, color: { argb: 'FF000000' }, bold: true };
        const borderStyle = {
            top:    { style: 'thin', color: { argb: 'FF000000' } }, left:   { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } }, right:  { style: 'thin', color: { argb: 'FF000000' } }
        };
        const greyFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        const whiteFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

        sheet.eachRow((row, rowNumber) => {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= 5) {
                    cell.font = blackFont;
                    cell.border = borderStyle;
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    if (rowNumber <= 13) {
                        if (colNumber <= 3) { cell.fill = greyFill; cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
                        else if (colNumber === 4) { cell.fill = whiteFill; }
                    } else if (rowNumber >= 14 && rowNumber <= 16) {
                        if (colNumber <= 2) { cell.fill = greyFill; }
                        else if (colNumber === 3) { cell.fill = greyFill; cell.alignment = { vertical: 'middle', horizontal: 'left' }; }
                        else if (colNumber === 4) { cell.fill = whiteFill; }
                    } else if (rowNumber === 17) {
                        cell.fill = greyFill;
                    } else {
                        if (colNumber <= 3) {
                            cell.fill = greyFill;
                            if (colNumber > 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
                        } else { cell.fill = whiteFill; }
                    }
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `QC_Washing_${buyer || 'Offline'}_${dateStr}.xlsx`);
    }