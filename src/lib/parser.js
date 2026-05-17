/**
 * NEET Smart Question Parser
 * Extracts structured questions from raw text files, PDFs, or DOCX documents.
 */

// Key subject dictionaries
const SUBJECT_KEYWORDS = {
  Biology: [
    'cell', 'mitochondria', 'dna', 'rna', 'plant', 'animal', 'kingdom', 'genetics', 'evolution', 
    'photosynthesis', 'respiration', 'heart', 'kidney', 'brain', 'human', 'reproduction', 'nervous', 
    'endocrine', 'hormone', 'enzyme', 'taxonomy', 'botany', 'zoology', 'virus', 'bacteria', 'fungi',
    'xylem', 'phloem', 'chromosome', 'meiosis', 'mitosis', 'organism', 'ecosystem', 'tissue',
    'digestive', 'circulatory', 'excretory', 'skeletal', 'muscular', 'neuron', 'synapse'
  ],
  Chemistry: [
    'atom', 'molecule', 'reaction', 'compound', 'acid', 'base', 'salt', 'organic', 'inorganic', 
    'physical', 'bonding', 'equilibrium', 'thermodynamics', 'electrochemistry', 'kinetics', 'isomerism', 
    'element', 'periodic', 'hydrocarbon', 'ether', 'ester', 'ketone', 'aldehyde', 'solution', 'gas',
    'molarity', 'molality', 'catalyst', 'covalent', 'ionic', 'oxidation', 'reduction', 'redox',
    'polymer', 'alkane', 'alkene', 'alkyne', 'benzene', 'orbital', 'spin', 'hybridization'
  ],
  Physics: [
    'force', 'velocity', 'acceleration', 'mass', 'energy', 'power', 'gravity', 'friction', 'motion', 
    'mechanics', 'optics', 'wave', 'sound', 'light', 'lens', 'mirror', 'circuit', 'current', 'voltage', 
    'resistance', 'charge', 'field', 'nucleus', 'quantum', 'semiconductor', 'vector', 'momentum',
    'torque', 'inertia', 'work', 'fluid', 'pressure', 'density', 'temperature', 'heat', 'induction',
    'capacitance', 'magnetic', 'refraction', 'diffraction', 'interference', 'photoelectric'
  ]
};

