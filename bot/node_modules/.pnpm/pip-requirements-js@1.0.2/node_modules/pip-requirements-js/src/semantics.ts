import grammar from './pep-508.ohm-bundle'
import {
    Requirement,
    ProjectNameRequirement,
    ProjectURLRequirement,
    RequirementsFileRequirement,
    ConstraintsFileRequirement,
    EnvironmentMarker,
    EnvironmentMarkerNode,
    EnvironmentMarkerLeaf,
    EnvironmentMarkerVersionOperator,
    VersionSpec,
    PythonString,
    EnvironmentMarkerVariable,
    LooseProjectNameRequirement,
    LooseVersionSpec,
    WithLocation,
    SourceLocation,
    VersionSpecWithLocation,
    LooseVersionSpecWithLocation,
} from './types'

export const semantics = grammar.createSemantics()

function getLocation(node: any): SourceLocation {
    return {
        startIdx: node.source.startIdx,
        endIdx: node.source.endIdx,
    }
}

function withLocation<T>(node: any, data: T): WithLocation<T> {
    return {
        data,
        location: getLocation(node),
    }
}

semantics.addOperation<any>('extract', {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    File: (linesList): Requirement[] =>
        linesList
            .asIteration()
            .children.map((line) => line.extract())
            .filter(Boolean),
    Line: (req, _comment): Requirement | null => req.child(0)?.extract() || null,

    NameReq: (name, extras, versionSpec, markers): ProjectNameRequirement => ({
        type: 'ProjectName',
        name: name.sourceString,
        versionSpec: versionSpec.extract(),
        extras: extras.child(0)?.extract(),
        environmentMarkerTree: markers.child(0)?.extract(),
    }),
    UrlReq: (name, extras, url, _space, markers): ProjectURLRequirement => ({
        type: 'ProjectURL',
        name: name.sourceString,
        url: url.extract(),
        extras: extras.child(0)?.extract(),
        environmentMarkerTree: markers.child(0)?.extract(),
    }),
    Extras: (_open, extrasList, _close): string[] =>
        extrasList.asIteration().children.map((extra) => extra.sourceString),
    RequirementsReq: (_dashR, filePath): RequirementsFileRequirement => ({
        type: 'RequirementsFile',
        path: filePath.sourceString,
    }),
    ConstraintsReq: (_dashC, filePath): ConstraintsFileRequirement => ({
        type: 'ConstraintsFile',
        path: filePath.sourceString,
    }),

    UrlSpec: (_at, uriReference): string => uriReference.sourceString,

    QuotedMarker: (_semi, marker): string => marker.extract(),
    MarkerOr_node: (left, _or, right): EnvironmentMarkerNode => ({
        operator: 'or',
        left: left.extract(),
        right: right.extract(),
    }),
    MarkerAnd_node: (left, _and, right): EnvironmentMarkerNode => ({
        operator: 'and',
        left: left.extract(),
        right: right.extract(),
    }),
    MarkerExpr_leaf: (left, operator, right): EnvironmentMarkerLeaf => ({
        left: left.sourceString as EnvironmentMarkerVariable | PythonString,
        operator: operator.sourceString as EnvironmentMarkerVersionOperator,
        right: right.sourceString as PythonString | EnvironmentMarkerVariable,
    }),
    MarkerExpr_node: (_open, marker, _close): EnvironmentMarker => marker.extract(),

    VersionSpec_parenthesized: (_open, versionMany, _close): string[] => versionMany.extract() || [],
    VersionMany: (versionOnesList): VersionSpec[] | undefined => {
        const versionOnes = versionOnesList.asIteration().children
        if (versionOnes.length === 0) {
            return undefined
        }
        return versionOnes.map((versionOne) => versionOne.extract())
    },
    VersionOne: (operator, version): VersionSpec => ({
        operator: operator.sourceString as VersionSpec['operator'],
        version: version.sourceString,
    }),
    /* eslint-enable @typescript-eslint/no-unused-vars */
})

semantics.addOperation<any>('extractLoosely', {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    LooseFile: (linesList): LooseProjectNameRequirement[] =>
        linesList
            .asIteration()
            .children.map((line) => line.extractLoosely())
            .filter(Boolean),
    LooseLine: (req, _comment): LooseProjectNameRequirement | null => req.child(0)?.extractLoosely() || null,

    LooseNameReq: (name, extras, versionSpec, _markers): LooseProjectNameRequirement => ({
        type: 'ProjectName',
        name: name.sourceString,
        extras: extras.child(0)?.extractLoosely(),
        versionSpec: versionSpec.extractLoosely(),
    }),
    LooseNonNameReq: (_) => null,

    LooseExtras: (_open, extrasList, _trailingComma, _close): string[] =>
        extrasList.asIteration().children.map((extra) => extra.sourceString),

    LooseVersionSpec_parenthesized: (_open, versionMany, _close): string[] => versionMany.extractLoosely() || [],
    LooseVersionMany: (versionOnesList, _trailingComma): LooseVersionSpec[] | undefined => {
        const versionOnes = versionOnesList.asIteration().children
        if (versionOnes.length === 0) {
            return undefined
        }
        return versionOnes.map((versionOne) => versionOne.extractLoosely())
    },
    LooseVersionOne: (operator, version): LooseVersionSpec => {
        const result: LooseVersionSpec = {
            operator: operator.sourceString,
        }
        // Only add version if it was actually matched (not empty)
        if (version.sourceString) {
            result.version = version.sourceString
        }
        return result
    },
    /* eslint-enable @typescript-eslint/no-unused-vars */
})

