class Model {
  constructor() {
    this.appData = this.createEmptyData();
    this.currentFileHandle = null;
    this.currentPeriod = localStorage.getItem('calificador_currentPeriod') || 'inicial';
    this.currentClass = null;
  }

  createEmptyData() {
    return {
      classes: {},
      grades: {
        inicial: {},
        basico: {},
        alto: {},
        superior: {}
      }
    };
  }

  emptyGrade() {
    return {
      conceptos: [null, null, null],
      practica: [null, null, null],
      comportamiento: [null, null, null],
      autoevaluacion: [null, null, null],
      asistencia: [null, null, null], // null = presente, 'A' = ausente
      puntos: 0
    };
  }

  setCurrentPeriod(periodId) {
    this.currentPeriod = periodId;
    localStorage.setItem('calificador_currentPeriod', periodId);
  }

  setCurrentClass(clsId) {
    this.currentClass = clsId;
  }

  getCurrentClassData() {
    if (!this.currentClass || !this.appData.classes[this.currentClass]) return null;
    return this.appData.classes[this.currentClass];
  }

  getStudents() {
    const cls = this.getCurrentClassData();
    return cls ? cls.students : [];
  }

  getGrades() {
    if (!this.currentClass) return [];
    return this.appData.grades[this.currentPeriod][this.currentClass];
  }

  addClass(name, students) {
    const id = 'class_' + Date.now();
    this.appData.classes[id] = { id, name, students };
    
    CONFIG.PERIODS.forEach(p => {
      this.appData.grades[p.id][id] = students.map(() => this.emptyGrade());
    });
    
    this.currentClass = id;
    return id;
  }

  resetCurrentClass() {
    const students = this.getStudents();
    this.appData.grades[this.currentPeriod][this.currentClass] = students.map(() => this.emptyGrade());
  }

  effectiveForDim(sessions) {
    const filled = sessions.filter(Boolean);
    if (filled.length === 0) return null;
    if (filled.includes('P')) return 'P';
    if (filled.includes('A')) return 'A';
    return 'S';
  }

  // Valoración por periodo (la peor nota prevalece)
  overallLevel(grade) {
    const effs = CONFIG.DIMS.map(d => this.effectiveForDim(grade[d])).filter(Boolean);
    if (effs.length === 0) return null;
    if (effs.includes('P')) return 'P';
    if (effs.includes('A')) return 'A';
    return 'S';
  }

  // Consolidado del trimestre: S=todos S; A=al menos uno A; P=2+ en P
  trimesterConsolidated(gradesAllPeriods) {
    // gradesAllPeriods: array of grade objects (one per period)
    const effs = [];
    gradesAllPeriods.forEach(grade => {
      if (!grade) return;
      CONFIG.DIMS.forEach(d => {
        const e = this.effectiveForDim(grade[d]);
        if (e) effs.push(e);
      });
    });
    if (effs.length === 0) return null;
    const countP = effs.filter(e => e === 'P').length;
    if (countP >= 2) return 'P';
    if (effs.includes('A')) return 'A';
    if (effs.every(e => e === 'S')) return 'S';
    return 'A'; // has some S, no A, less than 2 P
  }

  // Consolidado por estudiante usando todos los periodos actuales
  getStudentConsolidated(studentIdx) {
    if (!this.currentClass) return null;
    const gradesAllPeriods = CONFIG.PERIODS.map(p => {
      const pg = this.appData.grades[p.id][this.currentClass];
      return pg ? pg[studentIdx] : null;
    });
    return this.trimesterConsolidated(gradesAllPeriods);
  }

  updateSession(studentIdx, dim, sessionIdx, lvl) {
    const grades = this.getGrades();
    const sessions = grades[studentIdx][dim];
    sessions[sessionIdx] = (sessions[sessionIdx] === lvl) ? null : lvl;
    return grades[studentIdx];
  }

  updateAttendance(studentIdx, sessionIdx) {
    const grades = this.getGrades();
    const att = grades[studentIdx].asistencia || [null, null, null];
    att[sessionIdx] = att[sessionIdx] === 'A' ? null : 'A';
    grades[studentIdx].asistencia = att;
    return grades[studentIdx];
  }