// Key high-yield chapter mappings
const CHAPTER_DICTIONARIES = {
  Physics: {
    'Physical World & Measurement': ['measurement', 'dimension', 'error', 'unit', 'accuracy', 'precision', 'significant figure'],
    'Kinematics': ['motion in a straight line', 'motion in a plane', 'projectile', 'velocity', 'acceleration', 'displacement', 'relative velocity', 'speed'],
    'Laws of Motion': ['newton', 'force', 'friction', 'momentum', 'inertia', 'impulse', 'circular motion', 'banking of road'],
    'Work, Energy & Power': ['work', 'energy', 'power', 'collision', 'kinetic energy', 'potential energy', 'conservative force'],
    'System of Particles & Rotational Motion': ['torque', 'angular', 'moment of inertia', 'center of mass', 'rotation', 'gyroscope', 'rolling'],
    'Gravitation': ['gravity', 'gravitational', 'kepler', 'satellite', 'escape velocity', 'acceleration due to gravity'],
    'Properties of Bulk Matter': ['elasticity', 'hooke', 'youngs modulus', 'surface tension', 'viscosity', 'bernoulli', 'terminal velocity', 'capillarity', 'stress', 'strain'],
    'Thermodynamics': ['heat', 'temperature', 'entropy', 'carnot', 'isothermal', 'adiabatic', 'first law', 'second law'],
    'Kinetic Theory of Gases': ['gas constant', 'mean free path', 'kinetic theory', 'boltzmann', 'pressure of gas', 'ideal gas'],
    'Oscillations & Waves': ['shm', 'simple harmonic', 'pendulum', 'wave', 'sound', 'doppler', 'string', 'organ pipe', 'resonance', 'frequency', 'amplitude'],
    'Electrostatics': ['coulomb', 'charge', 'electric field', 'potential', 'gauss', 'capacitor', 'capacitance', 'dielectric'],
    'Current Electricity': ['ohm', 'resistance', 'kirchhoff', 'wheatstone', 'potentiometer', 'drift velocity', 'resistivity', 'meter bridge'],
    'Magnetic Effects & Magnetism': ['magnetic field', 'biot-savart', 'ampere', 'lorentz', 'cyclotron', 'solenoid', 'toroid', 'dipole', 'magnetic moment'],
    'Electromagnetic Induction & AC': ['faraday', 'lenz', 'induction', 'alternating current', 'ac circuit', 'transformer', 'impedance', 'reactance', 'lc oscillation'],
    'Electromagnetic Waves': ['em wave', 'displacement current', 'spectrum', 'radiation'],
    'Optics': ['reflection', 'refraction', 'lens', 'mirror', 'prism', 'interference', 'diffraction', 'polarization', 'microscope', 'telescope', 'optical', 'ray', 'wave optics'],
    'Dual Nature of Matter': ['photoelectric', 'photon', 'de broglie', 'work function', 'davisson-germer'],
    'Atoms & Nuclei': ['rutherford', 'bohr', 'hydrogen spectrum', 'nucleus', 'radioactivity', 'half life', 'binding energy', 'fission', 'fusion'],
    'Electronic Devices': ['semiconductor', 'diode', 'transistor', 'logic gate', 'p-n junction', 'led', 'zener']
  },
  Chemistry: {
    'Some Basic Concepts of Chemistry': ['mole fraction', 'molarity', 'molality', 'stoichiometry', 'empirical formula', 'atomic mass'],
    'Structure of Atom': ['bohr', 'quantum number', 'orbital', 'photoelectric', 'heisenberg', 'de broglie', 'hund', 'pauli'],
    'Classification of Elements': ['periodic table', 'electronegativity', 'ionization enthalpy', 'electron gain', 'atomic radius'],
    'Chemical Bonding': ['covalent', 'ionic', 'hybridization', 'dipole moment', 'vespr', 'molecular orbital', 'hydrogen bond'],
    'States of Matter': ['boyle', 'charles', 'ideal gas', 'real gas', 'van der waals', 'critical temperature', 'liquefaction'],
    'Thermodynamics': ['enthalpy', 'entropy', 'gibbs free energy', 'spontaneity', 'first law', 'bomb calorimeter', 'hess'],
    'Equilibrium': ['le chatelier', 'ph', 'solubility product', 'buffer', 'acid', 'base', 'ksp', 'ka', 'kb', 'hydrolysis'],
    'Redox Reactions': ['oxidation state', 'reducing agent', 'oxidizing agent', 'half reaction', 'disproportionation'],
    'Organic Chemistry - Basics': ['iupac', 'isomerism', 'resonance', 'inductive effect', 'electrophile', 'nucleophile', 'carbocation'],
    'Hydrocarbons': ['alkane', 'alkene', 'alkyne', 'benzene', 'markownikoff', 'ozonolysis', 'friedel-crafts'],
    'Solid State': ['crystal', 'bragg', 'fcc', 'bcc', 'hcp', 'defect', 'frenkel', 'schottky', 'packing efficiency'],
    'Solutions': ['raoult', 'henry', 'colligative', 'osmotic pressure', 'vant hoff', 'elevation', 'depression', 'ideal solution'],
    'Electrochemistry': ['nernst', 'kohlrausch', 'faraday', 'gibbs', 'electrolysis', 'salt bridge', 'conductance'],
    'Chemical Kinetics': ['activation energy', 'arrhenius', 'first order', 'half life', 'rate law', 'catalyst', 'molecularity'],
    'Surface Chemistry': ['adsorption', 'colloid', 'tyndall', 'emulsion', 'micelle', 'peptization', 'gold number'],
    'Coordination Compounds': ['ligand', 'isomerism', 'werner', 'crystal field theory', 'valence bond theory', 'cft', 'magnetic moment'],
    'Haloalkanes & Haloarenes': ['sn1', 'sn2', 'grignard', 'nucleophilic substitution', 'chiral'],
    'Alcohols, Phenols & Ethers': ['lucas test', 'reimer-tiemann', 'kolbe', 'etherification', 'dehydration'],
    'Aldehydes & Ketones': ['aldol', 'cannizzaro', 'clemmensen', 'tollens', 'fehling', 'nucleophilic addition'],
    'Amines': ['hoffmann', 'diazotization', 'carbylamine', 'hingberg', 'aniline'],
    'Biomolecules': ['glucose', 'peptide', 'protein', 'amino acid', 'rna', 'dna', 'nucleotide', 'sucrose', 'fructose']
  },
  Biology: {
    'Diversity in Living World': ['taxonomy', 'binomial', 'kingdom', 'monera', 'protista', 'fungi', 'algae', 'bryophyte', 'pteridophyte', 'gymnosperm', 'angiosperm', 'phylum', 'genus', 'species'],
    'Structural Organisation': ['anatomy', 'morphology', 'epithelial', 'connective', 'tissue', 'cockroach', 'frog', 'earthworm', 'root', 'stem', 'leaf', 'inflorescence', 'flower', 'vascular cambium'],
    'Cell Structure & Function': ['mitochondria', 'chloroplast', 'nucleus', 'ribosome', 'golgi', 'dna', 'rna', 'mitosis', 'meiosis', 'cell cycle', 'enzyme', 'activation energy', 'chromosome'],
    'Plant Physiology': ['photosynthesis', 'c3', 'c4', 'krebs', 'glycolysis', 'transpiration', 'auxin', 'gibberellin', 'cytokinin', 'photoperiodism', 'nitrogen fixation', 'xylem', 'phloem'],
    'Human Physiology': ['digestion', 'breathing', 'circulation', 'excretion', 'locomotion', 'neural', 'hormone', 'endocrine', 'heart', 'kidney', 'neuron', 'synapse', 'sarcomere', 'ecg', 'nephron', 'pituitary', 'thyroid'],
    'Reproduction': ['gametogenesis', 'fertilization', 'embryo', 'menstrual', 'pollination', 'endosperm', 'contraceptive', 'ivf', 'placenta', 'spores'],
    'Genetics & Evolution': ['mendel', 'pedigree', 'linkage', 'mutation', 'dna replication', 'transcription', 'translation', 'operon', 'evolution', 'darwin', 'hardy-weinberg', 'homologous', 'analogous'],
    'Biology & Human Welfare': ['pathogen', 'immunity', 'antibody', 'cancer', 'aids', 'malaria', 'microbe', 'antibiotic', 'biogas', 'vaccine', 'allergy'],
    'Biotechnology': ['restriction enzyme', 'plasmid', 'pcr', 'gel electrophoresis', 'cloning vector', 'bt cotton', 'insulin', 'gene therapy', 'transgenic'],
    'Ecology & Environment': ['ecosystem', 'food chain', 'biodiversity', 'pollution', 'greenhouse', 'succession', 'population', 'niche', 'biomass', 'ozone', 'eutrophication']
  }
};

