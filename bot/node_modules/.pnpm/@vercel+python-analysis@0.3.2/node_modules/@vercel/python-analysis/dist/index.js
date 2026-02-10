// src/semantic/load.ts
import { readFile } from "fs/promises";
import { createRequire } from "module";
import { dirname, join } from "path";
var WASI_SHIM_PATH = "@bytecodealliance/preview2-shim/instantiation";
var WASM_MODULE_PATH = "#wasm/vercel_python_analysis.js";
var wasmInstance = null;
var wasmLoadPromise = null;
var wasmDir = null;
function getWasmDir() {
  if (wasmDir === null) {
    const require2 = createRequire(import.meta.url);
    const wasmModulePath = require2.resolve(WASM_MODULE_PATH);
    wasmDir = dirname(wasmModulePath);
  }
  return wasmDir;
}
async function getCoreModule(path4) {
  const wasmPath = join(getWasmDir(), path4);
  const wasmBytes = await readFile(wasmPath);
  return WebAssembly.compile(wasmBytes);
}
async function importWasmModule() {
  if (wasmInstance) {
    return wasmInstance;
  }
  if (!wasmLoadPromise) {
    wasmLoadPromise = (async () => {
      const wasiShimModule = await import(WASI_SHIM_PATH);
      const WASIShim = wasiShimModule.WASIShim;
      const wasmModule = await import(WASM_MODULE_PATH);
      const imports = new WASIShim().getImportObject();
      const instance = await wasmModule.instantiate(getCoreModule, imports);
      wasmInstance = instance;
      return instance;
    })();
  }
  return wasmLoadPromise;
}

// src/semantic/entrypoints.ts
async function containsAppOrHandler(source) {
  if (!source.includes("app") && !source.includes("handler") && !source.includes("Handler")) {
    return false;
  }
  const mod = await importWasmModule();
  return mod.containsAppOrHandler(source);
}

// src/manifest/package.ts
import path3 from "path";
import { match as minimatchMatch } from "minimatch";

// src/util/config.ts
import path2 from "path";
import yaml from "js-yaml";
import toml from "smol-toml";

// src/util/fs.ts
import path from "path";
import { readFile as readFile2 } from "fs-extra";

// src/util/error.ts
import util from "util";
var isErrnoException = (error, code = void 0) => {
  return util.types.isNativeError(error) && "code" in error && (code === void 0 || error.code === code);
};
var PythonAnalysisError = class extends Error {
  constructor({ message, code, path: path4, link, action }) {
    super(message);
    this.hideStackTrace = true;
    this.name = "PythonAnalysisError";
    this.code = code;
    this.path = path4;
    this.link = link;
    this.action = action;
  }
};

// src/util/fs.ts
async function readFileIfExists(file) {
  try {
    return await readFile2(file);
  } catch (error) {
    if (!isErrnoException(error, "ENOENT")) {
      throw error;
    }
  }
  return null;
}
async function readFileTextIfExists(file, encoding = "utf8") {
  const data = await readFileIfExists(file);
  if (data == null) {
    return null;
  } else {
    return data.toString(encoding);
  }
}
function normalizePath(p) {
  let np = path.normalize(p);
  if (np.endsWith(path.sep)) {
    np = np.slice(0, -1);
  }
  return np;
}
function isSubpath(somePath, parentPath) {
  const rel = path.relative(parentPath, somePath);
  return rel === "" || !rel.startsWith("..") && !path.isAbsolute(rel);
}

