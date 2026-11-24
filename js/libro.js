/* ============================================================
   Libro interactivo — lógica de navegación y efecto de página
   ============================================================ */

(function () {
  "use strict";

  // ---------- Estado ----------
  // Hojas del libro: portada, pares de proyectos, contraportada.
  // Cada "hoja" tiene [anverso, reverso] en escritorio (doble página).
  // En móvil se muestra una página a la vez.

  var paginas = []; // lista plana de páginas: portada, p1..p12, contraportada

  function construirPaginas() {
    paginas = [];
    // Portada
    paginas.push({
      tipo: "portada",
      imagen: PORTADA.imagen,
      titulo: PORTADA.titulo,
      subtitulo: PORTADA.subtitulo,
    });
    // Proyectos
    for (var i = 0; i < proyectos.length; i++) {
      paginas.push({
        tipo: "proyecto",
        imagen: proyectos[i].imagen,
        titulo: proyectos[i].titulo,
        descripcion: proyectos[i].descripcion,
        numero: i + 1,
      });
    }
    // Contraportada
    paginas.push({
      tipo: "contraportada",
      imagen: CONTRAPORTADA.imagen,
      titulo: CONTRAPORTADA.titulo,
      descripcion: CONTRAPORTADA.descripcion,
    });
  }

  // ---------- Referencias DOM ----------
  var libro = document.getElementById("libro");
  var pagIzq = document.getElementById("paginaIzq");
  var pagDer = document.getElementById("paginaDer");
  var giratoria = document.getElementById("giratoria");
  var girFrente = document.getElementById("girFrente");
  var girAtras = document.getElementById("girAtras");
  var indicador = document.getElementById("indicador");

  // Botones de borde (modo embed) y de la barra inferior (modo normal)
  var btnAntBorde = document.getElementById("btnAnterior");
  var btnSigBorde = document.getElementById("btnSiguiente");
  var btnAntNormal = document.getElementById("btnAnteriorNormal");
  var btnSigNormal = document.getElementById("btnSiguienteNormal");
  var btnAnt = btnAntBorde || btnAntNormal;
  var btnSig = btnSigBorde || btnSigNormal;

  // ---------- Modo embed ----------
  // Se activa con ?embed=1 o #embed — deja solo el libro, sin entorno
  if (location.search.indexOf("embed") !== -1 ||
      location.hash.indexOf("embed") !== -1) {
    document.body.classList.add("embed");
  }

  var indice = 0; // índice de página (en móvil) o de página izquierda (escritorio)
  var esMovil = window.matchMedia("(max-width: 900px)");
  var animando = false;

  // ---------- Render de una página ----------
  function htmlPagina(p) {
    if (!p) {
      return "";
    }
    if (p.tipo === "portada") {
      return (
        '<img class="foto" src="' + p.imagen + '" alt="' + esc(p.titulo) + '" />' +
        '<div class="cubierta-velo">' +
          '<h1>' + esc(p.titulo) + '</h1>' +
          '<span class="subtitulo">' + esc(p.subtitulo || "") + '</span>' +
        '</div>'
      );
    }
    if (p.tipo === "contraportada") {
      return (
        '<img class="foto" src="' + p.imagen + '" alt="' + esc(p.titulo) + '" />' +
        '<div class="cubierta-velo">' +
          '<h2>' + esc(p.titulo) + '</h2>' +
          '<p class="descripcion">' + esc(p.descripcion || "") + '</p>' +
        '</div>'
      );
    }
    // Proyecto — imagen 16:9 a sangre + pie de foto en franja inferior
    return (
      '<figure class="contenido">' +
        '<img class="foto" src="' + p.imagen + '" alt="' + esc(p.titulo) + '" loading="lazy" />' +
        '<figcaption class="texto">' +
          '<h2>' + esc(p.titulo) + '</h2>' +
          '<p>' + esc(p.descripcion) + '</p>' +
        '</figcaption>' +
      '</figure>'
    );
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function esCubierta(p) {
    return p && (p.tipo === "portada" || p.tipo === "contraportada");
  }

  // ---------- Render del libro ----------
  // Escritorio: doble página (izq = paginas[indice], der = paginas[indice+1])
  // Móvil: una página (paginas[indice])

  // Pinta un elemento .pagina con el contenido indicado
  function pintarPagina(el, p) {
    el.innerHTML = htmlPagina(p);
    el.classList.toggle("cubierta", esCubierta(p));
    el.classList.toggle("vacia", !p);
  }

  function render() {
    var mov = esMovil.matches;
    var izq = paginas[indice] || null;
    var der = mov ? null : paginas[indice + 1] || null;

    pintarPagina(pagIzq, izq);

    if (!mov) {
      pintarPagina(pagDer, der);
      pagDer.style.display = "";
    } else {
      pagDer.style.display = "none";
    }

    actualizarIndicador();
    actualizarBotones();
  }

  function actualizarIndicador() {
    var total = paginas.length;
    if (esMovil.matches) {
      indicador.textContent = (indice + 1) + " / " + total;
    } else {
      // En escritorio contamos "hojas" (pares)
      var hoja = Math.floor(indice / 2) + 1;
      var totalHojas = Math.ceil(total / 2);
      indicador.textContent = hoja + " / " + totalHojas;
    }
  }

  function actualizarBotones() {
    var mov = esMovil.matches;
    var paso = mov ? 1 : 2;
    var ant = indice === 0;
    var sig = indice + paso >= paginas.length;
    if (btnAnt) btnAnt.disabled = ant;
    if (btnSig) btnSig.disabled = sig;
    if (btnAntNormal) btnAntNormal.disabled = ant;
    if (btnSigNormal) btnSigNormal.disabled = sig;
  }

  function puedeIr(direccion) {
    var paso = esMovil.matches ? 1 : 2;
    var nuevo = indice + paso * direccion;
    return nuevo >= 0 && nuevo < paginas.length;
  }

  // ---------- Efecto de pasar página ----------
  // La "giratoria" es una copia de la página visible que rota
  // sobre el lomo, revelando la siguiente página por debajo.

  function pasarPagina(direccion) {
    if (animando || !puedeIr(direccion)) return;
    animando = true;

    var paso = esMovil.matches ? 1 : 2;
    var nuevoIndice = indice + paso * direccion;
    var mov = esMovil.matches;

    // Caras de la página giratoria:
    // Al avanzar, gira la página derecha: su frente es la página derecha
    // actual y su dorso muestra lo que quedará en la izquierda.
    // Al retroceder (página izquierda girando de vuelta), el frente es
    // lo que volverá a la derecha y el dorso es la página izquierda actual.
    var frentePag, atrasPag;

    if (mov) {
      frentePag = paginas[indice];
      atrasPag = paginas[nuevoIndice] || null;
    } else if (direccion > 0) {
      frentePag = paginas[indice + 1] || null;
      atrasPag = paginas[nuevoIndice] || null;
    } else {
      // Gira la página izquierda de vuelta a la derecha:
      // el frente es la página izquierda actual y el dorso es
      // la nueva página derecha que queda al llegar.
      frentePag = paginas[indice] || null;
      atrasPag = paginas[nuevoIndice + 1] || null;
    }

    girFrente.innerHTML = htmlPagina(frentePag);
    girAtras.innerHTML = htmlPagina(atrasPag);

    giratoria.classList.add("animando");
    giratoria.classList.toggle("hacia-atras", direccion < 0);
    giratoria.classList.toggle("hacia-adelante", direccion > 0);

    // Pintar las páginas de debajo según la fase del volteo:
    // Escritorio, avanzar: izquierda vieja + derecha nueva.
    // Escritorio, retroceder: izquierda nueva + derecha vieja.
    // Móvil: la giratoria cubre todo el libro, así que la nueva
    // página se puede pintar desde el inicio.
    if (mov) {
      indice = nuevoIndice;
      render();
    } else if (direccion > 0) {
      pintarPagina(pagIzq, paginas[indice] || null);
      pintarPagina(pagDer, paginas[nuevoIndice + 1] || null);
    } else {
      pintarPagina(pagIzq, paginas[nuevoIndice] || null);
      pintarPagina(pagDer, paginas[indice + 1] || null);
    }

    // El índice y el indicador se actualizan al final del volteo
    var indiceFinal = nuevoIndice;

    var fin = function () {
      giratoria.classList.remove("animando", "hacia-atras", "hacia-adelante");
      girFrente.innerHTML = "";
      girAtras.innerHTML = "";
      indice = indiceFinal;
      render();
      animando = false;
    };

    giratoria.addEventListener("animationend", fin, { once: true });
    // Failsafe por si la animación no dispara (pe. pestaña en segundo plano)
    setTimeout(function () {
      if (animando) fin();
    }, 800);
  }

  // ---------- Eventos ----------
  if (btnAntBorde) btnAntBorde.addEventListener("click", function () { pasarPagina(-1); });
  if (btnSigBorde) btnSigBorde.addEventListener("click", function () { pasarPagina(1); });
  if (btnAntNormal) btnAntNormal.addEventListener("click", function () { pasarPagina(-1); });
  if (btnSigNormal) btnSigNormal.addEventListener("click", function () { pasarPagina(1); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") pasarPagina(1);
    if (e.key === "ArrowLeft") pasarPagina(-1);
  });

  // Swipe táctil
  var inicioX = null, inicioY = null;

  libro.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    inicioX = e.touches[0].clientX;
    inicioY = e.touches[0].clientY;
  }, { passive: true });

  libro.addEventListener("touchend", function (e) {
    if (inicioX === null) return;
    var dx = e.changedTouches[0].clientX - inicioX;
    var dy = e.changedTouches[0].clientY - inicioY;
    inicioX = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      pasarPagina(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  // Al cambiar el tamaño, re-renderizar (escritorio <-> móvil)
  function alCambiarTam() {
    if (esMovil.matches) {
      // Asegurar índice válido
      if (indice >= paginas.length) indice = paginas.length - 1;
    } else {
      // Alinear índice a página izquierda (par)
      if (indice % 2 !== 0) indice -= 1;
    }
    render();
  }

  var tmr;
  window.addEventListener("resize", function () {
    clearTimeout(tmr);
    tmr = setTimeout(alCambiarTam, 150);
  });

  // ---------- Inicio ----------
  construirPaginas();
  render();
})();