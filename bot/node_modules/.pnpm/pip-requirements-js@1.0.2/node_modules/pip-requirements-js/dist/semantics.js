"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementsSyntaxError = exports.semantics = void 0;
const pep_508_ohm_bundle_1 = __importDefault(require("./pep-508.ohm-bundle"));
exports.semantics = pep_508_ohm_bundle_1.default.createSemantics();
function getLocation(node) {
    return {
        startIdx: node.source.startIdx,
        endIdx: node.source.endIdx,
    };
}
function withLocation(node, data) {
    return {
        data,
        location: getLocation(node),
    };
}
exports.semantics.addOperation('extract', {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    File: (linesList) => linesList
        .asIteration()
        .children.map((line) => line.extract())
        .filter(Boolean),
    Line: (req, _comment) => { var _a; return ((_a = req.child(0)) === null || _a === void 0 ? void 0 : _a.extract()) || null; },
    NameReq: (name, extras, versionSpec, markers) => {
        var _a, _b;
        return ({
            type: 'ProjectName',
            name: name.sourceString,
            versionSpec: versionSpec.extract(),
            extras: (_a = extras.child(0)) === null || _a === void 0 ? void 0 : _a.extract(),
            environmentMarkerTree: (_b = markers.child(0)) === null || _b === void 0 ? void 0 : _b.extract(),
        });
    },
    UrlReq: (name, extras, url, _space, markers) => {
        var _a, _b;
        return ({
            type: 'ProjectURL',
            name: name.sourceString,
            url: url.extract(),
            extras: (_a = extras.child(0)) === null || _a === void 0 ? void 0 : _a.extract(),
            environmentMarkerTree: (_b = markers.child(0)) === null || _b === void 0 ? void 0 : _b.extract(),
        });
    },
    Extras: (_open, extrasList, _close) => extrasList.asIteration().children.map((extra) => extra.sourceString),
    RequirementsReq: (_dashR, filePath) => ({
        type: 'RequirementsFile',
        path: filePath.sourceString,
    }),
    ConstraintsReq: (_dashC, filePath) => ({
        type: 'ConstraintsFile',
        path: filePath.sourceString,
    }),
    UrlSpec: (_at, uriReference) => uriReference.sourceString,
    QuotedMarker: (_semi, marker) => marker.extract(),
    MarkerOr_node: (left, _or, right) => ({
        operator: 'or',
        left: left.extract(),
        right: right.extract(),
    }),
    MarkerAnd_node: (left, _and, right) => ({
        operator: 'and',
        left: left.extract(),
        right: right.extract(),
    }),
    MarkerExpr_leaf: (left, operator, right) => ({
        left: left.sourceString,
        operator: operator.sourceString,
        right: right.sourceString,
    }),
    MarkerExpr_node: (_open, marker, _close) => marker.extract(),
    VersionSpec_parenthesized: (_open, versionMany, _close) => versionMany.extract() || [],
    VersionMany: (versionOnesList) => {
        const versionOnes = versionOnesList.asIteration().children;
        if (versionOnes.length === 0) {
            return undefined;
        }
        return versionOnes.map((versionOne) => versionOne.extract());
    },
    VersionOne: (operator, version) => ({
        operator: operator.sourceString,
        version: version.sourceString,
    }),
    /* eslint-enable @typescript-eslint/no-unused-vars */
});
exports.semantics.addOperation('extractLoosely', {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    LooseFile: (linesList) => linesList
        .asIteration()
        .children.map((line) => line.extractLoosely())
        .filter(Boolean),
    LooseLine: (req, _comment) => { var _a; return ((_a = req.child(0)) === null || _a === void 0 ? void 0 : _a.extractLoosely()) || null; },
    LooseNameReq: (name, extras, versionSpec, _markers) => {
        var _a;
        return ({
            type: 'ProjectName',
            name: name.sourceString,
            extras: (_a = extras.child(0)) === null || _a === void 0 ? void 0 : _a.extractLoosely(),
            versionSpec: versionSpec.extractLoosely(),
        });
    },
    LooseNonNameReq: (_) => null,
    LooseExtras: (_open, extrasList, _trailingComma, _close) => extrasList.asIteration().children.map((extra) => extra.sourceString),
    LooseVersionSpec_parenthesized: (_open, versionMany, _close) => versionMany.extractLoosely() || [],
    LooseVersionMany: (versionOnesList, _trailingComma) => {
        const versionOnes = versionOnesList.asIteration().children;
        if (versionOnes.length === 0) {
            return undefined;
        }
        return versionOnes.map((versionOne) => versionOne.extractLoosely());
    },
    LooseVersionOne: (operator, version) => {
        const result = {
            operator: operator.sourceString,
        };
        // Only add version if it was actually matched (not empty)
        if (version.sourceString) {
            result.version = version.sourceString;
        }
        return result;
    },
    /* eslint-enable @typescript-eslint/no-unused-vars */
});
exports.semantics.addOperation('extractWithLocation', {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    File: (linesList) => linesList
        .asIteration()
        .children.map((line) => line.extractWithLocation())
        .filter(Boolean),
    Line: (req, _comment) => { var _a; return ((_a = req.child(0)) === null || _a === void 0 ? void 0 : _a.extractWithLocation()) || null; },
    NameReq: function (name, extras, versionSpec, markers) {
        var _a, _b;
        return withLocation(this, {
            type: 'ProjectName',
            name: withLocation(name, name.sourceString),
            versionSpec: versionSpec.extractWithLocation(),
            extras: (_a = extras.child(0)) === null || _a === void 0 ? void 0 : _a.extractWithLocation(),
            environmentMarkerTree: (_b = markers.child(0)) === null || _b === void 0 ? void 0 : _b.extractWithLocation(),
        });
    },
    UrlReq: function (name, extras, url, _space, markers) {
        var _a, _b;
        return withLocation(this, {
            type: 'ProjectURL',
            name: withLocation(name, name.sourceString),
            url: url.extractWithLocation(),
            extras: (_a = extras.child(0)) === null || _a === void 0 ? void 0 : _a.extractWithLocation(),
            environmentMarkerTree: (_b = markers.child(0)) === null || _b === void 0 ? void 0 : _b.extractWithLocation(),
        });
    },
    Extras: function (_open, extrasList, _close) {
        return extrasList.asIteration().children.map((extra) => withLocation(extra, extra.sourceString));
    },
    RequirementsReq: function (_dashR, filePath) {
        return withLocation(this, {
            type: 'RequirementsFile',
            path: filePath.sourceString,
        });
    },
    ConstraintsReq: function (_dashC, filePath) {
        return withLocation(this, {
            type: 'ConstraintsFile',
            path: filePath.sourceString,
        });
    },
    UrlSpec: function (_at, uriReference) {
        return withLocation(uriReference, uriReference.sourceString);
    },
    QuotedMarker: (_semi, marker) => withLocation(marker, marker.extract()),
    VersionSpec_parenthesized: (_open, versionMany, _close) => versionMany.extractWithLocation() || [],
    VersionMany: (versionOnesList) => {
        const versionOnes = versionOnesList.asIteration().children;
        if (versionOnes.length === 0) {
            return undefined;
        }
        return versionOnes.map((versionOne) => versionOne.extractWithLocation());
    },
    VersionOne: function (operator, version) {
        return withLocation(this, {
            operator: withLocation(operator, operator.sourceString),
            version: withLocation(version, version.sourceString),
        });
    },
    /* eslint-enable @typescript-eslint/no-unused-vars */
});
exports.semantics.addOperation('extractLooselyWithLocation', {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    LooseFile: (linesList) => linesList
        .asIteration()
        .children.map((line) => line.extractLooselyWithLocation())
        .filter(Boolean),
    LooseLine: (req, _comment) => { var _a; return ((_a = req.child(0)) === null || _a === void 0 ? void 0 : _a.extractLooselyWithLocation()) || null; },
    LooseNameReq: function (name, extras, versionSpec, _markers) {
        var _a;
        return withLocation(this, {
            type: 'ProjectName',
            name: withLocation(name, name.sourceString),
            extras: (_a = extras.child(0)) === null || _a === void 0 ? void 0 : _a.extractLooselyWithLocation(),
            versionSpec: versionSpec.extractLooselyWithLocation(),
        });
    },
    LooseNonNameReq: (_) => null,
    LooseExtras: function (_open, extrasList, _trailingComma, _close) {
        return extrasList.asIteration().children.map((extra) => withLocation(extra, extra.sourceString));
    },
    LooseVersionSpec_parenthesized: (_open, versionMany, _close) => versionMany.extractLooselyWithLocation() || [],
    LooseVersionMany: (versionOnesList, _trailingComma) => {
        const versionOnes = versionOnesList.asIteration().children;
        if (versionOnes.length === 0) {
            return undefined;
        }
        return versionOnes.map((versionOne) => versionOne.extractLooselyWithLocation());
    },
    LooseVersionOne: function (operator, version) {
        return withLocation(this, {
            operator: withLocation(operator, operator.sourceString),
            ...(version.sourceString ? { version: withLocation(version, version.sourceString) } : {}),
        });
    },
    /* eslint-enable @typescript-eslint/no-unused-vars */
});
class RequirementsSyntaxError extends Error {
}
exports.RequirementsSyntaxError = RequirementsSyntaxError;
//# sourceMappingURL=semantics.js.map