import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { createExtractorFromFile } from 'node-unrar-js';

async function downloadFile(url, outputPath) {
    const writer = fs.createWriteStream(outputPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function extractRar(filePath, destPath) {
    try {
        const extractor = await createExtractorFromFile({ filepath: filePath });
        const list = extractor.extract({ destPath });
        [...list.files]; // Consume the iterator
        console.log('Extracción completada.');
    } catch (err) {
        console.error('Error al extraer el archivo RAR:', err);
        throw err;
    }
}

async function main() {
    const mpvDir = path.resolve(process.cwd(), 'mpv');
    if (fs.existsSync(mpvDir)) {
        console.log('La carpeta mpv ya existe. Saltando la descarga.');
        return;
    }

    console.log('La carpeta mpv no se encontró. Iniciando descarga desde Dropbox...');
    const url = 'https://dl.dropboxusercontent.com/scl/fi/x7lmdrqvq0f3y7xy4jnnk/Nueva-carpeta.rar?rlkey=zltq108c4ejzgves75pzuo301&dl=1';
    const tempRarPath = path.resolve(process.cwd(), 'temp-mpv.rar');

    try {
        await downloadFile(url, tempRarPath);
        console.log('Archivo RAR descargado exitosamente.');

        fs.ensureDirSync(mpvDir);
        console.log('Extrayendo archivos en la carpeta mpv...');
        await extractRar(tempRarPath, mpvDir);

    } catch (error) {
        console.error('Ocurrió un error en el proceso de configuración de MPV:', error);
        // Clean up failed download
        if (fs.existsSync(tempRarPath)) {
            fs.removeSync(tempRarPath);
        }
        process.exit(1); // Exit with error
    } finally {
        // Clean up temp file
        if (fs.existsSync(tempRarPath)) {
            fs.removeSync(tempRarPath);
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
