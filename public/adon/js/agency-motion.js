/* Adon AI Agency motion adapted for Astro's document navigation.
 * Sources: main.js fade-anim, moving-text, scale; ai-agency.html parallax-view.
 * Native scrolling and visible HTML remain usable without any of these scripts.
 */
(() => {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", () => {
    const title = document.querySelectorAll(".title-line > span");
    if (title.length)
      gsap.from(title, {
        yPercent: 110,
        rotate: 2,
        duration: 1.15,
        stagger: 0.12,
        ease: "power3.out",
        clearProps: "transform",
      });
    // Match the demo's 50px / 1.15s / power2.out section entrances.
    document.querySelectorAll("[data-reveal], .reveal").forEach((item) => {
      gsap.from(item, {
        y: 50,
        opacity: 0,
        duration: 1.15,
        ease: "power2.out",
        scrollTrigger: { trigger: item, start: "top 92%", once: true },
        clearProps: "transform,opacity",
      });
    });
    const books = document.querySelectorAll(".hero-book");
    if (books.length)
      gsap.from(books, {
        y: 45,
        opacity: 0,
        duration: 1.3,
        stagger: 0.15,
        ease: "power2.out",
      });
    document.querySelectorAll(".moving-text").forEach((section) => {
      const text = section.querySelector(".wrapper-text");
      if (!text) return;
      gsap.fromTo(
        text,
        { x: 0 },
        {
          x: () => -Math.min(500, text.scrollWidth - section.clientWidth),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        },
      );
    });
    // Scroll-driven motion does not run indefinitely when a visitor stops reading.
    const desktop = gsap.matchMedia();
    desktop.add("(min-width: 768px)", () => {
      document
        .querySelectorAll("[data-parallax]")
        .forEach((img) =>
          gsap.fromTo(
            img,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: "none",
              scrollTrigger: {
                trigger: img.parentElement,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.8,
              },
            },
          ),
        );
      books.forEach((book, i) =>
        gsap.to(book, {
          y: i ? -22 : 22,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero-17-content",
            start: "top 40%",
            end: "bottom top",
            scrub: 1,
          },
        }),
      );
    });
    return () => desktop.revert();
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh(), {
    once: true,
  });
  window.addEventListener("pagehide", () => media.revert(), { once: true });
  // A restored back/forward-cache page must remain visible; reinitialise on restore.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) media.revert();
  });
})();
