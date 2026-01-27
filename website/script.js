const hamburger = document.createElement("div");
hamburger.className = "hamburger";
hamburger.innerHTML = `
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      `;

const nav = document.querySelector("nav");
document.body.insertBefore(hamburger, nav);

// Toggle menu
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  nav.classList.toggle("active");
});

// Close menu on click outside
document.addEventListener("click", (e) => {
  if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
    hamburger.classList.remove("active");
    nav.classList.remove("active");
  }
});

// Close menu on link click
document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("active");
    nav.classList.remove("active");
  });
});

const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (!prefersReducedMotion && revealItems.length > 0) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 60, 240)}ms`;
    revealObserver.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add("reveal-visible"));
}

// Fecha o menu ao scrollar
window.addEventListener("scroll", () => {
  if (nav.classList.contains("active")) {
    hamburger.classList.remove("active");
    nav.classList.remove("active");
  }
});

// Adiciona delay na animação para melhor feedback
document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute("href"));

    hamburger.classList.remove("active");
    nav.classList.remove("active");

    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth" });
    }, 300);
  });
});