semantics.addOperation<any>('extractWithLocation', {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    File: (linesList): Requirement[] =>
        linesList
            .asIteration()
            .children.map((line) => line.extractWithLocation())
            .filter(Boolean),
    Line: (req, _comment): Requirement | null => req.child(0)?.extractWithLocation() || null,

    NameReq: function (name, extras, versionSpec, markers) {
        return withLocation(this, {
            type: 'ProjectName',
            name: withLocation<string>(name, name.sourceString),
            versionSpec: versionSpec.extractWithLocation(),
            extras: extras.child(0)?.extractWithLocation(),
            environmentMarkerTree: markers.child(0)?.extractWithLocation(),
        })
    },
    UrlReq: function (name, extras, url, _space, markers) {
        return withLocation(this, {
            type: 'ProjectURL',
            name: withLocation<string>(name, name.sourceString),
            url: url.extractWithLocation(),
            extras: extras.child(0)?.extractWithLocation(),
            environmentMarkerTree: markers.child(0)?.extractWithLocation(),
        })
    },
    Extras: function (_open, extrasList, _close): WithLocation<string>[] {
        return extrasList.asIteration().children.map((extra) => withLocation<string>(extra, extra.sourceString))
    },
    RequirementsReq: function (_dashR, filePath) {
        return withLocation(this, {
            type: 'RequirementsFile',
            path: filePath.sourceString,
        })
    },
    ConstraintsReq: function (_dashC, filePath) {
        return withLocation(this, {
            type: 'ConstraintsFile',
            path: filePath.sourceString,
        })
    },

    UrlSpec: function (_at, uriReference) {
        return withLocation<string>(uriReference, uriReference.sourceString)
    },

    QuotedMarker: (_semi, marker): WithLocation<EnvironmentMarker> =>
        withLocation<EnvironmentMarker>(marker, marker.extract()),

    VersionSpec_parenthesized: (_open, versionMany, _close): WithLocation<VersionSpecWithLocation>[] =>
        versionMany.extractWithLocation() || [],
    VersionMany: (versionOnesList): WithLocation<VersionSpecWithLocation>[] | undefined => {
        const versionOnes = versionOnesList.asIteration().children
        if (versionOnes.length === 0) {
            return undefined
        }
        return versionOnes.map((versionOne) => versionOne.extractWithLocation())
    },
    VersionOne: function (operator, version) {
        return withLocation(this, {
            operator: withLocation<string>(operator, operator.sourceString as VersionSpec['operator']),
            version: withLocation<string>(version, version.sourceString),
        })
    },
    /* eslint-enable @typescript-eslint/no-unused-vars */
})

semantics.addOperation<any>('extractLooselyWithLocation', {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    LooseFile: (linesList): LooseProjectNameRequirement[] =>
        linesList
            .asIteration()
            .children.map((line) => line.extractLooselyWithLocation())
            .filter(Boolean),
    LooseLine: (req, _comment): LooseProjectNameRequirement | null =>
        req.child(0)?.extractLooselyWithLocation() || null,

    LooseNameReq: function (name, extras, versionSpec, _markers) {
        return withLocation(this, {
            type: 'ProjectName',
            name: withLocation<string>(name, name.sourceString),
            extras: extras.child(0)?.extractLooselyWithLocation(),
            versionSpec: versionSpec.extractLooselyWithLocation(),
        })
    },
    LooseNonNameReq: (_) => null,

    LooseExtras: function (_open, extrasList, _trailingComma, _close): WithLocation<string>[] {
        return extrasList.asIteration().children.map((extra) => withLocation<string>(extra, extra.sourceString))
    },

    LooseVersionSpec_parenthesized: (_open, versionMany, _close): WithLocation<LooseVersionSpecWithLocation>[] =>
        versionMany.extractLooselyWithLocation() || [],
    LooseVersionMany: (versionOnesList, _trailingComma): WithLocation<LooseVersionSpecWithLocation>[] | undefined => {
        const versionOnes = versionOnesList.asIteration().children
        if (versionOnes.length === 0) {
            return undefined
        }
        return versionOnes.map((versionOne) => versionOne.extractLooselyWithLocation())
    },
    LooseVersionOne: function (operator, version) {
        return withLocation(this, {
            operator: withLocation<string>(operator, operator.sourceString),
            ...(version.sourceString ? { version: withLocation<string>(version, version.sourceString) } : {}),
        })
    },
    /* eslint-enable @typescript-eslint/no-unused-vars */
})

export class RequirementsSyntaxError extends Error {}
