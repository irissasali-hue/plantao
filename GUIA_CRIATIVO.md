# Plantão — Guia Criativo

Tudo o que você precisa para escrever casos, história e criar a arte e a música do jogo, sem mexer no motor.

> **Regra de ouro:** a parte criativa mora em `content/` e `assets/`. A pasta `js/` é o motor: não precisa tocar nela para criar conteúdo.

---

## Sumário

1. [Onde fica cada coisa](#1-onde-fica-cada-coisa)
2. [A história](#2-a-história)
3. [Personagens](#3-personagens)
4. [O mundo: mapas na ordem da jornada](#4-o-mundo-mapas-na-ordem-da-jornada)
5. [Casos clínicos](#5-casos-clínicos)
6. [Escrevendo história e cenas](#6-escrevendo-história-e-cenas)
7. [Arte](#7-arte)
8. [Música e efeitos sonoros](#8-música-e-efeitos-sonoros)
9. [Biblioteca e material de estudo](#9-biblioteca-e-material-de-estudo)
10. [Como testar](#10-como-testar)
11. [Pontas soltas e ideias](#11-pontas-soltas-e-ideias)

---

## 1. Onde fica cada coisa

| Arquivo | O que você cria ali |
|---|---|
| `content/cases.js` | **Casos clínicos** (as "batalhas"): anamnese, exame físico, exames, hipóteses, condutas, resumo, estudo expandido |
| `content/maps.js` | **Mapas, personagens, treinadores, líderes, vilões e cenas** da história |
| `content/world.js` | Tipos de tile, início da história e a **referência completa da linguagem de roteiro** (no topo do arquivo) |
| `content/team.js` | Membros da equipe, itens, loja, selos e dinheiro inicial |
| `content/library.js` | Tópicos de estudo da biblioteca |
| `content/art.js` | Lista dos PNGs de arte que o jogo deve usar |
| `content/audio.js` | Músicas (arquivo ou escritas em notas) e efeitos sonoros |
| `assets/` | Os arquivos: `chars/`, `portraits/`, `study/`, `music/`, `sfx/` e `tiles.png` |
| `tools/exportar-arte.html` | Gera moldes PNG da arte atual, no tamanho certo, para você pintar por cima |

Os arquivos são JavaScript, mas você só escreve **listas e textos** num formato fixo. Cuidados ao editar:

- Textos vão entre aspas simples: `'assim'`. Se precisar de apóstrofo, use `’` (o tipográfico) em vez de `'`.
- Todo item de lista termina com vírgula.
- Se o jogo abrir com a tela preta depois de uma edição, provavelmente falta uma vírgula, aspa ou chave. Aperte **F12 → Console** no navegador: a mensagem de erro mostra o arquivo e a linha.

---

## 2. A história

### Premissa

No **Vale Sereno**, você é residente recém-chegado(a). Seu preceptor, o **Dr. Hélio**, propõe uma jornada: atravessar o vale, conquistar os **3 Selos** dos Centros de Especialidade e passar pela **Banca do Hospital Central** para se tornar especialista. No caminho, um grupo de charlatões, o **Grupo Cura Milagrosa**, vende curas falsas e deixa vítimas pelo vale.

O tom é de aventura leve, com humor nos personagens e seriedade nos casos. A medicina é sempre a de verdade; o vilão é a desinformação.

### Jornada linear

```
Vila Aurora → Rota 1 → Cidade Ponte → Rota 2 → Porto Azul → Rota 3 → Serra Alta → Hospital Central
  (início)              (Selo 1)              (Selo 2)              (Selo 3)       (Banca + final)
```

#### Ato 1 · O começo (Vila Aurora)

1. **Tela de nome.** O Dr. Hélio se apresenta e pede que você vá à clínica dele.
2. A saída norte da vila fica **bloqueada** até você ter equipe (o Dr. Hélio chama você de volta).
3. **Clínica do Dr. Hélio:** três profissionais esperam. Você escolhe o primeiro membro da sua equipe: **Enf. Bia**, **Farm. Davi** ou **Fisio Lia**.
4. O rival **Caio** chega, pega um dos que sobraram e desafia você no **primeiro caso** (síncope vasovagal). Perder aqui não tem punição.
5. O Dr. Hélio dá 2 Manuais de bolso, 2 Lanches, apresenta o **Atlas Clínico** e manda você para o norte.

#### Ato 2 · Selo da Emergência (Rota 1 e Cidade Ponte)

1. **Rota 1:** primeiro mato alto (casos aleatórios) e os primeiros treinadores (Estudante Pedro, Interna Lara).
2. **Cidade Ponte:** primeiro **Posto de Descanso** (cura a equipe e tem farmácia). Paciente opcional: Marina.
3. O guarda da saída leste **bloqueia a Rota 2** sem o Selo da Emergência.
4. **Centro de Emergência:** Residente Téo e a chefe, **Dra. Rosa** (pneumotórax hipertensivo). Prêmio: **Selo da Emergência** e uma Teleconsulta.
5. **Téc. Nando** (radiologia) entra para a equipe.

#### Ato 3 · Primeiro contato com o vilão (Rota 2)

1. Um **capanga do Grupo Cura Milagrosa** bloqueia a ponte: o "Chá Milagroso para Diabetes" tinha remédio escondido e causou **hipoglicemia**. Vencendo, ele foge e o jogo explica produtos adulterados.
2. Treinadores: Enfermeira Sol (UBS) e Interno Breno.
3. **Segundo duelo com o Caio** (apendicite). Ele avisa sobre o Dr. Otávio.
4. Paciente opcional: Rafael (acidente de moto).

#### Ato 4 · Selo da Cardiologia (Porto Azul)

1. Cidade portuária com **biblioteca** (Dona Iracema). A **Psic. Ana** entra para a equipe.
2. O guarda do norte **bloqueia a Rota 3** sem o Selo da Cardiologia.
3. **Centro de Cardiologia:** residentes Mauro e Igor; chefe **Dr. Otávio** (infarto com supra de ST). Prêmio: **Selo da Cardiologia**.
4. Paciente opcional: Seu Joaquim (infarto).

#### Ato 5 · O gerente do vilão (Rota 3)

1. Subida da serra com rochas e saliências.
2. **Dante, gerente da Cura Milagrosa**, bloqueia o caminho: o "Chá de Ervas Importado" causou **anafilaxia**.
3. Treinadores: Dra. Nina (médica de família) e Alpinista Jorge.

#### Ato 6 · Selo da Endocrinologia e o líder do vilão (Serra Alta)

1. O segurança **bloqueia o Hospital Central** sem os 3 selos.
2. **Centro de Endocrinologia:** Residente Kátia; chefe **Dra. Celeste** (cetoacidose diabética). Prêmio: **Selo da Endocrinologia**.
3. Com os 3 selos, o **Mestre Vito**, líder da Cura Milagrosa, confronta você na porta do hospital: o "Adubo Natural Milagroso" intoxicou um agricultor (**organofosforado**). Vencendo, o grupo é desfeito.
4. Pacientes opcionais: Lucas (cetoacidose) e Paulo (apendicite).

#### Ato 7 · A Banca (Hospital Central)

1. Três examinadores, um caso cada: **Dra. Yara** (AVC), **Dr. Bento** (TEP) e **Dr. Ramos** (edema agudo de pulmão).
2. **Final contra o Caio** (choque séptico).
3. O Dr. Hélio aparece, declara você **ESPECIALISTA**, e rolam os **créditos**.

#### Pós-jogo

- O profissional que sobrou na clínica do Dr. Hélio pode entrar na sua equipe.
- Mato alto, biblioteca e Atlas continuam disponíveis.

### Bloqueios da jornada

| Onde | O que bloqueia | O que libera |
|---|---|---|
| Vila Aurora, saída norte | Dr. Hélio chama você de volta | Ter escolhido a equipe (flag `starter`) |
| Cidade Ponte, saída leste | Guarda | Selo da Emergência |
| Rota 2, ponte | Capanga (desafio obrigatório) | Vencê-lo |
| Porto Azul, saída norte | Guarda | Selo da Cardiologia |
| Rota 3, meio do caminho | Dante (desafio obrigatório) | Vencê-lo |
| Serra Alta, porta do Hospital Central | Segurança | Os 3 selos |
| Serra Alta, porta do Hospital Central | Mestre Vito (desafio obrigatório) | Vencê-lo |
| Banca | Cada examinador | Vencer o anterior |

---

## 3. Personagens

### Protagonista

- **Você.** O nome é escolhido no início. O jogo trata o personagem como "doutor(a)" e usa `{name}` nas falas.
- Visual: jaleco branco, roupa azul e estetoscópio vermelho (sprite `player`).

### Mentor

- **Dr. Hélio:** preceptor experiente e acolhedor, cabelo grisalho (sprite `mentor`). Abre a história, aparece na clínica e volta no final para declarar você especialista.

### Rival

- **Caio:** residente convencido, rápido e competitivo, cabelo ruivo. No fundo respeita você e, no final, admite.
  - Clínica: síncope vasovagal (sem punição se perder).
  - Rota 2: apendicite.
  - Final da Banca: choque séptico.

### Equipe multiprofissional

Cada membro tem uma habilidade usada no comando **EQUIPE** durante o atendimento. A habilidade não gasta turno e tem usos limitados, recuperados no Posto. A cada 2 níveis, o membro ganha +1 uso.

| Membro | Profissão | Habilidade | Efeito | Usos | Como entra |
|---|---|---|---|---|---|
| **Enf. Bia** | Enfermagem | Monitorização | +10 de estabilidade e o paciente piora mais devagar | 2 | Escolha inicial |
| **Farm. Davi** | Farmácia clínica | Dupla checagem | Intercepta a próxima conduta errada, sem dano e sem turno | 1 | Escolha inicial |
| **Fisio Lia** | Fisioterapia | Suporte ventilatório | +15 de estabilidade | 2 | Escolha inicial |
| **Téc. Nando** | Radiologia | Exame expresso | O próximo exame não gasta turno | 2 | Cidade Ponte, depois do 1º selo |
| **Psic. Ana** | Psicologia | Acolhimento | As próximas 2 perguntas de anamnese não gastam turno | 2 | Porto Azul |

Escolha do rival: se você pega a **Bia**, o Caio pega o **Davi**; se pega o **Davi**, ele pega a **Lia**; se pega a **Lia**, ele pega a **Bia**. O terceiro fica na clínica e entra na sua equipe no pós-jogo.

### Chefes dos Centros de Especialidade

| Chefe | Centro | Cidade | Caso | Prêmio |
|---|---|---|---|---|
| **Dra. Rosa** | Emergência | Cidade Ponte | Pneumotórax hipertensivo | Selo da Emergência + Teleconsulta |
| **Dr. Otávio** | Cardiologia | Porto Azul | IAM com supra de ST | Selo da Cardiologia + 3 Cafés |
| **Dra. Celeste** | Endocrinologia | Serra Alta | Cetoacidose diabética | Selo da Endocrinologia + 2 Teleconsultas |

- **Dra. Rosa:** durona e justa, "aqui não tem tempo para hesitar".
- **Dr. Otávio:** "tempo é músculo", lê ECG de olhos fechados.
- **Dra. Celeste:** paciência e precisão, "volume, potássio, insulina, nessa ordem".

### Grupo Cura Milagrosa (vilões)

Vendem produtos "naturais" que fazem mal. Cada confronto é um caso real de dano causado por desinformação.

| Vilão | Onde | Produto falso | Caso |
|---|---|---|---|
| **Capanga** | Rota 2 | "Chá Milagroso para Diabetes" (com remédio escondido) | Hipoglicemia |
| **Dante**, gerente | Rota 3 | "Chá de Ervas Importado" | Anafilaxia |
| **Mestre Vito**, líder | Serra Alta | "Adubo Natural Milagroso" | Intoxicação por organofosforado |

Visual: roupas verdes com detalhes dourados.

### A Banca

| Examinador(a) | Etapa | Caso |
|---|---|---|
| **Dra. Yara** | 1ª, Neurologia | AVC isquêmico |
| **Dr. Bento** | 2ª, Pneumologia | TEP |
| **Dr. Ramos** | 3ª, Emergência cardiovascular | Edema agudo de pulmão |
| **Caio** | Final | Choque séptico |

### Treinadores das rotas e dos Centros

Eles veem você de longe quando você cruza a linha de visão.

| Treinador | Onde | Caso | R$ |
|---|---|---|---|
| Estudante Pedro | Rota 1 | Asma | 120 |
| Interna Lara | Rota 1 | Hipoglicemia | 150 |
| Residente Téo | Centro de Emergência | Anafilaxia | 250 |
| Enfermeira Sol | Rota 2 | Síncope | 200 |
| Interno Breno | Rota 2 | Cetoacidose | 220 |
| Residente Mauro | Centro de Cardiologia | Edema agudo de pulmão | 300 |
| Residente Igor | Centro de Cardiologia | TEP | 300 |
| Dra. Nina | Rota 3 | TEP | 350 |
| Alpinista Jorge | Rota 3 | AVC | 300 |
| Residente Kátia | Centro de Endocrinologia | Hipoglicemia | 350 |

### Pacientes opcionais

Ficam com um "!" sobre a cabeça e dão recompensa quando atendidos.

| Paciente | Onde | Caso | Recompensa |
|---|---|---|---|
| Marina | Cidade Ponte | Anafilaxia | 3 Cafés |
| Rafael | Rota 2 | Pneumotórax | R$ 300 + Lanche |
| Seu Joaquim | Porto Azul | Infarto | R$ 400 + Manual |
| Lucas | Serra Alta | Cetoacidose | Teleconsulta |
| Paulo | Serra Alta | Apendicite | 2 Lanches |

### Coadjuvantes

- **Enf. Clara:** enfermeira dos Postos de Descanso; cura a equipe.
- **Atendente:** farmácia e cantina dos Postos.
- **Dona Iracema:** bibliotecária do Porto Azul.
- **Guardas e Segurança:** bloqueios da jornada.
- **Moradores com dicas:** Dona Neusa, Seu João, Seu Ari, Pescador, Marujo, recepcionistas dos Centros e um residente cansado no Posto.

---

## 4. O mundo: mapas na ordem da jornada

| Mapa (`id`) | Tamanho | Música | Mato alto (casos) | Destaques |
|---|---|---|---|---|
| `vila` Vila Aurora | 24×20 | cidade | — | Casa do jogador, clínica do Dr. Hélio, lago |
| `clinica` | 12×9 | biblioteca | — | Escolha da equipe, 1º duelo com o Caio |
| `rota1` Rota 1 | 20×30 | rota | síncope, hipoglicemia, asma | Saliências, 2 treinadores |
| `ponte` Cidade Ponte | 28×22 | cidade | — | Posto, Centro de Emergência, rio com ponte |
| `gym_emerg` | 14×12 | ginásio | — | Téo e Dra. Rosa |
| `rota2` Rota 2 | 40×16 | rota | asma, anafilaxia, hipoglicemia, síncope | Ponte sobre o rio, capanga, Caio |
| `porto` Porto Azul | 30×24 | cidade | — | Posto, biblioteca, Centro de Cardiologia, cais |
| `biblioteca` | 14×10 | biblioteca | — | Estantes e mesas de estudo |
| `gym_cardio` | 14×12 | ginásio | — | Mauro, Igor e Dr. Otávio |
| `rota3` Rota 3 | 20×34 | rota | AVC, TEP, hipoglicemia, asma | Rochas, saliências, Dante |
| `serra` Serra Alta | 28×22 | cidade | — | Posto, Centro de Endocrinologia, Hospital Central |
| `gym_endo` | 14×12 | ginásio | — | Kátia e Dra. Celeste |
| `central` Hospital Central | 12×18 | ginásio | — | A Banca |
| `posto` | 14×10 | biblioteca | — | Interior compartilhado por todos os Postos |

---

## 5. Casos clínicos

### Os 13 casos atuais e onde aparecem

| id | Paciente | Diagnóstico | Onde aparece |
|---|---|---|---|
| `sincope` | Bruno, 22 | Síncope vasovagal | Caio (clínica), Enf. Sol, mato da Rota 1 e 2 |
| `asma` | Júlia, 16 | Exacerbação grave de asma | Pedro, mato das 3 rotas |
| `hipo` | Seu Antônio, 71 | Hipoglicemia | Lara, Capanga, Kátia, mato das 3 rotas |
| `anafilaxia` | Marina, 24 | Anafilaxia | Téo, Dante, paciente Marina, mato da Rota 2 |
| `pneumo` | Rafael, 32 | Pneumotórax hipertensivo | **Dra. Rosa**, paciente Rafael |
| `apendicite` | Paulo, 27 | Apendicite aguda | Caio (Rota 2), paciente Paulo |
| `cad` | Lucas, 19 | Cetoacidose diabética | Breno, **Dra. Celeste**, paciente Lucas |
| `iam` | Seu Joaquim, 58 | IAM com supra (inferior) | **Dr. Otávio**, paciente Joaquim |
| `eap` | Dona Ivone, 72 | Edema agudo de pulmão | Mauro, **Dr. Ramos** |
| `tep` | Larissa, 34 | TEP | Igor, Nina, **Dr. Bento**, mato da Rota 3 |
| `avc` | Dona Lurdes, 67 | AVC isquêmico | Jorge, **Dra. Yara**, mato da Rota 3 |
| `organofosforado` | Seu Zé, 45 | Intoxicação por organofosforado | **Mestre Vito** |
| `sepse` | Dona Cida, 68 | Choque séptico | **Caio (final)** |

Por enquanto, só dois casos têm **estudo expandido** (`study`); os outros mostram o resumo curto:
- **`iam`**: tem também uma imagem de exame (o ECG).
- **`pneumo`**: foi reescrito a partir de dois artigos do UpToDate e é o caso-modelo de **ordem das ações** (veja abaixo).

### Como um atendimento funciona

- O paciente tem **ESTABILIDADE** (0 a 100). Cada ação gasta 1 turno, ou 2 nos exames marcados "(demora)", e a cada turno o paciente piora `decay` pontos.
- Os sinais vitais mudam junto com a estabilidade, entre os valores `start`, `ok` e `crit`.
- O jogador **vence** quando acerta o diagnóstico **e** faz todas as condutas listadas em `required`.
- O jogador **perde** quando a estabilidade chega a 0.
- **Diagnóstico** só pode ser tentado depois de achar 2 pistas (itens com `clue: true`). Errar custa 6 de estabilidade e 1 turno.
- **Conduta danosa** (`effect` negativo) tira estabilidade e conta como erro.
- **Pré-requisitos** (`requires`): uma conduta pode exigir que algo tenha sido feito antes. Exemplo: insulina sem dosar o potássio causa dano.

### Passo a passo para criar um caso

1. Abra `content/cases.js` e copie um caso parecido com o que você quer.
2. Cole antes do `};` final e troque o `id` e a chave (`meucaso: { id: 'meucaso', ...`). Os dois precisam ser iguais.
3. Preencha os campos com o modelo abaixo.
4. Coloque o caso no jogo: num treinador (`case: 'meucaso'`), no mato alto de uma rota (`encounters.cases`) ou num paciente opcional (`patientQuest`). Veja a [seção 6](#6-escrevendo-história-e-cenas).
5. Teste jogando: ele aparece no **Atlas** depois de visto.

### Modelo comentado

```js
meucaso: {
  id: 'meucaso',                  // igual à chave acima
  name: 'Dona Fulana', age: 60,   // aparece na caixa do paciente
  pal: { h: '#888888', s: '#e0b088', w: '#4a6aa8', b: '#3a5288', r: '#4a6aa8', k: '#3a3a48', long: true },
  //      cabelo         pele          roupa         detalhe       acessório     calça      cabelo comprido

  encounter: ['Texto quando o caso surge no mato alto.', '"Fala de quem pede ajuda."'],
  intro: ['Mulher, 60 anos. Queixa principal há X horas.'],   // abertura do atendimento

  stability: 60,   // estabilidade inicial (mais baixa = mais grave)
  decay: 5,        // quanto piora por turno (2 = leve · 5 = moderado · 8+ = muito grave)
  par: 6,          // nº de turnos "bom"; acima disso o XP diminui

  vitals: {        // PA sistólica/diastólica, FC, FR, SpO2, temperatura
    start: { pas: 100, pad: 60, fc: 110, fr: 24, spo2: 92, temp: 37.0 },  // na chegada
    ok:    { pas: 120, pad: 75, fc: 80,  fr: 16, spo2: 98, temp: 36.8 },  // estabilizado (100)
    crit:  { pas: 60,  pad: 35, fc: 150, fr: 36, spo2: 80, temp: 36.5 },  // colapso (0)
  },

  anamnese: [
    { q: 'Pergunta curta (vira o item do menu)', a: '"Resposta do paciente."', clue: true },
    { q: 'Outra pergunta', a: '"Resposta que não é pista."' },
  ],
  fisico: [
    { q: 'Ausculta pulmonar', a: 'Achado do exame.', clue: true },
  ],
  exames: [
    { q: 'ECG', a: 'Resultado.', clue: true, tag: 'ecg' },               // tag: usada em pré-requisitos
    { q: 'TC de tórax', a: 'Resultado.', cost: 2 },                      // demora 2 turnos
    { q: 'Raio-X', a: 'Resultado.', img: 'assets/study/meu-raiox.png' }, // mostra imagem com o resultado
  ],

  dx: [  // 4 hipóteses: 1 certa e 3 diferenciais com a explicação de por que NÃO são
    { name: 'Diagnóstico certo', ok: true, msg: 'Por que é esse.' },
    { name: 'Diferencial 1', why: 'Por que não é.' },
    { name: 'Diferencial 2', why: 'Por que não é.' },
    { name: 'Diferencial 3', why: 'Por que não é.' },
  ],
  // Opcional na hipótese certa: needs: { tag: 'ecg', msg: 'Sem ECG não dá para fechar.' }

  conduta: [
    { name: 'Conduta essencial', tag: 'chave', effect: 25, stabilize: 3, msg: 'Por que funciona.' },
    { name: 'Conduta com pré-requisito', tag: 'outra', effect: 15,
      requires: [{ tag: 'ecg', msg: 'O que faltou fazer antes.', dmg: 0 }],  // dmg > 0 = tentar sem o pré-requisito machuca
      msg: 'Explicação.' },
    { name: 'Conduta inútil', tag: 'inutil', effect: 0, msg: 'Não faz mal, mas gasta um turno.' },
    { name: 'Conduta danosa', tag: 'erro', effect: -20, msg: 'Por que é perigosa.' },
  ],
  required: ['chave', 'outra'],   // condutas obrigatórias para vencer

  teaching: [                     // resumo curto do fim (3 a 4 frases)
    'Definição e quadro clínico.',
    'Diagnóstico.',
    'Tratamento.',
    'Pegadinha ou alerta.',
  ],

  study: [                        // opcional: estudo expandido, com imagens e texto longo
    { p: 'Resumo do caso.' },
    { h: 'O exame' },
    { img: 'assets/study/meu-raiox.png', caption: 'Legenda.' },
    { list: ['Ponto 1', 'Ponto 2'] },
    { tip: 'Pérola clínica.' },
  ],
},
```

### Termos dos campos

- **`clue`:** marca uma pista. São necessárias 2 para liberar o diagnóstico.
- **`tag`:** um rótulo que outras partes do caso usam como pré-requisito. A tag especial `'__dx'` significa "o diagnóstico já foi feito".
- **`effect`:** quanto a conduta muda a estabilidade; negativo é dano.
- **`stabilize`:** quanto a conduta reduz a piora por turno dali em diante.

### Ordem das ações

Um caso pode cobrar a **sequência** do atendimento, e não só as escolhas. O caso `pneumo` (Rafael) é o exemplo completo; os recursos funcionam em qualquer caso.

**1. Variantes: a mesma ação muda conforme o que já foi feito.**

```js
{ q: 'Raio-X de tórax', cost: 2, repeatable: true, effect: -6, orderError: true,
  a: 'O raio-X demorou... e o paciente quase parou! Instável não espera radiografia.',
  variants: [
    { if: 'dreno', cost: 1, effect: 0, orderError: false, a: 'Pulmão reexpandido, dreno bem posicionado.' },
    { if: 'desc',  cost: 1, effect: 0, orderError: false, a: 'Ainda há pneumotórax: falta drenar!' },
  ] },
```

- A condição olha as `tag`s já feitas **neste atendimento**: `'dreno'`, `'!desc'` (ainda não fez) ou uma lista `['a', '!b']`.
- Vale a **primeira variante cuja condição for verdadeira**. Ela substitui qualquer campo (`a`, `msg`, `effect`, `cost`, `requires`...), então coloque as mais específicas em cima.

**2. Erro de sequência.**
- Uma ação com `orderError: true` e efeito negativo conta como **erro de sequência**, mostrado no fim do caso.
- Numa **conduta**, a ação feita fora de hora causa o dano mas **não fica gasta**: o jogador pode refazê-la no momento certo. Exemplo: opioide antes do dreno é erro; depois do dreno, conta como feita.

**3. Eventos no tempo.**

```js
events: [
  { turn: 5, unless: 'desc', effect: -10, msg: 'BRADICARDIA! Descomprima AGORA!' },
  { after: 'agulha', turns: 3, unless: 'dreno', effect: -18, msg: 'A tensão reacumulou! Drene logo depois da agulha.' },
],
```

- `turn`: acontece no turno N, se a tag de `unless` ainda não foi feita.
- `after` + `turns`: acontece N turnos depois de uma tag, se a tag de `unless` ainda não foi feita.
- Cada evento acontece uma vez só, e um evento com efeito negativo conta como erro de sequência.

**4. Outros campos.**
- `tag: ['dreno', 'desc']`: uma ação que vale por duas. O dreno também alivia a tensão.
- `repeatable: true`: um exame que pode ser repetido (o raio-X de controle).
- `effect` também funciona em anamnese e exame físico. Exemplo: fazer o exame secundário antes do primário custa estabilidade.

**Como desenhar um caso com ordem.**
1. Escreva a **sequência ideal** (no `study`, numa lista).
2. Para cada erro clássico, escolha a ferramenta:
   - **Fazer cedo demais** → variante com `if: '!tag'` e `orderError: true`.
   - **Esquecer o passo seguinte** → evento `after`.
   - **Demorar** → evento `turn`.
   - **Algo que exige outra coisa antes** → `requires` com `dmg`.
3. Teste dois caminhos, o ideal e o "propedêutica completa antes de agir", e veja se o resultado é bem diferente.

Sequência ideal do Rafael:
1. **B rápido:** ausculta e pescoço.
2. **Descompressão:** agulha ou dedo.
3. **Diagnóstico.**
4. **Dreno.**
5. **Analgesia.**

Erros cobrados no caso:
- raio-X ou TC antes de estabilizar;
- AMPLE, abdome ou pelve antes de resolver o B;
- intubar antes de descomprimir;
- opioide no paciente chocado;
- agulha sem dreno nos 3 turnos seguintes;
- demorar a descomprimir (bradicardia no turno 5).

### Balanceamento

- **Calcule o pior caminho.** O jogador consegue fazer `stability ÷ decay` ações antes de o paciente morrer. Com 50 ÷ 7, são cerca de 7 ações.
- **Casos de emergência verdadeira** (pneumotórax, anafilaxia): estabilidade baixa e `decay` alto. A lição é agir antes de "completar a propedêutica".
- **Casos de raciocínio** (apendicite, síncope): `decay` baixo, para dar tempo de investigar.
- **Exames que atrasam a conduta** (raio-X no pneumotórax, troponina no IAM): use `cost: 2`, e a resposta explica por que não esperar.
- **As condutas essenciais** devem devolver bastante estabilidade (+20 a +35) e ter `stabilize` para "segurar" o paciente.
- **Chefes e Banca** ficam mais difíceis com `hard: 1.1` a `1.2` no treinador, não no caso. Assim o mesmo caso serve para um estudante na rota e para um chefe.

### Variações do mesmo caso

Para o jogador não decorar as respostas, um caso pode ter `versions`. A primeira vez que ele atende o caso é sempre a versão clássica; nas próximas, o jogo sorteia entre a clássica e as variações, sem repetir a última. Uma boa variação muda a **conduta**, não só a história: uma alergia, um remédio em uso, um exame que contraindica, um gatilho que também precisa ser tratado.

```js
versions: [
  { id: 'sildenafil', note: 'ele usou sildenafil ontem: nitrato contraindicado.',
    change: {
      'Usa algum remédio?': { clue: true, a: '"...e ontem à noite um comprimido azul."' },
      'Nitrato sublingual': { effect: -22, requires: [], msg: 'Nitrato até 24 h após sildenafil: hipotensão grave!' },
    },
    add: { conduta: [ /* condutas novas, no formato de sempre */ ] },
    remove: ['Troponina'],            // tira uma pergunta, exame, hipótese ou conduta
    required: ['aas', 'cate'],        // name, age, intro, vitals, stability, decay, par, events também podem mudar
    teaching: ['Linha extra no resumo.'],
    cards: [{ q: '...', a: '...', wrong: ['...'], why: '...' }],  // liberados quando essa versão é atendida
  },
],
```

- Em `change`, a chave é o texto **exato** do `q` (perguntas e exames) ou do `name` (hipóteses e condutas). Se não bater, o console (F12) avisa.
- Dá até para trocar o diagnóstico: na síncope `qtlongo`, a vasovagal vira `ok: false` e a cardíaca vira `ok: true`.
- A `note` aparece no resumo do fim do caso e no estudo, começando com "Nesta versão:".
- Não troque o sexo do paciente numa versão: o sprite e o retrato continuam os do caso.

### Flashcards do caso

Todo caso atendido libera flashcards para a revisão espaçada (menu → **FLASHCARDS**). A maioria é gerada sozinha a partir do caso:

| Card | Vem de |
|---|---|
| Qual o diagnóstico? | `intro` + as 2 primeiras pistas (`clue`) da anamnese/exame físico × as hipóteses de `dx` |
| Quais condutas NÃO podem faltar? | as condutas de `required` × versões trocando uma por uma conduta danosa |
| "X" está indicado? | cada conduta com `effect` negativo (menos as de `orderError`) |
| Algo precisa vir antes? | cada `requires` com `dmg` |

Por isso, capriche nos textos de `msg`, `why` e `requires.msg`: eles viram a explicação do card. Para cobrar um detalhe que o caso não pergunta (doses, tempos, critérios), escreva cards à mão:

```js
cards: [
  { q: 'Angioplastia primária: qual o tempo porta-balão ideal?', a: 'Menos de 90 minutos',
    wrong: ['Menos de 30 minutos', 'Menos de 6 horas'], why: 'Até 120 min se precisar transferir.' },
],
```

Errou algo no atendimento (hipótese, conduta danosa, pulou um pré-requisito)? O card correspondente volta para o início. Os cards aparecem no menu de pausa, na Enf. Clara depois do descanso e, quando há 3 ou mais para revisar, como encontros no mato alto (falas em `QUIZ_ENCOUNTERS`, no fim de `content/world.js`).

### Ideias de casos para completar o vale

Hoje vários casos se repetem entre treinadores. Sugestões que preencheriam lacunas:

- Dengue com sinais de alarme
- Meningite bacteriana
- Crise convulsiva / estado de mal
- Hemorragia digestiva alta
- Fibrilação atrial com alta resposta
- Cetoacidose versus estado hiperosmolar
- Pneumonia comunitária grave
- Intoxicação por paracetamol
- Hipercalemia
- Parada cardiorrespiratória: poderia ser um "chefão" com turnos de ACLS

---

## 6. Escrevendo história e cenas

A referência completa fica no **topo de `content/world.js`**. Abaixo estão os padrões mais usados, todos em `content/maps.js`.

### Personagem que só conversa

```js
{
  id: 'dona-rita', name: 'Dona Rita', x: 10, y: 6, pal: PAL.moradora,
  dialogue: [
    { if: 'badge:cardio', speaker: 'Dona Rita', say: ['Você já tem o selo da cardio? Que orgulho!'] },
    { speaker: 'Dona Rita', say: ['Bom dia, {name}!'], random: TIPS },
  ],
}
```

- O jogo usa o **primeiro bloco** cujo `if` for verdadeiro, então coloque os mais específicos em cima.
- `x` e `y` são a posição em tiles, contando do 0 no canto superior esquerdo do mapa.
- Falas aceitam 3 formatos:
  - `'texto'`: usa o nome do `speaker`.
  - `['Outro nome', 'fala']`: troca quem fala.
  - `['', 'narração']`: narração, sem nome.

### Treinador (vê você de longe)

```js
{
  id: 'marcos', name: 'Residente Marcos', x: 8, y: 12, dir: 'down', pal: PAL.residente,
  trainer: {
    name: 'Residente Marcos',   // aparece na batalha
    case: 'tep',                // qual caso ele apresenta
    money: 300,                 // R$ ganhos ao vencer
    range: 4,                   // alcance da visão em tiles (0 = só falando com ele)
    intro: ['Fala antes do caso.'],
    lose: ['Marcos: fala quando você vence.'],
    after: ['Fala quando você conversa com ele depois.'],
    // hard: 1.15   → o paciente piora mais rápido (chefes)
    // music: 'rival'
    // win: [comandos]  → acontece depois da vitória (selo, presente, fuga...)
  },
}
```

O treinador olha na direção de `dir` e vê `range` tiles à frente.

### Paciente opcional com "!"

```js
{
  id: 'bruna', name: 'Bruna', sprite: 'meucaso', x: 5, y: 9, bubble: '!helped:bruna',
  dialogue: patientQuest('meucaso', 'helped:bruna',
    ['Narração da cena.', ['Bruna', 'Fala pedindo ajuda.']],   // antes
    ['Fala de agradecimento.'],                                  // depois de atendida
    [{ give: 'cafe', qty: 2 }, { money: 200 }]),                 // recompensa
}
```

### Cena com roteiro

```js
dialogue: [{
  speaker: 'Dr. Hélio', say: ['Tenho um pedido especial, {name}.'],
  do: [
    { ask: 'Aceitar a missão?', yes: [
        { set: 'missaoAceita' },
        { say: [['Dr. Hélio', 'Ótimo! Procure a Dra. Rosa.']] },
      ], no: [
        { say: [['Dr. Hélio', 'Pense com calma.']] },
      ] },
  ],
}]
```

Comandos mais usados (a lista completa está em `content/world.js`):

| Comando | O que faz |
|---|---|
| `{ say: [...] }` | Falas |
| `{ set: 'flag' }` / `{ unset: 'flag' }` | Marca ou desmarca um acontecimento |
| `{ if: 'cond', then: [...], else: [...] }` | Ramificação |
| `{ ask: 'Pergunta?', yes: [...], no: [...] }` | Escolha sim/não |
| `{ approach: 'id' }` | Personagem caminha até você |
| `{ goto: 'id', x, y }` | Personagem caminha até um ponto |
| `{ move: 'id', path: 'up up left' }` | Caminho exato |
| `{ face: 'id', dir: 'player' }` | Virar para você |
| `{ exclaim: 'id' }` | Balão "!" |
| `{ battle: 'caso', trainer: 'id', win: [...], lose: [...] }` | Inicia um atendimento |
| `{ challenge: 'id' }` | Desafio completo de treinador |
| `{ give: 'item', qty: 2 }` / `{ money: 100 }` | Presentes |
| `{ badge: 'emergencia' }` / `{ join: 'nando' }` | Selo / novo membro da equipe |
| `{ heal: true }` | Cura a equipe e marca o ponto de retorno |
| `{ warp: { to: 'mapa', x, y, dir } }` | Teleporta |
| `{ pushBack: true }` | Empurra o jogador um passo para trás (bloqueios) |
| `{ music: 'chave' }` / `{ sfx: 'chave' }` | Som |
| `{ credits: true }` | Créditos |

### Condições

| Condição | Verdadeira quando |
|---|---|
| `'flag'` / `'!flag'` | A flag está ligada / desligada |
| `'badge:cardio'` / `'badges:3'` | Tem esse selo / tem pelo menos 3 selos |
| `'team:ana'` | A Psic. Ana está na equipe |
| `'beat:marcos'` | Já venceu esse treinador (o jogo marca sozinho) |
| `'solved:iam'` / `'seen:iam'` | Resolveu / já viu esse caso |
| `'level:5'` | Nível 5 ou mais |
| `'cards:1'` | Tem pelo menos 1 flashcard para revisar agora |
| `['a', 'b']` | Todas valem |

### Variáveis nas falas

`{name}` · `{level}` · `{money}` · `{badges}` · `{solved}` · `{total}` · `{notes}` · `{cards}` (flashcards para revisar)

### Gatilhos (acontecem ao pisar num lugar)

```js
triggers: [{
  x: 26, y: 10, h: 2,              // área: largura w, altura h
  if: '!badge:emergencia',
  do: [
    { say: [['Guarda', 'Só passa com o Selo da Emergência.']] },
    { pushBack: true },
  ],
}],
```

### Mapa novo

1. Desenhe as linhas em `rows`: cada caractere é um tile (tabela na [seção 7](#tiles)). **Todas as linhas precisam ter o mesmo tamanho.**
2. Ligue com outros mapas usando `warps`:
   - **Porta de prédio:** `{ x: 5, y: 4, to: 'meuInterior', tx: 6, ty: 8, dir: 'up' }`.
   - **Saída do interior:** `{ x: 6, y: 9, to: '__back' }` volta para a porta de onde se veio.
   - **Borda de rota** com 2 tiles de largura: `{ x: 9, y: 0, w: 2, to: 'outroMapa', tx: 13, ty: 20, dir: 'up' }`.
3. Mato alto: `encounters: { tile: '"', chance: 0.1, cases: ['asma', 'hipo'] }`.
4. Música: `music: 'rota'`.

---

## 7. Arte

O jogo inteiro é desenhado em código, como placeholder. Cada PNG que você criar substitui a arte gerada; o que ainda não tiver arte continua funcionando. **Dá para trocar aos poucos.**

### Fluxo

1. Abra **`tools/exportar-arte.html`** no navegador e baixe os moldes: são a arte atual, no tamanho e na posição certos.
2. Pinte por cima no seu editor (**Aseprite**, Piskel ou LibreSprite), mantendo o tamanho do arquivo.
3. Salve em `assets/`.
4. Registre o arquivo em `content/art.js`:

```js
const ART = {
  tiles: 'assets/tiles.png',
  chars: {
    player: 'assets/chars/player.png',
    mentor: 'assets/chars/mentor.png',
    caio:   'assets/chars/caio.png',
  },
  portraits: {
    iam: 'assets/portraits/iam.png',
  },
  battleBg: 'assets/battle-bg.png',
};
```

### Tamanhos e formatos

| Arte | Tamanho | Layout |
|---|---|---|
| **Tileset** | blocos 16×16, 8 por linha | Na ordem do `index` (tabela abaixo) |
| **Personagem** | 48×48, 96×96 ou 192×192 | Quadros de 16, 32 ou 64 px: maior = mais detalhe, mesmo tamanho na tela. 3 colunas: parado, passo A, passo B. 3 linhas: de frente, de costas, de lado virado para a **direita**. O lado esquerdo é espelhado sozinho. |
| **Retrato de batalha** | Livre (sugestão: 64×64 a 80×80) | O paciente na batalha; a base da imagem fica apoiada na plataforma |
| **Fundo de batalha** | 256×158 | A área acima da caixa de texto; inclua as plataformas no desenho |
| **Imagens de estudo** | Qualquer (PNG, JPG ou SVG) | ECG, raio-X e fotos; reduzidas para caber |

<a id="tiles"></a>
### Tiles (posição no `tiles.png`)

| index | Caractere | Tile | | index | Caractere | Tile |
|---|---|---|---|---|---|---|
| 0 | `.` | grama | | 14 | `_` | piso de madeira |
| 1 | `,` | flores | | 15 | `T` | mesa de estudos |
| 2 | `#` | árvore | | 16 | `X` | tapete de saída |
| 3 | `=` | caminho | | 17 | `"` | mato alto |
| 4 | `~` | água | | 18 | `r` | telhado de casa |
| 5 | `R` | telhado vermelho (Posto, Hospital) | | 19 | `h` | parede de casa |
| 6 | `H` | parede branca | | 20 | `o` | porta de casa (trancada) |
| 7 | `D` | porta de vidro | | 21 | `P` | ponte |
| 8 | `F` | cerca | | 22 | `M` | rocha |
| 9 | `Q` | telhado azul (biblioteca) | | 23 | `v` | saliência (só se desce) |
| 10 | `L` | parede de tijolo | | 24 | `C` | balcão |
| 11 | `d` | porta de madeira | | 25 | `E` | leito |
| 12 | `w` | parede interna | | 26 | `G` | telhado verde (Centros) |
| 13 | `B` | estante | | | | |

Para criar um tile novo, desenhe-o no fim do `tiles.png`, adicione um caractere em `TILES` (`content/world.js`) com o `index` dele e use o caractere nos mapas.

Com um tileset próprio, a animação da água e a cruz vermelha do telhado deixam de ser desenhadas em código: inclua-as na sua arte.

### Personagens a desenhar

Os nomes de arquivo são as chaves usadas em `ART.chars`.

| Chave | Personagem |
|---|---|
| `player` | Protagonista |
| `mentor` | Dr. Hélio |
| `bia`, `davi`, `lia`, `nando`, `ana` | Equipe |
| `caio`, `caio2`, `caiofinal` | Rival (pode ser o mesmo PNG nas 3 chaves) |
| `rosa`, `otavio`, `celeste` | Chefes |
| `yara`, `bento`, `ramos` | Banca |
| `grunt1`, `dante`, `vito` | Vilões |
| `iam`, `anafilaxia`, `cad`, `pneumo`, `apendicite`, `hipo`, `asma`, `avc`, `sincope`, `eap`, `sepse`, `tep`, `organofosforado` | Pacientes (o mesmo sprite aparece no mapa e na batalha) |
| `clara`, `atendente`, `bibliotecaria`, `guarda1`, `seguranca`... | Coadjuvantes (a chave é o `id` do NPC) |

**Sprite com proporção realista parecendo pequeno?** Os personagens gerados em código são "cabeçudos" e ocupam o tile todo. Aumente o seu no mapa com `charScale` em `content/art.js` (ex.: `player: 1.5`): ele cresce apoiado pelos pés, sem mudar a batalha. Com quadros de 32 px, use 1.5 ou 2 para os pixels ficarem uniformes.

Um personagem usa a arte pela chave em `sprite:` ou, sem ela, pelo `id`. Para vários NPCs dividirem o mesmo PNG, dê o mesmo `sprite:` a eles, por exemplo `sprite: 'guarda'`.

### Direção de arte atual

- **Paleta e estilo:** 16 bits, contorno escuro de 1 px nos personagens, cores saturadas mas suaves.
- **Janelas:** azul em gradiente com borda branca, no estilo dos RPGs de SNES.
- **Cores de cada personagem** (até existir o PNG): o campo `pal` em `content/maps.js` e `content/team.js`, ou `FALLBACK_PALS` em `content/art.js`. A chave `long: true` dá cabelo comprido.
- **Fonte:** Pixelify Sans (Google Fonts).

---

## 8. Música e efeitos sonoros

Tudo fica em `content/audio.js`.

### Duas formas de criar

**1. Arquivos** (`.ogg`, `.mp3` ou `.wav`) em `assets/music/` e `assets/sfx/`:

```js
music: { cidade: 'assets/music/cidade.ogg' },
sfx:   { hit: 'assets/sfx/dano.wav' },
```

**2. Escrita em notas**, tocada pelo sintetizador chiptune do jogo:

```js
cidade: { bpm: 120, tracks: [
  { wave: 'square',   vol: 0.1,  notes: 'C5 . E5 G5 . E5 C5 . | D5 . F5 A5 . G5 F5 .' },  // melodia
  { wave: 'triangle', vol: 0.22, notes: 'C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 .' },  // baixo
  { wave: 'noise',    vol: 0.05, notes: 'k . h . s . h h' },                              // bateria
]}
```

Como ler as notas:

- Cada palavra é um passo (uma colcheia).
- `C5`, `F#4` e `Bb3` são notas com oitava; `C4` é o dó central.
- `-` segura a nota anterior, `.` é pausa e `|` só separa compassos (é ignorado).
- Na bateria (`wave: 'noise'`): `k` é bumbo, `s` é caixa, `h` é chimbal.
- Ondas disponíveis:
  - `square` (melodia clássica)
  - `triangle` (baixo macio)
  - `sawtooth` (rasgado)
  - `sine` (puro)
  - `noise` (bateria)

### Músicas atuais

| Chave | Onde toca |
|---|---|
| `titulo` | Tela de título e créditos |
| `cidade` | Vila Aurora, Cidade Ponte, Porto Azul, Serra Alta |
| `rota` | Rotas 1, 2 e 3 |
| `biblioteca` | Clínica, Postos e biblioteca |
| `ginasio` | Centros de Especialidade e Hospital Central |
| `batalha` | Atendimentos comuns |
| `rival` | Caio e chefes |
| `vilao` | Grupo Cura Milagrosa |
| `vitoria` / `derrota` | Vinhetas de fim de caso |

### Efeitos

`cursor`, `confirm`, `back`, `text`, `advance`, `door`, `alert`, `hit`, `heal`, `decay`, `alarm`, `correct`, `wrong`, `levelup`, `save` e `jump`.

Sem arquivo, cada efeito é sintetizado.

### Ferramentas sugeridas

- **jsfxr** (no navegador): efeitos 8/16 bits.
- **BeepBox** (no navegador) e **Bosca Ceoil** (programa): músicas chiptune.
- **OpenGameArt** e **Freesound**: bibliotecas prontas. Confira a licença de cada arquivo.

---

## 9. Biblioteca e material de estudo

Os tópicos ficam em `content/library.js`, com os mesmos blocos do `study` dos casos:

```js
{
  id: 'meu-topico', category: 'Cardiologia', title: 'Título do tópico',
  if: 'solved:iam', lockedHint: 'Atenda o Seu Joaquim para liberar.',   // opcional: bloqueado até...
  blocks: [
    { h: 'Seção' },
    { p: 'Parágrafo.' },
    { list: ['item', 'item'] },
    { tip: 'Destaque.' },
    { img: 'assets/study/imagem.png', caption: 'Legenda', w: 160 },
  ],
}
```

- **Categorias** são criadas automaticamente pelo nome.
- **Imagem que ainda não existe** aparece como um quadro tracejado com o caminho do arquivo. Dá para escrever primeiro e desenhar depois.

---

## 10. Como testar

- **No computador:** abra o `index.html` no navegador.
- **No celular:** na pasta do jogo, rode `python3 -m http.server 8000` e abra `http://IP-DO-COMPUTADOR:8000` no celular, no mesmo Wi-Fi.
- **Erros:** aperte F12 e abra a aba Console. Erros de digitação nos arquivos de conteúdo aparecem ali, com arquivo e linha.
- **Recomeçar:** NOVO JOGO na tela de título. O save é automático e fica no navegador.
- **Testar um caso novo rapidamente:** coloque-o temporariamente no mato alto da Rota 1 (`MAPS.rota1.encounters.cases`) ou num treinador próximo do início.

---

## 11. Pontas soltas e ideias

- **Casos repetidos:** hoje hipoglicemia, TEP e anafilaxia aparecem em vários treinadores. Casos novos dariam a cada chefe e à Banca algo exclusivo.
- **Estudos expandidos:** o infarto e o pneumotórax têm `study`. Os outros 11 casos esperam texto e imagens (ECG do TEP, USG pulmonar do EAP...). No pneumotórax já há um espaço reservado para a radiografia: `assets/study/rx-pneumotorax-hipertensivo.png`.
- **Ordem das ações nos outros casos:** bons candidatos, porque têm sequências clássicas:
  - Cetoacidose: volume → potássio → insulina.
  - Sepse: hemoculturas → antibiótico na 1ª hora → volume → noradrenalina.
  - AVC: glicemia → TC → trombólise.
  - Anafilaxia: adrenalina antes de anti-histamínico.
- **Arte:** tudo ainda é placeholder em código. As prioridades seriam o protagonista, a equipe, o Caio e o tileset.
- **História:**
  - Um 3º encontro com o Caio na Rota 3.
  - Mais cenas do Grupo Cura Milagrosa entre os atos.
  - Interiores das casas.
  - A família do protagonista na Vila Aurora.
- **Dinâmicas a considerar:**
  - Interior do hospital com casos de enfermaria.
  - Parada cardiorrespiratória como "chefão".
  - Exportar/importar save.
  - Um modo de teste para pular direto para qualquer caso.

> Conteúdo educativo e simplificado. Revise sempre os casos com as diretrizes atuais antes de usar em ensino.
