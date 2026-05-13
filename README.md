# 🎓 Calificador Interactivo LNG

Una aplicación de escritorio rápida, **100% offline** y amigable, diseñada para facilitar la labor docente al momento de calificar y administrar las notas de múltiples materias y clases. Construida con tecnologías web (HTML, CSS, JS) y empaquetada con **Electron** para ofrecer instaladores nativos en Windows y macOS.

---

## ✨ Características Principales

- **Multi-Plataforma:** Instaladores nativos para Windows (`.exe`) y macOS (`.dmg`).
- **100% Offline y Seguro:** Toda la información se guarda localmente en archivos `.csv` en la computadora del profesor. Los datos nunca se suben a la nube.
- **Autoguardado Inteligente:** Sistema de autoguardado cada 60 segundos con copias de seguridad rotativas que mantiene las 5 versiones más recientes.
- **Metodología Pedagógica Completa:**
  - 📅 **4 Periodos de Tiempo:** Inicial, Básico, Nivel Alto, Superior.
  - 🧠 **4 Componentes de Evaluación por periodo:**
    - 📚 **C. Cognitivo** (Conceptos)
    - 🛠️ **C. Praxiológico** (Práctica)
    - 🤝 **C. Axiológico** (Comportamiento)
    - 🙋 **Autoevaluación**
  - Historial independiente de **3 sesiones de clase** por componente, por periodo.
- **Consolidado del Trimestre:** Valoración automática del trimestre completo visible en todo momento:
  - ⭐ **Superior:** Todos los componentes en Superior.
  - 🔥 **Alto:** Al menos un componente en Alto.
  - 🌱 **En Proceso:** 2 o más componentes en En Proceso.
- **Múltiples Materias:** Gestiona diferentes grupos o materias desde una sola pantalla con pestañas. Cada materia se puede **renombrar** con el ícono ✏️.
- **Calificación Rápida:** Botones de relleno automático (P/A/S) en la cabecera de cada columna para asignar un nivel a toda la clase de un solo clic.
- **Tour Guiado:** Onboarding paso a paso integrado que inicia automáticamente al crear tu primer archivo y puede repetirse desde el botón "Tour Guiado".
- **Modo Oscuro / Claro:** Disponible desde la pantalla de inicio y desde la app.
- **Exportar resumen:** Copia un reporte de texto plano al portapapeles para pegar en chats o correos.

---

## 📦 Descarga e Instalación

Dirígete a la pestaña de [**Releases**](../../releases/latest) de este repositorio y descarga el archivo correspondiente a tu sistema operativo.

### Windows

1. Descarga `Calificador Interactivo Setup 1.X.X.exe`.
2. Ejecútalo. El instalador **no requiere permisos de administrador** y se instala por usuario.
3. Se crearán accesos directos en el **Escritorio** y el **Menú de Inicio** automáticamente.

#### 🛡️ Advertencia de SmartScreen (Windows Defender)

Al ser software independiente sin firma de código comercial, Windows puede mostrar una advertencia la primera vez. **Es un falso positivo.**

- **Al descargar en Edge:** clic en `···` junto a la descarga → *Mantener* → *Mostrar más* → *Mantener de todos modos*.
- **Al instalar:** clic en *Más información* → *Ejecutar de todas formas*.

### macOS

1. Descarga `Calificador Interactivo-1.X.X.dmg`.
2. Ábrelo y arrastra el ícono a tu carpeta **Aplicaciones**.
3. La primera vez, haz clic derecho → *Abrir* si macOS muestra una advertencia de desarrollador no verificado.

---

## 🚀 Cómo Usar (Guía Rápida)

1. **Abre la app** → La pantalla de bienvenida aparece con el Tour Guiado automático.
2. **Crear Archivo Nuevo** → Elige dónde guardar tu base de datos `.csv`.
3. **Agregar Materia** → Ingresa el nombre y pega la lista de estudiantes (un nombre por línea).
4. **Califica** → Clic en `P`, `A` o `S` en cada sesión. El sistema calcula la valoración por periodo y el consolidado del trimestre en tiempo real.
5. **Guardar** → Usa *Guardar BD* para guardar en el mismo archivo. *Exportar BD* para guardar una copia nueva. El autoguardado actúa cada 60 segundos.
6. **Exportar resumen** → Usa *Copiar a portapapeles* para pegar el reporte en un chat o correo.

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
