
# GitHub Notion Sync

GitHub Issue를 Notion 데이터베이스로 동기화하는 단방향 자동화 서버입니다.

GitHub Webhook을 통해 이슈 생성/수정/닫힘 이벤트를 감지하고, Notion 데이터베이스에 해당 이슈를 생성하거나 업데이트합니다.  
초기 세팅 시 이미 존재하는 GitHub Issue를 한 번에 Notion으로 가져오는 스크립트도 제공합니다.

## 주요 기능

- GitHub Issue → Notion DB 단방향 동기화
- GitHub Webhook signature 검증
- Issue 생성/수정/담당자 변경/라벨 변경/닫힘/재오픈 이벤트 처리
- GitHub Issue ID 기반 중복 생성 방지
- GitHub Projects의 `Deadline`, `deadline`, `마감일` 필드 조회 후 Notion 마감일 반영
- 기존 GitHub Issue 전체 초기 동기화 지원

## 기술 스택

- TypeScript
- Express
- Notion API
- GitHub REST API
- GitHub GraphQL API
- pnpm
- tsx

## 프로젝트 구조

```txt
src/
├─ app.ts                  # Express 서버 및 GitHub Webhook 처리
├─ notion.ts               # Notion DB 조회/생성/수정 로직
├─ github.ts               # GitHub GraphQL API로 Project 마감일 조회
├─ mapper.ts               # GitHub 상태/라벨 → Notion 값 매핑
└─ scripts/
   └─ sync-issues.ts       # 기존 GitHub Issue 전체 초기 동기화 스크립트
````

## 동작 흐름

```txt
GitHub Issue 이벤트 발생
        ↓
GitHub Webhook
        ↓
POST /webhooks/github
        ↓
Webhook signature 검증
        ↓
GitHub Project 마감일 조회
        ↓
Notion DB에서 기존 Issue ID 조회
        ↓
존재하면 업데이트 / 없으면 생성
```

## Notion 데이터베이스 속성

현재 코드는 아래 Notion 속성을 기준으로 동작합니다.

| 속성명      | 타입        | 설명                         |
| -------- | --------- | -------------------------- |
| 작업       | Title     | GitHub Issue 제목            |
| 진행 상태    | Status    | 이슈 상태                      |
| Issue ID | Number    | GitHub Issue 고유 ID         |
| 담당자      | Rich text | GitHub assignee login      |
| 마감일      | Date      | GitHub Project의 Deadline 값 |

## 상태 매핑

| GitHub action/state | Notion 진행 상태 |
| ------------------- | ------------ |
| opened              | 시작 전         |
| assigned            | 진행 중         |
| closed              | 완료           |
| 그 외                 | 진행 중         |

## 환경 변수

프로젝트 루트에 `.env` 파일을 생성합니다.

```env
PORT = 3000
OWNER = 
REPO =

#### NOTION_TOKEN 발급 방법 ####
# 1. Notion 개발자 페이지(https://www.notion.so/my-integrations) 접속
# 2. New integration 생성
# 3. Integration 이름 입력
# 4. 연결할 workspace 선택
# 5. 생성 후 Internal Integration Secret 복사
NOTION_TOKEN=

#### NOTION_DATABASE_ID 확인 방법 ####
# 1. Notion에서 만든 백로그 DB 페이지를 열고 URL 확인
# 1-1. url 예시: https://www.notion.so/xxxxx?v=yyyyy
# 2. ?v= 앞의 문자열(xxxxx)이 DB ID
NOTION_DATABASE_ID=

#### 이후 Notion DB 설정 (Integration 연결) ####
# 1. Notion DB 우측 상단의 ... 클릭
# 2. connections -> 이전에 만든 Integration 선택


#### GITHUB_WEBHOOK_SECRET 생성 방법 ####
# 1. 원하는 값을 직접 입력
# 1-1. 터미널에서 ``openssl rand -hex 32`` 명령어로 랜덤 생성 가능
# 2. GitHub Webhook의 Secret 칸에 입력 예정
GITHUB_WEBHOOK_SECRET=

#### GITHUB_TOKEN 발급 방법 ####
# 토큰 권한은 최소한 repo 접근 + project 읽기 권한이 필요
# 1. https://github.com/settings/tokens 접속
# 2. Generate now token -> Generate now token (Classic)
# 3. 권한 설정: repo, read:project
GITHUB_TOKEN = 
```

### 환경 변수 설명

| 이름                    | 설명                                   |
| --------------------- | ------------------------------------ |
| PORT                  | 서버 실행 포트                             |
| NOTION_TOKEN          | Notion Internal Integration Secret   |
| NOTION_DATABASE_ID    | 동기화할 Notion Database ID              |
| GITHUB_TOKEN          | GitHub API 호출용 Personal Access Token |
| GITHUB_WEBHOOK_SECRET | GitHub Webhook Secret과 동일한 값         |
| OWNER                 | GitHub 저장소 owner                     |
| REPO                  | GitHub 저장소 이름                        |

## 설치

```bash
pnpm install
```

## 로컬 실행

```bash
pnpm dev
```

서버가 정상 실행되면 아래와 같은 로그가 출력됩니다.

```txt
Server running on port 3000
```

헬스 체크:

```txt
GET /
```

응답:

```txt
GitHub Notion Sync Server
```

## GitHub Webhook 설정

GitHub Repository → Settings → Webhooks → Add webhook

```txt
Payload URL: https://배포주소/webhooks/github
Content type: application/json
Secret: .env의 GITHUB_WEBHOOK_SECRET와 동일하게 입력
Events: Issues
```

로컬 테스트 시에는 `cloudflared` 같은 터널링 도구를 사용할 수 있습니다.

```bash
cloudflared tunnel --url http://localhost:3000
```

생성된 URL 뒤에 `/webhooks/github`를 붙여 GitHub Webhook Payload URL로 사용합니다.

```txt
https://xxxx.trycloudflare.com/webhooks/github
```

## 기존 이슈 초기 동기화

Webhook은 변경 이벤트만 처리하므로, 이미 존재하는 이슈를 Notion에 등록하려면 초기 동기화 스크립트를 실행합니다.

```bash
pnpm sync:issues
```

이 스크립트는 GitHub REST API로 `state=all` 이슈를 조회한 뒤, PR을 제외하고 Notion에 생성 또는 업데이트합니다.

## 실행 스크립트

```json
{
  "dev": "tsx src/app.ts",
  "start": "tsx src/app.ts",
  "sync:issues": "tsx src/scripts/sync-issues.ts"
}
```

## 배포

Express 서버 형태이므로 Render Web Service에 배포하기 적합합니다.

Render 설정 예시:

```txt
Build Command: pnpm install
Start Command: pnpm start
```

배포 후 GitHub Webhook Payload URL을 아래처럼 변경합니다.

```txt
https://your-service.onrender.com/webhooks/github
```

## 주의사항

* Notion 속성명과 코드의 속성명은 정확히 일치해야 합니다.
* `진행 상태`는 Notion의 `Status` 타입이어야 합니다.
* `마감일`은 Notion의 `Date` 타입이어야 합니다.
* GitHub Project의 마감일 필드명은 `Deadline`, `deadline`, `마감일` 중 하나여야 합니다.
* `.env` 파일은 Git에 올리지 않습니다.
* GitHub Webhook Secret과 `.env`의 `GITHUB_WEBHOOK_SECRET` 값은 완전히 동일해야 합니다.


