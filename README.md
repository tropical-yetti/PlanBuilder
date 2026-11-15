# PlanBuilder

Editor web de plantas baixas em 2D com visualização 3D. Roda inteiramente no navegador.

**Use agora:** https://tropical-yetti.github.io/PlanBuilder/

## O que o app faz

- **Planta 2D:** paredes com medida digitada, cômodos retangulares, cantos sempre fechados, ajudas de precisão (pontas, meio, ângulos, alinhamento, grade).
- **Portas, janelas e cobogós:** 5 portas (giro simples e dupla, correr, sanfonada e vão livre), 4 janelas e 2 tipos de cobogó (painel e faixa), presos à parede, com medidas editáveis e estimativa de peças de cobogó.
- **Móveis:** sofás de 2 e 3 lugares, poltrona, mesas quadrada, retangular e redonda (com cadeiras) e camas em todos os tamanhos padrão (solteiro, solteirão, viúva, casal, queen e king). Sofás, camas e poltronas encostam sozinhos na parede.
- **Gabinetes de cozinha e lavanderia:** gabinete de pia (cuba simples ou dupla), balcão, armários aéreos (com a altura do piso editável), gabinete com tanque e armário alto.
- **Eletrodomésticos** com medidas de modelos Brastemp: fogões de 4, 5 e 6 bocas, geladeiras duplex, inverse e side inverse, máquina de lavar (abertura superior), lava e seca (abertura frontal) e lava-louças de 8, 10 e 14 serviços. Encostam na parede; o giro das portas aparece tracejado.
- **Áreas:** cômodos detectados automaticamente, área total, área útil, superfície de paredes (descontando vãos) e perímetros.
- **Vista 3D:** gerada da planta, lado a lado ou em tela cheia.
- **Produtividade:** copiar e colar, duplicar, girar, espelhar, alinhar, bloquear, camadas, cotas, textos, medir, histórico.
- **Arquivos:** salvamento automático no navegador, salvar e abrir `.planbuilder.json`, exportar PNG (planta ou 3D).

Tudo roda no navegador; nenhum dado sai do seu computador.

## Como usar

| Para… | Faça |
|---|---|
| Criar um cômodo | `A`, clique num canto, digite `400x300` e `Enter` (ou arraste) |
| Desenhar parede por parede | `W`, clique em cada canto; digite o comprimento + `Enter`; `Esc` encerra |
| Inserir porta, janela ou cobogó | Clique no item da biblioteca e depois na parede (ou arraste) |
| Inserir móvel | Clique no item da biblioteca e depois na planta; perto de uma parede ele encosta; `R` gira |
| Selecionar e mover | `V`; arraste a parede, o canto, a porta ou o móvel |
| Mover sem mudar ângulos | Segure `Shift` ou `Ctrl` ao arrastar: a parede leva junto a linha reta inteira; cantos, móveis e grupos andam só na horizontal ou vertical |
| Dar nome a um cômodo | Duplo clique dentro dele |
| Ver as áreas | Aba **Áreas** do painel lateral |
| Ver em 3D | Botões **Dividido** ou **3D**, no alto à direita |
| Medir, cotar, escrever | `M`, `D`, `T` |
| Desfazer / refazer | `Ctrl+Z` / `Ctrl+Shift+Z` |
| Salvar em arquivo | `Ctrl+S` |
| Exportar imagem | `Ctrl+Shift+E` |
| Achar qualquer comando | `Ctrl+K` |
| Ver todos os atalhos | `?` |

O botão direito mostra as ações disponíveis para o objeto sob o cursor. No Mac, use `Cmd` no lugar de `Ctrl`.

## Rodando localmente

Requer Node.js 22 ou mais recente.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarregamento automático |
| `npm test` | Testes unitários (Vitest) |
| `npm run e2e` | Testes de ponta a ponta no navegador (Playwright), contra o build de produção |
| `npm run lint` | Verificação de código (oxlint) |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção em http://localhost:4173/PlanBuilder/ |

Na primeira vez, os testes de ponta a ponta precisam do navegador de teste:

```bash
npx playwright install chromium
```

## Estrutura do código

| Pasta | Conteúdo |
|---|---|
| `src/model/` | Documento do projeto e as operações sobre ele (paredes, aberturas, áreas, transformações). Sem React |
| `src/library/` | Biblioteca de componentes: portas, janelas, cobogós e móveis |
| `src/editor2d/` | Canvas 2D (Konva), ferramentas e ajudas de precisão |
| `src/viewer3d/` | Vista 3D (three.js) |
| `src/commands/` | Registro único de comandos e atalhos |
| `src/persistence/` | Salvamento automático, arquivos e exportação |
| `src/app/` | Telas, painéis e diálogos |
| `e2e/` | Testes de ponta a ponta |

Para criar um componente novo na biblioteca, copie um arquivo de `src/library/components/` e acrescente-o à lista de `src/library/registry.ts`. Há dois tipos: `OpeningDef` (vai na parede: portas, janelas, cobogós) e `ItemDef` (solto no cômodo: móveis), descritos em `src/library/types.ts`.

## Publicação

O site é publicado no GitHub Pages pelo workflow `.github/workflows/deploy.yml` a cada atualização da `main` (ou manualmente, em Actions → "Publicar no GitHub Pages" → Run workflow). O build usa o caminho base `/PlanBuilder/`.

Configuração feita uma única vez no GitHub: Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Versões

A versão fica no `package.json` e aparece no app (ao lado do nome, no alto da tela, e na lista de atalhos). Cada release ganha uma tag `vX.Y.Z` na `main`.

| Versão | O que trouxe |
|---|---|
| 0.1.0 | Primeira versão pública (MVP) |

Para a próxima versão: atualize o `package.json` com `npm version X.Y.Z --no-git-tag-version` num PR para a `dev`, faça o release (`dev` → `main`) e crie a tag `vX.Y.Z` no commit do release.

## Fluxo de branches

| Branch | Função |
|---|---|
| `main` | Produção. Recebe apenas `fix/*` (bugs) e o merge de `dev` (releases). |
| `dev` | Integração. Recebe as features via PR. |
| `feat/<nome>` | Uma branch por feature. Sai de `dev`, volta por PR para `dev`. |
| `fix/<nome>` | Uma branch por bug. Sai de `main`, volta por PR para `main`. |

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o passo a passo.

## Planejamento

O plano completo do produto (referências, UX, arquitetura, biblioteca de componentes e fases) está em [docs/PLANO.md](docs/PLANO.md).
