class Tour {
  constructor(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.highlightEl = null;
    this.buildDOM();
  }

  buildDOM() {
    this.overlay = document.getElementById('tour-overlay');
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'tour-overlay';
      document.body.appendChild(this.overlay);
    }

    this.tooltip = document.getElementById('tour-tooltip');
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.id = 'tour-tooltip';
      this.tooltip.innerHTML = `
        <div class="tour-title" id="tour-title"></div>
        <div class="tour-text" id="tour-text"></div>
        <div class="tour-actions">
          <button class="tour-btn-skip" id="tour-btn-skip">Omitir</button>
          <div class="tour-nav">
            <button class="tour-btn prev" id="tour-btn-prev">Anterior</button>
            <button class="tour-btn next" id="tour-btn-next">Siguiente</button>
          </div>
        </div>
      `;
      document.body.appendChild(this.tooltip);
    }

    document.getElementById('tour-btn-skip').onclick = () => this.end();
    document.getElementById('tour-btn-prev').onclick = () => this.prev();
    document.getElementById('tour-btn-next').onclick = () => this.next();
  }

  start() {
    this.currentStep = 0;
    this.overlay.classList.add('visible');
    this.tooltip.classList.add('visible');
    this.showStep();
  }

  end() {
    this._clearHighlight();
    this.overlay.classList.remove('visible');
    this.tooltip.classList.remove('visible');
  }

  prev() {
    if (this.currentStep > 0) { this.currentStep--; this.showStep(); }
  }

  next() {
    if (this.currentStep < this.steps.length - 1) { this.currentStep++; this.showStep(); }
    else this.end();
  }

  _clearHighlight() {
    if (this.highlightEl) { this.highlightEl.remove(); this.highlightEl = null; }
  }

  showStep() {
    this._clearHighlight();

    const step   = this.steps[this.currentStep];
    const target = document.querySelector(step.target);

    if (!target) { this.next(); return; }

    document.getElementById('tour-title').textContent = step.title;
    document.getElementById('tour-text').textContent  = step.text;
    document.getElementById('tour-btn-prev').style.display =
      this.currentStep === 0 ? 'none' : 'block';
    document.getElementById('tour-btn-next').textContent =
      this.currentStep === this.steps.length - 1 ? '¡Empezar!' : 'Siguiente';

    // Scroll al elemento y posicionar después
    target.scrollIntoView({ behavior: 'instant', block: 'nearest' });

    requestAnimationFrame(() => this._positionAll(target));
  }

  // Devuelve el rect del elemento; si es muy ancho, usa el rect de sus hijos
  _contentRect(target) {
    const rect = target.getBoundingClientRect();
    const vw   = window.innerWidth;

    if (rect.width > vw * 0.75 && target.children.length > 0) {
      let minL = Infinity, maxR = -Infinity, minT = Infinity, maxB = -Infinity;
      Array.from(target.children).forEach(ch => {
        const cr = ch.getBoundingClientRect();
        if (cr.width > 0 && cr.height > 0) {
          minL = Math.min(minL, cr.left);
          maxR = Math.max(maxR, cr.right);
          minT = Math.min(minT, cr.top);
          maxB = Math.max(maxB, cr.bottom);
        }
      });
      if (minL !== Infinity) {
        return { left: minL, top: minT, right: maxR, bottom: maxB,
                 width: maxR - minL, height: maxB - minT };
      }
    }
    return rect;
  }

  _positionAll(target) {
    const pad = 6;
    const gap = 14;
    const margin = 16;
    const rect  = this._contentRect(target);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // ── Highlight box ─────────────────────────────────────────────
    this.highlightEl = document.createElement('div');
    this.highlightEl.className = 'tour-highlight-box';
    this.highlightEl.style.top    = `${rect.top    - pad}px`;
    this.highlightEl.style.left   = `${rect.left   - pad}px`;
    this.highlightEl.style.width  = `${rect.width  + pad * 2}px`;
    this.highlightEl.style.height = `${rect.height + pad * 2}px`;
    document.body.appendChild(this.highlightEl);

    // ── Tooltip position ──────────────────────────────────────────
    this.tooltip.style.visibility = 'hidden';
    this.tooltip.style.display    = 'block';
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    this.tooltip.style.visibility = '';

    const spaceRight = vw - rect.right;
    const spaceLeft  = rect.left;
    const isWide     = rect.width > vw * 0.65;

    let top  = rect.top + rect.height / 2 - th / 2;
    let left;

    if (!isWide && spaceRight >= tw + gap) {
      left = rect.right + gap + pad;
    } else if (!isWide && spaceLeft >= tw + gap) {
      left = rect.left - tw - gap - pad;
    } else {
      left = vw / 2 - tw / 2;
      top  = rect.top > th + gap ? rect.top - th - gap - pad : rect.bottom + gap + pad;
    }

    top  = Math.max(margin, Math.min(top,  vh - th - margin));
    left = Math.max(margin, Math.min(left, vw - tw - margin));

    this.tooltip.style.top  = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }
}
