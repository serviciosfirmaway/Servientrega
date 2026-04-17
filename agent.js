const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = 3000;

// --- CONFIGURACIÓN ---
const TARGET_URLS = [
    'https://www.tuazar.com/loteria/animalitos/resultados/',
    'https://www.lotoven.com/animalitos/',
    // Añade más URLs aquí
];

const animalitos = [
    'Gato', 'Perro', 'Culebra', 'Cabrón', 'Tigre', 'Gallo', 'Zorro', 'Leon', 'Caimán',
    'Iguana', 'Lobo', 'Elefante', 'Jirafa', 'Cocodrilo', 'Rinoceronte', 'Chivo', 'Torro',
    'Pajaro', 'Mico', 'Puerco', 'Conejo', 'Cebra', 'Delfin', 'Alacran', 'Ballena'
];

// --- BASE DE DATOS EN MEMORIA ---
let historicalData = [];

// --- LÓGICA DE ANÁLISIS CON HORAS ---
function analyzeFrequencyByHour(data) {
    const frequencyMap = {};
    const hours = ['11:00', '12:00', '15:00', '18:00', '21:00']; // Horas comunes de sorteo

    animalitos.forEach(animal => {
        frequencyMap[animal] = {};
        hours.forEach(hour => frequencyMap[animal][hour] = 0);
    });

    data.forEach(result => {
        if (result.animal && result.hour && frequencyMap[result.animal] && frequencyMap[result.animal][result.hour] !== undefined) {
            frequencyMap[result.animal][result.hour]++;
        }
    });

    return frequencyMap;
}

function generatePredictionsByHour(frequencyMap) {
    const predictions = {};
    const hours = Object.keys(frequencyMap[animalitos[0]] || {});

    hours.forEach(hour => {
        let topAnimal = null;
        let maxCount = -1;
        animalitos.forEach(animal => {
            if (frequencyMap[animal] && frequencyMap[animal][hour] > maxCount) {
                maxCount = frequencyMap[animal][hour];
                topAnimal = animal;
            }
        });
        if (topAnimal && maxCount > 0) {
            predictions[hour] = { animal: topAnimal, count: maxCount };
        }
    });

    return predictions;
}

// --- EL NAVEGADOR AUTÓNOMO E INTELIGENTE ---
async function scrapeData() {
    console.log('Iniciando ronda de scraping inteligente...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    for (const url of TARGET_URLS) {
        try {
            console.log(`Analizando ${url}...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // TÉCNICA DE AUTO-ADAPTACIÓN: Extraer todo el texto y buscar correlaciones
            const pageText = await page.evaluate(() => document.body.innerText);
            
            const results = [];
            const lines = pageText.split('\n');
            
            lines.forEach(line => {
                const words = line.trim().split(/\s+/);
                for (let i = 0; i < words.length; i++) {
                    const word = words[i].replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑü]/g, ''); // Limpia la palabra
                    
                    if (animalitos.includes(word)) {
                        const animal = word;
                        // Busca un número a la izquierda o derecha del animalito
                        let number = null;
                        if (i > 0 && /^\d+$/.test(words[i - 1])) {
                            number = words[i - 1];
                        } else if (i < words.length - 1 && /^\d+$/.test(words[i + 1])) {
                            number = words[i + 1];
                        }
                        
                        if (number) {
                            results.push({ animal, number, timestamp: Date.now() });
                        }
                    }
                }
            });

            // Intentar extraer la hora del sorteo (esto es más complejo y puede requerir lógica específica)
            // Por ahora, usaremos una hora simulada basada en el momento del scrapeo
            const currentHour = new Date().getHours();
            let sorteoHour = 'Desconocida';
            if (currentHour >= 10 && currentHour < 12) sorteoHour = '11:00';
            else if (currentHour >= 12 && currentHour < 14) sorteoHour = '12:00';
            else if (currentHour >= 14 && currentHour < 16) sorteoHour = '15:00';
            else if (currentHour >= 17 && currentHour < 19) sorteoHour = '18:00';
            else if (currentHour >= 20 && currentHour < 22) sorteoHour = '21:00';

            const resultsWithHour = results.map(r => ({ ...r, hour: sorteoHour }));

            if (resultsWithHour.length > 0) {
                console.log(`Se encontraron ${resultsWithHour.length} resultados en ${url} para la hora ${sorteoHour}.`);
                historicalData.push(...resultsWithHour);
            }
        } catch (error) {
            console.error(`Error al analizar \${url}:`, error);
        }
    }
    
    await browser.close();
    console.log('Ronda de análisis finalizada.');
}

// --- API PARA CONSULTAR DESDE TU TELÉFONO ---
app.get('/', (req, res) => {
    if (historicalData.length === 0) {
        return res.send('<h1>El agente está recolectando datos. Vuelve más tarde.</h1>');
    }

    const frequencyMap = analyzeFrequencyByHour(historicalData);
    const predictionsByHour = generatePredictionsByHour(frequencyMap);

    let html = `
        <h1>Resultados del Agente Autónomo Predictivo</h1>
        <h2>Predicciones por Hora:</h<ul>
    `;
    for (const hour in predictionsByHour) {
        const pred = predictionsByHour[hour];
        html += `<li><strong>${hour}:</strong> ${pred.animal} (Basado en ${pred.count} resultados anteriores)</li>`;
    }
    html += `</ul><h2>Total de datos analizados: ${historicalData.length}</h2>`;
    
    res.send(html);
});

// --- INICIO DEL SERVIDOR Y DEL AGENTE ---
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Ejecutar el scraping cada 2 horas para no sobrecargar los servidores
setInterval(scrapeData, 7200000); 

// Ejecutarlo una vez al iniciar
scrapeData();
