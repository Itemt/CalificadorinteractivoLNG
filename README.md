# Calificador Interactivo 🎓

Una moderna y rápida aplicación de escritorio (basada en **Electron.js**) diseñada específicamente para profesores. Permite gestionar, evaluar y exportar el rendimiento de los estudiantes dividido en periodos de tiempo, manejando una persistencia de datos plana e interoperable mediante archivos `.csv`.

## 🚀 Características Principales

- **Evaluación por Dimensiones:** Califica a los estudiantes en tres áreas clave: *Conceptos, Práctica y Comportamiento*.
- **Historial de Periodos:** Navegación por 4 niveles de tiempo (Inicial, Básico, Nivel Alto, Superior), almacenando un historial independiente de 3 semanas por cada bloque.
- **Base de Datos Universal (.csv):** La aplicación genera y lee archivos `.csv`. Puedes abrir tu base de datos directamente en **Excel** para manipularla.
- **Flujo Offline y Nativo:** Arquitectura nativa de escritorio sin dependencias de internet. Guardado instantáneo con diálogos de sistema (MacOS/Windows).
- **Modo Claro / Oscuro:** Interfaz 100% adaptable y estéticamente moderna, con altos contrastes.
- **Exportación Rápida:** Posibilidad de copiar un resumen de las notas al portapapeles para pegarlo instantáneamente en reportes u otras plataformas.

## 🛠️ Tecnologías

- **HTML / CSS / Vanilla JavaScript** (Arquitectura MVC limpia).
- **Electron.js** (Backend, Acceso al File System, Empaquetado de Escritorio).
- **Electron Builder** (Generación de instaladores nativos `.dmg`, `.exe`).

## 📥 Instalación (Modo Desarrollo)

1. Clona este repositorio:
   ```bash
   git clone https://github.com/Itemt/CalificadorinteractivoLNG.git
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Ejecuta la aplicación en modo desarrollo:
   ```bash
   npm start
   ```

## 📦 Empaquetado (Instaladores)

Para crear el instalador instalable (Ej: `.dmg` para MacOS o `.exe` para Windows), ejecuta:
```bash
npm run dist
```
Los archivos de instalación se generarán dentro de la carpeta `dist/`.

## 📖 ¿Cómo se usa?

1. Al abrir la app, selecciona **"Crear Archivo Nuevo"**. Se te pedirá guardar un nuevo archivo `.csv` en tu computadora (Ej: `Mi_Calificador_09_05_2026.csv`).
2. Agrega una clase haciendo clic en el botón de **"+ Agregar Clase"**. Ingresa el nombre (ej. Sexto A) y la lista de nombres de los alumnos.
3. Evalúa usando los botones de **S** (Superior), **A** (Alto) o **P** (En Proceso). Puedes usar los botones de flecha rápida en los títulos para asignar masivamente a todos los estudiantes vacíos.
4. Cambia de periodo (Inicial, Básico...) usando las pestañas azules para avanzar en el año escolar sin perder el historial.
5. Usa los botones de **"Guardar BD"** o cierra la app. Tu progreso estará seguro en tu archivo `.csv`.
6. Si deseas abrir un archivo pasado, usa el botón de **"Abrir BD (.csv)"** y localiza tu archivo generado.

---
*Desarrollado con ♥ para facilitar la labor docente.*
