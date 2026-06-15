# Graph Report - CENTRO TEX 2.0  (2026-06-16)

## Corpus Check
- 120 files · ~133,401 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 865 nodes · 1276 edges · 57 communities (41 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `25867fd4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 31 edges
2. `AuthService` - 29 edges
3. `IdleTimer` - 24 edges
4. `SampleLifecycleService` - 17 edges
5. `RoleCheckFacade` - 16 edges
6. `TokenService` - 15 edges
7. `TokenRefreshService` - 15 edges
8. `useUIStore` - 15 edges
9. `useToastActions()` - 15 edges
10. `useAuthContext()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useAuth()`  [INFERRED]
  apps/web/src/App.tsx → apps/web/src/hooks/useAuth.ts
- `AuthProvider()` --calls--> `useAuth()`  [EXTRACTED]
  apps/web/src/contexts/AuthContext.tsx → apps/web/src/hooks/useAuth.ts
- `start()` --calls--> `applyPragmas()`  [EXTRACTED]
  apps/api/src/index.ts → apps/api/src/db/pragmas.ts
- `DashboardContent()` --calls--> `useRoleCheck()`  [EXTRACTED]
  apps/web/src/components/DashboardContent.tsx → apps/web/src/hooks/useRoleCheck.ts
- `ProtectedRoute()` --calls--> `useAuthContext()`  [EXTRACTED]
  apps/web/src/components/ProtectedRoute.tsx → apps/web/src/contexts/AuthContext.tsx

## Communities (57 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (36): ApiResponse, dispatchApi, DispatchReceiveRequest, ReassignRequest, CreateSampleRequest, DisposeSampleRequest, Sample, samplesApi (+28 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (44): authApi, LoginRequest, LoginResponse, LogoutRequest, RefreshTokenRequest, RefreshTokenResponse, SSOCallbackRequest, SSOResponse (+36 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (30): AuditContext, clearCurrentUser(), setCurrentUser(), withAuditContext(), createAllAuditTriggers(), createAuditTriggers(), createProtectionTriggers(), dropExistingTriggers() (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (27): ProtectedRoute(), ProtectedRouteProps, useRouteAccess(), QRScannerProps, AuthContext, AuthContextType, AuthProvider(), AuthProviderProps (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (10): count(), exists(), FindOptions, IRepository, Transaction, FastifyInstance, ServiceFactory, serviceFactoryPlugin() (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (10): AllRolesStrategy, AnyRoleStrategy, checkAllRoles(), checkAnyRole(), checkRole(), RoleCheckContext, RoleCheckFacade, RoleCheckStrategy (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (28): COLORS, ICONS, ToastContainer(), ToastItemProps, LayoutState, LoadingState, Modal, NotificationState (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (14): Approval, ApprovalService, CheckinRequest, CheckoutRequest, CreateSampleRequest, Inventory, InventoryService, Location (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (20): AccountLockedError, AuthenticationError, InvalidPasswordError, InvalidResetTokenError, MFANotEnabledError, OAuthError, TokenExpiredError, TokenReuseDetectedError (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (6): DesktopTimeoutStrategy, IdleTimer, IdleTimerConfig, MobileTimeoutStrategy, TimeoutCallback, TimeoutStrategy

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (31): 1. Dispatch Receive (Decoupled RFID), 1. Multi-Strategy Authentication, 2. Role-Based Access Control (RBAC), 2. Transfer Ownership, 3. Database Security, 3. Pull-Request Handover, 4. RFID Encoding & Hot-Swap, 5. Active Storage Placement (+23 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (13): BUYER_NAMES, DESCRIPTIONS, generateSampleId(), main(), OFFICES, prisma, randomPick(), SAMPLE_TYPES (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (18): applyPragmas(), dbPath, getDB(), getPragmaSettings(), main(), authCodeUrlParameters, AzureADConfig, config (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (19): authenticate(), authenticateOptional(), authorize(), getAdminUserId(), getTokenHash(), logAuthOperation(), requireAdmin, requireDispatchOrAdmin (+11 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (8): BusinessLogicError, ConflictError, ErrorHandler, ForbiddenError, InternalServerError, NotFoundError, UnauthorizedError, ValidationError

### Community 16 - "Community 16"
Cohesion: 0.1
Nodes (19): API_ENDPOINTS, APPROVAL_STATUS, ApprovalStatus, DEFAULT_PAGINATION, ERROR_MESSAGES, FEATURES, FORM_FIELDS, INVENTORY_STATUS (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (10): InvalidCredentialsError, InvalidTokenError, MFARequiredError, MFAVerificationError, RateLimitExceededError, UserNotFoundError, LoginBody, LogoutBody (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (10): AccessJwtPayload, InvalidTokenError, JwtConfig, JwtPayload, RefreshJwtPayload, TokenExpiredError, TokenPair, TokenTypeError (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (17): Acceptance Criteria, Acceptance Criteria, API / Integration Notes, API / Integration Notes, Context, Context, Data Model, Data Model (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.23
Nodes (4): IMFAStrategy, MFASetupResponse, MFAVerifyResponse, TOTPStrategy

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (8): CheckInDto, CheckOutDto, CreateSampleDto, ReceiveSampleDto, SampleDtoValidator, SampleResponseDto, TransferSampleDto, UpdateSampleDto

### Community 26 - "Community 26"
Cohesion: 0.24
Nodes (3): AzureADConfig, AzureADService, AzureADUserProfile

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (8): RateLimitedButton(), RateLimitedButtonProps, RateLimitActions, RateLimitState, RateLimitStore, useRateLimitActions(), useRateLimitState(), useRateLimitStore

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (4): ErrorBoundary, Props, State, queryClient

### Community 30 - "Community 30"
Cohesion: 0.31
Nodes (7): downloadZPL(), escapeHtml(), printLabel(), PrintLabelOptions, PrintLabelResponse, printViaBrowser(), printViaZebra()

### Community 31 - "Community 31"
Cohesion: 0.32
Nodes (3): Notification, notificationsApi, LayoutProps

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (4): UseFormOptions, UseFormReturn, ValidationRule, ValidationRules

## Knowledge Gaps
- **216 isolated node(s):** `prisma`, `Database`, `db`, `prisma`, `SAMPLE_TYPES` (+211 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPragmaSettings()` connect `Community 13` to `Community 12`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 1` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `SampleRepository` connect `Community 4` to `Community 12`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `prisma`, `Database`, `db` to the rest of the system?**
  _216 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._