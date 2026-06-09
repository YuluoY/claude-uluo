#!/usr/bin/env python3
"""批量生成 mermaid 图表为高清 PNG（Canvas 统一输出，支持主题配置）。

用法:
    python3 generate.py --all
    python3 generate.py --type system-architecture
"""

import sys
import textwrap
from pathlib import Path

from PIL import Image

THIS_DIR = Path(__file__).resolve().parent.parent  # scripts/
ROOT_DIR = THIS_DIR.parent
sys.path.insert(0, str(THIS_DIR))
OUTPUT_DIR = ROOT_DIR / "output"

Image.MAX_IMAGE_PIXELS = 300_000_000

# ═══════════════════════════════════════════════════════════════
# DIAGRAM TEMPLATES
# ═══════════════════════════════════════════════════════════════

DIAGRAMS = {}

# ── 系统架构图：水平分层 + 垂直业务切面 ──────────────────────

DIAGRAMS["system-architecture"] = textwrap.dedent("""\
    flowchart TB
        subgraph L1["══════════ 接入层 ══════════"]
            direction LR
            subgraph L1_Web["Web 端"]
                React["React SPA"]
                Admin["Vue Admin"]
            end
            subgraph L1_Mobile["移动端"]
                iOS["Flutter iOS"]
                Android["Flutter Android"]
            end
            subgraph L1_Open["开放平台"]
                OpenAPI["REST API"]
                Webhook["Webhook"]
            end
        end

        subgraph L2["══════════ 网关层 ══════════"]
            direction LR
            CDN["CDN<br/>CloudFront"]
            DNS["智能 DNS<br/>多活调度"]
            WAF["WAF<br/>防护"]
            Kong["Kong Gateway<br/>限流 · 鉴权 · 路由 · 日志"]
        end

        subgraph L3["══════════ 业务服务层 ══════════"]
            direction LR
            subgraph L3_User["用户域"]
                Auth["认证服务<br/>OAuth2 / JWT"]
                Member["会员服务<br/>等级 · 积分"]
            end
            subgraph L3_Trade["交易域"]
                Cart["购物车服务"]
                Order["订单服务<br/>CQRS 读写分离"]
                Pay["支付服务<br/>多通道路由"]
            end
            subgraph L3_Goods["商品域"]
                SPU["SPU 管理"]
                SKU["SKU 库存<br/>Redis + Lua 扣减"]
                Search["搜索服务<br/>ES 倒排索引"]
            end
            subgraph L3_Mkt["营销域"]
                Coupon["优惠券服务<br/>规则引擎"]
                Seckill["秒杀服务<br/>Redis 预热"]
                Rec["推荐服务<br/>协同过滤"]
            end
        end

        subgraph L4["══════════ 基础设施层 ══════════"]
            direction LR
            subgraph L4_MQ["消息队列"]
                RocketMQ["RocketMQ<br/>事务消息"]
                Kafka["Kafka<br/>埋点流"]
            end
            subgraph L4_Data["数据存储"]
                MySQL[("MySQL 8.4<br/>InnoDB Cluster")]
                Redis[("Redis 7<br/>Sentinel")]
                ES[("Elasticsearch<br/>搜索引擎")]
            end
            subgraph L4_Obs["可观测性"]
                Skywalking["SkyWalking<br/>链路追踪"]
                Prometheus["Prometheus<br/>指标"]
                ELK["EFK<br/>日志"]
            end
        end

        subgraph L5["══════════ 运维平台层 ══════════"]
            direction LR
            K8s["Kubernetes"]
            ArgoCD["ArgoCD GitOps"]
            Terraform["Terraform IaC"]
            Jenkins["Jenkins CI/CD"]
        end

        L1 --> L2
        L2 --> L3
        L3 --> L4
        L4 --> L5
""")

# ── 技术栈全景图 ─────────────────────────────────────────────

