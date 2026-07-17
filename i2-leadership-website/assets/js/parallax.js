/* i2 Leadership — parallax.js
   Fliers for the "Mountain Vista" hero skyline. The skyline layers loop in
   pure CSS (.hp-layer); this script only rotates the five fliers across
   the scene — at most two airborne at once, shuffled order, transform-only
   (a port of the design's launch loop). No-ops when the browser asks for
   reduced motion or lacks the Web Animations API. */
(function () {
  var scene = document.querySelector(".hero-parallax");
  if (!scene) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var fliers = Array.prototype.slice.call(scene.querySelectorAll(".hp-flier"));
  if (!fliers.length || typeof fliers[0].animate !== "function") return;

  var order = fliers.map(function (_, i) { return i; });
  function shuffle() { order.sort(function () { return Math.random() - 0.5; }); }
  shuffle();

  var pos = 0;
  var active = 0;

  function launch() {
    if (active >= 2) {
      setTimeout(launch, 8000);
      return;
    }
    var el = fliers[order[pos]];
    pos = (pos + 1) % order.length;
    if (pos === 0) shuffle();
    var dur = parseFloat(el.dataset.speed) * 1000;
    var distance = scene.clientWidth + 140 + el.offsetWidth;
    el.style.visibility = "visible";
    active++;
    var anim = el.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(" + distance + "px)" }],
      { duration: dur, iterations: 1 }
    );
    anim.onfinish = function () {
      el.style.visibility = "hidden";
      active--;
    };
    setTimeout(launch, Math.min(dur * (0.55 + Math.random() * 0.7), 25000));
  }

  launch();
})();
