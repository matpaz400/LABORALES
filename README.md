# Mi práctica

Una página en español para llevar el registro de 240 horas de prácticas laborales. Incluye jornadas con fecha, entrada, salida, descanso opcional y descripción; edición y eliminación; progreso, actividad semanal, logros y exportación CSV.

## Desarrollo

Requiere Node.js 20.19+ o 22.12+ y npm. Entorno verificado con Node.js 24.

```sh
npm ci
npm run dev
```

## Comprobaciones y compilación

```sh
npm test
npm run build
npm run preview
```

Los turnos que terminan después de medianoche se registran marcando «La salida es al día siguiente». El tiempo neto excluye los minutos de descanso. No se permiten jornadas futuras o con horarios solapados. Los días de práctica cuentan fechas de inicio únicas.

## Datos

Los registros se guardan en `localStorage` del navegador, bajo la clave `mi-practica.entries.v1`. Permanecen al recargar la página, pero no se sincronizan entre dispositivos, navegadores o direcciones de la web. Borrar los datos del navegador elimina los registros. Exporta un CSV desde «Mis registros» para conservar una copia. Esta versión no tiene importación de CSV, servidor, cuentas ni almacenamiento remoto.

Las fuentes están incluidas en el proyecto; la página no solicita fuentes ni servicios externos al utilizarse.

## Publicación

Página: https://matpaz400.github.io/LABORALES/

Los archivos de desarrollo están en `app/`. GitHub Pages sirve la compilación de la raíz de la rama `main`. Para publicar cambios, ejecuta `npm run build:pages` y sube también los archivos generados `index.html`, `favicon.svg`, `.nojekyll` y `assets/` a GitHub. No se necesitan cambios de configuración de Pages.
