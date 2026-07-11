#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./init";
import { doctor } from "./doctor";

// ============================================================
// mixlab-oidc-next CLI
//
// 用法：
//   npx mixlab-oidc-next init [--force]    # scaffold 文件
//   npx mixlab-oidc-next doctor            # 体检 env vars
//   npx mixlab-oidc-next --version         # 看版本
// ============================================================

const program = new Command();

program
  .name("mixlab-oidc-next")
  .description("MixLab OIDC SDK CLI for Next.js")
  .version("0.1.0");

program
  .command("init")
  .description("Scaffold auth.ts + handlers + proxy.ts in your Next.js project")
  .option("--force", "Overwrite existing files", false)
  .action((options: { force?: boolean }) => init({ force: options.force }));

program
  .command("doctor")
  .description("Validate environment variables and config")
  .action(doctor);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});