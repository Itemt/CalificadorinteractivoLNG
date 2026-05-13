# 🎓 Calificador Interactivo LNG

Una aplicación de escritorio rápida, **100% offline** y amigable, diseñada para facilitar la labor docente al momento de calificar y administrar las notas de múltiples materias y clases. Construida con tecnologías web (HTML, CSS, JS) y empaquetada con **Electron** para ofrecer instaladores nativos en Windows y macOS.

---

## ✨ Características Principales

- **Multi-Plataforma:** Instaladores nativos para Windows (`.exe`) y macOS (`.dmg`).
- **100% Offline y Seguro:** Toda la información se guarda localmente en archivos `.csv` en la computadora del profesor. Los datos nunca se suben a la nube.
- **Autoguardado Inteligente:** Sistema de autoguardado cada 60 segundos que mantiene el archivo siempre actualizado.
- **Metodología Pedagógica Completa:**
  - 📊 **4 Niveles de Evaluación:** Inicial, Básico, Nivel Alto, Superior — cada uno con historial independiente.
  - 🧠 **4 Componentes por nivel:**
    - 📚 **C. Cognitivo** (Conceptos)
    - 🛠️ **C. Praxiológico** (Práctica)
    - 🤝 **C. Axiológico** (Comportamiento)
    - 🙋 **Autoevaluación**
  - 🔢 **Clases por nivel configurables:** al crear o editar una materia, el profesor define cuántas sesiones de clase se evalúan en cada nivel (1 a 10). Los archivos existentes siguen funcionando sin cambios.
- **Consolidado del Trimestre:** Valoración automática del trimestre completo (requiere todas las sesiones calificadas):
  - ⭐ **Superior:** Todos los componentes en Superior.
  - 🔥 **Alto:** Al menos un componente en Alto.
  - 🌱 **En Proceso:** 2 o más componentes en En Proceso.
- **Múltiples Materias:** Gestiona diferentes grupos o materias con pestañas. Cada materia se puede **renombrar y editar** (incluyendo el número de sesiones) con el ícono ✏️ en cualquier momento.
- **Asistencia por Sesión:** Botones de ✓/✗ por cada sesión de clase registran la asistencia en tiempo real. Las ausencias se reflejan en el reporte exportado.
- **Puntos Positivos/Negativos:** Sistema de puntos acumulables por estudiante y por nivel con botones ＋ y −.
- **Calificación Rápida:** Botones de relleno automático (P/A/S) en la cabecera de cada columna para asignar un nivel a toda la clase de un solo clic.
- **Tour Guiado:** Onboarding paso a paso integrado que inicia automáticamente al crear tu primer archivo y puede repetirse desde el botón "Tour Guiado".
- **Modo Oscuro / Claro:** Disponible desde la pantalla de inicio y desde la app.
- **Exportar resumen:** Copia un reporte de texto plano al portapapeles para pegar en chats o correos, incluyendo asistencia y puntos.

---

## 📦 Descarga e Instalación

Dirígete a la pestaña de [**Releases**](../../releases/latest) de este repositorio y descarga el archivo correspondiente a tu sistema operativo.

### Windows

1. Descarga `Calificador Interactivo Setup 1.2.0.exe`.
2. Ejecútalo. El instalador **no requiere permisos de administrador** y se instala por usuario.
3. Se crearán accesos directos en el **Escritorio** y el **Menú de Inicio** automáticamente.

> **Actualización desde versión anterior:** simplemente instala el nuevo `.exe` por encima. Tus archivos `.csv` existentes siguen funcionando exactamente igual, ahora con acceso a las nuevas funcionalidades.

#### 🛡️ Advertencia de SmartScreen (Windows Defender)

Al ser software independiente sin firma de código comercial, Windows puede mostrar una advertencia la primera vez. **Es un falso positivo.**

- **Al descargar en Edge:** clic en `···` junto a la descarga → *Mantener* → *Mostrar más* → *Mantener de todos modos*.
- **Al instalar:** clic en *Más información* → *Ejecutar de todas formas*.

### macOS

1. Descarga `Calificador Interactivo-1.2.0.dmg`.
2. Ábrelo y arrastra el ícono a tu carpeta **Aplicaciones**.
3. La primera vez, haz clic derecho → *Abrir* si macOS muestra una advertencia de desarrollador no verificado.

---

## 🚀 Cómo Usar (Guía Rápida)

1. **Abre la app** → La pantalla de bienvenida aparece con el Tour Guiado automático.
2. **Crear Archivo Nuevo** → Elige dónde guardar tu base de datos `.csv`.
3. **Agregar Materia** → Ingresa el nombre, define cuántas clases por nivel (default: 3) y pega la lista de estudiantes (un nombre por línea).
4. **Califica** → Clic en `P`, `A` o `S` en cada sesión. La valoración por periodo y el consolidado aparecen automáticamente cuando **todas las sesiones del nivel están calificadas**.
5. **Asistencia** → Usa los botones ✓/✗ por sesión en la columna del estudiante.
6. **Puntos** → Usa ＋ y − para acumular puntos positivos/negativos por nivel.
7. **Editar Materia** → Haz clic en ✏️ sobre cualquier pestaña para renombrar o cambiar el número de clases por nivel.
8. **Guardar** → Usa *Guardar BD* para guardar en el mismo archivo o *Exportar BD* para crear una copia. El autoguardado actúa cada 60 segundos.
9. **Exportar resumen** → Usa *Copiar a portapapeles* para pegar el reporte en un chat o correo.

---

## 🔄 Compatibilidad con versiones anteriores

Los archivos `.csv` creados con versiones anteriores de la aplicación **funcionan sin modificaciones**. Al abrirlos, la app detecta automáticamente el formato antiguo y asigna 3 sesiones por nivel a cada materia. El profesor puede luego editar el número de sesiones con el ✏️ sin perder ningún dato.

---

## 🛠️ Para Desarrolladores

### Requisitos

- Node.js v18 o superior
- Git

### Instalación local

```bash
git clone https://github.com/Itemt/CalificadorinteractivoLNG.git
cd CalificadorinteractivoLNG
npm install
npm start
```

### Compilar instaladores

```bash
# macOS → genera .dmg (x64 + arm64)
npm run dist:mac

# Windows → genera Setup .exe (x64)
npm run dist:win

# Ambas plataformas
npm run dist
```

Los instaladores quedan en la carpeta `dist/`.

### Publicar una nueva versión

1. Actualiza `"version"` en `package.json`.
2. Actualiza el README si es necesario.
3. Haz commit y crea el tag:

```bash
git tag v1.X.X
git push origin v1.X.X
```

GitHub Actions compilará y publicará los instaladores automáticamente en GitHub Releases.

---

## 🏗️ Tecnologías

| Tecnología | Rol |
|---|---|
| Vanilla JS (ES6+) | Lógica de la aplicación (MVC) |
| HTML5 & CSS3 | Interfaz con variables CSS, Flexbox y Grid |
| [Electron.js](https://www.electronjs.org/) v41 | Framework de escritorio multiplataforma |
| [electron-builder](https://www.electron.build/) v26 | Empaquetado y distribución (NSIS, DMG) |

---

## 📄 Licencia

Distribuido bajo la Licencia ISC.
