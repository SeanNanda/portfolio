document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const navigationPanel = document.querySelector('#navigation-panel');
const menuCollapse = window.bootstrap
  ? bootstrap.Collapse.getOrCreateInstance(navigationPanel, { toggle: false })
  : null;
if (menuCollapse) document.documentElement.classList.add('bs-ready');

function closeMenu() {
  if (!menuCollapse) return;
  // Bootstrap ignores commands during a transition. Finish opening, then close.
  if (navigationPanel.classList.contains('collapsing') && menuButton.getAttribute('aria-expanded') === 'true') {
    navigationPanel.addEventListener('shown.bs.collapse', () => menuCollapse.hide(), { once: true });
  } else {
    menuCollapse.hide();
  }
}
navigationPanel.addEventListener('show.bs.collapse', () => { menuButton.textContent = 'Close −'; });
navigationPanel.addEventListener('hidden.bs.collapse', () => { menuButton.textContent = 'Menu +'; });
navigation.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();
  const target = document.querySelector(link.hash);
  if (target) target.focus({ preventScroll: true });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia('(min-width: 801px)').addEventListener('change', closeMenu);

const dialog = document.querySelector('#photo-dialog');
const gallery = [...document.querySelectorAll('.gallery-photo')];
const photo = document.querySelector('#dialog-image');
const caption = document.querySelector('#dialog-caption');
const counter = document.querySelector('#dialog-counter');
const previous = document.querySelector('#previous-photo');
const next = document.querySelector('#next-photo');
let photoIndex = 0;
let opener;

function showPhoto(index) {
  photoIndex = index;
  const image = gallery[index].querySelector('img');
  photo.src = image.src;
  photo.alt = image.alt;
  caption.textContent = image.alt;
  counter.textContent = `${index + 1} / ${gallery.length} · Live sound archive`;
  previous.disabled = index === 0;
  next.disabled = index === gallery.length - 1;
  // When navigation disables the focused button, move focus to the other control.
  if (previous.disabled && document.activeElement === previous) next.focus();
  if (next.disabled && document.activeElement === next) previous.focus();
}
gallery.forEach((link, index) => link.addEventListener('click', event => {
  if (typeof dialog.showModal !== 'function') return;
  event.preventDefault();
  opener = link;
  showPhoto(index);
  dialog.showModal();
  document.body.classList.add('modal-open');
  document.querySelector('.lightbox-close').focus();
}));
document.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  opener?.focus({ preventScroll: true });
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
previous.addEventListener('click', () => showPhoto(Math.max(0, photoIndex - 1)));
next.addEventListener('click', () => showPhoto(Math.min(gallery.length - 1, photoIndex + 1)));
dialog.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    const controls = [...dialog.querySelectorAll('button:not(:disabled)')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(Math.max(0, Math.min(gallery.length - 1, photoIndex + (event.key === 'ArrowLeft' ? -1 : 1))));
  }
});

// Each external thumbnail gets one fallback request. Never retry indefinitely.
document.querySelectorAll('img[data-fallback]').forEach(image => {
  const recover = () => {
    if (!image.dataset.retried) {
      image.dataset.retried = 'true';
      image.src = image.dataset.fallback;
    } else {
      image.closest('.music-art').classList.add('failed');
    }
  };
  image.addEventListener('error', recover);
  if (image.complete && image.naturalWidth === 0) recover();
});
document.querySelector('#copyright-year').textContent = new Date().getFullYear();

// Animate each section once as it enters view; leave content visible without JS.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const entranceAnimations = new Set();
if ('IntersectionObserver' in window && typeof Element.prototype.animate === 'function') {
  const entranceObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entranceObserver.unobserve(entry.target);
      if (motionPreference.matches) return;
      const animation = entry.target.animate([
        { opacity: 0.65, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 550, easing: 'cubic-bezier(.2,.65,.3,1)' });
      entranceAnimations.add(animation);
      animation.finished.then(() => entranceAnimations.delete(animation)).catch(() => entranceAnimations.delete(animation));
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.about-grid, .section-head, .expertise-item, .workshop, .music-card, .gallery-photo, .experience, .qualification, .award, .contact-bottom').forEach(element => entranceObserver.observe(element));
  motionPreference.addEventListener('change', event => {
    if (event.matches) entranceAnimations.forEach(animation => animation.cancel());
  });
}
