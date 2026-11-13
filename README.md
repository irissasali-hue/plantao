# Plantão — um RPG de medicina em 16 bits

Abra `index.html` no navegador (não precisa de servidor nem de instalar nada).

**Controles:** setas/WASD andam · Z/Enter/Espaço confirmam · X/Esc voltam · C/Tab abre o menu · M liga/desliga o som
Nos textos longos: setas rolam; esquerda/direita pulam uma página.

## A jornada
**Vila Aurora → Rota 1 → Cidade Ponte → Rota 2 → Porto Azul → Rota 3 → Serra Alta**

1. Na clínica do Dr. Hélio você escolhe o 1º membro da **equipe** (Enf. Bia, Farm. Davi ou Fisio Lia). O rival **Caio** pega outro e te desafia.
2. Em cada cidade há um **Centro de Especialidade** com preceptores e um chefe. Vencendo o chefe, você ganha o **Selo**: Emergência (Dra. Rosa), Cardiologia (Dr. Otávio), Endocrinologia (Dra. Celeste).
3. O **Grupo Cura Milagrosa** vende curas falsas pelo vale: capanga na Rota 2, Dante na Rota 3, Mestre Vito na Serra Alta.
4. Com os 3 selos, a **Banca do Hospital Central**: 3 examinadores e a final contra o Caio. Depois, créditos e pós-jogo.

## Dinâmicas
- **Treinadores**: residentes e estudantes nas rotas e nos Centros. Se você cruzar a linha de visão, aparece um `!`, eles vêm até você e apresentam um caso.
- **Equipe**: cada membro tem uma habilidade usável no atendimento (comando EQUIPE), com usos limitados. Sobem de nível com os casos vencidos (+1 uso a cada 2 níveis). Mais membros entram ao longo da história.
- **Posto de Descanso** (telhado vermelho com cruz): a enfermeira recupera a equipe e marca o ponto de retorno; o balcão ao lado é a **farmácia/cantina**.
- **Dinheiro e mochila**: vencer treinadores dá R$. Itens: Café (ação grátis), Manual de bolso (descarta uma hipótese), Lanche (+1 uso para a equipe), Teleconsulta (dica do preceptor).
- **Desmaio**: perdeu um caso → volta ao último Posto onde descansou e perde 1/4 do dinheiro.
- **Mato alto** (`"`): casos aleatórios, diferentes em cada rota. **Saliências**: só se descem, pulando.
- **Bloqueios**: guardas que só deixam passar com o selo certo.
- **Menu (C)**: Equipe, Mochila, Atlas Clínico (todos os casos: ???/visto/resolvido), Anotações, Cartão do Residente, Som.
- **Atendimento em turnos**: anamnese, exame físico, exames (alguns com imagem), conduta, diagnóstico, equipe, mochila e prontuário. No fim: *Ver caso completo* e *Salvar nas anotações*.
- **Biblioteca** (Porto Azul): tópicos por categoria (alguns liberados conforme os casos) e a estante *Casos atendidos*.

## Textos longos e imagens (blocos)
Biblioteca, estudo dos casos e anotações usam os mesmos blocos:

```js
{ h: 'Título de seção' }
{ p: 'Parágrafo longo...' }
{ list: ['item', 'item'] }
{ tip: 'Pérola ou alerta em destaque.' }
{ img: 'assets/study/raio-x.png', caption: 'Legenda', w: 160 }
```
Imagens podem ser PNG, JPG ou SVG; basta citar o caminho, que o jogo carrega sozinho. Se o arquivo ainda não existir, aparece um quadro tracejado indicando onde ele vai.

- **Estudo expandido de um caso:** adicione `study: [ ...blocos ]` ao caso em `content/cases.js` (veja o caso `iam`).
- **Imagem num exame:** adicione `img: 'assets/study/...'` ao item de exame (ou de exame físico). Ela aparece junto com o resultado.
- **Tópico novo na biblioteca:** copie um item de `content/library.js`. Use `if: 'solved:iam'` e `lockedHint` para liberar só depois de um caso.

