import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import * as p from '@clack/prompts';
import { downloadTemplate } from 'giget';
import pc from 'picocolors';
import {
  buildEnvValues,
  fallbackEnvExample,
  generateSecrets,
  renderEnvFile,
  type WizardValues,
} from './env.js';
import {
  commandExists,
  detectPackageManager,
  run,
  runScriptArgs,
  type PackageManager,
} from './system.js';

const DEFAULT_TEMPLATE = 'github:morningstar620/Zodyk#main';
const VERSION = '0.1.0';

interface CliOptions {
  dir?: string;
  template: string;
  install: boolean;
  seed: boolean;
  startDocker: boolean;
  packageManager?: PackageManager;
  yes: boolean;
}

function printHelp(): void {
  console.log(`
${pc.bold('create-zodyk')} — scaffold a self-hosted Zodyk project

${pc.bold('Usage')}
  npm create zodyk@latest ${pc.dim('<project-directory> [options]')}
  npx create-zodyk ${pc.dim('<project-directory> [options]')}

${pc.bold('Options')}
  --template <src>   Template source for giget (default: ${DEFAULT_TEMPLATE})
  --pm <manager>     Package manager: pnpm | npm | yarn | bun
  --no-install       Skip installing dependencies
  --start-docker     Start MongoDB + Redis via docker compose after scaffolding
  --seed             Seed the database (roles, admin, theme) after install
  -y, --yes          Accept defaults, run non-interactively
  -h, --help         Show this help
  -v, --version      Show version
`);
}

function parseArgs(argv: string[]): CliOptions | { help: true } | { version: true } {
  const opts: CliOptions = {
    template: DEFAULT_TEMPLATE,
    install: true,
    seed: false,
    startDocker: false,
    yes: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case '-h':
      case '--help':
        return { help: true };
      case '-v':
      case '--version':
        return { version: true };
      case '--template':
        opts.template = argv[++i] ?? DEFAULT_TEMPLATE;
        break;
      case '--pm':
        opts.packageManager = argv[++i] as PackageManager;
        break;
      case '--install':
        opts.install = true;
        break;
      case '--no-install':
        opts.install = false;
        break;
      case '--seed':
        opts.seed = true;
        break;
      case '--no-seed':
        opts.seed = false;
        break;
      case '--start-docker':
        opts.startDocker = true;
        break;
      case '-y':
      case '--yes':
        opts.yes = true;
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (!opts.dir) opts.dir = arg;
        break;
    }
  }

  return opts;
}

function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}

function bail(): never {
  p.cancel('Setup cancelled.');
  process.exit(0);
}

function validateMongoUri(value: string): string | undefined {
  if (!/^mongodb(\+srv)?:\/\//.test(value.trim())) {
    return 'Must start with mongodb:// or mongodb+srv://';
  }
  return undefined;
}

function validateEmail(value: string): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return 'Enter a valid email address';
  }
  return undefined;
}

async function directoryIsUsable(dir: string): Promise<boolean> {
  if (!existsSync(dir)) return true;
  const entries = await readdir(dir);
  return entries.length === 0;
}

