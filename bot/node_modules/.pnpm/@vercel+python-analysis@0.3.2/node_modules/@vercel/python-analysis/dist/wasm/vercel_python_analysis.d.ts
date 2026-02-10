// world root:component/root
import type * as WasiCliEnvironment from './interfaces/wasi-cli-environment.js'; // wasi:cli/environment@0.2.6
import type * as WasiCliExit from './interfaces/wasi-cli-exit.js'; // wasi:cli/exit@0.2.6
import type * as WasiCliStderr from './interfaces/wasi-cli-stderr.js'; // wasi:cli/stderr@0.2.6
import type * as WasiIoError from './interfaces/wasi-io-error.js'; // wasi:io/error@0.2.6
import type * as WasiIoStreams from './interfaces/wasi-io-streams.js'; // wasi:io/streams@0.2.6
export interface ImportObject {
  'wasi:cli/environment@0.2.6': typeof WasiCliEnvironment,
  'wasi:cli/exit@0.2.6': typeof WasiCliExit,
  'wasi:cli/stderr@0.2.6': typeof WasiCliStderr,
  'wasi:io/error@0.2.6': typeof WasiIoError,
  'wasi:io/streams@0.2.6': typeof WasiIoStreams,
}
export interface Root {
  containsAppOrHandler(source: string): boolean,
}

/**
* Instantiates this component with the provided imports and
* returns a map of all the exports of the component.
*
* This function is intended to be similar to the
* `WebAssembly.instantiate` function. The second `imports`
* argument is the "import object" for wasm, except here it
* uses component-model-layer types instead of core wasm
* integers/numbers/etc.
*
* The first argument to this function, `getCoreModule`, is
* used to compile core wasm modules within the component.
* Components are composed of core wasm modules and this callback
* will be invoked per core wasm module. The caller of this
* function is responsible for reading the core wasm module
* identified by `path` and returning its compiled
* `WebAssembly.Module` object. This would use `compileStreaming`
* on the web, for example.
*/
export function instantiate(
getCoreModule: (path: string) => WebAssembly.Module,
imports: ImportObject,
instantiateCore?: (module: WebAssembly.Module, imports: Record<string, any>) => WebAssembly.Instance
): Root;
export function instantiate(
getCoreModule: (path: string) => WebAssembly.Module | Promise<WebAssembly.Module>,
imports: ImportObject,
instantiateCore?: (module: WebAssembly.Module, imports: Record<string, any>) => WebAssembly.Instance | Promise<WebAssembly.Instance>
): Root | Promise<Root>;

