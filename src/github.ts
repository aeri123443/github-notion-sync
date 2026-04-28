export async function getProjectDeadline(issueNodeId: string) {
  const query = `
    query($issueId: ID!) {
      node(id: $issueId) {
        ... on Issue {
          projectItems(first: 10) {
            nodes {
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { issueId: issueNodeId },
    }),
  });
  console.log(res);

  const json = await res.json();

  const items = json.data.node.projectItems.nodes;

  for (const item of items) {
    const deadline = item.fieldValues.nodes.find(
      (fieldValue: any) =>
        fieldValue.field?.name === "Deadline" ||
      fieldValue.field?.name === "deadline" ||
        fieldValue.field?.name === "마감일",
    );

    if (deadline?.date) return deadline.date;
  }

  return null;
};
