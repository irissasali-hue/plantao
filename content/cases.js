'use strict';
/*
  Cada caso é uma "batalha". Formato:
  - stability: estabilidade inicial (0–100). decay: quanto cai por turno sem tratamento.
  - par: nº de turnos "ideal" (acima disso o XP diminui).
  - vitals: sinais vitais no início (start), estável (ok) e no colapso (crit); são interpolados pela estabilidade.
  - anamnese / fisico / exames: { q, a, clue?, tag?, cost?, img? }  (cost = turnos gastos; padrão 1)
        img: imagem mostrada junto com o resultado (ECG, raio-X, foto do exame físico...).
  - dx: hipóteses. A correta tem ok:true; as erradas têm "why" explicando por que não.
        needs: { tag, msg } bloqueia a hipótese até a tag ser obtida.
  - conduta: { name, msg, effect, stabilize?, tag, cost?, requires?: [{ tag, msg, dmg }] }
        effect < 0 = conduta danosa. stabilize reduz a piora por turno.
  - required: tags de conduta necessárias (além do diagnóstico correto) para resolver o caso.
  ORDEM DAS AÇÕES (veja o caso pneumo como exemplo):
  - tag pode ser uma lista: tag: ['dreno', 'desc'] (a ação conta como as duas coisas).
  - variants: [{ if: 'tag' | '!tag' | [...], ...campos }] — a primeira cuja condição valer
        substitui os campos (a, msg, effect, cost, requires...). Ex.: raio-X antes × depois do dreno.
        A condição olha o que já foi feito NESTE atendimento.
  - orderError: true — o efeito negativo conta como "erro de sequência" no fim do caso. Numa conduta,
        a ação feita fora de hora não fica "gasta": o jogador pode refazê-la no momento certo.
  - repeatable: true — o exame pode ser pedido de novo (gasta turno e mostra o resultado atual).
  - events: [{ turn: 5, unless: 'tag', effect, msg }]  acontece no turno N se 'tag' não foi feita.
            [{ after: 'tag', turns: 3, unless: 'outra', effect, msg }]  N turnos depois de 'tag'.
  - effect também vale para anamnese/exame físico/exames (ex.: exame que atrasa a conduta).
  - teaching: resumo curto mostrado ao fim da batalha.
  - study: (opcional) estudo expandido do caso, com imagens e texto longo. Mesmos blocos da
        biblioteca (veja o topo de content/library.js). Sem "study", usa-se o "teaching".
        Aparece em "Ver caso completo", nas anotações e na seção "Casos atendidos" da biblioteca.
  - pal: cores do sprite gerado em código (usado só se não houver arte em content/art.js).
  - cards: (opcional) flashcards escritos à mão, além dos gerados automaticamente:
        [{ q: 'pergunta', a: 'resposta certa', wrong: ['errada 1', 'errada 2'], why: 'explicação' }]
        Os automáticos saem do próprio caso: diagnóstico (intro + 2 pistas × hipóteses), conduta
        essencial × condutas danosas, "isso está indicado?" para cada conduta danosa e
        "o que fazer antes?" para cada requires com dmg. Liberados quando o caso é atendido.
  - versions: (opcional) variações do mesmo caso. A 1ª vez é sempre a versão clássica; depois o jogo
        sorteia (sem repetir a última). Cada versão só descreve o que muda:
        { id, note: 'o que muda (aparece no resumo)',
          change: { 'texto exato do q/name': { campos novos } },   // anamnese, físico, exames, dx ou conduta
          add: { exames: [...], conduta: [...] },  remove: ['q/name'],
          name/age/intro/encounter/stability/decay/par/vitals/required/events: substituem o original,
          teaching: ['linhas extras'], cards: [flashcards desta versão] }
        Veja os exemplos no IAM (sildenafil, infarto de VD) e na síncope (o diagnóstico muda!).
  - encounter: texto de abertura quando o caso surge no mato alto (ver "encounters" dos mapas em content/maps.js).
  Quem chama o caso no mapa: treinadores (trainer.case), pacientes e o mato alto, em content/maps.js.
  Conteúdo educativo e simplificado — revise sempre com as diretrizes atuais.
*/

