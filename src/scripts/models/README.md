# Modelos 3D para renders

Cada archivo `<nombre>.js` exporta por defecto `build(L)` y devuelve `{ root, cam, look, zoom? }`.
`L` trae THREE y los helpers de `../lab3d.js` (materiales `M`, `fiberBundle`, `needle`, `aim`, `probe`,
`sparks`, `halo`, `rings`, `capsule`, `rnd`, `reseed`, `RoundedBoxGeometry`, `mergeGeometries`).

Render: con `npm run dev` corriendo → `node scripts/render-assets.mjs http://localhost:4321 <nombre>`.
Genera `public/img/3d/<nombre>.webp` (+ `-sm`) y una vista previa en `.render-preview/<nombre>.png`.