// src/util/config.ts
function parseRawConfig(content, filename, filetype = void 0) {
  if (filetype === void 0) {
    filetype = path2.extname(filename.toLowerCase());
  }
  try {
    if (filetype === ".json") {
      return JSON.parse(content);
    } else if (filetype === ".toml") {
      return toml.parse(content);
    } else if (filetype === ".yaml" || filetype === ".yml") {
      return yaml.load(content, { filename });
    } else {
      throw new PythonAnalysisError({
        message: `Could not parse config file "${filename}": unrecognized config format`,
        code: "PYTHON_CONFIG_UNKNOWN_FORMAT",
        path: filename
      });
    }
  } catch (error) {
    if (error instanceof PythonAnalysisError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new PythonAnalysisError({
        message: `Could not parse config file "${filename}": ${error.message}`,
        code: "PYTHON_CONFIG_PARSE_ERROR",
        path: filename
      });
    }
    throw error;
  }
}
function parseConfig(content, filename, schema, filetype = void 0) {
  const raw = parseRawConfig(content, filename, filetype);
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path4 = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  - ${path4}: ${issue.message}`;
    }).join("\n");
    throw new PythonAnalysisError({
      message: `Invalid config in "${filename}":
${issues}`,
      code: "PYTHON_CONFIG_VALIDATION_ERROR",
      path: filename
    });
  }
  return result.data;
}
async function readConfigIfExists(filename, schema, filetype = void 0) {
  const content = await readFileTextIfExists(filename);
  if (content == null) {
    return null;
  }
  return parseConfig(content, filename, schema, filetype);
}

// src/manifest/pep440.ts
import assert from "assert";
import { stringify as stringifyVersion } from "@renovatebot/pep440/lib/version";
import { parse } from "@renovatebot/pep440";
import {
  parse as parse2,
  satisfies
} from "@renovatebot/pep440/lib/specifier";
function pep440ConstraintFromVersion(v) {
  return [
    {
      operator: "==",
      version: unparsePep440Version(v),
      prefix: ""
    }
  ];
}
function unparsePep440Version(v) {
  const verstr = stringifyVersion(v);
  assert(verstr != null, "pep440/lib/version:stringify returned null");
  return verstr;
}

// src/manifest/pipfile/schema.zod.ts
import { z } from "zod";
var pipfileDependencyDetailSchema = z.object({
  version: z.string().optional(),
  hashes: z.array(z.string()).optional(),
  extras: z.union([z.array(z.string()), z.string()]).optional(),
  markers: z.string().optional(),
  index: z.string().optional(),
  git: z.string().optional(),
  ref: z.string().optional(),
  editable: z.boolean().optional(),
  path: z.string().optional()
});
var pipfileDependencySchema = z.union([
  z.string(),
  pipfileDependencyDetailSchema
]);
var pipfileSourceSchema = z.object({
  name: z.string(),
  url: z.string(),
  verify_ssl: z.boolean().optional()
});
var pipfileLikeSchema = z.record(
  z.union([
    z.record(pipfileDependencySchema),
    z.array(pipfileSourceSchema),
    z.record(z.string()),
    z.undefined()
  ])
).and(
  z.object({
    packages: z.record(pipfileDependencySchema).optional(),
    "dev-packages": z.record(pipfileDependencySchema).optional(),
    source: z.array(pipfileSourceSchema).optional(),
    scripts: z.record(z.string()).optional()
  })
);
var pipfileLockMetaSchema = z.object({
  hash: z.object({
    sha256: z.string().optional()
  }).optional(),
  "pipfile-spec": z.number().optional(),
  requires: z.object({
    python_version: z.string().optional(),
    python_full_version: z.string().optional()
  }).optional(),
  sources: z.array(pipfileSourceSchema).optional()
});
var pipfileLockLikeSchema = z.record(
  z.union([
    pipfileLockMetaSchema,
    z.record(pipfileDependencyDetailSchema),
    z.undefined()
  ])
).and(
  z.object({
    _meta: pipfileLockMetaSchema.optional(),
    default: z.record(pipfileDependencyDetailSchema).optional(),
    develop: z.record(pipfileDependencyDetailSchema).optional()
  })
);

// src/manifest/pipfile/schema.ts
var PipfileDependencyDetailSchema = pipfileDependencyDetailSchema.passthrough();
var PipfileDependencySchema = pipfileDependencySchema;
var PipfileSourceSchema = pipfileSourceSchema.passthrough();
var PipfileLikeSchema = pipfileLikeSchema;
var PipfileLockMetaSchema = pipfileLockMetaSchema.passthrough();
var PipfileLockLikeSchema = pipfileLockLikeSchema;

// src/manifest/pep508.ts
var EXTRAS_REGEX = /^(.+)\[([^\]]+)\]$/;
function splitExtras(spec) {
  const match = EXTRAS_REGEX.exec(spec);
  if (!match) {
    return [spec, void 0];
  }
  const extras = match[2].split(",").map((e) => e.trim());
  return [match[1], extras];
}
function formatPep508(req) {
  let result = req.name;
  if (req.extras && req.extras.length > 0) {
    result += `[${req.extras.join(",")}]`;
  }
  if (req.url) {
    result += ` @ ${req.url}`;
  } else if (req.version && req.version !== "*") {
    result += req.version;
  }
  if (req.markers) {
    result += ` ; ${req.markers}`;
  }
  return result;
}
function mergeExtras(existing, additional) {
  const result = new Set(existing || []);
  if (additional) {
    const additionalArray = Array.isArray(additional) ? additional : [additional];
    for (const extra of additionalArray) {
      result.add(extra);
    }
  }
  return result.size > 0 ? Array.from(result) : void 0;
}

// src/util/type.ts
function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

// src/manifest/pipfile-parser.ts
var PYPI_INDEX_NAME = "pypi";
function addDepSource(sources, dep) {
  if (!dep.source) {
    return;
  }
  if (Object.prototype.hasOwnProperty.call(sources, dep.name)) {
    sources[dep.name].push(dep.source);
  } else {
    sources[dep.name] = [dep.source];
  }
}
function isPypiSource(source) {
  return typeof source?.name === "string" && source.name === PYPI_INDEX_NAME;
}
function processIndexSources(sources) {
  const hasPypi = sources.some(isPypiSource);
  const setExplicit = sources.length > 1 && hasPypi;
  const indexes = [];
  for (const source of sources) {
    if (isPypiSource(source)) {
      continue;
    }
    const entry = {
      name: source.name,
      url: source.url
    };
    if (setExplicit) {
      entry.explicit = true;
    }
    indexes.push(entry);
  }
  return indexes;
}
function buildUvToolSection(sources, indexes) {
  const uv = {};
  if (indexes.length > 0) {
    uv.index = indexes;
  }
  if (Object.keys(sources).length > 0) {
    uv.sources = sources;
  }
  return Object.keys(uv).length > 0 ? uv : null;
}
function pipfileDepsToRequirements(entries) {
  const deps = [];
  for (const [name, properties] of Object.entries(entries)) {
    const dep = pipfileDepToRequirement(name, properties);
    deps.push(dep);
  }
  return deps;
}
function pipfileDepToRequirement(spec, properties) {
  const [name, extrasFromName] = splitExtras(spec);
  const dep = { name };
  if (extrasFromName && extrasFromName.length > 0) {
    dep.extras = extrasFromName;
  }
  if (typeof properties === "string") {
    dep.version = properties;
  } else if (properties && typeof properties === "object") {
    if (properties.version) {
      dep.version = properties.version;
    }
    if (properties.extras) {
      dep.extras = mergeExtras(dep.extras, properties.extras);
    }
    if (properties.markers) {
      dep.markers = properties.markers;
    }
    const source = buildDependencySource(properties);
    if (source) {
      dep.source = source;
    }
  }
  return dep;
}
function pipfileLockDepsToRequirements(entries) {
  const deps = [];
  for (const [name, properties] of Object.entries(entries)) {
    const dep = pipfileLockDepToRequirement(name, properties);
    deps.push(dep);
  }
  return deps;
}
function pipfileLockDepToRequirement(spec, properties) {
  const [name, extrasFromName] = splitExtras(spec);
  const dep = { name };
  if (extrasFromName && extrasFromName.length > 0) {
    dep.extras = extrasFromName;
  }
  if (properties.version) {
    dep.version = properties.version;
  }
  if (properties.extras) {
    dep.extras = mergeExtras(dep.extras, properties.extras);
  }
  if (properties.markers) {
    dep.markers = properties.markers;
  }
  const source = buildDependencySource(properties);
  if (source) {
    dep.source = source;
  }
  return dep;
}
function buildDependencySource(properties) {
  const source = {};
  if (properties.index && properties.index !== PYPI_INDEX_NAME) {
    source.index = properties.index;
  }
  if (properties.git) {
    source.git = properties.git;
    if (properties.ref) {
      source.rev = properties.ref;
    }
  }
  if (properties.path) {
    source.path = properties.path;
    if (properties.editable) {
      source.editable = true;
    }
  }
  return Object.keys(source).length > 0 ? source : null;
}
function convertPipfileToPyprojectToml(pipfile) {
  const sources = {};
  const pyproject = {};
  const deps = [];
  for (const dep of pipfileDepsToRequirements(pipfile.packages || {})) {
    deps.push(formatPep508(dep));
    addDepSource(sources, dep);
  }
  if (deps.length > 0) {
    pyproject.project = {
      dependencies: deps
    };
  }
  const devDeps = [];
  for (const dep of pipfileDepsToRequirements(pipfile["dev-packages"] || {})) {
    devDeps.push(formatPep508(dep));
    addDepSource(sources, dep);
  }
  if (devDeps.length > 0) {
    pyproject["dependency-groups"] = {
      dev: devDeps
    };
  }
  const RESERVED_KEYS = /* @__PURE__ */ new Set([
    "packages",
    "dev-packages",
    "source",
    "scripts",
    "requires",
    "pipenv"
  ]);
  for (const [sectionName, value] of Object.entries(pipfile)) {
    if (RESERVED_KEYS.has(sectionName))
      continue;
    if (!isPlainObject(value))
      continue;
    const groupDeps = [];
    for (const dep of pipfileDepsToRequirements(
      value
    )) {
      groupDeps.push(formatPep508(dep));
      addDepSource(sources, dep);
    }
    if (groupDeps.length > 0) {
      pyproject["dependency-groups"] = {
        ...pyproject["dependency-groups"] || {},
        [sectionName]: groupDeps
      };
    }
  }
  const indexes = processIndexSources(pipfile.source ?? []);
  const uv = buildUvToolSection(sources, indexes);
  if (uv) {
    pyproject.tool = { uv };
  }
  return pyproject;
}
function convertPipfileLockToPyprojectToml(pipfileLock) {
  const sources = {};
  const pyproject = {};
  const deps = [];
  for (const dep of pipfileLockDepsToRequirements(pipfileLock.default || {})) {
    deps.push(formatPep508(dep));
    addDepSource(sources, dep);
  }
  if (deps.length > 0) {
    pyproject.project = {
      dependencies: deps
    };
  }
  const devDeps = [];
  for (const dep of pipfileLockDepsToRequirements(pipfileLock.develop || {})) {
    devDeps.push(formatPep508(dep));
    addDepSource(sources, dep);
  }
  if (devDeps.length > 0) {
    pyproject["dependency-groups"] = {
      dev: devDeps
    };
  }
  const RESERVED_KEYS = /* @__PURE__ */ new Set(["_meta", "default", "develop"]);
  for (const [sectionName, value] of Object.entries(pipfileLock)) {
    if (RESERVED_KEYS.has(sectionName))
      continue;
    if (!isPlainObject(value))
      continue;
    const groupDeps = [];
    for (const dep of pipfileLockDepsToRequirements(
      value
    )) {
      groupDeps.push(formatPep508(dep));
      addDepSource(sources, dep);
    }
    if (groupDeps.length > 0) {
      pyproject["dependency-groups"] = {
        ...pyproject["dependency-groups"] || {},
        [sectionName]: groupDeps
      };
    }
  }
  const indexes = processIndexSources(pipfileLock._meta?.sources ?? []);
  const uv = buildUvToolSection(sources, indexes);
  if (uv) {
    pyproject.tool = { uv };
  }
  return pyproject;
}

// src/manifest/pyproject/schema.zod.ts
import { z as z4 } from "zod";

// src/manifest/uv-config/schema.zod.ts
import { z as z3 } from "zod";

// src/manifest/requirement/schema.zod.ts
import { z as z2 } from "zod";
var dependencySourceSchema = z2.object({
  index: z2.string().optional(),
  git: z2.string().optional(),
  rev: z2.string().optional(),
  path: z2.string().optional(),
  editable: z2.boolean().optional()
});
var normalizedRequirementSchema = z2.object({
  name: z2.string(),
  version: z2.string().optional(),
  extras: z2.array(z2.string()).optional(),
  markers: z2.string().optional(),
  url: z2.string().optional(),
  hashes: z2.array(z2.string()).optional(),
  source: dependencySourceSchema.optional()
});
var hashDigestSchema = z2.string();

// src/manifest/uv-config/schema.zod.ts
var uvConfigWorkspaceSchema = z3.object({
  members: z3.array(z3.string()).optional(),
  exclude: z3.array(z3.string()).optional()
});
var uvIndexEntrySchema = z3.object({
  name: z3.string(),
  url: z3.string(),
  default: z3.boolean().optional(),
  explicit: z3.boolean().optional()
});
var uvConfigSchema = z3.object({
  sources: z3.record(z3.union([dependencySourceSchema, z3.array(dependencySourceSchema)])).optional(),
  index: z3.array(uvIndexEntrySchema).optional(),
  workspace: uvConfigWorkspaceSchema.optional()
});

// src/manifest/pyproject/schema.zod.ts
var pyProjectBuildSystemSchema = z4.object({
  requires: z4.array(z4.string()),
  "build-backend": z4.string().optional(),
  "backend-path": z4.array(z4.string()).optional()
});
var personSchema = z4.object({
  name: z4.string().optional(),
  email: z4.string().optional()
});
var readmeObjectSchema = z4.object({
  file: z4.union([z4.string(), z4.array(z4.string())]),
  content_type: z4.string().optional()
});
var readmeSchema = z4.union([z4.string(), readmeObjectSchema]);
var licenseObjectSchema = z4.object({
  text: z4.string().optional(),
  file: z4.string().optional()
});
var licenseSchema = z4.union([z4.string(), licenseObjectSchema]);
var pyProjectProjectSchema = z4.object({
  name: z4.string().optional(),
  version: z4.string().optional(),
  description: z4.string().optional(),
  readme: readmeSchema.optional(),
  keywords: z4.array(z4.string()).optional(),
  authors: z4.array(personSchema).optional(),
  maintainers: z4.array(personSchema).optional(),
  license: licenseSchema.optional(),
  classifiers: z4.array(z4.string()).optional(),
  urls: z4.record(z4.string()).optional(),
  dependencies: z4.array(z4.string()).optional(),
  "optional-dependencies": z4.record(z4.array(z4.string())).optional(),
  dynamic: z4.array(z4.string()).optional(),
  "requires-python": z4.string().optional(),
  scripts: z4.record(z4.string()).optional(),
  entry_points: z4.record(z4.record(z4.string())).optional()
});
var pyProjectDependencyGroupsSchema = z4.record(z4.array(z4.string()));
var pyProjectToolSectionSchema = z4.object({
  uv: uvConfigSchema.optional()
});
var pyProjectTomlSchema = z4.object({
  project: pyProjectProjectSchema.optional(),
  "build-system": pyProjectBuildSystemSchema.optional(),
  "dependency-groups": pyProjectDependencyGroupsSchema.optional(),
  tool: pyProjectToolSectionSchema.optional()
});

// src/manifest/pyproject/schema.ts
var PyProjectBuildSystemSchema = pyProjectBuildSystemSchema.passthrough();
var PersonSchema = personSchema.passthrough();
var ReadmeObjectSchema = readmeObjectSchema.passthrough();
var ReadmeSchema = readmeSchema;
var LicenseObjectSchema = licenseObjectSchema.passthrough();
var LicenseSchema = licenseSchema;
var PyProjectProjectSchema = pyProjectProjectSchema.passthrough();
var PyProjectDependencyGroupsSchema = pyProjectDependencyGroupsSchema;
var PyProjectToolSectionSchema = pyProjectToolSectionSchema.passthrough();
var PyProjectTomlSchema = pyProjectTomlSchema.passthrough();

// src/manifest/requirements-txt-parser.ts
import { normalize } from "path";
import { parsePipRequirementsFile } from "pip-requirements-js";
var PRIMARY_INDEX_NAME = "primary";
var EXTRA_INDEX_PREFIX = "extra-";
function parseGitUrl(url) {
  if (!url.startsWith("git+")) {
    return null;
  }
  let remaining = url.slice(4);
  let egg;
  const fragmentIdx = remaining.indexOf("#");
  if (fragmentIdx !== -1) {
    const fragment = remaining.slice(fragmentIdx + 1);
    remaining = remaining.slice(0, fragmentIdx);
    for (const part of fragment.split("&")) {
      const [key, value] = part.split("=");
      if (key === "egg" && value) {
        egg = value;
      }
    }
  }
  let ref;
  const lastSlashIdx = remaining.lastIndexOf("/");
  const atIdx = remaining.indexOf("@", lastSlashIdx > 0 ? lastSlashIdx : 0);
  if (atIdx !== -1 && atIdx > remaining.indexOf("://")) {
    ref = remaining.slice(atIdx + 1);
    remaining = remaining.slice(0, atIdx);
  }
  return {
    url: remaining,
    ref,
    egg
  };
}
function isGitUrl(url) {
  return url.startsWith("git+");
}
function extractPipArguments(fileContent) {
  const options = {
    requirementFiles: [],
    constraintFiles: [],
    extraIndexUrls: []
  };
  const lines = fileContent.split(/\r?\n/);
  const cleanedLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      cleanedLines.push(line);
      continue;
    }
    let fullLine = trimmed;
    let linesConsumed = 0;
    while (fullLine.endsWith("\\") && i + linesConsumed + 1 < lines.length) {
      linesConsumed++;
      fullLine = fullLine.slice(0, -1) + lines[i + linesConsumed].trim();
    }
    const extracted = tryExtractPipArgument(fullLine, options);
    if (extracted) {
      i += linesConsumed;
    } else {
      const strippedLine = stripInlineHashes(fullLine);
      if (strippedLine !== fullLine) {
        cleanedLines.push(strippedLine);
      } else {
        cleanedLines.push(line);
        for (let j = 1; j <= linesConsumed; j++) {
          cleanedLines.push(lines[i + j]);
        }
      }
      i += linesConsumed;
    }
  }
  return {
    cleanedContent: cleanedLines.join("\n"),
    options
  };
}
function tryExtractPipArgument(line, options) {
  if (line.startsWith("--requirement")) {
    const path4 = extractArgValue(line, "--requirement");
    if (path4) {
      options.requirementFiles.push(path4);
      return true;
    }
  }
  if (line.startsWith("--constraint")) {
    const path4 = extractArgValue(line, "--constraint");
    if (path4) {
      options.constraintFiles.push(path4);
      return true;
    }
  }
  if (line.startsWith("--index-url")) {
    const url = extractArgValue(line, "--index-url");
    if (url) {
      options.indexUrl = url;
      return true;
    }
  }
  if (line.startsWith("-i ") || line === "-i") {
    const match = line.match(/^-i\s+(\S+)/);
    if (match) {
      options.indexUrl = match[1];
      return true;
    }
  }
  if (line.startsWith("--extra-index-url")) {
    const url = extractArgValue(line, "--extra-index-url");
    if (url) {
      options.extraIndexUrls.push(url);
      return true;
    }
  }
  return false;
}
function stripInlineHashes(line) {
  return line.replace(/\s+--hash=\S+/g, "").trim();
}
function extractInlineHashes(line) {
  const hashes = [];
  const hashRegex = /--hash=(\S+)/g;
  let match;
  while ((match = hashRegex.exec(line)) != null) {
    hashes.push(match[1]);
  }
  return hashes;
}
function extractArgValue(line, option) {
  if (line.startsWith(`${option}=`)) {
    const value = line.slice(option.length + 1).trim();
    return value || null;
  }
  if (line.startsWith(`${option} `) || line.startsWith(`${option}	`)) {
    const value = line.slice(option.length).trim();
    return value || null;
  }
  return null;
}
function convertRequirementsToPyprojectToml(fileContent, readFile3) {
  const pyproject = {};
  const parsed = parseRequirementsFile(fileContent, readFile3);
  const deps = [];
  const sources = {};
  for (const req of parsed.requirements) {
    deps.push(formatPep508(req));
    if (req.source) {
      if (Object.prototype.hasOwnProperty.call(sources, req.name)) {
        sources[req.name].push(req.source);
      } else {
        sources[req.name] = [req.source];
      }
    }
  }
  if (deps.length > 0) {
    pyproject.project = {
      dependencies: deps
    };
  }
  const uv = {};
  const indexes = buildIndexEntries(parsed.pipOptions);
  if (indexes.length > 0) {
    uv.index = indexes;
  }
  if (Object.keys(sources).length > 0) {
    uv.sources = sources;
  }
  if (Object.keys(uv).length > 0) {
    pyproject.tool = { uv };
  }
  return pyproject;
}
function buildIndexEntries(pipOptions) {
  const indexes = [];
  if (pipOptions.indexUrl) {
    indexes.push({
      name: PRIMARY_INDEX_NAME,
      url: pipOptions.indexUrl,
      default: true
    });
  }
  for (let i = 0; i < pipOptions.extraIndexUrls.length; i++) {
    indexes.push({
      name: `${EXTRA_INDEX_PREFIX}${i + 1}`,
      url: pipOptions.extraIndexUrls[i]
    });
  }
  return indexes;
}
function parseRequirementsFile(fileContent, readFile3) {
  const visited = /* @__PURE__ */ new Set();
  return parseRequirementsFileInternal(fileContent, readFile3, visited);
}
function parseRequirementsFileInternal(fileContent, readFile3, visited) {
  const { cleanedContent, options } = extractPipArguments(fileContent);
  const hashMap = buildHashMap(fileContent);
  const requirements = parsePipRequirementsFile(cleanedContent);
  const normalized = [];
  const mergedOptions = {
    requirementFiles: [...options.requirementFiles],
    constraintFiles: [...options.constraintFiles],
    indexUrl: options.indexUrl,
    extraIndexUrls: [...options.extraIndexUrls]
  };
  for (const req of requirements) {
    if (req.type === "RequirementsFile") {
      mergedOptions.requirementFiles.push(req.path);
      continue;
    }
    if (req.type === "ConstraintsFile") {
      mergedOptions.constraintFiles.push(req.path);
      continue;
    }
    const norm = normalizeRequirement(req);
    if (norm != null) {
      const hashes = hashMap.get(norm.name.toLowerCase());
      if (hashes && hashes.length > 0) {
        norm.hashes = hashes;
      }
      normalized.push(norm);
    }
  }
  if (readFile3) {
    for (const refPath of mergedOptions.requirementFiles) {
      const refPathKey = normalize(refPath);
      if (visited.has(refPathKey)) {
        continue;
      }
      visited.add(refPathKey);
      const refContent = readFile3(refPath);
      if (refContent != null) {
        const refParsed = parseRequirementsFileInternal(
          refContent,
          readFile3,
          visited
        );
        const existingNames = new Set(
          normalized.map((r) => r.name.toLowerCase())
        );
        for (const req of refParsed.requirements) {
          if (!existingNames.has(req.name.toLowerCase())) {
            normalized.push(req);
            existingNames.add(req.name.toLowerCase());
          }
        }
        if (refParsed.pipOptions.indexUrl) {
          mergedOptions.indexUrl = refParsed.pipOptions.indexUrl;
        }
        for (const url of refParsed.pipOptions.extraIndexUrls) {
          if (!mergedOptions.extraIndexUrls.includes(url)) {
            mergedOptions.extraIndexUrls.push(url);
          }
        }
        for (const constraintPath of refParsed.pipOptions.constraintFiles) {
          if (!mergedOptions.constraintFiles.includes(constraintPath)) {
            mergedOptions.constraintFiles.push(constraintPath);
          }
        }
      }
    }
  }
  return {
    requirements: normalized,
    pipOptions: mergedOptions
  };
}
function buildHashMap(fileContent) {
  const hashMap = /* @__PURE__ */ new Map();
  const lines = fileContent.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line === "" || line.startsWith("#") || line.startsWith("-")) {
      continue;
    }
    while (line.endsWith("\\") && i + 1 < lines.length) {
      i++;
      line = line.slice(0, -1) + lines[i].trim();
    }
    const hashes = extractInlineHashes(line);
    if (hashes.length === 0) {
      continue;
    }
    const packageMatch = line.match(/^([a-zA-Z0-9][-a-zA-Z0-9._]*)/);
    if (packageMatch) {
      const packageName = packageMatch[1].toLowerCase();
      hashMap.set(packageName, hashes);
    }
  }
  return hashMap;
}
function normalizeRequirement(req) {
  if (req.type === "RequirementsFile" || req.type === "ConstraintsFile") {
    return null;
  }
  if (req.type === "ProjectURL") {
    return normalizeProjectURLRequirement(req);
  }
  if (req.type === "ProjectName") {
    return normalizeProjectNameRequirement(req);
  }
  return null;
}
function normalizeProjectNameRequirement(req) {
  const normalized = {
    name: req.name
  };
  if (req.extras && req.extras.length > 0) {
    normalized.extras = req.extras;
  }
  if (req.versionSpec && req.versionSpec.length > 0) {
    normalized.version = req.versionSpec.map((spec) => `${spec.operator}${spec.version}`).join(",");
  }
  if (req.environmentMarkerTree) {
    normalized.markers = formatEnvironmentMarkers(req.environmentMarkerTree);
  }
  return normalized;
}
function normalizeProjectURLRequirement(req) {
  const normalized = {
    name: req.name
  };
  if (req.extras && req.extras.length > 0) {
    normalized.extras = req.extras;
  }
  if (req.environmentMarkerTree) {
    normalized.markers = formatEnvironmentMarkers(req.environmentMarkerTree);
  }
  if (isGitUrl(req.url)) {
    const parsed = parseGitUrl(req.url);
    if (parsed) {
      const source = {
        git: parsed.url
      };
      if (parsed.ref) {
        source.rev = parsed.ref;
      }
      if (parsed.editable) {
        source.editable = true;
      }
      normalized.source = source;
    }
  }
  normalized.url = req.url;
  return normalized;
}
function formatEnvironmentMarkers(marker) {
  if (isEnvironmentMarkerNode(marker)) {
    const left = formatEnvironmentMarkers(marker.left);
    const right = formatEnvironmentMarkers(marker.right);
    return `(${left}) ${marker.operator} (${right})`;
  }
  const leaf = marker;
  const leftStr = formatMarkerValue(leaf.left);
  const rightStr = formatMarkerValue(leaf.right);
  return `${leftStr} ${leaf.operator} ${rightStr}`;
}
function isEnvironmentMarkerNode(marker) {
  if (typeof marker !== "object" || marker == null) {
    return false;
  }
  const op = marker.operator;
  return op === "and" || op === "or";
}
function formatMarkerValue(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value;
  }
  return value;
}

// src/manifest/uv-config/schema.ts
var UvConfigWorkspaceSchema = uvConfigWorkspaceSchema.passthrough();
var UvIndexEntrySchema = uvIndexEntrySchema.passthrough();
var UvConfigSchema = uvConfigSchema.passthrough();

// src/manifest/python-specifiers.ts
var PythonImplementation = {
  knownLongNames() {
    return {
      python: "cpython",
      cpython: "cpython",
      pypy: "pypy",
      pyodide: "pyodide",
      graalpy: "graalpy"
    };
  },
  knownShortNames() {
    return { cp: "cpython", pp: "pypy", gp: "graalpy" };
  },
  knownNames() {
    return { ...this.knownLongNames(), ...this.knownShortNames() };
  },
  parse(s) {
    const impl = this.knownNames()[s];
    if (impl !== void 0) {
      return impl;
    } else {
      return { implementation: s };
    }
  },
  isUnknown(impl) {
    return impl.implementation !== void 0;
  },
  toString(impl) {
    switch (impl) {
      case "cpython":
        return "cpython";
      case "pypy":
        return "pypy";
      case "pyodide":
        return "pyodide";
      case "graalpy":
        return "graalpy";
      default:
        return impl.implementation;
    }
  },
  toStringPretty(impl) {
    switch (impl) {
      case "cpython":
        return "CPython";
      case "pypy":
        return "PyPy";
      case "pyodide":
        return "PyOdide";
      case "graalpy":
        return "GraalPy";
      default:
        return impl.implementation;
    }
  }
};
var PythonVariant = {
  parse(s) {
    switch (s) {
      case "default":
        return "default";
      case "d":
      case "debug":
        return "debug";
      case "freethreaded":
        return "freethreaded";
      case "t":
        return "freethreaded";
      case "gil":
        return "gil";
      case "freethreaded+debug":
        return "freethreaded+debug";
      case "td":
        return "freethreaded+debug";
      case "gil+debug":
        return "gil+debug";
      default:
        return { type: "unknown", variant: s };
    }
  },
  toString(v) {
    switch (v) {
      case "default":
        return "default";
      case "debug":
        return "debug";
      case "freethreaded":
        return "freethreaded";
      case "gil":
        return "gil";
      case "freethreaded+debug":
        return "freethreaded+debug";
      case "gil+debug":
        return "gil+debug";
      default:
        return v.variant;
    }
  }
};
var PythonVersion = {
  toString(version) {
    let verstr = `${version.major}.${version.minor}`;
    if (version.patch !== void 0) {
      verstr = `${verstr}.${version.patch}`;
    }
    if (version.prerelease !== void 0) {
      verstr = `${verstr}${version.prerelease}`;
    }
    return verstr;
  }
};
var PythonBuild = {
  toString(build) {
    const parts = [
      PythonImplementation.toString(build.implementation),
      `${PythonVersion.toString(build.version)}+${PythonVariant.toString(build.variant)}`,
      build.os,
      build.architecture,
      build.libc
    ];
    return parts.join("-");
  }
};

// src/manifest/uv-python-version-parser.ts
function pythonRequestFromConstraint(constraint) {
  return {
    implementation: "cpython",
    version: {
      constraint,
      variant: "default"
    }
  };
}
function parsePythonVersionFile(content) {
  const lines = content.split(/\r?\n/);
  const requests = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const trimmed = raw.trim();
    if (!trimmed)
      continue;
    if (trimmed.startsWith("#"))
      continue;
    const parsed = parseUvPythonRequest(trimmed);
    if (parsed != null) {
      requests.push(parsed);
    }
  }
  if (requests.length === 0) {
    return null;
  } else {
    return requests;
  }
}
function parseUvPythonRequest(input) {
  const raw = input.trim();
  if (!raw) {
    return null;
  }
  const lowercase = raw.toLowerCase();
  if (lowercase === "any" || lowercase === "default") {
    return {};
  }
  for (const [implName, implementation] of Object.entries(
    PythonImplementation.knownNames()
  )) {
    if (lowercase.startsWith(implName)) {
      let rest = lowercase.substring(implName.length);
      if (rest.length === 0) {
        return {
          implementation
        };
      }
      if (rest[0] === "@") {
        rest = rest.substring(1);
      }
      const version2 = parseVersionRequest(rest);
      if (version2 != null) {
        return {
          implementation,
          version: version2
        };
      }
    }
  }
  const version = parseVersionRequest(lowercase);
  if (version != null) {
    return {
      implementation: "cpython",
      version
    };
  }
  return tryParsePlatformRequest(lowercase);
}
function parseVersionRequest(input) {
  const [version, variant] = parseVariantSuffix(input);
  let parsedVer = parse(version);
  if (parsedVer != null) {
    if (parsedVer.release.length === 1) {
      const converted = splitWheelTagVersion(version);
      if (converted != null) {
        const convertedVer = parse(converted);
        if (convertedVer != null) {
          parsedVer = convertedVer;
        }
      }
    }
    return {
      constraint: pep440ConstraintFromVersion(parsedVer),
      variant
    };
  }
  const parsedConstr = parse2(version);
  if (parsedConstr?.length) {
    return {
      constraint: parsedConstr,
      variant
    };
  }
  return null;
}
function splitWheelTagVersion(version) {
  if (!/^\d+$/.test(version)) {
    return null;
  }
  if (version.length < 2) {
    return null;
  }
  const major = version[0];
  const minorStr = version.substring(1);
  const minor = parseInt(minorStr, 10);
  if (isNaN(minor) || minor > 255) {
    return null;
  }
  return `${major}.${minor}`;
}
function rfindNumericChar(s) {
  for (let i = s.length - 1; i >= 0; i--) {
    const code = s.charCodeAt(i);
    if (code >= 48 && code <= 57)
      return i;
  }
  return -1;
}
function parseVariantSuffix(vrs) {
  let pos = rfindNumericChar(vrs);
  if (pos < 0) {
    return [vrs, "default"];
  }
  pos += 1;
  if (pos + 1 > vrs.length) {
    return [vrs, "default"];
  }
  let variant = vrs.substring(pos);
  if (variant[0] === "+") {
    variant = variant.substring(1);
  }
  const prefix = vrs.substring(0, pos);
  return [prefix, PythonVariant.parse(variant)];
}
function tryParsePlatformRequest(raw) {
  const parts = raw.split("-");
  let partIdx = 0;
  const state = ["implementation", "version", "os", "arch", "libc", "end"];
  let stateIdx = 0;
  let implementation;
  let version;
  let os;
  let arch;
  let libc;
  let implOrVersionFailed = false;
  for (; ; ) {
    if (partIdx >= parts.length || state[stateIdx] === "end") {
      break;
    }
    const part = parts[partIdx].toLowerCase();
    if (part.length === 0) {
      break;
    }
    switch (state[stateIdx]) {
      case "implementation":
        if (part === "any") {
          partIdx += 1;
          stateIdx += 1;
          continue;
        }
        implementation = PythonImplementation.parse(part);
        if (PythonImplementation.isUnknown(implementation)) {
          implementation = void 0;
          stateIdx += 1;
          implOrVersionFailed = true;
          continue;
        }
        stateIdx += 1;
        partIdx += 1;
        break;
      case "version":
        if (part === "any") {
          partIdx += 1;
          stateIdx += 1;
          continue;
        }
        version = parseVersionRequest(part);
        if (version == null) {
          version = void 0;
          stateIdx += 1;
          implOrVersionFailed = true;
          continue;
        }
        stateIdx += 1;
        partIdx += 1;
        break;
      case "os":
        if (part === "any") {
          partIdx += 1;
          stateIdx += 1;
          continue;
        }
        os = part;
        stateIdx += 1;
        partIdx += 1;
        break;
      case "arch":
        if (part === "any") {
          partIdx += 1;
          stateIdx += 1;
          continue;
        }
        arch = part;
        stateIdx += 1;
        partIdx += 1;
        break;
      case "libc":
        if (part === "any") {
          partIdx += 1;
          stateIdx += 1;
          continue;
        }
        libc = part;
        stateIdx += 1;
        partIdx += 1;
        break;
      default:
        break;
    }
  }
  if (implOrVersionFailed && implementation === void 0 && version === void 0) {
    return null;
  }
  let platform;
  if (os !== void 0 || arch !== void 0 || libc !== void 0) {
    platform = {
      os,
      arch,
      libc
    };
  }
  return { implementation, version, platform };
}

// src/manifest/package.ts
var PythonConfigKind = /* @__PURE__ */ ((PythonConfigKind2) => {
  PythonConfigKind2["PythonVersion"] = ".python-version";
  return PythonConfigKind2;
})(PythonConfigKind || {});
var PythonManifestKind = /* @__PURE__ */ ((PythonManifestKind2) => {
  PythonManifestKind2["PyProjectToml"] = "pyproject.toml";
  return PythonManifestKind2;
})(PythonManifestKind || {});
var PythonManifestConvertedKind = /* @__PURE__ */ ((PythonManifestConvertedKind2) => {
  PythonManifestConvertedKind2["Pipfile"] = "Pipfile";
  PythonManifestConvertedKind2["PipfileLock"] = "Pipfile.lock";
  PythonManifestConvertedKind2["RequirementsIn"] = "requirements.in";
  PythonManifestConvertedKind2["RequirementsTxt"] = "requirements.txt";
  return PythonManifestConvertedKind2;
})(PythonManifestConvertedKind || {});
async function discoverPythonPackage({
  entrypointDir,
  rootDir
}) {
  const entrypointPath = normalizePath(entrypointDir);
  const rootPath = normalizePath(rootDir);
  let prefix = path3.relative(rootPath, entrypointPath);
  if (prefix.startsWith("..")) {
    throw new PythonAnalysisError({
      message: "Entrypoint directory outside of repository root",
      code: "PYTHON_INVALID_ENTRYPOINT_PATH"
    });
  }
  const manifests = [];
  let configs = [];
  for (; ; ) {
    const prefixConfigs = await loadPythonConfigs(rootPath, prefix);
    if (Object.keys(prefixConfigs).length !== 0) {
      configs.push(prefixConfigs);
    }
    const prefixManifest = await loadPythonManifest(rootPath, prefix);
    if (prefixManifest != null) {
      manifests.push(prefixManifest);
      if (prefixManifest.isRoot) {
        break;
      }
    }
    if (prefix === "" || prefix === ".") {
      break;
    }
    prefix = path3.dirname(prefix);
  }
  let entrypointManifest;
  let workspaceManifest;
  if (manifests.length === 0) {
    return {
      configs
    };
  } else {
    entrypointManifest = manifests[0];
    const entrypointWorkspaceManifest = findWorkspaceManifestFor(
      entrypointManifest,
      manifests
    );
    workspaceManifest = entrypointWorkspaceManifest;
    configs = configs.filter(
      (config) => Object.values(config).some(
        (cfg) => cfg !== void 0 && isSubpath(
          path3.dirname(cfg.path),
          path3.dirname(entrypointWorkspaceManifest.path)
        )
      )
    );
  }
  const requiresPython = computeRequiresPython(
    entrypointManifest,
    workspaceManifest,
    configs
  );
  return {
    manifest: entrypointManifest,
    workspaceManifest,
    configs,
    requiresPython
  };
}
function computeRequiresPython(manifest, workspaceManifest, configs) {
  const constraints = [];
  for (const configSet of configs) {
    const pythonVersionConfig = configSet[".python-version" /* PythonVersion */];
    if (pythonVersionConfig !== void 0) {
      constraints.push({
        request: pythonVersionConfig.data,
        source: `${pythonVersionConfig.path}`
      });
      break;
    }
  }
  const manifestRequiresPython = manifest?.data.project?.["requires-python"];
  if (manifestRequiresPython) {
    const parsed = parse2(manifestRequiresPython);
    if (parsed?.length) {
      const request = pythonRequestFromConstraint(parsed);
      constraints.push({
        request: [request],
        source: `"requires-python" key in ${manifest.path}`
      });
    }
  } else {
    const workspaceRequiresPython = workspaceManifest?.data.project?.["requires-python"];
    if (workspaceRequiresPython) {
      const parsed = parse2(workspaceRequiresPython);
      if (parsed?.length) {
        const request = pythonRequestFromConstraint(parsed);
        constraints.push({
          request: [request],
          source: `"requires-python" key in ${workspaceManifest.path}`
        });
      }
    }
  }
  return constraints;
}
function findWorkspaceManifestFor(manifest, manifestStack) {
  if (manifest.isRoot) {
    return manifest;
  }
  for (const parentManifest of manifestStack) {
    if (parentManifest.path === manifest.path) {
      continue;
    }
    const workspace = parentManifest.data.tool?.uv?.workspace;
    if (workspace !== void 0) {
      let members = workspace.members ?? [];
      if (!Array.isArray(members)) {
        members = [];
      }
      let exclude = workspace.exclude ?? [];
      if (!Array.isArray(exclude)) {
        exclude = [];
      }
      const entrypointRelPath = path3.relative(
        path3.dirname(parentManifest.path),
        path3.dirname(manifest.path)
      );
      if (members.length > 0 && members.some(
        (pat) => minimatchMatch([entrypointRelPath], pat).length > 0
      ) && !exclude.some(
        (pat) => minimatchMatch([entrypointRelPath], pat).length > 0
      )) {
        return parentManifest;
      }
    }
  }
  return manifest;
}
async function loadPythonManifest(root, prefix) {
  let manifest = null;
  const pyproject = await maybeLoadPyProjectToml(root, prefix);
  if (pyproject != null) {
    manifest = pyproject;
    manifest.isRoot = pyproject.data.tool?.uv?.workspace !== void 0;
  } else {
    const pipfileLockPyProject = await maybeLoadPipfileLock(root, prefix);
    if (pipfileLockPyProject != null) {
      manifest = pipfileLockPyProject;
      manifest.isRoot = true;
    } else {
      const pipfilePyProject = await maybeLoadPipfile(root, prefix);
      if (pipfilePyProject != null) {
        manifest = pipfilePyProject;
        manifest.isRoot = true;
      } else {
        for (const fileName of [
          "requirements.frozen.txt",
          "requirements-frozen.txt",
          "requirements.txt",
          "requirements.in",
          path3.join("requirements", "prod.txt")
        ]) {
          const requirementsTxtManifest = await maybeLoadRequirementsTxt(
            root,
            prefix,
            fileName
          );
          if (requirementsTxtManifest != null) {
            manifest = requirementsTxtManifest;
            manifest.isRoot = true;
            break;
          }
        }
      }
    }
  }
  return manifest;
}
async function maybeLoadPyProjectToml(root, subdir) {
  const pyprojectTomlRelPath = path3.join(subdir, "pyproject.toml");
  const pyprojectTomlPath = path3.join(root, pyprojectTomlRelPath);
  let pyproject;
  try {
    pyproject = await readConfigIfExists(
      pyprojectTomlPath,
      PyProjectTomlSchema
    );
  } catch (error) {
    if (error instanceof PythonAnalysisError) {
      error.path = pyprojectTomlRelPath;
      throw error;
    }
    throw new PythonAnalysisError({
      message: `could not parse pyproject.toml: ${error instanceof Error ? error.message : String(error)}`,
      code: "PYTHON_PYPROJECT_PARSE_ERROR",
      path: pyprojectTomlRelPath
    });
  }
  if (pyproject == null) {
    return null;
  }
  const uvTomlRelPath = path3.join(subdir, "uv.toml");
  const uvTomlPath = path3.join(root, uvTomlRelPath);
  let uvToml;
  try {
    uvToml = await readConfigIfExists(uvTomlPath, UvConfigSchema);
  } catch (error) {
    if (error instanceof PythonAnalysisError) {
      error.path = uvTomlRelPath;
      throw error;
    }
    throw new PythonAnalysisError({
      message: `could not parse uv.toml: ${error instanceof Error ? error.message : String(error)}`,
      code: "PYTHON_UV_CONFIG_PARSE_ERROR",
      path: uvTomlRelPath
    });
  }
  if (uvToml != null) {
    if (pyproject.tool == null) {
      pyproject.tool = { uv: uvToml };
    } else {
      pyproject.tool.uv = uvToml;
    }
  }
  return {
    path: pyprojectTomlRelPath,
    data: pyproject
  };
}
async function maybeLoadPipfile(root, subdir) {
  const pipfileRelPath = path3.join(subdir, "Pipfile");
  const pipfilePath = path3.join(root, pipfileRelPath);
  let pipfile;
  try {
    pipfile = await readConfigIfExists(pipfilePath, PipfileLikeSchema, ".toml");
  } catch (error) {
    if (error instanceof PythonAnalysisError) {
      error.path = pipfileRelPath;
      throw error;
    }
    throw new PythonAnalysisError({
      message: `could not parse Pipfile: ${error instanceof Error ? error.message : String(error)}`,
      code: "PYTHON_PIPFILE_PARSE_ERROR",
      path: pipfileRelPath
    });
  }
  if (pipfile == null) {
    return null;
  }
  const pyproject = convertPipfileToPyprojectToml(pipfile);
  return {
    path: pipfileRelPath,
    data: pyproject,
    origin: {
      kind: "Pipfile" /* Pipfile */,
      path: pipfileRelPath
    }
  };
}
async function maybeLoadPipfileLock(root, subdir) {
  const pipfileLockRelPath = path3.join(subdir, "Pipfile.lock");
  const pipfileLockPath = path3.join(root, pipfileLockRelPath);
  let pipfileLock;
  try {
    pipfileLock = await readConfigIfExists(
      pipfileLockPath,
      PipfileLockLikeSchema,
      ".json"
    );
  } catch (error) {
    if (error instanceof PythonAnalysisError) {
      error.path = pipfileLockRelPath;
      throw error;
    }
    throw new PythonAnalysisError({
      message: `could not parse Pipfile.lock: ${error instanceof Error ? error.message : String(error)}`,
      code: "PYTHON_PIPFILE_LOCK_PARSE_ERROR",
      path: pipfileLockRelPath
    });
  }
  if (pipfileLock == null) {
    return null;
  }
  const pyproject = convertPipfileLockToPyprojectToml(pipfileLock);
  return {
    path: pipfileLockRelPath,
    data: pyproject,
    origin: {
      kind: "Pipfile.lock" /* PipfileLock */,
      path: pipfileLockRelPath
    }
  };
}
async function maybeLoadRequirementsTxt(root, subdir, fileName) {
  const requirementsTxtRelPath = path3.join(subdir, fileName);
  const requirementsTxtPath = path3.join(root, requirementsTxtRelPath);
  const requirementsContent = await readFileTextIfExists(requirementsTxtPath);
  if (requirementsContent == null) {
    return null;
  }
  try {
    const pyproject = convertRequirementsToPyprojectToml(requirementsContent);
    return {
      path: requirementsTxtRelPath,
      data: pyproject,
      origin: {
        kind: "requirements.txt" /* RequirementsTxt */,
        path: requirementsTxtRelPath
      }
    };
  } catch (error) {
    if (error instanceof PythonAnalysisError) {
      error.path = requirementsTxtRelPath;
      throw error;
    }
    throw new PythonAnalysisError({
      message: `could not parse ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      code: "PYTHON_REQUIREMENTS_PARSE_ERROR",
      path: requirementsTxtRelPath
    });
  }
}
async function loadPythonConfigs(root, prefix) {
  const configs = {};
  const pythonRequest = await maybeLoadPythonRequest(root, prefix);
  if (pythonRequest != null) {
    configs[".python-version" /* PythonVersion */] = pythonRequest;
  }
  return configs;
}
async function maybeLoadPythonRequest(root, subdir) {
  const dotPythonVersionRelPath = path3.join(subdir, ".python-version");
  const dotPythonVersionPath = path3.join(
    root,
    dotPythonVersionRelPath
  );
  const data = await readFileTextIfExists(dotPythonVersionPath);
  if (data == null) {
    return null;
  }
  const pyreq = parsePythonVersionFile(data);
  if (pyreq == null) {
    throw new PythonAnalysisError({
      message: `could not parse .python-version file: no valid Python version requests found`,
      code: "PYTHON_VERSION_FILE_PARSE_ERROR",
      path: dotPythonVersionRelPath
    });
  }
  return {
    kind: ".python-version" /* PythonVersion */,
    path: dotPythonVersionRelPath,
    data: pyreq
  };
}