const CASES = {
  // ======================= CASOS PRINCIPAIS =======================
  iam: {
    id: 'iam', name: 'Seu Joaquim', age: 58,
    pal: { h: '#8c8c94', s: '#e2b48a', w: '#4a6aa8', b: '#3a5288', r: '#4a6aa8', k: '#3a3a48' },
    intro: ['Homem, 58 anos. Dor torácica há 40 minutos.'],
    stability: 70, decay: 5, par: 7,
    vitals: {
      start: { pas: 150, pad: 95, fc: 104, fr: 22, spo2: 95, temp: 36.6 },
      ok: { pas: 128, pad: 80, fc: 76, fr: 16, spo2: 98, temp: 36.6 },
      crit: { pas: 70, pad: 40, fc: 138, fr: 32, spo2: 84, temp: 36.2 },
    },
    anamnese: [
      { q: 'Como é a dor?', a: '"Um aperto forte, como um peso... vai pro braço esquerdo e pro queixo."', clue: true },
      { q: 'Desde quando?', a: '"Uns 40 minutos. Começou em repouso, vendo TV, e não passa."', clue: true },
      { q: 'Doenças e hábitos?', a: '"Tenho pressão alta e diabetes. Fumo um maço por dia há 30 anos."', clue: true },
      { q: 'Piora ao respirar ou deitar?', a: '"Não... não muda com nada."' },
      { q: 'Usa algum remédio?', a: '"Losartana e metformina. Nada pra disfunção erétil, se é isso que quer saber."' },
    ],
    fisico: [
      { q: 'Inspeção geral', a: 'Pálido, sudorese fria, ansioso. Punho cerrado sobre o esterno (sinal de Levine).', clue: true },
      { q: 'PA e pulsos nos dois braços', a: 'Pulsos simétricos e PA semelhante nos dois braços. Fala contra dissecção de aorta.' },
      { q: 'Ausculta cardíaca', a: 'Bulhas rítmicas, B4 presente. Sem sopros ou atrito pericárdico.' },
      { q: 'Ausculta pulmonar', a: 'Murmúrio vesicular presente, sem estertores. Killip I.' },
    ],
    exames: [
      { q: 'ECG de 12 derivações', a: 'Supra de ST em DII, DIII e aVF, com infra recíproco em DI e aVL!', clue: true, tag: 'ecg',
        img: 'assets/study/ecg-iam-inferior.svg' },
      { q: 'ECG com V3R e V4R', a: 'Sem supra em V4R: ventrículo direito poupado.', tag: 'vd' },
      { q: 'Troponina', cost: 2, a: 'Troponina ainda normal — colhida cedo demais. Ela NÃO deve atrasar a reperfusão quando o ECG já mostra supra.' },
      { q: 'Raio-X de tórax', a: 'Mediastino de largura normal, sem congestão pulmonar.' },
    ],
    dx: [
      { name: 'IAM com supra de ST (inferior)', ok: true, msg: 'Supra em DII, DIII e aVF = parede inferior, geralmente coronária direita.',
        needs: { tag: 'ecg', msg: 'Suspeita forte... mas sem ECG não dá para classificar a síndrome coronariana.' } },
      { name: 'Dissecção aguda de aorta', why: 'A dor seria lancinante, migrando para o dorso, com assimetria de pulsos/PA e mediastino alargado.' },
      { name: 'Pericardite aguda', why: 'Na pericardite a dor piora ao deitar e inspirar e melhora sentado para frente; o supra é difuso, sem imagem recíproca.' },
      { name: 'Tromboembolismo pulmonar', why: 'Não há dispneia súbita nem fatores de risco para TVP, e o ECG é típico de IAM inferior.' },
    ],
    conduta: [
      { name: 'AAS 300 mg mastigado', tag: 'aas', effect: 10, stabilize: 1, msg: 'Antiagregação feita! O AAS reduz a mortalidade no IAM.' },
      { name: '2º antiagregante + heparina', tag: 'dapt', effect: 8, stabilize: 1,
        requires: [{ tag: 'ecg', msg: 'Antes de anticoagular, confirme a síndrome coronariana com o ECG!', dmg: 0 }],
        msg: 'Clopidogrel ou ticagrelor + anticoagulante: terapia antitrombótica completa.' },
      { name: 'Nitrato sublingual', tag: 'nitrato', effect: 6,
        requires: [{ tag: 'vd', msg: 'Nitrato em IAM inferior sem avaliar o VD! Se houver infarto de VD, ele depende de pré-carga: a PA despenca!', dmg: 18 }],
        msg: 'VD poupado e PA adequada: o nitrato alivia a dor.' },
      { name: 'Angioplastia primária', tag: 'cate', effect: 35, stabilize: 5,
        requires: [{ tag: 'ecg', msg: 'A hemodinâmica pergunta: "Cadê o ECG?" Sem ele não há indicação de reperfusão.', dmg: 0 }],
        msg: 'Coronária direita desobstruída! Meta: porta-balão < 90 min.' },
      { name: 'Dipirona e alta', tag: 'alta', effect: -30, msg: 'Liberar dor torácica típica sem investigar é um erro grave! Ele volta muito pior.' },
    ],
    required: ['aas', 'cate'],
    versions: [
      { id: 'sildenafil', note: 'ele usou sildenafil ontem: nitrato contraindicado.',
        change: {
          'Usa algum remédio?': { clue: true, a: '"Losartana e metformina... e, ontem à noite, um comprimido azul pra disfunção erétil."' },
          'Nitrato sublingual': { effect: -22, requires: [],
            msg: 'Nitrato até 24 h após sildenafil (48 h após tadalafila): vasodilatação somada e hipotensão grave!' },
        },
        teaching: ['Sempre pergunte por inibidor de PDE-5 antes de nitrato: sildenafil < 24 h ou tadalafila < 48 h contraindicam.'],
        cards: [{ q: 'IAM e uso de sildenafil há 12 horas. Pode dar nitrato?', a: 'Não: contraindicado por 24 h', wrong: ['Sim, em dose baixa', 'Sim, se a PAS > 90'],
          why: 'Sildenafil < 24 h ou tadalafila < 48 h: nitrato causa hipotensão grave.' }] },
      { id: 'vd', note: 'infarto de ventrículo direito: nada de nitrato, e volume com cautela ajuda.',
        vitals: {
          start: { pas: 88, pad: 56, fc: 58, fr: 20, spo2: 96, temp: 36.5 },
          ok: { pas: 118, pad: 74, fc: 72, fr: 16, spo2: 98, temp: 36.6 },
          crit: { pas: 60, pad: 35, fc: 40, fr: 30, spo2: 86, temp: 36.2 },
        },
        change: {
          'ECG com V3R e V4R': { clue: true, a: 'Supra de ST de 1 mm em V4R: infarto de VENTRÍCULO DIREITO!' },
          'Ausculta pulmonar': { clue: true, a: 'Pulmões LIMPOS, mas jugulares túrgidas e PA baixa: tríade do infarto de VD.' },
          'Nitrato sublingual': { effect: -22,
            msg: 'Infarto de VD: o ventrículo direito depende de pré-carga. O nitrato derruba a PA!' },
        },
        add: { conduta: [
          { name: 'Soro fisiológico em bolus', tag: 'volvd', effect: 10, stabilize: 2,
            requires: [{ tag: 'vd', msg: 'Volume num infarto sem saber se o VD está acometido? Primeiro V3R/V4R.', dmg: 0 }],
            msg: 'No infarto de VD com hipotensão e pulmão limpo, bolus de cristaloide (250–500 mL, reavaliando) mantém a pré-carga.' },
        ] },
        required: ['aas', 'volvd', 'cate'],
        teaching: ['Infarto de VD: hipotensão + jugulares túrgidas + pulmão limpo. Evite nitrato e diurético; volume com cautela.'],
        cards: [{ q: 'IAM inferior com supra em V4R, PA 88/56 e pulmões limpos. Qual conduta ajuda a PA?', a: 'Bolus de cristaloide, reavaliando', wrong: ['Nitrato sublingual', 'Furosemida IV'],
          why: 'O VD infartado depende de pré-carga: volume ajuda, nitrato e diurético derrubam a PA.' }] },
    ],
    teaching: [
      'IAM com supra de ST: ECG em até 10 min da chegada de toda dor torácica.',
      'Tratamento: AAS 300 mg mastigado + 2º antiagregante + anticoagulante, e reperfusão o quanto antes.',
      'Angioplastia primária se porta-balão < 90 min (até 120 min com transferência); senão, fibrinólise com porta-agulha < 30 min.',
      'Troponina não atrasa a reperfusão. No IAM inferior, faça V3R/V4R antes de nitrato, e evite-o após inibidor de PDE-5.',
    ],
    cards: [
      { q: 'IAM com supra: em quanto tempo da chegada o ECG deve estar feito?', a: 'Até 10 minutos', wrong: ['Até 30 minutos', 'Até 1 hora', 'Depois da troponina'],
        why: 'Toda dor torácica faz ECG em até 10 min: é ele que define a reperfusão.' },
      { q: 'Angioplastia primária: qual o tempo porta-balão ideal?', a: 'Menos de 90 minutos', wrong: ['Menos de 30 minutos', 'Menos de 6 horas', 'Menos de 12 horas'],
        why: 'Até 120 min se precisar transferir. Se não der, fibrinólise com porta-agulha < 30 min.' },
    ],
    study: [
      { p: 'Homem de 58 anos, hipertenso, diabético e tabagista, com dor torácica em aperto há 40 minutos, em repouso, irradiada para braço esquerdo e mandíbula, com sudorese fria.' },
      { h: 'O ECG' },
      { img: 'assets/study/ecg-iam-inferior.svg', caption: 'Supra de ST em DII, DIII e aVF; infra recíproco em DI e aVL. Parede inferior.' },
      { p: 'O supra em derivações contíguas da parede inferior, com imagem em espelho em DI e aVL, define IAM com supra de ST inferior — na maioria das vezes por oclusão da coronária direita.' },
      { h: 'Raciocínio' },
      { list: [
        'Dor típica + fatores de risco = alta probabilidade pré-teste de síndrome coronariana.',
        'PA simétrica nos braços e mediastino normal falam contra dissecção (que contraindicaria antitrombóticos!).',
        'Dor que não varia com respiração/posição e supra localizado com recíproca falam contra pericardite.',
      ] },
      { h: 'Conduta' },
      { list: [
        'AAS 300 mg mastigado + 2º antiagregante (clopidogrel, ticagrelor ou prasugrel) + anticoagulante.',
        'Reperfusão: angioplastia primária com porta-balão < 90 min; se indisponível em até 120 min, fibrinólise em até 30 min.',
        'V3R/V4R antes de nitrato. Morfina só se dor refratária. O2 apenas se SpO2 < 90%.',
      ] },
      { tip: 'Pegadinha clássica: esperar a troponina para decidir. No IAM com supra, quem decide é o ECG.' },
      { h: 'Depois da alta' },
      { p: 'Dupla antiagregação por 12 meses, estatina de alta potência, betabloqueador, IECA/BRA, controle de pressão e diabetes, e cessação do tabagismo. Reabilitação cardíaca.' },
    ],
  },

  anafilaxia: {
    id: 'anafilaxia', name: 'Marina', age: 24,
    pal: { h: '#a03a22', s: '#f2c8a0', w: '#e8b830', b: '#c89820', r: '#e8b830', k: '#405080', long: true },
    intro: ['Mulher, 24 anos. Falta de ar e "inchaço" há 10 minutos.'],
    stability: 55, decay: 8, par: 5,
    vitals: {
      start: { pas: 84, pad: 50, fc: 128, fr: 28, spo2: 91, temp: 36.8 },
      ok: { pas: 115, pad: 75, fc: 84, fr: 16, spo2: 98, temp: 36.8 },
      crit: { pas: 50, pad: 30, fc: 158, fr: 38, spo2: 76, temp: 36.5 },
    },
    anamnese: [
      { q: 'O que aconteceu?', a: '"Comi um pastel de camarão na feira. Uns 10 minutos depois começou a coçar tudo!"', clue: true },
      { q: 'Já teve alergia antes?', a: '"Uma vez fiquei com coceira depois de comer camarão... achei que era bobagem."', clue: true },
      { q: 'Usa algum remédio?', a: '"Não uso nada. Nem tenho asma."' },
    ],
    fisico: [
      { q: 'Pele e mucosas', a: 'Urticária difusa e angioedema de lábios e pálpebras.', clue: true },
      { q: 'Vias aéreas', a: 'Voz rouca e estridor inspiratório. Edema de laringe!', clue: true },
      { q: 'Ausculta pulmonar', a: 'Sibilos difusos bilaterais.' },
      { q: 'Perfusão', a: 'Extremidades frias, enchimento capilar de 4 segundos.', clue: true },
    ],
    exames: [
      { q: 'Triptase sérica', cost: 2, a: 'O resultado só sai em horas... Anafilaxia é diagnóstico CLÍNICO: não espere exames!' },
      { q: 'Gasometria arterial', a: 'Alcalose respiratória leve. Lactato 3,2 mmol/L.' },
    ],
    dx: [
      { name: 'Anafilaxia', ok: true, msg: 'Alérgeno + pele/mucosa + compromisso respiratório e hipotensão.' },
      { name: 'Crise de asma', why: 'Asma não explica urticária, angioedema e hipotensão logo após um alérgeno.' },
      { name: 'Angioedema hereditário', why: 'O angioedema hereditário não causa urticária nem prurido e não tem relação com alimento.' },
      { name: 'Choque séptico', why: 'Início em minutos após um alimento, sem febre e sem foco infeccioso.' },
    ],
    conduta: [
      { name: 'Adrenalina 0,5 mg IM na coxa', tag: 'adr', effect: 35, stabilize: 6, msg: 'Droga de 1ª escolha! Pode repetir a cada 5–15 min se necessário.' },
      { name: 'Soro fisiológico em bolus', tag: 'vol', effect: 10, stabilize: 2, msg: 'Cristaloide 1–2 L rápido, com as pernas elevadas: corrige a vasodilatação.' },
      { name: 'Oxigênio suplementar', tag: 'o2', effect: 4, msg: 'O2 em alto fluxo enquanto a via aérea é vigiada.' },
      { name: 'Só anti-histamínico IV', tag: 'ah', effect: 0, msg: 'Alivia a coceira, mas NÃO trata choque nem edema de laringe. É só adjuvante!' },
      { name: 'Só corticoide IV', tag: 'cort', effect: 0, msg: 'Corticoide demora horas para agir. Não substitui a adrenalina.' },
      { name: 'Adrenalina 1 mg IV em bolus', tag: 'adriv', effect: -25, msg: 'Dose de parada cardíaca em paciente com pulso! Taquiarritmia e crise hipertensiva!' },
    ],
    required: ['adr', 'vol'],
    versions: [
      { id: 'betabloq', note: 'ela usa propranolol: a resposta à adrenalina é fraca e o glucagon entra.',
        change: {
          'Usa algum remédio?': { clue: true, a: '"Tomo propranolol para enxaqueca."' },
          'Adrenalina 0,5 mg IM na coxa': { effect: 18, stabilize: 3,
            msg: 'Ela melhora pouco... com betabloqueador, a resposta à adrenalina pode ser fraca. Repita a dose e pense em glucagon.' },
        },
        add: { conduta: [
          { name: 'Glucagon IV', tag: 'glucagon', effect: 20, stabilize: 3,
            requires: [{ tag: 'adr', msg: 'Mesmo com betabloqueador, a adrenalina IM continua sendo a 1ª droga!', dmg: 0 }],
            msg: 'Glucagon 1–5 mg IV age sem passar pelo receptor beta: é a opção na anafilaxia refratária em quem usa betabloqueador.' },
        ] },
        required: ['adr', 'vol', 'glucagon'],
        teaching: ['Anafilaxia refratária em usuário de betabloqueador: glucagon IV, sem deixar de dar adrenalina.'],
        cards: [{ q: 'Anafilaxia que não responde à adrenalina em quem usa propranolol. O que associar?', a: 'Glucagon IV', wrong: ['Atropina IV', 'Dobrar o anti-histamínico'],
          why: 'O glucagon aumenta o AMPc sem depender do receptor beta bloqueado.' }] },
      { id: 'abelha', note: 'o gatilho foi uma picada de abelha, e o quadro é o mesmo: adrenalina IM primeiro.',
        intro: ['Mulher, 24 anos. Falta de ar e "inchaço" há 10 minutos, depois de uma picada.'],
        change: {
          'O que aconteceu?': { a: '"Uma abelha me picou no braço, no jardim. Uns 5 minutos depois começou a coçar tudo!"' },
          'Já teve alergia antes?': { a: '"Da última vez que fui picada, o braço inchou inteiro..."' },
          'Angioedema hereditário': { why: 'O angioedema hereditário não causa urticária nem prurido e não tem relação com picada.' },
          'Choque séptico': { why: 'Início em minutos após uma picada, sem febre e sem foco infeccioso.' },
        },
        teaching: ['Picada de inseto: retire o ferrão raspando (não pinçando). Quem já teve anafilaxia por veneno pode fazer imunoterapia.'] },
    ],
    teaching: [
      'Anafilaxia é clínica: início agudo com pele/mucosa + respiratório ou hipotensão, após provável alérgeno.',
      'Adrenalina IM no vasto lateral da coxa: 0,01 mg/kg (máx. 0,5 mg no adulto), repetir a cada 5–15 min.',
      'Deitar com pernas elevadas, O2 e cristaloide em bolus na hipotensão. Anti-histamínico e corticoide são só adjuvantes.',
      'Observar por horas (risco de reação bifásica) e prescrever adrenalina autoinjetável na alta.',
    ],
  },

  cad: {
    id: 'cad', name: 'Lucas', age: 19,
    pal: { h: '#1e1a1a', s: '#c8946a', w: '#3ca060', b: '#2c8048', r: '#3ca060', k: '#3a3a58' },
    intro: ['Homem, 19 anos. Vômitos e dor abdominal há 1 dia.'],
    stability: 60, decay: 4, par: 8,
    vitals: {
      start: { pas: 96, pad: 60, fc: 122, fr: 30, spo2: 98, temp: 36.9 },
      ok: { pas: 118, pad: 74, fc: 86, fr: 16, spo2: 98, temp: 36.8 },
      crit: { pas: 65, pad: 35, fc: 150, fr: 36, spo2: 95, temp: 36.5 },
    },
    anamnese: [
      { q: 'O que está sentindo?', a: '"Muita sede, faço xixi toda hora... e agora essa dor de barriga e vômito."', clue: true },
      { q: 'Perdeu peso?', a: '"Uns 6 kg no último mês, sem fazer dieta nenhuma."', clue: true },
      { q: 'História familiar?', a: '"Minha tia tem diabetes tipo 1."' },
      { q: 'Álcool ou drogas?', a: '"Não, nada. Juro."' },
    ],
    fisico: [
      { q: 'Padrão respiratório', a: 'Respiração rápida e profunda (Kussmaul). Hálito cetônico, de "maçã passada".', clue: true },
      { q: 'Hidratação', a: 'Mucosas secas, turgor diminuído, enchimento capilar de 3 segundos.', clue: true },
      { q: 'Abdome', a: 'Dor difusa leve à palpação, sem sinais de peritonite.' },
    ],
    exames: [
      { q: 'Glicemia capilar', a: 'O glicosímetro marca "HI"! Glicemia sérica: 520 mg/dL.', clue: true, tag: 'glic' },
      { q: 'Gasometria venosa', a: 'pH 7,12 | HCO3 9 mEq/L | ânion gap 26: acidose metabólica com AG aumentado.', clue: true, tag: 'gaso' },
      { q: 'Cetonemia', a: 'Beta-hidroxibutirato 5,8 mmol/L (elevado).', clue: true },
      { q: 'Potássio sérico', a: 'K+ = 4,0 mEq/L. Potássio adequado: dá para iniciar insulina, repondo K no soro.', tag: 'k' },
      { q: 'TC de abdome', cost: 2, a: 'Sem alterações. A dor abdominal da CAD melhora com o tratamento.' },
    ],
    dx: [
      { name: 'Cetoacidose diabética', ok: true, msg: 'Hiperglicemia + acidose metabólica com AG aumentado + cetonemia. Provável abertura de DM1.' },
      { name: 'Estado hiperglicêmico hiperosmolar', why: 'No EHH a glicemia costuma passar de 600, o pH fica > 7,30 e quase não há cetose. Mais comum em idosos com DM2.' },
      { name: 'Apendicite aguda', why: 'Dor difusa sem peritonite, com cetoacidose: a dor é da própria CAD.' },
      { name: 'Gastroenterite aguda', why: 'Gastroenterite não explica glicemia de 520 nem cetoacidose.' },
    ],
    conduta: [
      { name: 'SF 0,9% 1 L na 1ª hora', tag: 'sf', effect: 18, stabilize: 2, msg: 'Hidratação é o 1º passo: repõe volume e já reduz a glicemia.' },
      { name: 'Insulina regular IV contínua', tag: 'ins', effect: 25, stabilize: 3,
        requires: [
          { tag: 'k', msg: 'Insulina sem dosar o potássio! Ela empurra K+ para dentro das células: hipocalemia e arritmia!', dmg: 22 },
          { tag: 'sf', msg: 'Insulina antes de hidratar: o volume intravascular cai ainda mais e a PA despenca!', dmg: 12 },
        ],
        msg: '0,1 U/kg/h. Meta: queda de 50–70 mg/dL por hora.' },
      { name: 'Repor potássio no soro', tag: 'krep', effect: 5,
        requires: [{ tag: 'k', msg: 'Repor potássio às cegas? Com K alto ou oligúria, isso pode causar arritmia!', dmg: 10 }],
        msg: 'K+ normal: acrescente potássio ao soro para evitar hipocalemia durante a insulina.' },
      { name: 'Bicarbonato de sódio', tag: 'bic', effect: -10, msg: 'Bicarbonato só se considera com pH < 6,9. Aqui ele piora a hipocalemia e não ajuda.' },
    ],
    required: ['sf', 'ins'],
    versions: [
      { id: 'hipok', note: 'potássio de 3,0: repor ANTES de começar a insulina.',
        change: {
          'Potássio sérico': { a: 'K+ = 3,0 mEq/L: BAIXO! Reponha potássio e só inicie a insulina com K ≥ 3,3.' },
          'Insulina regular IV contínua': { requires: [
            { tag: 'k', msg: 'Insulina sem dosar o potássio! Ela empurra K+ para dentro das células: hipocalemia e arritmia!', dmg: 22 },
            { tag: 'sf', msg: 'Insulina antes de hidratar: o volume intravascular cai ainda mais e a PA despenca!', dmg: 12 },
            { tag: 'krep', msg: 'K+ de 3,0 e insulina correndo: o potássio despenca e surge arritmia! Reponha antes.', dmg: 22 },
          ] },
          'Repor potássio no soro': { effect: 10, msg: 'K+ baixo: repor ANTES da insulina (20–30 mEq/h no soro) até K ≥ 3,3.' },
        },
        required: ['sf', 'krep', 'ins'],
        cards: [{ q: 'CAD com K+ = 3,0 mEq/L. Quando começar a insulina?', a: 'Depois de repor até K ≥ 3,3', wrong: ['Imediatamente, junto com o soro', 'Só depois de corrigir o pH'],
          why: 'A insulina leva o potássio para dentro da célula: com K baixo, causa hipocalemia grave e arritmia.' }] },
      { id: 'pneumonia', note: 'o gatilho foi uma pneumonia: tratar o fator desencadeante faz parte da conduta.',
        intro: ['Homem, 19 anos, diabético tipo 1. Vômitos e dor abdominal há 1 dia.'],
        change: {
          'Perdeu peso?': { clue: false, a: '"Não... mas tô com tosse e febre faz 3 dias, e quase não comi."' },
          'História familiar?': { a: '"Tenho diabetes tipo 1 desde os 12. Como não comia, pulei a insulina."', clue: true },
        },
        add: {
          exames: [{ q: 'Raio-X de tórax', a: 'Consolidação na base direita: pneumonia, o fator desencadeante!', clue: true }],
          conduta: [{ name: 'Antibiótico para a pneumonia', tag: 'atb', effect: 8, stabilize: 1,
            msg: 'Tratar o gatilho é parte do tratamento da CAD: infecção é a causa mais comum.' }],
        },
        required: ['sf', 'ins', 'atb'],
        teaching: ['Nunca suspenda a insulina basal do DM1 quando ele está doente e sem comer: "dias de doença" pedem MAIS monitorização, não menos insulina.'] },
    ],
    teaching: [
      'CAD: hiperglicemia (geralmente > 250 mg/dL) + pH < 7,3 e/ou HCO3 < 18 + cetonemia.',
      'Ordem: 1) SF 0,9% vigoroso; 2) dosar K+ — se baixo (< 3,3; algumas diretrizes usam 3,5), repor ANTES da insulina; 3) insulina regular IV 0,1 U/kg/h.',
      'Quando a glicemia cair para ~200–250, associe soro glicosado e mantenha a insulina até fechar o ânion gap.',
      'Bicarbonato só se pH < 6,9. Sempre procure o fator desencadeante (infecção, má adesão, abertura de DM1).',
    ],
  },

  pneumo: {
    id: 'pneumo', name: 'Rafael', age: 32,
    pal: { h: '#5a3a24', s: '#e8b88c', w: '#34343e', b: '#22222a', r: '#c03030', k: '#2a3a6a' },
    encounter: ['Um motociclista está caído no acostamento, com a mão no peito.', '"Não... consigo... respirar..."'],
    intro: ['Homem, 32 anos. Queda de moto com trauma torácico fechado há 15 minutos.', 'Pense no ABCDE: no pneumotórax hipertensivo, o B pode vir antes do A.'],
    stability: 50, decay: 7, par: 6,
    vitals: {
      start: { pas: 82, pad: 50, fc: 132, fr: 34, spo2: 85, temp: 36.4 },
      ok: { pas: 122, pad: 78, fc: 90, fr: 18, spo2: 97, temp: 36.5 },
      crit: { pas: 45, pad: 25, fc: 40, fr: 42, spo2: 68, temp: 36.0 },
    },
    anamnese: [
      { q: 'O que aconteceu?', a: '"Caí da moto... uns 60 por hora... bati o peito no meio-fio. O ar tá acabando!"', clue: true, tag: 'mecanismo' },
      { q: 'Onde dói?', a: '"Do lado direito do peito... dói muito pra respirar."' },
      { q: 'AMPLE: alergias, remédios, doenças, refeição', a: '"Nenhuma alergia... não tomo nada... almocei faz 2 horas..."',
        variants: [{ if: '!desc', effect: -4, orderError: true,
          a: '"Nenhuma alergia... não tomo nada..." A história AMPLE faz parte do exame SECUNDÁRIO: com o paciente em choque, resolva o B primeiro!' }] },
    ],
    fisico: [
      { q: 'A — Via aérea e coluna cervical', a: 'Fala frases curtas, sem estridor: via aérea pérvia. Colar cervical mantido.', tag: 'a' },
      { q: 'B — Inspeção e expansibilidade', a: 'Taquipneico, hemitórax direito abaulado e quase imóvel. Escoriações e crepitação de arcos costais à direita.', clue: true },
      { q: 'B — Ausculta pulmonar', a: 'Murmúrio vesicular ABOLIDO no hemitórax direito.', clue: true,
        variants: [{ if: 'dreno', a: 'Murmúrio vesicular presente bilateralmente, um pouco reduzido na base direita. O pulmão reexpandiu!' }] },
      { q: 'B — Percussão do tórax', a: 'Hipertimpanismo à direita.', clue: true },
      { q: 'Pescoço: jugulares e traqueia', a: 'Turgência jugular e traqueia desviada para a ESQUERDA (sinal tardio).', clue: true,
        variants: [{ if: 'desc', a: 'Jugulares menos túrgidas e traqueia voltando à linha média.' }] },
      { q: 'C — Pulsos, perfusão e sangramentos', a: 'Pulsos finos, enchimento capilar de 4 s, sem sangramento externo. Choque!',
        variants: [{ if: 'desc', a: 'Pulsos cheios, enchimento capilar de 2 s. A PA subiu depois da descompressão: era choque obstrutivo.' }] },
      { q: 'D — Glasgow e pupilas', a: 'Glasgow 14 (confuso pela hipóxia), pupilas isocóricas e fotorreagentes.',
        variants: [{ if: 'desc', a: 'Glasgow 15, pupilas isocóricas e fotorreagentes.' }] },
      { q: 'Exame secundário: abdome e pelve', a: 'Abdome flácido e indolor, pelve estável.',
        variants: [{ if: '!desc', effect: -5, orderError: true,
          a: 'Abdome flácido, pelve estável... mas o exame secundário só vem depois do primário! Enquanto isso, a tensão no tórax aumentou.' }] },
    ],
    exames: [
      { q: 'USG à beira-leito (eFAST)', clue: true, tag: 'efast',
        a: 'Sem deslizamento pleural e sem "lung pulse" à direita (sinal do código de barras). Sem líquido pericárdico nem líquido livre no abdome.' },
      { q: 'Monitor e ECG', a: 'Taquicardia sinusal. Atenção: se surgir BRADICARDIA, o colapso é iminente.',
        variants: [{ if: 'desc', a: 'Taquicardia sinusal melhorando (FC em queda após a descompressão).' }] },
      { q: 'Gasometria arterial', a: 'Hipoxemia com alcalose respiratória.' },
      { q: 'Raio-X de tórax', cost: 2, repeatable: true, effect: -6, orderError: true,
        a: 'O raio-X demorou... e o Rafael quase parou! Paciente INSTÁVEL não espera radiografia: pneumotórax hipertensivo é diagnóstico clínico (ou por USG à beira-leito).',
        variants: [
          { if: 'dreno', cost: 1, effect: 0, orderError: false, tag: 'rx',
            a: 'Pulmão direito reexpandido, dreno bem posicionado. Fraturas do 4º ao 6º arco costal à direita. Mediastino de largura normal.' },
          { if: 'desc', cost: 1, effect: 0, orderError: false,
            a: 'Pneumotórax ainda volumoso à direita: a descompressão aliviou a tensão, mas não resolve. Falta drenar!' },
        ] },
      { q: 'TC de tórax', cost: 2, effect: -12, orderError: true,
        a: 'Levar um paciente instável para a tomografia?! Ele piorou no caminho. TC é para o paciente estável ou estabilizado.',
        variants: [{ if: 'dreno', effect: 0, orderError: false,
          a: 'Fraturas do 4º ao 6º arco costal à direita, contusão pulmonar leve, dreno bem posicionado. Sem lesão de aorta.' }] },
    ],
    dx: [
      { name: 'Pneumotórax hipertensivo à direita', ok: true, msg: 'Choque obstrutivo: MV abolido, hipertimpanismo, turgência jugular, hipotensão e taquicardia.' },
      { name: 'Tamponamento cardíaco', why: 'Também dá turgência jugular e hipotensão, mas o murmúrio estaria presente, a percussão normal e o eFAST mostraria líquido pericárdico.' },
      { name: 'Hemotórax maciço', why: 'Haveria MACICEZ à percussão, e as jugulares tendem a estar colabadas pela hipovolemia.' },
      { name: 'Contusão pulmonar', why: 'Contusão não abole o murmúrio, não causa hipertimpanismo nem choque obstrutivo.' },
    ],
    conduta: [
      { name: 'O2 em máscara com reservatório', tag: 'o2', effect: 4, msg: 'Oxigênio a 15 L/min. Ajuda, mas não resolve a causa.' },
      { name: 'Acesso venoso e monitorização', tag: 'acesso', effect: 2, msg: 'Dois acessos calibrosos e monitor. Rápido, sem atrasar o B.' },
      { name: 'Descompressão por agulha', tag: ['desc', 'agulha'], effect: 30, stabilize: 4,
        msg: 'O ar sai sob pressão! No adulto: 4º/5º espaço intercostal, entre as linhas axilares anterior e média (ATLS 10). É temporária: drene logo depois.',
        variants: [{ if: 'dreno', effect: 0, stabilize: 0, msg: 'O dreno já resolveu a tensão. A agulha não é mais necessária.' }] },
      { name: 'Toracostomia digital (dedo)', tag: ['desc', 'dedo'], effect: 30, stabilize: 4,
        msg: 'Incisão no 4º/5º EIC e o dedo abre a pleura: descompressão garantida (a agulha pode dobrar ou não alcançar a pleura). O dreno entra pelo mesmo orifício.',
        variants: [{ if: 'dreno', effect: 0, stabilize: 0, msg: 'O dreno já resolveu a tensão.' }] },
      { name: 'Drenagem torácica (dreno de tórax)', tag: ['dreno', 'desc'], cost: 2, effect: 25, stabilize: 4,
        msg: 'Dreno em selo d’água no 5º EIC: o pulmão reexpande. É o tratamento definitivo após a descompressão.',
        variants: [{ if: '!desc', effect: 22,
          msg: 'O dreno também alivia a tensão e é uma opção imediata válida, mas leva mais tempo. Com o paciente em choque, agulha ou dedo descomprimem mais rápido.' }] },
      { name: 'Intubação orotraqueal', tag: 'iot', effect: -4,
        // Antes de descomprimir, o pré-requisito barra e causa dano; depois, é só desnecessária
        requires: [{ tag: 'desc', msg: 'Pressão positiva ANTES de descomprimir aumenta o pneumotórax: o Rafael quase parou! No pneumotórax hipertensivo, o B vem antes do A.', dmg: 22 }],
        msg: 'Após a descompressão, ele protege a via aérea e ventila bem. Intubar agora é desnecessário e arriscado.' },
      { name: 'Volume agressivo (2 L de cristaloide)', tag: 'vol', effect: 0, msg: 'Volume não resolve choque obstrutivo. Trate a causa!',
        variants: [{ if: 'desc', effect: -4, msg: 'A hipotensão já respondeu à descompressão. Cristaloide desnecessário dilui fatores de coagulação e piora a hipotermia.' }] },
      { name: 'Analgesia com opioide IV', tag: 'analg', effect: -5, orderError: true,
        msg: 'Analgesia importa, mas agora não: opioide num paciente chocado e hipóxico deprime a respiração. Primeiro o B! (Dá para fazer depois.)',
        variants: [{ if: 'dreno', effect: 6, orderError: false, msg: 'Dor das fraturas de costela controlada: ele respira melhor e mais fundo.' }] },
      { name: 'Antibiótico profilático', tag: 'atb', effect: 0, msg: 'No dreno de trauma fechado, antibiótico profilático tem benefício questionável: técnica estéril importa mais.' },
      { name: 'Toracotomia de reanimação', tag: 'toracotomia', effect: -25, msg: 'Indicação estreitíssima (perda de sinais vitais na sala, tamponamento). Aqui a descompressão resolve!' },
    ],
    required: ['desc', 'dreno', 'analg'],
    events: [
      { turn: 5, unless: 'desc', effect: -10, msg: 'O monitor apita: BRADICARDIA! Sinal de colapso iminente. Descomprima AGORA!' },
      { after: 'agulha', turns: 3, unless: 'dreno', effect: -18, msg: 'O Rafael volta a piorar: o cateter dobrou e a tensão reacumulou! A agulha é temporária: drene logo depois.' },
    ],
    teaching: [
      'Pneumotórax hipertensivo é diagnóstico CLÍNICO: dispneia, taquicardia, hipotensão, MV abolido, hipertimpanismo, turgência jugular; desvio de traqueia é sinal tardio.',
      'Paciente instável: USG à beira-leito (eFAST) se não atrasar; raio-X e TC só depois de estabilizar.',
      'Ordem: descompressão imediata (agulha ou dedo, 4º/5º EIC entre as linhas axilares anterior e média) → drenagem torácica logo em seguida.',
      'B antes de A: intubar e ventilar com pressão positiva antes de descomprimir pode levar à parada. Evite cristaloide desnecessário.',
    ],
    study: [
      { p: 'Rafael, 32 anos, motociclista, trauma torácico fechado à direita. Chegou taquipneico, taquicárdico, hipotenso e hipoxêmico.' },
      { h: 'O que é' },
      { p: 'Ar no espaço pleural com mecanismo de válvula: entra na inspiração e não sai na expiração. A pressão sobe, colapsa o pulmão, desvia o mediastino e reduz o retorno venoso: choque obstrutivo. É raro (1–2% dos pneumotórax), mas mais comum no trauma e na ventilação mecânica.' },
      { h: 'Como reconhecer' },
      { list: [
        'Dispneia e dor pleurítica após trauma (muitas vezes por fratura de costela).',
        'Hipotensão e taquicardia: sinal ominoso, sugere tensão.',
        'MV abolido, hipertimpanismo, expansibilidade reduzida e hemitórax abaulado do lado afetado.',
        'Turgência jugular e desvio da traqueia para o lado oposto (sinal TARDIO, nem sempre presente).',
        'Bradicardia no monitor: colapso cardiovascular iminente.',
      ] },
      { tip: 'Os sinais "radiológicos" de tensão (desvio do mediastino, rebaixamento do diafragma) são pouco confiáveis. Quem define a tensão é a clínica: taquicardia, hipotensão e dispneia grave.' },
      { h: 'Exames: quando e qual' },
      { list: [
        'Instável: USG à beira-leito (eFAST), junto com a reanimação. Ausência de deslizamento pleural sugere pneumotórax; o "ponto pulmonar" confirma. Sem USG disponível ou útil: decisão clínica.',
        'Estável: raio-X de tórax (no trauma, quase sempre). A linha pleural visceral branca confirma.',
        'TC: o exame mais preciso, mas só para o paciente estável ou já estabilizado.',
      ] },
      { img: 'assets/study/rx-pneumotorax-hipertensivo.jpeg', caption: 'Presença de pneumotorax direito e colapso resultante do pulmão direito. Radiopaedia.' },
      { h: 'A ordem certa' },
      { list: [
        '1. Avaliação primária rápida: A pérvia? B: ausculta, percussão, pescoço.',
        '2. Suspeitou de tensão: descompressão IMEDIATA (agulha ou toracostomia digital). O B vem antes do A: não intube antes de descomprimir.',
        '3. Logo em seguida: drenagem torácica (dreno em selo d’água).',
        '4. Completar C, D e E; então o exame secundário (AMPLE, abdome, pelve).',
        '5. Estabilizado: raio-X de controle (posição do dreno, fraturas) e TC se houver achados preocupantes.',
        '6. Analgesia adequada das fraturas de costela (opioide só depois de resolver o B e o C).',
      ] },
      { tip: 'Erros de sequência que o jogo cobra: raio-X ou TC antes de estabilizar, exame secundário antes do primário, intubar antes de descomprimir, opioide no paciente chocado, e agulha sem dreno logo em seguida.' },
      { h: 'Detalhes que caem em prova' },
      { list: [
        'Local da agulha no adulto: 4º/5º EIC, entre as linhas axilares anterior e média (ATLS 10ª ed.). O 2º EIC na linha hemiclavicular é mais usado em crianças.',
        'Toracostomia digital é alternativa à agulha, mais confiável em tórax espessos.',
        'Choque no trauma é quase sempre hemorrágico, mas pode ser obstrutivo (pneumotórax hipertensivo, tamponamento): volume não resolve o obstrutivo.',
        'Antibiótico profilático no dreno de trauma fechado: benefício questionável; diretrizes desencorajam.',
        'Toracotomia de reanimação no trauma fechado tem indicação estreita (perda de sinais vitais na sala de emergência, tamponamento).',
      ] },
      { h: 'Fontes' },
      { list: [
        'UpToDate — Clinical presentation and diagnosis of pneumothorax (revisão de literatura até out/2026; atualizado em 20/07/2026).',
        'UpToDate — Initial evaluation and management of blunt thoracic trauma in adults (consultado em nov/2026).',
        'ATLS — Advanced Trauma Life Support, 10ª edição.',
      ] },
    ],
  },

  apendicite: {
    id: 'apendicite', name: 'Paulo', age: 27,
    pal: { h: '#c8a050', s: '#f0c49a', w: '#e07830', b: '#c06020', r: '#e07830', k: '#4a4a5a' },
    intro: ['Homem, 27 anos. Dor abdominal há 20 horas.'],
    stability: 80, decay: 3, par: 8,
    vitals: {
      start: { pas: 124, pad: 80, fc: 98, fr: 18, spo2: 98, temp: 38.1 },
      ok: { pas: 120, pad: 78, fc: 76, fr: 14, spo2: 99, temp: 36.8 },
      crit: { pas: 80, pad: 48, fc: 136, fr: 28, spo2: 93, temp: 39.6 },
    },
    anamnese: [
      { q: 'Onde começou a dor?', a: '"Começou em volta do umbigo ontem... agora tá aqui embaixo, à direita."', clue: true },
      { q: 'Fome? Enjoo?', a: '"Perdi totalmente o apetite. Vomitei uma vez."', clue: true },
      { q: 'Intestino e urina?', a: '"Normais. Sem diarreia e sem ardência pra urinar."' },
      { q: 'Já operou?', a: '"Nunca operei nada."' },
    ],
    fisico: [
      { q: 'Palpação do abdome', a: 'Dor intensa no ponto de McBurney.', clue: true },
      { q: 'Descompressão brusca', a: 'Sinal de Blumberg positivo: irritação peritoneal.', clue: true },
      { q: 'Manobra de Rovsing', a: 'Palpar a fossa ilíaca esquerda provoca dor à direita: Rovsing positivo.' },
      { q: 'Punho-percussão lombar', a: 'Giordano negativo.' },
    ],
    exames: [
      { q: 'Hemograma', a: 'Leucocitose de 15.800 com desvio à esquerda.', clue: true },
      { q: 'Urina tipo 1', a: 'Sem alterações.' },
      { q: 'TC de abdome', cost: 2, a: 'Apêndice com 11 mm e borramento da gordura periapendicular. Sem perfuração.', clue: true },
    ],
    dx: [
      { name: 'Apendicite aguda', ok: true, msg: 'Dor migratória para FID + anorexia + febre + Blumberg + leucocitose. Alvarado alto!' },
      { name: 'Cólica renal', why: 'Giordano negativo e urina normal; a cólica renal irradia para flanco e genitália, com agitação.' },
      { name: 'Gastroenterite aguda', why: 'Não há diarreia, e dor migratória com Blumberg indica abdome cirúrgico.' },
      { name: 'Diverticulite aguda', why: 'É mais comum após os 50 anos e costuma ser à ESQUERDA (sigmoide).' },
    ],
    conduta: [
      { name: 'Jejum e hidratação venosa', tag: 'jejum', effect: 6, stabilize: 1, msg: 'Paciente preparado para a cirurgia.' },
      { name: 'Analgesia (inclusive opioide)', tag: 'analg', effect: 6, msg: 'Analgesia NÃO mascara o diagnóstico. Não deixe o paciente com dor!' },
      { name: 'Antibiótico IV', tag: 'atb', effect: 8, stabilize: 2, msg: 'Cobertura para gram-negativos e anaeróbios (ex.: ceftriaxona + metronidazol).' },
      { name: 'Apendicectomia', tag: 'cir', effect: 30, stabilize: 3,
        requires: [{ tag: '__dx', msg: 'O cirurgião pergunta: "Qual o diagnóstico?" Defina antes de indicar cirurgia.', dmg: 0 }],
        msg: 'Videolaparoscopia sem intercorrências. Apêndice inflamado retirado!' },
      { name: 'Alta com antiespasmódico', tag: 'alta', effect: -25, msg: 'Alta com abdome agudo? Ele volta dois dias depois com peritonite!' },
    ],
    required: ['atb', 'cir'],
    versions: [
      { id: 'perfurada', note: 'apendicite perfurada com peritonite difusa: ressuscitar, antibiótico e cirurgia sem esperar imagem.',
        intro: ['Homem, 27 anos. Dor abdominal há 3 dias, agora na barriga toda.'],
        stability: 55, decay: 5, par: 6,
        vitals: {
          start: { pas: 96, pad: 58, fc: 124, fr: 24, spo2: 96, temp: 39.0 },
          ok: { pas: 120, pad: 78, fc: 84, fr: 16, spo2: 98, temp: 37.2 },
          crit: { pas: 70, pad: 40, fc: 145, fr: 30, spo2: 92, temp: 39.8 },
        },
        change: {
          'Onde começou a dor?': { a: '"Começou no umbigo, foi pra direita... e ontem espalhou pra barriga toda."' },
          'Descompressão brusca': { a: 'Abdome em tábua, dor à descompressão em todos os quadrantes: peritonite DIFUSA.' },
          'TC de abdome': { effect: -6, orderError: true,
            a: 'Apêndice perfurado com líquido livre... mas peritonite difusa com sinais de sepse indica cirurgia sem precisar de TC. Ela só atrasou.' },
          'Jejum e hidratação venosa': { effect: 12, stabilize: 2, msg: 'Cristaloide para a hipotensão e jejum: ele precisa chegar estável ao centro cirúrgico.' },
        },
        required: ['jejum', 'atb', 'cir'],
        cards: [{ q: 'Apendicite com peritonite difusa, febre e hipotensão. Precisa de TC antes de operar?', a: 'Não: ressuscitar, antibiótico e cirurgia', wrong: ['Sim, sempre', 'Sim, e USG também'],
          why: 'Peritonite difusa é indicação cirúrgica clínica. A imagem só atrasa o controle do foco.' }] },
    ],
    teaching: [
      'Apendicite: dor periumbilical que migra para a fossa ilíaca direita, anorexia, náusea e febre baixa.',
      'Sinais: McBurney, Blumberg (irritação peritoneal), Rovsing, psoas e obturador. O escore de Alvarado ajuda a estratificar.',
      'Diagnóstico pode ser clínico; USG (preferência em jovens, gestantes e crianças) ou TC nos casos duvidosos.',
      'Tratamento: antibiótico + apendicectomia, de preferência videolaparoscópica. Analgesia não mascara o quadro.',
    ],
  },

  // ======================= CASOS DA PRAÇA (aleatórios) =======================
  hipo: {
    id: 'hipo', name: 'Seu Antônio', age: 71,
    pal: { h: '#d0d0d8', s: '#d8a880', w: '#8a5ab0', b: '#6a4090', r: '#8a5ab0', k: '#5a4a3a' },
    encounter: ['Um senhor está sentado no canteiro, suado e confuso. A esposa grita:', '"Socorro! O Antônio não está falando coisa com coisa!"'],
    intro: ['Homem, 71 anos. Confusão mental súbita.'],
    stability: 50, decay: 6, par: 4,
    vitals: {
      start: { pas: 138, pad: 84, fc: 108, fr: 18, spo2: 97, temp: 36.2 },
      ok: { pas: 132, pad: 80, fc: 80, fr: 16, spo2: 97, temp: 36.5 },
      crit: { pas: 150, pad: 90, fc: 124, fr: 10, spo2: 90, temp: 35.8 },
    },
    anamnese: [
      { q: 'O que aconteceu? (esposa)', a: '"Ele aplicou a insulina de manhã e não quis almoçar..."', clue: true },
      { q: 'Doenças? (esposa)', a: '"Diabetes há 20 anos. Também toma glibenclamida."', clue: true },
      { q: 'Bebeu álcool? (esposa)', a: '"Ele não bebe nada há anos."' },
    ],
    fisico: [
      { q: 'Inspeção', a: 'Sudorese profusa, tremores, palidez. Confuso, Glasgow 13.', clue: true },
      { q: 'Exame neurológico', a: 'Sem déficit focal. Pupilas isocóricas e fotorreagentes.' },
    ],
    exames: [
      { q: 'Glicemia capilar', a: 'Glicemia capilar: 38 mg/dL!', clue: true, tag: 'dextro' },
      { q: 'TC de crânio', cost: 2, a: 'Sem alterações agudas. Enquanto isso, a glicose continuou caindo...' },
    ],
    dx: [
      { name: 'Hipoglicemia', ok: true, msg: 'Sintomas adrenérgicos + neuroglicopênicos em diabético com insulina, sulfonilureia e jejum.' },
      { name: 'AVC isquêmico', why: 'Sem déficit focal — e todo rebaixamento ou déficit agudo exige glicemia: hipoglicemia simula AVC!' },
      { name: 'Intoxicação alcoólica', why: 'Não há ingestão nem hálito etílico. E mesmo em etilistas a glicemia deve ser checada.' },
      { name: 'Estado hiperosmolar', why: 'Sudorese e tremor são sinais adrenérgicos típicos de glicose BAIXA, não alta.' },
    ],
    conduta: [
      { name: 'Glicose 50% IV', tag: 'gli', effect: 40, stabilize: 6, msg: '40–60 mL de glicose 50% IV: ele acorda em minutos!' },
      { name: 'Suco de laranja pela boca', tag: 'vo', effect: -10, msg: 'Paciente confuso não protege a via aérea: risco de broncoaspiração! VO só se estiver alerta.' },
      { name: 'Insulina regular', tag: 'ins', effect: -35, msg: 'Insulina em hipoglicemia?! A glicose despenca: convulsão!' },
      { name: 'Observação + soro glicosado', tag: 'obs', effect: 5,
        requires: [{ tag: 'gli', msg: 'Observar sem corrigir a glicemia? Não!', dmg: 5 }],
        msg: 'Com sulfonilureia a hipoglicemia pode voltar: observação prolongada e soro glicosado.' },
    ],
    required: ['gli', 'obs'],
    versions: [
      { id: 'etilista', note: 'etilista e desnutrido: tiamina junto com a glicose, sem atrasá-la.',
        change: {
          'Bebeu álcool? (esposa)': { clue: true, a: '"Bebe cachaça todo dia... e quase não come há semanas."' },
          'Doenças? (esposa)': { a: '"Diabetes. Usa insulina, mas come muito mal."' },
          'Intoxicação alcoólica': { why: 'Ele bebe, mas a glicemia de 38 explica tudo. Em etilista, SEMPRE cheque a glicemia antes de culpar o álcool.' },
          'Observação + soro glicosado': { msg: 'Etilista desnutrido tem pouca reserva de glicogênio: observe e mantenha soro glicosado.' },
        },
        add: { conduta: [
          { name: 'Tiamina IV', tag: 'tiamina', effect: 6, msg: 'Tiamina 100–500 mg IV em etilista desnutrido previne a encefalopatia de Wernicke. Dê junto com a glicose, sem atrasá-la.' },
        ] },
        required: ['gli', 'tiamina', 'obs'],
        cards: [{ q: 'Etilista desnutrido com glicemia de 35 mg/dL e confuso. O que fazer?', a: 'Glicose IV já, com tiamina junto', wrong: ['Tiamina e esperar 30 min para dar glicose', 'Só tiamina IV'],
          why: 'A hipoglicemia mata primeiro: não atrase a glicose. A tiamina vai junto para prevenir Wernicke.' }] },
      { id: 'semveia', note: 'sem acesso venoso: glucagon IM é a alternativa.',
        change: {
          'Glicose 50% IV': { tag: 'tentou', effect: -4,
            msg: 'Veias finas e colabadas: três tentativas sem sucesso, e o tempo passando. Pense numa via que não dependa de veia!' },
          'Observação + soro glicosado': { requires: [{ tag: 'gli', msg: 'Observar sem corrigir a glicemia? Não!', dmg: 5 }],
            msg: 'Glucagon age por pouco tempo: assim que ele acordar, carboidrato VO e observação.' },
        },
        add: { conduta: [
          { name: 'Glucagon 1 mg IM', tag: 'gli', effect: 35, stabilize: 5,
            msg: 'Glucagon IM (ou intranasal) libera o glicogênio do fígado: ele acorda em 10–15 minutos.' },
        ] },
        teaching: ['Sem acesso venoso: glucagon 1 mg IM/SC (ou 3 mg intranasal). Pode falhar em etilistas e desnutridos, sem glicogênio.'],
        cards: [{ q: 'Hipoglicemia grave, paciente rebaixado e sem acesso venoso. Qual a conduta?', a: 'Glucagon 1 mg IM', wrong: ['Suco de laranja pela boca', 'Esperar o acesso central'],
          why: 'Rebaixado não pode receber nada VO. O glucagon IM não depende de veia.' }] },
    ],
    teaching: [
      'Hipoglicemia: glicemia < 70 mg/dL. Tríade de Whipple: sintomas + glicemia baixa + melhora com glicose.',
      'Paciente alerta: 15 g de carboidrato VO e reavaliar em 15 min (regra dos 15). Rebaixado: glicose 50% IV ou glucagon.',
      'Em etilistas e desnutridos, considere tiamina. Hipoglicemia por sulfonilureia exige observação prolongada.',
      'Todo paciente com rebaixamento ou déficit neurológico agudo deve ter a glicemia checada!',
    ],
  },

  asma: {
    id: 'asma', name: 'Júlia', age: 16,
    pal: { h: '#20181a', s: '#a87050', w: '#c04890', b: '#a03070', r: '#c04890', k: '#3a3a58', long: true },
    encounter: ['Uma adolescente está sentada na praça, puxando o ar com dificuldade.', '"Eu... esqueci... a bombinha..."'],
    intro: ['Mulher, 16 anos. Falta de ar há 2 horas.'],
    stability: 55, decay: 6, par: 5,
    vitals: {
      start: { pas: 122, pad: 78, fc: 124, fr: 30, spo2: 89, temp: 36.7 },
      ok: { pas: 115, pad: 72, fc: 92, fr: 18, spo2: 97, temp: 36.7 },
      crit: { pas: 100, pad: 60, fc: 150, fr: 40, spo2: 78, temp: 36.7 },
    },
    anamnese: [
      { q: 'Tem asma?', a: '"Tenho... desde criança. Tô sem a bombinha faz uma semana."', clue: true },
      { q: 'O que desencadeou?', a: '"Fizeram uma faxina com muita poeira lá em casa..."', clue: true },
      { q: 'Já foi intubada?', a: '"Nunca. Mas já internei uma vez."' },
    ],
    fisico: [
      { q: 'Inspeção', a: 'Uso de musculatura acessória. Fala só frases curtas.', clue: true },
      { q: 'Ausculta pulmonar', a: 'Sibilos expiratórios difusos bilaterais, expiração prolongada.', clue: true },
      { q: 'Pele', a: 'Sem urticária ou angioedema.' },
    ],
    exames: [
      { q: 'Pico de fluxo (PFE)', a: 'PFE 40% do previsto: exacerbação grave.', clue: true },
      { q: 'Raio-X de tórax', cost: 2, a: 'Hiperinsuflação, sem pneumotórax ou consolidação. Útil só se houver suspeita de complicação.' },
    ],
    dx: [
      { name: 'Exacerbação grave de asma', ok: true, msg: 'Asmática sem tratamento + gatilho + sibilância difusa + PFE 40%.' },
      { name: 'Anafilaxia', why: 'Sem urticária, angioedema, hipotensão ou exposição a alimento/medicamento.' },
      { name: 'Pneumonia', why: 'Sem febre e sem crepitações localizadas: sibilância difusa aponta broncoespasmo.' },
      { name: 'Pneumotórax', why: 'O murmúrio está presente nos dois lados, com sibilos difusos.' },
    ],
    conduta: [
      { name: 'Salbutamol inalatório', tag: 'saba', effect: 22, stabilize: 3, msg: 'Beta-2 de curta ação: 4–10 jatos com espaçador a cada 20 min na 1ª hora.' },
      { name: 'Associar ipratrópio', tag: 'ipra', effect: 8, stabilize: 1, msg: 'Na crise grave, associar ipratrópio reduz internações.' },
      { name: 'Corticoide sistêmico', tag: 'cort', effect: 6, stabilize: 2, msg: 'Prednisona VO na 1ª hora: age em horas, mas reduz recaídas.' },
      { name: 'Oxigênio (alvo 93–95%)', tag: 'o2', effect: 6, msg: 'O2 titulado para SpO2 93–95% em adolescentes e adultos.' },
      { name: 'Sedativo para acalmar', tag: 'sed', effect: -25, msg: 'Sedativos são contraindicados na crise: deprimem o drive respiratório!' },
    ],
    required: ['saba', 'cort'],
    versions: [
      { id: 'silencioso', note: 'crise com risco de vida (tórax silencioso): magnésio IV e preparo para via aérea.',
        stability: 40, decay: 8,
        vitals: {
          start: { pas: 108, pad: 70, fc: 138, fr: 34, spo2: 85, temp: 36.7 },
          ok: { pas: 115, pad: 72, fc: 96, fr: 20, spo2: 96, temp: 36.7 },
          crit: { pas: 85, pad: 50, fc: 50, fr: 8, spo2: 70, temp: 36.7 },
        },
        change: {
          'Inspeção': { a: 'Exausta, sonolenta, fala só palavras soltas. Cianose labial.' },
          'Ausculta pulmonar': { a: 'Murmúrio quase inaudível, quase sem sibilos: TÓRAX SILENCIOSO! O ar quase não entra.' },
          'Pico de fluxo (PFE)': { a: 'Não consegue soprar: crise com risco de vida. Não insista no exame!', effect: -3 },
        },
        add: { conduta: [
          { name: 'Sulfato de magnésio IV', tag: 'mg', effect: 14, stabilize: 2, msg: '2 g IV em 20 minutos: broncodilatador na crise grave que não responde ao tratamento inicial.' },
        ] },
        required: ['saba', 'cort', 'mg'],
        teaching: ['Tórax silencioso não é melhora: é ar que não entra. Sonolência e bradicardia anunciam parada.'],
        cards: [{ q: 'Asmática sonolenta, com tórax silencioso e SpO2 85%. O que esse "silêncio" significa?', a: 'Crise com risco de vida', wrong: ['Melhora do broncoespasmo', 'Pneumotórax'],
          why: 'Quase não há fluxo de ar para gerar sibilo. Salbutamol, ipratrópio, corticoide, magnésio IV e preparo para via aérea.' }] },
    ],
    teaching: [
      'Crise grave: fala em frases curtas, uso de musculatura acessória, FR > 30, SpO2 < 90%, PFE ≤ 50%.',
      'Tratamento: salbutamol a cada 20 min + ipratrópio na crise grave + corticoide sistêmico na 1ª hora + O2 alvo 93–95%.',
      'Alarme: tórax silencioso, cianose, confusão, bradicardia. Sulfato de magnésio IV nas graves refratárias.',
      'Na alta: corticoide inalatório de manutenção (GINA: nunca SABA isolado).',
    ],
  },

  avc: {
    id: 'avc', name: 'Dona Lurdes', age: 67,
    pal: { h: '#b8b8c0', s: '#f0c8a8', w: '#e888a0', b: '#c86880', r: '#e888a0', k: '#4a4a5a', long: true },
    encounter: ['Uma senhora está no canteiro com o rosto torto. A filha corre até você:', '"Ela não consegue mexer o braço! E a fala tá enrolada!"'],
    intro: ['Mulher, 67 anos. Fraqueza e fala alterada há 1 hora.'],
    stability: 65, decay: 4, par: 7,
    vitals: {
      start: { pas: 172, pad: 96, fc: 92, fr: 18, spo2: 96, temp: 36.6 },
      ok: { pas: 160, pad: 90, fc: 80, fr: 16, spo2: 97, temp: 36.6 },
      crit: { pas: 200, pad: 110, fc: 110, fr: 24, spo2: 90, temp: 36.6 },
    },
    anamnese: [
      { q: 'Quando começou? (filha)', a: '"Ela estava normal às 14h. Às 14h40 a boca entortou. Faz uma hora."', clue: true },
      { q: 'Doenças? (filha)', a: '"Pressão alta e fibrilação atrial. Parou o anticoagulante por conta própria."', clue: true },
      { q: 'Caiu? Convulsionou?', a: '"Não caiu e não teve convulsão."' },
      { q: 'Cirurgia ou sangramento recente?', a: '"Nada disso."' },
    ],
    fisico: [
      { q: 'Escala de Cincinnati', a: 'Desvio de rima labial, queda do braço direito e fala alterada.', clue: true },
      { q: 'NIHSS', a: 'NIHSS 12: hemiparesia direita e afasia. Território da ACM esquerda.', clue: true },
      { q: 'Pulso', a: 'Pulso irregularmente irregular: fibrilação atrial.' },
    ],
    exames: [
      { q: 'Glicemia capilar', a: '112 mg/dL. Hipoglicemia descartada.', tag: 'dextro' },
      { q: 'TC de crânio sem contraste', a: 'Sem sangramento. ASPECTS 9.', clue: true, tag: 'tc' },
      { q: 'AngioTC de vasos', a: 'Oclusão do segmento M1 da artéria cerebral média esquerda.', tag: 'angio' },
      { q: 'Coagulograma', a: 'INR 1,0. Plaquetas 230 mil.' },
    ],
    dx: [
      { name: 'AVC isquêmico', ok: true, msg: 'Déficit focal súbito, TC sem sangue; provável cardioembolia por FA sem anticoagulação.',
        needs: { tag: 'tc', msg: 'Sem neuroimagem não dá para diferenciar AVC isquêmico de hemorrágico!' } },
      { name: 'AVC hemorrágico', why: 'A TC sem contraste não mostra sangramento.' },
      { name: 'Hipoglicemia', why: 'Sempre checar! Mas a glicemia é normal e o déficit persiste.' },
      { name: 'Paralisia de Todd', why: 'Não houve crise convulsiva.' },
    ],
    conduta: [
      { name: 'Trombólise IV', tag: 'trombo', effect: 25, stabilize: 3,
        requires: [
          { tag: 'tc', msg: 'Trombolisar sem TC?! Se for hemorrágico, é catastrófico!', dmg: 35 },
          { tag: 'dextro', msg: 'Falta a glicemia: hipoglicemia simula AVC e precisa ser excluída antes da trombólise.', dmg: 0 },
        ],
        msg: 'Alteplase 0,9 mg/kg (ou tenecteplase) dentro de 4,5 h do início. Ela já mexe os dedos!' },
      { name: 'Trombectomia mecânica', tag: 'tromb', effect: 25, stabilize: 3,
        requires: [{ tag: 'angio', msg: 'Sem angioTC, não sabemos se há oclusão de grande vaso para trombectomia.', dmg: 0 }],
        msg: 'Oclusão de M1 recanalizada! Trombectomia indicada em oclusão de grande vaso.' },
      { name: 'Baixar PA para 120/80', tag: 'pa', effect: -15, msg: 'Queda agressiva da PA reduz o fluxo na penumbra! Alvo pré-trombólise: < 185/110 — ela já está.' },
      { name: 'AAS 300 mg agora', tag: 'aas', effect: -8, msg: 'Não! Se for trombolisar, antiagregante só após 24 h e TC de controle.' },
    ],
    required: ['trombo', 'tromb'],
    versions: [
      { id: 'acordou', note: 'acordou com o déficit: fora da janela de trombólise, mas a trombectomia ainda vale.',
        change: {
          'Quando começou? (filha)': { a: '"Ela foi dormir bem às 22h e acordou assim às 6h. Faz uma hora que vimos."' },
          'Trombólise IV': { effect: -22,
            msg: 'A última vez em que ela foi vista bem foi há 9 horas: fora da janela de 4,5 h. Sem RM com mismatch DWI-FLAIR, trombólise só aumenta o risco de sangramento!' },
          'Trombectomia mecânica': { msg: 'Oclusão de M1 com pouca área infartada: trombectomia indicada até 24 h em casos selecionados.' },
        },
        required: ['tromb'],
        teaching: ['O relógio do AVC começa na última vez em que a pessoa foi vista BEM, não quando o déficit foi notado.'],
        cards: [{ q: 'Acordou com hemiparesia; foi vista bem há 9 h. Oclusão de M1 na angioTC. Conduta?', a: 'Trombectomia mecânica', wrong: ['Trombólise IV', 'Só AAS e observar'],
          why: 'Fora da janela de trombólise, mas oclusão de grande vaso pode ir para trombectomia até 24 h.' }] },
      { id: 'varfarina', note: 'ela usa varfarina com INR 2,8: trombólise contraindicada.',
        change: {
          'Doenças? (filha)': { a: '"Pressão alta e fibrilação atrial. Toma varfarina direitinho."' },
          'Coagulograma': { clue: true, tag: 'coag', a: 'INR 2,8: anticoagulada! Plaquetas 230 mil.' },
          'Trombólise IV': { effect: -25, requires: [],
            msg: 'INR > 1,7 contraindica trombólise: risco alto de hemorragia intracraniana!' },
        },
        required: ['tromb'],
        cards: [{ q: 'AVC isquêmico há 1 h em uso de varfarina, INR 2,8. Pode trombolisar?', a: 'Não: INR > 1,7 contraindica', wrong: ['Sim, se a TC for normal', 'Sim, com dose reduzida'],
          why: 'Com INR > 1,7, a trombólise IV é contraindicada. Oclusão de grande vaso ainda pode ir para trombectomia.' }] },
    ],
    teaching: [
      'AVC: déficit neurológico focal súbito. Anote o horário em que a pessoa foi vista normal pela última vez.',
      'Glicemia e TC de crânio sem contraste são obrigatórias antes da trombólise. PA deve estar < 185/110.',
      'Trombólise IV até 4,5 h. Oclusão de grande vaso: trombectomia (até 24 h em casos selecionados).',
      'Após trombólise, antiagregante só depois de 24 h. Na FA, planejar anticoagulação para prevenção secundária.',
    ],
  },

  // ======================= CASOS NOVOS (história) =======================
  sincope: {
    id: 'sincope', name: 'Bruno', age: 22,
    pal: { h: '#3a2a1a', s: '#e8b88c', w: '#50a0d0', b: '#3880b0', r: '#50a0d0', k: '#3a3a48' },
    encounter: ['Um rapaz caiu no meio da trilha! Um amigo acena:', '"Ele desmaiou do nada! Ajuda aqui!"'],
    intro: ['Homem, 22 anos. Desmaio há poucos minutos.'],
    stability: 75, decay: 2, par: 5,
    vitals: {
      start: { pas: 102, pad: 64, fc: 58, fr: 16, spo2: 98, temp: 36.5 },
      ok: { pas: 118, pad: 74, fc: 72, fr: 14, spo2: 98, temp: 36.5 },
      crit: { pas: 70, pad: 40, fc: 40, fr: 12, spo2: 94, temp: 36.3 },
    },
    anamnese: [
      { q: 'O que aconteceu?', a: '"Fui tirar sangue... vi a agulha, senti calor, a vista escureceu e apaguei."', clue: true },
      { q: 'Sentiu algo antes?', a: '"Enjoo, suor frio e um zumbido... uns segundos antes."', clue: true },
      { q: 'Dor no peito ou palpitação?', a: '"Nada disso. E não foi fazendo esforço."', clue: true },
      { q: 'Família com morte súbita?', a: '"Não. E eu já desmaiei antes vendo sangue."' },
    ],
    fisico: [
      { q: 'Inspeção', a: 'Pálido e sudoreico, recuperou a consciência em segundos. Sem mordedura de língua nem liberação esfincteriana.', clue: true },
      { q: 'Ausculta cardíaca', a: 'Bulhas rítmicas, um pouco bradicárdicas, sem sopros.' },
      { q: 'Exame neurológico', a: 'Orientado, sem déficits focais.' },
    ],
    exames: [
      { q: 'ECG', a: 'Bradicardia sinusal leve. Sem pré-excitação, QT normal, sem padrão de Brugada.', tag: 'ecg', clue: true },
      { q: 'Glicemia capilar', a: '92 mg/dL.' },
      { q: 'TC de crânio', cost: 2, a: 'Normal. Exame desnecessário numa síncope típica, sem trauma ou déficit.' },
    ],
    dx: [
      { name: 'Síncope vasovagal', ok: true, msg: 'Gatilho emocional + pródromo autonômico + recuperação rápida e completa + ECG normal.' },
      { name: 'Crise convulsiva', why: 'Na crise há abalos prolongados, mordedura lateral de língua, liberação esfincteriana e confusão pós-ictal.' },
      { name: 'Síncope cardíaca (arritmia)', why: 'Costuma ser súbita, sem pródromo, ao esforço ou deitado, com ECG alterado ou história familiar de morte súbita.' },
      { name: 'Hipoglicemia', why: 'Glicemia normal e recuperação espontânea em segundos.' },
    ],
    conduta: [
      { name: 'Deitar e elevar as pernas', tag: 'pernas', effect: 20, stabilize: 2, msg: 'Aumenta o retorno venoso: PA e FC se recuperam.' },
      { name: 'Orientar e liberar', tag: 'orienta', effect: 10,
        requires: [{ tag: 'ecg', msg: 'Antes de liberar uma síncope, faça o ECG para afastar causa cardíaca!', dmg: 0 }],
        msg: 'Hidratação, evitar gatilhos e manobras de contrapressão (cruzar as pernas, apertar as mãos) ao sentir o pródromo.' },
      { name: 'Atropina IV', tag: 'atropina', effect: -8, msg: 'A bradicardia vasovagal é transitória e melhora deitando o paciente. Atropina é desnecessária.' },
      { name: 'Internar para investigação', tag: 'internar', effect: -5, msg: 'Síncope vasovagal típica, ECG normal, sem sinais de alarme: baixo risco. Internar não traz benefício.' },
    ],
    required: ['pernas', 'orienta'],
    versions: [
      { id: 'qtlongo', note: 'síncope ao esforço, sem pródromo, com QT longo: é cardíaca e precisa de internação.',
        change: {
          'O que aconteceu?': { a: '"Tava correndo no treino e apaguei do nada."' },
          'Sentiu algo antes?': { a: '"Nada. Foi de repente, sem aviso nenhum."' },
          'Dor no peito ou palpitação?': { a: '"Senti o coração disparar um segundo antes de cair."' },
          'Família com morte súbita?': { clue: true, a: '"Meu tio morreu dormindo, com 30 anos..."' },
          'ECG': { a: 'QT corrigido de 520 ms: QT LONGO!' },
          'Síncope vasovagal': { ok: false, msg: undefined, why: 'Não houve gatilho nem pródromo, foi ao esforço, com palpitação, morte súbita na família e QT longo.' },
          'Síncope cardíaca (arritmia)': { ok: true, msg: 'Síncope ao esforço, sem pródromo, com palpitação, história familiar de morte súbita e QT longo: arritmia até prova em contrário.' },
          'Orientar e liberar': { effect: -25, msg: 'Liberar uma síncope de alto risco?! Ele pode ter morte súbita no próximo treino.' },
          'Internar para investigação': { effect: 15, stabilize: 2, msg: 'Síncope com sinais de alarme: monitorização contínua, internação e avaliação do cardiologista.' },
          'Atropina IV': { msg: 'Atropina não tem papel aqui: o problema é o QT longo, não bradicardia vagal.' },
        },
        add: { conduta: [
          { name: 'Monitorização cardíaca contínua', tag: 'monitor', effect: 8, stabilize: 1, msg: 'No QT longo, o risco é torsades de pointes. Corrija potássio e magnésio e evite drogas que prolongam o QT.' },
        ] },
        required: ['monitor', 'internar'],
        cards: [{ q: 'Jovem desmaia correndo, sem pródromo, com palpitação antes. Qual a conduta?', a: 'Internar e monitorizar: síncope de alto risco', wrong: ['Orientar e liberar', 'Pedir TC de crânio e liberar'],
          why: 'Síncope ao esforço, sem pródromo ou com palpitação é sinal de alarme de causa cardíaca.' }] },
    ],
    teaching: [
      'Síncope: perda transitória da consciência por hipoperfusão cerebral, com recuperação espontânea e completa.',
      'Vasovagal: gatilho (dor, sangue, ficar muito tempo em pé) + pródromo (calor, náusea, sudorese, escurecimento visual).',
      'Todo paciente com síncope precisa de ECG. Alarme: síncope ao esforço ou deitado, sem pródromo, palpitação, cardiopatia, morte súbita na família.',
      'Tratamento: deitar com pernas elevadas e orientar sobre gatilhos e manobras de contrapressão.',
    ],
  },

  eap: {
    id: 'eap', name: 'Dona Ivone', age: 72,
    pal: { h: '#e0e0e8', s: '#e8b890', w: '#5a8a5a', b: '#3a6a3a', r: '#5a8a5a', k: '#4a4a5a', long: true },
    encounter: ['Uma senhora está sentada, puxando o ar com força. A neta grita:', '"Ela não consegue deitar! Diz que está se afogando!"'],
    intro: ['Mulher, 72 anos. Falta de ar súbita há 1 hora.'],
    stability: 50, decay: 7, par: 5,
    vitals: {
      start: { pas: 210, pad: 118, fc: 118, fr: 34, spo2: 84, temp: 36.6 },
      ok: { pas: 150, pad: 88, fc: 92, fr: 20, spo2: 95, temp: 36.6 },
      crit: { pas: 90, pad: 50, fc: 140, fr: 40, spo2: 70, temp: 36.4 },
    },
    anamnese: [
      { q: 'O que está sentindo?', a: '"Falta de ar... não consigo deitar... parece que vou me afogar."', clue: true },
      { q: 'Doenças e remédios?', a: '"Pressão alta e coração fraco. Parei os remédios porque acabaram..."', clue: true },
      { q: 'Está tossindo?', a: '"Uma espuma rosada..."', clue: true },
      { q: 'Dor no peito?', a: '"Não, só a falta de ar."' },
    ],
    fisico: [
      { q: 'Inspeção', a: 'Sentada, ortopneica, sudoreica, usando musculatura acessória.', clue: true },
      { q: 'Ausculta pulmonar', a: 'Estertores crepitantes bilaterais até os ápices.', clue: true },
      { q: 'Ausculta cardíaca', a: 'Taquicárdica, com B3.' },
      { q: 'Membros inferiores', a: 'Edema 2+/4+ bilateral.' },
    ],
    exames: [
      { q: 'USG pulmonar', a: 'Múltiplas linhas B bilaterais: síndrome intersticial (congestão).', clue: true },
      { q: 'ECG', a: 'Taquicardia sinusal e sobrecarga de VE. Sem supra de ST.' },
      { q: 'Raio-X de tórax', cost: 2, a: 'Congestão peri-hilar em "asa de borboleta" e cardiomegalia.', clue: true },
      { q: 'BNP', cost: 2, a: 'BNP muito elevado.' },
    ],
    dx: [
      { name: 'Edema agudo de pulmão (hipertensivo)', ok: true, msg: 'Ortopneia, crepitantes difusos, escarro róseo, PA muito alta e insuficiência cardíaca sem tratamento.' },
      { name: 'Pneumonia grave', why: 'Sem febre, com crepitantes difusos, B3 e PA muito alta: é congestão, não infecção.' },
      { name: 'Crise de asma', why: 'Asma dá sibilos, não crepitantes até os ápices com B3 e escarro róseo.' },
      { name: 'Tromboembolismo pulmonar', why: 'TEP não causa congestão difusa nem escarro róseo, e a PA costuma cair, não subir.' },
    ],
    conduta: [
      { name: 'Sentar, pernas pendentes e O2', tag: 'o2', effect: 6, msg: 'Diminui o retorno venoso e melhora a oxigenação.' },
      { name: 'VNI (CPAP/BiPAP)', tag: 'vni', effect: 20, stabilize: 3, msg: 'Ventilação não invasiva: reduz o trabalho respiratório e a pré e pós-carga. Muda o desfecho!' },
      { name: 'Nitrato IV', tag: 'nitrato', effect: 18, stabilize: 2, msg: 'Vasodilatador de escolha no EAP hipertensivo: reduz pré e pós-carga.' },
      { name: 'Furosemida IV', tag: 'furo', effect: 10, stabilize: 1, msg: 'Diurético de alça: alivia a congestão.' },
      { name: 'Hidratação venosa vigorosa', tag: 'sf', effect: -25, msg: 'Volume num pulmão já encharcado! A saturação despenca.' },
      { name: 'Intubação imediata', tag: 'iot', effect: -8, msg: 'Paciente consciente e colaborativa: tente VNI primeiro. Intube se falhar ou houver rebaixamento.' },
    ],
    required: ['vni', 'nitrato'],
    teaching: [
      'EAP: dispneia súbita, ortopneia, crepitantes difusos, escarro róseo e hipoxemia. No hipertensivo, a PA está muito alta.',
      'Tratamento: sentar, O2, VNI precoce, nitrato IV e diurético de alça.',
      'Evite volume. Nitrato é contraindicado com PAS < 90 ou uso de inibidor de PDE-5.',
      'Procure o gatilho: crise hipertensiva, isquemia, arritmia, má adesão, infecção.',
    ],
  },

  sepse: {
    id: 'sepse', name: 'Dona Cida', age: 68,
    pal: { h: '#5a4a4a', s: '#d8a070', w: '#d8c060', b: '#b8a040', r: '#d8c060', k: '#5a4a3a', long: true },
    encounter: ['Uma senhora está febril e confusa no banco. O filho pede ajuda:', '"Ela está estranha, quente e não fala direito!"'],
    intro: ['Mulher, 68 anos. Febre e confusão mental desde hoje.'],
    stability: 50, decay: 6, par: 6,
    vitals: {
      start: { pas: 82, pad: 44, fc: 124, fr: 26, spo2: 93, temp: 38.9 },
      ok: { pas: 118, pad: 70, fc: 90, fr: 18, spo2: 96, temp: 37.4 },
      crit: { pas: 55, pad: 28, fc: 150, fr: 34, spo2: 86, temp: 39.6 },
    },
    anamnese: [
      { q: 'O que aconteceu? (filho)', a: '"Ela tinha ardência pra urinar há 3 dias... hoje ficou confusa e com febre."', clue: true },
      { q: 'Doenças? (filho)', a: '"Diabetes. Toma metformina."' },
      { q: 'Alergias? (filho)', a: '"Nenhuma que eu saiba."' },
    ],
    fisico: [
      { q: 'Estado geral', a: 'Confusa (Glasgow 14), pele quente, livedo nos joelhos, enchimento capilar de 4 segundos.', clue: true },
      { q: 'Punho-percussão lombar', a: 'Giordano positivo à direita.', clue: true },
      { q: 'Ausculta pulmonar', a: 'Sem crepitações.' },
    ],
    exames: [
      { q: 'Lactato', a: 'Lactato 4,6 mmol/L: hipoperfusão!', clue: true },
      { q: 'Hemoculturas (2 pares)', a: 'Colhidas antes do antibiótico. Resultado em 48–72 h.', tag: 'hemocultura' },
      { q: 'Urina tipo 1', a: 'Leucocitúria, nitrito positivo, bacteriúria.', clue: true },
      { q: 'Hemograma e creatinina', a: 'Leucocitose de 21 mil; creatinina 2,1 (lesão renal aguda).' },
    ],
    dx: [
      { name: 'Choque séptico (foco urinário)', ok: true, msg: 'Infecção + disfunção orgânica + hipotensão e lactato alto apesar do volume: choque séptico.' },
      { name: 'Cetoacidose diabética', why: 'O quadro é febril, com foco urinário e hipotensão; CAD teria hiperglicemia importante e acidose cetótica.' },
      { name: 'AVC', why: 'A confusão aqui é encefalopatia séptica, sem déficit focal.' },
      { name: 'Choque cardiogênico', why: 'Pele quente, febre e foco infeccioso indicam choque distributivo, não falha de bomba.' },
    ],
    conduta: [
      { name: 'Cristaloide 30 mL/kg', tag: 'volume', effect: 15, stabilize: 2, msg: 'Ressuscitação volêmica nas primeiras 3 horas, reavaliando a resposta.' },
      { name: 'Antibiótico IV amplo espectro', tag: 'atb', effect: 18, stabilize: 3,
        requires: [{ tag: 'hemocultura', msg: 'Colha as hemoculturas antes — mas rápido, sem atrasar o antibiótico!', dmg: 0 }],
        msg: 'Na primeira hora! Cada hora de atraso aumenta a mortalidade.' },
      { name: 'Noradrenalina', tag: 'nora', effect: 15, stabilize: 2,
        requires: [{ tag: 'volume', msg: 'Comece o volume; associe noradrenalina se a PAM seguir < 65.', dmg: 0 }],
        msg: 'Vasopressor de 1ª escolha. Meta: PAM ≥ 65 mmHg.' },
      { name: 'Dopamina', tag: 'dopa', effect: -8, msg: 'Dopamina causa mais arritmias que noradrenalina. Não é a primeira escolha.' },
      { name: 'Aguardar a urocultura', tag: 'aguardar', effect: -20, msg: 'Esperar cultura para tratar sepse? O antibiótico é na primeira hora!' },
    ],
    required: ['volume', 'atb', 'nora'],
    versions: [
      { id: 'obstrucao', note: 'pielonefrite com rim obstruído por cálculo: desobstruir é parte do tratamento.',
        change: {
          'O que aconteceu? (filho)': { a: '"Ela teve uma dor forte nas costas, do lado direito, que ia pra virilha... hoje ficou confusa e com febre."' },
        },
        add: {
          exames: [{ q: 'USG de rins e vias urinárias', tag: 'usg', clue: true,
            a: 'Hidronefrose à direita com cálculo de 1 cm no ureter proximal: pielonefrite OBSTRUTIVA!' }],
          conduta: [{ name: 'Desobstrução urgente (duplo J ou nefrostomia)', tag: 'foco', effect: 15, stabilize: 3,
            requires: [{ tag: 'usg', msg: 'Desobstruir o quê? Primeiro confirme a obstrução com a USG.', dmg: 0 }],
            msg: 'Controle do foco: um rim obstruído e infectado não melhora só com antibiótico.' }],
        },
        required: ['volume', 'atb', 'nora', 'foco'],
        cards: [{ q: 'Choque séptico urinário com hidronefrose e cálculo no ureter. Além de antibiótico, o quê?', a: 'Desobstrução urgente (duplo J ou nefrostomia)', wrong: ['Litotripsia eletiva depois da alta', 'Só esperar o antibiótico agir'],
          why: 'Infecção atrás de uma obstrução é abscesso fechado: sem drenar, o antibiótico não basta.' }] },
    ],
    teaching: [
      'Sepse: infecção com disfunção orgânica. Choque séptico: vasopressor para PAM ≥ 65 e lactato > 2 apesar de volume adequado.',
      'Primeira hora: lactato, hemoculturas antes do antibiótico, antibiótico de amplo espectro, 30 mL/kg de cristaloide se hipotensão ou lactato ≥ 4, noradrenalina se PAM < 65.',
      'Noradrenalina é o vasopressor de 1ª escolha. Controle o foco (aqui: avaliar obstrução urinária).',
      'Reavalie a perfusão (lactato, enchimento capilar, diurese) com frequência.',
    ],
  },

  tep: {
    id: 'tep', name: 'Larissa', age: 34,
    pal: { h: '#e0c060', s: '#f2c8a0', w: '#6a6ad0', b: '#4a4ab0', r: '#6a6ad0', k: '#303048', long: true },
    encounter: ['Uma moça com uma mochila de viagem para, ofegante:', '"Me faltou o ar de repente... e dói pra respirar!"'],
    intro: ['Mulher, 34 anos. Falta de ar súbita há 2 horas.'],
    stability: 55, decay: 6, par: 6,
    vitals: {
      start: { pas: 100, pad: 64, fc: 124, fr: 28, spo2: 88, temp: 37.2 },
      ok: { pas: 118, pad: 74, fc: 88, fr: 18, spo2: 96, temp: 36.9 },
      crit: { pas: 70, pad: 40, fc: 145, fr: 36, spo2: 78, temp: 37.0 },
    },
    anamnese: [
      { q: 'O que sentiu?', a: '"Falta de ar de repente, e uma dor no peito que piora quando respiro fundo."', clue: true },
      { q: 'Viagens, cirurgias, hormônios?', a: '"Voltei ontem de 20 horas de ônibus. E tomo anticoncepcional."', clue: true },
      { q: 'Inchaço nas pernas?', a: '"A panturrilha esquerda está inchada e doída desde a viagem."', clue: true },
      { q: 'Tosse com sangue?', a: '"Hoje saiu um rajado de sangue."' },
    ],
    fisico: [
      { q: 'Membros inferiores', a: 'Panturrilha esquerda edemaciada, empastada e dolorosa.', clue: true },
      { q: 'Ausculta pulmonar', a: 'Murmúrio presente bilateralmente, sem ruídos adventícios.' },
      { q: 'Ausculta cardíaca', a: 'Taquicardia, B2 hiperfonética em foco pulmonar.' },
    ],
    exames: [
      { q: 'ECG', a: 'Taquicardia sinusal e padrão S1Q3T3.' },
      { q: 'Gasometria arterial', a: 'Hipoxemia com hipocapnia (alcalose respiratória).' },
      { q: 'D-dímero', a: 'Elevado. Ele serve para EXCLUIR quando a probabilidade é baixa; aqui ela é alta: vá para a angioTC.' },
      { q: 'AngioTC de tórax', cost: 2, a: 'Falhas de enchimento em artérias pulmonares segmentares bilaterais.', clue: true, tag: 'angio' },
      { q: 'Ecocardiograma à beira-leito', a: 'VD levemente dilatado, sem sinais de choque.' },
    ],
    dx: [
      { name: 'Tromboembolismo pulmonar', ok: true, msg: 'Probabilidade alta (TVP clínica, taquicardia, imobilização, estrogênio) + angioTC com falhas de enchimento.',
        needs: { tag: 'angio', msg: 'Probabilidade alta... confirme com a angioTC (ela está estável para ir ao exame).' } },
      { name: 'Pneumonia', why: 'Sem febre e sem crepitações; dispneia súbita com fatores de risco para trombose.' },
      { name: 'Pneumotórax', why: 'O murmúrio está presente nos dois lados.' },
      { name: 'Infarto agudo do miocárdio', why: 'A dor é pleurítica, há TVP evidente e o ECG não mostra supra.' },
    ],
    conduta: [
      { name: 'Anticoagulação plena', tag: 'anticoag', effect: 25, stabilize: 4, msg: 'Heparina de baixo peso ou não fracionada. Com alta suspeita, pode começar antes da confirmação.' },
      { name: 'Oxigênio', tag: 'o2', effect: 6, msg: 'O2 para manter SpO2 ≥ 90%.' },
      { name: 'Trombólise sistêmica', tag: 'tromb', effect: -15, msg: 'Trombólise é para TEP de alto risco (hipotensão sustentada). Aqui o risco de sangramento supera o benefício.' },
      { name: 'Furosemida IV', tag: 'furo', effect: -10, msg: 'O VD sobrecarregado depende de pré-carga: diurético pode derrubar a PA.' },
    ],
    required: ['anticoag', 'o2'],
    versions: [
      { id: 'altorisco', note: 'TEP de alto risco (choque): trombólise sistêmica, diagnóstico pelo eco à beira-leito.',
        stability: 45, decay: 8,
        vitals: {
          start: { pas: 76, pad: 44, fc: 136, fr: 32, spo2: 84, temp: 37.0 },
          ok: { pas: 112, pad: 70, fc: 96, fr: 20, spo2: 94, temp: 36.9 },
          crit: { pas: 50, pad: 28, fc: 150, fr: 38, spo2: 72, temp: 36.8 },
        },
        change: {
          'Ecocardiograma à beira-leito': { clue: true, tag: 'eco', a: 'VD muito dilatado e hipocinético, septo retificado: disfunção grave de VD!' },
          'AngioTC de tórax': { effect: -10, orderError: true,
            a: 'Levar uma paciente em choque para a tomografia é arriscado: ela piorou no caminho. O eco à beira-leito já sustenta o diagnóstico.' },
          'Tromboembolismo pulmonar': { msg: 'Alta probabilidade + choque + disfunção de VD no eco: TEP de alto risco.',
            needs: { tag: 'eco', msg: 'Ela está instável demais para a tomografia. Que exame à beira-leito confirma a repercussão?' } },
          'Trombólise sistêmica': { effect: 28, stabilize: 4,
            requires: [{ tag: 'eco', msg: 'Trombolisar sem nenhuma confirmação? Faça o eco à beira-leito antes.', dmg: 0 }],
            msg: 'TEP com hipotensão sustentada: trombólise sistêmica indicada (se não houver contraindicação). A PA sobe!' },
        },
        required: ['anticoag', 'tromb'],
        cards: [{ q: 'Suspeita de TEP, PA 76/44, VD dilatado no eco à beira-leito. Conduta?', a: 'Trombólise sistêmica', wrong: ['Levar à angioTC antes de tratar', 'Só anticoagulação e observar'],
          why: 'TEP de alto risco (choque): trombólise. Instável demais para a tomografia, o eco sustenta o diagnóstico.' }] },
    ],
    teaching: [
      'TEP: dispneia súbita, dor pleurítica, taquicardia e hipoxemia. Procure fatores de risco: imobilização, cirurgia, câncer, estrogênio, TVP.',
      'Estratifique (Wells): baixa probabilidade → D-dímero para excluir; alta → angioTC.',
      'Estável: anticoagulação plena (pode iniciar antes da confirmação se a suspeita for alta). Com hipotensão: trombólise.',
      'S1Q3T3 é clássico, mas pouco sensível: o achado mais comum no ECG é a taquicardia sinusal.',
    ],
  },

  organofosforado: {
    id: 'organofosforado', name: 'Seu Zé', age: 45,
    pal: { h: '#3a2a1a', s: '#b07850', w: '#c8b070', b: '#a89050', r: '#c8b070', k: '#4a5a8a' },
    encounter: ['Um agricultor está caído, babando muito. A esposa chora:', '"Ele passou um tal de \'adubo natural\' e começou a passar mal!"'],
    intro: ['Homem, 45 anos. Mal-estar intenso após trabalhar na lavoura.'],
    stability: 50, decay: 7, par: 5,
    vitals: {
      start: { pas: 92, pad: 58, fc: 48, fr: 30, spo2: 86, temp: 36.4 },
      ok: { pas: 120, pad: 76, fc: 88, fr: 18, spo2: 96, temp: 36.6 },
      crit: { pas: 60, pad: 35, fc: 35, fr: 8, spo2: 72, temp: 36.0 },
    },
    anamnese: [
      { q: 'O que aconteceu? (esposa)', a: '"Ele aplicou um \'adubo natural\' que venderam pra ele, sem luva nem máscara."', clue: true },
      { q: 'Que sintomas? (esposa)', a: '"Babando, vomitando, com diarreia e fazendo xixi sem controle."', clue: true },
      { q: 'Engoliu alguma coisa?', a: '"Não... foi só na lavoura."' },
    ],
    fisico: [
      { q: 'Pupilas', a: 'Mioses puntiformes bilaterais.', clue: true },
      { q: 'Ausculta pulmonar', a: 'Sibilos e roncos difusos, com muita secreção (broncorreia).', clue: true },
      { q: 'Pele e músculos', a: 'Sudorese intensa e fasciculações nos braços.', clue: true },
    ],
    exames: [
      { q: 'Colinesterase', cost: 2, a: 'Atividade muito reduzida. Confirma, mas o tratamento é clínico e imediato.' },
      { q: 'ECG', a: 'Bradicardia sinusal, QT prolongado.' },
      { q: 'Glicemia capilar', a: '110 mg/dL.' },
    ],
    dx: [
      { name: 'Intoxicação por organofosforado', ok: true, msg: 'Síndrome colinérgica: miose, sialorreia, broncorreia, bradicardia, vômitos, diarreia e fasciculações.' },
      { name: 'Intoxicação por opioide', why: 'Opioide dá miose e depressão respiratória, mas não sialorreia, broncorreia, diarreia nem fasciculações.' },
      { name: 'Crise de asma', why: 'Os sibilos vêm da broncorreia colinérgica; miose e fasciculações não ocorrem na asma.' },
      { name: 'Gastroenterite aguda', why: 'Não explica miose, broncorreia, bradicardia e fasciculações.' },
    ],
    conduta: [
      { name: 'Retirar roupas e lavar a pele', tag: 'descont', effect: 8, stabilize: 2, msg: 'Descontaminação, com EPI para a equipe! A absorção foi pela pele.' },
      { name: 'Atropina IV em doses dobradas', tag: 'atropina', effect: 30, stabilize: 4, msg: 'Dobre a dose a cada 5 min até secar o pulmão (alvo: pulmão limpo, FC > 80, PAS > 80).' },
      { name: 'Pralidoxima', tag: 'oxima', effect: 6,
        requires: [{ tag: 'atropina', msg: 'A oxima é adjuvante: comece pela atropina, que trata a broncorreia.', dmg: 0 }],
        msg: 'Reativa a colinesterase. Benefício incerto; use conforme protocolo e orientação do CIATox.' },
      { name: 'Succinilcolina para intubar', tag: 'sux', effect: -20, msg: 'A succinilcolina é metabolizada pela colinesterase: paralisia prolongada! Prefira rocurônio.' },
      { name: 'Lavagem gástrica', tag: 'lavagem', effect: -5, msg: 'A exposição foi pela pele: lavagem não ajuda e atrasa a atropina.' },
    ],
    required: ['descont', 'atropina'],
    teaching: [
      'Organofosforados e carbamatos inibem a acetilcolinesterase: síndrome colinérgica muscarínica + nicotínica.',
      'Muscarínica: salivação, lacrimejamento, micção, diarreia, vômitos, broncorreia, bradicardia e miose. Nicotínica: fasciculações e fraqueza.',
      'Tratamento: descontaminação com EPI, atropina em doses dobradas até secar o pulmão e suporte ventilatório. Oxima como adjuvante.',
      'Evite succinilcolina. Disque-Intoxicação: 0800 722 6001.',
    ],
  },
};
