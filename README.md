# Locos x la Pizza

Punto de venta de Locos x la Pizza. Live: https://locosxlapizza.netlify.app

- Toda la app vive en `index.html` (HTML + CSS + JS), en la raíz del repo.
- Netlify corre `npm run build` (Vite) y publica `dist/`.
- Los archivos estáticos que tienen que conservar su URL (`manifest.json`, `sw.js`, íconos) van en `public/`. Vite los copia tal cual a `dist/`.
- Backend: Firebase (Firestore + Auth), SDK compat cargado desde gstatic.
