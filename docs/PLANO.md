# PlanBuilder — Plano do produto e da implementação

Editor web de plantas baixas em 2D com visualização 3D, para quem não é arquiteto mas precisa
desenhar uma planta correta em poucos minutos.

---

## Situação

O MVP (fases 0 a 7 da seção 9) está implementado. Do roadmap da seção 11 (v1.0), já entraram:

- **Móveis** (objetos soltos no cômodo): sofás de 2 e 3 lugares, poltrona, mesas quadrada, retangular e redonda com cadeiras, camas nos 6 tamanhos padrão de colchão no Brasil. Encostam na parede, giram, espelham, copiam e aparecem em 3D.
- **Cobogó**, como componente de parede (categoria própria na biblioteca): painel do piso ao teto e faixa de ventilação, com tamanho de peça, "ocupar a parede inteira" e estimativa de peças.

- **Eletrodomésticos** com medidas de modelos Brastemp (fogões, geladeiras, lavadoras, lava-louças) e a **porta sanfonada**.
- **Gabinetes de cozinha e lavanderia** (categoria "Cozinha e lavanderia"): gabinete de pia, balcão, armários aéreos, gabinete com tanque e armário alto.

Faltam da v1.0: louças de banheiro, agrupar, imagem de fundo para decalcar e PDF em escala.

Diferenças em relação ao que este plano previa:

| Previsto | Como ficou |
|---|---|
| Ordem das fases 3 a 6 | Mantida como na seção 9; o salvamento automático simples foi antecipado para a fase 1 |
| Duplo clique no cômodo seleciona suas paredes | O duplo clique renomeia o cômodo; selecionar as paredes fica no botão direito |
| `build3D` e `thumbnail` no contrato do componente | O componente tem `symbol()` (planta e miniatura) e `model()` (3D) |
| `polygon-clipping` | Trocado por `polyclip-ts` (mesma função, mais robusto) |
| `drei` para a câmera 3D | Usado o `OrbitControls` do próprio three.js, sem a dependência extra |
| Alça de giro livre, `Tab` entre objetos sobrepostos | Não implementados (há o giro por ângulo digitado) |
| Ferramentas Parede: "comprimento com âncora", "converter cômodo" | A âncora está no painel de propriedades; mudar a espessura de um cômodo é selecionar suas paredes e editar em lote |

---

## 1. Referências e o que copiar de cada uma

| App | O que fazem bem | O que adotamos |
|---|---|---|
| **Floorplanner** | Desenho de parede em sequência, comprimento digitado durante o desenho, cotas automáticas | Ferramenta de parede encadeada + entrada numérica do comprimento + cotas em tempo real |
| **Sweet Home 3D** | Portas/janelas "grudam" na parede e abrem o vão sozinhas; vista 2D e 3D lado a lado; catálogo por categoria | Aberturas ancoradas na parede (não são objetos soltos); modo dividido 2D/3D; catálogo em árvore de categorias |
| **Planner 5D / Homestyler** | Interface leve, biblioteca visual com miniaturas, arrastar e soltar | Painel de biblioteca com miniaturas, busca e arrastar para a planta |
| **RoomSketcher** | Planta 2D "limpa", pronta para imprimir/exportar | Estilo de desenho técnico simples (paredes preenchidas, arco de porta, janela com linhas paralelas) e export PNG em alta resolução |

Princípio geral: **a parede é o objeto central**. Tudo (vãos, cotas, ambientes, 3D) deriva dela.

---

## 2. Escopo

### MVP (este plano)
- Desenhar, selecionar, editar e excluir **paredes**.
- Inserir, mover, editar e excluir **portas e janelas** (vãos na parede).
- **Biblioteca de componentes** organizada e extensível (inicialmente: portas e janelas).
- **Vista 3D** gerada da planta, com os vãos recortados.
- **Continuar de onde parou** (autosave em `localStorage`).
- **Salvar** e **abrir** projeto local (arquivo `.planbuilder.json`).
- **Exportar PNG** (planta 2D; vista 3D como bônus).
- **Ferramentas de produtividade** completas (seção 6): desfazer/refazer, seleção múltipla, copiar/colar/duplicar,
  girar/espelhar, alinhar/distribuir, mover com setas, bloquear, camadas, menu de contexto, paleta de comandos,
  ferramentas de parede avançadas, medir, cotas manuais e textos.
