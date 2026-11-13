'use strict';
/* =====================================================================
   ARTE — manifesto dos arquivos de imagem.
   Tudo é opcional: o que não estiver listado aqui usa a arte gerada em código.
   Para gerar moldes no tamanho certo, abra tools/exportar-arte.html.

   tiles      PNG com blocos de 16x16. A ordem segue o "index" de TILES
              em content/world.js (esquerda → direita, depois próxima linha).
   chars      Folha de personagem: 3 colunas x 3 linhas de quadros quadrados.
              48x48 (quadros de 16), 96x96 (32) ou 192x192 (64): maior = mais detalhe,
              mesmo tamanho na tela. Prefira esses tamanhos para os pixels ficarem uniformes.
                colunas: parado · passo A · passo B
                linhas:  frente (baixo) · costas (cima) · lado (virado p/ DIREITA)
              O lado esquerdo é espelhado automaticamente.
              Chaves: 'player', 'mentor' e o "sprite" de cada NPC (ex.: 'iam').
   portraits  Arte do paciente na batalha, por id do caso. Qualquer tamanho
              (sugestão: 64x64 ou 80x80); é desenhada apoiada na plataforma.
   charScale  Multiplicador do tamanho no mapa por chave (ex.: player: 1.5). Padrão 1.
   battleBg   Fundo da batalha, 256x158 (a área acima da caixa de texto).
              Com fundo próprio, as plataformas não são desenhadas: inclua-as na arte.
   ===================================================================== */
const ART = {
  tiles: null, // 'assets/tiles.png'
  chars: {
    player: 'assets/chars/player.png',
    // mentor: 'assets/chars/mentor.png',
  },
  portraits: {
    // iam: 'assets/portraits/iam.png',
  },
  battleBg: null, // 'assets/battle-bg.png'
  // Tamanho no mapa (1 = um tile). Para sprites com proporção realista, que parecem pequenos
  // ao lado dos personagens "cabeçudos" gerados em código. Apoiado pelos pés; não muda a batalha.
  charScale: {
    player: 1.5,
  },
};

// Cores dos personagens gerados em código (quando não há PNG).
// h cabelo · s pele · w roupa · b detalhe da roupa · r acessório · k calça · long: cabelo comprido
const FALLBACK_PALS = {
  player: { h: '#3b2a20', s: '#f0c49a', w: '#f8f8f8', b: '#3c78c8', r: '#d04040', k: '#283040' },
  mentor: { h: '#c8c8d0', s: '#e8b890', w: '#f8f8f8', b: '#58a868', r: '#d04040', k: '#383848' },
};
