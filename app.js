// GSAP Animations
gsap.from(".title", { opacity: 0, y: -50, duration: 1 });
gsap.from(".subtitle", { opacity: 0, y: 30, duration: 1, delay: 0.3 });
gsap.from(".cta", { opacity: 0, scale: 0.8, duration: 1, delay: 0.6 });

// Vanilla Tilt for cards
VanillaTilt.init(document.querySelectorAll(".tilt"), {
  max: 15,
  speed: 400,
  glare: true,
  "max-glare": 0.5
});

// Swiper gallery
var swiper = new Swiper(".mySwiper", {
  slidesPerView: 1,
  spaceBetween: 20,
  pagination: { el: ".swiper-pagination", clickable: true },
  breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
});

// Counter animation
document.querySelectorAll(".counter").forEach(counter => {
  let target = +counter.getAttribute("data-counter");
  let count = 0;
  let step = target / 200;
  let interval = setInterval(() => {
    count += step;
    if (count >= target) {
      count = target;
      clearInterval(interval);
    }
    counter.textContent = Math.floor(count).toLocaleString();
  }, 10);
});
