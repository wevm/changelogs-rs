

// -- Unbuild CommonJS Shims --
import __cjs_url__ from 'url';
import __cjs_path__ from 'path';
import __cjs_mod__ from 'module';
const __filename = __cjs_url__.fileURLToPath(import.meta.url);
const __dirname = __cjs_path__.dirname(__filename);
const require = __cjs_mod__.createRequire(import.meta.url);
const version = "2.12.0";

const nativeModules = [
  "_stream_duplex",
  "_stream_passthrough",
  "_stream_readable",
  "_stream_transform",
  "_stream_writable",
  "_tls_common",
  "_tls_wrap",
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "constants",
  "crypto",
  "diagnostics_channel",
  "dns",
  "dns/promises",
  "events",
  "net",
  "path",
  "path/posix",
  "path/win32",
  "querystring",
  "module",
  "stream",
  "stream/consumers",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "url",
  "util",
  "util/types",
  "zlib"
];
const hybridModules = ["process"];
function getCloudflarePreset({
  compatibilityDate = "2024-09-03",
  compatibilityFlags = []
}) {
  const compat = {
    compatibilityDate,
    compatibilityFlags
  };
  const httpOverrides = getHttpOverrides(compat);
  const http2Overrides = getHttp2Overrides(compat);
  const osOverrides = getOsOverrides(compat);
  const fsOverrides = getFsOverrides(compat);
  const punycodeOverrides = getPunycodeOverrides(compat);
  const clusterOverrides = getClusterOverrides(compat);
  const traceEventsOverrides = getTraceEventsOverrides(compat);
  const domainOverrides = getDomainOverrides(compat);
  const wasiOverrides = getWasiOverrides(compat);
  const consoleOverrides = getConsoleOverrides(compat);
  const vmOverrides = getVmOverrides(compat);
  const inspectorOverrides = getInspectorOverrides(compat);
  const sqliteOverrides = getSqliteOverrides(compat);
  const dgramOverrides = getDgramOverrides(compat);
  const streamWrapOverrides = getStreamWrapOverrides(compat);
  const replOverrides = getReplOverrides(compat);
  const dynamicNativeModules = [
    ...nativeModules,
    ...httpOverrides.nativeModules,
    ...http2Overrides.nativeModules,
    ...osOverrides.nativeModules,
    ...fsOverrides.nativeModules,
    ...punycodeOverrides.nativeModules,
    ...clusterOverrides.nativeModules,
    ...traceEventsOverrides.nativeModules,
    ...domainOverrides.nativeModules,
    ...wasiOverrides.nativeModules,
    ...consoleOverrides.nativeModules,
    ...vmOverrides.nativeModules,
    ...inspectorOverrides.nativeModules,
    ...sqliteOverrides.nativeModules,
    ...dgramOverrides.nativeModules,
    ...streamWrapOverrides.nativeModules,
    ...replOverrides.nativeModules
  ];
  const dynamicHybridModules = [
    ...hybridModules,
    ...httpOverrides.hybridModules,
    ...http2Overrides.hybridModules,
    ...osOverrides.hybridModules,
    ...fsOverrides.hybridModules,
    ...punycodeOverrides.hybridModules,
    ...clusterOverrides.hybridModules,
    ...traceEventsOverrides.hybridModules,
    ...domainOverrides.hybridModules,
    ...wasiOverrides.hybridModules,
    ...consoleOverrides.hybridModules,
    ...vmOverrides.hybridModules,
    ...inspectorOverrides.hybridModules,
    ...sqliteOverrides.hybridModules,
    ...dgramOverrides.hybridModules,
    ...streamWrapOverrides.hybridModules,
    ...replOverrides.hybridModules
  ];
  return {
    meta: {
      name: "unenv:cloudflare",
      version,
      url: __filename
    },
    alias: {
      // `nodeCompatModules` are implemented in workerd.
      // Create aliases to override polyfills defined in based environments.
      ...Object.fromEntries(
        dynamicNativeModules.flatMap((p) => [
          [p, p],
          [`node:${p}`, `node:${p}`]
        ])
      ),
      // `hybridNodeCompatModules` are implemented by the cloudflare preset.
      ...Object.fromEntries(
        dynamicHybridModules.flatMap((m) => [
          [m, `@cloudflare/unenv-preset/node/${m}`],
          [`node:${m}`, `@cloudflare/unenv-preset/node/${m}`]
        ])
      )
    },
    inject: {
      // Setting symbols implemented by workerd to `false` so that `inject`s defined in base presets are not used.
      Buffer: false,
      global: false,
      clearImmediate: false,
      setImmediate: false,
      ...consoleOverrides.inject,
      process: "@cloudflare/unenv-preset/node/process"
    },
    polyfill: ["@cloudflare/unenv-preset/polyfill/performance"],
    external: dynamicNativeModules.flatMap((p) => [p, `node:${p}`])
  };
}
function getHttpOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const httpDisabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_http_modules"
  );
  const httpEnabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_http_modules"
  );
  const httpEnabledByDate = compatibilityDate >= "2025-08-15";
  const httpEnabled = (httpEnabledByFlag || httpEnabledByDate) && !httpDisabledByFlag;
  if (!httpEnabled) {
    return { nativeModules: [], hybridModules: [] };
  }
  const httpServerEnabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_http_server_modules"
  );
  const httpServerDisabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_http_server_modules"
  );
  const httpServerEnabledByDate = compatibilityDate >= "2025-09-01";
  const httpServerEnabled = (httpServerEnabledByFlag || httpServerEnabledByDate) && !httpServerDisabledByFlag;
  return {
    nativeModules: [
      "_http_agent",
      "_http_client",
      "_http_common",
      "_http_incoming",
      "_http_outgoing",
      // `_http_server` can only be imported when the server flag is set
      // See https://github.com/cloudflare/workerd/blob/56efc04/src/workerd/api/node/node.h#L102-L106
      ...httpServerEnabled ? ["_http_server"] : [],
      "http",
      "https"
    ],
    hybridModules: []
  };
}
function getHttp2Overrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_http2_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_http2_module"
  );
  const enabledByDate = compatibilityDate >= "2025-09-01";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["http2"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getOsOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_os_module"
  );
  const enabledByFlag = compatibilityFlags.includes("enable_nodejs_os_module");
  const enabledByDate = compatibilityDate >= "2025-09-15";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["os"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getFsOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_fs_module"
  );
  const enabledByFlag = compatibilityFlags.includes("enable_nodejs_fs_module");
  const enabledByDate = compatibilityDate >= "2025-09-15";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["fs/promises", "fs"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getPunycodeOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_punycode_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_punycode_module"
  );
  const enabledByDate = compatibilityDate >= "2025-12-04";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["punycode"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getClusterOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_cluster_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_cluster_module"
  );
  const enabledByDate = compatibilityDate >= "2025-12-04";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["cluster"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getTraceEventsOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_trace_events_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_trace_events_module"
  );
  const enabledByDate = compatibilityDate >= "2025-12-04";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["trace_events"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getDomainOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_domain_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_domain_module"
  );
  const enabledByDate = compatibilityDate >= "2025-12-04";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["domain"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getWasiOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_wasi_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_wasi_module"
  );
  const enabledByDate = compatibilityDate >= "2025-12-04";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["wasi"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getConsoleOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_console_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_console_module"
  );
  const enabledByDate = compatibilityDate >= "2025-09-21";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["console"],
    hybridModules: [],
    inject: {}
  } : {
    nativeModules: [],
    hybridModules: ["console"],
    inject: { console: "@cloudflare/unenv-preset/node/console" }
  };
}
function getVmOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_vm_module"
  );
  const enabledByFlag = compatibilityFlags.includes("enable_nodejs_vm_module");
  const enabledByDate = compatibilityDate >= "2025-10-01";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["vm"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getInspectorOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_inspector_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_inspector_module"
  );
  const enabledByDate = compatibilityDate >= "2026-01-29";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["inspector/promises", "inspector"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getSqliteOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_sqlite_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_sqlite_module"
  );
  const enabledByDate = compatibilityDate >= "2026-01-29";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["sqlite"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getDgramOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_dgram_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_dgram_module"
  );
  const enabledByDate = compatibilityDate >= "2026-01-29";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["dgram"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getStreamWrapOverrides({
  compatibilityDate,
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_stream_wrap_module"
  );
  const enabledByFlag = compatibilityFlags.includes(
    "enable_nodejs_stream_wrap_module"
  );
  const enabledByDate = compatibilityDate >= "2026-01-29";
  const enabled = (enabledByFlag || enabledByDate) && !disabledByFlag;
  return enabled ? {
    nativeModules: ["_stream_wrap"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}
function getReplOverrides({
  compatibilityFlags
}) {
  const disabledByFlag = compatibilityFlags.includes(
    "disable_nodejs_repl_module"
  );
  const enabledByFlag = compatibilityFlags.includes("enable_nodejs_repl_module") && compatibilityFlags.includes("experimental");
  const enabled = enabledByFlag && !disabledByFlag;
  return enabled ? {
    nativeModules: ["repl"],
    hybridModules: []
  } : {
    nativeModules: [],
    hybridModules: []
  };
}

const nonPrefixedNodeModules = [
  "_http_agent",
  "_http_client",
  "_http_common",
  "_http_incoming",
  "_http_outgoing",
  "_http_server",
  "_stream_duplex",
  "_stream_passthrough",
  "_stream_readable",
  "_stream_transform",
  "_stream_wrap",
  "_stream_writable",
  "_tls_common",
  "_tls_wrap",
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "dns/promises",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "inspector/promises",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "readline/promises",
  "repl",
  "stream",
  "stream/consumers",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib"
];
const cloudflare = getCloudflarePreset({});

export { cloudflare, getCloudflarePreset, nonPrefixedNodeModules };
