# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## Unreleased

### BREAKING CHANGE

* **auth:** nueva env var obligatoria `JWT_PARTICIPANTE_SECRET` (Regla de
  negocio: Segregación de Auth — evaluadorToken y participanteToken ya no
  comparten secreto de firma). El backend no arranca sin ella. Agregarla a tu
  `.env` (y `apps/backend/.env` si no usás Docker) — ver `env.example`.

## 1.0.0 (2026-08-03)

### Features

* **card-sorting:** implementa arquitectura end-to-end, modelo relacional 3FN y UI ([6d00368](https://github.com/tvasquezm/observatorio-ux/commit/6d003685565592dc3958b06d3f12d84ef1ea37f0))
