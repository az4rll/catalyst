const URL_SEWING = "https://script.google.com/macros/s/AKfycby5vsSzTavVN4g1wX-X9bM76ctFzjZY8Uy0IpEzrHrD68Rk2HHLnxkZ_oJCd2KI2Ktz/exec";
        const URL_FINISHING = "https://script.google.com/macros/s/AKfycbyiwr2m82nWXxX2GLwR6euU7CEVRUjRcQvIwYL6ortrTzGZ6A38aeagzwyNgR_jnyA/exec";
        const URL_WASHING = "https://script.google.com/macros/s/AKfycbxuOY8WNXD384d5LgEi6eaxpNGMWh5zAMXQtzeUY5Ef838jG7uAVl2pDePHKfNZQ14S/exec";
        const URL_AI_INSIGHT = "https://script.google.com/macros/s/AKfycbyHOEH2EXZyWhDVw1yrxI--R8kLqFbu2BR5GX1wI1rT_Ph2kPXlHt6tocYC7hv_WuYM/exec";
        const PASSWORD_SPV = "WASHD1";

        // ================= DEMO MODE MOCK BACKEND =================
        // Portofolio CATALYST — semua koneksi ke server asli diputus.
        // Data di bawah ini murni dummy, dibuat otomatis untuk keperluan demo.
        (function () {
            const LINES = ['LINE 1', 'LINE 2', 'LINE 3'];
            const BUYERS = ['BUYER A', 'BUYER B'];
            const JENIS_DEFECT = ['SKIP STITCH', 'BROKEN STITCH', 'NEEDLE MARK', 'STAIN', 'MEASUREMENT', 'PUCKERING'];
            const KATEGORI = ['MINOR', 'MAJOR'];

            function seededRandom(seed) {
                let x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
            }
            function fmtDate(d) {
                return d.toISOString().slice(0, 10);
            }
            function generateArea(area, days) {
                const produksi = [], defects = [];
                const baseRateStart = { SEWING: 0.13, FINISHING: 0.04, WASHING: 0.06 }[area] || 0.08;
                const baseRateEnd = { SEWING: 0.07, FINISHING: 0.01, WASHING: 0.03 }[area] || 0.03;
                let seed = area.length * 17;
                for (let i = days; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const progress = 1 - (i / days);
                    const rate = baseRateStart + (baseRateEnd - baseRateStart) * progress;
                    LINES.forEach((line, li) => {
                        seed++;
                        const qty = Math.round(180 + seededRandom(seed) * 90);
                        const defQty = Math.max(0, Math.round(qty * rate * (0.7 + seededRandom(seed * 2) * 0.6)));
                        const good = qty - defQty;
                        produksi.push({
                            tanggal: fmtDate(d), line, area_source: area,
                            buyer: BUYERS[li % BUYERS.length],
                            qty_prod: qty, qty: qty, qty_tls: qty,
                            good: good, defect: defQty, defect_tls: defQty,
                            inspect: qty, inspect_tls: qty,
                            status: 'ORI'
                        });
                        if (defQty > 0) {
                            const nDefectTypes = 1 + Math.floor(seededRandom(seed * 3) * 2);
                            for (let k = 0; k < nDefectTypes; k++) {
                                seed++;
                                defects.push({
                                    tanggal: fmtDate(d), line, area_source: area,
                                    buyer: BUYERS[li % BUYERS.length],
                                    jenis: JENIS_DEFECT[Math.floor(seededRandom(seed) * JENIS_DEFECT.length)],
                                    kategori: KATEGORI[Math.floor(seededRandom(seed * 5) * KATEGORI.length)],
                                    qty: Math.max(1, Math.round(defQty / nDefectTypes)),
                                    status: 'ORI'
                                });
                            }
                        }
                    });
                }
                return { produksi, defects };
            }

            const MOCK_CACHE = {};
            function mockResponseFor(url) {
                let area = 'SEWING';
                if (url === URL_FINISHING) area = 'FINISHING';
                else if (url === URL_WASHING) area = 'WASHING';
                if (!MOCK_CACHE[area]) MOCK_CACHE[area] = generateArea(area, 45);
                return { result: 'success', produksi: MOCK_CACHE[area].produksi, defects: MOCK_CACHE[area].defects };
            }

            const realFetch = window.fetch;
            window.fetch = function (url, opts) {
                if (typeof url === 'string' && (url === URL_SEWING || url === URL_FINISHING || url === URL_WASHING || url.includes('script.google.com'))) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockResponseFor(url))
                    });
                }
                return realFetch.apply(this, arguments);
            };
        })();
        // ================= END DEMO MODE MOCK BACKEND =================

        let appCache = { fetched: false, start: '9999-99-99', end: '0000-00-00', rawSew: [], rawFin: [], rawWas: [], defSew: [], defFin: [], defWas: [] };
        const fetchConfig = (url, payload) => fetch(url, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } }).then(res => res.json());
        const emptyLineStartPlugin = {
            id: 'emptyLineStartPlugin',
            afterDatasetsDraw(chart) {
                if (!chart.config._showEmptyStart) return;
                const { ctx, chartArea, scales } = chart;
                const xScale = scales.x;
                const yScale = scales.y;
                if (!xScale || !yScale) return;
                const goodDs = chart.data.datasets.find(d => d.label === 'Good');
                const defDs = chart.data.datasets.find(d => d.label === 'Defect');
                if (!goodDs || !defDs) return;
                const isDark = document.body.classList.contains('dark-mode');
                const textColor = isDark ? '#e2e8f0' : '#0f172a';
                ctx.save();
                ctx.font = 'bold 11px Inter, sans-serif';
                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const midY = (chartArea.top + chartArea.bottom) / 2;
                const letters = 'START'.split('');
                const lineHeight = 14;
                goodDs.data.forEach((gVal, idx) => {
                    const dVal = defDs.data[idx];
                    if ((gVal === null || gVal === undefined) && (dVal === null || dVal === undefined)) {
                        const x = xScale.getPixelForValue(idx);
                        const totalHeight = (letters.length - 1) * lineHeight;
                        const startY = midY - totalHeight / 2;
                        letters.forEach((ch, i) => {
                            ctx.fillText(ch, x, startY + i * lineHeight);
                        });
                    }
                });
                ctx.restore();
            }
        };
        Chart.register(ChartDataLabels, emptyLineStartPlugin);
        Chart.defaults.set('plugins.datalabels', { display: false });
        let chartInstances = {};
        let globalData = [];
        let globalDefects = [];
        let prevGlobalData = [];
        window.cachedForecasts = { trend: {}, daily: null };
        window.chartForecastState = { trend: false, daily: false, volume: false, top_def_trend: false };
        function calculateHoltsForecast(data, alpha, beta, daysToPredict) {
            if (!data || data.length < 2) return [];
            let level = data[0];
            let trend = data[1] - data[0];
            for (let i = 1; i < data.length; i++) {
                let lastLevel = level;
                level = alpha * data[i] + (1 - alpha) * (lastLevel + trend);
                trend = beta * (level - lastLevel) + (1 - beta) * trend;
            }
            let forecast = [];
            for (let m = 1; m <= daysToPredict; m++) {
                let predictedValue = level + (m * trend);
                forecast.push(predictedValue > 0 ? parseFloat(predictedValue.toFixed(2)) : 0);
            }
            return forecast;
        }
        function showHoltsInfo() {
            Swal.fire({
                title: "HOLT'S DOUBLE EXPONENTIAL SMOOTHING",
                html: `
                    <div style="text-align:left; font-size:12px; line-height:1.8; color:var(--text-main);">

                        <b style="font-size:13px;">Apa itu Holt's Double Exponential Smoothing (DES)?</b>
                        <p style="margin-top:6px;">Holt's DES adalah metode peramalan deret waktu (<i>time series forecasting</i>) yang dikembangkan oleh Charles C. Holt pada tahun 1957. Metode ini merupakan pengembangan dari <i>Single Exponential Smoothing</i> (SES), dirancang khusus untuk menangani data yang memiliki <b>kecenderungan tren</b> — baik tren naik maupun turun — secara konsisten dari waktu ke waktu.</p>

                        <p>Disebut "Double" karena melakukan pemulusan (<i>smoothing</i>) pada dua komponen sekaligus: <b>Level</b> (posisi baseline data saat ini) dan <b>Trend</b> (arah & kecepatan perubahan data). Kombinasi keduanya menghasilkan proyeksi yang jauh lebih akurat dibanding hanya memuluskan nilai tunggal.</p>

                        <hr style="border:none; border-top:1px solid var(--border-line); margin: 12px 0;">

                        <b style="font-size:13px;">Mengapa Digunakan di Dashboard Ini?</b>
                        <p style="margin-top:6px;">Data produksi garmen bersifat dinamis — defect rate setiap line tidak bergerak acak, melainkan memiliki pola kecenderungan yang dapat dideteksi. Contoh: jika Line 5 menunjukkan tren defect rate naik selama 4 hari berturut-turut, sangat mungkin tren itu berlanjut pada hari ke-5. Holt's DES menangkap pola ini dan memproyeksikannya ke depan, sehingga SPV memiliki <b>early warning</b> sebelum masalah benar-benar memuncak.</p>

                        <p>Metode ini dipilih karena data QC harian <b>tidak memiliki pola musiman mingguan yang kuat</b> (tidak seperti data penjualan ritel yang ramai di akhir pekan), sehingga metode musiman seperti Holt-Winters tidak diperlukan. Holt's DES adalah pilihan paling tepat untuk data yang <b>hanya bergerak dengan tren linear</b>.</p>

                        <hr style="border:none; border-top:1px solid var(--border-line); margin: 12px 0;">

                        <b style="font-size:13px;">Mekanisme Perhitungan (Step-by-Step)</b>

                        <p style="margin-top:6px;"><b>Inisialisasi:</b><br>
                        L<sub>1</sub> = Y<sub>1</sub> &nbsp;|&nbsp; T<sub>1</sub> = Y<sub>2</sub> − Y<sub>1</sub><br>
                        Level awal diset ke data pertama, tren awal diset ke selisih data pertama dan kedua.</p>

                        <p><b>1. Persamaan Level (L<sub>t</sub>):</b><br>
                        <i style="font-family:serif; font-size:13px;">L<sub>t</sub> = α · Y<sub>t</sub> + (1 − α) · (L<sub>t−1</sub> + T<sub>t−1</sub>)</i><br>
                        Mengestimasi posisi "sebenarnya" data saat ini dengan menyeimbangkan antara nilai aktual terbaru (bobot α) dan proyeksi dari periode sebelumnya (bobot 1−α). Nilai <b>α = 0.4</b> dipilih agar model cukup responsif terhadap perubahan mendadak tanpa terlalu reaktif terhadap noise harian.</p>

                        <p><b>2. Persamaan Tren (T<sub>t</sub>):</b><br>
                        <i style="font-family:serif; font-size:13px;">T<sub>t</sub> = β · (L<sub>t</sub> − L<sub>t−1</sub>) + (1 − β) · T<sub>t−1</sub></i><br>
                        Mengestimasi seberapa cepat dan ke arah mana data bergerak, dengan menyeimbangkan antara tren terbaru yang terukur (bobot β) dan tren historis sebelumnya (bobot 1−β). Nilai <b>β = 0.3</b> dipilih agar tren tidak terlalu mudah berubah akibat satu hari anomali.</p>

                        <p><b>3. Persamaan Forecast (F<sub>t+m</sub>):</b><br>
                        <i style="font-family:serif; font-size:13px;">F<sub>t+m</sub> = L<sub>t</sub> + m · T<sub>t</sub></i><br>
                        Proyeksi untuk <i>m</i> hari ke depan dihitung dengan menambahkan <i>m</i> kali tren terakhir ke level terakhir. Semakin jauh horizon prediksi, semakin besar ketidakpastiannya — ini adalah trade-off yang disadari dalam penggunaan metode ini.</p>

                        <hr style="border:none; border-top:1px solid var(--border-line); margin: 12px 0;">

                        <b style="font-size:13px;">Perbandingan dengan Metode Lain</b>

                        <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:11px;">
                            <thead>
                                <tr style="background:var(--bg-main);">
                                    <th style="padding:6px 8px; border:1px solid var(--border-line); text-align:left;">Metode</th>
                                    <th style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">Tangani Tren</th>
                                    <th style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">Tangani Musiman</th>
                                    <th style="padding:6px 8px; border:1px solid var(--border-line); text-align:left;">Kelemahan</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);"><b>Moving Average</b></td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">❌</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">❌</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);">Selalu lag, tidak bisa proyeksi ke depan</td>
                                </tr>
                                <tr style="background:var(--bg-main);">
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);"><b>Single ES (SES)</b></td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">❌</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">❌</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);">Hanya cocok untuk data stasioner (flat)</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);"><b>Holt's DES ✅</b></td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">✅</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">❌</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);">Kurang akurat jika data sangat musiman</td>
                                </tr>
                                <tr style="background:var(--bg-main);">
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);"><b>Holt-Winters</b></td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">✅</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">✅</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);">Butuh data minimal 2 siklus musiman penuh</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);"><b>ARIMA</b></td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">✅</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line); text-align:center;">✅</td>
                                    <td style="padding:6px 8px; border:1px solid var(--border-line);">Kompleks, butuh data banyak & komputasi berat</td>
                                </tr>
                            </tbody>
                        </table>

                        <hr style="border:none; border-top:1px solid var(--border-line); margin: 12px 0;">

                        <b style="font-size:13px;">Keunggulan Holt's DES untuk Konteks Ini</b>
                        <ul style="margin-top:6px; padding-left:16px; display:flex; flex-direction:column; gap:4px;">
                            <li><b>Ringan & real-time</b> — Dapat dihitung di browser tanpa server khusus, cocok untuk dashboard berbasis JavaScript.</li>
                            <li><b>Responsif terhadap data terbaru</b> — Berbeda dengan Moving Average yang memberi bobot sama pada semua data, DES memberikan bobot lebih besar pada data terbaru.</li>
                            <li><b>Mendeteksi momentum</b> — Mampu membedakan antara defect rate yang naik karena tren struktural vs. hanya lonjakan sesaat.</li>
                            <li><b>Tidak butuh data musiman</b> — Data QC garmen harian tidak memiliki siklus musiman yang konsisten, sehingga Holt's DES sudah lebih dari cukup.</li>
                            <li><b>Interpretasi intuitif</b> — Hasil prediksi mudah dijelaskan ke tim produksi: "Berdasarkan tren 7 hari terakhir, defect rate Line 5 diprediksi mencapai X% dalam 3 hari ke depan."</li>
                        </ul>

                        <hr style="border:none; border-top:1px solid var(--border-line); margin: 12px 0;">

                        <p style="font-size:11px; color:var(--text-sub); font-style:italic;">⚠️ Catatan: Prediksi Holt's DES bersifat indikatif, bukan absolut. Akurasi meningkat seiring bertambahnya data historis. Gunakan sebagai alat deteksi dini, bukan keputusan akhir.</p>

                    </div>
                `,
                width: 680,
                confirmButtonText: 'TUTUP',
                confirmButtonColor: 'var(--accent-primary)',
                customClass: { popup: document.body.classList.contains('dark-mode') ? 'swal-dark' : '' }
            });
        }
        function toggleForecastDetail(chartKey) {
            window.chartForecastState[chartKey] = !window.chartForecastState[chartKey];
            if (chartKey === 'trend') renderTrendChart();
            if (chartKey === 'daily') renderDailyLineChart();
            if (chartKey === 'volume') renderVolumeChart();
            if (chartKey === 'top_def_trend') renderTopDefectTrendChart();
            showInsight(chartKey, true);
        }
        
        window.aiCache = {};

        async function showInsight(type, isRefresh = false) {
            let wrapper = document.getElementById('insight_' + type + '_wrapper');
            let inner = document.getElementById('insight_' + type + '_inner');
            if (!wrapper || !inner) return;

            if (!isRefresh && wrapper.classList.contains('open')) {
                wrapper.classList.remove('open');
                return;
            }

            let payload = buildInsightPayload(type);
            if (!payload) return;

            let cacheKey = type + "_COMBO_" + JSON.stringify(payload.data);
            const isFcstActive = window.chartForecastState && window.chartForecastState[type] === true;

            if (window.aiCache && window.aiCache[cacheKey]) {
                let cachedData = window.aiCache[cacheKey];
                let contentToShow = isFcstActive ? cachedData.fcst : cachedData.norm;
                inner.innerHTML = renderInsightUI(contentToShow, type);
                if (!isRefresh) wrapper.classList.add('open');
                return;
            }

            inner.innerHTML = `
                <div class="ai-loader-container">
                    <div class="ai-loader-spinner"></div>
                    <div class="ai-loader-text">AI QC Dress 1 Sedang Menganalisis Data...</div>
                </div>
            `;

            if (!isRefresh) wrapper.classList.add('open');

            try {
                const response = await fetch(URL_AI_INSIGHT, {
                    method: 'POST',
                    body: JSON.stringify({ action: "ai_insight", data: payload.data, prompt: payload.prompt }),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const json = await response.json();
                const aiText = json.result || "AI tidak memberikan respons.";

                let normText = "";
                let fcstText = "";

                if (aiText.includes('|||SPLIT_PREDIKTIF|||')) {
                    let parts = aiText.split('|||SPLIT_PREDIKTIF|||');
                    normText = parts[0].replace('|||SPLIT_AKTUAL|||', '').trim();
                    fcstText = parts[1].trim();
                }
                else if (aiText.toUpperCase().includes('DATA PREDIKTIF')) {
                    let parts = aiText.split(/DATA PREDIKTIF/i);
                    normText = parts[0].replace('|||SPLIT_AKTUAL|||', '').trim();
                    fcstText = "<h3>DATA PREDIKTIF" + parts[1].trim();
                }
                else {
                    normText = aiText;
                    fcstText = aiText;
                }

                if (!window.aiCache) window.aiCache = {};
                let cachedObj = { norm: normText, fcst: fcstText };
                window.aiCache[cacheKey] = cachedObj;

                let contentToShow = isFcstActive ? cachedObj.fcst : cachedObj.norm;
                inner.innerHTML = renderInsightUI(contentToShow, type);

            } catch (e) {
                inner.innerHTML = `<div style="text-align:center; padding:10px; font-weight:bold; color:var(--danger);">Error: ${e.message}</div>`;
            }
        }

        function buildInsightPayload(type) {
            const startDate = document.getElementById('f_start').value;
            const endDate = document.getElementById('f_end').value;
            const activeAreas = getMultiValues('ms_f_area').includes('ALL') ? ['SEWING', 'FINISHING', 'WASHING'] : getMultiValues('ms_f_area');

            const templateCombo = (c) => `PENTING: Output Anda WAJIB menggunakan pemisah unik "|||SPLIT_AKTUAL|||" dan "|||SPLIT_PREDIKTIF|||". Jangan jadikan teks pemisah ini sebagai Heading/H3. GUNAKAN ANGKA PERSIS seperti di data, jangan membulatkan atau menghitung ulang sendiri. Selalu gunakan istilah "defect", JANGAN gunakan kata "cacat" agar sesuai bahasa korporat.

                |||SPLIT_AKTUAL|||
                Berikan laporan AKTUAL untuk periode ${startDate} s/d ${endDate}. Analisis data dengan detail angka dan berikan 3 tindakan korektif.

                |||SPLIT_PREDIKTIF|||
                Berikan laporan PREDIKTIF berdasarkan angka proyeksi Holt's. Baca arah prediksi sesuai data harfiah (jika prediksi turun, bahas mengapa itu membaik). Berikan 3 tindakan preventif.

                DATA UNTUK DIANALISIS:
                ${c}`;

            const templateNorm = (c) => `PENTING: Output Anda WAJIB menggunakan pemisah unik "|||SPLIT_AKTUAL|||" dan "|||SPLIT_PREDIKTIF|||". Selalu gunakan istilah "defect", JANGAN gunakan kata "cacat" agar sesuai bahasa korporat.

                |||SPLIT_AKTUAL|||
                Berikan laporan AKTUAL untuk periode ${startDate} s/d ${endDate}. Analisis data dan berikan 3 tindakan korektif.

                |||SPLIT_PREDIKTIF|||
                Analisis prediktif Holt's tidak tersedia untuk mode grafik ini.

                DATA UNTUK DIANALISIS:
                ${c}`;

            if (type === 'trend' || type === 'volume') {
                if (!window.globalTrendData || window.globalTrendData.datesRaw.length < 3) return null;
                const datesRaw = window.globalTrendData.datesRaw;
                const trendMap = window.globalTrendData.trendMap;
                const diffDays = Math.max(3, window.globalTrendData.diffDays || datesRaw.length);
                let comboInfo = {};

                activeAreas.forEach(area => {
                    let seriesData = datesRaw.map(d => {
                        let i = trendMap[d][area].i;
                        let def = trendMap[d][area].d;
                        let rate = i > 0 ? +((def / i) * 100).toFixed(2) : 0;
                        return { tanggal: d, inspect: i, defect: def, rate: rate };
                    });

                    let ratesOnly = seriesData.map(x => x.rate);
                    let fcstArr = calculateHoltsForecast(ratesOnly, 0.4, 0.3, diffDays).map(v => parseFloat(Number(v).toFixed(2)));

                    let arah = "STABIL";
                    if (fcstArr.length > 1) {
                        arah = fcstArr[fcstArr.length - 1] > fcstArr[0]
                            ? 'NAIK (Defect Bertambah, Memburuk)'
                            : 'TURUN (Defect Berkurang, Membaik)';
                    }
                    comboInfo[area] = { data_aktual: seriesData, prediksi_holts_hari_depan: fcstArr, kesimpulan_prediksi_holts: arah };
                });
                return { data: comboInfo, prompt: templateCombo(JSON.stringify(comboInfo)) };
            }

            if (type === 'top_def_trend') {
                const tipeData = document.getElementById('f_tipe').value;
                let dailyData = {};

                globalData.forEach(r => {
                    const p = parseRowData(r, tipeData);
                    if (!dailyData[r.tanggal]) {
                        dailyData[r.tanggal] = { SEWING: { i: 0, d: 0 }, FINISHING: { i: 0, d: 0 }, WASHING: { i: 0, d: 0 } };
                    }
                    if (dailyData[r.tanggal][r.area_source]) {
                        dailyData[r.tanggal][r.area_source].i += p.insp;
                    }
                });

                let areaDefectDetails = { SEWING: {}, FINISHING: {}, WASHING: {} };

                globalDefects.forEach(r => {
                    if (!dailyData[r.tanggal]) return;
                    let area = r.area_source;
                    if (!dailyData[r.tanggal][area]) return;

                    let kat = (r.kategori || "").toString().toUpperCase().trim();
                    let qty = 0;

                    if (area === 'SEWING') {
                        let isSewingDefect = (kat === 'SEWING' || kat === 'SEW' || kat === '');
                        if (!isSewingDefect) return;
                        qty = tipeData === 'TLS' ? (parseInt(r.qty_tls) || 0) : (parseInt(r.qty_100) || 0);
                    } else if (area === 'FINISHING') {
                        if (kat !== 'FINISHING' && kat !== 'FIN') return;
                        qty = parseInt(r.qty) || 0;
                    } else if (area === 'WASHING') {
                        if (kat !== 'WASHING' && kat !== 'WAS') return;
                        qty = parseInt(r.qty) || 0;
                    }

                    dailyData[r.tanggal][area].d += qty;

                    if (qty > 0) {
                        const partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                        const typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";
                        const defectName = partName ? `${partName} - ${typeName}` : typeName;

                        if (!areaDefectDetails[area][defectName]) areaDefectDetails[area][defectName] = 0;
                        areaDefectDetails[area][defectName] += qty;
                    }
                });

                let datesRaw = Object.keys(dailyData).sort();
                if (datesRaw.length < 3) return null;
                let diffDays = window.globalTrendData ? (window.globalTrendData.diffDays || Math.max(3, datesRaw.length)) : Math.max(3, datesRaw.length);
                let comboInfo = {};

                activeAreas.forEach(area => {
                    let seriesData = datesRaw.map(d => {
                        let i = dailyData[d][area].i;
                        let def = dailyData[d][area].d;
                        let rate = i > 0 ? +((def / i) * 100).toFixed(2) : 0;
                        return { tanggal: d, inspect: i, defect: def, rate: rate };
                    });

                    let ratesOnly = seriesData.map(x => x.rate);
                    let fcstArr = calculateHoltsForecast(ratesOnly, 0.4, 0.3, diffDays).map(v => parseFloat(Number(v).toFixed(2)));

                    let arah = "STABIL";
                    if (fcstArr.length > 1) {
                        arah = fcstArr[fcstArr.length - 1] > fcstArr[0]
                            ? 'NAIK (Defect Bertambah, Memburuk)'
                            : 'TURUN (Defect Berkurang, Membaik)';
                    }

                    let defMap = areaDefectDetails[area];
                    let topDefects = Object.keys(defMap).map(k => ({ defect: k, qty: defMap[k] })).sort((a, b) => b.qty - a.qty).slice(0, 5);

                    comboInfo[area] = {
                        data_aktual: seriesData,
                        top_5_defect_detail: topDefects,
                        prediksi_holts_hari_depan: fcstArr,
                        kesimpulan_prediksi_holts: arah
                    };
                });
                return { data: comboInfo, prompt: templateCombo(JSON.stringify(comboInfo)) };
            }

            if (type === 'daily') {
                const selectedLines = getMultiValues('ms_slicer_daily_line');
                const lineLabel = selectedLines.includes('ALL') ? 'ALL LINES' : selectedLines.join(', ');
                if (!chartInstances.dailyLine || !chartInstances.dailyLine._dMap) return null;
                const dMap = chartInstances.dailyLine._dMap;
                const datesRaw = chartInstances.dailyLine._datesRaw || [];
                if (datesRaw.length < 2) return null;

                let dailySeries = datesRaw.map(d => {
                    let i = dMap[d].i;
                    let def = dMap[d].d;
                    let rate = i > 0 ? +((def / i) * 100).toFixed(2) : 0;
                    return { tanggal: d, inspect: i, defect: def, rate: rate };
                });

                const diffDays = Math.max(3, dailySeries.length);
                let ratesOnly = dailySeries.map(x => x.rate);
                let fcstArr = calculateHoltsForecast(ratesOnly, 0.4, 0.3, diffDays).map(v => parseFloat(Number(v).toFixed(2)));

                let arah = "STABIL";
                if (fcstArr.length > 1) {
                    arah = fcstArr[fcstArr.length - 1] > fcstArr[0]
                        ? 'NAIK (Defect Bertambah, Memburuk)'
                        : 'TURUN (Defect Berkurang, Membaik)';
                }
                let finalData = { line: lineLabel, data_harian_aktual: dailySeries, prediksi_holts_hari_depan: fcstArr, kesimpulan_prediksi_holts: arah };
                return { data: finalData, prompt: templateCombo(JSON.stringify(finalData)) };
            }

            if (type === 'sew_perf' || type === 'fin_perf') {
                let chart = type === 'sew_perf' ? chartInstances.sewPerf : chartInstances.finPerf;
                if (!chart || !chart.data.labels || chart.data.labels.length === 0) return null;
                let labels = chart.data.labels.map(l => Array.isArray(l) ? l.join(' ') : l);
                let rates = chart.data.datasets[0].data;
                let perfData = labels.map((l, i) => ({ nama: l, defect_rate: rates[i] })).sort((a, b) => b.defect_rate - a.defect_rate);
                return { data: { data_performa: perfData }, prompt: templateNorm(JSON.stringify(perfData)) };
            }

            if (type === 'def_sew' || type === 'def_fin' || type === 'def_was') {
                let areaMap = { def_sew: 'SEWING', def_fin: 'FINISHING', def_was: 'WASHING' };
                let area = areaMap[type];
                let chart = type === 'def_sew' ? chartInstances.sew : (type === 'def_fin' ? chartInstances.fin : chartInstances.was);
                if (!chart || !chart.data.labels || chart.data.labels.length === 0) return null;
                let defData = chart.data.labels.map((l, i) => ({ jenis_defect: Array.isArray(l) ? l.join(' ') : l, qty: chart.data.datasets[0].data[i] }));
                return { data: { area: area, top_defect: defData }, prompt: templateNorm(JSON.stringify(defData)) };
            }

            if (type === 'avg') {
                if (!window.lastAreaMap) return null;
                let areaData = activeAreas.map(area => {
                    let i = window.lastAreaMap[area].i;
                    let d = window.lastAreaMap[area].d;
                    let rate = i > 0 ? +((d / i) * 100).toFixed(2) : 0;
                    return { area: area, inspect: i, defect: d, rate: rate };
                });
                return { data: { ringkasan_per_section: areaData }, prompt: templateNorm(JSON.stringify(areaData)) };
            }

            if (type === 'critical_buyer') {
                const tipeData = document.getElementById('f_tipe').value;
                const bAreaFilters = getMultiValues('ms_slicer_buyer_area');
                const bLineFilters = getMultiValues('ms_slicer_buyer_line');
                let buyerMap = {};
                globalData.forEach(row => {
                    const { insp, def } = parseRowData(row, tipeData);
                    const area = row.area_source;
                    const rawLine = row.line;
                    const bs = `${row.buyer}|||${row.style}`;
                    if ((bAreaFilters.includes("ALL") || bAreaFilters.includes(area)) && (bLineFilters.includes("ALL") || bLineFilters.includes(rawLine))) {
                        if (!buyerMap[bs]) buyerMap[bs] = { i: 0, d: 0 };
                        buyerMap[bs].i += insp; buyerMap[bs].d += def;
                    }
                });
                let critList = Object.entries(buyerMap).filter(x => x[1].i >= 10).map(x => {
                    let parts = x[0].split('|||');
                    return { buyer: parts[0], style: parts[1], inspect: x[1].i, defect: x[1].d, rate: +((x[1].d / x[1].i) * 100).toFixed(2) };
                }).sort((a, b) => b.rate - a.rate).slice(0, 3);
                if (critList.length === 0) return null;
                return { data: { top_3_critical_buyer: critList }, prompt: templateNorm(JSON.stringify(critList)) };
            }

            if (type === 'critical_line') {
                let chart = chartInstances.line;
                if (!chart || !chart.data.labels || chart.data.labels.length === 0) return null;
                let labels = chart.data.labels;
                let rates = chart.data.datasets[0].data;
                let lineData = labels.map((l, i) => ({ line: l, defect_rate: rates[i] })).sort((a, b) => b.defect_rate - a.defect_rate);
                return { data: { critical_line_sewing: lineData }, prompt: templateNorm(JSON.stringify(lineData)) };
            }

            return null;
        }

        function resetDashboard() {
            setPreset('yesterday');
            document.getElementById('f_tipe').value = '100';

            window.chartForecastState = { trend: false, daily: false, volume: false, top_def_trend: false };

            document.querySelectorAll('.insight-wrapper.open').forEach(el => el.classList.remove('open'));
            const areaWrap = document.getElementById('ms_f_area');
            if (areaWrap) {
                const allCb = areaWrap.querySelector('input[value="ALL"]');
                const inputs = areaWrap.querySelectorAll('input[type="checkbox"]:not([value="ALL"])');
                if (allCb) allCb.checked = true;
                inputs.forEach(i => i.checked = true);
                updateMSHead('ms_f_area');
            }
            const allWraps = [
                'wrap_trend', 'wrap_avg_group', 'wrap_vol', 'wrap_sew_perf',
                'wrap_daily_line', 'wrap_fin_perf', 'wrap_def_sew', 'wrap_def_fin',
                'wrap_def_was', 'wrap_top_def_trend', 'wrap_alert_cards', 'wrap_crit_chart', 'wrap_table'
            ];
            allWraps.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('hidden-content');
                    const btn = el.parentElement.querySelector('.btn-toggle');
                    if (btn) btn.innerText = '-';
                }
            });
            applyFilter();
        }
        function toggleKebabMenu() {
            document.getElementById('kebabDropdown').classList.toggle('show');
        }
        document.addEventListener('click', function (e) {
            document.querySelectorAll('.mul-select').forEach(el => {
                if (!el.contains(e.target)) el.classList.remove('open');
            });
            const topBtn = document.getElementById('topBtnGroup');
            const dropdown = document.getElementById('kebabDropdown');
            if (topBtn && dropdown && !topBtn.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        function toLocalDateStr(d) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
        function getWeekBoundsFriToThu(refDate) {
            const d = new Date(refDate);
            const day = d.getDay();
            let sinceLastFri;
            if (day === 5) sinceLastFri = 0;
            else if (day === 6) sinceLastFri = 1;
            else sinceLastFri = day + 2;
            const friday = new Date(d);
            friday.setDate(d.getDate() - sinceLastFri);
            const thursday = new Date(friday);
            thursday.setDate(friday.getDate() + 6);
            return {
                start: toLocalDateStr(friday),
                end: toLocalDateStr(thursday)
            };
        }
        function getPrevWeekBoundsFriToThu(refDate) {
            const d = new Date(refDate);
            const thisFri = new Date(getWeekBoundsFriToThu(d).start);
            const prevFri = new Date(thisFri);
            prevFri.setDate(thisFri.getDate() - 7);
            const prevThu = new Date(prevFri);
            prevThu.setDate(prevFri.getDate() + 6);
            return {
                start: toLocalDateStr(prevFri),
                end: toLocalDateStr(prevThu)
            };
        }
        function setPreset(preset) {
            const today = new Date();
            const todayStr = toLocalDateStr(today);
            let startStr, endStr;
            const getYesterday = () => {
                let y = new Date(today);
                y.setDate(today.getDate() - 1);
                if (y.getDay() === 0) y.setDate(y.getDate() - 1);
                return toLocalDateStr(y);
            };
            switch (preset) {
                case 'today':
                    startStr = todayStr; endStr = todayStr; break;
                case 'yesterday':
                    startStr = getYesterday(); endStr = getYesterday(); break;
                case 'this_week': {
                    const wb = getWeekBoundsFriToThu(today);
                    startStr = wb.start;
                    endStr = todayStr <= wb.end ? todayStr : wb.end;
                    break;
                }
                case 'last_week': {
                    const wb = getPrevWeekBoundsFriToThu(today);
                    startStr = wb.start; endStr = wb.end; break;
                }
                case 'this_month': {
                    const first = new Date(today.getFullYear(), today.getMonth(), 1);
                    startStr = toLocalDateStr(first); endStr = todayStr; break;
                }
                case 'last_month': {
                    const firstOfThis = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfPrev = new Date(firstOfThis); lastOfPrev.setDate(0);
                    const firstOfPrev = new Date(lastOfPrev.getFullYear(), lastOfPrev.getMonth(), 1);
                    startStr = toLocalDateStr(firstOfPrev);
                    endStr = toLocalDateStr(lastOfPrev); break;
                }
                case 'last_7': {
                    const d = new Date(today); d.setDate(today.getDate() - 6);
                    startStr = toLocalDateStr(d); endStr = todayStr; break;
                }
                case 'last_30': {
                    const d = new Date(today); d.setDate(today.getDate() - 29);
                    startStr = toLocalDateStr(d); endStr = todayStr; break;
                }
                default: return;
            }
            document.getElementById('f_start').value = startStr;
            document.getElementById('f_end').value = endStr;
        }
        function setScreenshotPreset(type) {
            setPreset('yesterday');
            const areaWrap = document.getElementById('ms_f_area');
            const areaInputs = areaWrap.querySelectorAll('input[type="checkbox"]');
            let targetArea = type === 'SEW' ? 'SEWING' : (type === 'FIN' ? 'FINISHING' : 'WASHING');
            areaInputs.forEach(i => {
                if (i.value === 'ALL') i.checked = false;
                else i.checked = (i.value === targetArea);
            });
            updateMSHead('ms_f_area');
            window.pendingScreenshotPreset = type;
            applyFilter();
        }
        function applyScreenshotLayout(type) {
            const allWraps = [
                'wrap_trend', 'wrap_avg_group', 'wrap_vol', 'wrap_sew_perf',
                'wrap_daily_line', 'wrap_fin_perf', 'wrap_def_sew', 'wrap_def_fin',
                'wrap_def_was', 'wrap_top_def_trend', 'wrap_alert_cards', 'wrap_crit_chart', 'wrap_table'
            ];
            let visibleWraps = [];
            if (type === 'SEW') {
                visibleWraps = ['wrap_sew_perf', 'wrap_def_sew', 'wrap_alert_cards', 'wrap_crit_chart'];
            } else if (type === 'FIN') {
                visibleWraps = ['wrap_fin_perf', 'wrap_def_sew', 'wrap_def_fin', 'wrap_alert_cards'];
            } else if (type === 'WAS') {
                visibleWraps = ['wrap_fin_perf', 'wrap_def_sew', 'wrap_def_fin', 'wrap_def_was', 'wrap_alert_cards'];
            }
            allWraps.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const btn = el.parentElement.querySelector('.btn-toggle');
                if (visibleWraps.includes(id)) {
                    el.classList.remove('hidden-content');
                    if (btn) btn.innerText = '-';
                } else {
                    el.classList.add('hidden-content');
                    if (btn) btn.innerText = '+';
                }
            });
        }
        function getNavyColor() {
            return document.body.classList.contains('dark-mode') ? '#60a5fa' : '#0f172a';
        }
        function toggleVisibility(wrapId, btn) {
            const el = document.getElementById(wrapId);
            if (el.classList.contains('hidden-content')) {
                el.classList.remove('hidden-content');
                btn.innerText = '-';
            } else {
                el.classList.add('hidden-content');
                btn.innerText = '+';
            }
        }
        function takeScreenshot() {
            document.getElementById('topBtnGroup').style.display = 'none';
            const topBar = document.getElementById('topBarElement');
            const titleGroup = document.getElementById('titleGroupElement');
            const originalTopBarJustify = topBar.style.justifyContent;
            const originalTitleCSS = titleGroup.style.cssText;
            topBar.style.justifyContent = 'center';
            titleGroup.style.textAlign = 'center';
            titleGroup.style.display = 'flex';
            titleGroup.style.flexDirection = 'column';
            titleGroup.style.alignItems = 'center';
            document.querySelectorAll('.glass-card').forEach(card => {
                const isChartHidden = card.querySelector('[id^="wrap_"].hidden-content');
                if (isChartHidden) { card.setAttribute('data-ss-hidden', 'true'); card.style.display = 'none'; }
            });
            const isDarkMode = document.body.classList.contains('dark-mode');
            const bgColor = isDarkMode ? '#0f172a' : '#e2e8f0';
            setTimeout(() => {
                html2canvas(document.body, { backgroundColor: bgColor, scale: 2, logging: false, useCORS: true }).then(canvas => {
                    document.getElementById('topBtnGroup').style.display = 'flex';
                    topBar.style.justifyContent = originalTopBarJustify;
                    titleGroup.style.cssText = originalTitleCSS;
                    document.querySelectorAll('[data-ss-hidden="true"]').forEach(card => { card.style.display = ''; card.removeAttribute('data-ss-hidden'); });
                    let areas = getMultiValues('ms_f_area');
                    let areaName = areas.includes('ALL') ? 'ALL_AREA' : areas.join('_');
                    const tglStart = document.getElementById('f_start').value;
                    const tglEnd = document.getElementById('f_end').value;
                    let periodStr = getSmartDateRange(tglStart, tglEnd).replace(/ /g, '_');
                    let fileName = `QC_DASHBOARD_${areaName}_${periodStr}.png`.toUpperCase();
                    let link = document.createElement('a');
                    link.download = fileName;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'Screenshot Tersimpan!', showConfirmButton: false, timer: 2000, customClass: { popup: isDarkMode ? 'swal-dark' : '' } });
                }).catch(() => {
                    document.getElementById('topBtnGroup').style.display = 'flex';
                    topBar.style.justifyContent = originalTopBarJustify;
                    titleGroup.style.cssText = originalTitleCSS;
                    Swal.fire({ title: 'Gagal', text: 'Terjadi kesalahan saat mengambil screenshot.', confirmButtonColor: 'var(--accent-primary)' });
                });
            }, 150);
        }

        async function exportPDF() {
            Swal.fire({ toast: true, position: 'top', icon: 'info', title: 'Menyiapkan PDF...', showConfirmButton: false, timer: 2500 });

            document.getElementById('topBtnGroup').style.display = 'none';

            const style = document.createElement('style');
            style.id = 'pdf-export-style';

            style.innerHTML = `
                .pdf-export-active .glass-card { 
                    width: 1600px !important; 
                    height: 950px !important; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: flex-start; /* FIX NABRAK: Mulai dari atas, bukan dari tengah */
                    border: 3px solid #000000 !important; /* BORDER HITAM TEGAS */
                    border-radius: 8px !important;
                    margin-bottom: 0 !important; 
                    padding: 30px 40px !important; 
                    background: var(--bg-card) !important;
                }
                .pdf-export-active .chart-container-lg, 
                .pdf-export-active .chart-container-sm, 
                .pdf-export-active .chart-container { 
                    height: 100% !important; 
                    flex-grow: 1; 
                    padding: 0 !important; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                }
                .pdf-export-active .kpi-title { 
                    font-size: 32px !important; 
                    padding: 0 0 20px 0 !important; 
                    border-bottom: 2px solid #cbd5e1 !important; /* Garis pemisah judul dan chart */
                    margin-bottom: 25px !important; /* Jarak aman antara judul dan chart */
                    justify-content: center; 
                    text-align: center; 
                }
                .pdf-export-active .kpi-title-controls { display: none !important; }
                .pdf-export-active .dashboard-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 40px !important; width: 1600px !important; height: 950px !important; }
                .pdf-export-active .dashboard-grid .glass-card { height: 100% !important; width: 100% !important; padding: 40px !important; }
                .pdf-export-active .dashboard-grid .kpi-value { font-size: 100px !important; padding-top: 40px !important; text-align: center; }
                .pdf-export-active .dashboard-grid .kpi-subtext { font-size: 28px !important; padding-bottom: 20px !important; justify-content: center; }
                .pdf-export-active table { font-size: 22px !important; }
                .pdf-export-active th, .pdf-export-active td { padding: 20px 24px !important; }
                .pdf-export-active .alert-card { padding: 40px !important; margin-bottom: 20px !important; border: 3px solid #dc2626 !important; }
                .pdf-export-active .alert-buyer { font-size: 38px !important; }
                .pdf-export-active .alert-style { font-size: 26px !important; }
                .pdf-export-active .alert-rate { font-size: 60px !important; }
                .pdf-export-active .alert-detail { font-size: 24px !important; }

                /* CSS KHUSUS UNTUK HALAMAN GABUNGAN (DEFECT & CRITICAL BUYER) */
                .pdf-special-wrapper { 
                    width: 1600px !important; 
                    height: 950px !important; 
                    display: grid !important; 
                    grid-template-rows: 1fr 1fr !important; 
                    gap: 30px !important; 
                    padding: 30px !important; 
                    box-sizing: border-box;
                    background: transparent !important; 
                }
                .pdf-special-wrapper .glass-card { 
                    width: 100% !important; 
                    height: 100% !important; 
                    padding: 25px !important; 
                }
                .pdf-special-wrapper .crit-buyer-card {
                    grid-column: 1 / -1 !important; 
                }
                .pdf-special-wrapper .kpi-title { font-size: 28px !important; padding-bottom: 15px !important; margin-bottom: 15px !important; }
                
                /* FIX OVERLAP CRITICAL BUYER: Susun alert ke samping (baris) bukan ke bawah */
                .pdf-special-wrapper #wrap_alert_cards {
                    display: flex !important;
                    flex-direction: row !important;
                    gap: 20px !important;
                    justify-content: space-between !important;
                    align-items: stretch !important;
                    height: 100% !important;
                }
                .pdf-special-wrapper .alert-card { 
                    flex: 1; 
                    margin-bottom: 0 !important; 
                    padding: 25px !important; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: space-between;
                }
                .pdf-special-wrapper .alert-buyer { font-size: 32px !important; }
                .pdf-special-wrapper .alert-rate { font-size: 50px !important; }
            `;
            document.head.appendChild(style);
            document.body.classList.add('pdf-export-active');

            
            const defSew = document.getElementById('wrap_def_sew')?.closest('.glass-card');
            const defFin = document.getElementById('wrap_def_fin')?.closest('.glass-card');
            const defWas = document.getElementById('wrap_def_was')?.closest('.glass-card');
            const critBuyer = document.getElementById('wrap_alert_cards')?.closest('.glass-card');

            if (critBuyer) critBuyer.classList.add('crit-buyer-card');

            
            const activeDefectCards = [defSew, defFin, defWas].filter(el => el && !el.querySelector('[id^="wrap_"].hidden-content') && getComputedStyle(el).display !== 'none');

            
            const cols = activeDefectCards.length > 0 ? activeDefectCards.length : 1;

            const specialCards = [...activeDefectCards];
            const isCritBuyerActive = critBuyer && !critBuyer.querySelector('[id^="wrap_"].hidden-content') && getComputedStyle(critBuyer).display !== 'none';
            if (isCritBuyerActive) {
                specialCards.push(critBuyer);
            }

            const placeholders = [];
            const specialWrapper = document.createElement('div');
            specialWrapper.className = 'pdf-special-wrapper';
            
            specialWrapper.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

            if (specialCards.length > 0) {
                specialCards.forEach(card => {
                    const ph = document.createElement('div');
                    ph.style.display = 'none';
                    card.parentNode.insertBefore(ph, card);
                    placeholders.push({ card, ph });
                    specialWrapper.appendChild(card);
                });
                document.body.appendChild(specialWrapper);
            }

            Chart.defaults.font.size = 24;
            Object.values(chartInstances).forEach(c => {
                if (c) {
                    if (c.options.plugins.datalabels && c.options.plugins.datalabels.font) {
                        c.options.plugins.datalabels.font.size = 22;
                    }
                    if (c.options.plugins.legend && c.options.plugins.legend.labels) {
                        c.options.plugins.legend.labels.font = { size: 24 };
                    }
                    if (c.options.scales) {
                        ['x', 'y', 'y1'].forEach(axis => {
                            if (c.options.scales[axis] && c.options.scales[axis].ticks) {
                                c.options.scales[axis].ticks.font = { size: 20, weight: 'bold' };
                            }
                        });
                    }

                    c.data.datasets.forEach(ds => {
                        if (ds.datalabels && ds.datalabels.font) {
                            ds._savedDatalabelsFontSize = ds.datalabels.font.size;
                            ds.datalabels.font.size = 28;
                        }
                        if (ds.type === 'bar' || c.config.type === 'bar') {
                            ds._savedMaxBarThickness = ds.maxBarThickness;
                            ds._savedBarThickness = ds.barThickness;
                            delete ds.maxBarThickness;
                            ds.barThickness = 120;
                        }
                    });

                    
                    if (['sewingDefChart', 'finishingDefChart', 'washingDefChart'].includes(c.canvas.id)) {
                        if (c.options.plugins.datalabels && c.options.plugins.datalabels.font) c.options.plugins.datalabels.font.size = 18;
                        if (c.options.scales.x && c.options.scales.x.ticks) c.options.scales.x.ticks.font.size = 14;
                        if (c.options.scales.y && c.options.scales.y.ticks) c.options.scales.y.ticks.font.size = 14;
                        c.data.datasets.forEach(ds => {
                            if (ds.barThickness) ds.barThickness = 60;
                            if (ds.datalabels && ds.datalabels.font) ds.datalabels.font.size = 18;
                        });
                    }

                    c.resize();
                    c.update('none');
                }
            });

            await new Promise(r => setTimeout(r, 1000));

            try {
                const { jsPDF } = window.jspdf;
                const isDark = document.body.classList.contains('dark-mode');

                const PAGE_W_MM = 297;
                const PAGE_H_MM = 210;
                const MARGIN_MM = 10;
                const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;

                const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PAGE_W_MM, PAGE_H_MM] });

                const blocksToExport = [];
                const allPotentialTargets = Array.from(document.querySelectorAll('.dashboard-grid, body > .glass-card:not(#logHistorySection), .dashboard-grid-triple, .dashboard-grid-large, .pdf-special-wrapper'));

                allPotentialTargets.forEach(el => {
                    if (el.classList.contains('dashboard-grid')) {
                        blocksToExport.push(el);
                    } else if (el.classList.contains('pdf-special-wrapper')) {
                        blocksToExport.push(el);
                    } else if (el.classList.contains('dashboard-grid-triple') || el.classList.contains('dashboard-grid-large')) {
                        const childCards = Array.from(el.querySelectorAll('.glass-card'));
                        childCards.forEach(card => {
                            const isHidden = card.querySelector('[id^="wrap_"].hidden-content');
                            if (!isHidden && getComputedStyle(card).display !== 'none' && card.parentNode === el) {
                                blocksToExport.push(card);
                            }
                        });
                    } else if (el.classList.contains('glass-card') && el.parentNode === document.body) {
                        const isHidden = el.querySelector('[id^="wrap_"].hidden-content');
                        if (!isHidden && getComputedStyle(el).display !== 'none') {
                            blocksToExport.push(el);
                        }
                    }
                });

                const tglStart = document.getElementById('f_start').value;
                const tglEnd = document.getElementById('f_end').value;
                const titleText = document.getElementById('mainTitleText').innerText;
                const subtitleText = document.getElementById('dashboardSubtitle').innerText;

                const drawHeader = () => {
                    pdf.setFillColor(isDark ? 15 : 248, isDark ? 23 : 250, isDark ? 42 : 252);
                    pdf.rect(0, 0, PAGE_W_MM, 28, 'F');

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(24);
                    pdf.setTextColor(isDark ? 248 : 15, isDark ? 250 : 23, isDark ? 252 : 42);
                    const titleWidth = pdf.getStringUnitWidth(titleText) * 24 / pdf.internal.scaleFactor;
                    pdf.text(titleText, (PAGE_W_MM - titleWidth) / 2, 14);

                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'normal');
                    const subtitleWidth = pdf.getStringUnitWidth(subtitleText) * 14 / pdf.internal.scaleFactor;
                    pdf.text(subtitleText, (PAGE_W_MM - subtitleWidth) / 2, 22);

                    pdf.setDrawColor(isDark ? 51 : 203, isDark ? 65 : 213, isDark ? 85 : 225);
                    pdf.line(0, 28, PAGE_W_MM, 28);
                };

                let isFirstBlock = true;

                for (let block of blocksToExport) {
                    await new Promise(r => setTimeout(r, 100));

                    const canvas = await html2canvas(block, {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        scale: 2,
                        logging: false,
                        useCORS: true
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    let finalW = CONTENT_W_MM;
                    let finalH = (canvas.height / canvas.width) * finalW;

                    if (isFirstBlock) {
                        drawHeader();
                    } else {
                        pdf.addPage([PAGE_W_MM, PAGE_H_MM]);
                    }

                    let availH = isFirstBlock ? (PAGE_H_MM - MARGIN_MM - 28) : (PAGE_H_MM - MARGIN_MM * 2);
                    let startY = isFirstBlock ? 30 : MARGIN_MM;

                    if (finalH > availH) {
                        finalH = availH;
                        finalW = (canvas.width / canvas.height) * finalH;
                    }

                    let xPos = MARGIN_MM + (CONTENT_W_MM - finalW) / 2;
                    let yPos = startY + (availH - finalH) / 2;

                    pdf.addImage(imgData, 'JPEG', xPos, yPos, finalW, finalH);
                    isFirstBlock = false;
                }

                
                placeholders.forEach(({ card, ph }) => {
                    if (card.classList.contains('crit-buyer-card')) card.classList.remove('crit-buyer-card');
                    ph.parentNode.insertBefore(card, ph);
                    ph.remove();
                });
                if (specialWrapper.parentNode) specialWrapper.remove();

                document.body.classList.remove('pdf-export-active');
                const styleEl = document.getElementById('pdf-export-style');
                if (styleEl) styleEl.remove();

                
                Chart.defaults.font.size = 13;
                Object.values(chartInstances).forEach(c => {
                    if (c) {
                        if (c.options.plugins.datalabels && c.options.plugins.datalabels.font) c.options.plugins.datalabels.font.size = 10;
                        if (c.options.plugins.legend && c.options.plugins.legend.labels) c.options.plugins.legend.labels.font = { size: 11 };
                        if (c.options.scales) {
                            ['x', 'y', 'y1'].forEach(axis => {
                                if (c.options.scales[axis] && c.options.scales[axis].ticks) {
                                    c.options.scales[axis].ticks.font = { size: 10, weight: 'bold' };
                                }
                            });
                        }

                        c.data.datasets.forEach(ds => {
                            if (ds._savedDatalabelsFontSize !== undefined) {
                                if (ds.datalabels && ds.datalabels.font) ds.datalabels.font.size = ds._savedDatalabelsFontSize;
                                delete ds._savedDatalabelsFontSize;
                            }
                            if (ds._savedMaxBarThickness !== undefined) {
                                ds.maxBarThickness = ds._savedMaxBarThickness;
                                delete ds._savedMaxBarThickness;
                            }
                            if (ds._savedBarThickness !== undefined) {
                                ds.barThickness = ds._savedBarThickness;
                                delete ds._savedBarThickness;
                            } else {
                                delete ds.barThickness;
                            }
                        });

                        c.resize();
                        c.update('none');
                    }
                });

                document.getElementById('topBtnGroup').style.display = 'flex';

                const areas = getMultiValues('ms_f_area');
                const areaName = areas.includes('ALL') ? 'ALL_AREA' : areas.join('_');
                const periodStr = getSmartDateRange(tglStart, tglEnd).replace(/ /g, '_');
                pdf.save(`QC_DASHBOARD_${areaName}_${periodStr}.pdf`.toUpperCase());

                Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'PDF Tersimpan!', showConfirmButton: false, timer: 2500, customClass: { popup: isDark ? 'swal-dark' : '' } });

            } catch (err) {
                if (typeof placeholders !== 'undefined' && placeholders.length > 0) {
                    placeholders.forEach(({ card, ph }) => {
                        if (card.classList.contains('crit-buyer-card')) card.classList.remove('crit-buyer-card');
                        if (ph && ph.parentNode) {
                            ph.parentNode.insertBefore(card, ph);
                            ph.remove();
                        }
                    });
                }
                const wrapNode = document.querySelector('.pdf-special-wrapper');
                if (wrapNode) wrapNode.remove();

                document.body.classList.remove('pdf-export-active');
                const styleEl = document.getElementById('pdf-export-style');
                if (styleEl) styleEl.remove();
                Chart.defaults.font.size = 13;
                Object.values(chartInstances).forEach(c => {
                    if (c) {
                        if (c.options.plugins.datalabels && c.options.plugins.datalabels.font) c.options.plugins.datalabels.font.size = 10;
                        if (c.options.plugins.legend && c.options.plugins.legend.labels) c.options.plugins.legend.labels.font = { size: 11 };

                        c.data.datasets.forEach(ds => {
                            if (ds._savedDatalabelsFontSize !== undefined) {
                                if (ds.datalabels && ds.datalabels.font) ds.datalabels.font.size = ds._savedDatalabelsFontSize;
                                delete ds._savedDatalabelsFontSize;
                            }
                            if (ds._savedMaxBarThickness !== undefined) {
                                ds.maxBarThickness = ds._savedMaxBarThickness;
                                delete ds._savedMaxBarThickness;
                            }
                            if (ds._savedBarThickness !== undefined) {
                                ds.barThickness = ds._savedBarThickness;
                                delete ds._savedBarThickness;
                            } else {
                                delete ds.barThickness;
                            }
                        });

                        c.resize();
                        c.update('none');
                    }
                });

                document.getElementById('topBtnGroup').style.display = 'flex';
                Swal.fire({ title: 'Gagal', text: 'Terjadi kesalahan saat membuat PDF: ' + err.message, confirmButtonColor: 'var(--accent-primary)' });
            }
        }
        function sortDrillTable(th, colIndex) {
            const table = th.closest('table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) return;
            const isAsc = th.classList.contains('sort-asc');
            table.querySelectorAll('th').forEach(header => {
                header.classList.remove('sort-asc', 'sort-desc');
                const svg = header.querySelector('svg');
                if (svg) {
                    svg.style.transform = 'rotate(0deg)';
                    svg.style.opacity = '0.3';
                }
            });
            const dir = isAsc ? -1 : 1;
            if (!isAsc) {
                th.classList.add('sort-asc');
                const svg = th.querySelector('svg');
                if (svg) { svg.style.transform = 'rotate(180deg)'; svg.style.opacity = '1'; }
            } else {
                th.classList.add('sort-desc');
                const svg = th.querySelector('svg');
                if (svg) { svg.style.transform = 'rotate(0deg)'; svg.style.opacity = '1'; }
            }
            rows.sort((a, b) => {
                const aCol = a.children[colIndex].innerText.trim();
                const bCol = b.children[colIndex].innerText.trim();
                const aNum = parseFloat(aCol.replace(/[^0-9.-]+/g, ""));
                const bNum = parseFloat(bCol.replace(/[^0-9.-]+/g, ""));
                if (!isNaN(aNum) && !isNaN(bNum) && aCol.match(/[0-9]/) && bCol.match(/[0-9]/)) {
                    return (aNum - bNum) * dir;
                }
                return aCol.localeCompare(bCol) * dir;
            });
            tbody.append(...rows);
        }
        function openDrillModal(title, bodyHTML) {
            document.getElementById('drillModalTitle').textContent = title;
            document.getElementById('drillModalBody').innerHTML = bodyHTML;
            document.getElementById('drillModalOverlay').classList.add('open');
        }
        function closeDrillModal(e) {
            if (!e || e.target === document.getElementById('drillModalOverlay') || e.type !== 'click' || !e.target.closest('.drill-modal')) {
                document.getElementById('drillModalOverlay').classList.remove('open');
            }
        }
        document.getElementById('drillModalOverlay').addEventListener('click', function (e) {
            if (e.target === this) closeDrillModal();
        });
        function buildDrillTable(rows, columns) {
            let html = '<table class="drill-table"><thead><tr>';
            columns.forEach((c, i) => {
                html += `<th style="cursor:pointer; user-select:none;" onclick="sortDrillTable(this, ${i})"><div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">${c.label}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3; transition:0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg></div></th>`;
            });
            html += '</tr></thead><tbody>';
            rows.forEach(r => {
                html += '<tr>';
                columns.forEach(c => html += `<td>${r[c.key] !== undefined ? r[c.key] : '-'}</td>`);
                html += '</tr>';
            });
            if (rows.length === 0) html += `<tr><td colspan="${columns.length}" style="text-align:center; color: var(--text-sub);">No data available</td></tr>`;
            html += '</tbody></table>';
            return html;
        }
        function drillChartBar(canvasId, labels, dataArr, label, color, onClickCb) {
            const existing = Chart.getChart(canvasId);
            if (existing) existing.destroy();
            const tc = getChartTextColor(); const gc = getGridColor();
            new Chart(document.getElementById(canvasId), {
                type: 'bar',
                data: { labels, datasets: [{ label, data: dataArr, backgroundColor: color, borderRadius: 2 }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    onClick: onClickCb || undefined,
                    plugins: {
                        legend: { display: false },
                        datalabels: { display: true, anchor: 'end', align: 'end', color: color, font: { weight: 'bold', size: 10 }, formatter: v => v > 0 ? v : '' }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: gc }, ticks: { color: tc, font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { color: tc, font: { size: 10 } } }
                    }
                },
                plugins: [ChartDataLabels]
            });
        }
        function drillDownTrend(dateStr, area, inspect, defect) {
            const tipeData = document.getElementById('f_tipe').value;
            const rate = inspect > 0 ? ((defect / inspect) * 100).toFixed(2) : '0.00';
            const rows = globalData.filter(r => r.tanggal === dateStr && r.area_source === area);
            let grouped = {};
            rows.forEach(r => {
                const p = parseRowData(r, tipeData);
                const line = r.line || '-';
                const buyer = r.buyer || '-';
                const style = r.style || '-';
                const color = r.color || '-';
                const key = `${line}|||${buyer}|||${style}|||${color}`;
                if (!grouped[key]) grouped[key] = { line, buyer, style, color, insp: 0, def: 0 };
                grouped[key].insp += p.insp;
                grouped[key].def += p.def;
            });
            const detailRows = Object.values(grouped).map(g => ({
                line: g.line, buyer: g.buyer, style: g.style, color: g.color,
                inspect: g.insp, defect: g.def,
                rate: g.insp > 0 ? ((g.def / g.insp) * 100).toFixed(2) + '%' : '0%'
            })).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
            const summaryHTML = `<div class="drill-summary">
                <div class="drill-kpi"><div class="drill-kpi-label">Date</div><div class="drill-kpi-value" style="font-size:14px;">${formatShortDate(dateStr)}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Area</div><div class="drill-kpi-value" style="font-size:14px;">${area}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Inspect</div><div class="drill-kpi-value">${inspect.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Defect</div><div class="drill-kpi-value" style="color:var(--danger)">${defect.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Rate</div><div class="drill-kpi-value" style="color:var(--accent-gold)">${rate}%</div></div>
            </div>`;
            const tableHTML = buildDrillTable(detailRows, [
                { label: 'LINE', key: 'line' }, { label: 'BUYER', key: 'buyer' }, { label: 'STYLE', key: 'style' }, { label: 'COLOR', key: 'color' },
                { label: 'INSPECT', key: 'inspect' }, { label: 'DEFECT', key: 'defect' }, { label: 'RATE', key: 'rate' }
            ]);
            openDrillModal(`DATA DETAILS: ${area} - ${formatShortDate(dateStr)}`, summaryHTML + tableHTML);
        }
        function drillDownLineDateDetail(lineName, dateStr) {
            const tipeData = document.getElementById('f_tipe').value;

            
            const prodRows = globalData.filter(r => r.area_source === 'SEWING' && r.line.trim() === lineName && r.tanggal === dateStr);
            let prodGrouped = {};
            let totalI = 0, totalD = 0;
            prodRows.forEach(r => {
                const p = parseRowData(r, tipeData);
                const buyer = r.buyer || '-';
                const style = r.style || '-';
                const key = `${buyer}|||${style}`;
                if (!prodGrouped[key]) prodGrouped[key] = { buyer, style, insp: 0, def: 0 };
                prodGrouped[key].insp += p.insp;
                prodGrouped[key].def += p.def;
                totalI += p.insp;
                totalD += p.def;
            });
            const prodRowsFormatted = Object.values(prodGrouped).map(g => ({
                buyer: g.buyer, style: g.style, inspect: g.insp, defect: g.def,
                rate: g.insp > 0 ? ((g.def / g.insp) * 100).toFixed(2) + '%' : '0%'
            })).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

            
            const defRows = globalDefects.filter(r => r.area_source === 'SEWING' && r.line.trim() === lineName && r.tanggal === dateStr);
            let defMap = {};
            let totalQty = 0;
            defRows.forEach(r => {
                let kat = (r.kategori || "").toString().toUpperCase().trim();
                let isSewingDefect = (kat === 'SEWING' || kat === 'SEW' || (r.area_source === 'SEWING' && kat === ''));
                if (!isSewingDefect) return;
                let qty = tipeData === 'TLS' ? (parseInt(r.qty_tls) || 0) : (parseInt(r.qty_100) || 0);
                const partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                const typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";
                const defectName = partName ? `${partName} - ${typeName}` : typeName;
                if (!defMap[defectName]) defMap[defectName] = 0;
                defMap[defectName] += qty;
                totalQty += qty;
            });
            const detailRows = Object.entries(defMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);

            const rate = totalI > 0 ? ((totalD / totalI) * 100).toFixed(2) : '0.00';
            const summaryHTML = `<div class="drill-summary">
                <div class="drill-kpi"><div class="drill-kpi-label">Line</div><div class="drill-kpi-value" style="font-size:14px;">LINE ${lineName}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Date</div><div class="drill-kpi-value" style="font-size:14px;">${formatShortDate(dateStr)}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Inspect</div><div class="drill-kpi-value">${totalI.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Total Defect</div><div class="drill-kpi-value" style="color:var(--danger)">${totalQty.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Rate</div><div class="drill-kpi-value" style="color:var(--accent-gold)">${rate}%</div></div>
            </div>
            <div style="margin-bottom:15px;"><button class="btn-action" style="padding: 4px 8px;" onclick="drillDownLine('${lineName}')">← BACK TO DAILY CHART</button></div>`;

            const prodTableHTML = `<div style="font-size:11px; font-weight:800; color:var(--text-main); margin-top:5px; margin-bottom:8px; text-transform:uppercase;">BUYER / STYLE BREAKDOWN</div>` + buildDrillTable(prodRowsFormatted, [
                { label: 'BUYER', key: 'buyer' }, { label: 'STYLE', key: 'style' },
                { label: 'INSPECT', key: 'inspect' }, { label: 'DEFECT', key: 'defect' }, { label: 'RATE', key: 'rate' }
            ]);
            const defTableHTML = `<div style="font-size:11px; font-weight:800; color:var(--text-main); margin-top:20px; margin-bottom:8px; text-transform:uppercase;">DEFECT DETAILS (AREA - TYPE)</div>` + buildDrillTable(detailRows, [
                { label: 'DEFECT DETAIL (AREA - TYPE)', key: 'name' },
                { label: 'QTY', key: 'qty' }
            ]);
            openDrillModal(`DATA DETAILS: LINE ${lineName} - ${formatShortDate(dateStr)}`, summaryHTML + prodTableHTML + defTableHTML);
        }
        function drillDownDailyMultiDate(dateStr) {
            const tipeData = document.getElementById('f_tipe').value;
            const lineFilters = getMultiValues('ms_slicer_daily_line');
            const buyerFilters = getMultiValues('ms_slicer_daily_buyer');
            const styleFilters = getMultiValues('ms_slicer_daily_style');
            const rows = globalData.filter(r => {
                if (r.area_source !== 'SEWING' || r.tanggal !== dateStr) return false;
                const rawLine = r.line.trim();
                if (!lineFilters.includes("ALL") && !lineFilters.includes(rawLine)) return false;
                if (!buyerFilters.includes("ALL") && !buyerFilters.includes(r.buyer)) return false;
                if (!styleFilters.includes("ALL") && !styleFilters.includes(r.style)) return false;
                return true;
            });
            let grouped = {};
            let totalI = 0, totalD = 0;
            rows.forEach(r => {
                const p = parseRowData(r, tipeData);
                const key = `${r.line || '-'}|||${r.buyer || '-'}|||${r.style || '-'}`;
                if (!grouped[key]) grouped[key] = { line: r.line || '-', buyer: r.buyer || '-', style: r.style || '-', insp: 0, def: 0 };
                grouped[key].insp += p.insp;
                grouped[key].def += p.def;
                totalI += p.insp;
                totalD += p.def;
            });
            const detailRows = Object.values(grouped).map(g => ({
                line: g.line, buyer: g.buyer, style: g.style, inspect: g.insp, defect: g.def,
                rate: g.insp > 0 ? ((g.def / g.insp) * 100).toFixed(2) + '%' : '0%'
            })).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
            const rate = totalI > 0 ? ((totalD / totalI) * 100).toFixed(2) : '0.00';
            const summaryHTML = `<div class="drill-summary">
                <div class="drill-kpi"><div class="drill-kpi-label">Date</div><div class="drill-kpi-value" style="font-size:14px;">${formatShortDate(dateStr)}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Inspect</div><div class="drill-kpi-value">${totalI.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Defect</div><div class="drill-kpi-value" style="color:var(--danger)">${totalD.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Rate</div><div class="drill-kpi-value" style="color:var(--accent-gold)">${rate}%</div></div>
            </div>`;
            const tableHTML = buildDrillTable(detailRows, [
                { label: 'LINE', key: 'line' }, { label: 'BUYER', key: 'buyer' }, { label: 'STYLE', key: 'style' },
                { label: 'INSPECT', key: 'inspect' }, { label: 'DEFECT', key: 'defect' }, { label: 'RATE', key: 'rate' }
            ]);
            openDrillModal(`DATA DETAILS: ${formatShortDate(dateStr)}`, summaryHTML + tableHTML);
        }
        function drillDownLine(lineName) {
            const tipeData = document.getElementById('f_tipe').value;
            const rows = globalData.filter(r => r.area_source === 'SEWING' && r.line.trim() === lineName);
            let dateMap = {};
            rows.forEach(r => {
                const p = parseRowData(r, tipeData);
                if (!dateMap[r.tanggal]) dateMap[r.tanggal] = { i: 0, d: 0 };
                dateMap[r.tanggal].i += p.insp;
                dateMap[r.tanggal].d += p.def;
            });
            const totalI = rows.reduce((s, r) => s + parseRowData(r, tipeData).insp, 0);
            const totalD = rows.reduce((s, r) => s + parseRowData(r, tipeData).def, 0);
            const rate = totalI > 0 ? ((totalD / totalI) * 100).toFixed(2) : '0.00';
            const detailRows = rows.map(r => {
                const p = parseRowData(r, tipeData);
                return { tanggal: formatShortDate(r.tanggal), buyer: r.buyer || '-', style: r.style || '-', inspect: p.insp, defect: p.def, rate: p.insp > 0 ? ((p.def / p.insp) * 100).toFixed(2) + '%' : '0%' };
            }).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
            const dates = Object.keys(dateMap).sort();
            const defRows = globalDefects.filter(r => r.area_source === 'SEWING' && r.line.trim() === lineName);
            let defMap = {};
            defRows.forEach(r => {
                let kat = (r.kategori || "").toString().toUpperCase().trim();
                let isSewingDefect = (kat === 'SEWING' || kat === 'SEW' || (r.area_source === 'SEWING' && kat === ''));
                if (!isSewingDefect) return;
                let qty = tipeData === 'TLS' ? (parseInt(r.qty_tls) || 0) : (parseInt(r.qty_100) || 0);
                const partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                const typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";
                const defectName = partName ? `${partName} - ${typeName}` : typeName;
                if (!defMap[defectName]) defMap[defectName] = 0;
                defMap[defectName] += qty;
            });
            const accumDefectRows = Object.entries(defMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
            let accumTableHTML = '';
            if (dates.length > 1) {
                accumTableHTML = `<div style="font-size:11px; font-weight:800; color:var(--text-main); margin-top:20px; margin-bottom:8px; text-transform:uppercase;">ACCUMULATED DEFECTS (${formatShortDate(dates[0])} - ${formatShortDate(dates[dates.length - 1])})</div>` +
                    buildDrillTable(accumDefectRows, [
                        { label: 'DEFECT DETAIL (AREA - TYPE)', key: 'name' },
                        { label: 'TOTAL QTY', key: 'qty' }
                    ]);
            }
            const drillChartId = 'drillLineCanvas_' + Date.now();
            const summaryHTML = `<div class="drill-summary">
                <div class="drill-kpi"><div class="drill-kpi-label">Line</div><div class="drill-kpi-value" style="font-size:14px;">LINE ${lineName}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Total Inspect</div><div class="drill-kpi-value">${totalI.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Total Defect</div><div class="drill-kpi-value" style="color:var(--danger)">${totalD.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Avg Rate</div><div class="drill-kpi-value" style="color:var(--accent-gold)">${rate}%</div></div>
            </div>
            <div style="font-size:10px; font-weight:800; color:var(--text-sub); text-align:center; margin-bottom:5px;">(CLICK BAR TO SEE DEFECT DETAILS PER DAY)</div>
            <div class="drill-chart-container"><canvas id="${drillChartId}"></canvas></div>`;
            const tableHTML = `<div style="font-size:11px; font-weight:800; color:var(--text-main); margin-top:20px; margin-bottom:8px; text-transform:uppercase;">DAILY PERFORMANCE DETAILS</div>` + buildDrillTable(detailRows, [
                { label: 'DATE', key: 'tanggal' }, { label: 'BUYER', key: 'buyer' }, { label: 'STYLE', key: 'style' },
                { label: 'INSPECT', key: 'inspect' }, { label: 'DEFECT', key: 'defect' }, { label: 'RATE', key: 'rate' }
            ]);
            openDrillModal(`DATA DETAILS: LINE ${lineName}`, summaryHTML + accumTableHTML + tableHTML);
            setTimeout(() => {
                drillChartBar(drillChartId, dates.map(d => formatShortDate(d)), dates.map(d => parseFloat(((dateMap[d].d / dateMap[d].i) * 100).toFixed(2))), 'Rate (%)', '#dc2626', function (evt, elements) {
                    if (elements.length > 0) {
                        const idx = elements[0].index;
                        const dateRaw = dates[idx];
                        drillDownLineDateDetail(lineName, dateRaw);
                    }
                });
            }, 100);
        }
        function escapeJsStr(str) {
            return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        }
        function computeDefectQtyForRow(r, tipeData) {
            let kat = (r.kategori || "").toString().toUpperCase().trim();
            if (r.area_source === 'SEWING') {
                let isSewingDefect = (kat === 'SEWING' || kat === 'SEW' || kat === '');
                if (!isSewingDefect) return 0;
                return tipeData === 'TLS' ? (parseInt(r.qty_tls) || 0) : (parseInt(r.qty_100) || 0);
            } else if (r.area_source === 'FINISHING') {
                if (kat !== 'FINISHING' && kat !== 'FIN') return 0;
                return parseInt(r.qty) || 0;
            } else if (r.area_source === 'WASHING') {
                if (kat !== 'WASHING' && kat !== 'WAS') return 0;
                return parseInt(r.qty) || 0;
            }
            return 0;
        }
        function drillDownBuyerStyle(bsKey) {
            const tipeData = document.getElementById('f_tipe').value;
            const [buyer, style] = bsKey.split('|||');
            const bAreaFilters = getMultiValues('ms_slicer_buyer_area');
            const rows = globalData.filter(r => r.buyer === buyer && r.style === style && (bAreaFilters.includes('ALL') || bAreaFilters.includes(r.area_source)));
            let dateMap = {};
            rows.forEach(r => {
                const p = parseRowData(r, tipeData);
                if (!dateMap[r.tanggal]) dateMap[r.tanggal] = { i: 0, d: 0 };
                dateMap[r.tanggal].i += p.insp;
                dateMap[r.tanggal].d += p.def;
            });
            const totalI = rows.reduce((s, r) => s + parseRowData(r, tipeData).insp, 0);
            const totalD = rows.reduce((s, r) => s + parseRowData(r, tipeData).def, 0);
            const rate = totalI > 0 ? ((totalD / totalI) * 100).toFixed(2) : '0.00';
            const lineBreakdown = {};
            rows.forEach(r => {
                const p = parseRowData(r, tipeData);
                const lineKey = `${r.area_source} ${r.line || '-'}`;
                if (!lineBreakdown[lineKey]) lineBreakdown[lineKey] = { i: 0, d: 0 };
                lineBreakdown[lineKey].i += p.insp;
                lineBreakdown[lineKey].d += p.def;
            });
            const detailRows = Object.entries(lineBreakdown).map(([line, v]) => ({
                line, inspect: v.i, defect: v.d, rate: v.i > 0 ? ((v.d / v.i) * 100).toFixed(2) + '%' : '0%'
            })).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

            const defRows = globalDefects.filter(r => r.buyer === buyer && r.style === style && (bAreaFilters.includes('ALL') || bAreaFilters.includes(r.area_source)));
            let defMap = {};
            defRows.forEach(r => {
                const qty = computeDefectQtyForRow(r, tipeData);
                if (qty === 0) return;
                const partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                const typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";
                const defectName = partName ? `${partName} - ${typeName}` : typeName;
                const key = `${r.area_source} | ${defectName}`;
                if (!defMap[key]) defMap[key] = 0;
                defMap[key] += qty;
            });
            const defDetailRows = Object.entries(defMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);

            const dates = Object.keys(dateMap).sort();
            const drillChartId = 'drillBSCanvas_' + Date.now();
            const summaryHTML = `<div class="drill-summary">
                <div class="drill-kpi"><div class="drill-kpi-label">Buyer</div><div class="drill-kpi-value" style="font-size:12px;">${buyer}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Style</div><div class="drill-kpi-value" style="font-size:12px;">${style}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Total Inspect</div><div class="drill-kpi-value">${totalI.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Total Defect</div><div class="drill-kpi-value" style="color:var(--danger)">${totalD.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Rate</div><div class="drill-kpi-value" style="color:var(--accent-gold)">${rate}%</div></div>
            </div>
            <div class="drill-chart-container"><canvas id="${drillChartId}"></canvas></div>`;
            const tableHTML = `<div style="font-size:11px; font-weight:800; color:var(--text-main); margin-top:5px; margin-bottom:8px; text-transform:uppercase;">BREAKDOWN PER SOURCE/LINE</div>` + buildDrillTable(detailRows, [
                { label: 'SOURCE / LINE', key: 'line' }, { label: 'INSPECT', key: 'inspect' }, { label: 'DEFECT', key: 'defect' }, { label: 'RATE', key: 'rate' }
            ]);
            const defTableHTML = `<div style="font-size:11px; font-weight:800; color:var(--text-main); margin-top:20px; margin-bottom:8px; text-transform:uppercase;">ACCUMULATED DEFECT DETAILS</div>` + buildDrillTable(defDetailRows, [
                { label: 'DEFECT DETAIL (SOURCE | AREA - TYPE)', key: 'name' }, { label: 'QTY', key: 'qty' }
            ]);
            openDrillModal(`DATA DETAILS: ${buyer} / ${style}`, summaryHTML + tableHTML + defTableHTML);
            setTimeout(() => {
                drillChartBar(drillChartId, dates.map(d => formatShortDate(d)), dates.map(d => parseFloat(((dateMap[d].d / dateMap[d].i) * 100).toFixed(2))), 'Rate (%)', '#d97706', function (evt, elements) {
                    if (elements.length > 0) {
                        const idx = elements[0].index;
                        const dateRaw = dates[idx];
                        drillDownBuyerStyleDateDetail(buyer, style, dateRaw);
                    }
                });
            }, 100);
        }
        function drillDownBuyerStyleDateDetail(buyer, style, dateStr) {
            const tipeData = document.getElementById('f_tipe').value;
            const bAreaFilters = getMultiValues('ms_slicer_buyer_area');
            const prodRows = globalData.filter(r => r.buyer === buyer && r.style === style && r.tanggal === dateStr && (bAreaFilters.includes('ALL') || bAreaFilters.includes(r.area_source)));
            let totalI = 0, totalD = 0;
            prodRows.forEach(r => {
                const p = parseRowData(r, tipeData);
                totalI += p.insp;
                totalD += p.def;
            });
            const defRows = globalDefects.filter(r => r.buyer === buyer && r.style === style && r.tanggal === dateStr && (bAreaFilters.includes('ALL') || bAreaFilters.includes(r.area_source)));
            let defMap = {};
            let totalQty = 0;
            defRows.forEach(r => {
                const qty = computeDefectQtyForRow(r, tipeData);
                if (qty === 0) return;
                const partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                const typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";
                const defectName = partName ? `${partName} - ${typeName}` : typeName;
                const key = `${r.area_source} | ${defectName}`;
                if (!defMap[key]) defMap[key] = 0;
                defMap[key] += qty;
                totalQty += qty;
            });
            const detailRows = Object.entries(defMap).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
            const rate = totalI > 0 ? ((totalD / totalI) * 100).toFixed(2) : '0.00';
            const summaryHTML = `<div class="drill-summary">
                <div class="drill-kpi"><div class="drill-kpi-label">Buyer</div><div class="drill-kpi-value" style="font-size:12px;">${buyer}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Style</div><div class="drill-kpi-value" style="font-size:12px;">${style}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Date</div><div class="drill-kpi-value" style="font-size:14px;">${formatShortDate(dateStr)}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Inspect</div><div class="drill-kpi-value">${totalI.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Total Defect</div><div class="drill-kpi-value" style="color:var(--danger)">${totalQty.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Rate</div><div class="drill-kpi-value" style="color:var(--accent-gold)">${rate}%</div></div>
            </div>
            <div style="margin-bottom:15px;"><button class="btn-action" style="padding: 4px 8px;" onclick="drillDownBuyerStyle('${escapeJsStr(buyer)}|||${escapeJsStr(style)}')">← BACK TO DAILY CHART</button></div>`;
            const tableHTML = `<div style="font-size:11px; font-weight:800; color:var(--text-main); margin-top:5px; margin-bottom:8px; text-transform:uppercase;">DEFECT DETAILS</div>` + buildDrillTable(detailRows, [
                { label: 'DEFECT DETAIL (SOURCE | AREA - TYPE)', key: 'name' },
                { label: 'QTY', key: 'qty' }
            ]);
            openDrillModal(`DATA DETAILS: ${buyer} / ${style} - ${formatShortDate(dateStr)}`, summaryHTML + tableHTML);
        }
        function drillDownDefect(chartCategory, defectName, defectKey) {
            const tipeData = document.getElementById('f_tipe').value;
            let lineFilters = [], buyerFilters = [], styleFilters = [], colorFilters = [], srcFilters = [];

            if (chartCategory === 'SEWING') {
                lineFilters = getMultiValues('ms_slicer_sew');
                srcFilters = getMultiValues('ms_slicer_sew_src');
            } else if (chartCategory === 'FINISHING') {
                buyerFilters = getMultiValues('ms_slicer_fin_buyer');
                styleFilters = getMultiValues('ms_slicer_fin_style');
                srcFilters = getMultiValues('ms_slicer_fin_src');
            } else if (chartCategory === 'WASHING') {
                lineFilters = getMultiValues('ms_slicer_was');
                buyerFilters = getMultiValues('ms_slicer_was_buyer');
                styleFilters = getMultiValues('ms_slicer_was_style');
                colorFilters = getMultiValues('ms_slicer_was_color');
                srcFilters = ['ALL'];
            }
            const defRows = globalDefects.filter(r => {
                const partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                const typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";
                const combinedName = partName ? `${partName}|||${typeName}` : typeName;

                if (combinedName !== defectKey) return false;
                if (!(srcFilters.includes("ALL") || srcFilters.includes(r.area_source))) return false;

                let kat = (r.kategori || "").toString().toUpperCase().trim();

                if (chartCategory === 'SEWING') {
                    let isSewingDefect = (kat === 'SEWING' || kat === 'SEW' || (r.area_source === 'SEWING' && kat === ''));
                    if (!isSewingDefect) return false;
                    if (!lineFilters.includes("ALL") && !lineFilters.includes(r.line)) return false;
                } else if (chartCategory === 'FINISHING') {
                    if (kat !== 'FINISHING' && kat !== 'FIN') return false;
                    if (!buyerFilters.includes("ALL") && !buyerFilters.includes(r.buyer)) return false;
                    if (!styleFilters.includes("ALL") && !styleFilters.includes(r.style)) return false;
                } else if (chartCategory === 'WASHING') {
                    if (kat !== 'WASHING' && kat !== 'WAS') return false;
                    if (!lineFilters.includes("ALL") && !lineFilters.includes(r.line)) return false;
                    if (!buyerFilters.includes("ALL") && !buyerFilters.includes(r.buyer)) return false;
                    if (!styleFilters.includes("ALL") && !styleFilters.includes(r.style)) return false;
                    if (!colorFilters.includes("ALL") && !colorFilters.includes(r.color)) return false;
                }
                return true;
            });
            let entityMap = {};
            let totalQty = 0;

            defRows.forEach(r => {
                let qty = r.area_source === 'SEWING' ? (tipeData === 'TLS' ? (parseInt(r.qty_tls) || 0) : (parseInt(r.qty_100) || 0)) : (parseInt(r.qty) || 0);
                const src = r.area_source || '-';
                const line = r.line || '-';
                let buyer = r.buyer || r.d || r.D || '-';
                let style = r.style || r.e || r.E || '-';
                let color = r.color || '-';
                if (r.area_source === 'SEWING') {
                    color = '-';
                    if (buyer === '-' || style === '-') {
                        const prod = globalData.find(p => p.area_source === 'SEWING' && p.tanggal === r.tanggal && p.line === r.line);
                        if (prod) {
                            buyer = buyer !== '-' ? buyer : (prod.buyer || '-');
                            style = style !== '-' ? style : (prod.style || '-');
                        }
                    }
                }
                const key = `${src}|||${line}|||${buyer}|||${style}|||${color}`;

                if (!entityMap[key]) entityMap[key] = { src, line, buyer, style, color, qty: 0 };
                entityMap[key].qty += qty;
                totalQty += qty;
            });

            const detailRows = Object.values(entityMap).sort((a, b) => b.qty - a.qty);
            const top10Entities = detailRows.slice(0, 10);
            const drillChartId = 'drillDefCanvas_' + Date.now();

            const summaryHTML = `<div class="drill-summary"><div class="drill-kpi"><div class="drill-kpi-label">Defect</div><div class="drill-kpi-value" style="font-size:12px;">${defectName}</div></div><div class="drill-kpi"><div class="drill-kpi-label">Total Qty</div><div class="drill-kpi-value" style="color:var(--danger)">${totalQty.toLocaleString('en-US')}</div></div></div><div class="drill-chart-container"><canvas id="${drillChartId}"></canvas></div>`;
            const tableHTML = buildDrillTable(detailRows, [{ label: 'SOURCE', key: 'src' }, { label: 'LINE', key: 'line' }, { label: 'BUYER', key: 'buyer' }, { label: 'STYLE', key: 'style' }, { label: 'COLOR', key: 'color' }, { label: 'QTY', key: 'qty' }]);
            openDrillModal(`DATA DETAILS: ${defectName} (${chartCategory})`, summaryHTML + tableHTML);

            setTimeout(() => {
                drillChartBar(drillChartId, top10Entities.map(x => x.src.substring(0, 3) + ' ' + (x.line !== '-' ? x.line : (x.buyer !== '-' ? x.buyer : ''))), top10Entities.map(x => x.qty), 'Qty Defect', '#dc2626');
            }, 100);
        }
        function drillDownAreaDefectsDate(area, dateStr) {
            const tipeData = document.getElementById('f_tipe').value;
            const rows = globalDefects.filter(r => r.area_source === area && r.tanggal === dateStr);

            let tdtAreas = getMultiValues('ms_slicer_tdt_area');
            let tdtDefects = getMultiValues('ms_slicer_tdt_defect');
            const isAllTdtArea = tdtAreas.length === 0 || tdtAreas.includes('ALL');
            const isAllTdtDefect = tdtDefects.length === 0 || tdtDefects.includes('ALL');

            let grouped = {};
            let totalQty = 0;

            rows.forEach(r => {
                let kat = (r.kategori || "").toString().toUpperCase().trim();
                if (area === 'SEWING') {
                    let isSewingDefect = (kat === 'SEWING' || kat === 'SEW' || kat === '');
                    if (!isSewingDefect) return;
                } else if (area === 'FINISHING') {
                    if (kat !== 'FINISHING' && kat !== 'FIN') return;
                } else if (area === 'WASHING') {
                    if (kat !== 'WASHING' && kat !== 'WAS') return;
                }

                let partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                let typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";

                if (!isAllTdtArea && !tdtAreas.includes(partName)) return;
                if (!isAllTdtDefect && !tdtDefects.includes(typeName)) return;

                const qty = area === 'SEWING' ? (tipeData === 'TLS' ? (parseInt(r.qty_tls) || 0) : (parseInt(r.qty_100) || 0)) : (parseInt(r.qty) || 0);
                if (qty === 0) return;

                const defectName = partName ? `${partName} - ${typeName}` : typeName;
                if (!grouped[defectName]) grouped[defectName] = { name: defectName, qty: 0 };
                grouped[defectName].qty += qty;
                totalQty += qty;
            });

            let totalInspect = 0;
            const prodRows = globalData.filter(r => r.area_source === area && r.tanggal === dateStr);

            prodRows.forEach(r => {
                const p = parseRowData(r, tipeData);
                totalInspect += (p.insp || 0);
            });

            const rate = totalInspect > 0 ? ((totalQty / totalInspect) * 100).toFixed(2) + '%' : '0%';
            const detailRows = Object.values(grouped).sort((a, b) => b.qty - a.qty);

            const summaryHTML = `<div class="drill-summary">
                <div class="drill-kpi"><div class="drill-kpi-label">Date</div><div class="drill-kpi-value" style="font-size:14px;">${formatShortDate(dateStr)}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Area</div><div class="drill-kpi-value" style="font-size:14px;">${area}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Inspect</div><div class="drill-kpi-value">${totalInspect.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Defect</div><div class="drill-kpi-value" style="color:var(--danger)">${totalQty.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">Act. Rate</div><div class="drill-kpi-value" style="color:var(--danger)">${rate}</div></div>
            </div>`;
            const tableHTML = buildDrillTable(detailRows, [
                { label: 'DEFECT DETAIL (AREA - TYPE)', key: 'name' },
                { label: 'QTY', key: 'qty' }
            ]);
            openDrillModal(`DEFECT DETAILS: ${area} - ${formatShortDate(dateStr)}`, summaryHTML + tableHTML);
        }

        function resetTrendZoom() { if (chartInstances.trend) chartInstances.trend.resetZoom(); }
        function resetSewPerfZoom() { if (chartInstances.sewPerf) chartInstances.sewPerf.resetZoom(); }
        function resetDailyLineZoom() { if (chartInstances.dailyLine) chartInstances.dailyLine.resetZoom(); }
        function resetFinPerfZoom() { if (chartInstances.finPerf) chartInstances.finPerf.resetZoom(); }
        function getSmartDateRange(startStr, endStr) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            if (startStr === endStr) {
                let d = new Date(startStr);
                return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            }
            let d1 = new Date(startStr);
            let d2 = new Date(endStr);
            if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
                return `${d1.getDate()}-${d2.getDate()} ${months[d1.getMonth()]} ${d1.getFullYear()}`;
            }
            return `${d1.getDate()} ${months[d1.getMonth()]} - ${d2.getDate()} ${months[d2.getMonth()]} ${d2.getFullYear()}`;
        }
        function formatShortDate(dateStr) {
            const d = new Date(dateStr);
            return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`;
        }
        function isExcludedLine(area, lineStr, tipeInspeksi) {
            if (area !== 'SEWING' || !lineStr) return false;
            const l = lineStr.toString().toUpperCase().trim();
            const isTlsOnly = l === '18' || l.includes('MINILINE') || l.includes('MINI LINE') || l.includes('PREPARATION');
            if (tipeInspeksi === '100' && isTlsOnly) return true;
            return false;
        }
        function buildMultiSelect(id, options, onChangeName, defaultText = "ALL SELECTED") {
            const wrap = document.getElementById(id);
            if (!wrap) return;
            let html = `<div class="mul-select-head" onclick="this.parentElement.classList.toggle('open')">${defaultText}</div>`;
            html += `<div class="mul-select-body">`;
            html += `<label><input type="checkbox" value="ALL" checked onchange="toggleAllMS(this, '${id}', '${onChangeName}')"> ALL</label>`;
            options.forEach(opt => {
                html += `<label><input type="checkbox" value="${opt}" checked onchange="checkMS(this, '${id}', '${onChangeName}')"> ${opt}</label>`;
            });
            html += `</div>`;
            wrap.innerHTML = html;
        }
        function toggleAllMS(cb, wrapId, cbFunc) {
            const wrap = document.getElementById(wrapId);
            const inputs = wrap.querySelectorAll('input[type="checkbox"]:not([value="ALL"])');
            inputs.forEach(i => i.checked = cb.checked);
            updateMSHead(wrapId);
            if (cbFunc && window[cbFunc]) window[cbFunc]();
        }
        function checkMS(cb, wrapId, cbFunc) {
            const wrap = document.getElementById(wrapId);
            const allCb = wrap.querySelector('input[value="ALL"]');
            const inputs = Array.from(wrap.querySelectorAll('input[type="checkbox"]:not([value="ALL"])'));
            allCb.checked = inputs.every(i => i.checked);
            updateMSHead(wrapId);
            if (cbFunc && window[cbFunc]) window[cbFunc]();
        }
        function updateMSHead(wrapId) {
            const wrap = document.getElementById(wrapId);
            if (!wrap) return;
            const inputs = Array.from(wrap.querySelectorAll('input[type="checkbox"]:not([value="ALL"])'));
            const checked = inputs.filter(i => i.checked);
            const head = wrap.querySelector('.mul-select-head');
            if (checked.length === inputs.length || checked.length === 0) head.innerText = "ALL SELECTED";
            else if (checked.length <= 2) head.innerText = checked.map(i => i.value).join(', ');
            else head.innerText = checked.length + " SELECTED";
        }
        function getMultiValues(id) {
            const wrap = document.getElementById(id);
            if (!wrap) return ['ALL'];
            const allCb = wrap.querySelector('input[value="ALL"]');
            if (allCb && allCb.checked) return ['ALL'];
            const checked = Array.from(wrap.querySelectorAll('input[type="checkbox"]:not([value="ALL"]):checked')).map(cb => cb.value);
            return checked.length > 0 ? checked : ['ALL'];
        }
        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('spv_theme', isDark);
            updateChartColors(isDark);
        }
        function lockGuestUI() {
            window.isGuestLocked = true;
        }

        function initDashboardAccess() {
            window.isGuestLocked = false;
            return true;
        }

        window.onload = () => {
            if (!initDashboardAccess()) return;
            document.body.classList.remove('dark-mode');
            localStorage.setItem('spv_theme', false);

            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 1);
            const yStr = toLocalDateStr(yesterday);

            document.getElementById('f_end').value = yStr;
            document.getElementById('f_start').value = yStr;

            buildMultiSelect('ms_f_area', ['SEWING', 'FINISHING', 'WASHING'], '');
            buildMultiSelect('ms_slicer_vol_area', ['SEWING', 'FINISHING', 'WASHING'], 'triggerRenderVolume');
            buildMultiSelect('ms_slicer_avg_sec', ['SEWING', 'FINISHING', 'WASHING'], 'triggerRenderAvgSec');

            initEmptyCharts();
            applyFilter();
        };
        function openFilter() { document.getElementById('filterPanel').classList.add('open'); document.getElementById('filterOverlay').classList.add('open'); }
        function closeFilter() { document.getElementById('filterPanel').classList.remove('open'); document.getElementById('filterOverlay').classList.remove('open'); }

        function applyFilter() {
            closeFilter();
            const actualStart = document.getElementById('f_start').value;
            const endDate = document.getElementById('f_end').value;
            const tipeData = document.getElementById('f_tipe').value;
            const globalAreas = getMultiValues('ms_f_area');
            const avgWrap = document.getElementById('ms_slicer_avg_sec');

            if (avgWrap) {
                const avgInputs = avgWrap.querySelectorAll('input[type="checkbox"]');
                avgInputs.forEach(i => {
                    if (i.value === 'ALL') i.checked = globalAreas.includes('ALL');
                    else i.checked = globalAreas.includes('ALL') || globalAreas.includes(i.value);
                });
                updateMSHead('ms_slicer_avg_sec');
            }
            if (!actualStart || !endDate) return;
            const dEnd = new Date(endDate);
            const dStart = new Date(actualStart);
            const diffDays = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
            const fetchStartObj = new Date(dStart);
            let offset = diffDays;
            if (diffDays === 1 && dStart.getDay() === 1) offset = 2;

            fetchStartObj.setDate(fetchStartObj.getDate() - offset);
            const requiredFetchStart = toLocalDateStr(fetchStartObj);
            let cacheObj = appCache;
            let needsFetch = false;
            if (!cacheObj.fetched || requiredFetchStart < cacheObj.start || endDate > cacheObj.end) {
                needsFetch = true;
            }
            if (needsFetch) {
                let expandedStartObj = new Date(dEnd);
                expandedStartObj.setDate(expandedStartObj.getDate() - 14);
                let fetchStartStr = toLocalDateStr(expandedStartObj);
                if (requiredFetchStart < fetchStartStr) fetchStartStr = requiredFetchStart;
                document.getElementById('loading').style.display = 'flex';

                const payloadSew = { action: "get_spv_data", start_date: fetchStartStr, end_date: endDate, status: "REVIEW", password: PASSWORD_SPV, version: "1.0" };
                const payloadFin = { action: "get_spv_data", start_date: fetchStartStr, end_date: endDate, status: "REVIEW", password: PASSWORD_SPV, version: "1.0" };
                const payloadWash = { action: "get_spv_data", start_date: fetchStartStr, end_date: endDate, status: "ORI", password: PASSWORD_SPV, version: "1.0" };

                Promise.allSettled([
                    fetchConfig(URL_SEWING, payloadSew).then(d => ({ area: 'SEWING', data: d })),
                    fetchConfig(URL_FINISHING, payloadFin).then(d => ({ area: 'FINISHING', data: d })),
                    fetchConfig(URL_WASHING, payloadWash).then(d => ({ area: 'WASHING', data: d }))
                ]).then(results => {
                    document.getElementById('loading').style.display = 'none';
                    let errorMsg = "";

                    cacheObj.rawSew = []; cacheObj.rawFin = []; cacheObj.rawWas = [];
                    cacheObj.defSew = []; cacheObj.defFin = []; cacheObj.defWas = [];
                    results.forEach(res => {
                        if (res.status === 'fulfilled' && res.value.data.result === 'success') {
                            let prodData = res.value.data.produksi || [];
                            let defData = res.value.data.defects || [];
                            
                            if (res.value.area === 'SEWING') { cacheObj.rawSew = prodData; cacheObj.defSew = defData; }
                            if (res.value.area === 'FINISHING') { cacheObj.rawFin = prodData; cacheObj.defFin = defData; }
                            if (res.value.area === 'WASHING') { cacheObj.rawWas = prodData; cacheObj.defWas = defData; }
                        } else {
                            errorMsg += `Gagal mengambil data dari database ${res.value?.area || 'Unknown'}\n`;
                        }
                    });
                    if (errorMsg) Swal.fire({ title: 'Informasi', text: errorMsg, confirmButtonColor: 'var(--accent-primary)' });
                    cacheObj.start = fetchStartStr;
                    cacheObj.end = endDate;
                    cacheObj.fetched = true;
                    processLocalDataAndRender(cacheObj, actualStart, endDate, requiredFetchStart, tipeData, globalAreas);
                });
            } else {
                processLocalDataAndRender(cacheObj, actualStart, endDate, requiredFetchStart, tipeData, globalAreas);
                runBackgroundForecasts();
            }
        }
        function processLocalDataAndRender(cacheObj, actualStart, endDate, requiredFetchStart, tipeData, areaFilters) {
            globalData = []; globalDefects = []; prevGlobalData = [];
            const processArea = (areaName, rawProd, rawDef) => {
                if (areaFilters.includes('ALL') || areaFilters.includes(areaName)) {
                    let pData = rawProd.map(item => ({ ...item, area_source: areaName }));
                    let dData = rawDef.map(item => ({ ...item, area_source: areaName }));
                    pData = pData.filter(row => !isExcludedLine(row.area_source, row.line, tipeData));
                    dData = dData.filter(row => !isExcludedLine(row.area_source, row.line, tipeData));
                    pData.forEach(r => {
                        if (r.tanggal >= actualStart && r.tanggal <= endDate) globalData.push(r);
                        else if (r.tanggal >= requiredFetchStart && r.tanggal < actualStart) prevGlobalData.push(r);
                    });
                    dData.forEach(r => {
                        if (r.tanggal >= actualStart && r.tanggal <= endDate) globalDefects.push(r);
                    });
                }
            };
            processArea('SEWING', cacheObj.rawSew, cacheObj.defSew);
            processArea('FINISHING', cacheObj.rawFin, cacheObj.defFin);
            processArea('WASHING', cacheObj.rawWas, cacheObj.defWas);
            let titlePrefix = areaFilters.includes('ALL') ? "ALL AREA" : areaFilters.join(' & ');
            document.getElementById('mainTitleText').innerText = `QC DASHBOARD - ${titlePrefix}`;
            document.getElementById('dashboardSubtitle').innerText = `PERIOD: ${getSmartDateRange(actualStart, endDate).toUpperCase()}`;

            populateSlicers();

            const globalAreas = getMultiValues('ms_f_area');
            const syncSlicerToGlobal = (slicerId) => {
                const wrap = document.getElementById(slicerId);
                if (wrap) {
                    const inputs = wrap.querySelectorAll('input[type="checkbox"]');
                    inputs.forEach(i => {
                        if (i.value === 'ALL') {
                            i.checked = globalAreas.includes('ALL');
                        } else {
                            i.checked = globalAreas.includes('ALL') || globalAreas.includes(i.value);
                        }
                    });
                    updateMSHead(slicerId);
                }
            };
            syncSlicerToGlobal('ms_slicer_sew_src');
            syncSlicerToGlobal('ms_slicer_fin_src');
            syncSlicerToGlobal('ms_slicer_vol_area');
            syncSlicerToGlobal('ms_slicer_buyer_area');
            processDashboardData(actualStart, endDate);
            if (window.pendingScreenshotPreset) {
                applyScreenshotLayout(window.pendingScreenshotPreset);
                window.pendingScreenshotPreset = null;
            }
        }
        window.filterTopDefectsSew = () => filterTopDefects('SEWING');
        window.filterTopDefectsFin = () => filterTopDefects('FINISHING');
        window.filterTopDefectsWas = () => filterTopDefects('WASHING');
        window.triggerRenderBuyerLine = () => renderBuyerLineCharts();
        window.triggerRenderVolume = () => renderVolumeChart();
        window.triggerRenderSewingPerf = () => renderSewingPerfChart();
        window.triggerRenderFinishingPerf = () => renderFinishingPerfChart();
        window.triggerRenderAvgSec = function () {
            if (!window.lastAreaMap) return;
            const sel = getMultiValues('ms_slicer_avg_sec');
            const isSew = sel.includes('ALL') || sel.includes('SEWING');
            const isFin = sel.includes('ALL') || sel.includes('FINISHING');
            const isWas = sel.includes('ALL') || sel.includes('WASHING');
            document.getElementById('score_box_sew').style.display = isSew ? 'flex' : 'none';
            document.getElementById('score_box_fin').style.display = isFin ? 'flex' : 'none';
            document.getElementById('score_box_was').style.display = isWas ? 'flex' : 'none';
            const navyColor = getNavyColor();
            let labels = []; let data = []; let bg = [];
            if (isSew) { labels.push('Sewing'); data.push(window.lastAreaMap.SEWING.d); bg.push(navyColor); }
            if (isFin) { labels.push('Finishing'); data.push(window.lastAreaMap.FINISHING.d); bg.push('rgba(245, 158, 11, 0.9)'); }
            if (isWas) { labels.push('Washing'); data.push(window.lastAreaMap.WASHING.d); bg.push('rgba(16, 185, 129, 0.9)'); }
            chartInstances.sectionCompare.data = { labels: labels, datasets: [{ label: 'Total Defect Qty', data: data, backgroundColor: bg, borderRadius: 2 }] };
            chartInstances.sectionCompare.update();
        }
        window.updateBuyerSlicer = () => {
            const selAreas = getMultiValues('ms_slicer_buyer_area');
            let validLines = new Set();
            globalData.forEach(r => {
                if (selAreas.includes('ALL') || selAreas.includes(r.area_source)) {
                    if (r.line.trim() && r.line.trim() !== "-") validLines.add(r.line.trim());
                }
            });
            buildMultiSelect('ms_slicer_buyer_line', Array.from(validLines).sort(), 'triggerRenderBuyerLine');
            renderBuyerLineCharts();
        };
        function populateSlicers() {
            let linesSew = new Set(), buyersSew = new Set(), stylesSew = new Set(), allLines = new Set();
            let buyersFin = new Set(), stylesFin = new Set(), colorsFin = new Set();
            let buyersWas = new Set(), stylesWas = new Set(), colorsWas = new Set();
            globalData.forEach(row => {
                let ln = row.line.trim();
                if (ln && ln !== "-") {
                    allLines.add(ln);
                    if (row.area_source === 'SEWING') linesSew.add(ln);
                }
                if (row.area_source === 'SEWING') {
                    let buyer = row.buyer ? row.buyer.trim() : "-";
                    let style = row.style ? row.style.trim() : "-";
                    if (buyer) buyersSew.add(buyer);
                    if (style) stylesSew.add(style);
                }
                if (row.area_source === 'FINISHING') {
                    if (row.buyer.trim() && row.buyer.trim() !== "-") buyersFin.add(row.buyer.trim());
                    if (row.style.trim() && row.style.trim() !== "-") stylesFin.add(row.style.trim());
                    if (row.color && row.color.trim() && row.color.trim() !== "-") colorsFin.add(row.color.trim());
                }
                if (row.area_source === 'WASHING') {
                    if (row.buyer.trim() && row.buyer.trim() !== "-") buyersWas.add(row.buyer.trim());
                    if (row.style.trim() && row.style.trim() !== "-") stylesWas.add(row.style.trim());
                    if (row.color && row.color.trim() !== "-") colorsWas.add(row.color.trim());
                }
            });
            let sortedSewLines = Array.from(linesSew).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            buildMultiSelect('ms_slicer_sew_src', ['SEWING', 'FINISHING', 'WASHING'], 'filterTopDefectsSew', 'ALL SRC');
            buildMultiSelect('ms_slicer_sew', sortedSewLines, 'filterTopDefectsSew');
            buildMultiSelect('ms_slicer_sew_buyer', Array.from(buyersSew).sort(), 'filterTopDefectsSew', 'ALL BUYERS');
            buildMultiSelect('ms_slicer_sew_style', Array.from(stylesSew).sort(), 'filterTopDefectsSew', 'ALL STYLES');
            buildMultiSelect('ms_slicer_sew_perf', sortedSewLines, 'triggerRenderSewingPerf');
            buildMultiSelect('ms_slicer_fin_src', ['SEWING', 'FINISHING', 'WASHING'], 'filterTopDefectsFin', 'ALL SRC');
            buildMultiSelect('ms_slicer_fin_buyer', Array.from(buyersFin).sort(), 'filterTopDefectsFin', 'ALL BUYERS');
            buildMultiSelect('ms_slicer_fin_style', Array.from(stylesFin).sort(), 'filterTopDefectsFin', 'ALL STYLES');
            buildMultiSelect('ms_slicer_fin_color', Array.from(colorsFin).sort(), 'filterTopDefectsFin', 'COLOR');
            buildMultiSelect('ms_slicer_fin_perf_buyer', Array.from(buyersFin).sort(), 'triggerRenderFinishingPerf', 'BUYER');
            buildMultiSelect('ms_slicer_fin_perf_style', Array.from(stylesFin).sort(), 'triggerRenderFinishingPerf', 'STYLE');
            buildMultiSelect('ms_slicer_was', Array.from(allLines).sort(), 'filterTopDefectsWas', 'ALL LINES');
            buildMultiSelect('ms_slicer_was_buyer', Array.from(buyersWas).sort(), 'filterTopDefectsWas', 'BUYER');
            buildMultiSelect('ms_slicer_was_style', Array.from(stylesWas).sort(), 'filterTopDefectsWas', 'STYLE');
            buildMultiSelect('ms_slicer_was_color', Array.from(colorsWas).sort(), 'filterTopDefectsWas', 'COLOR');
            buildMultiSelect('ms_slicer_buyer_area', ['SEWING', 'FINISHING', 'WASHING'], 'updateBuyerSlicer');
            buildMultiSelect('ms_slicer_buyer_line', Array.from(allLines).sort(), 'triggerRenderBuyerLine');
            buildMultiSelect('ms_slicer_tdt_section', ['SEWING', 'FINISHING', 'WASHING'], 'updateTDTFiltersSection', 'ALL SECTION');
            updateTDTFilters('section');
            
            buildMultiSelect('ms_slicer_daily_line', sortedSewLines, 'renderDailyLineChart', 'ALL LINES');
            buildMultiSelect('ms_slicer_daily_buyer', Array.from(buyersSew).sort(), 'renderDailyLineChart', 'ALL BUYERS');
            buildMultiSelect('ms_slicer_daily_style', Array.from(stylesSew).sort(), 'renderDailyLineChart', 'ALL STYLES');
        }

        window.updateTDTFiltersSection = () => updateTDTFilters('section');
        window.updateTDTFiltersArea = () => updateTDTFilters('area');

        function updateTDTFilters(level) {
            let sections = getMultiValues('ms_slicer_tdt_section');
            if (sections.length === 0 || sections.includes('ALL')) sections = ['SEWING', 'FINISHING', 'WASHING'];

            let areaSet = new Set();
            globalDefects.forEach(r => {
                if (sections.includes(r.area_source)) {
                    let partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                    if (partName) areaSet.add(partName);
                }
            });

            if (level === 'section') {
                let sortedAreas = Array.from(areaSet).sort();
                buildMultiSelect('ms_slicer_tdt_area', sortedAreas, 'updateTDTFiltersArea', 'ALL AREA');
                buildMultiSelect('ms_slicer_tdt_defect', [], 'renderTopDefectTrendChart', 'ALL DEFECTS');
            }

            let areas = getMultiValues('ms_slicer_tdt_area');
            let isAllArea = areas.length === 0 || areas.includes('ALL');

            let defectSet = new Set();
            globalDefects.forEach(r => {
                if (sections.includes(r.area_source)) {
                    let partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                    if (isAllArea || areas.includes(partName)) {
                        let typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";
                        defectSet.add(typeName);
                    }
                }
            });

            if (level === 'section' || level === 'area') {
                let sortedDefects = Array.from(defectSet).sort();
                buildMultiSelect('ms_slicer_tdt_defect', sortedDefects, 'renderTopDefectTrendChart', 'ALL DEFECTS');
            }

            renderTopDefectTrendChart();
        }

        function parseRowData(row, tipe) {
            const isSewing = row.area_source === 'SEWING';
            let insp = 0, def = 0, good = 0;
            if (isSewing) {
                if (tipe === 'TLS') {
                    insp = parseInt(row.inspect_tls !== undefined ? row.inspect_tls : row.inspect) || 0;
                    def = parseInt(row.defect_tls !== undefined ? row.defect_tls : row.defect) || 0;
                    good = insp - def;
                } else {
                    insp = parseInt(row.inspect_100 !== undefined ? row.inspect_100 : row.inspect) || 0;
                    def = parseInt(row.defect_100 !== undefined ? row.defect_100 : row.defect) || 0;
                    good = parseInt(row.qty_prod !== undefined ? row.qty_prod : row.good) || 0;
                }
            } else {
                insp = parseInt(row.inspect) || 0;
                def = parseInt(row.defect) || 0;
                good = parseInt(row.good) || 0;
            }
            return { insp: Math.max(0, insp), def: Math.max(0, def), good: Math.max(0, good) };
        }
        function getDiffLabel(startDate, endDate, diffDays) {
            if (diffDays === 1) {
                const d = new Date(startDate);
                const dow = d.getDay();
                if (dow === 1) return "Last Saturday";
                return "Yesterday";
            } else if (diffDays === 7) return "Last Week";
            else if (diffDays >= 28 && diffDays <= 31) return "Last Month";
            else if (diffDays >= 365) return "Last Year";
            return `Prev ${diffDays} Days`;
        }
        function renderSubtext(id, curr, prev, inverse = false, diffLabel = "Prev Period") {
            const el = document.getElementById(id);
            if (!prev || prev === 0) { el.innerHTML = `<span class="trend-neutral">-- vs ${diffLabel}</span>`; return; }
            const diff = curr - prev;
            const pct = Math.abs((diff / prev) * 100).toFixed(1);
            let trend = 'trend-neutral'; let icon = '•';
            if (diff > 0) { trend = inverse ? 'trend-down' : 'trend-up'; icon = '▲'; }
            else if (diff < 0) { trend = inverse ? 'trend-up' : 'trend-down'; icon = '▼'; }
            el.innerHTML = `<span class="${trend}">${icon} ${Math.abs(diff).toLocaleString('en-US')} (${pct}%)</span> <span style="color: var(--text-sub); font-weight: 600;">vs ${diffLabel}</span>`;
        }

        function processDashboardData(startDate, endDate) {
            const tipeData = document.getElementById('f_tipe').value;
            const dEnd = new Date(endDate);
            const dStart = new Date(startDate);
            const diffDays = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
            const diffLabel = getDiffLabel(startDate, endDate, diffDays);
            const fAreas = getMultiValues('ms_f_area');
            if (fAreas.includes('WASHING') && !fAreas.includes('FINISHING') && !fAreas.includes('ALL')) {
                document.getElementById('title_fin_perf').innerText = 'EACH BUYER/STYLE PERFORMANCE (WASHING)';
            } else {
                document.getElementById('title_fin_perf').innerText = 'EACH BUYER/STYLE PERFORMANCE (FINISHING)';
            }
            let tInsp = 0, tDef = 0, tGood = 0;
            let pInsp = 0, pDef = 0, pGood = 0;
            let trendMap = {};
            let areaMap = { SEWING: { i: 0, d: 0 }, FINISHING: { i: 0, d: 0 }, WASHING: { i: 0, d: 0 } };
            globalData.forEach(row => {
                const { insp, def, good } = parseRowData(row, tipeData);
                const dDate = row.tanggal;
                const area = row.area_source;
                tInsp += insp; tDef += def; tGood += good;
                areaMap[area].i += insp;
                areaMap[area].d += def;
                if (!trendMap[dDate]) trendMap[dDate] = { SEWING: { i: 0, d: 0 }, FINISHING: { i: 0, d: 0 }, WASHING: { i: 0, d: 0 } };
                trendMap[dDate][area].i += insp;
                trendMap[dDate][area].d += def;
            });
            prevGlobalData.forEach(row => {
                const { insp, def, good } = parseRowData(row, tipeData);
                pInsp += insp; pDef += def; pGood += good;
            });
            document.getElementById('kpi_insp').innerHTML = tInsp.toLocaleString('en-US') + '<span style="font-size: 14px; font-weight: 700; margin-left: 6px; color: var(--text-sub);">PCS</span>';
            document.getElementById('kpi_good').innerHTML = tGood.toLocaleString('en-US') + '<span style="font-size: 14px; font-weight: 700; margin-left: 6px; color: var(--text-sub);">PCS</span>';
            document.getElementById('kpi_def').innerHTML = tDef.toLocaleString('en-US') + '<span style="font-size: 14px; font-weight: 700; margin-left: 6px; color: var(--text-sub);">PCS</span>';
            const cRate = tInsp > 0 ? (tDef / tInsp) * 100 : 0;
            document.getElementById('kpi_rate').innerText = cRate.toFixed(2) + "%";
            renderSubtext('kpi_sub_insp', tInsp, pInsp, false, diffLabel);
            renderSubtext('kpi_sub_good', tGood, pGood, false, diffLabel);
            renderSubtext('kpi_sub_def', tDef, pDef, true, diffLabel);
            const pRate = pInsp > 0 ? (pDef / pInsp) * 100 : 0;
            const rEl = document.getElementById('kpi_sub_rate');
            if (pInsp === 0) rEl.innerHTML = `<span class="trend-neutral">-- vs ${diffLabel}</span>`;
            else {
                const rateDiff = cRate - pRate;
                let trend = rateDiff > 0 ? 'trend-down' : (rateDiff < 0 ? 'trend-up' : 'trend-neutral');
                let icon = rateDiff > 0 ? '▲' : (rateDiff < 0 ? '▼' : '•');
                rEl.innerHTML = `<span class="${trend}">${icon} ${Math.abs(rateDiff).toFixed(2)}%</span> <span style="color: var(--text-sub); font-weight: 600;">vs ${diffLabel}</span>`;
            }

            window.globalTrendData = {
                datesRaw: Object.keys(trendMap).sort(),
                trendMap: trendMap,
                diffDays: diffDays
            };

            renderBuyerLineCharts(tipeData);
            renderVolumeChart();
            renderSewingPerfChart();
            renderDailyLineChart();
            renderFinishingPerfChart();
            renderTrendChart();
            window.lastAreaMap = areaMap;
            const sewAvg = areaMap.SEWING.i > 0 ? (areaMap.SEWING.d / areaMap.SEWING.i) * 100 : 0;
            const finAvg = areaMap.FINISHING.i > 0 ? (areaMap.FINISHING.d / areaMap.FINISHING.i) * 100 : 0;
            const wasAvg = areaMap.WASHING.i > 0 ? (areaMap.WASHING.d / areaMap.WASHING.i) * 100 : 0;
            document.getElementById('score_avg_sew').innerText = sewAvg.toFixed(2) + '%';
            document.getElementById('score_avg_fin').innerText = finAvg.toFixed(2) + '%';
            document.getElementById('score_avg_was').innerText = wasAvg.toFixed(2) + '%';
            window.triggerRenderAvgSec();
            filterTopDefects('SEWING'); filterTopDefects('FINISHING'); filterTopDefects('WASHING');
            renderTopDefectTrendChart();
        }
        function renderTopDefectTrendChart() {
            const tipeData = document.getElementById('f_tipe').value;
            const forecastMode = window.chartForecastState['top_def_trend'] ? 'ON' : 'OFF';

            const areas = ['SEWING', 'FINISHING', 'WASHING'];
            const activeFilters = getMultiValues('ms_f_area');
            const targetAreas = areas.filter(a => activeFilters.includes('ALL') || activeFilters.includes(a));

            let tdtSections = getMultiValues('ms_slicer_tdt_section');
            let tdtAreas = getMultiValues('ms_slicer_tdt_area');
            let tdtDefects = getMultiValues('ms_slicer_tdt_defect');
            const isAllTdtSection = tdtSections.length === 0 || tdtSections.includes('ALL');
            const isAllTdtArea = tdtAreas.length === 0 || tdtAreas.includes('ALL');
            const isAllTdtDefect = tdtDefects.length === 0 || tdtDefects.includes('ALL');

            let dailyData = {};

            globalData.forEach(r => {
                const p = parseRowData(r, tipeData);
                if (!dailyData[r.tanggal]) {
                    dailyData[r.tanggal] = { SEWING: { i: 0, d: 0 }, FINISHING: { i: 0, d: 0 }, WASHING: { i: 0, d: 0 } };
                }
                if (dailyData[r.tanggal][r.area_source]) {
                    dailyData[r.tanggal][r.area_source].i += p.insp;
                }
            });

            globalDefects.forEach(r => {
                if (!dailyData[r.tanggal]) return;
                let area = r.area_source;
                if (!dailyData[r.tanggal][area]) return;

                if (!isAllTdtSection && !tdtSections.includes(area)) return;

                let partName = (r.area && r.area !== "-") ? r.area.toString().toUpperCase().trim() : "";
                let typeName = (r.jenis && r.jenis !== "-") ? r.jenis.toString().toUpperCase().trim() : "OTHERS";

                if (!isAllTdtArea && !tdtAreas.includes(partName)) return;
                if (!isAllTdtDefect && !tdtDefects.includes(typeName)) return;

                let kat = (r.kategori || "").toString().toUpperCase().trim();
                let qty = 0;

                if (area === 'SEWING') {
                    let isSewingDefect = (kat === 'SEWING' || kat === 'SEW' || kat === '');
                    if (!isSewingDefect) return;
                    qty = tipeData === 'TLS' ? (parseInt(r.qty_tls) || 0) : (parseInt(r.qty_100) || 0);
                } else if (area === 'FINISHING') {
                    if (kat !== 'FINISHING' && kat !== 'FIN') return;
                    qty = parseInt(r.qty) || 0;
                } else if (area === 'WASHING') {
                    if (kat !== 'WASHING' && kat !== 'WAS') return;
                    qty = parseInt(r.qty) || 0;
                }
                dailyData[r.tanggal][area].d += qty;
            });

            let datesRaw = Object.keys(dailyData).sort();
            let datesFmt = datesRaw.map(d => formatShortDate(d));
            let diffDays = window.globalTrendData ? window.globalTrendData.diffDays : 3;
            let futureDatesFmt = [];

            if (forecastMode === 'ON' && datesRaw.length > 0) {
                let lastDate = new Date(datesRaw[datesRaw.length - 1]);
                for (let i = 1; i <= diffDays; i++) {
                    lastDate.setDate(lastDate.getDate() + 1);
                    let m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    futureDatesFmt.push(`${lastDate.getDate()} ${m[lastDate.getMonth()]} (Est)`);
                }
            }

            const allDatesFmt = forecastMode === 'ON' ? datesFmt.concat(futureDatesFmt) : datesFmt;
            let isDark = document.body.classList.contains('dark-mode');
            const colorMap = {
                'SEWING': isDark ? '#60a5fa' : '#0f172a',
                'FINISHING': isDark ? '#f59e0b' : '#d97706',
                'WASHING': isDark ? '#34d399' : '#059669'
            };
            let datasets = [];

            let finalTargetAreas = targetAreas.filter(a => isAllTdtSection || tdtSections.includes(a));

            finalTargetAreas.forEach((area) => {
                let data = datesRaw.map(d => {
                    let insp = dailyData[d][area].i;
                    let def = dailyData[d][area].d;
                    return insp > 0 ? parseFloat(((def / insp) * 100).toFixed(2)) : 0;
                });
                let padData = forecastMode === 'ON' ? [...data, ...Array(diffDays).fill(null)] : data;

                datasets.push({
                    label: area.charAt(0) + area.slice(1).toLowerCase(),
                    data: padData,
                    borderColor: colorMap[area],
                    backgroundColor: colorMap[area],
                    fill: false, tension: 0.1, borderWidth: 3, pointRadius: 4,
                    datalabels: {
                        color: colorMap[area],
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderRadius: 2, padding: 2
                    }
                });

                if (forecastMode === 'ON' && data.length > 0) {
                    let fData = calculateHoltsForecast(data, 0.4, 0.3, diffDays);
                    let padFData = [...Array(data.length > 0 ? data.length - 1 : 0).fill(null), data.length > 0 ? data[data.length - 1] : null, ...fData];
                    datasets.push({
                        label: area.charAt(0) + area.slice(1).toLowerCase() + ' Forecast',
                        data: padFData,
                        borderColor: colorMap[area],
                        backgroundColor: colorMap[area],
                        fill: false, tension: 0.1, borderWidth: 2, borderDash: [5, 5], pointRadius: 3,
                        datalabels: {
                            display: true,
                            align: 'top',
                            offset: 3,
                            clip: false,
                            color: colorMap[area],
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            borderRadius: 2,
                            padding: 2,
                            font: { weight: 'bold', size: 9 },
                            formatter: (val) => val > 0 ? val + '%' : ''
                        }
                    });
                }
            });

            chartInstances.topDefTrend._datesRaw = datesRaw;
            chartInstances.topDefTrend.data = { labels: allDatesFmt, datasets: datasets };
            chartInstances.topDefTrend.update();
        }

        function renderTrendChart() {
            if (!window.globalTrendData) return;
            let datesRaw = window.globalTrendData.datesRaw;
            let trendMap = window.globalTrendData.trendMap;
            let diffDays = window.globalTrendData.diffDays;

            const forecastMode = window.chartForecastState['trend'] ? 'ON' : 'OFF';
            const datesFmt = datesRaw.map(d => formatShortDate(d));
            let futureDatesFmt = [];

            if (forecastMode === 'ON' && datesRaw.length > 0) {
                let lastDate = new Date(datesRaw[datesRaw.length - 1]);
                for (let i = 1; i <= diffDays; i++) {
                    lastDate.setDate(lastDate.getDate() + 1);
                    let m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    futureDatesFmt.push(`${lastDate.getDate()} ${m[lastDate.getMonth()]} (Est)`);
                }
            }
            const allDatesFmt = forecastMode === 'ON' ? datesFmt.concat(futureDatesFmt) : datesFmt;
            const areaFilters = getMultiValues('ms_f_area');
            const navyColor = getNavyColor();
            const isDark = document.body.classList.contains('dark-mode');
            let trendDatasets = [];
            window.trendDatesRaw = datesRaw;
            window.trendMap = trendMap;
            if (areaFilters.includes('ALL') || areaFilters.includes('SEWING')) {
                let hData = datesRaw.map(d => trendMap[d].SEWING.i > 0 ? +((trendMap[d].SEWING.d / trendMap[d].SEWING.i) * 100).toFixed(2) : 0);
                let padH = forecastMode === 'ON' ? [...hData, ...Array(diffDays).fill(null)] : hData;
                trendDatasets.push({ label: 'Sewing (%)', data: padH, borderColor: navyColor, backgroundColor: navyColor, fill: false, tension: 0.1, borderWidth: 3, pointRadius: 4 });
                if (forecastMode === 'ON') {
                    let fData = calculateHoltsForecast(hData, 0.4, 0.3, diffDays);
                    let padF = [...Array(hData.length > 0 ? hData.length - 1 : 0).fill(null), hData.length > 0 ? hData[hData.length - 1] : null, ...fData];
                    trendDatasets.push({ label: 'Sewing Forecast', data: padF, borderColor: navyColor, backgroundColor: navyColor, fill: false, tension: 0.1, borderWidth: 2, pointRadius: 3, borderDash: [5, 5], datalabels: { display: true, align: 'top', offset: 3, clip: false, color: navyColor, backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 9 }, formatter: (val) => val > 0 ? val + '%' : '' } });
                }
            }
            if (areaFilters.includes('ALL') || areaFilters.includes('FINISHING')) {
                let hData = datesRaw.map(d => trendMap[d].FINISHING.i > 0 ? +((trendMap[d].FINISHING.d / trendMap[d].FINISHING.i) * 100).toFixed(2) : 0);
                let padH = forecastMode === 'ON' ? [...hData, ...Array(diffDays).fill(null)] : hData;
                trendDatasets.push({ label: 'Finishing (%)', data: padH, borderColor: '#d97706', backgroundColor: '#d97706', tension: 0.1, borderWidth: 3, pointRadius: 4 });
                if (forecastMode === 'ON') {
                    let fData = calculateHoltsForecast(hData, 0.4, 0.3, diffDays);
                    let padF = [...Array(hData.length > 0 ? hData.length - 1 : 0).fill(null), hData.length > 0 ? hData[hData.length - 1] : null, ...fData];
                    trendDatasets.push({ label: 'Finishing Forecast', data: padF, borderColor: '#d97706', backgroundColor: '#d97706', tension: 0.1, borderWidth: 2, pointRadius: 3, borderDash: [5, 5], datalabels: { display: true, align: 'top', offset: 3, clip: false, color: '#d97706', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 9 }, formatter: (val) => val > 0 ? val + '%' : '' } });
                }
            }
            if (areaFilters.includes('ALL') || areaFilters.includes('WASHING')) {
                let hData = datesRaw.map(d => trendMap[d].WASHING.i > 0 ? +((trendMap[d].WASHING.d / trendMap[d].WASHING.i) * 100).toFixed(2) : 0);
                let padH = forecastMode === 'ON' ? [...hData, ...Array(diffDays).fill(null)] : hData;
                trendDatasets.push({ label: 'Washing (%)', data: padH, borderColor: '#059669', backgroundColor: '#059669', tension: 0.1, borderWidth: 3, pointRadius: 4 });
                if (forecastMode === 'ON') {
                    let fData = calculateHoltsForecast(hData, 0.4, 0.3, diffDays);
                    let padF = [...Array(hData.length > 0 ? hData.length - 1 : 0).fill(null), hData.length > 0 ? hData[hData.length - 1] : null, ...fData];
                    trendDatasets.push({ label: 'Washing Forecast', data: padF, borderColor: '#059669', backgroundColor: '#059669', tension: 0.1, borderWidth: 2, pointRadius: 3, borderDash: [5, 5], datalabels: { display: true, align: 'top', offset: 3, clip: false, color: '#059669', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 9 }, formatter: (val) => val > 0 ? val + '%' : '' } });
                }
            }
            updateTrendChart(allDatesFmt, trendDatasets);
        }
        function renderVolumeChart() {
            const tipeData = document.getElementById('f_tipe').value;
            const forecastMode = window.chartForecastState['volume'] ? 'ON' : 'OFF';

            const dStart = new Date(document.getElementById('f_start').value);
            const dEnd = new Date(document.getElementById('f_end').value);
            const diffDays = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
            const targetAreas = getMultiValues('ms_slicer_vol_area');
            let volMap = {};
            globalData.forEach(row => {
                const area = row.area_source;
                if (!targetAreas.includes('ALL') && !targetAreas.includes(area)) return;
                const { def, good } = parseRowData(row, tipeData);
                const dDate = row.tanggal;
                if (!volMap[dDate]) volMap[dDate] = { SEWING: { g: 0, d: 0 }, FINISHING: { g: 0, d: 0 }, WASHING: { g: 0, d: 0 } };
                volMap[dDate][area].g += good;
                volMap[dDate][area].d += def;
            });
            const datesRaw = Object.keys(volMap).sort();
            const datesFmt = datesRaw.map(d => formatShortDate(d));

            let futureDatesFmt = [];
            if (forecastMode === 'ON' && datesRaw.length > 0) {
                let lastDate = new Date(datesRaw[datesRaw.length - 1]);
                for (let i = 1; i <= diffDays; i++) {
                    lastDate.setDate(lastDate.getDate() + 1);
                    let m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    futureDatesFmt.push(`${lastDate.getDate()} ${m[lastDate.getMonth()]} (Est)`);
                }
            }
            const allDatesFmt = forecastMode === 'ON' ? datesFmt.concat(futureDatesFmt) : datesFmt;
            const navyColor = getNavyColor();
            const isDark = document.body.classList.contains('dark-mode');
            const goldColor = isDark ? '#f59e0b' : '#d97706';
            let ds = [];
            const maxBar = 40;
            if (targetAreas.includes('ALL') || targetAreas.includes('SEWING')) {
                let hGood = datesRaw.map(d => volMap[d].SEWING.g);
                let hDef = datesRaw.map(d => volMap[d].SEWING.d);
                let padGood = forecastMode === 'ON' ? [...hGood, ...Array(diffDays).fill(null)] : hGood;
                let padDef = forecastMode === 'ON' ? [...hDef, ...Array(diffDays).fill(null)] : hDef;

                ds.push({ label: 'Sewing Good', data: padGood, backgroundColor: navyColor, stack: 'StackSew', maxBarThickness: maxBar });
                ds.push({ label: 'Defect', data: padDef, backgroundColor: '#dc2626', stack: 'StackSew', maxBarThickness: maxBar, datalabels: { display: true, align: 'end', anchor: 'end', offset: 0.5, clip: false, color: '#dc2626', font: { size: 11, weight: 'bold' }, formatter: (val) => (!val || val === 0) ? '' : val } });

                if (forecastMode === 'ON' && hGood.length > 0) {
                    let fGood = calculateHoltsForecast(hGood, 0.4, 0.3, diffDays);
                    let padFGood = [...Array(hGood.length).fill(null), ...fGood];
                    ds.push({
                        type: 'line',
                        label: 'Sewing Good Fcst',
                        data: padFGood,
                        borderColor: navyColor,
                        backgroundColor: navyColor,
                        borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.1, pointRadius: 3,
                        datalabels: {
                            display: true,
                            align: 'top',
                            color: navyColor,
                            font: { weight: 'bold', size: 9 },
                            formatter: (val) => val > 0 ? Math.round(val).toLocaleString('en-US') : ''
                        }
                    });
                }
            }
            if (targetAreas.includes('ALL') || targetAreas.includes('FINISHING')) {
                let hGood = datesRaw.map(d => volMap[d].FINISHING.g);
                let hDef = datesRaw.map(d => volMap[d].FINISHING.d);
                let padGood = forecastMode === 'ON' ? [...hGood, ...Array(diffDays).fill(null)] : hGood;
                let padDef = forecastMode === 'ON' ? [...hDef, ...Array(diffDays).fill(null)] : hDef;

                ds.push({ label: 'Finishing Good', data: padGood, backgroundColor: '#d97706', stack: 'StackFin', maxBarThickness: maxBar });
                ds.push({ label: 'Defect', data: padDef, backgroundColor: '#dc2626', stack: 'StackFin', maxBarThickness: maxBar, datalabels: { display: true, align: 'end', anchor: 'end', offset: 0.5, clip: false, color: '#dc2626', font: { size: 11, weight: 'bold' }, formatter: (val) => (!val || val === 0) ? '' : val } });

                if (forecastMode === 'ON' && hGood.length > 0) {
                    let fGood = calculateHoltsForecast(hGood, 0.4, 0.3, diffDays);
                    let padFGood = [...Array(hGood.length).fill(null), ...fGood];
                    ds.push({
                        type: 'line',
                        label: 'Finishing Good Fcst',
                        data: padFGood,
                        borderColor: '#d97706',
                        backgroundColor: '#d97706',
                        borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.1, pointRadius: 3,
                        datalabels: {
                            display: true,
                            align: 'top',
                            color: '#d97706',
                            font: { weight: 'bold', size: 9 },
                            formatter: (val) => val > 0 ? Math.round(val).toLocaleString('en-US') : ''
                        }
                    });
                }
            }
            if (targetAreas.includes('ALL') || targetAreas.includes('WASHING')) {
                let hGood = datesRaw.map(d => volMap[d].WASHING.g);
                let hDef = datesRaw.map(d => volMap[d].WASHING.d);
                let padGood = forecastMode === 'ON' ? [...hGood, ...Array(diffDays).fill(null)] : hGood;
                let padDef = forecastMode === 'ON' ? [...hDef, ...Array(diffDays).fill(null)] : hDef;

                ds.push({ label: 'Washing Good', data: padGood, backgroundColor: '#059669', stack: 'StackWas', maxBarThickness: maxBar });
                ds.push({ label: 'Defect', data: padDef, backgroundColor: '#dc2626', stack: 'StackWas', maxBarThickness: maxBar, datalabels: { display: true, align: 'end', anchor: 'end', offset: 0.5, clip: false, color: '#dc2626', font: { size: 11, weight: 'bold' }, formatter: (val) => (!val || val === 0) ? '' : val } });

                if (forecastMode === 'ON' && hGood.length > 0) {
                    let fGood = calculateHoltsForecast(hGood, 0.4, 0.3, diffDays);
                    let padFGood = [...Array(hGood.length).fill(null), ...fGood];
                    ds.push({
                        type: 'line',
                        label: 'Washing Good Fcst',
                        data: padFGood,
                        borderColor: '#059669',
                        backgroundColor: '#059669',
                        borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.1, pointRadius: 3,
                        datalabels: {
                            display: true,
                            align: 'top',
                            color: '#059669',
                            font: { weight: 'bold', size: 9 },
                            formatter: (val) => val > 0 ? Math.round(val).toLocaleString('en-US') : ''
                        }
                    });
                }
            }
            
            try {
                let hInspect = datesRaw.map(d => {
                    let total = 0;
                    if (targetAreas.includes('ALL') || targetAreas.includes('SEWING')) total += (volMap[d].SEWING.g || 0) + (volMap[d].SEWING.d || 0);
                    if (targetAreas.includes('ALL') || targetAreas.includes('FINISHING')) total += (volMap[d].FINISHING.g || 0) + (volMap[d].FINISHING.d || 0);
                    if (targetAreas.includes('ALL') || targetAreas.includes('WASHING')) total += (volMap[d].WASHING.g || 0) + (volMap[d].WASHING.d || 0);
                    return total;
                });
                let padInspect = forecastMode === 'ON' ? [...hInspect, ...Array(diffDays).fill(null)] : hInspect;
                ds.push({
                    type: 'line',
                    label: 'Inspect',
                    data: padInspect,
                    borderColor: goldColor,
                    backgroundColor: goldColor,
                    borderWidth: 2,
                    tension: 0.1,
                    fill: false,
                    pointRadius: 3,
                    datalabels: {
                        display: true,
                        align: 'top',
                        anchor: 'end',
                        offset: 3,
                        color: goldColor,
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        borderRadius: 2,
                        padding: 2,
                        font: { weight: 'bold', size: 9 },
                        formatter: (val) => val > 0 ? Math.round(val).toLocaleString('en-US') : ''
                    }
                });
                if (forecastMode === 'ON' && hInspect.length > 0) {
                    try {
                        let fInspect = calculateHoltsForecast(hInspect, 0.4, 0.3, diffDays);
                        let padFInspect = [...Array(hInspect.length).fill(null), ...fInspect];
                        ds.push({
                            type: 'line',
                            label: 'Inspect Fcst',
                            data: padFInspect,
                            borderColor: goldColor,
                            backgroundColor: goldColor,
                            borderWidth: 2,
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.1,
                            pointRadius: 3,
                            datalabels: {
                                display: true,
                                align: 'top',
                                color: goldColor,
                                font: { weight: 'bold', size: 9 },
                                formatter: (val) => val > 0 ? Math.round(val).toLocaleString('en-US') : ''
                            }
                        });
                    } catch (e) { console.warn('inspect forecast failed', e); }
                }
            } catch (e) {
                console.warn('inspect series build failed', e);
            }
            chartInstances.volume.data = { labels: allDatesFmt, datasets: ds };
            chartInstances.volume._rawDates = datesRaw;
            chartInstances.volume._volMap = volMap;
            chartInstances.volume.update();
        }

        function renderSewingPerfChart() {
            const tipeData = document.getElementById('f_tipe').value;
            const lineFilters = getMultiValues('ms_slicer_sew_perf');
            const sortBy = document.getElementById('sort_sew_perf').value;
            let lineMap = {};
            globalData.forEach(row => {
                if (row.area_source !== 'SEWING') return;
                const rawLine = row.line.trim();
                if (lineFilters.includes("ALL") || lineFilters.includes(rawLine)) {
                    const { good, def, insp } = parseRowData(row, tipeData);
                    if (!lineMap[rawLine]) lineMap[rawLine] = { g: 0, d: 0, i: 0 };
                    lineMap[rawLine].g += good;
                    lineMap[rawLine].d += def;
                    lineMap[rawLine].i += insp;
                }
            });
            let lineArray = Object.keys(lineMap).map(l => ({ name: l, g: lineMap[l].g, d: lineMap[l].d, i: lineMap[l].i, rate: lineMap[l].i > 0 ? (lineMap[l].d / lineMap[l].i) * 100 : 0 }));
            lineArray.sort((a, b) => {
                if (sortBy === 'rate_desc') return b.rate - a.rate;
                if (sortBy === 'rate_asc') return a.rate - b.rate;
                if (sortBy === 'good_desc') return b.g - a.g;
                if (sortBy === 'good_asc') return a.g - b.g;
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            });
            const isDark = document.body.classList.contains('dark-mode');
            const navyColor = getNavyColor();
            chartInstances.sewPerf.data = {
                labels: lineArray.map(item => item.name),
                datasets: [
                    { type: 'line', label: 'Defect Rate (%)', yAxisID: 'y1', data: lineArray.map(item => item.rate.toFixed(2)), borderColor: '#dc2626', backgroundColor: '#dc2626', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 4, datalabels: { display: true, align: 'top', offset: 3, clip: false, color: '#dc2626', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 10 }, formatter: (val) => val > 0 ? val + '%' : '' } },
                    { type: 'line', label: 'Inspect', yAxisID: 'y', data: lineArray.map(item => item.i), borderColor: isDark ? '#f59e0b' : '#d97706', backgroundColor: isDark ? '#f59e0b' : '#d97706', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 3, datalabels: { display: true, align: 'top', anchor: 'end', offset: 3, color: isDark ? '#f59e0b' : '#d97706', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 10 }, formatter: (val) => val > 0 ? val : '' } },
                    { type: 'bar', label: 'Good', yAxisID: 'y', data: lineArray.map(item => item.g > 0 ? item.g : null), backgroundColor: navyColor, stack: 'StackPerf', maxBarThickness: 40, datalabels: { display: true, clip: false, color: '#ffffff', rotation: 0, align: 'center', anchor: 'center', font: { size: 10, weight: 'bold' }, formatter: (val) => (val !== null && val > 0) ? val.toLocaleString('en-US') : '' } },
                    { type: 'bar', label: 'Defect', yAxisID: 'y', data: lineArray.map(item => item.d > 0 ? item.d : null), backgroundColor: '#dc2626', stack: 'StackPerf', maxBarThickness: 40, datalabels: { display: true, align: 'end', anchor: 'end', offset: 4, clip: false, color: '#dc2626', backgroundColor: (document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff'), borderRadius: 2, padding: 2, rotation: 0, font: { size: 10, weight: 'bold' }, formatter: (val) => (val !== null && val > 0) ? val.toLocaleString('en-US') : '' } }
                ]
            };
            chartInstances.sewPerf._lineArray = lineArray;
            chartInstances.sewPerf.update();
        }

        window.renderDailyLineChart = function () {
            const globalAreas = getMultiValues('ms_f_area');
            if (!globalAreas.includes('ALL') && !globalAreas.includes('SEWING')) {
                chartInstances.dailyLine.data = { labels: [], datasets: [] };
                chartInstances.dailyLine.update();
                return;
            }
            const tipeData = document.getElementById('f_tipe').value;
            const lineFilters = getMultiValues('ms_slicer_daily_line');
            const buyerFilters = getMultiValues('ms_slicer_daily_buyer');
            const styleFilters = getMultiValues('ms_slicer_daily_style');
            const forecastMode = window.chartForecastState['daily'] ? 'ON' : 'OFF';

            const dStart = new Date(document.getElementById('f_start').value);
            const dEnd = new Date(document.getElementById('f_end').value);
            const diffDays = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1;
            let dMap = {};
            globalData.forEach(row => {
                if (row.area_source !== 'SEWING') return;
                const rawLine = row.line.trim();
                if (!lineFilters.includes("ALL") && !lineFilters.includes(rawLine)) return;
                if (!buyerFilters.includes("ALL") && !buyerFilters.includes(row.buyer)) return;
                if (!styleFilters.includes("ALL") && !styleFilters.includes(row.style)) return;
                const { good, def, insp } = parseRowData(row, tipeData);
                const dDate = row.tanggal;
                if (!dMap[dDate]) dMap[dDate] = { g: 0, d: 0, i: 0 };
                dMap[dDate].g += good;
                dMap[dDate].d += def;
                dMap[dDate].i += insp;
            });
            const datesRaw = Object.keys(dMap).sort();
            const datesFmt = datesRaw.map(d => formatShortDate(d));

            let futureDatesFmt = [];
            if (forecastMode === 'ON' && datesRaw.length > 0) {
                let lastDate = new Date(datesRaw[datesRaw.length - 1]);
                for (let i = 1; i <= diffDays; i++) {
                    lastDate.setDate(lastDate.getDate() + 1);
                    let m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    futureDatesFmt.push(`${lastDate.getDate()} ${m[lastDate.getMonth()]} (Est)`);
                }
            }
            const allDatesFmt = forecastMode === 'ON' ? datesFmt.concat(futureDatesFmt) : datesFmt;
            let hRate = datesRaw.map(d => dMap[d].i > 0 ? +((dMap[d].d / dMap[d].i) * 100).toFixed(2) : 0);
            let hInsp = datesRaw.map(d => dMap[d].i);
            let hGood = datesRaw.map(d => dMap[d].g);
            let hDef = datesRaw.map(d => dMap[d].d);
            let padRate = forecastMode === 'ON' ? [...hRate, ...Array(diffDays).fill(null)] : hRate;
            let padInsp = forecastMode === 'ON' ? [...hInsp, ...Array(diffDays).fill(null)] : hInsp;
            let padGood = forecastMode === 'ON' ? [...hGood, ...Array(diffDays).fill(null)] : hGood;
            let padDef = forecastMode === 'ON' ? [...hDef, ...Array(diffDays).fill(null)] : hDef;
            const isDark = document.body.classList.contains('dark-mode');
            const navyColor = getNavyColor();

            let datasets = [
                { type: 'line', label: 'Defect Rate (%)', yAxisID: 'y1', data: padRate, borderColor: '#dc2626', backgroundColor: '#dc2626', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 4, datalabels: { display: true, align: 'top', offset: 3, clip: false, color: '#dc2626', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 10 }, formatter: (val) => val > 0 ? val + '%' : '' } },
                { type: 'line', label: 'Inspect', yAxisID: 'y', data: padInsp, borderColor: isDark ? '#f59e0b' : '#d97706', backgroundColor: isDark ? '#f59e0b' : '#d97706', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 3, datalabels: { display: true, align: 'top', anchor: 'end', offset: 3, color: isDark ? '#f59e0b' : '#d97706', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 10 }, formatter: (val) => val > 0 ? val : '' } },
                { type: 'bar', label: 'Good', yAxisID: 'y', data: padGood, backgroundColor: navyColor, stack: 'StackDL', maxBarThickness: 40, datalabels: { display: true, clip: false, color: '#ffffff', font: { size: 10, weight: 'bold' }, formatter: (val) => val > 0 ? val : '' } },
                { type: 'bar', label: 'Defect', yAxisID: 'y', data: padDef, backgroundColor: '#dc2626', stack: 'StackDL', maxBarThickness: 40, datalabels: { display: true, align: 'end', anchor: 'end', offset: 0.5, clip: false, color: '#dc2626', font: { size: 10, weight: 'bold' }, formatter: (val) => val > 0 ? val : '' } }
            ];
            if (forecastMode === 'ON' && hRate.length > 0) {
                let fRate = calculateHoltsForecast(hRate, 0.4, 0.3, diffDays);
                let padFRate = [...Array(hRate.length > 0 ? hRate.length - 1 : 0).fill(null), hRate.length > 0 ? hRate[hRate.length - 1] : null, ...fRate];
                datasets.push({ type: 'line', label: 'Forecast Rate (%)', yAxisID: 'y1', data: padFRate, borderColor: '#dc2626', backgroundColor: '#dc2626', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 3, borderDash: [5, 5], datalabels: { display: true, align: 'top', offset: 3, clip: false, color: '#dc2626', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 9 }, formatter: (val) => val > 0 ? val + '%' : '' } });
            }
            chartInstances.dailyLine.data = {
                labels: allDatesFmt,
                datasets: datasets
            };
            chartInstances.dailyLine._dMap = dMap;
            chartInstances.dailyLine._datesRaw = datesRaw;
            chartInstances.dailyLine.update();
        };
        
        function renderFinishingPerfChart() {
            const tipeData = document.getElementById('f_tipe').value;
            const bFilters = getMultiValues('ms_slicer_fin_perf_buyer');
            const sFilters = getMultiValues('ms_slicer_fin_perf_style');
            const sortByEl = document.getElementById('sort_fin_perf');
            const sortBy = sortByEl ? sortByEl.value : 'insp_desc';
            
            let bsMap = {};
            globalData.forEach(row => {
                if (row.area_source !== 'FINISHING' && row.area_source !== 'WASHING') return;
                if (!bFilters.includes("ALL") && !bFilters.includes(row.buyer)) return;
                if (!sFilters.includes("ALL") && !sFilters.includes(row.style)) return;
                const bs = `${row.buyer}|||${row.style}`;
                const { good, def, insp } = parseRowData(row, tipeData);
                if (!bsMap[bs]) bsMap[bs] = { g: 0, d: 0, i: 0 };
                bsMap[bs].g += good;
                bsMap[bs].d += def;
                bsMap[bs].i += insp;
            });
            const bsKeys = Object.keys(bsMap).sort((a, b) => {
                const rateA = bsMap[a].i > 0 ? (bsMap[a].d / bsMap[a].i) * 100 : 0;
                const rateB = bsMap[b].i > 0 ? (bsMap[b].d / bsMap[b].i) * 100 : 0;
                if (sortBy === 'rate_desc') return rateB - rateA;
                if (sortBy === 'rate_asc') return rateA - rateB;
                if (sortBy === 'good_desc') return bsMap[b].g - bsMap[a].g;
                if (sortBy === 'good_asc') return bsMap[a].g - bsMap[b].g;
                if (sortBy === 'insp_asc') return bsMap[a].i - bsMap[b].i;
                if (sortBy === 'name_asc') return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                return bsMap[b].i - bsMap[a].i;
            });
            const labelsArr = bsKeys.map(k => {
                let parts = k.split('|||');
                let b = parts[0].length > 12 ? parts[0].substring(0, 10) + ".." : parts[0];
                let s = parts[1].length > 12 ? parts[1].substring(0, 10) + ".." : parts[1];
                return [b, s];
            });
            const isDark = document.body.classList.contains('dark-mode');
            const navyColor = getNavyColor();
            chartInstances.finPerf.data = {
                labels: labelsArr,
                datasets: [
                    { type: 'line', label: 'Defect Rate (%)', yAxisID: 'y1', data: bsKeys.map(k => bsMap[k].i > 0 ? ((bsMap[k].d / bsMap[k].i) * 100).toFixed(2) : 0), borderColor: '#dc2626', backgroundColor: '#dc2626', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 4, datalabels: { display: true, align: 'top', offset: 3, clip: false, color: '#dc2626', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 10 }, formatter: (val) => val > 0 ? val + '%' : '' } },
                    { type: 'line', label: 'Inspect', yAxisID: 'y', data: bsKeys.map(k => bsMap[k].i), borderColor: isDark ? '#f59e0b' : '#d97706', backgroundColor: isDark ? '#f59e0b' : '#d97706', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 3, datalabels: { display: true, align: 'top', anchor: 'end', offset: 3, color: isDark ? '#f59e0b' : '#d97706', backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 2, padding: 2, font: { weight: 'bold', size: 10 }, formatter: (val) => val > 0 ? val : '' } },
                    { type: 'bar', label: 'Good', yAxisID: 'y', data: bsKeys.map(k => bsMap[k].g), backgroundColor: navyColor, stack: 'StackGood', maxBarThickness: 40, minBarLength: 15, datalabels: { display: true, clip: false, color: navyColor, rotation: 0, align: 'end', anchor: 'end', font: { size: 10, weight: 'bold' }, formatter: (val) => val > 0 ? val : '' } },
                    { type: 'bar', label: 'Defect', yAxisID: 'y', data: bsKeys.map(k => bsMap[k].d), backgroundColor: '#dc2626', stack: 'StackDef', maxBarThickness: 40, minBarLength: 15, datalabels: { display: true, align: 'end', anchor: 'end', offset: 4, clip: false, color: '#dc2626', rotation: 0, font: { size: 10, weight: 'bold' }, formatter: (val) => val > 0 ? val : '' } }
                ]
            };
            chartInstances.finPerf._bsKeys = bsKeys;
            chartInstances.finPerf.update();
        }

        function renderBuyerLineCharts(overrideTipe) {
            const tipeData = overrideTipe || document.getElementById('f_tipe').value;
            let buyerMap = {}; let lineMap = {};
            const bAreaFilters = getMultiValues('ms_slicer_buyer_area');
            const bLineFilters = getMultiValues('ms_slicer_buyer_line');

            globalData.forEach(row => {
                const { insp, def } = parseRowData(row, tipeData);
                const area = row.area_source;
                const rawLine = row.line;
                const bs = `${row.buyer}|||${row.style}`;

                if ((bAreaFilters.includes("ALL") || bAreaFilters.includes(area)) && (bLineFilters.includes("ALL") || bLineFilters.includes(rawLine))) {
                    if (!buyerMap[bs]) buyerMap[bs] = { i: 0, d: 0 };
                    buyerMap[bs].i += insp; buyerMap[bs].d += def;
                }
                if (area === 'SEWING' && rawLine && rawLine !== '-') {
                    const lineDisp = `LINE ${rawLine}`;
                    if (!lineMap[lineDisp]) lineMap[lineDisp] = { i: 0, d: 0 };
                    lineMap[lineDisp].i += insp; lineMap[lineDisp].d += def;
                }
            });

            const sortRates = (mapObj) => Object.entries(mapObj).filter(x => x[1].i >= 10).map(x => ({ name: x[0], rate: (x[1].d / x[1].i) * 100, def: x[1].d, insp: x[1].i })).sort((a, b) => b.rate - a.rate);

            const bData = sortRates(buyerMap).slice(0, 3);
            const container = document.getElementById('wrap_alert_cards');
            if (container) {
                if (bData.length === 0) {
                    container.innerHTML = `<div style="text-align:center; color: var(--text-sub); font-weight:700;">NO CRITICAL DATA (ALL SAFE)</div>`;
                } else {
                    let html = '';
                    bData.forEach((item, index) => {
                        let parts = item.name.split('|||');
                        let b = parts[0].length > 15 ? parts[0].substring(0, 15) + ".." : parts[0];
                        let s = parts[1].length > 15 ? parts[1].substring(0, 15) + ".." : parts[1];
                        html += `
                        <div class="alert-card" onclick="drillDownBuyerStyle('${escapeJsStr(item.name)}')" title="Click to see details">
                            <div class="alert-info">
                                <div class="alert-buyer">#${index + 1} - ${b}</div>
                                <div class="alert-style">STYLE: ${s}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="alert-rate">${item.rate.toFixed(2)}%</div>
                                <div class="alert-detail">${item.def} Def / ${item.insp} Insp</div>
                            </div>
                        </div>`;
                    });
                    container.innerHTML = html;
                }
            }
            updateVBarChart(chartInstances.line, sortRates(lineMap).slice(0, 10), '#dc2626');
        }

        function filterTopDefects(area) {
            const tipeData = document.getElementById('f_tipe').value;
            let chartObj;
            let lineFilters = [], buyerFilters = [], styleFilters = [], colorFilters = [], srcFilters = [];
            if (area === 'SEWING') { lineFilters = getMultiValues('ms_slicer_sew'); buyerFilters = getMultiValues('ms_slicer_sew_buyer'); styleFilters = getMultiValues('ms_slicer_sew_style'); srcFilters = getMultiValues('ms_slicer_sew_src'); chartObj = chartInstances.sew; }
            if (area === 'FINISHING') { buyerFilters = getMultiValues('ms_slicer_fin_buyer'); styleFilters = getMultiValues('ms_slicer_fin_style'); colorFilters = getMultiValues('ms_slicer_fin_color'); srcFilters = getMultiValues('ms_slicer_fin_src'); chartObj = chartInstances.fin; }
            if (area === 'WASHING') { lineFilters = getMultiValues('ms_slicer_was'); buyerFilters = getMultiValues('ms_slicer_was_buyer'); styleFilters = getMultiValues('ms_slicer_was_style'); colorFilters = getMultiValues('ms_slicer_was_color'); srcFilters = ['ALL']; chartObj = chartInstances.was; }

            let defMap = {};
            globalDefects.forEach(row => {
                if (srcFilters.includes("ALL") || srcFilters.includes(row.area_source)) {
                    let kat = (row.kategori || "").toString().toUpperCase().trim();

                    if (area === 'SEWING') {
                        let isSewingDefect = (kat === 'SEWING' || kat === 'SEW' || (row.area_source === 'SEWING' && kat === ''));
                        if (!isSewingDefect) return;
                        if (!lineFilters.includes("ALL") && !lineFilters.includes(row.line)) return;
                        if (!buyerFilters.includes("ALL") && !buyerFilters.includes(row.buyer)) return;
                        if (!styleFilters.includes("ALL") && !styleFilters.includes(row.style)) return;
                    }
                    else if (area === 'FINISHING') {
                        if (kat !== 'FINISHING' && kat !== 'FIN') return;
                        if (!buyerFilters.includes("ALL") && !buyerFilters.includes(row.buyer)) return;
                        if (!styleFilters.includes("ALL") && !styleFilters.includes(row.style)) return;
                        if (!colorFilters.includes("ALL") && !colorFilters.includes(row.color)) return;
                    }
                    else if (area === 'WASHING') {
                        if (kat !== 'WASHING' && kat !== 'WAS') return;
                        if (!lineFilters.includes("ALL") && !lineFilters.includes(row.line)) return;
                        if (!buyerFilters.includes("ALL") && !buyerFilters.includes(row.buyer)) return;
                        if (!styleFilters.includes("ALL") && !styleFilters.includes(row.style)) return;
                        if (!colorFilters.includes("ALL") && !colorFilters.includes(row.color)) return;
                    }

                    let qty = 0;
                    if (row.area_source === 'SEWING') qty = tipeData === 'TLS' ? (parseInt(row.qty_tls) || 0) : (parseInt(row.qty_100) || 0);
                    else qty = parseInt(row.qty) || 0;

                    const partName = (row.area && row.area !== "-") ? row.area.toString().toUpperCase().trim() : "";
                    const typeName = (row.jenis && row.jenis !== "-") ? row.jenis.toString().toUpperCase().trim() : "OTHERS";
                    const combinedName = partName ? `${partName}|||${typeName}` : typeName;

                    if (!defMap[combinedName]) defMap[combinedName] = 0;
                    defMap[combinedName] += qty;
                }
            });

            const top3Data = Object.entries(defMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
            let rankingColors = ['#0f172a', '#d97706', '#64748b'];
            if (document.body.classList.contains('dark-mode')) rankingColors = ['#60a5fa', '#f59e0b', '#94a3b8'];

            let mainTotalInspect = parseInt(document.getElementById('kpi_insp').innerText.replace(/[^0-9]/g, '')) || 0;

            chartObj._top3Keys = top3Data.map(x => x[0]);
            chartObj._area = area;
            chartObj.data = {
                labels: top3Data.map(x => {
                    if (x[0].includes('|||')) {
                        let p = x[0].split('|||');
                        let p1 = p[0].length > 15 ? p[0].substring(0, 13) + ".." : p[0];
                        let p2 = p[1].length > 15 ? p[1].substring(0, 13) + ".." : p[1];
                        return [p1, p2];
                    }
                    return x[0].length > 20 ? x[0].substring(0, 18) + ".." : x[0];
                }),
                datasets: [{ 
                    label: 'Qty (Pcs)', 
                    data: top3Data.map(x => x[1]), 
                    backgroundColor: rankingColors, 
                    borderRadius: 2, 
                    maxBarThickness: 50,
                    datalabels: {
                        formatter: (val) => {
                            let pct = mainTotalInspect > 0 ? ((val / mainTotalInspect) * 100).toFixed(2) : 0;
                            return `${val} (${pct}%)`;
                        }
                    }
                }]
            };
            chartObj.update();
        }
    
        function getChartTextColor() { return document.body.classList.contains('dark-mode') ? '#f8fafc' : '#0f172a'; }
        function getGridColor() { return document.body.classList.contains('dark-mode') ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)'; }
        function initEmptyCharts() {
            const tc = getChartTextColor(); const gc = getGridColor();
            Chart.defaults.color = tc; Chart.defaults.font.family = "'Inter', sans-serif";

            const zoomConfig = {
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: 'x'
                },
                pan: {
                    enabled: true,
                    mode: 'x'
                }
            };
            const trendOpts = {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { boxWidth: 7, boxHeight: 7, padding: 20, usePointStyle: true, color: tc } },
                    datalabels: {
                        display: true, align: 'right', anchor: 'center', offset: 3, clip: false,
                        backgroundColor: (ctx) => document.body.classList.contains('dark-mode') ? '#1e293b' : '#ffffff',
                        color: (ctx) => document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000',
                        borderRadius: 2, padding: 4,
                        formatter: (val) => val > 0 ? val.toFixed(1) + '%' : '',
                        font: { size: 10, weight: 'bold' }
                    },
                    zoom: zoomConfig,
                    tooltip: {
                        callbacks: {
                            afterBody: function (items) {
                                return ['(Click to drill down)'];
                            }
                        }
                    }
                },
                scales: {
                    y: { grace: '15%', grid: { color: gc }, beginAtZero: true, ticks: { color: tc, font: { weight: 'bold', size: 10 } } },
                    x: { offset: true, grid: { display: false }, ticks: { color: tc, font: { weight: 'bold', size: 10 } } }
                },
                onClick: function (evt, elements) {
                    if (elements.length > 0 && window.trendDatesRaw) {
                        const idx = elements[0].index;
                        if (idx >= window.trendDatesRaw.length) return;
                        const dsIdx = elements[0].datasetIndex;
                        const date = window.trendDatesRaw[idx];
                        const dsLabel = this.data.datasets[dsIdx].label;
                        let area = '';
                        if (dsLabel.includes('Sewing')) area = 'SEWING';
                        else if (dsLabel.includes('Finishing')) area = 'FINISHING';
                        else if (dsLabel.includes('Washing')) area = 'WASHING';
                        if (date && area && window.trendMap && window.trendMap[date]) {
                            const tm = window.trendMap[date][area];
                            drillDownTrend(date, area, tm.i, tm.d);
                        }
                    }
                },
                cursor: 'pointer'
            };
            chartInstances.trend = new Chart(document.getElementById('trendChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [] }, options: trendOpts });
            const topDefTrendOpts = {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { boxWidth: 7, boxHeight: 7, padding: 20, usePointStyle: true, color: tc } },
                    datalabels: {
                        display: true, align: 'top', offset: 3, clip: false,
                        borderRadius: 2, padding: 2,
                        font: { weight: 'bold', size: 9 },
                        formatter: (val) => val > 0 ? val + '%' : ''
                    },
                    zoom: zoomConfig,
                    tooltip: {
                        callbacks: {
                            afterBody: function (items) {
                                return ['(Click to drill down)'];
                            }
                        }
                    }
                },
                scales: {
                    y: { grace: '15%', grid: { color: gc }, beginAtZero: true, ticks: { color: tc, font: { weight: 'bold', size: 10 } } },
                    x: { offset: true, grid: { display: false }, ticks: { color: tc, font: { weight: 'bold', size: 10 } } }
                },
                onClick: function (evt, elements) {
                    
                    const chartRef = chartInstances.topDefTrend || this;

                    if (elements.length > 0 && chartRef._datesRaw) {
                        const idx = elements[0].index;
                        if (idx >= chartRef._datesRaw.length) return;

                        const dsIdx = elements[0].datasetIndex;
                        const date = chartRef._datesRaw[idx];

                        
                        const area = chartRef.data.datasets[dsIdx].label.replace(' Forecast', '').toUpperCase();

                        if (date && area) {
                            drillDownAreaDefectsDate(area, date);
                        }
                    }
                },
                cursor: 'pointer'
            };
            chartInstances.topDefTrend = new Chart(document.getElementById('topDefTrendChart').getContext('2d'), { type: 'line', data: { labels: [], datasets: [] }, options: topDefTrendOpts });
            const optBarHQty = {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                layout: { padding: { right: 40 } },
                plugins: {
                    legend: { display: false },
                    datalabels: { display: true, align: 'end', anchor: 'end', offset: 0.5, color: '#dc2626', font: { size: 11, weight: 'bold' }, formatter: (val) => val > 0 ? val.toLocaleString('en-US') : '' }
                },
                scales: {
                    x: { grace: '25%', grid: { color: gc }, beginAtZero: true, ticks: { color: tc, font: { weight: 'bold', size: 10 } } },
                    y: { offset: true, grid: { display: false }, ticks: { color: tc, font: { size: 11, weight: 'bold' } } }
                }
            };

            const optBarV = {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 40 } },
                plugins: {
                    legend: { display: false },
                    datalabels: { display: true, align: 'end', anchor: 'end', offset: 0.5, clip: false, color: '#dc2626', font: { size: 11, weight: 'bold' } }
                },
                scales: {
                    y: { grace: '25%', grid: { color: gc }, beginAtZero: true, ticks: { color: tc, font: { weight: 'bold', size: 10 } } },
                    x: { offset: true, grid: { display: false }, ticks: { color: tc, font: { size: 10, weight: 'bold' } } }
                }
            };

            const optBarVRate = {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 40 } },
                plugins: {
                    legend: { display: false },
                    datalabels: { display: true, align: 'end', anchor: 'end', offset: 0.5, clip: false, color: '#dc2626', font: { size: 11, weight: 'bold' }, formatter: (val) => val + '%' }
                },
                scales: {
                    y: { grace: '25%', grid: { color: gc }, beginAtZero: true, ticks: { color: tc, font: { weight: 'bold', size: 10 }, callback: function (value) { return value + "%" } } },
                    x: { offset: true, grid: { display: false }, ticks: { color: tc, font: { size: 10, weight: 'bold' } } }
                },
                onClick: function (evt, elements) {
                    if (elements.length > 0) {
                        const idx = elements[0].index;
                        const label = this.data.labels[idx];
                        if (label) {
                            const lineName = label.toString().replace('LINE ', '').trim();
                            drillDownLine(lineName);
                        }
                    }
                }
            };

            const optBarStacked = {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 40 } },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, color: tc, font: { size: 11 }, filter: function (item, chart) { if (item.text === 'Defect') { const firstDefectIndex = chart.datasets.findIndex(ds => ds.label === 'Defect'); return item.datasetIndex === firstDefectIndex; } return true; } },
                        onClick: function (e, legendItem, legend) {
                            const chart = legend.chart;
                            const label = legendItem.text;
                            const isHidden = chart.getDatasetMeta(legendItem.datasetIndex).hidden;
                            const targetHidden = isHidden === true ? false : true;
                            chart.data.datasets.forEach((ds, i) => { if (ds.label === label) { chart.getDatasetMeta(i).hidden = targetHidden; } });
                            chart.update();
                        }
                    },
                    datalabels: { display: true, clip: false, color: '#ffffff', font: { weight: 'bold', size: 10 }, formatter: (val) => val > 0 ? val : '' }
                },
                scales: {
                    x: { offset: true, stacked: true, grid: { display: false }, ticks: { color: tc, font: { weight: 'bold', size: 10 } } },
                    y: { grace: '25%', stacked: true, grid: { color: gc }, beginAtZero: true, ticks: { color: tc, font: { weight: 'bold', size: 10 } } }
                }
            };

            const optMixedDualAxis = {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 45 } },
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: tc, boxWidth: 7, boxHeight: 7, padding: 20, usePointStyle: true, font: { size: 11 } } },
                    zoom: zoomConfig
                },
                scales: {
                    x: { offset: true, stacked: true, grid: { display: false }, ticks: { color: tc, font: { size: 10, weight: 'bold' }, maxRotation: 45, minRotation: 0, autoSkip: true } },
                    y: { grace: '30%', stacked: true, position: 'left', grid: { color: gc }, beginAtZero: true, ticks: { color: tc, font: { weight: 'bold', size: 10 } } },
                    y1: { grace: '5%', position: 'right', grid: { display: false }, beginAtZero: true, ticks: { color: '#dc2626', font: { weight: 'bold', size: 10 }, callback: function (value) { return value + "%" } } }
                },
                onClick: function (evt, elements) {
                    if (elements.length > 0 && this._datesRaw) {
                        const idx = elements[0].index;
                        if (idx < this._datesRaw.length) {
                            const dateRaw = this._datesRaw[idx];
                            const selectedLine = document.getElementById('single_line_filter').value;
                            if (selectedLine && typeof drillDownLineDateDetail === 'function') {
                                drillDownLineDateDetail(selectedLine, dateRaw);
                            }
                        }
                    }
                }
            };
            const makeDefBarOpts = (area) => ({
                ...optBarV,
                onClick: function (evt, elements) {
                    if (elements.length > 0 && this._top3Keys) {
                        const idx = elements[0].index;
                        const key = this._top3Keys[idx];
                        if (key) {
                            const label = Array.isArray(this.data.labels[idx]) ? this.data.labels[idx].join(' ') : this.data.labels[idx];
                            drillDownDefect(this._area || area, label, key);
                        }
                    }
                }
            });
            chartInstances.volume = new Chart(document.getElementById('volumeChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: optBarStacked });

            const dailyLineOpts = {
                ...optMixedDualAxis,
                onClick: function (evt, elements) {
                    if (elements.length > 0 && this._datesRaw) {
                        const idx = elements[0].index;
                        if (idx < this._datesRaw.length) {
                            const dateRaw = this._datesRaw[idx];
                            drillDownDailyMultiDate(dateRaw);
                        }
                    }
                }
            };
            chartInstances.dailyLine = new Chart(document.getElementById('dailyLineChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: dailyLineOpts });

            const sewPerfOpts = {
                ...optMixedDualAxis, onClick: function (evt, elements) {
                    if (elements.length > 0 && this._lineArray) {
                        const idx = elements[0].index;
                        const item = this._lineArray[idx];
                        if (item) drillDownLine(item.name);
                    }
                }
            };
            chartInstances.sewPerf = new Chart(document.getElementById('sewingPerfChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: sewPerfOpts });
            chartInstances.sewPerf.config._showEmptyStart = true;

            const finPerfOpts = {
                ...optMixedDualAxis, onClick: function (evt, elements) {
                    if (elements.length > 0 && this._bsKeys) {
                        const idx = elements[0].index;
                        const key = this._bsKeys[idx];
                        if (key) drillDownBuyerStyle(key);
                    }
                }
            };
            chartInstances.finPerf = new Chart(document.getElementById('finishingPerfChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: finPerfOpts });
            chartInstances.sectionCompare = new Chart(document.getElementById('sectionCompareChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: optBarHQty });

            chartInstances.sew = new Chart(document.getElementById('sewingDefChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: makeDefBarOpts('SEWING') });
            chartInstances.fin = new Chart(document.getElementById('finishingDefChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: makeDefBarOpts('FINISHING') });
            chartInstances.was = new Chart(document.getElementById('washingDefChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: makeDefBarOpts('WASHING') });
            chartInstances.line = new Chart(document.getElementById('lineChart').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [] }, options: optBarVRate });

            ['sewingPerfChart', 'finishingPerfChart', 'trendChart', 'sewingDefChart', 'finishingDefChart', 'washingDefChart', 'lineChart', 'topDefTrendChart'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.cursor = 'pointer';
            });
            
            }
        function updateTrendChart(labels, datasetsArr) { chartInstances.trend.data = { labels: labels, datasets: datasetsArr }; chartInstances.trend.update(); }
        function updateVBarChart(chartObj, dataArr, color) {
            chartObj.data = { labels: dataArr.map(x => x.name), datasets: [{ label: 'Rate (%)', data: dataArr.map(x => x.rate.toFixed(2)), backgroundColor: color, borderRadius: 2, maxBarThickness: 40 }] };
            chartObj.update();
        }
        function updateChartColors(isDark) {
            const tc = getChartTextColor(); const gc = getGridColor();
            const navyColor = getNavyColor();
            Chart.defaults.color = tc;
            if (chartInstances.trend) {
                chartInstances.trend.options.plugins.datalabels.color = isDark ? '#ffffff' : '#000000';
                chartInstances.trend.options.plugins.datalabels.backgroundColor = isDark ? '#1e293b' : '#ffffff';
                if (chartInstances.trend.data.datasets.length > 0) {
                    chartInstances.trend.data.datasets.forEach(ds => {
                        if (ds.label && ds.label.includes('Sewing')) {
                            ds.borderColor = navyColor;
                            ds.backgroundColor = navyColor;
                        }
                    });
                }
            }

            if (chartInstances.topDefTrend) {
                chartInstances.topDefTrend.options.plugins.datalabels.backgroundColor = isDark ? '#1e293b' : '#ffffff';
                if (chartInstances.topDefTrend.data.datasets.length > 0) {
                    chartInstances.topDefTrend.data.datasets.forEach(ds => {
                        let area = ds.label.replace(' Forecast', '');
                        let color = '';
                        if (area === 'SEWING') color = navyColor;
                        else if (area === 'FINISHING') color = isDark ? '#f59e0b' : '#d97706';
                        else if (area === 'WASHING') color = isDark ? '#34d399' : '#059669';

                        if (color) {
                            ds.borderColor = color;
                            ds.backgroundColor = color;
                            if (ds.datalabels) ds.datalabels.color = color;
                        }
                    });
                }
            }

            const navyCharts = [chartInstances.sewPerf, chartInstances.finPerf, chartInstances.dailyLine];
            navyCharts.forEach(chartInstance => {
                if (chartInstance && chartInstance.data.datasets.length > 0) {
                    if (chartInstance.data.datasets[0].datalabels) {
                        chartInstance.data.datasets[0].datalabels.backgroundColor = isDark ? '#1e293b' : '#ffffff';
                    }
                    if (chartInstance.data.datasets.length > 1) {
                        chartInstance.data.datasets[1].borderColor = isDark ? '#f59e0b' : '#d97706';
                        chartInstance.data.datasets[1].backgroundColor = isDark ? '#f59e0b' : '#d97706';
                        if (chartInstance.data.datasets[1].datalabels) {
                            chartInstance.data.datasets[1].datalabels.color = isDark ? '#f59e0b' : '#d97706';
                            chartInstance.data.datasets[1].datalabels.backgroundColor = isDark ? '#1e293b' : '#ffffff';
                        }
                    }
                    if (chartInstance.data.datasets.length > 2) {
                        chartInstance.data.datasets[2].backgroundColor = navyColor;
                    }
                }
            });
            if (chartInstances.volume && chartInstances.volume.data.datasets.length > 0) {
                chartInstances.volume.data.datasets.forEach(ds => {
                    if (ds.label && ds.label.includes('Good') && ds.label.includes('Sewing')) {
                        ds.backgroundColor = navyColor;
                    }
                });
            }
            if (chartInstances.sectionCompare && chartInstances.sectionCompare.data.datasets.length > 0) {
                if (chartInstances.sectionCompare.data.datasets[0].backgroundColor) {
                    const bg = chartInstances.sectionCompare.data.datasets[0].backgroundColor;
                    if (Array.isArray(bg) && bg.length > 0) bg[0] = navyColor;
                }
            }
            const defRankingBarColors = isDark ? ['#60a5fa', '#f59e0b', '#94a3b8'] : ['#0f172a', '#d97706', '#64748b'];
            [chartInstances.sew, chartInstances.fin, chartInstances.was].forEach(c => {
                if (c && c.data.datasets.length > 0) {
                    c.data.datasets[0].backgroundColor = defRankingBarColors;
                }
            });
            Object.values(chartInstances).forEach(c => {
                if (!c) return;
                if (c.options.plugins && c.options.plugins.legend && c.options.plugins.legend.labels) {
                    c.options.plugins.legend.labels.color = tc;
                }
                if (c.options.scales) {
                    ['x', 'y', 'y1'].forEach(axis => {
                        if (c.options.scales[axis]) {
                            if (c.options.scales[axis].grid) c.options.scales[axis].grid.color = gc;
                            if (c.options.scales[axis].ticks && axis !== 'y1') c.options.scales[axis].ticks.color = tc;
                        }
                    });
                }
                c.update();
            });
        }
        function runBackgroundForecasts() {
            window.cachedForecasts = { trend: {}, daily: null };
            const diffDays = Math.max(3, Math.ceil((new Date(document.getElementById('f_end').value) - new Date(document.getElementById('f_start').value)) / (1000 * 60 * 60 * 24)));
            if (window.globalTrendData) {
                const { datesRaw, trendMap } = window.globalTrendData;
                const activeAreas = getMultiValues('ms_f_area').includes('ALL') ? ['SEWING', 'FINISHING', 'WASHING'] : getMultiValues('ms_f_area');
                activeAreas.forEach(area => {
                    let rates = datesRaw.map(d => trendMap[d][area].i > 0 ? (trendMap[d][area].d / trendMap[d][area].i) * 100 : 0);
                    window.cachedForecasts.trend[area] = calculateHoltsForecast(rates, 0.4, 0.3, diffDays);
                });
            }
            if (chartInstances.dailyLine && chartInstances.dailyLine._dMap) {
                const dMap = chartInstances.dailyLine._dMap;
                const datesRaw = chartInstances.dailyLine._datesRaw || [];
                let rates = datesRaw.map(d => dMap[d].i > 0 ? (dMap[d].d / dMap[d].i) * 100 : 0);
                window.cachedForecasts.daily = calculateHoltsForecast(rates, 0.4, 0.3, diffDays);
            }
        }
        document.addEventListener('DOMContentLoaded', function () {
            document.querySelectorAll('.insight-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    document.querySelectorAll('.insight-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        });
        
        function renderInsightUI(aiText, type) {
            let isForecastable = ['trend', 'daily', 'volume', 'top_def_trend'].includes(type);
            let isForecastActive = window.chartForecastState[type];

            let tabsHtml = '';
            if (isForecastable) {
                tabsHtml = `
                    <div class="ai-tab-header">
                        <button class="ai-tab-btn ${!isForecastActive ? 'active' : ''}" onclick="toggleForecastDetail('${type}')">LAPORAN AKTUAL</button>
                        <button class="ai-tab-btn predictive ${isForecastActive ? 'active' : ''}" onclick="toggleForecastDetail('${type}')">PREDIKSI HOLT'S</button>
                    </div>
                `;
            } else {
                tabsHtml = `
                    <div class="ai-tab-header">
                        <div style="padding: 12px 15px; font-size: 11px; font-weight: 800; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">ANALISIS AI</div>
                    </div>
                `;
            }

            return `
                <div class="ai-insight-box">
                    ${tabsHtml}
                    <div class="ai-insight-content">${aiText}</div>
                </div>
            `;
        }