DIAGRAMS["tech-stack"] = textwrap.dedent("""\
    flowchart TB
        subgraph L1["──────── 前端技术栈 ────────"]
            direction LR
            subgraph FE_Framework["核心框架"]
                direction LR
                React["React 18<br/>Concurrent"]
                Next["Next.js 15<br/>SSR"]
                Vue["Vue 3<br/>Composition"]
            end
            subgraph FE_State["状态 & 构建"]
                direction LR
                TS["TypeScript 5"]
                Query["TanStack Query"]
                Zustand["Zustand"]
                Vite["Vite 6"]
            end
            subgraph FE_Style["样式 & 测试"]
                direction LR
                Tailwind["TailwindCSS 4"]
                Storybook["Storybook"]
                Vitest["Vitest"]
                Playwright["Playwright"]
            end
        end

        subgraph L2["──────── 后端技术栈 ────────"]
            direction LR
            subgraph BE_Lang["多语言异构"]
                direction LR
                Go["Go + Gin<br/>高并发网关"]
                Java["Java 21<br/>Spring Boot 3"]
                Node["Node + NestJS<br/>BFF 层"]
                Python["Python + FastAPI<br/>AI 任务"]
            end
            subgraph BE_RPC["RPC & 治理"]
                direction LR
                GRPC["gRPC"]
                Protobuf["Protobuf IDL"]
                Nacos["Nacos<br/>注册/配置"]
                Sentinel["Sentinel<br/>熔断降级"]
                Seata["Seata<br/>分布式事务"]
            end
        end

        subgraph L3["──────── 数据层 ────────"]
            direction LR
            MySQL["MySQL 8.4<br/>OLTP 集群"]
            Redis["Redis 7<br/>Cache Cluster"]
            ES["ES 8<br/>全文检索"]
            Kafka["Kafka 4<br/>事件流"]
            TiDB["TiDB<br/>HTAP"]
            MinIO["MinIO<br/>对象存储"]
        end

        subgraph L4["──────── 云原生平台 ────────"]
            direction LR
            Docker["Docker"]
            K8s["Kubernetes"]
            Helm["Helm"]
            Istio["Istio"]
            ArgoCD["ArgoCD"]
            Terraform["Terraform"]
        end

        L1 --> L2
        L2 --> L3
        L3 --> L4
""")

# ── 微服务调用链时序图：OAuth2 登录 ──────────────────────────

DIAGRAMS["login-sequence"] = textwrap.dedent("""\
    sequenceDiagram
        actor U as User
        participant App as Mobile App
        participant GW as API Gateway
        participant Auth as Auth Service
        participant DB as User DB
        participant Redis as Redis
        participant SMS as SMS Gateway

        U->>App: Input phone + code
        App->>GW: POST /auth/login
        GW->>GW: Rate limit check
        GW->>Auth: Forward request
        Auth->>Redis: Verify SMS code
        alt Code invalid or expired
            Redis-->>Auth: Verification failed
            Auth-->>GW: 401 Invalid code
            GW-->>App: Error response
            App-->>U: Show error toast
        else Code correct
            Redis-->>Auth: Verified OK
            Auth->>DB: Upsert user record
            DB-->>Auth: User data
            Auth->>Auth: Sign JWT AccessToken
            Auth->>Auth: Sign RefreshToken
            Auth->>Redis: Cache token TTL=7200
            Auth-->>GW: 200 + token pair
            GW-->>App: Return tokens
            App->>App: Store in Keychain
            App-->>U: Navigate to home
        end

        Note over U,SMS: --- SMS code flow ---
        U->>App: Tap get code
        App->>GW: POST /auth/sms
        GW->>Auth: Forward
        Auth->>Redis: Check rate (60s)
        Redis-->>Auth: Allowed
        Auth->>SMS: Send via gateway
        SMS-->>Auth: Sent ok
        Auth->>Redis: Store code TTL=300
        Auth-->>App: 200 code sent
        App-->>U: Countdown 60s
""")

# ── 秒杀时序图 ───────────────────────────────────────────────