/**
 * Clean up text content by removing headers, footers, page counts, exam noise
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/Page\s*\d+\s*(of\s*\d+)?/gi, '')
    .replace(/NEET\s*MOCK\s*(TEST|EXAM)?/gi, '')
    .replace(/ALLEN\s*(CAREER\s*INSTITUTE)?\s*(TEST\s*SERIES)?/gi, '')
    .replace(/AAKASH\s*(TEST\s*SERIES)?/gi, '')
    .trim();
}

/**
 * Deduce the Subject based on keyword frequency analysis
 */
function detectSubject(questionText, explanationText = '') {
  const fullText = `${questionText} ${explanationText}`.toLowerCase();
  
  let maxScore = -1;
  let detectedSubject = 'Biology'; // Default to Biology (often 90/180 questions)

  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    let score = 0;
    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      let pos = fullText.indexOf(kw);
      while (pos !== -1) {
        score++;
        pos = fullText.indexOf(kw, pos + kw.length);
      }
    }
    if (score > maxScore) {
      maxScore = score;
      detectedSubject = subject;
    }
  }
  return detectedSubject;
}

/**
 * Deduce the Chapter based on detected subject and keyword matching
 */
function detectChapter(subject, questionText, explanationText = '') {
  const fullText = `${questionText} ${explanationText}`.toLowerCase();
  const chapters = CHAPTER_DICTIONARIES[subject];
  if (!chapters) return 'General ' + subject;

  let maxScore = -1;
  let detectedChapter = Object.keys(chapters)[0] || 'General ' + subject;

  for (const [chapterName, keywords] of Object.entries(chapters)) {
    let score = 0;
    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      let pos = fullText.indexOf(kw);
      while (pos !== -1) {
        score += 2; // Extra weight for chapter-specific matches
        pos = fullText.indexOf(kw, pos + kw.length);
      }
    }
    if (score > maxScore && score > 0) {
      maxScore = score;
      detectedChapter = chapterName;
    }
  }

  // Fallback to general classification if no high correlation
  if (maxScore <= 0) {
    return 'General ' + subject;
  }

  return detectedChapter;
}

