# Optimización Home Page - Reducir Tiempo de Carga

## Objetivo
Reducir el tiempo de carga del home page de 8 segundos a menos de 2 segundos, sin afectar la búsqueda global.

## Problema Actual
- El home carga TODOS los videos desde `/api/videos` (posiblemente miles)
- Filtra client-side en el navegador, causando lentitud

## Solución
- Cargar solo contenido limitado (10 elementos) por sección desde endpoints específicos
- Usar Promise.all para cargar en paralelo
- Mantener búsqueda global intacta (usa endpoint separado con paginación)

## Pasos de Implementación
- [x] Modificar TVHome.jsx para usar endpoints optimizados
- [x] Cambiar lógica de carga: en lugar de 1 request grande, múltiples requests pequeños en paralelo
- [x] Optimizar Home.jsx regular: cargar carouseles primero, luego búsqueda en background
- [x] Agregar logs de performance para medir tiempos de carga
- [ ] Probar que la búsqueda global siga funcionando
- [ ] Verificar tiempos de carga mejorados

## Endpoints a Usar
- Featured: `/api/videos?isFeatured=true&limit=10`
- Movies: `/public/featured-movies`
- Series: `/public/featured-series`
- Animes: `/public/featured-animes`
- Doramas: `/public/featured-doramas`
- Novelas: `/public/featured-novelas`
- Documentales: `/public/featured-documentales`
- Live: `/api/videos?tipo=live&limit=10`
- Cine2026: `/api/videos?mainSection=CINE_2026&limit=10`

## Revertir si no gusta
- Si no satisface, revertir cambios en TVHome.jsx
