/* i2 Leadership — logo-marquee.js
   Companion to the .logo-marquee section (vanilla port of 21st.dev's
   MarqueeAlongSvgPath). The path canvas has fixed 1200x300 coordinates so
   offset-path stays valid; this scales it to the section width, exactly
   like the original component's `responsive` mode. */
(function () {
  var viewport = document.querySelector(".lm-viewport");
  var canvas = document.querySelector(".lm-canvas");
  if (!viewport || !canvas) return;

  var W = 1200;
  var H = 300;

  function fit() {
    var scale = viewport.clientWidth / W;
    canvas.style.transform = "scale(" + scale + ")";
    viewport.style.height = Math.round(H * scale) + "px";
  }

  fit();
  window.addEventListener("resize", fit);
})();