// src/manifest/python-selector.ts
function selectPython(constraints, available) {
  const warnings = [];
  const errors = [];
  if (constraints.length === 0) {
    return {
      build: available.length > 0 ? available[0] : null,
      errors: available.length === 0 ? ["No Python builds available"] : void 0
    };
  }
  const constraintMatches = /* @__PURE__ */ new Map();
  for (let i = 0; i < constraints.length; i++) {
    constraintMatches.set(i, []);
  }
  for (const build of available) {
    let matchesAll = true;
    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];
      if (buildMatchesConstraint(build, constraint)) {
        constraintMatches.get(i)?.push(build);
      } else {
        matchesAll = false;
      }
    }
    if (matchesAll) {
      return {
        build,
        warnings: warnings.length > 0 ? warnings : void 0
      };
    }
  }
  if (constraints.length > 1) {
    const constraintsWithMatches = [];
    for (let i = 0; i < constraints.length; i++) {
      const matches = constraintMatches.get(i) ?? [];
      if (matches.length > 0) {
        constraintsWithMatches.push(i);
      }
    }
    if (constraintsWithMatches.length > 1) {
      const sources = constraintsWithMatches.map((i) => constraints[i].source);
      warnings.push(
        `Python version constraints may not overlap: ${sources.join(", ")}`
      );
    }
  }
  const constraintDescriptions = constraints.map((c) => c.source).join(", ");
  errors.push(
    `No Python build satisfies all constraints: ${constraintDescriptions}`
  );
  return {
    build: null,
    errors,
    warnings: warnings.length > 0 ? warnings : void 0
  };
}
function pythonVersionToString(version) {
  let str = `${version.major}.${version.minor}`;
  if (version.patch !== void 0) {
    str += `.${version.patch}`;
  }
  if (version.prerelease) {
    str += version.prerelease;
  }
  return str;
}
function pep440ConstraintsToString(constraints) {
  return constraints.map((c) => `${c.operator}${c.prefix}${c.version}`).join(",");
}
function implementationsMatch(buildImpl, requestImpl) {
  if (PythonImplementation.isUnknown(buildImpl)) {
    if (PythonImplementation.isUnknown(requestImpl)) {
      return buildImpl.implementation === requestImpl.implementation;
    }
    return false;
  }
  if (PythonImplementation.isUnknown(requestImpl)) {
    return false;
  }
  return buildImpl === requestImpl;
}
function variantsMatch(buildVariant, requestVariant) {
  if (typeof buildVariant === "object" && "type" in buildVariant) {
    if (typeof requestVariant === "object" && "type" in requestVariant) {
      return buildVariant.variant === requestVariant.variant;
    }
    return false;
  }
  if (typeof requestVariant === "object" && "type" in requestVariant) {
    return false;
  }
  return buildVariant === requestVariant;
}
function buildMatchesRequest(build, request) {
  if (request.implementation !== void 0) {
    if (!implementationsMatch(build.implementation, request.implementation)) {
      return false;
    }
  }
  if (request.version !== void 0) {
    const versionConstraints = request.version.constraint;
    if (versionConstraints.length > 0) {
      const buildVersionStr = pythonVersionToString(build.version);
      const specifier = pep440ConstraintsToString(versionConstraints);
      if (!satisfies(buildVersionStr, specifier)) {
        return false;
      }
    }
    if (request.version.variant !== void 0) {
      if (!variantsMatch(build.variant, request.version.variant)) {
        return false;
      }
    }
  }
  if (request.platform !== void 0) {
    const platform = request.platform;
    if (platform.os !== void 0) {
      if (build.os.toLowerCase() !== platform.os.toLowerCase()) {
        return false;
      }
    }
    if (platform.arch !== void 0) {
      if (build.architecture.toLowerCase() !== platform.arch.toLowerCase()) {
        return false;
      }
    }
    if (platform.libc !== void 0) {
      if (build.libc.toLowerCase() !== platform.libc.toLowerCase()) {
        return false;
      }
    }
  }
  return true;
}
function buildMatchesConstraint(build, constraint) {
  if (constraint.request.length === 0) {
    return true;
  }
  for (const request of constraint.request) {
    if (buildMatchesRequest(build, request)) {
      return true;
    }
  }
  return false;
}

