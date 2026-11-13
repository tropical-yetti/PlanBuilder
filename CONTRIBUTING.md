# Como contribuir

Toda modificação é feita numa branch própria. Nunca faça commit direto em `main` ou `dev`.

## Feature (nova funcionalidade)

```bash
git checkout dev && git pull
git checkout -b feat/minha-feature
# ... commits ...
git push -u origin feat/minha-feature
gh pr create --base dev --title "feat: minha feature"
```

## Bug

```bash
git checkout main && git pull
git checkout -b fix/meu-bug
# ... commits ...
git push -u origin fix/meu-bug
gh pr create --base main --title "fix: meu bug"
```

Depois do merge de um `fix/*` na `main`, sincronize a `dev`:

```bash
git checkout dev && git pull && git merge origin/main && git push
```

## Release

Para levar as features para produção, abra um PR de `dev` → `main`.

## Regras verificadas automaticamente

O workflow `.github/workflows/branch-policy.yml` falha o PR quando:
- um PR para `dev` não vem de `feat/*` (ou de `main`, para sincronização);
- um PR para `main` não vem de `fix/*` ou `dev`.