DIAGRAMS["sequence-seckill"] = textwrap.dedent("""\
    sequenceDiagram
        actor U as User
        participant App as App
        participant GW as Gateway
        participant SK as Seckill Service
        participant Redis as Redis
        participant MQ as RocketMQ
        participant Order as Order Service
        participant DB as MySQL

        U->>App: Tap Seckill at 10:00
        App->>GW: POST /seckill/order
        GW->>SK: Forward request
        SK->>Redis: Check activity status
        Redis-->>SK: Activity is LIVE
        SK->>Redis: Check purchase limit
        Redis-->>SK: Not purchased yet
        SK->>Redis: DECR stock atomically
        alt Stock depleted
            Redis-->>SK: Stock = 0
            SK-->>App: Sold out
            App-->>U: Show sold out
        else Stock available
            Redis-->>SK: Decrement OK
            SK->>MQ: Send order message
            SK-->>App: In queue...
            MQ->>Order: Consume message
            Order->>DB: Create order row
            DB-->>Order: Order created
            Order->>Redis: Mark purchased
            Order-->>App: Push via WS
            App-->>U: Seckill success!
        end
""")

# ── 电商 ER 图 ───────────────────────────────────────────────

DIAGRAMS["er-ecommerce"] = textwrap.dedent("""\
    erDiagram
        User ||--o{ Order : places
        User ||--o{ Address : has
        User ||--|| Cart : owns
        Order ||--|{ OrderItem : contains
        Order ||--|| Payment : paid_by
        Order ||--|| Shipment : shipped_via
        Product ||--o{ OrderItem : ordered_as
        Product ||--o{ CartItem : added_to
        Product ||--o{ Review : reviewed_in
        Category ||--o{ Product : categorizes
        Product ||--o{ Sku : has_variants

        User {
            bigint id PK
            varchar phone UK
            varchar nickname
            varchar avatar_url
            tinyint status
            datetime created_at
        }

        Order {
            bigint id PK
            varchar order_no UK
            bigint user_id FK
            decimal total_amount
            decimal pay_amount
            varchar status
            datetime created_at
        }

        Product {
            bigint id PK
            varchar title
            varchar spu_code UK
            decimal price
            int total_stock
            bigint category_id FK
            tinyint status
        }

        Payment {
            bigint id PK
            bigint order_id FK
            varchar pay_no UK
            varchar channel
            decimal amount
            varchar status
            datetime paid_at
        }

        Shipment {
            bigint id PK
            bigint order_id FK
            varchar tracking_no
            varchar company
            varchar status
            datetime shipped_at
        }

        Review {
            bigint id PK
            bigint product_id FK
            bigint user_id FK
            tinyint rating
            text content
            json images
        }
""")

# ── 类图：观察者模式 ─────────────────────────────────────────

DIAGRAMS["class-patterns"] = (
    "classDiagram\n"
    "    direction TB\n"
    "\n"
    "    class EventPublisher {\n"
    "        -List listeners\n"
    "        +register(listener) void\n"
    "        +unregister(listener) void\n"
    "        +publishEvent(event) void\n"
    "    }\n"
    "\n"
    "    class OrderEventPublisher {\n"
    "        -OrderRepository repo\n"
    "        +publishOrderCreated(order) void\n"
    "        +publishOrderPaid(order) void\n"
    "        +publishOrderShipped(order) void\n"
    "    }\n"
    "\n"
    "    class EventListener {\n"
    "        +onEvent(event) void\n"
    "        +supports(eventType) bool\n"
    "    }\n"
    "\n"
    "    class InventoryListener {\n"
    "        -InventoryService service\n"
    "        +onEvent(event) void\n"
    "        +deductStock(skuId, qty) void\n"
    "        +rollbackStock(skuId, qty) void\n"
    "    }\n"
    "\n"
    "    class NotificationListener {\n"
    "        -SmsService sms\n"
    "        -EmailService email\n"
    "        -PushService push\n"
    "        +onEvent(event) void\n"
    "    }\n"
    "\n"
    "    class CouponListener {\n"
    "        -CouponService service\n"
    "        +onEvent(event) void\n"
    "    }\n"
    "\n"
    "    class AuditListener {\n"
    "        -AuditRepo repo\n"
    "        +onEvent(event) void\n"
    "    }\n"
    "\n"
    "    EventPublisher <|-- OrderEventPublisher : extends\n"
    "    EventListener <|.. InventoryListener : implements\n"
    "    EventListener <|.. NotificationListener : implements\n"
    "    EventListener <|.. CouponListener : implements\n"
    "    EventListener <|.. AuditListener : implements\n"
    "    EventPublisher o--> EventListener : notifies\n"
    "    OrderEventPublisher ..> OrderEvent : creates\n"
    "\n"
    "    class OrderEvent {\n"
    "        -String orderId\n"
    "        -String eventType\n"
    "        -Map payload\n"
    "        +getOrderId() String\n"
    "        +getEventType() String\n"
    "        +getTimestamp() Long\n"
    "    }\n"
)

