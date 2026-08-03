// AutoUniverse Landing — main.js

// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Mobile nav
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
if (hamburger && nav) {
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });
}

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// Waitlist form
const waitlistForm = document.getElementById('waitlist-form');
const waitlistMsg  = document.getElementById('waitlist-msg');
if (waitlistForm) {
  waitlistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const honeypot = waitlistForm.querySelector('[name="website"]').value;
    if (honeypot) return;
    const email = waitlistForm.querySelector('[name="email"]').value.trim();
    if (!email) return;
    const btn = waitlistForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saljem...';
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'waitlist_hub' })
      });
      const data = await res.json();
      if (res.ok) {
        waitlistMsg.textContent = 'Sacuvano! Javicemo se kad AU Core bude spreman.';
        waitlistMsg.className = 'waitlist__msg success';
        waitlistForm.reset();
      } else {
        waitlistMsg.textContent = data.error || 'Doslo je do greske. Pokusaj ponovo.';
        waitlistMsg.className = 'waitlist__msg error';
      }
    } catch {
      waitlistMsg.textContent = 'Nema konekcije. Pokusaj ponovo.';
      waitlistMsg.className = 'waitlist__msg error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Obavesti me';
    }
  });
}

// Contact form
const contactForm = document.getElementById('contact-form');
const contactMsg  = document.getElementById('contact-msg');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const honeypot = contactForm.querySelector('[name="website"]').value;
    if (honeypot) return;
    const payload = {
      name:    contactForm.querySelector('[name="name"]').value.trim(),
      email:   contactForm.querySelector('[name="email"]').value.trim(),
      type:    contactForm.querySelector('[name="type"]').value,
      message: contactForm.querySelector('[name="message"]').value.trim()
    };
    if (!payload.name || !payload.email || !payload.message) return;
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saljem...';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        contactMsg.textContent = 'Poruka poslata! Javicemo se uskoro.';
        contactMsg.className = 'contact-form__msg success';
        contactForm.reset();
      } else {
        contactMsg.textContent = data.error || 'Doslo je do greske.';
        contactMsg.className = 'contact-form__msg error';
      }
    } catch {
      contactMsg.textContent = 'Nema konekcije. Pokusaj ponovo.';
      contactMsg.className = 'contact-form__msg error';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Posalji poruku';
    }
  });
}
