/**
 * Olfativa cotizador — gate de acceso (client-side).
 *
 * NO es seguridad real: alguien con conocimientos básicos de dev tools
 * puede ver el password o bypassear el check. Sirve para filtrar
 * visitas casuales / accidentales.
 *
 * Política: validar al cargar la página. Si no está unlocked en
 * sessionStorage, ocultar el contenido y mostrar un modal con input.
 * Al cerrar la pestaña se pierde la sesión y vuelve a pedir password.
 */
(function() {
  const SESSION_KEY = 'olfativa.unlock.v1';
  // Password ofuscado (base64 de la cadena invertida) — desalienta View Source casual
  const _x = 'NjIwMmF2aXRhZmxv';
  const expected = atob(_x).split('').reverse().join('');

  // Si ya está unlocked en esta sesión, nada que hacer
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    return;
  }

  // Ocultar el body de inmediato hasta que se valide
  const styleHide = document.createElement('style');
  styleHide.id = '__olf_gate_style';
  styleHide.textContent = 'html { visibility: hidden !important; }';
  (document.head || document.documentElement).appendChild(styleHide);

  // Inyectar el modal cuando el DOM esté listo
  function injectGate() {
    const wrap = document.createElement('div');
    wrap.id = '__olf_gate';
    wrap.innerHTML = `
      <style>
        #__olf_gate {
          position: fixed; inset: 0;
          z-index: 2147483647;
          background:
            radial-gradient(ellipse 1200px 800px at 80% 20%, rgba(204,102,51,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 800px 600px at 10% 90%, rgba(204,102,51,0.06) 0%, transparent 60%),
            #1C1A18;
          color: #F5F0E8;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Public Sans', system-ui, -apple-system, sans-serif;
          visibility: visible !important;
        }
        #__olf_gate .gate-card {
          width: min(440px, 90vw);
          padding: 56px 48px;
          border: 1px solid rgba(243,237,227,0.18);
          border-radius: 8px;
          background: rgba(243,237,227,0.03);
          text-align: center;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        #__olf_gate .gate-eyebrow {
          font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
          color: #CC6633; font-weight: 500; margin-bottom: 24px;
        }
        #__olf_gate .gate-logo {
          font-family: 'Libre Baskerville', Georgia, serif;
          font-style: italic; font-weight: 500;
          font-size: 48px; letter-spacing: 0.01em;
          color: #F5F0E8; margin-bottom: 8px; line-height: 1;
        }
        #__olf_gate .gate-logo .reg {
          font-family: 'Public Sans', sans-serif;
          font-size: 12px; font-style: normal; vertical-align: super;
          margin-left: 2px; color: #CC6633;
        }
        #__olf_gate .gate-sub {
          font-family: 'Libre Baskerville', Georgia, serif;
          font-style: italic; font-size: 18px;
          color: rgba(243,237,227,0.55); margin-bottom: 36px;
        }
        #__olf_gate input {
          width: 100%; box-sizing: border-box;
          padding: 14px 16px; margin-bottom: 12px;
          background: rgba(243,237,227,0.06);
          border: 1px solid rgba(243,237,227,0.18);
          border-radius: 4px;
          color: #F5F0E8; font-size: 15px;
          font-family: inherit; letter-spacing: 0.05em;
          outline: none; transition: border-color 160ms;
          text-align: center;
        }
        #__olf_gate input:focus {
          border-color: #CC6633;
          background: rgba(204,102,51,0.06);
        }
        #__olf_gate input::placeholder { color: rgba(243,237,227,0.3); letter-spacing: 0.02em; }
        #__olf_gate button {
          width: 100%; padding: 14px;
          background: #CC6633; color: #1C1A18;
          border: 0; border-radius: 4px;
          font-family: inherit; font-size: 13px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          cursor: pointer; transition: background 160ms;
        }
        #__olf_gate button:hover { background: #d4b376; }
        #__olf_gate .gate-error {
          margin-top: 16px; font-size: 12px;
          color: #C2776B; min-height: 18px;
          letter-spacing: 0.04em;
        }
        #__olf_gate .gate-foot {
          margin-top: 32px; font-size: 10px;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(243,237,227,0.3);
        }
      </style>
      <div class="gate-card">
        <div class="gate-eyebrow">Acceso restringido</div>
        <div class="gate-logo">Olfativa<span class="reg">®</span></div>
        <div class="gate-sub">Herramienta interna · equipo comercial</div>
        <form id="__olf_gate_form" autocomplete="off">
          <input type="password" id="__olf_gate_input"
                 placeholder="Password"
                 autocomplete="off" autofocus />
          <button type="submit">Entrar</button>
          <div class="gate-error" id="__olf_gate_err"></div>
        </form>
        <div class="gate-foot">Olfativa · Casa olfativa</div>
      </div>
    `;
    document.body.appendChild(wrap);

    const input = document.getElementById('__olf_gate_input');
    const err = document.getElementById('__olf_gate_err');
    const form = document.getElementById('__olf_gate_form');

    input.focus();

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const v = (input.value || '').trim().toLowerCase();
      if (v === expected) {
        sessionStorage.setItem(SESSION_KEY, '1');
        wrap.remove();
        const styleEl = document.getElementById('__olf_gate_style');
        if (styleEl) styleEl.remove();
      } else {
        err.textContent = 'Password incorrecto';
        input.value = '';
        input.style.borderColor = '#C2776B';
        setTimeout(() => { input.style.borderColor = ''; }, 1500);
        input.focus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGate);
  } else {
    injectGate();
  }
})();
