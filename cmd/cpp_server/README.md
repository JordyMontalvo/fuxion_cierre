# C++ Engine

Servidor HTTP en C++ compatible con el frontend:

- `GET /calculate`
- `GET /tree?id=<id>`
- `POST /transaction`

## Ejecutar

```bash
cd cmd/cpp_server
make run
```

Por defecto levanta en `http://localhost:8081`.

## Variables opcionales

- `CPP_ENGINE_USER_COUNT`: cantidad de usuarios generados en memoria (default `100000`).

Ejemplo:

```bash
CPP_ENGINE_USER_COUNT=250000 make run
```
