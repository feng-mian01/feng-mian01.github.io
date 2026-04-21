(() => {
  if (window.__footerDynamicInitialized) return;
  window.__footerDynamicInitialized = true;

  const SITE_START = '2023-01-01T00:00:00+08:00';
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  let runtimeTimer = null;
  let busuanziTimer = null;

  const decodeHtml = (raw = '') => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = raw;
    return textarea.value;
  };

  const formatCount = (count) => {
    if (!Number.isFinite(count) || count < 0) return '0';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  const calcYearAndAnchor = (start, now) => {
    let years = now.getFullYear() - start.getFullYear();
    const anchor = new Date(start.getTime());
    anchor.setFullYear(start.getFullYear() + years);
    if (anchor > now) {
      years -= 1;
      anchor.setFullYear(start.getFullYear() + years);
    }
    return { years, anchor };
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`load failed: ${src}`));
    document.body.appendChild(s);
  });

  const getBusuanziEls = () => ({
    uv: document.getElementById('busuanzi_value_site_uv'),
    pv: document.getElementById('busuanzi_value_site_pv')
  });

  const busuanziReady = () => {
    const { uv, pv } = getBusuanziEls();
    if (!uv || !pv) return true;
    const uvText = (uv.textContent || '').trim();
    const pvText = (pv.textContent || '').trim();
    return /\d/.test(uvText) && /\d/.test(pvText);
  };

  const fallbackBusuanziText = () => {
    const { uv, pv } = getBusuanziEls();
    if (!uv || !pv) return;
    if (!/\d/.test((uv.textContent || '').trim())) uv.textContent = '--';
    if (!/\d/.test((pv.textContent || '').trim())) pv.textContent = '--';
  };

  const ensureBusuanzi = async () => {
    const { uv, pv } = getBusuanziEls();
    if (!uv || !pv) return;
    if (busuanziReady()) return;

    await sleep(2500);
    if (busuanziReady()) return;

    const sources = [
      'https://events.vercount.one/js'
    ];

    for (const src of sources) {
      try {
        await loadScript(src);
        await sleep(1200);
        if (busuanziReady()) return;
      } catch (err) {
        console.warn('[footer-dynamic] counter source failed:', src, err);
      }
    }

    fallbackBusuanziText();
  };

  const getFooterLine = (type) => {
    if (type === 'word') {
      const lines = [...document.querySelectorAll('#footer .footer-custom-left > div')];
      return lines.find((el) => el.textContent.includes('风眠已经写了')) || lines[0] || null;
    }

    const lines = [...document.querySelectorAll('#footer .footer-custom-right > div')];
    return lines.find((el) => el.textContent.includes('本站已运行')) || lines[0] || null;
  };

  const updateRuntime = () => {
    const runtimeEl = getFooterLine('runtime');
    if (!runtimeEl) return;

    const startRaw = SITE_START;
    const start = new Date(startRaw);
    const now = new Date();

    if (Number.isNaN(start.getTime()) || now < start) {
      runtimeEl.textContent = '本站已运行：计算中...';
      return;
    }

    const { years, anchor } = calcYearAndAnchor(start, now);
    const remain = now.getTime() - anchor.getTime();
    const days = Math.floor(remain / DAY);
    const hours = Math.floor((remain % DAY) / HOUR);
    const minutes = Math.floor((remain % HOUR) / MINUTE);
    const seconds = Math.floor((remain % MINUTE) / SECOND);

    runtimeEl.textContent = `本站已运行：${years} 年 ${days} 天 ${hours} 时 ${minutes} 分 ${seconds} 秒`;
  };

  const updateWordCount = async () => {
    const wordEl = getFooterLine('word');
    if (!wordEl) return;

    try {
      const res = await fetch('/search.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const list = await res.json();
      const total = (Array.isArray(list) ? list : []).reduce((acc, item) => {
        const plain = decodeHtml((item && item.content) || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, '');
        return acc + plain.length;
      }, 0);

      wordEl.textContent = `风眠已经写了 ${formatCount(total)} 字，"好像写完一本 伯内特 的 《秘密花园》 了啊"`;
    } catch (err) {
      wordEl.textContent = '风眠已经写了 0 字，"好像写完一本 伯内特 的 《秘密花园》 了啊"';
      console.error('[footer-dynamic] word count failed:', err);
    }
  };

  const mount = () => {
    if (runtimeTimer) clearInterval(runtimeTimer);
    if (busuanziTimer) clearTimeout(busuanziTimer);
    updateRuntime();
    runtimeTimer = setInterval(updateRuntime, 1000);
    updateWordCount();
    busuanziTimer = setTimeout(() => {
      ensureBusuanzi().catch((err) => {
        console.error('[footer-dynamic] ensureBusuanzi failed:', err);
        fallbackBusuanziText();
      });
    }, 300);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  document.addEventListener('pjax:complete', mount);
})();