async function collectWizard(opts: CliOptions, projectDir: string): Promise<WizardValues> {
  if (opts.yes) {
    return {
      mongodbUri: 'mongodb://localhost:27017/zodyk',
      adminEmail: 'admin@zodyk.local',
      adminPassword: 'Admin@12345',
      adminName: 'Super Admin',
      allowRegistration: false,
      redisUrl: 'redis://localhost:6379',
    };
  }

  p.log.step(pc.bold('Required configuration'));

  const mongodbUri = await p.text({
    message: 'MongoDB connection URI',
    placeholder: 'mongodb://localhost:27017/zodyk',
    defaultValue: 'mongodb://localhost:27017/zodyk',
    initialValue: 'mongodb://localhost:27017/zodyk',
    validate: validateMongoUri,
  });
  if (isCancel(mongodbUri)) bail();

  const adminEmail = await p.text({
    message: 'Admin email address',
    placeholder: 'admin@example.com',
    validate: validateEmail,
  });
  if (isCancel(adminEmail)) bail();

  const adminPassword = await p.password({
    message: 'Admin password (min 8 characters)',
    validate: (v) => (v.length < 8 ? 'Password must be at least 8 characters' : undefined),
  });
  if (isCancel(adminPassword)) bail();

  const adminName = await p.text({
    message: 'Admin display name',
    defaultValue: 'Super Admin',
    initialValue: 'Super Admin',
  });
  if (isCancel(adminName)) bail();

  const allowRegistration = await p.confirm({
    message: 'Allow public self-registration?',
    initialValue: false,
  });
  if (isCancel(allowRegistration)) bail();

  const optionalGroups = await p.multiselect({
    message: 'Configure optional services now? (space to select, enter to continue)',
    required: false,
    options: [
      { value: 'redis', label: 'Redis (cache / queues)', hint: 'recommended' },
      { value: 'r2', label: 'Cloudflare R2 (media + theme storage)' },
      { value: 'smtp', label: 'SMTP email (magic links, password reset)' },
    ],
  });
  if (isCancel(optionalGroups)) bail();

  const selected = new Set(optionalGroups as string[]);
  const values: WizardValues = {
    mongodbUri: (mongodbUri as string).trim(),
    adminEmail: (adminEmail as string).trim().toLowerCase(),
    adminPassword: adminPassword as string,
    adminName: (adminName as string).trim() || 'Super Admin',
    allowRegistration: allowRegistration as boolean,
  };

  if (selected.has('redis')) {
    const redisUrl = await p.text({
      message: 'Redis URL',
      defaultValue: 'redis://localhost:6379',
      initialValue: 'redis://localhost:6379',
    });
    if (isCancel(redisUrl)) bail();
    values.redisUrl = (redisUrl as string).trim();
  } else {
    values.redisUrl = 'redis://localhost:6379';
  }

  if (selected.has('r2')) {
    const accountId = await p.text({ message: 'R2 account ID' });
    if (isCancel(accountId)) bail();
    const accessKeyId = await p.text({ message: 'R2 access key ID' });
    if (isCancel(accessKeyId)) bail();
    const secretAccessKey = await p.password({ message: 'R2 secret access key' });
    if (isCancel(secretAccessKey)) bail();
    const bucket = await p.text({ message: 'R2 bucket name' });
    if (isCancel(bucket)) bail();
    const publicUrl = await p.text({ message: 'R2 public URL (CDN/custom domain)' });
    if (isCancel(publicUrl)) bail();
    const endpoint = await p.text({ message: 'R2 S3 endpoint' });
    if (isCancel(endpoint)) bail();
    values.r2 = {
      accountId: (accountId as string).trim(),
      accessKeyId: (accessKeyId as string).trim(),
      secretAccessKey: (secretAccessKey as string).trim(),
      bucket: (bucket as string).trim(),
      publicUrl: (publicUrl as string).trim(),
      endpoint: (endpoint as string).trim(),
    };
  }

  if (selected.has('smtp')) {
    const host = await p.text({ message: 'SMTP host' });
    if (isCancel(host)) bail();
    const port = await p.text({ message: 'SMTP port', defaultValue: '587', initialValue: '587' });
    if (isCancel(port)) bail();
    const user = await p.text({ message: 'SMTP username' });
    if (isCancel(user)) bail();
    const password = await p.password({ message: 'SMTP password' });
    if (isCancel(password)) bail();
    const from = await p.text({
      message: 'From address',
      defaultValue: 'noreply@zodyk.local',
      initialValue: 'noreply@zodyk.local',
    });
    if (isCancel(from)) bail();
    values.smtp = {
      host: (host as string).trim(),
      port: (port as string).trim(),
      user: (user as string).trim(),
      password: password as string,
      from: (from as string).trim(),
    };
  }

  void projectDir;
  return values;
}

