(function () {
  const M = window.MENU;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, "0");
  const key = (d) => `${M.year}-${pad(M.month)}-${pad(d)}`;
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const daysInMonth = new Date(M.year, M.month, 0).getDate();
  const ICON = {
    breakfast: '<svg viewBox="0 0 24 24"><circle cx="12" cy="14" r="4"/><path d="M12 4v3M4.5 7.5l2 2M19.5 7.5l-2 2M3 18h18"/></svg>',
    lunch: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    dinner: '<svg viewBox="0 0 24 24"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/></svg>'
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ── 하양이 ── */
  let lambHTML = '<svg viewBox="0 0 120 110"><use href="#lamb"/></svg>';
  const probe = new Image();
  probe.onload = () => {
    lambHTML = '<img src="images/hayangi.png" alt="하양이">';
    $$("[data-mascot]").forEach((el) => (el.innerHTML = lambHTML));
  };
  probe.src = "images/hayangi.png";

  /* ── 음식 사진: 메뉴 이름 → 위키백과 대표 사진 ──
     "(뚝)순살마늘닭볶음탕&당면사리" → "순살마늘닭볶음탕" → 사전에서 '닭볶음탕' 찾기 → 위키백과 사진 */
  const DISH = ["김치찌개", "된장찌개", "순두부찌개", "부대찌개", "고추장찌개", "청국장", "김치볶음밥", "볶음밥", "비빔밥",
    "제육볶음", "제육", "불고기", "닭갈비", "닭볶음탕", "닭볶음", "찜닭", "닭찜", "갈비찜", "김치찜", "돈가스", "돈까스", "까스", "카츠",
    "카레라이스", "카레", "하이라이스", "오므라이스", "덮밥", "짜장면", "자장", "짬뽕", "탕수육", "마파두부",
    "잡채", "떡볶이", "김밥", "유부초밥", "라면", "우동", "냉면", "칼국수", "칼제비", "잔치국수", "비빔국수", "국수", "쫄면",
    "쌀국수", "팟타이", "소바", "스파게티", "파스타", "수제비", "삼계탕", "미역국", "육개장", "닭개장", "설렁탕",
    "갈비탕", "곰탕", "감자탕", "해장국", "순대국", "국밥", "떡국", "만두국", "고깃국", "만두", "어묵", "계란말이",
    "계란찜", "동그랑땡", "강정", "닭강정", "치킨", "함박스테이크", "함박", "필라프", "샌드위치", "산도", "버거",
    "핫도그", "토스트", "샐러드", "순대", "보쌈", "수육", "족발", "삼겹살", "삼겹", "주물럭", "두루치기", "훈제오리",
    "김치전", "파전", "콩나물밥", "스크램블에그", "소시지", "치킨너겟", "짜계치",
    "찌개", "부대", "순두부", "김치볶음", "마요덮밥"];
  const ALIAS = {
    "돈까스": "돈가스", "까스": "돈가스", "카츠": "돈가스", "제육": "제육볶음", "닭볶음": "닭볶음탕", "닭찜": "찜닭",
    "카레": "카레라이스", "자장": "짜장면", "칼제비": "칼국수", "만두국": "떡국", "고깃국": "소고기뭇국",
    "강정": "닭강정", "함박": "함박스테이크", "산도": "샌드위치", "버거": "햄버거", "삼겹": "삼겹살 구이",
    "주물럭": "제육볶음", "두루치기": "제육볶음", "덮밥": "규동", "마요덮밥": "오야코동",
    "부대": "부대찌개", "순두부": "순두부찌개", "김치볶음": "두부김치", "수육": "보쌈", "삼겹살": "삼겹살 구이", "라면": "라멘", "고추장찌개": "찌개", "스크램블에그": "스크램블드 에그",
    "치킨너겟": "치킨 너깃", "짜계치": "짜장라면", "순대국": "순댓국", "국수": "잔치국수", "훈제오리": "오리고기"
  };
  const CACHE_KEY = "cuk-menu-photos-v4";
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch (e) {}
  const save = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {} };
  const inflight = {};

  const core = (name) => name.replace(/^\(?[뚝냄비철판]+\)/, "").split(/[&*/]/)[0].replace(/\(.*?\)/g, "").replace(/\s+/g, "").replace(/st/g, "");
  function candidates(name) {
    const c = core(name);
    // 이름 끝쪽에 있는 요리 이름이 진짜 요리예요 ("치즈돈까스" → 돈까스).
    // 단, 그냥 "덮밥"은 마지막 수단 ("마파두부덮밥" → 마파두부)
    const pick = (list) => {
      let best = null, bestEnd = -1;
      for (const d of list) {
        const at = c.lastIndexOf(d);
        if (at < 0) continue;
        const end = at + d.length;
        if (end > bestEnd || (end === bestEnd && d.length > best.length)) { best = d; bestEnd = end; }
      }
      return best;
    };
    const best = pick(DISH.filter((d) => d !== "덮밥")) || pick(["덮밥"]);
    const out = [c];
    if (best) out.push(ALIAS[best] || best);
    return [...new Set(out)];
  }
  async function wikiThumb(title) {
    const r = await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.type !== "standard") return null;
    const src = (j.thumbnail && j.thumbnail.source) || (j.originalimage && j.originalimage.source);
    // 위키미디어는 정해진 폭(330/500/960…)만 만들어줘요
    return src ? src.replace(/\/\d+px-/, "/960px-") : null;
  }
  // 사이트에 저장해 둔 사진이 있으면 그걸 먼저 써요 (photos.js). 없을 때만 위키백과에서 찾아요.
  const LOCAL = window.PHOTOS || { files: [], map: {} };
  const localPhoto = (name) => { const i = LOCAL.map[name]; return i == null ? null : LOCAL.files[i]; };
  function creditFor(name) {
    const f = localPhoto(name);
    if (!f) return "";
    let label = f[1];
    try { label = decodeURIComponent(f[1]); } catch (e) {}
    return `<a href="https://commons.wikimedia.org/wiki/File:${f[1]}" target="_blank" rel="noopener">사진: ${esc(label.replace(/_/g, " "))} (Wikimedia Commons)</a>`;
  }
  function photoFor(name) {
    const lp = localPhoto(name);
    if (lp) return Promise.resolve(lp[0]);
    if (M.localOnly) return Promise.resolve(null);
    const k = core(name);
    if (k in cache) return Promise.resolve(cache[k]);
    if (inflight[k]) return inflight[k];
    inflight[k] = (async () => {
      let url = null;
      for (const t of candidates(name)) {
        try { url = await wikiThumb(t); } catch (e) { url = null; }
        if (url) break;
      }
      cache[k] = url; save();
      return url;
    })();
    return inflight[k];
  }

  /* ── 상태 ── */
  const now = new Date();
  const isThisMonth = now.getFullYear() === M.year && now.getMonth() + 1 === M.month;
  const todayD = isThisMonth ? now.getDate() : null;
  const dayData = (d) => M.days[key(d)] || null;
  const firstData = (() => { for (let d = 1; d <= daysInMonth; d++) if (dayData(d)) return d; return 1; })();
  let sel = todayD || firstData;
  const fromHash = /^#(\d{1,2})$/.exec(location.hash);
  if (fromHash && +fromHash[1] >= 1 && +fromHash[1] <= daysInMonth) sel = +fromHash[1];

  const h = now.getHours() + now.getMinutes() / 60;
  let mealSel = sel === todayD ? (h < 10 ? "breakfast" : h < 14.5 ? "lunch" : "dinner") : "lunch";
  const nowMeal = todayD ? (h < 10 ? "breakfast" : h < 14.5 ? "lunch" : h < 19 ? "dinner" : null) : null;

  function dayInfo(d) {
    const w = new Date(M.year, M.month - 1, d).getDay();
    return { w, hol: M.holidays[key(d)] || null, data: dayData(d) };
  }
  function classes(d, base) {
    const { w, hol, data } = dayInfo(d);
    return [base, w === 0 && "sun", w === 6 && "sat", hol && "hol", !data && "empty"].filter(Boolean).join(" ");
  }

  /* ── 날짜 띠 ── */
  const strip = $("[data-strip]");
  function buildStrip() {
    let s = "";
    for (let d = 1; d <= daysInMonth; d++) {
      s += `<button type="button" class="${classes(d, "d")}${d === todayD ? " is-today" : ""}" data-day="${d}">
        <span class="wd">${WD[dayInfo(d).w]}</span><span class="dn">${d}</span><span class="dot"></span></button>`;
    }
    strip.innerHTML = s;
  }

  /* ── 카드 ── */
  const plateSvg = '<svg viewBox="0 0 92 70" fill="none" stroke="#1d3a6b" stroke-width="2.4" stroke-linecap="round"><ellipse cx="46" cy="44" rx="38" ry="16" fill="#fffdf8"/><ellipse cx="46" cy="42" rx="24" ry="8" fill="#fdf1cc"/><path d="M30 20c0-6 6-6 6-12M46 18c0-6 6-6 6-12M62 20c0-6 6-6 6-12" stroke="#969cab"/></svg>';
  /* ── 반찬 종류 & 한 줄 설명 ── */
  const KINDS = [
    { k: "sweet", label: "후식·음료", mark: "후", re: /(요구르트|요플레|아이스티|차$|쿨$|콕$|미숫가루|푸딩|꿀떡|절편|빵$|과자|러스크|꽈배기|칩$|연유)/,
      say: "식사 마지막에 곁들이는 후식이에요." },
    { k: "kimchi", label: "김치", mark: "김", re: /(김치$|깍두기|겉절이|석박지)/, say: "식사마다 곁들여 나오는 김치예요." },
    { k: "pickle", label: "절임", mark: "절", re: /(단무지|피클|락교|할라피뇨|쌈무|초생강|산고추|짜사이|장아찌|깻잎지|초절임|고추지$)/,
      say: "새콤짭짤해서 느끼함을 잡아주는 절임 반찬이에요." },
    { k: "fried", label: "튀김·분식", mark: "튀", re: /(튀김|까스|커틀릿|커틀렛|고로케|크로켓|너겟|만두|타코야끼|춘권|핫도그|소떡|떡볶이|떡꼬치|맛탕|가라아게|감자튀김|해쉬브라운|도그|김말이|어묵바|탕수|강정|버거|함박|폭찹|미트볼|산도)/,
      say: "바삭하거나 달콤짭짤해서 인기 많은 곁들이 메뉴예요." },
    { k: "soup", label: "국·스프", mark: "국", re: /(국$|국물|탕$|찌개|스프$|장국|미소국|다대기)/, say: "밥과 함께 먹는 따뜻한 국물이에요." },
    { k: "rice", label: "밥", mark: "밥", re: /(밥$|주먹밥|초밥|사리$|김밥)/, say: "기본으로 나오는 밥이에요." },
    { k: "salad", label: "샐러드", mark: "샐", re: /(샐러드|드레싱|양배추찜|쌈장)/, say: "산뜻하게 입맛을 돋우는 샐러드예요." },
    { k: "namul", label: "무침·나물", mark: "무", re: /(무침|생채|나물|겨자채|잡채|무채|탕평채|(?<!어)묵)/, say: "아삭하게 무쳐낸 가벼운 반찬이에요." },
    { k: "noodle", label: "면", mark: "면", re: /(파스타|푸실리|당면|국수|우동$|쫄면)/, say: "후루룩 곁들여 먹는 면 요리예요." },
    { k: "side", label: "반찬", mark: "반", re: /./, say: "밥과 잘 어울리는 반찬이에요." }
  ];
  const SAY = {
    "배추김치": "절인 배추에 고춧가루 양념을 버무린 기본 김치예요.",
    "깍두기": "깍둑 썬 무로 담근 아삭한 김치예요. 국물 요리랑 특히 잘 맞아요.",
    "단무지": "노랗게 절인 무예요. 면·튀김 메뉴에 자주 곁들여요.",
    "요구르트": "한 병씩 나오는 요구르트예요.",
    "그린샐러드": "양상추 같은 잎채소에 드레싱을 곁들인 샐러드예요.",
    "추가밥": "면 메뉴와 함께 먹을 수 있게 나오는 밥이에요.",
    "쌀밥&잡곡밥": "흰쌀밥과 잡곡밥 중에서 골라 먹을 수 있어요.",
    "쌀밥": "기본 흰쌀밥이에요.",
    "미역국": "참기름에 볶은 미역으로 끓인 담백한 국이에요.",
    "어묵볶음": "어묵을 간장 양념에 볶은 짭조름한 반찬이에요.",
    "콩나물무침": "데친 콩나물을 참기름과 소금으로 무친 반찬이에요.",
    "숙주나물무침": "데친 숙주를 고소하게 무친 반찬이에요.",
    "무생채": "채 썬 무를 새콤달콤 매콤하게 무친 반찬이에요.",
    "알새우칩": "바삭한 새우맛 과자예요.",
    "건빵튀김": "건빵을 튀겨 설탕을 뿌린 달콤한 간식이에요.",
    "마카로니샐러드": "마카로니를 마요네즈에 버무린 고소한 샐러드예요.",
    "오이지무침": "짭짤하게 절인 오이를 꼭 짜서 무친 반찬이에요.",
    "소떡소떡": "소시지와 떡을 번갈아 꽂아 양념을 바른 꼬치예요.",
    "타코야끼": "문어가 들어간 동글동글한 일본식 풀빵이에요."
  };
  function kindOf(name) {
    const c = name.replace(/\(.*?\)/g, "").split(/[&*]/)[0].trim();
    return KINDS.find((x) => x.re.test(c));
  }
  // "배추김치/그린샐러드" 같은 건 따로따로 보여줘요
  const splitSides = (rest) => rest.flatMap((x) => x.split("/").map((s) => s.trim()).filter(Boolean));

  function card(corner, items, wide, idx) {
    const [main, ...rest] = items;
    const sides = splitSides(rest);
    return `<article class="corner${wide ? " wide" : ""}${sides.length ? "" : " solo"}">
      <button type="button" class="corner-hit" data-open="${idx}" aria-label="${esc(main)} 자세히 보기"></button>
      <div class="photo" data-dish="${esc(main)}">
        <img alt="${esc(main)} 참고 사진">
        <div class="ph">${plateSvg}</div>
        <span class="more">자세히</span>
      </div>
      <div class="info">
        <h3 class="corner-title">${esc(corner.name)}</h3>
        <p class="main">${esc(main)}</p>
        ${sides.length ? `<ul class="items">${sides.map((x) => { const k = kindOf(x); return `<li class="k-${k.k}"><b>${k.mark}</b>${esc(x)}</li>`; }).join("")}</ul>` : ""}
      </div>
    </article>`;
  }

  function render() {
    const { w, hol, data } = dayInfo(sel);
    $("[data-day-title]").textContent = `${M.month}월 ${sel}일 ${WD[w]}요일`;
    $("[data-day-sub]").textContent = hol || (sel === todayD ? "오늘 메뉴예요" : "");
    $("[data-prev]").disabled = sel <= 1;
    $("[data-next]").disabled = sel >= daysInMonth;

    $$(".d", strip).forEach((b) => {
      if (+b.dataset.day === sel) b.setAttribute("aria-current", "date");
      else b.removeAttribute("aria-current");
    });
    const cur = strip.querySelector(`[data-day="${sel}"]`);
    if (cur) strip.scrollTo({ left: cur.offsetLeft - strip.clientWidth / 2 + cur.offsetWidth / 2, behavior: render.ready ? "smooth" : "auto" });
    render.ready = true;

    const tabs = $("[data-tabs]");
    const box = $("[data-meals]");
    if (!data) {
      tabs.hidden = true;
      const why = hol ? `${hol}이라 식당이 쉬어요.` : w === 0 || w === 6 ? "주말에는 학생식당이 쉬어요." : "이 날은 식단 정보가 없어요.";
      box.innerHTML = `<div class="rest"><div class="zz" data-mascot>${lambHTML}</div><h3>오늘은 쉬어가요</h3><p>${why}</p></div>`;
      return;
    }
    tabs.hidden = false;
    tabs.innerHTML = M.meals.map((m) => {
      const has = m.corners.some((c) => data[c.key]);
      return `<button type="button" role="tab" class="tab ${m.id}" data-meal="${m.id}" aria-selected="${m.id === mealSel}"${has ? "" : ' data-off'}>
        <i>${ICON[m.id]}</i>${m.label}${sel === todayD && m.id === nowMeal ? '<span class="now-tag">지금</span>' : ""}</button>`;
    }).join("");

    const meal = M.meals.find((m) => m.id === mealSel);
    const avail = meal.corners.filter((c) => data[c.key] && data[c.key].length);
    if (!avail.length) {
      const msg = meal.id === "breakfast" ? (w === 5 ? "금요일에는 천원의 아침밥이 없어요." : "이 날은 아침 운영이 없어요.") : `이 날은 ${meal.label} 운영이 없어요.`;
      box.innerHTML = `<div class="rest small"><div class="zz" data-mascot>${lambHTML}</div><h3>${msg}</h3><p>다른 시간 메뉴를 눌러 보세요.</p></div>`;
      return;
    }
    const wide = avail.length === 1;
    shown = avail.map((c) => ({ corner: c, items: data[c.key], meal }));
    box.innerHTML = `<div class="grid ${wide ? "one" : "many"}">${avail.map((c, i) => card(c, data[c.key], wide, i)).join("")}</div>`;
    fillPhotos(box);
  }
  let shown = [];

  function fillPhotos(root) {
    const forKey = sel + mealSel;
    $$("[data-dish]", root).forEach(async (ph) => {
      const img = $("img", ph);
      const url = await photoFor(ph.dataset.dish);
      if (!url || forKey !== sel + mealSel) return;
      img.onload = () => ph.classList.add("has-img");
      img.src = url;
    });
  }

  /* ── 자세히 보기 ── */
  const sheet = $("[data-sheet]");
  function openSheet(i) {
    const s = shown[i];
    if (!s) return;
    const [main, ...rest] = s.items;
    const sides = splitSides(rest);
    const { w } = dayInfo(sel);
    $("[data-sheet-body]").innerHTML = `
      <div class="sh-photo photo" data-dish="${esc(main)}"><img alt="${esc(main)} 참고 사진"><div class="ph">${plateSvg}</div></div>
      <div class="sh-head">
        <p class="sh-meta">${M.month}월 ${sel}일 (${WD[w]}) · ${s.meal.label} · ${esc(s.corner.name)}</p>
        <h3 class="sh-title" id="sheet-title">${esc(main)}</h3>
        <p class="sh-count">${sides.length ? `함께 나오는 메뉴 ${sides.length}가지` : "단품 메뉴예요"}</p>
      </div>
      ${sides.length ? `<ol class="sides">${sides.map((x) => {
        const k = kindOf(x);
        return `<li class="side k-${k.k}">
          <div class="thumb" data-dish="${esc(x)}"><img alt=""><span class="ph">${k.mark}</span></div>
          <div><p class="side-name">${esc(x)}</p><p class="side-desc"><span class="tag">${k.label}</span>${esc(SAY[x] || k.say)}</p></div>
        </li>`;
      }).join("")}</ol>` : ""}
      <p class="sh-note">사진은 이해를 돕기 위한 참고 사진이라 실제 배식과 다를 수 있어요.${creditFor(main) ? `<br>${creditFor(main)}` : ""}</p>`;
    fillPhotos(sheet);
    sheet.showModal();
    $(".sh-close", sheet).focus();
  }

  function go(d) {
    sel = Math.min(daysInMonth, Math.max(1, d));
    history.replaceState(null, "", `#${sel}`);
    render();
  }

  /* ── 달력 ── */
  const cal = $("[data-cal]");
  function buildCal() {
    const start = new Date(M.year, M.month - 1, 1).getDay();
    let s = "";
    for (let i = 0; i < start; i++) s += '<span class="c blank"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const { hol, data } = dayInfo(d);
      const txt = hol || (data && data.korean ? core(data.korean[0]) : "");
      s += `<button type="button" class="${classes(d, "c")}${d === sel ? " sel" : ""}" data-cday="${d}"><span class="n">${d}</span><span class="m">${esc(txt)}</span></button>`;
    }
    $("[data-cal-grid]").innerHTML = s;
  }

  /* ── 연결 ── */
  $$("[data-month-label]").forEach((el) => (el.textContent = `${M.month}월`));
  $("[data-sample]").hidden = !M.sample;
  $$("[data-mascot]").forEach((el) => (el.innerHTML = lambHTML));
  buildStrip();
  render();

  strip.addEventListener("click", (e) => { const b = e.target.closest("[data-day]"); if (b) go(+b.dataset.day); });
  $("[data-tabs]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-meal]");
    if (b) { mealSel = b.dataset.meal; render(); }
  });
  $("[data-meals]").addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openSheet(+b.dataset.open); });
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest(".sh-close")) sheet.close(); });
  $("[data-prev]").addEventListener("click", () => go(sel - 1));
  $("[data-next]").addEventListener("click", () => go(sel + 1));
  $("[data-open-cal]").addEventListener("click", () => { buildCal(); cal.showModal(); });
  $("[data-close-cal]").addEventListener("click", () => cal.close());
  cal.addEventListener("click", (e) => {
    if (e.target === cal) return cal.close();
    const b = e.target.closest("[data-cday]");
    if (b) { go(+b.dataset.cday); cal.close(); }
  });
  document.addEventListener("keydown", (e) => {
    if (cal.open || sheet.open) return;
    if (e.key === "ArrowLeft") go(sel - 1);
    if (e.key === "ArrowRight") go(sel + 1);
  });
})();
