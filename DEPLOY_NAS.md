# NAS에서 Lifipedia 실행하기

Docker를 지원하는 NAS(시놀로지 Container Manager, QNAP Container Station 등)라면
`docker-compose.yml` 하나로 앱 + PostgreSQL을 통째로 띄울 수 있습니다.

## 준비물

- Docker(Container Manager / Container Station)가 설치된 NAS
- SSH 접속 가능 (또는 각 NAS의 GUI로 compose 파일 import)
- 이 저장소 코드 (git clone 또는 압축 다운로드)

## 1. 코드 받기 (NAS에 SSH로)

```bash
git clone https://github.com/hershey95/lifipedia
cd lifipedia
git checkout claude/peaceful-pasteur-abbqgx   # 지금은 이 브랜치가 기본 브랜치입니다
```

## 2. 환경변수 설정

```bash
cp .env.docker.example .env
```

`.env` 파일을 열어 최소한 아래 두 값을 채워주세요:

- `NEXTAUTH_URL` — NAS를 LAN에서만 쓴다면 `http://<NAS의 IP>:3000`. 외부 도메인이나
  리버스 프록시(HTTPS)를 쓴다면 그 주소.
- `NEXTAUTH_SECRET` — 아래 명령으로 생성한 값을 붙여넣기:
  ```bash
  openssl rand -base64 32
  ```

소셜 로그인(GitHub/Google)을 쓰려면 `GITHUB_ID`/`GITHUB_SECRET` 또는
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`도 채워주세요. 비워두면 로그인 버튼 대신
안내 문구가 보이고, 나머지 기능(열람, 검색)은 정상 동작합니다.

## 3. 빌드 & 실행

```bash
docker compose up -d --build
```

이 한 줄이 하는 일:
1. `db` — PostgreSQL 16 컨테이너를 띄우고 데이터를 볼륨(`db_data`)에 영구 저장
2. `migrate` — DB가 준비되면 Prisma 스키마를 한 번 반영하고 종료
3. `app` — `migrate`가 끝나면 Next.js 앱을 빌드해서 기동

`http://<NAS의 IP>:3000` 으로 접속하면 됩니다.

## 4. (선택) 샘플 데이터 넣기

테마·제품·투표 예시 데이터를 보고 싶다면:

```bash
docker compose --profile seed run --rm seed
```

## 자주 쓰는 명령

```bash
docker compose logs -f app          # 앱 로그 보기
docker compose down                  # 중지 (데이터는 유지됨)
docker compose down -v               # 중지 + DB 데이터까지 완전 삭제
docker compose up -d --build         # 코드 수정 후 재빌드/재기동
docker compose exec db psql -U lifipedia   # DB 직접 접속
```

## 월간/연간 랭킹 스냅샷 자동화 (선택)

이 앱은 매달 1일 / 매년 1월 1일에 순위를 아카이브로 박제하는 배치가 있습니다.
NAS에는 Vercel Cron이 없으므로, 시놀로지라면 **작업 스케줄러(Task Scheduler)**,
QNAP이라면 **작업 스케줄러**에 아래와 같은 명령을 등록하세요.

- 매달 1일 00:10 (KST 기준 원하는 시간으로 조정):
  ```bash
  curl -X POST -H "Authorization: Bearer <CRON_SECRET 값>" \
    "http://localhost:3000/api/cron/snapshot?periodType=MONTHLY"
  ```
- 매년 1월 1일 00:30:
  ```bash
  curl -X POST -H "Authorization: Bearer <CRON_SECRET 값>" \
    "http://localhost:3000/api/cron/snapshot?periodType=YEARLY"
  ```
- 매일 새벽 (테마 승격/휴면 정리):
  ```bash
  curl -X POST -H "Authorization: Bearer <CRON_SECRET 값>" \
    "http://localhost:3000/api/cron/lifecycle"
  ```

`<CRON_SECRET 값>`은 `.env`에 설정한 `CRON_SECRET`과 동일해야 합니다. 또는 컨테이너
안에서 직접 실행해도 됩니다:

```bash
docker compose --profile seed run --rm seed sh -c "npx tsx scripts/snapshot.ts --type MONTHLY"
```

## 외부에서 접속하고 싶다면 (선택)

집 밖에서도 접속하려면 NAS의 리버스 프록시 기능(시놀로지: 제어판 → 로그인 포털 →
고급 → 역방향 프록시)으로 HTTPS 도메인을 연결하는 것을 권장합니다. 이 경우
`.env`의 `NEXTAUTH_URL`을 그 HTTPS 도메인으로 맞춰주세요 — 소셜 로그인 콜백이
이 값을 기준으로 계산됩니다. 포트를 라우터에서 직접 포워딩하는 방식은 보안상
권장하지 않습니다.

## 문제 해결

- **컨테이너가 계속 재시작됨** → `docker compose logs app` 으로 원인 확인. 대부분
  `NEXTAUTH_SECRET` 미설정이거나 DB 연결 실패입니다.
- **`migrate` 가 실패함** → `docker compose logs migrate` 확인. `db` 컨테이너가
  완전히 뜨기 전에 실행되는 경우는 거의 없지만(healthcheck로 순서 보장), DB
  비밀번호 불일치가 흔한 원인입니다 — `.env`의 `POSTGRES_PASSWORD`를 바꿨다면
  `docker compose down -v` 로 볼륨을 초기화한 뒤 다시 올려야 합니다(비밀번호는
  DB 최초 생성 시에만 적용됨).
- **이미지 빌드가 느림 / 리소스가 부족한 NAS** → `docker-compose.yml`의 `app`
  빌드는 Node.js 빌드 도구를 한 번만 쓰고 끝나는 멀티스테이지 빌드라 최종
  이미지는 가볍지만, 빌드 자체는 몇 분 걸릴 수 있습니다. 저사양 NAS라면 더 강력한
  PC에서 `docker build -t lifipedia .` 로 이미지를 만든 뒤 `docker save`/`docker load`
  로 옮기는 방법도 있습니다.
