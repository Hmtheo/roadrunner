/**
 * seed-linear.mjs
 * Creates crypto-agent-system projects and issues in Linear
 * via the Linear GraphQL API directly.
 *
 * Usage: node seed-linear.mjs
 */

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.error("Missing LINEAR_API_KEY environment variable.");
  process.exit(1);
}

const SEED_DATA = [
  {
    name: "Core Agents",
    description: "Monitor, Analysis, and Advisory AI agents — the decision-making backbone of the system.",
    color: "#6366f1",
    issues: [
      { title: "Improve monitor agent with multi-source price data", priority: 2 },
      { title: "Add signal confidence scoring to advisory agent", priority: 2 },
      { title: "Build agent orchestration / coordinator layer", priority: 1 },
      { title: "Add error recovery and retry logic to all agents", priority: 2 },
      { title: "Add structured logging across all agents", priority: 3 },
      { title: "Document agent architecture and data flow", priority: 3 },
    ],
  },
  {
    name: "Trading Engine",
    description: "Paper trading simulation, portfolio management, and trade execution logic.",
    color: "#10b981",
    issues: [
      { title: "Add position sizing logic based on portfolio value", priority: 2 },
      { title: "Implement stop-loss and take-profit rules", priority: 1 },
      { title: "Build trade history export (CSV / JSON)", priority: 3 },
      { title: "Add P&L reporting with daily / weekly breakdown", priority: 2 },
      { title: "Validate paper trading engine edge cases", priority: 2 },
      { title: "Add support for multiple simultaneous positions", priority: 3 },
    ],
  },
  {
    name: "Data & Persistence",
    description: "Database layer, external market data APIs, caching, and historical data.",
    color: "#f59e0b",
    issues: [
      { title: "Integrate Binance market data API", priority: 1 },
      { title: "Add Coinbase API as secondary data source", priority: 3 },
      { title: "Implement response caching layer (5-min TTL)", priority: 2 },
      { title: "Add historical price backfill to database", priority: 2 },
      { title: "Define database schema migration strategy", priority: 2 },
      { title: "Add database connection pooling", priority: 3 },
      { title: "Audit and document required environment variables", priority: 2 },
    ],
  },
  {
    name: "Frontend Dashboard",
    description: "Web UI for portfolio overview, live prices, trade history, and advisory feed.",
    color: "#8b5cf6",
    issues: [
      { title: "Build portfolio overview page", priority: 1 },
      { title: "Add live price ticker component", priority: 1 },
      { title: "Add trade history table with filters", priority: 2 },
      { title: "Build advisory feed / signal display", priority: 2 },
      { title: "Add P&L chart (Chart.js or similar)", priority: 2 },
      { title: "Make dashboard mobile responsive", priority: 3 },
      { title: "Add dark mode", priority: 4 },
    ],
  },
  {
    name: "Infrastructure",
    description: "CI/CD, Railway deployment, health checks, and environment configuration.",
    color: "#ef4444",
    issues: [
      { title: "Set up GitHub Actions CI pipeline", priority: 2 },
      { title: "Add health check endpoint (/health)", priority: 2 },
      { title: "Add structured logging with log levels", priority: 2 },
      { title: "Document Railway.app deployment steps in README", priority: 3 },
      { title: "Add rate limiting to API endpoints", priority: 2 },
      { title: "Configure error alerting on crash", priority: 3 },
    ],
  },
  {
    name: "Testing & Quality",
    description: "Unit tests, integration tests, backtesting harness, and coverage reporting.",
    color: "#06b6d4",
    issues: [
      { title: "Set up pytest with coverage reporting", priority: 1 },
      { title: "Write unit tests for paper trading engine", priority: 1 },
      { title: "Write unit tests for analysis agent", priority: 2 },
      { title: "Write unit tests for advisory agent", priority: 2 },
      { title: "Build backtesting harness against historical data", priority: 2 },
      { title: "Add integration tests for API endpoints", priority: 2 },
      { title: "Enforce 80% test coverage in CI", priority: 3 },
    ],
  },
];

async function linearQuery(query, variables = {}) {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
  }
  return data.data;
}

async function getTeamId() {
  const data = await linearQuery(`{ teams { nodes { id name } } }`);
  const teams = data.teams.nodes;
  if (!teams.length) throw new Error("No teams found in Linear workspace.");
  console.log(`Using team: ${teams[0].name} (${teams[0].id})`);
  return teams[0].id;
}

async function createProject(teamId, name, description, color) {
  const data = await linearQuery(
    `mutation CreateProject($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project { id name }
      }
    }`,
    { input: { name, description, color, teamIds: [teamId] } }
  );
  return data.projectCreate.project.id;
}

async function createIssue(teamId, projectId, title, priority) {
  await linearQuery(
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id title }
      }
    }`,
    { input: { title, teamId, projectId, priority } }
  );
}

async function main() {
  console.log("=== Linear Seeder: crypto-agent-system ===\n");

  const teamId = await getTeamId();
  let totalIssues = 0;

  for (const project of SEED_DATA) {
    console.log(`\nCreating project: ${project.name}...`);
    const projectId = await createProject(teamId, project.name, project.description, project.color);
    console.log(`  ✓ Project created (${projectId})`);

    for (const issue of project.issues) {
      await createIssue(teamId, projectId, issue.title, issue.priority);
      console.log(`  ✓ ${issue.title}`);
      totalIssues++;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Created ${SEED_DATA.length} projects and ${totalIssues} issues.`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
