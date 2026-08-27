(function () {
            const d = new Date();
            const pinSuffix = (d.getMonth() + 1).toString() + d.getFullYear().toString().slice(-2);
            const expectedPin = 'CUT' + pinSuffix;
            const globalPin = 'CATALYSTD1';

            const tiketArea = localStorage.getItem('tiket_cutting');
            const tiketGlobal = localStorage.getItem('qc_token_global');
            if (tiketArea !== expectedPin || tiketGlobal !== globalPin) {
                
            }
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
            const dummyRows = generateDummyRows(30, 'CUT');

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
        const listQC = [
            "Haura", "Fitri", "Nafisah"
        ];

        const listProcess = [
            "MARKER", "FABRIC", "SPREADING", "CUTTING", "FUSE", "BUNDLE", "NUMBER"
        ];

        const panelGroup1 = ["BODY", "INTERLINING", "LINING", "PIPING", "COMBO"];
        const panelGroup2 = ["BACK", "FRONT", "SLEEVE", "YOKE", "COLLAR", "CUFF", "FAC / FP"];

        let activePanels = [];
        let buyerStyleData = {};

        function toggleTheme() {
            if (navigator.vibrate) navigator.vibrate(50);
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode_cutting', document.body.classList.contains('dark-mode'));
        }

        function showLoading(txt) {
            document.getElementById('loading-text').innerText = txt || 'PROCESSING...';
            document.getElementById('loading').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }

        function openSheet(id) {
            if (navigator.vibrate) navigator.vibrate(20);
            const el = document.getElementById(id);
            el.style.display = 'flex'; setTimeout(() => el.classList.add('show'), 10);
        }

        function closeSheet(id, e) {
            if (e && e.target !== e.currentTarget) return;
            const el = document.getElementById(id);
            el.classList.remove('show'); setTimeout(() => el.style.display = 'none', 300);
        }

        function setDefaultDate() {
            const d = new Date();
            document.getElementById('tanggal').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        function initDropdowns() {
            let htmlQC = '<option value="" disabled selected>-- Pilih QC --</option>';
            listQC.forEach(qc => { htmlQC += `<option value="${qc}">${qc}</option>`; });
            document.getElementById('qc_name').innerHTML = htmlQC;

            let htmlProc = '<option value="" disabled selected>-- Pilih Proses --</option>';
            listProcess.forEach(p => { htmlProc += `<option value="${p}">${p}</option>`; });
            document.getElementById('qc_process').innerHTML = htmlProc;
        }

        function fetchBuyerStyle() {
            let payload = { action: "getBuyerStyleGAS" };
            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            })
            .then(res => res.text())
            .then(text => {
                let res;
                try { res = JSON.parse(text); } catch(e) { res = text; }
                if(res.status === "success") {
                    buyerStyleData = res.data;
                    renderBuyerDropdown();
                } else {
                    document.getElementById('buyer').innerHTML = '<option value="" disabled selected>Gagal Muat Data</option>';
                }
            })
            .catch(err => {
                document.getElementById('buyer').innerHTML = '<option value="" disabled selected>Gagal Muat Data</option>';
            });
        }

        function renderBuyerDropdown() {
            let html = '<option value="" disabled selected>-- Pilih Buyer --</option>';
            for(let b in buyerStyleData) {
                html += `<option value="${b}">${b}</option>`;
            }
            document.getElementById('buyer').innerHTML = html;
        }

        function handleBuyerChange() {
            let b = document.getElementById('buyer').value;
            let sSelect = document.getElementById('style');
            if(b && buyerStyleData[b]) {
                let html = '<option value="" disabled selected>-- Pilih Style --</option>';
                buyerStyleData[b].forEach(s => {
                    html += `<option value="${s}">${s}</option>`;
                });
                sSelect.innerHTML = html;
            } else {
                sSelect.innerHTML = '<option value="" disabled selected>-- Pilih Buyer Dulu --</option>';
            }
        }

        function calculateShiftHours() {
            const start = document.getElementById('shift_start').value;
            const end = document.getElementById('shift_end').value;
            const breakMin = parseInt(document.getElementById('jam_istirahat').value) || 0;

            if (start && end) {
                const sDate = new Date(`1970-01-01T${start}:00`);
                let eDate = new Date(`1970-01-01T${end}:00`);
                if (eDate < sDate) eDate.setDate(eDate.getDate() + 1);

                let diffMs = eDate - sDate;
                let diffMins = (diffMs / (1000 * 60)) - breakMin;
                if (diffMins < 0) diffMins = 0;

                const hrs = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                document.getElementById('shift_hours').value = `${hrs} Hours ${mins} Minutes`;
            } else {
                document.getElementById('shift_hours').value = `0 Hours 0 Minutes`;
            }
        }

        function handleProcessChange() {
            let proc = document.getElementById('qc_process').value;
            let selPanel = document.getElementById('sel_panel');

            selPanel.innerHTML = '<option value="" disabled selected>-- Pilih Panel --</option>';
            let targetGroup = ["MARKER", "FABRIC", "SPREADING"].includes(proc) ? panelGroup1 : panelGroup2;

            targetGroup.forEach(panel => {
                selPanel.innerHTML += `<option value="${panel}">${panel}</option>`;
            });
        }

        function calculateDefectPct() {
            let inspInput = document.getElementById('qty_inspect');
            let defInput = document.getElementById('qty_defect');

            inspInput.value = inspInput.value.replace(/[^0-9]/g, '');
            defInput.value = defInput.value.replace(/[^0-9]/g, '');

            let insp = parseInt(inspInput.value) || 0;
            let def = parseInt(defInput.value) || 0;
            let pctBox = document.getElementById('pct_defect');

            if (insp > 0) {
                let pct = ((def / insp) * 100).toFixed(1);
                pctBox.value = pct + "%";
            } else {
                pctBox.value = "0%";
            }
        }

        function addPanelToList() {
            let proc = document.getElementById('qc_process').value;
            let buyer = document.getElementById('buyer').value;
            let style = document.getElementById('style').value;
            let lot = document.getElementById('lot').value.trim();

            let panel = document.getElementById('sel_panel').value;
            let insp = parseInt(document.getElementById('qty_inspect').value) || 0;
            let def = parseInt(document.getElementById('qty_defect').value) || 0;
            let detail = document.getElementById('defect_detail').value;
            let pct = document.getElementById('pct_defect').value;

            if (!proc || !buyer || !style || !lot) {
                Swal.fire('Attention', 'Lengkapi Data Proses (Proses, Buyer, Style, LOT) terlebih dahulu.', 'warning');
                return;
            }
            if (!panel) {
                Swal.fire('Attention', 'Pilih Panel terlebih dahulu.', 'warning');
                return;
            }
            if (insp === 0) {
                Swal.fire('Attention', 'Qty Inspect tidak boleh kosong atau 0.', 'warning');
                return;
            }
            if (def > insp) {
                Swal.fire('Invalid Data', 'Qty Defect tidak boleh lebih besar dari Qty Inspect.', 'error');
                return;
            }

            let panelId = Date.now().toString();
            activePanels.push({
                id: panelId,
                process: proc,
                buyer: buyer,
                style: style,
                lot: lot,
                panel: panel,
                insp: insp,
                def: def,
                pct: pct,
                detail: detail || "-"
            });

            document.getElementById('sel_panel').value = "";
            document.getElementById('qty_inspect').value = "";
            document.getElementById('qty_defect').value = "";
            document.getElementById('pct_defect').value = "0%";
            document.getElementById('defect_detail').value = "";

            if (navigator.vibrate) navigator.vibrate(50);
            renderPanelList();
        }

        function removePanel(id) {
            activePanels = activePanels.filter(p => p.id !== id);
            renderPanelList();
        }

        function renderPanelList() {
            let container = document.getElementById('active_panels_container');
            if (activePanels.length === 0) {
                container.innerHTML = `<div class="empty-defect" id="empty_state">No panel added yet.</div>`;
                return;
            }

            let html = "";
            activePanels.forEach(p => {
                html += `
            <div class="defect-item">
                <div class="defect-info">
                    <span class="defect-proc-buyer">[${p.process}] ${p.buyer} / ${p.style}</span>
                    <span class="defect-cat">PANEL: ${p.panel} <span style="color:var(--text-sub)">| LOT: ${p.lot}</span></span>
                    <span class="defect-name">${p.detail}</span>
                </div>
                <div class="defect-actions">
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
                        <span class="qty-box">INSP: ${p.insp}<br><span style="color:var(--danger)">DEF: ${p.def}</span></span>
                    </div>
                    <button class="btn-del" onclick="removePanel('${p.id}')">✕</button>
                </div>
            </div>`;
            });
            container.innerHTML = html;
        }

        function resetForm(silently) {
            const doReset = () => {
                document.getElementById('qc_name').value = "";
                document.getElementById('shift_start').value = "";
                document.getElementById('shift_end').value = "";
                document.getElementById('jam_istirahat').value = "0";
                
                document.getElementById('qc_process').value = "";
                document.getElementById('buyer').value = "";
                document.getElementById('style').innerHTML = '<option value="" disabled selected>-- Pilih Buyer Dulu --</option>';
                document.getElementById('lot').value = "";

                document.getElementById('sel_panel').innerHTML = '<option value="" disabled selected>-- Pilih Proses Dulu --</option>';
                document.getElementById('qty_inspect').value = "";
                document.getElementById('qty_defect').value = "";
                document.getElementById('pct_defect').value = "0%";
                document.getElementById('defect_detail').value = "";

                document.getElementById('shift_hours').value = "0 Hours 0 Minutes";

                activePanels = [];
                renderPanelList();
                setDefaultDate();
            };

            if (silently) { doReset(); return; }

            Swal.fire({
                title: 'Reset All Data?',
                text: "Form will be cleared.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, Reset'
            }).then((result) => {
                if (result.isConfirmed) {
                    doReset();
                    Swal.fire('Cleared!', 'Form has been reset.', 'success');
                }
            });
        }

        function submitData() {
            let qcName = document.getElementById('qc_name').value;
            let tanggal = document.getElementById('tanggal').value;
            let shiftHours = document.getElementById('shift_hours').value;
            let shiftStart = document.getElementById('shift_start').value;
            let shiftEnd = document.getElementById('shift_end').value;
            let jamIstirahat = document.getElementById('jam_istirahat').value;

            if (!qcName || !tanggal) {
                Swal.fire('Attention', 'Harap lengkapi Nama QC dan Tanggal Shift!', 'warning');
                return;
            }

            if (activePanels.length === 0) {
                Swal.fire('Attention', 'Tambahkan minimal 1 Panel ke daftar sebelum submit.', 'warning');
                return;
            }

            let uniqueProcs = [...new Set(activePanels.map(p => p.process))];

            Swal.fire({
                title: 'CONFIRM SUBMIT',
                html: `<b>QC:</b> ${qcName}<br><b>Jumlah Proses:</b> ${uniqueProcs.length} macam<br><b>Total Panel:</b> ${activePanels.length} item<br><hr>Apakah sudah sesuai untuk dikirim?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0f172a',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, Submit Data!',
                cancelButtonText: 'Review'
            }).then((result) => {
                if (result.isConfirmed) {
                    showLoading("SAVING DATA...");

                    let payload = {
                        action: "saveDataGAS",
                        tanggal: tanggal,
                        qcName: qcName,
                        shiftStart: shiftStart,
                        shiftEnd: shiftEnd,
                        jamIstirahat: jamIstirahat,
                        shiftHours: shiftHours,
                        panels: activePanels 
                    };

                    fetch(SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify(payload),
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                    })
                    .then(res => res.text())
                    .then(text => {
                        hideLoading();
                        let res;
                        try { res = JSON.parse(text); } catch(e) { res = text; }

                        if (res === "SUCCESS" || res.result === "success" || res.status === "success") {
                            Swal.fire('Success!', 'Data saved successfully.', 'success').then(() => {
                                resetForm(true);
                            });
                        } else {
                            Swal.fire('Error', 'Gagal menyimpan data: ' + (res.message || res), 'error');
                        }
                    })
                    .catch(err => {
                        hideLoading();
                        Swal.fire('Error', 'Gagal terhubung ke server.', 'error');
                    });
                }
            });
        }

        function tutupShiftHarian() {
            Swal.fire({
                title: 'TUTUP SHIFT HARIAN',
                html:
                    '<label style="font-size:12px;font-weight:bold;text-align:left;display:block;margin-top:10px;">PILIH TANGGAL SHIFT:</label>' +
                    '<input type="date" id="swal-input-date" class="swal2-input" style="margin-top:5px;">' +
                    '<label style="font-size:12px;font-weight:bold;text-align:left;display:block;margin-top:10px;">PASSWORD:</label>' +
                    '<input type="password" id="swal-input-pass" class="swal2-input" placeholder="Enter Password..." style="margin-top:5px;">',
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: '#0f172a',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'PROCEED',
                cancelButtonText: 'CANCEL',
                preConfirm: () => {
                    const dateObj = document.getElementById('swal-input-date').value;
                    const passObj = document.getElementById('swal-input-pass').value;
                    if (!dateObj || !passObj) {
                        Swal.showValidationMessage('Harap isi tanggal dan password!');
                    }
                    return { date: dateObj, pass: passObj };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    if (true) {
                        showLoading("GENERATING REPORT...");
                        let payload = { action: "generateDailyReportGAS", tanggal: result.value.date };

                        fetch(SCRIPT_URL, {
                            method: 'POST',
                            body: JSON.stringify(payload),
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                        })
                        .then(res => res.text())
                        .then(text => {
                            hideLoading();
                            let res;
                            try { res = JSON.parse(text); } catch(e) { res = text; }

                            if (res === "SUCCESS" || res.result === "success" || res.status === "success") {
                                Swal.fire('Success', 'Shift Harian berhasil ditutup dan Laporan dibuat.', 'success');
                            } else {
                                Swal.fire('Info', res.message || res, 'info');
                            }
                        })
                        .catch(err => {
                            hideLoading();
                            Swal.fire('Error', 'Gagal memproses tutup shift.', 'error');
                        });

                    } else {
                        Swal.fire('Access Denied', 'Password Salah!', 'error');
                    }
                }
            });
        }

        function kelolaBuyerStyle() {
            Swal.fire({
                title: 'TAMBAH BUYER & STYLE',
                html:
                    '<label style="font-size:12px;font-weight:bold;text-align:left;display:block;margin-top:10px;">BUYER:</label>' +
                    '<input type="text" id="swal-buyer" class="swal2-input" style="text-transform:uppercase;">' +
                    '<label style="font-size:12px;font-weight:bold;text-align:left;display:block;margin-top:10px;">STYLE:</label>' +
                    '<input type="text" id="swal-style" class="swal2-input" style="text-transform:uppercase;">' +
                    '<label style="font-size:12px;font-weight:bold;text-align:left;display:block;margin-top:10px;">PASSWORD SPV:</label>' +
                    '<input type="password" id="swal-pass" class="swal2-input" placeholder="Enter Password...">',
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: '#0f172a',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'SAVE',
                preConfirm: () => {
                    const b = document.getElementById('swal-buyer').value.toUpperCase();
                    const s = document.getElementById('swal-style').value.toUpperCase();
                    const p = document.getElementById('swal-pass').value;
                    if (!b || !s || !p) {
                        Swal.showValidationMessage('Harap isi semua kolom!');
                    }
                    return { buyer: b, style: s, pass: p };
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    if (true) {
                        showLoading("SAVING DATA...");
                        let payload = { action: "addBuyerStyleGAS", buyer: result.value.buyer, style: result.value.style };
                        fetch(SCRIPT_URL, {
                            method: 'POST',
                            body: JSON.stringify(payload),
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                        })
                        .then(res => res.text())
                        .then(text => {
                            hideLoading();
                            let res;
                            try { res = JSON.parse(text); } catch(e) { res = text; }
                            
                            if (res.status === "success") {
                                Swal.fire('Success', 'Buyer & Style berhasil ditambahkan.', 'success');
                                fetchBuyerStyle();
                            } else {
                                Swal.fire('Error', res.message || text, 'error');
                            }
                        })
                        .catch(err => {
                            hideLoading();
                            Swal.fire('Error', 'Koneksi gagal.', 'error');
                        });
                    } else {
                        Swal.fire('Access Denied', 'Password Salah!', 'error');
                    }
                }
            });
        }

        window.onload = () => {
            if (localStorage.getItem('darkMode_cutting') === 'true') document.body.classList.add('dark-mode');
            initDropdowns();
            setDefaultDate();
            fetchBuyerStyle();
        };