// Suara kucing asli setiap kali diklik (user & admin)
(function () {
  var FILES = ['meow1.mp3', 'meow2.mp3', 'meow3.mp3'];  // 3 suara, dipilih acak
  var VOLUME = 0.7;                                      // 0.0 (diam) sampai 1.0 (maksimal)
  var JEDA = 120;                                        // jeda minimal antar suara (ms)
  var audios = FILES.map(function (f) { var a = new Audio(f); a.preload = 'auto'; return a; });
  var last = 0;
  document.addEventListener('click', function () {
    var now = Date.now();
    if (now - last < JEDA) return;
    last = now;
    var a = audios[Math.floor(Math.random() * audios.length)].cloneNode();
    a.volume = VOLUME;
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
  }, true);
})();