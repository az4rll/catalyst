const URL_SEWING  = "https://script.google.com/macros/s/AKfycby5vsSzTavVN4g1wX-X9bM76ctFzjZY8Uy0IpEzrHrD68Rk2HHLnxkZ_oJCd2KI2Ktz/exec";
        const URL_FINISHING = "https://script.google.com/macros/s/AKfycbyiwr2m82nWXxX2GLwR6euU7CEVRUjRcQvIwYL6ortrTzGZ6A38aeagzwyNgR_jnyA/exec";
        const URL_WASHING  = "https://script.google.com/macros/s/AKfycbxuOY8WNXD384d5LgEi6eaxpNGMWh5zAMXQtzeUY5Ef838jG7uAVl2pDePHKfNZQ14S/exec";
        const URL_AI        = "https://script.google.com/macros/s/AKfycbyHOEH2EXZyWhDVw1yrxI--R8kLqFbu2BR5GX1wI1rT_Ph2kPXlHt6tocYC7hv_WuYM/exec";
        const PASSWORD_SPV = "WASHD1";

        // ================= DEMO MODE MOCK BACKEND =================
        (function () {
            const INSPECTORS = {
                SEWING: ['Rina S.', 'Dedi P.', 'Yuni A.'],
                FINISHING: ['Wati K.', 'Agus R.'],
                WASHING: ['Budi T.', 'Sari M.']
            };
            const LINES = ['LINE 1', 'LINE 2', 'LINE 3'];
            function seededRandom(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }
            function fmtDate(d) { return d.toISOString().slice(0, 10); }

            function generateArea(area, days) {
                const produksi = [], defects = [], kpi = [];
                let seed = area.length * 23;
                for (let i = days; i >= 0; i--) {
                    const d = new Date(); d.setDate(d.getDate() - i);
                    INSPECTORS[area].forEach((insp, ii) => {
                        seed++;
                        const qty = Math.round(60 + seededRandom(seed) * 40);
                        const rate = 0.02 + seededRandom(seed * 2) * 0.05;
                        const def = Math.round(qty * rate);
                        kpi.push({
                            tanggal: fmtDate(d), area_source: area, line: LINES[ii % LINES.length],
                            inspector: insp, nama_inspector: insp,
                            kpi_qty: qty, kpi_sub_qty: qty,
                            kpi_def: def, kpi_sub_def: def,
                            kpi_rate: +(rate * 100).toFixed(2), kpi_sub_rate: +(rate * 100).toFixed(2),
                            kpi_insp: qty, kpi_sub_insp: qty,
                            kpi_jam: 8, kpi_sub_jam: 8,
                            kpi_pph: Math.round(qty / 8), kpi_sub_pph: Math.round(qty / 8),
                            score: Math.round(70 + seededRandom(seed * 3) * 30)
                        });
                    });
                }
                return { produksi, defects, kpi };
            }
            const MOCK_CACHE = {};
            function mockResponseFor(url) {
                let area = 'SEWING';
                if (url === URL_FINISHING) area = 'FINISHING';
                else if (url === URL_WASHING) area = 'WASHING';
                if (!MOCK_CACHE[area]) MOCK_CACHE[area] = generateArea(area, 45);
                return { result: 'success', ...MOCK_CACHE[area] };
            }
            const realFetch = window.fetch;
            window.fetch = function (url, opts) {
                if (typeof url === 'string' && (url === URL_SEWING || url === URL_FINISHING || url === URL_WASHING || url.includes('script.google.com'))) {
                    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponseFor(url)) });
                }
                return realFetch.apply(this, arguments);
            };
        })();
        // ================= END DEMO MODE MOCK BACKEND =================

        let globalKPI     = [];
        let globalDefects  = [];
        let rawExtractedData = null;
        window.aiCache     = {};
        let currentLang    = 'en';

        let scatterChartInstance = null;
        let trendChartInstance = null;

        const LANG = {
            en: {
                loading:'LOADING DATA...', loading_kpi:'FETCHING KPI DATA',
                fp_title:'FILTER & CONFIGURATION', fp_close:'X CLOSE',
                fp_preset:'QUICK PRESET', fp_start:'FROM DATE', fp_end:'TO DATE',
                fp_section:'SECTION', fp_posisi:'SEWING POSITION',
                fp_pos_all:'ALL POSITIONS', fp_pos_endline:'ENDLINE 100 PERCENT', fp_pos_inline:'INLINE TLS',
                fp_tipe:'SEWING INSPECTION TYPE', fp_tipe_100:'ENDLINE 100 PERCENT', fp_tipe_tls:'INLINE TLS',
                fp_status:'DATA STATUS', fp_topn:'TOP N INSPECTOR LEADERBOARD', fp_topn_all:'ALL',
                fp_reset:'RESET VIEW', fp_reset_btn:'RESET FILTER & LAYOUT', fp_apply:'APPLY FILTER',
                preset_today:'TODAY', preset_yesterday:'YESTERDAY', preset_this_week:'THIS WEEK',
                preset_last_week:'LAST WEEK', preset_this_month:'THIS MONTH', preset_last_month:'LAST MONTH',
                preset_last7:'7 DAYS', preset_last30:'30 DAYS',
                kpi_insp:'TOTAL INSPECTOR', kpi_qty:'TOTAL INSPECT PCS', kpi_pph:'TEAM AVG PPH',
                kpi_jam:'AVG EFFECTIVE HOURS', kpi_def:'TOTAL DEFECTS FOUND', kpi_rate:'AVG DEFECT RATE',
                kpi_sub_insp:'PEOPLE', kpi_sub_qty:'PCS', kpi_sub_pph:'PCS PER HOUR',
                kpi_sub_jam:'HOURS PER SHIFT', kpi_sub_def:'PCS', kpi_sub_rate:'PERCENT',
                card_section_title:'SECTION PERFORMANCE COMPARISON',
                dd_filter:'FILTER DATA', dd_screenshot:'SCREENSHOT', dd_export_pdf:'EXPORT PDF', dd_theme:'CHANGE THEME', dd_exit:'EXIT',
                sort_by:'SORT BY', filter_name:'FILTER BY NAME',
                opt_inspect_desc:'MOST INSPECT', opt_inspect_asc:'LEAST INSPECT',
                opt_pph_desc:'HIGHEST PPH', opt_pph_asc:'LOWEST PPH',
                opt_defect_desc:'MOST DEFECTS', opt_defect_asc:'LEAST DEFECTS',
                opt_rate_desc:'HIGHEST DEF RATE', opt_rate_asc:'LOWEST DEF RATE',
                modal_close:'X CLOSE', detail_title:'PERFORMANCE DETAIL',
                no_data:'NO DATA AVAILABLE',
                ai_analyzing:'AI QC DRESS 1 IS ANALYZING DATA', ai_analysis:'AI ANALYSIS',
                avg_pph:'AVG PPH', total_inspect:'TOTAL INSPECT', total_defect:'TOTAL DEFECT',
                avg_def_rate:'AVG DEF RATE', stability:'PPH STABILITY',
                section_lbl:'SECTION', daily_trend:'DAILY TREND', skill_radar:'SKILL RADAR VS TEAM',
                daily_log:'DAILY LOG', period:'PERIOD',
                lbl_top_by:'TOP', by_inspect:'INSPECT', by_pph:'PPH', by_defect:'DEFECT', by_rate:'DEF RATE',
                col_date:'DATE', col_pos:'POSITION', col_line:'LINE', col_buyer:'BUYER',
                col_style:'STYLE', col_color:'COLOR', col_shift:'SHIFT', col_jam:'EFF HRS',
                col_inspect:'INSPECT', col_good:'GOOD', col_defect:'DEFECT', col_rate:'DEF RATE', col_pph:'PPH',
                radar_speed:'SPEED', radar_quality:'QUALITY', radar_hours:'EFF HOURS',
                radar_consist:'CONSISTENCY', radar_volume:'VOLUME', radar_attend:'ATTENDANCE',
                team_avg:'TEAM AVG', var_label:'VAR', avg_pph_lbl:'AVG PPH', def_rate_lbl:'DEF RATE',
                adv_title:'ADVANCED ANALYTICS: SPEED VS QUALITY', adv_opt_all:'ALL SECTIONS',
                adv_trend: 'PERFORMANCE TREND (PPH VS DEF RATE)',
                radar_info_title:'SKILL RADAR METRICS EXPLAINED',
                radar_info:[
                    {label:'SPEED',desc:'Based on Average PPH (Pieces Per Hour). Calculated as: (Individual Avg PPH ÷ Highest PPH in section) × 100. Higher score = faster throughput.'},
                    {label:'QUALITY',desc:'Based on Defect Rate. Calculated as: 100 − Defect Rate (%). A score of 100 means zero defects; lower defect rate = higher quality score.'},
                    {label:'EFFECTIVE HOURS',desc:'Based on average shift hours logged. Calculated as: (Avg Effective Hours ÷ 10) × 100. Benchmark is 10 hours max per shift.'},
                    {label:'CONSISTENCY',desc:'Based on Coefficient of Variation (CV) of PPH across sessions. Calculated as: 100 − CV (%). Low CV means stable daily output; high CV means erratic performance.'},
                    {label:'VOLUME',desc:'Based on total pieces inspected. Calculated as: (Individual Total Inspect ÷ Highest Total Inspect in section) × 100. Reflects cumulative workload.'},
                    {label:'ATTENDANCE',desc:'Based on the number of actual presence days divided by total working days in the selected period. A score of 100 means full attendance without absence.'}
                ]
            },
            id: {
                loading:'MEMUAT DATA...', loading_kpi:'MENGAMBIL DATA KPI',
                fp_title:'FILTER DAN KONFIGURASI', fp_close:'X TUTUP',
                fp_preset:'QUICK PRESET', fp_start:'DARI TANGGAL', fp_end:'SAMPAI TANGGAL',
                fp_section:'SECTION', fp_posisi:'POSISI SEWING',
                fp_pos_all:'SEMUA POSISI', fp_pos_endline:'ENDLINE 100 PERCENT', fp_pos_inline:'INLINE TLS',
                fp_tipe:'TIPE INSPEKSI SEWING', fp_tipe_100:'ENDLINE 100 PERCENT', fp_tipe_tls:'INLINE TLS',
                fp_status:'STATUS DATA', fp_topn:'TOP N INSPECTOR LEADERBOARD', fp_topn_all:'SEMUA',
                fp_reset:'RESET TAMPILAN', fp_reset_btn:'RESET FILTER DAN LAYOUT', fp_apply:'TERAPKAN FILTER',
                preset_today:'HARI INI', preset_yesterday:'KEMARIN', preset_this_week:'MINGGU INI',
                preset_last_week:'MINGGU LALU', preset_this_month:'BULAN INI', preset_last_month:'BULAN LALU',
                preset_last7:'7 HARI', preset_last30:'30 HARI',
                kpi_insp:'TOTAL INSPECTOR', kpi_qty:'TOTAL INSPECT PCS', kpi_pph:'AVG PPH TIM',
                kpi_jam:'AVG JAM EFEKTIF', kpi_def:'TOTAL DEFECT TEMUAN', kpi_rate:'AVG DEFECT RATE',
                kpi_sub_insp:'ORANG', kpi_sub_qty:'PCS', kpi_sub_pph:'PCS PER JAM',
                kpi_sub_jam:'JAM PER SHIFT', kpi_sub_def:'PCS', kpi_sub_rate:'PERSEN',
                card_section_title:'PERBANDINGAN PERFORMA SECTION',
                dd_filter:'FILTER DATA', dd_screenshot:'SCREENSHOT', dd_export_pdf:'EXPORT PDF', dd_theme:'GANTI TEMA', dd_exit:'EXIT',
                sort_by:'SORT BY', filter_name:'FILTER NAMA',
                opt_inspect_desc:'INSPECT TERBANYAK', opt_inspect_asc:'INSPECT SEDIKIT',
                opt_pph_desc:'PPH TERTINGGI', opt_pph_asc:'PPH TERENDAH',
                opt_defect_desc:'DEFECT TERBANYAK', opt_defect_asc:'DEFECT SEDIKIT',
                opt_rate_desc:'DEF RATE TERTINGGI', opt_rate_asc:'DEF RATE TERENDAH',
                modal_close:'X TUTUP', detail_title:'DETAIL PERFORMA',
                no_data:'TIDAK ADA DATA',
                ai_analyzing:'AI QC DRESS 1 MENGANALISIS DATA', ai_analysis:'ANALISIS AI',
                avg_pph:'AVG PPH', total_inspect:'TOTAL INSPECT', total_defect:'TOTAL DEFECT',
                avg_def_rate:'AVG DEF RATE', stability:'STABILITAS PPH',
                section_lbl:'SECTION', daily_trend:'TREN HARIAN', skill_radar:'SKILL RADAR VS TIM',
                daily_log:'LOG HARIAN', period:'PERIODE',
                lbl_top_by:'TOP', by_inspect:'INSPECT', by_pph:'PPH', by_defect:'DEFECT', by_rate:'DEF RATE',
                col_date:'TGL', col_pos:'POSISI', col_line:'LINE', col_buyer:'BUYER',
                col_style:'STYLE', col_color:'COLOR', col_shift:'SHIFT', col_jam:'JAM EFF',
                col_inspect:'INSPECT', col_good:'GOOD', col_defect:'DEFECT', col_rate:'DEF RATE', col_pph:'PPH',
                radar_speed:'KECEPATAN', radar_quality:'KETELITIAN', radar_hours:'JAM EFEKTIF',
                radar_consist:'STABILITAS', radar_volume:'VOLUME', radar_attend:'KEHADIRAN',
                team_avg:'RATA TIM', var_label:'VAR', avg_pph_lbl:'AVG PPH', def_rate_lbl:'DEF RATE',
                adv_trend: 'TREN PERFORMA (PPH VS DEF RATE)',
                adv_title:'ANALITIK LANJUTAN: KECEPATAN VS KETELITIAN', adv_opt_all:'SEMUA SECTION',
                radar_info_title:'PENJELASAN METRIK SKILL RADAR',
                radar_info:[
                    {label:'KECEPATAN',desc:'Berdasarkan Rata-rata PPH (Pieces Per Hour). Rumus: (Avg PPH individu ÷ PPH tertinggi di section) × 100. Skor lebih tinggi = throughput lebih cepat.'},
                    {label:'KETELITIAN',desc:'Berdasarkan Defect Rate. Rumus: 100 − Defect Rate (%). Skor 100 berarti nol defect; defect rate rendah = skor ketelitian tinggi.'},
                    {label:'JAM EFEKTIF',desc:'Berdasarkan rata-rata jam kerja yang tercatat per shift. Rumus: (Avg Jam Efektif ÷ 10) × 100. Benchmark 10 jam maksimal per shift.'},
                    {label:'STABILITAS',desc:'Berdasarkan Coefficient of Variation (CV) dari PPH lintas sesi. Rumus: 100 − CV (%). CV rendah = output harian konsisten; CV tinggi = performa tidak stabil.'},
                    {label:'VOLUME',desc:'Berdasarkan total pcs yang diinspeksi. Rumus: (Total Inspect individu ÷ Total Inspect tertinggi di section) × 100. Mencerminkan beban kerja kumulatif.'},
                    {label:'KEHADIRAN',desc:'Berdasarkan jumlah hari kehadiran aktual dibagi total hari kerja di periode terpilih. Skor 100 berarti hadir penuh tanpa absen.'}
                ]
            }
        };

        function t(key){ return (LANG[currentLang]||LANG['en'])[key]||key; }

        function setLang(lang){
            currentLang = lang;
            document.getElementById('lang_en_btn').classList.toggle('active', lang==='en');
            document.getElementById('lang_id_btn').classList.toggle('active', lang==='id');
            applyLangUI();
            renderAll();
        }

        function applyLangUI(){
            const L = LANG[currentLang];
            const setText = (id,val) => { const el=document.getElementById(id); if(el) el.innerText=val; };
            setText('loadingText',L.loading);
            setText('fp_title',L.fp_title); setText('fp_close_btn',L.fp_close);
            setText('fp_preset_label',L.fp_preset); setText('fp_start_label',L.fp_start);
            setText('fp_end_label',L.fp_end); setText('fp_section_label',L.fp_section);
            setText('fp_posisi_label',L.fp_posisi); setText('fp_pos_all',L.fp_pos_all);
            setText('fp_pos_endline',L.fp_pos_endline); setText('fp_pos_inline',L.fp_pos_inline);
            setText('fp_tipe_label',L.fp_tipe); setText('fp_tipe_100',L.fp_tipe_100);
            setText('fp_tipe_tls',L.fp_tipe_tls); setText('fp_status_label',L.fp_status);
            setText('fp_topn_label',L.fp_topn); setText('fp_topn_all',L.fp_topn_all);
            setText('fp_reset_label',L.fp_reset); setText('fp_reset_btn',L.fp_reset_btn);
            setText('fp_apply_btn',L.fp_apply);
            setText('kpi_lbl_insp',L.kpi_insp); setText('kpi_lbl_qty',L.kpi_qty);
            setText('kpi_lbl_pph',L.kpi_pph); setText('kpi_lbl_jam',L.kpi_jam);
            setText('kpi_lbl_def',L.kpi_def); setText('kpi_lbl_rate',L.kpi_rate);
            setText('kpi_sub_total_insp',L.kpi_sub_insp); setText('kpi_sub_qty',L.kpi_sub_qty);
            setText('kpi_sub_pph',L.kpi_sub_pph); setText('kpi_sub_jam',L.kpi_sub_jam);
            setText('kpi_sub_def',L.kpi_sub_def); setText('kpi_sub_rate',L.kpi_sub_rate);
            setText('card_section_title',L.card_section_title);
            setText('modal_close_btn',L.modal_close);
            setText('lbl_adv_title',L.adv_title); setText('adv_opt_all',L.adv_opt_all);
            setText('lbl_adv_trend',L.adv_trend);

            const presetMap={today:'preset_today',yesterday:'preset_yesterday',this_week:'preset_this_week',
                last_week:'preset_last_week',this_month:'preset_this_month',last_month:'preset_last_month',
                last_7:'preset_last7',last_30:'preset_last30'};
            document.querySelectorAll('.preset-btn').forEach(btn=>{
                const k=btn.getAttribute('data-key');
                if(k&&presetMap[k]) btn.innerText=L[presetMap[k]];
            });

            ['sew','fin','was'].forEach(sec=>{
                const sortEl=document.getElementById(`sort_lb_${sec}`); if(!sortEl) return;
                const opts=sortEl.options;
                const vals=['inspect_desc','inspect_asc','pph_desc','pph_asc','defect_desc','defect_asc','rate_desc','rate_asc'];
                const keys=['opt_inspect_desc','opt_inspect_asc','opt_pph_desc','opt_pph_asc','opt_defect_desc','opt_defect_asc','opt_rate_desc','opt_rate_asc'];
                for(let i=0;i<opts.length;i++){
                    const k=keys[vals.indexOf(opts[i].value)];
                    if(k) opts[i].innerText=L[k];
                }
                const sortLbl=document.getElementById(`${sec}_sort_label`);
                if(sortLbl) sortLbl.innerText=L.sort_by;
                const nameLbl=document.getElementById(`${sec}_name_label`);
                if(nameLbl) nameLbl.innerText=L.filter_name;
            });

            const svgFilter=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`;
            const svgCam=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
            const svgPdf=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
            const svgMoon=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
            const svgExit=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
            document.getElementById('dd_filter_btn').innerHTML=`${svgFilter}${L.dd_filter}`;
            document.getElementById('dd_screenshot_btn').innerHTML=`${svgCam}${L.dd_screenshot}`;
            document.getElementById('dd_export_pdf_btn').innerHTML=`${svgPdf}${L.dd_export_pdf}`;
            document.getElementById('dd_theme_btn').innerHTML=`${svgMoon}${L.dd_theme}`;
            document.getElementById('dd_exit_btn').innerHTML=`${svgExit}${L.dd_exit}`;
        }

        Chart.register(ChartDataLabels);
        Chart.defaults.set('plugins.datalabels',{display:true});

        window.onload = ()=>{
            setPreset('yesterday');
            buildMS('ms_section',['SEWING','FINISHING','WASHING'],'','ALL SECTION');
            setLang('en');
            applyFilter();
        };

        function fmtDate(d){ const dt=new Date(d); return `${dt.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()]}`; }
        function fmtDateFull(d){ const dt=new Date(d); return `${dt.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getMonth()]} ${dt.getFullYear()}`; }
        function smartRange(s,e){
            if(s===e) return fmtDateFull(s);
            const d1=new Date(s),d2=new Date(e);
            const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            if(d1.getMonth()===d2.getMonth()&&d1.getFullYear()===d2.getFullYear()) return `${d1.getDate()}-${d2.getDate()} ${m[d1.getMonth()]} ${d1.getFullYear()}`;
            return `${d1.getDate()} ${m[d1.getMonth()]} - ${d2.getDate()} ${m[d2.getMonth()]} ${d2.getFullYear()}`;
        }
        function getWeekBounds(ref){
            const d=new Date(ref),day=d.getDay();
            let sinceLastFri;
            if(day===5) sinceLastFri=0;
            else if(day===6) sinceLastFri=1;
            else sinceLastFri=day+2;
            const fri=new Date(d); fri.setDate(d.getDate()-sinceLastFri);
            const thu=new Date(fri); thu.setDate(fri.getDate()+6);
            return{start:fri.toISOString().split('T')[0],end:thu.toISOString().split('T')[0]};
        }
        function getWorkDays(startStr, endStr) {
            let start = new Date(startStr);
            let end = new Date(endStr);
            let count = 0;
            while(start <= end) {
                if(start.getDay() !== 0) count++;
                start.setDate(start.getDate() + 1);
            }
            return Math.max(1, count);
        }
        function setPreset(p){
            const today=new Date();
            const todayStr=today.toISOString().split('T')[0];
            const getYest=()=>{let y=new Date(today);y.setDate(today.getDate()-1);if(y.getDay()===0)y.setDate(y.getDate()-1);return y.toISOString().split('T')[0];};
            let s,e;
            switch(p){
                case 'today':s=e=todayStr;break;
                case 'yesterday':s=e=getYest();break;
                case 'this_week':{const w=getWeekBounds(today);s=w.start;e=todayStr<=w.end?todayStr:w.end;break;}
                case 'last_week':{const pw=getWeekBounds(new Date(new Date(getWeekBounds(today).start)-1));s=pw.start;e=pw.end;break;}
                case 'this_month':{const f=new Date(today.getFullYear(),today.getMonth(),1);s=f.toISOString().split('T')[0];e=todayStr;break;}
                case 'last_month':{const f=new Date(today.getFullYear(),today.getMonth(),1);const lp=new Date(f);lp.setDate(0);const fp=new Date(lp.getFullYear(),lp.getMonth(),1);s=fp.toISOString().split('T')[0];e=lp.toISOString().split('T')[0];break;}
                case 'last_7':{const d=new Date(today);d.setDate(today.getDate()-6);s=d.toISOString().split('T')[0];e=todayStr;break;}
                case 'last_30':{const d=new Date(today);d.setDate(today.getDate()-29);s=d.toISOString().split('T')[0];e=todayStr;break;}
                default:return;
            }
            document.getElementById('f_start').value=s;
            document.getElementById('f_end').value=e;
        }

        function buildMS(id,opts,onChangeFn,defaultTxt='ALL'){
            const wrap=document.getElementById(id); if(!wrap) return;
            let html=`<div class="mul-sel-head" onclick="this.parentElement.classList.toggle('open')">${defaultTxt}</div>`;
            html+=`<div class="mul-sel-body">`;
            html+=`<label><input type="checkbox" value="ALL" checked onchange="toggleAllMS(this,'${id}','${onChangeFn}')"> ALL</label>`;
            opts.forEach(o=>{html+=`<label><input type="checkbox" value="${o}" checked onchange="checkMS(this,'${id}','${onChangeFn}')"> ${o}</label>`;});
            html+=`</div>`;
            wrap.innerHTML=html; wrap.className='mul-sel';
        }
        function toggleAllMS(cb,wrapId,fn){const w=document.getElementById(wrapId);w.querySelectorAll('input:not([value="ALL"])').forEach(i=>i.checked=cb.checked);updateMSHead(wrapId);if(fn&&window[fn])window[fn]();}
        function checkMS(cb,wrapId,fn){const w=document.getElementById(wrapId);const all=w.querySelector('input[value="ALL"]');all.checked=Array.from(w.querySelectorAll('input:not([value="ALL"])')).every(i=>i.checked);updateMSHead(wrapId);if(fn&&window[fn])window[fn]();}
        function updateMSHead(id){const w=document.getElementById(id);if(!w)return;const inputs=Array.from(w.querySelectorAll('input:not([value="ALL"])'));const checked=inputs.filter(i=>i.checked);const head=w.querySelector('.mul-sel-head');if(checked.length===inputs.length||checked.length===0)head.innerText='ALL SELECTED';else if(checked.length<=2)head.innerText=checked.map(i=>i.value).join(', ');else head.innerText=checked.length+' SELECTED';}
        function getMSValues(id){const w=document.getElementById(id);if(!w)return['ALL'];const allCb=w.querySelector('input[value="ALL"]');if(allCb&&allCb.checked)return['ALL'];const checked=Array.from(w.querySelectorAll('input:not([value="ALL"]):checked')).map(c=>c.value);return checked.length>0?checked:['ALL'];}

        function toggleDropdown(){document.getElementById('dropMenu').classList.toggle('open');}
        document.addEventListener('click',e=>{
            document.querySelectorAll('.mul-sel').forEach(el=>{if(!el.contains(e.target))el.classList.remove('open');});
            document.querySelectorAll('.dropdown-menu').forEach(el=>{if(el.id!=='dropMenu'&&!el.parentElement.contains(e.target))el.classList.remove('open');});
            const ta=document.getElementById('topActions');const dm=document.getElementById('dropMenu');
            if(ta&&dm&&!ta.contains(e.target))dm.classList.remove('open');
        });
        function openFilter(){document.getElementById('filterPanel').classList.add('open');document.getElementById('filterOverlay').classList.add('open');document.getElementById('dropMenu').classList.remove('open');}
        function closeFilter(){document.getElementById('filterPanel').classList.remove('open');document.getElementById('filterOverlay').classList.remove('open');}
        function toggleTheme(){document.body.classList.toggle('dark');renderAll();}
        function toggleSection(id,btn){const el=document.getElementById(id);if(!el)return;el.classList.toggle('hidden');btn.innerText=el.classList.contains('hidden')?'+':'-';}
        function showLoading(msg){document.getElementById('loadingText').innerText=msg||t('loading_kpi');document.getElementById('globalLoading').style.display='flex';}
        function hideLoading(){document.getElementById('globalLoading').style.display='none';}
        function tc(){return document.body.classList.contains('dark')?'#e2e8f0':'#0f172a';}
        function gc(){return document.body.classList.contains('dark')?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)';}
        function getColor(section){const isDark=document.body.classList.contains('dark');const map={SEWING:isDark?'#93c5fd':'#0f172a',FINISHING:isDark?'#fcd34d':'#b45309',WASHING:isDark?'#cbd5e1':'#475569'};return map[section]||'#64748b';}
        function resetDashboard(){setPreset('yesterday');closeFilter();applyFilter();}
        function openModal(title,bodyHTML){document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=bodyHTML;document.getElementById('modalOverlay').classList.add('open');}
        function closeModal(e){if(e&&e.target===document.getElementById('modalOverlay'))closeModalDirect();}
        function closeModalDirect(){document.getElementById('modalOverlay').classList.remove('open');}
        function formatShortDate(dateStr){const d=new Date(dateStr);return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`;}

        const fetchConfig=(url,payload)=>fetch(url,{
            method:'POST',
            body:JSON.stringify(payload),
            headers:{'Content-Type':'text/plain;charset=utf-8'}
        }).then(res=>res.json());

        async function fetchQCDashboardData(startDate,endDate,statusData){
            const payloadSew ={action:"get_spv_data",start_date:startDate,end_date:endDate,status:"ORI",password:PASSWORD_SPV,version:"1.0"};
            const payloadFin ={action:"get_spv_data",start_date:startDate,end_date:endDate,status:"ORI",password:PASSWORD_SPV,version:"1.0"};
            const payloadWash={action:"get_spv_data",start_date:startDate,end_date:endDate,status:"ORI",password:PASSWORD_SPV,version:"1.0"};

            const results=await Promise.allSettled([
                fetchConfig(URL_SEWING,  payloadSew ).then(d=>({area:'SEWING',  data:d})),
                fetchConfig(URL_FINISHING,payloadFin ).then(d=>({area:'FINISHING',data:d})),
                fetchConfig(URL_WASHING, payloadWash).then(d=>({area:'WASHING', data:d}))
            ]);

            let extracted={
                SEWING:  {produksi:[],defects:[],kpi:[]},
                FINISHING:{produksi:[],defects:[],kpi:[]},
                WASHING: {produksi:[],defects:[],kpi:[]}
            };
            results.forEach(res=>{
                if(res.status==='fulfilled'&&res.value.data.result==='success'){
                    const area=res.value.area;
                    extracted[area].produksi=res.value.data.produksi||[];
                    extracted[area].defects =res.value.data.defects ||[];
                    extracted[area].kpi     =res.value.data.kpi       ||[];
                }
            });
            return extracted;
        }

        async function applyFilter(){
            closeFilter();
            const start   = document.getElementById('f_start').value;
            const end     = document.getElementById('f_end').value;
            const status  = "ORI";
            const sections= getMSValues('ms_section');
            if(!start||!end) return;
            showLoading(t('loading_kpi'));
            try{
                const extracted = await fetchQCDashboardData(start,end,status);
                rawExtractedData = extracted;

                globalKPI     = [];
                globalDefects = [];

                ['SEWING','FINISHING','WASHING'].forEach(area=>{
                    if(sections.includes('ALL')||sections.includes(area)){
                        (extracted[area].kpi||[]).forEach(r=>{
                            if((r.tanggal||'')>=start&&(r.tanggal||'')<=end)
                                globalKPI.push({...r, area_source:area});
                        });
                        (extracted[area].defects||[]).forEach(r=>{
                            if((r.tanggal||'')>=start&&(r.tanggal||'')<=end)
                                globalDefects.push({...r, area_source:area});
                        });
                    }
                });

                hideLoading();
                document.getElementById('titleMain').innerText=`KPI INSPECTOR${sections.includes('ALL')?'':' - '+sections.join('&')}`;
                document.getElementById('titleSub').innerText=`${t('period')}: ${smartRange(start,end).toUpperCase()}`;
                populateSlicers();
                renderAll();
            }catch(err){
                hideLoading();
                alert('Failed to load data: '+err.message);
            }
        }

        function populateSlicers(){
            let sewNames=new Set(),finNames=new Set(),wasNames=new Set();
            globalKPI.forEach(r=>{
                const n=getName(r);
                if(r.area_source==='SEWING')   sewNames.add(n);
                if(r.area_source==='FINISHING') finNames.add(n);
                if(r.area_source==='WASHING')  wasNames.add(n);
            });
            buildMS('ms_lb_sew_name',[...sewNames].sort(),'renderLeaderboards','ALL NAMES');
            buildMS('ms_lb_fin_name',[...finNames].sort(),'renderLeaderboards','ALL NAMES');
            buildMS('ms_lb_was_name',[...wasNames].sort(),'renderLeaderboards','ALL NAMES');
        }

        function getName(r){return(r.nama_inspector||r.nama||r.inspector||'UNKNOWN').toString().trim().toUpperCase();}
        function getPosisi(r){return(r.posisi||r.tipe||'').toString().toUpperCase();}
        function getLine(r){return(r.line||r.lokasi||'-').toString().trim();}
        function fmtShift(r){
            const fmt=v=>{
                if(!v||v==='-') return '-';
                const s=v.toString().trim();
                if(/^\d{1,2}:\d{2}$/.test(s)) return s;
                if(/^\d{1,2}\.\d{2}$/.test(s)) return s.replace('.',':');
                const d=new Date(s); if(!isNaN(d)) return d.toTimeString().substring(0,5);
                return s;
            };
            return `${fmt(r.shift_mulai)}-${fmt(r.shift_selesai)}`;
        }
        function parseKPI(r){
            const good=parseFloat(r.qty_good)||0;
            const def =parseFloat(r.qty_defect)||0;
            const jam =parseFloat(r.efektif_kerja_jam)||parseFloat(r['efektif kerja (jam)'])||0;
            const pph =parseFloat(r.pph)||parseFloat(r['pph (pcs/jam)'])||0;
            const inspect=good+def;
            const rate=inspect>0?(def/inspect)*100:0;
            return{good,def,jam,pph,inspect,rate};
        }
        function filterByPosisi(rows){
            const pos=document.getElementById('f_posisi')?document.getElementById('f_posisi').value:'ALL';
            if(pos==='ALL') return rows;
            return rows.filter(r=>{
                const p=getPosisi(r);
                if(pos==='ENDLINE') return p.includes('ENDLINE')||p.includes('100');
                if(pos==='INLINE')  return p.includes('INLINE')||p.includes('TLS');
                return true;
            });
        }

        function aggregateInspectors(rows){
            const map={};
            rows.forEach(r=>{
                const n=getName(r);
                const p=parseKPI(r);
                const area=r.area_source;
                const key=`${n}|||${area}`;
                if(!map[key]) map[key]={name:n,area,totalInspect:0,totalGood:0,totalDef:0,totalJam:0,pphList:[],sessions:0,distinctDates:new Set()};
                map[key].totalInspect+=p.inspect;
                map[key].totalGood+=p.good;
                map[key].totalDef+=p.def;
                map[key].totalJam+=p.jam;
                if(p.pph>0) map[key].pphList.push(p.pph);
                map[key].sessions++;
                map[key].distinctDates.add(r.tanggal);
            });
            return Object.values(map).map(x=>{
                const avgPph=x.pphList.length>0?x.pphList.reduce((a,b)=>a+b,0)/x.pphList.length:0;
                const rate=x.totalInspect>0?(x.totalDef/x.totalInspect)*100:0;
                const avg=avgPph;
                const std=x.pphList.length>1?Math.sqrt(x.pphList.map(v=>Math.pow(v-avg,2)).reduce((a,b)=>a+b,0)/x.pphList.length):0;
                const cv=avg>0?(std/avg)*100:0;
                return{...x,avgPph,rate,cv,avgJam:x.totalJam>0?x.totalJam/x.sessions:0};
            });
        }

        function renderAll(){
            updateKPISummary();
            renderSectionScores();
            renderLeaderboards();
            renderAdvancedAnalytics();
        }

        function updateKPISummary(){
            const rows=filterByPosisi(globalKPI);
            const names=new Set(rows.map(r=>getName(r)));
            let totInspect=0,totDef=0,totJam=0;
            const pphs=[];
            rows.forEach(r=>{const p=parseKPI(r);totInspect+=p.inspect;totDef+=p.def;totJam+=p.jam;if(p.pph>0)pphs.push(p.pph);});
            const avgPph=pphs.length>0?pphs.reduce((a,b)=>a+b,0)/pphs.length:0;
            const avgRate=totInspect>0?(totDef/totInspect)*100:0;
            const avgJam=rows.length>0?totJam/rows.length:0;
            document.getElementById('kpi_total_insp').innerText=names.size;
            document.getElementById('kpi_total_qty').innerText=totInspect.toLocaleString('en-US');
            document.getElementById('kpi_avg_pph').innerText=avgPph.toFixed(1);
            document.getElementById('kpi_avg_jam').innerText=avgJam.toFixed(2);
            document.getElementById('kpi_total_def').innerText=totDef.toLocaleString('en-US');
            document.getElementById('kpi_avg_rate').innerText=avgRate.toFixed(2)+'%';
        }

        function renderLeaderboards(){
            ['SEW','FIN','WAS'].forEach(sec=>{
                const area=sec==='SEW'?'SEWING':sec==='FIN'?'FINISHING':'WASHING';
                const nameFilter=getMSValues(`ms_lb_${sec.toLowerCase()}_name`);
                const sortBy=document.getElementById(`sort_lb_${sec.toLowerCase()}`).value;
                const topN=parseInt(document.getElementById('f_topn').value)||10;

                let rows=globalKPI.filter(r=>r.area_source===area);
                if(area==='SEWING') rows=filterByPosisi(rows);
                if(!nameFilter.includes('ALL')) rows=rows.filter(r=>nameFilter.includes(getName(r)));

                const agg=aggregateInspectors(rows);

                agg.sort((a,b)=>{
                    if(sortBy.includes('rate'))    return sortBy.includes('desc')?b.rate-a.rate:a.rate-b.rate;
                    if(sortBy.includes('pph'))     return sortBy.includes('desc')?b.avgPph-a.avgPph:a.avgPph-b.avgPph;
                    if(sortBy.includes('inspect')) return sortBy.includes('desc')?b.totalInspect-a.totalInspect:a.totalInspect-b.totalInspect;
                    if(sortBy.includes('defect'))  return sortBy.includes('desc')?b.totalDef-a.totalDef:a.totalDef-b.totalDef;
                    return b.totalInspect-a.totalInspect;
                });

                const top=agg.slice(0,topN);
                const maxVal=top.length>0?Math.max(...top.map(x=>{
                    if(sortBy.includes('rate'))    return x.rate;
                    if(sortBy.includes('pph'))     return x.avgPph;
                    if(sortBy.includes('inspect')) return x.totalInspect;
                    if(sortBy.includes('defect'))  return x.totalDef;
                    return x.totalInspect;
                })):1;

                const color=getColor(area);
                let html='';
                top.forEach((item,i)=>{
                    let valStr,subLabel,barPct,valLabel;
                    if(sortBy.includes('rate')){
                        valStr=item.rate.toFixed(2)+'%';
                        valLabel='DEF RATE';
                        barPct=maxVal>0?(item.rate/maxVal)*100:0;
                        subLabel=`${t('avg_pph_lbl')}: ${item.avgPph.toFixed(1)} | INSP: ${item.totalInspect.toLocaleString('en-US')} | DEF: ${item.totalDef}`;
                    } else if(sortBy.includes('pph')){
                        valStr=parseFloat(item.avgPph.toFixed(1)).toLocaleString('en-US');
                        valLabel='PCS/H';
                        barPct=maxVal>0?(item.avgPph/maxVal)*100:0;
                        subLabel=`${item.totalInspect.toLocaleString('en-US')} PCS | ${t('def_rate_lbl')}: ${item.rate.toFixed(1)}% | DEF: ${item.totalDef}`;
                    } else if(sortBy.includes('inspect')){
                        valStr=item.totalInspect.toLocaleString('en-US');
                        valLabel='PCS';
                        barPct=maxVal>0?(item.totalInspect/maxVal)*100:0;
                        subLabel=`${t('avg_pph_lbl')}: ${item.avgPph.toFixed(1)} | ${t('def_rate_lbl')}: ${item.rate.toFixed(1)}% | DEF: ${item.totalDef}`;
                    } else {
                        valStr=item.totalDef.toLocaleString('en-US');
                        valLabel='PCS';
                        barPct=maxVal>0?(item.totalDef/maxVal)*100:0;
                        subLabel=`${t('avg_pph_lbl')}: ${item.avgPph.toFixed(1)} | INSP: ${item.totalInspect.toLocaleString('en-US')} | ${t('def_rate_lbl')}: ${item.rate.toFixed(1)}%`;
                    }
                    const rnkClass=i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-n';
                    const shortName=item.name.length>18?item.name.substring(0,17)+'…':item.name;
                    html+=`<div class="rank-item" onclick="drillDownInspector('${item.name.replace(/'/g,"\\'")}','${area}')">
                        <div class="rank-num ${rnkClass}">${i+1}</div>
                        <div class="rank-info">
                            <div class="rank-name">${shortName}</div>
                            <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${barPct}%;background:${color}"></div></div>
                            <div style="font-size:10px;color:var(--text-sub);font-weight:600">${subLabel}</div>
                        </div>
                        <div class="rank-stats">
                            <div class="rank-pph" style="color:${color}">${valStr}</div>
                            <div class="rank-inspect">${valLabel}</div>
                        </div>
                    </div>`;
                });
                if(html==='') html=`<div style="text-align:center;padding:20px;color:var(--text-sub);font-weight:700">${t('no_data')}</div>`;
                document.getElementById(`rank${sec==='SEW'?'Sew':sec==='FIN'?'Fin':'Was'}`).innerHTML=html;

                let titleStr=sortBy.includes('rate')?t('by_rate'):sortBy.includes('pph')?t('by_pph'):sortBy.includes('inspect')?t('by_inspect'):t('by_defect');
                document.getElementById(`lbl_top_${sec.toLowerCase()}`).innerText=`${t('lbl_top_by')} ${topN} BY ${titleStr}`;
            });
        }

        function renderSectionScores(){
            const areas=['SEWING','FINISHING','WASHING'];
            const allAgg=aggregateInspectors(globalKPI);
            const sectionStats=areas.map(area=>{
                const x=allAgg.filter(a=>a.area===area);
                if(!x.length) return{avgPph:0,rate:0,avgJam:0,cv:0,count:0,totalInspect:0};
                const avgPph=x.reduce((s,a)=>s+a.avgPph,0)/x.length;
                const rate  =x.reduce((s,a)=>s+a.rate,0)/x.length;
                const avgJam=x.reduce((s,a)=>s+a.avgJam,0)/x.length;
                const cv    =x.reduce((s,a)=>s+a.cv,0)/x.length;
                return{avgPph,rate,avgJam,cv,count:x.length,totalInspect:x.reduce((s,a)=>s+a.totalInspect,0)};
            });
            let scHtml='';
            areas.forEach((area,i)=>{
                const st=sectionStats[i];
                const c=getColor(area);
                scHtml+=`<div class="score-box">
                    <div class="score-box-label" style="color:${c}">${area.charAt(0)+area.slice(1).toLowerCase()}</div>
                    <div class="score-box-value" style="color:${c}">${st.avgPph.toFixed(1)}</div>
                    <div style="font-size:9px;font-weight:600;color:var(--text-sub)">${t('avg_pph')}</div>
                    <div style="font-size:11px;font-weight:800;color:var(--danger);margin-top:3px">${st.rate.toFixed(2)}%</div>
                    <div style="font-size:9px;font-weight:600;color:var(--text-sub)">${t('avg_def_rate')}</div>
                </div>`;
            });
            document.getElementById('sectionScores').innerHTML=scHtml;
        }

        function getProductInfoFromSource(area, tanggal, inspectorName, occurrenceIndex = 1) {
            if (!rawExtractedData || !rawExtractedData[area]) return { line: '-', buyer: '-', style: '-', color: '-' };
            const pName = (inspectorName || '').toString().trim().toUpperCase();
            
            const kpiRows = rawExtractedData[area].kpi || [];
            let targetLine = '-';
            for (let r of kpiRows) {
                if ((r.tanggal || '') === tanggal && (r.nama_inspector || r.nama || r.inspector || '').toString().trim().toUpperCase() === pName) {
                    targetLine = (r.line || '-').toString().trim();
                    break;
                }
            }
            
            const prodRows = rawExtractedData[area].produksi || [];
            let matchCount = 0;
            for (let r of prodRows) {
                if ((r.tanggal || '') === tanggal) {
                    const rInspector = (r.inspector || r.nama_inspector || r.qc || '').toString().trim().toUpperCase();
                    if (area === 'SEWING') {
                        if ((r.line || '').toString().trim().toUpperCase() === targetLine.toUpperCase()) {
                            return { line: targetLine, buyer: (r.buyer || '-').toString().trim(), style: (r.style || '-').toString().trim(), color: '-' };
                        }
                    } else {
                        if (rInspector === pName) {
                            matchCount++;
                            if (matchCount === occurrenceIndex) {
                                return { line: (r.line || '-').toString().trim(), buyer: (r.buyer || '-').toString().trim(), style: (r.style || '-').toString().trim(), color: (r.color || '-').toString().trim() };
                            }
                        }
                    }
                }
            }
            
            const defRows = rawExtractedData[area].defects || [];
            for (let r of defRows) {
                if ((r.tanggal || '') === tanggal) {
                    const rName = (r.nama_inspector || r.nama || r.inspector || r.qc || '').toString().trim().toUpperCase();
                    if (rName === pName) {
                        return { line: (r.line || '-').toString().trim(), buyer: (r.buyer || '-').toString().trim(), style: (r.style || '-').toString().trim(), color: (r.color || '-').toString().trim() };
                    }
                }
            }
            return { line: targetLine, buyer: '-', style: '-', color: '-' };
        }

        function drillDownKPIDefect(inspectorName, area, dateStr, buyer, style, color, line, targetDefectQty) {
            const tipeData = document.getElementById('f_tipe') ? document.getElementById('f_tipe').value : '100';
            if (!rawExtractedData || !rawExtractedData[area]) {
                showDefectSwal(inspectorName, area, dateStr, {}, 0, { line: '-', buyer: '-', style: '-', color: '-' });
                return;
            }
            const info = { line, buyer, style, color };
            const defRows = rawExtractedData[area].defects || [];
            
            let rawDefMap = {};
            let totalDefectsInDB = 0;
            
            defRows.forEach(r => {
                if ((r.tanggal || '') !== dateStr) return;
                const rBuyer = (r.buyer || '').toString().trim().toUpperCase();
                const rStyle = (r.style || '').toString().trim().toUpperCase();
                const rColor = (r.color || '').toString().trim().toUpperCase();
                
                let matched = false;
                if (area === 'SEWING') {
                    const rName = (r.nama_inspector || r.nama || r.inspector || r.qc || '').toString().trim().toUpperCase();
                    if (rBuyer === buyer.toUpperCase() && rStyle === style.toUpperCase() && (rName === inspectorName.toUpperCase() || (r.line || '').toString().trim().toUpperCase() === line.toUpperCase())) {
                        matched = true;
                    }
                } else {
                    if (rBuyer === buyer.toUpperCase() && rStyle === style.toUpperCase() && rColor === color.toUpperCase()) {
                        matched = true;
                    }
                }
                if (!matched) return;
                
                let qty = 0;
                if (area === 'SEWING') {
                    qty = tipeData === 'TLS' ? (parseInt(r.qty_tls) || 0) : (parseInt(r.qty_100) || 0);
                } else {
                    qty = parseInt(r.qty) || 0;
                }
                if (qty <= 0) return;
                
                const partName = (r.area && r.area !== '-') ? r.area.toString().toUpperCase().trim() : '';
                const typeName = (r.jenis || r.type || r.jenis_defect || '').toString().toUpperCase().trim() || 'OTHERS';
                const key = partName ? `${partName} - ${typeName}` : typeName;
                
                rawDefMap[key] = (rawDefMap[key] || 0) + qty;
                totalDefectsInDB += qty;
            });
            
            let defMap = {};
            if (totalDefectsInDB > 0 && targetDefectQty > 0) {
                if (totalDefectsInDB === targetDefectQty || area === 'SEWING') {
                    defMap = rawDefMap;
                } else {
                    let factor = targetDefectQty / totalDefectsInDB;
                    let defArray = [];
                    let totalRounded = 0;
                    
                    for (let key in rawDefMap) {
                        let exact = rawDefMap[key] * factor;
                        let rounded = Math.round(exact);
                        totalRounded += rounded;
                        defArray.push({ key: key, qty: rounded, exact: exact });
                    }
                    
                    let remainder = targetDefectQty - totalRounded;
                    if (remainder !== 0 && defArray.length > 0) {
                        defArray.sort((a, b) => (b.exact - b.qty) - (a.exact - a.qty));
                        let idx = 0;
                        while (remainder > 0) {
                            defArray[idx % defArray.length].qty++;
                            remainder--;
                            idx++;
                        }
                        while (remainder < 0) {
                            defArray[idx % defArray.length].qty--;
                            remainder++;
                            idx++;
                        }
                    }
                    
                    defArray.forEach(x => {
                        if (x.qty > 0) defMap[x.key] = x.qty;
                    });
                }
            }
            
            showDefectSwal(inspectorName, area, dateStr, defMap, targetDefectQty, info);
        }

        function showDefectSwal(inspectorName, area, dateStr, defMap, total, info){
            const arr=Object.keys(defMap).map(k=>({name:k,qty:defMap[k]})).sort((a,b)=>b.qty-a.qty);
            let htmlTable='<table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">';
            htmlTable+='<thead><tr style="border-bottom:2px solid var(--border);"><th style="padding:9px 14px;">DEFECT TYPE</th><th style="padding:9px 14px;">QTY</th></tr></thead><tbody>';
            if(arr.length===0){
                htmlTable+='<tr><td colspan="2" style="text-align:center;padding:10px;">No detailed defect data found</td></tr>';
            } else {
                arr.forEach(x=>{htmlTable+=`<tr style="border-bottom:1px solid var(--border);"><td style="padding:9px 14px;">${x.name}</td><td style="padding:9px 14px;font-weight:bold;color:var(--danger);">${x.qty}</td></tr>`;});
            }
            htmlTable+='</tbody></table>';

            const isDark=document.body.classList.contains('dark');
            const overlay=document.getElementById('modalOverlay');
            if(overlay) overlay.style.zIndex='1999';

            let infoStr=`Inspector: ${inspectorName}<br>Date: ${formatShortDate(dateStr)}`;
            if(info.buyer!=='-') infoStr+=`<br>Buyer: ${info.buyer} | Style: ${info.style}`;
            if(area==='FINISHING'||area==='WASHING') infoStr+=` | Color: ${info.color}`;
            if(info.line!=='-') infoStr+=`<br>Line: ${info.line}`;

            Swal.fire({
                title:`DEFECT FOUND: ${total}`,
                html:`<div style="text-align:left;font-size:11px;margin-bottom:10px;color:var(--text-sub);">${infoStr}</div>${htmlTable}`,
                width:450,
                showConfirmButton:true,
                confirmButtonText:'CLOSE',
                confirmButtonColor:'var(--text-main)',
                customClass:{popup:isDark?'swal-dark':''},
                didOpen:()=>{const sc=Swal.getContainer();if(sc)sc.style.zIndex='9999';},
                didClose:()=>{if(overlay)overlay.style.zIndex='900';}
            });
        }

        function showRadarInfo(e){
            const popup=document.getElementById('tooltipPopup');
            const info=LANG[currentLang].radar_info;
            let html=`<h4>${t('radar_info_title')}</h4>`;
            info.forEach(item=>{html+=`<div class="tp-row"><div class="tp-label">${item.label}</div><div class="tp-desc">${item.desc}</div></div>`;});
            popup.innerHTML=html;
            popup.classList.add('visible');
            positionTooltip(e,popup);
            e.stopPropagation();
        }
        function hideRadarInfo(){document.getElementById('tooltipPopup').classList.remove('visible');}
        function positionTooltip(e,popup){
            const margin=10,pw=300,ph=300;
            let x=e.clientX+margin,y=e.clientY+margin;
            if(x+pw>window.innerWidth) x=e.clientX-pw-margin;
            if(y+ph>window.innerHeight) y=e.clientY-ph-margin;
            popup.style.left=x+'px'; popup.style.top=y+'px';
        }
        document.addEventListener('click',e=>{
            const popup=document.getElementById('tooltipPopup');
            if(popup&&popup.classList.contains('visible')&&!popup.contains(e.target)&&!e.target.closest('.btn-info'))
                hideRadarInfo();
        });

        function drillDownInspector(name, area){
            const rows=globalKPI.filter(r=>getName(r)===name&&r.area_source===area);
            if(!rows.length) return;

            const agg=aggregateInspectors(rows);
            const item=agg[0];
            const sortedRows=rows.sort((a,b)=>(a.tanggal||'').localeCompare(b.tanggal||''));
            const navyColor=getColor(area);

            const dateMap={};
            sortedRows.forEach(r=>{
                const p=parseKPI(r);
                if(!dateMap[r.tanggal]) dateMap[r.tanggal]={pphList:[],inspect:0,def:0};
                if(p.pph>0) dateMap[r.tanggal].pphList.push(p.pph);
                dateMap[r.tanggal].inspect+=p.inspect;
                dateMap[r.tanggal].def+=p.def;
            });
            const dates=Object.keys(dateMap).sort();

            const teamAgg=aggregateInspectors(globalKPI.filter(r=>r.area_source===area));
            const teamAvgPph=teamAgg.length>0?teamAgg.reduce((s,a)=>s+a.avgPph,0)/teamAgg.length:1;
            const teamAvgRate=teamAgg.length>0?teamAgg.reduce((s,a)=>s+a.rate,0)/teamAgg.length:1;
            const teamAvgJam=teamAgg.length>0?teamAgg.reduce((s,a)=>s+a.avgJam,0)/teamAgg.length:1;
            const teamAvgCv=teamAgg.length>0?teamAgg.reduce((s,a)=>s+a.cv,0)/teamAgg.length:1;
            const maxPph=Math.max(...teamAgg.map(a=>a.avgPph))||1;
            const maxVol=Math.max(...teamAgg.map(a=>a.totalInspect))||1;

            const workDays = getWorkDays(document.getElementById('f_start').value, document.getElementById('f_end').value);
            const presentDays = item.distinctDates.size;
            const attendanceScore = Math.min(100, (presentDays / workDays) * 100);

            const teamAggWithAttendance = teamAgg.map(a => Math.min(100, (a.distinctDates.size / workDays) * 100));
            const tAttendanceScore = teamAggWithAttendance.length > 0 ? teamAggWithAttendance.reduce((a,b)=>a+b,0)/teamAggWithAttendance.length : 100;

            const speedScore  =(item.avgPph/maxPph)*100;
            const qualityScore=Math.max(0,100-item.rate);
            const jamScore    =(item.avgJam/10)*100;
            const consistScore=Math.max(0,100-item.cv);
            const volScore    =(item.totalInspect/maxVol)*100;
            const tSpeedScore =(teamAvgPph/maxPph)*100;
            const tQualityScore=Math.max(0,100-teamAvgRate);
            const tJamScore    =(teamAvgJam/10)*100;
            const tConsistScore=Math.max(0,100-teamAvgCv);
            const tVolScore    =((teamAgg.reduce((s,a)=>s+a.totalInspect,0)/teamAgg.length)/maxVol)*100;
            const overallMax  =Math.max(speedScore,qualityScore,jamScore,consistScore,volScore,attendanceScore,tSpeedScore,tQualityScore,tJamScore,tConsistScore,tVolScore,tAttendanceScore)*1.1;

            const chartTrendId ='drillTrend_'+Date.now();
            const chartSpiderId='drillSpider_'+Date.now();
            const infoIconId   ='radarInfoBtn_'+Date.now();

            const cvColorClass=item.cv<15?'var(--success)':item.cv<30?'var(--gold)':'var(--danger)';

            const summaryHTML=`
            <div class="drill-sum">
                <div class="drill-kpi"><div class="drill-kpi-label">${t('section_lbl')}</div><div class="drill-kpi-value" style="font-size:14px;color:${navyColor}">${area}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">${t('avg_pph')}</div><div class="drill-kpi-value" style="color:${navyColor}">${item.avgPph.toFixed(1)}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">${t('total_inspect')}</div><div class="drill-kpi-value">${item.totalInspect.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">${t('total_defect')}</div><div class="drill-kpi-value" style="color:var(--danger)">${item.totalDef.toLocaleString('en-US')}</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">${t('avg_def_rate')}</div><div class="drill-kpi-value" style="color:var(--danger)">${item.rate.toFixed(2)}%</div></div>
                <div class="drill-kpi"><div class="drill-kpi-label">${t('stability')}</div><div class="drill-kpi-value" style="color:${cvColorClass}">${item.cv.toFixed(1)}% ${t('var_label')}</div></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px">
                <div>
                    <div style="font-size:10px;font-weight:800;color:var(--text-sub);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">${t('daily_trend')}</div>
                    <div style="position:relative;height:200px"><canvas id="${chartTrendId}"></canvas></div>
                </div>
                <div>
                    <div class="radar-title-row" style="margin-bottom:8px;">
                        <div style="font-size:10px;font-weight:800;color:var(--text-sub);text-transform:uppercase;letter-spacing:.5px">${t('skill_radar')}</div>
                        <button class="btn-info" id="${infoIconId}" onclick="showRadarInfo(event)" title="Metric explanation">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        </button>
                    </div>
                    <div style="position:relative;height:200px"><canvas id="${chartSpiderId}"></canvas></div>
                </div>
            </div>`;

            let kpiColumns;
            if(area==='SEWING'){
                kpiColumns=[t('col_date'),t('col_pos'),t('col_line'),t('col_buyer'),t('col_style'),t('col_shift'),t('col_jam'),t('col_inspect'),t('col_good'),t('col_defect'),t('col_rate'),t('col_pph')];
            } else {
                kpiColumns=[t('col_date'),t('col_buyer'),t('col_style'),t('col_color'),t('col_shift'),t('col_jam'),t('col_inspect'),t('col_good'),t('col_defect'),t('col_rate'),t('col_pph')];
            }

            let tableHTML=`<div style="font-size:10px;font-weight:800;color:var(--text-sub);text-transform:uppercase;margin-bottom:8px;margin-top:15px">${t('daily_log')}</div>`;
            tableHTML+=`<div class="table-wrap" style="max-height:200px"><table><thead><tr>${kpiColumns.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>`;
            
            let occurrenceCounter = {};
            sortedRows.forEach(r=>{
                const p=parseKPI(r);
                const tgl = r.tanggal || '';
                if (!occurrenceCounter[tgl]) occurrenceCounter[tgl] = 0;
                occurrenceCounter[tgl]++;

                const info = getProductInfoFromSource(area, tgl, name, occurrenceCounter[tgl]);
                const line  = info.line  !=='-'?info.line  :(getLine(r)||'-');
                const buyer = info.buyer !=='-'?info.buyer :(r.buyer||'-').toString().trim();
                const style = info.style !=='-'?info.style :(r.style||'-').toString().trim();
                const color = info.color !=='-'?info.color :(r.color||'-').toString().trim();

                const safeName = name.replace(/'/g,"\\'");
                const safeBuyer = buyer.replace(/'/g,"\\'");
                const safeStyle = style.replace(/'/g,"\\'");
                const safeColor = color.replace(/'/g,"\\'");
                const safeLine = line.replace(/'/g,"\\'");

                const clickDef = p.def > 0
                    ? `<span class="defect-clickable" onclick="event.stopPropagation();drillDownKPIDefect('${safeName}','${area}','${tgl}','${safeBuyer}','${safeStyle}','${safeColor}','${safeLine}', ${p.def})">${p.def}</span>`
                    : '0';

                tableHTML+=`<tr><td>${r.tanggal?fmtDate(r.tanggal):'-'}</td>`;
                if(area==='SEWING'){
                    tableHTML+=`<td style="font-size:10px">${getPosisi(r)||'-'}</td><td>${line}</td><td>${buyer}</td><td>${style}</td>`;
                } else {
                    tableHTML+=`<td>${buyer}</td><td>${style}</td><td>${color}</td>`;
                }
                tableHTML+=`<td style="font-size:10px">${fmtShift(r)}</td><td>${p.jam.toFixed(2)}</td>`;
                tableHTML+=`<td>${p.inspect.toLocaleString('en-US')}</td>`;
                tableHTML+=`<td style="color:var(--success)">${p.good.toLocaleString('en-US')}</td>`;
                tableHTML+=`<td>${clickDef}</td>`;
                tableHTML+=`<td style="color:var(--danger)">${p.rate.toFixed(2)}%</td>`;
                tableHTML+=`<td style="color:${navyColor};font-weight:900">${p.pph.toFixed(1)}</td></tr>`;
            });
            tableHTML+=`</tbody></table></div>`;

            openModal(`${t('detail_title')}: ${name}`, summaryHTML+tableHTML);

            setTimeout(()=>{
                const tCtx=document.getElementById(chartTrendId);
                const sCtx=document.getElementById(chartSpiderId);
                if(tCtx){
                    new Chart(tCtx,{
                        type:'line',
                        data:{
                            labels:dates.map(d=>formatShortDate(d)),
                            datasets:[
                                {label:'PPH',data:dates.map(d=>parseFloat((dateMap[d].pphList.reduce((a,b)=>a+b,0)/(dateMap[d].pphList.length||1)).toFixed(1))),borderColor:navyColor,backgroundColor:navyColor,borderWidth:2,fill:false,tension:0.1,pointRadius:4,yAxisID:'y',datalabels:{display:false}},
                                {label:t('def_rate_lbl'),data:dates.map(d=>parseFloat((dateMap[d].inspect>0?dateMap[d].def/dateMap[d].inspect*100:0).toFixed(2))),borderColor:'#b91c1c',backgroundColor:'#b91c1c',borderWidth:1.5,fill:false,tension:0.1,pointRadius:3,yAxisID:'y1',borderDash:[4,3],datalabels:{display:false}}
                            ]
                        },
                        options:{
                            responsive:true,maintainAspectRatio:false,
                            plugins:{legend:{display:true,position:'top',labels:{boxWidth:8,font:{size:9},color:tc()}},datalabels:{display:false}},
                            scales:{
                                y:{beginAtZero:true,ticks:{color:tc(),font:{size:9}},grid:{color:gc()}},
                                y1:{position:'right',beginAtZero:true,ticks:{color:'#b91c1c',font:{size:9}},grid:{display:false}},
                                x:{offset:true,ticks:{color:tc(),font:{size:9}},grid:{display:false}}
                            }
                        }
                    });
                }
                if(sCtx){
                    const radarLabels=[t('radar_speed'),t('radar_quality'),t('radar_hours'),t('radar_consist'),t('radar_volume'),t('radar_attend')];
                    const shortInspectorName=name.split(' ')[0];
                    new Chart(sCtx,{
                        type:'radar',
                        data:{
                            labels:radarLabels,
                            datasets:[
                                {label:shortInspectorName,data:[speedScore,qualityScore,jamScore,consistScore,volScore,attendanceScore],
                                 realData:[item.avgPph.toFixed(1),(100-item.rate).toFixed(1)+'%',item.avgJam.toFixed(1),(100-item.cv).toFixed(1)+'%',item.totalInspect.toLocaleString('en-US'),item.distinctDates.size+' Hari'],
                                 borderColor:navyColor,backgroundColor:navyColor+'44',borderWidth:2,pointRadius:4,datalabels:{display:false}},
                                {label:t('team_avg'),data:[tSpeedScore,tQualityScore,tJamScore,tConsistScore,tVolScore,tAttendanceScore],
                                 realData:[teamAvgPph.toFixed(1),(100-teamAvgRate).toFixed(1)+'%',teamAvgJam.toFixed(1),(100-teamAvgCv).toFixed(1)+'%',(teamAgg.reduce((s,a)=>s+a.totalInspect,0)/teamAgg.length).toLocaleString('en-US'),(teamAgg.reduce((s,a)=>s+a.distinctDates.size,0)/teamAgg.length).toFixed(1)+' Hari'],
                                 borderColor:'#94a3b8',backgroundColor:'rgba(100,116,139,0.08)',borderWidth:1.5,borderDash:[4,3],pointRadius:2,datalabels:{display:false}}
                            ]
                        },
                        options:{
                            responsive:true,maintainAspectRatio:false,
                            plugins:{
                                legend:{display:true,position:'top',labels:{boxWidth:8,font:{size:9},color:tc()}},
                                datalabels:{display:false},
                                tooltip:{callbacks:{label:function(ctx){const labels=ctx.dataset.realData||[];const realVal=labels[ctx.dataIndex]!==undefined?labels[ctx.dataIndex]:ctx.raw;return`${ctx.dataset.label}: ${realVal}`;}}}
                            },
                            scales:{r:{min:0,max:overallMax,ticks:{display:false},grid:{color:gc()},pointLabels:{color:tc(),font:{size:9,weight:'bold'}}}}
                        }
                    });
                }
            },150);
        }

        async function showInsight(type){
            const wrap=document.getElementById(`insight_${type}_wrap`);
            const inner=document.getElementById(`insight_${type}_inner`);
            if(!wrap||!inner) return;
            if(wrap.classList.contains('open')){wrap.classList.remove('open');return;}
            const payload=buildInsightPayload(type);
            if(!payload){wrap.classList.remove('open');return;}
            const cacheKey=`${type}_${JSON.stringify(payload.data).substring(0,200)}`;
            if(window.aiCache[cacheKey]){inner.innerHTML=renderInsightBox(window.aiCache[cacheKey]);wrap.classList.add('open');return;}
            inner.innerHTML=`<div class="ai-loader"><div class="ai-spinner"></div><div class="ai-loader-txt">${t('ai_analyzing')}</div></div>`;
            wrap.classList.add('open');
            try{
                const r=await fetch(URL_AI,{method:'POST',body:JSON.stringify({action:'ai_insight',data:payload.data,prompt:payload.prompt}),headers:{'Content-Type':'text/plain;charset=utf-8'}});
                const j=await r.json();
                const txt=j.result||'AI DID NOT RESPOND';
                window.aiCache[cacheKey]=txt;
                inner.innerHTML=renderInsightBox(txt);
            }catch(e){
                inner.innerHTML=`<div style="text-align:center;padding:12px;font-weight:bold;color:var(--danger)">ERROR ${e.message}</div>`;
            }
        }

        function buildInsightPayload(type){
            const start=document.getElementById('f_start').value;
            const end  =document.getElementById('f_end').value;
            const rows =filterByPosisi(globalKPI);
            const agg  =aggregateInspectors(rows);
            const isId =currentLang==='id';
            const langNote=isId
                ? 'PENTING: Output Anda WAJIB dalam Bahasa Indonesia. Gunakan istilah "defect", bukan "cacat".'
                : 'IMPORTANT: Output MUST be in English.';
            const prompt_template=(data,context)=>`${langNote} Analysis period: ${start} to ${end}. Context: ${context} Provide analysis in concise HTML format with: 1. <p><b>Executive Summary:</b> 2-3 key sentences.</p> 2. <p><b>Critical Findings:</b></p><ul>3 key insights from data</ul> 3. <p><b>Action Recommendations:</b></p><ol>3 concrete steps for SPV/Manager</ol> 4. <p><b>Highlights:</b> Name inspectors who stand out (positively/negatively) based on data.</p> DATA:\n${JSON.stringify(data,null,2)}`;

            if(type==='section_compare'){
                const data=['SEWING','FINISHING','WASHING'].map(area=>{
                    const r=agg.filter(x=>x.area===area);
                    if(!r.length) return{area,count:0};
                    return{area,count:r.length,avgPph:(r.reduce((s,x)=>s+x.avgPph,0)/r.length).toFixed(1),avgRate:(r.reduce((s,x)=>s+x.rate,0)/r.length).toFixed(2),avgJam:(r.reduce((s,x)=>s+x.avgJam,0)/r.length).toFixed(2),avgCv:(r.reduce((s,x)=>s+x.cv,0)/r.length).toFixed(1)};
                });
                return{data,prompt:prompt_template(data,'Comparative performance analysis across Sewing, Finishing, Washing sections. Identify which section is strongest and which needs attention.')};
            }
            if(type.endsWith('_top')){
                const area=type.split('_')[0].toUpperCase();
                const fullArea=area==='SEW'?'SEWING':area==='FIN'?'FINISHING':'WASHING';
                const r=agg.filter(x=>x.area===fullArea).sort((a,b)=>b.totalInspect-a.totalInspect).slice(0,10);
                const data=r.map(x=>({name:x.name,avgPph:x.avgPph.toFixed(1),rate:x.rate.toFixed(2),cv:x.cv.toFixed(1),inspect:x.totalInspect}));
                return{data,prompt:prompt_template(data,`Top 10 Inspector analysis in ${fullArea} section.`)};
            }
            if(type==='adv_scatter'){
                const selArea = document.getElementById('adv_section_sel').value;
                let filteredAgg = agg;
                if(selArea !== 'ALL') filteredAgg = agg.filter(x => x.area === selArea);
                const data = filteredAgg.map(x => ({name: x.name, area: x.area, pph: parseFloat(x.avgPph.toFixed(1)), rate: parseFloat(x.rate.toFixed(2))}));
                return {
                    data: data,
                    prompt: prompt_template(data, 'Analyze the Speed vs Quality (PPH vs Defect Rate) scatter plot data. Identify the best performers (High PPH, Low Defect Rate) and those needing training (High PPH/High Defect Rate or Low PPH/High Defect Rate).')
                };
            }
            if(type==='adv_trend'){
                const selArea = document.getElementById('adv_section_sel').value;
                let rowsAgg = filterByPosisi(globalKPI);
                if(selArea !== 'ALL') rowsAgg = rowsAgg.filter(r => r.area_source === selArea);
                
                const dateMap = {};
                rowsAgg.forEach(r => {
                    const p = parseKPI(r);
                    if(!dateMap[r.tanggal]) dateMap[r.tanggal] = { pphList: [], inspect: 0, def: 0 };
                    if(p.pph > 0) dateMap[r.tanggal].pphList.push(p.pph);
                    dateMap[r.tanggal].inspect += p.inspect;
                    dateMap[r.tanggal].def += p.def;
                });
                
                const dates = Object.keys(dateMap).sort();
                const data = dates.map(d => ({
                    date: d,
                    pph: parseFloat((dateMap[d].pphList.length > 0 ? dateMap[d].pphList.reduce((a,b)=>a+b,0)/dateMap[d].pphList.length : 0).toFixed(1)),
                    defRate: parseFloat((dateMap[d].inspect > 0 ? (dateMap[d].def / dateMap[d].inspect)*100 : 0).toFixed(2))
                }));
                
                return {
                    data: data,
                    prompt: prompt_template(data, `Analyze the macro Performance Trend (PPH vs Defect Rate) for ${selArea} section over time. Identify patterns, spikes in defects, or drops in productivity.`)
                };
            }
            return null;
        }

        function renderInsightBox(txt){
            return`<div class="ai-box"><div class="ai-tab-head"><div style="padding:10px 14px;font-size:10px;font-weight:800;color:var(--text-main);text-transform:uppercase;letter-spacing:.5px">${t('ai_analysis')}</div></div><div class="ai-content">${txt}</div></div>`;
        }

        function renderAdvancedAnalytics() {
            renderScatterPlot();
            renderTrendChart();
        }

        function renderScatterPlot() {
            const ctx = document.getElementById('scatterChart');
            if(!ctx) return;
            const selArea = document.getElementById('adv_section_sel').value;
            const isDark = document.body.classList.contains('dark');
            
            const datasets = [];
            const sectionsToRender = selArea === 'ALL' ? ['SEWING', 'FINISHING', 'WASHING'] : [selArea];

            const sectionColors = {
                'SEWING': { light: '#0f172a', dark: '#93c5fd', borderL: '#1e293b', borderD: '#bfdbfe' },
                'FINISHING': { light: '#b45309', dark: '#fcd34d', borderL: '#92400e', borderD: '#fde68a' },
                'WASHING': { light: '#475569', dark: '#cbd5e1', borderL: '#334155', borderD: '#e2e8f0' }
            };

            sectionsToRender.forEach(sec => {
                let secRows = globalKPI.filter(r => r.area_source === sec);
                if(sec === 'SEWING') secRows = filterByPosisi(secRows);
                
                const agg = aggregateInspectors(secRows);
                const dataPoints = agg.map(a => ({
                    x: parseFloat(a.avgPph.toFixed(1)),
                    y: parseFloat(a.rate.toFixed(2)),
                    inspectorData: a
                }));

                if(dataPoints.length > 0) {
                    datasets.push({
                        label: sec,
                        data: dataPoints,
                        backgroundColor: isDark ? sectionColors[sec].dark : sectionColors[sec].light,
                        borderColor: isDark ? sectionColors[sec].borderD : sectionColors[sec].borderL,
                        borderWidth: 1.5,
                        pointRadius: 6,
                        pointHoverRadius: 9,
                        datalabels: {
                            display: true,
                            align: 'top',
                            anchor: 'end',
                            offset: 4,
                            color: tc(),
                            font: { size: 9, family: 'Inter', weight: 'bold' },
                            formatter: (value, context) => (context.raw && context.raw.inspectorData) ? context.raw.inspectorData.name.split(' ')[0] : "",
                            clip: false
                        }
                    });
                }
            });

            if(window.scatterChartInstance) window.scatterChartInstance.destroy();

            window.scatterChartInstance = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 20, right: 20 } },
                    plugins: {
                        legend: { 
                            display: true, 
                            position: 'top', 
                            labels: { boxWidth: 10, font: { size: 10, weight: 'bold' }, color: tc() } 
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if(!context.raw || !context.raw.inspectorData) return "";
                                    const d = context.raw.inspectorData;
                                    return `${d.name} | PPH: ${d.avgPph.toFixed(1)} | Def Rate: ${d.rate.toFixed(2)}%`;
                                }
                            }
                        },
                        zoom: {
                            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' },
                            pan: { enabled: true, mode: 'xy' }
                        },
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'SPEED (PPH)', color: tc(), font: {weight:'bold', size: 11} },
                            ticks: { color: tc(), font: {weight:'bold'} },
                            grid: { color: gc() }
                        },
                        y: {
                            title: { display: true, text: 'QUALITY (DEFECT RATE %)', color: tc(), font: {weight:'bold', size: 11} },
                            ticks: { color: tc(), font: {weight:'bold'} },
                            grid: { color: gc() }
                        }
                    },
                    onClick: (e, activeEls) => {
                        if (activeEls.length > 0) {
                            const ctxData = activeEls[0].element.$context ? activeEls[0].element.$context.raw : null;
                            if(ctxData && ctxData.inspectorData) {
                                drillDownInspector(ctxData.inspectorData.name, ctxData.inspectorData.area);
                            }
                        }
                    }
                }
            });
        }

        function renderTrendChart() {
            const ctx = document.getElementById('trendChart');
            if(!ctx) return;
            const selArea = document.getElementById('adv_section_sel').value;
            const isDark = document.body.classList.contains('dark');
            let rows = filterByPosisi(globalKPI);
            if(selArea !== 'ALL') {
                rows = rows.filter(r => r.area_source === selArea);
            }
            const dateMap = {};
            rows.forEach(r => {
                const p = parseKPI(r);
                if(!dateMap[r.tanggal]) dateMap[r.tanggal] = { pphList: [], inspect: 0, def: 0 };
                if(p.pph > 0) dateMap[r.tanggal].pphList.push(p.pph);
                dateMap[r.tanggal].inspect += p.inspect;
                dateMap[r.tanggal].def += p.def;
            });
            const dates = Object.keys(dateMap).sort();
            const pphData = dates.map(d => {
                const list = dateMap[d].pphList;
                return list.length > 0 ? parseFloat((list.reduce((a,b)=>a+b,0)/list.length).toFixed(1)) : 0;
            });
            const rateData = dates.map(d => {
                return dateMap[d].inspect > 0 ? parseFloat(((dateMap[d].def / dateMap[d].inspect) * 100).toFixed(2)) : 0;
            });
            const formattedDates = dates.map(d => formatShortDate(d));
            if(window.trendChartInstance) window.trendChartInstance.destroy();
            window.trendChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: formattedDates,
                    datasets: [
                        {
                            label: t('avg_pph_lbl'),
                            data: pphData,
                            borderColor: isDark ? '#fcd34d' : '#b45309',
                            backgroundColor: isDark ? 'rgba(252,211,77,0.1)' : 'rgba(180,83,9,0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 4,
                            yAxisID: 'y'
                        },
                        {
                            label: t('def_rate_lbl') + ' (%)',
                            data: rateData,
                            borderColor: '#ef4444',
                            backgroundColor: '#ef4444',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.3,
                            pointRadius: 4,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    layout: {
                        padding: formattedDates.length <= 2 ? { left: 50, right: 50 } : { left: 0, right: 0 }
                    },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { color: tc(), font: { size: 10, weight: 'bold' } } },
                        datalabels: { display: false }
                    },
                    scales: {
                        x: {
                            offset: formattedDates.length <= 3,
                            ticks: { color: tc(), font: { weight: 'bold' } },
                            grid: { display: false }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'SPEED (PPH)', color: tc(), font: { weight: 'bold', size: 10 } },
                            ticks: { color: tc() },
                            grid: { color: gc() }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'QUALITY (DEF RATE %)', color: '#ef4444', font: { weight: 'bold', size: 10 } },
                            ticks: { color: '#ef4444' },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            });
        }

        function takeScreenshot(){
            document.getElementById('topActions').style.display='none';
            const isDark=document.body.classList.contains('dark');
            const bg=isDark?'#0b1120':'#e8edf2';
            setTimeout(()=>{
                html2canvas(document.body,{backgroundColor:bg,scale:2,logging:false,useCORS:true}).then(canvas=>{
                    document.getElementById('topActions').style.display='flex';
                    const start=document.getElementById('f_start').value;
                    const end  =document.getElementById('f_end').value;
                    const link=document.createElement('a');
                    link.download=`KPI_INSPECTOR_${start}_${end}.png`.toUpperCase();
                    link.href=canvas.toDataURL('image/png');
                    link.click();
                    Swal.fire({toast:true,position:'top',icon:'success',title:'SCREENSHOT SAVED',showConfirmButton:false,timer:2000});
                }).catch(()=>{document.getElementById('topActions').style.display='flex';});
            },150);
        }

        async function openPdfExportModal() {
            document.getElementById('dropMenu').classList.remove('open');
            const isDark = document.body.classList.contains('dark');
            const res = await Swal.fire({
                title: 'EXPORT PDF (PER SECTION)',
                html: `
                    <div style="display:flex;flex-direction:column;gap:12px;text-align:left;font-size:13px;font-weight:600;margin-top:10px;padding:0 20px;">
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;"><input type="checkbox" id="pdf_sew" value="SEWING" checked style="width:16px;height:16px;"> SEWING</label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;"><input type="checkbox" id="pdf_fin" value="FINISHING" checked style="width:16px;height:16px;"> FINISHING</label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;"><input type="checkbox" id="pdf_was" value="WASHING" checked style="width:16px;height:16px;"> WASHING</label>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'GENERATE PDF',
                cancelButtonText: 'CANCEL',
                confirmButtonColor: 'var(--text-main)',
                customClass: { popup: isDark ? 'swal-dark' : '' },
                preConfirm: () => {
                    const sections = [];
                    if(document.getElementById('pdf_sew').checked) sections.push('SEWING');
                    if(document.getElementById('pdf_fin').checked) sections.push('FINISHING');
                    if(document.getElementById('pdf_was').checked) sections.push('WASHING');
                    if(sections.length === 0) {
                        Swal.showValidationMessage('Select at least one section to export');
                        return false;
                    }
                    return sections;
                }
            });
            if(res.isConfirmed && res.value) {
                generatePDFs(res.value);
            }
        }

        async function generatePDFs(sections) {
            showLoading('GENERATING PDF...');
            const { jsPDF } = window.jspdf;
            const start = document.getElementById('f_start').value;
            const end = document.getElementById('f_end').value;
            const workDays = getWorkDays(start, end);

            for (const sec of sections) {
                const rows = globalKPI.filter(r => r.area_source === sec);
                let secRows = sec === 'SEWING' ? filterByPosisi(rows) : rows;
                const agg = aggregateInspectors(secRows);
                if (agg.length === 0) continue;

                agg.sort((a,b) => b.totalInspect - a.totalInspect);

                const teamAgg = aggregateInspectors(globalKPI.filter(r => r.area_source === sec));
                const teamAvgPph = teamAgg.length > 0 ? teamAgg.reduce((s,a) => s+a.avgPph,0)/teamAgg.length : 1;
                const teamAvgRate = teamAgg.length > 0 ? teamAgg.reduce((s,a) => s+a.rate,0)/teamAgg.length : 1;
                const teamAvgJam = teamAgg.length > 0 ? teamAgg.reduce((s,a) => s+a.avgJam,0)/teamAgg.length : 1;
                const teamAvgCv = teamAgg.length > 0 ? teamAgg.reduce((s,a) => s+a.cv,0)/teamAgg.length : 1;
                const maxPph = Math.max(...teamAgg.map(a => a.avgPph)) || 1;
                const maxVol = Math.max(...teamAgg.map(a => a.totalInspect)) || 1;
                
                const tSpeedScore = (teamAvgPph/maxPph)*100;
                const tQualityScore = Math.max(0,100-teamAvgRate);
                const tJamScore = (teamAvgJam/10)*100;
                const tConsistScore = Math.max(0,100-teamAvgCv);
                const tVolScore = ((teamAgg.reduce((s,a)=>s+a.totalInspect,0)/teamAgg.length)/maxVol)*100;
                
                const teamAggWithAttendance = teamAgg.map(a => Math.min(100, (a.distinctDates.size / workDays) * 100));
                const tAttendanceScore = teamAggWithAttendance.length > 0 ? teamAggWithAttendance.reduce((a,b)=>a+b,0)/teamAggWithAttendance.length : 100;

                let secTitle = sec;
                if (sec === 'SEWING') {
                    const pos = document.getElementById('f_posisi').value;
                    if (pos === 'ENDLINE') secTitle = 'SEWING (QC ENDLINE)';
                    else if (pos === 'INLINE') secTitle = 'SEWING (QC INLINE)';
                    else secTitle = 'SEWING (ALL POSITIONS)';
                }

                const topN = parseInt(document.getElementById('f_topn').value) || 10;
                const topAgg = agg.slice(0, topN);

                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.top = '-9999px';
                container.style.left = '-9999px';
                container.style.width = '2200px'; 
                container.style.background = '#ffffff';
                container.style.color = '#000000';
                container.style.padding = '40px 50px 80px 50px';
                container.style.display = 'grid';
                container.style.gridTemplateColumns = 'repeat(5, 1fr)';
                container.style.gap = '16px';
                container.style.boxSizing = 'border-box';
                container.style.height = 'auto';
                container.style.fontFamily = 'Inter, sans-serif';
                document.body.appendChild(container);

                const header = document.createElement('div');
                header.style.gridColumn = '1 / -1';
                header.style.borderBottom = '3px solid #0f172a';
                header.style.paddingBottom = '8px';
                header.style.marginBottom = '10px';
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'flex-end';
                header.innerHTML = `
                    <div>
                        <h2 style="font-family:'Bebas Neue',sans-serif;font-size:32px;margin:0;color:#0f172a;">${secTitle} PERFORMANCE REPORT</h2>
                        <p style="font-size:12px;font-weight:800;color:#64748b;margin-top:4px;">PERIOD: ${fmtDateFull(start).toUpperCase()} TO ${fmtDateFull(end).toUpperCase()}</p>
                    </div>
                    <div style="font-size:14px;font-weight:900;color:#b45309;">TOP ${topN}</div>
                `;
                container.appendChild(header);

                const radarLabels=[t('radar_speed'),t('radar_quality'),t('radar_hours'),t('radar_consist'),t('radar_volume'),t('radar_attend')];
                const chartInstances = [];

                for (const item of topAgg) {
                    const card = document.createElement('div');
                    card.style.border = '1px solid #dde3ea';
                    card.style.borderRadius = '4px';
                    card.style.padding = '10px';
                    card.style.boxSizing = 'border-box';
                    card.style.background = '#f8fafc';

                    let posTag = '';
                    if (sec === 'SEWING') {
                        const itemRows = secRows.filter(r => getName(r) === item.name);
                        const posSet = new Set(itemRows.map(r => {
                            const p = getPosisi(r);
                            if (p.includes('ENDLINE') || p.includes('100')) return 'ENDLINE';
                            if (p.includes('INLINE') || p.includes('TLS')) return 'INLINE';
                            return null;
                        }).filter(Boolean));
                        posTag = [...posSet].join('/');
                    }
                    
                    const title = document.createElement('div');
                    title.style.fontSize = '11px';
                    title.style.fontWeight = '900';
                    title.style.marginBottom = '8px';
                    title.style.color = '#0f172a';
                    title.style.textTransform = 'uppercase';
                    title.style.whiteSpace = 'nowrap';
                    title.style.overflow = 'hidden';
                    title.style.textOverflow = 'ellipsis';
                    title.innerHTML = posTag
                        ? `${item.name} <span style="font-size:9px;font-weight:800;color:#b45309;">[${posTag}]</span>`
                        : item.name;
                    card.appendChild(title);

                    const statsRow = document.createElement('div');
                    statsRow.style.display = 'flex';
                    statsRow.style.justifyContent = 'space-between';
                    statsRow.style.gap = '4px';
                    statsRow.style.marginBottom = '8px';
                    statsRow.style.fontSize = '9px';
                    statsRow.style.fontWeight = '700';
                    statsRow.innerHTML = `
                        <div style="text-align:center;flex:1;background:#eef2f7;border-radius:3px;padding:4px 2px;">
                            <div style="color:#64748b;font-size:8px;text-transform:uppercase;">INSPECT</div>
                            <div style="color:#0f172a;font-size:11px;font-weight:900;">${item.totalInspect.toLocaleString('en-US')}</div>
                        </div>
                        <div style="text-align:center;flex:1;background:#eef2f7;border-radius:3px;padding:4px 2px;">
                            <div style="color:#64748b;font-size:8px;text-transform:uppercase;">GOOD</div>
                            <div style="color:#047857;font-size:11px;font-weight:900;">${item.totalGood.toLocaleString('en-US')}</div>
                        </div>
                        <div style="text-align:center;flex:1;background:#eef2f7;border-radius:3px;padding:4px 2px;">
                            <div style="color:#64748b;font-size:8px;text-transform:uppercase;">DEFECT</div>
                            <div style="color:#b91c1c;font-size:11px;font-weight:900;">${item.totalDef.toLocaleString('en-US')}</div>
                        </div>
                        <div style="text-align:center;flex:1;background:#eef2f7;border-radius:3px;padding:4px 2px;">
                            <div style="color:#64748b;font-size:8px;text-transform:uppercase;">DEF RATE</div>
                            <div style="color:#b91c1c;font-size:11px;font-weight:900;">${item.rate.toFixed(2)}%</div>
                        </div>
                    `;
                    card.appendChild(statsRow);

                    const canvasContainer = document.createElement('div');
                    canvasContainer.style.position = 'relative';
                    canvasContainer.style.height = '180px';
                    canvasContainer.style.width = '100%';
                    canvasContainer.style.background = '#ffffff';
                    canvasContainer.style.borderRadius = '4px';
                    canvasContainer.style.padding = '5px';
                    canvasContainer.style.border = '1px solid #e2e8f0';
                    
                    const canvas = document.createElement('canvas');
                    canvasContainer.appendChild(canvas);
                    card.appendChild(canvasContainer);
                    container.appendChild(card);

                    const speedScore = (item.avgPph/maxPph)*100;
                    const qualityScore = Math.max(0,100-item.rate);
                    const jamScore = (item.avgJam/10)*100;
                    const consistScore = Math.max(0,100-item.cv);
                    const volScore = (item.totalInspect/maxVol)*100;
                    const attendanceScore = Math.min(100, (item.distinctDates.size / workDays) * 100);
                    const overallMax = Math.max(speedScore,qualityScore,jamScore,consistScore,volScore,attendanceScore,tSpeedScore,tQualityScore,tJamScore,tConsistScore,tVolScore,tAttendanceScore)*1.1;

                    const chart = new Chart(canvas, {
                        type:'radar',
                        data:{
                            labels:radarLabels,
                            datasets:[
                                {
                                    label:item.name.split(' ')[0],
                                    data:[speedScore,qualityScore,jamScore,consistScore,volScore,attendanceScore],
                                    borderColor:'#0f172a',
                                    backgroundColor:'rgba(15,23,42,0.15)',
                                    borderWidth:2,
                                    pointRadius:0,
                                    datalabels:{display:false}
                                },
                                {
                                    label:'TEAM AVG',
                                    data:[tSpeedScore,tQualityScore,tJamScore,tConsistScore,tVolScore,tAttendanceScore],
                                    borderColor:'#94a3b8',
                                    backgroundColor:'transparent',
                                    borderWidth:2,
                                    borderDash:[4,4],
                                    pointRadius:0,
                                    datalabels:{display:false}
                                }
                            ]
                        },
                        options:{
                            responsive:true,
                            maintainAspectRatio:false,
                            animation:false,
                            plugins:{
                                legend:{display:true,position:'top',labels:{boxWidth:12,font:{size:10,weight:'bold'},color:'#000'}},
                                datalabels:{display:false}
                            },
                            scales:{
                                r:{
                                    min:0,
                                    max:overallMax,
                                    ticks:{display:false},
                                    grid:{color:'#e2e8f0'},
                                    pointLabels:{color:'#0f172a',font:{size:9,weight:'bold'}}
                                }
                            }
                        }
                    });
                    chartInstances.push(chart);
                }

                await new Promise(r => setTimeout(r, 1000));

                const captureHeight = container.scrollHeight;
                const captureWidth = container.scrollWidth;
                const canvasPdf = await html2canvas(container, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: captureWidth,
                    height: captureHeight,
                    windowWidth: captureWidth,
                    windowHeight: captureHeight
                });

                const MAX_DIM_MM = 3000;
                const imgRatio = canvasPdf.width / canvasPdf.height;
                let pdfWidthMM, pdfHeightMM;
                if (imgRatio >= 1) {
                    pdfWidthMM = MAX_DIM_MM;
                    pdfHeightMM = MAX_DIM_MM / imgRatio;
                } else {
                    pdfHeightMM = MAX_DIM_MM;
                    pdfWidthMM = MAX_DIM_MM * imgRatio;
                }

                const MAX_PDF_BYTES = 5 * 1024 * 1024;
                let quality = 0.92;
                let pdfBlob = null;
                let attempts = 0;
                while (attempts < 8) {
                    const imgDataTry = canvasPdf.toDataURL('image/jpeg', quality);
                    const pdfTry = new jsPDF({
                        orientation: pdfWidthMM >= pdfHeightMM ? 'l' : 'p',
                        unit: 'mm',
                        format: [pdfWidthMM, pdfHeightMM],
                        compress: true
                    });
                    pdfTry.addImage(imgDataTry, 'JPEG', 0, 0, pdfWidthMM, pdfHeightMM);
                    const blobTry = pdfTry.output('blob');
                    if (blobTry.size <= MAX_PDF_BYTES || quality <= 0.35) {
                        pdfBlob = blobTry;
                        break;
                    }
                    quality -= 0.1;
                    attempts++;
                }

                const blobUrl = URL.createObjectURL(pdfBlob);
                const dlLink = document.createElement('a');
                dlLink.href = blobUrl;
                dlLink.download = `KPI_${secTitle}_${start}_${end}.pdf`;
                document.body.appendChild(dlLink);
                dlLink.click();
                document.body.removeChild(dlLink);
                URL.revokeObjectURL(blobUrl);

                chartInstances.forEach(c => c.destroy());
                document.body.removeChild(container);
            }
            hideLoading();
            Swal.fire({toast:true,position:'top',icon:'success',title:'PDF DOWNLOADED',showConfirmButton:false,timer:2000});
        }

        function resetChart() {
            if (window.scatterChartInstance) {
                window.scatterChartInstance.resetZoom();
            }
        }