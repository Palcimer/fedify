import { entries, map, pipe, toArray } from "@fxts/core";
import { merge } from "../../utils.ts";
import { PACKAGE_VERSION } from "../lib.ts";
import type { InitCommandData, PackageManager } from "../types.ts";

type Deps = Record<string, string>;

/**
 * Gathers all dependencies required for the project based on the initializer,
 * key-value store, and message queue configurations.
 *
 * @param data - Web Framework initializer, key-value store and message queue descriptions
 * @returns A record of dependencies with their versions
 */
export const getDependencies = (
  { initializer, kv, mq }: InitCommandData,
): Deps =>
  pipe(
    {
      "@fedify/fedify": PACKAGE_VERSION,
      "@logtape/logtape": "^1.1.0",
    },
    merge(initializer.dependencies),
    merge(kv.dependencies),
    merge(mq.dependencies),
  );

/** Gathers all devDependencies required for the project based on the initializer,
 * key-value store, and message queue configurations, including Biome for linting/formatting.
 *
 * @param data - Web Framework initializer, key-value store and message queue descriptions
 * @returns A record of devDependencies with their versions
 */
export const getDevDependencies = (
  { initializer, kv, mq }: InitCommandData,
): Deps =>
  pipe(
    {
      "@biomejs/biome": "^2.2.4",
    },
    merge(initializer.devDependencies),
    merge(kv.devDependencies),
    merge(mq.devDependencies),
  );

/**
 * Generates the command-line arguments needed to add dependencies or devDependencies
 * using the specified package manager.
 * If it is devDependencies, the '-D' flag is included.
 *
 * @param param0 - Object containing the package manager and a boolean indicating if dev dependencies are to be added
 * @yields The command-line arguments as strings
 */
export function* getAddDepsArgs<
  T extends { packageManager: PackageManager; dev?: boolean },
>({ packageManager, dev = false }: T): Generator<string> {
  yield packageManager;
  yield "add";
  if (dev) yield "-D";
}

/**
 * Joins package names with their versions for installation commands.
 * For Deno, it prefixes packages with 'jsr:' unless they already start with 'npm:'.
 *
 * @param data - Package manager and dependencies to be joined with versions
 * @returns `${registry}:${package}@${version}`[] for deno or `${package}@${version}`[] for others
 */
export const joinDepsVer = <
  T extends { packageManager: PackageManager; dependencies: Deps },
>({ packageManager: pm, dependencies }: T): string[] =>
  pipe(
    dependencies,
    entries,
    map(([name, version]) =>
      `${getPackageName(pm, name)}@${getPackageVersion(pm, version)}`
    ),
    toArray,
  );

const getPackageName = (pm: PackageManager, name: string) =>
  pm !== "deno"
    ? name
    : name.startsWith("npm:")
    ? name.substring(4)
    : !name.startsWith("npm:")
    ? `jsr:${name}`
    : name;

const getPackageVersion = (pm: PackageManager, version: string) =>
  pm !== "deno" && version.includes("+")
    ? version.substring(0, version.indexOf("+"))
    : version;