# ── 订单状态机 ───────────────────────────────────────────────

DIAGRAMS["state-order"] = textwrap.dedent("""\
    stateDiagram-v2
        direction LR

        [*] --> PendingPayment : User submits order

        state PendingPayment {
            [*] --> AwaitingPay
            AwaitingPay --> Expired : Timeout 15min
            AwaitingPay --> Cancelled : User cancels
            Expired --> [*] : Release stock
            Cancelled --> [*] : Release stock
        }

        PendingPayment --> Paid : Payment callback OK

        state Paid {
            [*] --> RiskCheck
            RiskCheck --> Approved : Risk passed
            RiskCheck --> Rejected : Risk flagged
            Rejected --> Refunding : Auto refund
        }

        Paid --> Preparing : Risk approved
        Preparing --> Shipped : WMS dispatched

        state Shipped {
            [*] --> InTransit
            InTransit --> Delivering : At station
            Delivering --> Signed : User signed
            Delivering --> Retry : Failed contact
            Retry --> InTransit : Redelivery
        }

        Shipped --> Completed : User confirmed
        Completed --> Reviewing : Auto trigger
        Reviewing --> [*] : Review done

        state Refunding {
            [*] --> WaitingRefund
            WaitingRefund --> Refunded : Original channel
        }

        Paid --> Refunding : Refund request
        Preparing --> Refunding : Refund request
""")

# ── API 错误处理流程 ─────────────────────────────────────────

DIAGRAMS["flowchart-error-handling"] = textwrap.dedent("""\
    flowchart TB
        Start["API Request"] --> Validate{"Parameter<br/>validation"}
        Validate -->|Invalid| E400["400 Bad Request<br/>Return validation errors"]
        Validate -->|Valid| Auth{"Authentication<br/>JWT check"}
        Auth -->|Expired| E401["401 Unauthorized<br/>Token expired"]
        Auth -->|No permission| E403["403 Forbidden<br/>Insufficient role"]
        Auth -->|OK| RateLimit{"Rate limit<br/>token bucket"}
        RateLimit -->|Exceeded| E429["429 Too Many<br/>Retry after 60s"]
        RateLimit -->|Passed| Business["Execute business<br/>logic in Tx"]
        Business --> DB{"Database<br/>operation"}
        DB -->|Timeout| Retry["Exponential backoff<br/>max 3 retries"]
        Retry -->|Retry OK| Cache["Update cache"]
        Retry -->|All failed| E503["503 Unavailable<br/>Try later"]
        DB -->|Deadlock| Rollback["Rollback<br/>transaction"]
        Rollback --> E500["500 Internal Error<br/>Please retry"]
        DB -->|OK| Cache
        Cache --> MQ[/"Publish domain<br/>event to MQ"/]
        MQ --> OK200["200 OK<br/>Return result"]
""")

# ── 电商下单流程 ─────────────────────────────────────────────

