(function() {
            const d = new Date();
            const pinSuffix = (d.getMonth() + 1).toString() + d.getFullYear().toString().slice(-2);
            
            const expectedPin = 'FIN' + pinSuffix;
            const globalPin = 'CATALYSTD1';
            
            const tiketArea = localStorage.getItem('tiket_finishing');
            const tiketGlobal = localStorage.getItem('qc_token_global');
            const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
            
            // DEMO MODE: gerbang password dinonaktifkan agar portofolio bisa diakses bebas
        })();
    


    let activeDefectsInline = {};
    let currentCategoryInline = 'FINISHING';

    function switchCategoryInline(cat) {
        currentCategoryInline = cat;
        document.getElementById('tab_inline_finishing').classList.toggle('active', cat === 'FINISHING');
        document.getElementById('tab_inline_sewing').classList.toggle('active', cat === 'SEWING');
        document.getElementById('wrap_defect_inline_select').style.display = (cat === 'FINISHING') ? 'flex' : 'none';
        document.getElementById('wrap_defect_inline_sewing_manual').style.display = (cat === 'SEWING') ? 'flex' : 'none';
    }

    function toggleInlineManualQC(val) {
        document.getElementById('nama_qc_inline_manual').style.display = (val === 'MANUAL') ? 'block' : 'none';
    }


    function setDefaultDateInline() {
        const d = new Date();
        document.getElementById('tanggal_inline').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function updateDropdownsInline(source) {
        let buyerSelect = document.getElementById('buyer_inline');
        let styleSelect = document.getElementById('style_inline');
        let curBuyer = buyerSelect.value;
        let curStyle = styleSelect.value;
        let filtered = dynamicDB;

        if (source === 'buyer') {
            curStyle = "";
            styleSelect.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>';
        }

        let partContainer = document.getElementById('container_vs_part_inline');
        if (curBuyer && curBuyer.toUpperCase() === "VICTORIA’S SECRET") { partContainer.style.display = 'flex'; }
        else { partContainer.style.display = 'none'; document.getElementById('vs_part_inline').value = ""; }

        if (curBuyer) {
            filtered = filtered.filter(row => row.buyer === curBuyer);
            let validStyles = [...new Set(filtered.map(row => row.style))].filter(Boolean).sort();
            let opts = '<option value="" disabled selected>-- Pilih Style --</option>';
            validStyles.forEach(s => { opts += `<option value="${s}">${s}</option>`; });
            styleSelect.innerHTML = opts;
            if (validStyles.includes(curStyle)) styleSelect.value = curStyle; else curStyle = "";
        }
    }

    function populateBuyerInline() {
        let mappedBuyers = [...new Set(dynamicDB.map(r => r.buyer))].filter(Boolean).sort();
        let sel = document.getElementById('buyer_inline');
        if (sel) sel.innerHTML = '<option value="" disabled selected>-- Pilih Buyer --</option>' + mappedBuyers.map(b => `<option value="${b}">${b}</option>`).join('');
    }

    function addDefectInline() {
        let defectName, cat = currentCategoryInline;
        if (cat === 'SEWING') {
            defectName = document.getElementById('sel_defect_inline_sewing_manual').value.trim().toUpperCase();
        } else {
            defectName = document.getElementById('sel_defect_inline').value;
        }
        if (!defectName) { Swal.fire('Perhatian', 'Pilih atau ketik jenis defect terlebih dahulu.', 'warning'); return; }
        let key = cat + '_' + defectName;
        if (activeDefectsInline[key]) { Swal.fire('Info', 'Defect ini sudah ada di daftar.', 'info'); return; }
        activeDefectsInline[key] = { type: defectName, cat: cat, qty: "" };
        document.getElementById('sel_defect_inline').value = "";
        document.getElementById('sel_defect_inline_sewing_manual').value = "";
        renderDefectListInline();
    }

    function renderDefectListInline() {
        let container = document.getElementById('active_defects_inline_container');
        let html = ""; let count = 0;
        for (let key in activeDefectsInline) {
            count++; let item = activeDefectsInline[key];
            html += `<div class="summary-card" id="card_inline_${key}">
                <div class="summary-header">
                    <div class="summary-title"><span>${item.cat === 'SEWING' ? 'SEWING: ' : ''}${item.type}</span></div>
                    <button class="btn-del" onclick="removeDefectInline('${key}')">X</button>
                </div>
                <div class="flex-inputs">
                    <div class="stepper" style="width:100%;">
                        <button onclick="adjValInline('${key}', -1)">-</button>
                        <input type="number" id="inp_qty_inline_${key}" value="${item.qty}" oninput="manualInputInline('${key}', this.value)" placeholder="QTY">
                        <button onclick="adjValInline('${key}', 1)">+</button>
                    </div>
                </div>
            </div>`;
        }
        container.innerHTML = count === 0 ? `<div class="empty-state">BELUM ADA DEFECT YANG DITAMBAHKAN.</div>` : html;
        calculateInline();
    }

    function removeDefectInline(key) { delete activeDefectsInline[key]; renderDefectListInline(); }

    function adjValInline(key, amount) {
        let val = parseInt(activeDefectsInline[key].qty) || 0;
        let newVal = val + amount;
        activeDefectsInline[key].qty = newVal > 0 ? newVal : "";
        document.getElementById(`inp_qty_inline_${key}`).value = activeDefectsInline[key].qty;
        calculateInline();
    }

    function manualInputInline(key, value) {
        let num = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        activeDefectsInline[key].qty = num > 0 ? num : "";
        calculateInline();
    }

    function calculateInline() {
        let totalDefect = 0;
        for (let key in activeDefectsInline) totalDefect += parseInt(activeDefectsInline[key].qty) || 0;
        const qtyInsp = parseInt(document.getElementById('qty_insp_inline').value) || 0;
        let qtyGood = qtyInsp - totalDefect;
        if (qtyGood < 0) qtyGood = 0;
        const pct = qtyInsp > 0 ? ((totalDefect / qtyInsp) * 100).toFixed(1) + "%" : "0%";
        document.getElementById('lbl_def_inline').innerText = totalDefect;
        document.getElementById('lbl_good_inline').innerText = qtyGood;
        document.getElementById('lbl_pct_inline').innerText = pct;
    }

    function submitInline() {
        let qc = document.getElementById('nama_qc_inline').value === 'MANUAL'
            ? document.getElementById('nama_qc_inline_manual').value.trim().toUpperCase()
            : document.getElementById('nama_qc_inline').value;
        let tgl = document.getElementById('tanggal_inline').value;
        let buyer = document.getElementById('buyer_inline').value;
        let style = document.getElementById('style_inline').value;
        if (buyer && buyer.toUpperCase() === "VICTORIA’S SECRET") {
            let p = document.getElementById('vs_part_inline').value;
            if (!p) { Swal.fire('Perhatian', "Kolom PART wajib diisi untuk Victoria's Secret!", 'warning'); return; }
            style += " (" + p + ")";
        }
        let qtyInsp = parseInt(document.getElementById('qty_insp_inline').value) || 0;
        let remarkInline = document.getElementById('remark_inline').value.trim();

        if (!qc || !tgl || !buyer || !style) {
            Swal.fire('Perhatian', 'Nama QC, Tanggal, Buyer, Style wajib diisi!', 'warning'); return;
        }
        if (qtyInsp <= 0) { Swal.fire('Perhatian', 'Qty Inspect wajib diisi!', 'warning'); return; }

        let totalDefect = 0;
        let defectsArr = [];
        for (let key in activeDefectsInline) {
            let q = parseInt(activeDefectsInline[key].qty) || 0;
            totalDefect += q;
            let item = activeDefectsInline[key];
            let outType = item.cat === 'SEWING' ? ('SEWING - ' + item.type) : item.type;
            defectsArr.push({ type: outType, qty: q });
        }
        let qtyGood = qtyInsp - totalDefect;
        if (qtyGood < 0) qtyGood = 0;
        let pct = qtyInsp > 0 ? ((totalDefect / qtyInsp) * 100).toFixed(1) + "%" : "0%";

        Swal.fire({
            title: 'KONFIRMASI DATA INLINE',
            html: `<div style="font-family:'Inter', sans-serif; font-size:13px; text-align:left;">
                <b>QC:</b> ${qc}<br><b>Buyer:</b> ${buyer}<br><b>Style:</b> ${style}<br>
                <b>Qty Inspect:</b> ${qtyInsp}<br><b>Total Defect:</b> ${totalDefect}<br><b>Qty Good:</b> ${qtyGood}<br><b>Rate:</b> ${pct}</div>`,
            icon: 'question', showCancelButton: true, confirmButtonColor: '#0f172a', confirmButtonText: 'KIRIM'
        }).then((result) => {
            if (!result.isConfirmed) return;
            document.getElementById('loading').style.display = 'flex';
            document.getElementById('loading-text').innerText = 'MENGIRIM DATA INLINE...';
            const payload = {
                action: 'submit_inline', tanggal: tgl, nama_qc: qc, buyer, style,
                qty_insp: qtyInsp, qty_def: totalDefect, qty_good: qtyGood, pct_def: pct, defects: defectsArr,
                remark: remarkInline
            };
            fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
            .then(r => r.json())
            .then(data => {
                document.getElementById('loading').style.display = 'none';
                if (data.result === 'success') {
                    Swal.fire({
                        title: 'DATA BERHASIL TERKIRIM',
                        text: 'Data Inline berhasil tersimpan ke server. Bagikan laporan ini ke WhatsApp?',
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonColor: '#10b981',
                        cancelButtonColor: '#475569',
                        confirmButtonText: 'BAGIKAN KE WHATSAPP',
                        cancelButtonText: 'TUTUP'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            generateInlineWA(payload);
                        }
                    });
                    activeDefectsInline = {}; renderDefectListInline();
                    document.getElementById('qty_insp_inline').value = "";
                    document.getElementById('style_inline').value = "";
                    document.getElementById('remark_inline').value = "";
                    calculateInline();
                } else {
                    Swal.fire('Error', data.error || 'Gagal mengirim data.', 'error');
                }
            }).catch(() => { document.getElementById('loading').style.display = 'none'; Swal.fire('Error', 'Koneksi gagal.', 'error'); });
        });
    }

    function generateInlineWA(payload) {
        let tgl = payload.tanggal || "-";
        let qc = payload.nama_qc || "-";
        let buyer = payload.buyer || "-";
        let style = payload.style || "-";
        let qtyInsp = payload.qty_insp || 0;
        let qtyGood = payload.qty_good || 0;
        let qtyDef = payload.qty_def || 0;
        let pct = payload.pct_def || "0%";
        let defects = payload.defects || [];

        let text = `*LAPORAN QC INLINE FINISHING*\n`;
        text += `DRESS 1\n\n`;
        text += `Tanggal: ${tgl}\n`;
        text += `Nama Inspector: ${qc}\n`;
        text += `Buyer: ${buyer}\n`;
        text += `Style: ${style}\n\n`;
        text += `*HASIL INSPEKSI:*\n`;
        text += `- Qty Inspect: ${qtyInsp} Pcs\n`;
        text += `- Qty Good: ${qtyGood} Pcs\n`;
        text += `- Qty Defect: ${qtyDef} Pcs\n`;
        text += `- Defect Rate: ${pct}\n`;

        if (defects.length > 0) {
            text += `\n*RINCIAN DEFECT:*\n`;
            defects.forEach((d, i) => {
                text += `${i + 1}. ${d.type} : ${d.qty} Pcs\n`;
            });
        }

        if (payload.remark && payload.remark.trim() !== "") {
            text += `\n*REMARK:*\n${payload.remark}\n`;
        }

        text += `\nDemikian laporan ini disampaikan untuk ditindaklanjuti. Berikut foto terlampir sebagai bukti inspeksi. Mohon agar lebih teliti kembali saat cek\n\nTerima kasih.`;

        let encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }

    document.addEventListener('contextmenu', event => event.preventDefault());

    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyiwr2m82nWXxX2GLwR6euU7CEVRUjRcQvIwYL6ortrTzGZ6A38aeagzwyNgR_jnyA/exec"; 


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
            const dummyRows = generateDummyRows(30, 'FIN');

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
    const APP_VERSION = "1.2"; 
    document.getElementById('verBadge').innerText = "v" + APP_VERSION;
    
    let defectChart; 
    let trackerAnalyticsChart;
    let specialStatus = ""; 
    let absentReasonText = "";
    let currentTrackerData = []; 
    
    let lockedDateServer = ""; 
    let patokanDataServer = {};

    let hourlyLocalCache = {}; 
    let serverHourlyDone = {}; 
    const listSemuaQCHourly = [
        "AGMEL","AGNA","ANGELA","ANISA","ARINI","AVI","BIANCA","INA","CHIKA","ELLEN","FAZA","ITA",
        "JANAH","LAULA","LINTANG","MASTUTI","MELA","NAZWA","NEHA","NUR C","SAFIRA","SHINE","SULU","SUSI","TIARA","TIAS","TRISNI","WIDYA"
    ];
    
    function fetchLockedDate() {
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_locked_date" }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            const inputTgl = document.getElementById('tanggal');
            if(data.result === "success") {
                if(data.locked_date) {
                    lockedDateServer = data.locked_date;
                    inputTgl.value = lockedDateServer;
                    inputTgl.readOnly = true;
                } else {
                    inputTgl.readOnly = false;
                }
                if(data.patokan) {
                    patokanDataServer = data.patokan;
                }
            } else {
                inputTgl.readOnly = false;
            }
        }).catch(err => console.log("Info: Mode Offline/Gagal tarik target date."));
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

        const savedCache = localStorage.getItem('fin_hourly_local_cache');
        if (savedCache) {
            try { hourlyLocalCache = JSON.parse(savedCache); } catch(e) { hourlyLocalCache = {}; }
        }

        selectHourlyHour("08:00", 7);
    }

    function selectHourlyHour(jamStr, idNum) {
        document.getElementById('hourly_selected_jam').value = jamStr;
        document.getElementById('lbl_selected_hour').innerText = jamStr;
        document.getElementById('lbl_selected_hour_table').innerText = jamStr;
        document.getElementById('lbl_ironing_hour').innerText = jamStr;

        for (let i = 7; i <= 21; i++) {
            const btn = document.getElementById(`btn_hr_${i}`);
            if (btn) btn.classList.remove('selected');
        }
        document.getElementById(`btn_hr_${idNum}`).classList.add('selected');

        document.getElementById('hourly_qty_ironing').value = "";
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
            let qcNames = [];
            let ironingVal = 0;
            let totalInspectServer = 0;
            if (data.result === 'success' && data.data) {
                let matched = data.data.filter(r => r.tanggal === tgl && r.jam === jam);
                matched.forEach(r => {
                    if (r.nama_qc && r.nama_qc !== '-') { 
                        qcNames.push(r.nama_qc.toString().trim().toUpperCase()); 
                        totalInspectServer += r.qty_inspect; 
                    }
                    if (r.qty_ironing > ironingVal) ironingVal = r.qty_ironing;
                });
            }
            if (!serverHourlyDone[tgl]) serverHourlyDone[tgl] = {};
            serverHourlyDone[tgl][jam] = { ironing: ironingVal, qcNames: [...new Set(qcNames)], totalInspectServer };
            renderHourlyMonitor();
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            renderHourlyMonitor();
        });
    }

    function getOrCreateHourContextFin() {
        const tgl = document.getElementById('hourly_tanggal').value;
        const jam = document.getElementById('hourly_selected_jam').value;
        if (!tgl || !jam) return null;
        if (!hourlyLocalCache[tgl]) hourlyLocalCache[tgl] = {};
        if (!hourlyLocalCache[tgl][jam]) hourlyLocalCache[tgl][jam] = { ironing: 0, qc: {} };
        return hourlyLocalCache[tgl][jam];
    }

    function saveIroningToLocal() {
        const ctx = getOrCreateHourContextFin();
        if (!ctx) return;
        const rawValue = document.getElementById('hourly_qty_ironing').value;
        const val = rawValue === '' ? 0 : parseInt(rawValue) || 0;
        ctx.ironing = val;
        localStorage.setItem('fin_hourly_local_cache', JSON.stringify(hourlyLocalCache));
        if (navigator.vibrate) navigator.vibrate(40);
        renderHourlyMonitor();
    }

    function saveHourlyToLocal() {
        const ctx = getOrCreateHourContextFin();
        if (!ctx) return;

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

        ctx.qc[nama] = { qty_good: gNum, qty_defect: dNum, qty_inspect: gNum + dNum };
        localStorage.setItem('fin_hourly_local_cache', JSON.stringify(hourlyLocalCache));

        document.getElementById('hourly_nama').value = "";
        document.getElementById('hourly_nama_manual').value = "";
        toggleHourlyManualQC("");
        document.getElementById('hourly_qty_good').value = "";
        document.getElementById('hourly_qty_defect').value = "";

        if (navigator.vibrate) navigator.vibrate(40);
        renderHourlyMonitor();
    }

    function deleteHourlyLocalFin(qc) {
        const tgl = document.getElementById('hourly_tanggal').value;
        const jam = document.getElementById('hourly_selected_jam').value;
        if (!tgl || !jam) return;
        Swal.fire({
            title: 'Hapus Data?',
            text: `Hapus data lokal ${qc} untuk jam ${jam}? (Data ini belum terkirim ke server)`,
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal'
        }).then(result => {
            if (result.isConfirmed) {
                if (hourlyLocalCache[tgl] && hourlyLocalCache[tgl][jam]) {
                    delete hourlyLocalCache[tgl][jam].qc[qc];
                    localStorage.setItem('fin_hourly_local_cache', JSON.stringify(hourlyLocalCache));
                    renderHourlyMonitor();
                }
            }
        });
    }

    function renderHourlyMonitor() {
        const tgl = document.getElementById('hourly_tanggal').value;
        const jam = document.getElementById('hourly_selected_jam').value;
        const tbody = document.getElementById('hourly_monitor_body');
        if (!tgl || !jam || !tbody) return;

        const ctx = (hourlyLocalCache[tgl] && hourlyLocalCache[tgl][jam]) ? hourlyLocalCache[tgl][jam] : { ironing: 0, qc: {} };
        const serverInfo = (serverHourlyDone[tgl] && serverHourlyDone[tgl][jam]) ? serverHourlyDone[tgl][jam] : { ironing: 0, qcNames: [], totalInspectServer: 0 };

        let htmlRows = "";
        let totalInspectAll = serverInfo.totalInspectServer || 0;

        listSemuaQCHourly.forEach(qc => {
            const dataQC = ctx.qc[qc];
            const isOnServer = serverInfo.qcNames.includes(qc);

            if (isOnServer) {
                htmlRows += `<tr style="background: rgba(16, 185, 129, 0.25); font-weight:600;"><td>${qc}</td><td colspan="3">-</td><td style="color:var(--success); font-size:11px;">☁️ SUDAH DI SERVER</td></tr>`;
            } else if (dataQC) {
                totalInspectAll += dataQC.qty_inspect;
                htmlRows += `<tr style="background: rgba(16, 185, 129, 0.15); font-weight:600;"><td>${qc}</td><td>${dataQC.qty_good}</td><td>${dataQC.qty_defect}</td><td>${dataQC.qty_inspect}</td><td><span style="color:var(--success);">✅ OK LOKAL</span> <button onclick="deleteHourlyLocalFin('${qc}')" style="margin-left:6px; background:var(--danger); color:#fff; border:none; border-radius:3px; width:22px; height:22px; cursor:pointer; font-weight:900;">×</button></td></tr>`;
            } else {
                htmlRows += `<tr style="color:var(--text-sub);"><td>${qc}</td><td>-</td><td>-</td><td>-</td><td style="font-style:italic; font-size:11px;">⚠️ BELUM ISI</td></tr>`;
            }
        });
        tbody.innerHTML = htmlRows;

        const ironingVal = ctx.ironing > 0 ? ctx.ironing : serverInfo.ironing;
        const balance = ironingVal - totalInspectAll;

        document.getElementById('lbl_bal_ironing').innerText = ironingVal;
        document.getElementById('lbl_bal_inspect').innerText = totalInspectAll;
        document.getElementById('lbl_bal_result').innerText = balance;
        document.getElementById('lbl_bal_result').style.color = balance < 0 ? 'var(--danger)' : 'var(--success)';

        populateHourlyNamaOptionsFin(ctx.qc, serverInfo.qcNames);
    }

    function populateHourlyNamaOptionsFin(localQc, serverQcNames) {
        const sel = document.getElementById('hourly_nama');
        if (!sel) return;
        const curVal = sel.value;
        let optsHtml = '<option value="" disabled selected>-- Pilih QC --</option>';
        listSemuaQCHourly.forEach(qc => {
            const alreadyDone = serverQcNames.includes(qc) || !!localQc[qc];
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

        const ctx = (hourlyLocalCache[tgl] && hourlyLocalCache[tgl][jam]) ? hourlyLocalCache[tgl][jam] : { ironing: 0, qc: {} };

        const rowsToSend = [];
        listSemuaQCHourly.forEach(qc => {
            if (ctx.qc[qc]) {
                rowsToSend.push({
                    nama_qc: qc,
                    qty_good: ctx.qc[qc].qty_good,
                    qty_defect: ctx.qc[qc].qty_defect,
                    qty_inspect: ctx.qc[qc].qty_inspect
                });
            }
        });

        if (rowsToSend.length === 0 && ctx.ironing <= 0) {
            Swal.fire('Data Kosong', 'Belum ada data QC maupun Qty Ironing yang diisi di HP untuk jam ini!', 'warning');
            return;
        }

        pushHourlyPayloadFin(tgl, jam, ctx.ironing, rowsToSend);
    }

    function pushHourlyPayloadFin(tanggal, jam, qtyIroning, rows) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = 'MENGIRIM REKAP MASSAL HOURLY...';

        const payload = { action: 'submit_hourly', tanggal, jam, qty_ironing: qtyIroning, rows };

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === 'success') {
                Swal.fire('Berhasil', `Data Jam ${jam} berhasil masuk Cloud Server!`, 'success');
                delete hourlyLocalCache[tanggal][jam];
                localStorage.setItem('fin_hourly_local_cache', JSON.stringify(hourlyLocalCache));
                document.getElementById('hourly_qty_ironing').value = "";
                fetchServerHourlyStatus(tanggal, jam);
            } else {
                Swal.fire('Error Server', 'Gagal: ' + data.error, 'error');
            }
        })
        .catch(() => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Koneksi Error', 'Gagal mentransfer data. Periksa sinyal internet!', 'error');
        });
    }

    function applyPatokan() {
        let b = document.getElementById('buyer').value;
        let s = document.getElementById('style').value;
        if(!b || !s) return;
        if (b.toUpperCase() === "VICTORIA’S SECRET") {
            let p = document.getElementById('vs_part').value;
            if(p) s += " (" + p + ")";
        }
        let key = b.toUpperCase() + "_" + s.toUpperCase();
        if(patokanDataServer[key]) {
            let p = patokanDataServer[key];
            let lineEl = document.getElementById('line_name');
            let spEl = document.getElementById('special_process');
            let changed = false;
            let msg = "";
            if(p.line && lineEl.value !== p.line) {
                lineEl.value = p.line;
                selectedLines = p.line.split(',').map(x => x.trim()).filter(x => x);
                changed = true;
                msg += `LINE: ${p.line}\n`;
            }
            if(p.sp && spEl.value !== p.sp) {
                spEl.value = p.sp;
                changed = true;
                msg += `SPECIAL PROCESS: ${p.sp}\n`;
            }
            if(changed) {
                Swal.fire('Data Patokan Terdeteksi!', `Buyer & Style ini sudah ada di Dashboard. Sistem melakukan auto-koreksi:\n\n${msg}`, 'info');
            }
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
            if(data.result === "success") {
                buildDatabase(data.data); 
                populateBuyerSelect();    
                populateBuyerInline();    
                
                const saved = JSON.parse(localStorage.getItem('qcAutoSave3_fin') || '{}');
                if(saved.buyer) {
                    document.getElementById('buyer').value = saved.buyer;
                    updateDropdowns('buyer');
                    if(saved.style) {
                        document.getElementById('style').value = saved.style;
                        updateDropdowns('style');
                        if(saved.color) document.getElementById('color').value = saved.color;
                    }
                    if(saved.vs_part) document.getElementById('vs_part').value = saved.vs_part;
                }
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            console.warn("Offline: Memakai data HP.");
            buildDatabase(); 
            populateBuyerSelect();
            populateBuyerInline();
        });
    }

    function openActionSheet() {
        const sheet = document.getElementById('actionSheet');
        sheet.style.display = 'flex';
        setTimeout(() => sheet.classList.add('show'), 10);
    }

    function closeActionSheet(e) {
        const sheet = document.getElementById('actionSheet');
        sheet.classList.remove('show');
        setTimeout(() => sheet.style.display = 'none', 300);
    }

    function runAction(func) {
        closeActionSheet();
        setTimeout(func, 300); 
    }

    function switchMainTab(tab) {
        document.getElementById('tab-daily').style.display = 'none';
        document.getElementById('tab-tracker').style.display = 'none';
        document.getElementById('tab-cek10').style.display = 'none';
        document.getElementById('tab-hourly').style.display = 'none';
        
        document.getElementById('btn-tab-daily').classList.remove('active');
        document.getElementById('btn-tab-tracker').classList.remove('active');
        document.getElementById('btn-tab-cek10').classList.remove('active');
        document.getElementById('btn-tab-hourly').classList.remove('active');
        document.getElementById('btnSubmitMain').style.display = 'none';
        document.getElementById('btnSubmitHourly').style.display = 'none';

        if (tab === 'hourly') {
            // DEMO MODE: gerbang password dinonaktifkan agar portofolio bisa diakses bebas
            showHourlyView();
            return;
        }

        if (tab === 'tracker') {
            const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
            if (isSpv) {
                showTrackerView();
                return;
            }

            // DEMO MODE: gerbang password dinonaktifkan agar portofolio bisa diakses bebas
            showTrackerView();
        } else if (tab === 'cek10') {
            document.getElementById('tab-cek10').style.display = 'flex';
            document.getElementById('btn-tab-cek10').classList.add('active');
            document.getElementById('bottomActionBar').style.display = 'none';
            populateArea10();
        } else if (tab === 'inline') {
            document.getElementById('tab-inline').style.display = 'flex';
            document.getElementById('btn-tab-inline').classList.add('active');
            document.getElementById('bottomActionBar').style.display = 'block';
            setDefaultDateInline();
            populateBuyerInline();
            switchCategoryInline('FINISHING');
        } else {
            document.getElementById('tab-daily').style.display = 'flex';
            document.getElementById('btn-tab-daily').classList.add('active');
            document.getElementById('bottomActionBar').style.display = 'block';
            document.getElementById('btnSubmitMain').style.display = 'flex';
        }
    }

    function showHourlyView() {
        document.getElementById('tab-hourly').style.display = 'flex';
        document.getElementById('btn-tab-hourly').classList.add('active');
        document.getElementById('bottomActionBar').style.display = 'block';
        document.getElementById('btnSubmitHourly').style.display = 'flex';
        renderHourlyMonitor();
    }

    function showTrackerView() {
        document.getElementById('tab-daily').style.display = 'none';
        document.getElementById('tab-tracker').style.display = 'flex';
        document.getElementById('btn-tab-daily').classList.remove('active');
        document.getElementById('btn-tab-tracker').classList.add('active');
        document.getElementById('bottomActionBar').style.display = 'none';
        initTrackerFilters();
    }

    function openMenuSPV() {
        const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
        
        if (isSpv) {
            showSPVDashboard();
            return;
        }

        Swal.fire({
            title: 'MASUKKAN PASSWORD',
            input: 'password',
            inputPlaceholder: 'Masukkan Password SPV',
            inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
            showCancelButton: true,
            confirmButtonColor: '#0f172a',
            cancelButtonColor: '#475569',
            confirmButtonText: 'MASUK',
            cancelButtonText: 'BATAL'
        }).then((result) => {
            if(result.isConfirmed) {
                if(result.value === 'FIND1') { 
                    showSPVDashboard(); 
                } else { 
                    Swal.fire('Akses Ditolak', 'Password salah atau tidak valid.', 'error'); 
                }
            }
        });
    }

    function showSPVDashboard() {
        Swal.fire({
            title: 'MENU SUPERVISOR',
            html: `
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
                    <button onclick="Swal.close(); setTimeout(fetchPreviewDashboard, 300);" style="background:var(--primary); color:white; border:none; padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 var(--btn-shadow); display:flex; align-items:center; justify-content:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        REVIEW & TUTUP SHIFT
                    </button>
                    <button onclick="Swal.close(); setTimeout(openReportModal, 300);" style="background:var(--success); color:white; border:none; padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 #047857; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        GENERATE REPORT EXCEL
                    </button>
                    <button onclick="Swal.close(); setTimeout(openMasterDataModal, 300);" style="background:var(--accent); color:var(--text-brand); border:none; padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 #b45309; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                         KELOLA DATA BUYER/STYLE
                    </button>
                    <button onclick="Swal.close(); setTimeout(openDeleteSheetModal, 300);" style="background:var(--danger); color:white; border:none; padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 #b91c1c; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        HAPUS SHEET LAMA
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'TUTUP'
        });
    }

    function openDeleteSheetModal() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENCARI SHEET...";

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_sheets", password: "FIND1" }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") {
                if(data.sheets.length === 0) {
                    Swal.fire('Info', 'Tidak ada sheet yang bisa dihapus (semua sheet penting terlindungi).', 'info');
                    return;
                }
                
                let htmlCheckboxes = '<div style="text-align:left; max-height:200px; overflow-y:auto; margin-top:10px; border:1px solid var(--border-line); padding:10px; border-radius:4px; font-family:\'Inter\', sans-serif;">';
                data.sheets.forEach(sheet => {
                    htmlCheckboxes += `<label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer; font-size:13px; color:var(--text-main); font-weight:600;"><input type="checkbox" class="sheet-checkbox swal2-checkbox" value="${sheet}" style="width:18px; height:18px; margin:0; accent-color:var(--danger);"> ${sheet}</label>`;
                });
                htmlCheckboxes += '</div>';

                Swal.fire({
                    title: 'PILIH SHEET DIHAPUS',
                    html: '<div style="font-size:12px; color:var(--danger); margin-bottom:10px; font-weight:bold; font-family:\'Inter\', sans-serif;">PERINGATAN: Sheet yang dihapus tidak bisa dikembalikan! (Sheet Database, Summary & Template sudah dilindungi otomatis)</div>' + htmlCheckboxes,
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#475569',
                    confirmButtonText: 'HAPUS TERPILIH',
                    cancelButtonText: 'BATAL',
                    preConfirm: () => {
                        let selected = [];
                        document.querySelectorAll('.sheet-checkbox:checked').forEach(cb => selected.push(cb.value));
                        if(selected.length === 0) {
                            Swal.showValidationMessage('Pilih minimal 1 sheet untuk dihapus!');
                            return false;
                        }
                        return selected;
                    }
                }).then((result) => {
                    if(result.isConfirmed) {
                        executeDeleteSheets(result.value);
                    }
                });
            } else {
                Swal.fire('Error', data.error || 'Gagal mengambil data sheet.', 'error');
            }
        })
        .catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Gagal koneksi ke server.', 'error');
        });
    }

    function executeDeleteSheets(sheetsArray) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENGHAPUS SHEET...";

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete_sheets", password: "FIND1", sheets: sheetsArray }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") {
                Swal.fire('Berhasil!', data.message, 'success');
            } else {
                Swal.fire('Error', data.error || 'Gagal menghapus sheet.', 'error');
            }
        })
        .catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Gagal koneksi ke server.', 'error');
        });
    }

    function openMasterDataModal() {
        const buyers = [...new Set(dynamicDB.map(r => r.buyer))].sort();
        const buyerOpts = buyers.map(b => `<option value="${b}">${b}</option>`).join('');

        Swal.fire({
            title: 'KELOLA MASTER DATA',
            html: `
                <div style="text-align:left; display:flex; flex-direction:column; gap:10px; font-family:'Inter', sans-serif; font-size:12px; font-weight:800;">
                    <label>1. PILIH BUYER:</label>
                    <select id="sw-b" class="swal2-select" style="width:100%; margin:0; border-radius:2px;" onchange="updateSwalStyles(this.value)">
                        <option value="" disabled selected>-- Pilih --</option>
                        ${buyerOpts}
                        <option value="MANUAL" style="color:red;">+ KETIK BUYER BARU</option>
                    </select>
                    <input id="sw-b-manual" class="swal2-input" placeholder="Nama Buyer Baru..." style="display:none; margin:0; width:100%; border-radius:2px;">

                    <label>2. PILIH STYLE:</label>
                    <select id="sw-s" class="swal2-select" style="width:100%; margin:0; border-radius:2px;" onchange="updateSwalColors(this.value)">
                        <option value="" disabled selected>-- Pilih Buyer Dulu --</option>
                    </select>
                    <input id="sw-s-manual" class="swal2-input" placeholder="Nama Style Baru..." style="display:none; margin:0; width:100%; border-radius:2px;">

                    <label>3. PILIH COLOR (Kosongkan jika hapus style):</label>
                    <select id="sw-c" class="swal2-select" style="width:100%; margin:0; border-radius:2px;" onchange="toggleManualColor(this.value)">
                        <option value="" disabled selected>-- Pilih Style Dulu --</option>
                    </select>
                    <input id="sw-c-manual" class="swal2-input" placeholder="Nama Color Baru..." style="display:none; margin:0; width:100%; text-transform:uppercase; border-radius:2px;">

                    <label style="margin-top:10px;">4. QTY ORDER:</label>
                    <input type="number" id="sw-qty" class="swal2-input" placeholder="Masukkan Qty Order..." style="margin:0; width:100%; border-radius:2px;">

                    <label style="margin-top:10px;">5. AKSI DATABASE:</label>
                    <select id="sw-action" class="swal2-select" style="width:100%; margin:0; border-radius:2px;">
                        <option value="add" selected>TAMBAH DATA</option>
                        <option value="delete" style="color:red; font-weight:bold;">HAPUS DATA (MINUSKAN)</option>
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#0f172a',
            cancelButtonColor: '#475569',
            confirmButtonText: 'KIRIM KE SERVER',
            didOpen: () => {
                window.updateSwalStyles = (b) => {
                    const sInp = document.getElementById('sw-b-manual');
                    const sSel = document.getElementById('sw-s');
                    const cSel = document.getElementById('sw-c');
                    const cInp = document.getElementById('sw-c-manual');
                    cSel.innerHTML = '<option value="" disabled selected>-- Pilih Style Dulu --</option>';
                    cInp.style.display = 'none';

                    if(b === 'MANUAL') {
                        sInp.style.display = 'block';
                        sSel.innerHTML = '<option value="MANUAL" selected>+ KETIK STYLE BARU</option>';
                        window.updateSwalColors('MANUAL');
                    } else {
                        sInp.style.display = 'none';
                        const filteredStyles = [...new Set(dynamicDB.filter(x => x.buyer === b).map(x => x.style))].sort();
                        sSel.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>' + 
                                         filteredStyles.map(s => `<option value="${s}">${s}</option>`).join('') +
                                         '<option value="MANUAL" style="color:red;">+ KETIK STYLE BARU</option>';
                    }
                };

                window.updateSwalColors = (s) => {
                    const bSel = document.getElementById('sw-b').value;
                    const finalB = (bSel === 'MANUAL') ? document.getElementById('sw-b-manual').value.trim().toUpperCase() : bSel;
                    
                    const sInp = document.getElementById('sw-s-manual');
                    const cSel = document.getElementById('sw-c');
                    const cInp = document.getElementById('sw-c-manual');
                    
                    if (s === 'MANUAL') {
                        sInp.style.display = 'block';
                        cSel.innerHTML = '<option value="MANUAL" selected>+ KETIK COLOR BARU</option>';
                        window.toggleManualColor('MANUAL');
                    } else {
                        sInp.style.display = 'none';
                        const filteredColors = [...new Set(dynamicDB.filter(x => x.buyer === finalB && x.style === s).map(x => x.color))].sort();
                        cSel.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>' + 
                                         filteredColors.map(c => `<option value="${c}">${c}</option>`).join('') +
                                         '<option value="MANUAL" style="color:red;">+ KETIK COLOR BARU</option>';
                        cInp.style.display = 'none';
                    }
                };

                window.toggleManualColor = (v) => {
                    document.getElementById('sw-c-manual').style.display = (v === 'MANUAL') ? 'block' : 'none';
                };
            },
            preConfirm: () => {
                const bSel = document.getElementById('sw-b').value;
                const bMan = document.getElementById('sw-b-manual').value.trim().toUpperCase();
                const sSel = document.getElementById('sw-s').value;
                const sMan = document.getElementById('sw-s-manual').value.trim().toUpperCase();
                const cSel = document.getElementById('sw-c').value;
                const cMan = document.getElementById('sw-c-manual').value.trim().toUpperCase();
                const qty = document.getElementById('sw-qty').value.trim();
                const dbAction = document.getElementById('sw-action').value;
                const finalB = (bSel === 'MANUAL') ? bMan : bSel;
                const finalS = (sSel === 'MANUAL') ? sMan : sSel;
                const finalC = (cSel === 'MANUAL') ? cMan : cSel;

                if(!finalB || !finalS || (dbAction === 'add' && !finalC)) { 
                    Swal.showValidationMessage('Lengkapi kolom yang wajib!'); 
                    return false; 
                }
                
                return { action: "add_custom_data", buyer: finalB, style: finalS, color: finalC, qty_order: qty, mode: dbAction };
            }
        }).then(res => { if(res.isConfirmed) sendDataToServer(res.value); });
    }

    function sendDataToServer(payload) {
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
                let msg = payload.mode === 'delete' ? 'Data berhasil dihapus dari Spreadsheet.' : 'Data tersimpan di Google Sheets. QC lain akan otomatis terupdate.';
                Swal.fire('Berhasil!', msg, 'success');
                fetchMasterDataFromServer();
            } else {
                Swal.fire('Error', d.error || 'Terjadi kesalahan.', 'error');
            }
        });
    }

    function openReportModal() {
        Swal.fire({
            title: 'GENERATE EXPORT EXCEL',
            html: `
                <div style="text-align:left; font-size:11px; font-weight:800; color:var(--text-main); font-family:'Inter', sans-serif;">
                    <label style="color:var(--text-brand);">TIPE LAPORAN:</label>
                    <select id="swal-rep-type" class="swal2-select" style="display:flex; width:100%; margin: 5px 0 15px; font-size:13px; padding:10px; border-radius:2px; box-sizing:border-box;">
                        <option value="daily">DAILY (Harian)</option>
                        <option value="weekly">WEEKLY (Mingguan)</option>
                        <option value="monthly">MONTHLY (Bulanan)</option>
                        <option value="yearly">YEARLY (Tahunan)</option>
                    </select>

                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="color:var(--text-brand);">DARI TANGGAL:</label>
                            <input type="date" id="swal-rep-start" class="swal2-input" style="margin:5px 0 0; width:100%; height:40px; font-size:13px; border-radius:2px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="color:var(--text-brand);">SAMPAI TANGGAL:</label>
                            <input type="date" id="swal-rep-end" class="swal2-input" style="margin:5px 0 0; width:100%; height:40px; font-size:13px; border-radius:2px; box-sizing:border-box;">
                        </div>
                    </div>

                    <label style="color:var(--text-brand);">SUMBER DATA EXPORT:</label>
                    <select id="swal-rep-source" class="swal2-select" style="display:flex; width:100%; margin: 5px 0 15px; font-size:13px; padding:10px; border-radius:2px; box-sizing:border-box;">
                        <option value="original">ORIGINAL (Data Asli / Mentah)</option>
                        <option value="review">REVIEW (Data Sesudah Di-Review SPV)</option>
                    </select>

                    <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; background:var(--bg-section); padding:12px; border-radius:2px; border:1px solid var(--border-line); margin-top:5px;">
                        <input type="checkbox" id="swal-rep-db" style="width:18px; height:18px; accent-color:var(--primary); margin-top:2px;">
                        <span style="line-height:1.4;">Sertakan File <b>DATABASE</b> & <b>DB_DEFECTS</b> utuh ke dalam Export (Untuk Kebutuhan Charting Lanjutan)</span>
                    </label>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#475569',
            confirmButtonText: 'GENERATE REPORT',
            cancelButtonText: 'BATAL',
            preConfirm: () => {
                let start = document.getElementById('swal-rep-start').value;
                let end = document.getElementById('swal-rep-end').value;
                if(!start || !end) { Swal.showValidationMessage('Tentukan Dari Tanggal dan Sampai Tanggal!'); return false; }
                if(start > end) { Swal.showValidationMessage('Tanggal Mulai tidak boleh lebih besar dari Tanggal Akhir!'); return false; }
                return {
                    type: document.getElementById('swal-rep-type').value,
                    start_date: start,
                    end_date: end,
                    source: document.getElementById('swal-rep-source').value,
                    include_db: document.getElementById('swal-rep-db').checked
                };
            }
        }).then((result) => {
            if(result.isConfirmed) {
                executeGenerateReport(result.value);
            }
        });
    }

    function executeGenerateReport(config) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENYUSUN EXCEL DI SERVER...";

        const payload = { 
            action: "generate_report", 
            password: "FIND1",
            report_type: config.type,
            start_date: config.start_date,
            end_date: config.end_date,
            data_source: config.source,
            include_db: config.include_db
        };

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success" && data.exportUrl) {
                Swal.fire({
                    title: 'REPORT BERHASIL DIBUAT!',
                    text: 'File Excel Summary Report sudah siap untuk diunduh.',
                    icon: 'success',
                    confirmButtonText: 'DOWNLOAD EXCEL',
                    confirmButtonColor: '#10b981'
                }).then(() => {
                    window.open(data.exportUrl, '_blank');
                });
            } else { 
                Swal.fire('Error', data.error || 'Gagal generate report.', 'error'); 
            }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; 
            Swal.fire('Gagal Koneksi', 'Pastikan internet stabil saat menarik ribuan data.', 'error');
        });
    }

    let dynamicDB = [];

    function buildDatabase(serverRows = null) {
        dynamicDB = [];
        let rows;

        if (serverRows) {
            rows = serverRows;
            localStorage.setItem('cached_dbbuyer_fin', JSON.stringify(rows));
        } else {
            const cached = localStorage.getItem('cached_dbbuyer_fin');
            rows = cached ? JSON.parse(cached) : [];
        }

        if (rows.length > 1) { 
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][0] && rows[i][1]) {
                    dynamicDB.push({
                        buyer: rows[i][0].toString().trim().toUpperCase(),
                        style: rows[i][1].toString().trim().toUpperCase(),
                        color: rows[i][2] ? rows[i][2].toString().trim().toUpperCase() : "-",
                        qty_order: rows[i][3] ? rows[i][3].toString().trim() : "-"
                    });
                }
            }
        }
    }

    function populateBuyerSelect() {
        let buyerSelect = document.getElementById('buyer');
        let buyerSelect10 = document.getElementById('buyer_10');
        let currentVal = buyerSelect.value;
        let currentVal10 = buyerSelect10 ? buyerSelect10.value : "";
        let mappedBuyers = [...new Set(dynamicDB.map(r => r.buyer))].filter(Boolean).sort();
        
        let opts = '<option value="" disabled selected>-- Pilih Buyer --</option>' + 
            mappedBuyers.map(b => `<option value="${b}">${b}</option>`).join('');
            
        buyerSelect.innerHTML = opts;
        if (buyerSelect10) buyerSelect10.innerHTML = opts;
        
        if (mappedBuyers.includes(currentVal)) buyerSelect.value = currentVal;
        if (buyerSelect10 && mappedBuyers.includes(currentVal10)) buyerSelect10.value = currentVal10;
    }

    function updateDropdowns(source) {
        let buyerSelect = document.getElementById('buyer');
        let styleSelect = document.getElementById('style');
        let colorSelect = document.getElementById('color');

        let curBuyer = buyerSelect.value;
        let curStyle = styleSelect.value;

        let filtered = dynamicDB;

        if (source === 'buyer') {
            curStyle = "";
            styleSelect.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>';
            colorSelect.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>';
        }

        let partContainer = document.getElementById('container_vs_part');
        if (curBuyer && curBuyer.toUpperCase() === "VICTORIA’S SECRET") {
            partContainer.style.display = 'flex';
        } else {
            partContainer.style.display = 'none';
            document.getElementById('vs_part').value = "";
        }

        if (curBuyer) {
            filtered = filtered.filter(row => row.buyer === curBuyer);
            let validStyles = [...new Set(filtered.map(row => row.style))].filter(Boolean).sort();
            
            let styleOptions = '<option value="" disabled selected>-- Pilih Style --</option>';
            validStyles.forEach(s => { styleOptions += `<option value="${s}">${s}</option>`; });
            styleSelect.innerHTML = styleOptions;

            if (validStyles.includes(curStyle)) { styleSelect.value = curStyle; } 
            else { curStyle = ""; }
        }

        if (source === 'style') {
            colorSelect.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>';
        }

        if (curBuyer && curStyle) {
            let styleFiltered = filtered.filter(row => row.style === curStyle);
            let validColors = [...new Set(styleFiltered.map(row => row.color))].filter(Boolean).sort();

            let colorOptions = '<option value="" disabled selected>-- Pilih Color --</option>';
            validColors.forEach(c => { colorOptions += `<option value="${c}">${c}</option>`; });
            colorSelect.innerHTML = colorOptions;
        }
    }

    function updateDropdowns10(source) {
        let buyerSelect = document.getElementById('buyer_10');
        let styleSelect = document.getElementById('style_10');
        let colorSelect = document.getElementById('color_10');

        let curBuyer = buyerSelect.value;
        let curStyle = styleSelect.value;
        let filtered = dynamicDB;

        if (source === 'buyer') {
            curStyle = "";
            styleSelect.innerHTML = '<option value="" disabled selected>-- Pilih Style --</option>';
            colorSelect.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>';
        }

        let partContainer10 = document.getElementById('container_vs_part_10');
        if (curBuyer && curBuyer.toUpperCase() === "VICTORIA’S SECRET") {
            partContainer10.style.display = 'flex';
        } else {
            partContainer10.style.display = 'none';
            document.getElementById('vs_part_10').value = "";
        }

        if (curBuyer) {
            filtered = filtered.filter(row => row.buyer === curBuyer);
            let validStyles = [...new Set(filtered.map(row => row.style))].filter(Boolean).sort();
            let styleOptions = '<option value="" disabled selected>-- Pilih Style --</option>';
            validStyles.forEach(s => { styleOptions += `<option value="${s}">${s}</option>`; });
            styleSelect.innerHTML = styleOptions;
            if (validStyles.includes(curStyle)) styleSelect.value = curStyle; else curStyle = "";
        }

        if (source === 'style') {
            colorSelect.innerHTML = '<option value="" disabled selected>-- Pilih Color --</option>';
        }

        if (curBuyer && curStyle) {
            let styleFiltered = filtered.filter(row => row.style === curStyle);
            let validColors = [...new Set(styleFiltered.map(row => row.color))].filter(Boolean).sort();
            let colorOptions = '<option value="" disabled selected>-- Pilih Color --</option>';
            validColors.forEach(c => { colorOptions += `<option value="${c}">${c}</option>`; });
            colorSelect.innerHTML = colorOptions;
        }
    }

    function initTrackerFilters() {
        let fBuyer = document.getElementById('filter_buyer');
        let mappedBuyers = [...new Set(dynamicDB.map(r => r.buyer))].filter(Boolean).sort();
        if(fBuyer.options.length <= 1) {
            fBuyer.innerHTML = '<option value="">-- SEMUA BUYER --</option>' + mappedBuyers.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        if(!document.getElementById('filter_start').value) {
            const d = new Date();
            document.getElementById('filter_end').value = d.toISOString().split('T')[0];
            d.setDate(d.getDate() - 7);
            document.getElementById('filter_start').value = d.toISOString().split('T')[0];
        }
    }
    
    function updateTrackerFilters(source) {
        let fBuyer = document.getElementById('filter_buyer').value;
        let fStyle = document.getElementById('filter_style');
        let fColor = document.getElementById('filter_color');
        
        let filtered = dynamicDB;

        if(source === 'buyer') {
            fStyle.innerHTML = '<option value="">-- SEMUA STYLE --</option>';
            fColor.innerHTML = '<option value="">-- SEMUA COLOR --</option>';
        }
        
        if(fBuyer) {
            filtered = filtered.filter(row => row.buyer === fBuyer);
            let validStyles = [...new Set(filtered.map(row => row.style))].filter(Boolean).sort();
            
            if(source === 'buyer') {
                validStyles.forEach(s => { fStyle.innerHTML += `<option value="${s}">${s}</option>`; });
            }
        }
        
        let currentStyle = fStyle.value;
        if(source === 'style') {
            fColor.innerHTML = '<option value="">-- SEMUA COLOR --</option>';
            if(fBuyer && currentStyle) {
                let styleFiltered = filtered.filter(row => row.style === currentStyle);
                let validColors = [...new Set(styleFiltered.map(row => row.color))].filter(Boolean).sort();
                validColors.forEach(c => { fColor.innerHTML += `<option value="${c}">${c}</option>`; });
            }
        }
    }
    
    function searchTracker() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENGAMBIL DATA...";
        
        let tStart = document.getElementById('filter_start').value;
        let tEnd = document.getElementById('filter_end').value;
        let tBuyer = document.getElementById('filter_buyer').value;
        let tStyle = document.getElementById('filter_style').value;
        let tColor = document.getElementById('filter_color').value;
        let tSP = document.getElementById('filter_sp').value;
        let tStatus = document.getElementById('filter_status').value; 
        
        const payload = { action: "get_tracker", start_date: tStart, end_date: tEnd, buyer: tBuyer, style: tStyle, color: tColor, sp: tSP };
        
        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            let tbody = document.getElementById('tracker_body');
            document.getElementById('tracker_table_card').style.display = 'block';
            
            if(data.result === "success" && data.data && data.data.length > 0) {
                let totalInsp = 0, totalDef = 0, totalGood = 0;
                tbody.innerHTML = '';
                
                let finalData = data.data;
                if(tSP) { finalData = finalData.filter(d => (d.sp && d.sp.toUpperCase() === tSP.toUpperCase()) || !d.sp); }
                
                if(tStatus) { finalData = finalData.filter(d => d.qc && d.qc.includes(`[${tStatus}]`)); }
                
                currentTrackerData = finalData;

                if (finalData.length === 0) {
                    document.getElementById('tracker_chart_card').style.display = 'none';
                    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:24px;">Data tidak ditemukan pada rentang tersebut.</td></tr>`;
                    return;
                }
                
                finalData.forEach(d => {
                    totalInsp += parseInt(d.insp) || 0;
                    totalDef += parseInt(d.def) || 0;
                    totalGood += parseInt(d.good) || 0;
                    let qcLabel = d.qc;
                    if(qcLabel.includes("[REV]")) {
                        qcLabel = `<span style="background:var(--primary); color:white; padding:3px 6px; border-radius:2px; font-size:10px;">REV</span> ${qcLabel.replace('[REV]', '').trim()}`;
                    } else if(qcLabel.includes("[ASLI]")) {
                        qcLabel = `<span style="background:var(--accent); color:white; padding:3px 6px; border-radius:2px; font-size:10px;">ASLI</span> ${qcLabel.replace('[ASLI]', '').trim()}`;
                    }
                    let matchDB = dynamicDB.find(x => x.buyer === d.buyer && x.style === d.style && x.color === d.color);
                    let qtyOrder = matchDB ? matchDB.qty_order : "-";

                    tbody.innerHTML += `<tr><td>${d.tanggal}</td><td>${qcLabel}</td><td>${d.line}</td><td>${d.buyer}</td><td>${d.style}</td><td>${d.color}</td><td style="color:var(--text-brand); font-weight:900;">${qtyOrder}</td><td style="font-weight:bold;">${d.insp}</td><td style="color:var(--danger); font-weight:bold;">${d.def}</td><td style="color:var(--success); font-weight:bold;">${d.good}</td><td>${d.pct}</td></tr>`;
                });
                
                let overallPctStr = totalInsp > 0 ? ((totalDef / totalInsp) * 100).toFixed(1) + "%" : "0%";
                let goodPctStr = totalInsp > 0 ? ((totalGood / totalInsp) * 100).toFixed(1) + "%" : "0%";

                document.getElementById('tracker_chart_pct').innerText = overallPctStr;
                document.getElementById('tracker_chart_pct').style.color = totalDef > 0 ? "var(--danger)" : "var(--success)";
                document.getElementById('tracker_chart_good').innerText = `${totalGood} (${goodPctStr})`;
                document.getElementById('tracker_chart_def').innerText = totalDef;

                document.getElementById('tracker_chart_card').style.display = 'block';
                renderTrackerChart([totalGood, totalDef]);
                
                document.getElementById('tracker_table_wrapper').style.display = 'block';
                document.getElementById('toggleTableBtn').innerText = 'SEMBUNYIKAN';
                
            } else {
                currentTrackerData = [];
                document.getElementById('tracker_chart_card').style.display = 'none';
                tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:24px;">Data tidak ditemukan pada rentang tersebut.</td></tr>`;
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Gagal', 'Koneksi ke server bermasalah.', 'error');
        });
    }

    function renderTrackerChart(dataVals) {
        const ctx = document.getElementById('trackerAnalyticsChart').getContext('2d');
        if(trackerAnalyticsChart) { trackerAnalyticsChart.destroy(); }
        
        trackerAnalyticsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Good', 'Defect'],
                datasets: [{
                    data: dataVals,
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }

    function toggleTrackerTable() {
        const wrapper = document.getElementById('tracker_table_wrapper');
        const btn = document.getElementById('toggleTableBtn');
        if (wrapper.style.display === 'none') {
            wrapper.style.display = 'block';
            btn.innerText = 'SEMBUNYIKAN';
        } else {
            wrapper.style.display = 'none';
            btn.innerText = 'TAMPILKAN LOG';
        }
    }

    function generateToWA() {
        if(!currentTrackerData || currentTrackerData.length === 0) {
            Swal.fire('Kosong', 'Tidak ada data untuk dibagikan.', 'warning');
            return;
        }

        let tStart = document.getElementById('filter_start').value || "-";
        let tEnd = document.getElementById('filter_end').value || "-";
        let tBuyer = document.getElementById('filter_buyer').value || "SEMUA BUYER";
        let tStyle = document.getElementById('filter_style').value || "SEMUA STYLE";
        let tColor = document.getElementById('filter_color').value || "SEMUA COLOR";
        let tSP = document.getElementById('filter_sp').value || "SEMUA PROSES";
        let tStatus = document.getElementById('filter_status').value;

        let totalInsp = 0, totalDef = 0, totalGood = 0;
        let listText = "";
        let hasRev = false;
        
        currentTrackerData.forEach((d, i) => {
            totalInsp += parseInt(d.insp) || 0;
            totalDef += parseInt(d.def) || 0;
            totalGood += parseInt(d.good) || 0;
            
            if(d.qc.includes('[REV]')) hasRev = true;

            let matchDB = dynamicDB.find(x => x.buyer === d.buyer && x.style === d.style && x.color === d.color);
            let qtyOrder = matchDB ? matchDB.qty_order : "-";
            
            let rawQc = d.qc.replace(/<[^>]*>?/gm, '').replace(/\[REV\]/g, '').replace(/\[ASLI\]/g, '').trim(); 
            listText += `${i+1}. ${d.tanggal} | L.${d.line} | ${rawQc} | Qty Order:${qtyOrder} | Insp:${d.insp} | Def:${d.def} (${d.pct})\n`;
        });

        let overallPct = totalInsp > 0 ? ((totalDef/totalInsp)*100).toFixed(1) + "%" : "0%";

        let title = "*REPORT QC FINISHING*";
        if (tStatus === "REV" || hasRev) {
             title = "*REPORT QC FINISHING (AFTER REVIEW)*";
        }

        let text = `${title}\n`;
        text += `Periode: ${tStart} s/d ${tEnd}\n`;
        text += `Buyer: ${tBuyer}\n`;
        text += `Style: ${tStyle}\n`;
        text += `Color: ${tColor}\n`;
        text += `Proses: ${tSP}\n\n`;
        
        text += `*TOTAL AKUMULASI:*\n`;
        text += `- Inspect: ${totalInsp} Pcs\n`;
        text += `- Good: ${totalGood} Pcs\n`;
        text += `- Defect: ${totalDef} Pcs (${overallPct})\n\n`;

        text += `*RINCIAN DATA:*\n${listText}`;

        let encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }

    function toggleTheme() { 
        document.body.classList.toggle('dark-mode'); 
        localStorage.setItem('darkMode_fin', document.body.classList.contains('dark-mode')); 
    }
    function setDefaultDate() { const d = new Date(); document.getElementById('tanggal').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    function formatAntiMinus(input) { input.value = input.value.replace(/[^0-9]/g, ''); }

    function calculateShiftHours() {
        let start = document.getElementById('shift_start').value;
        let end = document.getElementById('shift_end').value;
        let displaySpan = document.getElementById('shift_hours');
        
        if(start && end) {
            let t1 = start.split(":");
            let t2 = end.split(":");
            let d1 = new Date(2000, 0, 1, t1[0], t1[1]); 
            let d2 = new Date(2000, 0, 1, t2[0], t2[1]);
            if(d2 < d1) d2.setDate(d2.getDate() + 1); 
            let diff = (d2 - d1) / (1000 * 60 * 60);
            let hours = Math.floor(diff);
            let mins = Math.round((diff % 1) * 60);
            displaySpan.innerText = `(${hours} Jam ${mins > 0 ? mins + ' Menit' : ''})`;
        } else { displaySpan.innerText = ""; }
    }

    let selectedNum = "";
    let selectedSuf = "";
    let selectedLines = [];

    function openLineModal() {
        let cur = document.getElementById('line_name').value;
        selectedLines = cur ? cur.split(',').map(x => x.trim()).filter(x => x) : [];
        selectedNum = ""; 
        selectedSuf = "";
        renderLineModal();
        document.getElementById('lineModal').style.display = 'flex';
    }

    function closeLineModal() {
        if (selectedNum !== "") {
            let newLine = selectedNum + selectedSuf;
            if(!selectedLines.includes(newLine)) selectedLines.push(newLine);
        }
        document.getElementById('lineModal').style.display = 'none';
        document.getElementById('line_name').value = selectedLines.join(', ');
        applyPatokan();
        saveData(); 
    }

    function pickNum(n) { selectedNum = n; renderLineModal(); }
    function pickSuf(s) { selectedSuf = s; renderLineModal(); }
    
    function addLineToTag() {
        if(!selectedNum) { Swal.fire('Perhatian','Pilih angka line terlebih dahulu!','warning'); return; }
        let newLine = selectedNum + selectedSuf;
        if(!selectedLines.includes(newLine)) selectedLines.push(newLine);
        selectedNum = ""; selectedSuf = ""; renderLineModal();
    }
    
    function removeLineTag(line) {
        selectedLines = selectedLines.filter(x => x !== line);
        renderLineModal();
    }

    function renderLineModal() {
        let tagsHtml = selectedLines.map(l => `<div class="line-tag">${l} <span onclick="removeLineTag('${l}'); event.stopPropagation();">X</span></div>`).join('');
        if(!tagsHtml) tagsHtml = `<span style="color:var(--text-sub); font-size:12px; margin:auto; font-family:'Inter', sans-serif; font-weight:600;">Pilih angka di bawah...</span>`;
        document.getElementById('lineTags').innerHTML = tagsHtml;
        let numsHtml = "";
        for(let i = 1; i <= 20; i++) {
            let selClass = (selectedNum == i) ? 'selected' : '';
            numsHtml += `<button class="num-btn ${selClass}" onclick="pickNum('${i}')">${i}</button>`;
        }
        document.getElementById('gridNumbers').innerHTML = numsHtml;
        let sufs = [ {val: "", label: "ANGKA SAJA"}, {val: "A", label: "A"}, {val: "B", label: "B"} ];
        let sufHtml = sufs.map(s => {
            let selClass = (selectedSuf === s.val) ? 'selected' : '';
            return `<button class="suf-btn ${selClass}" onclick="pickSuf('${s.val}')">${s.label}</button>`;
        }).join('');
        document.getElementById('gridSuffix').innerHTML = sufHtml;
    }

    const typeSewingGeneral = ["BROKEN STITCH", "FABRIC DEFECT", "INCONSISTENT", "MISSING", "PLEATED", "POORSHAPE/POINTED/EXPOSED", "PUCKERING", "RUN OF STITCH", "SHADING", "SKIP STITCH", "STAIN", "TRIMMING", "TWIST/ROPPING/FULLNESS", "UNMATCH/HIGH LOW"];
    const defectMaster = {
        "SEWING": {
            "ARMHOLE": typeSewingGeneral, "BACK BODY": typeSewingGeneral, "BARTACK": typeSewingGeneral,
            "BOTTOM HEMMING": typeSewingGeneral, "BUTTON": typeSewingGeneral, "BUTTON HOLE": typeSewingGeneral,
            "COLLAR/NECK": typeSewingGeneral, "DECORATIVE": typeSewingGeneral, "FRONT BODY": typeSewingGeneral,
            "FRONT PLACKET": typeSewingGeneral, "FRONT/BACK RISE": typeSewingGeneral, "HANDMADE": typeSewingGeneral,
            "INSEAM/OUTSEAM": typeSewingGeneral, "LINING": typeSewingGeneral, "MAIN LABEL/CARE LABEL": typeSewingGeneral,
            "MANSET": typeSewingGeneral, "OVERLOOK": typeSewingGeneral, "POCKET": typeSewingGeneral,
            "SHOULDER": typeSewingGeneral, "SIDE SEAM": typeSewingGeneral, "SLEEVE": typeSewingGeneral,
            "SLIT/VENT": typeSewingGeneral, "STEAM/IRONING": typeSewingGeneral, "WAIST": typeSewingGeneral
        },
        "FINISHING": {
            "BUTTON": ["BROKEN", "MISSING"], "BUTTON HOLE": ["BROKEN"], "HAND MADE": ["BROKEN", "MISSING"],
            "IRONING": ["CREASEMARK", "EXPOSED", "SHINING"], "OTHER": ["-"], "SHADING": ["-"],
            "SIZE SPEC": ["-"], "STAIN": ["LINGKUNGAN", "OIL"], "TRIMMING": ["-"], "WEAVING": ["HOLE", "SLUB", "YARNPULL"]
        }
    };

    let activeDefects = {}; 
    let currentCategory = "SEWING";

    function switchCategory(cat) {
        currentCategory = cat;
        document.getElementById('tab_sewing').classList.toggle('active', cat === 'SEWING');
        document.getElementById('tab_finishing').classList.toggle('active', cat === 'FINISHING');
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
        if(area && defectMaster[currentCategory][area]) {
            const types = [...defectMaster[currentCategory][area]].sort();
            if(types.length === 1 && types[0] === "-") {
                selType.innerHTML = '<option value="-">TIDAK ADA SUB-JENIS</option>';
                selType.value = "-";
            } else {
                types.forEach(type => { selType.innerHTML += `<option value="${type}">${type}</option>`; });
                if(types.length === 1) selType.value = types[0];
            }
        }
    }

    function initChart() {
        const ctx = document.getElementById('defectChart').getContext('2d');
        defectChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Good', 'Defect'], datasets: [{ data: [1, 0], backgroundColor: ['#cbd5e1', '#ef4444'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }

    function addDefectToList() {
        let area = document.getElementById('sel_area').value;
        let type = document.getElementById('sel_type').value;
        if(!area || !type) { Swal.fire('Perhatian', 'Pilih Area dan Jenis Defect terlebih dahulu.', 'warning'); return; }
        let key = `${currentCategory}_${area}_${type}`;
        if(activeDefects[key]) { Swal.fire('Info', 'Defect ini sudah ada di daftar.', 'info'); return; }
        activeDefects[key] = { cat: currentCategory, area: area, type: type, qty: "" };
        document.getElementById('sel_area').value = ""; document.getElementById('sel_type').value = "";
        renderDefectList();
        if (window.navigator && window.navigator.vibrate) navigator.vibrate(50);
    }

    function renderDefectList() {
        let container = document.getElementById('active_defects_container');
        let html = ""; let count = 0;
        for(let key in activeDefects) {
            count++; let item = activeDefects[key];
            let typeSubtitle = item.type === "-" ? "" : `<span class="summary-subtitle">↳ ${item.type}</span>`;
            html += `
            <div class="summary-card" id="card_${key}">
                <div class="summary-header">
                    <div class="summary-title"><span>${item.area}</span>${typeSubtitle}</div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="btn-del" style="background:var(--accent);border-color:var(--accent);" onclick="showDefectInfo('${item.type.replace(/'/g, "\\'")}','${item.area.replace(/'/g, "\\'")}')">?</button>
                        <button class="btn-del" onclick="removeDefect('${key}')">X</button>
                    </div>
                </div>
                <div class="flex-inputs">
                    <div class="stepper" style="width: 100%;">
                        <button onclick="adjVal('${key}', -1)">-</button>
                        <input type="number" id="inp_qty_${key}" value="${item.qty}" oninput="manualInput('${key}', this.value)" placeholder="QTY">
                        <button onclick="adjVal('${key}', 1)">+</button>
                    </div>
                </div>
            </div>`;
        }
        if(count === 0) container.innerHTML = `<div class="empty-state" id="empty_state">BELUM ADA DEFECT YANG DITAMBAHKAN.<br><span style="font-weight:600; font-family:'Inter', sans-serif; font-size:11px; display:block; margin-top:8px; text-transform:none;">Silakan pilih Area & Jenis di atas lalu klik Tambahkan.</span></div>`;
        else container.innerHTML = html;
        calculate();
    }

    function adjVal(key, amount) {
        let val = parseInt(activeDefects[key].qty) || 0;
        let newVal = val + amount;
        activeDefects[key].qty = newVal > 0 ? newVal : "";
        document.getElementById(`inp_qty_${key}`).value = newVal > 0 ? newVal : "";
        if (window.navigator && window.navigator.vibrate) navigator.vibrate(40); 
        calculate();
    }

    function manualInput(key, value) {
        let num = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        activeDefects[key].qty = num > 0 ? num : "";
        document.getElementById(`inp_qty_${key}`).value = num > 0 ? num : "";
        calculate();
    }

    function removeDefect(key) { delete activeDefects[key]; renderDefectList(); }

    function calculate() {
        let totalDefect = 0;
        for(let key in activeDefects) { totalDefect += parseInt(activeDefects[key].qty) || 0; }
        document.getElementById('tot_def').value = totalDefect;
        const qtyGood = parseInt(document.getElementById('qty_good').value) || 0;
        const qtyInsp = qtyGood + totalDefect;
        
        let defPctStr = "0%", goodPctStr = "0%";
        if (qtyInsp > 0) {
            defPctStr = ((totalDefect / qtyInsp) * 100).toFixed(1) + "%";
            goodPctStr = ((qtyGood / qtyInsp) * 100).toFixed(1) + "%";
            document.getElementById('qty_insp').value = qtyInsp;
            document.getElementById('pct_def').value = defPctStr;
        } else {
            document.getElementById('qty_insp').value = 0;
            document.getElementById('pct_def').value = "0%";
        }

        document.getElementById('chart_good').innerText = `${qtyGood} (${goodPctStr})`;
        document.getElementById('chart_def').innerText = totalDefect;
        let pctLabel = document.getElementById('chart_pct');
        
        if (qtyInsp === 0) {
            pctLabel.innerText = "0%"; pctLabel.style.color = "var(--text-sub)";
            if(defectChart) { defectChart.data.datasets[0].data = [1, 0]; defectChart.data.datasets[0].backgroundColor = ['#cbd5e1', '#ef4444']; defectChart.update(); }
        } else {
            pctLabel.innerText = defPctStr; pctLabel.style.color = totalDefect > 0 ? "var(--danger)" : "var(--success)";
            if(defectChart) { defectChart.data.datasets[0].data = [qtyGood, totalDefect]; defectChart.data.datasets[0].backgroundColor = ['#10b981', '#ef4444']; defectChart.update(); }
        }
        saveData(); 
    }

    function saveData() { 
        const data = {}; 
        document.querySelectorAll('input, textarea, select').forEach(input => { 
            if(input.id && !input.readOnly && !input.id.startsWith('inp_') && !input.id.startsWith('filter_') && !input.id.startsWith('swal-') && input.id !== 'tanggal_inline') data[input.id] = input.value; 
        }); 
        localStorage.setItem('qcActiveDefects_fin', JSON.stringify(activeDefects));
        localStorage.setItem('qcAutoSave3_fin', JSON.stringify(data)); 
    }
    
    function loadData() {
        populateArea(); 
        initChart();
        
        fetchMasterDataFromServer(); 
        
        fetchLockedDate();
        
        const saved = localStorage.getItem('qcAutoSave3_fin');
        const savedDefects = localStorage.getItem('qcActiveDefects_fin');
        
        if(savedDefects) { 
            activeDefects = JSON.parse(savedDefects); 
            renderDefectList(); 
        }
        
        if(saved) {
            const data = JSON.parse(saved);
            document.querySelectorAll('input, textarea, select').forEach(input => {
                if(input.id && !['buyer', 'style', 'color', 'tanggal_inline'].includes(input.id) && !input.readOnly && !input.id.startsWith('inp_')) {
                    if(data[input.id] !== undefined) input.value = data[input.id];
                }
            });
            calculateShiftHours(); 
            calculate();
        } else { 
            setDefaultDate(); 
        }
        setDefaultDateInline();

        if(localStorage.getItem('darkMode_fin') === 'true') { 
            document.body.classList.add('dark-mode'); 
        }
        checkOfflineBadge();
    }

    function resetForm() {
        Swal.fire({
            title: 'Hapus Semua Formulir?', text: "Data akan dibersihkan.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#475569', confirmButtonText: 'Ya, Bersihkan!'
        }).then((result) => {
            if (result.isConfirmed) {
                activeDefects = {}; renderDefectList();
                ['line_name','buyer','style','color','special_process','shift_start','shift_end','jam_istirahat','qty_good', 'nama_qc', 'vs_part'].forEach(id => { document.getElementById(id).value = ""; });
                document.getElementById('container_vs_part').style.display = 'none';
                document.getElementById('shift_hours').innerText = ""; calculate(); 
                
                populateBuyerSelect(); updateDropdowns('buyer'); 
                saveData();
                Swal.fire('Bersih!', 'Form sudah di-reset.', 'success');
            }
        });
    }
    let activeDefects10 = {};
    let currentCategory10 = "SEWING";

    function switchCategory10(cat) {
        currentCategory10 = cat;
        document.getElementById('tab_sewing_10').classList.toggle('active', cat === 'SEWING');
        document.getElementById('tab_finishing_10').classList.toggle('active', cat === 'FINISHING');
        populateArea10();
    }

    function populateArea10() {
        const selArea = document.getElementById('sel_area_10');
        selArea.innerHTML = '<option value="" disabled selected>-- Pilih Area --</option>';
        if (defectMaster[currentCategory10]) {
            Object.keys(defectMaster[currentCategory10]).sort().forEach(area => { 
                selArea.innerHTML += `<option value="${area}">${area}</option>`; 
            });
        }
        document.getElementById('sel_type_10').innerHTML = '<option value="" disabled selected>-- Pilih Jenis --</option>';
    }

    function populateType10() {
        const area = document.getElementById('sel_area_10').value;
        const selType = document.getElementById('sel_type_10');
        selType.innerHTML = '<option value="" disabled selected>-- Pilih Jenis --</option>';
        if(area && defectMaster[currentCategory10][area]) {
            const types = [...defectMaster[currentCategory10][area]].sort();
            if(types.length === 1 && types[0] === "-") {
                selType.innerHTML = '<option value="-">TIDAK ADA SUB-JENIS</option>';
                selType.value = "-";
            } else {
                types.forEach(type => { selType.innerHTML += `<option value="${type}">${type}</option>`; });
                if(types.length === 1) selType.value = types[0];
            }
        }
    }

    function addDefect10() {
        let area = document.getElementById('sel_area_10').value;
        let type = document.getElementById('sel_type_10').value;
        if(!area || !type) { Swal.fire('Perhatian', 'Pilih Area dan Jenis Defect.', 'warning'); return; }
        let key = `${currentCategory10}_${area}_${type}`;
        if(activeDefects10[key]) { Swal.fire('Info', 'Defect sudah ada.', 'info'); return; }
        activeDefects10[key] = { cat: currentCategory10, area: area, type: type, qty: 1 };
        document.getElementById('sel_area_10').value = ""; document.getElementById('sel_type_10').value = "";
        renderDefect10();
    }

    function renderDefect10() {
        let container = document.getElementById('container_defects_10');
        let html = ""; let count = 0;
        for(let key in activeDefects10) {
            count++; let item = activeDefects10[key];
            let typeSub = item.type === "-" ? "" : `<span class="summary-subtitle">↳ ${item.type}</span>`;
            html += `
            <div class="summary-card">
                <div class="summary-header">
                    <div class="summary-title"><span>${item.area}</span>${typeSub}</div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="btn-del" style="background:var(--accent);border-color:var(--accent);" onclick="showDefectInfo('${item.type.replace(/'/g, "\\'")}','${item.area.replace(/'/g, "\\'")}')">?</button>
                        <button class="btn-del" onclick="removeDefect10('${key}')">X</button>
                    </div>
                </div>
                <div class="flex-inputs">
                    <div class="stepper" style="width: 100%;">
                        <button onclick="adjVal10('${key}', -1)">-</button>
                        <input type="number" id="inp_10_${key}" value="${item.qty}" oninput="manualInput10('${key}', this.value)">
                        <button onclick="adjVal10('${key}', 1)">+</button>
                    </div>
                </div>
            </div>`;
        }
        if(count === 0) container.innerHTML = `<div class="empty-state">BELUM ADA DEFECT</div>`;
        else container.innerHTML = html;
        calc10();
    }

    function removeDefect10(key) { delete activeDefects10[key]; renderDefect10(); }
    function adjVal10(key, amount) {
        let val = parseInt(activeDefects10[key].qty) || 0;
        let newVal = val + amount;
        activeDefects10[key].qty = newVal > 0 ? newVal : "";
        document.getElementById(`inp_10_${key}`).value = activeDefects10[key].qty;
        calc10();
    }
    function manualInput10(key, val) {
        let num = parseInt(val.replace(/[^0-9]/g, '')) || 0;
        activeDefects10[key].qty = num > 0 ? num : "";
        calc10();
    }

    function calc10() {
        let totalDef = 0;
        for(let key in activeDefects10) { totalDef += parseInt(activeDefects10[key].qty) || 0; }
        let good = parseInt(document.getElementById('qty_good_10').value) || 0;
        let insp = good + totalDef;
        let pct = insp > 0 ? ((totalDef / insp) * 100).toFixed(1) + "%" : "0%";
        
        document.getElementById('lbl_def_10').innerText = totalDef;
        document.getElementById('lbl_insp_10').innerText = insp;
        document.getElementById('lbl_pct_10').innerText = pct;
        return { good, totalDef, insp, pct };
    }

    function submitCek10() {
        let qc = document.getElementById('nama_qc_10').value;
        let jam = document.getElementById('jam_cek_10').value;
        let buyer = document.getElementById('buyer_10').value;
        let style = document.getElementById('style_10').value;
        if (buyer.toUpperCase() === "VICTORIA’S SECRET") {
            let p10 = document.getElementById('vs_part_10').value;
            if(!p10) { Swal.fire('Perhatian', 'Kolom PART (Pants/Blouse) wajib diisi untuk Victoria\'s Secret!', 'warning'); return; }
            style += " (" + p10 + ")";
        }
        let color = document.getElementById('color_10').value;
        let lineName = document.getElementById('line_name_10').value || "-";
        let tgl = document.getElementById('tanggal').value;
        let totals = calc10();

        if(!qc || !jam || !buyer || !style || !color) { Swal.fire('Error', 'Kolom wajib (QC, Jam, Buyer, Style, Color) harus diisi!', 'warning'); return; }
        if(totals.insp <= 0) { Swal.fire('Error', 'Qty Good atau Defect harus diisi!', 'warning'); return; }

        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "KIRIM CEK...";

        let defectsArr = [];
        for(let key in activeDefects10) { defectsArr.push(activeDefects10[key]); }

        let payload = {
            action: "submit_cek10",
            tanggal: tgl,
            jam_cek: jam,
            nama_qc: qc,
            buyer: buyer,
            style: style,
            color: color,
            line: lineName,
            qty_good: totals.good,
            qty_def: totals.totalDef,
            qty_insp: totals.insp,
            defects: defectsArr
        };

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then(r => r.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") {
                Swal.fire('Sukses', `Data Random Cek untuk QC ${qc} Jam ${jam} terkirim!\nTotal Inspect: ${totals.insp} Pcs\nRate: ${totals.pct}`, 'success');
                activeDefects10 = {}; renderDefect10();
                document.getElementById('jam_cek_10').value = "";
                document.getElementById('qty_good_10').value = "";
                calc10();
            } else {
                Swal.fire('Error', data.error || 'Terjadi kesalahan.', 'error');
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Error', 'Koneksi gagal.', 'error');
        });
    }
    
    window.onload = function() {
        loadData();
        initHourlyEngine();
    };

    let absenSourceTab = 'daily';

    function openAbsenMenu() {
        const isInlineTab = document.getElementById('btn-tab-inline').classList.contains('active');
        absenSourceTab = isInlineTab ? 'inline' : 'daily';
        let namaQC;
        if (isInlineTab) {
            namaQC = document.getElementById('nama_qc_inline').value === 'MANUAL'
                ? document.getElementById('nama_qc_inline_manual').value.trim().toUpperCase()
                : document.getElementById('nama_qc_inline').value;
        } else {
            namaQC = document.getElementById('nama_qc').value;
        }
        if(!namaQC) {
            Swal.fire('Perhatian', 'Pilih Nama QC terlebih dahulu sebelum absen!', 'warning');
            return;
        }

        Swal.fire({
            title: 'PILIH JENIS ABSEN',
            html: `
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
                    <button onclick="Swal.close(); setTimeout(() => processAbsen('TIDAK BERANGKAT'), 300);" style="background:var(--danger); color:white; border:none; padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 #b91c1c; transition:transform 0.1s, box-shadow 0.1s;" onmousedown="this.style.transform='translateY(3px)'; this.style.boxShadow='none';" onmouseup="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 0 #b91c1c';">
                        TIDAK BERANGKAT
                    </button>
                    <button onclick="Swal.close(); setTimeout(() => openBalancingSubMenu(), 300);" style="background:var(--accent); color:var(--btn-text); border:none; padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 #b45309; transition:transform 0.1s, box-shadow 0.1s;" onmousedown="this.style.transform='translateY(3px)'; this.style.boxShadow='none';" onmouseup="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 0 #b45309';">
                        BALANCING PROCESS
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'BATAL'
        });
    }

    function processAbsen(type) {
        let titleText = type === 'TIDAK BERANGKAT' ? 'TIDAK BERANGKAT' : 'BALANCING PROCESS';
        let phText = type === 'TIDAK BERANGKAT' ? 'Ketik alasan di sini (Sakit, Izin, Cuti, dll)...' : 'Ketik keterangan pindah support ke mana...';

        Swal.fire({
            title: titleText,
            input: 'textarea',
            inputLabel: 'Keterangan',
            inputPlaceholder: phText,
            showCancelButton: true,
            confirmButtonColor: type === 'TIDAK BERANGKAT' ? '#ef4444' : '#f59e0b',
            cancelButtonColor: '#475569',
            confirmButtonText: 'KIRIM',
            cancelButtonText: 'BATAL',
            preConfirm: (text) => {
                if (!text) { Swal.showValidationMessage('Keterangan wajib diisi!'); }
                return text;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                specialStatus = type; 
                absentReasonText = result.value;
                showSummaryAndSubmit(); 
            }
        });
    }

    function openBalancingSubMenu() {
        Swal.fire({
            title: 'PILIH JENIS BALANCING PROCESS',
            html: `
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
                    <button onclick="Swal.close(); setTimeout(() => processDirectAkurasi('CEK AKURASI VS'), 300);" style="background:var(--primary); color:var(--btn-text); border:1px solid var(--btn-border); padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 var(--btn-shadow);">
                        CEK AKURASI VS
                    </button>
                    <button onclick="Swal.close(); setTimeout(() => processDirectAkurasi('CEK AKURASI PACKING'), 300);" style="background:var(--accent); color:var(--btn-text); border:none; padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 #b45309;">
                        CEK AKURASI PACKING
                    </button>
                    <button onclick="Swal.close(); setTimeout(() => processDirectAkurasi('CEK INLINE FINISHING'), 300);" style="background:var(--success); color:white; border:none; padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer; box-shadow:0 3px 0 #047857;">
                        CEK INLINE FINISHING
                    </button>
                    <button onclick="Swal.close(); setTimeout(() => processCekAkurasi('LAINNYA'), 300);" style="background:var(--bg-input); color:var(--text-brand); border:2px solid var(--border-line); padding:16px; border-radius:2px; font-weight:800; font-family:'Outfit', sans-serif; font-size:13px; cursor:pointer;">
                        LAINNYA (TULIS SENDIRI)
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'BATAL'
        });
    }

    function processDirectAkurasi(type) {
        const shiftStart = document.getElementById('shift_start').value;
        const shiftEnd = document.getElementById('shift_end').value;
        if(!shiftStart || !shiftEnd) {
            Swal.fire('Perhatian', 'Isi SHIFT (Jam Mulai - Jam Selesai) di menu utama terlebih dahulu sebelum melakukan Balancing Process!', 'warning');
            return;
        }
        specialStatus = type;
        absentReasonText = "-";
        showSummaryAndSubmit();
    }

    function processCekAkurasi(type) {
        const shiftStart = document.getElementById('shift_start').value;
        const shiftEnd = document.getElementById('shift_end').value;
        if(!shiftStart || !shiftEnd) {
            Swal.fire('Perhatian', 'Isi SHIFT (Jam Mulai - Jam Selesai) di menu utama terlebih dahulu sebelum melakukan Balancing Process!', 'warning');
            return;
        }

        let statusFinal = (type === 'LAINNYA') ? 'BALANCING PROCESS' : type;
        let titleText = (type === 'LAINNYA') ? 'BALANCING PROCESS (LAINNYA)' : type;
        let phText = (type === 'LAINNYA') ? 'Ketik keterangan balancing process di sini...' : 'Ketik keterangan tambahan (jika ada)...';

        Swal.fire({
            title: titleText,
            input: 'textarea',
            inputLabel: 'Keterangan',
            inputPlaceholder: phText,
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#475569',
            confirmButtonText: 'KIRIM',
            cancelButtonText: 'BATAL',
            preConfirm: (text) => {
                if (!text) { Swal.showValidationMessage('Keterangan wajib diisi!'); }
                return text;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                specialStatus = statusFinal;
                absentReasonText = result.value;
                showSummaryAndSubmit();
            }
        });
    }

    function fetchPreviewDashboard() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENYIAPKAN DATA MENTAH...";
        
        const payload = { action: "get_dashboard_summary" };
        
        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") {
                tampilModalTarget(data.summaryHTML);
            } else {
                Swal.fire('Error', data.summaryHTML || 'Gagal memuat preview.', 'error');
            }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; 
            Swal.fire('Koneksi Buruk', 'Tidak dapat mengambil preview data.', 'error');
        });
    }

    function tampilModalTarget(previewData) {
        Swal.fire({
            title: 'REVIEW & PENGATURAN TARGET',
            html: `
                <div style="font-size:11px; font-weight:800; font-family:'Inter', sans-serif; margin-bottom:5px; text-align:left; color:var(--text-brand);">TARGET TOTAL DEFECT (%)</div>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input type="number" step="0.1" id="swal-min" placeholder="Min (Cth: 4)" class="swal2-input" style="margin:0; width:50%; height:40px; font-size:13px; border-radius:2px;">
                    <input type="number" step="0.1" id="swal-max" placeholder="Max (Cth: 5)" class="swal2-input" style="margin:0; width:50%; height:40px; font-size:13px; border-radius:2px;">
                </div>
                <div style="font-size:11px; font-weight:800; font-family:'Inter', sans-serif; margin-bottom:5px; text-align:left; color:var(--text-brand);">TARGET KHUSUS FINISHING (%)</div>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input type="number" step="0.1" id="swal-fin-min" placeholder="Min Fin (Cth: 1.0)" class="swal2-input" style="margin:0; width:50%; height:40px; font-size:13px; border-radius:2px;">
                    <input type="number" step="0.1" id="swal-fin-max" placeholder="Max Fin (Cth: 1.5)" class="swal2-input" style="margin:0; width:50%; height:40px; font-size:13px; border-radius:2px;">
                </div>
                
                <div style="text-align:left; font-size:11px; color:var(--text-sub); border: 1px dashed var(--border-line); padding: 12px; border-radius: 4px; background:var(--bg-section); font-family:'Inter', sans-serif;">
                    <b style="color:var(--text-brand); font-family:'Outfit', sans-serif; letter-spacing:0.5px;">RINGKASAN DATA HARI INI (SEBELUM REVIEW):</b><br>
                    <div style="margin-top:8px; max-height:120px; overflow-y:auto; line-height: 1.5;">${previewData}</div>
                </div>
                <div style="font-size:10px; font-family:'Inter', sans-serif; font-weight:600; color:var(--danger); margin-top:12px; text-align:left;">
                    *Sistem akan mengeksekusi Randomizer, memindahkannya ke Database Review, membangun ulang Summary Sheet, lalu Tutup Shift.
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#0f172a',
            cancelButtonColor: '#475569',
            confirmButtonText: 'EKSEKUSI REVIEW',
            cancelButtonText: 'BATAL',
            preConfirm: () => {
                return {
                    min: document.getElementById('swal-min').value,
                    max: document.getElementById('swal-max').value,
                    min_fin: document.getElementById('swal-fin-min').value,
                    max_fin: document.getElementById('swal-fin-max').value
                };
            }
        }).then((result) => {
            if(result.isConfirmed) {
                executeReviewData(result.value.min, result.value.max, result.value.min_fin, result.value.max_fin);
            }
        });
    }

    function executeReviewData(min, max, min_fin, max_fin) {
        if(!SCRIPT_URL) return;
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MENGEKSEKUSI REVIEW...";
        
        const payload = { 
            action: "review_data", 
            version: APP_VERSION, 
            password: "FIND1", 
            min_target: min, 
            max_target: max,
            min_fin: min_fin,
            max_fin: max_fin
        };

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") { Swal.fire('Berhasil!', 'Data telah di-Review, disimpan ke Database khusus, Summary diperbarui, dan Shift ditutup.', 'success'); } 
            else { Swal.fire('Error', data.error, 'error'); }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; 
            Swal.fire('Gagal Koneksi', 'Pastikan internet stabil untuk melakukan review.', 'error');
        });
    }

    function showSummaryAndSubmit() {
        const namaQC = document.getElementById('nama_qc').value; 
        const buyer = document.getElementById('buyer').value; 
        const line = document.getElementById('line_name').value || "-"; 
        let style = document.getElementById('style').value;
        if (buyer.toUpperCase() === "VICTORIA’S SECRET") {
            let partVal = document.getElementById('vs_part').value;
            if(!partVal && specialStatus === "") {
                Swal.fire('Perhatian', 'Kolom PART (Pants/Blouse) wajib diisi untuk Victoria\'s Secret!', 'warning');
                return;
            }
            if(partVal) style += " (" + partVal + ")";
        }
        const color = document.getElementById('color').value;
        const sp = document.getElementById('special_process').value;
        const inputTanggal = (specialStatus !== "" && absenSourceTab === 'inline')
            ? document.getElementById('tanggal_inline').value
            : document.getElementById('tanggal').value;
        
        const qty_good = parseInt(document.getElementById('qty_good').value) || 0;
        const t_def = parseInt(document.getElementById('tot_def').value) || 0; 
        const t_insp = qty_good + t_def;

        let patokanKey = buyer.toUpperCase() + "_" + style.toUpperCase();
        
        if(patokanDataServer[patokanKey] && specialStatus === "") {
            let p = patokanDataServer[patokanKey];
            if(line !== p.line || sp !== p.sp) {
                Swal.fire('Kekeliruan Data!', `Sistem menolak submit! Ada perbedaan dengan patokan Dashboard:\n\nSeharusnya:\nLine: ${p.line}\nSpecial Process: ${p.sp}\n\nSistem otomatis mengoreksi, silakan klik Submit ulang.`, 'error');
                document.getElementById('line_name').value = p.line;
                document.getElementById('special_process').value = p.sp;
                selectedLines = p.line.split(',').map(x => x.trim()).filter(x => x);
                return;
            }
        }

        if (lockedDateServer && inputTanggal !== lockedDateServer) {
            Swal.fire('Tanggal Tidak Sesuai Perintah!', `Sistem saat ini hanya menerima data untuk tanggal: <b>${lockedDateServer}</b>. Pastikan tanggal benar seusai perintah!`, 'error');
            return;
        }

        const currentDataSignature = JSON.stringify({
            buyer: buyer, style: style, color: color, sp: sp, qty_good: qty_good, t_def: t_def, defects: activeDefects
        });

        if (localStorage.getItem('lastSubmitSignature_fin') === currentDataSignature && specialStatus === "") {
            Swal.fire('Data Ganda Terdeteksi!', 'Kamu tidak bisa mengisi data yang sama persis (Buyer, Style, Color, Qty, dan Defect sama) berturut-turut. Cek kembali!', 'error');
            return;
        }

        if (specialStatus === "") {
            if(!namaQC || line === "-" || !line || !buyer || !style || !color || !sp) { 
                Swal.fire('Perhatian', 'Semua kolom (NAMA QC, BUYER, LINE, SPESIAL PROSES, STYLE, COLOR) wajib diisi!', 'warning'); return; 
            }
            if(t_insp === 0) { 
                Swal.fire('Data Tidak Valid', 'Total Lulus (Good) atau Defect harus diisi!', 'error'); return; 
            }

            Swal.fire({
                title: 'KONFIRMASI REKAP',
                html: `<span style="font-family:'Inter', sans-serif; font-size:13px;">(Sistem akan menjumlahkan otomatis jika spesifikasi ini sudah ada)<br><br><b>QC:</b> ${namaQC}<br><b>Buyer:</b> ${buyer}<br><b>Line:</b> ${line} | <b>Style:</b> ${style}<br><b>Color:</b> ${color}<br><b>Total Inspect:</b> ${t_insp} pcs<br><b>Total Defect:</b> <span style="color:var(--danger); font-weight:bold;">${t_def}</span> pcs<br><b>Total Lulus:</b> <span style="color:var(--success); font-weight:bold;">${qty_good}</span> pcs<br><hr>Kirim ke Server?</span>`,
                icon: 'question', showCancelButton: true, confirmButtonColor: '#0f172a', cancelButtonColor: '#ef4444', confirmButtonText: 'Ya, Kirim!'
            }).then((result) => { 
                if (result.isConfirmed) { 
                    executeSendToServer(line, currentDataSignature); 
                }
            });
        } else {
            executeSendToServer(line, currentDataSignature);
        }
    }

    function checkOfflineBadge() {
        localStorage.removeItem('qcOfflineQueue_fin');
        let btnSync = document.getElementById('btnSync');
        if(btnSync) btnSync.style.display = 'none';
    }

    function executeSendToServer(line, currentDataSignature) {
        if(SCRIPT_URL.includes("ISI_DENGAN_LINK")) { fallbackOffline(line, {}); return; }
        
        let payload = constructPayload(line);
        
        let btnSub = document.getElementById('btnSubmitMain');
        btnSub.disabled = true; btnSub.innerHTML = 'MENGIRIM...';
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "SYNC TO CLOUD...";

        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none'; btnSub.disabled = false; btnSub.innerHTML = 'CONFIRM & SUBMIT';
            
            if(data.result === "success") { 
                localStorage.setItem('lastSubmitSignature_fin', currentDataSignature);
                Swal.fire('Sukses', specialStatus !== "" ? `Laporan ${specialStatus.toLowerCase()} tersimpan!` : 'Data Finishing berhasil diakumulasikan!', 'success').then(() => { clearAfterSubmit(); }); 
            } else if(data.result === "duplicate") {
                Swal.fire({
                    title: 'DATA SUDAH ADA!',
                    html: '<span style="font-family:\'Inter\', sans-serif; font-size:13px;">Peringatan: Data dengan kombinasi ini sudah ada di sistem. <b>Mohon teliti kembali dan isi data lainnya jika ada.</b><br><br>Apakah Anda yakin ingin <b>tetap menumpuk/mengakumulasi</b> data ini?</span>',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#0f172a',
                    cancelButtonColor: '#475569',
                    confirmButtonText: 'YA, TETAP KIRIM',
                    cancelButtonText: 'BATAL'
                }).then((result) => {
                    if (result.isConfirmed) {
                        payload.force_submit = true;
                        forceSubmitToServer(payload, currentDataSignature);
                    }
                });
            } else if(data.error === "VERSION_MISMATCH") {
                Swal.fire('Versi Usang!', 'Aplikasi yang Anda gunakan sudah usang. Silakan minta file HTML versi terbaru ke SPV Anda.', 'error');
            } else { Swal.fire('Error', 'Gagal dari server: ' + data.error, 'error'); }
        }).catch(err => { 
            document.getElementById('loading').style.display = 'none'; btnSub.disabled = false; btnSub.innerHTML = 'CONFIRM & SUBMIT';
            fallbackOffline(line, payload);
        });
    }

    function forceSubmitToServer(payload, currentDataSignature) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "MEMAKSA KIRIM DATA...";
        
        fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }})
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if(data.result === "success") { 
                localStorage.setItem('lastSubmitSignature_fin', currentDataSignature);
                Swal.fire('Sukses', 'Data berhasil ditambahkan secara paksa!', 'success').then(() => { clearAfterSubmit(); }); 
            } else { Swal.fire('Error', 'Gagal dari server: ' + data.error, 'error'); }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            fallbackOffline(payload.line_name, payload);
        });
    }

    function constructPayload(line) {
        let defectsArray = [];
        for(let key in activeDefects) {
            let item = activeDefects[key];
            defectsArray.push({ cat: item.cat, area: item.area, type: item.type, qty: parseInt(item.qty) || 0 });
        }
        
        const d = new Date();
        const currentJam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        const isAbsenType = specialStatus !== "";
        const isTidakBerangkat = specialStatus === "TIDAK BERANGKAT";

        const absenNamaQC = (isAbsenType && absenSourceTab === 'inline')
            ? (document.getElementById('nama_qc_inline').value === 'MANUAL'
                ? document.getElementById('nama_qc_inline_manual').value.trim().toUpperCase()
                : document.getElementById('nama_qc_inline').value)
            : document.getElementById('nama_qc').value;
        const absenTanggal = (isAbsenType && absenSourceTab === 'inline')
            ? document.getElementById('tanggal_inline').value
            : document.getElementById('tanggal').value;

        return {
            action: "submit", version: APP_VERSION, nama_qc: absenNamaQC,
            tanggal: absenTanggal, jam: currentJam, line_name: isAbsenType ? "-" : line, 
            buyer: isAbsenType ? "-" : (document.getElementById('buyer').value || "-"), style: isAbsenType ? "-" : (function(){
                let b = document.getElementById('buyer').value || "-";
                let s = document.getElementById('style').value || "-";
                if (b.toUpperCase() === "VICTORIA’S SECRET") {
                    let p = document.getElementById('vs_part').value;
                    if(p) s += " (" + p + ")";
                }
                return s;
            })(), 
            color: isAbsenType ? "-" : (document.getElementById('color').value || "-"), 
            special_process: isAbsenType ? "-" : (document.getElementById('special_process').value || "-"), 
            shift_start: (isAbsenType && isTidakBerangkat) ? "" : document.getElementById('shift_start').value, 
            shift_end: (isAbsenType && isTidakBerangkat) ? "" : document.getElementById('shift_end').value, 
            jam_istirahat: isAbsenType ? "0" : document.getElementById('jam_istirahat').value,
            
            qty_good: isAbsenType ? 0 : document.getElementById('qty_good').value, 
            qty_insp: isAbsenType ? 0 : document.getElementById('qty_insp').value,
            tot_def: isAbsenType ? 0 : document.getElementById('tot_def').value, 
            pct_def: isAbsenType ? "0%" : document.getElementById('pct_def').value, 
            defects: isAbsenType ? [] : defectsArray,
            status_absen: isAbsenType ? specialStatus : "HADIR",
            alasan: isAbsenType ? absentReasonText : "-",
            force_submit: false
        };
    }

    function fallbackOffline(line, payload) {
        Swal.fire('Gagal Terkirim', 'Koneksi internet bermasalah. Data TIDAK tersimpan. Silakan cek sinyal lalu submit ulang.', 'error');
    }

    function clearAfterSubmit() {
        specialStatus = ""; absentReasonText = ""; absenSourceTab = 'daily';
        activeDefects = {}; renderDefectList();
        ['style','color','qty_good'].forEach(id => { document.getElementById(id).value = ""; });
        calculate(); populateBuyerSelect(); updateDropdowns('buyer'); saveData();
    }

    function pushOfflineData() {
        localStorage.removeItem('qcOfflineQueue_fin');
    }

    async function exportToExcel() {
        const buyer = document.getElementById('buyer').value || "";
        const dateStr = document.getElementById('tanggal').value || "Hari_ini";
        const shiftStart = document.getElementById('shift_start').value || "";
        const shiftEnd = document.getElementById('shift_end').value || "";
        const jamIstirahat = document.getElementById('jam_istirahat').value || "0";
        
        let shiftStr = shiftStart && shiftEnd ? `${shiftStart} - ${shiftEnd}` : "";
        if(shiftStart && shiftEnd) {
            let t1 = shiftStart.split(":"); let t2 = shiftEnd.split(":");
            let d1 = new Date(2000, 0, 1, t1[0], t1[1]); let d2 = new Date(2000, 0, 1, t2[0], t2[1]);
            if(d2 < d1) d2.setDate(d2.getDate() + 1); 
            let diff = (d2 - d1) / (1000 * 60 * 60); let hours = Math.floor(diff); let mins = Math.round((diff % 1) * 60);
            shiftStr += ` (${hours} Jam${mins > 0 ? ' ' + mins + ' Menit' : ''})`;
        }

        const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("QC Finishing", { views: [{ showGridLines: false }] });
        sheet.getColumn('A').width = 6; sheet.getColumn('B').width = 30; sheet.getColumn('C').width = 25; sheet.getColumn('D').width = 25; sheet.getColumn('E').width = 12;
        sheet.addRow(["BUYER", "", "", "", buyer]); sheet.mergeCells('A1:D1'); 
        sheet.addRow(["LINE", "", "", "", document.getElementById('line_name').value]); sheet.mergeCells('A2:D2'); 
        sheet.addRow(["SHIFT", "", "", "", shiftStr]); sheet.mergeCells('A3:D3'); 
        sheet.addRow(["ISTIRAHAT (Mnt)", "", "", "", jamIstirahat]); sheet.mergeCells('A4:D4'); 
        sheet.addRow(["TANGGAL", "", "", "", dateStr]); sheet.mergeCells('A5:D5'); 
        sheet.addRow(["STYLE", "", "", "", document.getElementById('style').value]); sheet.mergeCells('A6:D6'); 
        sheet.addRow(["COLOR", "", "", "", document.getElementById('color').value]); sheet.mergeCells('A7:D7'); 
        sheet.addRow(["QTY.DEFECT", "", "", "", document.getElementById('tot_def').value]); sheet.mergeCells('A8:D8'); 
        sheet.addRow(["QTY.GOOD", "", "", "", document.getElementById('qty_good').value]); sheet.mergeCells('A9:D9'); 
        sheet.addRow(["QTY.INSPECT", "", "", "", document.getElementById('qty_insp').value]); sheet.mergeCells('A10:D10'); 
        sheet.addRow(["% DEFECT", "", "", "", document.getElementById('pct_def').value]); sheet.mergeCells('A11:D11'); 
        sheet.addRow(["SPECIAL PROCESS", "", "", "", document.getElementById('special_process').value]); sheet.mergeCells('A12:D12'); 
        sheet.addRow(["NO", "KATEGORI", "AREA / PROSES", "JENIS DEFECT", "QTY"]);
        
        let rowIdx = 1; let startRow = 14; let lastCat = ""; let mergeCatStart = startRow; let lastArea = ""; let mergeAreaStart = startRow;
        for(let key in activeDefects) {
            let item = activeDefects[key]; let outputType = item.type === "-" ? "" : item.type;
            sheet.addRow([rowIdx++, item.cat, item.area, outputType, item.qty]);
            let currentRow = startRow + rowIdx - 2;
            if(item.cat !== lastCat && rowIdx > 2) { if(currentRow - 1 > mergeCatStart) sheet.mergeCells(`B${mergeCatStart}:B${currentRow - 1}`); mergeCatStart = currentRow; }
            lastCat = item.cat;
            if(item.area !== lastArea && rowIdx > 2) { if(currentRow - 1 > mergeAreaStart) sheet.mergeCells(`C${mergeAreaStart}:C${currentRow - 1}`); mergeAreaStart = currentRow; }
            lastArea = item.area;
        }

        let finalRow = startRow + rowIdx - 2;
        if(finalRow > mergeCatStart) sheet.mergeCells(`B${mergeCatStart}:B${finalRow}`);
        if(finalRow > mergeAreaStart) sheet.mergeCells(`C${mergeAreaStart}:C${finalRow}`);

        const blackFont = { name: 'Inter', size: 11, color: { argb: 'FF000000' }, bold: true };
        const borderStyle = { top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } };
        const greyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }; const whiteFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

        sheet.eachRow((row, rowNumber) => {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if(colNumber <= 5) {
                    cell.font = blackFont; cell.border = borderStyle; cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    if(rowNumber <= 12) { if(colNumber === 1) { cell.fill = greyFill; cell.alignment = { vertical: 'middle', horizontal: 'left' }; } else if (colNumber === 5) { cell.fill = whiteFill; }
                    } else if (rowNumber === 13) { cell.fill = greyFill; } else {
                        if(colNumber === 1 || colNumber === 2 || colNumber === 3) { cell.fill = greyFill; if (colNumber > 1) cell.alignment = { vertical: 'middle', horizontal: 'left' }; 
                        } else { cell.fill = whiteFill; }
                    }
                }
            });
        });
        const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `QC_Finishing_${buyer || 'Offline'}_${dateStr}.xlsx`);
    }
    function exportTrackerDashboard() {
        if (!currentTrackerData || currentTrackerData.length === 0) {
            Swal.fire('Data Kosong', 'Silakan filter dan TAMPILKAN DATA tracker terlebih dahulu sebelum melakukan Export.', 'warning');
            return;
        }

        let tStart = document.getElementById('filter_start').value;
        let tEnd = document.getElementById('filter_end').value;
        let tBuyer = document.getElementById('filter_buyer').value;
        let tStyle = document.getElementById('filter_style').value;
        let tColor = document.getElementById('filter_color').value;
        let tSP = document.getElementById('filter_sp').value;
        let tStatus = document.getElementById('filter_status').value;

        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading-text').innerText = "PLEASE WAIT...";

        const payload = {
            action: "export_tracker_dashboard",
            start_date: tStart,
            end_date: tEnd,
            buyer: tBuyer,
            style: tStyle,
            color: tColor,
            sp: tSP,
            status: tStatus
        };

        fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload), 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.result === "success") {
                Swal.fire({
                    title: 'EXPORT BERHASIL!',
                    text: 'File Excel Dashboard Tracker siap diunduh.',
                    icon: 'success',
                    confirmButtonText: 'UNDUH EXCEL',
                    confirmButtonColor: '#10b981'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.open(data.excel_url, '_blank');
                    }
                });
            } else {
                Swal.fire('Error', data.error || 'Gagal membuat file export.', 'error');
            }
        }).catch(err => {
            document.getElementById('loading').style.display = 'none';
            Swal.fire('Gagal Koneksi', 'Pastikan koneksi internet stabil saat membentuk Dashboard.', 'error');
        });
    }