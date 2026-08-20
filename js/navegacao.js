let navegando = false;

window.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const splashImg = document.getElementById("splashImg");
  const site = document.getElementById("site");
  const links = document.querySelectorAll(".menu a[data-splash]");
  const nextSplash = sessionStorage.getItem("nextSplash");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function preloadImagem(src) {
    if (!src) return;
    const img = new Image();
    img.src = src;
  }

  if (splash && splashImg && site) {
    const splashSource = nextSplash || splashImg.getAttribute("src");
    sessionStorage.removeItem("nextSplash");

    if (reduceMotion) {
      splash.style.display = "none";
      site.classList.add("show");
    } else {
      if (splashSource) splashImg.src = splashSource;
      splash.style.display = "flex";
      splash.classList.remove("hide");
      requestAnimationFrame(() => splash.classList.add("show"));

      const tempoVisivel = nextSplash ? 700 : 1100;
      setTimeout(() => {
        splash.classList.add("hide");
        setTimeout(() => {
          splash.style.display = "none";
          site.classList.add("show");
        }, 450);
      }, tempoVisivel);
    }
  } else if (site) {
    site.classList.add("show");
  }

  links.forEach((link) => {
    const splashSource = link.dataset.splash;
    preloadImagem(splashSource);

    link.addEventListener("click", (event) => {
      if (navegando) return;
      navegando = true;
      event.preventDefault();

      const destino = link.href;
      const splashToUse = splashSource
        ? new URL(splashSource, document.baseURI).href
        : new URL("img/Capa.png", document.baseURI).href;
      sessionStorage.setItem("nextSplash", splashToUse);

      if (!reduceMotion && splash && splashImg) {
        splashImg.src = splashToUse;
        splash.style.display = "flex";
        splash.classList.remove("hide");
        requestAnimationFrame(() => splash.classList.add("show"));
      }

      setTimeout(() => {
        window.location.href = destino;
      }, reduceMotion ? 0 : 500);
    });
  });
});
