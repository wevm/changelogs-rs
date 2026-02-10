"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionOperator = exports.EnvironmentMarkerVariable = void 0;
/** {@link https://peps.python.org/pep-0508/#environment-markers See reference.} */
var EnvironmentMarkerVariable;
(function (EnvironmentMarkerVariable) {
    /** Python equivalent: `'.'.join(platform.python_version_tuple()[:2])` @example 3.11 */
    EnvironmentMarkerVariable["PythonVersion"] = "python_version";
    /** Python equivalent: `platform.python_version()` @example 3.11.2 */
    EnvironmentMarkerVariable["PythonFullVersion"] = "python_full_version";
    /** Python equivalent: `os.name` @example posix */
    EnvironmentMarkerVariable["OsName"] = "os_name";
    /** Python equivalent: `sys.platform` @example linux */
    EnvironmentMarkerVariable["SysPlatform"] = "sys_platform";
    /** Python equivalent: `platform.release()` @example 3.14.1-x86_64-linode39 */
    EnvironmentMarkerVariable["PlatformRelease"] = "platform_release";
    /** Python equivalent: `platform.system()` @example Windows */
    EnvironmentMarkerVariable["PlatformSystem"] = "platform_system";
    /** Python equivalent: `platform.version()` @example #1 SMP Debian 4.19 */
    EnvironmentMarkerVariable["PlatformVersion"] = "platform_version";
    /** Python equivalent: `platform.machine()` @example x86_64 */
    EnvironmentMarkerVariable["PlatformMachine"] = "platform_machine";
    /** Python equivalent: `platform.python_implementation()` @example CPython */
    EnvironmentMarkerVariable["PlatformPythonImplementation"] = "platform_python_implementation";
    /** Python equivalent: `sys.implementation.name` @example cpython */
    EnvironmentMarkerVariable["ImplementationName"] = "implementation_name";
    /** Python equivalent: processed `sys.implementation.version` @example 3.11.2 */
    EnvironmentMarkerVariable["ImplementationVersion"] = "implementation_version";
    /** An error except when defined by the context interpreting the specification @example test */
    EnvironmentMarkerVariable["Extra"] = "extra";
})(EnvironmentMarkerVariable || (exports.EnvironmentMarkerVariable = EnvironmentMarkerVariable = {}));
/** {@link https://peps.python.org/pep-0440/#version-specifiers See reference.} */
var VersionOperator;
(function (VersionOperator) {
    /** {@link https://peps.python.org/pep-0440/#compatible-release See reference.} */
    VersionOperator["CompatibleRelease"] = "~=";
    /** {@link https://peps.python.org/pep-0440/#version-matching See reference.} */
    VersionOperator["VersionMatching"] = "==";
    /** {@link https://peps.python.org/pep-0440/#version-exclusion See reference.} */
    VersionOperator["VersionExclusion"] = "!=";
    /** {@link https://peps.python.org/pep-0440/#inclusive-ordered-comparison See reference.} */
    VersionOperator["LessThanOrMatching"] = "<=";
    /** {@link https://peps.python.org/pep-0440/#inclusive-ordered-comparison See reference.} */
    VersionOperator["GreaterThanOrMatching"] = ">=";
    /** {@link https://peps.python.org/pep-0440/#exclusive-ordered-comparison See reference.} */
    VersionOperator["LessThan"] = "<";
    /** {@link https://peps.python.org/pep-0440/#exclusive-ordered-comparison See reference.} */
    VersionOperator["GreaterThan"] = ">";
    /** {@link https://peps.python.org/pep-0440/#arbitrary-equality See reference.} */
    VersionOperator["ArbitrarilyEqual"] = "===";
})(VersionOperator || (exports.VersionOperator = VersionOperator = {}));
//# sourceMappingURL=types.js.map