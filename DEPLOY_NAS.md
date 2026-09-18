# 시놀로지 NAS에서 Lifipedia 실행하기

DSM 7.2 이상이면 **Container Manager** 앱의 "프로젝트" 기능으로 SSH 없이도
`docker-compose.yml` 하나로 앱 + PostgreSQL을 통째로 띄울 수 있습니다.
(DSM 7.1 이하는 앱스토어에 "Docker" 라는 이름으로 같은 앱이 있습니다 — 화면 구성은
거의 동일합니다.)

## 준비물

- Container Manager 설치 (패키지 센터에서 검색 → 설치)
- File Station 접근 권한
- 여유 저장공간 약 2GB (Node.js 빌드 도구 + 이미지)

---

## 방법 A — GUI로만 하기 (SSH 몰라도 됨, 추천)

### 1. 코드 다운로드해서 NAS에 올리기

1. PC/맥에서 https://github.com/hershey95/lifipedia 접속 →
   **Code → Download ZIP** (브랜치가 `claude/peaceful-pasteur-abbqgx` 인지 확인)
2. 압축 풀기
3. DSM **File Station** 열기 → `docker` 공유 폴더(없으면 새로 생성) 안에
   `lifipedia` 라는 폴더를 만들고, 압축 푼 내용물을 통째로 업로드
   (`Dockerfile`, `docker-compose.yml`, `src` 폴더 등이 `/docker/lifipedia/` 바로
   아래에 보여야 합니다)

### 2. 환경변수 파일 만들기

1. File Station에서 `/docker/lifipedia/.env.docker.example` 파일을 **복사** →
   같은 위치에 붙여넣고 이름을 **`.env`** 로 변경
   - File Station 기본 설정에서 점(`.`)으로 시작하는 파일이 안 보일 수 있습니다.
     File Station 우측 상단 톱니바퀴(설정) → **"숨김 파일 표시"** 체크
2. `.env` 파일을 텍스트 편집기로 열어서(File Station에서 우클릭 → 열기, 또는
   PC로 내려받아 메모장으로 편집 후 다시 업로드) 아래 두 값을 채우기:
   - `NEXTAUTH_URL=http://<NAS의 IP>:3000` (제어판 → 네트워크에서 NAS IP 확인 가능)
   - `NEXTAUTH_SECRET=<임의의 긴 문자열>` — PC 터미널이 있다면
     `openssl rand -base64 32` 로 생성. 없다면 아무 랜덤 문자열 32자 이상이면 충분

### 3. Container Manager에서 프로젝트 만들기

1. Container Manager 실행 → 왼쪽 메뉴 **프로젝트(Project)** → **생성(Create)**
2. **프로젝트 이름**: `lifipedia`
3. **경로**: 아까 업로드한 `/docker/lifipedia` 폴더 선택
   (Container Manager가 그 폴더의 `docker-compose.yml`을 자동으로 인식합니다)
4. **소스**: "기존 docker-compose.yml 사용(Use existing docker-compose.yml)" 선택
5. 다음으로 진행 → 내용 확인 → **완료**

빌드가 시작됩니다 (Node.js 빌드 과정이 포함되어 있어 NAS 사양에 따라 5~15분
정도 걸릴 수 있습니다). **프로젝트 → lifipedia → 컨테이너** 탭에서 `app`,
`db`, `migrate` 세 컨테이너의 상태를 볼 수 있고, `migrate`는 할 일을 마치면
자동으로 "종료됨" 상태가 되는 게 정상입니다(에러 아님).

### 4. 접속 확인

브라우저에서 `http://<NAS의 IP>:3000` 접속. 홈 화면이 뜨면 성공입니다.

### 5. (선택) 샘플 데이터 넣기

Container Manager → 프로젝트 → lifipedia → **동작(Action) → 셸 열기**는
개별 컨테이너 진입만 지원하므로, 샘플 데이터는 SSH로 아래 명령을 한 번
실행하는 것이 가장 간단합니다 (방법 B의 1번처럼 SSH를 켠 뒤):

```bash
cd /volume1/docker/lifipedia
docker compose --profile seed run --rm seed
```

---

## 방법 B — SSH로 하기 (익숙하신 분)

1. **제어판 → 터미널 및 SNMP → SSH 서비스 활성화**
2. PC에서 SSH 접속 후:
   ```bash
   cd /volume1/docker   # 원하는 공유 폴더 경로로
   git clone https://github.com/hershey95/lifipedia
   cd lifipedia
   git checkout claude/peaceful-pasteur-abbqgx
   cp .env.docker.example .env
   nano .env   # NEXTAUTH_URL, NEXTAUTH_SECRET 채우기
   sudo docker compose up -d --build
   ```
3. `http://<NAS의 IP>:3000` 접속

이후 코드를 업데이트하고 싶으면:
```bash
cd /volume1/docker/lifipedia
git pull
sudo docker compose up -d --build
```