- **Áreas e quantitativos** (seção 7): cômodos detectados automaticamente, área total (construída), área útil,
  área por cômodo, área de paredes (em planta e de superfície, descontando vãos) e perímetros.

### Depois do MVP
Ver o roadmap completo na seção 11.

---

## 3. Experiência do usuário

### Layout da tela

```
┌───────────────────────────────────────────────────────────────────────┐
│ PlanBuilder  [Novo][Abrir][Salvar][Exportar PNG]  ↶ ↷   [2D|Dividido|3D] │  barra superior
├────┬──────────────────┬──────────────────────────────────┬────────────┤
│ ⬚  │ BIBLIOTECA       │                                  │ PROPRIEDADES│
│ ▭  │ 🔍 buscar…       │                                  │            │
│ 🚪 │ ▸ Portas         │         área de desenho          │ Parede     │
│ ⊟  │   Giro simples   │       (grade, zoom, pan)         │ Compr. 350 │
│ ⌫  │   Giro dupla     │                                  │ Espes.  15 │
│ ✋ │   Correr         │                                  │ Altura 280 │
│    │ ▸ Janelas        │                                  │            │
│    │   Correr 2 fls   │                                  │ [Excluir]  │
├────┴──────────────────┴──────────────────────────────────┴────────────┤
│ x 420  y 310 cm  ·  zoom 100%  ·  Parede: clique para iniciar, Esc encerra │  barra de status
└───────────────────────────────────────────────────────────────────────┘
```

- Toda a interface em **português**; unidades em **centímetros**, exibidas como `3,50 m` nas cotas.
- A barra de status sempre mostra **a próxima ação esperada** da ferramenta ativa (ajuda contextual, como o Floorplanner).
- Primeira abertura: projeto vazio com um balão curto "Comece desenhando paredes (W)".

### Ferramentas e atalhos

| Ferramenta | Atalho | Comportamento |
|---|---|---|
| Selecionar | `V` | Clique seleciona parede/abertura; arrastar a ponta estica a parede; **arrastar o meio move a parede em paralelo** (as vizinhas esticam junto, como no Floorplanner); `Shift`+clique adiciona/remove da seleção; caixa de seleção (da esquerda p/ direita = só o que está inteiro dentro; da direita p/ esquerda = tudo que a caixa toca) |
| Parede | `W` | Clique inicia, cada clique cria um segmento encadeado; **digitar um número + Enter** define o comprimento exato; `Esc` ou duplo clique encerra; clicar no ponto inicial fecha o ambiente |
| Cômodo retangular | `A` | Clique e arraste: cria 4 paredes fechadas de uma vez; digitar `400x300` + Enter define o tamanho exato |
| Porta / Janela | via biblioteca | Arrastar da biblioteca (ou clicar no item e depois na parede); o item se prende à parede mais próxima e mostra as distâncias até as pontas |
| Excluir | `E` ou `Del` | Clique exclui o objeto sob o cursor; `Del` exclui a seleção. Excluir parede exclui seus vãos |
| Mover vista | `Espaço`+arrastar, botão do meio | Pan; roda do mouse = zoom no cursor |
| Desfazer / Refazer | `Ctrl+Z` / `Ctrl+Shift+Z` | Histórico de 100 passos |
| Inverter abertura | `F` | Inverte o lado de abertura da porta selecionada (`Shift+F` inverte a dobradiça) |
| Medir | `M` | Fita métrica temporária: clique em dois pontos e veja a distância (com snaps); não fica salva |
| Cota | `D` | Cota manual persistente entre dois pontos, com afastamento ajustável |
| Texto | `T` | Anotação de texto livre na planta |

As demais ações de produtividade e seus atalhos estão na seção 6.

### Ajudas de precisão (snapping)
Em ordem de prioridade:
1. **Pontas e meio de paredes existentes** (fecha cantos sem gaps).
2. **Ângulos de 0°/45°/90°** (e múltiplos de 15° com `Shift` liberando).
3. **Alinhamento** com pontas de outras paredes (linhas-guia tracejadas).
4. **Grade** de 10 cm (visível em 50 cm / 1 m).
- `Alt` segurado desliga todos os snaps.

