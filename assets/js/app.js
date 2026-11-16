(() => {
  'use strict';

  const REPO_URL = 'https://github.com/miquelnebotaragon/guia_basica_git';
  const BLOB_URL = `${REPO_URL}/blob/main/`;
  const THEME_KEY = 'guia-git-theme';

  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const hljsLight = document.getElementById('hljs-light');
  const hljsDark = document.getElementById('hljs-dark');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const content = document.getElementById('content');
  const tocList = document.querySelector('#toc ul');
  const progress = document.getElementById('progress');

  const storedTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  };

  function applyTheme(theme) {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    hljsDark.disabled = !dark;
    hljsLight.disabled = dark;
    themeMeta.content = dark ? '#070b16' : '#f4f7fc';
    toggle.setAttribute('aria-pressed', String(dark));
  }

  toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
  });

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (event) => {
    if (!storedTheme()) applyTheme(event.matches ? 'light' : 'dark');
  });

  applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark');

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    progress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  const slugify = (text) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-');

  function enhance() {
    const usedIds = new Set();
    const uniqueId = (base) => {
      const prefix = base || 'seccion';
      let id = prefix;
      let i = 2;
      while (usedIds.has(id)) id = `${prefix}-${i++}`;
      usedIds.add(id);
      return id;
    };

    content.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) return;
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        return;
      }
      if (!href.startsWith('./static/')) {
        link.href = BLOB_URL + href.replace(/^\.\//, '');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    });

    const headings = content.querySelectorAll('h1, h2, h3');
    headings.forEach((heading) => {
      const label = heading.textContent.trim();
      heading.id = uniqueId(slugify(label));

      if (heading.tagName === 'H2') {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.textContent = label;
        item.append(link);
        tocList.append(item);
      }

      if (heading.tagName !== 'H1') {
        const anchor = document.createElement('a');
        anchor.className = 'anchor';
        anchor.href = `#${heading.id}`;
        anchor.textContent = '#';
        anchor.setAttribute('aria-label', 'Enlace a esta sección');
        heading.append(anchor);
      }
    });

    content.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      if (code && window.hljs) window.hljs.highlightElement(code);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-btn';
      button.textContent = 'Copiar';
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText((code || pre).textContent);
          button.textContent = 'Copiado ✓';
        } catch (e) {
          button.textContent = 'Error';
        }
        setTimeout(() => {
          button.textContent = 'Copiar';
        }, 1600);
      });
      pre.append(button);
    });

    const links = new Map();
    tocList.querySelectorAll('a').forEach((link) => links.set(link.hash.slice(1), link));

    const setActive = (id) => {
      tocList.querySelectorAll('a.active').forEach((link) => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      });
      const current = links.get(id);
      if (current) {
        current.classList.add('active');
        current.setAttribute('aria-current', 'location');
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    content.querySelectorAll('h2').forEach((section) => observer.observe(section));

    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }

    updateProgress();
  }

  async function loadGuide() {
    try {
      const response = await fetch('README.md', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      content.innerHTML = window.DOMPurify.sanitize(window.marked.parse(markdown));
    } catch (error) {
      console.error('No se pudo cargar la guía:', error);
      content.innerHTML = `<div class="notice">No se ha podido cargar la guía. <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">Ver el repositorio en GitHub</a>.</div>`;
      return;
    }
    enhance();
  }

  loadGuide();
})();