---

## 자주 쓰는 명령 (SSH)

```bash
sudo docker compose logs -f app          # 앱 로그 보기
sudo docker compose down                  # 중지 (DB 데이터는 유지됨)
sudo docker compose down -v               # 중지 + DB 데이터까지 완전 삭제
sudo docker compose up -d --build         # 코드 수정 후 재빌드/재기동
sudo docker compose exec db psql -U lifipedia   # DB 직접 접속
```

GUI로만 하고 싶다면 Container Manager → 프로젝트 → lifipedia 화면에서
**중지/시작/재구축(Rebuild)** 버튼으로 대부분 대응됩니다.

---

## 월간/연간 랭킹 스냅샷 자동화 — 시놀로지 작업 스케줄러

이 앱은 매달 1일 / 매년 1월 1일에 순위를 아카이브로 박제하는 배치 API가 있습니다.
**제어판 → 작업 스케줄러(Task Scheduler)** 에서 등록하세요.

1. **생성(Create) → 예약된 작업(Scheduled Task) → 사용자 정의 스크립트**
2. **일반** 탭: 작업 이름 예) `lifipedia-monthly-snapshot`, 사용자는 `root`
3. **일정** 탭: 매월 실행, 1일, 원하는 시각(예: 00시 10분)
4. **작업 설정** 탭 → 사용자 정의 스크립트에 입력:
   ```bash
   curl -X POST -H "Authorization: Bearer <CRON_SECRET 값>" \
     "http://localhost:3000/api/cron/snapshot?periodType=MONTHLY"
   ```
5. 저장

같은 방식으로 두 개 더 등록:

- **연간 스냅샷** — 매년 1월 1일 00:30
  ```bash
  curl -X POST -H "Authorization: Bearer <CRON_SECRET 값>" \
    "http://localhost:3000/api/cron/snapshot?periodType=YEARLY"
  ```
- **테마 생애주기 정리** — 매일 새벽 3시
  ```bash
  curl -X POST -H "Authorization: Bearer <CRON_SECRET 값>" \
    "http://localhost:3000/api/cron/lifecycle"
  ```

`<CRON_SECRET 값>`은 `.env`에 설정한 `CRON_SECRET`과 똑같이 넣어야 합니다.
NAS 자체에서 실행하는 스크립트이므로 `localhost:3000`으로 충분합니다(NAS IP를
쓸 필요 없음).

---

## 외부(집 밖)에서 접속하고 싶다면

**제어판 → 로그인 포털 → 고급 → 역방향 프록시(Reverse Proxy)** 에서 HTTPS
도메인(예: `lifipedia.내도메인.com`)을 3000번 포트로 연결하는 것을 권장합니다.
이 경우 `.env`의 `NEXTAUTH_URL`을 그 HTTPS 주소로 바꿔야 합니다(로그인 콜백
계산에 쓰입니다). 라우터에서 포트를 직접 외부로 여는 방식은 보안상 권장하지
않습니다.

---

## 문제 해결

- **`app` 컨테이너가 계속 재시작됨** → Container Manager에서 `app` 로그 확인
  (프로젝트 → lifipedia → 컨테이너 → app → 로그). 대부분 `.env`의
  `NEXTAUTH_SECRET`이 비어 있거나 DB 연결 실패입니다.
- **`migrate` 컨테이너가 "종료됨(빨간불)"으로 멈춤** → 정상 종료가 아니라
  에러로 죽은 것입니다. 로그를 보면 대부분 DB 비밀번호 불일치입니다 —
  `.env`의 `POSTGRES_PASSWORD`를 나중에 바꿨다면, `db` 컨테이너를 최초 생성할
  때만 비밀번호가 적용되므로 프로젝트를 **정지 → 볼륨 삭제 옵션 체크 → 다시 빌드**
  해야 합니다.
- **File Station에 `.env.docker.example`이 안 보임** → 숨김 파일 표시가 꺼져
  있을 수 있습니다. File Station 우측 상단 톱니바퀴 → 숨김 파일 표시.
- **NAS가 오래되어 빌드가 너무 느림/멈춤** → Node.js 빌드는 메모리를 꽤 씁니다.
  RAM이 2GB 이하인 구형 모델이면, 더 강력한 PC/맥에서
  `docker build -t lifipedia .` 로 이미지를 미리 만든 뒤
  `docker save lifipedia | gzip > lifipedia.tar.gz` 로 내보내고, NAS에서
  Container Manager → 레지스트리 → **이미지 가져오기(Import)** 로 불러와
  실행하는 방법도 있습니다.
- **3000번 포트가 이미 다른 앱(예: 다른 웹 서비스)에서 쓰이고 있음** →
  `.env`의 `APP_PORT` 값을 `8080` 등 안 쓰는 포트로 바꾸고 다시 빌드하세요.