### Feedback visual
- Cota do segmento em desenho, ao vivo; cotas de todas as paredes ao selecionar.
- Abertura em posição inválida (sobrepõe outra abertura, maior que a parede) fica **vermelha** e não é solta.
- Hover destaca o objeto que será afetado pela ferramenta ativa (essencial na ferramenta Excluir).

---

## 4. Arquitetura técnica

### Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Build | **Vite + TypeScript** | Rápido, sem servidor; o app é 100% estático |
| UI | **React 19** | Painéis, formulários e biblioteca |
| Desenho 2D | **Konva (react-konva)** | Canvas com hit-testing, camadas, eventos por objeto e `toDataURL` para PNG |
| 3D | **Three.js via @react-three/fiber + drei** | `OrbitControls`, iluminação e câmera prontos |
| Estado | **Zustand** + histórico por *patches* (Immer) | Store simples; desfazer/refazer barato |
| Geometria | **polygon-clipping** | União/diferença de polígonos para cantos de parede e áreas de cômodos |
| Testes | **Vitest** (lógica) + **Playwright** (fluxos principais) | Geometria e persistência são as partes críticas |

Sem backend: tudo roda no navegador.

### Estrutura de pastas

```
src/
  app/                 # layout, barra superior, atalhos globais
  model/               # tipos, criação/edição do documento (puro, sem React)
    types.ts
    project.ts         # operações: addWall, splitWall, moveNode, addOpening…
    geometry.ts        # vetores, interseção, projeção ponto→segmento, polígonos de parede
    validation.ts      # aberturas válidas, paredes degeneradas
    rooms.ts           # detecção de cômodos (faces do grafo de paredes)
    quantities.ts      # áreas e perímetros
    transforms.ts      # mover, girar, espelhar, alinhar, distribuir, copiar/colar
  store/               # Zustand: documento, seleção, ferramenta ativa, histórico
  editor2d/
    Canvas2D.tsx
    layers/            # GridLayer, WallLayer, OpeningLayer, DimensionLayer, GuideLayer
    tools/             # select, wall, room, place, erase, measure, dimension, text (máquina de estados por ferramenta)
    snapping.ts
  viewer3d/
    Scene3D.tsx
    buildWalls.ts      # gera malhas de parede com recortes dos vãos
  library/
    registry.ts        # registro central de componentes
    categories.ts
    components/
      doors/           # swing-single.ts, swing-double.ts, sliding.ts…
      windows/         # sliding-2.ts, casement.ts, fixed.ts…
    LibraryPanel.tsx
  persistence/
    schema.ts          # versão do formato + migrações
    autosave.ts        # localStorage
    fileIO.ts          # salvar/abrir arquivo
    exportPng.ts
  commands/            # registro único de comandos: nome, atalho, ação, "disponível?" (usado por atalhos, menus e paleta)
  ui/                  # componentes genéricos (botões, inputs numéricos, painel de propriedades, painel de áreas)
```

Regra: `model/` e `library/` não dependem de React nem de Konva/Three, para serem testáveis e reaproveitados pelo 2D e pelo 3D.

### Modelo de dados (documento do projeto)

Paredes formam um **grafo**: os nós são pontos compartilhados e as paredes ligam dois nós. Assim, mover um canto
move todas as paredes ligadas a ele, e os cantos ficam sempre fechados.

```ts
type Id = string; // nanoid
type Point = { x: number; y: number }; // cm

interface Project {
  schemaVersion: 1;
  id: Id;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: { gridSize: number; defaultWallThickness: number; defaultWallHeight: number };
  nodes: Record<Id, { id: Id; x: number; y: number }>;          // cm
  walls: Record<Id, {
    id: Id;
    a: Id; b: Id;                 // nós das pontas
    thickness: number;            // cm (padrão 15)
    height: number;               // cm (padrão 280)
  }>;
  openings: Record<Id, {
    id: Id;
    wallId: Id;
    componentId: string;          // ex.: "door.swing-single"
    offset: number;               // cm, do nó "a" até o centro do vão
    width: number;
    height: number;
    sillHeight: number;           // peitoril (0 para portas)
    flipSide: boolean;            // abre para um lado ou outro da parede
    flipHinge: boolean;           // dobradiça à esquerda/direita
    params: Record<string, unknown>; // parâmetros específicos do componente
  }>;
  items: Record<Id, never>;       // reservado: móveis/louças livres (pós-MVP)
  dimensions: Record<Id, {        // cotas manuais
    id: Id; p1: Point; p2: Point; offset: number; locked?: boolean;
  }>;
  texts: Record<Id, {             // anotações
    id: Id; x: number; y: number; text: string; size: number; rotation: number; locked?: boolean;
  }>;
  roomLabels: Record<Id, {        // nome/dados de um cômodo detectado
    id: Id; x: number; y: number; // ponto dentro do cômodo: o cômodo que contém o ponto recebe o nome
    name: string;
    labelOffset?: Point;          // posição do rótulo, se o usuário arrastou
  }>;
}
// paredes e aberturas também têm `locked?: boolean`
// visibilidade de camadas, zoom e vista ficam em `viewState`, salvo junto no autosave, mas fora do documento
```

