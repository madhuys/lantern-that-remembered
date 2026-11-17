/* The Lantern That Remembered: page behaviour.
   Engine (scrollcraft.js) drives reveals, the pinned beam (--sc-p) and tilt.
   This file owns the title-page depth, the folio, and the lantern over the map. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var body = document.body;

  ScrollCraft.mount(document.body);

  /* ---------- title page: planes at different rates, plus a little pointer depth */
  var title = document.querySelector('.title');
  var planes = [].slice.call(title.querySelectorAll('[data-depth]'));
  var type = title.querySelector('.title__type');
  var portrait = matchMedia('(max-aspect-ratio: 1/1)');
  function frameFor() {
    // Phones get their own crop: anchor right so the lighthouse stays in frame.
    // A 600-wide window over the lighthouse: its beam then crosses the whole screen.
    var vb = portrait.matches ? '860 0 600 1000' : '0 0 1600 1000';
    title.querySelectorAll('svg.plane').forEach(function (s) { s.setAttribute('viewBox', vb); });
  }
  frameFor();
  portrait.addEventListener ? portrait.addEventListener('change', frameFor) : portrait.addListener(frameFor);

  var px = 0, tx = 0, ticking = false;
  function paint() {
    ticking = false;
    var y = window.scrollY, h = window.innerHeight;
    if (y > h * 1.2) return;
    tx += (px - tx) * 0.12;
    for (var i = 0; i < planes.length; i++) {
      var el = planes[i];
      var d = parseFloat(el.getAttribute('data-depth')) || 0;
      var p = parseFloat(el.getAttribute('data-px')) || 0;
      el.style.transform = 'translate3d(' + (-tx * p).toFixed(2) + 'px,' + (y * d).toFixed(1) + 'px,0)';
    }
    type.style.opacity = Math.max(0, 1 - y / (h * 0.55)).toFixed(3);
    if (Math.abs(px - tx) > 0.002) request();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
  if (!reduce) {
    addEventListener('scroll', request, { passive: true });
    if (fine) title.addEventListener('pointermove', function (e) {
      px = (e.clientX / innerWidth - 0.5) * 2; request();
    });
    request();
  }

  /* ---------- folio: chapter number and title in the margin */
  var folioN = document.querySelector('.folio__n'), folioT = document.querySelector('.folio__t');
  var parts = [].slice.call(document.querySelectorAll('[data-folio]'));
  function onScrollFolio() {
    var mid = innerHeight * 0.5, cur = null;
    for (var i = 0; i < parts.length; i++) {
      var r = parts[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { cur = parts[i]; break; }
    }
    body.classList.toggle('read', !!cur);
    if (cur) {
      var f = cur.getAttribute('data-folio').split('|');
      if (folioT.textContent !== f[1]) { folioN.textContent = f[0]; folioT.textContent = f[1]; }
      body.setAttribute('data-ground', cur.getAttribute('data-ground'));
    } else body.setAttribute('data-ground', 'paper');
  }
  addEventListener('scroll', onScrollFolio, { passive: true });
  addEventListener('resize', onScrollFolio);
  onScrollFolio();

  /* ---------- signature: the lantern over Mira's map */
  var frame = document.querySelector('.map__frame');
  if (frame) {
    var how = document.querySelector('.map__how');
    if (!fine) how.textContent = 'Tap the map to move the lantern.';
    var pos = { x: 0.53, y: 0.7 }, goal = { x: 0.53, y: 0.7 }, touched = false, running = false, t0 = performance.now();
    function set() {
      var w = frame.clientWidth, h = frame.clientHeight;
      frame.style.setProperty('--mx', (pos.x * 100).toFixed(2) + '%');
      frame.style.setProperty('--my', (pos.y * 100).toFixed(2) + '%');
      frame.style.setProperty('--x', (pos.x * w).toFixed(1) + 'px');
      frame.style.setProperty('--y', (pos.y * h).toFixed(1) + 'px');
    }
    function loop(now) {
      running = false;
      if (!touched && !reduce) {
        // Until someone takes it, the lantern drifts slowly along the salt stain.
        var t = (now - t0) / 1000;
        goal.x = 0.5 + Math.sin(t * 0.32) * 0.3;
        goal.y = 0.68 + Math.sin(t * 0.64 + 1) * 0.06;
      }
      var k = reduce ? 1 : 0.16;
      pos.x += (goal.x - pos.x) * k; pos.y += (goal.y - pos.y) * k;
      set();
      if (visible && ((!touched && !reduce) || Math.abs(goal.x - pos.x) + Math.abs(goal.y - pos.y) > 0.0005)) kick();
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
    function to(e) {
      var r = frame.getBoundingClientRect();
      goal.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      goal.y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      touched = true; kick();
    }
    frame.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.pointerType === 'pen') to(e); });
    frame.addEventListener('pointerdown', to);
    frame.addEventListener('keydown', function (e) {
      var s = e.shiftKey ? 0.12 : 0.04, d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
      if (!d) return;
      e.preventDefault(); touched = true;
      goal.x = Math.min(1, Math.max(0, goal.x + d[0])); goal.y = Math.min(1, Math.max(0, goal.y + d[1])); kick();
    });
    var visible = false;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(frame);
    addEventListener('resize', set);
    set();
  }
})();
