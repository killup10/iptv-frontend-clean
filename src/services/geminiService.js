// Servicio para integración con API de Gemini
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent';

// Cache para evitar llamadas repetidas
const cache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

class GeminiService {
  async makeRequest(prompt) {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Error de API: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.error('Error en Gemini API:', error);
      throw error;
    }
  }

  async generateContentInfo(title, year, genre, description) {
    const cacheKey = `content_info_${title}_${year}`;
    
    // Verificar cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const prompt = `
Actúa como un experto en cine y televisión. Basándote en la siguiente información:
- Título: "${title}"
- Año: ${year || 'No especificado'}
- Género: ${genre || 'No especificado'}
- Descripción: "${description || 'No disponible'}"

Genera información contextual enriquecida en formato JSON con esta estructura exacta:
{
  "director": "Nombre del director principal",
  "cast": "Actores principales separados por comas",
  "production": "Información sobre la producción, estudio, presupuesto",
  "trivia": [
    "Curiosidad interesante 1",
    "Curiosidad interesante 2",
    "Curiosidad interesante 3"
  ],
  "culturalImpact": "Impacto cultural y relevancia",
  "awards": "Premios y reconocimientos principales",
  "boxOffice": "Información de taquilla o audiencia",
  "soundtrack": "Información sobre la banda sonora",
  "locations": "Locaciones de filmación principales",
  "budget": "Presupuesto estimado si es conocido"
}

Responde SOLO con el JSON válido, sin texto adicional. Si no tienes información específica, usa "No disponible" para ese campo.
    `;

    try {
      const response = await this.makeRequest(prompt);
      console.log('Respuesta de Gemini:', response);
      let parsedData;
      
      try {
        // Limpiar la respuesta para extraer solo el JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
          parsedData.source = 'gemini';
        } else {
          throw new Error('No se encontró JSON válido en la respuesta');
        }
      } catch (parseError) {
        console.warn('Error parseando JSON de Gemini, usando fallback:', parseError);
        parsedData = this.getFallbackContentInfo(title, year, genre);
      }

      // Guardar en cache
      cache.set(cacheKey, {
        data: parsedData,
        timestamp: Date.now()
      });

      return parsedData;
    } catch (error) {
      console.error('Error generando información de contenido:', error);
      return this.getFallbackContentInfo(title, year, genre);
    }
  }

  async generateVisualTheme(title, genre, year) {
    const cacheKey = `visual_theme_${title}_${genre}`;
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const prompt = `
Basándote en el título "${title}", género "${genre}" y año ${year}, genera un tema visual dinámico en formato JSON:

{
  "primaryColor": "#hexcolor",
  "secondaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "gradientStart": "#hexcolor",
  "gradientEnd": "#hexcolor",
  "mood": "descripción del mood (ej: 'dark and mysterious', 'bright and energetic')",
  "textColor": "#hexcolor",
  "overlayOpacity": 0.8,
  "glowEffect": true/false,
  "animationType": "fade/slide/pulse/none"
}

Considera:
- Terror/Thriller: colores oscuros, rojos, efectos de brillo
- Comedia: colores brillantes, amarillos, naranjas
- Drama: tonos neutros, azules profundos
- Acción: rojos intensos, naranjas
- Sci-Fi: azules, púrpuras, efectos de brillo
- Romance: rosas, dorados suaves

Responde SOLO con JSON válido.
    `;

    try {
      const response = await this.makeRequest(prompt);
      let parsedData;
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No se encontró JSON válido');
        }
      } catch (parseError) {
        parsedData = this.getFallbackVisualTheme(genre);
      }

      cache.set(cacheKey, {
        data: parsedData,
        timestamp: Date.now()
      });

      return parsedData;
    } catch (error) {
      console.error('Error generando tema visual:', error);
      return this.getFallbackVisualTheme(genre);
    }
  }

  async generateRecommendations(title, genre, year) {
    const cacheKey = `recommendations_${title}_${genre}`;
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const prompt = `
Basándote en "${title}" (${year}) del género ${genre}, recomienda contenido similar en formato JSON:

{
  "recommendations": [
    {
      "title": "Título recomendado",
      "reason": "Razón específica de la recomendación",
      "similarity": "alta/media/baja"
    }
  ],
  "genres": ["género1", "género2", "género3"],
  "themes": ["tema1", "tema2", "tema3"],
  "mood": "descripción del mood similar"
}

Incluye 5-6 recomendaciones relevantes. Responde SOLO con JSON válido.
    `;

    try {
      const response = await this.makeRequest(prompt);
      let parsedData;
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No se encontró JSON válido');
        }
      } catch (parseError) {
        parsedData = this.getFallbackRecommendations(genre);
      }

      cache.set(cacheKey, {
        data: parsedData,
        timestamp: Date.now()
      });

      return parsedData;
    } catch (error) {
      console.error('Error generando recomendaciones:', error);
      return this.getFallbackRecommendations(genre);
    }
  }

  // Fallbacks mejorados con contenido más rico
  getFallbackContentInfo(title, year, genre) {
    const genreInfo = this.getGenreBasedInfo(genre);
    const yearInfo = this.getYearBasedInfo(year);
    
    return {
      source: 'fallback',
      director: genreInfo.director,
      cast: genreInfo.cast,
      production: `${genreInfo.production} ${yearInfo.context}`,
      trivia: [
        genreInfo.trivia1,
        yearInfo.trivia,
        genreInfo.trivia2,
        `"${title}" forma parte del catálogo premium de TeamG Play`,
        genreInfo.trivia3
      ],
      culturalImpact: genreInfo.culturalImpact,
      awards: genreInfo.awards,
      boxOffice: genreInfo.boxOffice,
      soundtrack: genreInfo.soundtrack,
      locations: genreInfo.locations,
      budget: yearInfo.budget
    };
  }

  getGenreBasedInfo(genre) {
    const genreData = {
      'accion': {
        director: 'Directores especializados en secuencias de acción y efectos especiales',
        cast: 'Actores entrenados en artes marciales y escenas de riesgo',
        production: 'Producción con alto presupuesto para efectos especiales y escenas de acción.',
        trivia1: 'Las películas de acción suelen requerir meses de entrenamiento físico para los actores',
        trivia2: 'Los efectos prácticos en películas de acción crean una experiencia más auténtica',
        trivia3: 'Las secuencias de persecución son uno de los elementos más costosos de producir',
        culturalImpact: 'El género de acción ha influenciado la cultura popular y los videojuegos modernos',
        awards: 'Reconocimientos por mejores efectos visuales y coordinación de escenas de riesgo',
        boxOffice: 'Las películas de acción suelen tener gran éxito comercial a nivel mundial',
        soundtrack: 'Bandas sonoras épicas con orquestaciones dramáticas y ritmos intensos',
        locations: 'Locaciones exóticas y urbanas que complementan las secuencias de acción',
      },
      'comedia': {
        director: 'Directores especializados en timing cómico y actuación improvisada',
        cast: 'Comediantes y actores con experiencia en improvisación y timing',
        production: 'Producción enfocada en el guión, diálogos ingeniosos y situaciones cómicas.',
        trivia1: 'Muchas comedias incluyen improvisaciones que no estaban en el guión original',
        trivia2: 'El timing es crucial: una pausa de medio segundo puede arruinar un chiste',
        trivia3: 'Las comedias suelen tener múltiples finales filmados para probar con audiencias',
        culturalImpact: 'Las comedias reflejan y comentan sobre las tendencias sociales de su época',
        awards: 'Reconocimientos por mejor guión original y actuaciones cómicas destacadas',
        boxOffice: 'Las comedias exitosas suelen generar franquicias y secuelas populares',
        soundtrack: 'Música ligera y alegre que complementa el tono humorístico',
        locations: 'Escenarios cotidianos que se vuelven extraordinarios a través del humor',
      },
      'drama': {
        director: 'Directores reconocidos por su capacidad de dirigir actuaciones emotivas',
        cast: 'Actores dramáticos con experiencia en roles psicológicamente complejos',
        production: 'Producción centrada en el desarrollo de personajes y narrativa profunda.',
        trivia1: 'Los dramas suelen requerir múltiples tomas para capturar la emoción perfecta',
        trivia2: 'Muchos actores consideran los dramas como sus roles más desafiantes',
        trivia3: 'La investigación de personajes puede tomar meses antes del rodaje',
        culturalImpact: 'Los dramas abordan temas sociales importantes y generan conversaciones',
        awards: 'Frecuentemente nominados a premios por actuación y dirección',
        boxOffice: 'Éxito crítico que a menudo se traduce en reconocimiento de la industria',
        soundtrack: 'Composiciones emotivas que intensifican los momentos dramáticos',
        locations: 'Escenarios que reflejan el estado emocional de los personajes',
      },
      'terror': {
        director: 'Maestros del suspense especializados en crear atmósferas inquietantes',
        cast: 'Actores capaces de transmitir miedo genuino y vulnerabilidad',
        production: 'Producción enfocada en efectos especiales, maquillaje y diseño sonoro.',
        trivia1: 'Las películas de terror suelen filmarse en orden cronológico para mantener la tensión',
        trivia2: 'El diseño sonoro es tan importante como las imágenes para crear miedo',
        trivia3: 'Muchas escenas de terror se filman con múltiples cámaras para capturar reacciones auténticas',
        culturalImpact: 'El terror refleja los miedos colectivos de la sociedad en diferentes épocas',
        awards: 'Reconocimientos por efectos especiales, maquillaje y diseño sonoro',
        boxOffice: 'Las películas de terror suelen tener presupuestos bajos pero grandes ganancias',
        soundtrack: 'Composiciones disonantes y efectos sonoros que intensifican el miedo',
        locations: 'Locaciones aisladas y atmosféricas que contribuyen al terror psicológico',
      },
      'ciencia ficcion': {
        director: 'Visionarios especializados en mundos futuristas y conceptos científicos',
        cast: 'Actores versátiles capaces de actuar con efectos especiales y tecnología imaginaria',
        production: 'Producción con tecnología de vanguardia y diseño de producción futurista.',
        trivia1: 'La ciencia ficción a menudo predice tecnologías que luego se vuelven realidad',
        trivia2: 'Los efectos especiales en sci-fi han revolucionado la industria cinematográfica',
        trivia3: 'Muchas películas de ciencia ficción consultan con científicos reales',
        culturalImpact: 'La sci-fi ha influenciado el desarrollo tecnológico y la exploración espacial',
        awards: 'Frecuentemente premiadas por efectos visuales y diseño de producción',
        boxOffice: 'Las franquicias de ciencia ficción generan miles de millones en merchandising',
        soundtrack: 'Composiciones electrónicas y orquestales que evocan el futuro',
        locations: 'Escenarios futuristas creados con CGI y sets elaborados',
      }
    };

    const normalizedGenre = genre?.toLowerCase().replace(/[áéíóú]/g, (match) => {
      const accents = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
      return accents[match];
    });

    return genreData[normalizedGenre] || genreData['drama'];
  }

  getYearBasedInfo(year) {
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year);
    
    if (yearNum >= 2020) {
      return {
        context: 'Producción contemporánea con tecnología de última generación.',
        trivia: 'Las producciones recientes utilizan técnicas de filmación y efectos más avanzados',
        budget: 'Presupuestos modernos que reflejan la inflación y costos tecnológicos actuales'
      };
    } else if (yearNum >= 2010) {
      return {
        context: 'Producción de la década de 2010, era de transición digital.',
        trivia: 'Esta década marcó la transición completa al cine digital y efectos CGI',
        budget: 'Presupuestos que reflejan el crecimiento de la industria del entretenimiento'
      };
    } else if (yearNum >= 2000) {
      return {
        context: 'Producción de principios del siglo XXI, era de innovación tecnológica.',
        trivia: 'Los años 2000 vieron el auge de los efectos especiales por computadora',
        budget: 'Presupuestos en crecimiento debido a nuevas tecnologías de producción'
      };
    } else if (yearNum >= 1990) {
      return {
        context: 'Producción de los años 90, época dorada del cine comercial.',
        trivia: 'Los 90s fueron conocidos por blockbusters y el perfeccionamiento de efectos prácticos',
        budget: 'Presupuestos que reflejan la expansión global del mercado cinematográfico'
      };
    } else {
      return {
        context: 'Producción clásica con técnicas cinematográficas tradicionales.',
        trivia: 'Las producciones clásicas se basaban en efectos prácticos y actuación teatral',
        budget: 'Presupuestos modestos comparados con los estándares actuales'
      };
    }
  }

  getFallbackVisualTheme(genre) {
    const themeMap = {
      'terror': {
        primaryColor: '#8B0000',
        secondaryColor: '#2F1B14',
        accentColor: '#FF4500',
        gradientStart: '#1a1a1a',
        gradientEnd: '#4a0000',
        mood: 'dark and mysterious',
        textColor: '#ffffff',
        overlayOpacity: 0.9,
        glowEffect: true,
        animationType: 'pulse'
      },
      'comedia': {
        primaryColor: '#FFD700',
        secondaryColor: '#FF8C00',
        accentColor: '#FF69B4',
        gradientStart: '#FFF8DC',
        gradientEnd: '#FFB347',
        mood: 'bright and cheerful',
        textColor: '#2F4F4F',
        overlayOpacity: 0.7,
        glowEffect: false,
        animationType: 'fade'
      },
      'accion': {
        primaryColor: '#DC143C',
        secondaryColor: '#B22222',
        accentColor: '#FF4500',
        gradientStart: '#2F1B14',
        gradientEnd: '#8B0000',
        mood: 'intense and energetic',
        textColor: '#ffffff',
        overlayOpacity: 0.8,
        glowEffect: true,
        animationType: 'slide'
      }
    };

    return themeMap[genre?.toLowerCase()] || {
      primaryColor: '#00e5ff',
      secondaryColor: '#ff00ff',
      accentColor: '#ffffff',
      gradientStart: '#1a1a2e',
      gradientEnd: '#16213e',
      mood: 'modern and sleek',
      textColor: '#ffffff',
      overlayOpacity: 0.8,
      glowEffect: true,
      animationType: 'fade'
    };
  }

  getFallbackRecommendations(genre) {
    const genreRecommendations = this.getGenreRecommendations(genre);
    
    return {
      recommendations: genreRecommendations.recommendations,
      genres: genreRecommendations.genres,
      themes: genreRecommendations.themes,
      mood: genreRecommendations.mood
    };
  }

  getGenreRecommendations(genre) {
    const recommendationsMap = {
      'accion': {
        recommendations: [
          { title: "Mad Max: Fury Road", reason: "Acción intensa con secuencias espectaculares", similarity: "alta" },
          { title: "John Wick", reason: "Coreografías de combate excepcionales", similarity: "alta" },
          { title: "Mission: Impossible", reason: "Escenas de acción y espionaje", similarity: "media" },
          { title: "Fast & Furious", reason: "Persecuciones automovilísticas épicas", similarity: "media" },
          { title: "Die Hard", reason: "Clásico del género de acción", similarity: "media" },
          { title: "The Raid", reason: "Artes marciales y acción sin parar", similarity: "alta" }
        ],
        genres: ["acción", "thriller", "aventura"],
        themes: ["adrenalina", "heroísmo", "supervivencia"],
        mood: "intenso y emocionante"
      },
      'comedia': {
        recommendations: [
          { title: "Superbad", reason: "Humor inteligente y situaciones cómicas", similarity: "alta" },
          { title: "The Hangover", reason: "Comedia de situaciones absurdas", similarity: "alta" },
          { title: "Anchorman", reason: "Humor disparatado y memorable", similarity: "media" },
          { title: "Tropic Thunder", reason: "Sátira cinematográfica brillante", similarity: "media" },
          { title: "Ghostbusters", reason: "Comedia clásica con elementos fantásticos", similarity: "media" },
          { title: "Borat", reason: "Comedia irreverente y provocativa", similarity: "baja" }
        ],
        genres: ["comedia", "humor", "entretenimiento"],
        themes: ["diversión", "risas", "situaciones cómicas"],
        mood: "alegre y divertido"
      },
      'drama': {
        recommendations: [
          { title: "The Shawshank Redemption", reason: "Drama profundo sobre esperanza y redención", similarity: "alta" },
          { title: "Forrest Gump", reason: "Historia emotiva que abarca décadas", similarity: "alta" },
          { title: "The Godfather", reason: "Drama épico sobre familia y poder", similarity: "media" },
          { title: "Schindler's List", reason: "Drama histórico conmovedor", similarity: "media" },
          { title: "Good Will Hunting", reason: "Drama psicológico sobre crecimiento personal", similarity: "alta" },
          { title: "A Beautiful Mind", reason: "Biografía dramática inspiradora", similarity: "media" }
        ],
        genres: ["drama", "biografía", "historia"],
        themes: ["emociones profundas", "desarrollo de personajes", "reflexión"],
        mood: "emotivo y reflexivo"
      },
      'terror': {
        recommendations: [
          { title: "The Conjuring", reason: "Terror sobrenatural con atmósfera inquietante", similarity: "alta" },
          { title: "Hereditary", reason: "Horror psicológico perturbador", similarity: "alta" },
          { title: "Get Out", reason: "Thriller de terror con comentario social", similarity: "media" },
          { title: "A Quiet Place", reason: "Suspense y terror innovador", similarity: "media" },
          { title: "The Babadook", reason: "Terror psicológico profundo", similarity: "alta" },
          { title: "It Follows", reason: "Horror conceptual único", similarity: "media" }
        ],
        genres: ["terror", "suspense", "thriller"],
        themes: ["miedo", "supervivencia", "lo sobrenatural"],
        mood: "inquietante y aterrador"
      },
      'ciencia ficcion': {
        recommendations: [
          { title: "Blade Runner 2049", reason: "Ciencia ficción visual y filosófica", similarity: "alta" },
          { title: "Interstellar", reason: "Épica espacial con base científica", similarity: "alta" },
          { title: "The Matrix", reason: "Sci-fi revolucionario con acción", similarity: "media" },
          { title: "Arrival", reason: "Ciencia ficción intelectual y emotiva", similarity: "alta" },
          { title: "Ex Machina", reason: "Thriller de inteligencia artificial", similarity: "media" },
          { title: "Dune", reason: "Épica de ciencia ficción espacial", similarity: "media" }
        ],
        genres: ["ciencia ficción", "futurismo", "tecnología"],
        themes: ["futuro", "tecnología", "exploración"],
        mood: "visionario y especulativo"
      },
      'romance': {
        recommendations: [
          { title: "The Notebook", reason: "Romance épico y emotivo", similarity: "alta" },
          { title: "Titanic", reason: "Historia de amor trágica y memorable", similarity: "alta" },
          { title: "La La Land", reason: "Musical romántico contemporáneo", similarity: "media" },
          { title: "Casablanca", reason: "Clásico romántico atemporal", similarity: "media" },
          { title: "Before Sunrise", reason: "Romance íntimo y conversacional", similarity: "alta" },
          { title: "The Princess Bride", reason: "Aventura romántica con humor", similarity: "media" }
        ],
        genres: ["romance", "drama romántico", "amor"],
        themes: ["amor verdadero", "relaciones", "emociones"],
        mood: "romántico y emotivo"
      }
    };

    const normalizedGenre = genre?.toLowerCase().replace(/[áéíóú]/g, (match) => {
      const accents = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
      return accents[match];
    });

    return recommendationsMap[normalizedGenre] || {
      recommendations: [
        { title: "Películas clásicas del cine", reason: "Contenido de calidad cinematográfica", similarity: "media" },
        { title: "Series aclamadas por la crítica", reason: "Producciones de alto valor", similarity: "media" },
        { title: "Documentales premiados", reason: "Contenido educativo y entretenido", similarity: "baja" },
        { title: "Películas independientes", reason: "Cine alternativo y original", similarity: "baja" },
        { title: "Clásicos del entretenimiento", reason: "Contenido atemporal y memorable", similarity: "media" }
      ],
      genres: [genre || "entretenimiento", "calidad", "variado"],
      themes: ["diversidad", "calidad", "entretenimiento"],
      mood: "variado y enriquecedor"
    };
  }

  // Limpiar cache antiguo
  clearOldCache() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        cache.delete(key);
      }
    }
  }
}

export default new GeminiService();