Consequências do modelo:
- **Abertura ancorada** por `offset` ao longo da parede: ao mover/esticar a parede, o vão a acompanha.
- Ao **dividir** uma parede (desenhar uma parede que nasce no meio dela), as aberturas são redistribuídas entre as duas partes.
- Ao **excluir** uma parede, suas aberturas são excluídas; nós sem paredes são removidos.
- O 2D e o 3D são **derivados** do documento; nunca guardam estado próprio.
- **Cômodos não são guardados como polígonos**: são recalculados das paredes a cada edição (seção 7). Só o nome é
  guardado, preso a um ponto (`roomLabels`). Assim, mover uma parede atualiza a área sem nada ficar dessincronizado.

### Geometria das paredes
- Cada parede vira um polígono (linha central ± espessura/2).
- Nos nós com 2+ paredes, calcula-se a **junção em esquadria** (interseção das bordas) para cantos limpos, como no Sweet Home 3D.
- Os vãos são representados no 2D como "cortes" no polígono da parede, com o símbolo do componente desenhado por cima.

### 3D sem CSG
Em vez de subtrair volumes (lento e frágil), cada parede é montada por **faixas**:
para cada vão, gera-se o trecho sólido antes dele, o peitoril (abaixo) e a verga (acima); depois o trecho seguinte.
Resultado: geometria simples, rápida de regenerar a cada edição. Portas e janelas ganham um modelo 3D simples
(batente + folha/vidro) fornecido pelo próprio componente da biblioteca.

---

## 5. Biblioteca de componentes

O objetivo é que **adicionar um componente novo seja criar um único arquivo**, sem mexer no editor.

### Contrato de um componente

```ts
interface ComponentDef<P = Record<string, unknown>> {
  id: string;                         // "door.swing-single"
  category: CategoryId;               // "doors" | "windows" | (futuro) "bathroom" | "kitchen" | "furniture" | "appliances"
  kind: 'opening' | 'item';           // opening = vai na parede; item = solto no ambiente (pós-MVP)
  name: string;                       // "Porta de giro simples"
  tags: string[];                     // para busca: ["porta", "giro", "abrir"]
  thumbnail: string;                  // SVG gerado a partir do próprio desenho 2D
  defaults: { width: number; height: number; sillHeight: number; params: P };
  presets?: { label: string; width: number }[];   // ex.: 60, 70, 80, 90 cm
  limits: { minWidth: number; maxWidth: number };
  paramsSchema?: ParamField[];        // gera o formulário do painel Propriedades automaticamente
  draw2D(ctx: Draw2DContext, o: OpeningLike): void;   // símbolo de planta
  build3D(o: OpeningLike, wall: WallLike): Object3DSpec; // descrição do modelo 3D
}
```

- `registry.ts` reúne todos os componentes e expõe `getComponent(id)`, `listByCategory()` e `search(texto)`.
- O painel **Propriedades** é gerado a partir de `defaults`, `presets`, `limits` e `paramsSchema`, então um componente novo já ganha edição sem código de UI.
- A miniatura é renderizada a partir de `draw2D`, para a biblioteca e a planta nunca ficarem diferentes.

### Catálogo inicial

