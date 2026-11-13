# PlanBuilder — Plano do produto e da implementação

Editor web de plantas baixas em 2D com visualização 3D, para quem não é arquiteto mas precisa
desenhar uma planta correta em poucos minutos.

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
- Desfazer/refazer.

### Depois do MVP
- Pias, chuveiros, vasos, móveis e eletrodomésticos (a biblioteca já nasce preparada).
- Detecção de ambientes (cômodos) com nome e área.
- Múltiplos pavimentos, texturas/cores de piso e parede, modo "caminhar" no 3D.
- Exportar PDF/SVG e impressão em escala.

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
| Selecionar | `V` | Clique seleciona parede/abertura; arrastar move; arrastar ponta da parede estica; `Shift` adiciona à seleção; caixa de seleção |
| Parede | `W` | Clique inicia, cada clique cria um segmento encadeado; **digitar um número + Enter** define o comprimento exato; `Esc` ou duplo clique encerra; clicar no ponto inicial fecha o ambiente |
| Porta / Janela | via biblioteca | Arrastar da biblioteca (ou clicar no item e depois na parede); o item se prende à parede mais próxima e mostra as distâncias até as pontas |
| Excluir | `E` ou `Del` | Clique exclui o objeto sob o cursor; `Del` exclui a seleção. Excluir parede exclui seus vãos |
| Mover vista | `Espaço`+arrastar, botão do meio | Pan; roda do mouse = zoom no cursor |
| Desfazer / Refazer | `Ctrl+Z` / `Ctrl+Shift+Z` | Histórico de 100 passos |
| Inverter abertura | `F` | Inverte o lado de abertura da porta selecionada |

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
  store/               # Zustand: documento, seleção, ferramenta ativa, histórico
  editor2d/
    Canvas2D.tsx
    layers/            # GridLayer, WallLayer, OpeningLayer, DimensionLayer, GuideLayer
    tools/             # selectTool, wallTool, placeTool, eraseTool (máquina de estados por ferramenta)
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
  ui/                  # componentes genéricos (botões, inputs numéricos, painel de propriedades)
```

Regra: `model/` e `library/` não dependem de React nem de Konva/Three, para serem testáveis e reaproveitados pelo 2D e pelo 3D.

### Modelo de dados (documento do projeto)

Paredes formam um **grafo**: os nós são pontos compartilhados e as paredes ligam dois nós. Assim, mover um canto
move todas as paredes ligadas a ele, e os cantos ficam sempre fechados.

```ts
type Id = string; // nanoid

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
}
```

Consequências do modelo:
- **Abertura ancorada** por `offset` ao longo da parede: ao mover/esticar a parede, o vão a acompanha.
- Ao **dividir** uma parede (desenhar uma parede que nasce no meio dela), as aberturas são redistribuídas entre as duas partes.
- Ao **excluir** uma parede, suas aberturas são excluídas; nós sem paredes são removidos.
- O 2D e o 3D são **derivados** do documento; nunca guardam estado próprio.

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

## 6. Persistência e exportação

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

## 7. Fases de entrega

Cada fase é uma branch `feat/*` com PR para a `dev`, seguindo o fluxo do repositório.
Ao fim de cada fase o app funciona e pode ser usado.

| Fase | Branch | Entrega | Critério de pronto |
|---|---|---|---|
| 0 | `feat/setup` | Vite + TS + React, lint, Vitest, CI de build e testes, layout vazio da tela | `npm run build` e testes passam no CI |
| 1 | `feat/editor-paredes` | Canvas 2D com grade, zoom e pan; ferramenta Parede com encadeamento, snaps e comprimento digitado; seleção, edição numérica, exclusão; cantos em esquadria | Desenhar um retângulo 4×3 m fechado em menos de 30 s, com cotas corretas |
| 2 | `feat/biblioteca-aberturas` | Registro de componentes, painel da biblioteca, 4 portas + 4 janelas, inserção presa à parede, propriedades geradas pelo componente | Inserir, mover, redimensionar, inverter e excluir portas e janelas; posições inválidas bloqueadas |
| 3 | `feat/persistencia` | Autosave, salvar/abrir arquivo, novo projeto, exportar PNG, desfazer/refazer | Recarregar a página preserva tudo; arquivo salvo reabre idêntico; PNG legível |
| 4 | `feat/vista-3d` | Vista 3D e modo dividido, paredes com vãos, modelos simples de porta/janela, órbita da câmera, PNG do 3D | Toda edição no 2D aparece no 3D imediatamente |
| 5 | `feat/acabamento` | Onboarding curto, atalhos documentados, mensagens de erro, testes E2E dos fluxos principais, ajustes de desempenho | Fluxo completo (desenhar → portas/janelas → 3D → salvar → reabrir → PNG) coberto por teste E2E |

Depois do MVP: `feat/ambientes-area`, `feat/biblioteca-banheiro`, `feat/biblioteca-cozinha`, `feat/biblioteca-moveis`, `feat/biblioteca-eletrodomesticos`.

---

## 8. Testes

- **Unidade (Vitest):** geometria (interseções, esquadrias, projeção), operações do modelo (dividir/excluir parede com aberturas), validação de aberturas, migrações de esquema, ida e volta salvar → abrir.
- **E2E (Playwright):** desenhar ambiente, inserir porta e janela, recarregar e conferir autosave, salvar/abrir arquivo, exportar PNG.

---

## 9. Riscos e decisões

| Risco | Mitigação |
|---|---|
| Cantos de parede com 3+ paredes ficam feios | Começar com esquadria em junções de 2 paredes; para 3+, usar união de polígonos simples |
| Desempenho com plantas grandes | Konva com camadas separadas (grade estática, paredes, interação); 3D regenerado só para paredes alteradas |
| Formato do arquivo mudar com o tempo | `schemaVersion` + migrações desde a versão 1 |
| Touch/tablet | Fluxo "clicar item → clicar parede" além do arrastar; botões de ferramenta grandes |
| Hospedagem | O build é estático. GitHub Pages em repositório privado exige plano pago; alternativas: Netlify/Vercel/Cloudflare Pages ou abrir o build localmente |
