(function () {
  var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function getSavedTheme() {
    try {
      var raw = localStorage.getItem('theme');
      if (!raw) return undefined;

      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'value' in parsed) {
        return parsed.value;
      }

      return parsed;
    } catch (error) {
      return localStorage.getItem('theme') || undefined;
    }
  }

  function applyTheme(isDark) {
    if (window.btf && typeof window.btf.activateDarkMode === 'function' && typeof window.btf.activateLightMode === 'function') {
      isDark ? window.btf.activateDarkMode() : window.btf.activateLightMode();
      return;
    }

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  function syncTheme(event) {
    if (getSavedTheme() !== undefined) return;
    applyTheme(event ? event.matches : mediaQuery.matches);
  }

  syncTheme();

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', syncTheme);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(syncTheme);
  }
})();
