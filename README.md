# Prueba Técnica Backend — Mini Sistema de Pagos

Sistema de gestión de pagos manuales con arquitectura de microservicios. Incluye un API Gateway (Express.js), un servicio de pagos (NestJS) y un servicio de notificaciones (NestJS), todos conectados a PostgreSQL con comunicación asíncrona via Redis pub/sub.

---

## Requisitos previos

- Docker >= 24
- Docker Compose >= 2.20
- Node.js 20+ (solo si se corre localmente sin Docker)

---

## Levantar el proyecto

```bash
cp .env.example .env
docker-compose up --build
```

Esto levanta:

| Servicio             | URL                        |
|----------------------|----------------------------|
| API Gateway          | http://localhost:3000       |
| Payment Service      | http://localhost:3001       |
| Notification Service | http://localhost:3002       |
| PostgreSQL           | localhost:5432              |
| Redis                | localhost:6379              |

Las migraciones de Prisma se ejecutan automáticamente al iniciar cada servicio.

---

## Variables de entorno

| Variable              | Servicio            | Default                    | Descripción                        |
|-----------------------|---------------------|----------------------------|------------------------------------|
| `POSTGRES_USER`       | postgres            | `pguser`                   | Usuario de PostgreSQL              |
| `POSTGRES_PASSWORD`   | postgres            | `pgpassword`               | Contraseña de PostgreSQL           |
| `POSTGRES_DB`         | postgres            | `payments_db`              | Nombre de la base de datos         |
| `JWT_SECRET`          | api-gateway         | `PRUEBA_TECNICA_SECRET_KEY`| Clave simétrica para JWT           |
| `PAYMENT_SERVICE_URL` | api-gateway         | `http://payment-service:3001` | URL interna del payment-service |
| `NOTIFICATION_SERVICE_URL` | api-gateway    | `http://notification-service:3002` | URL interna del notification-service |
| `REDIS_HOST`          | payment/notification| `redis`                    | Host de Redis                      |
| `REDIS_PORT`          | payment/notification| `6379`                     | Puerto de Redis                    |

---

## Autenticación

Todos los endpoints (excepto `/health`) requieren autenticación. El gateway soporta dos modos:

**JWT:**
```
Authorization: Bearer <token>
```

**API Key:**
```
x-api-key: <api_key_del_merchant>
```

Si no se envía ninguno, el gateway retorna `401`.

---

## Endpoints

### API Gateway — `http://localhost:3000`

| Método | Ruta                           | Descripción                         |
|--------|--------------------------------|-------------------------------------|
| GET    | /api/v1/health                 | Estado agregado de todos los servicios |
| POST   | /api/v1/transactions           | Crear transacción                   |
| GET    | /api/v1/transactions           | Listar transacciones (paginado)     |
| GET    | /api/v1/transactions/:id       | Detalle de transacción              |
| PATCH  | /api/v1/transactions/:id/status| Cambiar estado de transacción       |
| POST   | /api/v1/settlements/generate   | Generar liquidación                 |
| GET    | /api/v1/settlements/:id        | Detalle de liquidación              |
| GET    | /api/v1/notifications          | Listar notificaciones               |
| GET    | /api/v1/notifications/:id      | Detalle de notificación             |

---

## Ejemplos de request/response

### Crear transacción

```
POST /api/v1/transactions
x-api-key: your-api-key
Content-Type: application/json

{
  "merchant_id": "uuid-del-merchant",
  "amount": 150.00,
  "currency": "COP",
  "type": "payin",
  "metadata": { "order_id": "ORD-001" }
}
```

Respuesta `201`:
```json
{
  "id": "uuid",
  "merchant_id": "uuid",
  "amount": "150.00",
  "currency": "COP",
  "type": "payin",
  "status": "pending",
  "reference": "TXN-20260327-A3F8K2",
  "metadata": { "order_id": "ORD-001" },
  "created_at": "2026-03-27T10:00:00.000Z",
  "updated_at": "2026-03-27T10:00:00.000Z"
}
```

### Listar transacciones

```
GET /api/v1/transactions?page=1&limit=20&status=approved&date_from=2026-01-01T00:00:00Z
x-api-key: your-api-key
```

Respuesta `200`:
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "total_pages": 8
  }
}
```

### Cambiar estado de transacción

```
PATCH /api/v1/transactions/:id/status
x-api-key: your-api-key
Content-Type: application/json

{
  "status": "approved"
}
```

Transición inválida — Respuesta `422`:
```json
{
  "statusCode": 422,
  "message": "Transicion de estado invalida: no se puede cambiar de 'rejected' a 'approved'",
  "error": "Unprocessable Entity"
}
```

### Generar liquidación

```
POST /api/v1/settlements/generate
x-api-key: your-api-key
Content-Type: application/json

{
  "merchant_id": "uuid-del-merchant",
  "period_start": "2026-03-01T00:00:00Z",
  "period_end": "2026-03-31T23:59:59Z"
}
```

Respuesta `201`:
```json
{
  "id": "uuid",
  "merchant_id": "uuid",
  "total_amount": "4500.00",
  "transaction_count": 12,
  "status": "pending",
  "period_start": "2026-03-01T00:00:00.000Z",
  "period_end": "2026-03-31T23:59:59.000Z",
  "created_at": "2026-03-27T10:00:00.000Z"
}
```

### Listar notificaciones

```
GET /api/v1/notifications?merchant_id=uuid&page=1&limit=20
x-api-key: your-api-key
```

---

## Máquina de estados — Transacciones

```
pending  --> approved
pending  --> rejected
pending  --> failed
approved --> completed
approved --> failed
```

Cualquier otra transición retorna `422 Unprocessable Entity`.

---

## Rate Limiting

El gateway implementa rate limiting en memoria: **100 requests por minuto** por API key. Al exceder el límite se retorna `429 Too Many Requests` con el header `Retry-After`.

---

## Circuit Breaker

El gateway protege las llamadas al payment-service y notification-service con un circuit breaker de 3 estados (CLOSED → OPEN → HALF_OPEN). Se abre tras 5 fallos consecutivos y espera 30 segundos antes de probar nuevamente. Retorna `503` mientras está abierto.
