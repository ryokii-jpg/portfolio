(() => {
  'use strict';
  const panels = [...document.querySelectorAll('[data-panel]')];
  const tabs = [...document.querySelectorAll('.tab-link')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  let motionPreference = null;
  try { motionPreference = localStorage.getItem('portfolio-motion'); } catch (_) { /* Optional preference storage. */ }
  function updateMotion() {
    const paused = reduced.matches || motionPreference === 'off';
    document.body.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Motion: off ○' : 'Motion: on ◉';
    toggle.disabled = reduced.matches;
    toggle.title = reduced.matches ? 'Reduced motion follows your device preference' : 'Toggle ambient motion';
  }
  toggle.addEventListener('click', () => {
    motionPreference = document.body.classList.contains('motion-paused') ? 'on' : 'off';
    try { localStorage.setItem('portfolio-motion', motionPreference); } catch (_) { /* Storage is optional. */ }
    updateMotion();
  });
  reduced.addEventListener('change', updateMotion);
  updateMotion();

  function route(focus = true) {
    const requested = location.hash.slice(1) || 'profile';
    const section = ['about', 'capabilities'].includes(requested) ? requested : null;
    const view = section ? 'profile' : panels.some(panel => panel.dataset.panel === requested) ? requested : 'profile';
    panels.forEach(panel => {
      const active = panel.dataset.panel === view;
      panel.classList.toggle('active', active);
      panel.setAttribute('aria-hidden', String(!active));
      panel.hidden = !active;
    });
    tabs.forEach(tab => {
      const active = section ? tab.dataset.view === 'about' : tab.dataset.view === view || (view.endsWith('-detail') && tab.dataset.view === 'deployments');
      tab.classList.toggle('active', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    const panel = panels.find(item => item.dataset.panel === view);
    const target = section ? document.getElementById(section) : panel.querySelector('h1,h2');
    if (focus && target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    if (section) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = view.endsWith('-detail') ? panel.querySelector('h2').textContent + ' | Mike Fernando' : 'Mike Fernando — ' + (view === 'deployments' ? 'Selected deployments' : 'A little world of working systems');
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-view]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (location.hash === link.getAttribute('href')) {
      event.preventDefault();
      route();
    }
  });
  window.addEventListener('hashchange', () => route());
  route(false);

  document.querySelectorAll('[data-highlight]').forEach(link => {
    const place = document.querySelector(`[data-place="${link.dataset.highlight}"]`);
    const highlight = () => place.classList.add('is-highlighted');
    const clear = () => place.classList.remove('is-highlighted');
    link.addEventListener('pointerenter', highlight);
    link.addEventListener('pointerleave', clear);
    link.addEventListener('focus', highlight);
    link.addEventListener('blur', clear);
  });
  const world = document.querySelector('.world');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      world.classList.toggle('offscreen', !entries[0].isIntersecting);
    }).observe(world);
  }
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-hidden', document.hidden);
  });
})();
