# 💧 PIPA INTELIGENTE

> Sistema inteligente de otimização da distribuição de água por caminhões-pipa para comunidades rurais do Piauí.

---

## Sobre o Projeto

O **Pipa Inteligente** é uma plataforma full-stack que auxilia gestores municipais a distribuir água de forma eficiente em comunidades do semiárido piauiense. O sistema usa **inteligência artificial** para priorizar as comunidades mais urgentes e **otimização de rotas** para minimizar distância percorrida pelos caminhões-pipa.

### Problema que resolve

Municípios do Piauí enfrentam desafios logísticos severos na distribuição de água em regiões de seca:
- Gestores não sabem qual comunidade atender primeiro
- Motoristas recebem rotas ineficientes, gerando desperdício de combustível
- Não há rastreamento em tempo real das entregas realizadas

### Solução

| Funcionalidade | Descrição |
|---|---|
| **Priorização por IA** | Modelo OLS (regressão linear) pondera reservatório, população, dias sem água e temperatura para gerar um score de urgência |
| **Otimização de Rota** | Algoritmo TSP guloso (nearest neighbor) com respeito à capacidade do caminhão, minimizando km percorridos |
| **Despacho em tempo real** | Gestor envia chamado ao motorista via SSE; rota aparece instantaneamente no celular |
| **Geofencing automático** | Quando o motorista se aproxima de uma comunidade (raio 500m), o sistema detecta e notifica |
| **Integração IoT** | Sensores ESP32 enviam nível do reservatório via MQTT ou HTTP diretamente ao sistema |

---

## Fluxo de Uso

```
GESTOR                              MOTORISTA
  │                                     │
  ├─ 1. Cadastra caminhões              │
  ├─ 2. Cadastra motoristas             │
  ├─ 3. Cadastra comunidades            │
  │                                     │
  ├─ 4. Clica "Despachar Rota"          │
  │       ↓ rota otimizada por IA       │
  │       ↓ chamado enviado via SSE ────┤
  │                                     ├─ Vê "Rota aguardando"
  │                                     ├─ Aceita a rota
  │                                     ├─ Para cada comunidade:
  │                                     │    "Cheguei → Iniciar"
  │                                     │    Abre Google Maps
  │                                     │    "Confirmar Entrega"
  │                                     │    (foto + assinatura)
  │                                     │
  └─ Acompanha progresso no Dashboard ──┘
```

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite |
| **UI** | Tailwind CSS v4 + shadcn/ui + Radix UI |
| **Roteamento** | Wouter |
| **API** | tRPC v11 (type-safe end-to-end) |
| **Backend** | Express + Node.js |
| **Banco de dados** | SQLite via better-sqlite3 + Drizzle ORM |
| **Tempo real** | SSE (Server-Sent Events) |
| **IoT** | MQTT (broker configurável) + endpoint HTTP para ESP32 |
| **Autenticação** | OAuth2 (Google) via JOSE |
| **Armazenamento** | AWS S3 (fotos de entrega) |
| **Mapas** | Leaflet + React-Leaflet |
| **IA/ML** | OLS (Ordinary Least Squares) implementado do zero |
| **Testes** | Vitest |

---

## Arquitetura

```
pipa-inteligente/
├── client/                  # Frontend React
│   └── src/
│       ├── pages/           # Home, Dashboard, Communities, Trucks, Routes,
│       │                    # DriverDashboard, DeliveryConfirmation, Map, ...
│       ├── components/      # Componentes reutilizáveis (shadcn/ui)
│       ├── hooks/           # useDriverCall (SSE), useAuth
│       └── lib/             # Cliente tRPC
│
├── server/
│   ├── _core/               # Express, SSE, OAuth, Vite middleware
│   ├── ai/
│   │   ├── prioritization.ts    # OLS para score de urgência das comunidades
│   │   └── routeOptimization.ts # TSP greedy + respeito à capacidade
│   ├── routers/             # tRPC routers: communities, trucks, drivers
│   └── db.ts                # Queries SQLite (Drizzle ORM)
│
├── drizzle/                 # Schema do banco e migrations
├── scripts/
│   └── seed.ts              # Dados iniciais (comunidades do Piauí)
└── pipa.db                  # Banco SQLite (gerado automaticamente)
```

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 18+ (testado com v24)
- pnpm (`npm install -g pnpm`)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/Adriano-Carvalho-10/pipa-inteligente.git
cd pipa-inteligente

