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
      comportamiento: [null, null, null]
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

  overallLevel(grade) {
    const effs = CONFIG.DIMS.map(d => this.effectiveForDim(grade[d])).filter(Boolean);
    if (effs.length === 0) return null;
    if (effs.includes('P')) return 'P';
    if (effs.includes('A')) return 'A';
    return 'S';
  }

  updateSession(studentIdx, dim, sessionIdx, lvl) {
    const grades = this.getGrades();
    const sessions = grades[studentIdx][dim];
    sessions[sessionIdx] = (sessions[sessionIdx] === lvl) ? null : lvl;
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
    const lines = ['ClaseId,NombreClase,Periodo,Estudiante,Conceptos_1,Conceptos_2,Conceptos_3,Practica_1,Practica_2,Practica_3,Comportamiento_1,Comportamiento_2,Comportamiento_3'];
    
    Object.values(this.appData.classes).forEach(cls => {
      CONFIG.PERIODS.forEach(period => {
        const periodId = period.id;
        const gradesForPeriod = this.appData.grades[periodId][cls.id];
        if (!gradesForPeriod) return;

        cls.students.forEach((studentName, idx) => {
          const g = gradesForPeriod[idx];
          if (!g) return;
          
          const cleanName = studentName.replace(/"/g, '""');
          const row = [
            cls.id,
            `"${cls.name}"`,
            periodId,
            `"${cleanName}"`,
            g.conceptos[0] || '', g.conceptos[1] || '', g.conceptos[2] || '',
            g.practica[0] || '', g.practica[1] || '', g.practica[2] || '',
            g.comportamiento[0] || '', g.comportamiento[1] || '', g.comportamiento[2] || ''
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

      const [classId, className, period, studentName, c1, c2, c3, p1, p2, p3, b1, b2, b3] = cols;
      
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
          comportamiento: [b1||null, b2||null, b3||null]
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
    } else {
      if (isSaveAs || !this.currentFileHandle) {
        if (!window.showSaveFilePicker) {
           const blob = new Blob([csvStr], { type: 'text/csv' });
           const a = document.createElement('a');
           a.href = URL.createObjectURL(blob);
           a.download = defaultName;
           a.click();
           return true;
        }
        this.currentFileHandle = await window.showSaveFilePicker({
          types: [{ description: 'Base de Datos CSV', accept: {'text/csv': ['.csv']} }],
          suggestedName: defaultName
        });
      }
      const writable = await this.currentFileHandle.createWritable();
      await writable.write(csvStr);
      await writable.close();
    }
    return true;
  }

  setLastFile(filePath) {
    if (typeof filePath === 'string') {
      localStorage.setItem('calificador_lastFile', filePath);
    }
  }

  async checkLastFile() {
    if (!window.electronAPI) return false;
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
    if (!window.electronAPI) return false;
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
    } catch (e) {
      return false;
    }
  }

  async autoSave() {
    if (Object.keys(this.appData.classes).length === 0) return; // Don't backup empty state if nothing has been done
    const csvStr = this.generateCSV();
    
    if (window.electronAPI && typeof this.currentFileHandle === 'string') {
      try {
        await window.electronAPI.writeFile(this.currentFileHandle, csvStr);
      } catch (e) {}
    }
    
    if (window.electronAPI) {
      await window.electronAPI.saveBackup(csvStr);
    }
  }

  newFile() {
    this.appData = this.createEmptyData();
    this.currentFileHandle = null;
    this.currentClass = null;
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
    
    const lines = [`REPORTE: ${className} - PERIODO ${periodName}\n${'─'.repeat(75)}`];
    lines.push(`${'ESTUDIANTE'.padEnd(38)} CONCEPTOS  PRÁCTICA   COMPORTAM  TOTAL`);

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
      const overallStr = overall ? CONFIG.LEVEL_LABEL[overall] : '—';
      lines.push(`${name.substring(0, 37).padEnd(38)} ${fmtDim('conceptos')}${fmtDim('practica')}${fmtDim('comportamiento')}${overallStr}`);
    });

    return lines.join('\n');
  }
}
