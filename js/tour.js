class Tour {
  constructor(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.buildDOM();
  }

  buildDOM() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'tour-overlay';
    document.body.appendChild(this.overlay);

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

    const rect = target.getBoundingClientRect();
    
    // We must ensure the tooltip is displayed temporarily block to measure it correctly
    this.tooltip.style.display = 'block';
    const tooltipRect = this.tooltip.getBoundingClientRect();
    this.tooltip.style.display = '';

    let top = rect.bottom + window.scrollY + 15;
    let left = rect.left + window.scrollX;

    if (rect.bottom + tooltipRect.height + 15 > window.innerHeight) {
      top = rect.top + window.scrollY - tooltipRect.height - 15;
    }
    if (rect.left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth + window.scrollX - tooltipRect.width - 20;
    }
    
    // Fallback if target is too wide (like the class tabs bar)
    if (rect.width > window.innerWidth * 0.8) {
        left = (window.innerWidth / 2) + window.scrollX - (tooltipRect.width / 2);
    }

    this.tooltip.style.top = top + 'px';
    this.tooltip.style.left = left + 'px';
    
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
