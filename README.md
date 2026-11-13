# PlanBuilder

Editor web de plantas baixas em 2D com visualização 3D. Roda inteiramente no navegador.

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
| `npm run lint` | Verificação de código (oxlint) |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |

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
