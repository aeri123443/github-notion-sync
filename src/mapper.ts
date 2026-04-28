// GitHub Action과 issue 상태를 기반으로
// Notion의 Status 값으로 매핑
export function mapStatus(action: string, issueState: string) {
  if (action === "opened") return "시작 전";
  if (action === "closed") return "완료";
  if (action === "assigned") return "진행 중";

  return "진행 중";
}

// GitHub label을 기반으로 작업 유형 결정
export function mapType(labels: string[]) {
  if (labels.includes("bug")) return "Bug";
  if (labels.includes("refactor")) return "Refactor";
  if (labels.includes("docs")) return "Docs";
  if (labels.includes("chore")) return "Chore";

  // 기본값은 Feature
  return "Feature";
}
