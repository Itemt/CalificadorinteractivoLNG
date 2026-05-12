class Tour {
  constructor(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.buildDOM();
  }

  buildDOM() {
    // Reutiliza el DOM si ya existe (evita duplicados de IDs)
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
    this.overlay.classList.remove('visible');
    this.tooltip.classList.remove('visible');
    if (this.currentTarget) {
      this.currentTarget.classList.remove('tour-highlight');
      this.currentTarget = null;
    }
    localStorage.setItem('calificador_tour_seen', 'true');
  }

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep();
    }
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.showStep();
    } else {
      this.end();
    }
  }

  showStep() {
    if (this.currentTarget) {
      this.currentTarget.classList.remove('tour-highlight');
    }
    
    const step = this.steps[this.currentStep];
    const target = document.querySelector(step.target);
    
    if (!target) {
      this.next();
      return;
    }

    this.currentTarget = target;
    target.classList.add('tour-highlight');

    document.getElementById('tour-title').textContent = step.title;
    document.getElementById('tour-text').textContent = step.text;
    
    document.getElementById('tour-btn-prev').style.display = this.currentStep === 0 ? 'none' : 'block';
    document.getElementById('tour-btn-next').textContent = this.currentStep === this.steps.length - 1 ? '¡Empezar!' : 'Siguiente';

    // Measure tooltip
    this.tooltip.style.display = 'block';
    const tooltipW = this.tooltip.offsetWidth;
    const tooltipH = this.tooltip.offsetHeight;
    this.tooltip.style.display = '';

    const rect = target.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;
    const gap = 12;
    const isWide = rect.width > vw * 0.7;

    // Vertically centered on the target element by default
    let top = rect.top + (rect.height / 2) - (tooltipH / 2);

    // Prefer RIGHT side; fallback to LEFT
    let left;
    const spaceRight = vw - rect.right;
    const spaceLeft  = rect.left;

    if (!isWide && spaceRight >= tooltipW + gap) {
      left = rect.right + gap;
    } else if (!isWide && spaceLeft >= tooltipW + gap) {
      left = rect.left - tooltipW - gap;
    } else {
      // Element is too wide or no side space: Go ABOVE or BELOW
      left = (vw / 2) - (tooltipW / 2);
      if (rect.top > tooltipH + gap) {
        top = rect.top - tooltipH - gap;
      } else {
        top = rect.bottom + gap;
      }
    }

    // Clamp both axes inside viewport
    top  = Math.max(pad, Math.min(top,  vh - tooltipH - pad));
    left = Math.max(pad, Math.min(left, vw - tooltipW - pad));

    this.tooltip.style.top  = top  + 'px';
    this.tooltip.style.left = left + 'px';
    
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