/**
 * Intelligent question block parser
 */
export function parseNeetQuestions(rawText) {
  const cleaned = cleanText(rawText);
  
  // Find all indicators of a question.
  // NEET tests typically start with numbers (e.g. "Q1.", "Q.2", "1.", "Question 10:")
  // We look for patterns like:
  // - Q1. or Q 1. or Q.1
  // - 1. or 10. (at the start of a line, or after double newlines)
  const questionPattern = /(?:^|\r?\n)\s*(?:Q(?:uestion)?\s*[\d]+|Q\.?\s*[\d]+|[\d]+)\s*[\.\:\)]/gi;
  
  const matches = [];
  let match;
  while ((match = questionPattern.exec(cleaned)) !== null) {
    matches.push({
      index: match.index,
      text: match[0],
      length: match[0].length
    });
  }

  if (matches.length === 0) {
    // If no numbered questions found, fallback: try to divide by "Answer:" or "Option A" blocks
    return [];
  }

  const questions = [];

  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index + matches[i].length;
    const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : cleaned.length;
    const blockText = cleaned.substring(startIndex, endIndex).trim();
    
    // Parse single block
    const questionNum = i + 1;
    
    // Split into Question text, options, answer, and explanation
    // We search for options: A, B, C, D
    // Standard format matches:
    // A. Option A text
    // B. Option B text
    // C. Option C text
    // D. Option D text
    // OR (A) Option A (B) Option B (C) Option C (D) Option D
    
    const optAPattern = /(?:\r?\n|^)\s*[\(\[]?\s*A[\.\:\)]/i;
    const optBPattern = /(?:\r?\n|^)\s*[\(\[]?\s*B[\.\:\)]/i;
    const optCPattern = /(?:\r?\n|^)\s*[\(\[]?\s*C[\.\:\)]/i;
    const optDPattern = /(?:\r?\n|^)\s*[\(\[]?\s*D[\.\:\)]/i;

    const idxA = blockText.search(optAPattern);
    const idxB = blockText.search(optBPattern);
    const idxC = blockText.search(optCPattern);
    const idxD = blockText.search(optDPattern);

    let questionText = blockText;
    let optionA = '';
    let optionB = '';
    let optionC = '';
    let optionD = '';
    let restOfBlock = '';

    if (idxA !== -1 && idxB !== -1 && idxC !== -1 && idxD !== -1) {
      questionText = blockText.substring(0, idxA).trim();
      
      // Extract option details
      // Clean option prefix like "A. ", "(A) ", "A) "
      const cleanOptionText = (text) => {
        return text.replace(/^\s*[\(\[]?\s*[A-D][\.\:\)]+\s*/i, '').trim();
      };

      optionA = cleanOptionText(blockText.substring(idxA, idxB));
      optionB = cleanOptionText(blockText.substring(idxB, idxC));
      optionC = cleanOptionText(blockText.substring(idxC, idxD));
      
      // Option D will go up to the answer or explanation
      const ansPattern = /(?:\r?\n|^)\s*(?:Answer|Ans|Correct Option|Correct Answer)\s*[\:\-\=]?\s*/i;
      const idxAns = blockText.substring(idxD).search(ansPattern);

      if (idxAns !== -1) {
        optionD = cleanOptionText(blockText.substring(idxD, idxD + idxAns));
        restOfBlock = blockText.substring(idxD + idxAns);
      } else {
        // Look for Explanation directly
        const expPattern = /(?:\r?\n|^)\s*(?:Explanation|Sol|Solution|Exp)\s*[\:\-\=]?\s*/i;
        const idxExp = blockText.substring(idxD).search(expPattern);
        if (idxExp !== -1) {
          optionD = cleanOptionText(blockText.substring(idxD, idxD + idxExp));
          restOfBlock = blockText.substring(idxD + idxExp);
        } else {
          optionD = cleanOptionText(blockText.substring(idxD));
        }
      }
    }

    // Now extract correct answer from restOfBlock or from full block text
    let correctAnswer = 'A'; // Fallback default
    const fullSearchText = restOfBlock || blockText;
    
    // Find answer letter: Ans: B or Answer is C or Correct option = D or Answer: A
    const ansExtractPattern = /(?:Answer|Ans|Correct Option|Correct Answer|Correct)\s*[\:\-\=]?\s*([A-D])/i;
    const ansMatch = fullSearchText.match(ansExtractPattern);
    if (ansMatch && ansMatch[1]) {
      correctAnswer = ansMatch[1].toUpperCase();
    } else {
      // Fallback: look for lonely letters [A-D] in the remaining text
      const fallbackAnsMatch = fullSearchText.match(/(?:^|\r?\n|\s)+([A-D])(?:\s|$|\.)/i);
      if (fallbackAnsMatch && fallbackAnsMatch[1]) {
        correctAnswer = fallbackAnsMatch[1].toUpperCase();
      }
    }

    // Extract explanation
    let explanation = '';
    const expExtractPattern = /(?:Explanation|Sol|Solution|Exp)\s*[\:\-\=]?\s*([\s\S]+)/i;
    const expMatch = fullSearchText.match(expExtractPattern);
    if (expMatch && expMatch[1]) {
      explanation = expMatch[1].trim();
    } else {
      // If no explicit explanation, the restOfBlock after removing the answer key serves as explanation
      explanation = restOfBlock.replace(ansExtractPattern, '').replace(/^\s*[A-D]\s*$/, '').trim();
    }

    // Detect subject and chapter
    let subject = detectSubject(questionText, explanation);
    let chapter = detectChapter(subject, questionText, explanation);

    // Look for explicit Subject/Chapter override lines in the block
    const explicitSubjectPattern = /(?:\r?\n|^)\s*(?:Subject|Sub)\s*[\:\-\=]\s*([a-zA-Z\s]+)/i;
    const explicitSubjectMatch = blockText.match(explicitSubjectPattern);
    if (explicitSubjectMatch && explicitSubjectMatch[1]) {
      const explicitSub = explicitSubjectMatch[1].trim().toLowerCase();
      if (explicitSub.includes('chem')) {
        subject = 'Chemistry';
      } else if (explicitSub.includes('phys')) {
        subject = 'Physics';
      } else if (explicitSub.includes('bio')) {
        subject = 'Biology';
      }
    }

    const explicitChapterPattern = /(?:\r?\n|^)\s*(?:Chapter|Chap)\s*[\:\-\=]\s*([a-zA-Z0-9\-\s\&\,\.\(\)]+)/i;
    const explicitChapterMatch = blockText.match(explicitChapterPattern);
    if (explicitChapterMatch && explicitChapterMatch[1]) {
      chapter = explicitChapterMatch[1].trim();
    }

    // Clean up the text by removing the explicit markers if present to keep student view clean
    questionText = questionText.replace(explicitSubjectPattern, '').replace(explicitChapterPattern, '').trim();
    explanation = explanation.replace(explicitSubjectPattern, '').replace(explicitChapterPattern, '').trim();

    // Filter out if options are completely empty (helps prevent parsing blank lines)
    if (questionText.length > 3 && optionA.length > 0) {
      questions.push({
        question_number: questionNum,
        question_text: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        explanation: explanation || `Subject: ${subject}, Chapter: ${chapter}`,
        subject: subject,
        chapter: chapter
      });
    }
  }

  return questions;
}
