'use strict';
/* =====================================================================
   BIBLIOTECA — tópicos de estudo, lidos nas estantes da biblioteca.

   Tópico: { id, category, title, if?, lockedHint?, blocks: [...] }
     if          condição para liberar (mesma sintaxe dos diálogos, ex.: 'solved:iam').
                 Enquanto bloqueado, aparece como "???" com o texto de lockedHint.

   BLOCOS (valem também para o "study" dos casos em content/cases.js)
     { h: 'Título de seção' }
     { p: 'Parágrafo. Pode ser longo; quebra de linha com \n.' }
     { list: ['item', 'item'] }
     { tip: 'Destaque em caixa (pérola, alerta, mnemônico).' }
     { img: 'assets/study/arquivo.png', caption: 'Legenda', w: 160 }
         PNG, JPG ou SVG. w = largura máxima na tela (padrão: largura toda, 228).
         Se o arquivo não existir, aparece um quadro indicando onde a imagem vai.
   ===================================================================== */
const LIBRARY = [
  {
    id: 'abcde', category: 'Emergência', title: 'ABCDE: o paciente grave',
    blocks: [
      { p: 'Diante de qualquer paciente instável, avalie e trate na ordem do que mata mais rápido. Só avance para a próxima letra depois de resolver a anterior.' },
      { h: 'A — Via aérea (com proteção da coluna no trauma)' },
      { p: 'O paciente fala? Há estridor, gorgolejo, corpo estranho, edema? Manobras de abertura, aspiração, cânula, via aérea definitiva se necessário.' },
      { h: 'B — Respiração' },
      { p: 'FR, SpO2, expansibilidade, ausculta, percussão, traqueia. Procure e trate na hora: pneumotórax hipertensivo, pneumotórax aberto, hemotórax maciço.' },
      { h: 'C — Circulação' },
      { p: 'Pulso, PA, perfusão, enchimento capilar, sangramentos. Acesso venoso calibroso, controle de hemorragia, volume quando indicado.' },
      { h: 'D — Neurológico' },
      { p: 'Glasgow, pupilas, déficit focal e GLICEMIA CAPILAR.' },
      { h: 'E — Exposição' },
      { p: 'Despir, examinar todo o corpo, prevenir hipotermia.' },
      { tip: 'Reavalie sempre: qualquer piora manda você de volta para o A.' },
    ],
  },
  {
    id: 'choque', category: 'Emergência', title: 'Choque: os quatro tipos',
    blocks: [
      { p: 'Choque é hipoperfusão tecidual. Hipotensão é comum, mas não obrigatória: taquicardia, extremidades frias, oligúria, confusão e lactato alto já são alertas.' },
      { h: 'Hipovolêmico' },
      { p: 'Perda de volume (hemorragia, desidratação). Jugulares colabadas, extremidades frias. Trate a perda e reponha volume ou sangue.' },
      { h: 'Distributivo' },
      { p: 'Vasodilatação: sepse, anafilaxia, choque neurogênico. Extremidades muitas vezes quentes no início. Volume + vasopressor, e trate a causa (antibiótico, adrenalina...).' },
      { h: 'Cardiogênico' },
      { p: 'Falha da bomba: IAM extenso, arritmias, miocardite. Congestão pulmonar, jugulares túrgidas. Volume pode piorar.' },
      { h: 'Obstrutivo' },
      { p: 'Obstrução ao fluxo: pneumotórax hipertensivo, tamponamento, TEP maciço. Jugulares túrgidas. Volume não resolve: desobstrua.' },
      { tip: 'Jugular túrgida + hipotensão + pulmão limpo? Pense em obstrutivo (ou infarto de VD).' },
    ],
  },
  {
    id: 'dor-toracica', category: 'Cardiologia', title: 'Dor torácica no pronto-socorro',
    blocks: [
      { p: 'Toda dor torácica merece ECG em até 10 minutos da chegada. Os diagnósticos que não podem passar: síndrome coronariana aguda, dissecção de aorta, TEP, pneumotórax hipertensivo, tamponamento e ruptura de esôfago.' },
      { h: 'Dor típica de isquemia' },
      { list: ['Aperto, peso ou queimação retroesternal', 'Irradiação para braço esquerdo, mandíbula ou dorso', 'Desencadeada por esforço ou em repouso (instável)', 'Sintomas associados: sudorese, náusea, dispneia'] },
      { h: 'Pistas de outros diagnósticos' },
      { list: [
        'Dissecção: dor lancinante "rasgando" para o dorso, assimetria de pulsos/PA, mediastino alargado.',
        'Pericardite: piora deitado e à inspiração, melhora sentado para frente; supra difuso com infra de PR.',
        'TEP: dispneia súbita, taquicardia, fatores de risco para TVP.',
      ] },
      { tip: 'Troponina normal na primeira hora NÃO exclui infarto. No IAM com supra, o ECG decide a reperfusão.' },
    ],
  },
  {
    id: 'ecg-iam', category: 'Cardiologia', title: 'ECG: localizando o infarto',
    if: 'solved:iam', lockedHint: 'Atenda o Seu Joaquim para liberar.',
    blocks: [
      { img: 'assets/study/ecg-iam-inferior.svg', caption: 'Esquemático: supra de ST em DII, DIII e aVF com infra recíproco em DI e aVL.' },
      { h: 'Parede × derivações × artéria' },
      { list: [
        'Inferior: DII, DIII, aVF → geralmente coronária direita.',
        'Anterior / anterosseptal: V1–V4 → descendente anterior.',
        'Lateral: DI, aVL, V5–V6 → circunflexa ou diagonal.',
        'Ventrículo direito: V3R, V4R → coronária direita proximal.',
        'Posterior: infra de ST em V1–V3 (imagem em espelho) → confirme com V7–V9.',
      ] },
      { tip: 'Imagem recíproca (infra de ST na parede oposta) reforça que o supra é isquêmico, e não pericardite ou repolarização precoce.' },
      { p: 'No IAM inferior, sempre faça V3R/V4R: infarto de VD é dependente de pré-carga — evite nitrato e diurético, e prefira volume se houver hipotensão.' },
    ],
  },
  {
    id: 'glicemicas', category: 'Endocrinologia', title: 'Emergências glicêmicas',
    blocks: [
      { h: 'Hipoglicemia' },
      { p: 'Glicemia < 70 mg/dL. Sintomas adrenérgicos (sudorese, tremor, taquicardia) e neuroglicopênicos (confusão, convulsão, coma). Alerta: 15 g de carboidrato VO. Rebaixado: glicose 50% IV ou glucagon.' },
      { h: 'Cetoacidose diabética (CAD)' },
      { p: 'Típica do DM1. Hiperglicemia + acidose metabólica com ânion gap aumentado + cetonemia. Instala-se em horas a 1 dia.' },
      { h: 'Estado hiperglicêmico hiperosmolar (EHH)' },
      { p: 'Típico do DM2 idoso. Glicemia muito alta (> 600), osmolalidade alta, pouca ou nenhuma cetose, pH > 7,30. Instala-se em dias, com desidratação intensa e alteração neurológica.' },
      { tip: 'Nas duas crises hiperglicêmicas: volume primeiro, potássio antes da insulina, e procure o fator desencadeante.' },
    ],
  },
  {
    id: 'abdome-agudo', category: 'Cirurgia', title: 'Abdome agudo',
    blocks: [
      { p: 'Dor abdominal de início recente que pode exigir intervenção urgente. Classifique para guiar a investigação:' },
      { list: [
        'Inflamatório: apendicite, colecistite, diverticulite, pancreatite.',
        'Obstrutivo: bridas, hérnias encarceradas, volvo, tumores.',
        'Perfurativo: úlcera perfurada, perfuração de divertículo.',
        'Vascular: isquemia mesentérica (dor desproporcional ao exame!).',
        'Hemorrágico: gravidez ectópica rota, aneurisma roto.',
      ] },
      { tip: 'Mulher em idade fértil com dor abdominal: beta-hCG sempre.' },
      { p: 'Analgesia precoce, inclusive com opioide, não mascara o diagnóstico e é recomendada.' },
    ],
  },
  {
    id: 'avc', category: 'Neurologia', title: 'AVC: tempo é cérebro',
    blocks: [
      { p: 'Déficit neurológico focal súbito é AVC até prova em contrário. Registre a hora em que o paciente foi visto normal pela última vez.' },
      { list: [
        'Glicemia capilar imediata (hipoglicemia simula AVC).',
        'TC de crânio sem contraste: exclui sangramento.',
        'Trombólise IV até 4,5 h, respeitando contraindicações e PA < 185/110.',
        'Oclusão de grande vaso: trombectomia mecânica (até 24 h em casos selecionados).',
      ] },
      { tip: 'Escala de Cincinnati: face, braço e fala. Qualquer alteração súbita = acionar o protocolo.' },
    ],
  },
  {
    id: 'asma', category: 'Pneumologia', title: 'Crise de asma: gravidade',
    blocks: [
      { h: 'Leve a moderada' },
      { p: 'Fala frases, prefere sentar, sem uso importante de musculatura acessória, SpO2 90–95%.' },
      { h: 'Grave' },
      { p: 'Fala palavras, inclinada para frente, agitada, FR > 30, uso de musculatura acessória, FC > 120, SpO2 < 90%, PFE ≤ 50%.' },
      { h: 'Risco de vida' },
      { p: 'Sonolência, confusão, tórax silencioso, bradicardia, cianose.' },
      { tip: 'Sedativos são contraindicados na crise asmática.' },
    ],
  },
];
