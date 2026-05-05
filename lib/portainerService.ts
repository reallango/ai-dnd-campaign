// Portainer service module
// Handles stack discovery, branch management, and updates

import { detectPortainerApiUrl, getPortainerUrl } from './portainerDiscovery';

const GITHUB_OWNER = 'reallango';
const GITHUB_REPO = 'ai-dnd-campaign';

// In-memory storage for discovered stack info
let stackInfo: {
  stackId: number | null;
  currentBranch: string;
  webhookUrl: string | null;
  repositoryUrl: string;
  pendingBranch: string | null;
} = {
  stackId: null,
  currentBranch: 'stable',
  webhookUrl: null,
  repositoryUrl: '',
  pendingBranch: null,
};

interface PortainerStack {
  Id: number;
  Name: string;
  RepositoryURL: string;
  RepositoryReferenceName: string;
  AutoUpdate: {
    Webhook: string;
  } | null;
}

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
}

// Validate branch name
function isValidBranch(branch: string): boolean {
  const validBranches = ['main', 'stable', 'dev'];
  return validBranches.includes(branch.toLowerCase());
}

// Get Portainer base URL (uses auto-detection)
async function getBaseUrl(): Promise<string> {
  return detectPortainerApiUrl();
}

// Get Portainer config from env and detection
async function getPortainerConfig() {
  const url = await getBaseUrl();
  const token = process.env.PORTAINER_API_TOKEN;
  const stackName = process.env.PORTAINER_STACK_NAME;

  if (!token) {
    throw new Error('Portainer not configured. Set PORTAINER_API_TOKEN.');
  }

  return { url, token, stackName };
}

// Discover the stack by matching repository URL or stack name
export async function discoverStack(): Promise<{
  stackId: number;
  currentBranch: string;
  webhookUrl: string | null;
  repositoryUrl: string;
}> {
  const { url, token, stackName } = await getPortainerConfig();

  // Fetch all stacks
  const response = await fetch(`${url}/api/stacks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch stacks: ${errorText}`);
  }

  const stacks = (await response.json()) as PortainerStack[];
  const repoUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;

  // Find matching stack
  let matchingStack: PortainerStack | undefined;

  if (stackName) {
    matchingStack = stacks.find(s => s.Name === stackName);
  }

  if (!matchingStack) {
    matchingStack = stacks.find(
      s => s.RepositoryURL === repoUrl || s.RepositoryURL === `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`
    );
  }

  if (!matchingStack) {
    throw new Error(`Stack not found. Trying to match: ${stackName || repoUrl}`);
  }

  const currentBranch = matchingStack.RepositoryReferenceName || 'stable';
  const webhookUrl = matchingStack.AutoUpdate?.Webhook || null;

  // Store in memory
  stackInfo = {
    stackId: matchingStack.Id,
    currentBranch,
    webhookUrl,
    repositoryUrl: matchingStack.RepositoryURL,
    pendingBranch: null,
  };

  return {
    stackId: matchingStack.Id,
    currentBranch,
    webhookUrl,
    repositoryUrl: matchingStack.RepositoryURL,
  };
}

// Get available branches from GitHub
export async function getBranches(): Promise<{
  currentBranch: string;
  pendingBranch: string | null;
  availableBranches: string[];
  versions: Record<string, string>;
}> {
  const { url, token } = await getPortainerConfig();
  const repoUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

  // Fetch branches from GitHub
  const ghResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/branches`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ai-dnd-campaign',
      },
    }
  );

  if (!ghResponse.ok) {
    throw new Error('Failed to fetch branches from GitHub');
  }

  const ghBranches = (await ghResponse.json()) as GitHubBranch[];
  const branches = ghBranches
    .map(b => b.name)
    .filter(b => isValidBranch(b));

  // Build version map
  const versions: Record<string, string> = {};
  for (const branch of branches) {
    versions[branch] = branch; // We'll show branch name, not hash for now
  }

  // Ensure current branch is tracked
  if (stackInfo.stackId) {
    if (!branches.includes(stackInfo.currentBranch)) {
      branches.push(stackInfo.currentBranch);
    }
    // Include pending branch if set
    if (stackInfo.pendingBranch && !branches.includes(stackInfo.pendingBranch)) {
      branches.push(stackInfo.pendingBranch);
    }
  }

  return {
    currentBranch: stackInfo.currentBranch || 'stable',
    pendingBranch: stackInfo.pendingBranch,
    availableBranches: branches,
    versions,
  };
}

// Set pending branch (does not redeploy)
export function setPendingBranch(branch: string): { pendingBranch: string } {
  if (!isValidBranch(branch)) {
    throw new Error(`Invalid branch: ${branch}. Use: stable, dev`);
  }

  if (!stackInfo.stackId) {
    throw new Error('Stack not discovered. Call discoverStack() first.');
  }

  stackInfo.pendingBranch = branch;

  return { pendingBranch: branch };
}

// Apply pending branch and trigger redeploy
export async function applyUpdate(): Promise<{
  success: boolean;
  message: string;
}> {
  const { url, token } = await getPortainerConfig();

  if (!stackInfo.stackId) {
    throw new Error('Stack not discovered. Call discoverStack() first.');
  }

  if (!stackInfo.pendingBranch) {
    throw new Error('No pending branch set. Call setPendingBranch() first.');
  }

  const branch = stackInfo.pendingBranch;

  // Step 1: Update stack repository reference
  const updateResponse = await fetch(`${url}/api/stacks/${stackInfo.stackId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      RepositoryReferenceName: branch,
    }),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to update stack: ${errorText}`);
  }

  // Step 2: Trigger webhook if available
  let webhookSuccess = true;
  if (stackInfo.webhookUrl) {
    // First try direct webhook
    try {
      const webhookResponse = await fetch(stackInfo.webhookUrl, {
        method: 'POST',
      });

      webhookSuccess = webhookResponse.ok;
    } catch {
      // Fallback: use Portainer's update endpoint
      try {
        const updateStackResponse = await fetch(
          `${url}/api/stacks/${stackInfo.stackId}/upstack`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        webhookSuccess = updateStackResponse.ok;
      } catch (e) {
        console.error('Webhook trigger failed:', e);
        webhookSuccess = false;
      }
    }
  } else {
    // No webhook, trigger via Portainer
    const redeployResponse = await fetch(
      `${url}/api/stacks/${stackInfo.stackId}/upstack`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!redeployResponse.ok) {
      const errorText = await redeployResponse.text();
      console.error('Redeploy error:', errorText);
    }
  }

  // Update current branch
  stackInfo.currentBranch = branch;
  stackInfo.pendingBranch = null;

  return {
    success: webhookSuccess || stackInfo.webhookUrl === null,
    message: `Switched to ${branch}. Redeploy triggered.`,
  };
}

// Get current stack info
export function getStackInfo() {
  return {
    stackId: stackInfo.stackId,
    currentBranch: stackInfo.currentBranch,
    pendingBranch: stackInfo.pendingBranch,
    webhookUrl: stackInfo.webhookUrl,
    apiUrl: getPortainerUrl(),
  };
}

// Check if Portainer API is available
export function isPortainerApiAvailable(): boolean {
  return getPortainerUrl() !== null;
}

// Initialize on startup
export async function initPortainer() {
  try {
    const stack = await discoverStack();
    console.log(`[Portainer] Discovered stack ${stack.stackId} on branch ${stack.currentBranch}`);
    if (stack.webhookUrl) {
      console.log(`[Portainer] Webhook enabled`);
    }
    return stack;
  } catch (error) {
    console.error('[Portainer] Failed to discover stack:', error);
    return null;
  }
}