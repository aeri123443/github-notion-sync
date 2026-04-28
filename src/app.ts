import "dotenv/config";
import express from "express";
import crypto from "crypto";
import {
  createNotionIssuePage,
  findNotionPageByIssueId,
  updateNotionIssuePage,
} from "./notion.js";
import { getProjectDeadline } from "./github.js";

const app = express();

// 요청 데이터 확인 (디버깅 용)
app.use((req, _res, next) => {
  console.log("\n[REQUEST]", req.method, req.originalUrl);
  console.log("user-agent:", req.header("user-agent"));
  next();
});

// GitHub signature 검증을 위해 raw body 저장
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

// GitHub webhook 요청이 진짜인지 검증
function verifyGithubSignature(req: express.Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET!;
  const signature = req.header("x-hub-signature-256");

  if (!signature) return false;

  // HMAC SHA256으로 서명 생성
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update((req as any).rawBody).digest("hex")}`;

  // timing-safe 비교 (보안)
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// 헬스 체크
app.get("/", (_req, res) => {
  res.send("GitHub Notion Sync Server");
});

// GitHub webhook endpoint
app.post("/webhooks/github", async (req, res) => {
  console.log('post /webhooks/github...')
  try {
    // 보안 검증
    if (!verifyGithubSignature(req)) {

      console.log('401: Invalid signature');
      return res.status(401).send("Invalid signature");
    }

    const event = req.header("x-github-event");

    // Issues 이벤트만 처리
    if (event !== "issues") {

      console.log('200: Ignored event');
      return res.status(200).send("Ignored event");
    }

    const payload = req.body;

    // 처리할 action만 필터링
    const allowedActions = [
      "opened",
      "edited",
      "assigned",
      "unassigned",
      "labeled",
      "unlabeled",
      "closed",
      "reopened",
    ];

    if (!allowedActions.includes(payload.action)) {
      return res.status(200).send("Ignored action");
    }

    // GitHub Projects에서 deadline 가져오기
    const deadline = await getProjectDeadline(payload.issue.node_id);

    // 기존 Notion 페이지(레코드) 존재 여부 확인
    // 있으면 업데이트하고, 없으면 새로 생성
    const existingPage = await findNotionPageByIssueId(payload.issue.id);
    
    if (existingPage) {
      await updateNotionIssuePage(existingPage.id, payload, deadline);
    } else {
      await createNotionIssuePage(payload, deadline);
    }

    console.log("200: Synced");
    return res.status(200).send("Synced");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal server error");
  }
});

const port = Number(process.env.PORT ?? 3000);

// 서버 실행
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