# 2. Instale as dependências
pnpm install

# 3. Compile os binários nativos do SQLite
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
node-gyp rebuild
cd ../../../../..

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (veja seção abaixo)

# 5. Crie as tabelas do banco
pnpm db:push

# 6. (Opcional) Popule com dados de exemplo
pnpm seed

# 7. Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse: http://localhost:3000

### Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL=./pipa.db

# OAuth (Google)
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Sessão
SESSION_SECRET=uma_string_aleatoria_longa

# AWS S3 (opcional — para upload de fotos de entrega)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET_NAME=

# MQTT (opcional — para sensores IoT ESP32)
MQTT_BROKER_URL=mqtt://seu-broker:1883
MQTT_TOPIC=pipa/sensor/#
```

---

## Scripts Disponíveis

```bash
pnpm dev        # Servidor de desenvolvimento com hot reload
pnpm build      # Build de produção (frontend + backend)
pnpm start      # Inicia o servidor de produção
pnpm check      # Verificação de tipos TypeScript
pnpm test       # Executa os testes (Vitest)
pnpm seed       # Popula o banco com dados de exemplo
pnpm db:push    # Aplica as migrations do schema Drizzle
pnpm format     # Formata o código com Prettier
```

---

## Funcionalidades por Portal

### Portal do Gestor (requer login)

- **Dashboard** — Wizard de configuração passo a passo; alertas de comunidades críticas; botão de despacho quando tudo configurado
- **Frota & Motoristas** — Cadastro e edição de caminhões e motoristas em abas unificadas
- **Comunidades** — Cadastro com seletor de município piauiense (auto-preenche coordenadas); monitoramento de reservatório, dias sem água, temperatura
- **Central de Despacho** — Visualiza motoristas disponíveis; envia chamado com rota otimizada em 1 clique
- **Mapa** — Visualização geográfica das comunidades com nível de urgência
- **Ranking de Prioridade** — Lista ordenada por score de IA

### Portal do Motorista (sem login)

- Seleciona o próprio nome na lista
- Vê rota pendente (via SSE em tempo real ou polling a cada 10s)
- Aceita chamado e acessa lista de entregas ordenadas
- Abre Google Maps para navegação até cada comunidade
- Confirma entrega com foto e assinatura
- Histórico de eficiência (taxa de sucesso, litros distribuídos)

---

## Algoritmos de IA

### Priorização de Comunidades (OLS)

Score de urgência calculado como combinação linear ponderada:

```
score = w₁ × (1 - reservatório%) + w₂ × (população_normalizada)
      + w₃ × (dias_sem_água_normalizado) + w₄ × (temperatura_normalizada)
```

Pesos iniciais: `[0.35, 0.25, 0.25, 0.15]`. O modelo pode ser retreinado com dados históricos de entregas via endpoint dedicado, ajustando os pesos via mínimos quadrados ordinários (OLS).

### Otimização de Rota (TSP Greedy + Capacidade)

1. Seleciona comunidades com necessidade de água (`reservatório < 80%` ou `dias_sem_água > 0`)
2. Ordena por score de urgência decrescente
3. Aplica heurística do vizinho mais próximo (nearest neighbor) a partir da posição atual do motorista
4. Respeita a capacidade do caminhão (divide em múltiplas viagens se necessário)
5. Calcula distância total via fórmula de Haversine

---

## Integração IoT (ESP32)

Sensores de nível de reservatório enviam dados via dois protocolos:

**HTTP (POST)**
```
POST /api/iot/sensor
Content-Type: application/json

{ "communityId": 1, "reservoirLevel": 42.5, "temperature": 36.2 }
```

**MQTT**
```
Topic: pipa/sensor/{communityId}
Payload: { "reservoirLevel": 42.5, "temperature": 36.2 }
```

---

## Testes

```bash
pnpm test
```

Cobertura atual:
- `prioritization.test.ts` — Score de urgência e retraining OLS
- `routeOptimization.test.ts` — Haversine, TSP greedy, capacidade
- `drivers.test.ts` — Criação de motoristas e rotas

---

## Licença

MIT — veja(LICENSE) para detalhes.

---

*Desenvolvido para apoiar a gestão hídrica de comunidades rurais do Piauí, Brasil.*
