$ErrorActionPreference = "Stop"

$appName = "TeamG Play"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommandPath
$distTvDir = Join-Path $projectRoot "dist-tv"
$packageDir = Join-Path $projectRoot "dist-tv-package"
$zipFile = Join-Path $projectRoot "teamg-play-tv.zip"

Write-Host "==== $appName - Empaquetador para Downloader ====" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $distTvDir)) {
    Write-Host "[ERROR] No se encontro dist-tv" -ForegroundColor Red
    Write-Host "Primero ejecuta: npm run build:tv" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Carpeta dist-tv encontrada" -ForegroundColor Green

Write-Host ""
Write-Host "Preparando paquete..." -ForegroundColor Cyan

if (Test-Path $packageDir) {
    Remove-Item $packageDir -Recurse -Force
}
New-Item $packageDir -ItemType Directory -Force | Out-Null

$filesToCopy = @("tv-index.html", "index.html", "assets")

foreach ($file in $filesToCopy) {
    $source = Join-Path $distTvDir $file
    $dest = Join-Path $packageDir $file

    if (Test-Path $source) {
        if ((Get-Item $source).PSIsContainer) {
            Copy-Item $source $dest -Recurse -Force
            Write-Host "   Copiada carpeta: $file" -ForegroundColor Green
        } else {
            Copy-Item $source $packageDir
            Write-Host "   Copiado archivo: $file" -ForegroundColor Green
        }
    }
}

$readmeContent = @"
TeamG Play - Smart TV Edition

BIENVENIDO

Instalaste exitosamente TeamG Play en tu Smart TV.

COMO USAR

1. Navegar: Usa las flechas del control remoto
2. Seleccionar: Presiona OK o ENTER
3. Volver: Usa el boton BACK
4. Salir: Presiona EXIT o HOME

RESOLUCIONES SOPORTADAS
- HD (720p)
- Full HD (1080p)
- 4K (2160p)

CONFIGURACION

1. En la pantalla principal, busca el menu de AJUSTES
2. Configura tu servidor IPTV
3. Selecciona la calidad de video
4. A disfrutar!

INFORMACION
- Version: 1.5.6
- Desarrollador: TeamG Corporation
- Actualizado: $(Get-Date -Format 'dd/MM/yyyy')

SOPORTE

Si tienes problemas:
1. Reinicia la aplicacion
2. Verifica tu conexion Wi-Fi
3. Prueba cambiando la calidad de video
4. Contacta al soporte tecnico

Que disfrutes del mejor streaming en tu TV
"@

$readmeContent | Out-File (Join-Path $packageDir "README.txt") -Encoding ASCII
Write-Host "   Creado archivo README.txt" -ForegroundColor Green

Write-Host ""
Write-Host "Creando archivo ZIP..." -ForegroundColor Cyan

if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($packageDir, $zipFile, 'Optimal', $true)

$zipSize = [Math]::Round((Get-Item $zipFile).Length / 1MB, 2)
Write-Host "   ZIP creado: $(Split-Path -Leaf $zipFile)" -ForegroundColor Green
Write-Host "   Tamano: $zipSize MB" -ForegroundColor Green

$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred).IPAddress | Select-Object -First 1

if (-not $ipAddress) {
    $ipAddress = "localhost"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PAQUETE LISTO PARA DISTRIBUCION" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ARCHIVOS GENERADOS:" -ForegroundColor Cyan
Write-Host "  - $zipFile"
Write-Host "  - $projectRoot\deploy.html"
Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opcion 1: SERVIDOR LOCAL (Recomendado)" -ForegroundColor White
Write-Host "  Abre PowerShell en esta carpeta y ejecuta:" -ForegroundColor Gray
Write-Host "  python -m http.server 8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Luego en tu Smart TV (en Downloader):" -ForegroundColor Gray
Write-Host "  http://$ipAddress:8000/install.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opcion 2: DESCARGAR ARCHIVO ZIP" -ForegroundColor White
Write-Host "  Archivo: teamg-play-tv.zip" -ForegroundColor Cyan
Write-Host "  Tamano: $zipSize MB" -ForegroundColor Gray
Write-Host ""
Write-Host "INSTRUCCIONES PARA SMART TV:" -ForegroundColor Yellow
Write-Host "  1. Abre Downloader en tu TV" -ForegroundColor Gray
Write-Host "  2. Ingresa la URL mostrada arriba" -ForegroundColor Gray
Write-Host "  3. Descargara e instalara automaticamente" -ForegroundColor Gray
Write-Host ""
Write-Host "CONTROLES EN SMART TV:" -ForegroundColor Yellow
Write-Host "  Flechas: Navegar entre canales y opciones" -ForegroundColor Gray
Write-Host "  OK/ENTER: Seleccionar" -ForegroundColor Gray
Write-Host "  BACK: Volver atras" -ForegroundColor Gray
Write-Host "  HOME: Pantalla principal" -ForegroundColor Gray
Write-Host "  EXIT: Salir de la app" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTA IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  Tu TV debe estar en la MISMA red Wi-Fi que tu PC" -ForegroundColor White
Write-Host "  Tu IP local es: $ipAddress" -ForegroundColor Cyan
Write-Host ""
