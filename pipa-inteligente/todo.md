# PIPA INTELIGENTE - TODO

## Banco de Dados e Schemas
- [x] Criar tabela de comunidades com campos: nome, latitude, longitude, nível_reservatório, população, dias_sem_água, temperatura
- [x] Criar tabela de caminhões-pipa com campos: nome, capacidade, status
- [x] Criar tabela de rotas com relacionamento com caminhões e comunidades
- [x] Criar tabela de histórico de abastecimentos
- [x] Criar tabela de notificações críticas

## Backend - APIs tRPC
- [x] Implementar CRUD de comunidades
- [x] Implementar CRUD de caminhões
- [x] Implementar API de cálculo de ranking de prioridade (motor IA)
- [x] Implementar API de otimização de rotas (TSP heurística gulosa)
- [x] Implementar API de geração de justificativas textuais com LLM
- [x] Implementar API de notificações críticas
- [x] Implementar API de histórico de abastecimentos

## Backend - Lógica de IA
- [x] Implementar algoritmo de pontuação ponderada (reservatório, população, dias sem água, temperatura)
- [x] Implementar heurística gulosa para otimização de rotas (TSP simplificado)
- [x] Implementar integração com LLM para justificativas textuais
- [x] Implementar sistema de detecção de limiares críticos (reservatório < 10% ou dias > 5)

## Frontend - Interface Visual
- [x] Configurar tema com gradiente sombrio (teal profundo + laranja queimado)
- [x] Implementar tipografia branca, sans-serif, bold, centralizada
- [x] Criar componentes com detalhes geométricos minimalistas (ciano e laranja)
- [x] Implementar efeitos de profundidade com luz e sombra

## Frontend - Páginas e Componentes
- [x] Criar dashboard principal com visão geral do sistema
- [x] Criar página de cadastro e gerenciamento de comunidades
- [x] Criar página de detalhes da comunidade com histórico
- [x] Criar painel de controle de caminhões
- [x] Criar página de visualização de rotas otimizadas
- [x] Criar componente de mapa interativo com Google Maps
- [x] Criar componente de ranking de prioridade com justificativas
- [x] Criar sistema de notificações visuais

## Integração
- [x] Integrar mapa Google Maps com localização de comunidades
- [x] Integrar mapa com visualização de rotas otimizadas
- [x] Integrar notificações críticas ao operador
- [x] Integrar LLM para geração de justificativas
- [x] Testar fluxo completo de priorização e otimização

## Testes
- [x] Escrever testes unitários para algoritmo de priorização
- [x] Escrever testes unitários para otimização de rotas
- [x] Testar integração frontend-backend
- [x] Testar responsividade e acessibilidade

## Deployment
- [x] Revisar e validar todas as funcionalidades
- [x] Criar checkpoint final
- [x] Preparar documentação


## Interface de Motorista - Nova Funcionalidade
- [x] Expandir schema com tabelas de rastreamento de entregas
- [x] Implementar APIs tRPC para gerenciamento de entregas
- [x] Criar página de motorista com visualização de rota
- [x] Implementar sistema de marcação de entregas concluídas
- [x] Adicionar mapa em tempo real para motorista
- [x] Implementar histórico de entregas do dia
- [x] Criar sistema de confirmação de entrega com foto/assinatura
- [x] Testar interface de motorista completa
- [x] Corrigir bugs e adicionar invalidação de cache
- [x] Adicionar testes unitários para drivers router
