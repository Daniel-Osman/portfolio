/*===== MENU SHOW =====*/
const showMenu = (toggleId, navId) => {
  const toggle = document.getElementById(toggleId),
    nav = document.getElementById(navId);

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('show');
    });
  }
};
showMenu('nav-toggle', 'nav-menu');

/*===== REMOVE MENU MOBILE =====*/
const navLink = document.querySelectorAll('.nav__link');

function linkAction() {
  const navMenu = document.getElementById('nav-menu');
  navMenu.classList.remove('show');
  animation.playSegments([14, 27], true);
  state = 'pause';
}
navLink.forEach((n) => n.addEventListener('click', linkAction));

/*===== SCROLL SECTIONS ACTIVE LINK =====*/
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', scrollActive);

function scrollActive() {
  const scrollY = window.pageYOffset;

  sections.forEach((current) => {
    const sectionHeight = current.offsetHeight;
    const sectionTop = current.offsetTop - 50;
    sectionId = current.getAttribute('id');

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      document
        .querySelector('.nav__menu a[href*=' + sectionId + ']')
        .classList.add('active');
    } else {
      document
        .querySelector('.nav__menu a[href*=' + sectionId + ']')
        .classList.remove('active');
    }
  });
}

function scrollHeader() {
  const header = document.querySelector('.l-header');
  if (this.scrollY >= 60) header.classList.add('scroll-header');
  else header.classList.remove('scroll-header');
}
window.addEventListener('scroll', scrollHeader);

// mit it up
const mixer = mixitup('.portfolio', {
  selectors: {
    target: '.mix',
  },
  animation: {
    duration: 400,
  },
});
/*==================== SCROLL REVEAL ANIMATION ====================*/

/*===== SCROLL REVEAL ANIMATION =====*/
const sr = ScrollReveal({
  origin: 'bottom',
  distance: '80px',
  duration: 2000,
});

/*SCROLL HOME*/
sr.reveal('.home__title', {});

// sr.reveal('.home__scroll', { delay: 200 });
// sr.reveal('.home__img', { origin: 'right', delay: 400 });

/*SCROLL ABOUT*/
sr.reveal('.about__img', { delay: 500 });
sr.reveal('.about__subtitle', { delay: 300 });
sr.reveal('.about__profession', { delay: 400 });
sr.reveal('.about__text', { delay: 500 });
sr.reveal('.about__social-icon', { delay: 1000, interval: 200 });

/*SCROLL SKILLS*/
sr.reveal('.skills__subtitle', {});
sr.reveal('.skill-content', { distance: '20px', delay: 50, interval: 100 });
sr.reveal('.skill-img', { delay: 400, interval: 300 });

/*SCROLL PORTFOLIO*/
sr.reveal('.portfolio__img', { interval: 100 });

/*SCROLL CONTACT*/
sr.reveal('.contact__subtitle', {});
sr.reveal('.contact__text , .whatsapp ,.telegram ,.email', { interval: 200 });
sr.reveal('.contact__input', { delay: 400 });
sr.reveal('.contact__button', { delay: 600 });
