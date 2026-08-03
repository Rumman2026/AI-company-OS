import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  dryRunRealPilotCall,
  executeRealPilotCall,
} from '../src/glm-lead-inquiry/real-pilot-runner';
import { hoaOrangeCountyRealPilotRequest } from '../src/glm-lead-inquiry/fixtures';

// Runnable entry point for the real, single-call GLM sandbox pilot
// (docs/cloud/GLM_SANDBOX_PILOT.md "Real Z.AI / GLM Sandbox Credential
// and Single-Call Pilot"). Defaults to a dry run (no network call, no
// credential required) unless BOTH a real credential is present AND
// --confirm-real-call is passed explicitly — two independent gates, not
// one, before any money is spent. Never logs the credential value.

// This file lives at packages/provider-adapters/scripts/ — repo root is
// three directories up. Resolved from the script's own location (not
// process.cwd()) because `pnpm --filter <pkg> run <script>` runs with
// cwd set to the package directory, not the repo root, which would
// otherwise cause a silent, wrong-path lookup for .env.local.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ENV_LOCAL_PATH = path.join(REPO_ROOT, '.env.local');

function tryLoadLocalEnvFile(): void {
  const loadEnvFile = (process as unknown as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
  if (typeof loadEnvFile !== 'function') {
    return;
  }
  try {
    loadEnvFile(ENV_LOCAL_PATH);
  } catch {
    // .env.local not present at the repo root — fine, the credential
    // may already be set as a real environment variable instead.
  }
}

async function main(): Promise<void> {
  tryLoadLocalEnvFile();
  const apiKey = process.env.ZAI_GLM_API_KEY;
  const confirmed = process.argv.includes('--confirm-real-call');

  if (!apiKey) {
    console.log(
      'No ZAI_GLM_API_KEY found in the environment. See docs/cloud/GLM_SANDBOX_PILOT.md ' +
        '"Credential checkpoint" for setup steps. Running a dry run only (no network call).',
    );
    console.log(JSON.stringify(dryRunRealPilotCall(hoaOrangeCountyRealPilotRequest), null, 2));
    return;
  }

  if (!confirmed) {
    console.log(
      'ZAI_GLM_API_KEY is present but --confirm-real-call was not passed. ' +
        'Running a dry run only — no network call made, credential not read.',
    );
    console.log(JSON.stringify(dryRunRealPilotCall(hoaOrangeCountyRealPilotRequest), null, 2));
    return;
  }

  console.log('Making exactly one real GLM API call for the pilot inquiry...');
  const report = await executeRealPilotCall(hoaOrangeCountyRealPilotRequest, apiKey);
  console.log(JSON.stringify(report, null, 2));
}

void main();