DIAGRAMS["ecommerce-flow"] = textwrap.dedent("""\
    flowchart TB
        User(("User")) --> Browse["Browse products"]
        Browse --> Search["Search via ES<br/>fulltext index"]
        Search --> Detail["Product detail<br/>SKU / stock / price"]
        Detail --> AddCart["Add to cart<br/>Redis cached cart"]
        AddCart --> Checkout["Submit order<br/>validate stock + coupon"]
        Checkout --> Lock["Lock inventory<br/>Redis SETNX distributed lock"]
        Lock -->|No stock| Fail["Order failed<br/>Insufficient stock"]
        Lock -->|Locked| PreOrder["Pre-order created<br/>Status: PENDING"]
        PreOrder --> Pay["Request payment<br/>3rd party gateway"]
        Pay -->|Timeout| Cancel["Auto cancel<br/>Release stock + coupon"]
        Pay -->|Paid| Callback["Payment callback<br/>Status: PAID"]
        Callback --> MQ{{"RocketMQ<br/>OrderPaidEvent"}}
        MQ --> Notify["Notification service<br/>SMS + Push"]
        MQ --> WMS["WMS warehouse<br/>Create dispatch"]
        MQ --> Points["Points service<br/>Award points"]
        Notify --> Ship["Ship order<br/>Status: SHIPPED"]
        WMS --> Ship
        Ship --> Receive["Confirm receipt<br/>Status: COMPLETED"]
        Receive --> Review["User review<br/>Rating + photos"]
""")

# ── Git 分支工作流 ────────────────────────────────────────────

DIAGRAMS["git-workflow"] = (
    "gitGraph\n"
    '    commit id: "chore: init project"\n'
    '    commit id: "feat: setup framework"\n'
    "    branch develop\n"
    "    checkout develop\n"
    '    commit id: "feat: user auth module"\n'
    "    branch feature/cart\n"
    "    checkout feature/cart\n"
    '    commit id: "feat: add to cart"\n'
    '    commit id: "feat: modify quantity"\n'
    '    commit id: "fix: price precision bug"\n'
    "    checkout develop\n"
    "    merge feature/cart\n"
    "    branch feature/order\n"
    "    checkout feature/order\n"
    '    commit id: "feat: order submit"\n'
    '    commit id: "feat: payment callback"\n'
    "    checkout develop\n"
    "    merge feature/order\n"
    "    branch release/v1.0\n"
    "    checkout release/v1.0\n"
    '    commit id: "fix: pre-release defects"\n'
    "    checkout main\n"
    '    merge release/v1.0 tag: "v1.0.0"\n'
    "    checkout develop\n"
    "    merge release/v1.0\n"
    "    branch feature/coupon\n"
    "    checkout feature/coupon\n"
    '    commit id: "feat: coupon claim"\n'
    '    commit id: "feat: coupon rule engine"\n'
    '    commit id: "test: coupon unit tests"\n'
    "    checkout develop\n"
    "    merge feature/coupon\n"
    "    branch release/v1.1\n"
    "    checkout release/v1.1\n"
    '    commit id: "fix: coupon concurrency bug"\n'
    "    checkout main\n"
    '    merge release/v1.1 tag: "v1.1.0"\n'
)

# ── 甘特图：修复排版拥挤问题（减少并发、拉长时间跨度）───────

DIAGRAMS["gantt-sprint"] = textwrap.dedent("""\
    gantt
        title E-Commerce Platform v2.0 Release Plan
        dateFormat YYYY-MM-DD
        axisFormat %b %d
        excludes weekends

        section Requirements
        Requirements review     :done,    req1, 2026-03-01, 2026-03-10
        PRD writing             :done,    req2, after req1, 1w
        Tech design             :crit, done, des1, after req2, 1w

        section Sprint 1
        User auth refactor      :done,    s1a, after des1, 3w
        Search optimization     :done,    s1b, 2026-04-03, 2026-04-24
        Shopping cart rewrite   :done,    s1c, 2026-04-12, 2026-04-30

        section Sprint 2
        Order flow refactor     :active,  s2a, 2026-05-01, 2026-05-20
        Payment module upgrade  :s2b, 2026-05-08, 2026-05-30
        Coupon system           :s2c, 2026-05-15, 2026-06-08
        Performance tuning      :s2d, 2026-05-20, 2026-06-14

        section Testing
        Unit testing            :t1, 2026-06-10, 2026-06-24
        Integration testing     :crit, t2, after t1, 2w
        UAT acceptance          :crit, t3, after t2, 1w

        section Release
        Canary 5%               :milestone, m1, 2026-07-15, 1d
        Canary 50%              :milestone, m2, 2026-07-18, 1d
        Full rollout            :milestone, m3, 2026-07-22, 1d
        On-call monitoring      :ops, 2026-07-22, 2026-08-05
""")

