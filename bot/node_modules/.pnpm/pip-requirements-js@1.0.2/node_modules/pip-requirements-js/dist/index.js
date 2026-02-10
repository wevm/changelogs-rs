"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePipRequirementsLineLoosely = exports.parsePipRequirementsFileLoosely = exports.parsePipRequirementsLine = exports.parsePipRequirementsFile = exports.RequirementsSyntaxError = void 0;
const pep_508_ohm_bundle_1 = __importDefault(require("./pep-508.ohm-bundle"));
const semantics_1 = require("./semantics");
var semantics_2 = require("./semantics");
Object.defineProperty(exports, "RequirementsSyntaxError", { enumerable: true, get: function () { return semantics_2.RequirementsSyntaxError; } });
__exportStar(require("./types"), exports);
function parsePipRequirementsFile(fileContent, options) {
    const matchResult = pep_508_ohm_bundle_1.default.match(fileContent, 'File');
    if (matchResult.failed()) {
        throw new semantics_1.RequirementsSyntaxError(`Failed to parse requirements file. ${matchResult.shortMessage}`);
    }
    if (options === null || options === void 0 ? void 0 : options.includeLocations) {
        return (0, semantics_1.semantics)(matchResult).extractWithLocation();
    }
    return (0, semantics_1.semantics)(matchResult).extract();
}
exports.parsePipRequirementsFile = parsePipRequirementsFile;
function parsePipRequirementsLine(lineContent, options) {
    const matchResult = pep_508_ohm_bundle_1.default.match(lineContent, 'Line');
    if (matchResult.failed()) {
        throw new semantics_1.RequirementsSyntaxError(`Failed to parse requirements line. ${matchResult.shortMessage}`);
    }
    if (options === null || options === void 0 ? void 0 : options.includeLocations) {
        return (0, semantics_1.semantics)(matchResult).extractWithLocation();
    }
    return (0, semantics_1.semantics)(matchResult).extract();
}
exports.parsePipRequirementsLine = parsePipRequirementsLine;
function parsePipRequirementsFileLoosely(fileContent, options) {
    const matchResult = pep_508_ohm_bundle_1.default.match(fileContent, 'LooseFile');
    if (matchResult.failed()) {
        throw new semantics_1.RequirementsSyntaxError(`Failed to loosely parse requirements file. ${matchResult.shortMessage}`);
    }
    if (options === null || options === void 0 ? void 0 : options.includeLocations) {
        return (0, semantics_1.semantics)(matchResult).extractLooselyWithLocation();
    }
    return (0, semantics_1.semantics)(matchResult).extractLoosely();
}
exports.parsePipRequirementsFileLoosely = parsePipRequirementsFileLoosely;
function parsePipRequirementsLineLoosely(lineContent, options) {
    const matchResult = pep_508_ohm_bundle_1.default.match(lineContent, 'LooseLine');
    if (matchResult.failed()) {
        throw new semantics_1.RequirementsSyntaxError(`Failed to loosely parse requirements line. ${matchResult.shortMessage}`);
    }
    if (options === null || options === void 0 ? void 0 : options.includeLocations) {
        return (0, semantics_1.semantics)(matchResult).extractLooselyWithLocation();
    }
    return (0, semantics_1.semantics)(matchResult).extractLoosely();
}
exports.parsePipRequirementsLineLoosely = parsePipRequirementsLineLoosely;
//# sourceMappingURL=index.js.map