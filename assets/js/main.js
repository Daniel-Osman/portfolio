const tl = gsap.timeline({ default: { duration: 0.1 } });
gsap.from('.nav__item', {
  y: 50,
  stagger: 0.2,
  opacity: 0,
  ease: 'expo.inout',
});
document.querySelector('.nav__toggle').addEventListener('click', () => {
  document.querySelector('.nav__menu').addEventListener('click', () => {});
});

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
// const lis = document.querySelector('.nav__list');
// const clickToggle = document.querySelector('.nav__toggle');
// clickToggle.addEventListener('click', () => {
//   lis.style.display = 'block';
//   gsap.from('.nav__item', { duration: 1, y: 100, stagger: 0.3, opacity: 0 });
// });
// gsap.from('.nav__item', { duration: 1, y: 100, stagger: 0.3, opacity: 0 });

// mit it up
const mixer = mixitup('.portfolio', {
  selectors: {
    target: '.mix',
  },
  animation: {
    duration: 400,
  },
});