# ── Gantt data for matplotlib renderer ─────────────────────

GANTT_DATA = {
    "title": "E-Commerce Platform v2.0 Release Plan",
    "axis_format": "%b %d",
    "tick_interval": "week",
    "today": "2026-05-06",
    "sections": [
        {
            "name": "Requirements",
            "tasks": [
                {"id": "req1", "name": "Requirements review", "start": "2026-03-01", "end": "2026-03-10", "status": "done", "progress": 1.0},
                {"id": "req2", "name": "PRD writing", "start": "2026-03-11", "end": "2026-03-20", "status": "done", "depends_on": ["req1"], "progress": 1.0},
                {"id": "des1", "name": "Tech design", "start": "2026-03-21", "end": "2026-03-28", "status": "crit", "depends_on": ["req2"], "progress": 1.0},
            ]
        },
        {
            "name": "Sprint 1",
            "tasks": [
                {"id": "s1a", "name": "User auth refactor", "start": "2026-03-29", "end": "2026-04-16", "status": "done", "depends_on": ["des1"], "progress": 1.0},
                {"id": "s1b", "name": "Search optimization", "start": "2026-04-03", "end": "2026-04-24", "status": "done", "progress": 1.0},
                {"id": "s1c", "name": "Shopping cart rewrite", "start": "2026-04-12", "end": "2026-04-30", "status": "done", "progress": 1.0},
            ]
        },
        {
            "name": "Sprint 2",
            "tasks": [
                {"id": "s2a", "name": "Order flow refactor", "start": "2026-05-01", "end": "2026-05-20", "status": "active", "depends_on": ["s1a"], "progress": 0.28},
                {"id": "s2b", "name": "Payment module upgrade", "start": "2026-05-08", "end": "2026-05-30", "status": "default", "depends_on": ["s1c"]},
                {"id": "s2c", "name": "Coupon system", "start": "2026-05-15", "end": "2026-06-08", "status": "default", "depends_on": ["s2a"]},
                {"id": "s2d", "name": "Performance tuning", "start": "2026-05-20", "end": "2026-06-14", "status": "default", "depends_on": ["s2b"]},
            ]
        },
        {
            "name": "Testing",
            "tasks": [
                {"id": "t1", "name": "Unit testing", "start": "2026-06-10", "end": "2026-06-24", "status": "default", "depends_on": ["s2c", "s2d"]},
                {"id": "t2", "name": "Integration testing", "start": "2026-06-25", "end": "2026-07-06", "status": "crit", "depends_on": ["t1"]},
                {"id": "t3", "name": "UAT acceptance", "start": "2026-07-07", "end": "2026-07-14", "status": "crit", "depends_on": ["t2"]},
            ]
        },
        {
            "name": "Release",
            "tasks": [
                {"id": "ops", "name": "On-call monitoring", "start": "2026-07-22", "end": "2026-08-05", "status": "default", "depends_on": ["m3"]},
            ]
        },
    ],
    "milestones": [
        {"id": "m1", "name": "Canary 5%", "date": "2026-07-15", "section": "Release", "depends_on": ["t3"]},
        {"id": "m2", "name": "Canary 50%", "date": "2026-07-18", "section": "Release", "depends_on": ["m1"]},
        {"id": "m3", "name": "Full rollout", "date": "2026-07-22", "section": "Release", "depends_on": ["m2"]},
    ],
}

# ── Pie data for matplotlib renderer ─────────────────────────

PIE_DATA = {
    "title": "Traffic Sources Weekly",
    "slices": [
        {"label": "Mini Program", "value": 42.5},
        {"label": "Mobile App", "value": 28.3},
        {"label": "H5 Mobile Web", "value": 15.7},
        {"label": "PC Desktop", "value": 8.9},
        {"label": "Other", "value": 4.6},
    ],
}

# ── 饼图 ──────────────────────────────────────────────────────

