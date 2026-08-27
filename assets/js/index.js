const SCRIPT_URL_GLOBAL = "DEMO_MODE_NO_BACKEND";

// ================= DEMO MODE MOCK BACKEND =================
// Portofolio CATALYST — koneksi ke server asli diputus total.
(function () {
    const realFetch = window.fetch;
    window.fetch = function (url, opts) {
        if (typeof url === 'string' && (url.includes('DEMO_MODE_NO_BACKEND') || url.includes('script.google.com'))) {
            const payload = { result: 'success', status: 'success', message: 'Demo mode: data tidak benar-benar tersimpan.' };
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve(JSON.stringify(payload)),
                json: () => Promise.resolve(payload)
            });
        }
        return realFetch.apply(this, arguments);
    };
})();
// ================= END DEMO MODE MOCK BACKEND =================
        const PIN_GLOBAL = "DEMO2026";

        const d = new Date();
        const bln = d.getMonth() + 1;
        const thn = d.getFullYear().toString().slice(-2);
        const pinSuffix = bln.toString() + thn;

        const DATA_AKSES = {
            'cutting':   { url: 'modules/cutting.html',   pin: 'CUT' + pinSuffix, kunci: 'tiket_cutting',   nama: 'CUTTING' },
            'sewing':    { url: 'modules/sewing.html',    pin: 'SEW' + pinSuffix, kunci: 'tiket_sewing',    nama: 'SEWING' },
            'finishing': { url: 'modules/finishing.html', pin: 'FIN' + pinSuffix, kunci: 'tiket_finishing', nama: 'FINISHING' },
            'washing':   { url: 'modules/washing.html',   pin: 'WAS' + pinSuffix, kunci: 'tiket_washing',   nama: 'WASHING' },
            'final':     { url: 'modules/final.html',     pin: 'FNL' + pinSuffix, kunci: 'tiket_final',     nama: 'FINAL' },
            'sample':    { url: 'https://visualqctracker.vercel.app/index.html', pin: 'SPL' + pinSuffix, kunci: 'tiket_sample', nama: 'SAMPLE TRACKER' }
        };

        function getar(ms) {
            if (navigator.vibrate) navigator.vibrate(ms);
        }

        function addRipple(el, e) {
            const rect   = el.getBoundingClientRect();
            const size   = Math.max(rect.width, rect.height);
            const x      = (e.clientX - rect.left) - size / 2;
            const y      = (e.clientY - rect.top) - size / 2;
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-el');
            ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
            el.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }

        function setGreeting() {
            const jam  = d.getHours();
            let sapaan = "Selamat Malam";
            if (jam >= 5  && jam < 11) sapaan = "Selamat Pagi";
            else if (jam >= 11 && jam < 15) sapaan = "Selamat Siang";
            else if (jam >= 15 && jam < 18) sapaan = "Selamat Sore";
            document.getElementById('greetingLabel').innerHTML =
                `${sapaan}!<br><span style="font-size:10px;font-weight:700;color:var(--text-sub);letter-spacing:0.5px;display:block;margin-top:4px;text-transform:uppercase;">Utamakan Keselamatan & Ketelitian Kerja</span>`;
        }

        function toggleTheme() {
            getar(50);
            document.body.classList.toggle('dark-mode');
        }

        function applyAutoTheme() {
            const jam = new Date().getHours();
            if (jam >= 18 || jam < 6) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
        }

        function checkUpdatePopup() {
            if (!localStorage.getItem('qc_update_v1_2_kamus')) {
                Swal.fire({
                    title: 'INFORMASI PEMBARUAN V1.2',
                    html: `
                        <div style="text-align:left;font-size:12px;font-weight:500;line-height:1.6;color:var(--text-sub);">
                            Sistem telah diperbarui dengan integrasi <b>Kamus QC</b>.<br><br>
                            Terdapat dua jenis akses kamus untuk menunjang operasional:<br>
                            <ul style="margin-left: 15px; margin-top: 5px;">
                                <li style="margin-bottom: 5px;"><b>Kamus Utama:</b> Dapat diakses melalui tombol di halaman depan untuk melihat seluruh referensi defect secara terpusat.</li>
                                <li><b>Kamus Section:</b> Terintegrasi di dalam masing-masing menu operasional (Cutting, Sewing, dll) untuk menampilkan referensi defect spesifik sesuai area.</li>
                            </ul><br>
                            Silakan manfaatkan fitur ini sebagai panduan standar kualitas.
                        </div>
                    `,
                    confirmButtonColor: '#0f172a',
                    confirmButtonText: 'MENGERTI',
                    allowOutsideClick: false
                }).then(() => {
                    localStorage.setItem('qc_update_v1_2_kamus', 'true');
                });
            }
        }

        function initApp() {
            try { document.body.style.opacity = '1'; } catch(e) {}
            applyAutoTheme();
            setGreeting();

            const splash = document.getElementById('splash-screen');
            if (splash) {
                setTimeout(() => {
                    splash.style.opacity    = '0';
                    splash.style.visibility = 'hidden';
                }, 1000);
            }

            const tokenPabrik = localStorage.getItem('qc_token_global');
            const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';

            setTimeout(() => {
                const skeleton = document.getElementById('skeletonMenu');
                if (skeleton) skeleton.style.display = 'none';

                const choiceMenu = document.getElementById('choiceMenu');
                const mainMenu = document.getElementById('mainMenu');
                if (!choiceMenu) return;
                if (mainMenu) mainMenu.style.display = 'none';

                // DEMO MODE: password/OTP gate dinonaktifkan agar portofolio bisa diakses bebas
                choiceMenu.style.display = 'grid';
                setTimeout(checkUpdatePopup, 400);
            }, 800);
        }

        window.addEventListener('load', initApp);

        window.addEventListener('pageshow', function(event) {
            try { document.body.style.opacity = '1'; } catch(e) {}
            const splash = document.getElementById('splash-screen');
            if (splash && event.persisted) {
                splash.style.opacity    = '0';
                splash.style.visibility = 'hidden';
            }
            if (event.persisted) initApp();
        });

        function showReportMenu() {
            getar(50);
            const cm = document.getElementById('choiceMenu');
            const mm = document.getElementById('mainMenu');
            cm.style.display = 'none';
            mm.style.display = 'grid';
            mm.style.animation = 'none';
            void mm.offsetWidth;
            mm.style.animation = 'fadeUp 0.6s ease-out forwards';
        }

        function mintaKodeOTP(tipe, namaArea, pinBenar, keyStorage, callbackSukses) {
            getar(50);
            const isGlobal = tipe === 'GLOBAL';
            const pLen     = pinBenar.length;
            let boxesHtml  = '';
            for (let i = 0; i < pLen; i++) {
                boxesHtml += `<input type="text" inputmode="text" class="otp-box" maxlength="1" autocomplete="off">`;
            }
            const htmlOTP = `
                <div style="margin-bottom:10px;font-size:11px;font-weight:700;text-transform:uppercase;">
                    Masukkan ${pLen} Digit Kode ${isGlobal ? 'Pabrik' : 'Area'}:
                </div>
                <div class="otp-wrapper" id="otp-container">${boxesHtml}</div>
            `;
            Swal.fire({
                title:              isGlobal ? 'SISTEM TERKUNCI' : `AREA ${namaArea}`,
                html:               htmlOTP,
                allowOutsideClick:  false,
                allowEscapeKey:     false,
                showCancelButton:   !isGlobal,
                confirmButtonColor: '#0f172a',
                cancelButtonColor:  '#64748b',
                confirmButtonText:  'VERIFIKASI',
                cancelButtonText:   'BATAL',
                didOpen: () => {
                    const boxes = document.querySelectorAll('.otp-box');
                    boxes[0].focus();
                    boxes.forEach((box, i) => {
                        box.addEventListener('input', function() {
                            this.value = this.value.toUpperCase();
                            if (this.value && i < boxes.length - 1) {
                                boxes[i + 1].focus();
                                getar(20);
                            } else if (this.value && i === boxes.length - 1) {
                                getar(20);
                                let inputSandi = '';
                                boxes.forEach(b => inputSandi += b.value);
                                if (inputSandi.length === pLen) Swal.clickConfirm();
                            }
                        });
                        box.addEventListener('keydown', function(e) {
                            if (e.key === 'Backspace' && !this.value && i > 0) {
                                boxes[i - 1].focus();
                                getar(20);
                            }
                        });
                    });
                },
                preConfirm: () => {
                    const boxes = document.querySelectorAll('.otp-box');
                    let inputSandi = '';
                    boxes.forEach(b => inputSandi += b.value);
                    return inputSandi;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    if (result.value === pinBenar) {
                        getar([50, 50, 50]);
                        localStorage.setItem(keyStorage, pinBenar);
                        const Toast = Swal.mixin({
                            toast: true, position: 'top', showConfirmButton: false,
                            timer: 2000, timerProgressBar: true
                        });
                        Toast.fire({
                            icon:  'success',
                            title: isGlobal ? 'Akses Terverifikasi' : `Akses ${namaArea} Terbuka`
                        }).then(() => callbackSukses());
                    } else {
                        getar([100, 50, 100]);
                        Swal.fire('Ditolak', 'Kode Akses Salah atau Kadaluarsa!', 'error').then(() => {
                            mintaKodeOTP(tipe, namaArea, pinBenar, keyStorage, callbackSukses);
                        });
                    }
                }
            });
        }

        function navTo(urlTujuan, idAkses) {
            getar(50);
            const area = DATA_AKSES[idAkses];
            if (!area) return;
            const tiketDepartemen = localStorage.getItem(area.kunci);
            const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
            const noCacheUrl      = area.url + "?v=" + new Date().getTime();
            
            // DEMO MODE: password gate dinonaktifkan agar portofolio bisa diakses bebas
            document.body.style.opacity = '0';
            setTimeout(() => { window.location.href = noCacheUrl; }, 400);
        }

        function navToSample(urlTujuan, idAkses) {
            getar(50);
            const area = DATA_AKSES[idAkses];
            if (!area) return;
            const tiketDepartemen = localStorage.getItem(area.kunci);
            const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
            
            // DEMO MODE: password gate dinonaktifkan agar portofolio bisa diakses bebas
            document.body.style.opacity = '0';
            setTimeout(() => { window.location.href = urlTujuan; }, 400);
        }

        function openMenuSheet() {
            getar(20);
            const sheet = document.getElementById('menuSheet');
            sheet.style.display = 'flex';
            setTimeout(() => sheet.classList.add('show'), 10);
        }

        function closeMenuSheet(e) {
            if (e && e.target !== e.currentTarget) return;
            const sheet = document.getElementById('menuSheet');
            sheet.classList.remove('show');
            setTimeout(() => sheet.style.display = 'none', 300);
        }

        function openProfileSheet() {
            getar(20);
            const sheet = document.getElementById('profileSheet');
            sheet.style.display = 'flex';
            setTimeout(() => sheet.classList.add('show'), 10);
        }

        function closeProfileSheet(e) {
            if (e && e.target !== e.currentTarget) return;
            const sheet = document.getElementById('profileSheet');
            sheet.classList.remove('show');
            setTimeout(() => sheet.style.display = 'none', 300);
        }

        function toggleGuestMode() {
            closeProfileSheet();
            setTimeout(() => {
                if (localStorage.getItem('qc_guest_logged_in') === 'true') {
                    Swal.fire({
                        title: 'MODE GUEST AKTIF',
                        text: 'Apakah Anda ingin keluar dari Mode Guest?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#d97706',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'LOGOUT',
                        cancelButtonText: 'BATAL'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            localStorage.removeItem('qc_guest_logged_in');
                            Swal.fire('Logout Berhasil', 'Mode Guest dinonaktifkan.', 'success').then(() => location.reload());
                        }
                    });
                } else {
                    Swal.fire({
                        title: 'LOGIN GUEST',
                        input: 'password',
                        inputPlaceholder: 'Masukkan Password Guest',
                        inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
                        showCancelButton: true,
                        confirmButtonColor: '#0f172a',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'MASUK',
                        cancelButtonText: 'BATAL'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            if (true) {
                                localStorage.setItem('qc_guest_logged_in', 'true');
                                Swal.fire('Akses Diberikan', 'Mode Guest aktif.', 'success').then(() => location.reload());
                            } else {
                                getar([100, 50, 100]);
                                Swal.fire('Akses Ditolak', 'Password salah.', 'error');
                            }
                        }
                    });
                }
            }, 300);
        }

        function toggleSPVMode() {
            closeMenuSheet();
            setTimeout(() => {
                if (localStorage.getItem('qc_spv_logged_in') === 'true') {
                    Swal.fire({
                        title: 'MODE SPV AKTIF',
                        text: 'Apakah Anda ingin keluar dari Mode SPV?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#d97706',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'LOGOUT',
                        cancelButtonText: 'BATAL'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            localStorage.removeItem('qc_spv_logged_in');
                            Swal.fire('Logout Berhasil', 'Mode SPV dinonaktifkan.', 'success').then(() => location.reload());
                        }
                    });
                } else {
                    Swal.fire({
                        title: 'LOGIN SPV',
                        input: 'password',
                        inputPlaceholder: 'Masukkan Password SPV',
                        inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
                        showCancelButton: true,
                        confirmButtonColor: '#0f172a',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'MASUK',
                        cancelButtonText: 'BATAL'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            if (true) {
                                localStorage.setItem('qc_spv_logged_in', 'true');
                                Swal.fire('Akses Diberikan', 'Semua fitur telah terbuka.', 'success').then(() => location.reload());
                            } else {
                                getar([100, 50, 100]);
                                Swal.fire('Akses Ditolak', 'Password salah.', 'error');
                            }
                        }
                    });
                }
            }, 300);
        }

        function goToOtherDashboard(url) {
            Swal.fire({
                title: 'AKSES DASHBOARD',
                input: 'password',
                inputPlaceholder: 'Password SPV',
                inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
                showCancelButton: true,
                confirmButtonColor: '#0f172a',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'MASUK',
                cancelButtonText: 'BATAL'
            }).then((result) => {
                if (result.isConfirmed) {
                    if (true) {
                        document.body.style.opacity = '0';
                        setTimeout(() => { window.location.href = url + '?v=' + new Date().getTime(); }, 400);
                    } else {
                        getar([100, 50, 100]);
                        Swal.fire('Akses Ditolak', 'Password salah atau tidak valid.', 'error');
                    }
                }
            });
        }

        function showSPVDashboards(isGuest) {
            const produksiClick = isGuest
                ? "document.body.style.opacity='0';setTimeout(()=>{window.location.href='modules/spv-dashboard.html?guest=1&v='+new Date().getTime();},400);"
                : "document.body.style.opacity='0';setTimeout(()=>{window.location.href='modules/spv-dashboard.html?v='+new Date().getTime();},400);";
            const finalClick = isGuest ? "goToOtherDashboard('finaldash.html')" : "document.body.style.opacity='0';setTimeout(()=>{window.location.href='finaldash.html?v='+new Date().getTime();},400);";
            const kpiClick = isGuest ? "goToOtherDashboard('modules/kpi-inspector.html')" : "document.body.style.opacity='0';setTimeout(()=>{window.location.href='modules/kpi-inspector.html?v='+new Date().getTime();},400);";

            Swal.fire({
                title: 'PILIH DASHBOARD',
                html: `
                    <div style="display:flex;flex-direction:column;gap:10px;margin-top:15px;">
                        <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                            onclick="${produksiClick}">
                            DASHBOARD PRODUKSI
                        </button>
                        <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                            onclick="${finalClick}">
                            DASHBOARD FINAL
                        </button>
                        <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                            onclick="${kpiClick}">
                            DASHBOARD KPI
                        </button>
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'BATAL',
                cancelButtonColor: '#64748b'
            });
        }

        function navToSPV() {
            closeMenuSheet();
            setTimeout(() => {
                const isSpv = localStorage.getItem('qc_spv_logged_in') === 'true';
                const isGuest = localStorage.getItem('qc_guest_logged_in') === 'true';
                if (isSpv) {
                    showSPVDashboards(false);
                } else if (isGuest) {
                    showSPVDashboards(true);
                } else {
                    Swal.fire({
                        title: 'AKSES MONITORING',
                        input: 'password',
                        inputPlaceholder: 'Password SPV',
                        inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
                        showCancelButton: true,
                        confirmButtonColor: '#0f172a',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'MASUK',
                        cancelButtonText: 'BATAL'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            if (true) {
                                showSPVDashboards(false);
                            } else {
                                getar([100, 50, 100]);
                                Swal.fire('Akses Ditolak', 'Password salah atau tidak valid.', 'error');
                            }
                        }
                    });
                }
            }, 300);
        }

        function showTrackerMenu() {
            closeMenuSheet();
            setTimeout(() => {
                Swal.fire({
                    title: 'AREA TRACKER',
                    html: `
                        <div style="font-size:11px;font-weight:700;color:var(--text-sub);margin-bottom:15px;text-transform:uppercase;">Pantau input data aktual</div>
                        <div style="display:flex;flex-direction:column;gap:10px;">
                            <button style="background:var(--accent-primary);color:#ffffff;border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="window.location.href='tracker.html?dept=dataline'">DATA LINE</button>
                            <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="window.location.href='tracker.html?dept=sewing'">SEWING</button>
                            <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="window.location.href='tracker.html?dept=finishing'">FINISHING</button>
                            <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="window.location.href='tracker.html?dept=washing'">WASHING</button>
                            <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="window.location.href='tracker.html?dept=final'">FINAL</button>
                        </div>
                    `,
                    showConfirmButton: false,
                    showCancelButton: true,
                    cancelButtonText: 'TUTUP',
                    cancelButtonColor: '#64748b'
                });
            }, 300);
        }

        function showMiniPopup() {
            Swal.fire({
                title: 'CATALYST',
                html: `<div style="font-size:12px;font-weight:600;color:var(--text-sub);line-height:1.5;">
                    <b>C</b>omprehensive <b>A</b>nalysis <b>T</b>racking <b>A</b>ssay <b>L</b>ive <b>Y</b>ield <b>S</b>ystem <b>T</b>ools<br><br>
                    Dibuat oleh <b>Quality Engineering CATALYST Garment</b>.<br><br>
                    <span style="font-size:10px;color:var(--accent-primary);">*Info lebih detail terdapat di menu Info Sistem</span>
                </div>`,
                confirmButtonColor: '#0f172a',
                confirmButtonText:  'TUTUP'
            });
        }

        function showInfoSistem() {
            closeMenuSheet();
            setTimeout(() => {
                Swal.fire({
                    title: 'INFO SISTEM',
                    html: `
                        <div style="display:flex;flex-direction:column;gap:10px;margin-top:15px;">
                            <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="showTentangAplikasi()">TENTANG APLIKASI</button>
                            <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="showSOP()">PANDUAN PENGGUNAAN</button>
                            <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="showChangelog()">UPDATE LOG (V1.2)</button>
                            <button style="background:var(--text-main);color:var(--bg-main);border:none;height:45px;border-radius:4px;font-weight:800;cursor:pointer;font-size:12px;letter-spacing:1px;"
                                onclick="showFeedback()">KOTAK SARAN</button>
                        </div>
                    `,
                    showConfirmButton: false,
                    showCancelButton: true,
                    cancelButtonText: 'TUTUP',
                    cancelButtonColor: '#64748b'
                });
            }, 300);
        }

        function showTentangAplikasi() {
            Swal.fire({
                title: 'TENTANG CATALYST',
                html: `
                    <div style="text-align:left;font-size:12px;font-weight:600;line-height:1.6;color:var(--text-sub);">
                        <b style="color:var(--text-main);font-size:14px;">CATALYST</b><br>
                        <i style="color:var(--text-main);">Comprehensive Analysis Tracking Assay Live Yield System Tools</i><br><br>
                        <b style="color:var(--text-main);">English:</b><br>
                        A comprehensive system for tracking and analyzing live yield data to ensure maximum efficiency and quality.<br><br>
                        <b style="color:var(--text-main);">Indonesia:</b><br>
                        Sistem analitik komprehensif untuk melacak dan memantau data hasil produksi secara langsung guna memastikan efisiensi dan kualitas maksimal.<br><br>
                        <i style="color:var(--text-main);">Developed by Quality Engineering CATALYST Garment</i>
                    </div>
                `,
                confirmButtonText:  'KEMBALI',
                confirmButtonColor: '#0f172a'
            }).then(() => showInfoSistem());
        }

        function showFeedback() {
            Swal.fire({
                title: 'SARAN & BUG',
                html: `
                    <div style="font-size:11px;font-weight:600;margin-bottom:15px;color:var(--text-sub);">Laporkan kendala/ide fitur ke tim IT/QA:</div>
                    <input type="text" id="fb_nama" class="swal2-input" placeholder="Nama Anda (Boleh kosong)" style="margin-bottom:10px;">
                    <textarea id="fb_pesan" class="swal2-textarea" placeholder="Detail pesan/kendala Anda..." style="height:100px;margin-top:0;"></textarea>
                `,
                showCancelButton:    true,
                confirmButtonText:   'KIRIM',
                cancelButtonText:    'BATAL',
                confirmButtonColor:  '#0f172a',
                showLoaderOnConfirm: true,
                preConfirm: () => {
                    const pesan = document.getElementById('fb_pesan').value.trim();
                    if (!pesan) {
                        Swal.showValidationMessage('Pesan tidak boleh kosong!');
                        return false;
                    }
                    const payload = {
                        action: "submit_feedback",
                        nama:   document.getElementById('fb_nama').value.trim() || 'Anonim',
                        pesan:  pesan
                    };
                    return fetch(SCRIPT_URL_GLOBAL, {
                        method:  'POST',
                        body:    JSON.stringify(payload),
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                    }).then(r => r.json()).then(d => {
                        if (d.result !== "success") throw new Error(d.error);
                        return true;
                    }).catch(() => {
                        Swal.showValidationMessage('Gagal terhubung ke server!');
                    });
                }
            }).then((res) => {
                if (res.isConfirmed) {
                    Swal.fire('Terkirim!', 'Terima kasih atas masukannya.', 'success');
                } else {
                    showInfoSistem();
                }
            });
        }

        function showSOP() {
            Swal.fire({
                title: 'PANDUAN SISTEM',
                html: `
                    <div style="text-align:left;font-size:12px;font-weight:600;line-height:1.6;color:var(--text-sub);max-height:60vh;overflow-y:auto;">
                        <b style="color:var(--text-main)">1. SINKRONISASI OFFLINE</b><br>
                        Sistem bisa jalan tanpa internet. Data disimpan di HP. Tekan tombol SINKRON jika internet kembali.<br><br>
                        <b style="color:var(--text-main)">2. TARGET HARIAN</b><br>
                        Isi data hanya pada tanggal yang ditetapkan SPV. Jika berbeda, ditolak server.<br><br>
                        <b style="color:var(--text-main)">3. INPUT DATA DEFECT</b><br>
                        Jika tidak ada pilihan 'Jenis Defect', pilih 'TIDAK ADA SUB-JENIS' lalu Tambah.<br><br>
                        <b style="color:var(--text-main)">4. KAMUS QC</b><br>
                        Dapat diakses di menu utama atau di dalam section masing-masing untuk panduan penanganan defect.<br><br>
                        <b style="color:var(--text-main)">5. ERROR LAYAR</b><br>
                        Tarik layar ke bawah (Pull to Refresh) atau Reset Cache jika blank.
                    </div>
                `,
                confirmButtonText:  'KEMBALI',
                confirmButtonColor: '#0f172a'
            }).then(() => showInfoSistem());
        }

        function showChangelog() {
            Swal.fire({
                title: 'UPDATE LOG (V1.2)',
                html: `
                    <div style="text-align:left;font-size:11px;font-weight:600;line-height:1.6;color:var(--text-sub);border:1px solid var(--border-line);padding:15px;border-radius:var(--radius-box);background:var(--swal-input-bg);">
                        <b style="color:var(--text-main)">VERSI 1.2 — INTEGRASI KAMUS QC</b><br>
                        - Penambahan fitur Kamus QC Utama pada halaman depan sebagai referensi terpusat.<br>
                        - Penambahan fitur Kamus QC Sectional yang dapat diakses langsung pada menu tiap departemen.<br>
                        - Optimalisasi pencarian, visualisasi area defect, dan filter kategori secara akurat.<br><br>
                        <b style="color:var(--text-main)">VERSI 1.1</b><br>
                        - Penambahan fitur Minigames (QC RUNNER), re-layout menu.<br><br>
                        <b style="color:var(--text-main)">VERSI 1.0</b><br>
                        - Mode Offline, Auto-Save, Chart Donut harian, SPV & Ekspor Excel.
                    </div>
                `,
                confirmButtonText:  'KEMBALI',
                confirmButtonColor: '#64748b'
            }).then(() => showInfoSistem());
        }

        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('btnInstall').style.display = 'flex';
        });

        function installApp() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(() => {
                    deferredPrompt = null;
                    document.getElementById('btnInstall').style.display = 'none';
                    closeMenuSheet();
                });
            }
        }

        const fabKamus = document.getElementById('fabKamus');
        let fabDragging = false;
        let fabStartX, fabStartY, fabInitialX, fabInitialY;

        function fabDragStart(e) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            fabStartX    = clientX;
            fabStartY    = clientY;
            const rect   = fabKamus.getBoundingClientRect();
            fabInitialX  = rect.left;
            fabInitialY  = rect.top;
            fabKamus.style.transition = 'none';
            fabDragging  = false;
        }

        function fabDragMove(e) {
            if (fabStartX === undefined) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - fabStartX;
            const dy = clientY - fabStartY;
            if (!fabDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                fabDragging = true;
            }
            if (fabDragging) {
                e.preventDefault();
                let newX = fabInitialX + dx;
                let newY = fabInitialY + dy;
                const maxX = window.innerWidth  - fabKamus.offsetWidth;
                const maxY = window.innerHeight - fabKamus.offsetHeight;
                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(0, Math.min(newY, maxY));
                fabKamus.style.left   = newX + 'px';
                fabKamus.style.top    = newY + 'px';
                fabKamus.style.right  = 'auto';
                fabKamus.style.bottom = 'auto';
            }
        }

        function fabDragEnd(e) {
            if (fabStartX !== undefined) {
                fabKamus.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                fabStartX = undefined;
            }
        }

        fabKamus.addEventListener('mousedown', fabDragStart);
        document.addEventListener('mousemove', fabDragMove, { passive: false });
        document.addEventListener('mouseup', fabDragEnd);

        fabKamus.addEventListener('touchstart', fabDragStart, { passive: true });
        document.addEventListener('touchmove', fabDragMove, { passive: false });
        document.addEventListener('touchend', fabDragEnd);

        fabKamus.addEventListener('click', function(e) {
            if (fabDragging) {
                e.preventDefault();
                e.stopPropagation();
                fabDragging = false;
                return;
            }
            window.location.href = 'kamus.html';
            addRipple(this, e);
        });

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => { reg.update(); })
                    .catch(() => {});
            });
        }