async function writeEnvFile(projectDir: string, values: WizardValues): Promise<void> {
  const examplePath = resolve(projectDir, '.env.example');
  let example: string;
  try {
    example = await readFile(examplePath, 'utf8');
  } catch {
    example = fallbackEnvExample();
  }

  const secrets = generateSecrets();
  const envValues = buildEnvValues(values, secrets);
  const contents = renderEnvFile(example, envValues);
  await writeFile(resolve(projectDir, '.env'), contents, 'utf8');
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if ('help' in parsed) {
    printHelp();
    return;
  }
  if ('version' in parsed) {
    console.log(VERSION);
    return;
  }

  const opts = parsed;

  console.clear();
  p.intro(`${pc.bgMagenta(pc.black(' create-zodyk '))} ${pc.dim(`v${VERSION}`)}`);

  let dir = opts.dir;
  if (!dir) {
    if (opts.yes) {
      dir = 'zodyk-app';
    } else {
      const answer = await p.text({
        message: 'Project directory',
        placeholder: 'my-zodyk-site',
        defaultValue: 'my-zodyk-site',
        initialValue: 'my-zodyk-site',
      });
      if (isCancel(answer)) bail();
      dir = (answer as string).trim();
    }
  }

  const projectDir = resolve(process.cwd(), dir);
  const projectName = basename(projectDir);

  if (!(await directoryIsUsable(projectDir))) {
    p.log.error(`Directory ${pc.cyan(dir)} already exists and is not empty.`);
    process.exit(1);
  }

  const values = await collectWizard(opts, projectDir);

  const pm = opts.packageManager ?? detectPackageManager();

  const downloadSpinner = p.spinner();
  downloadSpinner.start(`Downloading template from ${opts.template}`);
  try {
    await downloadTemplate(opts.template, {
      dir: projectDir,
      force: true,
    });
    downloadSpinner.stop('Template downloaded.');
  } catch (err) {
    downloadSpinner.stop('Failed to download template.');
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const envSpinner = p.spinner();
  envSpinner.start('Generating .env and encryption keys');
  await writeEnvFile(projectDir, values);
  envSpinner.stop('Wrote .env with generated AUTH_SECRET and ENCRYPTION_KEY.');

  if (opts.install) {
    const hasPm = await commandExists(pm);
    if (!hasPm) {
      p.log.warn(
        `${pc.yellow(pm)} was not found on your PATH. Skipping install. ` +
          `Install it, then run "${pm} install" inside ${projectName}.`,
      );
    } else {
      p.log.step(`Installing dependencies with ${pc.cyan(pm)}`);
      try {
        await run(pm, ['install'], { cwd: projectDir });
      } catch (err) {
        p.log.error(err instanceof Error ? err.message : String(err));
        p.log.warn(`You can retry manually: cd ${projectName} && ${pm} install`);
      }
    }
  }

  if (opts.startDocker) {
    const hasDocker = await commandExists('docker');
    if (!hasDocker) {
      p.log.warn('Docker not found. Skipping "docker compose up".');
    } else {
      p.log.step('Starting MongoDB + Redis via docker compose');
      try {
        await run(pm, runScriptArgs(pm, 'docker:up'), { cwd: projectDir });
      } catch (err) {
        p.log.error(err instanceof Error ? err.message : String(err));
      }
    }
  }

  if (opts.seed && opts.install) {
    p.log.step('Seeding database (roles, admin, default data)');
    try {
      await run(pm, runScriptArgs(pm, 'seed'), { cwd: projectDir });
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      p.log.warn(
        'Seeding failed. Ensure MongoDB is running (and R2 is configured for the ' +
          `default theme), then run "${pm} run seed" inside ${projectName}.`,
      );
    }
  }

  const steps: string[] = [`cd ${projectName}`];
  if (!opts.install) steps.push(`${pm} install`);
  if (!opts.startDocker) steps.push(`${pm} run docker:up   ${pc.dim('# start MongoDB + Redis')}`);
  if (!opts.seed) steps.push(`${pm} run seed        ${pc.dim('# create admin + default data')}`);
  steps.push(`${pm} run dev`);

  p.note(steps.join('\n'), 'Next steps');

  p.outro(
    `${pc.green('Done!')} Admin: ${pc.cyan('http://localhost:5001')}  •  ` +
      `Website: ${pc.cyan('http://localhost:5003')}\n` +
      `${pc.dim('Login:')} ${values.adminEmail}`,
  );
}

main().catch((err) => {
  p.log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