DIAGRAMS["pie-metrics"] = textwrap.dedent("""\
    pie
        title Traffic Sources Weekly
        "Mini Program" : 42.5
        "Mobile App" : 28.3
        "H5 Mobile Web" : 15.7
        "PC Desktop" : 8.9
        "Other" : 4.6
""")

# ── 时间线：技术演进 ─────────────────────────────────────────

DIAGRAMS["timeline-roadmap"] = textwrap.dedent("""\
    timeline
        title Platform Tech Evolution

        section 2023 H1 · MVP
            Jan-Feb : Requirements review
                    : Tech stack selection
            Mar-Apr : Spring Boot monolith
                    : Vue 3 admin panel
                    : MySQL + Redis infra
            May-Jun : User auth launched
                    : Product management
                    : 1000 user beta

        section 2023 H2 · Core Loop
            Jul-Aug : ES search service
                    : Cart + Checkout
            Sep-Oct : WeChat Pay integration
                    : Alipay integration
                    : Order fulfillment
            Nov-Dec : 100K DAU reached
                    : Load testing + tuning

        section 2024 H1 · Microservices
            Jan-Mar : Monolith split
                    : API Gateway unified
                    : Nacos service mesh
            Apr-Jun : RocketMQ async
                    : Sentinel circuit breaker
                    : Seata distributed Tx

        section 2024 H2 · Platform
            Jul-Sep : K8s migration
                    : Istio service mesh
                    : 100K QPS benchmark
            Oct-Dec : Multi-DC active-active
                    : i18n localization
                    : AI recommendation

        section 2025 · Intelligence
            Planned : LLM smart customer service
                    : Real-time lakehouse
                    : Low-code ops platform
                    : Full Serverless migration
""")

# ── Timeline data for matplotlib renderer ────────────────────

TIMELINE_DATA = {
    "title": "Platform Tech Evolution",
    "events": [
        {"date": "2023-01", "text": "Requirements review", "section": "2023 H1 · MVP"},
        {"date": "2023-03", "text": "Spring Boot monolith", "section": "2023 H1 · MVP"},
        {"date": "2023-05", "text": "User auth launched", "section": "2023 H1 · MVP"},
        {"date": "2023-07", "text": "ES search service", "section": "2023 H2 · Core Loop"},
        {"date": "2023-09", "text": "WeChat Pay integration", "section": "2023 H2 · Core Loop"},
        {"date": "2023-11", "text": "100K DAU reached", "section": "2023 H2 · Core Loop", "highlight": True},
        {"date": "2024-01", "text": "Monolith split", "section": "2024 H1 · Microservices"},
        {"date": "2024-03", "text": "API Gateway unified", "section": "2024 H1 · Microservices"},
        {"date": "2024-06", "text": "RocketMQ + Sentinel", "section": "2024 H1 · Microservices"},
        {"date": "2024-07", "text": "K8s migration", "section": "2024 H2 · Platform"},
        {"date": "2024-10", "text": "Multi-DC active-active", "section": "2024 H2 · Platform", "highlight": True},
        {"date": "2025-01", "text": "LLM smart service", "section": "2025 · Intelligence"},
        {"date": "2025-03", "text": "Full Serverless", "section": "2025 · Intelligence", "highlight": True},
    ],
}

# ── 思维导图：平台全景 ───────────────────────────────────────

DIAGRAMS["mindmap-platform"] = textwrap.dedent("""\
    mindmap
        root((E-Commerce<br/>Platform))
            Infrastructure
                K8s Cluster
                    Production
                    Staging
                    Development
                CI/CD Pipeline
                    SonarQube
                    Auto Build
                    ArgoCD Deploy
                Monitoring
                    Prometheus
                    Grafana
                    PagerDuty Alert
            Business Domains
                User Domain
                    Auth
                    Membership
                    Address Book
                Product Domain
                    SPU Management
                    SKU Inventory
                    Category Taxonomy
                Trade Domain
                    Shopping Cart
                    Order Management
                    Refund Returns
                Marketing Domain
                    Coupons
                    Flash Sales
                    Group Buying
                Payment Domain
                    WeChat Pay
                    Alipay
                    Reconciliation
            Tech Middle Platform
                Search Center
                Message Center
                File Center
            Data Platform
                Offline Warehouse
                Real-time Compute
                BI & Analytics
""")

