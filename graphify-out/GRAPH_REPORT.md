# Graph Report - fintech-wallet  (2026-07-22)

## Corpus Check
- 210 files · ~108,904 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1760 nodes · 2436 edges · 144 communities (125 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `909097e2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- UserDto
- NotificationService
- UserProfileDto
- App.jsx
- Cloud or Self-Hosted HTTP
- HttpStatus
- dependencies
- Writing ClickHouse Queries for SigNoz Dashboards
- Fase 1: Notification Service Completo
- SEO optimization
- Step 3b-ii: Custom build (no template, or import failed)
- devDependencies
- ClickHouse Logs Query Reference for SigNoz
- FinTech Wallet
- Agent Instructions for This Project
- Workflow
- What You Must Do When Invoked
- Microservices Patterns
- UserControllerTest.java
- Proposed Changes
- ModuleProperties
- Examples
- Capabilities
- TransactionService
- dashboard-config.js
- User
- Sending Logs to SigNoz
- FinTech Wallet - Arquitectura del Proyecto
- AGENTS.md
- AuthController
- Setting Up Observability After Ingestion
- Overview
- Overview
- MoneyRequest
- ADDED Requirements
- TransactionController
- Overview
- AuthResponse
- TotpSetupResponse
- Instructions
- Claude Code Instructions
- QUICKSTART - Chạy trong 5 phút
- Java Spring Boot Skills
- JwtAuthFilter.java
- TransferCompletedEvent
- Guía de Observabilidad con SigNoz - FinTech Wallet
- WCAG 2.2 Quick Reference
- Spring Boot Full Stack Skill
- ConditionalOnModuleEnabled.java
- .findByEmail
- MoneyRequestDto
- Accessibility (a11y)
- Implementation Checklist
- SecurityConfig.java
- mvnw
- GatewayConfig
- mvnw
- JwtUtil
- SecurityConfig.java
- mvnw
- mvnw
- mvnw
- Accessibility Code Patterns
- Operable
- graphify reference: extra exports and benchmark
- Proposal: User Registration Feature
- Maven Modular Architecture
- AuthService
- .transfer
- Common ARIA patterns
- Understandable
- Project: Java Spring Boot Modular Application
- OpenSpec - Spec-Driven Development
- HealthController.java
- TransferResponse
- Reporte de Error en SigNoz: "Request failed with status code 500"
- Validación y Resultados
- Microservices Patterns
- README.md
- How to Use
- ApplicationTests.java
- graphify reference: query, path, explain
- signoz-searching-docs
- Spring Boot TDD with Mockito
- Application
- OpenApiConfig.java
- OpenApiConfig.java
- OpenApiConfig.java
- OpenApiConfig.java
- ApiGatewayApplicationTests.java
- .verifyTotp
- AuthServiceApplicationTests.java
- NotificationServiceApplicationTests.java
- TransactionServiceApplicationTests.java
- UserServiceApplicationTests.java
- Perceivable
- Common issues by impact
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Quick Start
- ApiGatewayApplication
- AuthServiceApplication
- NotificationServiceApplication
- TransactionServiceApplication
- UserServiceApplication
- React + Vite
- SKILL.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify.md
- extraction-spec.md
- start-local.sh script
- graphify.md
- CLAUDE.md
- api-gateway:api-gateway
- auth-service:auth-service
- com.company:spring-boot-app
- notification-service:notification-service
- transaction-service:transaction-service
- user-service:user-service
- StatementJob
- WorkerController
- 5. Body Text Search — Engaging Skip Indexes
- WorkerKafkaConsumer.java
- Writing ClickHouse Queries for SigNoz Dashboards
- RedisTokenBlacklistService
- mvnw
- IdempotencyService
- PdfGeneratorService
- Attribute Access Syntax
- WorkerServiceApplication
- Mandatory Optimization Patterns
- Attribute Access Syntax
- StatementService
- AuditService
- worker-service:worker-service

## God Nodes (most connected - your core abstractions)
1. `UserDto` - 32 edges
2. `useAuth()` - 31 edges
3. `AuthService` - 21 edges
4. `TransactionService` - 21 edges
5. `StatementJob` - 19 edges
6. `UserProfileDto` - 18 edges
7. `NotificationService` - 17 edges
8. `AuthController` - 16 edges
9. `AuditLog` - 16 edges
10. `MoneyRequest` - 15 edges

## Surprising Connections (you probably didn't know these)
- `UserController` --references--> `UserService`  [EXTRACTED]
  .agents/skills/spring-boot-full-stack/src/main/java/com/company/app/controller/UserController.java → .agents/skills/spring-boot-full-stack/src/main/java/com/company/app/service/UserService.java
- `AuthController` --references--> `AuthService`  [EXTRACTED]
  backend/auth-service/src/main/java/auth_service/auth_service/controller/AuthController.java → backend/auth-service/src/main/java/auth_service/auth_service/service/AuthService.java
- `AuthService` --references--> `UserRepository`  [EXTRACTED]
  backend/auth-service/src/main/java/auth_service/auth_service/service/AuthService.java → backend/auth-service/src/main/java/auth_service/auth_service/repository/UserRepository.java
- `AuthService` --references--> `JwtUtil`  [EXTRACTED]
  backend/auth-service/src/main/java/auth_service/auth_service/service/AuthService.java → backend/auth-service/src/main/java/auth_service/auth_service/security/JwtUtil.java
- `TransactionController` --references--> `TransactionService`  [EXTRACTED]
  backend/transaction-service/src/main/java/transaction_service/transaction_service/controller/TransactionController.java → backend/transaction-service/src/main/java/transaction_service/transaction_service/service/TransactionService.java

## Import Cycles
- None detected.

## Communities (144 total, 19 thin omitted)

### Community 0 - "UserDto"
Cohesion: 0.08
Nodes (34): AllArgsConstructor, Builder, Data, NoArgsConstructor, UserDto, UserService, Override, Service (+26 more)

### Community 1 - "NotificationService"
Cohesion: 0.06
Nodes (39): GetMapping, PutMapping, RequestMapping, RequiredArgsConstructor, ResponseEntity, RestController, NotificationController, AllArgsConstructor (+31 more)

### Community 2 - "UserProfileDto"
Cohesion: 0.06
Nodes (39): GetMapping, PostMapping, PutMapping, RequestMapping, RequiredArgsConstructor, ResponseEntity, RestController, UserController (+31 more)

### Community 3 - "App.jsx"
Cohesion: 0.10
Nodes (33): App(), AppLayout(), links, Sidebar(), AuthContext, AuthProvider(), useAuth(), ThemeContext (+25 more)

### Community 4 - "Cloud or Self-Hosted HTTP"
Cohesion: 0.04
Nodes (43): Antigravity CLI, Authentication Finish Steps, Bundled Claude Code plugin, Bundled Codex plugin, Bundled Cursor plugin, Claude Code native CLI, Claude Code stdio, Claude Desktop (+35 more)

### Community 5 - "HttpStatus"
Cohesion: 0.07
Nodes (26): BusinessException, GlobalExceptionHandler, ExceptionHandler, ResponseEntity, RestControllerAdvice, Slf4j, ResourceNotFoundException, GlobalExceptionHandler (+18 more)

### Community 6 - "dependencies"
Cohesion: 0.04
Nodes (45): axios, file-saver, dependencies, axios, file-saver, html5-qrcode, jspdf, jspdf-autotable (+37 more)

### Community 7 - "Writing ClickHouse Queries for SigNoz Dashboards"
Cohesion: 0.15
Nodes (13): ClickHouse Traces Query Reference for SigNoz, Contents, Dashboard Panel Query Templates, distributed_signoz_error_index_v2 (Error Events), distributed_signoz_index_v3 (Primary Spans Table), distributed_traces_v3_resource (Resource Lookup Table), Query Examples, Query Optimization Checklist (+5 more)

### Community 8 - "Fase 1: Notification Service Completo"
Cohesion: 0.06
Nodes (35): Estado Actual y Hallazgos, Fase 1.5: Bug Fixes de Transacciones y Ajustes UX, Fase 1: Notification Service Completo, Fase 2: API Gateway + Frontend Updates, Fase 3: Kafka Metrics en OTel Collector, Fase 4: SigNoz UI & Dashboards & Alertas, FinTech Wallet — Plan de Implementación Completa (Actualizado), [MODIFY] [api.js](file:///c:/dev/DevOps/fintech-wallet/frontend/src/services/api.js) (+27 more)

### Community 9 - "SEO optimization"
Cohesion: 0.06
Nodes (34): Article, Breadcrumbs, Crawlability, Critical, FAQ, Font sizes, Heading structure, High priority (+26 more)

### Community 10 - "Step 3b-ii: Custom build (no template, or import failed)"
Cohesion: 0.06
Nodes (32): Dashboard JSON to Query Builder v5, Lossless gate, Saved payload invariant, Translate one panel, Custom build — no template match, Duplicate found — modify-or-create, Examples — `signoz-creating-dashboards`, Template choice when several match (+24 more)

### Community 11 - "devDependencies"
Cohesion: 0.06
Nodes (32): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks (+24 more)

### Community 12 - "ClickHouse Logs Query Reference for SigNoz"
Cohesion: 0.14
Nodes (14): Advanced — Top 10 largest logs for payload auditing, ClickHouse Logs Query Reference for SigNoz, Contents, Dashboard Panel Query Examples, distributed_logs_v2 (Primary Logs Table), distributed_logs_v2_resource (Resource Lookup Table), Query Examples, Query Optimization Checklist (+6 more)

### Community 13 - "FinTech Wallet"
Cohesion: 0.07
Nodes (28): 1. Clonar el repositorio, 2. Configurar el archivo de entorno (.env), 3. Levantar la aplicación y la infraestructura, 4. Acceder a los servicios, 5. Crear tu primer usuario, API Gateway (Puerto 8080), Arquitectura, Auth Service (Puerto 8081) (+20 more)

### Community 14 - "Agent Instructions for This Project"
Cohesion: 0.07
Nodes (27): 1. Spec-First Approach, 2. TDD with Mockito, 3. Code Review Checklist, Agent Instructions for This Project, Always use:, API Conventions, Code Style, Conventions (+19 more)

### Community 15 - "Workflow"
Cohesion: 0.08
Nodes (24): Anomaly detection (z-score), Error-rate formula alert, Examples — `signoz-creating-alerts`, Log-volume threshold with groupBy, Metric threshold with multi-severity routing, Additional resources, Alert Create, Common query shapes — conventions (+16 more)

### Community 16 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 17 - "Microservices Patterns"
Cohesion: 0.09
Nodes (22): 1. Service Decomposition Strategies, 2. Communication Patterns, 3. Data Management, 4. Resilience Patterns, Best Practices, Circuit Breaker Pattern, Common Pitfalls, Communication Patterns (+14 more)

### Community 18 - "UserControllerTest.java"
Cohesion: 0.16
Nodes (15): GetMapping, PostMapping, PutMapping, RequestMapping, RequiredArgsConstructor, ResponseEntity, RestController, UserController (+7 more)

### Community 19 - "Proposed Changes"
Cohesion: 0.09
Nodes (22): 1. Definición del Contrato Protobuf (Común), 2. Configuración de dependencias Maven (pom.xml), 3. Servidor gRPC (user-service), 4. Clientes gRPC, 5. Seguridad y Redacción de Cabeceras Sensibles en SigNoz, [MODIFY] [application.properties (notification-service)](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/resources/application.properties), [MODIFY] [application.properties (transaction-service)](file:///c:/dev/DevOps/fintech-wallet/backend/transaction-service/src/main/resources/application.properties), [MODIFY] [application.properties (user-service)](file:///c:/dev/DevOps/fintech-wallet/backend/user-service/src/main/resources/application.properties) (+14 more)

### Community 20 - "ModuleProperties"
Cohesion: 0.16
Nodes (15): Data, ModuleConfig, ModuleProperties, GetMapping, RequestMapping, RequiredArgsConstructor, ResponseEntity, RestController (+7 more)

### Community 21 - "Examples"
Cohesion: 0.10
Nodes (19): Constraints, Example 1: Create Spans with Clear Boundaries, Example 2: Propagate Context and Keep Attributes Safe, Example 3: Apply OpenTelemetry Semantic Conventions, Example 4: Configure Sampling Strategy per Environment, Example 5: Validate Span Correctness with Tests, Example 6: Use Annotation-Based Instrumentation for Service Methods, Examples (+11 more)

### Community 22 - "Capabilities"
Cohesion: 0.10
Nodes (20): Behavioral Traits, Capabilities, Cloud-Native Development, Database & Persistence, Do not use this skill when, Enterprise Architecture Patterns, Example Interactions, Instructions (+12 more)

### Community 23 - "TransactionService"
Cohesion: 0.29
Nodes (7): RequiredArgsConstructor, Service, Slf4j, Transactional, UserServiceBlockingStub, WithSpan, TransactionService

### Community 24 - "dashboard-config.js"
Cohesion: 0.19
Nodes (16): fs, { getApiKey, getSigNozBaseUrl }, main(), path, fs, main(), { resolveDashboardPath, getApiKey, getSigNozBaseUrl }, fs (+8 more)

### Community 25 - "User"
Cohesion: 0.13
Nodes (12): AllArgsConstructor, Data, NoArgsConstructor, RegisterRequest, AllArgsConstructor, Builder, Data, Entity (+4 more)

### Community 26 - "Sending Logs to SigNoz"
Cohesion: 0.11
Nodes (16): 1. What kind of logs?, 2. Is trace-log correlation needed?, 3. Is reliability or external collection more important than in-app export?, 4. What's the deployment environment?, After Selecting a Path, Decision Table, Gotchas, Reference (+8 more)

### Community 27 - "FinTech Wallet - Arquitectura del Proyecto"
Cohesion: 0.11
Nodes (18): 1. Arquitectura General del Sistema, 2. Stack Tecnológico, 3.1 Auth Service (Puerto 8081), 3.2 User Service (Puerto 8082 / gRPC: 9090), 3.3 Transaction Service (Puerto 8083), 3.4 Notification Service (Puerto 8084), 3.5 Worker Service (Puerto 8085), 3. Microservicios - Detalle (+10 more)

### Community 28 - "AGENTS.md"
Cohesion: 0.12
Nodes (14): 1. Draft Proposal (Before Coding!), 2. Review & Align, 3. Implement, 4. Ship & Archive, Code Patterns, Controller Pattern, Maven Profiles, Package Structure (+6 more)

### Community 29 - "AuthController"
Cohesion: 0.18
Nodes (9): AuthController, GetMapping, PutMapping, RequestMapping, RequiredArgsConstructor, ResponseEntity, RestController, ChangePasswordRequest (+1 more)

### Community 30 - "Setting Up Observability After Ingestion"
Cohesion: 0.13
Nodes (14): Phase 1.5 — Inventory what already exists, Phase 1 — Triage scope (don't skip), Phase 2 — Capture the SLI/SLO before designing anything, Phase 3 — Explore what's actually there (RED + USE coverage), Phase 4 — Classify labels by cardinality and cost, Phase 5 — Confirm channels, burn-rate windows, recovery thresholds, Phase 6 — Build the dashboard(s), Phase 7 — Saved Explorer views (+6 more)

### Community 31 - "Overview"
Cohesion: 0.13
Nodes (15): Overview, Requirement: Error Response, Requirement: Global Exception Handler, Requirement: HTTP Status Codes, Requirement: Pagination, Requirement: Request Validation, Requirement: Response Wrapper, Requirement: URL Conventions (+7 more)

### Community 32 - "Overview"
Cohesion: 0.13
Nodes (15): Overview, Requirement: Exception Testing, Requirement: Integration Tests, Requirement: Mockito Verification, Requirement: TDD Workflow, Requirement: Test Coverage, Requirement: Test Naming, Requirement: Unit Test Structure (+7 more)

### Community 33 - "MoneyRequest"
Cohesion: 0.15
Nodes (9): AllArgsConstructor, Builder, Data, Entity, NoArgsConstructor, PrePersist, Table, MoneyRequest (+1 more)

### Community 34 - "ADDED Requirements"
Cohesion: 0.14
Nodes (13): ADDED Requirements, Registration Specification (Delta), Requirement: Duplicate Prevention, Requirement: Email Verification, Requirement: Password Validation, Requirement: User Registration Endpoint, Scenario: Email already exists, Scenario: Expired token (+5 more)

### Community 35 - "TransactionController"
Cohesion: 0.15
Nodes (13): GetMapping, PostMapping, PutMapping, RequestMapping, RequiredArgsConstructor, ResponseEntity, RestController, TransactionController (+5 more)

### Community 36 - "Overview"
Cohesion: 0.15
Nodes (13): Overview, Requirement: Application Layer, Requirement: Dependency Direction, Requirement: Domain Layer, Requirement: Infrastructure Layer, Requirement: Interface Layer, Requirement: Package Structure, Scenario: Creating a controller (+5 more)

### Community 37 - "AuthResponse"
Cohesion: 0.18
Nodes (9): AuthResponse, AllArgsConstructor, Builder, Data, NoArgsConstructor, AllArgsConstructor, Data, NoArgsConstructor (+1 more)

### Community 38 - "TotpSetupResponse"
Cohesion: 0.18
Nodes (6): AllArgsConstructor, Builder, Data, NoArgsConstructor, TotpSetupResponse, TotpUtil

### Community 39 - "Instructions"
Cohesion: 0.17
Nodes (11): Examples, Guardrails, Instructions, Prerequisites, Query Generate, Step 1: Determine the signal type, Step 2: Discover available data, Step 3: Choose the right tool (+3 more)

### Community 40 - "Claude Code Instructions"
Cohesion: 0.17
Nodes (12): API Conventions, Best Practices, Claude Code Instructions, Code Conventions, Commands, Module System, Naming, Project Overview (+4 more)

### Community 41 - "QUICKSTART - Chạy trong 5 phút"
Cohesion: 0.17
Nodes (12): Bước 1: Khởi động Database, Bước 2: Chạy Application, Bước 3: Test API, Bước 4: Chạy Tests, "Connection refused", Các lệnh hữu ích, "Java version error", Lỗi thường gặp (+4 more)

### Community 42 - "Java Spring Boot Skills"
Cohesion: 0.17
Nodes (12): AI IDE Integration, Development, Documentation, Endpoints, Features, Java Spring Boot Skills, License, Module Selection (+4 more)

### Community 43 - "JwtAuthFilter.java"
Cohesion: 0.27
Nodes (9): Component, Override, SecretKey, WithSpan, JwtAuthFilter, FilterChain, HttpServletRequest, HttpServletResponse (+1 more)

### Community 44 - "TransferCompletedEvent"
Cohesion: 0.24
Nodes (9): AllArgsConstructor, Builder, Data, NoArgsConstructor, TransferCompletedEvent, Component, RequiredArgsConstructor, TransactionProducer (+1 more)

### Community 45 - "Guía de Observabilidad con SigNoz - FinTech Wallet"
Cohesion: 0.17
Nodes (11): 1. APM Metrics (Predefinido), 2. Kafka Server Monitoring (Importado), 3. Host Metrics (Infraestructura de Host), 4. Docker Container Metrics (Personalizado), 🚀 Acceso a SigNoz UI, 🏗️ Arquitectura de Observabilidad e Infraestructura, 📡 Comunicación entre Microservicios (gRPC), 📊 Dashboards Activos en SigNoz (+3 more)

### Community 46 - "WCAG 2.2 Quick Reference"
Cohesion: 0.18
Nodes (8): Level A (minimum), Level AA (standard), Level AAA (enhanced), Sources, Success criteria by level, Testing tools, WCAG 2.2 Quick Reference, What changed from 2.1 to 2.2

### Community 47 - "Spring Boot Full Stack Skill"
Cohesion: 0.18
Nodes (11): Core (Always enabled), Development Workflow, Docker Options, File Structure, Module Selection, Optional, Overview, Quick Start (+3 more)

### Community 48 - "ConditionalOnModuleEnabled.java"
Cohesion: 0.29
Nodes (9): ConditionalOnModuleEnabled, Override, OnModuleEnabledCondition, AnnotatedTypeMetadata, Condition, Conditional, ConditionContext, Retention (+1 more)

### Community 49 - ".findByEmail"
Cohesion: 0.15
Nodes (11): AuditLog, AllArgsConstructor, Builder, Data, Entity, NoArgsConstructor, PrePersist, Table (+3 more)

### Community 50 - "MoneyRequestDto"
Cohesion: 0.27
Nodes (5): AllArgsConstructor, Builder, Data, NoArgsConstructor, MoneyRequestDto

### Community 51 - "Accessibility (a11y)"
Cohesion: 0.20
Nodes (10): Accessibility (a11y), ARIA usage (4.1.2), Automated testing, Conformance levels, Live regions (4.1.3), Manual testing, References, Robust (+2 more)

### Community 52 - "Implementation Checklist"
Cohesion: 0.20
Nodes (9): Application Layer, Database, Documentation, Domain Layer, Implementation Checklist, Infrastructure, Interface Layer, Tasks: User Registration (+1 more)

### Community 53 - "SecurityConfig.java"
Cohesion: 0.42
Nodes (7): Bean, Configuration, EnableWebSecurity, HttpSecurity, SecurityFilterChain, SecurityConfig, Profile

### Community 54 - "mvnw"
Cohesion: 0.33
Nodes (6): mvnw script, clean(), die(), exec_maven(), set_java_home(), verbose()

### Community 55 - "GatewayConfig"
Cohesion: 0.47
Nodes (5): GatewayConfig, Bean, Configuration, RouterFunction, ServerResponse

### Community 56 - "mvnw"
Cohesion: 0.33
Nodes (6): mvnw script, clean(), die(), exec_maven(), set_java_home(), verbose()

### Community 57 - "JwtUtil"
Cohesion: 0.29
Nodes (4): Component, SecretKey, JwtUtil, Claims

### Community 58 - "SecurityConfig.java"
Cohesion: 0.36
Nodes (7): Bean, Configuration, EnableWebSecurity, HttpSecurity, PasswordEncoder, SecurityFilterChain, SecurityConfig

### Community 59 - "mvnw"
Cohesion: 0.33
Nodes (6): mvnw script, clean(), die(), exec_maven(), set_java_home(), verbose()

### Community 60 - "mvnw"
Cohesion: 0.33
Nodes (6): mvnw script, clean(), die(), exec_maven(), set_java_home(), verbose()

### Community 61 - "mvnw"
Cohesion: 0.33
Nodes (6): mvnw script, clean(), die(), exec_maven(), set_java_home(), verbose()

### Community 62 - "Accessibility Code Patterns"
Cohesion: 0.22
Nodes (9): Accessibility Code Patterns, ARIA tabs, Dragging movements, Error handling, Form labels, Live regions and notifications, Modal focus trap, Screen reader commands (+1 more)

### Community 63 - "Operable"
Cohesion: 0.22
Nodes (9): Dragging movements (2.5.7) — new in 2.2, Focus not obscured (2.4.11) — new in 2.2, Focus visible (2.4.7), Keyboard accessible (2.1), Motion (2.3), Operable, Skip links (2.4.1), Target size (2.5.8) — new in 2.2 (+1 more)

### Community 64 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 65 - "Proposal: User Registration Feature"
Cohesion: 0.22
Nodes (8): Dependencies, In Scope, Out of Scope, Proposal: User Registration Feature, Rationale, Risks, Scope, Summary

### Community 66 - "Maven Modular Architecture"
Cohesion: 0.22
Nodes (8): application.yml, Full Stack Profile, Maven Modular Architecture, Minimal Profile, Module Flags, Profiles, Spring Configuration, Usage

### Community 67 - "AuthService"
Cohesion: 0.31
Nodes (7): AuthService, JavaMailSender, PasswordEncoder, RequiredArgsConstructor, Service, Slf4j, WithSpan

### Community 68 - ".transfer"
Cohesion: 0.40
Nodes (4): AllArgsConstructor, Data, NoArgsConstructor, TransferRequest

### Community 69 - "Common ARIA patterns"
Cohesion: 0.25
Nodes (8): Buttons, Common ARIA patterns, Error states, Form fields, Links, Live regions, Modals, Navigation

### Community 70 - "Understandable"
Cohesion: 0.25
Nodes (8): Accessible authentication (3.3.8) — new in 2.2, Consistent help (3.2.6) — new in 2.2, Consistent navigation (3.2.3), Error handling (3.3.1, 3.3.3), Form labels (3.3.2), Page language (3.1.1), Redundant entry (3.3.7) — new in 2.2, Understandable

### Community 71 - "Project: Java Spring Boot Modular Application"
Cohesion: 0.25
Nodes (7): Code Conventions, Code Templates, Don't, GitHub Copilot Instructions, Project: Java Spring Boot Modular Application, TDD Workflow, Tech Stack

### Community 72 - "OpenSpec - Spec-Driven Development"
Cohesion: 0.25
Nodes (7): Commands, Directory Structure, OpenSpec - Spec-Driven Development, Proposal Template, Reference in Code, Spec Template, Workflow

### Community 73 - "HealthController.java"
Cohesion: 0.46
Nodes (5): HealthController, GetMapping, RequestMapping, ResponseEntity, RestController

### Community 74 - "TransferResponse"
Cohesion: 0.18
Nodes (9): AllArgsConstructor, Builder, Data, Entity, NoArgsConstructor, PrePersist, Table, Transaction (+1 more)

### Community 75 - "Reporte de Error en SigNoz: "Request failed with status code 500""
Cohesion: 0.25
Nodes (7): 1. Descripción del Error, 2. Diagnóstico y Causa Raíz, 3. Solución Propuesta (Para aplicar más adelante), Paso 1: Configurar el procesador `signozspanmetrics`, Paso 2: Reiniciar el colector y generar tráfico, ¿Por qué ocurre esto?, Reporte de Error en SigNoz: "Request failed with status code 500"

### Community 76 - "Validación y Resultados"
Cohesion: 0.25
Nodes (7): 1. Compilación y Reconstrucción, 2. Pruebas de Transacciones (Jane a John), 3. Notificación de Correo (Mailpit), 4. Monitoreo y Trazabilidad (SigNoz), Cambios Realizados, Validación y Resultados, Walkthrough — Migración exitosa de comunicación inter-servicios a gRPC e Inyección de Seguridad

### Community 77 - "Microservices Patterns"
Cohesion: 0.29
Nodes (6): Do not use this skill when, Instructions, Limitations, Microservices Patterns, Resources, Use this skill when

### Community 78 - "README.md"
Cohesion: 0.29
Nodes (3): REST API Specification, Architecture Specification, Testing Specification (TDD)

### Community 79 - "How to Use"
Cohesion: 0.29
Nodes (7): 1. Read Specs Before Implementing, 2. Propose Changes, 3. Spec Format, How to Use, OpenSpec - Java Spring Skills (Monolithic), Spec Files, Structure

### Community 80 - "ApplicationTests.java"
Cohesion: 0.48
Nodes (5): ApplicationTests, ActiveProfiles, SpringBootTest, Test, TestPropertySource

### Community 81 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 82 - "signoz-searching-docs"
Cohesion: 0.33
Nodes (5): Adding a heuristic, How it works, Planned heuristics, signoz-searching-docs, Structure

### Community 83 - "Spring Boot TDD with Mockito"
Cohesion: 0.33
Nodes (5): Best Practices, Mockito Annotations, Spring Boot TDD with Mockito, TDD Cycle: Red → Green → Refactor, Test Template

### Community 84 - "Application"
Cohesion: 0.53
Nodes (4): Application, EnableAsync, SpringBootApplication, ConfigurationPropertiesScan

### Community 85 - "OpenApiConfig.java"
Cohesion: 0.53
Nodes (4): Bean, Configuration, OpenAPI, OpenApiConfig

### Community 86 - "OpenApiConfig.java"
Cohesion: 0.53
Nodes (4): Bean, Configuration, OpenAPI, OpenApiConfig

### Community 87 - "OpenApiConfig.java"
Cohesion: 0.53
Nodes (4): Bean, Configuration, OpenAPI, OpenApiConfig

### Community 88 - "OpenApiConfig.java"
Cohesion: 0.53
Nodes (4): Bean, Configuration, OpenAPI, OpenApiConfig

### Community 90 - "ApiGatewayApplicationTests.java"
Cohesion: 0.60
Nodes (3): ApiGatewayApplicationTests, SpringBootTest, Test

### Community 91 - ".verifyTotp"
Cohesion: 0.24
Nodes (3): PostMapping, Data, TotpVerifyRequest

### Community 92 - "AuthServiceApplicationTests.java"
Cohesion: 0.60
Nodes (3): AuthServiceApplicationTests, SpringBootTest, Test

### Community 93 - "NotificationServiceApplicationTests.java"
Cohesion: 0.60
Nodes (3): SpringBootTest, Test, NotificationServiceApplicationTests

### Community 94 - "TransactionServiceApplicationTests.java"
Cohesion: 0.60
Nodes (3): SpringBootTest, Test, TransactionServiceApplicationTests

### Community 95 - "UserServiceApplicationTests.java"
Cohesion: 0.60
Nodes (3): SpringBootTest, Test, UserServiceApplicationTests

### Community 96 - "Perceivable"
Cohesion: 0.50
Nodes (4): Color contrast (1.4.3, 1.4.6), Media alternatives (1.2), Perceivable, Text alternatives (1.1)

### Community 97 - "Common issues by impact"
Cohesion: 0.50
Nodes (4): Common issues by impact, Critical (fix immediately), Moderate (fix soon), Serious (fix before launch)

### Community 98 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 99 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 100 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 101 - "Quick Start"
Cohesion: 0.50
Nodes (4): Full Stack, Quick Start, With Docker, Without Docker

### Community 106 - "UserServiceApplication"
Cohesion: 0.60
Nodes (3): SpringBootApplication, UserServiceApplication, EnableCaching

### Community 107 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 127 - "StatementJob"
Cohesion: 0.18
Nodes (8): AllArgsConstructor, Builder, Data, Entity, NoArgsConstructor, PrePersist, Table, StatementJob

### Community 128 - "WorkerController"
Cohesion: 0.24
Nodes (8): GetMapping, PostMapping, RequestMapping, RequiredArgsConstructor, ResponseEntity, RestController, WorkerController, Resource

### Community 129 - "5. Body Text Search — Engaging Skip Indexes"
Cohesion: 0.17
Nodes (12): 1. Resource Filter CTE, 2. Timestamp Bucketing, 3. Use Indexed (Selected) Columns Over Map Access, 4. Use GLOBAL IN for Resource Fingerprint Subquery, 5. Body Text Search — Engaging Skip Indexes, Anti-patterns to rewrite, Hyphens and punctuation split tokens, Mandatory Optimization Patterns (+4 more)

### Community 130 - "WorkerKafkaConsumer.java"
Cohesion: 0.29
Nodes (8): Component, KafkaListener, ObjectMapper, RequiredArgsConstructor, Slf4j, WorkerKafkaConsumer, DltHandler, RetryableTopic

### Community 131 - "Writing ClickHouse Queries for SigNoz Dashboards"
Cohesion: 0.18
Nodes (11): Key Variables by Signal, Logs, Query Attribution, Quick Reference, Reference Routing, Signal Detection, Top Anti-Patterns, Traces (+3 more)

### Community 132 - "RedisTokenBlacklistService"
Cohesion: 0.33
Nodes (5): RequiredArgsConstructor, Service, StringRedisTemplate, WithSpan, RedisTokenBlacklistService

### Community 133 - "mvnw"
Cohesion: 0.33
Nodes (6): mvnw script, clean(), die(), exec_maven(), set_java_home(), verbose()

### Community 135 - "IdempotencyService"
Cohesion: 0.39
Nodes (5): IdempotencyService, RequiredArgsConstructor, Service, StringRedisTemplate, WithSpan

### Community 136 - "PdfGeneratorService"
Cohesion: 0.39
Nodes (5): Service, Slf4j, PdfGeneratorService, Font, PdfPCell

### Community 137 - "Attribute Access Syntax"
Cohesion: 0.33
Nodes (6): Attribute Access Syntax, Checking attribute existence, Resource attributes in SELECT / GROUP BY, Resource attributes in WHERE (via CTE), Span/log attributes in WHERE (map access), Timestamp display conversion

### Community 138 - "WorkerServiceApplication"
Cohesion: 0.53
Nodes (4): EnableAsync, SpringBootApplication, WorkerServiceApplication, EnableKafka

### Community 139 - "Mandatory Optimization Patterns"
Cohesion: 0.40
Nodes (5): 1. Resource Filter CTE, 2. Timestamp Bucketing, 3. Use Indexed Columns Over Map Access, 4. Use Pre-extracted Columns, Mandatory Optimization Patterns

### Community 140 - "Attribute Access Syntax"
Cohesion: 0.50
Nodes (4): Attribute Access Syntax, Checking attribute existence, Resource attributes in SELECT / GROUP BY, Resource attributes in WHERE (via CTE)

### Community 141 - "StatementService"
Cohesion: 0.43
Nodes (5): Async, RequiredArgsConstructor, Service, Slf4j, StatementService

### Community 142 - "AuditService"
Cohesion: 0.70
Nodes (4): AuditService, RequiredArgsConstructor, Service, Slf4j

## Knowledge Gaps
- **650 isolated node(s):** `com.company:spring-boot-app`, `start-local.sh script`, `api-gateway:api-gateway`, `auth-service:auth-service`, `notification-service:notification-service` (+645 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `User` to `.findByEmail`, `AuthService`, `.verifyTotp`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `NotificationRepository` connect `NotificationService` to `.findByEmail`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `TransactionService` connect `TransactionService` to `MoneyRequest`, `TransactionController`, `IdempotencyService`, `TransferResponse`, `TransferCompletedEvent`, `MoneyRequestDto`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `com.company:spring-boot-app`, `start-local.sh script`, `api-gateway:api-gateway` to the rest of the system?**
  _650 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UserDto` be split into smaller, more focused modules?**
  _Cohesion score 0.07506584723441616 - nodes in this community are weakly interconnected._
- **Should `NotificationService` be split into smaller, more focused modules?**
  _Cohesion score 0.06265664160401002 - nodes in this community are weakly interconnected._
- **Should `UserProfileDto` be split into smaller, more focused modules?**
  _Cohesion score 0.06312098188194039 - nodes in this community are weakly interconnected._