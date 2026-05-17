import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// Mock questions for fallback solutions view
const MOCK_QUESTIONS = [
  {
    id: 'mock-q-1',
    question_number: 1,
    question_text: 'Which of the following cellular organelle is responsible for synthesizing ATP via oxidative phosphorylation?',
    option_a: 'Golgi Apparatus',
    option_b: 'Mitochondria',
    option_c: 'Lysosomes',
    option_d: 'Endoplasmic Reticulum',
    correct_answer: 'B',
    explanation: 'Mitochondria are known as the powerhouses of the cell. They contain enzymes and inner membrane foldings (cristae) where oxidative phosphorylation takes place to generate ATP.',
    subject: 'Biology',
    chapter: 'Cell Structure & Function'
  },
  {
    id: 'mock-q-2',
    question_number: 2,
    question_text: 'The functional unit of the human kidney is called:',
    option_a: 'Neuron',
    option_b: 'Nephridia',
    option_c: 'Nephron',
    option_d: 'Glomerulus',
    correct_answer: 'C',
    explanation: 'The nephron is the microscopic structural and functional unit of the kidney. Each human kidney has about 1 million nephrons, which filter blood, reabsorb nutrients, and produce urine.',
    subject: 'Biology',
    chapter: 'Human Physiology'
  },
  {
    id: 'mock-q-3',
    question_number: 3,
    question_text: 'According to Chargaff\'s rule, if a double-stranded DNA contains 30% Adenine, what is the percentage of Cytosine in this DNA sample?',
    option_a: '30%',
    option_b: '20%',
    option_c: '40%',
    option_d: '15%',
    correct_answer: 'B',
    explanation: 'According to Chargaff\'s rules, Adenine (A) pairs with Thymine (T), so A = T = 30%. Together A + T = 60%. The remaining 40% must be Guanine (G) and Cytosine (C), where G = C. Therefore, Cytosine % = 40% / 2 = 20%.',
    subject: 'Biology',
    chapter: 'Genetics & Evolution'
  },
  {
    id: 'mock-q-4',
    question_number: 4,
    question_text: 'A block of mass 5 kg rests on a horizontal rough surface with a coefficient of static friction μs = 0.4. What is the maximum static frictional force acting on the block? (Take g = 10 m/s²)',
    option_a: '10 N',
    option_b: '20 N',
    option_c: '50 N',
    option_d: '25 N',
    correct_answer: 'B',
    explanation: 'The maximum static frictional force (limiting friction) is given by fs_max = μs * N. Since the surface is horizontal, Normal Force (N) = m * g = 5 kg * 10 m/s² = 50 N. Thus, fs_max = 0.4 * 50 = 20 N.',
    subject: 'Physics',
    chapter: 'Laws of Motion'
  },
  {
    id: 'mock-q-5',
    question_number: 5,
    question_text: 'Kirchhoff\'s First Law (junction rule) is a consequence of the conservation of:',
    option_a: 'Energy',
    option_b: 'Momentum',
    option_c: 'Charge',
    option_d: 'Angular Momentum',
    correct_answer: 'C',
    explanation: 'Kirchhoff\'s Junction Law states that the total current entering a junction must equal the total current leaving it. This is a direct consequence of the conservation of electric charge (charge cannot be created or destroyed at a junction).',
    subject: 'Physics',
    chapter: 'Current Electricity'
  },
  {
    id: 'mock-q-6',
    question_number: 6,
    question_text: 'An astronomical telescope has an objective lens of focal length 150 cm and an eyepiece of focal length 5 cm. What is the magnifying power of this telescope in normal adjustment?',
    option_a: '30',
    option_b: '750',
    option_c: '155',
    option_d: '145',
    correct_answer: 'A',
    explanation: 'For a telescope in normal adjustment, magnifying power (m) is given by -fo / fe, where fo is the focal length of the objective lens (150 cm) and fe is the focal length of the eyepiece (5 cm). m = 150 / 5 = 30.',
    subject: 'Physics',
    chapter: 'Optics'
  },
  {
    id: 'mock-q-7',
    question_number: 7,
    question_text: 'If the rate constant of a first-order chemical reaction is k = 6.93 x 10⁻³ s⁻¹, what is the half-life (t1/2) of the reaction?',
    option_a: '10 s',
    option_b: '100 s',
    option_c: '50 s',
    option_d: '200 s',
    correct_answer: 'B',
    explanation: 'For a first-order reaction, half-life is given by t1/2 = 0.693 / k. Substituting k = 6.93 x 10⁻³ s⁻¹, we get t1/2 = 0.693 / (6.93 x 10⁻³ s⁻¹) = 100 seconds.',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics'
  },
  {
    id: 'mock-q-8',
    question_number: 8,
    question_text: 'Which hybridization state is exhibited by the carbon atom in methane (CH₄)?',
    option_a: 'sp',
    option_b: 'sp²',
    option_c: 'sp³',
    option_d: 'dsp²',
    correct_answer: 'C',
    explanation: 'In methane (CH₄), the carbon atom forms four single covalent σ-bonds with four hydrogen atoms. Having four bonding pairs and zero lone pairs, the steric number is 4, which corresponds to sp³ hybridization forming a tetrahedral geometry.',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding'
  },
  {
    id: 'mock-q-9',
    question_number: 9,
    question_text: 'Which of the following organic compounds will NOT undergo Aldol Condensation in the presence of dilute NaOH?',
    option_a: 'Acetaldehyde (CH₃CHO)',
    option_b: 'Benzaldehyde (C₆H₅CHO)',
    option_c: 'Acetone (CH₃COCH₃)',
    option_d: 'Propanal (CH₃CH₂CHO)',
    correct_answer: 'B',
    explanation: 'Aldol condensation requires the presence of at least one α-hydrogen atom in the carbonyl compound. Benzaldehyde (C₆H₅CHO) does not possess any α-hydrogen on the formyl carbon and thus cannot undergo self-aldol condensation.',
    subject: 'Chemistry',
    chapter: 'Aldehydes & Ketones'
  },
  {
    id: 'mock-q-10',
    question_number: 10,
    question_text: 'The primary valency of Cobalt in the coordination complex [Co(NH₃)₆]Cl₃ is:',
    option_a: '6',
    option_b: '3',
    option_c: '9',
    option_d: '0',
    correct_answer: 'B',
    explanation: 'In a coordination compound, the primary valency corresponds to the oxidation state of the central metal atom. For [Co(NH₃)₆]Cl₃, NH₃ is neutral, and the three Cl⁻ outer ions impart a charge of -3. Therefore, Cobalt must be in a +3 oxidation state, meaning the primary valency is 3.',
    subject: 'Chemistry',
    chapter: 'Coordination Compounds'
  }
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const isMock = !isSupabaseConfigured() || 
                   id.startsWith('attempt-demo-') || 
                   id.startsWith('attempt-simulated-') || 
                   id.startsWith('attempt-') ||
                   !UUID_REGEX.test(id);

    if (isMock) {
      // Simulate historical or freshly-taken attempt scoring
      const simulatedChoices = {
        'mock-q-1': 'B', // Correct
        'mock-q-2': 'C', // Correct
        'mock-q-3': 'B', // Correct
        'mock-q-4': 'B', // Correct
        'mock-q-5': 'C', // Correct
        'mock-q-6': 'A', // Correct
        'mock-q-7': 'A', // Wrong (correct is B)
        'mock-q-8': 'C', // Correct
        'mock-q-9': 'D', // Wrong (correct is B)
        'mock-q-10': 'B' // Correct
      };

      const attemptDetails = {
        id: id,
        test_id: 'demo-test-1',
        score: 28,
        accuracy: 80.00,
        correct_count: 8,
        wrong_count: 2,
        unattempted_count: 0,
        time_spent_seconds: 480,
        created_at: new Date().toISOString()
      };

      const simulatedAnswers = MOCK_QUESTIONS.map(q => {
        const selected = simulatedChoices[q.id];
        return {
          id: 'ans-' + q.id,
          question_id: q.id,
          selected_option: selected,
          is_correct: selected === q.correct_answer,
          time_taken_seconds: 48,
          question: q
        };
      });

      return NextResponse.json({
        success: true,
        isMock: true,
        attempt: attemptDetails,
        test: {
          id: 'demo-test-1',
          title: 'NEET 2026 High-Yield Biology Mock Test',
          duration_minutes: 180,
          total_questions: 10
        },
        answers: simulatedAnswers
      });
    }

    // 1. Fetch the attempt details using supabaseAdmin to bypass RLS
    const { data: attemptData, error: attemptError } = await supabaseAdmin
      .from('attempts')
      .select('*, test:tests(*)')
      .eq('id', id)
      .single();

    if (attemptError) throw attemptError;

    // 2. Fetch the corresponding answers using supabaseAdmin to bypass RLS
    const { data: answersData, error: answersError } = await supabaseAdmin
      .from('answers')
      .select('*, question:questions(*)')
      .eq('attempt_id', id);

    if (answersError) throw answersError;

    // Sort answers by question_number to align perfectly in solutions viewer
    const sortedAnswers = (answersData || []).sort((a, b) => {
      return (a.question?.question_number || 0) - (b.question?.question_number || 0);
    });

    return NextResponse.json({
      success: true,
      attempt: attemptData,
      test: attemptData.test,
      answers: sortedAnswers
    });

  } catch (error) {
    console.error('Fetch single attempt details API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