// src/manifest/requirement/schema.ts
var DependencySourceSchema = dependencySourceSchema.passthrough();
var NormalizedRequirementSchema = normalizedRequirementSchema;
var HashDigestSchema = hashDigestSchema;
export {
  DependencySourceSchema,
  HashDigestSchema,
  LicenseObjectSchema,
  LicenseSchema,
  NormalizedRequirementSchema,
  PersonSchema,
  PipfileDependencyDetailSchema,
  PipfileDependencySchema,
  PipfileLikeSchema,
  PipfileLockLikeSchema,
  PipfileLockMetaSchema,
  PipfileSourceSchema,
  PyProjectBuildSystemSchema,
  PyProjectDependencyGroupsSchema,
  PyProjectProjectSchema,
  PyProjectTomlSchema,
  PyProjectToolSectionSchema,
  PythonAnalysisError,
  PythonBuild,
  PythonConfigKind,
  PythonImplementation,
  PythonManifestConvertedKind,
  PythonManifestKind,
  PythonVariant,
  PythonVersion,
  ReadmeObjectSchema,
  ReadmeSchema,
  UvConfigSchema,
  UvConfigWorkspaceSchema,
  UvIndexEntrySchema,
  containsAppOrHandler,
  discoverPythonPackage,
  selectPython
};