  updatePoints(studentIdx, delta) {
    const grades = this.getGrades();
    grades[studentIdx].puntos = (grades[studentIdx].puntos || 0) + delta;
    return grades[studentIdx];
  }

  fillAllDimension(dim, lvl) {
    let filledCount = 0;
    const students = this.getStudents();
    const grades = this.getGrades();
    
    students.forEach((name, idx) => {
      const sessions = grades[idx][dim];
      const emptyIdx = sessions.findIndex(g => g === null);
      if (emptyIdx !== -1) {
        sessions[emptyIdx] = lvl;
        filledCount++;
      }
    });
    return filledCount;
  }

  // --- CSV LOGIC ---

  generateCSV() {
    const lines = ['ClaseId,NombreClase,Periodo,Estudiante,Conceptos_1,Conceptos_2,Conceptos_3,Practica_1,Practica_2,Practica_3,Comportamiento_1,Comportamiento_2,Comportamiento_3,Autoevaluacion_1,Autoevaluacion_2,Autoevaluacion_3,Asistencia_1,Asistencia_2,Asistencia_3,Puntos'];
    
    Object.values(this.appData.classes).forEach(cls => {
      CONFIG.PERIODS.forEach(period => {
        const periodId = period.id;
        const gradesForPeriod = this.appData.grades[periodId][cls.id];
        if (!gradesForPeriod) return;

        cls.students.forEach((studentName, idx) => {
          const g = gradesForPeriod[idx];
          if (!g) return;
          
          const cleanName = studentName.replace(/"/g, '""');
          const cleanClassName = cls.name.replace(/"/g, '""');
          const att = g.asistencia || [null, null, null];
          const row = [
            cls.id,
            `"${cleanClassName}"`,
            periodId,
            `"${cleanName}"`,
            g.conceptos[0] || '', g.conceptos[1] || '', g.conceptos[2] || '',
            g.practica[0] || '', g.practica[1] || '', g.practica[2] || '',
            g.comportamiento[0] || '', g.comportamiento[1] || '', g.comportamiento[2] || '',
            (g.autoevaluacion||[null,null,null])[0] || '', (g.autoevaluacion||[null,null,null])[1] || '', (g.autoevaluacion||[null,null,null])[2] || '',
            att[0] || '', att[1] || '', att[2] || '',
            g.puntos || 0
          ];
          lines.push(row.join(','));
        });
      });
    });
    return lines.join('\n');
  }

  parseCSVRow(text) {
    let p = '', row = [''], d = 0, l;
    for (let i = 0; i < text.length; i++) {
      l = text[i];
      if (l === '"') {
        if (d === 0) d = 1;
        else if (text[i+1] === '"') { row[row.length-1] += '"'; i++; }
        else d = 0;
      } else if (l === ',' && d === 0) {
        row.push('');
      } else {
        row[row.length-1] += l;
      }
    }
    return row.map(c => c.trim());
  }

  parseCSV(csvStr) {
    const lines = csvStr.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) return this.createEmptyData(); // Only header or empty
    
    const dataLines = lines.slice(1);
    const newAppData = this.createEmptyData();

    dataLines.forEach(line => {
      const cols = this.parseCSVRow(line);
      if (cols.length < 13) return; // invalid row

      const [classId, className, period, studentName, c1, c2, c3, p1, p2, p3, b1, b2, b3, ae1, ae2, ae3,
             att1, att2, att3, ptsRaw] = cols;
      
      if (!newAppData.classes[classId]) {
        newAppData.classes[classId] = { id: classId, name: className, students: [] };
        CONFIG.PERIODS.forEach(p => {
          newAppData.grades[p.id][classId] = [];
        });
      }
      
      const cls = newAppData.classes[classId];
      let studentIdx = cls.students.indexOf(studentName);
      
      if (studentIdx === -1) {
        cls.students.push(studentName);
        studentIdx = cls.students.length - 1;
        // init empty grades for all periods for this student
        CONFIG.PERIODS.forEach(p => {
          newAppData.grades[p.id][classId].push(this.emptyGrade());
        });
      }
      
      if (newAppData.grades[period] && newAppData.grades[period][classId]) {
        newAppData.grades[period][classId][studentIdx] = {
          conceptos: [c1||null, c2||null, c3||null],
          practica: [p1||null, p2||null, p3||null],
          comportamiento: [b1||null, b2||null, b3||null],
          autoevaluacion: [ae1||null, ae2||null, ae3||null],
          asistencia: [att1||null, att2||null, att3||null],
          puntos: parseInt(ptsRaw) || 0
        };
      }
    });

    return newAppData;
  }

  async openFile() {
    let contents = '';
    let filePath = null;

    if (window.electronAPI) {
      const { filePath: fp, canceled } = await window.electronAPI.showOpenFilePicker({
        properties: ['openFile'],
        filters: [{ name: 'Base de Datos CSV', extensions: ['csv'] }]
      });
      if (canceled) return false;
      contents = await window.electronAPI.readFile(fp);
      filePath = fp;
    } else {
      if (!window.showOpenFilePicker) throw new Error("Tu navegador no soporta esta función.");
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Base de Datos CSV', accept: {'text/csv': ['.csv']} }],
      });
      filePath = fileHandle;
      const file = await fileHandle.getFile();
      contents = await file.text();
    }
    