# ═══════════════════════════════════════════════════════════════
# RENDERING ENGINE — Canvas via SVG→Image bridge
# ═══════════════════════════════════════════════════════════════

from _shared import core as _core

DIAGRAM_THEMES_PATH = ROOT_DIR / "assets" / "themes" / "diagram-themes.yaml"


def _get_style_init() -> str:
    """Get mermaid style init string, optionally from theme config."""
    theme_vars = None
    if DIAGRAM_THEMES_PATH.exists():
        _core.set_themes_path(DIAGRAM_THEMES_PATH)
        theme_vars = _core.load_diagram_theme()
    return _core.make_style_init(overrides=theme_vars)


def render_to_png(diagram: str, output_path: Path, diagram_type: str = "",
                 mpl_data: dict | None = None) -> bool:
    """Render diagram to PNG. Routes to matplotlib where possible, else Canvas."""
    # Matplotlib renderers (no Chrome)
    if mpl_data:
        if diagram_type.startswith("gantt"):
            from gantt import render as _r
            try:
                _r(mpl_data, output_path, dpi=150)
                return True
            except Exception as e:
                print(f"    Matplotlib gantt failed: {e}")
                return False

        if diagram_type.startswith("pie"):
            from pie import render as _r
            try:
                _r(mpl_data, output_path, dpi=150)
                return True
            except Exception as e:
                print(f"    Matplotlib pie failed: {e}")
                return False

        if diagram_type.startswith("timeline"):
            from timeline import render as _r
            try:
                _r(mpl_data, output_path, dpi=150)
                return True
            except Exception as e:
                print(f"    Matplotlib timeline failed: {e}")
                return False

    # Canvas SVG bridge (mermaid diagrams)
    from _shared.canvas_engine import render_mermaid as _render_mermaid
    style = _get_style_init()

    try:
        _render_mermaid(diagram, style, output_path)
        return True
    except Exception as e:
        print(f"    Canvas engine failed: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Diagram Studio sample diagrams → PNG")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--type", "-t")
    args = parser.parse_args()

    style_init = _get_style_init()
    print(f"Canvas engine | Theme: {'config' if DIAGRAM_THEMES_PATH.exists() else 'default'}\n")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    types = [args.type] if args.type else list(DIAGRAMS.keys())

    # Strip style init from diagram text (render_mermaid handles it separately)
    def _strip_style(d):
        if d.startswith("%%"):
            for i, line in enumerate(d.split("\n")):
                if not line.strip().startswith("%%") and line.strip():
                    return "\n".join(d.split("\n")[i:])
        return d

    success = 0
    for name in types:
        if name not in DIAGRAMS:
            print(f"ERROR unknown type: {name}")
            continue

        # Pass diagram + style init separately for Canvas SVG bridge
        diagram_code = DIAGRAMS[name]
        png_path = OUTPUT_DIR / f"{name}.png"
        # Route to matplotlib data if available for this diagram type
        mpl_data = None
        if name.startswith("gantt"):
            mpl_data = GANTT_DATA
        elif name.startswith("pie"):
            mpl_data = PIE_DATA
        elif name.startswith("timeline"):
            mpl_data = TIMELINE_DATA
        print(f"  {name:30s} ... ", end="", flush=True)
        if render_to_png(diagram_code, png_path, diagram_type=name, mpl_data=mpl_data):
            w, h = Image.open(png_path).size
            kb = png_path.stat().st_size / 1024
            print(f"OK  {w}x{h} px  {kb:.0f} KB")
            success += 1
        else:
            print(f"FAILED")

    print(f"\n  {success}/{len(types)} succeeded")
    print(f"  Output: {OUTPUT_DIR}")

    print("\n" + "=" * 60)
    for name in types:
        if name in DIAGRAMS:
            print(f"\n### {name}")
            print("```mermaid")
            print(style_init.rstrip())
            print(DIAGRAMS[name].rstrip())
            print("```")


if __name__ == "__main__":
    main()