## Arte
1. Abra `tools/exportar-arte.html` e baixe os moldes (tileset, personagens, retratos).
2. Pinte no seu editor (Aseprite, Piskel, LibreSprite…) mantendo o tamanho e o layout.
3. Salve em `assets/` e registre em `content/art.js`.

| Arte | Tamanho | Layout |
|---|---|---|
| Tileset | blocos 16x16 | ordem do `index` em `TILES` (`content/world.js`) |
| Personagem | 48x48 | colunas: parado, passo A, passo B · linhas: frente, costas, lado direito |
| Retrato de batalha | livre (64–80 px) | apoiado na plataforma |
| Fundo de batalha | 256x158 | inclui as plataformas |

## Música e efeitos sonoros
Tudo em `content/audio.js` (sintaxe completa no topo do arquivo). Duas formas:

**Arquivos** (`.ogg`, `.mp3`, `.wav`): salve em `assets/music/` ou `assets/sfx/` e registre:
```js
music: { cidade: 'assets/music/cidade.ogg' },
sfx:   { hit: 'assets/sfx/dano.wav' },
```
**Música escrita em notas**, tocada por um sintetizador chiptune embutido (já vem uma trilha completa):
```js
cidade: { bpm: 120, tracks: [
  { wave: 'square',   vol: 0.1,  notes: 'C5 . E5 G5 . E5 C5 . | D5 . F5 A5 . G5 F5 .' },  // melodia
  { wave: 'triangle', vol: 0.22, notes: 'C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 .' },  // baixo
  { wave: 'noise',    vol: 0.05, notes: 'k . h . s . h h' },                              // bateria
]}
```
Cada palavra é um passo (colcheia): nota com oitava (`C5`, `F#4`), `-` segura, `.` é pausa. Na bateria: `k` bumbo, `s` caixa, `h` chimbal.

- **Música de cada mapa:** `music:` no mapa (`content/maps.js`). **Batalha:** `batalha`, `music:` num caso, ou `trainer.music` (rival, vilão). **Vinhetas:** `vitoria` e `derrota`.
- **Efeitos:** `cursor confirm back text advance door alert hit heal decay alarm correct wrong levelup save jump`. Sem arquivo, usam o som sintetizado.
- O jogador ajusta volume em **C → SOM** e liga/desliga com **M**. O som só começa depois da primeira tecla (regra dos navegadores).

## História e mapas
Mapas e personagens ficam em `content/maps.js`; a sintaxe completa (NPCs, treinadores, gatilhos, comandos de roteiro e condições) está no topo de `content/world.js`.

**Treinador** (vê o jogador de longe e desafia):
```js
{
  id: 'pedro', name: 'Estudante Pedro', x: 12, y: 9, dir: 'left', pal: PAL.estudante,
  trainer: {
    name: 'Estudante Pedro', case: 'asma', money: 120, range: 3,
    intro: ['Ei! Você é residente? Me ajuda com esse caso do estágio!'],
    lose: ['Pedro: Uau, que raciocínio!'], after: ['Vou estudar mais broncoespasmo...'],
  },
}
```

**Cena com roteiro** (comandos executados em ordem):
```js
dialogue: [{
  speaker: 'Téc. Nando', say: ['Vi você vencer a Dra. Rosa!', 'Me leva na equipe?'],
  do: [
    { ask: 'Convidar o Nando?', yes: [{ join: 'nando' }] },
    { give: 'cafe', qty: 2 },
  ],
}]
```
Outros comandos: `move`, `goto`, `approach`, `face`, `exclaim`, `battle`, `challenge`, `money`, `badge`, `heal`, `warp`, `music`, `pushBack`, `credits`...

**Bloqueio por selo** (gatilho no mapa):
```js
triggers: [{ x: 26, y: 10, h: 2, if: '!badge:emergencia', do: [
  { say: [['Guarda', 'Só passa quem tem o Selo da Emergência.']] },
  { pushBack: true },
] }]
```
- **Mapa novo:** adicione `MAPS.nome = {...}` em `content/maps.js` e ligue com `warps`. Interiores usam `to: '__back'` na saída, que volta para a porta de onde se veio.
- **Membro de equipe, item ou selo novo:** `content/team.js`.

> Conteúdo educativo e simplificado. Confira sempre as diretrizes atuais.
