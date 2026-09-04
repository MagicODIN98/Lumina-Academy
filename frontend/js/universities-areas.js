// ============================================
// UNIVERSITIES AND AREAS CONFIGURATION
// Maps each university to its available areas
// ============================================
const universitiesData = {
  UNAM: {
    name: 'Universidad Nacional Autónoma de México',
    image: 'UNAM.png',
    areas: [
      { code: 'FM', name: 'Ciencias Físico-Matemáticas y de las Ingenierías' },
      { code: 'BCS', name: 'Ciencias Biológicas, Químicas y de la Salud' },
      { code: 'CS', name: 'Ciencias Sociales' },
      { code: 'HA', name: 'Humanidades y de las Artes' }
    ]
  },

  IPN: {
    name: 'Instituto Politécnico Nacional',
    image: 'POLITECNICO.png',
    areas: [
      { code: 'ICFM', name: 'Ingeniería y Ciencias Físico Matemáticas' },
      { code: 'CMB', name: 'Ciencias Médico Biológicas' },
      { code: 'CSA', name: 'Ciencias Sociales y Administrativas' }
    ]
  },

  UAM: {
    name: 'Universidad Autónoma Metropolitana',
    image: 'UAM.png',
    areas: [
      { code: 'CBI', name: 'Ciencias Básicas e Ingeniería' },
      { code: 'CBS', name: 'Ciencias Biológicas y de la Salud' },
      { code: 'CSH', name: 'Ciencias Sociales y Humanidades' },
      { code: 'CyAD', name: 'Ciencias y Artes para el Diseño' }
    ]
  },

  BUAP: {
    name: 'Benemérita Universidad Autónoma de Puebla',
    image: 'BUAP.png',
    areas: [
      { code: 'ICE', name: 'Ingeniería y Ciencias Exactas' },
      { code: 'CNS', name: 'Ciencias Naturales y de la Salud' },
      { code: 'CSH', name: 'Ciencias Sociales y Humanidades' },
      { code: 'CEA', name: 'Ciencias Económico Administrativas' }
    ]
  },

  TECNM: {
    name: 'Tecnológico Nacional de México',
    image: 'TECNOLOGICO.png',
    areas: [
      { code: 'ING', name: 'Ingeniería y Tecnología' },
      { code: 'ADM', name: 'Gestión y Administración' }
    ]
  },

  UAGRO: {
    name: 'Universidad Autónoma de Guerrero',
    image: 'UAGRO.png',
    areas: [
      { code: 'IT', name: 'Ingeniería y Tecnología' },
      { code: 'CS', name: 'Ciencias de la Salud' },
      { code: 'CSO', name: 'Ciencias Sociales' },
      { code: 'CEN', name: 'Ciencias Exactas y Naturales' }
    ]
  },

  CHAPINGO: {
    name: 'Universidad Autónoma Chapingo',
    image: 'CHAPINGO.png',
    areas: [
      { code: 'AGRO', name: 'Agroecología' },
      { code: 'CF', name: 'Ciencias Forestales' },
      { code: 'CEA', name: 'Ciencias Económico Administrativas' },
      { code: 'CB', name: 'Ciencias Básicas' },
      { code: 'IA', name: 'Ingeniería Agroindustrial' },
      { code: 'CA', name: 'Ciencias Agronómicas' }
    ]
  },

  UAEM: {
    name: 'Universidad Autónoma del Estado de Morelos',
    image: 'UAEM.png',
    areas: [
      { code: 'CBI', name: 'Ciencias Básicas e Ingeniería' },
      { code: 'CN', name: 'Ciencias Naturales' },
      { code: 'HCB', name: 'Ciencias Humanas y del Comportamiento' },
      { code: 'CS', name: 'Ciencias de la Salud' },
      { code: 'AG', name: 'Agropecuarias' },
      { code: 'ACD', name: 'Arte, Cultura y Diseño' },
      { code: 'EH', name: 'Educación y Humanidades' },
      { code: 'CJA', name: 'Ciencias Jurídicas y Administrativas' },
      { code: 'EMS', name: 'Educación Media Superior' }
    ]
  },

  UDG: {
    name: 'Universidad de Guadalajara',
    image: 'UDG.png',
    areas: [
      { code: 'AAD', name: 'Arte, Arquitectura y Diseño' },
      { code: 'CS', name: 'Ciencias de la Salud' },
      { code: 'CEI', name: 'Ciencias Exactas e Ingenierías' },
      { code: 'CBA', name: 'Ciencias Biológicas y Agropecuarias' },
      { code: 'CEA', name: 'Ciencias Económico Administrativas' }
    ]
  }
};
/**
 * Get areas for a specific university
 * @param {string} universityCode - University code (e.g., 'UNAM')
 * @returns {Array} Array of areas for that university
 */
function getAreasForUniversity(universityCode) {
  const uni = universitiesData[universityCode];
  return uni ? uni.areas : [];
}

/**
 * Get university info by code
 * @param {string} universityCode - University code
 * @returns {Object} University object
 */
function getUniversityInfo(universityCode) {
  return universitiesData[universityCode];
}

/**
 * Get all universities list
 * @returns {Array} Array of university codes
 */
function getAllUniversities() {
  return Object.keys(universitiesData);
}