| Categoria | Componente | Padrões |
|---|---|---|
| Portas | Porta de giro simples | 80 × 210 cm, presets 60/70/80/90 |
| Portas | Porta de giro dupla | 140 × 210 cm |
| Portas | Porta de correr | 90 × 210 cm |
| Portas | Vão livre (sem folha) | 80 × 210 cm |
| Janelas | Janela de correr 2 folhas | 120 × 120 cm, peitoril 100 cm |
| Janelas | Janela de abrir (2 folhas) | 100 × 120 cm, peitoril 100 cm |
| Janelas | Basculante | 60 × 60 cm, peitoril 160 cm |
| Janelas | Janela fixa | 100 × 100 cm, peitoril 100 cm |

Categorias futuras já aparecem na árvore como "em breve" (desativadas), deixando clara a organização final:
Banheiro (pia, chuveiro, vaso), Cozinha (pia, bancada), Móveis, Eletrodomésticos.

### Painel da biblioteca
- Busca por nome e tags, no topo.
- Categorias recolhíveis, com contador de itens.
- Cartões com miniatura + nome + medida padrão.
- Arrastar para a planta, ou clicar e depois clicar na parede (melhor no touch).

---

## 6. Ferramentas de produtividade

Objetivo: tudo o que um usuário de Figma, PowerPoint ou Floorplanner espera encontrar, com os mesmos atalhos.
Todas as ações ficam num **registro único de comandos** (`src/commands/`), e cada uma aparece em três lugares:
atalho de teclado, menu de contexto (botão direito) e **paleta de comandos** (`Ctrl+K`). Uma ação nova é
registrada uma vez e aparece em todos.

### Histórico
| Ação | Atalho | Detalhe |
|---|---|---|
| Desfazer / Refazer | `Ctrl+Z` / `Ctrl+Shift+Z` (ou `Ctrl+Y`) | 100 passos; arrastar conta como **um** passo, não um por pixel |
| Histórico visível | painel opcional | Lista das últimas ações ("Parede criada", "Porta movida"…); clicar volta até aquele ponto |

### Seleção
| Ação | Atalho | Detalhe |
|---|---|---|
| Selecionar tudo | `Ctrl+A` | |
| Limpar seleção | `Esc` | |
| Selecionar semelhantes | menu de contexto | Ex.: todas as janelas de correr, todas as paredes de 15 cm |
| Selecionar paredes do cômodo | duplo clique dentro do cômodo | |
| Ciclar objetos sobrepostos | `Tab` com o cursor parado | Útil quando porta e parede estão no mesmo ponto |

