# PlanBuilder

## Fluxo de branches

| Branch | Função |
|---|---|
| `main` | Produção. Recebe apenas `fix/*` (bugs) e o merge de `dev` (releases). |
| `dev` | Integração. Recebe as features via PR. |
| `feat/<nome>` | Uma branch por feature. Sai de `dev`, volta por PR para `dev`. |
| `fix/<nome>` | Uma branch por bug. Sai de `main`, volta por PR para `main`. |

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o passo a passo.
