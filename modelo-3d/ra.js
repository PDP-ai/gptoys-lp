// Página de RA da visita: lê saida/catalogo.json, deixa escolher modelo e cores, mostra o 3D na tela
// e abre a realidade aumentada nativa do celular:
//   iPhone  -> AR Quick Look com o ar.usdz (ou mini.usdz), tamanho travado (#allowsContentScaling=0)
//   Android -> Scene Viewer com o ar.glb (ou mini.glb), tamanho travado (resizable=false)
// O jeito de abrir é o mesmo que o model-viewer 4.0.0 usa por dentro (copiado do código dele).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var mv = $('mv'), estado = { m: null, c: null }, catalogo = null;
  var SINAL_FALHA = '#sem-ra';

  // ---- que aparelho é este ----
  var ua = navigator.userAgent;
  var IOS = (/iPad|iPhone|iPod/.test(ua) && !self.MSStream) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var WKWEBVIEW = Boolean(window.webkit && window.webkit.messageHandlers);
  var QUICKLOOK = IOS && (WKWEBVIEW ? /CriOS\/|EdgiOS\/|FxiOS\/|GSA\/|DuckDuckGo\//.test(ua) : (function () { var a = document.createElement('a'); return Boolean(a.relList && a.relList.supports && a.relList.supports('ar')); })());
  var SCENEVIEWER = /android/i.test(ua) && !/firefox/i.test(ua) && !/OculusBrowser/.test(ua);

  function modeloAtual() { return catalogo.modelos.filter(function (m) { return m.id === estado.m; })[0]; }
  function arquivos() { var m = modeloAtual(); return m.cores[estado.c].arquivos; }
  function urlArquivo(rel) { return new URL('saida/' + rel, location.href).href; }
  function linkDaPagina() { var u = new URL(location.href); u.hash = ''; u.search = '?m=' + encodeURIComponent(estado.m) + '&c=' + encodeURIComponent(estado.c); return u.href; }
  function fmt(n) { return String(n).replace('.', ','); }

  // ---- abrir a RA ----
  function abrirQuickLook(usdz) {
    var a = document.createElement('a'), img = document.createElement('img');
    a.setAttribute('rel', 'ar'); a.appendChild(img);
    a.setAttribute('href', urlArquivo(usdz) + '#allowsContentScaling=0');
    a.style.display = 'none'; document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); }, 1000);
  }
  function abrirSceneViewer(glb, titulo) {
    var volta = new URL(location.href); volta.hash = SINAL_FALHA;
    var p = new URLSearchParams(); p.set('mode', 'ar_preferred'); p.set('disable_occlusion', 'true'); p.set('resizable', 'false'); p.set('title', titulo);
    var intent = 'intent://arvr.google.com/scene-viewer/1.2?' + p.toString() + '&file=' + encodeURIComponent(urlArquivo(glb)) +
      '#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=' + encodeURIComponent(volta.toString()) + ';end;';
    var a = document.createElement('a'); a.setAttribute('href', intent); a.style.display = 'none'; document.body.appendChild(a);
    a.click(); setTimeout(function () { a.remove(); }, 1000);
  }
  function abrirRA(mini) {
    var arq = arquivos(), m = modeloAtual(), titulo = m.nome + (mini ? ' (miniatura 1:10)' : '') + ' — ilustrativo';
    if (QUICKLOOK) abrirQuickLook(mini ? arq.mini_usdz : arq.ar_usdz);
    else if (SCENEVIEWER) abrirSceneViewer(mini ? arq.mini : arq.ar, titulo);
  }
  window.addEventListener('hashchange', function () { if (location.hash === SINAL_FALHA) { $('falha-android').hidden = false; history.replaceState(null, '', linkDaPagina()); } });

  // ---- tela ----
  function botao(texto, sub, extra) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'opcao'; b.setAttribute('role', 'radio');
    var t = document.createElement('b'); t.textContent = texto; b.appendChild(t);
    if (sub) { var s = document.createElement('small'); s.textContent = sub; b.appendChild(s); }
    if (extra) b.appendChild(extra);
    return b;
  }
  function desenharModelos() {
    var box = $('modelos'); box.textContent = '';
    catalogo.modelos.forEach(function (m) {
      var md = m.medidas_m, b = botao(m.nome, fmt(md.comprimento) + ' × ' + fmt(md.largura) + ' × ' + fmt(md.altura) + ' m');
      b.setAttribute('aria-checked', String(m.id === estado.m));
      b.addEventListener('click', function () { if (estado.m === m.id) return; estado.m = m.id; if (!m.cores[estado.c]) estado.c = m.cor_padrao; atualizar(); });
      box.appendChild(b);
    });
  }
  function desenharCores() {
    var box = $('cores'), m = modeloAtual(); box.textContent = '';
    Object.keys(m.cores).forEach(function (id) {
      var c = m.cores[id], am = document.createElement('span'); am.className = 'amostras'; am.setAttribute('aria-hidden', 'true');
      (c.amostra || []).forEach(function (hex) { var i = document.createElement('i'); i.style.background = hex; am.appendChild(i); });
      var esq = (catalogo.esquemas_cores || {})[id] || {};
      var b = botao(c.nome, esq.descricao || '', am);
      b.setAttribute('aria-checked', String(id === estado.c));
      b.addEventListener('click', function () { if (estado.c === id) return; estado.c = id; atualizar(); });
      box.appendChild(b);
    });
  }
  function desenharQR() {
    var url = linkDaPagina(), box = $('qr');
    if (typeof qrcode !== 'function') { box.textContent = ''; return; }
    var q = qrcode(0, 'M'); q.addData(url); q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }
  function atualizar() {
    var m = modeloAtual(), arq = arquivos(), md = m.medidas_m;
    $('titulo').textContent = m.nome + ' em realidade aumentada';
    document.title = m.nome + ' em RA | GP Toys';
    $('medidas').textContent = m.medidas_texto;
    $('mini-medida').textContent = 'fica com ' + fmt(Math.round(md.comprimento * 100) / 10) + ' × ' + fmt(Math.round(md.largura * 100) / 10) + ' × ' + fmt(Math.round(md.altura * 100) / 10) + ' cm';
    var ul = $('ilustrativo'); ul.textContent = '';
    (m.ilustrativo || []).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    var ficha = $('ficha'); ficha.hidden = !m.ficha_fabrica; ficha.textContent = m.ficha_fabrica ? 'O que a ficha da fábrica diz: ' + m.ficha_fabrica : '';
    $('versao').textContent = 'Versão dos arquivos: ' + m.versao + ' · cores: ' + m.cores[estado.c].nome + ' · ' + (QUICKLOOK ? 'iPhone (Quick Look)' : SCENEVIEWER ? 'Android (Scene Viewer)' : 'sem RA neste aparelho');
    mv.alt = 'Modelo 3D ilustrativo do ' + m.nome + ', cores ' + m.cores[estado.c].nome;
    $('carregando').hidden = false;
    mv.src = urlArquivo(arq.ar); // na tela: o mesmo arquivo que o Android abre na RA
    desenharModelos(); desenharCores(); desenharQR();
    history.replaceState(null, '', linkDaPagina());
  }

  // ---- início ----
  mv.addEventListener('load', function () { $('carregando').hidden = true; });
  $('ra-real').addEventListener('click', function () { abrirRA(false); });
  $('ra-mini').addEventListener('click', function () { abrirRA(true); });
  if (!QUICKLOOK && !SCENEVIEWER) { $('botoes-ra').hidden = true; $('sem-ra').hidden = false; }
  $('copiar').addEventListener('click', function () {
    var b = this, url = linkDaPagina();
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = 'Link copiado'; }, function () { window.prompt('Copie o link:', url); });
    setTimeout(function () { b.textContent = 'Copiar link'; }, 2500);
  });
  if (navigator.share) {
    $('compartilhar').hidden = false;
    $('compartilhar').addEventListener('click', function () { navigator.share({ title: modeloAtual().nome + ' (ilustrativo) | GP Toys', url: linkDaPagina() }).catch(function () {}); });
  }
  if (location.hash === SINAL_FALHA) $('falha-android').hidden = false;

  fetch('saida/catalogo.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (cat) {
    catalogo = cat;
    var q = new URLSearchParams(location.search), m = cat.modelos.filter(function (x) { return x.id === q.get('m'); })[0] || cat.modelos[0];
    estado.m = m.id; estado.c = m.cores[q.get('c')] ? q.get('c') : m.cor_padrao;
    atualizar();
  }).catch(function () { $('erro-catalogo').hidden = false; });
})();
