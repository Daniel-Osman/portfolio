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
// BUTTON
const button = document
  .querySelector(' .button__send')
  .addEventListener('click', (e) => e.preventDefault());
document.querySelectorAll('.button__send').forEach((button) => {
  let getVar = (variable) =>
    getComputedStyle(button).getPropertyValue(variable);

  button.addEventListener('click', (e) => {
    if (!button.classList.contains('active')) {
      button.classList.add('active');

      gsap.to(button, {
        keyframes: [
          {
            '--left-wing-first-x': 50,
            '--left-wing-first-y': 100,
            '--right-wing-second-x': 50,
            '--right-wing-second-y': 100,
            duration: 0.2,
            onComplete() {
              gsap.set(button, {
                '--left-wing-first-y': 0,
                '--left-wing-second-x': 40,
                '--left-wing-second-y': 100,
                '--left-wing-third-x': 0,
                '--left-wing-third-y': 100,
                '--left-body-third-x': 40,
                '--right-wing-first-x': 50,
                '--right-wing-first-y': 0,
                '--right-wing-second-x': 60,
                '--right-wing-second-y': 100,
                '--right-wing-third-x': 100,
                '--right-wing-third-y': 100,
                '--right-body-third-x': 60,
              });
            },
          },
          {
            '--left-wing-third-x': 20,
            '--left-wing-third-y': 90,
            '--left-wing-second-y': 90,
            '--left-body-third-y': 90,
            '--right-wing-third-x': 80,
            '--right-wing-third-y': 90,
            '--right-body-third-y': 90,
            '--right-wing-second-y': 90,
            duration: 0.2,
          },
          {
            '--rotate': 50,
            '--left-wing-third-y': 95,
            '--left-wing-third-x': 27,
            '--right-body-third-x': 45,
            '--right-wing-second-x': 45,
            '--right-wing-third-x': 60,
            '--right-wing-third-y': 83,
            duration: 0.25,
          },
          {
            '--rotate': 55,
            '--plane-x': -8,
            '--plane-y': 24,
            duration: 0.2,
          },
          {
            '--rotate': 40,
            '--plane-x': 45,
            '--plane-y': -180,
            '--plane-opacity': 0,
            duration: 0.3,
            onComplete() {
              setTimeout(() => {
                button.removeAttribute('style');
                gsap.fromTo(
                  button,
                  {
                    opacity: 0,
                    y: -8,
                  },
                  {
                    opacity: 1,
                    y: 0,
                    clearProps: true,
                    duration: 0.3,
                    onComplete() {
                      button.classList.remove('active');
                    },
                  }
                );
              }, 2000);
            },
          },
        ],
      });

      gsap.to(button, {
        keyframes: [
          {
            '--text-opacity': 0,
            '--border-radius': 0,
            '--left-wing-background': getVar('--primary-darkest'),
            '--right-wing-background': getVar('--primary-darkest'),
            duration: 0.1,
          },
          {
            '--left-wing-background': getVar('--primary'),
            '--right-wing-background': getVar('--primary'),
            duration: 0.1,
          },
          {
            '--left-body-background': getVar('--primary-dark'),
            '--right-body-background': getVar('--primary-darkest'),
            duration: 0.4,
          },
          {
            '--success-opacity': 1,
            '--success-scale': 1,
            duration: 0.25,
            delay: 0.25,
          },
        ],
      });
    }
  });
});