### Área de transferência
| Ação | Atalho | Detalhe |
|---|---|---|
| Copiar / Recortar / Colar | `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Cola na posição do cursor; paredes coladas se ligam às existentes quando as pontas coincidem |
| Colar no mesmo lugar | `Ctrl+Shift+V` | |
| Duplicar | `Ctrl+D` | Cópia com deslocamento; **repetir `Ctrl+D` repete o mesmo deslocamento** (cria séries rapidamente) |
| Copiar / colar propriedades | `Ctrl+Alt+C` / `Ctrl+Alt+V` | Ex.: aplicar espessura e altura de uma parede em outras; medidas de uma janela em outras |
| Entre projetos | — | O conteúdo copiado vai para a área de transferência do sistema em JSON, então dá para colar em outra aba |

### Transformações
| Ação | Atalho | Detalhe |
|---|---|---|
| Mover com teclado | setas | 1 cm; `Shift`+setas = 10 cm |
| Mover com precisão | painel Propriedades | Campos X/Y e "mover por…" (ex.: `+120` cm) |
| Girar 90° | `R` / `Shift+R` | Gira a seleção em torno do centro |
| Girar livre | alça na seleção | Com snap de 15°; ângulo digitável |
| Espelhar | `Shift+H` / `Shift+V` | Horizontal / vertical; portas invertem o lado de abertura junto |
| Escalar planta | comando "Redimensionar…" | Ajusta toda a seleção para uma medida conhecida (útil para corrigir um desenho fora de escala) |

### Alinhar e distribuir
| Ação | Detalhe |
|---|---|
| Alinhar à esquerda / centro / direita / topo / meio / base | Aplica-se a pontos, paredes, textos e cotas selecionados |
| Distribuir igualmente | Horizontal ou vertical |
| **Centralizar abertura na parede** | Botão no painel da porta/janela |
| **Distribuir aberturas na parede** | Ex.: 3 janelas selecionadas na mesma parede ficam com espaçamentos iguais |
| Distância até a ponta | Painel mostra e permite digitar a distância da abertura até cada ponta da parede |

### Paredes
| Ação | Detalhe |
|---|---|
| Dividir parede | Menu de contexto "Dividir aqui" ou ferramenta Parede clicando no meio de uma parede |
| Unir paredes | Junta duas paredes colineares que compartilham um nó numa só (mantendo as aberturas) |
| Inserir / remover nó | Duplo clique na parede insere; excluir um nó entre duas paredes colineares as une |
| Mover em paralelo | Arrastar o meio da parede (ver Selecionar); valor digitável |
| Comprimento com âncora | Ao digitar o comprimento, escolher qual ponta fica fixa (início, centro, fim) |
| Edição em lote | Com várias paredes selecionadas, mudar espessura/altura altera todas |
| Converter cômodo | Selecionar um cômodo e mudar a espessura de todas as suas paredes de uma vez |

### Organização
| Ação | Atalho | Detalhe |
|---|---|---|
| Bloquear / desbloquear | `Ctrl+Shift+L` | Objeto bloqueado não é selecionado por clique nem por caixa |
| Camadas | painel ou menu Exibir | Mostrar/ocultar: grade, cotas automáticas, cotas manuais, textos, aberturas, nomes e áreas dos cômodos |
| Ajustar à tela | `Shift+1` | Enquadra todo o desenho; `Shift+2` enquadra a seleção |
| Zoom 100% | `Shift+0` | 1:1 da escala padrão |

### Descoberta
| Ação | Atalho | Detalhe |
|---|---|---|
| Paleta de comandos | `Ctrl+K` | Buscar qualquer ação pelo nome ("espelhar", "exportar png"…) |
| Lista de atalhos | `?` | Janela com todos os atalhos, gerada do registro de comandos |
| Menu de contexto | botão direito | Só as ações válidas para o que está sob o cursor/seleção |
| Dicas na barra de status | — | A ferramenta ativa diz o que fazer a seguir e quais modificadores existem |

---

## 7. Áreas e quantitativos

### Detecção de cômodos
- O grafo de paredes é planar (nós em todos os encontros), então os cômodos são as **faces fechadas** do grafo,
  encontradas percorrendo as paredes sempre pela curva mais fechada (algoritmo clássico de faces de grafo planar).
- O polígono interno de cada cômodo é a face **menos** os polígonos das paredes (via `polygon-clipping`):
  a área vai até a face interna das paredes, como numa planta técnica.
- Recalculado a cada edição (rápido: dezenas de paredes em menos de 1 ms).
- Cada cômodo mostra no centro: **nome** (editável com duplo clique no rótulo) e **área** (`12,35 m²`).
  Nomes sugeridos: "Cômodo 1", "Cômodo 2"…, com lista rápida (Sala, Quarto, Cozinha, Banheiro, Área de serviço, Varanda…).

### O que é calculado

| Medida | Definição | Uso |
|---|---|---|
| **Área total (construída)** | Área do contorno externo da edificação, **incluindo as paredes** | Número "oficial" da planta |
| **Área útil** | Soma das áreas internas dos cômodos (até a face interna das paredes) | Área efetivamente utilizável |
| **Área por cômodo** | Área interna de cada cômodo | Rótulo na planta e lista |
| **Área de paredes em planta** | Área ocupada pelas paredes no piso (soma dos polígonos de parede, sem sobreposição nos cantos) | Conferência: construída ≈ útil + paredes |
| **Área de paredes (superfície)** | Para cada face de parede: comprimento real da face × altura, **menos a área dos vãos** de portas e janelas. Separada em faces **internas** e **externas** | Pintura, revestimento, orçamento |
| **Área de parede por cômodo** | Soma das faces voltadas para aquele cômodo, menos vãos | Ex.: quanto azulejo no banheiro |
| **Perímetro** | Por cômodo (rodapé) e externo da edificação | Rodapé, contorno |
| **Contagens** | Nº de portas e janelas, por tipo; área total de vãos | Lista de materiais |

Detalhes que fazem os números baterem com a realidade:
- O comprimento das faces usa o polígono real da parede (com cantos em esquadria), não a linha central:
  num cômodo de 4×3 m com parede de 15 cm, a face interna é menor que a linha central.
- Vãos são descontados da face dos dois lados da parede.
- Paredes soltas (que não fecham cômodo) entram na área de paredes, mas não criam cômodo.

### Onde aparece
- **Painel "Áreas"** (aba ao lado de Propriedades): área total, área útil, área de paredes (planta e superfície interna/externa),
  perímetro e tabela por cômodo (nome, área, perímetro, área de parede). Selecionar um cômodo na tabela o destaca na planta.
- **Barra de status**: área total e área útil sempre visíveis.
- **Seleção**: ao selecionar paredes, mostra a soma do comprimento e da área de superfície delas.
- **Exportar PNG**: opção de incluir nomes/áreas dos cômodos e um quadro de áreas no canto.
- **Copiar tabela**: botão que copia o quadro de áreas para colar em planilha (texto separado por tabulação).

---

## 8. Persistência e exportação

| Função | Como funciona |
|---|---|
| **Continuar de onde parou** | O documento é salvo no `localStorage` (`planbuilder:autosave`) 500 ms após cada alteração. Ao abrir o app, ele é restaurado automaticamente, junto com zoom e posição da vista |
| **Salvar projeto** | Gera `NomeDoProjeto.planbuilder.json`. Onde existir a *File System Access API* (Chrome/Edge), `Ctrl+S` regrava no mesmo arquivo; nos demais navegadores, faz download |
| **Abrir projeto** | Seletor de arquivo (`.json`) ou arrastar o arquivo para a janela. Valida o formato e aplica migrações de versão. Se houver alterações não salvas, pede confirmação |
| **Novo projeto** | Confirma se houver alterações não salvas e limpa o documento |
| **Exportar PNG** | Planta 2D renderizada fora da tela: fundo branco, enquadrada no desenho com margem, cotas incluídas, grade opcional, resolução 2× ou 4×. Na vista 3D, exporta a imagem da câmera atual |

Robustez:
- `schemaVersion` em todo arquivo, com migrações em `persistence/schema.ts`, para projetos antigos sempre abrirem.
- Arquivo inválido mostra mensagem clara e não apaga o projeto atual.
- Se o `localStorage` estiver cheio ou bloqueado, aviso discreto sugerindo "Salvar projeto".
- Indicador "Salvo / Alterações não salvas no arquivo" na barra superior.

---

## 9. Fases de entrega

Cada fase é uma branch `feat/*` com PR para a `dev`, seguindo o fluxo do repositório.
Ao fim de cada fase o app funciona e pode ser usado.

| Fase | Branch | Entrega | Critério de pronto |
|---|---|---|---|
| 0 | `feat/setup` | Vite + TS + React, lint, Vitest, CI de build e testes, layout vazio da tela, registro de comandos e store com histórico (desfazer/refazer já nasce aqui) | `npm run build` e testes passam no CI |
| 1 | `feat/editor-paredes` | Canvas 2D com grade, zoom e pan; ferramentas Parede e Cômodo retangular, snaps e comprimento digitado; seleção (clique, `Shift`, caixa), mover em paralelo, edição numérica e em lote; dividir/unir paredes; exclusão; cantos em esquadria | Desenhar uma planta de 3 cômodos em menos de 1 min, com cotas corretas |
| 2 | `feat/biblioteca-aberturas` | Registro de componentes, painel da biblioteca, 4 portas + 4 janelas, inserção presa à parede, propriedades geradas pelo componente, centralizar/distribuir na parede | Inserir, mover, redimensionar, inverter e excluir portas e janelas; posições inválidas bloqueadas |
| 3 | `feat/areas` | Detecção de cômodos, nomes, área total, área útil, área de paredes (planta e superfície), perímetros, painel Áreas, copiar tabela | Valores conferidos contra casos calculados à mão nos testes |
| 4 | `feat/produtividade` | Copiar/recortar/colar/duplicar, girar, espelhar, alinhar/distribuir, setas, copiar propriedades, bloquear, camadas, menu de contexto, paleta de comandos, lista de atalhos, medir, cotas manuais, textos | Todas as ações da seção 6 funcionam pelo atalho, pelo menu de contexto e pela paleta |
| 5 | `feat/persistencia` | Autosave, salvar/abrir arquivo, novo projeto, exportar PNG (com quadro de áreas opcional) | Recarregar a página preserva tudo; arquivo salvo reabre idêntico; PNG legível |
| 6 | `feat/vista-3d` | Vista 3D e modo dividido, paredes com vãos, modelos simples de porta/janela, órbita da câmera, PNG do 3D | Toda edição no 2D aparece no 3D imediatamente |
| 7 | `feat/acabamento` | Onboarding curto, mensagens de erro, testes E2E dos fluxos principais, ajustes de desempenho | Fluxo completo (desenhar → portas/janelas → áreas → 3D → salvar → reabrir → PNG) coberto por teste E2E |

Release: tornar o repositório público, adicionar o workflow de deploy no GitHub Pages (`base` do Vite = `/PlanBuilder/`) e ativar Settings → Pages → Source: GitHub Actions.

O autosave simples (só `localStorage`, sem arquivo) pode ser antecipado para a fase 1 se for útil durante o desenvolvimento.

---

## 10. Testes

- **Unidade (Vitest):** geometria (interseções, esquadrias, projeção), operações do modelo (dividir/unir/excluir parede com aberturas), validação de aberturas, transformações (girar/espelhar/colar mantendo ligações), migrações de esquema, ida e volta salvar → abrir.
- **Áreas (Vitest):** plantas de referência com valores calculados à mão (cômodo único, dois cômodos com parede compartilhada, planta em L, cômodo com porta e janela, parede solta) para área total, útil, de paredes e perímetros.
- **E2E (Playwright):** desenhar ambiente, inserir porta e janela, conferir áreas, copiar/colar e desfazer, recarregar e conferir autosave, salvar/abrir arquivo, exportar PNG.

---

## 11. Roadmap depois do MVP

| Versão | Conteúdo |
|---|---|
| **v1.0 (primeiro release no Pages)** | Objetos soltos (móveis, louças, eletrodomésticos) com girar/espelhar/encostar na parede; bibliotecas de banheiro, cozinha, móveis e eletrodomésticos; agrupar; imagem de fundo para decalcar (com calibração de escala); PDF em escala (1:50, 1:100) com carimbo |
| **v1.x** | Cor/textura de piso por cômodo e de parede por face; vários pavimentos; escadas; andar em primeira pessoa no 3D; modelos prontos; PWA (offline/instalável) |
| **v2** | Telhado; paredes curvas; pilares e vigas; área externa; iluminação e sol; importar modelos 3D (glTF); exportar SVG/DXF |
| Fora do escopo (exige servidor) | Contas, projetos na nuvem, compartilhamento por link, colaboração, recursos de IA |

---

## 12. Riscos e decisões

| Risco | Mitigação |
|---|---|
| Cantos de parede com 3+ paredes ficam feios | Começar com esquadria em junções de 2 paredes; para 3+, usar união de polígonos simples |
| Desempenho com plantas grandes | Konva com camadas separadas (grade estática, paredes, interação); 3D regenerado só para paredes alteradas |
| Formato do arquivo mudar com o tempo | `schemaVersion` + migrações desde a versão 1 |
| Erros de área em plantas irregulares (paredes que se cruzam sem nó, cantos com 3+ paredes) | A ferramenta Parede sempre cria nó nos cruzamentos; testes com plantas de referência; aviso quando há paredes quase encostando (gap < 1 cm) que impede fechar o cômodo |
| Conflito de atalhos com o navegador | Atalhos escolhidos para não colidir com `Ctrl+R`, `Ctrl+L`, `Ctrl+W`, `Ctrl+T`; todos passam pelo registro de comandos, então mudar um atalho é mudar uma linha |
| Touch/tablet | Fluxo "clicar item → clicar parede" além do arrastar; botões de ferramenta grandes |
| Hospedagem | Feito: o repositório é público e o workflow `deploy.yml` publica a `main` no GitHub Pages (https://tropical-yetti.github.io/PlanBuilder/). Decisão original: publicar no **GitHub Pages só na fase de release**. Como a conta é Free, o repositório será tornado público nesse momento (Pages em repo privado exige plano pago). Até lá, o app roda localmente (`npm run dev` / `npm run preview`). O workflow de deploy do Pages entra junto com o release, não antes |
