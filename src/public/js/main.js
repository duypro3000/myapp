/* ====== UTILITY: Debounce (Dùng cho tìm kiếm) ====== */
/**
 * Chờ người dùng ngừng gõ trong 'wait' mili giây rồi mới chạy hàm 'func'.
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* ====== Autocomplete (🚀 NÂNG CẤP: Đã thêm Debounce) ====== */
// 1. Đây là hàm tìm kiếm gốc
async function _autocompleteSearch(q){
  const ul = document.getElementById('search-suggest');
  if (!ul) return;
  if (!q || q.length < 2){ ul.classList.remove('show'); ul.innerHTML=''; return; }
  try {
    const res = await fetch('/api/search/suggest?q=' + encodeURIComponent(q));
    const data = await res.json();
    if (!data.length){ ul.classList.remove('show'); ul.innerHTML=''; return; }
    ul.innerHTML = data.map(d => `<li><a href="/p/${d.slug}">${d.name}</a></li>`).join('');
    ul.classList.add('show');
  } catch { ul.classList.remove('show'); }
}

// 2. 🚀 NÂNG CẤP: Tạo ra một phiên bản "chờ" 300ms của hàm tìm kiếm
const autocompleteSearch = debounce(_autocompleteSearch, 300);

// 3. 🚀 NÂNG CẤP: Tự động gán listener cho ô tìm kiếm
// (Chúng ta sẽ cần thêm id="search-input" vào ô input trong header.ejs)
const searchInput = document.getElementById('search-input');
if(searchInput) {
  searchInput.addEventListener('input', (e) => {
    autocompleteSearch(e.target.value);
  });
}

// Ẩn gợi ý khi nhấp ra ngoài
document.addEventListener('click', (e)=>{
  const ul = document.getElementById('search-suggest');
  if (ul && !e.target.closest('.search')) ul.classList.remove('show');
});

/* ====== Dropdown generic ====== */
document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('[data-dropdown-toggle]');
  // Đóng dropdown khác
  document.querySelectorAll('.dropdown').forEach(d => {
    if (!d.contains(e.target)) d.classList.remove('show');
  });
  if (toggleBtn) {
    const holder = toggleBtn.closest('.dropdown');
    if (holder) holder.classList.toggle('show');
  }
});

// Theme dropdown actions
document.querySelectorAll('[data-set-theme]')
  .forEach(btn => btn.addEventListener('click', () => {
    const mode = btn.getAttribute('data-set-theme');
    if (window.setTheme) window.setTheme(mode);
  }));


/* ====== Theme Toggle (🚀 ĐÃ SỬA: Đơn giản hóa 2-state Light/Dark) ====== */
(function(){
  const html = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeToggleIcon');

  function applyTheme(mode){
    // mode: 'light' | 'dark'
    const isDark = (mode === 'dark');
    html.classList.toggle('theme-dark', isDark);
    if (icon) icon.className = isDark ? 'ri-sun-line' : 'ri-moon-line';
  }

  // Lấy theme đã lưu, nếu không có hoặc là 'system' -> mặc định là 'light'
  let saved = localStorage.getItem('theme');
  if (saved === 'system' || !saved) {
     saved = 'light'; 
     localStorage.setItem('theme', saved);
  }
  applyTheme(saved); // Áp dụng theme đã lưu

  // expose API cho dropdown
  window.setTheme = function(mode){
    const next = (mode === 'dark') ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    applyTheme(next);
    if (btn) btn.title = 'Giao diện: ' + next;
  }

  // Gán sự kiện cho nút
  if (btn){
    btn.addEventListener('click', ()=>{
      const cur = localStorage.getItem('theme') || 'light';
      const next = (cur === 'light') ? 'dark' : 'light';
      window.setTheme(next);
    });
  }
  // Đã xóa listener cho system change vì đã bỏ logic 'system'
})();


