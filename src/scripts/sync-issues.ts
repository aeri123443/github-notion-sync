import "dotenv/config";
import { findNotionPageByIssueId, createNotionIssuePage, updateNotionIssuePage } from "../notion.js";
import { getProjectDeadline } from "../github.js";

const OWNER = process.env.OWNER;
const REPO = process.env.REPO;

async function fetchAllIssues() {
  let page = 1;
  const allIssues: any[] = [];

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );
    console.log(res)
    const data = await res.json();
    console.log(data)

    if (data.length === 0) break;

    allIssues.push(...data);
    page++;
  }

  return allIssues;
}

async function run() {
  const issues = await fetchAllIssues();

  console.log(`총 ${issues.length}개 이슈 가져옴.`);

  for (const issue of issues) {
    // PR 제외 (issue만 가져오기)
    if (issue.pull_request) continue;

    console.log(`\n→ ${issue.title} | issue.id`);

    // GitHub Projects에서 deadline 가져오기
    const deadline = await getProjectDeadline(issue.node_id);
    
    // 기존 Notion 페이지(레코드) 존재 여부 확인
    // 있으면 업데이트하고, 없으면 새로 생성
    const existingPage = await findNotionPageByIssueId(issue.id);
    
    const payload = {
      action: issue.state === "closed" ? "closed" : "opened",
      issue,
      repository: {
        name: `${REPO}`,
        full_name: `${OWNER}/${REPO}`,
      },
    };

    if (existingPage) {
        await updateNotionIssuePage(existingPage.id, payload, deadline);
    } else {
        await createNotionIssuePage(payload, deadline);
    }
  };

  console.log("완료");
}

run();
