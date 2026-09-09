(() => {
  'use strict';
  const panels = [...document.querySelectorAll('[data-panel]')];
  const tabs = [...document.querySelectorAll('.tab-link')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  const world = document.querySelector('.world');
  const animations = new Set();
  let motionPreference = null, sequence = 0, current = '', overlay = null;
  try { motionPreference = localStorage.getItem('portfolio-motion'); } catch (_) { /* Optional storage. */ }
  const motionEnabled = () => !reduced.matches && motionPreference !== 'off' && !document.hidden;
  function clearMotion() {
    animations.forEach(animation => animation.cancel());animations.clear();
    if (overlay) overlay.remove();overlay = null;
    document.body.classList.remove('is-travelling');
  }
  function updateMotion() {
    const paused = reduced.matches || motionPreference === 'off';
    document.body.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Motion: off ○' : 'Motion: on ◉';
    toggle.disabled = reduced.matches;
    toggle.title = reduced.matches ? 'Reduced motion follows your device preference' : 'Toggle animations';
    if (paused && document.body.classList.contains('is-travelling')) navigate(location.hash.slice(1), false);
  }
  toggle.addEventListener('click', () => {
    motionPreference = motionPreference === 'off' ? 'on' : 'off';
    try { localStorage.setItem('portfolio-motion', motionPreference); } catch (_) { /* Optional storage. */ }
    updateMotion();
  });
  reduced.addEventListener('change', updateMotion);updateMotion();
  function resolve(requested) {
    return ['about', 'capabilities'].includes(requested) || panels.some(p => p.dataset.panel === requested) ? requested : 'profile';
  }
  function display(requested, focus = true) {
    const view = requested;
    panels.forEach(panel => {
      const active = panel.dataset.panel === view;
      panel.classList.toggle('active', active);panel.setAttribute('aria-hidden', String(!active));panel.hidden = !active;
    });
    tabs.forEach(tab => {
      const active = tab.dataset.view === view || (view === 'capabilities' && tab.dataset.view === 'about') || (view.endsWith('-detail') && tab.dataset.view === 'deployments');
      tab.classList.toggle('active', active);
      if (active) tab.setAttribute('aria-current', 'page');else tab.removeAttribute('aria-current');
    });
    const panel = panels.find(p => p.dataset.panel === view);
    const target = view === 'deployments' && current.endsWith('-detail') ? panel.querySelector(`[data-exhibit="${current}"]`) : panel.querySelector('h1,h2');
    if (focus && target) { target.setAttribute('tabindex', '-1');target.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = 'Mike Fernando — ' + (view === 'profile' ? 'Orbital Systems Station' : panel.querySelector('h2').textContent);
    current = requested;return panel;
  }
  function play(element, frames, duration) {
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'both' });
    animations.add(animation);return animation.finished.catch(() => {});
  }
  function camera(destination) {
    const place = destination === 'deployments' ? 'deployments' : destination === 'capabilities' ? 'about' : 'profile';
    const original = document.querySelector('.world-art');
    const bounds = original.getBoundingClientRect();
    const top = document.querySelector('.navbar').getBoundingClientRect().bottom;
    overlay = document.createElement('div');overlay.className = 'journey';overlay.setAttribute('aria-hidden', 'true');
    const art = original.cloneNode(true);
    art.classList.remove('world-art');art.classList.add('journey-art');art.removeAttribute('aria-labelledby');
    art.querySelectorAll('[id]').forEach(node => { node.id = 'camera-' + node.id; });
    art.querySelectorAll('use').forEach(node => node.setAttribute('href', node.getAttribute('href').replace('#', '#camera-')));
    art.querySelectorAll('[fill]').forEach(node => { if (node.getAttribute('fill').startsWith('url(#')) node.setAttribute('fill', node.getAttribute('fill').replace('url(#', 'url(#camera-')); });
    art.querySelectorAll('[tabindex]').forEach(node => node.removeAttribute('tabindex'));
    art.querySelectorAll('.is-highlighted').forEach(node => node.classList.remove('is-highlighted'));
    const width = bounds.width || Math.min(innerWidth, 1100), height = width * 510 / 1100;
    const left = bounds.width ? bounds.left : (innerWidth - width) / 2;
    const y = bounds.bottom > top && bounds.top < innerHeight - 80 ? bounds.top - top : (innerHeight - top - height) / 2;
    Object.assign(art.style, { width: width + 'px', height: height + 'px', left: left + 'px', top: y + 'px' });
    overlay.append(art);
    const caption = document.createElement('div');caption.className = 'journey-caption';
    caption.textContent = destination === 'deployments' ? 'Docking at the deployment hangar…' : destination === 'capabilities' ? 'Entering the bio-dome…' : 'Accessing command quarters…';
    overlay.append(caption);document.body.append(overlay);
    const door = art.querySelector(`[data-place="${place}"] .building-door`);
    const box = door.getBoundingClientRect();
    const x = box.left + box.width / 2 - left, doorY = box.top + box.height / 2 - top - y;
    const scale = Math.min(10, Math.max(5, (innerHeight - top) * .62 / box.height));
    const dx = innerWidth / 2 - left - x * scale, dy = (innerHeight - top) * .47 - y - doorY * scale;
    // The dark opening stays behind the hinged door leaf.
    const doorway = door.cloneNode(true);doorway.classList.remove('building-door');doorway.setAttribute('fill', '#020711');door.before(doorway);
    const handle = door.nextElementSibling;
    const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'g');leaf.classList.add('building-door');
    door.before(leaf);door.classList.remove('building-door');leaf.append(door);
    if (handle && handle.tagName.toLowerCase() === 'circle') leaf.append(handle);
    return { art, door: leaf, zoom: `translate(${dx}px, ${dy}px) scale(${scale})` };
  }
  async function navigate(raw, animate = true, source = null) {
    const requested = resolve(raw), previous = current, ticket = ++sequence;
    clearMotion();
    if (!animate || !motionEnabled() || requested === previous) { display(requested, animate);return; }
    document.body.classList.add('is-travelling');
    try {
      const entering = previous === 'profile' && ['about', 'capabilities', 'deployments'].includes(requested);
      const leaving = requested === 'profile' && ['about', 'capabilities', 'deployments'].includes(previous);
      if (entering) {
        const { art, door, zoom } = camera(requested);
        play(overlay, [{ opacity: 0 }, { opacity: 1 }], 130);
        await play(art, [{ transform: 'translate(0,0) scale(1)' }, { transform: zoom }], 680);
        if (ticket !== sequence) return;
        await play(door, [{ transform: 'skewY(0deg) scaleX(1)' }, { transform: 'skewY(-14deg) scaleX(.08)' }], 320);
        if (ticket !== sequence) return;
        const destination = display(requested);
        play(destination, [{ opacity: .3, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }], 360);
        await play(overlay, [{ opacity: 1 }, { opacity: 0 }], 360);
      } else if (leaving) {
        display('profile');const { art, zoom } = camera(previous);
        overlay.querySelector('.journey-caption').textContent = 'Returning to orbit';
        await play(art, [{ transform: zoom }, { transform: 'translate(0,0) scale(1)' }], 760);
        if (ticket !== sequence) return;
        await play(overlay, [{ opacity: 1 }, { opacity: 0 }], 160);
      } else {
        const outgoing = document.querySelector('.view.active'), frame = source && source.closest('.project-card'), rect = (frame || source) ? (frame || source).getBoundingClientRect() : null;
        const panelRect = outgoing.getBoundingClientRect();
        const origin = rect ? `${rect.left + rect.width / 2 - panelRect.left}px ${rect.top + rect.height / 2 - panelRect.top}px` : `50% ${scrollY + innerHeight * .4}px`;
        await play(outgoing, [{ opacity: 1, transform: 'scale(1)', transformOrigin: origin }, { opacity: 0, transform: requested.endsWith('-detail') ? 'scale(1.16)' : 'scale(.92)', transformOrigin: origin }], 240);
        if (ticket !== sequence) return;
        const incoming = display(requested);
        await play(incoming, [{ opacity: 0, transform: 'translateY(24px) scale(.94)', transformOrigin: '50% 160px' }, { opacity: 1, transform: 'translateY(0) scale(1)', transformOrigin: '50% 160px' }], 420);
      }
    } finally { if (ticket === sequence) clearMotion(); }
  }
  function go(destination, source) {
    if (location.hash !== '#' + destination) history.pushState(null, '', '#' + destination);
    navigate(destination, true, source);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-view], [data-destination]');
    if (!link || link.closest('.journey') || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();go(link.dataset.view || link.dataset.destination, link);
  });
  document.querySelectorAll('[data-destination]').forEach(place => place.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault();go(place.dataset.destination, place); }
  }));
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
  navigate(location.hash.slice(1), false);
  document.querySelectorAll('[data-highlight]').forEach(link => {
    const place = document.querySelector(`[data-place="${link.dataset.highlight}"]`);
    link.addEventListener('pointerenter', () => place.classList.add('is-highlighted'));
    link.addEventListener('pointerleave', () => place.classList.remove('is-highlighted'));
    link.addEventListener('focus', () => place.classList.add('is-highlighted'));
    link.addEventListener('blur', () => place.classList.remove('is-highlighted'));
  });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => world.classList.toggle('offscreen', !entries[0].isIntersecting)).observe(world);
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-hidden', document.hidden);
    if (document.hidden) navigate(location.hash.slice(1), false);
  });

  const exhibitButtons = [...document.querySelectorAll('[data-exhibit]')];
  function projectExhibit(button, animate = true) {
    const card = button.closest('.project-card');
    const screen = document.querySelector('.projection-screen');
    exhibitButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('projection-title').textContent = card.querySelector('h3').textContent;
    document.getElementById('projection-number').textContent = String(exhibitButtons.indexOf(button) + 1).padStart(2, '0');
    const preview = card.querySelector('.project-image, .research-preview, .supply-preview').cloneNode(true);
    preview.querySelectorAll('span').forEach(span => { if (span.parentElement.classList.contains('project-image')) span.remove(); });
    document.querySelector('.projection-preview').replaceChildren(preview);
    const link = document.querySelector('.projection-open');link.href = '#' + button.dataset.exhibit;link.dataset.view = button.dataset.exhibit;
    if (animate && motionEnabled()) screen.animate([
      { transform: 'translateX(-4px) skewX(-2deg)', opacity: .45 },
      { transform: 'translateX(3px) skewX(1deg)', opacity: .8, offset: .24 },
      { transform: 'translateX(-2px)', opacity: .65, offset: .43 },
      { transform: 'translateX(0)', opacity: 1 }
    ], { duration: 300, easing: 'steps(2, end)' });
  }
  exhibitButtons.forEach(button => button.addEventListener('click', () => projectExhibit(button)));
  if (exhibitButtons.length) projectExhibit(exhibitButtons[0], false);

  // Native dialog provides focus containment and Escape-to-close for image inspection.
  const viewer = document.querySelector('.image-viewer');
  const viewerImage = viewer.querySelector('.viewer-image');
  const zoomButton = viewer.querySelector('.viewer-zoom');
  let imageTrigger = null;
  document.querySelectorAll('.detail-media > img, .command-photo > img').forEach(image => {
    const button = document.createElement('button');
    button.type = 'button';button.className = 'inspect-image';button.textContent = 'View full image ↗';
    button.addEventListener('click', () => {
      imageTrigger = button;
      viewerImage.src = image.src;viewerImage.alt = image.alt;
      viewer.querySelector('#viewer-title').textContent = image.closest('[data-panel]').querySelector('h2').textContent;
      viewer.classList.remove('is-zoomed');zoomButton.textContent = 'Zoom in';zoomButton.setAttribute('aria-pressed', 'false');
      viewer.showModal();
    });
    image.parentElement.append(button);
  });
  zoomButton.addEventListener('click', () => {
    const zoomed = viewer.classList.toggle('is-zoomed');
    zoomButton.textContent = zoomed ? 'Fit image' : 'Zoom in';zoomButton.setAttribute('aria-pressed', String(zoomed));
    viewer.querySelector('.viewer-canvas').scrollTo(0, 0);
  });
  viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => { if (imageTrigger) imageTrigger.focus({ preventScroll: true }); });
  window.addEventListener('hashchange', () => { if (viewer.open) viewer.close(); });

  const crewDialog = document.querySelector('.crew-dialog');
  const crewTerminal = document.querySelector('.crew-terminal');
  crewTerminal.addEventListener('click', () => {
    crewDialog.showModal();
    if (motionEnabled()) crewDialog.animate([{ opacity: 0, transform: 'translateY(25px) scale(.85)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 330, easing: 'ease-out' });
  });
  document.querySelector('.crew-close').addEventListener('click', () => crewDialog.close());
  crewDialog.addEventListener('close', () => crewTerminal.focus({ preventScroll: true }));
  window.addEventListener('hashchange', () => { if (crewDialog.open) crewDialog.close(); });

  const skills = {
    fullstack: ['01', 'Full-stack development', 'Connecting interfaces, server logic, and practical workflows into complete applications.'],
    databases: ['02', 'Databases', 'Structuring and managing the data behind reliable applications, from SQLite to PostgreSQL and Supabase.'],
    automation: ['03', 'Automation', 'Turning repetitive operations into connected workflows, from inventory updates to document generation and reporting.'],
    ai: ['04', 'AI systems', 'Integrating AI throughout research, architecture, interface design, implementation, testing, debugging, and optimization.']
  };
  document.querySelectorAll('[data-skill]').forEach(button => button.addEventListener('click', () => {
    const [number, title, description] = skills[button.dataset.skill];
    document.querySelectorAll('[data-skill]').forEach(pod => pod.setAttribute('aria-pressed', String(pod === button)));
    document.querySelector('.readout-index').textContent = number + ' / CAPABILITY';
    document.getElementById('skill-title').textContent = title;
    document.getElementById('skill-description').textContent = description;
    if (motionEnabled()) document.querySelector('.skill-readout').animate([{ opacity: .35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220 });
  }));

  window.addEventListener('resize', () => { if (document.body.classList.contains('is-travelling')) navigate(location.hash.slice(1), false); });
})();