/* ====== Header shadow on scroll (🚀 NÂNG CẤP: Dùng classList) ====== */
const topbar = document.querySelector('.topbar');
if (topbar){
  const onScroll = () => {
    // Thêm/xóa class 'scrolled' thay vì đổi style trực tiếp
    if (window.scrollY > 8) {
      topbar.classList.add('scrolled');
    } else {
      topbar.classList.remove('scrolled');
    }
  };
  /* Vui lòng thêm style này vào tệp main.css của bạn:
    .topbar.scrolled { 
      box-shadow: 0 8px 22px rgba(0,0,0,.12) !important; 
    }
  */
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ====== Banner Slider (🚀 ĐÃ XÓA) ====== */
// LÝ DO: Tệp index.ejs của bạn đã dùng thư viện Swiper.js.
// Code slider tự chế (từ dòng 65-103) ở đây bị thừa và không được dùng.
// Xóa đi giúp tệp gọn gàng hơn.


/* ====== Reveal on scroll (AOS tuỳ biến - Giữ nguyên) ====== */
(function(){
  const els = document.querySelectorAll('[data-animate], [aos], .ro-animate');
  if (!els.length) return;

  // pre style
  els.forEach(el=>{
    el.classList.add('aos-pre');
    const dur = el.getAttribute('data-duration') || '.6s';
    const delay = el.getAttribute('data-delay') || '0ms';
    const dist = el.getAttribute('data-distance') || '14px';
    el.style.setProperty('--a-dur', typeof dur === 'string' && dur.includes('ms') || dur.includes('s') ? dur : dur + 'ms');
    el.style.setProperty('--a-delay', typeof delay === 'string' && (delay.includes('ms') || delay.includes('s')) ? delay : delay + 'ms');
    el.style.setProperty('--a-dist', dist);
    el.style.transitionDelay = el.style.getPropertyValue('--a-delay');
  });

  if (!('IntersectionObserver' in window)){
    els.forEach(el=> el.classList.add('aos-in'));
    return;
  }
  const io = new IntersectionObserver(entries=>{
    entries.forEach(({isIntersecting, target})=>{
      if (isIntersecting){
        requestAnimationFrame(()=>{
          target.classList.add('aos-in');
          target.classList.remove('aos-pre');
        });
        io.unobserve(target);
      }
    });
  }, { threshold: .15, rootMargin: '0px 0px -10% 0px' });

  els.forEach(el=> io.observe(el));
})();

/* ====== Flash Sale Countdown (Giữ nguyên) ====== */
(function(){
  const holder = document.getElementById('flash-sale');
  if (!holder) return;
  const endISO = holder.getAttribute('data-countdown-end');
  if (!endISO) return;

  const timerEl = document.getElementById('flash-timer');
  const pad = n => String(n).padStart(2,'0');

  function tick(){
    const end = new Date(endISO).getTime();
    const now = Date.now();
    let t = Math.max(0, Math.floor((end - now)/1000));
    const h = Math.floor(t/3600); t %= 3600;
    const m = Math.floor(t/60);   t %= 60;
    const s = t;
    if (timerEl) timerEl.textContent = `Kết thúc sau ${pad(h)}:${pad(m)}:${pad(s)}`;
    if (end - now <= 0) {
      if (timerEl) timerEl.textContent = 'Đã kết thúc';
      clearInterval(intv);
    }
  }
  const intv = setInterval(tick, 1000);
  tick();
})();

(function(){
  function makeSkeletonCard(){
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    `;
  }
  function injectSkeletons(container, count){
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.className = container.className; // giữ grid columns
    wrap.style.position = 'relative';
    wrap.setAttribute('data-skeleton-wrap','');
    wrap.innerHTML = Array.from({length: count}).map(makeSkeletonCard).join('');
    container.parentNode.insertBefore(wrap, container);
    container.style.visibility = 'hidden';
    function remove(){
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      container.style.visibility = '';
    }
    window.addEventListener('load', remove, { once:true });
    setTimeout(remove, 1200);
  }

  document.querySelectorAll('[data-skeleton="true"]').forEach(grid=>{
    const count = grid.children.length || 8;
    injectSkeletons(grid, Math.min(Math.max(count, 6), 12));
  });
})();