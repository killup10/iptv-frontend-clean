#!/usr/bin/env powershell
<#
.SYNOPSIS
    Empaquetador y servidor para distribuir TeamG Play en Downloader
.DESCRIPTION
    Este script prepara la app para Smart TV, crea un ZIP distributable
    y abre un servidor HTTP para que Downloader descargue los archivos
.EXAMPLE
    .\deploy-to-downloader.ps1
#>

param(
    [switch]$Quick = $false,
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

# Configuración
$appName = "TeamG Play"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommandPath
$distTvDir = Join-Path $projectRoot "dist-tv"
$packageDir = Join-Path $projectRoot "dist-tv-package"
$zipFile = Join-Path $projectRoot "teamg-play-tv.zip"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "
╔════════════════════════════════════════════════════════════╗
║        $appName - Downloader Deployment Tool        ║
║              Empaquetador para Smart TV                    ║
╚════════════════════════════════════════════════════════════╝
$timestamp
" -ForegroundColor Cyan

# Verificar que existe dist-tv
if (-not (Test-Path $distTvDir)) {
    Write-Host "❌ ERROR: No se encontró dist-tv" -ForegroundColor Red
    Write-Host "   Primero ejecuta: npm run build:tv" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Carpeta dist-tv encontrada" -ForegroundColor Green

# Limpiar y preparar directorio de empaque
Write-Host "`n📦 Preparando paquete..." -ForegroundColor Cyan
if (Test-Path $packageDir) {
    Remove-Item $packageDir -Recurse -Force
    Write-Host "   • Limpiada carpeta anterior"
}
New-Item $packageDir -ItemType Directory -Force | Out-Null
Write-Host "   • Directorio de paquete creado"

# Copiar archivos principales
Write-Host "`n📋 Copiando archivos de aplicación..." -ForegroundColor Cyan
$filesToCopy = @(
    "tv-index.html",
    "index.html",
    "assets"
)

foreach ($file in $filesToCopy) {
    $source = Join-Path $distTvDir $file
    $dest = Join-Path $packageDir $file

    if (Test-Path $source) {
        if ((Get-Item $source).PSIsContainer) {
            Copy-Item $source $dest -Recurse -Force
            Write-Host "   ✓ Copiada carpeta: $file"
        } else {
            Copy-Item $source $packageDir
            Write-Host "   ✓ Copiado archivo: $file"
        }
    }
}

# Crear archivo README en el paquete
$readmeContent = @"
# TeamG Play - Smart TV Edition

## 🎬 Bienvenido

Instalaste exitosamente **TeamG Play** en tu Smart TV.

### 🎮 Cómo usar

1. **Navegar**: Usa las flechas del control remoto
2. **Seleccionar**: Presiona OK o ENTER
3. **Volver**: Usa el botón BACK
4. **Salir**: Presiona EXIT o HOME

### 📺 Resoluciones Soportadas
- HD (720p)
- Full HD (1080p)
- 4K (2160p)

### 🔧 Configuración

1. En la pantalla principal, busca ⚙️ **AJUSTES**
2. Configura tu servidor IPTV
3. Selecciona la calidad de video
4. ¡A disfrutar!

### ℹ️ Información
- **Versión**: 1.5.6
- **Desarrollador**: TeamG Corporation
- **Último actualizado**: $(Get-Date -Format "dd/MM/yyyy")

### 🆘 Soporte

Si tienes problemas:
1. Reinicia la aplicación
2. Verifica tu conexión Wi-Fi
3. Prueba cambiando la calidad de video
4. Contacta al soporte técnico

---

Que disfrutes del mejor streaming en tu TV 🎉

"@

$readmeContent | Out-File (Join-Path $packageDir "README.txt") -Encoding UTF8
Write-Host "   ✓ Creado archivo README.txt" -ForegroundColor Green

# Crear ZIP
Write-Host "`n🗜️  Creando archivo ZIP..." -ForegroundColor Cyan

# Eliminar ZIP anterior si existe
if (Test-Path $zipFile) {
    Remove-Item $zipFile
    Write-Host "   • ZIP anterior eliminado"
}

# Crear ZIP usando PowerShell
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($packageDir, $zipFile, 'Optimal', $true)

$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Host "   ✓ ZIP creado: $(Split-Path -Leaf $zipFile)" -ForegroundColor Green
Write-Host "   • Tamaño: $([Math]::Round($zipSize, 2)) MB"

# Crear archivo deploy.html
$deployHtml = @"
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$appName - Descargas</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 40px 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 { color: #667eea; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .card {
            border: 2px solid #667eea;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .card:hover { background: #f0f4ff; transform: translateY(-5px); }
        .card h3 { color: #667eea; margin-bottom: 10px; }
        .card p { color: #666; font-size: 0.9em; margin-bottom: 15px; }
        .btn {
            display: inline-block;
            padding: 12px 25px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
            border: none;
            cursor: pointer;
            font-size: 1em;
        }
        .btn:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
        .info-box {
            background: #fffbea;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .info-box h3 { color: #ff7f00; margin-bottom: 10px; }
        .server-info {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 $appName para Smart TV</h1>
        <p class="subtitle">Centro de descargas para Downloader</p>

        <div class="info-box">
            <h3>ℹ️ Información</h3>
            <p>Este servidor proporciona los archivos para instalar $appName en tu Smart TV Android a través de Downloader.</p>
        </div>

        <div class="cards">
            <div class="card">
                <h3>🚀 INSTALADOR AUTOMÁTICO</h3>
                <p>Instalación guiada paso a paso. Recomendado para mostrar el control remoto.</p>
                <a href="install.html" class="btn">ABRIR</a>
            </div>

            <div class="card">
                <h3>📦 DESCARGAR ZIP</h3>
                <p>Descarga el archivo comprimido para instalar manualmente.</p>
                <a href="teamg-play-tv.zip" class="btn" download>DESCARGAR ($zipSize MB)</a>
            </div>

            <div class="card">
                <h3>📖 GUÍA COMPLETA</h3>
                <p>Lee la guía detallada con instrucciones y solución de problemas.</p>
                <a href="GUIA_DOWNLOADER_SMARTTV.md" class="btn">VER GUÍA</a>
            </div>
        </div>

        <div class="server-info">
            <strong>🖥️ Servidor de Descarga:</strong><br>
            URL Base: <code>http://tu-ip-local:$Port</code><br>
            <br>
            <strong>Archivos disponibles:</strong><br>
            • install.html - Instalador automático<br>
            • teamg-play-tv.zip - Archivo comprimido<br>
            • dist-tv/ - Archivos de la aplicación<br>
            • GUIA_DOWNLOADER_SMARTTV.md - Documentación
        </div>

        <div class="info-box">
            <h3>💡 Instrucciones Rápidas</h3>
            <p><strong>En tu Smart TV (en Downloader):</strong></p>
            <ol style="margin-left: 20px; color: #333;">
                <li>Abre Downloader</li>
                <li>En la barra direcciones ingresa: <code>http://[IP-DE-TU-PC]:$Port/install.html</code></li>
                <li>Presiona OK</li>
                <li>Sigue las instrucciones en pantalla</li>
            </ol>
        </div>
    </div>
</body>
</html>
"@

$deployHtmlPath = Join-Path $projectRoot "deploy.html"
$deployHtml | Out-File $deployHtmlPath -Encoding UTF8
Write-Host "   ✓ Página de descargas creada: deploy.html" -ForegroundColor Green

# Obtener IP local
Write-Host "`n📡 Detectando IP local..." -ForegroundColor Cyan
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred).IPAddress | Select-Object -First 1

if ($ipAddress) {
    Write-Host "   ✓ IP local detectada: $ipAddress" -ForegroundColor Green
} else {
    $ipAddress = "localhost"
    Write-Host "   ⚠️  No se pudo detectar IP, usando localhost" -ForegroundColor Yellow
}

# Mostrar instrucciones
Write-Host "`n" (@"
╔════════════════════════════════════════════════════════════╗
║               ✅ PAQUETE LISTO PARA DISTRIBUCIÓN            ║
╚════════════════════════════════════════════════════════════╝

📦 ARCHIVOS GENERADOS:
   • $zipFile
   • $deployHtmlPath
   • $packageDir/

🚀 PRÓXIMOS PASOS:

Opción 1: SERVIDOR LOCAL (Recomendado)
   Ejecuta este comando:

   python -m http.server $Port

   O si tienes Node:
   npx serve . -p $Port

   Luego abre en tu navegador:
   http://$ipAddress:$Port

Opción 2: COMPARTIR ARCHIVO ZIP
   Comparte este archivo en Google Drive o similar:
   $zipFile

   Desde tu Smart TV (Downloader):
   1. Descarga el ZIP
   2. Extrae en: /storage/emulated/0/Downloads/TeamGPlay/
   3. Abre: tv-index.html

📱 DESDE SMART TV EN DOWNLOADER:

   Opción A (Automática):
   URL: http://${ipAddress}:${Port}/install.html

   Opción B (Manual):
   URL: http://${ipAddress}:${Port}/teamg-play-tv.zip

═════════════════════════════════════════════════════════════

🎮 CONTROLES EN SMART TV:
   ↑↓←→  Navegar
   OK    Seleccionar
   BACK  Volver
   HOME  Inicio
   EXIT  Salir

═════════════════════════════════════════════════════════════
"@) -ForegroundColor Green

Write-Host "`n💾 Archivos listos en:" -ForegroundColor White
Write-Host "   └─ $projectRoot" -ForegroundColor Cyan

Write-Host "`n📌 IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   • Tu TV debe estar en la MISMA red Wi-Fi que tu PC" -ForegroundColor White
Write-Host "   • Obtén tu IP con: ipconfig" -ForegroundColor White
Write-Host "   • Reemplaza en la URL: http://[TU-IP-AQUI]:$Port" -ForegroundColor White

$startServer = Read-Host "`n¿Deseas iniciar un servidor HTTP ahora? (s/n)"
if ($startServer -eq "s") {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        Write-Host "`n🚀 Iniciando servidor...-ForegroundColor Cyan
        Write-Host "   URL: http://$ipAddress:$Port" -ForegroundColor Green
        Write-Host "   (Presiona Ctrl+C para detener)" -ForegroundColor Yellow
        cd $projectRoot
        python -m http.server $Port --bind 0.0.0.0
    } elseif (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Host "`n🚀 Iniciando servidor con Node..." -ForegroundColor Cyan
        Write-Host "   URL: http://$ipAddress:$Port" -ForegroundColor Green
        Write-Host "   (Presiona Ctrl+C para detener)" -ForegroundColor Yellow
        cd $projectRoot
        npx serve . -p $Port -l $Port
    } else {
        Write-Host "`n⚠️  No se encontró Python ni Node para iniciar servidor" -ForegroundColor Yellow
        Write-Host "   Instala Python o Node.js para usar esta opción" -ForegroundColor White
    }
}
