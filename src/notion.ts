import { Client } from "@notionhq/client";
import { mapStatus, mapType } from "./mapper.js";

// Notion API 클라이언트 생성
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});
const databaseId = process.env.NOTION_DATABASE_ID!;

// GitHub webhook payload 타입 정의 (타입 안정성)
type GithubIssuePayload = {
  action: string;
  repository: {
    name: string;
    full_name: string;
  };
  issue: {
    id: number; // GitHub 내부 ID (고유값)
    number: number; // 이슈 번호 (#1, #2 이런거)
    title: string;
    html_url: string;
    state: string;
    labels: { name: string }[];
    assignee?: {
      login: string;
    } | null;
  };
};

// Notion DB에서 특정 GitHub Issue ID를 가진 페이지 찾기
export async function findNotionPageByIssueId(issueId: number) {
  const result = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Issue ID",
      number: {
        equals: issueId,
      },
    },
  });

  // 있으면 첫 번째 결과 반환
  return result.results[0];
}

// Notion에 새로운 이슈 페이지 생성
export async function createNotionIssuePage(payload: GithubIssuePayload, deadline?: string | null) {
  // label 이름만 추출
  const labelNames = payload.issue.labels.map((label) => label.name);

  return notion.pages.create({
    parent: {
      database_id: databaseId,
    },
    properties: {
      // 제목
      "작업": {
        title: [
          {
            text: {
              content: payload.issue.title,
            },
          },
        ],
      },

      // 진행 상태
      "진행 상태": {
        status: {
          name: mapStatus(payload.action, payload.issue.state),
        },
      },

      // GitHub Issue 고유 ID (중복 방지용)
      "Issue ID": {
        number: payload.issue.id,
      },

      "담당자": {
        rich_text: [
          {
            text: {
              content: payload.issue.assignee?.login ?? "",
            },
          },
        ],
      },

      "마감일": deadline
        ? { date: { start: deadline } }
        : { date: null },
    },
  });
}

// 기존 Notion 페이지 업데이트
export async function updateNotionIssuePage(pageId: string, payload: GithubIssuePayload, deadline?: string | null) {
  const labelNames = payload.issue.labels.map((label) => label.name);

  return notion.pages.update({
    page_id: pageId,
    properties: {
      "작업": {
        title: [
          {
            text: {
              content: payload.issue.title,
            },
          },
        ],
      },

      "진행 상태": {
        status: {
          name: mapStatus(payload.action, payload.issue.state),
        },
      },

      "담당자": {
        rich_text: [
          {
            text: {
              content: payload.issue.assignee?.login ?? "",
            },
          },
        ],
      },

      "마감일": deadline
        ? { date: { start: deadline } }
        : { date: null },

    },
  });
};