    try {
      this.appData = this.parseCSV(contents);
      this.currentClass = Object.keys(this.appData.classes)[0] || null;
      this.currentFileHandle = filePath;
      this.setLastFile(filePath);
      return true;
    } catch (e) {
      throw new Error("Formato de CSV inválido o corrupto.");
    }
  }

  async saveFile(isSaveAs = false) {
    const csvStr = this.generateCSV();
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const defaultName = `Mi_Calificador_${pad(d.getDate())}_${pad(d.getMonth()+1)}_${d.getFullYear()}.csv`;
    
    if (window.electronAPI) {
      // === MODO ELECTRON ===
      if (isSaveAs || !this.currentFileHandle) {
        const { filePath, canceled } = await window.electronAPI.showSaveFilePicker({
          defaultPath: defaultName,
          filters: [{ name: 'Base de Datos CSV', extensions: ['csv'] }]
        });
        if (canceled) return false;
        this.currentFileHandle = filePath;
      }
      await window.electronAPI.writeFile(this.currentFileHandle, csvStr);
      this.setLastFile(this.currentFileHandle);

    } else if (window.showSaveFilePicker) {
      // === MODO CHROME/EDGE (File System Access API) ===
      if (typeof this.currentFileHandle === 'string' && !isSaveAs) {
        // browser_session sin picker: guardar solo en localStorage
        localStorage.setItem('calificador_session_data', csvStr);
        localStorage.setItem('calificador_session_name', this.sessionName || defaultName);
        return true;
      }

      if (isSaveAs || !this.currentFileHandle) {
        try {
          this.currentFileHandle = await window.showSaveFilePicker({
            types: [{ description: 'Base de Datos CSV', accept: {'text/csv': ['.csv']} }],
            suggestedName: defaultName
          });
          this.sessionName = this.currentFileHandle.name;
        } catch (err) {
          // Si el usuario cancela el picker y hay sesión activa, guardar en localStorage
          if (typeof this.currentFileHandle === 'string') {
            localStorage.setItem('calificador_session_data', csvStr);
            localStorage.setItem('calificador_session_name', this.sessionName || defaultName);
            return true;
          }
          return false;
        }
      }
      
      const writable = await this.currentFileHandle.createWritable();
      await writable.write(csvStr);
      await writable.close();
      
      // Sincronizar con localStorage para el botón "Continuar"
      localStorage.setItem('calificador_session_data', csvStr);
      localStorage.setItem('calificador_session_name', this.sessionName || defaultName);

    } else {
      // === MODO BROWSER SIN showSaveFilePicker (Firefox, etc.) ===

      // Si ya tenemos un FileSystemFileHandle real (de un directoryPicker previo), escribir directo
      if (!isSaveAs && this.currentFileHandle && typeof this.currentFileHandle !== 'string' && this.currentFileHandle.createWritable) {
        try {
          const writable = await this.currentFileHandle.createWritable();
          await writable.write(csvStr);
          await writable.close();
          localStorage.setItem('calificador_session_data', csvStr);
          localStorage.setItem('calificador_session_name', this.sessionName || defaultName);
          return true;
        } catch(e) { /* permiso expiró, abrir diálogo */ }
      }

      // Solo localStorage si hay sesión activa y no es SaveAs
      if (!isSaveAs && typeof this.currentFileHandle === 'string') {
        localStorage.setItem('calificador_session_data', csvStr);
        localStorage.setItem('calificador_session_name', this.sessionName || defaultName);
        return true;
      }

      // Necesitamos elegir ubicación — mostrar modal
      if (!this.onRequestFilename) return false;
      const result = await this.onRequestFilename(defaultName);
      if (!result) return false;

      if (result.type === 'handle') {
        // showSaveFilePicker (si Firefox lo soporta en el futuro)
        this.currentFileHandle = result.handle;
        this.sessionName = result.handle.name;
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(csvStr);
        await writable.close();
        localStorage.setItem('calificador_session_data', csvStr);
        localStorage.setItem('calificador_session_name', this.sessionName);
        return true;
      }

      if (result.type === 'dirHandle') {
        // showDirectoryPicker (Firefox 111+)
        const fileHandle = await result.dirHandle.getFileHandle(result.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(csvStr);
        await writable.close();
        this.currentFileHandle = fileHandle;
        this.sessionName = result.name;
        localStorage.setItem('calificador_session_data', csvStr);
        localStorage.setItem('calificador_session_name', result.name);
        return true;
      }

      // Descarga directa (fallback)
      const nombre = result.name || defaultName;
      this.sessionName = nombre.endsWith('.csv') ? nombre : nombre + '.csv';
      this.currentFileHandle = 'browser_session';
      this._browserDownload(csvStr, this.sessionName);
      localStorage.setItem('calificador_session_data', csvStr);
      localStorage.setItem('calificador_session_name', this.sessionName);
    }
    return true;
  }

  _browserDownload(csvStr, filename) {
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  setLastFile(filePath) {
    if (typeof filePath === 'string' && filePath !== 'browser_session') {
      localStorage.setItem('calificador_lastFile', filePath);
    }
  }

  async checkLastFile() {
    // Modo browser sin Electron: verificar sesión en localStorage
    if (!window.electronAPI) {
      const data = localStorage.getItem('calificador_session_data');
      const name = localStorage.getItem('calificador_session_name');
      return (data && data.length > 10) ? ('browser_session:' + (name || 'Sesión guardada')) : false;
    }
    const lastFile = localStorage.getItem('calificador_lastFile');
    if (!lastFile) return false;
    const exists = await window.electronAPI.checkExists(lastFile);
    if (!exists) {
      localStorage.removeItem('calificador_lastFile');
      return false;
    }
    return lastFile;
  }

  async loadLastFile() {
    // Modo browser sin Electron
    if (!window.electronAPI) {
      const data = localStorage.getItem('calificador_session_data');
      const name = localStorage.getItem('calificador_session_name');
      if (!data) return false;
      try {
        this.appData = this.parseCSV(data);
        this.currentClass = Object.keys(this.appData.classes)[0] || null;
        this.currentFileHandle = 'browser_session';
        this.sessionName = name || 'Mi_Calificador.csv';
        return this.sessionName;
      } catch(e) { return false; }
    }
    const lastFile = localStorage.getItem('calificador_lastFile');
    if (!lastFile) return false;
    const exists = await window.electronAPI.checkExists(lastFile);
    if (!exists) {
      localStorage.removeItem('calificador_lastFile');
      return false;
    }
    try {
      const contents = await window.electronAPI.readFile(lastFile);
      this.appData = this.parseCSV(contents);
      this.currentClass = Object.keys(this.appData.classes)[0] || null;
      this.currentFileHandle = lastFile;
      return lastFile;
    } catch (e) { return false; }
  }

  async autoSave() {
    if (Object.keys(this.appData.classes).length === 0) return;
    const csvStr = this.generateCSV();

    if (window.electronAPI && typeof this.currentFileHandle === 'string') {
      try { await window.electronAPI.writeFile(this.currentFileHandle, csvStr); } catch(e) {}
      await window.electronAPI.saveBackup(csvStr);
    } else if (this.currentFileHandle && typeof this.currentFileHandle !== 'string' && this.currentFileHandle.createWritable) {
      // Chrome/Edge FileSystemHandle
      try {
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(csvStr);
        await writable.close();
      } catch(e) {}
      localStorage.setItem('calificador_session_data', csvStr);
      localStorage.setItem('calificador_session_name', this.sessionName || 'Mi_Calificador.csv');
    } else {
      // Modo browser (Firefox o Chrome sin archivo real vinculado)
      localStorage.setItem('calificador_session_data', csvStr);
      localStorage.setItem('calificador_session_name', this.sessionName || 'Mi_Calificador.csv');
    }
  }

  newFile() {
    this.appData = this.createEmptyData();
    this.currentFileHandle = null;
    this.currentClass = null;
  }

  renameClass(id, newName) {
    if (this.appData.classes[id]) {
      this.appData.classes[id].name = newName;
      return true;
    }
    return false;
  }

  getStats() {
    let countS = 0, countA = 0, countP = 0;
    const grades = this.getGrades();
    if (!grades) return { countS, countA, countP, total: 0 };

    grades.forEach(g => {
      const t = this.overallLevel(g);
      if (t === 'S') countS++;
      else if (t === 'A') countA++;
      else if (t === 'P') countP++;
    });
    
    return { countS, countA, countP, total: this.getStudents().length };
  }

  exportTextData() {
    if (!this.currentClass) return null;
    const className = this.getCurrentClassData().name.toUpperCase();
    const periodName = CONFIG.PERIODS.find(p => p.id === this.currentPeriod).label.toUpperCase();
    
    const sep = '─'.repeat(85);
    const lines = [`REPORTE: ${className} — PERIODO ${periodName}\n${sep}`];
    lines.push(`${'ESTUDIANTE'.padEnd(34)} CONCEPTOS  PRÁCTICA   COMPORTAM  TOTAL        ASIST.  PTS`);
    lines.push(sep);

    const students = this.getStudents();
    const grades = this.getGrades();

    students.forEach((name, idx) => {
      const g = grades[idx];
      const fmtDim = d => {
        const s = g[d];
        const code = s.map(x => x || '·').join('');
        const eff = this.effectiveForDim(s) || '·';
        return `${code}(${eff})`.padEnd(11);
      };
      const overall = this.overallLevel(g);
      const overallStr = (overall ? CONFIG.LEVEL_LABEL[overall] : '—').padEnd(13);

      // Asistencia: mostrar qué clases faltó
      const att = g.asistencia || [null, null, null];
      const faltas = att.map((a, i) => a === 'A' ? `F.C${i+1}` : null).filter(Boolean);
      const attStr = faltas.length === 0 ? '✓ todas' : faltas.join(' ');

      // Puntos
      const pts = g.puntos || 0;
      const ptsStr = pts > 0 ? `+${pts}` : `${pts}`;

      lines.push(`${name.substring(0, 33).padEnd(34)} ${fmtDim('conceptos')}${fmtDim('practica')}${fmtDim('comportamiento')}${overallStr}${attStr.padEnd(8)}  ${ptsStr}`);
    });

    lines.push(sep);
    // Resumen de ausencias
    const totalAusencias = grades.reduce((sum, g) => sum + (g.asistencia||[]).filter(a => a === 'A').length, 0);
    if (totalAusencias > 0) {
      lines.push(`Ausencias registradas: ${totalAusencias}`);
    }

    return lines.join('\n');
  }
}
