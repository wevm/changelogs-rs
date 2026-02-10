(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ohm = {}));
})(this, (function (exports) { 'use strict';

  // --------------------------------------------------------------------

  // --------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------

  function abstract(optMethodName) {
    const methodName = optMethodName || '';
    return function () {
      throw new Error(
        'this method ' +
          methodName +
          ' is abstract! ' +
          '(it has no implementation in class ' +
          this.constructor.name +
          ')'
      );
    };
  }

  function assert(cond, message) {
    if (!cond) {
      throw new Error(message || 'Assertion failed');
    }
  }

  // Define a lazily-computed, non-enumerable property named `propName`
  // on the object `obj`. `getterFn` will be called to compute the value the
  // first time the property is accessed.
  function defineLazyProperty(obj, propName, getterFn) {
    let memo;
    Object.defineProperty(obj, propName, {
      get() {
        if (!memo) {
          memo = getterFn.call(this);
        }
        return memo;
      },
    });
  }

  function clone(obj) {
    if (obj) {
      return Object.assign({}, obj);
    }
    return obj;
  }

  function repeatFn(fn, n) {
    const arr = [];
    while (n-- > 0) {
      arr.push(fn());
    }
    return arr;
  }

  function repeatStr(str, n) {
    return new Array(n + 1).join(str);
  }

  function repeat(x, n) {
    return repeatFn(() => x, n);
  }

  function getDuplicates(array) {
    const duplicates = [];
    for (let idx = 0; idx < array.length; idx++) {
      const x = array[idx];
      if (array.lastIndexOf(x) !== idx && duplicates.indexOf(x) < 0) {
        duplicates.push(x);
      }
    }
    return duplicates;
  }

  function copyWithoutDuplicates(array) {
    const noDuplicates = [];
    array.forEach(entry => {
      if (noDuplicates.indexOf(entry) < 0) {
        noDuplicates.push(entry);
      }
    });
    return noDuplicates;
  }

  function isSyntactic(ruleName) {
    const firstChar = ruleName[0];
    return firstChar === firstChar.toUpperCase();
  }

  function isLexical(ruleName) {
    return !isSyntactic(ruleName);
  }

  function padLeft(str, len, optChar) {
    const ch = optChar || ' ';
    if (str.length < len) {
      return repeatStr(ch, len - str.length) + str;
    }
    return str;
  }

  // StringBuffer

  function StringBuffer() {
    this.strings = [];
  }

  StringBuffer.prototype.append = function (str) {
    this.strings.push(str);
  };

  StringBuffer.prototype.contents = function () {
    return this.strings.join('');
  };

  const escapeUnicode = str => String.fromCodePoint(parseInt(str, 16));

  function unescapeCodePoint(s) {
    if (s.charAt(0) === '\\') {
      switch (s.charAt(1)) {
        case 'b':
          return '\b';
        case 'f':
          return '\f';
        case 'n':
          return '\n';
        case 'r':
          return '\r';
        case 't':
          return '\t';
        case 'v':
          return '\v';
        case 'x':
          return escapeUnicode(s.slice(2, 4));
        case 'u':
          return s.charAt(2) === '{'
            ? escapeUnicode(s.slice(3, -1))
            : escapeUnicode(s.slice(2, 6));
        default:
          return s.charAt(1);
      }
    } else {
      return s;
    }
  }

  // Helper for producing a description of an unknown object in a safe way.
  // Especially useful for error messages where an unexpected type of object was encountered.
  function unexpectedObjToString(obj) {
    if (obj == null) {
      return String(obj);
    }
    const baseToString = Object.prototype.toString.call(obj);
    try {
      let typeName;
      if (obj.constructor && obj.constructor.name) {
        typeName = obj.constructor.name;
      } else if (baseToString.indexOf('[object ') === 0) {
        typeName = baseToString.slice(8, -1); // Extract e.g. "Array" from "[object Array]".
      } else {
        typeName = typeof obj;
      }
      return typeName + ': ' + JSON.stringify(String(obj));
    } catch {
      return baseToString;
    }
  }

  function checkNotNull(obj, message = 'unexpected null value') {
    if (obj == null) {
      throw new Error(message);
    }
    return obj;
  }

  var common = /*#__PURE__*/Object.freeze({
    __proto__: null,
    abstract: abstract,
    assert: assert,
    defineLazyProperty: defineLazyProperty,
    clone: clone,
    repeatFn: repeatFn,
    repeatStr: repeatStr,
    repeat: repeat,
    getDuplicates: getDuplicates,
    copyWithoutDuplicates: copyWithoutDuplicates,
    isSyntactic: isSyntactic,
    isLexical: isLexical,
    padLeft: padLeft,
    StringBuffer: StringBuffer,
    unescapeCodePoint: unescapeCodePoint,
    unexpectedObjToString: unexpectedObjToString,
    checkNotNull: checkNotNull
  });

  // The full list of categories from:
  // https://www.unicode.org/Public/UCD/latest/ucd/extracted/DerivedGeneralCategory.txt.

  const toRegExp = val => new RegExp(String.raw`\p{${val}}`, 'u');

  /*
    grep -v '^#' DerivedGeneralCategory.txt \
      | cut -d';' -f2 \
      | awk 'NF{print $1}' \
      | sort -u \
      | awk '{printf "\x27%s\x27,\n",$1}'
   */

  const UnicodeCategories = Object.fromEntries(
    [
      'Cc',
      'Cf',
      'Cn',
      'Co',
      'Cs',
      'Ll',
      'Lm',
      'Lo',
      'Lt',
      'Lu',
      'Mc',
      'Me',
      'Mn',
      'Nd',
      'Nl',
      'No',
      'Pc',
      'Pd',
      'Pe',
      'Pf',
      'Pi',
      'Po',
      'Ps',
      'Sc',
      'Sk',
      'Sm',
      'So',
      'Zl',
      'Zp',
      'Zs',
    ].map(cat => [cat, toRegExp(cat)])
  );
  UnicodeCategories['Ltmo'] = /\p{Lt}|\p{Lm}|\p{Lo}/u;

  // We only support a few of these for now, but could add more later.
  // See https://www.unicode.org/Public/UCD/latest/ucd/PropertyAliases.txt
  const UnicodeBinaryProperties = Object.fromEntries(
    ['XID_Start', 'XID_Continue', 'White_Space'].map(prop => [prop, toRegExp(prop)])
  );

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  // General stuff

  class PExpr {
    constructor() {
      if (this.constructor === PExpr) {
        throw new Error("PExpr cannot be instantiated -- it's abstract");
      }
    }

    // Set the `source` property to the interval containing the source for this expression.
    withSource(interval) {
      if (interval) {
        this.source = interval.trimmed();
      }
      return this;
    }
  }

  // Any

  const any = Object.create(PExpr.prototype);

  // End

  const end = Object.create(PExpr.prototype);

  // Terminals

  class Terminal extends PExpr {
    constructor(obj) {
      super();
      this.obj = obj;
    }
  }

  // Ranges

  class Range extends PExpr {
    constructor(from, to) {
      super();
      this.from = from;
      this.to = to;
      // If either `from` or `to` is made up of multiple code units, then
      // the range should consume a full code point, not a single code unit.
      this.matchCodePoint = from.length > 1 || to.length > 1;
    }
  }

  // Parameters

  class Param extends PExpr {
    constructor(index) {
      super();
      this.index = index;
    }
  }

  // Alternation

  class Alt extends PExpr {
    constructor(terms) {
      super();
      this.terms = terms;
    }
  }

  // Extend is an implementation detail of rule extension

  class Extend extends Alt {
    constructor(superGrammar, name, body) {
      const origBody = superGrammar.rules[name].body;
      super([body, origBody]);

      this.superGrammar = superGrammar;
      this.name = name;
      this.body = body;
    }
  }

  // Splice is an implementation detail of rule overriding with the `...` operator.
  class Splice extends Alt {
    constructor(superGrammar, ruleName, beforeTerms, afterTerms) {
      const origBody = superGrammar.rules[ruleName].body;
      super([...beforeTerms, origBody, ...afterTerms]);

      this.superGrammar = superGrammar;
      this.ruleName = ruleName;
      this.expansionPos = beforeTerms.length;
    }
  }

  // Sequences

  class Seq extends PExpr {
    constructor(factors) {
      super();
      this.factors = factors;
    }
  }

  // Iterators and optionals

  class Iter extends PExpr {
    constructor(expr) {
      super();
      this.expr = expr;
    }
  }

  class Star extends Iter {}
  class Plus extends Iter {}
  class Opt extends Iter {}

  Star.prototype.operator = '*';
  Plus.prototype.operator = '+';
  Opt.prototype.operator = '?';

  Star.prototype.minNumMatches = 0;
  Plus.prototype.minNumMatches = 1;
  Opt.prototype.minNumMatches = 0;

  Star.prototype.maxNumMatches = Number.POSITIVE_INFINITY;
  Plus.prototype.maxNumMatches = Number.POSITIVE_INFINITY;
  Opt.prototype.maxNumMatches = 1;

  // Predicates

  class Not extends PExpr {
    constructor(expr) {
      super();
      this.expr = expr;
    }
  }

  class Lookahead extends PExpr {
    constructor(expr) {
      super();
      this.expr = expr;
    }
  }

  // "Lexification"

  class Lex extends PExpr {
    constructor(expr) {
      super();
      this.expr = expr;
    }
  }

  // Rule application

  class Apply extends PExpr {
    constructor(ruleName, args = []) {
      super();
      this.ruleName = ruleName;
      this.args = args;
    }

    isSyntactic() {
      return isSyntactic(this.ruleName);
    }

    // This method just caches the result of `this.toString()` in a non-enumerable property.
    toMemoKey() {
      if (!this._memoKey) {
        Object.defineProperty(this, '_memoKey', {value: this.toString()});
      }
      return this._memoKey;
    }
  }

  // Unicode character

  class UnicodeChar extends PExpr {
    constructor(categoryOrProp) {
      super();
      this.categoryOrProp = categoryOrProp;
      if (categoryOrProp in UnicodeCategories) {
        this.pattern = UnicodeCategories[categoryOrProp];
      } else if (categoryOrProp in UnicodeBinaryProperties) {
        this.pattern = UnicodeBinaryProperties[categoryOrProp];
      } else {
        throw new Error(
          `Invalid Unicode category or property name: ${JSON.stringify(categoryOrProp)}`
        );
      }
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  function createError(message, optInterval) {
    let e;
    if (optInterval) {
      e = new Error(optInterval.getLineAndColumnMessage() + message);
      e.shortMessage = message;
      e.interval = optInterval;
    } else {
      e = new Error(message);
    }
    return e;
  }

  // ----------------- errors about intervals -----------------

  function intervalSourcesDontMatch() {
    return createError("Interval sources don't match");
  }

  // ----------------- errors about grammars -----------------

  // Grammar syntax error

  function grammarSyntaxError(matchFailure) {
    const e = new Error();
    Object.defineProperty(e, 'message', {
      enumerable: true,
      get() {
        return matchFailure.message;
      },
    });
    Object.defineProperty(e, 'shortMessage', {
      enumerable: true,
      get() {
        return 'Expected ' + matchFailure.getExpectedText();
      },
    });
    e.interval = matchFailure.getInterval();
    return e;
  }

  // Undeclared grammar

  function undeclaredGrammar(grammarName, namespace, interval) {
    const message = namespace
      ? `Grammar ${grammarName} is not declared in namespace '${namespace}'`
      : 'Undeclared grammar ' + grammarName;
    return createError(message, interval);
  }

  // Duplicate grammar declaration

  function duplicateGrammarDeclaration(grammar, namespace) {
    return createError('Grammar ' + grammar.name + ' is already declared in this namespace');
  }

  function grammarDoesNotSupportIncrementalParsing(grammar) {
    return createError(`Grammar '${grammar.name}' does not support incremental parsing`);
  }

  // ----------------- rules -----------------

  // Undeclared rule

  function undeclaredRule(ruleName, grammarName, optInterval) {
    return createError(
      'Rule ' + ruleName + ' is not declared in grammar ' + grammarName,
      optInterval
    );
  }

  // Cannot override undeclared rule

  function cannotOverrideUndeclaredRule(ruleName, grammarName, optSource) {
    return createError(
      'Cannot override rule ' + ruleName + ' because it is not declared in ' + grammarName,
      optSource
    );
  }

  // Cannot extend undeclared rule

  function cannotExtendUndeclaredRule(ruleName, grammarName, optSource) {
    return createError(
      'Cannot extend rule ' + ruleName + ' because it is not declared in ' + grammarName,
      optSource
    );
  }

  // Duplicate rule declaration

  function duplicateRuleDeclaration(ruleName, grammarName, declGrammarName, optSource) {
    let message =
      "Duplicate declaration for rule '" + ruleName + "' in grammar '" + grammarName + "'";
    if (grammarName !== declGrammarName) {
      message += " (originally declared in '" + declGrammarName + "')";
    }
    return createError(message, optSource);
  }

  // Wrong number of parameters

  function wrongNumberOfParameters(ruleName, expected, actual, source) {
    return createError(
      'Wrong number of parameters for rule ' +
        ruleName +
        ' (expected ' +
        expected +
        ', got ' +
        actual +
        ')',
      source
    );
  }

  // Wrong number of arguments

  function wrongNumberOfArguments(ruleName, expected, actual, expr) {
    return createError(
      'Wrong number of arguments for rule ' +
        ruleName +
        ' (expected ' +
        expected +
        ', got ' +
        actual +
        ')',
      expr
    );
  }

  // Duplicate parameter names

  function duplicateParameterNames(ruleName, duplicates, source) {
    return createError(
      'Duplicate parameter names in rule ' + ruleName + ': ' + duplicates.join(', '),
      source
    );
  }

  // Invalid parameter expression

  function invalidParameter(ruleName, expr) {
    return createError(
      'Invalid parameter to rule ' +
        ruleName +
        ': ' +
        expr +
        ' has arity ' +
        expr.getArity() +
        ', but parameter expressions must have arity 1',
      expr.source
    );
  }

  // Application of syntactic rule from lexical rule

  const syntacticVsLexicalNote =
    'NOTE: A _syntactic rule_ is a rule whose name begins with a capital letter. ' +
    'See https://ohmjs.org/d/svl for more details.';

  function applicationOfSyntacticRuleFromLexicalContext(ruleName, applyExpr) {
    return createError(
      'Cannot apply syntactic rule ' + ruleName + ' from here (inside a lexical context)',
      applyExpr.source
    );
  }

  // Lexical rule application used with applySyntactic

  function applySyntacticWithLexicalRuleApplication(applyExpr) {
    const {ruleName} = applyExpr;
    return createError(
      `applySyntactic is for syntactic rules, but '${ruleName}' is a lexical rule. ` +
        syntacticVsLexicalNote,
      applyExpr.source
    );
  }

  // Application of applySyntactic in a syntactic context

  function unnecessaryExperimentalApplySyntactic(applyExpr) {
    return createError(
      'applySyntactic is not required here (in a syntactic context)',
      applyExpr.source
    );
  }

  // Incorrect argument type

  function incorrectArgumentType(expectedType, expr) {
    return createError('Incorrect argument type: expected ' + expectedType, expr.source);
  }

  // Multiple instances of the super-splice operator (`...`) in the rule body.

  function multipleSuperSplices(expr) {
    return createError("'...' can appear at most once in a rule body", expr.source);
  }

  // Unicode code point escapes

  function invalidCodePoint(applyWrapper) {
    const node = applyWrapper._node;
    assert(node && node.isNonterminal() && node.ctorName === 'escapeChar_unicodeCodePoint');

    // Get an interval that covers all of the hex digits.
    const digitIntervals = applyWrapper.children.slice(1, -1).map(d => d.source);
    const fullInterval = digitIntervals[0].coverageWith(...digitIntervals.slice(1));
    return createError(
      `U+${fullInterval.contents} is not a valid Unicode code point`,
      fullInterval
    );
  }

  // ----------------- Kleene operators -----------------

  function kleeneExprHasNullableOperand(kleeneExpr, applicationStack) {
    const actuals =
      applicationStack.length > 0 ? applicationStack[applicationStack.length - 1].args : [];
    const expr = kleeneExpr.expr.substituteParams(actuals);
    let message =
      'Nullable expression ' +
      expr +
      " is not allowed inside '" +
      kleeneExpr.operator +
      "' (possible infinite loop)";
    if (applicationStack.length > 0) {
      const stackTrace = applicationStack
        .map(app => new Apply(app.ruleName, app.args))
        .join('\n');
      message += '\nApplication stack (most recent application last):\n' + stackTrace;
    }
    return createError(message, kleeneExpr.expr.source);
  }

  // ----------------- arity -----------------

  function inconsistentArity(ruleName, expected, actual, expr) {
    return createError(
      'Rule ' +
        ruleName +
        ' involves an alternation which has inconsistent arity ' +
        '(expected ' +
        expected +
        ', got ' +
        actual +
        ')',
      expr.source
    );
  }

  // ----------------- convenience -----------------

  function multipleErrors(errors) {
    const messages = errors.map(e => e.message);
    return createError(['Errors:'].concat(messages).join('\n- '), errors[0].interval);
  }

  // ----------------- semantic -----------------

  function missingSemanticAction(ctorName, name, type, stack) {
    let stackTrace = stack
      .slice(0, -1)
      .map(info => {
        const ans = '  ' + info[0].name + ' > ' + info[1];
        return info.length === 3 ? ans + " for '" + info[2] + "'" : ans;
      })
      .join('\n');
    stackTrace += '\n  ' + name + ' > ' + ctorName;

    let moreInfo = '';
    if (ctorName === '_iter') {
      moreInfo = [
        '\nNOTE: as of Ohm v16, there is no default action for iteration nodes — see ',
        '  https://ohmjs.org/d/dsa for details.',
      ].join('\n');
    }

    const message = [
      `Missing semantic action for '${ctorName}' in ${type} '${name}'.${moreInfo}`,
      'Action stack (most recent call last):',
      stackTrace,
    ].join('\n');

    const e = createError(message);
    e.name = 'missingSemanticAction';
    return e;
  }

  function throwErrors(errors) {
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw multipleErrors(errors);
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  // Given an array of numbers `arr`, return an array of the numbers as strings,
  // right-justified and padded to the same length.
  function padNumbersToEqualLength(arr) {
    let maxLen = 0;
    const strings = arr.map(n => {
      const str = n.toString();
      maxLen = Math.max(maxLen, str.length);
      return str;
    });
    return strings.map(s => padLeft(s, maxLen));
  }

  // Produce a new string that would be the result of copying the contents
  // of the string `src` onto `dest` at offset `offest`.
  function strcpy(dest, src, offset) {
    const origDestLen = dest.length;
    const start = dest.slice(0, offset);
    const end = dest.slice(offset + src.length);
    return (start + src + end).substr(0, origDestLen);
  }

  // Casts the underlying lineAndCol object to a formatted message string,
  // highlighting `ranges`.
  function lineAndColumnToMessage(...ranges) {
    const lineAndCol = this;
    const {offset} = lineAndCol;
    const {repeatStr} = common;

    const sb = new StringBuffer();
    sb.append('Line ' + lineAndCol.lineNum + ', col ' + lineAndCol.colNum + ':\n');

    // An array of the previous, current, and next line numbers as strings of equal length.
    const lineNumbers = padNumbersToEqualLength([
      lineAndCol.prevLine == null ? 0 : lineAndCol.lineNum - 1,
      lineAndCol.lineNum,
      lineAndCol.nextLine == null ? 0 : lineAndCol.lineNum + 1,
    ]);

    // Helper for appending formatting input lines to the buffer.
    const appendLine = (num, content, prefix) => {
      sb.append(prefix + lineNumbers[num] + ' | ' + content + '\n');
    };

    // Include the previous line for context if possible.
    if (lineAndCol.prevLine != null) {
      appendLine(0, lineAndCol.prevLine, '  ');
    }
    // Line that the error occurred on.
    appendLine(1, lineAndCol.line, '> ');

    // Build up the line that points to the offset and possible indicates one or more ranges.
    // Start with a blank line, and indicate each range by overlaying a string of `~` chars.
    const lineLen = lineAndCol.line.length;
    let indicationLine = repeatStr(' ', lineLen + 1);
    for (let i = 0; i < ranges.length; ++i) {
      let startIdx = ranges[i][0];
      let endIdx = ranges[i][1];
      assert(startIdx >= 0 && startIdx <= endIdx, 'range start must be >= 0 and <= end');

      const lineStartOffset = offset - lineAndCol.colNum + 1;
      startIdx = Math.max(0, startIdx - lineStartOffset);
      endIdx = Math.min(endIdx - lineStartOffset, lineLen);

      indicationLine = strcpy(indicationLine, repeatStr('~', endIdx - startIdx), startIdx);
    }
    const gutterWidth = 2 + lineNumbers[1].length + 3;
    sb.append(repeatStr(' ', gutterWidth));
    indicationLine = strcpy(indicationLine, '^', lineAndCol.colNum - 1);
    sb.append(indicationLine.replace(/ +$/, '') + '\n');

    // Include the next line for context if possible.
    if (lineAndCol.nextLine != null) {
      appendLine(2, lineAndCol.nextLine, '  ');
    }
    return sb.contents();
  }

  // --------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------

  let builtInRulesCallbacks = [];

  // Since Grammar.BuiltInRules is bootstrapped, most of Ohm can't directly depend it.
  // This function allows modules that do depend on the built-in rules to register a callback
  // that will be called later in the initialization process.
  function awaitBuiltInRules(cb) {
    builtInRulesCallbacks.push(cb);
  }

  function announceBuiltInRules(grammar) {
    builtInRulesCallbacks.forEach(cb => {
      cb(grammar);
    });
    builtInRulesCallbacks = null;
  }

  // Return an object with the line and column information for the given
  // offset in `str`.
  function getLineAndColumn(str, offset) {
    let lineNum = 1;
    let colNum = 1;

    let currOffset = 0;
    let lineStartOffset = 0;

    let nextLine = null;
    let prevLine = null;
    let prevLineStartOffset = -1;

    while (currOffset < offset) {
      const c = str.charAt(currOffset++);
      if (c === '\n') {
        lineNum++;
        colNum = 1;
        prevLineStartOffset = lineStartOffset;
        lineStartOffset = currOffset;
      } else if (c !== '\r') {
        colNum++;
      }
    }

    // Find the end of the target line.
    let lineEndOffset = str.indexOf('\n', lineStartOffset);
    if (lineEndOffset === -1) {
      lineEndOffset = str.length;
    } else {
      // Get the next line.
      const nextLineEndOffset = str.indexOf('\n', lineEndOffset + 1);
      nextLine =
        nextLineEndOffset === -1
          ? str.slice(lineEndOffset)
          : str.slice(lineEndOffset, nextLineEndOffset);
      // Strip leading and trailing EOL char(s).
      nextLine = nextLine.replace(/^\r?\n/, '').replace(/\r$/, '');
    }

    // Get the previous line.
    if (prevLineStartOffset >= 0) {
      // Strip trailing EOL char(s).
      prevLine = str.slice(prevLineStartOffset, lineStartOffset).replace(/\r?\n$/, '');
    }

    // Get the target line, stripping a trailing carriage return if necessary.
    const line = str.slice(lineStartOffset, lineEndOffset).replace(/\r$/, '');

    return {
      offset,
      lineNum,
      colNum,
      line,
      prevLine,
      nextLine,
      toString: lineAndColumnToMessage,
    };
  }

  // Return a nicely-formatted string describing the line and column for the
  // given offset in `str` highlighting `ranges`.
  function getLineAndColumnMessage(str, offset, ...ranges) {
    return getLineAndColumn(str, offset).toString(...ranges);
  }

  const uniqueId = (() => {
    let idCounter = 0;
    return prefix => '' + prefix + idCounter++;
  })();

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  class Interval {
    constructor(sourceString, startIdx, endIdx) {
      // Store the full source in a non-enumerable property, so that when
      // grammars and other objects are printed in the REPL, it's not
      // cluttered with multiple copies of the same long string.
      Object.defineProperty(this, '_sourceString', {
        value: sourceString,
        configurable: false,
        enumerable: false,
        writable: false,
      });
      this.startIdx = startIdx;
      this.endIdx = endIdx;
    }

    get sourceString() {
      return this._sourceString;
    }

    get contents() {
      if (this._contents === undefined) {
        this._contents = this.sourceString.slice(this.startIdx, this.endIdx);
      }
      return this._contents;
    }

    get length() {
      return this.endIdx - this.startIdx;
    }

    coverageWith(...intervals) {
      return Interval.coverage(...intervals, this);
    }

    collapsedLeft() {
      return new Interval(this.sourceString, this.startIdx, this.startIdx);
    }

    collapsedRight() {
      return new Interval(this.sourceString, this.endIdx, this.endIdx);
    }

    getLineAndColumn() {
      return getLineAndColumn(this.sourceString, this.startIdx);
    }

    getLineAndColumnMessage() {
      const range = [this.startIdx, this.endIdx];
      return getLineAndColumnMessage(this.sourceString, this.startIdx, range);
    }

    // Returns an array of 0, 1, or 2 intervals that represents the result of the
    // interval difference operation.
    minus(that) {
      if (this.sourceString !== that.sourceString) {
        throw intervalSourcesDontMatch();
      } else if (this.startIdx === that.startIdx && this.endIdx === that.endIdx) {
        // `this` and `that` are the same interval!
        return [];
      } else if (this.startIdx < that.startIdx && that.endIdx < this.endIdx) {
        // `that` splits `this` into two intervals
        return [
          new Interval(this.sourceString, this.startIdx, that.startIdx),
          new Interval(this.sourceString, that.endIdx, this.endIdx),
        ];
      } else if (this.startIdx < that.endIdx && that.endIdx < this.endIdx) {
        // `that` contains a prefix of `this`
        return [new Interval(this.sourceString, that.endIdx, this.endIdx)];
      } else if (this.startIdx < that.startIdx && that.startIdx < this.endIdx) {
        // `that` contains a suffix of `this`
        return [new Interval(this.sourceString, this.startIdx, that.startIdx)];
      } else {
        // `that` and `this` do not overlap
        return [this];
      }
    }

    // Returns a new Interval that has the same extent as this one, but which is relative
    // to `that`, an Interval that fully covers this one.
    relativeTo(that) {
      if (this.sourceString !== that.sourceString) {
        throw intervalSourcesDontMatch();
      }
      assert(
        this.startIdx >= that.startIdx && this.endIdx <= that.endIdx,
        'other interval does not cover this one'
      );
      return new Interval(
        this.sourceString,
        this.startIdx - that.startIdx,
        this.endIdx - that.startIdx
      );
    }

    // Returns a new Interval which contains the same contents as this one,
    // but with whitespace trimmed from both ends.
    trimmed() {
      const {contents} = this;
      const startIdx = this.startIdx + contents.match(/^\s*/)[0].length;
      const endIdx = this.endIdx - contents.match(/\s*$/)[0].length;
      return new Interval(this.sourceString, startIdx, endIdx);
    }

    subInterval(offset, len) {
      const newStartIdx = this.startIdx + offset;
      return new Interval(this.sourceString, newStartIdx, newStartIdx + len);
    }
  }

  Interval.coverage = function (firstInterval, ...intervals) {
    let {startIdx, endIdx} = firstInterval;
    for (const interval of intervals) {
      if (interval.sourceString !== firstInterval.sourceString) {
        throw intervalSourcesDontMatch();
      } else {
        startIdx = Math.min(startIdx, interval.startIdx);
        endIdx = Math.max(endIdx, interval.endIdx);
      }
    }
    return new Interval(firstInterval.sourceString, startIdx, endIdx);
  };

  const MAX_CHAR_CODE = 0xffff;
  const MAX_CODE_POINT = 0x10ffff;

  class InputStream {
    constructor(source) {
      this.source = source;
      this.pos = 0;
      this.examinedLength = 0;
    }

    atEnd() {
      const ans = this.pos >= this.source.length;
      this.examinedLength = Math.max(this.examinedLength, this.pos + 1);
      return ans;
    }

    next() {
      const ans = this.source[this.pos++];
      this.examinedLength = Math.max(this.examinedLength, this.pos);
      return ans;
    }

    nextCharCode() {
      const nextChar = this.next();
      return nextChar && nextChar.charCodeAt(0);
    }

    nextCodePoint() {
      const cp = this.source.slice(this.pos++).codePointAt(0);
      // If the code point is beyond plane 0, it takes up two characters.
      if (cp > MAX_CHAR_CODE) {
        this.pos += 1;
      }
      this.examinedLength = Math.max(this.examinedLength, this.pos);
      return cp;
    }

    matchString(s, optIgnoreCase) {
      let idx;
      if (optIgnoreCase) {
        /*
          Case-insensitive comparison is a tricky business. Some notable gotchas include the
          "Turkish I" problem (http://www.i18nguy.com/unicode/turkish-i18n.html) and the fact
          that the German Esszet (ß) turns into "SS" in upper case.

          This is intended to be a locale-invariant comparison, which means it may not obey
          locale-specific expectations (e.g. "i" => "İ").

          See also https://unicode.org/faq/casemap_charprop.html#casemap
         */
        for (idx = 0; idx < s.length; idx++) {
          const actual = this.next();
          const expected = s[idx];
          if (actual == null || actual.toUpperCase() !== expected.toUpperCase()) {
            return false;
          }
        }
        return true;
      }
      // Default is case-sensitive comparison.
      for (idx = 0; idx < s.length; idx++) {
        if (this.next() !== s[idx]) {
          return false;
        }
      }
      return true;
    }

    sourceSlice(startIdx, endIdx) {
      return this.source.slice(startIdx, endIdx);
    }

    interval(startIdx, optEndIdx) {
      return new Interval(this.source, startIdx, optEndIdx ? optEndIdx : this.pos);
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  class MatchResult {
    constructor(
      matcher,
      input,
      startExpr,
      cst,
      cstOffset,
      rightmostFailurePosition,
      optRecordedFailures
    ) {
      this.matcher = matcher;
      this.input = input;
      this.startExpr = startExpr;
      this._cst = cst;
      this._cstOffset = cstOffset;
      this._rightmostFailurePosition = rightmostFailurePosition;
      this._rightmostFailures = optRecordedFailures;

      if (this.failed()) {
        defineLazyProperty(this, 'message', function () {
          const detail = 'Expected ' + this.getExpectedText();
          return (
            getLineAndColumnMessage(this.input, this.getRightmostFailurePosition()) + detail
          );
        });
        defineLazyProperty(this, 'shortMessage', function () {
          const detail = 'expected ' + this.getExpectedText();
          const errorInfo = getLineAndColumn(
            this.input,
            this.getRightmostFailurePosition()
          );
          return 'Line ' + errorInfo.lineNum + ', col ' + errorInfo.colNum + ': ' + detail;
        });
      }
    }

    succeeded() {
      return !!this._cst;
    }

    failed() {
      return !this.succeeded();
    }

    getRightmostFailurePosition() {
      return this._rightmostFailurePosition;
    }

    getRightmostFailures() {
      if (!this._rightmostFailures) {
        this.matcher.setInput(this.input);
        const matchResultWithFailures = this.matcher._match(this.startExpr, {
          tracing: false,
          positionToRecordFailures: this.getRightmostFailurePosition(),
        });
        this._rightmostFailures = matchResultWithFailures.getRightmostFailures();
      }
      return this._rightmostFailures;
    }

    toString() {
      return this.succeeded()
        ? '[match succeeded]'
        : '[match failed at position ' + this.getRightmostFailurePosition() + ']';
    }

    // Return a string summarizing the expected contents of the input stream when
    // the match failure occurred.
    getExpectedText() {
      if (this.succeeded()) {
        throw new Error('cannot get expected text of a successful MatchResult');
      }

      const sb = new StringBuffer();
      let failures = this.getRightmostFailures();

      // Filter out the fluffy failures to make the default error messages more useful
      failures = failures.filter(failure => !failure.isFluffy());

      for (let idx = 0; idx < failures.length; idx++) {
        if (idx > 0) {
          if (idx === failures.length - 1) {
            sb.append(failures.length > 2 ? ', or ' : ' or ');
          } else {
            sb.append(', ');
          }
        }
        sb.append(failures[idx].toString());
      }
      return sb.contents();
    }

    getInterval() {
      const pos = this.getRightmostFailurePosition();
      return new Interval(this.input, pos, pos);
    }
  }

  class PosInfo {
    constructor() {
      this.applicationMemoKeyStack = []; // active applications at this position
      this.memo = {};
      this.maxExaminedLength = 0;
      this.maxRightmostFailureOffset = -1;
      this.currentLeftRecursion = undefined;
    }

    isActive(application) {
      return this.applicationMemoKeyStack.indexOf(application.toMemoKey()) >= 0;
    }

    enter(application) {
      this.applicationMemoKeyStack.push(application.toMemoKey());
    }

    exit() {
      this.applicationMemoKeyStack.pop();
    }

    startLeftRecursion(headApplication, memoRec) {
      memoRec.isLeftRecursion = true;
      memoRec.headApplication = headApplication;
      memoRec.nextLeftRecursion = this.currentLeftRecursion;
      this.currentLeftRecursion = memoRec;

      const {applicationMemoKeyStack} = this;
      const indexOfFirstInvolvedRule =
        applicationMemoKeyStack.indexOf(headApplication.toMemoKey()) + 1;
      const involvedApplicationMemoKeys = applicationMemoKeyStack.slice(
        indexOfFirstInvolvedRule
      );

      memoRec.isInvolved = function (applicationMemoKey) {
        return involvedApplicationMemoKeys.indexOf(applicationMemoKey) >= 0;
      };

      memoRec.updateInvolvedApplicationMemoKeys = function () {
        for (let idx = indexOfFirstInvolvedRule; idx < applicationMemoKeyStack.length; idx++) {
          const applicationMemoKey = applicationMemoKeyStack[idx];
          if (!this.isInvolved(applicationMemoKey)) {
            involvedApplicationMemoKeys.push(applicationMemoKey);
          }
        }
      };
    }

    endLeftRecursion() {
      this.currentLeftRecursion = this.currentLeftRecursion.nextLeftRecursion;
    }

    // Note: this method doesn't get called for the "head" of a left recursion -- for LR heads,
    // the memoized result (which starts out being a failure) is always used.
    shouldUseMemoizedResult(memoRec) {
      if (!memoRec.isLeftRecursion) {
        return true;
      }
      const {applicationMemoKeyStack} = this;
      for (let idx = 0; idx < applicationMemoKeyStack.length; idx++) {
        const applicationMemoKey = applicationMemoKeyStack[idx];
        if (memoRec.isInvolved(applicationMemoKey)) {
          return false;
        }
      }
      return true;
    }

    memoize(memoKey, memoRec) {
      this.memo[memoKey] = memoRec;
      this.maxExaminedLength = Math.max(this.maxExaminedLength, memoRec.examinedLength);
      this.maxRightmostFailureOffset = Math.max(
        this.maxRightmostFailureOffset,
        memoRec.rightmostFailureOffset
      );
      return memoRec;
    }

    clearObsoleteEntries(pos, invalidatedIdx) {
      if (pos + this.maxExaminedLength <= invalidatedIdx) {
        // Optimization: none of the rule applications that were memoized here examined the
        // interval of the input that changed, so nothing has to be invalidated.
        return;
      }

      const {memo} = this;
      this.maxExaminedLength = 0;
      this.maxRightmostFailureOffset = -1;
      Object.keys(memo).forEach(k => {
        const memoRec = memo[k];
        if (pos + memoRec.examinedLength > invalidatedIdx) {
          delete memo[k];
        } else {
          this.maxExaminedLength = Math.max(this.maxExaminedLength, memoRec.examinedLength);
          this.maxRightmostFailureOffset = Math.max(
            this.maxRightmostFailureOffset,
            memoRec.rightmostFailureOffset
          );
        }
      });
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  // Unicode characters that are used in the `toString` output.
  const BALLOT_X = '\u2717';
  const CHECK_MARK = '\u2713';
  const DOT_OPERATOR = '\u22C5';
  const RIGHTWARDS_DOUBLE_ARROW = '\u21D2';
  const SYMBOL_FOR_HORIZONTAL_TABULATION = '\u2409';
  const SYMBOL_FOR_LINE_FEED = '\u240A';
  const SYMBOL_FOR_CARRIAGE_RETURN = '\u240D';

  const Flags = {
    succeeded: 1 << 0,
    isRootNode: 1 << 1,
    isImplicitSpaces: 1 << 2,
    isMemoized: 1 << 3,
    isHeadOfLeftRecursion: 1 << 4,
    terminatesLR: 1 << 5,
  };

  function spaces(n) {
    return repeat(' ', n).join('');
  }

  // Return a string representation of a portion of `input` at offset `pos`.
  // The result will contain exactly `len` characters.
  function getInputExcerpt(input, pos, len) {
    const excerpt = asEscapedString(input.slice(pos, pos + len));

    // Pad the output if necessary.
    if (excerpt.length < len) {
      return excerpt + repeat(' ', len - excerpt.length).join('');
    }
    return excerpt;
  }

  function asEscapedString(obj) {
    if (typeof obj === 'string') {
      // Replace non-printable characters with visible symbols.
      return obj
        .replace(/ /g, DOT_OPERATOR)
        .replace(/\t/g, SYMBOL_FOR_HORIZONTAL_TABULATION)
        .replace(/\n/g, SYMBOL_FOR_LINE_FEED)
        .replace(/\r/g, SYMBOL_FOR_CARRIAGE_RETURN);
    }
    return String(obj);
  }

  // ----------------- Trace -----------------

  class Trace {
    constructor(input, pos1, pos2, expr, succeeded, bindings, optChildren) {
      this.input = input;
      this.pos = this.pos1 = pos1;
      this.pos2 = pos2;
      this.source = new Interval(input, pos1, pos2);
      this.expr = expr;
      this.bindings = bindings;
      this.children = optChildren || [];
      this.terminatingLREntry = null;

      this._flags = succeeded ? Flags.succeeded : 0;
    }

    get displayString() {
      return this.expr.toDisplayString();
    }

    clone() {
      return this.cloneWithExpr(this.expr);
    }

    cloneWithExpr(expr) {
      const ans = new Trace(
        this.input,
        this.pos,
        this.pos2,
        expr,
        this.succeeded,
        this.bindings,
        this.children
      );

      ans.isHeadOfLeftRecursion = this.isHeadOfLeftRecursion;
      ans.isImplicitSpaces = this.isImplicitSpaces;
      ans.isMemoized = this.isMemoized;
      ans.isRootNode = this.isRootNode;
      ans.terminatesLR = this.terminatesLR;
      ans.terminatingLREntry = this.terminatingLREntry;
      return ans;
    }

    // Record the trace information for the terminating condition of the LR loop.
    recordLRTermination(ruleBodyTrace, value) {
      this.terminatingLREntry = new Trace(
        this.input,
        this.pos,
        this.pos2,
        this.expr,
        false,
        [value],
        [ruleBodyTrace]
      );
      this.terminatingLREntry.terminatesLR = true;
    }

    // Recursively traverse this trace node and all its descendents, calling a visitor function
    // for each node that is visited. If `vistorObjOrFn` is an object, then its 'enter' property
    // is a function to call before visiting the children of a node, and its 'exit' property is
    // a function to call afterwards. If `visitorObjOrFn` is a function, it represents the 'enter'
    // function.
    //
    // The functions are called with three arguments: the Trace node, its parent Trace, and a number
    // representing the depth of the node in the tree. (The root node has depth 0.) `optThisArg`, if
    // specified, is the value to use for `this` when executing the visitor functions.
    walk(visitorObjOrFn, optThisArg) {
      let visitor = visitorObjOrFn;
      if (typeof visitor === 'function') {
        visitor = {enter: visitor};
      }

      function _walk(node, parent, depth) {
        let recurse = true;
        if (visitor.enter) {
          if (visitor.enter.call(optThisArg, node, parent, depth) === Trace.prototype.SKIP) {
            recurse = false;
          }
        }
        if (recurse) {
          node.children.forEach(child => {
            _walk(child, node, depth + 1);
          });
          if (visitor.exit) {
            visitor.exit.call(optThisArg, node, parent, depth);
          }
        }
      }
      if (this.isRootNode) {
        // Don't visit the root node itself, only its children.
        this.children.forEach(c => {
          _walk(c, null, 0);
        });
      } else {
        _walk(this, null, 0);
      }
    }

    // Return a string representation of the trace.
    // Sample:
    //     12⋅+⋅2⋅*⋅3 ✓ exp ⇒  "12"
    //     12⋅+⋅2⋅*⋅3   ✓ addExp (LR) ⇒  "12"
    //     12⋅+⋅2⋅*⋅3       ✗ addExp_plus
    toString() {
      const sb = new StringBuffer();
      this.walk((node, parent, depth) => {
        if (!node) {
          return this.SKIP;
        }
        const ctorName = node.expr.constructor.name;
        // Don't print anything for Alt nodes.
        if (ctorName === 'Alt') {
          return;
        }
        sb.append(getInputExcerpt(node.input, node.pos, 10) + spaces(depth * 2 + 1));
        sb.append((node.succeeded ? CHECK_MARK : BALLOT_X) + ' ' + node.displayString);
        if (node.isHeadOfLeftRecursion) {
          sb.append(' (LR)');
        }
        if (node.succeeded) {
          const contents = asEscapedString(node.source.contents);
          sb.append(' ' + RIGHTWARDS_DOUBLE_ARROW + '  ');
          sb.append(typeof contents === 'string' ? '"' + contents + '"' : contents);
        }
        sb.append('\n');
      });
      return sb.contents();
    }
  }

  // A value that can be returned from visitor functions to indicate that a
  // node should not be recursed into.
  Trace.prototype.SKIP = {};

  // For convenience, create a getter and setter for the boolean flags in `Flags`.
  Object.keys(Flags).forEach(name => {
    const mask = Flags[name];
    Object.defineProperty(Trace.prototype, name, {
      get() {
        return (this._flags & mask) !== 0;
      },
      set(val) {
        if (val) {
          this._flags |= mask;
        } else {
          this._flags &= ~mask;
        }
      },
    });
  });

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Return true if we should skip spaces preceding this expression in a syntactic context.
  */
  PExpr.prototype.allowsSkippingPrecedingSpace = abstract('allowsSkippingPrecedingSpace');

  /*
    Generally, these are all first-order expressions and (with the exception of Apply)
    directly read from the input stream.
  */
  any.allowsSkippingPrecedingSpace =
    end.allowsSkippingPrecedingSpace =
    Apply.prototype.allowsSkippingPrecedingSpace =
    Terminal.prototype.allowsSkippingPrecedingSpace =
    Range.prototype.allowsSkippingPrecedingSpace =
    UnicodeChar.prototype.allowsSkippingPrecedingSpace =
      function () {
        return true;
      };

  /*
    Higher-order expressions that don't directly consume input.
  */
  Alt.prototype.allowsSkippingPrecedingSpace =
    Iter.prototype.allowsSkippingPrecedingSpace =
    Lex.prototype.allowsSkippingPrecedingSpace =
    Lookahead.prototype.allowsSkippingPrecedingSpace =
    Not.prototype.allowsSkippingPrecedingSpace =
    Param.prototype.allowsSkippingPrecedingSpace =
    Seq.prototype.allowsSkippingPrecedingSpace =
      function () {
        return false;
      };

  let BuiltInRules$1;

  awaitBuiltInRules(g => {
    BuiltInRules$1 = g;
  });

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  let lexifyCount;

  PExpr.prototype.assertAllApplicationsAreValid = function (ruleName, grammar) {
    lexifyCount = 0;
    this._assertAllApplicationsAreValid(ruleName, grammar);
  };

  PExpr.prototype._assertAllApplicationsAreValid = abstract(
    '_assertAllApplicationsAreValid'
  );

  any._assertAllApplicationsAreValid =
    end._assertAllApplicationsAreValid =
    Terminal.prototype._assertAllApplicationsAreValid =
    Range.prototype._assertAllApplicationsAreValid =
    Param.prototype._assertAllApplicationsAreValid =
    UnicodeChar.prototype._assertAllApplicationsAreValid =
      function (ruleName, grammar) {
        // no-op
      };

  Lex.prototype._assertAllApplicationsAreValid = function (ruleName, grammar) {
    lexifyCount++;
    this.expr._assertAllApplicationsAreValid(ruleName, grammar);
    lexifyCount--;
  };

  Alt.prototype._assertAllApplicationsAreValid = function (ruleName, grammar) {
    for (let idx = 0; idx < this.terms.length; idx++) {
      this.terms[idx]._assertAllApplicationsAreValid(ruleName, grammar);
    }
  };

  Seq.prototype._assertAllApplicationsAreValid = function (ruleName, grammar) {
    for (let idx = 0; idx < this.factors.length; idx++) {
      this.factors[idx]._assertAllApplicationsAreValid(ruleName, grammar);
    }
  };

  Iter.prototype._assertAllApplicationsAreValid =
    Not.prototype._assertAllApplicationsAreValid =
    Lookahead.prototype._assertAllApplicationsAreValid =
      function (ruleName, grammar) {
        this.expr._assertAllApplicationsAreValid(ruleName, grammar);
      };

  Apply.prototype._assertAllApplicationsAreValid = function (
    ruleName,
    grammar,
    skipSyntacticCheck = false
  ) {
    const ruleInfo = grammar.rules[this.ruleName];
    const isContextSyntactic = isSyntactic(ruleName) && lexifyCount === 0;

    // Make sure that the rule exists...
    if (!ruleInfo) {
      throw undeclaredRule(this.ruleName, grammar.name, this.source);
    }

    // ...and that this application is allowed
    if (!skipSyntacticCheck && isSyntactic(this.ruleName) && !isContextSyntactic) {
      throw applicationOfSyntacticRuleFromLexicalContext(this.ruleName, this);
    }

    // ...and that this application has the correct number of arguments.
    const actual = this.args.length;
    const expected = ruleInfo.formals.length;
    if (actual !== expected) {
      throw wrongNumberOfArguments(this.ruleName, expected, actual, this.source);
    }

    const isBuiltInApplySyntactic =
      BuiltInRules$1 && ruleInfo === BuiltInRules$1.rules.applySyntactic;
    const isBuiltInCaseInsensitive =
      BuiltInRules$1 && ruleInfo === BuiltInRules$1.rules.caseInsensitive;

    // If it's an application of 'caseInsensitive', ensure that the argument is a Terminal.
    if (isBuiltInCaseInsensitive) {
      if (!(this.args[0] instanceof Terminal)) {
        throw incorrectArgumentType('a Terminal (e.g. "abc")', this.args[0]);
      }
    }

    if (isBuiltInApplySyntactic) {
      const arg = this.args[0];
      if (!(arg instanceof Apply)) {
        throw incorrectArgumentType('a syntactic rule application', arg);
      }
      if (!isSyntactic(arg.ruleName)) {
        throw applySyntacticWithLexicalRuleApplication(arg);
      }
      if (isContextSyntactic) {
        throw unnecessaryExperimentalApplySyntactic(this);
      }
    }

    // ...and that all of the argument expressions only have valid applications and have arity 1.
    // If `this` is an application of the built-in applySyntactic rule, then its arg is
    // allowed (and expected) to be a syntactic rule, even if we're in a lexical context.
    this.args.forEach(arg => {
      arg._assertAllApplicationsAreValid(ruleName, grammar, isBuiltInApplySyntactic);
      if (arg.getArity() !== 1) {
        throw invalidParameter(this.ruleName, arg);
      }
    });
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.assertChoicesHaveUniformArity = abstract(
    'assertChoicesHaveUniformArity'
  );

  any.assertChoicesHaveUniformArity =
    end.assertChoicesHaveUniformArity =
    Terminal.prototype.assertChoicesHaveUniformArity =
    Range.prototype.assertChoicesHaveUniformArity =
    Param.prototype.assertChoicesHaveUniformArity =
    Lex.prototype.assertChoicesHaveUniformArity =
    UnicodeChar.prototype.assertChoicesHaveUniformArity =
      function (ruleName) {
        // no-op
      };

  Alt.prototype.assertChoicesHaveUniformArity = function (ruleName) {
    if (this.terms.length === 0) {
      return;
    }
    const arity = this.terms[0].getArity();
    for (let idx = 0; idx < this.terms.length; idx++) {
      const term = this.terms[idx];
      term.assertChoicesHaveUniformArity();
      const otherArity = term.getArity();
      if (arity !== otherArity) {
        throw inconsistentArity(ruleName, arity, otherArity, term);
      }
    }
  };

  Extend.prototype.assertChoicesHaveUniformArity = function (ruleName) {
    // Extend is a special case of Alt that's guaranteed to have exactly two
    // cases: [extensions, origBody].
    const actualArity = this.terms[0].getArity();
    const expectedArity = this.terms[1].getArity();
    if (actualArity !== expectedArity) {
      throw inconsistentArity(ruleName, expectedArity, actualArity, this.terms[0]);
    }
  };

  Seq.prototype.assertChoicesHaveUniformArity = function (ruleName) {
    for (let idx = 0; idx < this.factors.length; idx++) {
      this.factors[idx].assertChoicesHaveUniformArity(ruleName);
    }
  };

  Iter.prototype.assertChoicesHaveUniformArity = function (ruleName) {
    this.expr.assertChoicesHaveUniformArity(ruleName);
  };

  Not.prototype.assertChoicesHaveUniformArity = function (ruleName) {
    // no-op (not required b/c the nested expr doesn't show up in the CST)
  };

  Lookahead.prototype.assertChoicesHaveUniformArity = function (ruleName) {
    this.expr.assertChoicesHaveUniformArity(ruleName);
  };

  Apply.prototype.assertChoicesHaveUniformArity = function (ruleName) {
    // The arities of the parameter expressions is required to be 1 by
    // `assertAllApplicationsAreValid()`.
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.assertIteratedExprsAreNotNullable = abstract(
    'assertIteratedExprsAreNotNullable'
  );

  any.assertIteratedExprsAreNotNullable =
    end.assertIteratedExprsAreNotNullable =
    Terminal.prototype.assertIteratedExprsAreNotNullable =
    Range.prototype.assertIteratedExprsAreNotNullable =
    Param.prototype.assertIteratedExprsAreNotNullable =
    UnicodeChar.prototype.assertIteratedExprsAreNotNullable =
      function (grammar) {
        // no-op
      };

  Alt.prototype.assertIteratedExprsAreNotNullable = function (grammar) {
    for (let idx = 0; idx < this.terms.length; idx++) {
      this.terms[idx].assertIteratedExprsAreNotNullable(grammar);
    }
  };

  Seq.prototype.assertIteratedExprsAreNotNullable = function (grammar) {
    for (let idx = 0; idx < this.factors.length; idx++) {
      this.factors[idx].assertIteratedExprsAreNotNullable(grammar);
    }
  };

  Iter.prototype.assertIteratedExprsAreNotNullable = function (grammar) {
    // Note: this is the implementation of this method for `Star` and `Plus` expressions.
    // It is overridden for `Opt` below.
    this.expr.assertIteratedExprsAreNotNullable(grammar);
    if (this.expr.isNullable(grammar)) {
      throw kleeneExprHasNullableOperand(this, []);
    }
  };

  Opt.prototype.assertIteratedExprsAreNotNullable =
    Not.prototype.assertIteratedExprsAreNotNullable =
    Lookahead.prototype.assertIteratedExprsAreNotNullable =
    Lex.prototype.assertIteratedExprsAreNotNullable =
      function (grammar) {
        this.expr.assertIteratedExprsAreNotNullable(grammar);
      };

  Apply.prototype.assertIteratedExprsAreNotNullable = function (grammar) {
    this.args.forEach(arg => {
      arg.assertIteratedExprsAreNotNullable(grammar);
    });
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  class Node {
    constructor(matchLength) {
      this.matchLength = matchLength;
    }

    get ctorName() {
      throw new Error('subclass responsibility');
    }

    numChildren() {
      return this.children ? this.children.length : 0;
    }

    childAt(idx) {
      if (this.children) {
        return this.children[idx];
      }
    }

    indexOfChild(arg) {
      return this.children.indexOf(arg);
    }

    hasChildren() {
      return this.numChildren() > 0;
    }

    hasNoChildren() {
      return !this.hasChildren();
    }

    onlyChild() {
      if (this.numChildren() !== 1) {
        throw new Error(
          'cannot get only child of a node of type ' +
            this.ctorName +
            ' (it has ' +
            this.numChildren() +
            ' children)'
        );
      } else {
        return this.firstChild();
      }
    }

    firstChild() {
      if (this.hasNoChildren()) {
        throw new Error(
          'cannot get first child of a ' + this.ctorName + ' node, which has no children'
        );
      } else {
        return this.childAt(0);
      }
    }

    lastChild() {
      if (this.hasNoChildren()) {
        throw new Error(
          'cannot get last child of a ' + this.ctorName + ' node, which has no children'
        );
      } else {
        return this.childAt(this.numChildren() - 1);
      }
    }

    childBefore(child) {
      const childIdx = this.indexOfChild(child);
      if (childIdx < 0) {
        throw new Error('Node.childBefore() called w/ an argument that is not a child');
      } else if (childIdx === 0) {
        throw new Error('cannot get child before first child');
      } else {
        return this.childAt(childIdx - 1);
      }
    }

    childAfter(child) {
      const childIdx = this.indexOfChild(child);
      if (childIdx < 0) {
        throw new Error('Node.childAfter() called w/ an argument that is not a child');
      } else if (childIdx === this.numChildren() - 1) {
        throw new Error('cannot get child after last child');
      } else {
        return this.childAt(childIdx + 1);
      }
    }

    isTerminal() {
      return false;
    }

    isNonterminal() {
      return false;
    }

    isIteration() {
      return false;
    }

    isOptional() {
      return false;
    }
  }

  // Terminals

  class TerminalNode extends Node {
    get ctorName() {
      return '_terminal';
    }

    isTerminal() {
      return true;
    }

    get primitiveValue() {
      throw new Error('The `primitiveValue` property was removed in Ohm v17.');
    }
  }

  // Nonterminals

  class NonterminalNode extends Node {
    constructor(ruleName, children, childOffsets, matchLength) {
      super(matchLength);
      this.ruleName = ruleName;
      this.children = children;
      this.childOffsets = childOffsets;
    }

    get ctorName() {
      return this.ruleName;
    }

    isNonterminal() {
      return true;
    }

    isLexical() {
      return isLexical(this.ctorName);
    }

    isSyntactic() {
      return isSyntactic(this.ctorName);
    }
  }

  // Iterations

  class IterationNode extends Node {
    constructor(children, childOffsets, matchLength, isOptional) {
      super(matchLength);
      this.children = children;
      this.childOffsets = childOffsets;
      this.optional = isOptional;
    }

    get ctorName() {
      return '_iter';
    }

    isIteration() {
      return true;
    }

    isOptional() {
      return this.optional;
    }
  }

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Evaluate the expression and return `true` if it succeeds, `false` otherwise. This method should
    only be called directly by `State.prototype.eval(expr)`, which also updates the data structures
    that are used for tracing. (Making those updates in a method of `State` enables the trace-specific
    data structures to be "secrets" of that class, which is good for modularity.)

    The contract of this method is as follows:
    * When the return value is `true`,
      - the state object will have `expr.getArity()` more bindings than it did before the call.
    * When the return value is `false`,
      - the state object may have more bindings than it did before the call, and
      - its input stream's position may be anywhere.

    Note that `State.prototype.eval(expr)`, unlike this method, guarantees that neither the state
    object's bindings nor its input stream's position will change if the expression fails to match.
  */
  PExpr.prototype.eval = abstract('eval'); // function(state) { ... }

  any.eval = function (state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    const cp = inputStream.nextCodePoint();
    if (cp !== undefined) {
      state.pushBinding(new TerminalNode(String.fromCodePoint(cp).length), origPos);
      return true;
    } else {
      state.processFailure(origPos, this);
      return false;
    }
  };

  end.eval = function (state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    if (inputStream.atEnd()) {
      state.pushBinding(new TerminalNode(0), origPos);
      return true;
    } else {
      state.processFailure(origPos, this);
      return false;
    }
  };

  Terminal.prototype.eval = function (state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    if (!inputStream.matchString(this.obj)) {
      state.processFailure(origPos, this);
      return false;
    } else {
      state.pushBinding(new TerminalNode(this.obj.length), origPos);
      return true;
    }
  };

  Range.prototype.eval = function (state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;

    // A range can operate in one of two modes: matching a single, 16-bit _code unit_,
    // or matching a _code point_. (Code points over 0xFFFF take up two 16-bit code units.)
    const cp = this.matchCodePoint ? inputStream.nextCodePoint() : inputStream.nextCharCode();

    // Always compare by code point value to get the correct result in all scenarios.
    // Note that for strings of length 1, codePointAt(0) and charPointAt(0) are equivalent.
    if (cp !== undefined && this.from.codePointAt(0) <= cp && cp <= this.to.codePointAt(0)) {
      state.pushBinding(new TerminalNode(String.fromCodePoint(cp).length), origPos);
      return true;
    } else {
      state.processFailure(origPos, this);
      return false;
    }
  };

  Param.prototype.eval = function (state) {
    return state.eval(state.currentApplication().args[this.index]);
  };

  Lex.prototype.eval = function (state) {
    state.enterLexifiedContext();
    const ans = state.eval(this.expr);
    state.exitLexifiedContext();
    return ans;
  };

  Alt.prototype.eval = function (state) {
    for (let idx = 0; idx < this.terms.length; idx++) {
      if (state.eval(this.terms[idx])) {
        return true;
      }
    }
    return false;
  };

  Seq.prototype.eval = function (state) {
    for (let idx = 0; idx < this.factors.length; idx++) {
      const factor = this.factors[idx];
      if (!state.eval(factor)) {
        return false;
      }
    }
    return true;
  };

  Iter.prototype.eval = function (state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    const arity = this.getArity();
    const cols = [];
    const colOffsets = [];
    while (cols.length < arity) {
      cols.push([]);
      colOffsets.push([]);
    }

    let numMatches = 0;
    let prevPos = origPos;
    let idx;
    while (numMatches < this.maxNumMatches && state.eval(this.expr)) {
      if (inputStream.pos === prevPos) {
        throw kleeneExprHasNullableOperand(this, state._applicationStack);
      }
      prevPos = inputStream.pos;
      numMatches++;
      const row = state._bindings.splice(state._bindings.length - arity, arity);
      const rowOffsets = state._bindingOffsets.splice(
        state._bindingOffsets.length - arity,
        arity
      );
      for (idx = 0; idx < row.length; idx++) {
        cols[idx].push(row[idx]);
        colOffsets[idx].push(rowOffsets[idx]);
      }
    }
    if (numMatches < this.minNumMatches) {
      return false;
    }
    let offset = state.posToOffset(origPos);
    let matchLength = 0;
    if (numMatches > 0) {
      const lastCol = cols[arity - 1];
      const lastColOffsets = colOffsets[arity - 1];

      const endOffset =
        lastColOffsets[lastColOffsets.length - 1] + lastCol[lastCol.length - 1].matchLength;
      offset = colOffsets[0][0];
      matchLength = endOffset - offset;
    }
    const isOptional = this instanceof Opt;
    for (idx = 0; idx < cols.length; idx++) {
      state._bindings.push(
        new IterationNode(cols[idx], colOffsets[idx], matchLength, isOptional)
      );
      state._bindingOffsets.push(offset);
    }
    return true;
  };

  Not.prototype.eval = function (state) {
    /*
      TODO:
      - Right now we're just throwing away all of the failures that happen inside a `not`, and
        recording `this` as a failed expression.
      - Double negation should be equivalent to lookahead, but that's not the case right now wrt
        failures. E.g., ~~'foo' produces a failure for ~~'foo', but maybe it should produce
        a failure for 'foo' instead.
    */

    const {inputStream} = state;
    const origPos = inputStream.pos;
    state.pushFailuresInfo();

    const ans = state.eval(this.expr);

    state.popFailuresInfo();
    if (ans) {
      state.processFailure(origPos, this);
      return false;
    }

    inputStream.pos = origPos;
    return true;
  };

  Lookahead.prototype.eval = function (state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    if (state.eval(this.expr)) {
      inputStream.pos = origPos;
      return true;
    } else {
      return false;
    }
  };

  Apply.prototype.eval = function (state) {
    const caller = state.currentApplication();
    const actuals = caller ? caller.args : [];
    const app = this.substituteParams(actuals);

    const posInfo = state.getCurrentPosInfo();
    if (posInfo.isActive(app)) {
      // This rule is already active at this position, i.e., it is left-recursive.
      return app.handleCycle(state);
    }

    const memoKey = app.toMemoKey();
    const memoRec = posInfo.memo[memoKey];

    if (memoRec && posInfo.shouldUseMemoizedResult(memoRec)) {
      if (state.hasNecessaryInfo(memoRec)) {
        return state.useMemoizedResult(state.inputStream.pos, memoRec);
      }
      delete posInfo.memo[memoKey];
    }
    return app.reallyEval(state);
  };

  Apply.prototype.handleCycle = function (state) {
    const posInfo = state.getCurrentPosInfo();
    const {currentLeftRecursion} = posInfo;
    const memoKey = this.toMemoKey();
    let memoRec = posInfo.memo[memoKey];

    if (currentLeftRecursion && currentLeftRecursion.headApplication.toMemoKey() === memoKey) {
      // We already know about this left recursion, but it's possible there are "involved
      // applications" that we don't already know about, so...
      memoRec.updateInvolvedApplicationMemoKeys();
    } else if (!memoRec) {
      // New left recursion detected! Memoize a failure to try to get a seed parse.
      memoRec = posInfo.memoize(memoKey, {
        matchLength: 0,
        examinedLength: 0,
        value: false,
        rightmostFailureOffset: -1,
      });
      posInfo.startLeftRecursion(this, memoRec);
    }
    return state.useMemoizedResult(state.inputStream.pos, memoRec);
  };

  Apply.prototype.reallyEval = function (state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    const origPosInfo = state.getCurrentPosInfo();
    const ruleInfo = state.grammar.rules[this.ruleName];
    const {body} = ruleInfo;
    const {description} = ruleInfo;

    state.enterApplication(origPosInfo, this);

    if (description) {
      state.pushFailuresInfo();
    }

    // Reset the input stream's examinedLength property so that we can track
    // the examined length of this particular application.
    const origInputStreamExaminedLength = inputStream.examinedLength;
    inputStream.examinedLength = 0;

    let value = this.evalOnce(body, state);
    const currentLR = origPosInfo.currentLeftRecursion;
    const memoKey = this.toMemoKey();
    const isHeadOfLeftRecursion = currentLR && currentLR.headApplication.toMemoKey() === memoKey;
    let memoRec;

    if (state.doNotMemoize) {
      state.doNotMemoize = false;
    } else if (isHeadOfLeftRecursion) {
      value = this.growSeedResult(body, state, origPos, currentLR, value);
      origPosInfo.endLeftRecursion();
      memoRec = currentLR;
      memoRec.examinedLength = inputStream.examinedLength - origPos;
      memoRec.rightmostFailureOffset = state._getRightmostFailureOffset();
      origPosInfo.memoize(memoKey, memoRec); // updates origPosInfo's maxExaminedLength
    } else if (!currentLR || !currentLR.isInvolved(memoKey)) {
      // This application is not involved in left recursion, so it's ok to memoize it.
      memoRec = origPosInfo.memoize(memoKey, {
        matchLength: inputStream.pos - origPos,
        examinedLength: inputStream.examinedLength - origPos,
        value,
        failuresAtRightmostPosition: state.cloneRecordedFailures(),
        rightmostFailureOffset: state._getRightmostFailureOffset(),
      });
    }
    const succeeded = !!value;

    if (description) {
      state.popFailuresInfo();
      if (!succeeded) {
        state.processFailure(origPos, this);
      }
      if (memoRec) {
        memoRec.failuresAtRightmostPosition = state.cloneRecordedFailures();
      }
    }

    // Record trace information in the memo table, so that it is available if the memoized result
    // is used later.
    if (state.isTracing() && memoRec) {
      const entry = state.getTraceEntry(origPos, this, succeeded, succeeded ? [value] : []);
      if (isHeadOfLeftRecursion) {
        assert(entry.terminatingLREntry != null || !succeeded);
        entry.isHeadOfLeftRecursion = true;
      }
      memoRec.traceEntry = entry;
    }

    // Fix the input stream's examinedLength -- it should be the maximum examined length
    // across all applications, not just this one.
    inputStream.examinedLength = Math.max(
      inputStream.examinedLength,
      origInputStreamExaminedLength
    );

    state.exitApplication(origPosInfo, value);

    return succeeded;
  };

  Apply.prototype.evalOnce = function (expr, state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;

    if (state.eval(expr)) {
      const arity = expr.getArity();
      const bindings = state._bindings.splice(state._bindings.length - arity, arity);
      const offsets = state._bindingOffsets.splice(state._bindingOffsets.length - arity, arity);
      const matchLength = inputStream.pos - origPos;
      return new NonterminalNode(this.ruleName, bindings, offsets, matchLength);
    } else {
      return false;
    }
  };

  Apply.prototype.growSeedResult = function (body, state, origPos, lrMemoRec, newValue) {
    if (!newValue) {
      return false;
    }

    const {inputStream} = state;

    while (true) {
      lrMemoRec.matchLength = inputStream.pos - origPos;
      lrMemoRec.value = newValue;
      lrMemoRec.failuresAtRightmostPosition = state.cloneRecordedFailures();

      if (state.isTracing()) {
        // Before evaluating the body again, add a trace node for this application to the memo entry.
        // Its only child is a copy of the trace node from `newValue`, which will always be the last
        // element in `state.trace`.
        const seedTrace = state.trace[state.trace.length - 1];
        lrMemoRec.traceEntry = new Trace(
          state.input,
          origPos,
          inputStream.pos,
          this,
          true,
          [newValue],
          [seedTrace.clone()]
        );
      }
      inputStream.pos = origPos;
      newValue = this.evalOnce(body, state);
      if (inputStream.pos - origPos <= lrMemoRec.matchLength) {
        break;
      }
      if (state.isTracing()) {
        state.trace.splice(-2, 1); // Drop the trace for the old seed.
      }
    }
    if (state.isTracing()) {
      // The last entry is for an unused result -- pop it and save it in the "real" entry.
      lrMemoRec.traceEntry.recordLRTermination(state.trace.pop(), newValue);
    }
    inputStream.pos = origPos + lrMemoRec.matchLength;
    return lrMemoRec.value;
  };

  UnicodeChar.prototype.eval = function (state) {
    const {inputStream} = state;
    const origPos = inputStream.pos;
    const cp = inputStream.nextCodePoint();
    if (cp !== undefined && cp <= MAX_CODE_POINT) {
      const ch = String.fromCodePoint(cp);
      if (this.pattern.test(ch)) {
        state.pushBinding(new TerminalNode(ch.length), origPos);
        return true;
      }
    }
    state.processFailure(origPos, this);
    return false;
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.getArity = abstract('getArity');

  any.getArity =
    end.getArity =
    Terminal.prototype.getArity =
    Range.prototype.getArity =
    Param.prototype.getArity =
    Apply.prototype.getArity =
    UnicodeChar.prototype.getArity =
      function () {
        return 1;
      };

  Alt.prototype.getArity = function () {
    // This is ok b/c all terms must have the same arity -- this property is
    // checked by the Grammar constructor.
    return this.terms.length === 0 ? 0 : this.terms[0].getArity();
  };

  Seq.prototype.getArity = function () {
    let arity = 0;
    for (let idx = 0; idx < this.factors.length; idx++) {
      arity += this.factors[idx].getArity();
    }
    return arity;
  };

  Iter.prototype.getArity = function () {
    return this.expr.getArity();
  };

  Not.prototype.getArity = function () {
    return 0;
  };

  Lookahead.prototype.getArity = Lex.prototype.getArity = function () {
    return this.expr.getArity();
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  function getMetaInfo(expr, grammarInterval) {
    const metaInfo = {};
    if (expr.source && grammarInterval) {
      const adjusted = expr.source.relativeTo(grammarInterval);
      metaInfo.sourceInterval = [adjusted.startIdx, adjusted.endIdx];
    }
    return metaInfo;
  }

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.outputRecipe = abstract('outputRecipe');

  any.outputRecipe = function (formals, grammarInterval) {
    return ['any', getMetaInfo(this, grammarInterval)];
  };

  end.outputRecipe = function (formals, grammarInterval) {
    return ['end', getMetaInfo(this, grammarInterval)];
  };

  Terminal.prototype.outputRecipe = function (formals, grammarInterval) {
    return ['terminal', getMetaInfo(this, grammarInterval), this.obj];
  };

  Range.prototype.outputRecipe = function (formals, grammarInterval) {
    return ['range', getMetaInfo(this, grammarInterval), this.from, this.to];
  };

  Param.prototype.outputRecipe = function (formals, grammarInterval) {
    return ['param', getMetaInfo(this, grammarInterval), this.index];
  };

  Alt.prototype.outputRecipe = function (formals, grammarInterval) {
    return ['alt', getMetaInfo(this, grammarInterval)].concat(
      this.terms.map(term => term.outputRecipe(formals, grammarInterval))
    );
  };

  Extend.prototype.outputRecipe = function (formals, grammarInterval) {
    const extension = this.terms[0]; // [extension, original]
    return extension.outputRecipe(formals, grammarInterval);
  };

  Splice.prototype.outputRecipe = function (formals, grammarInterval) {
    const beforeTerms = this.terms.slice(0, this.expansionPos);
    const afterTerms = this.terms.slice(this.expansionPos + 1);
    return [
      'splice',
      getMetaInfo(this, grammarInterval),
      beforeTerms.map(term => term.outputRecipe(formals, grammarInterval)),
      afterTerms.map(term => term.outputRecipe(formals, grammarInterval)),
    ];
  };

  Seq.prototype.outputRecipe = function (formals, grammarInterval) {
    return ['seq', getMetaInfo(this, grammarInterval)].concat(
      this.factors.map(factor => factor.outputRecipe(formals, grammarInterval))
    );
  };

  Star.prototype.outputRecipe =
    Plus.prototype.outputRecipe =
    Opt.prototype.outputRecipe =
    Not.prototype.outputRecipe =
    Lookahead.prototype.outputRecipe =
    Lex.prototype.outputRecipe =
      function (formals, grammarInterval) {
        return [
          this.constructor.name.toLowerCase(),
          getMetaInfo(this, grammarInterval),
          this.expr.outputRecipe(formals, grammarInterval),
        ];
      };

  Apply.prototype.outputRecipe = function (formals, grammarInterval) {
    return [
      'app',
      getMetaInfo(this, grammarInterval),
      this.ruleName,
      this.args.map(arg => arg.outputRecipe(formals, grammarInterval)),
    ];
  };

  UnicodeChar.prototype.outputRecipe = function (formals, grammarInterval) {
    return ['unicodeChar', getMetaInfo(this, grammarInterval), this.categoryOrProp];
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Called at grammar creation time to rewrite a rule body, replacing each reference to a formal
    parameter with a `Param` node. Returns a PExpr -- either a new one, or the original one if
    it was modified in place.
  */
  PExpr.prototype.introduceParams = abstract('introduceParams');

  any.introduceParams =
    end.introduceParams =
    Terminal.prototype.introduceParams =
    Range.prototype.introduceParams =
    Param.prototype.introduceParams =
    UnicodeChar.prototype.introduceParams =
      function (formals) {
        return this;
      };

  Alt.prototype.introduceParams = function (formals) {
    this.terms.forEach((term, idx, terms) => {
      terms[idx] = term.introduceParams(formals);
    });
    return this;
  };

  Seq.prototype.introduceParams = function (formals) {
    this.factors.forEach((factor, idx, factors) => {
      factors[idx] = factor.introduceParams(formals);
    });
    return this;
  };

  Iter.prototype.introduceParams =
    Not.prototype.introduceParams =
    Lookahead.prototype.introduceParams =
    Lex.prototype.introduceParams =
      function (formals) {
        this.expr = this.expr.introduceParams(formals);
        return this;
      };

  Apply.prototype.introduceParams = function (formals) {
    const index = formals.indexOf(this.ruleName);
    if (index >= 0) {
      if (this.args.length > 0) {
        // TODO: Should this be supported? See issue #64.
        throw new Error('Parameterized rules cannot be passed as arguments to another rule.');
      }
      return new Param(index).withSource(this.source);
    } else {
      this.args.forEach((arg, idx, args) => {
        args[idx] = arg.introduceParams(formals);
      });
      return this;
    }
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  // Returns `true` if this parsing expression may accept without consuming any input.
  PExpr.prototype.isNullable = function (grammar) {
    return this._isNullable(grammar, Object.create(null));
  };

  PExpr.prototype._isNullable = abstract('_isNullable');

  any._isNullable =
    Range.prototype._isNullable =
    Param.prototype._isNullable =
    Plus.prototype._isNullable =
    UnicodeChar.prototype._isNullable =
      function (grammar, memo) {
        return false;
      };

  end._isNullable = function (grammar, memo) {
    return true;
  };

  Terminal.prototype._isNullable = function (grammar, memo) {
    if (typeof this.obj === 'string') {
      // This is an over-simplification: it's only correct if the input is a string. If it's an array
      // or an object, then the empty string parsing expression is not nullable.
      return this.obj === '';
    } else {
      return false;
    }
  };

  Alt.prototype._isNullable = function (grammar, memo) {
    return this.terms.length === 0 || this.terms.some(term => term._isNullable(grammar, memo));
  };

  Seq.prototype._isNullable = function (grammar, memo) {
    return this.factors.every(factor => factor._isNullable(grammar, memo));
  };

  Star.prototype._isNullable =
    Opt.prototype._isNullable =
    Not.prototype._isNullable =
    Lookahead.prototype._isNullable =
      function (grammar, memo) {
        return true;
      };

  Lex.prototype._isNullable = function (grammar, memo) {
    return this.expr._isNullable(grammar, memo);
  };

  Apply.prototype._isNullable = function (grammar, memo) {
    const key = this.toMemoKey();
    if (!Object.prototype.hasOwnProperty.call(memo, key)) {
      const {body} = grammar.rules[this.ruleName];
      const inlined = body.substituteParams(this.args);
      memo[key] = false; // Prevent infinite recursion for recursive rules.
      memo[key] = inlined._isNullable(grammar, memo);
    }
    return memo[key];
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Returns a PExpr that results from recursively replacing every formal parameter (i.e., instance
    of `Param`) inside this PExpr with its actual value from `actuals` (an Array).

    The receiver must not be modified; a new PExpr must be returned if any replacement is necessary.
  */
  // function(actuals) { ... }
  PExpr.prototype.substituteParams = abstract('substituteParams');

  any.substituteParams =
    end.substituteParams =
    Terminal.prototype.substituteParams =
    Range.prototype.substituteParams =
    UnicodeChar.prototype.substituteParams =
      function (actuals) {
        return this;
      };

  Param.prototype.substituteParams = function (actuals) {
    return checkNotNull(actuals[this.index]);
  };

  Alt.prototype.substituteParams = function (actuals) {
    return new Alt(this.terms.map(term => term.substituteParams(actuals)));
  };

  Seq.prototype.substituteParams = function (actuals) {
    return new Seq(this.factors.map(factor => factor.substituteParams(actuals)));
  };

  Iter.prototype.substituteParams =
    Not.prototype.substituteParams =
    Lookahead.prototype.substituteParams =
    Lex.prototype.substituteParams =
      function (actuals) {
        return new this.constructor(this.expr.substituteParams(actuals));
      };

  Apply.prototype.substituteParams = function (actuals) {
    if (this.args.length === 0) {
      // Avoid making a copy of this application, as an optimization
      return this;
    } else {
      const args = this.args.map(arg => arg.substituteParams(actuals));
      return new Apply(this.ruleName, args);
    }
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  function isRestrictedJSIdentifier(str) {
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(str);
  }

  function resolveDuplicatedNames(argumentNameList) {
    // `count` is used to record the number of times each argument name occurs in the list,
    // this is useful for checking duplicated argument name. It maps argument names to ints.
    const count = Object.create(null);
    argumentNameList.forEach(argName => {
      count[argName] = (count[argName] || 0) + 1;
    });

    // Append subscripts ('_1', '_2', ...) to duplicate argument names.
    Object.keys(count).forEach(dupArgName => {
      if (count[dupArgName] <= 1) {
        return;
      }

      // This name shows up more than once, so add subscripts.
      let subscript = 1;
      argumentNameList.forEach((argName, idx) => {
        if (argName === dupArgName) {
          argumentNameList[idx] = argName + '_' + subscript++;
        }
      });
    });
  }

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    Returns a list of strings that will be used as the default argument names for its receiver
    (a pexpr) in a semantic action. This is used exclusively by the Semantics Editor.

    `firstArgIndex` is the 1-based index of the first argument name that will be generated for this
    pexpr. It enables us to name arguments positionally, e.g., if the second argument is a
    non-alphanumeric terminal like "+", it will be named '$2'.

    `noDupCheck` is true if the caller of `toArgumentNameList` is not a top level caller. It enables
    us to avoid nested duplication subscripts appending, e.g., '_1_1', '_1_2', by only checking
    duplicates at the top level.

    Here is a more elaborate example that illustrates how this method works:
    `(a "+" b).toArgumentNameList(1)` evaluates to `['a', '$2', 'b']` with the following recursive
    calls:

      (a).toArgumentNameList(1) -> ['a'],
      ("+").toArgumentNameList(2) -> ['$2'],
      (b).toArgumentNameList(3) -> ['b']

    Notes:
    * This method must only be called on well-formed expressions, e.g., the receiver must
      not have any Alt sub-expressions with inconsistent arities.
    * e.getArity() === e.toArgumentNameList(1).length
  */
  // function(firstArgIndex, noDupCheck) { ... }
  PExpr.prototype.toArgumentNameList = abstract('toArgumentNameList');

  any.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    return ['any'];
  };

  end.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    return ['end'];
  };

  Terminal.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    if (typeof this.obj === 'string' && /^[_a-zA-Z0-9]+$/.test(this.obj)) {
      // If this terminal is a valid suffix for a JS identifier, just prepend it with '_'
      return ['_' + this.obj];
    } else {
      // Otherwise, name it positionally.
      return ['$' + firstArgIndex];
    }
  };

  Range.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    let argName = this.from + '_to_' + this.to;
    // If the `argName` is not valid then try to prepend a `_`.
    if (!isRestrictedJSIdentifier(argName)) {
      argName = '_' + argName;
    }
    // If the `argName` still not valid after prepending a `_`, then name it positionally.
    if (!isRestrictedJSIdentifier(argName)) {
      argName = '$' + firstArgIndex;
    }
    return [argName];
  };

  Alt.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    // `termArgNameLists` is an array of arrays where each row is the
    // argument name list that corresponds to a term in this alternation.
    const termArgNameLists = this.terms.map(term =>
      term.toArgumentNameList(firstArgIndex, true)
    );

    const argumentNameList = [];
    const numArgs = termArgNameLists[0].length;
    for (let colIdx = 0; colIdx < numArgs; colIdx++) {
      const col = [];
      for (let rowIdx = 0; rowIdx < this.terms.length; rowIdx++) {
        col.push(termArgNameLists[rowIdx][colIdx]);
      }
      const uniqueNames = copyWithoutDuplicates(col);
      argumentNameList.push(uniqueNames.join('_or_'));
    }

    if (!noDupCheck) {
      resolveDuplicatedNames(argumentNameList);
    }
    return argumentNameList;
  };

  Seq.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    // Generate the argument name list, without worrying about duplicates.
    let argumentNameList = [];
    this.factors.forEach(factor => {
      const factorArgumentNameList = factor.toArgumentNameList(firstArgIndex, true);
      argumentNameList = argumentNameList.concat(factorArgumentNameList);

      // Shift the firstArgIndex to take this factor's argument names into account.
      firstArgIndex += factorArgumentNameList.length;
    });
    if (!noDupCheck) {
      resolveDuplicatedNames(argumentNameList);
    }
    return argumentNameList;
  };

  Iter.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    const argumentNameList = this.expr
      .toArgumentNameList(firstArgIndex, noDupCheck)
      .map(exprArgumentString =>
        exprArgumentString[exprArgumentString.length - 1] === 's'
          ? exprArgumentString + 'es'
          : exprArgumentString + 's'
      );
    if (!noDupCheck) {
      resolveDuplicatedNames(argumentNameList);
    }
    return argumentNameList;
  };

  Opt.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    return this.expr.toArgumentNameList(firstArgIndex, noDupCheck).map(argName => {
      return 'opt' + argName[0].toUpperCase() + argName.slice(1);
    });
  };

  Not.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    return [];
  };

  Lookahead.prototype.toArgumentNameList = Lex.prototype.toArgumentNameList =
    function (firstArgIndex, noDupCheck) {
      return this.expr.toArgumentNameList(firstArgIndex, noDupCheck);
    };

  Apply.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    return [this.ruleName];
  };

  UnicodeChar.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    return ['$' + firstArgIndex];
  };

  Param.prototype.toArgumentNameList = function (firstArgIndex, noDupCheck) {
    return ['param' + this.index];
  };

  // "Value pexprs" (Value, Str, Arr, Obj) are going away soon, so we don't worry about them here.

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  // Returns a string representing the PExpr, for use as a UI label, etc.
  PExpr.prototype.toDisplayString = abstract('toDisplayString');

  Alt.prototype.toDisplayString = Seq.prototype.toDisplayString = function () {
    if (this.source) {
      return this.source.trimmed().contents;
    }
    return '[' + this.constructor.name + ']';
  };

  any.toDisplayString =
    end.toDisplayString =
    Iter.prototype.toDisplayString =
    Not.prototype.toDisplayString =
    Lookahead.prototype.toDisplayString =
    Lex.prototype.toDisplayString =
    Terminal.prototype.toDisplayString =
    Range.prototype.toDisplayString =
    Param.prototype.toDisplayString =
      function () {
        return this.toString();
      };

  Apply.prototype.toDisplayString = function () {
    if (this.args.length > 0) {
      const ps = this.args.map(arg => arg.toDisplayString());
      return this.ruleName + '<' + ps.join(',') + '>';
    } else {
      return this.ruleName;
    }
  };

  UnicodeChar.prototype.toDisplayString = function () {
    return 'Unicode [' + this.categoryOrProp + '] character';
  };

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  /*
    `Failure`s represent expressions that weren't matched while parsing. They are used to generate
    error messages automatically. The interface of `Failure`s includes the collowing methods:

    - getText() : String
    - getType() : String  (one of {"description", "string", "code"})
    - isDescription() : bool
    - isStringTerminal() : bool
    - isCode() : bool
    - isFluffy() : bool
    - makeFluffy() : void
    - subsumes(Failure) : bool
  */

  function isValidType(type) {
    return type === 'description' || type === 'string' || type === 'code';
  }

  class Failure {
    constructor(pexpr, text, type) {
      if (!isValidType(type)) {
        throw new Error('invalid Failure type: ' + type);
      }
      this.pexpr = pexpr;
      this.text = text;
      this.type = type;
      this.fluffy = false;
    }

    getPExpr() {
      return this.pexpr;
    }

    getText() {
      return this.text;
    }

    getType() {
      return this.type;
    }

    isDescription() {
      return this.type === 'description';
    }

    isStringTerminal() {
      return this.type === 'string';
    }

    isCode() {
      return this.type === 'code';
    }

    isFluffy() {
      return this.fluffy;
    }

    makeFluffy() {
      this.fluffy = true;
    }

    clearFluffy() {
      this.fluffy = false;
    }

    subsumes(that) {
      return (
        this.getText() === that.getText() &&
        this.type === that.type &&
        (!this.isFluffy() || (this.isFluffy() && that.isFluffy()))
      );
    }

    toString() {
      return this.type === 'string' ? JSON.stringify(this.getText()) : this.getText();
    }

    clone() {
      const failure = new Failure(this.pexpr, this.text, this.type);
      if (this.isFluffy()) {
        failure.makeFluffy();
      }
      return failure;
    }

    toKey() {
      return this.toString() + '#' + this.type;
    }
  }

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  PExpr.prototype.toFailure = abstract('toFailure');

  any.toFailure = function (grammar) {
    return new Failure(this, 'any object', 'description');
  };

  end.toFailure = function (grammar) {
    return new Failure(this, 'end of input', 'description');
  };

  Terminal.prototype.toFailure = function (grammar) {
    return new Failure(this, this.obj, 'string');
  };

  Range.prototype.toFailure = function (grammar) {
    // TODO: come up with something better
    return new Failure(this, JSON.stringify(this.from) + '..' + JSON.stringify(this.to), 'code');
  };

  Not.prototype.toFailure = function (grammar) {
    const description =
      this.expr === any ? 'nothing' : 'not ' + this.expr.toFailure(grammar);
    return new Failure(this, description, 'description');
  };

  Lookahead.prototype.toFailure = function (grammar) {
    return this.expr.toFailure(grammar);
  };

  Apply.prototype.toFailure = function (grammar) {
    let {description} = grammar.rules[this.ruleName];
    if (!description) {
      const article = /^[aeiouAEIOU]/.test(this.ruleName) ? 'an' : 'a';
      description = article + ' ' + this.ruleName;
    }
    return new Failure(this, description, 'description');
  };

  UnicodeChar.prototype.toFailure = function (grammar) {
    return new Failure(this, 'a Unicode [' + this.categoryOrProp + '] character', 'description');
  };

  Alt.prototype.toFailure = function (grammar) {
    const fs = this.terms.map(t => t.toFailure(grammar));
    const description = '(' + fs.join(' or ') + ')';
    return new Failure(this, description, 'description');
  };

  Seq.prototype.toFailure = function (grammar) {
    const fs = this.factors.map(f => f.toFailure(grammar));
    const description = '(' + fs.join(' ') + ')';
    return new Failure(this, description, 'description');
  };

  Iter.prototype.toFailure = function (grammar) {
    const description = '(' + this.expr.toFailure(grammar) + this.operator + ')';
    return new Failure(this, description, 'description');
  };

  // --------------------------------------------------------------------
  // Operations
  // --------------------------------------------------------------------

  /*
    e1.toString() === e2.toString() ==> e1 and e2 are semantically equivalent.
    Note that this is not an iff (<==>): e.g.,
    (~"b" "a").toString() !== ("a").toString(), even though
    ~"b" "a" and "a" are interchangeable in any grammar,
    both in terms of the languages they accept and their arities.
  */
  PExpr.prototype.toString = abstract('toString');

  any.toString = function () {
    return 'any';
  };

  end.toString = function () {
    return 'end';
  };

  Terminal.prototype.toString = function () {
    return JSON.stringify(this.obj);
  };

  Range.prototype.toString = function () {
    return JSON.stringify(this.from) + '..' + JSON.stringify(this.to);
  };

  Param.prototype.toString = function () {
    return '$' + this.index;
  };

  Lex.prototype.toString = function () {
    return '#(' + this.expr.toString() + ')';
  };

  Alt.prototype.toString = function () {
    return this.terms.length === 1
      ? this.terms[0].toString()
      : '(' + this.terms.map(term => term.toString()).join(' | ') + ')';
  };

  Seq.prototype.toString = function () {
    return this.factors.length === 1
      ? this.factors[0].toString()
      : '(' + this.factors.map(factor => factor.toString()).join(' ') + ')';
  };

  Iter.prototype.toString = function () {
    return this.expr + this.operator;
  };

  Not.prototype.toString = function () {
    return '~' + this.expr;
  };

  Lookahead.prototype.toString = function () {
    return '&' + this.expr;
  };

  Apply.prototype.toString = function () {
    if (this.args.length > 0) {
      const ps = this.args.map(arg => arg.toString());
      return this.ruleName + '<' + ps.join(',') + '>';
    } else {
      return this.ruleName;
    }
  };

  UnicodeChar.prototype.toString = function () {
    return '\\p{' + this.categoryOrProp + '}';
  };

  class CaseInsensitiveTerminal extends PExpr {
    constructor(param) {
      super();
      this.obj = param;
    }

    _getString(state) {
      const terminal = state.currentApplication().args[this.obj.index];
      assert(terminal instanceof Terminal, 'expected a Terminal expression');
      return terminal.obj;
    }

    // Implementation of the PExpr API

    allowsSkippingPrecedingSpace() {
      return true;
    }

    eval(state) {
      const {inputStream} = state;
      const origPos = inputStream.pos;
      const matchStr = this._getString(state);
      if (!inputStream.matchString(matchStr, true)) {
        state.processFailure(origPos, this);
        return false;
      } else {
        state.pushBinding(new TerminalNode(matchStr.length), origPos);
        return true;
      }
    }

    getArity() {
      return 1;
    }

    substituteParams(actuals) {
      return new CaseInsensitiveTerminal(this.obj.substituteParams(actuals));
    }

    toDisplayString() {
      return this.obj.toDisplayString() + ' (case-insensitive)';
    }

    toFailure(grammar) {
      return new Failure(
        this,
        this.obj.toFailure(grammar) + ' (case-insensitive)',
        'description'
      );
    }

    _isNullable(grammar, memo) {
      return this.obj._isNullable(grammar, memo);
    }
  }

  // --------------------------------------------------------------------

  var pexprs = /*#__PURE__*/Object.freeze({
    __proto__: null,
    CaseInsensitiveTerminal: CaseInsensitiveTerminal,
    PExpr: PExpr,
    any: any,
    end: end,
    Terminal: Terminal,
    Range: Range,
    Param: Param,
    Alt: Alt,
    Extend: Extend,
    Splice: Splice,
    Seq: Seq,
    Iter: Iter,
    Star: Star,
    Plus: Plus,
    Opt: Opt,
    Not: Not,
    Lookahead: Lookahead,
    Lex: Lex,
    Apply: Apply,
    UnicodeChar: UnicodeChar
  });

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  let builtInApplySyntacticBody;

  awaitBuiltInRules(builtInRules => {
    builtInApplySyntacticBody = builtInRules.rules.applySyntactic.body;
  });

  const applySpaces = new Apply('spaces');

  class MatchState {
    constructor(matcher, startExpr, optPositionToRecordFailures) {
      this.matcher = matcher;
      this.startExpr = startExpr;

      this.grammar = matcher.grammar;
      this.input = matcher.getInput();
      this.inputStream = new InputStream(this.input);
      this.memoTable = matcher._memoTable;

      this.userData = undefined;
      this.doNotMemoize = false;

      this._bindings = [];
      this._bindingOffsets = [];
      this._applicationStack = [];
      this._posStack = [0];
      this.inLexifiedContextStack = [false];

      this.rightmostFailurePosition = -1;
      this._rightmostFailurePositionStack = [];
      this._recordedFailuresStack = [];

      if (optPositionToRecordFailures !== undefined) {
        this.positionToRecordFailures = optPositionToRecordFailures;
        this.recordedFailures = Object.create(null);
      }
    }

    posToOffset(pos) {
      return pos - this._posStack[this._posStack.length - 1];
    }

    enterApplication(posInfo, app) {
      this._posStack.push(this.inputStream.pos);
      this._applicationStack.push(app);
      this.inLexifiedContextStack.push(false);
      posInfo.enter(app);
      this._rightmostFailurePositionStack.push(this.rightmostFailurePosition);
      this.rightmostFailurePosition = -1;
    }

    exitApplication(posInfo, optNode) {
      const origPos = this._posStack.pop();
      this._applicationStack.pop();
      this.inLexifiedContextStack.pop();
      posInfo.exit();

      this.rightmostFailurePosition = Math.max(
        this.rightmostFailurePosition,
        this._rightmostFailurePositionStack.pop()
      );

      if (optNode) {
        this.pushBinding(optNode, origPos);
      }
    }

    enterLexifiedContext() {
      this.inLexifiedContextStack.push(true);
    }

    exitLexifiedContext() {
      this.inLexifiedContextStack.pop();
    }

    currentApplication() {
      return this._applicationStack[this._applicationStack.length - 1];
    }

    inSyntacticContext() {
      const currentApplication = this.currentApplication();
      if (currentApplication) {
        return currentApplication.isSyntactic() && !this.inLexifiedContext();
      } else {
        // The top-level context is syntactic if the start application is.
        return this.startExpr.factors[0].isSyntactic();
      }
    }

    inLexifiedContext() {
      return this.inLexifiedContextStack[this.inLexifiedContextStack.length - 1];
    }

    skipSpaces() {
      this.pushFailuresInfo();
      this.eval(applySpaces);
      this.popBinding();
      this.popFailuresInfo();
      return this.inputStream.pos;
    }

    skipSpacesIfInSyntacticContext() {
      return this.inSyntacticContext() ? this.skipSpaces() : this.inputStream.pos;
    }

    maybeSkipSpacesBefore(expr) {
      if (expr.allowsSkippingPrecedingSpace() && expr !== applySpaces) {
        return this.skipSpacesIfInSyntacticContext();
      } else {
        return this.inputStream.pos;
      }
    }

    pushBinding(node, origPos) {
      this._bindings.push(node);
      this._bindingOffsets.push(this.posToOffset(origPos));
    }

    popBinding() {
      this._bindings.pop();
      this._bindingOffsets.pop();
    }

    numBindings() {
      return this._bindings.length;
    }

    truncateBindings(newLength) {
      // Yes, this is this really faster than setting the `length` property (tested with
      // bin/es5bench on Node v6.1.0).
      // Update 2021-10-25: still true on v14.15.5 — it's ~20% speedup on es5bench.
      while (this._bindings.length > newLength) {
        this.popBinding();
      }
    }

    getCurrentPosInfo() {
      return this.getPosInfo(this.inputStream.pos);
    }

    getPosInfo(pos) {
      let posInfo = this.memoTable[pos];
      if (!posInfo) {
        posInfo = this.memoTable[pos] = new PosInfo();
      }
      return posInfo;
    }

    processFailure(pos, expr) {
      this.rightmostFailurePosition = Math.max(this.rightmostFailurePosition, pos);

      if (this.recordedFailures && pos === this.positionToRecordFailures) {
        const app = this.currentApplication();
        if (app) {
          // Substitute parameters with the actual pexprs that were passed to
          // the current rule.
          expr = expr.substituteParams(app.args);
        }

        this.recordFailure(expr.toFailure(this.grammar), false);
      }
    }

    recordFailure(failure, shouldCloneIfNew) {
      const key = failure.toKey();
      if (!this.recordedFailures[key]) {
        this.recordedFailures[key] = shouldCloneIfNew ? failure.clone() : failure;
      } else if (this.recordedFailures[key].isFluffy() && !failure.isFluffy()) {
        this.recordedFailures[key].clearFluffy();
      }
    }

    recordFailures(failures, shouldCloneIfNew) {
      Object.keys(failures).forEach(key => {
        this.recordFailure(failures[key], shouldCloneIfNew);
      });
    }

    cloneRecordedFailures() {
      if (!this.recordedFailures) {
        return undefined;
      }

      const ans = Object.create(null);
      Object.keys(this.recordedFailures).forEach(key => {
        ans[key] = this.recordedFailures[key].clone();
      });
      return ans;
    }

    getRightmostFailurePosition() {
      return this.rightmostFailurePosition;
    }

    _getRightmostFailureOffset() {
      return this.rightmostFailurePosition >= 0
        ? this.posToOffset(this.rightmostFailurePosition)
        : -1;
    }

    // Returns the memoized trace entry for `expr` at `pos`, if one exists, `null` otherwise.
    getMemoizedTraceEntry(pos, expr) {
      const posInfo = this.memoTable[pos];
      if (posInfo && expr instanceof Apply) {
        const memoRec = posInfo.memo[expr.toMemoKey()];
        if (memoRec && memoRec.traceEntry) {
          const entry = memoRec.traceEntry.cloneWithExpr(expr);
          entry.isMemoized = true;
          return entry;
        }
      }
      return null;
    }

    // Returns a new trace entry, with the currently active trace array as its children.
    getTraceEntry(pos, expr, succeeded, bindings) {
      if (expr instanceof Apply) {
        const app = this.currentApplication();
        const actuals = app ? app.args : [];
        expr = expr.substituteParams(actuals);
      }
      return (
        this.getMemoizedTraceEntry(pos, expr) ||
        new Trace(this.input, pos, this.inputStream.pos, expr, succeeded, bindings, this.trace)
      );
    }

    isTracing() {
      return !!this.trace;
    }

    hasNecessaryInfo(memoRec) {
      if (this.trace && !memoRec.traceEntry) {
        return false;
      }

      if (
        this.recordedFailures &&
        this.inputStream.pos + memoRec.rightmostFailureOffset === this.positionToRecordFailures
      ) {
        return !!memoRec.failuresAtRightmostPosition;
      }

      return true;
    }

    useMemoizedResult(origPos, memoRec) {
      if (this.trace) {
        this.trace.push(memoRec.traceEntry);
      }

      const memoRecRightmostFailurePosition =
        this.inputStream.pos + memoRec.rightmostFailureOffset;
      this.rightmostFailurePosition = Math.max(
        this.rightmostFailurePosition,
        memoRecRightmostFailurePosition
      );
      if (
        this.recordedFailures &&
        this.positionToRecordFailures === memoRecRightmostFailurePosition &&
        memoRec.failuresAtRightmostPosition
      ) {
        this.recordFailures(memoRec.failuresAtRightmostPosition, true);
      }

      this.inputStream.examinedLength = Math.max(
        this.inputStream.examinedLength,
        memoRec.examinedLength + origPos
      );

      if (memoRec.value) {
        this.inputStream.pos += memoRec.matchLength;
        this.pushBinding(memoRec.value, origPos);
        return true;
      }
      return false;
    }

    // Evaluate `expr` and return `true` if it succeeded, `false` otherwise. On success, `bindings`
    // will have `expr.getArity()` more elements than before, and the input stream's position may
    // have increased. On failure, `bindings` and position will be unchanged.
    eval(expr) {
      const {inputStream} = this;
      const origNumBindings = this._bindings.length;
      const origUserData = this.userData;

      let origRecordedFailures;
      if (this.recordedFailures) {
        origRecordedFailures = this.recordedFailures;
        this.recordedFailures = Object.create(null);
      }

      const origPos = inputStream.pos;
      const memoPos = this.maybeSkipSpacesBefore(expr);

      let origTrace;
      if (this.trace) {
        origTrace = this.trace;
        this.trace = [];
      }

      // Do the actual evaluation.
      const ans = expr.eval(this);

      if (this.trace) {
        const bindings = this._bindings.slice(origNumBindings);
        const traceEntry = this.getTraceEntry(memoPos, expr, ans, bindings);
        traceEntry.isImplicitSpaces = expr === applySpaces;
        traceEntry.isRootNode = expr === this.startExpr;
        origTrace.push(traceEntry);
        this.trace = origTrace;
      }

      if (ans) {
        if (this.recordedFailures && inputStream.pos === this.positionToRecordFailures) {
          Object.keys(this.recordedFailures).forEach(key => {
            this.recordedFailures[key].makeFluffy();
          });
        }
      } else {
        // Reset the position, bindings, and userData.
        inputStream.pos = origPos;
        this.truncateBindings(origNumBindings);
        this.userData = origUserData;
      }

      if (this.recordedFailures) {
        this.recordFailures(origRecordedFailures, false);
      }

      // The built-in applySyntactic rule needs special handling: we want to skip
      // trailing spaces, just as with the top-level application of a syntactic rule.
      if (expr === builtInApplySyntacticBody) {
        this.skipSpaces();
      }

      return ans;
    }

    getMatchResult() {
      this.grammar._setUpMatchState(this);
      this.eval(this.startExpr);
      let rightmostFailures;
      if (this.recordedFailures) {
        rightmostFailures = Object.keys(this.recordedFailures).map(
          key => this.recordedFailures[key]
        );
      }
      const cst = this._bindings[0];
      if (cst) {
        cst.grammar = this.grammar;
      }
      return new MatchResult(
        this.matcher,
        this.input,
        this.startExpr,
        cst,
        this._bindingOffsets[0],
        this.rightmostFailurePosition,
        rightmostFailures
      );
    }

    getTrace() {
      this.trace = [];
      const matchResult = this.getMatchResult();

      // The trace node for the start rule is always the last entry. If it is a syntactic rule,
      // the first entry is for an application of 'spaces'.
      // TODO(pdubroy): Clean this up by introducing a special `Match<startAppl>` rule, which will
      // ensure that there is always a single root trace node.
      const rootTrace = this.trace[this.trace.length - 1];
      rootTrace.result = matchResult;
      return rootTrace;
    }

    pushFailuresInfo() {
      this._rightmostFailurePositionStack.push(this.rightmostFailurePosition);
      this._recordedFailuresStack.push(this.recordedFailures);
    }

    popFailuresInfo() {
      this.rightmostFailurePosition = this._rightmostFailurePositionStack.pop();
      this.recordedFailures = this._recordedFailuresStack.pop();
    }
  }

  class Matcher {
    constructor(grammar) {
      this.grammar = grammar;
      this._memoTable = [];
      this._input = '';
      this._isMemoTableStale = false;
    }

    _resetMemoTable() {
      this._memoTable = [];
      this._isMemoTableStale = false;
    }

    getInput() {
      return this._input;
    }

    setInput(str) {
      if (this._input !== str) {
        this.replaceInputRange(0, this._input.length, str);
      }
      return this;
    }

    replaceInputRange(startIdx, endIdx, str) {
      const prevInput = this._input;
      const memoTable = this._memoTable;
      if (
        startIdx < 0 ||
        startIdx > prevInput.length ||
        endIdx < 0 ||
        endIdx > prevInput.length ||
        startIdx > endIdx
      ) {
        throw new Error('Invalid indices: ' + startIdx + ' and ' + endIdx);
      }

      // update input
      this._input = prevInput.slice(0, startIdx) + str + prevInput.slice(endIdx);
      if (this._input !== prevInput && memoTable.length > 0) {
        this._isMemoTableStale = true;
      }

      // update memo table (similar to the above)
      const restOfMemoTable = memoTable.slice(endIdx);
      memoTable.length = startIdx;
      for (let idx = 0; idx < str.length; idx++) {
        memoTable.push(undefined);
      }
      for (const posInfo of restOfMemoTable) {
        memoTable.push(posInfo);
      }

      // Invalidate memoRecs
      for (let pos = 0; pos < startIdx; pos++) {
        const posInfo = memoTable[pos];
        if (posInfo) {
          posInfo.clearObsoleteEntries(pos, startIdx);
        }
      }

      return this;
    }

    match(optStartApplicationStr, options = {incremental: true}) {
      return this._match(this._getStartExpr(optStartApplicationStr), {
        incremental: options.incremental,
        tracing: false,
      });
    }

    trace(optStartApplicationStr, options = {incremental: true}) {
      return this._match(this._getStartExpr(optStartApplicationStr), {
        incremental: options.incremental,
        tracing: true,
      });
    }

    _match(startExpr, options = {}) {
      const opts = {
        tracing: false,
        incremental: true,
        positionToRecordFailures: undefined,
        ...options,
      };
      if (!opts.incremental) {
        this._resetMemoTable();
      } else if (this._isMemoTableStale && !this.grammar.supportsIncrementalParsing) {
        throw grammarDoesNotSupportIncrementalParsing(this.grammar);
      }

      const state = new MatchState(this, startExpr, opts.positionToRecordFailures);
      return opts.tracing ? state.getTrace() : state.getMatchResult();
    }

    /*
      Returns the starting expression for this Matcher's associated grammar. If
      `optStartApplicationStr` is specified, it is a string expressing a rule application in the
      grammar. If not specified, the grammar's default start rule will be used.
    */
    _getStartExpr(optStartApplicationStr) {
      const applicationStr = optStartApplicationStr || this.grammar.defaultStartRule;
      if (!applicationStr) {
        throw new Error('Missing start rule argument -- the grammar has no default start rule.');
      }

      const startApp = this.grammar.parseApplication(applicationStr);
      return new Seq([startApp, end]);
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  const globalActionStack = [];

  const hasOwnProperty = (x, prop) => Object.prototype.hasOwnProperty.call(x, prop);

  // ----------------- Wrappers -----------------

  // Wrappers decorate CST nodes with all of the functionality (i.e., operations and attributes)
  // provided by a Semantics (see below). `Wrapper` is the abstract superclass of all wrappers. A
  // `Wrapper` must have `_node` and `_semantics` instance variables, which refer to the CST node and
  // Semantics (resp.) for which it was created, and a `_childWrappers` instance variable which is
  // used to cache the wrapper instances that are created for its child nodes. Setting these instance
  // variables is the responsibility of the constructor of each Semantics-specific subclass of
  // `Wrapper`.
  class Wrapper {
    constructor(node, sourceInterval, baseInterval) {
      this._node = node;
      this.source = sourceInterval;

      // The interval that the childOffsets of `node` are relative to. It should be the source
      // of the closest Nonterminal node.
      this._baseInterval = baseInterval;

      if (node.isNonterminal()) {
        assert(sourceInterval === baseInterval);
      }
      this._childWrappers = [];
    }

    _forgetMemoizedResultFor(attributeName) {
      // Remove the memoized attribute from the cstNode and all its children.
      delete this._node[this._semantics.attributeKeys[attributeName]];
      this.children.forEach(child => {
        child._forgetMemoizedResultFor(attributeName);
      });
    }

    // Returns the wrapper of the specified child node. Child wrappers are created lazily and
    // cached in the parent wrapper's `_childWrappers` instance variable.
    child(idx) {
      if (!(0 <= idx && idx < this._node.numChildren())) {
        // TODO: Consider throwing an exception here.
        return undefined;
      }
      let childWrapper = this._childWrappers[idx];
      if (!childWrapper) {
        const childNode = this._node.childAt(idx);
        const offset = this._node.childOffsets[idx];

        const source = this._baseInterval.subInterval(offset, childNode.matchLength);
        const base = childNode.isNonterminal() ? source : this._baseInterval;
        childWrapper = this._childWrappers[idx] = this._semantics.wrap(childNode, source, base);
      }
      return childWrapper;
    }

    // Returns an array containing the wrappers of all of the children of the node associated
    // with this wrapper.
    _children() {
      // Force the creation of all child wrappers
      for (let idx = 0; idx < this._node.numChildren(); idx++) {
        this.child(idx);
      }
      return this._childWrappers;
    }

    // Returns `true` if the CST node associated with this wrapper corresponds to an iteration
    // expression, i.e., a Kleene-*, Kleene-+, or an optional. Returns `false` otherwise.
    isIteration() {
      return this._node.isIteration();
    }

    // Returns `true` if the CST node associated with this wrapper is a terminal node, `false`
    // otherwise.
    isTerminal() {
      return this._node.isTerminal();
    }

    // Returns `true` if the CST node associated with this wrapper is a nonterminal node, `false`
    // otherwise.
    isNonterminal() {
      return this._node.isNonterminal();
    }

    // Returns `true` if the CST node associated with this wrapper is a nonterminal node
    // corresponding to a syntactic rule, `false` otherwise.
    isSyntactic() {
      return this.isNonterminal() && this._node.isSyntactic();
    }

    // Returns `true` if the CST node associated with this wrapper is a nonterminal node
    // corresponding to a lexical rule, `false` otherwise.
    isLexical() {
      return this.isNonterminal() && this._node.isLexical();
    }

    // Returns `true` if the CST node associated with this wrapper is an iterator node
    // having either one or no child (? operator), `false` otherwise.
    // Otherwise, throws an exception.
    isOptional() {
      return this._node.isOptional();
    }

    // Create a new _iter wrapper in the same semantics as this wrapper.
    iteration(optChildWrappers) {
      const childWrappers = optChildWrappers || [];

      const childNodes = childWrappers.map(c => c._node);
      const iter = new IterationNode(childNodes, [], -1, false);

      const wrapper = this._semantics.wrap(iter, null, null);
      wrapper._childWrappers = childWrappers;
      return wrapper;
    }

    // Returns an array containing the children of this CST node.
    get children() {
      return this._children();
    }

    // Returns the name of grammar rule that created this CST node.
    get ctorName() {
      return this._node.ctorName;
    }

    // Returns the number of children of this CST node.
    get numChildren() {
      return this._node.numChildren();
    }

    // Returns the contents of the input stream consumed by this CST node.
    get sourceString() {
      return this.source.contents;
    }
  }

  // ----------------- Semantics -----------------

  // A Semantics is a container for a family of Operations and Attributes for a given grammar.
  // Semantics enable modularity (different clients of a grammar can create their set of operations
  // and attributes in isolation) and extensibility even when operations and attributes are mutually-
  // recursive. This constructor should not be called directly except from
  // `Semantics.createSemantics`. The normal ways to create a Semantics, given a grammar 'g', are
  // `g.createSemantics()` and `g.extendSemantics(parentSemantics)`.
  class Semantics {
    constructor(grammar, superSemantics) {
      const self = this;
      this.grammar = grammar;
      this.checkedActionDicts = false;

      // Constructor for wrapper instances, which are passed as the arguments to the semantic actions
      // of an operation or attribute. Operations and attributes require double dispatch: the semantic
      // action is chosen based on both the node's type and the semantics. Wrappers ensure that
      // the `execute` method is called with the correct (most specific) semantics object as an
      // argument.
      this.Wrapper = class extends (superSemantics ? superSemantics.Wrapper : Wrapper) {
        constructor(node, sourceInterval, baseInterval) {
          super(node, sourceInterval, baseInterval);
          self.checkActionDictsIfHaventAlready();
          this._semantics = self;
        }

        toString() {
          return '[semantics wrapper for ' + self.grammar.name + ']';
        }
      };

      this.super = superSemantics;
      if (superSemantics) {
        if (!(grammar.equals(this.super.grammar) || grammar._inheritsFrom(this.super.grammar))) {
          throw new Error(
            "Cannot extend a semantics for grammar '" +
              this.super.grammar.name +
              "' for use with grammar '" +
              grammar.name +
              "' (not a sub-grammar)"
          );
        }
        this.operations = Object.create(this.super.operations);
        this.attributes = Object.create(this.super.attributes);
        this.attributeKeys = Object.create(null);

        // Assign unique symbols for each of the attributes inherited from the super-semantics so that
        // they are memoized independently.

        for (const attributeName in this.attributes) {
          Object.defineProperty(this.attributeKeys, attributeName, {
            value: uniqueId(attributeName),
          });
        }
      } else {
        this.operations = Object.create(null);
        this.attributes = Object.create(null);
        this.attributeKeys = Object.create(null);
      }
    }

    toString() {
      return '[semantics for ' + this.grammar.name + ']';
    }

    checkActionDictsIfHaventAlready() {
      if (!this.checkedActionDicts) {
        this.checkActionDicts();
        this.checkedActionDicts = true;
      }
    }

    // Checks that the action dictionaries for all operations and attributes in this semantics,
    // including the ones that were inherited from the super-semantics, agree with the grammar.
    // Throws an exception if one or more of them doesn't.
    checkActionDicts() {
      let name;

      for (name in this.operations) {
        this.operations[name].checkActionDict(this.grammar);
      }

      for (name in this.attributes) {
        this.attributes[name].checkActionDict(this.grammar);
      }
    }

    toRecipe(semanticsOnly) {
      function hasSuperSemantics(s) {
        return s.super !== Semantics.BuiltInSemantics._getSemantics();
      }

      let str = '(function(g) {\n';
      if (hasSuperSemantics(this)) {
        str += '  var semantics = ' + this.super.toRecipe(true) + '(g';

        const superSemanticsGrammar = this.super.grammar;
        let relatedGrammar = this.grammar;
        while (relatedGrammar !== superSemanticsGrammar) {
          str += '.superGrammar';
          relatedGrammar = relatedGrammar.superGrammar;
        }

        str += ');\n';
        str += '  return g.extendSemantics(semantics)';
      } else {
        str += '  return g.createSemantics()';
      }
      ['Operation', 'Attribute'].forEach(type => {
        const semanticOperations = this[type.toLowerCase() + 's'];
        Object.keys(semanticOperations).forEach(name => {
          const {actionDict, formals, builtInDefault} = semanticOperations[name];

          let signature = name;
          if (formals.length > 0) {
            signature += '(' + formals.join(', ') + ')';
          }

          let method;
          if (hasSuperSemantics(this) && this.super[type.toLowerCase() + 's'][name]) {
            method = 'extend' + type;
          } else {
            method = 'add' + type;
          }
          str += '\n    .' + method + '(' + JSON.stringify(signature) + ', {';

          const srcArray = [];
          Object.keys(actionDict).forEach(actionName => {
            if (actionDict[actionName] !== builtInDefault) {
              let source = actionDict[actionName].toString().trim();

              // Convert method shorthand to plain old function syntax.
              // https://github.com/ohmjs/ohm/issues/263
              source = source.replace(/^.*\(/, 'function(');

              srcArray.push('\n      ' + JSON.stringify(actionName) + ': ' + source);
            }
          });
          str += srcArray.join(',') + '\n    })';
        });
      });
      str += ';\n  })';

      if (!semanticsOnly) {
        str =
          '(function() {\n' +
          '  var grammar = this.fromRecipe(' +
          this.grammar.toRecipe() +
          ');\n' +
          '  var semantics = ' +
          str +
          '(grammar);\n' +
          '  return semantics;\n' +
          '});\n';
      }

      return str;
    }

    addOperationOrAttribute(type, signature, actionDict) {
      const typePlural = type + 's';

      const parsedNameAndFormalArgs = parseSignature(signature, type);
      const {name} = parsedNameAndFormalArgs;
      const {formals} = parsedNameAndFormalArgs;

      // TODO: check that there are no duplicate formal arguments

      this.assertNewName(name, type);

      // Create the action dictionary for this operation / attribute that contains a `_default` action
      // which defines the default behavior of iteration, terminal, and non-terminal nodes...
      const builtInDefault = newDefaultAction(type, name, doIt);
      const realActionDict = {_default: builtInDefault};
      // ... and add in the actions supplied by the programmer, which may override some or all of the
      // default ones.
      Object.keys(actionDict).forEach(name => {
        realActionDict[name] = actionDict[name];
      });

      const entry =
        type === 'operation'
          ? new Operation(name, formals, realActionDict, builtInDefault)
          : new Attribute(name, realActionDict, builtInDefault);

      // The following check is not strictly necessary (it will happen later anyway) but it's better
      // to catch errors early.
      entry.checkActionDict(this.grammar);

      this[typePlural][name] = entry;

      function doIt(...args) {
        // Dispatch to most specific version of this operation / attribute -- it may have been
        // overridden by a sub-semantics.
        const thisThing = this._semantics[typePlural][name];

        // Check that the caller passed the correct number of arguments.
        if (arguments.length !== thisThing.formals.length) {
          throw new Error(
            'Invalid number of arguments passed to ' +
              name +
              ' ' +
              type +
              ' (expected ' +
              thisThing.formals.length +
              ', got ' +
              arguments.length +
              ')'
          );
        }

        // Create an "arguments object" from the arguments that were passed to this
        // operation / attribute.
        const argsObj = Object.create(null);
        for (const [idx, val] of Object.entries(args)) {
          const formal = thisThing.formals[idx];
          argsObj[formal] = val;
        }

        const oldArgs = this.args;
        this.args = argsObj;
        const ans = thisThing.execute(this._semantics, this);
        this.args = oldArgs;
        return ans;
      }

      if (type === 'operation') {
        this.Wrapper.prototype[name] = doIt;
        this.Wrapper.prototype[name].toString = function () {
          return '[' + name + ' operation]';
        };
      } else {
        Object.defineProperty(this.Wrapper.prototype, name, {
          get: doIt,
          configurable: true, // So the property can be deleted.
        });
        Object.defineProperty(this.attributeKeys, name, {
          value: uniqueId(name),
        });
      }
    }

    extendOperationOrAttribute(type, name, actionDict) {
      const typePlural = type + 's';

      // Make sure that `name` really is just a name, i.e., that it doesn't also contain formals.
      parseSignature(name, 'attribute');

      if (!(this.super && name in this.super[typePlural])) {
        throw new Error(
          'Cannot extend ' +
            type +
            " '" +
            name +
            "': did not inherit an " +
            type +
            ' with that name'
        );
      }
      if (hasOwnProperty(this[typePlural], name)) {
        throw new Error('Cannot extend ' + type + " '" + name + "' again");
      }

      // Create a new operation / attribute whose actionDict delegates to the super operation /
      // attribute's actionDict, and which has all the keys from `inheritedActionDict`.
      const inheritedFormals = this[typePlural][name].formals;
      const inheritedActionDict = this[typePlural][name].actionDict;
      const newActionDict = Object.create(inheritedActionDict);
      Object.keys(actionDict).forEach(name => {
        newActionDict[name] = actionDict[name];
      });

      this[typePlural][name] =
        type === 'operation'
          ? new Operation(name, inheritedFormals, newActionDict)
          : new Attribute(name, newActionDict);

      // The following check is not strictly necessary (it will happen later anyway) but it's better
      // to catch errors early.
      this[typePlural][name].checkActionDict(this.grammar);
    }

    assertNewName(name, type) {
      if (hasOwnProperty(Wrapper.prototype, name)) {
        throw new Error('Cannot add ' + type + " '" + name + "': that's a reserved name");
      }
      if (name in this.operations) {
        throw new Error(
          'Cannot add ' + type + " '" + name + "': an operation with that name already exists"
        );
      }
      if (name in this.attributes) {
        throw new Error(
          'Cannot add ' + type + " '" + name + "': an attribute with that name already exists"
        );
      }
    }

    // Returns a wrapper for the given CST `node` in this semantics.
    // If `node` is already a wrapper, returns `node` itself.  // TODO: why is this needed?
    wrap(node, source, optBaseInterval) {
      const baseInterval = optBaseInterval || source;
      return node instanceof this.Wrapper ? node : new this.Wrapper(node, source, baseInterval);
    }
  }

  function parseSignature(signature, type) {
    if (!Semantics.prototypeGrammar) {
      // The Operations and Attributes grammar won't be available while Ohm is loading,
      // but we can get away the following simplification b/c none of the operations
      // that are used while loading take arguments.
      assert(signature.indexOf('(') === -1);
      return {
        name: signature,
        formals: [],
      };
    }

    const r = Semantics.prototypeGrammar.match(
      signature,
      type === 'operation' ? 'OperationSignature' : 'AttributeSignature'
    );
    if (r.failed()) {
      throw new Error(r.message);
    }

    return Semantics.prototypeGrammarSemantics(r).parse();
  }

  function newDefaultAction(type, name, doIt) {
    return function (...children) {
      const thisThing = this._semantics.operations[name] || this._semantics.attributes[name];
      const args = thisThing.formals.map(formal => this.args[formal]);

      if (!this.isIteration() && children.length === 1) {
        // This CST node corresponds to a non-terminal in the grammar (e.g., AddExpr). The fact that
        // we got here means that this action dictionary doesn't have an action for this particular
        // non-terminal or a generic `_nonterminal` action.
        // As a convenience, if this node only has one child, we just return the result of applying
        // this operation / attribute to the child node.
        return doIt.apply(children[0], args);
      } else {
        // Otherwise, we throw an exception to let the programmer know that we don't know what
        // to do with this node.
        throw missingSemanticAction(this.ctorName, name, type, globalActionStack);
      }
    };
  }

  // Creates a new Semantics instance for `grammar`, inheriting operations and attributes from
  // `optSuperSemantics`, if it is specified. Returns a function that acts as a proxy for the new
  // Semantics instance. When that function is invoked with a CST node as an argument, it returns
  // a wrapper for that node which gives access to the operations and attributes provided by this
  // semantics.
  Semantics.createSemantics = function (grammar, optSuperSemantics) {
    const s = new Semantics(
      grammar,
      optSuperSemantics !== undefined
        ? optSuperSemantics
        : Semantics.BuiltInSemantics._getSemantics()
    );

    // To enable clients to invoke a semantics like a function, return a function that acts as a proxy
    // for `s`, which is the real `Semantics` instance.
    const proxy = function ASemantics(matchResult) {
      if (!(matchResult instanceof MatchResult)) {
        throw new TypeError(
          'Semantics expected a MatchResult, but got ' +
            unexpectedObjToString(matchResult)
        );
      }
      if (matchResult.failed()) {
        throw new TypeError('cannot apply Semantics to ' + matchResult.toString());
      }

      const cst = matchResult._cst;
      if (cst.grammar !== grammar) {
        throw new Error(
          "Cannot use a MatchResult from grammar '" +
            cst.grammar.name +
            "' with a semantics for '" +
            grammar.name +
            "'"
        );
      }
      const inputStream = new InputStream(matchResult.input);
      return s.wrap(cst, inputStream.interval(matchResult._cstOffset, matchResult.input.length));
    };

    // Forward public methods from the proxy to the semantics instance.
    proxy.addOperation = function (signature, actionDict) {
      s.addOperationOrAttribute('operation', signature, actionDict);
      return proxy;
    };
    proxy.extendOperation = function (name, actionDict) {
      s.extendOperationOrAttribute('operation', name, actionDict);
      return proxy;
    };
    proxy.addAttribute = function (name, actionDict) {
      s.addOperationOrAttribute('attribute', name, actionDict);
      return proxy;
    };
    proxy.extendAttribute = function (name, actionDict) {
      s.extendOperationOrAttribute('attribute', name, actionDict);
      return proxy;
    };
    proxy._getActionDict = function (operationOrAttributeName) {
      const action =
        s.operations[operationOrAttributeName] || s.attributes[operationOrAttributeName];
      if (!action) {
        throw new Error(
          '"' +
            operationOrAttributeName +
            '" is not a valid operation or attribute ' +
            'name in this semantics for "' +
            grammar.name +
            '"'
        );
      }
      return action.actionDict;
    };
    proxy._remove = function (operationOrAttributeName) {
      let semantic;
      if (operationOrAttributeName in s.operations) {
        semantic = s.operations[operationOrAttributeName];
        delete s.operations[operationOrAttributeName];
      } else if (operationOrAttributeName in s.attributes) {
        semantic = s.attributes[operationOrAttributeName];
        delete s.attributes[operationOrAttributeName];
      }
      delete s.Wrapper.prototype[operationOrAttributeName];
      return semantic;
    };
    proxy.getOperationNames = function () {
      return Object.keys(s.operations);
    };
    proxy.getAttributeNames = function () {
      return Object.keys(s.attributes);
    };
    proxy.getGrammar = function () {
      return s.grammar;
    };
    proxy.toRecipe = function (semanticsOnly) {
      return s.toRecipe(semanticsOnly);
    };

    // Make the proxy's toString() work.
    proxy.toString = s.toString.bind(s);

    // Returns the semantics for the proxy.
    proxy._getSemantics = function () {
      return s;
    };

    return proxy;
  };

  // ----------------- Operation -----------------

  // An Operation represents a function to be applied to a concrete syntax tree (CST) -- it's very
  // similar to a Visitor (http://en.wikipedia.org/wiki/Visitor_pattern). An operation is executed by
  // recursively walking the CST, and at each node, invoking the matching semantic action from
  // `actionDict`. See `Operation.prototype.execute` for details of how a CST node's matching semantic
  // action is found.
  class Operation {
    constructor(name, formals, actionDict, builtInDefault) {
      this.name = name;
      this.formals = formals;
      this.actionDict = actionDict;
      this.builtInDefault = builtInDefault;
    }

    checkActionDict(grammar) {
      grammar._checkTopDownActionDict(this.typeName, this.name, this.actionDict);
    }

    // Execute this operation on the CST node associated with `nodeWrapper` in the context of the
    // given Semantics instance.
    execute(semantics, nodeWrapper) {
      try {
        // Look for a semantic action whose name matches the node's constructor name, which is either
        // the name of a rule in the grammar, or '_terminal' (for a terminal node), or '_iter' (for an
        // iteration node).
        const {ctorName} = nodeWrapper._node;
        let actionFn = this.actionDict[ctorName];
        if (actionFn) {
          globalActionStack.push([this, ctorName]);
          return actionFn.apply(nodeWrapper, nodeWrapper._children());
        }

        // The action dictionary does not contain a semantic action for this specific type of node.
        // If this is a nonterminal node and the programmer has provided a `_nonterminal` semantic
        // action, we invoke it:
        if (nodeWrapper.isNonterminal()) {
          actionFn = this.actionDict._nonterminal;
          if (actionFn) {
            globalActionStack.push([this, '_nonterminal', ctorName]);
            return actionFn.apply(nodeWrapper, nodeWrapper._children());
          }
        }

        // Otherwise, we invoke the '_default' semantic action.
        globalActionStack.push([this, 'default action', ctorName]);
        return this.actionDict._default.apply(nodeWrapper, nodeWrapper._children());
      } finally {
        globalActionStack.pop();
      }
    }
  }

  Operation.prototype.typeName = 'operation';

  // ----------------- Attribute -----------------

  // Attributes are Operations whose results are memoized. This means that, for any given semantics,
  // the semantic action for a CST node will be invoked no more than once.
  class Attribute extends Operation {
    constructor(name, actionDict, builtInDefault) {
      super(name, [], actionDict, builtInDefault);
    }

    execute(semantics, nodeWrapper) {
      const node = nodeWrapper._node;
      const key = semantics.attributeKeys[this.name];
      if (!hasOwnProperty(node, key)) {
        // The following is a super-send -- isn't JS beautiful? :/
        node[key] = Operation.prototype.execute.call(this, semantics, nodeWrapper);
      }
      return node[key];
    }
  }

  Attribute.prototype.typeName = 'attribute';

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  const SPECIAL_ACTION_NAMES = ['_iter', '_terminal', '_nonterminal', '_default'];

  function getSortedRuleValues(grammar) {
    return Object.keys(grammar.rules)
      .sort()
      .map(name => grammar.rules[name]);
  }

  // Until ES2019, JSON was not a valid subset of JavaScript because U+2028 (line separator)
  // and U+2029 (paragraph separator) are allowed in JSON string literals, but not in JS.
  // This function properly encodes those two characters so that the resulting string is
  // represents both valid JSON, and valid JavaScript (for ES2018 and below).
  // See https://v8.dev/features/subsume-json for more details.
  const jsonToJS = str => str.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  let ohmGrammar$1;
  let buildGrammar$1;

  class Grammar {
    constructor(name, superGrammar, rules, optDefaultStartRule) {
      this.name = name;
      this.superGrammar = superGrammar;
      this.rules = rules;
      if (optDefaultStartRule) {
        if (!(optDefaultStartRule in rules)) {
          throw new Error(
            "Invalid start rule: '" +
              optDefaultStartRule +
              "' is not a rule in grammar '" +
              name +
              "'"
          );
        }
        this.defaultStartRule = optDefaultStartRule;
      }
      this._matchStateInitializer = undefined;
      this.supportsIncrementalParsing = true;
    }

    matcher() {
      return new Matcher(this);
    }

    // Return true if the grammar is a built-in grammar, otherwise false.
    // NOTE: This might give an unexpected result if called before BuiltInRules is defined!
    isBuiltIn() {
      return this === Grammar.ProtoBuiltInRules || this === Grammar.BuiltInRules;
    }

    equals(g) {
      if (this === g) {
        return true;
      }
      // Do the cheapest comparisons first.
      if (
        g == null ||
        this.name !== g.name ||
        this.defaultStartRule !== g.defaultStartRule ||
        !(this.superGrammar === g.superGrammar || this.superGrammar.equals(g.superGrammar))
      ) {
        return false;
      }
      const myRules = getSortedRuleValues(this);
      const otherRules = getSortedRuleValues(g);
      return (
        myRules.length === otherRules.length &&
        myRules.every((rule, i) => {
          return (
            rule.description === otherRules[i].description &&
            rule.formals.join(',') === otherRules[i].formals.join(',') &&
            rule.body.toString() === otherRules[i].body.toString()
          );
        })
      );
    }

    match(input, optStartApplication) {
      const m = this.matcher();
      m.replaceInputRange(0, 0, input);
      return m.match(optStartApplication);
    }

    trace(input, optStartApplication) {
      const m = this.matcher();
      m.replaceInputRange(0, 0, input);
      return m.trace(optStartApplication);
    }

    createSemantics() {
      return Semantics.createSemantics(this);
    }

    extendSemantics(superSemantics) {
      return Semantics.createSemantics(this, superSemantics._getSemantics());
    }

    // Check that every key in `actionDict` corresponds to a semantic action, and that it maps to
    // a function of the correct arity. If not, throw an exception.
    _checkTopDownActionDict(what, name, actionDict) {
      const problems = [];

      for (const k in actionDict) {
        const v = actionDict[k];
        const isSpecialAction = SPECIAL_ACTION_NAMES.includes(k);

        if (!isSpecialAction && !(k in this.rules)) {
          problems.push(`'${k}' is not a valid semantic action for '${this.name}'`);
          continue;
        }
        if (typeof v !== 'function') {
          problems.push(`'${k}' must be a function in an action dictionary for '${this.name}'`);
          continue;
        }
        const actual = v.length;
        const expected = this._topDownActionArity(k);
        if (actual !== expected) {
          let details;
          if (k === '_iter' || k === '_nonterminal') {
            details =
              `it should use a rest parameter, e.g. \`${k}(...children) {}\`. ` +
              'NOTE: this is new in Ohm v16 — see https://ohmjs.org/d/ati for details.';
          } else {
            details = `expected ${expected}, got ${actual}`;
          }
          problems.push(`Semantic action '${k}' has the wrong arity: ${details}`);
        }
      }
      if (problems.length > 0) {
        const prettyProblems = problems.map(problem => '- ' + problem);
        const error = new Error(
          [
            `Found errors in the action dictionary of the '${name}' ${what}:`,
            ...prettyProblems,
          ].join('\n')
        );
        error.problems = problems;
        throw error;
      }
    }

    // Return the expected arity for a semantic action named `actionName`, which
    // is either a rule name or a special action name like '_nonterminal'.
    _topDownActionArity(actionName) {
      // All special actions have an expected arity of 0, though all but _terminal
      // are expected to use the rest parameter syntax (e.g. `_iter(...children)`).
      // This is considered to have arity 0, i.e. `((...args) => {}).length` is 0.
      return SPECIAL_ACTION_NAMES.includes(actionName)
        ? 0
        : this.rules[actionName].body.getArity();
    }

    _inheritsFrom(grammar) {
      let g = this.superGrammar;
      while (g) {
        if (g.equals(grammar, true)) {
          return true;
        }
        g = g.superGrammar;
      }
      return false;
    }

    toRecipe(superGrammarExpr = undefined) {
      const metaInfo = {};
      // Include the grammar source if it is available.
      if (this.source) {
        metaInfo.source = this.source.contents;
      }

      let startRule = null;
      if (this.defaultStartRule) {
        startRule = this.defaultStartRule;
      }

      const rules = {};
      Object.keys(this.rules).forEach(ruleName => {
        const ruleInfo = this.rules[ruleName];
        const {body} = ruleInfo;
        const isDefinition = !this.superGrammar || !this.superGrammar.rules[ruleName];

        let operation;
        if (isDefinition) {
          operation = 'define';
        } else {
          operation = body instanceof Extend ? 'extend' : 'override';
        }

        const metaInfo = {};
        if (ruleInfo.source && this.source) {
          const adjusted = ruleInfo.source.relativeTo(this.source);
          metaInfo.sourceInterval = [adjusted.startIdx, adjusted.endIdx];
        }

        const description = isDefinition ? ruleInfo.description : null;
        const bodyRecipe = body.outputRecipe(ruleInfo.formals, this.source);

        rules[ruleName] = [
          operation, // "define"/"extend"/"override"
          metaInfo,
          description,
          ruleInfo.formals,
          bodyRecipe,
        ];
      });

      // If the caller provided an expression to use for the supergrammar, use that.
      // Otherwise, if the supergrammar is a user grammar, use its recipe inline.
      let superGrammarOutput = 'null';
      if (superGrammarExpr) {
        superGrammarOutput = superGrammarExpr;
      } else if (this.superGrammar && !this.superGrammar.isBuiltIn()) {
        superGrammarOutput = this.superGrammar.toRecipe();
      }

      const recipeElements = [
        ...['grammar', metaInfo, this.name].map(JSON.stringify),
        superGrammarOutput,
        ...[startRule, rules].map(JSON.stringify),
      ];
      return jsonToJS(`[${recipeElements.join(',')}]`);
    }

    // TODO: Come up with better names for these methods.
    // TODO: Write the analog of these methods for inherited attributes.
    toOperationActionDictionaryTemplate() {
      return this._toOperationOrAttributeActionDictionaryTemplate();
    }
    toAttributeActionDictionaryTemplate() {
      return this._toOperationOrAttributeActionDictionaryTemplate();
    }

    _toOperationOrAttributeActionDictionaryTemplate() {
      // TODO: add the super-grammar's templates at the right place, e.g., a case for AddExpr_plus
      // should appear next to other cases of AddExpr.

      const sb = new StringBuffer();
      sb.append('{');

      let first = true;

      for (const ruleName in this.rules) {
        const {body} = this.rules[ruleName];
        if (first) {
          first = false;
        } else {
          sb.append(',');
        }
        sb.append('\n');
        sb.append('  ');
        this.addSemanticActionTemplate(ruleName, body, sb);
      }

      sb.append('\n}');
      return sb.contents();
    }

    addSemanticActionTemplate(ruleName, body, sb) {
      sb.append(ruleName);
      sb.append(': function(');
      const arity = this._topDownActionArity(ruleName);
      sb.append(repeat('_', arity).join(', '));
      sb.append(') {\n');
      sb.append('  }');
    }

    // Parse a string which expresses a rule application in this grammar, and return the
    // resulting Apply node.
    parseApplication(str) {
      let app;
      if (str.indexOf('<') === -1) {
        // simple application
        app = new Apply(str);
      } else {
        // parameterized application
        const cst = ohmGrammar$1.match(str, 'Base_application');
        app = buildGrammar$1(cst, {});
      }

      // Ensure that the application is valid.
      if (!(app.ruleName in this.rules)) {
        throw undeclaredRule(app.ruleName, this.name);
      }
      const {formals} = this.rules[app.ruleName];
      if (formals.length !== app.args.length) {
        const {source} = this.rules[app.ruleName];
        throw wrongNumberOfParameters(
          app.ruleName,
          formals.length,
          app.args.length,
          source
        );
      }
      return app;
    }

    _setUpMatchState(state) {
      if (this._matchStateInitializer) {
        this._matchStateInitializer(state);
      }
    }
  }

  // The following grammar contains a few rules that couldn't be written  in "userland".
  // At the bottom of src/main.js, we create a sub-grammar of this grammar that's called
  // `BuiltInRules`. That grammar contains several convenience rules, e.g., `letter` and
  // `digit`, and is implicitly the super-grammar of any grammar whose super-grammar
  // isn't specified.
  Grammar.ProtoBuiltInRules = new Grammar(
    'ProtoBuiltInRules', // name
    undefined, // supergrammar
    {
      any: {
        body: any,
        formals: [],
        description: 'any character',
        primitive: true,
      },
      end: {
        body: end,
        formals: [],
        description: 'end of input',
        primitive: true,
      },

      caseInsensitive: {
        body: new CaseInsensitiveTerminal(new Param(0)),
        formals: ['str'],
        primitive: true,
      },
      lower: {
        body: new UnicodeChar('Ll'),
        formals: [],
        description: 'a lowercase letter',
        primitive: true,
      },
      upper: {
        body: new UnicodeChar('Lu'),
        formals: [],
        description: 'an uppercase letter',
        primitive: true,
      },
      // Union of Lt (titlecase), Lm (modifier), and Lo (other), i.e. any letter not in Ll or Lu.
      unicodeLtmo: {
        body: new UnicodeChar('Ltmo'),
        formals: [],
        description: 'a Unicode character in Lt, Lm, or Lo',
        primitive: true,
      },

      // These rules are not truly primitive (they could be written in userland) but are defined
      // here for bootstrapping purposes.
      spaces: {
        body: new Star(new Apply('space')),
        formals: [],
      },
      space: {
        body: new Range('\x00', ' '),
        formals: [],
        description: 'a space',
      },
    }
  );

  // This method is called from main.js once Ohm has loaded.
  Grammar.initApplicationParser = function (grammar, builderFn) {
    ohmGrammar$1 = grammar;
    buildGrammar$1 = builderFn;
  };

  // --------------------------------------------------------------------
  // Private Stuff
  // --------------------------------------------------------------------

  // Constructors

  class GrammarDecl {
    constructor(name) {
      this.name = name;
    }

    // Helpers

    sourceInterval(startIdx, endIdx) {
      return this.source.subInterval(startIdx, endIdx - startIdx);
    }

    ensureSuperGrammar() {
      if (!this.superGrammar) {
        this.withSuperGrammar(
          // TODO: The conditional expression below is an ugly hack. It's kind of ok because
          // I doubt anyone will ever try to declare a grammar called `BuiltInRules`. Still,
          // we should try to find a better way to do this.
          this.name === 'BuiltInRules' ? Grammar.ProtoBuiltInRules : Grammar.BuiltInRules
        );
      }
      return this.superGrammar;
    }

    ensureSuperGrammarRuleForOverriding(name, source) {
      const ruleInfo = this.ensureSuperGrammar().rules[name];
      if (!ruleInfo) {
        throw cannotOverrideUndeclaredRule(name, this.superGrammar.name, source);
      }
      return ruleInfo;
    }

    installOverriddenOrExtendedRule(name, formals, body, source) {
      const duplicateParameterNames$1 = getDuplicates(formals);
      if (duplicateParameterNames$1.length > 0) {
        throw duplicateParameterNames(name, duplicateParameterNames$1, source);
      }
      const ruleInfo = this.ensureSuperGrammar().rules[name];
      const expectedFormals = ruleInfo.formals;
      const expectedNumFormals = expectedFormals ? expectedFormals.length : 0;
      if (formals.length !== expectedNumFormals) {
        throw wrongNumberOfParameters(name, expectedNumFormals, formals.length, source);
      }
      return this.install(name, formals, body, ruleInfo.description, source);
    }

    install(name, formals, body, description, source, primitive = false) {
      this.rules[name] = {
        body: body.introduceParams(formals),
        formals,
        description,
        source,
        primitive,
      };
      return this;
    }

    // Stuff that you should only do once

    withSuperGrammar(superGrammar) {
      if (this.superGrammar) {
        throw new Error('the super grammar of a GrammarDecl cannot be set more than once');
      }
      this.superGrammar = superGrammar;
      this.rules = Object.create(superGrammar.rules);

      // Grammars with an explicit supergrammar inherit a default start rule.
      if (!superGrammar.isBuiltIn()) {
        this.defaultStartRule = superGrammar.defaultStartRule;
      }
      return this;
    }

    withDefaultStartRule(ruleName) {
      this.defaultStartRule = ruleName;
      return this;
    }

    withSource(source) {
      this.source = new InputStream(source).interval(0, source.length);
      return this;
    }

    // Creates a Grammar instance, and if it passes the sanity checks, returns it.
    build() {
      const grammar = new Grammar(
        this.name,
        this.ensureSuperGrammar(),
        this.rules,
        this.defaultStartRule
      );
      // Initialize internal props that are inherited from the super grammar.
      grammar._matchStateInitializer = grammar.superGrammar._matchStateInitializer;
      grammar.supportsIncrementalParsing = grammar.superGrammar.supportsIncrementalParsing;

      // TODO: change the pexpr.prototype.assert... methods to make them add
      // exceptions to an array that's provided as an arg. Then we'll be able to
      // show more than one error of the same type at a time.
      // TODO: include the offending pexpr in the errors, that way we can show
      // the part of the source that caused it.
      const grammarErrors = [];
      let grammarHasInvalidApplications = false;
      Object.keys(grammar.rules).forEach(ruleName => {
        const {body} = grammar.rules[ruleName];
        try {
          body.assertChoicesHaveUniformArity(ruleName);
        } catch (e) {
          grammarErrors.push(e);
        }
        try {
          body.assertAllApplicationsAreValid(ruleName, grammar);
        } catch (e) {
          grammarErrors.push(e);
          grammarHasInvalidApplications = true;
        }
      });
      if (!grammarHasInvalidApplications) {
        // The following check can only be done if the grammar has no invalid applications.
        Object.keys(grammar.rules).forEach(ruleName => {
          const {body} = grammar.rules[ruleName];
          try {
            body.assertIteratedExprsAreNotNullable(grammar, []);
          } catch (e) {
            grammarErrors.push(e);
          }
        });
      }
      if (grammarErrors.length > 0) {
        throwErrors(grammarErrors);
      }
      if (this.source) {
        grammar.source = this.source;
      }

      return grammar;
    }

    // Rule declarations

    define(name, formals, body, description, source, primitive) {
      this.ensureSuperGrammar();
      if (this.superGrammar.rules[name]) {
        throw duplicateRuleDeclaration(name, this.name, this.superGrammar.name, source);
      } else if (this.rules[name]) {
        throw duplicateRuleDeclaration(name, this.name, this.name, source);
      }
      const duplicateParameterNames$1 = getDuplicates(formals);
      if (duplicateParameterNames$1.length > 0) {
        throw duplicateParameterNames(name, duplicateParameterNames$1, source);
      }
      return this.install(name, formals, body, description, source, primitive);
    }

    override(name, formals, body, descIgnored, source) {
      this.ensureSuperGrammarRuleForOverriding(name, source);
      this.installOverriddenOrExtendedRule(name, formals, body, source);
      return this;
    }

    extend(name, formals, fragment, descIgnored, source) {
      const ruleInfo = this.ensureSuperGrammar().rules[name];
      if (!ruleInfo) {
        throw cannotExtendUndeclaredRule(name, this.superGrammar.name, source);
      }
      const body = new Extend(this.superGrammar, name, fragment);
      body.source = fragment.source;
      this.installOverriddenOrExtendedRule(name, formals, body, source);
      return this;
    }
  }

  // --------------------------------------------------------------------
  // Private stuff
  // --------------------------------------------------------------------

  class Builder {
    constructor() {
      this.currentDecl = null;
      this.currentRuleName = null;
    }

    newGrammar(name) {
      return new GrammarDecl(name);
    }

    grammar(metaInfo, name, superGrammar, defaultStartRule, rules) {
      const gDecl = new GrammarDecl(name);
      if (superGrammar) {
        // `superGrammar` may be a recipe (i.e. an Array), or an actual grammar instance.
        gDecl.withSuperGrammar(
          superGrammar instanceof Grammar ? superGrammar : this.fromRecipe(superGrammar)
        );
      }
      if (defaultStartRule) {
        gDecl.withDefaultStartRule(defaultStartRule);
      }
      if (metaInfo && metaInfo.source) {
        gDecl.withSource(metaInfo.source);
      }

      this.currentDecl = gDecl;
      Object.keys(rules).forEach(ruleName => {
        this.currentRuleName = ruleName;
        const ruleRecipe = rules[ruleName];

        const action = ruleRecipe[0]; // define/extend/override
        const metaInfo = ruleRecipe[1];
        const description = ruleRecipe[2];
        const formals = ruleRecipe[3];
        const body = this.fromRecipe(ruleRecipe[4]);

        let source;
        if (gDecl.source && metaInfo && metaInfo.sourceInterval) {
          source = gDecl.source.subInterval(
            metaInfo.sourceInterval[0],
            metaInfo.sourceInterval[1] - metaInfo.sourceInterval[0]
          );
        }
        gDecl[action](ruleName, formals, body, description, source);
      });
      this.currentRuleName = this.currentDecl = null;
      return gDecl.build();
    }

    terminal(x) {
      return new Terminal(x);
    }

    range(from, to) {
      return new Range(from, to);
    }

    param(index) {
      return new Param(index);
    }

    alt(...termArgs) {
      let terms = [];
      for (let arg of termArgs) {
        if (!(arg instanceof PExpr)) {
          arg = this.fromRecipe(arg);
        }
        if (arg instanceof Alt) {
          terms = terms.concat(arg.terms);
        } else {
          terms.push(arg);
        }
      }
      return terms.length === 1 ? terms[0] : new Alt(terms);
    }

    seq(...factorArgs) {
      let factors = [];
      for (let arg of factorArgs) {
        if (!(arg instanceof PExpr)) {
          arg = this.fromRecipe(arg);
        }
        if (arg instanceof Seq) {
          factors = factors.concat(arg.factors);
        } else {
          factors.push(arg);
        }
      }
      return factors.length === 1 ? factors[0] : new Seq(factors);
    }

    star(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Star(expr);
    }

    plus(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Plus(expr);
    }

    opt(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Opt(expr);
    }

    not(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Not(expr);
    }

    lookahead(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Lookahead(expr);
    }

    lex(expr) {
      if (!(expr instanceof PExpr)) {
        expr = this.fromRecipe(expr);
      }
      return new Lex(expr);
    }

    app(ruleName, optParams) {
      if (optParams && optParams.length > 0) {
        optParams = optParams.map(function (param) {
          return param instanceof PExpr ? param : this.fromRecipe(param);
        }, this);
      }
      return new Apply(ruleName, optParams);
    }

    // Note that unlike other methods in this class, this method cannot be used as a
    // convenience constructor. It only works with recipes, because it relies on
    // `this.currentDecl` and `this.currentRuleName` being set.
    splice(beforeTerms, afterTerms) {
      return new Splice(
        this.currentDecl.superGrammar,
        this.currentRuleName,
        beforeTerms.map(term => this.fromRecipe(term)),
        afterTerms.map(term => this.fromRecipe(term))
      );
    }

    fromRecipe(recipe) {
      // the meta-info of 'grammar' is processed in Builder.grammar
      const args = recipe[0] === 'grammar' ? recipe.slice(1) : recipe.slice(2);
      const result = this[recipe[0]](...args);

      const metaInfo = recipe[1];
      if (metaInfo) {
        if (metaInfo.sourceInterval && this.currentDecl) {
          result.withSource(this.currentDecl.sourceInterval(...metaInfo.sourceInterval));
        }
      }
      return result;
    }
  }

  function makeRecipe(recipe) {
    if (typeof recipe === 'function') {
      return recipe.call(new Builder());
    } else {
      if (typeof recipe === 'string') {
        // stringified JSON recipe
        recipe = JSON.parse(recipe);
      }
      return new Builder().fromRecipe(recipe);
    }
  }

  var BuiltInRules = makeRecipe(["grammar",{"source":"BuiltInRules {\n\n  alnum  (an alpha-numeric character)\n    = letter\n    | digit\n\n  letter  (a letter)\n    = lower\n    | upper\n    | unicodeLtmo\n\n  digit  (a digit)\n    = \"0\"..\"9\"\n\n  hexDigit  (a hexadecimal digit)\n    = digit\n    | \"a\"..\"f\"\n    | \"A\"..\"F\"\n\n  ListOf<elem, sep>\n    = NonemptyListOf<elem, sep>\n    | EmptyListOf<elem, sep>\n\n  NonemptyListOf<elem, sep>\n    = elem (sep elem)*\n\n  EmptyListOf<elem, sep>\n    = /* nothing */\n\n  listOf<elem, sep>\n    = nonemptyListOf<elem, sep>\n    | emptyListOf<elem, sep>\n\n  nonemptyListOf<elem, sep>\n    = elem (sep elem)*\n\n  emptyListOf<elem, sep>\n    = /* nothing */\n\n  // Allows a syntactic rule application within a lexical context.\n  applySyntactic<app> = app\n}"},"BuiltInRules",null,null,{"alnum":["define",{"sourceInterval":[18,78]},"an alpha-numeric character",[],["alt",{"sourceInterval":[60,78]},["app",{"sourceInterval":[60,66]},"letter",[]],["app",{"sourceInterval":[73,78]},"digit",[]]]],"letter":["define",{"sourceInterval":[82,142]},"a letter",[],["alt",{"sourceInterval":[107,142]},["app",{"sourceInterval":[107,112]},"lower",[]],["app",{"sourceInterval":[119,124]},"upper",[]],["app",{"sourceInterval":[131,142]},"unicodeLtmo",[]]]],"digit":["define",{"sourceInterval":[146,177]},"a digit",[],["range",{"sourceInterval":[169,177]},"0","9"]],"hexDigit":["define",{"sourceInterval":[181,254]},"a hexadecimal digit",[],["alt",{"sourceInterval":[219,254]},["app",{"sourceInterval":[219,224]},"digit",[]],["range",{"sourceInterval":[231,239]},"a","f"],["range",{"sourceInterval":[246,254]},"A","F"]]],"ListOf":["define",{"sourceInterval":[258,336]},null,["elem","sep"],["alt",{"sourceInterval":[282,336]},["app",{"sourceInterval":[282,307]},"NonemptyListOf",[["param",{"sourceInterval":[297,301]},0],["param",{"sourceInterval":[303,306]},1]]],["app",{"sourceInterval":[314,336]},"EmptyListOf",[["param",{"sourceInterval":[326,330]},0],["param",{"sourceInterval":[332,335]},1]]]]],"NonemptyListOf":["define",{"sourceInterval":[340,388]},null,["elem","sep"],["seq",{"sourceInterval":[372,388]},["param",{"sourceInterval":[372,376]},0],["star",{"sourceInterval":[377,388]},["seq",{"sourceInterval":[378,386]},["param",{"sourceInterval":[378,381]},1],["param",{"sourceInterval":[382,386]},0]]]]],"EmptyListOf":["define",{"sourceInterval":[392,434]},null,["elem","sep"],["seq",{"sourceInterval":[438,438]}]],"listOf":["define",{"sourceInterval":[438,516]},null,["elem","sep"],["alt",{"sourceInterval":[462,516]},["app",{"sourceInterval":[462,487]},"nonemptyListOf",[["param",{"sourceInterval":[477,481]},0],["param",{"sourceInterval":[483,486]},1]]],["app",{"sourceInterval":[494,516]},"emptyListOf",[["param",{"sourceInterval":[506,510]},0],["param",{"sourceInterval":[512,515]},1]]]]],"nonemptyListOf":["define",{"sourceInterval":[520,568]},null,["elem","sep"],["seq",{"sourceInterval":[552,568]},["param",{"sourceInterval":[552,556]},0],["star",{"sourceInterval":[557,568]},["seq",{"sourceInterval":[558,566]},["param",{"sourceInterval":[558,561]},1],["param",{"sourceInterval":[562,566]},0]]]]],"emptyListOf":["define",{"sourceInterval":[572,682]},null,["elem","sep"],["seq",{"sourceInterval":[685,685]}]],"applySyntactic":["define",{"sourceInterval":[685,710]},null,["app"],["param",{"sourceInterval":[707,710]},0]]}]);

  Grammar.BuiltInRules = BuiltInRules;
  announceBuiltInRules(Grammar.BuiltInRules);

  var ohmGrammar = makeRecipe(["grammar",{"source":"Ohm {\n\n  Grammars\n    = Grammar*\n\n  Grammar\n    = ident SuperGrammar? \"{\" Rule* \"}\"\n\n  SuperGrammar\n    = \"<:\" ident\n\n  Rule\n    = ident Formals? ruleDescr? \"=\"  RuleBody  -- define\n    | ident Formals?            \":=\" OverrideRuleBody  -- override\n    | ident Formals?            \"+=\" RuleBody  -- extend\n\n  RuleBody\n    = \"|\"? NonemptyListOf<TopLevelTerm, \"|\">\n\n  TopLevelTerm\n    = Seq caseName  -- inline\n    | Seq\n\n  OverrideRuleBody\n    = \"|\"? NonemptyListOf<OverrideTopLevelTerm, \"|\">\n\n  OverrideTopLevelTerm\n    = \"...\"  -- superSplice\n    | TopLevelTerm\n\n  Formals\n    = \"<\" ListOf<ident, \",\"> \">\"\n\n  Params\n    = \"<\" ListOf<Seq, \",\"> \">\"\n\n  Alt\n    = NonemptyListOf<Seq, \"|\">\n\n  Seq\n    = Iter*\n\n  Iter\n    = Pred \"*\"  -- star\n    | Pred \"+\"  -- plus\n    | Pred \"?\"  -- opt\n    | Pred\n\n  Pred\n    = \"~\" Lex  -- not\n    | \"&\" Lex  -- lookahead\n    | Lex\n\n  Lex\n    = \"#\" Base  -- lex\n    | Base\n\n  Base\n    = ident Params? ~(ruleDescr? \"=\" | \":=\" | \"+=\")  -- application\n    | oneCharTerminal \"..\" oneCharTerminal           -- range\n    | terminal                                       -- terminal\n    | \"(\" Alt \")\"                                    -- paren\n\n  ruleDescr  (a rule description)\n    = \"(\" ruleDescrText \")\"\n\n  ruleDescrText\n    = (~\")\" any)*\n\n  caseName\n    = \"--\" (~\"\\n\" space)* name (~\"\\n\" space)* (\"\\n\" | &\"}\")\n\n  name  (a name)\n    = nameFirst nameRest*\n\n  nameFirst\n    = \"_\"\n    | letter\n\n  nameRest\n    = \"_\"\n    | alnum\n\n  ident  (an identifier)\n    = name\n\n  terminal\n    = \"\\\"\" terminalChar* \"\\\"\"\n\n  oneCharTerminal\n    = \"\\\"\" terminalChar \"\\\"\"\n\n  terminalChar\n    = escapeChar\n      | ~\"\\\\\" ~\"\\\"\" ~\"\\n\" \"\\u{0}\"..\"\\u{10FFFF}\"\n\n  escapeChar  (an escape sequence)\n    = \"\\\\\\\\\"                                     -- backslash\n    | \"\\\\\\\"\"                                     -- doubleQuote\n    | \"\\\\\\'\"                                     -- singleQuote\n    | \"\\\\b\"                                      -- backspace\n    | \"\\\\n\"                                      -- lineFeed\n    | \"\\\\r\"                                      -- carriageReturn\n    | \"\\\\t\"                                      -- tab\n    | \"\\\\u{\" hexDigit hexDigit? hexDigit?\n             hexDigit? hexDigit? hexDigit? \"}\"   -- unicodeCodePoint\n    | \"\\\\u\" hexDigit hexDigit hexDigit hexDigit  -- unicodeEscape\n    | \"\\\\x\" hexDigit hexDigit                    -- hexEscape\n\n  space\n   += comment\n\n  comment\n    = \"//\" (~\"\\n\" any)* &(\"\\n\" | end)  -- singleLine\n    | \"/*\" (~\"*/\" any)* \"*/\"  -- multiLine\n\n  tokens = token*\n\n  token = caseName | comment | ident | operator | punctuation | terminal | any\n\n  operator = \"<:\" | \"=\" | \":=\" | \"+=\" | \"*\" | \"+\" | \"?\" | \"~\" | \"&\"\n\n  punctuation = \"<\" | \">\" | \",\" | \"--\"\n}"},"Ohm",null,"Grammars",{"Grammars":["define",{"sourceInterval":[9,32]},null,[],["star",{"sourceInterval":[24,32]},["app",{"sourceInterval":[24,31]},"Grammar",[]]]],"Grammar":["define",{"sourceInterval":[36,83]},null,[],["seq",{"sourceInterval":[50,83]},["app",{"sourceInterval":[50,55]},"ident",[]],["opt",{"sourceInterval":[56,69]},["app",{"sourceInterval":[56,68]},"SuperGrammar",[]]],["terminal",{"sourceInterval":[70,73]},"{"],["star",{"sourceInterval":[74,79]},["app",{"sourceInterval":[74,78]},"Rule",[]]],["terminal",{"sourceInterval":[80,83]},"}"]]],"SuperGrammar":["define",{"sourceInterval":[87,116]},null,[],["seq",{"sourceInterval":[106,116]},["terminal",{"sourceInterval":[106,110]},"<:"],["app",{"sourceInterval":[111,116]},"ident",[]]]],"Rule_define":["define",{"sourceInterval":[131,181]},null,[],["seq",{"sourceInterval":[131,170]},["app",{"sourceInterval":[131,136]},"ident",[]],["opt",{"sourceInterval":[137,145]},["app",{"sourceInterval":[137,144]},"Formals",[]]],["opt",{"sourceInterval":[146,156]},["app",{"sourceInterval":[146,155]},"ruleDescr",[]]],["terminal",{"sourceInterval":[157,160]},"="],["app",{"sourceInterval":[162,170]},"RuleBody",[]]]],"Rule_override":["define",{"sourceInterval":[188,248]},null,[],["seq",{"sourceInterval":[188,235]},["app",{"sourceInterval":[188,193]},"ident",[]],["opt",{"sourceInterval":[194,202]},["app",{"sourceInterval":[194,201]},"Formals",[]]],["terminal",{"sourceInterval":[214,218]},":="],["app",{"sourceInterval":[219,235]},"OverrideRuleBody",[]]]],"Rule_extend":["define",{"sourceInterval":[255,305]},null,[],["seq",{"sourceInterval":[255,294]},["app",{"sourceInterval":[255,260]},"ident",[]],["opt",{"sourceInterval":[261,269]},["app",{"sourceInterval":[261,268]},"Formals",[]]],["terminal",{"sourceInterval":[281,285]},"+="],["app",{"sourceInterval":[286,294]},"RuleBody",[]]]],"Rule":["define",{"sourceInterval":[120,305]},null,[],["alt",{"sourceInterval":[131,305]},["app",{"sourceInterval":[131,170]},"Rule_define",[]],["app",{"sourceInterval":[188,235]},"Rule_override",[]],["app",{"sourceInterval":[255,294]},"Rule_extend",[]]]],"RuleBody":["define",{"sourceInterval":[309,362]},null,[],["seq",{"sourceInterval":[324,362]},["opt",{"sourceInterval":[324,328]},["terminal",{"sourceInterval":[324,327]},"|"]],["app",{"sourceInterval":[329,362]},"NonemptyListOf",[["app",{"sourceInterval":[344,356]},"TopLevelTerm",[]],["terminal",{"sourceInterval":[358,361]},"|"]]]]],"TopLevelTerm_inline":["define",{"sourceInterval":[385,408]},null,[],["seq",{"sourceInterval":[385,397]},["app",{"sourceInterval":[385,388]},"Seq",[]],["app",{"sourceInterval":[389,397]},"caseName",[]]]],"TopLevelTerm":["define",{"sourceInterval":[366,418]},null,[],["alt",{"sourceInterval":[385,418]},["app",{"sourceInterval":[385,397]},"TopLevelTerm_inline",[]],["app",{"sourceInterval":[415,418]},"Seq",[]]]],"OverrideRuleBody":["define",{"sourceInterval":[422,491]},null,[],["seq",{"sourceInterval":[445,491]},["opt",{"sourceInterval":[445,449]},["terminal",{"sourceInterval":[445,448]},"|"]],["app",{"sourceInterval":[450,491]},"NonemptyListOf",[["app",{"sourceInterval":[465,485]},"OverrideTopLevelTerm",[]],["terminal",{"sourceInterval":[487,490]},"|"]]]]],"OverrideTopLevelTerm_superSplice":["define",{"sourceInterval":[522,543]},null,[],["terminal",{"sourceInterval":[522,527]},"..."]],"OverrideTopLevelTerm":["define",{"sourceInterval":[495,562]},null,[],["alt",{"sourceInterval":[522,562]},["app",{"sourceInterval":[522,527]},"OverrideTopLevelTerm_superSplice",[]],["app",{"sourceInterval":[550,562]},"TopLevelTerm",[]]]],"Formals":["define",{"sourceInterval":[566,606]},null,[],["seq",{"sourceInterval":[580,606]},["terminal",{"sourceInterval":[580,583]},"<"],["app",{"sourceInterval":[584,602]},"ListOf",[["app",{"sourceInterval":[591,596]},"ident",[]],["terminal",{"sourceInterval":[598,601]},","]]],["terminal",{"sourceInterval":[603,606]},">"]]],"Params":["define",{"sourceInterval":[610,647]},null,[],["seq",{"sourceInterval":[623,647]},["terminal",{"sourceInterval":[623,626]},"<"],["app",{"sourceInterval":[627,643]},"ListOf",[["app",{"sourceInterval":[634,637]},"Seq",[]],["terminal",{"sourceInterval":[639,642]},","]]],["terminal",{"sourceInterval":[644,647]},">"]]],"Alt":["define",{"sourceInterval":[651,685]},null,[],["app",{"sourceInterval":[661,685]},"NonemptyListOf",[["app",{"sourceInterval":[676,679]},"Seq",[]],["terminal",{"sourceInterval":[681,684]},"|"]]]],"Seq":["define",{"sourceInterval":[689,704]},null,[],["star",{"sourceInterval":[699,704]},["app",{"sourceInterval":[699,703]},"Iter",[]]]],"Iter_star":["define",{"sourceInterval":[719,736]},null,[],["seq",{"sourceInterval":[719,727]},["app",{"sourceInterval":[719,723]},"Pred",[]],["terminal",{"sourceInterval":[724,727]},"*"]]],"Iter_plus":["define",{"sourceInterval":[743,760]},null,[],["seq",{"sourceInterval":[743,751]},["app",{"sourceInterval":[743,747]},"Pred",[]],["terminal",{"sourceInterval":[748,751]},"+"]]],"Iter_opt":["define",{"sourceInterval":[767,783]},null,[],["seq",{"sourceInterval":[767,775]},["app",{"sourceInterval":[767,771]},"Pred",[]],["terminal",{"sourceInterval":[772,775]},"?"]]],"Iter":["define",{"sourceInterval":[708,794]},null,[],["alt",{"sourceInterval":[719,794]},["app",{"sourceInterval":[719,727]},"Iter_star",[]],["app",{"sourceInterval":[743,751]},"Iter_plus",[]],["app",{"sourceInterval":[767,775]},"Iter_opt",[]],["app",{"sourceInterval":[790,794]},"Pred",[]]]],"Pred_not":["define",{"sourceInterval":[809,824]},null,[],["seq",{"sourceInterval":[809,816]},["terminal",{"sourceInterval":[809,812]},"~"],["app",{"sourceInterval":[813,816]},"Lex",[]]]],"Pred_lookahead":["define",{"sourceInterval":[831,852]},null,[],["seq",{"sourceInterval":[831,838]},["terminal",{"sourceInterval":[831,834]},"&"],["app",{"sourceInterval":[835,838]},"Lex",[]]]],"Pred":["define",{"sourceInterval":[798,862]},null,[],["alt",{"sourceInterval":[809,862]},["app",{"sourceInterval":[809,816]},"Pred_not",[]],["app",{"sourceInterval":[831,838]},"Pred_lookahead",[]],["app",{"sourceInterval":[859,862]},"Lex",[]]]],"Lex_lex":["define",{"sourceInterval":[876,892]},null,[],["seq",{"sourceInterval":[876,884]},["terminal",{"sourceInterval":[876,879]},"#"],["app",{"sourceInterval":[880,884]},"Base",[]]]],"Lex":["define",{"sourceInterval":[866,903]},null,[],["alt",{"sourceInterval":[876,903]},["app",{"sourceInterval":[876,884]},"Lex_lex",[]],["app",{"sourceInterval":[899,903]},"Base",[]]]],"Base_application":["define",{"sourceInterval":[918,979]},null,[],["seq",{"sourceInterval":[918,963]},["app",{"sourceInterval":[918,923]},"ident",[]],["opt",{"sourceInterval":[924,931]},["app",{"sourceInterval":[924,930]},"Params",[]]],["not",{"sourceInterval":[932,963]},["alt",{"sourceInterval":[934,962]},["seq",{"sourceInterval":[934,948]},["opt",{"sourceInterval":[934,944]},["app",{"sourceInterval":[934,943]},"ruleDescr",[]]],["terminal",{"sourceInterval":[945,948]},"="]],["terminal",{"sourceInterval":[951,955]},":="],["terminal",{"sourceInterval":[958,962]},"+="]]]]],"Base_range":["define",{"sourceInterval":[986,1041]},null,[],["seq",{"sourceInterval":[986,1022]},["app",{"sourceInterval":[986,1001]},"oneCharTerminal",[]],["terminal",{"sourceInterval":[1002,1006]},".."],["app",{"sourceInterval":[1007,1022]},"oneCharTerminal",[]]]],"Base_terminal":["define",{"sourceInterval":[1048,1106]},null,[],["app",{"sourceInterval":[1048,1056]},"terminal",[]]],"Base_paren":["define",{"sourceInterval":[1113,1168]},null,[],["seq",{"sourceInterval":[1113,1124]},["terminal",{"sourceInterval":[1113,1116]},"("],["app",{"sourceInterval":[1117,1120]},"Alt",[]],["terminal",{"sourceInterval":[1121,1124]},")"]]],"Base":["define",{"sourceInterval":[907,1168]},null,[],["alt",{"sourceInterval":[918,1168]},["app",{"sourceInterval":[918,963]},"Base_application",[]],["app",{"sourceInterval":[986,1022]},"Base_range",[]],["app",{"sourceInterval":[1048,1056]},"Base_terminal",[]],["app",{"sourceInterval":[1113,1124]},"Base_paren",[]]]],"ruleDescr":["define",{"sourceInterval":[1172,1231]},"a rule description",[],["seq",{"sourceInterval":[1210,1231]},["terminal",{"sourceInterval":[1210,1213]},"("],["app",{"sourceInterval":[1214,1227]},"ruleDescrText",[]],["terminal",{"sourceInterval":[1228,1231]},")"]]],"ruleDescrText":["define",{"sourceInterval":[1235,1266]},null,[],["star",{"sourceInterval":[1255,1266]},["seq",{"sourceInterval":[1256,1264]},["not",{"sourceInterval":[1256,1260]},["terminal",{"sourceInterval":[1257,1260]},")"]],["app",{"sourceInterval":[1261,1264]},"any",[]]]]],"caseName":["define",{"sourceInterval":[1270,1338]},null,[],["seq",{"sourceInterval":[1285,1338]},["terminal",{"sourceInterval":[1285,1289]},"--"],["star",{"sourceInterval":[1290,1304]},["seq",{"sourceInterval":[1291,1302]},["not",{"sourceInterval":[1291,1296]},["terminal",{"sourceInterval":[1292,1296]},"\n"]],["app",{"sourceInterval":[1297,1302]},"space",[]]]],["app",{"sourceInterval":[1305,1309]},"name",[]],["star",{"sourceInterval":[1310,1324]},["seq",{"sourceInterval":[1311,1322]},["not",{"sourceInterval":[1311,1316]},["terminal",{"sourceInterval":[1312,1316]},"\n"]],["app",{"sourceInterval":[1317,1322]},"space",[]]]],["alt",{"sourceInterval":[1326,1337]},["terminal",{"sourceInterval":[1326,1330]},"\n"],["lookahead",{"sourceInterval":[1333,1337]},["terminal",{"sourceInterval":[1334,1337]},"}"]]]]],"name":["define",{"sourceInterval":[1342,1382]},"a name",[],["seq",{"sourceInterval":[1363,1382]},["app",{"sourceInterval":[1363,1372]},"nameFirst",[]],["star",{"sourceInterval":[1373,1382]},["app",{"sourceInterval":[1373,1381]},"nameRest",[]]]]],"nameFirst":["define",{"sourceInterval":[1386,1418]},null,[],["alt",{"sourceInterval":[1402,1418]},["terminal",{"sourceInterval":[1402,1405]},"_"],["app",{"sourceInterval":[1412,1418]},"letter",[]]]],"nameRest":["define",{"sourceInterval":[1422,1452]},null,[],["alt",{"sourceInterval":[1437,1452]},["terminal",{"sourceInterval":[1437,1440]},"_"],["app",{"sourceInterval":[1447,1452]},"alnum",[]]]],"ident":["define",{"sourceInterval":[1456,1489]},"an identifier",[],["app",{"sourceInterval":[1485,1489]},"name",[]]],"terminal":["define",{"sourceInterval":[1493,1531]},null,[],["seq",{"sourceInterval":[1508,1531]},["terminal",{"sourceInterval":[1508,1512]},"\""],["star",{"sourceInterval":[1513,1526]},["app",{"sourceInterval":[1513,1525]},"terminalChar",[]]],["terminal",{"sourceInterval":[1527,1531]},"\""]]],"oneCharTerminal":["define",{"sourceInterval":[1535,1579]},null,[],["seq",{"sourceInterval":[1557,1579]},["terminal",{"sourceInterval":[1557,1561]},"\""],["app",{"sourceInterval":[1562,1574]},"terminalChar",[]],["terminal",{"sourceInterval":[1575,1579]},"\""]]],"terminalChar":["define",{"sourceInterval":[1583,1660]},null,[],["alt",{"sourceInterval":[1602,1660]},["app",{"sourceInterval":[1602,1612]},"escapeChar",[]],["seq",{"sourceInterval":[1621,1660]},["not",{"sourceInterval":[1621,1626]},["terminal",{"sourceInterval":[1622,1626]},"\\"]],["not",{"sourceInterval":[1627,1632]},["terminal",{"sourceInterval":[1628,1632]},"\""]],["not",{"sourceInterval":[1633,1638]},["terminal",{"sourceInterval":[1634,1638]},"\n"]],["range",{"sourceInterval":[1639,1660]},"\u0000","􏿿"]]]],"escapeChar_backslash":["define",{"sourceInterval":[1703,1758]},null,[],["terminal",{"sourceInterval":[1703,1709]},"\\\\"]],"escapeChar_doubleQuote":["define",{"sourceInterval":[1765,1822]},null,[],["terminal",{"sourceInterval":[1765,1771]},"\\\""]],"escapeChar_singleQuote":["define",{"sourceInterval":[1829,1886]},null,[],["terminal",{"sourceInterval":[1829,1835]},"\\'"]],"escapeChar_backspace":["define",{"sourceInterval":[1893,1948]},null,[],["terminal",{"sourceInterval":[1893,1898]},"\\b"]],"escapeChar_lineFeed":["define",{"sourceInterval":[1955,2009]},null,[],["terminal",{"sourceInterval":[1955,1960]},"\\n"]],"escapeChar_carriageReturn":["define",{"sourceInterval":[2016,2076]},null,[],["terminal",{"sourceInterval":[2016,2021]},"\\r"]],"escapeChar_tab":["define",{"sourceInterval":[2083,2132]},null,[],["terminal",{"sourceInterval":[2083,2088]},"\\t"]],"escapeChar_unicodeCodePoint":["define",{"sourceInterval":[2139,2243]},null,[],["seq",{"sourceInterval":[2139,2221]},["terminal",{"sourceInterval":[2139,2145]},"\\u{"],["app",{"sourceInterval":[2146,2154]},"hexDigit",[]],["opt",{"sourceInterval":[2155,2164]},["app",{"sourceInterval":[2155,2163]},"hexDigit",[]]],["opt",{"sourceInterval":[2165,2174]},["app",{"sourceInterval":[2165,2173]},"hexDigit",[]]],["opt",{"sourceInterval":[2188,2197]},["app",{"sourceInterval":[2188,2196]},"hexDigit",[]]],["opt",{"sourceInterval":[2198,2207]},["app",{"sourceInterval":[2198,2206]},"hexDigit",[]]],["opt",{"sourceInterval":[2208,2217]},["app",{"sourceInterval":[2208,2216]},"hexDigit",[]]],["terminal",{"sourceInterval":[2218,2221]},"}"]]],"escapeChar_unicodeEscape":["define",{"sourceInterval":[2250,2309]},null,[],["seq",{"sourceInterval":[2250,2291]},["terminal",{"sourceInterval":[2250,2255]},"\\u"],["app",{"sourceInterval":[2256,2264]},"hexDigit",[]],["app",{"sourceInterval":[2265,2273]},"hexDigit",[]],["app",{"sourceInterval":[2274,2282]},"hexDigit",[]],["app",{"sourceInterval":[2283,2291]},"hexDigit",[]]]],"escapeChar_hexEscape":["define",{"sourceInterval":[2316,2371]},null,[],["seq",{"sourceInterval":[2316,2339]},["terminal",{"sourceInterval":[2316,2321]},"\\x"],["app",{"sourceInterval":[2322,2330]},"hexDigit",[]],["app",{"sourceInterval":[2331,2339]},"hexDigit",[]]]],"escapeChar":["define",{"sourceInterval":[1664,2371]},"an escape sequence",[],["alt",{"sourceInterval":[1703,2371]},["app",{"sourceInterval":[1703,1709]},"escapeChar_backslash",[]],["app",{"sourceInterval":[1765,1771]},"escapeChar_doubleQuote",[]],["app",{"sourceInterval":[1829,1835]},"escapeChar_singleQuote",[]],["app",{"sourceInterval":[1893,1898]},"escapeChar_backspace",[]],["app",{"sourceInterval":[1955,1960]},"escapeChar_lineFeed",[]],["app",{"sourceInterval":[2016,2021]},"escapeChar_carriageReturn",[]],["app",{"sourceInterval":[2083,2088]},"escapeChar_tab",[]],["app",{"sourceInterval":[2139,2221]},"escapeChar_unicodeCodePoint",[]],["app",{"sourceInterval":[2250,2291]},"escapeChar_unicodeEscape",[]],["app",{"sourceInterval":[2316,2339]},"escapeChar_hexEscape",[]]]],"space":["extend",{"sourceInterval":[2375,2394]},null,[],["app",{"sourceInterval":[2387,2394]},"comment",[]]],"comment_singleLine":["define",{"sourceInterval":[2412,2458]},null,[],["seq",{"sourceInterval":[2412,2443]},["terminal",{"sourceInterval":[2412,2416]},"//"],["star",{"sourceInterval":[2417,2429]},["seq",{"sourceInterval":[2418,2427]},["not",{"sourceInterval":[2418,2423]},["terminal",{"sourceInterval":[2419,2423]},"\n"]],["app",{"sourceInterval":[2424,2427]},"any",[]]]],["lookahead",{"sourceInterval":[2430,2443]},["alt",{"sourceInterval":[2432,2442]},["terminal",{"sourceInterval":[2432,2436]},"\n"],["app",{"sourceInterval":[2439,2442]},"end",[]]]]]],"comment_multiLine":["define",{"sourceInterval":[2465,2501]},null,[],["seq",{"sourceInterval":[2465,2487]},["terminal",{"sourceInterval":[2465,2469]},"/*"],["star",{"sourceInterval":[2470,2482]},["seq",{"sourceInterval":[2471,2480]},["not",{"sourceInterval":[2471,2476]},["terminal",{"sourceInterval":[2472,2476]},"*/"]],["app",{"sourceInterval":[2477,2480]},"any",[]]]],["terminal",{"sourceInterval":[2483,2487]},"*/"]]],"comment":["define",{"sourceInterval":[2398,2501]},null,[],["alt",{"sourceInterval":[2412,2501]},["app",{"sourceInterval":[2412,2443]},"comment_singleLine",[]],["app",{"sourceInterval":[2465,2487]},"comment_multiLine",[]]]],"tokens":["define",{"sourceInterval":[2505,2520]},null,[],["star",{"sourceInterval":[2514,2520]},["app",{"sourceInterval":[2514,2519]},"token",[]]]],"token":["define",{"sourceInterval":[2524,2600]},null,[],["alt",{"sourceInterval":[2532,2600]},["app",{"sourceInterval":[2532,2540]},"caseName",[]],["app",{"sourceInterval":[2543,2550]},"comment",[]],["app",{"sourceInterval":[2553,2558]},"ident",[]],["app",{"sourceInterval":[2561,2569]},"operator",[]],["app",{"sourceInterval":[2572,2583]},"punctuation",[]],["app",{"sourceInterval":[2586,2594]},"terminal",[]],["app",{"sourceInterval":[2597,2600]},"any",[]]]],"operator":["define",{"sourceInterval":[2604,2669]},null,[],["alt",{"sourceInterval":[2615,2669]},["terminal",{"sourceInterval":[2615,2619]},"<:"],["terminal",{"sourceInterval":[2622,2625]},"="],["terminal",{"sourceInterval":[2628,2632]},":="],["terminal",{"sourceInterval":[2635,2639]},"+="],["terminal",{"sourceInterval":[2642,2645]},"*"],["terminal",{"sourceInterval":[2648,2651]},"+"],["terminal",{"sourceInterval":[2654,2657]},"?"],["terminal",{"sourceInterval":[2660,2663]},"~"],["terminal",{"sourceInterval":[2666,2669]},"&"]]],"punctuation":["define",{"sourceInterval":[2673,2709]},null,[],["alt",{"sourceInterval":[2687,2709]},["terminal",{"sourceInterval":[2687,2690]},"<"],["terminal",{"sourceInterval":[2693,2696]},">"],["terminal",{"sourceInterval":[2699,2702]},","],["terminal",{"sourceInterval":[2705,2709]},"--"]]]}]);

  const superSplicePlaceholder = Object.create(PExpr.prototype);

  function namespaceHas(ns, name) {
    // Look for an enumerable property, anywhere in the prototype chain.
    for (const prop in ns) {
      if (prop === name) return true;
    }
    return false;
  }

  // Returns a Grammar instance (i.e., an object with a `match` method) for
  // `tree`, which is the concrete syntax tree of a user-written grammar.
  // The grammar will be assigned into `namespace` under the name of the grammar
  // as specified in the source.
  function buildGrammar(match, namespace, optOhmGrammarForTesting) {
    const builder = new Builder();
    let decl;
    let currentRuleName;
    let currentRuleFormals;
    let overriding = false;
    const metaGrammar = optOhmGrammarForTesting || ohmGrammar;

    // A visitor that produces a Grammar instance from the CST.
    const helpers = metaGrammar.createSemantics().addOperation('visit', {
      Grammars(grammarIter) {
        return grammarIter.children.map(c => c.visit());
      },
      Grammar(id, s, _open, rules, _close) {
        const grammarName = id.visit();
        decl = builder.newGrammar(grammarName);
        s.child(0) && s.child(0).visit();
        rules.children.map(c => c.visit());
        const g = decl.build();
        g.source = this.source.trimmed();
        if (namespaceHas(namespace, grammarName)) {
          throw duplicateGrammarDeclaration(g);
        }
        namespace[grammarName] = g;
        return g;
      },

      SuperGrammar(_, n) {
        const superGrammarName = n.visit();
        if (superGrammarName === 'null') {
          decl.withSuperGrammar(null);
        } else {
          if (!namespace || !namespaceHas(namespace, superGrammarName)) {
            throw undeclaredGrammar(superGrammarName, namespace, n.source);
          }
          decl.withSuperGrammar(namespace[superGrammarName]);
        }
      },

      Rule_define(n, fs, d, _, b) {
        currentRuleName = n.visit();
        currentRuleFormals = fs.children.map(c => c.visit())[0] || [];
        // If there is no default start rule yet, set it now. This must be done before visiting
        // the body, because it might contain an inline rule definition.
        if (!decl.defaultStartRule && decl.ensureSuperGrammar() !== Grammar.ProtoBuiltInRules) {
          decl.withDefaultStartRule(currentRuleName);
        }
        const body = b.visit();
        const description = d.children.map(c => c.visit())[0];
        const source = this.source.trimmed();
        return decl.define(currentRuleName, currentRuleFormals, body, description, source);
      },
      Rule_override(n, fs, _, b) {
        currentRuleName = n.visit();
        currentRuleFormals = fs.children.map(c => c.visit())[0] || [];

        const source = this.source.trimmed();
        decl.ensureSuperGrammarRuleForOverriding(currentRuleName, source);

        overriding = true;
        const body = b.visit();
        overriding = false;
        return decl.override(currentRuleName, currentRuleFormals, body, null, source);
      },
      Rule_extend(n, fs, _, b) {
        currentRuleName = n.visit();
        currentRuleFormals = fs.children.map(c => c.visit())[0] || [];
        const body = b.visit();
        const source = this.source.trimmed();
        return decl.extend(currentRuleName, currentRuleFormals, body, null, source);
      },
      RuleBody(_, terms) {
        return builder.alt(...terms.visit()).withSource(this.source);
      },
      OverrideRuleBody(_, terms) {
        const args = terms.visit();

        // Check if the super-splice operator (`...`) appears in the terms.
        const expansionPos = args.indexOf(superSplicePlaceholder);
        if (expansionPos >= 0) {
          const beforeTerms = args.slice(0, expansionPos);
          const afterTerms = args.slice(expansionPos + 1);

          // Ensure it appears no more than once.
          afterTerms.forEach(t => {
            if (t === superSplicePlaceholder) throw multipleSuperSplices(t);
          });

          return new Splice(
            decl.superGrammar,
            currentRuleName,
            beforeTerms,
            afterTerms
          ).withSource(this.source);
        } else {
          return builder.alt(...args).withSource(this.source);
        }
      },
      Formals(opointy, fs, cpointy) {
        return fs.visit();
      },

      Params(opointy, ps, cpointy) {
        return ps.visit();
      },

      Alt(seqs) {
        return builder.alt(...seqs.visit()).withSource(this.source);
      },

      TopLevelTerm_inline(b, n) {
        const inlineRuleName = currentRuleName + '_' + n.visit();
        const body = b.visit();
        const source = this.source.trimmed();
        const isNewRuleDeclaration = !(
          decl.superGrammar && decl.superGrammar.rules[inlineRuleName]
        );
        if (overriding && !isNewRuleDeclaration) {
          decl.override(inlineRuleName, currentRuleFormals, body, null, source);
        } else {
          decl.define(inlineRuleName, currentRuleFormals, body, null, source);
        }
        const params = currentRuleFormals.map(formal => builder.app(formal));
        return builder.app(inlineRuleName, params).withSource(body.source);
      },
      OverrideTopLevelTerm_superSplice(_) {
        return superSplicePlaceholder;
      },

      Seq(expr) {
        return builder.seq(...expr.children.map(c => c.visit())).withSource(this.source);
      },

      Iter_star(x, _) {
        return builder.star(x.visit()).withSource(this.source);
      },
      Iter_plus(x, _) {
        return builder.plus(x.visit()).withSource(this.source);
      },
      Iter_opt(x, _) {
        return builder.opt(x.visit()).withSource(this.source);
      },

      Pred_not(_, x) {
        return builder.not(x.visit()).withSource(this.source);
      },
      Pred_lookahead(_, x) {
        return builder.lookahead(x.visit()).withSource(this.source);
      },

      Lex_lex(_, x) {
        return builder.lex(x.visit()).withSource(this.source);
      },

      Base_application(rule, ps) {
        const params = ps.children.map(c => c.visit())[0] || [];
        return builder.app(rule.visit(), params).withSource(this.source);
      },
      Base_range(from, _, to) {
        return builder.range(from.visit(), to.visit()).withSource(this.source);
      },
      Base_terminal(expr) {
        return builder.terminal(expr.visit()).withSource(this.source);
      },
      Base_paren(open, x, close) {
        return x.visit();
      },

      ruleDescr(open, t, close) {
        return t.visit();
      },
      ruleDescrText(_) {
        return this.sourceString.trim();
      },

      caseName(_, space1, n, space2, end) {
        return n.visit();
      },

      name(first, rest) {
        return this.sourceString;
      },
      nameFirst(expr) {},
      nameRest(expr) {},

      terminal(open, cs, close) {
        return cs.children.map(c => c.visit()).join('');
      },

      oneCharTerminal(open, c, close) {
        return c.visit();
      },

      escapeChar(c) {
        try {
          return unescapeCodePoint(this.sourceString);
        } catch (err) {
          if (err instanceof RangeError && err.message.startsWith('Invalid code point ')) {
            throw invalidCodePoint(c);
          }
          throw err; // Rethrow
        }
      },

      NonemptyListOf(x, _, xs) {
        return [x.visit()].concat(xs.children.map(c => c.visit()));
      },
      EmptyListOf() {
        return [];
      },

      _terminal() {
        return this.sourceString;
      },
    });
    return helpers(match).visit();
  }

  var operationsAndAttributesGrammar = makeRecipe(["grammar",{"source":"OperationsAndAttributes {\n\n  AttributeSignature =\n    name\n\n  OperationSignature =\n    name Formals?\n\n  Formals\n    = \"(\" ListOf<name, \",\"> \")\"\n\n  name  (a name)\n    = nameFirst nameRest*\n\n  nameFirst\n    = \"_\"\n    | letter\n\n  nameRest\n    = \"_\"\n    | alnum\n\n}"},"OperationsAndAttributes",null,"AttributeSignature",{"AttributeSignature":["define",{"sourceInterval":[29,58]},null,[],["app",{"sourceInterval":[54,58]},"name",[]]],"OperationSignature":["define",{"sourceInterval":[62,100]},null,[],["seq",{"sourceInterval":[87,100]},["app",{"sourceInterval":[87,91]},"name",[]],["opt",{"sourceInterval":[92,100]},["app",{"sourceInterval":[92,99]},"Formals",[]]]]],"Formals":["define",{"sourceInterval":[104,143]},null,[],["seq",{"sourceInterval":[118,143]},["terminal",{"sourceInterval":[118,121]},"("],["app",{"sourceInterval":[122,139]},"ListOf",[["app",{"sourceInterval":[129,133]},"name",[]],["terminal",{"sourceInterval":[135,138]},","]]],["terminal",{"sourceInterval":[140,143]},")"]]],"name":["define",{"sourceInterval":[147,187]},"a name",[],["seq",{"sourceInterval":[168,187]},["app",{"sourceInterval":[168,177]},"nameFirst",[]],["star",{"sourceInterval":[178,187]},["app",{"sourceInterval":[178,186]},"nameRest",[]]]]],"nameFirst":["define",{"sourceInterval":[191,223]},null,[],["alt",{"sourceInterval":[207,223]},["terminal",{"sourceInterval":[207,210]},"_"],["app",{"sourceInterval":[217,223]},"letter",[]]]],"nameRest":["define",{"sourceInterval":[227,257]},null,[],["alt",{"sourceInterval":[242,257]},["terminal",{"sourceInterval":[242,245]},"_"],["app",{"sourceInterval":[252,257]},"alnum",[]]]]}]);

  initBuiltInSemantics(Grammar.BuiltInRules);
  initPrototypeParser(operationsAndAttributesGrammar); // requires BuiltInSemantics

  function initBuiltInSemantics(builtInRules) {
    const actions = {
      empty() {
        return this.iteration();
      },
      nonEmpty(first, _, rest) {
        return this.iteration([first].concat(rest.children));
      },
      self(..._children) {
        return this;
      },
    };

    Semantics.BuiltInSemantics = Semantics.createSemantics(builtInRules, null).addOperation(
      'asIteration',
      {
        emptyListOf: actions.empty,
        nonemptyListOf: actions.nonEmpty,
        EmptyListOf: actions.empty,
        NonemptyListOf: actions.nonEmpty,
        _iter: actions.self,
      }
    );
  }

  function initPrototypeParser(grammar) {
    Semantics.prototypeGrammarSemantics = grammar.createSemantics().addOperation('parse', {
      AttributeSignature(name) {
        return {
          name: name.parse(),
          formals: [],
        };
      },
      OperationSignature(name, optFormals) {
        return {
          name: name.parse(),
          formals: optFormals.children.map(c => c.parse())[0] || [],
        };
      },
      Formals(oparen, fs, cparen) {
        return fs.asIteration().children.map(c => c.parse());
      },
      name(first, rest) {
        return this.sourceString;
      },
    });
    Semantics.prototypeGrammar = grammar;
  }

  function findIndentation(input) {
    let pos = 0;
    const stack = [0];
    const topOfStack = () => stack[stack.length - 1];

    const result = {};

    const regex = /( *).*(?:$|\r?\n|\r)/g;
    let match;
    while ((match = regex.exec(input)) != null) {
      const [line, indent] = match;

      // The last match will always have length 0. In every other case, some
      // characters will be matched (possibly only the end of line chars).
      if (line.length === 0) break;

      const indentSize = indent.length;
      const prevSize = topOfStack();

      const indentPos = pos + indentSize;

      if (indentSize > prevSize) {
        // Indent -- always only 1.
        stack.push(indentSize);
        result[indentPos] = 1;
      } else if (indentSize < prevSize) {
        // Dedent -- can be multiple levels.
        const prevLength = stack.length;
        while (topOfStack() !== indentSize) {
          stack.pop();
        }
        result[indentPos] = -1 * (prevLength - stack.length);
      }
      pos += line.length;
    }
    // Ensure that there is a matching DEDENT for every remaining INDENT.
    if (stack.length > 1) {
      result[pos] = 1 - stack.length;
    }
    return result;
  }

  const INDENT_DESCRIPTION = 'an indented block';
  const DEDENT_DESCRIPTION = 'a dedent';

  // A sentinel value that is out of range for both charCodeAt() and codePointAt().
  const INVALID_CODE_POINT = 0x10ffff + 1;

  class InputStreamWithIndentation extends InputStream {
    constructor(state) {
      super(state.input);
      this.state = state;
    }

    _indentationAt(pos) {
      return this.state.userData[pos] || 0;
    }

    atEnd() {
      return super.atEnd() && this._indentationAt(this.pos) === 0;
    }

    next() {
      if (this._indentationAt(this.pos) !== 0) {
        this.examinedLength = Math.max(this.examinedLength, this.pos);
        return undefined;
      }
      return super.next();
    }

    nextCharCode() {
      if (this._indentationAt(this.pos) !== 0) {
        this.examinedLength = Math.max(this.examinedLength, this.pos);
        return INVALID_CODE_POINT;
      }
      return super.nextCharCode();
    }

    nextCodePoint() {
      if (this._indentationAt(this.pos) !== 0) {
        this.examinedLength = Math.max(this.examinedLength, this.pos);
        return INVALID_CODE_POINT;
      }
      return super.nextCodePoint();
    }
  }

  class Indentation extends PExpr {
    constructor(isIndent = true) {
      super();
      this.isIndent = isIndent;
    }

    allowsSkippingPrecedingSpace() {
      return true;
    }

    eval(state) {
      const {inputStream} = state;
      const pseudoTokens = state.userData;
      state.doNotMemoize = true;

      const origPos = inputStream.pos;

      const sign = this.isIndent ? 1 : -1;
      const count = (pseudoTokens[origPos] || 0) * sign;
      if (count > 0) {
        // Update the count to consume the pseudotoken.
        state.userData = Object.create(pseudoTokens);
        state.userData[origPos] -= sign;

        state.pushBinding(new TerminalNode(0), origPos);
        return true;
      } else {
        state.processFailure(origPos, this);
        return false;
      }
    }

    getArity() {
      return 1;
    }

    _assertAllApplicationsAreValid(ruleName, grammar) {}

    _isNullable(grammar, memo) {
      return false;
    }

    assertChoicesHaveUniformArity(ruleName) {}

    assertIteratedExprsAreNotNullable(grammar) {}

    introduceParams(formals) {
      return this;
    }

    substituteParams(actuals) {
      return this;
    }

    toString() {
      return this.isIndent ? 'indent' : 'dedent';
    }

    toDisplayString() {
      return this.toString();
    }

    toFailure(grammar) {
      const description = this.isIndent ? INDENT_DESCRIPTION : DEDENT_DESCRIPTION;
      return new Failure(this, description, 'description');
    }
  }

  // Create a new definition for `any` that can consume indent & dedent.
  const applyIndent = new Apply('indent');
  const applyDedent = new Apply('dedent');
  const newAnyBody = new Splice(BuiltInRules, 'any', [applyIndent, applyDedent], []);

  const IndentationSensitive = new Builder()
    .newGrammar('IndentationSensitive')
    .withSuperGrammar(BuiltInRules)
    .define('indent', [], new Indentation(true), INDENT_DESCRIPTION, undefined, true)
    .define('dedent', [], new Indentation(false), DEDENT_DESCRIPTION, undefined, true)
    .extend('any', [], newAnyBody, 'any character', undefined)
    .build();

  Object.assign(IndentationSensitive, {
    _matchStateInitializer(state) {
      state.userData = findIndentation(state.input);
      state.inputStream = new InputStreamWithIndentation(state);
    },
    supportsIncrementalParsing: false,
  });

  // Generated by scripts/prebuild.js
  const version = '17.3.0';

  Grammar.initApplicationParser(ohmGrammar, buildGrammar);

  const isBuffer = obj =>
    !!obj.constructor &&
    typeof obj.constructor.isBuffer === 'function' &&
    obj.constructor.isBuffer(obj);

  function compileAndLoad(source, namespace) {
    const m = ohmGrammar.match(source, 'Grammars');
    if (m.failed()) {
      throw grammarSyntaxError(m);
    }
    return buildGrammar(m, namespace);
  }

  function grammar(source, optNamespace) {
    const ns = grammars(source, optNamespace);

    // Ensure that the source contained no more than one grammar definition.
    const grammarNames = Object.keys(ns);
    if (grammarNames.length === 0) {
      throw new Error('Missing grammar definition');
    } else if (grammarNames.length > 1) {
      const secondGrammar = ns[grammarNames[1]];
      const interval = secondGrammar.source;
      throw new Error(
        getLineAndColumnMessage(interval.sourceString, interval.startIdx) +
          'Found more than one grammar definition -- use ohm.grammars() instead.'
      );
    }
    return ns[grammarNames[0]]; // Return the one and only grammar.
  }

  function grammars(source, optNamespace) {
    const ns = Object.create(optNamespace || {});
    if (typeof source !== 'string') {
      // For convenience, detect Node.js Buffer objects and automatically call toString().
      if (isBuffer(source)) {
        source = source.toString();
      } else {
        throw new TypeError(
          'Expected string as first argument, got ' + unexpectedObjToString(source)
        );
      }
    }
    compileAndLoad(source, ns);
    return ns;
  }

  exports.ExperimentalIndentationSensitive = IndentationSensitive;
  exports._buildGrammar = buildGrammar;
  exports.grammar = grammar;
  exports.grammars = grammars;
  exports.makeRecipe = makeRecipe;
  exports.ohmGrammar = ohmGrammar;
  exports.pexprs = pexprs;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2htLmpzIiwic291cmNlcyI6WyIuLi9zcmMvY29tbW9uLmpzIiwiLi4vc3JjL3VuaWNvZGUuanMiLCIuLi9zcmMvcGV4cHJzLW1haW4uanMiLCIuLi9zcmMvZXJyb3JzLmpzIiwiLi4vc3JjL3V0aWwuanMiLCIuLi9zcmMvSW50ZXJ2YWwuanMiLCIuLi9zcmMvSW5wdXRTdHJlYW0uanMiLCIuLi9zcmMvTWF0Y2hSZXN1bHQuanMiLCIuLi9zcmMvUG9zSW5mby5qcyIsIi4uL3NyYy9UcmFjZS5qcyIsIi4uL3NyYy9wZXhwcnMtYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZS5qcyIsIi4uL3NyYy9wZXhwcnMtYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQuanMiLCIuLi9zcmMvcGV4cHJzLWFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5LmpzIiwiLi4vc3JjL3BleHBycy1hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUuanMiLCIuLi9zcmMvbm9kZXMuanMiLCIuLi9zcmMvcGV4cHJzLWV2YWwuanMiLCIuLi9zcmMvcGV4cHJzLWdldEFyaXR5LmpzIiwiLi4vc3JjL3BleHBycy1vdXRwdXRSZWNpcGUuanMiLCIuLi9zcmMvcGV4cHJzLWludHJvZHVjZVBhcmFtcy5qcyIsIi4uL3NyYy9wZXhwcnMtaXNOdWxsYWJsZS5qcyIsIi4uL3NyYy9wZXhwcnMtc3Vic3RpdHV0ZVBhcmFtcy5qcyIsIi4uL3NyYy9wZXhwcnMtdG9Bcmd1bWVudE5hbWVMaXN0LmpzIiwiLi4vc3JjL3BleHBycy10b0Rpc3BsYXlTdHJpbmcuanMiLCIuLi9zcmMvRmFpbHVyZS5qcyIsIi4uL3NyYy9wZXhwcnMtdG9GYWlsdXJlLmpzIiwiLi4vc3JjL3BleHBycy10b1N0cmluZy5qcyIsIi4uL3NyYy9DYXNlSW5zZW5zaXRpdmVUZXJtaW5hbC5qcyIsIi4uL3NyYy9wZXhwcnMuanMiLCIuLi9zcmMvTWF0Y2hTdGF0ZS5qcyIsIi4uL3NyYy9NYXRjaGVyLmpzIiwiLi4vc3JjL1NlbWFudGljcy5qcyIsIi4uL3NyYy9HcmFtbWFyLmpzIiwiLi4vc3JjL0dyYW1tYXJEZWNsLmpzIiwiLi4vc3JjL0J1aWxkZXIuanMiLCIuLi9zcmMvbWFrZVJlY2lwZS5qcyIsImJ1aWx0LWluLXJ1bGVzLmpzIiwiLi4vc3JjL21haW4ta2VybmVsLmpzIiwib2htLWdyYW1tYXIuanMiLCIuLi9zcmMvYnVpbGRHcmFtbWFyLmpzIiwib3BlcmF0aW9ucy1hbmQtYXR0cmlidXRlcy5qcyIsIi4uL3NyYy9zZW1hbnRpY3NEZWZlcnJlZEluaXQuanMiLCIuLi9zcmMvZmluZEluZGVudGF0aW9uLmpzIiwiLi4vc3JjL0luZGVudGF0aW9uU2Vuc2l0aXZlLmpzIiwiLi4vc3JjL3ZlcnNpb24uanMiLCIuLi9zcmMvbWFpbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBTdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gSGVscGVyc1xuXG5jb25zdCBlc2NhcGVTdHJpbmdGb3IgPSB7fTtcbmZvciAobGV0IGMgPSAwOyBjIDwgMTI4OyBjKyspIHtcbiAgZXNjYXBlU3RyaW5nRm9yW2NdID0gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbn1cbmVzY2FwZVN0cmluZ0ZvcltcIidcIi5jaGFyQ29kZUF0KDApXSA9IFwiXFxcXCdcIjtcbmVzY2FwZVN0cmluZ0ZvclsnXCInLmNoYXJDb2RlQXQoMCldID0gJ1xcXFxcIic7XG5lc2NhcGVTdHJpbmdGb3JbJ1xcXFwnLmNoYXJDb2RlQXQoMCldID0gJ1xcXFxcXFxcJztcbmVzY2FwZVN0cmluZ0ZvclsnXFxiJy5jaGFyQ29kZUF0KDApXSA9ICdcXFxcYic7XG5lc2NhcGVTdHJpbmdGb3JbJ1xcZicuY2hhckNvZGVBdCgwKV0gPSAnXFxcXGYnO1xuZXNjYXBlU3RyaW5nRm9yWydcXG4nLmNoYXJDb2RlQXQoMCldID0gJ1xcXFxuJztcbmVzY2FwZVN0cmluZ0ZvclsnXFxyJy5jaGFyQ29kZUF0KDApXSA9ICdcXFxccic7XG5lc2NhcGVTdHJpbmdGb3JbJ1xcdCcuY2hhckNvZGVBdCgwKV0gPSAnXFxcXHQnO1xuZXNjYXBlU3RyaW5nRm9yWydcXHUwMDBiJy5jaGFyQ29kZUF0KDApXSA9ICdcXFxcdic7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFeHBvcnRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgZnVuY3Rpb24gYWJzdHJhY3Qob3B0TWV0aG9kTmFtZSkge1xuICBjb25zdCBtZXRob2ROYW1lID0gb3B0TWV0aG9kTmFtZSB8fCAnJztcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAndGhpcyBtZXRob2QgJyArXG4gICAgICAgIG1ldGhvZE5hbWUgK1xuICAgICAgICAnIGlzIGFic3RyYWN0ISAnICtcbiAgICAgICAgJyhpdCBoYXMgbm8gaW1wbGVtZW50YXRpb24gaW4gY2xhc3MgJyArXG4gICAgICAgIHRoaXMuY29uc3RydWN0b3IubmFtZSArXG4gICAgICAgICcpJ1xuICAgICk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnQoY29uZCwgbWVzc2FnZSkge1xuICBpZiAoIWNvbmQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnQXNzZXJ0aW9uIGZhaWxlZCcpO1xuICB9XG59XG5cbi8vIERlZmluZSBhIGxhemlseS1jb21wdXRlZCwgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgbmFtZWQgYHByb3BOYW1lYFxuLy8gb24gdGhlIG9iamVjdCBgb2JqYC4gYGdldHRlckZuYCB3aWxsIGJlIGNhbGxlZCB0byBjb21wdXRlIHRoZSB2YWx1ZSB0aGVcbi8vIGZpcnN0IHRpbWUgdGhlIHByb3BlcnR5IGlzIGFjY2Vzc2VkLlxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUxhenlQcm9wZXJ0eShvYmosIHByb3BOYW1lLCBnZXR0ZXJGbikge1xuICBsZXQgbWVtbztcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgcHJvcE5hbWUsIHtcbiAgICBnZXQoKSB7XG4gICAgICBpZiAoIW1lbW8pIHtcbiAgICAgICAgbWVtbyA9IGdldHRlckZuLmNhbGwodGhpcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9LFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb25lKG9iaikge1xuICBpZiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIG9iaik7XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcGVhdEZuKGZuLCBuKSB7XG4gIGNvbnN0IGFyciA9IFtdO1xuICB3aGlsZSAobi0tID4gMCkge1xuICAgIGFyci5wdXNoKGZuKCkpO1xuICB9XG4gIHJldHVybiBhcnI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXBlYXRTdHIoc3RyLCBuKSB7XG4gIHJldHVybiBuZXcgQXJyYXkobiArIDEpLmpvaW4oc3RyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlcGVhdCh4LCBuKSB7XG4gIHJldHVybiByZXBlYXRGbigoKSA9PiB4LCBuKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldER1cGxpY2F0ZXMoYXJyYXkpIHtcbiAgY29uc3QgZHVwbGljYXRlcyA9IFtdO1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCBhcnJheS5sZW5ndGg7IGlkeCsrKSB7XG4gICAgY29uc3QgeCA9IGFycmF5W2lkeF07XG4gICAgaWYgKGFycmF5Lmxhc3RJbmRleE9mKHgpICE9PSBpZHggJiYgZHVwbGljYXRlcy5pbmRleE9mKHgpIDwgMCkge1xuICAgICAgZHVwbGljYXRlcy5wdXNoKHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZHVwbGljYXRlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHlXaXRob3V0RHVwbGljYXRlcyhhcnJheSkge1xuICBjb25zdCBub0R1cGxpY2F0ZXMgPSBbXTtcbiAgYXJyYXkuZm9yRWFjaChlbnRyeSA9PiB7XG4gICAgaWYgKG5vRHVwbGljYXRlcy5pbmRleE9mKGVudHJ5KSA8IDApIHtcbiAgICAgIG5vRHVwbGljYXRlcy5wdXNoKGVudHJ5KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbm9EdXBsaWNhdGVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW50YWN0aWMocnVsZU5hbWUpIHtcbiAgY29uc3QgZmlyc3RDaGFyID0gcnVsZU5hbWVbMF07XG4gIHJldHVybiBmaXJzdENoYXIgPT09IGZpcnN0Q2hhci50b1VwcGVyQ2FzZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNMZXhpY2FsKHJ1bGVOYW1lKSB7XG4gIHJldHVybiAhaXNTeW50YWN0aWMocnVsZU5hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFkTGVmdChzdHIsIGxlbiwgb3B0Q2hhcikge1xuICBjb25zdCBjaCA9IG9wdENoYXIgfHwgJyAnO1xuICBpZiAoc3RyLmxlbmd0aCA8IGxlbikge1xuICAgIHJldHVybiByZXBlYXRTdHIoY2gsIGxlbiAtIHN0ci5sZW5ndGgpICsgc3RyO1xuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbi8vIFN0cmluZ0J1ZmZlclxuXG5leHBvcnQgZnVuY3Rpb24gU3RyaW5nQnVmZmVyKCkge1xuICB0aGlzLnN0cmluZ3MgPSBbXTtcbn1cblxuU3RyaW5nQnVmZmVyLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHRoaXMuc3RyaW5ncy5wdXNoKHN0cik7XG59O1xuXG5TdHJpbmdCdWZmZXIucHJvdG90eXBlLmNvbnRlbnRzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmdzLmpvaW4oJycpO1xufTtcblxuY29uc3QgZXNjYXBlVW5pY29kZSA9IHN0ciA9PiBTdHJpbmcuZnJvbUNvZGVQb2ludChwYXJzZUludChzdHIsIDE2KSk7XG5cbmV4cG9ydCBmdW5jdGlvbiB1bmVzY2FwZUNvZGVQb2ludChzKSB7XG4gIGlmIChzLmNoYXJBdCgwKSA9PT0gJ1xcXFwnKSB7XG4gICAgc3dpdGNoIChzLmNoYXJBdCgxKSkge1xuICAgICAgY2FzZSAnYic6XG4gICAgICAgIHJldHVybiAnXFxiJztcbiAgICAgIGNhc2UgJ2YnOlxuICAgICAgICByZXR1cm4gJ1xcZic7XG4gICAgICBjYXNlICduJzpcbiAgICAgICAgcmV0dXJuICdcXG4nO1xuICAgICAgY2FzZSAncic6XG4gICAgICAgIHJldHVybiAnXFxyJztcbiAgICAgIGNhc2UgJ3QnOlxuICAgICAgICByZXR1cm4gJ1xcdCc7XG4gICAgICBjYXNlICd2JzpcbiAgICAgICAgcmV0dXJuICdcXHYnO1xuICAgICAgY2FzZSAneCc6XG4gICAgICAgIHJldHVybiBlc2NhcGVVbmljb2RlKHMuc2xpY2UoMiwgNCkpO1xuICAgICAgY2FzZSAndSc6XG4gICAgICAgIHJldHVybiBzLmNoYXJBdCgyKSA9PT0gJ3snXG4gICAgICAgICAgPyBlc2NhcGVVbmljb2RlKHMuc2xpY2UoMywgLTEpKVxuICAgICAgICAgIDogZXNjYXBlVW5pY29kZShzLnNsaWNlKDIsIDYpKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBzLmNoYXJBdCgxKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHM7XG4gIH1cbn1cblxuLy8gSGVscGVyIGZvciBwcm9kdWNpbmcgYSBkZXNjcmlwdGlvbiBvZiBhbiB1bmtub3duIG9iamVjdCBpbiBhIHNhZmUgd2F5LlxuLy8gRXNwZWNpYWxseSB1c2VmdWwgZm9yIGVycm9yIG1lc3NhZ2VzIHdoZXJlIGFuIHVuZXhwZWN0ZWQgdHlwZSBvZiBvYmplY3Qgd2FzIGVuY291bnRlcmVkLlxuZXhwb3J0IGZ1bmN0aW9uIHVuZXhwZWN0ZWRPYmpUb1N0cmluZyhvYmopIHtcbiAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgcmV0dXJuIFN0cmluZyhvYmopO1xuICB9XG4gIGNvbnN0IGJhc2VUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopO1xuICB0cnkge1xuICAgIGxldCB0eXBlTmFtZTtcbiAgICBpZiAob2JqLmNvbnN0cnVjdG9yICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lKSB7XG4gICAgICB0eXBlTmFtZSA9IG9iai5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgIH0gZWxzZSBpZiAoYmFzZVRvU3RyaW5nLmluZGV4T2YoJ1tvYmplY3QgJykgPT09IDApIHtcbiAgICAgIHR5cGVOYW1lID0gYmFzZVRvU3RyaW5nLnNsaWNlKDgsIC0xKTsgLy8gRXh0cmFjdCBlLmcuIFwiQXJyYXlcIiBmcm9tIFwiW29iamVjdCBBcnJheV1cIi5cbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZU5hbWUgPSB0eXBlb2Ygb2JqO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZU5hbWUgKyAnOiAnICsgSlNPTi5zdHJpbmdpZnkoU3RyaW5nKG9iaikpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gYmFzZVRvU3RyaW5nO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjaGVja05vdE51bGwob2JqLCBtZXNzYWdlID0gJ3VuZXhwZWN0ZWQgbnVsbCB2YWx1ZScpIHtcbiAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9XG4gIHJldHVybiBvYmo7XG59XG4iLCIvLyBUaGUgZnVsbCBsaXN0IG9mIGNhdGVnb3JpZXMgZnJvbTpcbi8vIGh0dHBzOi8vd3d3LnVuaWNvZGUub3JnL1B1YmxpYy9VQ0QvbGF0ZXN0L3VjZC9leHRyYWN0ZWQvRGVyaXZlZEdlbmVyYWxDYXRlZ29yeS50eHQuXG5cbmNvbnN0IHRvUmVnRXhwID0gdmFsID0+IG5ldyBSZWdFeHAoU3RyaW5nLnJhd2BcXHB7JHt2YWx9fWAsICd1Jyk7XG5cbi8qXG4gIGdyZXAgLXYgJ14jJyBEZXJpdmVkR2VuZXJhbENhdGVnb3J5LnR4dCBcXFxuICAgIHwgY3V0IC1kJzsnIC1mMiBcXFxuICAgIHwgYXdrICdORntwcmludCAkMX0nIFxcXG4gICAgfCBzb3J0IC11IFxcXG4gICAgfCBhd2sgJ3twcmludGYgXCJcXHgyNyVzXFx4MjcsXFxuXCIsJDF9J1xuICovXG5cbmV4cG9ydCBjb25zdCBVbmljb2RlQ2F0ZWdvcmllcyA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgW1xuICAgICdDYycsXG4gICAgJ0NmJyxcbiAgICAnQ24nLFxuICAgICdDbycsXG4gICAgJ0NzJyxcbiAgICAnTGwnLFxuICAgICdMbScsXG4gICAgJ0xvJyxcbiAgICAnTHQnLFxuICAgICdMdScsXG4gICAgJ01jJyxcbiAgICAnTWUnLFxuICAgICdNbicsXG4gICAgJ05kJyxcbiAgICAnTmwnLFxuICAgICdObycsXG4gICAgJ1BjJyxcbiAgICAnUGQnLFxuICAgICdQZScsXG4gICAgJ1BmJyxcbiAgICAnUGknLFxuICAgICdQbycsXG4gICAgJ1BzJyxcbiAgICAnU2MnLFxuICAgICdTaycsXG4gICAgJ1NtJyxcbiAgICAnU28nLFxuICAgICdabCcsXG4gICAgJ1pwJyxcbiAgICAnWnMnLFxuICBdLm1hcChjYXQgPT4gW2NhdCwgdG9SZWdFeHAoY2F0KV0pXG4pO1xuVW5pY29kZUNhdGVnb3JpZXNbJ0x0bW8nXSA9IC9cXHB7THR9fFxccHtMbX18XFxwe0xvfS91O1xuXG4vLyBXZSBvbmx5IHN1cHBvcnQgYSBmZXcgb2YgdGhlc2UgZm9yIG5vdywgYnV0IGNvdWxkIGFkZCBtb3JlIGxhdGVyLlxuLy8gU2VlIGh0dHBzOi8vd3d3LnVuaWNvZGUub3JnL1B1YmxpYy9VQ0QvbGF0ZXN0L3VjZC9Qcm9wZXJ0eUFsaWFzZXMudHh0XG5leHBvcnQgY29uc3QgVW5pY29kZUJpbmFyeVByb3BlcnRpZXMgPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIFsnWElEX1N0YXJ0JywgJ1hJRF9Db250aW51ZScsICdXaGl0ZV9TcGFjZSddLm1hcChwcm9wID0+IFtwcm9wLCB0b1JlZ0V4cChwcm9wKV0pXG4pO1xuIiwiaW1wb3J0IHtVbmljb2RlQmluYXJ5UHJvcGVydGllcywgVW5pY29kZUNhdGVnb3JpZXN9IGZyb20gJy4vdW5pY29kZS5qcyc7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gR2VuZXJhbCBzdHVmZlxuXG5leHBvcnQgY2xhc3MgUEV4cHIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBpZiAodGhpcy5jb25zdHJ1Y3RvciA9PT0gUEV4cHIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlBFeHByIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQgLS0gaXQncyBhYnN0cmFjdFwiKTtcbiAgICB9XG4gIH1cblxuICAvLyBTZXQgdGhlIGBzb3VyY2VgIHByb3BlcnR5IHRvIHRoZSBpbnRlcnZhbCBjb250YWluaW5nIHRoZSBzb3VyY2UgZm9yIHRoaXMgZXhwcmVzc2lvbi5cbiAgd2l0aFNvdXJjZShpbnRlcnZhbCkge1xuICAgIGlmIChpbnRlcnZhbCkge1xuICAgICAgdGhpcy5zb3VyY2UgPSBpbnRlcnZhbC50cmltbWVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5cbi8vIEFueVxuXG5leHBvcnQgY29uc3QgYW55ID0gT2JqZWN0LmNyZWF0ZShQRXhwci5wcm90b3R5cGUpO1xuXG4vLyBFbmRcblxuZXhwb3J0IGNvbnN0IGVuZCA9IE9iamVjdC5jcmVhdGUoUEV4cHIucHJvdG90eXBlKTtcblxuLy8gVGVybWluYWxzXG5cbmV4cG9ydCBjbGFzcyBUZXJtaW5hbCBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3Iob2JqKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLm9iaiA9IG9iajtcbiAgfVxufVxuXG4vLyBSYW5nZXNcblxuZXhwb3J0IGNsYXNzIFJhbmdlIGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3Rvcihmcm9tLCB0bykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5mcm9tID0gZnJvbTtcbiAgICB0aGlzLnRvID0gdG87XG4gICAgLy8gSWYgZWl0aGVyIGBmcm9tYCBvciBgdG9gIGlzIG1hZGUgdXAgb2YgbXVsdGlwbGUgY29kZSB1bml0cywgdGhlblxuICAgIC8vIHRoZSByYW5nZSBzaG91bGQgY29uc3VtZSBhIGZ1bGwgY29kZSBwb2ludCwgbm90IGEgc2luZ2xlIGNvZGUgdW5pdC5cbiAgICB0aGlzLm1hdGNoQ29kZVBvaW50ID0gZnJvbS5sZW5ndGggPiAxIHx8IHRvLmxlbmd0aCA+IDE7XG4gIH1cbn1cblxuLy8gUGFyYW1ldGVyc1xuXG5leHBvcnQgY2xhc3MgUGFyYW0gZXh0ZW5kcyBQRXhwciB7XG4gIGNvbnN0cnVjdG9yKGluZGV4KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gIH1cbn1cblxuLy8gQWx0ZXJuYXRpb25cblxuZXhwb3J0IGNsYXNzIEFsdCBleHRlbmRzIFBFeHByIHtcbiAgY29uc3RydWN0b3IodGVybXMpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMudGVybXMgPSB0ZXJtcztcbiAgfVxufVxuXG4vLyBFeHRlbmQgaXMgYW4gaW1wbGVtZW50YXRpb24gZGV0YWlsIG9mIHJ1bGUgZXh0ZW5zaW9uXG5cbmV4cG9ydCBjbGFzcyBFeHRlbmQgZXh0ZW5kcyBBbHQge1xuICBjb25zdHJ1Y3RvcihzdXBlckdyYW1tYXIsIG5hbWUsIGJvZHkpIHtcbiAgICBjb25zdCBvcmlnQm9keSA9IHN1cGVyR3JhbW1hci5ydWxlc1tuYW1lXS5ib2R5O1xuICAgIHN1cGVyKFtib2R5LCBvcmlnQm9keV0pO1xuXG4gICAgdGhpcy5zdXBlckdyYW1tYXIgPSBzdXBlckdyYW1tYXI7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmJvZHkgPSBib2R5O1xuICB9XG59XG5cbi8vIFNwbGljZSBpcyBhbiBpbXBsZW1lbnRhdGlvbiBkZXRhaWwgb2YgcnVsZSBvdmVycmlkaW5nIHdpdGggdGhlIGAuLi5gIG9wZXJhdG9yLlxuZXhwb3J0IGNsYXNzIFNwbGljZSBleHRlbmRzIEFsdCB7XG4gIGNvbnN0cnVjdG9yKHN1cGVyR3JhbW1hciwgcnVsZU5hbWUsIGJlZm9yZVRlcm1zLCBhZnRlclRlcm1zKSB7XG4gICAgY29uc3Qgb3JpZ0JvZHkgPSBzdXBlckdyYW1tYXIucnVsZXNbcnVsZU5hbWVdLmJvZHk7XG4gICAgc3VwZXIoWy4uLmJlZm9yZVRlcm1zLCBvcmlnQm9keSwgLi4uYWZ0ZXJUZXJtc10pO1xuXG4gICAgdGhpcy5zdXBlckdyYW1tYXIgPSBzdXBlckdyYW1tYXI7XG4gICAgdGhpcy5ydWxlTmFtZSA9IHJ1bGVOYW1lO1xuICAgIHRoaXMuZXhwYW5zaW9uUG9zID0gYmVmb3JlVGVybXMubGVuZ3RoO1xuICB9XG59XG5cbi8vIFNlcXVlbmNlc1xuXG5leHBvcnQgY2xhc3MgU2VxIGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3RvcihmYWN0b3JzKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmZhY3RvcnMgPSBmYWN0b3JzO1xuICB9XG59XG5cbi8vIEl0ZXJhdG9ycyBhbmQgb3B0aW9uYWxzXG5cbmV4cG9ydCBjbGFzcyBJdGVyIGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3RvcihleHByKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmV4cHIgPSBleHByO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTdGFyIGV4dGVuZHMgSXRlciB7fVxuZXhwb3J0IGNsYXNzIFBsdXMgZXh0ZW5kcyBJdGVyIHt9XG5leHBvcnQgY2xhc3MgT3B0IGV4dGVuZHMgSXRlciB7fVxuXG5TdGFyLnByb3RvdHlwZS5vcGVyYXRvciA9ICcqJztcblBsdXMucHJvdG90eXBlLm9wZXJhdG9yID0gJysnO1xuT3B0LnByb3RvdHlwZS5vcGVyYXRvciA9ICc/JztcblxuU3Rhci5wcm90b3R5cGUubWluTnVtTWF0Y2hlcyA9IDA7XG5QbHVzLnByb3RvdHlwZS5taW5OdW1NYXRjaGVzID0gMTtcbk9wdC5wcm90b3R5cGUubWluTnVtTWF0Y2hlcyA9IDA7XG5cblN0YXIucHJvdG90eXBlLm1heE51bU1hdGNoZXMgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG5QbHVzLnByb3RvdHlwZS5tYXhOdW1NYXRjaGVzID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuT3B0LnByb3RvdHlwZS5tYXhOdW1NYXRjaGVzID0gMTtcblxuLy8gUHJlZGljYXRlc1xuXG5leHBvcnQgY2xhc3MgTm90IGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3RvcihleHByKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmV4cHIgPSBleHByO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBMb29rYWhlYWQgZXh0ZW5kcyBQRXhwciB7XG4gIGNvbnN0cnVjdG9yKGV4cHIpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuZXhwciA9IGV4cHI7XG4gIH1cbn1cblxuLy8gXCJMZXhpZmljYXRpb25cIlxuXG5leHBvcnQgY2xhc3MgTGV4IGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3RvcihleHByKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmV4cHIgPSBleHByO1xuICB9XG59XG5cbi8vIFJ1bGUgYXBwbGljYXRpb25cblxuZXhwb3J0IGNsYXNzIEFwcGx5IGV4dGVuZHMgUEV4cHIge1xuICBjb25zdHJ1Y3RvcihydWxlTmFtZSwgYXJncyA9IFtdKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnJ1bGVOYW1lID0gcnVsZU5hbWU7XG4gICAgdGhpcy5hcmdzID0gYXJncztcbiAgfVxuXG4gIGlzU3ludGFjdGljKCkge1xuICAgIHJldHVybiBjb21tb24uaXNTeW50YWN0aWModGhpcy5ydWxlTmFtZSk7XG4gIH1cblxuICAvLyBUaGlzIG1ldGhvZCBqdXN0IGNhY2hlcyB0aGUgcmVzdWx0IG9mIGB0aGlzLnRvU3RyaW5nKClgIGluIGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkuXG4gIHRvTWVtb0tleSgpIHtcbiAgICBpZiAoIXRoaXMuX21lbW9LZXkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX21lbW9LZXknLCB7dmFsdWU6IHRoaXMudG9TdHJpbmcoKX0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fbWVtb0tleTtcbiAgfVxufVxuXG4vLyBVbmljb2RlIGNoYXJhY3RlclxuXG5leHBvcnQgY2xhc3MgVW5pY29kZUNoYXIgZXh0ZW5kcyBQRXhwciB7XG4gIGNvbnN0cnVjdG9yKGNhdGVnb3J5T3JQcm9wKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmNhdGVnb3J5T3JQcm9wID0gY2F0ZWdvcnlPclByb3A7XG4gICAgaWYgKGNhdGVnb3J5T3JQcm9wIGluIFVuaWNvZGVDYXRlZ29yaWVzKSB7XG4gICAgICB0aGlzLnBhdHRlcm4gPSBVbmljb2RlQ2F0ZWdvcmllc1tjYXRlZ29yeU9yUHJvcF07XG4gICAgfSBlbHNlIGlmIChjYXRlZ29yeU9yUHJvcCBpbiBVbmljb2RlQmluYXJ5UHJvcGVydGllcykge1xuICAgICAgdGhpcy5wYXR0ZXJuID0gVW5pY29kZUJpbmFyeVByb3BlcnRpZXNbY2F0ZWdvcnlPclByb3BdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnZhbGlkIFVuaWNvZGUgY2F0ZWdvcnkgb3IgcHJvcGVydHkgbmFtZTogJHtKU09OLnN0cmluZ2lmeShjYXRlZ29yeU9yUHJvcCl9YFxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7YXNzZXJ0fSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQcml2YXRlIHN0dWZmXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRXJyb3IobWVzc2FnZSwgb3B0SW50ZXJ2YWwpIHtcbiAgbGV0IGU7XG4gIGlmIChvcHRJbnRlcnZhbCkge1xuICAgIGUgPSBuZXcgRXJyb3Iob3B0SW50ZXJ2YWwuZ2V0TGluZUFuZENvbHVtbk1lc3NhZ2UoKSArIG1lc3NhZ2UpO1xuICAgIGUuc2hvcnRNZXNzYWdlID0gbWVzc2FnZTtcbiAgICBlLmludGVydmFsID0gb3B0SW50ZXJ2YWw7XG4gIH0gZWxzZSB7XG4gICAgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgfVxuICByZXR1cm4gZTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0gZXJyb3JzIGFib3V0IGludGVydmFscyAtLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgZnVuY3Rpb24gaW50ZXJ2YWxTb3VyY2VzRG9udE1hdGNoKCkge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXCJJbnRlcnZhbCBzb3VyY2VzIGRvbid0IG1hdGNoXCIpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBlcnJvcnMgYWJvdXQgZ3JhbW1hcnMgLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gR3JhbW1hciBzeW50YXggZXJyb3JcblxuZXhwb3J0IGZ1bmN0aW9uIGdyYW1tYXJTeW50YXhFcnJvcihtYXRjaEZhaWx1cmUpIHtcbiAgY29uc3QgZSA9IG5ldyBFcnJvcigpO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgJ21lc3NhZ2UnLCB7XG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBnZXQoKSB7XG4gICAgICByZXR1cm4gbWF0Y2hGYWlsdXJlLm1lc3NhZ2U7XG4gICAgfSxcbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCAnc2hvcnRNZXNzYWdlJywge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0KCkge1xuICAgICAgcmV0dXJuICdFeHBlY3RlZCAnICsgbWF0Y2hGYWlsdXJlLmdldEV4cGVjdGVkVGV4dCgpO1xuICAgIH0sXG4gIH0pO1xuICBlLmludGVydmFsID0gbWF0Y2hGYWlsdXJlLmdldEludGVydmFsKCk7XG4gIHJldHVybiBlO1xufVxuXG4vLyBVbmRlY2xhcmVkIGdyYW1tYXJcblxuZXhwb3J0IGZ1bmN0aW9uIHVuZGVjbGFyZWRHcmFtbWFyKGdyYW1tYXJOYW1lLCBuYW1lc3BhY2UsIGludGVydmFsKSB7XG4gIGNvbnN0IG1lc3NhZ2UgPSBuYW1lc3BhY2VcbiAgICA/IGBHcmFtbWFyICR7Z3JhbW1hck5hbWV9IGlzIG5vdCBkZWNsYXJlZCBpbiBuYW1lc3BhY2UgJyR7bmFtZXNwYWNlfSdgXG4gICAgOiAnVW5kZWNsYXJlZCBncmFtbWFyICcgKyBncmFtbWFyTmFtZTtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKG1lc3NhZ2UsIGludGVydmFsKTtcbn1cblxuLy8gRHVwbGljYXRlIGdyYW1tYXIgZGVjbGFyYXRpb25cblxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZUdyYW1tYXJEZWNsYXJhdGlvbihncmFtbWFyLCBuYW1lc3BhY2UpIHtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKCdHcmFtbWFyICcgKyBncmFtbWFyLm5hbWUgKyAnIGlzIGFscmVhZHkgZGVjbGFyZWQgaW4gdGhpcyBuYW1lc3BhY2UnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdyYW1tYXJEb2VzTm90U3VwcG9ydEluY3JlbWVudGFsUGFyc2luZyhncmFtbWFyKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihgR3JhbW1hciAnJHtncmFtbWFyLm5hbWV9JyBkb2VzIG5vdCBzdXBwb3J0IGluY3JlbWVudGFsIHBhcnNpbmdgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0gcnVsZXMgLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gVW5kZWNsYXJlZCBydWxlXG5cbmV4cG9ydCBmdW5jdGlvbiB1bmRlY2xhcmVkUnVsZShydWxlTmFtZSwgZ3JhbW1hck5hbWUsIG9wdEludGVydmFsKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAnUnVsZSAnICsgcnVsZU5hbWUgKyAnIGlzIG5vdCBkZWNsYXJlZCBpbiBncmFtbWFyICcgKyBncmFtbWFyTmFtZSxcbiAgICBvcHRJbnRlcnZhbFxuICApO1xufVxuXG4vLyBDYW5ub3Qgb3ZlcnJpZGUgdW5kZWNsYXJlZCBydWxlXG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5ub3RPdmVycmlkZVVuZGVjbGFyZWRSdWxlKHJ1bGVOYW1lLCBncmFtbWFyTmFtZSwgb3B0U291cmNlKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAnQ2Fubm90IG92ZXJyaWRlIHJ1bGUgJyArIHJ1bGVOYW1lICsgJyBiZWNhdXNlIGl0IGlzIG5vdCBkZWNsYXJlZCBpbiAnICsgZ3JhbW1hck5hbWUsXG4gICAgb3B0U291cmNlXG4gICk7XG59XG5cbi8vIENhbm5vdCBleHRlbmQgdW5kZWNsYXJlZCBydWxlXG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5ub3RFeHRlbmRVbmRlY2xhcmVkUnVsZShydWxlTmFtZSwgZ3JhbW1hck5hbWUsIG9wdFNvdXJjZSkge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXG4gICAgJ0Nhbm5vdCBleHRlbmQgcnVsZSAnICsgcnVsZU5hbWUgKyAnIGJlY2F1c2UgaXQgaXMgbm90IGRlY2xhcmVkIGluICcgKyBncmFtbWFyTmFtZSxcbiAgICBvcHRTb3VyY2VcbiAgKTtcbn1cblxuLy8gRHVwbGljYXRlIHJ1bGUgZGVjbGFyYXRpb25cblxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZVJ1bGVEZWNsYXJhdGlvbihydWxlTmFtZSwgZ3JhbW1hck5hbWUsIGRlY2xHcmFtbWFyTmFtZSwgb3B0U291cmNlKSB7XG4gIGxldCBtZXNzYWdlID1cbiAgICBcIkR1cGxpY2F0ZSBkZWNsYXJhdGlvbiBmb3IgcnVsZSAnXCIgKyBydWxlTmFtZSArIFwiJyBpbiBncmFtbWFyICdcIiArIGdyYW1tYXJOYW1lICsgXCInXCI7XG4gIGlmIChncmFtbWFyTmFtZSAhPT0gZGVjbEdyYW1tYXJOYW1lKSB7XG4gICAgbWVzc2FnZSArPSBcIiAob3JpZ2luYWxseSBkZWNsYXJlZCBpbiAnXCIgKyBkZWNsR3JhbW1hck5hbWUgKyBcIicpXCI7XG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUVycm9yKG1lc3NhZ2UsIG9wdFNvdXJjZSk7XG59XG5cbi8vIFdyb25nIG51bWJlciBvZiBwYXJhbWV0ZXJzXG5cbmV4cG9ydCBmdW5jdGlvbiB3cm9uZ051bWJlck9mUGFyYW1ldGVycyhydWxlTmFtZSwgZXhwZWN0ZWQsIGFjdHVhbCwgc291cmNlKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAnV3JvbmcgbnVtYmVyIG9mIHBhcmFtZXRlcnMgZm9yIHJ1bGUgJyArXG4gICAgICBydWxlTmFtZSArXG4gICAgICAnIChleHBlY3RlZCAnICtcbiAgICAgIGV4cGVjdGVkICtcbiAgICAgICcsIGdvdCAnICtcbiAgICAgIGFjdHVhbCArXG4gICAgICAnKScsXG4gICAgc291cmNlXG4gICk7XG59XG5cbi8vIFdyb25nIG51bWJlciBvZiBhcmd1bWVudHNcblxuZXhwb3J0IGZ1bmN0aW9uIHdyb25nTnVtYmVyT2ZBcmd1bWVudHMocnVsZU5hbWUsIGV4cGVjdGVkLCBhY3R1YWwsIGV4cHIpIHtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFxuICAgICdXcm9uZyBudW1iZXIgb2YgYXJndW1lbnRzIGZvciBydWxlICcgK1xuICAgICAgcnVsZU5hbWUgK1xuICAgICAgJyAoZXhwZWN0ZWQgJyArXG4gICAgICBleHBlY3RlZCArXG4gICAgICAnLCBnb3QgJyArXG4gICAgICBhY3R1YWwgK1xuICAgICAgJyknLFxuICAgIGV4cHJcbiAgKTtcbn1cblxuLy8gRHVwbGljYXRlIHBhcmFtZXRlciBuYW1lc1xuXG5leHBvcnQgZnVuY3Rpb24gZHVwbGljYXRlUGFyYW1ldGVyTmFtZXMocnVsZU5hbWUsIGR1cGxpY2F0ZXMsIHNvdXJjZSkge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXG4gICAgJ0R1cGxpY2F0ZSBwYXJhbWV0ZXIgbmFtZXMgaW4gcnVsZSAnICsgcnVsZU5hbWUgKyAnOiAnICsgZHVwbGljYXRlcy5qb2luKCcsICcpLFxuICAgIHNvdXJjZVxuICApO1xufVxuXG4vLyBJbnZhbGlkIHBhcmFtZXRlciBleHByZXNzaW9uXG5cbmV4cG9ydCBmdW5jdGlvbiBpbnZhbGlkUGFyYW1ldGVyKHJ1bGVOYW1lLCBleHByKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAnSW52YWxpZCBwYXJhbWV0ZXIgdG8gcnVsZSAnICtcbiAgICAgIHJ1bGVOYW1lICtcbiAgICAgICc6ICcgK1xuICAgICAgZXhwciArXG4gICAgICAnIGhhcyBhcml0eSAnICtcbiAgICAgIGV4cHIuZ2V0QXJpdHkoKSArXG4gICAgICAnLCBidXQgcGFyYW1ldGVyIGV4cHJlc3Npb25zIG11c3QgaGF2ZSBhcml0eSAxJyxcbiAgICBleHByLnNvdXJjZVxuICApO1xufVxuXG4vLyBBcHBsaWNhdGlvbiBvZiBzeW50YWN0aWMgcnVsZSBmcm9tIGxleGljYWwgcnVsZVxuXG5jb25zdCBzeW50YWN0aWNWc0xleGljYWxOb3RlID1cbiAgJ05PVEU6IEEgX3N5bnRhY3RpYyBydWxlXyBpcyBhIHJ1bGUgd2hvc2UgbmFtZSBiZWdpbnMgd2l0aCBhIGNhcGl0YWwgbGV0dGVyLiAnICtcbiAgJ1NlZSBodHRwczovL29obWpzLm9yZy9kL3N2bCBmb3IgbW9yZSBkZXRhaWxzLic7XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBsaWNhdGlvbk9mU3ludGFjdGljUnVsZUZyb21MZXhpY2FsQ29udGV4dChydWxlTmFtZSwgYXBwbHlFeHByKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAnQ2Fubm90IGFwcGx5IHN5bnRhY3RpYyBydWxlICcgKyBydWxlTmFtZSArICcgZnJvbSBoZXJlIChpbnNpZGUgYSBsZXhpY2FsIGNvbnRleHQpJyxcbiAgICBhcHBseUV4cHIuc291cmNlXG4gICk7XG59XG5cbi8vIExleGljYWwgcnVsZSBhcHBsaWNhdGlvbiB1c2VkIHdpdGggYXBwbHlTeW50YWN0aWNcblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5U3ludGFjdGljV2l0aExleGljYWxSdWxlQXBwbGljYXRpb24oYXBwbHlFeHByKSB7XG4gIGNvbnN0IHtydWxlTmFtZX0gPSBhcHBseUV4cHI7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICBgYXBwbHlTeW50YWN0aWMgaXMgZm9yIHN5bnRhY3RpYyBydWxlcywgYnV0ICcke3J1bGVOYW1lfScgaXMgYSBsZXhpY2FsIHJ1bGUuIGAgK1xuICAgICAgc3ludGFjdGljVnNMZXhpY2FsTm90ZSxcbiAgICBhcHBseUV4cHIuc291cmNlXG4gICk7XG59XG5cbi8vIEFwcGxpY2F0aW9uIG9mIGFwcGx5U3ludGFjdGljIGluIGEgc3ludGFjdGljIGNvbnRleHRcblxuZXhwb3J0IGZ1bmN0aW9uIHVubmVjZXNzYXJ5RXhwZXJpbWVudGFsQXBwbHlTeW50YWN0aWMoYXBwbHlFeHByKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAnYXBwbHlTeW50YWN0aWMgaXMgbm90IHJlcXVpcmVkIGhlcmUgKGluIGEgc3ludGFjdGljIGNvbnRleHQpJyxcbiAgICBhcHBseUV4cHIuc291cmNlXG4gICk7XG59XG5cbi8vIEluY29ycmVjdCBhcmd1bWVudCB0eXBlXG5cbmV4cG9ydCBmdW5jdGlvbiBpbmNvcnJlY3RBcmd1bWVudFR5cGUoZXhwZWN0ZWRUeXBlLCBleHByKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcignSW5jb3JyZWN0IGFyZ3VtZW50IHR5cGU6IGV4cGVjdGVkICcgKyBleHBlY3RlZFR5cGUsIGV4cHIuc291cmNlKTtcbn1cblxuLy8gTXVsdGlwbGUgaW5zdGFuY2VzIG9mIHRoZSBzdXBlci1zcGxpY2Ugb3BlcmF0b3IgKGAuLi5gKSBpbiB0aGUgcnVsZSBib2R5LlxuXG5leHBvcnQgZnVuY3Rpb24gbXVsdGlwbGVTdXBlclNwbGljZXMoZXhwcikge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoXCInLi4uJyBjYW4gYXBwZWFyIGF0IG1vc3Qgb25jZSBpbiBhIHJ1bGUgYm9keVwiLCBleHByLnNvdXJjZSk7XG59XG5cbi8vIFVuaWNvZGUgY29kZSBwb2ludCBlc2NhcGVzXG5cbmV4cG9ydCBmdW5jdGlvbiBpbnZhbGlkQ29kZVBvaW50KGFwcGx5V3JhcHBlcikge1xuICBjb25zdCBub2RlID0gYXBwbHlXcmFwcGVyLl9ub2RlO1xuICBhc3NlcnQobm9kZSAmJiBub2RlLmlzTm9udGVybWluYWwoKSAmJiBub2RlLmN0b3JOYW1lID09PSAnZXNjYXBlQ2hhcl91bmljb2RlQ29kZVBvaW50Jyk7XG5cbiAgLy8gR2V0IGFuIGludGVydmFsIHRoYXQgY292ZXJzIGFsbCBvZiB0aGUgaGV4IGRpZ2l0cy5cbiAgY29uc3QgZGlnaXRJbnRlcnZhbHMgPSBhcHBseVdyYXBwZXIuY2hpbGRyZW4uc2xpY2UoMSwgLTEpLm1hcChkID0+IGQuc291cmNlKTtcbiAgY29uc3QgZnVsbEludGVydmFsID0gZGlnaXRJbnRlcnZhbHNbMF0uY292ZXJhZ2VXaXRoKC4uLmRpZ2l0SW50ZXJ2YWxzLnNsaWNlKDEpKTtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFxuICAgIGBVKyR7ZnVsbEludGVydmFsLmNvbnRlbnRzfSBpcyBub3QgYSB2YWxpZCBVbmljb2RlIGNvZGUgcG9pbnRgLFxuICAgIGZ1bGxJbnRlcnZhbFxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBLbGVlbmUgb3BlcmF0b3JzIC0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBmdW5jdGlvbiBrbGVlbmVFeHBySGFzTnVsbGFibGVPcGVyYW5kKGtsZWVuZUV4cHIsIGFwcGxpY2F0aW9uU3RhY2spIHtcbiAgY29uc3QgYWN0dWFscyA9XG4gICAgYXBwbGljYXRpb25TdGFjay5sZW5ndGggPiAwID8gYXBwbGljYXRpb25TdGFja1thcHBsaWNhdGlvblN0YWNrLmxlbmd0aCAtIDFdLmFyZ3MgOiBbXTtcbiAgY29uc3QgZXhwciA9IGtsZWVuZUV4cHIuZXhwci5zdWJzdGl0dXRlUGFyYW1zKGFjdHVhbHMpO1xuICBsZXQgbWVzc2FnZSA9XG4gICAgJ051bGxhYmxlIGV4cHJlc3Npb24gJyArXG4gICAgZXhwciArXG4gICAgXCIgaXMgbm90IGFsbG93ZWQgaW5zaWRlICdcIiArXG4gICAga2xlZW5lRXhwci5vcGVyYXRvciArXG4gICAgXCInIChwb3NzaWJsZSBpbmZpbml0ZSBsb29wKVwiO1xuICBpZiAoYXBwbGljYXRpb25TdGFjay5sZW5ndGggPiAwKSB7XG4gICAgY29uc3Qgc3RhY2tUcmFjZSA9IGFwcGxpY2F0aW9uU3RhY2tcbiAgICAgIC5tYXAoYXBwID0+IG5ldyBwZXhwcnMuQXBwbHkoYXBwLnJ1bGVOYW1lLCBhcHAuYXJncykpXG4gICAgICAuam9pbignXFxuJyk7XG4gICAgbWVzc2FnZSArPSAnXFxuQXBwbGljYXRpb24gc3RhY2sgKG1vc3QgcmVjZW50IGFwcGxpY2F0aW9uIGxhc3QpOlxcbicgKyBzdGFja1RyYWNlO1xuICB9XG4gIHJldHVybiBjcmVhdGVFcnJvcihtZXNzYWdlLCBrbGVlbmVFeHByLmV4cHIuc291cmNlKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0gYXJpdHkgLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGZ1bmN0aW9uIGluY29uc2lzdGVudEFyaXR5KHJ1bGVOYW1lLCBleHBlY3RlZCwgYWN0dWFsLCBleHByKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAnUnVsZSAnICtcbiAgICAgIHJ1bGVOYW1lICtcbiAgICAgICcgaW52b2x2ZXMgYW4gYWx0ZXJuYXRpb24gd2hpY2ggaGFzIGluY29uc2lzdGVudCBhcml0eSAnICtcbiAgICAgICcoZXhwZWN0ZWQgJyArXG4gICAgICBleHBlY3RlZCArXG4gICAgICAnLCBnb3QgJyArXG4gICAgICBhY3R1YWwgK1xuICAgICAgJyknLFxuICAgIGV4cHIuc291cmNlXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIHByb3BlcnRpZXMgLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZVByb3BlcnR5TmFtZXMoZHVwbGljYXRlcykge1xuICByZXR1cm4gY3JlYXRlRXJyb3IoJ09iamVjdCBwYXR0ZXJuIGhhcyBkdXBsaWNhdGUgcHJvcGVydHkgbmFtZXM6ICcgKyBkdXBsaWNhdGVzLmpvaW4oJywgJykpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBjb25zdHJ1Y3RvcnMgLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGZ1bmN0aW9uIGludmFsaWRDb25zdHJ1Y3RvckNhbGwoZ3JhbW1hciwgY3Rvck5hbWUsIGNoaWxkcmVuKSB7XG4gIHJldHVybiBjcmVhdGVFcnJvcihcbiAgICAnQXR0ZW1wdCB0byBpbnZva2UgY29uc3RydWN0b3IgJyArIGN0b3JOYW1lICsgJyB3aXRoIGludmFsaWQgb3IgdW5leHBlY3RlZCBhcmd1bWVudHMnXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIGNvbnZlbmllbmNlIC0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBmdW5jdGlvbiBtdWx0aXBsZUVycm9ycyhlcnJvcnMpIHtcbiAgY29uc3QgbWVzc2FnZXMgPSBlcnJvcnMubWFwKGUgPT4gZS5tZXNzYWdlKTtcbiAgcmV0dXJuIGNyZWF0ZUVycm9yKFsnRXJyb3JzOiddLmNvbmNhdChtZXNzYWdlcykuam9pbignXFxuLSAnKSwgZXJyb3JzWzBdLmludGVydmFsKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0gc2VtYW50aWMgLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGZ1bmN0aW9uIG1pc3NpbmdTZW1hbnRpY0FjdGlvbihjdG9yTmFtZSwgbmFtZSwgdHlwZSwgc3RhY2spIHtcbiAgbGV0IHN0YWNrVHJhY2UgPSBzdGFja1xuICAgIC5zbGljZSgwLCAtMSlcbiAgICAubWFwKGluZm8gPT4ge1xuICAgICAgY29uc3QgYW5zID0gJyAgJyArIGluZm9bMF0ubmFtZSArICcgPiAnICsgaW5mb1sxXTtcbiAgICAgIHJldHVybiBpbmZvLmxlbmd0aCA9PT0gMyA/IGFucyArIFwiIGZvciAnXCIgKyBpbmZvWzJdICsgXCInXCIgOiBhbnM7XG4gICAgfSlcbiAgICAuam9pbignXFxuJyk7XG4gIHN0YWNrVHJhY2UgKz0gJ1xcbiAgJyArIG5hbWUgKyAnID4gJyArIGN0b3JOYW1lO1xuXG4gIGxldCBtb3JlSW5mbyA9ICcnO1xuICBpZiAoY3Rvck5hbWUgPT09ICdfaXRlcicpIHtcbiAgICBtb3JlSW5mbyA9IFtcbiAgICAgICdcXG5OT1RFOiBhcyBvZiBPaG0gdjE2LCB0aGVyZSBpcyBubyBkZWZhdWx0IGFjdGlvbiBmb3IgaXRlcmF0aW9uIG5vZGVzIOKAlCBzZWUgJyxcbiAgICAgICcgIGh0dHBzOi8vb2htanMub3JnL2QvZHNhIGZvciBkZXRhaWxzLicsXG4gICAgXS5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIGNvbnN0IG1lc3NhZ2UgPSBbXG4gICAgYE1pc3Npbmcgc2VtYW50aWMgYWN0aW9uIGZvciAnJHtjdG9yTmFtZX0nIGluICR7dHlwZX0gJyR7bmFtZX0nLiR7bW9yZUluZm99YCxcbiAgICAnQWN0aW9uIHN0YWNrIChtb3N0IHJlY2VudCBjYWxsIGxhc3QpOicsXG4gICAgc3RhY2tUcmFjZSxcbiAgXS5qb2luKCdcXG4nKTtcblxuICBjb25zdCBlID0gY3JlYXRlRXJyb3IobWVzc2FnZSk7XG4gIGUubmFtZSA9ICdtaXNzaW5nU2VtYW50aWNBY3Rpb24nO1xuICByZXR1cm4gZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRocm93RXJyb3JzKGVycm9ycykge1xuICBpZiAoZXJyb3JzLmxlbmd0aCA9PT0gMSkge1xuICAgIHRocm93IGVycm9yc1swXTtcbiAgfVxuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDEpIHtcbiAgICB0aHJvdyBtdWx0aXBsZUVycm9ycyhlcnJvcnMpO1xuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gR2l2ZW4gYW4gYXJyYXkgb2YgbnVtYmVycyBgYXJyYCwgcmV0dXJuIGFuIGFycmF5IG9mIHRoZSBudW1iZXJzIGFzIHN0cmluZ3MsXG4vLyByaWdodC1qdXN0aWZpZWQgYW5kIHBhZGRlZCB0byB0aGUgc2FtZSBsZW5ndGguXG5mdW5jdGlvbiBwYWROdW1iZXJzVG9FcXVhbExlbmd0aChhcnIpIHtcbiAgbGV0IG1heExlbiA9IDA7XG4gIGNvbnN0IHN0cmluZ3MgPSBhcnIubWFwKG4gPT4ge1xuICAgIGNvbnN0IHN0ciA9IG4udG9TdHJpbmcoKTtcbiAgICBtYXhMZW4gPSBNYXRoLm1heChtYXhMZW4sIHN0ci5sZW5ndGgpO1xuICAgIHJldHVybiBzdHI7XG4gIH0pO1xuICByZXR1cm4gc3RyaW5ncy5tYXAocyA9PiBjb21tb24ucGFkTGVmdChzLCBtYXhMZW4pKTtcbn1cblxuLy8gUHJvZHVjZSBhIG5ldyBzdHJpbmcgdGhhdCB3b3VsZCBiZSB0aGUgcmVzdWx0IG9mIGNvcHlpbmcgdGhlIGNvbnRlbnRzXG4vLyBvZiB0aGUgc3RyaW5nIGBzcmNgIG9udG8gYGRlc3RgIGF0IG9mZnNldCBgb2ZmZXN0YC5cbmZ1bmN0aW9uIHN0cmNweShkZXN0LCBzcmMsIG9mZnNldCkge1xuICBjb25zdCBvcmlnRGVzdExlbiA9IGRlc3QubGVuZ3RoO1xuICBjb25zdCBzdGFydCA9IGRlc3Quc2xpY2UoMCwgb2Zmc2V0KTtcbiAgY29uc3QgZW5kID0gZGVzdC5zbGljZShvZmZzZXQgKyBzcmMubGVuZ3RoKTtcbiAgcmV0dXJuIChzdGFydCArIHNyYyArIGVuZCkuc3Vic3RyKDAsIG9yaWdEZXN0TGVuKTtcbn1cblxuLy8gQ2FzdHMgdGhlIHVuZGVybHlpbmcgbGluZUFuZENvbCBvYmplY3QgdG8gYSBmb3JtYXR0ZWQgbWVzc2FnZSBzdHJpbmcsXG4vLyBoaWdobGlnaHRpbmcgYHJhbmdlc2AuXG5mdW5jdGlvbiBsaW5lQW5kQ29sdW1uVG9NZXNzYWdlKC4uLnJhbmdlcykge1xuICBjb25zdCBsaW5lQW5kQ29sID0gdGhpcztcbiAgY29uc3Qge29mZnNldH0gPSBsaW5lQW5kQ29sO1xuICBjb25zdCB7cmVwZWF0U3RyfSA9IGNvbW1vbjtcblxuICBjb25zdCBzYiA9IG5ldyBjb21tb24uU3RyaW5nQnVmZmVyKCk7XG4gIHNiLmFwcGVuZCgnTGluZSAnICsgbGluZUFuZENvbC5saW5lTnVtICsgJywgY29sICcgKyBsaW5lQW5kQ29sLmNvbE51bSArICc6XFxuJyk7XG5cbiAgLy8gQW4gYXJyYXkgb2YgdGhlIHByZXZpb3VzLCBjdXJyZW50LCBhbmQgbmV4dCBsaW5lIG51bWJlcnMgYXMgc3RyaW5ncyBvZiBlcXVhbCBsZW5ndGguXG4gIGNvbnN0IGxpbmVOdW1iZXJzID0gcGFkTnVtYmVyc1RvRXF1YWxMZW5ndGgoW1xuICAgIGxpbmVBbmRDb2wucHJldkxpbmUgPT0gbnVsbCA/IDAgOiBsaW5lQW5kQ29sLmxpbmVOdW0gLSAxLFxuICAgIGxpbmVBbmRDb2wubGluZU51bSxcbiAgICBsaW5lQW5kQ29sLm5leHRMaW5lID09IG51bGwgPyAwIDogbGluZUFuZENvbC5saW5lTnVtICsgMSxcbiAgXSk7XG5cbiAgLy8gSGVscGVyIGZvciBhcHBlbmRpbmcgZm9ybWF0dGluZyBpbnB1dCBsaW5lcyB0byB0aGUgYnVmZmVyLlxuICBjb25zdCBhcHBlbmRMaW5lID0gKG51bSwgY29udGVudCwgcHJlZml4KSA9PiB7XG4gICAgc2IuYXBwZW5kKHByZWZpeCArIGxpbmVOdW1iZXJzW251bV0gKyAnIHwgJyArIGNvbnRlbnQgKyAnXFxuJyk7XG4gIH07XG5cbiAgLy8gSW5jbHVkZSB0aGUgcHJldmlvdXMgbGluZSBmb3IgY29udGV4dCBpZiBwb3NzaWJsZS5cbiAgaWYgKGxpbmVBbmRDb2wucHJldkxpbmUgIT0gbnVsbCkge1xuICAgIGFwcGVuZExpbmUoMCwgbGluZUFuZENvbC5wcmV2TGluZSwgJyAgJyk7XG4gIH1cbiAgLy8gTGluZSB0aGF0IHRoZSBlcnJvciBvY2N1cnJlZCBvbi5cbiAgYXBwZW5kTGluZSgxLCBsaW5lQW5kQ29sLmxpbmUsICc+ICcpO1xuXG4gIC8vIEJ1aWxkIHVwIHRoZSBsaW5lIHRoYXQgcG9pbnRzIHRvIHRoZSBvZmZzZXQgYW5kIHBvc3NpYmxlIGluZGljYXRlcyBvbmUgb3IgbW9yZSByYW5nZXMuXG4gIC8vIFN0YXJ0IHdpdGggYSBibGFuayBsaW5lLCBhbmQgaW5kaWNhdGUgZWFjaCByYW5nZSBieSBvdmVybGF5aW5nIGEgc3RyaW5nIG9mIGB+YCBjaGFycy5cbiAgY29uc3QgbGluZUxlbiA9IGxpbmVBbmRDb2wubGluZS5sZW5ndGg7XG4gIGxldCBpbmRpY2F0aW9uTGluZSA9IHJlcGVhdFN0cignICcsIGxpbmVMZW4gKyAxKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCByYW5nZXMubGVuZ3RoOyArK2kpIHtcbiAgICBsZXQgc3RhcnRJZHggPSByYW5nZXNbaV1bMF07XG4gICAgbGV0IGVuZElkeCA9IHJhbmdlc1tpXVsxXTtcbiAgICBjb21tb24uYXNzZXJ0KHN0YXJ0SWR4ID49IDAgJiYgc3RhcnRJZHggPD0gZW5kSWR4LCAncmFuZ2Ugc3RhcnQgbXVzdCBiZSA+PSAwIGFuZCA8PSBlbmQnKTtcblxuICAgIGNvbnN0IGxpbmVTdGFydE9mZnNldCA9IG9mZnNldCAtIGxpbmVBbmRDb2wuY29sTnVtICsgMTtcbiAgICBzdGFydElkeCA9IE1hdGgubWF4KDAsIHN0YXJ0SWR4IC0gbGluZVN0YXJ0T2Zmc2V0KTtcbiAgICBlbmRJZHggPSBNYXRoLm1pbihlbmRJZHggLSBsaW5lU3RhcnRPZmZzZXQsIGxpbmVMZW4pO1xuXG4gICAgaW5kaWNhdGlvbkxpbmUgPSBzdHJjcHkoaW5kaWNhdGlvbkxpbmUsIHJlcGVhdFN0cignficsIGVuZElkeCAtIHN0YXJ0SWR4KSwgc3RhcnRJZHgpO1xuICB9XG4gIGNvbnN0IGd1dHRlcldpZHRoID0gMiArIGxpbmVOdW1iZXJzWzFdLmxlbmd0aCArIDM7XG4gIHNiLmFwcGVuZChyZXBlYXRTdHIoJyAnLCBndXR0ZXJXaWR0aCkpO1xuICBpbmRpY2F0aW9uTGluZSA9IHN0cmNweShpbmRpY2F0aW9uTGluZSwgJ14nLCBsaW5lQW5kQ29sLmNvbE51bSAtIDEpO1xuICBzYi5hcHBlbmQoaW5kaWNhdGlvbkxpbmUucmVwbGFjZSgvICskLywgJycpICsgJ1xcbicpO1xuXG4gIC8vIEluY2x1ZGUgdGhlIG5leHQgbGluZSBmb3IgY29udGV4dCBpZiBwb3NzaWJsZS5cbiAgaWYgKGxpbmVBbmRDb2wubmV4dExpbmUgIT0gbnVsbCkge1xuICAgIGFwcGVuZExpbmUoMiwgbGluZUFuZENvbC5uZXh0TGluZSwgJyAgJyk7XG4gIH1cbiAgcmV0dXJuIHNiLmNvbnRlbnRzKCk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFeHBvcnRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5sZXQgYnVpbHRJblJ1bGVzQ2FsbGJhY2tzID0gW107XG5cbi8vIFNpbmNlIEdyYW1tYXIuQnVpbHRJblJ1bGVzIGlzIGJvb3RzdHJhcHBlZCwgbW9zdCBvZiBPaG0gY2FuJ3QgZGlyZWN0bHkgZGVwZW5kIGl0LlxuLy8gVGhpcyBmdW5jdGlvbiBhbGxvd3MgbW9kdWxlcyB0aGF0IGRvIGRlcGVuZCBvbiB0aGUgYnVpbHQtaW4gcnVsZXMgdG8gcmVnaXN0ZXIgYSBjYWxsYmFja1xuLy8gdGhhdCB3aWxsIGJlIGNhbGxlZCBsYXRlciBpbiB0aGUgaW5pdGlhbGl6YXRpb24gcHJvY2Vzcy5cbmV4cG9ydCBmdW5jdGlvbiBhd2FpdEJ1aWx0SW5SdWxlcyhjYikge1xuICBidWlsdEluUnVsZXNDYWxsYmFja3MucHVzaChjYik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbm5vdW5jZUJ1aWx0SW5SdWxlcyhncmFtbWFyKSB7XG4gIGJ1aWx0SW5SdWxlc0NhbGxiYWNrcy5mb3JFYWNoKGNiID0+IHtcbiAgICBjYihncmFtbWFyKTtcbiAgfSk7XG4gIGJ1aWx0SW5SdWxlc0NhbGxiYWNrcyA9IG51bGw7XG59XG5cbi8vIFJldHVybiBhbiBvYmplY3Qgd2l0aCB0aGUgbGluZSBhbmQgY29sdW1uIGluZm9ybWF0aW9uIGZvciB0aGUgZ2l2ZW5cbi8vIG9mZnNldCBpbiBgc3RyYC5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMaW5lQW5kQ29sdW1uKHN0ciwgb2Zmc2V0KSB7XG4gIGxldCBsaW5lTnVtID0gMTtcbiAgbGV0IGNvbE51bSA9IDE7XG5cbiAgbGV0IGN1cnJPZmZzZXQgPSAwO1xuICBsZXQgbGluZVN0YXJ0T2Zmc2V0ID0gMDtcblxuICBsZXQgbmV4dExpbmUgPSBudWxsO1xuICBsZXQgcHJldkxpbmUgPSBudWxsO1xuICBsZXQgcHJldkxpbmVTdGFydE9mZnNldCA9IC0xO1xuXG4gIHdoaWxlIChjdXJyT2Zmc2V0IDwgb2Zmc2V0KSB7XG4gICAgY29uc3QgYyA9IHN0ci5jaGFyQXQoY3Vyck9mZnNldCsrKTtcbiAgICBpZiAoYyA9PT0gJ1xcbicpIHtcbiAgICAgIGxpbmVOdW0rKztcbiAgICAgIGNvbE51bSA9IDE7XG4gICAgICBwcmV2TGluZVN0YXJ0T2Zmc2V0ID0gbGluZVN0YXJ0T2Zmc2V0O1xuICAgICAgbGluZVN0YXJ0T2Zmc2V0ID0gY3Vyck9mZnNldDtcbiAgICB9IGVsc2UgaWYgKGMgIT09ICdcXHInKSB7XG4gICAgICBjb2xOdW0rKztcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBlbmQgb2YgdGhlIHRhcmdldCBsaW5lLlxuICBsZXQgbGluZUVuZE9mZnNldCA9IHN0ci5pbmRleE9mKCdcXG4nLCBsaW5lU3RhcnRPZmZzZXQpO1xuICBpZiAobGluZUVuZE9mZnNldCA9PT0gLTEpIHtcbiAgICBsaW5lRW5kT2Zmc2V0ID0gc3RyLmxlbmd0aDtcbiAgfSBlbHNlIHtcbiAgICAvLyBHZXQgdGhlIG5leHQgbGluZS5cbiAgICBjb25zdCBuZXh0TGluZUVuZE9mZnNldCA9IHN0ci5pbmRleE9mKCdcXG4nLCBsaW5lRW5kT2Zmc2V0ICsgMSk7XG4gICAgbmV4dExpbmUgPVxuICAgICAgbmV4dExpbmVFbmRPZmZzZXQgPT09IC0xXG4gICAgICAgID8gc3RyLnNsaWNlKGxpbmVFbmRPZmZzZXQpXG4gICAgICAgIDogc3RyLnNsaWNlKGxpbmVFbmRPZmZzZXQsIG5leHRMaW5lRW5kT2Zmc2V0KTtcbiAgICAvLyBTdHJpcCBsZWFkaW5nIGFuZCB0cmFpbGluZyBFT0wgY2hhcihzKS5cbiAgICBuZXh0TGluZSA9IG5leHRMaW5lLnJlcGxhY2UoL15cXHI/XFxuLywgJycpLnJlcGxhY2UoL1xcciQvLCAnJyk7XG4gIH1cblxuICAvLyBHZXQgdGhlIHByZXZpb3VzIGxpbmUuXG4gIGlmIChwcmV2TGluZVN0YXJ0T2Zmc2V0ID49IDApIHtcbiAgICAvLyBTdHJpcCB0cmFpbGluZyBFT0wgY2hhcihzKS5cbiAgICBwcmV2TGluZSA9IHN0ci5zbGljZShwcmV2TGluZVN0YXJ0T2Zmc2V0LCBsaW5lU3RhcnRPZmZzZXQpLnJlcGxhY2UoL1xccj9cXG4kLywgJycpO1xuICB9XG5cbiAgLy8gR2V0IHRoZSB0YXJnZXQgbGluZSwgc3RyaXBwaW5nIGEgdHJhaWxpbmcgY2FycmlhZ2UgcmV0dXJuIGlmIG5lY2Vzc2FyeS5cbiAgY29uc3QgbGluZSA9IHN0ci5zbGljZShsaW5lU3RhcnRPZmZzZXQsIGxpbmVFbmRPZmZzZXQpLnJlcGxhY2UoL1xcciQvLCAnJyk7XG5cbiAgcmV0dXJuIHtcbiAgICBvZmZzZXQsXG4gICAgbGluZU51bSxcbiAgICBjb2xOdW0sXG4gICAgbGluZSxcbiAgICBwcmV2TGluZSxcbiAgICBuZXh0TGluZSxcbiAgICB0b1N0cmluZzogbGluZUFuZENvbHVtblRvTWVzc2FnZSxcbiAgfTtcbn1cblxuLy8gUmV0dXJuIGEgbmljZWx5LWZvcm1hdHRlZCBzdHJpbmcgZGVzY3JpYmluZyB0aGUgbGluZSBhbmQgY29sdW1uIGZvciB0aGVcbi8vIGdpdmVuIG9mZnNldCBpbiBgc3RyYCBoaWdobGlnaHRpbmcgYHJhbmdlc2AuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TGluZUFuZENvbHVtbk1lc3NhZ2Uoc3RyLCBvZmZzZXQsIC4uLnJhbmdlcykge1xuICByZXR1cm4gZ2V0TGluZUFuZENvbHVtbihzdHIsIG9mZnNldCkudG9TdHJpbmcoLi4ucmFuZ2VzKTtcbn1cblxuZXhwb3J0IGNvbnN0IHVuaXF1ZUlkID0gKCgpID0+IHtcbiAgbGV0IGlkQ291bnRlciA9IDA7XG4gIHJldHVybiBwcmVmaXggPT4gJycgKyBwcmVmaXggKyBpZENvdW50ZXIrKztcbn0pKCk7XG4iLCJpbXBvcnQge2Fzc2VydH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgZXJyb3JzIGZyb20gJy4vZXJyb3JzLmpzJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlsLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBjbGFzcyBJbnRlcnZhbCB7XG4gIGNvbnN0cnVjdG9yKHNvdXJjZVN0cmluZywgc3RhcnRJZHgsIGVuZElkeCkge1xuICAgIC8vIFN0b3JlIHRoZSBmdWxsIHNvdXJjZSBpbiBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LCBzbyB0aGF0IHdoZW5cbiAgICAvLyBncmFtbWFycyBhbmQgb3RoZXIgb2JqZWN0cyBhcmUgcHJpbnRlZCBpbiB0aGUgUkVQTCwgaXQncyBub3RcbiAgICAvLyBjbHV0dGVyZWQgd2l0aCBtdWx0aXBsZSBjb3BpZXMgb2YgdGhlIHNhbWUgbG9uZyBzdHJpbmcuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdfc291cmNlU3RyaW5nJywge1xuICAgICAgdmFsdWU6IHNvdXJjZVN0cmluZyxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICB9KTtcbiAgICB0aGlzLnN0YXJ0SWR4ID0gc3RhcnRJZHg7XG4gICAgdGhpcy5lbmRJZHggPSBlbmRJZHg7XG4gIH1cblxuICBnZXQgc291cmNlU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLl9zb3VyY2VTdHJpbmc7XG4gIH1cblxuICBnZXQgY29udGVudHMoKSB7XG4gICAgaWYgKHRoaXMuX2NvbnRlbnRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2NvbnRlbnRzID0gdGhpcy5zb3VyY2VTdHJpbmcuc2xpY2UodGhpcy5zdGFydElkeCwgdGhpcy5lbmRJZHgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29udGVudHM7XG4gIH1cblxuICBnZXQgbGVuZ3RoKCkge1xuICAgIHJldHVybiB0aGlzLmVuZElkeCAtIHRoaXMuc3RhcnRJZHg7XG4gIH1cblxuICBjb3ZlcmFnZVdpdGgoLi4uaW50ZXJ2YWxzKSB7XG4gICAgcmV0dXJuIEludGVydmFsLmNvdmVyYWdlKC4uLmludGVydmFscywgdGhpcyk7XG4gIH1cblxuICBjb2xsYXBzZWRMZWZ0KCkge1xuICAgIHJldHVybiBuZXcgSW50ZXJ2YWwodGhpcy5zb3VyY2VTdHJpbmcsIHRoaXMuc3RhcnRJZHgsIHRoaXMuc3RhcnRJZHgpO1xuICB9XG5cbiAgY29sbGFwc2VkUmlnaHQoKSB7XG4gICAgcmV0dXJuIG5ldyBJbnRlcnZhbCh0aGlzLnNvdXJjZVN0cmluZywgdGhpcy5lbmRJZHgsIHRoaXMuZW5kSWR4KTtcbiAgfVxuXG4gIGdldExpbmVBbmRDb2x1bW4oKSB7XG4gICAgcmV0dXJuIHV0aWwuZ2V0TGluZUFuZENvbHVtbih0aGlzLnNvdXJjZVN0cmluZywgdGhpcy5zdGFydElkeCk7XG4gIH1cblxuICBnZXRMaW5lQW5kQ29sdW1uTWVzc2FnZSgpIHtcbiAgICBjb25zdCByYW5nZSA9IFt0aGlzLnN0YXJ0SWR4LCB0aGlzLmVuZElkeF07XG4gICAgcmV0dXJuIHV0aWwuZ2V0TGluZUFuZENvbHVtbk1lc3NhZ2UodGhpcy5zb3VyY2VTdHJpbmcsIHRoaXMuc3RhcnRJZHgsIHJhbmdlKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYW4gYXJyYXkgb2YgMCwgMSwgb3IgMiBpbnRlcnZhbHMgdGhhdCByZXByZXNlbnRzIHRoZSByZXN1bHQgb2YgdGhlXG4gIC8vIGludGVydmFsIGRpZmZlcmVuY2Ugb3BlcmF0aW9uLlxuICBtaW51cyh0aGF0KSB7XG4gICAgaWYgKHRoaXMuc291cmNlU3RyaW5nICE9PSB0aGF0LnNvdXJjZVN0cmluZykge1xuICAgICAgdGhyb3cgZXJyb3JzLmludGVydmFsU291cmNlc0RvbnRNYXRjaCgpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdGFydElkeCA9PT0gdGhhdC5zdGFydElkeCAmJiB0aGlzLmVuZElkeCA9PT0gdGhhdC5lbmRJZHgpIHtcbiAgICAgIC8vIGB0aGlzYCBhbmQgYHRoYXRgIGFyZSB0aGUgc2FtZSBpbnRlcnZhbCFcbiAgICAgIHJldHVybiBbXTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhcnRJZHggPCB0aGF0LnN0YXJ0SWR4ICYmIHRoYXQuZW5kSWR4IDwgdGhpcy5lbmRJZHgpIHtcbiAgICAgIC8vIGB0aGF0YCBzcGxpdHMgYHRoaXNgIGludG8gdHdvIGludGVydmFsc1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgbmV3IEludGVydmFsKHRoaXMuc291cmNlU3RyaW5nLCB0aGlzLnN0YXJ0SWR4LCB0aGF0LnN0YXJ0SWR4KSxcbiAgICAgICAgbmV3IEludGVydmFsKHRoaXMuc291cmNlU3RyaW5nLCB0aGF0LmVuZElkeCwgdGhpcy5lbmRJZHgpLFxuICAgICAgXTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhcnRJZHggPCB0aGF0LmVuZElkeCAmJiB0aGF0LmVuZElkeCA8IHRoaXMuZW5kSWR4KSB7XG4gICAgICAvLyBgdGhhdGAgY29udGFpbnMgYSBwcmVmaXggb2YgYHRoaXNgXG4gICAgICByZXR1cm4gW25ldyBJbnRlcnZhbCh0aGlzLnNvdXJjZVN0cmluZywgdGhhdC5lbmRJZHgsIHRoaXMuZW5kSWR4KV07XG4gICAgfSBlbHNlIGlmICh0aGlzLnN0YXJ0SWR4IDwgdGhhdC5zdGFydElkeCAmJiB0aGF0LnN0YXJ0SWR4IDwgdGhpcy5lbmRJZHgpIHtcbiAgICAgIC8vIGB0aGF0YCBjb250YWlucyBhIHN1ZmZpeCBvZiBgdGhpc2BcbiAgICAgIHJldHVybiBbbmV3IEludGVydmFsKHRoaXMuc291cmNlU3RyaW5nLCB0aGlzLnN0YXJ0SWR4LCB0aGF0LnN0YXJ0SWR4KV07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGB0aGF0YCBhbmQgYHRoaXNgIGRvIG5vdCBvdmVybGFwXG4gICAgICByZXR1cm4gW3RoaXNdO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybnMgYSBuZXcgSW50ZXJ2YWwgdGhhdCBoYXMgdGhlIHNhbWUgZXh0ZW50IGFzIHRoaXMgb25lLCBidXQgd2hpY2ggaXMgcmVsYXRpdmVcbiAgLy8gdG8gYHRoYXRgLCBhbiBJbnRlcnZhbCB0aGF0IGZ1bGx5IGNvdmVycyB0aGlzIG9uZS5cbiAgcmVsYXRpdmVUbyh0aGF0KSB7XG4gICAgaWYgKHRoaXMuc291cmNlU3RyaW5nICE9PSB0aGF0LnNvdXJjZVN0cmluZykge1xuICAgICAgdGhyb3cgZXJyb3JzLmludGVydmFsU291cmNlc0RvbnRNYXRjaCgpO1xuICAgIH1cbiAgICBhc3NlcnQoXG4gICAgICB0aGlzLnN0YXJ0SWR4ID49IHRoYXQuc3RhcnRJZHggJiYgdGhpcy5lbmRJZHggPD0gdGhhdC5lbmRJZHgsXG4gICAgICAnb3RoZXIgaW50ZXJ2YWwgZG9lcyBub3QgY292ZXIgdGhpcyBvbmUnXG4gICAgKTtcbiAgICByZXR1cm4gbmV3IEludGVydmFsKFxuICAgICAgdGhpcy5zb3VyY2VTdHJpbmcsXG4gICAgICB0aGlzLnN0YXJ0SWR4IC0gdGhhdC5zdGFydElkeCxcbiAgICAgIHRoaXMuZW5kSWR4IC0gdGhhdC5zdGFydElkeFxuICAgICk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgbmV3IEludGVydmFsIHdoaWNoIGNvbnRhaW5zIHRoZSBzYW1lIGNvbnRlbnRzIGFzIHRoaXMgb25lLFxuICAvLyBidXQgd2l0aCB3aGl0ZXNwYWNlIHRyaW1tZWQgZnJvbSBib3RoIGVuZHMuXG4gIHRyaW1tZWQoKSB7XG4gICAgY29uc3Qge2NvbnRlbnRzfSA9IHRoaXM7XG4gICAgY29uc3Qgc3RhcnRJZHggPSB0aGlzLnN0YXJ0SWR4ICsgY29udGVudHMubWF0Y2goL15cXHMqLylbMF0ubGVuZ3RoO1xuICAgIGNvbnN0IGVuZElkeCA9IHRoaXMuZW5kSWR4IC0gY29udGVudHMubWF0Y2goL1xccyokLylbMF0ubGVuZ3RoO1xuICAgIHJldHVybiBuZXcgSW50ZXJ2YWwodGhpcy5zb3VyY2VTdHJpbmcsIHN0YXJ0SWR4LCBlbmRJZHgpO1xuICB9XG5cbiAgc3ViSW50ZXJ2YWwob2Zmc2V0LCBsZW4pIHtcbiAgICBjb25zdCBuZXdTdGFydElkeCA9IHRoaXMuc3RhcnRJZHggKyBvZmZzZXQ7XG4gICAgcmV0dXJuIG5ldyBJbnRlcnZhbCh0aGlzLnNvdXJjZVN0cmluZywgbmV3U3RhcnRJZHgsIG5ld1N0YXJ0SWR4ICsgbGVuKTtcbiAgfVxufVxuXG5JbnRlcnZhbC5jb3ZlcmFnZSA9IGZ1bmN0aW9uIChmaXJzdEludGVydmFsLCAuLi5pbnRlcnZhbHMpIHtcbiAgbGV0IHtzdGFydElkeCwgZW5kSWR4fSA9IGZpcnN0SW50ZXJ2YWw7XG4gIGZvciAoY29uc3QgaW50ZXJ2YWwgb2YgaW50ZXJ2YWxzKSB7XG4gICAgaWYgKGludGVydmFsLnNvdXJjZVN0cmluZyAhPT0gZmlyc3RJbnRlcnZhbC5zb3VyY2VTdHJpbmcpIHtcbiAgICAgIHRocm93IGVycm9ycy5pbnRlcnZhbFNvdXJjZXNEb250TWF0Y2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnRJZHggPSBNYXRoLm1pbihzdGFydElkeCwgaW50ZXJ2YWwuc3RhcnRJZHgpO1xuICAgICAgZW5kSWR4ID0gTWF0aC5tYXgoZW5kSWR4LCBpbnRlcnZhbC5lbmRJZHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3IEludGVydmFsKGZpcnN0SW50ZXJ2YWwuc291cmNlU3RyaW5nLCBzdGFydElkeCwgZW5kSWR4KTtcbn07XG4iLCJpbXBvcnQge0ludGVydmFsfSBmcm9tICcuL0ludGVydmFsLmpzJztcblxuY29uc3QgTUFYX0NIQVJfQ09ERSA9IDB4ZmZmZjtcbmV4cG9ydCBjb25zdCBNQVhfQ09ERV9QT0lOVCA9IDB4MTBmZmZmO1xuXG5leHBvcnQgY2xhc3MgSW5wdXRTdHJlYW0ge1xuICBjb25zdHJ1Y3Rvcihzb3VyY2UpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcbiAgICB0aGlzLnBvcyA9IDA7XG4gICAgdGhpcy5leGFtaW5lZExlbmd0aCA9IDA7XG4gIH1cblxuICBhdEVuZCgpIHtcbiAgICBjb25zdCBhbnMgPSB0aGlzLnBvcyA+PSB0aGlzLnNvdXJjZS5sZW5ndGg7XG4gICAgdGhpcy5leGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KHRoaXMuZXhhbWluZWRMZW5ndGgsIHRoaXMucG9zICsgMSk7XG4gICAgcmV0dXJuIGFucztcbiAgfVxuXG4gIG5leHQoKSB7XG4gICAgY29uc3QgYW5zID0gdGhpcy5zb3VyY2VbdGhpcy5wb3MrK107XG4gICAgdGhpcy5leGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KHRoaXMuZXhhbWluZWRMZW5ndGgsIHRoaXMucG9zKTtcbiAgICByZXR1cm4gYW5zO1xuICB9XG5cbiAgbmV4dENoYXJDb2RlKCkge1xuICAgIGNvbnN0IG5leHRDaGFyID0gdGhpcy5uZXh0KCk7XG4gICAgcmV0dXJuIG5leHRDaGFyICYmIG5leHRDaGFyLmNoYXJDb2RlQXQoMCk7XG4gIH1cblxuICBuZXh0Q29kZVBvaW50KCkge1xuICAgIGNvbnN0IGNwID0gdGhpcy5zb3VyY2Uuc2xpY2UodGhpcy5wb3MrKykuY29kZVBvaW50QXQoMCk7XG4gICAgLy8gSWYgdGhlIGNvZGUgcG9pbnQgaXMgYmV5b25kIHBsYW5lIDAsIGl0IHRha2VzIHVwIHR3byBjaGFyYWN0ZXJzLlxuICAgIGlmIChjcCA+IE1BWF9DSEFSX0NPREUpIHtcbiAgICAgIHRoaXMucG9zICs9IDE7XG4gICAgfVxuICAgIHRoaXMuZXhhbWluZWRMZW5ndGggPSBNYXRoLm1heCh0aGlzLmV4YW1pbmVkTGVuZ3RoLCB0aGlzLnBvcyk7XG4gICAgcmV0dXJuIGNwO1xuICB9XG5cbiAgbWF0Y2hTdHJpbmcocywgb3B0SWdub3JlQ2FzZSkge1xuICAgIGxldCBpZHg7XG4gICAgaWYgKG9wdElnbm9yZUNhc2UpIHtcbiAgICAgIC8qXG4gICAgICAgIENhc2UtaW5zZW5zaXRpdmUgY29tcGFyaXNvbiBpcyBhIHRyaWNreSBidXNpbmVzcy4gU29tZSBub3RhYmxlIGdvdGNoYXMgaW5jbHVkZSB0aGVcbiAgICAgICAgXCJUdXJraXNoIElcIiBwcm9ibGVtIChodHRwOi8vd3d3LmkxOG5ndXkuY29tL3VuaWNvZGUvdHVya2lzaC1pMThuLmh0bWwpIGFuZCB0aGUgZmFjdFxuICAgICAgICB0aGF0IHRoZSBHZXJtYW4gRXNzemV0ICjDnykgdHVybnMgaW50byBcIlNTXCIgaW4gdXBwZXIgY2FzZS5cblxuICAgICAgICBUaGlzIGlzIGludGVuZGVkIHRvIGJlIGEgbG9jYWxlLWludmFyaWFudCBjb21wYXJpc29uLCB3aGljaCBtZWFucyBpdCBtYXkgbm90IG9iZXlcbiAgICAgICAgbG9jYWxlLXNwZWNpZmljIGV4cGVjdGF0aW9ucyAoZS5nLiBcImlcIiA9PiBcIsSwXCIpLlxuXG4gICAgICAgIFNlZSBhbHNvIGh0dHBzOi8vdW5pY29kZS5vcmcvZmFxL2Nhc2VtYXBfY2hhcnByb3AuaHRtbCNjYXNlbWFwXG4gICAgICAgKi9cbiAgICAgIGZvciAoaWR4ID0gMDsgaWR4IDwgcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgIGNvbnN0IGFjdHVhbCA9IHRoaXMubmV4dCgpO1xuICAgICAgICBjb25zdCBleHBlY3RlZCA9IHNbaWR4XTtcbiAgICAgICAgaWYgKGFjdHVhbCA9PSBudWxsIHx8IGFjdHVhbC50b1VwcGVyQ2FzZSgpICE9PSBleHBlY3RlZC50b1VwcGVyQ2FzZSgpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gRGVmYXVsdCBpcyBjYXNlLXNlbnNpdGl2ZSBjb21wYXJpc29uLlxuICAgIGZvciAoaWR4ID0gMDsgaWR4IDwgcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICBpZiAodGhpcy5uZXh0KCkgIT09IHNbaWR4XSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgc291cmNlU2xpY2Uoc3RhcnRJZHgsIGVuZElkeCkge1xuICAgIHJldHVybiB0aGlzLnNvdXJjZS5zbGljZShzdGFydElkeCwgZW5kSWR4KTtcbiAgfVxuXG4gIGludGVydmFsKHN0YXJ0SWR4LCBvcHRFbmRJZHgpIHtcbiAgICByZXR1cm4gbmV3IEludGVydmFsKHRoaXMuc291cmNlLCBzdGFydElkeCwgb3B0RW5kSWR4ID8gb3B0RW5kSWR4IDogdGhpcy5wb3MpO1xuICB9XG59XG4iLCJpbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtJbnRlcnZhbH0gZnJvbSAnLi9JbnRlcnZhbC5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQcml2YXRlIHN0dWZmXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY2xhc3MgTWF0Y2hSZXN1bHQge1xuICBjb25zdHJ1Y3RvcihcbiAgICBtYXRjaGVyLFxuICAgIGlucHV0LFxuICAgIHN0YXJ0RXhwcixcbiAgICBjc3QsXG4gICAgY3N0T2Zmc2V0LFxuICAgIHJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbixcbiAgICBvcHRSZWNvcmRlZEZhaWx1cmVzXG4gICkge1xuICAgIHRoaXMubWF0Y2hlciA9IG1hdGNoZXI7XG4gICAgdGhpcy5pbnB1dCA9IGlucHV0O1xuICAgIHRoaXMuc3RhcnRFeHByID0gc3RhcnRFeHByO1xuICAgIHRoaXMuX2NzdCA9IGNzdDtcbiAgICB0aGlzLl9jc3RPZmZzZXQgPSBjc3RPZmZzZXQ7XG4gICAgdGhpcy5fcmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uID0gcmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uO1xuICAgIHRoaXMuX3JpZ2h0bW9zdEZhaWx1cmVzID0gb3B0UmVjb3JkZWRGYWlsdXJlcztcblxuICAgIGlmICh0aGlzLmZhaWxlZCgpKSB7XG4gICAgICBjb21tb24uZGVmaW5lTGF6eVByb3BlcnR5KHRoaXMsICdtZXNzYWdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCBkZXRhaWwgPSAnRXhwZWN0ZWQgJyArIHRoaXMuZ2V0RXhwZWN0ZWRUZXh0KCk7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgdXRpbC5nZXRMaW5lQW5kQ29sdW1uTWVzc2FnZSh0aGlzLmlucHV0LCB0aGlzLmdldFJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbigpKSArIGRldGFpbFxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgICBjb21tb24uZGVmaW5lTGF6eVByb3BlcnR5KHRoaXMsICdzaG9ydE1lc3NhZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0IGRldGFpbCA9ICdleHBlY3RlZCAnICsgdGhpcy5nZXRFeHBlY3RlZFRleHQoKTtcbiAgICAgICAgY29uc3QgZXJyb3JJbmZvID0gdXRpbC5nZXRMaW5lQW5kQ29sdW1uKFxuICAgICAgICAgIHRoaXMuaW5wdXQsXG4gICAgICAgICAgdGhpcy5nZXRSaWdodG1vc3RGYWlsdXJlUG9zaXRpb24oKVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gJ0xpbmUgJyArIGVycm9ySW5mby5saW5lTnVtICsgJywgY29sICcgKyBlcnJvckluZm8uY29sTnVtICsgJzogJyArIGRldGFpbDtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHN1Y2NlZWRlZCgpIHtcbiAgICByZXR1cm4gISF0aGlzLl9jc3Q7XG4gIH1cblxuICBmYWlsZWQoKSB7XG4gICAgcmV0dXJuICF0aGlzLnN1Y2NlZWRlZCgpO1xuICB9XG5cbiAgZ2V0UmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9yaWdodG1vc3RGYWlsdXJlUG9zaXRpb247XG4gIH1cblxuICBnZXRSaWdodG1vc3RGYWlsdXJlcygpIHtcbiAgICBpZiAoIXRoaXMuX3JpZ2h0bW9zdEZhaWx1cmVzKSB7XG4gICAgICB0aGlzLm1hdGNoZXIuc2V0SW5wdXQodGhpcy5pbnB1dCk7XG4gICAgICBjb25zdCBtYXRjaFJlc3VsdFdpdGhGYWlsdXJlcyA9IHRoaXMubWF0Y2hlci5fbWF0Y2godGhpcy5zdGFydEV4cHIsIHtcbiAgICAgICAgdHJhY2luZzogZmFsc2UsXG4gICAgICAgIHBvc2l0aW9uVG9SZWNvcmRGYWlsdXJlczogdGhpcy5nZXRSaWdodG1vc3RGYWlsdXJlUG9zaXRpb24oKSxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fcmlnaHRtb3N0RmFpbHVyZXMgPSBtYXRjaFJlc3VsdFdpdGhGYWlsdXJlcy5nZXRSaWdodG1vc3RGYWlsdXJlcygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmlnaHRtb3N0RmFpbHVyZXM7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5zdWNjZWVkZWQoKVxuICAgICAgPyAnW21hdGNoIHN1Y2NlZWRlZF0nXG4gICAgICA6ICdbbWF0Y2ggZmFpbGVkIGF0IHBvc2l0aW9uICcgKyB0aGlzLmdldFJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbigpICsgJ10nO1xuICB9XG5cbiAgLy8gUmV0dXJuIGEgc3RyaW5nIHN1bW1hcml6aW5nIHRoZSBleHBlY3RlZCBjb250ZW50cyBvZiB0aGUgaW5wdXQgc3RyZWFtIHdoZW5cbiAgLy8gdGhlIG1hdGNoIGZhaWx1cmUgb2NjdXJyZWQuXG4gIGdldEV4cGVjdGVkVGV4dCgpIHtcbiAgICBpZiAodGhpcy5zdWNjZWVkZWQoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgZ2V0IGV4cGVjdGVkIHRleHQgb2YgYSBzdWNjZXNzZnVsIE1hdGNoUmVzdWx0Jyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2IgPSBuZXcgY29tbW9uLlN0cmluZ0J1ZmZlcigpO1xuICAgIGxldCBmYWlsdXJlcyA9IHRoaXMuZ2V0UmlnaHRtb3N0RmFpbHVyZXMoKTtcblxuICAgIC8vIEZpbHRlciBvdXQgdGhlIGZsdWZmeSBmYWlsdXJlcyB0byBtYWtlIHRoZSBkZWZhdWx0IGVycm9yIG1lc3NhZ2VzIG1vcmUgdXNlZnVsXG4gICAgZmFpbHVyZXMgPSBmYWlsdXJlcy5maWx0ZXIoZmFpbHVyZSA9PiAhZmFpbHVyZS5pc0ZsdWZmeSgpKTtcblxuICAgIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IGZhaWx1cmVzLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgIGlmIChpZHggPiAwKSB7XG4gICAgICAgIGlmIChpZHggPT09IGZhaWx1cmVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICBzYi5hcHBlbmQoZmFpbHVyZXMubGVuZ3RoID4gMiA/ICcsIG9yICcgOiAnIG9yICcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNiLmFwcGVuZCgnLCAnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2IuYXBwZW5kKGZhaWx1cmVzW2lkeF0udG9TdHJpbmcoKSk7XG4gICAgfVxuICAgIHJldHVybiBzYi5jb250ZW50cygpO1xuICB9XG5cbiAgZ2V0SW50ZXJ2YWwoKSB7XG4gICAgY29uc3QgcG9zID0gdGhpcy5nZXRSaWdodG1vc3RGYWlsdXJlUG9zaXRpb24oKTtcbiAgICByZXR1cm4gbmV3IEludGVydmFsKHRoaXMuaW5wdXQsIHBvcywgcG9zKTtcbiAgfVxufVxuIiwiZXhwb3J0IGNsYXNzIFBvc0luZm8ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmFwcGxpY2F0aW9uTWVtb0tleVN0YWNrID0gW107IC8vIGFjdGl2ZSBhcHBsaWNhdGlvbnMgYXQgdGhpcyBwb3NpdGlvblxuICAgIHRoaXMubWVtbyA9IHt9O1xuICAgIHRoaXMubWF4RXhhbWluZWRMZW5ndGggPSAwO1xuICAgIHRoaXMubWF4UmlnaHRtb3N0RmFpbHVyZU9mZnNldCA9IC0xO1xuICAgIHRoaXMuY3VycmVudExlZnRSZWN1cnNpb24gPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpc0FjdGl2ZShhcHBsaWNhdGlvbikge1xuICAgIHJldHVybiB0aGlzLmFwcGxpY2F0aW9uTWVtb0tleVN0YWNrLmluZGV4T2YoYXBwbGljYXRpb24udG9NZW1vS2V5KCkpID49IDA7XG4gIH1cblxuICBlbnRlcihhcHBsaWNhdGlvbikge1xuICAgIHRoaXMuYXBwbGljYXRpb25NZW1vS2V5U3RhY2sucHVzaChhcHBsaWNhdGlvbi50b01lbW9LZXkoKSk7XG4gIH1cblxuICBleGl0KCkge1xuICAgIHRoaXMuYXBwbGljYXRpb25NZW1vS2V5U3RhY2sucG9wKCk7XG4gIH1cblxuICBzdGFydExlZnRSZWN1cnNpb24oaGVhZEFwcGxpY2F0aW9uLCBtZW1vUmVjKSB7XG4gICAgbWVtb1JlYy5pc0xlZnRSZWN1cnNpb24gPSB0cnVlO1xuICAgIG1lbW9SZWMuaGVhZEFwcGxpY2F0aW9uID0gaGVhZEFwcGxpY2F0aW9uO1xuICAgIG1lbW9SZWMubmV4dExlZnRSZWN1cnNpb24gPSB0aGlzLmN1cnJlbnRMZWZ0UmVjdXJzaW9uO1xuICAgIHRoaXMuY3VycmVudExlZnRSZWN1cnNpb24gPSBtZW1vUmVjO1xuXG4gICAgY29uc3Qge2FwcGxpY2F0aW9uTWVtb0tleVN0YWNrfSA9IHRoaXM7XG4gICAgY29uc3QgaW5kZXhPZkZpcnN0SW52b2x2ZWRSdWxlID1cbiAgICAgIGFwcGxpY2F0aW9uTWVtb0tleVN0YWNrLmluZGV4T2YoaGVhZEFwcGxpY2F0aW9uLnRvTWVtb0tleSgpKSArIDE7XG4gICAgY29uc3QgaW52b2x2ZWRBcHBsaWNhdGlvbk1lbW9LZXlzID0gYXBwbGljYXRpb25NZW1vS2V5U3RhY2suc2xpY2UoXG4gICAgICBpbmRleE9mRmlyc3RJbnZvbHZlZFJ1bGVcbiAgICApO1xuXG4gICAgbWVtb1JlYy5pc0ludm9sdmVkID0gZnVuY3Rpb24gKGFwcGxpY2F0aW9uTWVtb0tleSkge1xuICAgICAgcmV0dXJuIGludm9sdmVkQXBwbGljYXRpb25NZW1vS2V5cy5pbmRleE9mKGFwcGxpY2F0aW9uTWVtb0tleSkgPj0gMDtcbiAgICB9O1xuXG4gICAgbWVtb1JlYy51cGRhdGVJbnZvbHZlZEFwcGxpY2F0aW9uTWVtb0tleXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBmb3IgKGxldCBpZHggPSBpbmRleE9mRmlyc3RJbnZvbHZlZFJ1bGU7IGlkeCA8IGFwcGxpY2F0aW9uTWVtb0tleVN0YWNrLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgY29uc3QgYXBwbGljYXRpb25NZW1vS2V5ID0gYXBwbGljYXRpb25NZW1vS2V5U3RhY2tbaWR4XTtcbiAgICAgICAgaWYgKCF0aGlzLmlzSW52b2x2ZWQoYXBwbGljYXRpb25NZW1vS2V5KSkge1xuICAgICAgICAgIGludm9sdmVkQXBwbGljYXRpb25NZW1vS2V5cy5wdXNoKGFwcGxpY2F0aW9uTWVtb0tleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZW5kTGVmdFJlY3Vyc2lvbigpIHtcbiAgICB0aGlzLmN1cnJlbnRMZWZ0UmVjdXJzaW9uID0gdGhpcy5jdXJyZW50TGVmdFJlY3Vyc2lvbi5uZXh0TGVmdFJlY3Vyc2lvbjtcbiAgfVxuXG4gIC8vIE5vdGU6IHRoaXMgbWV0aG9kIGRvZXNuJ3QgZ2V0IGNhbGxlZCBmb3IgdGhlIFwiaGVhZFwiIG9mIGEgbGVmdCByZWN1cnNpb24gLS0gZm9yIExSIGhlYWRzLFxuICAvLyB0aGUgbWVtb2l6ZWQgcmVzdWx0ICh3aGljaCBzdGFydHMgb3V0IGJlaW5nIGEgZmFpbHVyZSkgaXMgYWx3YXlzIHVzZWQuXG4gIHNob3VsZFVzZU1lbW9pemVkUmVzdWx0KG1lbW9SZWMpIHtcbiAgICBpZiAoIW1lbW9SZWMuaXNMZWZ0UmVjdXJzaW9uKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3Qge2FwcGxpY2F0aW9uTWVtb0tleVN0YWNrfSA9IHRoaXM7XG4gICAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgYXBwbGljYXRpb25NZW1vS2V5U3RhY2subGVuZ3RoOyBpZHgrKykge1xuICAgICAgY29uc3QgYXBwbGljYXRpb25NZW1vS2V5ID0gYXBwbGljYXRpb25NZW1vS2V5U3RhY2tbaWR4XTtcbiAgICAgIGlmIChtZW1vUmVjLmlzSW52b2x2ZWQoYXBwbGljYXRpb25NZW1vS2V5KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgbWVtb2l6ZShtZW1vS2V5LCBtZW1vUmVjKSB7XG4gICAgdGhpcy5tZW1vW21lbW9LZXldID0gbWVtb1JlYztcbiAgICB0aGlzLm1heEV4YW1pbmVkTGVuZ3RoID0gTWF0aC5tYXgodGhpcy5tYXhFeGFtaW5lZExlbmd0aCwgbWVtb1JlYy5leGFtaW5lZExlbmd0aCk7XG4gICAgdGhpcy5tYXhSaWdodG1vc3RGYWlsdXJlT2Zmc2V0ID0gTWF0aC5tYXgoXG4gICAgICB0aGlzLm1heFJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQsXG4gICAgICBtZW1vUmVjLnJpZ2h0bW9zdEZhaWx1cmVPZmZzZXRcbiAgICApO1xuICAgIHJldHVybiBtZW1vUmVjO1xuICB9XG5cbiAgY2xlYXJPYnNvbGV0ZUVudHJpZXMocG9zLCBpbnZhbGlkYXRlZElkeCkge1xuICAgIGlmIChwb3MgKyB0aGlzLm1heEV4YW1pbmVkTGVuZ3RoIDw9IGludmFsaWRhdGVkSWR4KSB7XG4gICAgICAvLyBPcHRpbWl6YXRpb246IG5vbmUgb2YgdGhlIHJ1bGUgYXBwbGljYXRpb25zIHRoYXQgd2VyZSBtZW1vaXplZCBoZXJlIGV4YW1pbmVkIHRoZVxuICAgICAgLy8gaW50ZXJ2YWwgb2YgdGhlIGlucHV0IHRoYXQgY2hhbmdlZCwgc28gbm90aGluZyBoYXMgdG8gYmUgaW52YWxpZGF0ZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qge21lbW99ID0gdGhpcztcbiAgICB0aGlzLm1heEV4YW1pbmVkTGVuZ3RoID0gMDtcbiAgICB0aGlzLm1heFJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQgPSAtMTtcbiAgICBPYmplY3Qua2V5cyhtZW1vKS5mb3JFYWNoKGsgPT4ge1xuICAgICAgY29uc3QgbWVtb1JlYyA9IG1lbW9ba107XG4gICAgICBpZiAocG9zICsgbWVtb1JlYy5leGFtaW5lZExlbmd0aCA+IGludmFsaWRhdGVkSWR4KSB7XG4gICAgICAgIGRlbGV0ZSBtZW1vW2tdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tYXhFeGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KHRoaXMubWF4RXhhbWluZWRMZW5ndGgsIG1lbW9SZWMuZXhhbWluZWRMZW5ndGgpO1xuICAgICAgICB0aGlzLm1heFJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQgPSBNYXRoLm1heChcbiAgICAgICAgICB0aGlzLm1heFJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQsXG4gICAgICAgICAgbWVtb1JlYy5yaWdodG1vc3RGYWlsdXJlT2Zmc2V0XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiIsImltcG9ydCB7SW50ZXJ2YWx9IGZyb20gJy4vSW50ZXJ2YWwuanMnO1xuaW1wb3J0ICogYXMgY29tbW9uIGZyb20gJy4vY29tbW9uLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFVuaWNvZGUgY2hhcmFjdGVycyB0aGF0IGFyZSB1c2VkIGluIHRoZSBgdG9TdHJpbmdgIG91dHB1dC5cbmNvbnN0IEJBTExPVF9YID0gJ1xcdTI3MTcnO1xuY29uc3QgQ0hFQ0tfTUFSSyA9ICdcXHUyNzEzJztcbmNvbnN0IERPVF9PUEVSQVRPUiA9ICdcXHUyMkM1JztcbmNvbnN0IFJJR0hUV0FSRFNfRE9VQkxFX0FSUk9XID0gJ1xcdTIxRDInO1xuY29uc3QgU1lNQk9MX0ZPUl9IT1JJWk9OVEFMX1RBQlVMQVRJT04gPSAnXFx1MjQwOSc7XG5jb25zdCBTWU1CT0xfRk9SX0xJTkVfRkVFRCA9ICdcXHUyNDBBJztcbmNvbnN0IFNZTUJPTF9GT1JfQ0FSUklBR0VfUkVUVVJOID0gJ1xcdTI0MEQnO1xuXG5jb25zdCBGbGFncyA9IHtcbiAgc3VjY2VlZGVkOiAxIDw8IDAsXG4gIGlzUm9vdE5vZGU6IDEgPDwgMSxcbiAgaXNJbXBsaWNpdFNwYWNlczogMSA8PCAyLFxuICBpc01lbW9pemVkOiAxIDw8IDMsXG4gIGlzSGVhZE9mTGVmdFJlY3Vyc2lvbjogMSA8PCA0LFxuICB0ZXJtaW5hdGVzTFI6IDEgPDwgNSxcbn07XG5cbmZ1bmN0aW9uIHNwYWNlcyhuKSB7XG4gIHJldHVybiBjb21tb24ucmVwZWF0KCcgJywgbikuam9pbignJyk7XG59XG5cbi8vIFJldHVybiBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIHBvcnRpb24gb2YgYGlucHV0YCBhdCBvZmZzZXQgYHBvc2AuXG4vLyBUaGUgcmVzdWx0IHdpbGwgY29udGFpbiBleGFjdGx5IGBsZW5gIGNoYXJhY3RlcnMuXG5mdW5jdGlvbiBnZXRJbnB1dEV4Y2VycHQoaW5wdXQsIHBvcywgbGVuKSB7XG4gIGNvbnN0IGV4Y2VycHQgPSBhc0VzY2FwZWRTdHJpbmcoaW5wdXQuc2xpY2UocG9zLCBwb3MgKyBsZW4pKTtcblxuICAvLyBQYWQgdGhlIG91dHB1dCBpZiBuZWNlc3NhcnkuXG4gIGlmIChleGNlcnB0Lmxlbmd0aCA8IGxlbikge1xuICAgIHJldHVybiBleGNlcnB0ICsgY29tbW9uLnJlcGVhdCgnICcsIGxlbiAtIGV4Y2VycHQubGVuZ3RoKS5qb2luKCcnKTtcbiAgfVxuICByZXR1cm4gZXhjZXJwdDtcbn1cblxuZnVuY3Rpb24gYXNFc2NhcGVkU3RyaW5nKG9iaikge1xuICBpZiAodHlwZW9mIG9iaiA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBSZXBsYWNlIG5vbi1wcmludGFibGUgY2hhcmFjdGVycyB3aXRoIHZpc2libGUgc3ltYm9scy5cbiAgICByZXR1cm4gb2JqXG4gICAgICAucmVwbGFjZSgvIC9nLCBET1RfT1BFUkFUT1IpXG4gICAgICAucmVwbGFjZSgvXFx0L2csIFNZTUJPTF9GT1JfSE9SSVpPTlRBTF9UQUJVTEFUSU9OKVxuICAgICAgLnJlcGxhY2UoL1xcbi9nLCBTWU1CT0xfRk9SX0xJTkVfRkVFRClcbiAgICAgIC5yZXBsYWNlKC9cXHIvZywgU1lNQk9MX0ZPUl9DQVJSSUFHRV9SRVRVUk4pO1xuICB9XG4gIHJldHVybiBTdHJpbmcob2JqKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0gVHJhY2UgLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGNsYXNzIFRyYWNlIHtcbiAgY29uc3RydWN0b3IoaW5wdXQsIHBvczEsIHBvczIsIGV4cHIsIHN1Y2NlZWRlZCwgYmluZGluZ3MsIG9wdENoaWxkcmVuKSB7XG4gICAgdGhpcy5pbnB1dCA9IGlucHV0O1xuICAgIHRoaXMucG9zID0gdGhpcy5wb3MxID0gcG9zMTtcbiAgICB0aGlzLnBvczIgPSBwb3MyO1xuICAgIHRoaXMuc291cmNlID0gbmV3IEludGVydmFsKGlucHV0LCBwb3MxLCBwb3MyKTtcbiAgICB0aGlzLmV4cHIgPSBleHByO1xuICAgIHRoaXMuYmluZGluZ3MgPSBiaW5kaW5ncztcbiAgICB0aGlzLmNoaWxkcmVuID0gb3B0Q2hpbGRyZW4gfHwgW107XG4gICAgdGhpcy50ZXJtaW5hdGluZ0xSRW50cnkgPSBudWxsO1xuXG4gICAgdGhpcy5fZmxhZ3MgPSBzdWNjZWVkZWQgPyBGbGFncy5zdWNjZWVkZWQgOiAwO1xuICB9XG5cbiAgZ2V0IGRpc3BsYXlTdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXhwci50b0Rpc3BsYXlTdHJpbmcoKTtcbiAgfVxuXG4gIGNsb25lKCkge1xuICAgIHJldHVybiB0aGlzLmNsb25lV2l0aEV4cHIodGhpcy5leHByKTtcbiAgfVxuXG4gIGNsb25lV2l0aEV4cHIoZXhwcikge1xuICAgIGNvbnN0IGFucyA9IG5ldyBUcmFjZShcbiAgICAgIHRoaXMuaW5wdXQsXG4gICAgICB0aGlzLnBvcyxcbiAgICAgIHRoaXMucG9zMixcbiAgICAgIGV4cHIsXG4gICAgICB0aGlzLnN1Y2NlZWRlZCxcbiAgICAgIHRoaXMuYmluZGluZ3MsXG4gICAgICB0aGlzLmNoaWxkcmVuXG4gICAgKTtcblxuICAgIGFucy5pc0hlYWRPZkxlZnRSZWN1cnNpb24gPSB0aGlzLmlzSGVhZE9mTGVmdFJlY3Vyc2lvbjtcbiAgICBhbnMuaXNJbXBsaWNpdFNwYWNlcyA9IHRoaXMuaXNJbXBsaWNpdFNwYWNlcztcbiAgICBhbnMuaXNNZW1vaXplZCA9IHRoaXMuaXNNZW1vaXplZDtcbiAgICBhbnMuaXNSb290Tm9kZSA9IHRoaXMuaXNSb290Tm9kZTtcbiAgICBhbnMudGVybWluYXRlc0xSID0gdGhpcy50ZXJtaW5hdGVzTFI7XG4gICAgYW5zLnRlcm1pbmF0aW5nTFJFbnRyeSA9IHRoaXMudGVybWluYXRpbmdMUkVudHJ5O1xuICAgIHJldHVybiBhbnM7XG4gIH1cblxuICAvLyBSZWNvcmQgdGhlIHRyYWNlIGluZm9ybWF0aW9uIGZvciB0aGUgdGVybWluYXRpbmcgY29uZGl0aW9uIG9mIHRoZSBMUiBsb29wLlxuICByZWNvcmRMUlRlcm1pbmF0aW9uKHJ1bGVCb2R5VHJhY2UsIHZhbHVlKSB7XG4gICAgdGhpcy50ZXJtaW5hdGluZ0xSRW50cnkgPSBuZXcgVHJhY2UoXG4gICAgICB0aGlzLmlucHV0LFxuICAgICAgdGhpcy5wb3MsXG4gICAgICB0aGlzLnBvczIsXG4gICAgICB0aGlzLmV4cHIsXG4gICAgICBmYWxzZSxcbiAgICAgIFt2YWx1ZV0sXG4gICAgICBbcnVsZUJvZHlUcmFjZV1cbiAgICApO1xuICAgIHRoaXMudGVybWluYXRpbmdMUkVudHJ5LnRlcm1pbmF0ZXNMUiA9IHRydWU7XG4gIH1cblxuICAvLyBSZWN1cnNpdmVseSB0cmF2ZXJzZSB0aGlzIHRyYWNlIG5vZGUgYW5kIGFsbCBpdHMgZGVzY2VuZGVudHMsIGNhbGxpbmcgYSB2aXNpdG9yIGZ1bmN0aW9uXG4gIC8vIGZvciBlYWNoIG5vZGUgdGhhdCBpcyB2aXNpdGVkLiBJZiBgdmlzdG9yT2JqT3JGbmAgaXMgYW4gb2JqZWN0LCB0aGVuIGl0cyAnZW50ZXInIHByb3BlcnR5XG4gIC8vIGlzIGEgZnVuY3Rpb24gdG8gY2FsbCBiZWZvcmUgdmlzaXRpbmcgdGhlIGNoaWxkcmVuIG9mIGEgbm9kZSwgYW5kIGl0cyAnZXhpdCcgcHJvcGVydHkgaXNcbiAgLy8gYSBmdW5jdGlvbiB0byBjYWxsIGFmdGVyd2FyZHMuIElmIGB2aXNpdG9yT2JqT3JGbmAgaXMgYSBmdW5jdGlvbiwgaXQgcmVwcmVzZW50cyB0aGUgJ2VudGVyJ1xuICAvLyBmdW5jdGlvbi5cbiAgLy9cbiAgLy8gVGhlIGZ1bmN0aW9ucyBhcmUgY2FsbGVkIHdpdGggdGhyZWUgYXJndW1lbnRzOiB0aGUgVHJhY2Ugbm9kZSwgaXRzIHBhcmVudCBUcmFjZSwgYW5kIGEgbnVtYmVyXG4gIC8vIHJlcHJlc2VudGluZyB0aGUgZGVwdGggb2YgdGhlIG5vZGUgaW4gdGhlIHRyZWUuIChUaGUgcm9vdCBub2RlIGhhcyBkZXB0aCAwLikgYG9wdFRoaXNBcmdgLCBpZlxuICAvLyBzcGVjaWZpZWQsIGlzIHRoZSB2YWx1ZSB0byB1c2UgZm9yIGB0aGlzYCB3aGVuIGV4ZWN1dGluZyB0aGUgdmlzaXRvciBmdW5jdGlvbnMuXG4gIHdhbGsodmlzaXRvck9iak9yRm4sIG9wdFRoaXNBcmcpIHtcbiAgICBsZXQgdmlzaXRvciA9IHZpc2l0b3JPYmpPckZuO1xuICAgIGlmICh0eXBlb2YgdmlzaXRvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmlzaXRvciA9IHtlbnRlcjogdmlzaXRvcn07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3dhbGsobm9kZSwgcGFyZW50LCBkZXB0aCkge1xuICAgICAgbGV0IHJlY3Vyc2UgPSB0cnVlO1xuICAgICAgaWYgKHZpc2l0b3IuZW50ZXIpIHtcbiAgICAgICAgaWYgKHZpc2l0b3IuZW50ZXIuY2FsbChvcHRUaGlzQXJnLCBub2RlLCBwYXJlbnQsIGRlcHRoKSA9PT0gVHJhY2UucHJvdG90eXBlLlNLSVApIHtcbiAgICAgICAgICByZWN1cnNlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChyZWN1cnNlKSB7XG4gICAgICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaChjaGlsZCA9PiB7XG4gICAgICAgICAgX3dhbGsoY2hpbGQsIG5vZGUsIGRlcHRoICsgMSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodmlzaXRvci5leGl0KSB7XG4gICAgICAgICAgdmlzaXRvci5leGl0LmNhbGwob3B0VGhpc0FyZywgbm9kZSwgcGFyZW50LCBkZXB0aCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuaXNSb290Tm9kZSkge1xuICAgICAgLy8gRG9uJ3QgdmlzaXQgdGhlIHJvb3Qgbm9kZSBpdHNlbGYsIG9ubHkgaXRzIGNoaWxkcmVuLlxuICAgICAgdGhpcy5jaGlsZHJlbi5mb3JFYWNoKGMgPT4ge1xuICAgICAgICBfd2FsayhjLCBudWxsLCAwKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBfd2Fsayh0aGlzLCBudWxsLCAwKTtcbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm4gYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRyYWNlLlxuICAvLyBTYW1wbGU6XG4gIC8vICAgICAxMuKLhSvii4Uy4ouFKuKLhTMg4pyTIGV4cCDih5IgIFwiMTJcIlxuICAvLyAgICAgMTLii4Ur4ouFMuKLhSrii4UzICAg4pyTIGFkZEV4cCAoTFIpIOKHkiAgXCIxMlwiXG4gIC8vICAgICAxMuKLhSvii4Uy4ouFKuKLhTMgICAgICAg4pyXIGFkZEV4cF9wbHVzXG4gIHRvU3RyaW5nKCkge1xuICAgIGNvbnN0IHNiID0gbmV3IGNvbW1vbi5TdHJpbmdCdWZmZXIoKTtcbiAgICB0aGlzLndhbGsoKG5vZGUsIHBhcmVudCwgZGVwdGgpID0+IHtcbiAgICAgIGlmICghbm9kZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5TS0lQO1xuICAgICAgfVxuICAgICAgY29uc3QgY3Rvck5hbWUgPSBub2RlLmV4cHIuY29uc3RydWN0b3IubmFtZTtcbiAgICAgIC8vIERvbid0IHByaW50IGFueXRoaW5nIGZvciBBbHQgbm9kZXMuXG4gICAgICBpZiAoY3Rvck5hbWUgPT09ICdBbHQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNiLmFwcGVuZChnZXRJbnB1dEV4Y2VycHQobm9kZS5pbnB1dCwgbm9kZS5wb3MsIDEwKSArIHNwYWNlcyhkZXB0aCAqIDIgKyAxKSk7XG4gICAgICBzYi5hcHBlbmQoKG5vZGUuc3VjY2VlZGVkID8gQ0hFQ0tfTUFSSyA6IEJBTExPVF9YKSArICcgJyArIG5vZGUuZGlzcGxheVN0cmluZyk7XG4gICAgICBpZiAobm9kZS5pc0hlYWRPZkxlZnRSZWN1cnNpb24pIHtcbiAgICAgICAgc2IuYXBwZW5kKCcgKExSKScpO1xuICAgICAgfVxuICAgICAgaWYgKG5vZGUuc3VjY2VlZGVkKSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnRzID0gYXNFc2NhcGVkU3RyaW5nKG5vZGUuc291cmNlLmNvbnRlbnRzKTtcbiAgICAgICAgc2IuYXBwZW5kKCcgJyArIFJJR0hUV0FSRFNfRE9VQkxFX0FSUk9XICsgJyAgJyk7XG4gICAgICAgIHNiLmFwcGVuZCh0eXBlb2YgY29udGVudHMgPT09ICdzdHJpbmcnID8gJ1wiJyArIGNvbnRlbnRzICsgJ1wiJyA6IGNvbnRlbnRzKTtcbiAgICAgIH1cbiAgICAgIHNiLmFwcGVuZCgnXFxuJyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNiLmNvbnRlbnRzKCk7XG4gIH1cbn1cblxuLy8gQSB2YWx1ZSB0aGF0IGNhbiBiZSByZXR1cm5lZCBmcm9tIHZpc2l0b3IgZnVuY3Rpb25zIHRvIGluZGljYXRlIHRoYXQgYVxuLy8gbm9kZSBzaG91bGQgbm90IGJlIHJlY3Vyc2VkIGludG8uXG5UcmFjZS5wcm90b3R5cGUuU0tJUCA9IHt9O1xuXG4vLyBGb3IgY29udmVuaWVuY2UsIGNyZWF0ZSBhIGdldHRlciBhbmQgc2V0dGVyIGZvciB0aGUgYm9vbGVhbiBmbGFncyBpbiBgRmxhZ3NgLlxuT2JqZWN0LmtleXMoRmxhZ3MpLmZvckVhY2gobmFtZSA9PiB7XG4gIGNvbnN0IG1hc2sgPSBGbGFnc1tuYW1lXTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFRyYWNlLnByb3RvdHlwZSwgbmFtZSwge1xuICAgIGdldCgpIHtcbiAgICAgIHJldHVybiAodGhpcy5fZmxhZ3MgJiBtYXNrKSAhPT0gMDtcbiAgICB9LFxuICAgIHNldCh2YWwpIHtcbiAgICAgIGlmICh2YWwpIHtcbiAgICAgICAgdGhpcy5fZmxhZ3MgfD0gbWFzaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2ZsYWdzICY9IH5tYXNrO1xuICAgICAgfVxuICAgIH0sXG4gIH0pO1xufSk7XG4iLCJpbXBvcnQge2Fic3RyYWN0fSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKlxuICBSZXR1cm4gdHJ1ZSBpZiB3ZSBzaG91bGQgc2tpcCBzcGFjZXMgcHJlY2VkaW5nIHRoaXMgZXhwcmVzc2lvbiBpbiBhIHN5bnRhY3RpYyBjb250ZXh0LlxuKi9cbnBleHBycy5QRXhwci5wcm90b3R5cGUuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSA9IGFic3RyYWN0KCdhbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlJyk7XG5cbi8qXG4gIEdlbmVyYWxseSwgdGhlc2UgYXJlIGFsbCBmaXJzdC1vcmRlciBleHByZXNzaW9ucyBhbmQgKHdpdGggdGhlIGV4Y2VwdGlvbiBvZiBBcHBseSlcbiAgZGlyZWN0bHkgcmVhZCBmcm9tIHRoZSBpbnB1dCBzdHJlYW0uXG4qL1xucGV4cHJzLmFueS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLmVuZC5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLkFwcGx5LnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLlJhbmdlLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4vKlxuICBIaWdoZXItb3JkZXIgZXhwcmVzc2lvbnMgdGhhdCBkb24ndCBkaXJlY3RseSBjb25zdW1lIGlucHV0LlxuKi9cbnBleHBycy5BbHQucHJvdG90eXBlLmFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UgPVxuICBwZXhwcnMuSXRlci5wcm90b3R5cGUuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSA9XG4gIHBleHBycy5MZXgucHJvdG90eXBlLmFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UgPVxuICBwZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS5hbGxvd3NTa2lwcGluZ1ByZWNlZGluZ1NwYWNlID1cbiAgcGV4cHJzLk5vdC5wcm90b3R5cGUuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSA9XG4gIHBleHBycy5QYXJhbS5wcm90b3R5cGUuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSA9XG4gIHBleHBycy5TZXEucHJvdG90eXBlLmFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UgPVxuICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuIiwiaW1wb3J0IHthYnN0cmFjdCwgaXNTeW50YWN0aWN9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIGVycm9ycyBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbC5qcyc7XG5cbmxldCBCdWlsdEluUnVsZXM7XG5cbnV0aWwuYXdhaXRCdWlsdEluUnVsZXMoZyA9PiB7XG4gIEJ1aWx0SW5SdWxlcyA9IGc7XG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmxldCBsZXhpZnlDb3VudDtcblxucGV4cHJzLlBFeHByLnByb3RvdHlwZS5hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9IGZ1bmN0aW9uIChydWxlTmFtZSwgZ3JhbW1hcikge1xuICBsZXhpZnlDb3VudCA9IDA7XG4gIHRoaXMuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkKHJ1bGVOYW1lLCBncmFtbWFyKTtcbn07XG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkID0gYWJzdHJhY3QoXG4gICdfYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQnXG4pO1xuXG5wZXhwcnMuYW55Ll9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9XG4gIHBleHBycy5lbmQuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkID1cbiAgcGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPVxuICBwZXhwcnMuUmFuZ2UucHJvdG90eXBlLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9XG4gIHBleHBycy5QYXJhbS5wcm90b3R5cGUuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkID1cbiAgcGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPVxuICAgIGZ1bmN0aW9uIChydWxlTmFtZSwgZ3JhbW1hcikge1xuICAgICAgLy8gbm8tb3BcbiAgICB9O1xuXG5wZXhwcnMuTGV4LnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPSBmdW5jdGlvbiAocnVsZU5hbWUsIGdyYW1tYXIpIHtcbiAgbGV4aWZ5Q291bnQrKztcbiAgdGhpcy5leHByLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hcik7XG4gIGxleGlmeUNvdW50LS07XG59O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPSBmdW5jdGlvbiAocnVsZU5hbWUsIGdyYW1tYXIpIHtcbiAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgdGhpcy50ZXJtcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpcy50ZXJtc1tpZHhdLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hcik7XG4gIH1cbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZCA9IGZ1bmN0aW9uIChydWxlTmFtZSwgZ3JhbW1hcikge1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLmZhY3RvcnMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXMuZmFjdG9yc1tpZHhdLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hcik7XG4gIH1cbn07XG5cbnBleHBycy5JdGVyLnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPVxuICBwZXhwcnMuTm90LnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPVxuICBwZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPVxuICAgIGZ1bmN0aW9uIChydWxlTmFtZSwgZ3JhbW1hcikge1xuICAgICAgdGhpcy5leHByLl9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hcik7XG4gICAgfTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS5fYXNzZXJ0QWxsQXBwbGljYXRpb25zQXJlVmFsaWQgPSBmdW5jdGlvbiAoXG4gIHJ1bGVOYW1lLFxuICBncmFtbWFyLFxuICBza2lwU3ludGFjdGljQ2hlY2sgPSBmYWxzZVxuKSB7XG4gIGNvbnN0IHJ1bGVJbmZvID0gZ3JhbW1hci5ydWxlc1t0aGlzLnJ1bGVOYW1lXTtcbiAgY29uc3QgaXNDb250ZXh0U3ludGFjdGljID0gaXNTeW50YWN0aWMocnVsZU5hbWUpICYmIGxleGlmeUNvdW50ID09PSAwO1xuXG4gIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBydWxlIGV4aXN0cy4uLlxuICBpZiAoIXJ1bGVJbmZvKSB7XG4gICAgdGhyb3cgZXJyb3JzLnVuZGVjbGFyZWRSdWxlKHRoaXMucnVsZU5hbWUsIGdyYW1tYXIubmFtZSwgdGhpcy5zb3VyY2UpO1xuICB9XG5cbiAgLy8gLi4uYW5kIHRoYXQgdGhpcyBhcHBsaWNhdGlvbiBpcyBhbGxvd2VkXG4gIGlmICghc2tpcFN5bnRhY3RpY0NoZWNrICYmIGlzU3ludGFjdGljKHRoaXMucnVsZU5hbWUpICYmICFpc0NvbnRleHRTeW50YWN0aWMpIHtcbiAgICB0aHJvdyBlcnJvcnMuYXBwbGljYXRpb25PZlN5bnRhY3RpY1J1bGVGcm9tTGV4aWNhbENvbnRleHQodGhpcy5ydWxlTmFtZSwgdGhpcyk7XG4gIH1cblxuICAvLyAuLi5hbmQgdGhhdCB0aGlzIGFwcGxpY2F0aW9uIGhhcyB0aGUgY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzLlxuICBjb25zdCBhY3R1YWwgPSB0aGlzLmFyZ3MubGVuZ3RoO1xuICBjb25zdCBleHBlY3RlZCA9IHJ1bGVJbmZvLmZvcm1hbHMubGVuZ3RoO1xuICBpZiAoYWN0dWFsICE9PSBleHBlY3RlZCkge1xuICAgIHRocm93IGVycm9ycy53cm9uZ051bWJlck9mQXJndW1lbnRzKHRoaXMucnVsZU5hbWUsIGV4cGVjdGVkLCBhY3R1YWwsIHRoaXMuc291cmNlKTtcbiAgfVxuXG4gIGNvbnN0IGlzQnVpbHRJbkFwcGx5U3ludGFjdGljID1cbiAgICBCdWlsdEluUnVsZXMgJiYgcnVsZUluZm8gPT09IEJ1aWx0SW5SdWxlcy5ydWxlcy5hcHBseVN5bnRhY3RpYztcbiAgY29uc3QgaXNCdWlsdEluQ2FzZUluc2Vuc2l0aXZlID1cbiAgICBCdWlsdEluUnVsZXMgJiYgcnVsZUluZm8gPT09IEJ1aWx0SW5SdWxlcy5ydWxlcy5jYXNlSW5zZW5zaXRpdmU7XG5cbiAgLy8gSWYgaXQncyBhbiBhcHBsaWNhdGlvbiBvZiAnY2FzZUluc2Vuc2l0aXZlJywgZW5zdXJlIHRoYXQgdGhlIGFyZ3VtZW50IGlzIGEgVGVybWluYWwuXG4gIGlmIChpc0J1aWx0SW5DYXNlSW5zZW5zaXRpdmUpIHtcbiAgICBpZiAoISh0aGlzLmFyZ3NbMF0gaW5zdGFuY2VvZiBwZXhwcnMuVGVybWluYWwpKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuaW5jb3JyZWN0QXJndW1lbnRUeXBlKCdhIFRlcm1pbmFsIChlLmcuIFwiYWJjXCIpJywgdGhpcy5hcmdzWzBdKTtcbiAgICB9XG4gIH1cblxuICBpZiAoaXNCdWlsdEluQXBwbHlTeW50YWN0aWMpIHtcbiAgICBjb25zdCBhcmcgPSB0aGlzLmFyZ3NbMF07XG4gICAgaWYgKCEoYXJnIGluc3RhbmNlb2YgcGV4cHJzLkFwcGx5KSkge1xuICAgICAgdGhyb3cgZXJyb3JzLmluY29ycmVjdEFyZ3VtZW50VHlwZSgnYSBzeW50YWN0aWMgcnVsZSBhcHBsaWNhdGlvbicsIGFyZyk7XG4gICAgfVxuICAgIGlmICghaXNTeW50YWN0aWMoYXJnLnJ1bGVOYW1lKSkge1xuICAgICAgdGhyb3cgZXJyb3JzLmFwcGx5U3ludGFjdGljV2l0aExleGljYWxSdWxlQXBwbGljYXRpb24oYXJnKTtcbiAgICB9XG4gICAgaWYgKGlzQ29udGV4dFN5bnRhY3RpYykge1xuICAgICAgdGhyb3cgZXJyb3JzLnVubmVjZXNzYXJ5RXhwZXJpbWVudGFsQXBwbHlTeW50YWN0aWModGhpcyk7XG4gICAgfVxuICB9XG5cbiAgLy8gLi4uYW5kIHRoYXQgYWxsIG9mIHRoZSBhcmd1bWVudCBleHByZXNzaW9ucyBvbmx5IGhhdmUgdmFsaWQgYXBwbGljYXRpb25zIGFuZCBoYXZlIGFyaXR5IDEuXG4gIC8vIElmIGB0aGlzYCBpcyBhbiBhcHBsaWNhdGlvbiBvZiB0aGUgYnVpbHQtaW4gYXBwbHlTeW50YWN0aWMgcnVsZSwgdGhlbiBpdHMgYXJnIGlzXG4gIC8vIGFsbG93ZWQgKGFuZCBleHBlY3RlZCkgdG8gYmUgYSBzeW50YWN0aWMgcnVsZSwgZXZlbiBpZiB3ZSdyZSBpbiBhIGxleGljYWwgY29udGV4dC5cbiAgdGhpcy5hcmdzLmZvckVhY2goYXJnID0+IHtcbiAgICBhcmcuX2Fzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkKHJ1bGVOYW1lLCBncmFtbWFyLCBpc0J1aWx0SW5BcHBseVN5bnRhY3RpYyk7XG4gICAgaWYgKGFyZy5nZXRBcml0eSgpICE9PSAxKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuaW52YWxpZFBhcmFtZXRlcih0aGlzLnJ1bGVOYW1lLCBhcmcpO1xuICAgIH1cbiAgfSk7XG59O1xuIiwiaW1wb3J0IHthYnN0cmFjdH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgZXJyb3JzIGZyb20gJy4vZXJyb3JzLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPSBhYnN0cmFjdChcbiAgJ2Fzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5J1xuKTtcblxucGV4cHJzLmFueS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9XG4gIHBleHBycy5lbmQuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPVxuICBwZXhwcnMuVGVybWluYWwucHJvdG90eXBlLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID1cbiAgcGV4cHJzLlJhbmdlLnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9XG4gIHBleHBycy5QYXJhbS5wcm90b3R5cGUuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPVxuICBwZXhwcnMuTGV4LnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9XG4gIHBleHBycy5Vbmljb2RlQ2hhci5wcm90b3R5cGUuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkgPVxuICAgIGZ1bmN0aW9uIChydWxlTmFtZSkge1xuICAgICAgLy8gbm8tb3BcbiAgICB9O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9IGZ1bmN0aW9uIChydWxlTmFtZSkge1xuICBpZiAodGhpcy50ZXJtcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgYXJpdHkgPSB0aGlzLnRlcm1zWzBdLmdldEFyaXR5KCk7XG4gIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IHRoaXMudGVybXMubGVuZ3RoOyBpZHgrKykge1xuICAgIGNvbnN0IHRlcm0gPSB0aGlzLnRlcm1zW2lkeF07XG4gICAgdGVybS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSgpO1xuICAgIGNvbnN0IG90aGVyQXJpdHkgPSB0ZXJtLmdldEFyaXR5KCk7XG4gICAgaWYgKGFyaXR5ICE9PSBvdGhlckFyaXR5KSB7XG4gICAgICB0aHJvdyBlcnJvcnMuaW5jb25zaXN0ZW50QXJpdHkocnVsZU5hbWUsIGFyaXR5LCBvdGhlckFyaXR5LCB0ZXJtKTtcbiAgICB9XG4gIH1cbn07XG5cbnBleHBycy5FeHRlbmQucHJvdG90eXBlLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID0gZnVuY3Rpb24gKHJ1bGVOYW1lKSB7XG4gIC8vIEV4dGVuZCBpcyBhIHNwZWNpYWwgY2FzZSBvZiBBbHQgdGhhdCdzIGd1YXJhbnRlZWQgdG8gaGF2ZSBleGFjdGx5IHR3b1xuICAvLyBjYXNlczogW2V4dGVuc2lvbnMsIG9yaWdCb2R5XS5cbiAgY29uc3QgYWN0dWFsQXJpdHkgPSB0aGlzLnRlcm1zWzBdLmdldEFyaXR5KCk7XG4gIGNvbnN0IGV4cGVjdGVkQXJpdHkgPSB0aGlzLnRlcm1zWzFdLmdldEFyaXR5KCk7XG4gIGlmIChhY3R1YWxBcml0eSAhPT0gZXhwZWN0ZWRBcml0eSkge1xuICAgIHRocm93IGVycm9ycy5pbmNvbnNpc3RlbnRBcml0eShydWxlTmFtZSwgZXhwZWN0ZWRBcml0eSwgYWN0dWFsQXJpdHksIHRoaXMudGVybXNbMF0pO1xuICB9XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9IGZ1bmN0aW9uIChydWxlTmFtZSkge1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLmZhY3RvcnMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXMuZmFjdG9yc1tpZHhdLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5KHJ1bGVOYW1lKTtcbiAgfVxufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5ID0gZnVuY3Rpb24gKHJ1bGVOYW1lKSB7XG4gIHRoaXMuZXhwci5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eShydWxlTmFtZSk7XG59O1xuXG5wZXhwcnMuTm90LnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9IGZ1bmN0aW9uIChydWxlTmFtZSkge1xuICAvLyBuby1vcCAobm90IHJlcXVpcmVkIGIvYyB0aGUgbmVzdGVkIGV4cHIgZG9lc24ndCBzaG93IHVwIGluIHRoZSBDU1QpXG59O1xuXG5wZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9IGZ1bmN0aW9uIChydWxlTmFtZSkge1xuICB0aGlzLmV4cHIuYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkocnVsZU5hbWUpO1xufTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS5hc3NlcnRDaG9pY2VzSGF2ZVVuaWZvcm1Bcml0eSA9IGZ1bmN0aW9uIChydWxlTmFtZSkge1xuICAvLyBUaGUgYXJpdGllcyBvZiB0aGUgcGFyYW1ldGVyIGV4cHJlc3Npb25zIGlzIHJlcXVpcmVkIHRvIGJlIDEgYnlcbiAgLy8gYGFzc2VydEFsbEFwcGxpY2F0aW9uc0FyZVZhbGlkKClgLlxufTtcbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIGVycm9ycyBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5wZXhwcnMuUEV4cHIucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9IGFic3RyYWN0KFxuICAnYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlJ1xuKTtcblxucGV4cHJzLmFueS5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUgPVxuICBwZXhwcnMuZW5kLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9XG4gIHBleHBycy5UZXJtaW5hbC5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID1cbiAgcGV4cHJzLlJhbmdlLnByb3RvdHlwZS5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUgPVxuICBwZXhwcnMuUGFyYW0ucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9XG4gIHBleHBycy5Vbmljb2RlQ2hhci5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID1cbiAgICBmdW5jdGlvbiAoZ3JhbW1hcikge1xuICAgICAgLy8gbm8tb3BcbiAgICB9O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUgPSBmdW5jdGlvbiAoZ3JhbW1hcikge1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLnRlcm1zLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzLnRlcm1zW2lkeF0uYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlKGdyYW1tYXIpO1xuICB9XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUgPSBmdW5jdGlvbiAoZ3JhbW1hcikge1xuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLmZhY3RvcnMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXMuZmFjdG9yc1tpZHhdLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZShncmFtbWFyKTtcbiAgfVxufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9IGZ1bmN0aW9uIChncmFtbWFyKSB7XG4gIC8vIE5vdGU6IHRoaXMgaXMgdGhlIGltcGxlbWVudGF0aW9uIG9mIHRoaXMgbWV0aG9kIGZvciBgU3RhcmAgYW5kIGBQbHVzYCBleHByZXNzaW9ucy5cbiAgLy8gSXQgaXMgb3ZlcnJpZGRlbiBmb3IgYE9wdGAgYmVsb3cuXG4gIHRoaXMuZXhwci5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUoZ3JhbW1hcik7XG4gIGlmICh0aGlzLmV4cHIuaXNOdWxsYWJsZShncmFtbWFyKSkge1xuICAgIHRocm93IGVycm9ycy5rbGVlbmVFeHBySGFzTnVsbGFibGVPcGVyYW5kKHRoaXMsIFtdKTtcbiAgfVxufTtcblxucGV4cHJzLk9wdC5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID1cbiAgcGV4cHJzLk5vdC5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID1cbiAgcGV4cHJzLkxvb2thaGVhZC5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID1cbiAgcGV4cHJzLkxleC5wcm90b3R5cGUuYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlID1cbiAgICBmdW5jdGlvbiAoZ3JhbW1hcikge1xuICAgICAgdGhpcy5leHByLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZShncmFtbWFyKTtcbiAgICB9O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZSA9IGZ1bmN0aW9uIChncmFtbWFyKSB7XG4gIHRoaXMuYXJncy5mb3JFYWNoKGFyZyA9PiB7XG4gICAgYXJnLmFzc2VydEl0ZXJhdGVkRXhwcnNBcmVOb3ROdWxsYWJsZShncmFtbWFyKTtcbiAgfSk7XG59O1xuIiwiaW1wb3J0ICogYXMgY29tbW9uIGZyb20gJy4vY29tbW9uLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBjbGFzcyBOb2RlIHtcbiAgY29uc3RydWN0b3IobWF0Y2hMZW5ndGgpIHtcbiAgICB0aGlzLm1hdGNoTGVuZ3RoID0gbWF0Y2hMZW5ndGg7XG4gIH1cblxuICBnZXQgY3Rvck5hbWUoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzdWJjbGFzcyByZXNwb25zaWJpbGl0eScpO1xuICB9XG5cbiAgbnVtQ2hpbGRyZW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuY2hpbGRyZW4gPyB0aGlzLmNoaWxkcmVuLmxlbmd0aCA6IDA7XG4gIH1cblxuICBjaGlsZEF0KGlkeCkge1xuICAgIGlmICh0aGlzLmNoaWxkcmVuKSB7XG4gICAgICByZXR1cm4gdGhpcy5jaGlsZHJlbltpZHhdO1xuICAgIH1cbiAgfVxuXG4gIGluZGV4T2ZDaGlsZChhcmcpIHtcbiAgICByZXR1cm4gdGhpcy5jaGlsZHJlbi5pbmRleE9mKGFyZyk7XG4gIH1cblxuICBoYXNDaGlsZHJlbigpIHtcbiAgICByZXR1cm4gdGhpcy5udW1DaGlsZHJlbigpID4gMDtcbiAgfVxuXG4gIGhhc05vQ2hpbGRyZW4oKSB7XG4gICAgcmV0dXJuICF0aGlzLmhhc0NoaWxkcmVuKCk7XG4gIH1cblxuICBvbmx5Q2hpbGQoKSB7XG4gICAgaWYgKHRoaXMubnVtQ2hpbGRyZW4oKSAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnY2Fubm90IGdldCBvbmx5IGNoaWxkIG9mIGEgbm9kZSBvZiB0eXBlICcgK1xuICAgICAgICAgIHRoaXMuY3Rvck5hbWUgK1xuICAgICAgICAgICcgKGl0IGhhcyAnICtcbiAgICAgICAgICB0aGlzLm51bUNoaWxkcmVuKCkgK1xuICAgICAgICAgICcgY2hpbGRyZW4pJ1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuZmlyc3RDaGlsZCgpO1xuICAgIH1cbiAgfVxuXG4gIGZpcnN0Q2hpbGQoKSB7XG4gICAgaWYgKHRoaXMuaGFzTm9DaGlsZHJlbigpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdjYW5ub3QgZ2V0IGZpcnN0IGNoaWxkIG9mIGEgJyArIHRoaXMuY3Rvck5hbWUgKyAnIG5vZGUsIHdoaWNoIGhhcyBubyBjaGlsZHJlbidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkQXQoMCk7XG4gICAgfVxuICB9XG5cbiAgbGFzdENoaWxkKCkge1xuICAgIGlmICh0aGlzLmhhc05vQ2hpbGRyZW4oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnY2Fubm90IGdldCBsYXN0IGNoaWxkIG9mIGEgJyArIHRoaXMuY3Rvck5hbWUgKyAnIG5vZGUsIHdoaWNoIGhhcyBubyBjaGlsZHJlbidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmNoaWxkQXQodGhpcy5udW1DaGlsZHJlbigpIC0gMSk7XG4gICAgfVxuICB9XG5cbiAgY2hpbGRCZWZvcmUoY2hpbGQpIHtcbiAgICBjb25zdCBjaGlsZElkeCA9IHRoaXMuaW5kZXhPZkNoaWxkKGNoaWxkKTtcbiAgICBpZiAoY2hpbGRJZHggPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vZGUuY2hpbGRCZWZvcmUoKSBjYWxsZWQgdy8gYW4gYXJndW1lbnQgdGhhdCBpcyBub3QgYSBjaGlsZCcpO1xuICAgIH0gZWxzZSBpZiAoY2hpbGRJZHggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IGdldCBjaGlsZCBiZWZvcmUgZmlyc3QgY2hpbGQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRBdChjaGlsZElkeCAtIDEpO1xuICAgIH1cbiAgfVxuXG4gIGNoaWxkQWZ0ZXIoY2hpbGQpIHtcbiAgICBjb25zdCBjaGlsZElkeCA9IHRoaXMuaW5kZXhPZkNoaWxkKGNoaWxkKTtcbiAgICBpZiAoY2hpbGRJZHggPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vZGUuY2hpbGRBZnRlcigpIGNhbGxlZCB3LyBhbiBhcmd1bWVudCB0aGF0IGlzIG5vdCBhIGNoaWxkJyk7XG4gICAgfSBlbHNlIGlmIChjaGlsZElkeCA9PT0gdGhpcy5udW1DaGlsZHJlbigpIC0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgZ2V0IGNoaWxkIGFmdGVyIGxhc3QgY2hpbGQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRBdChjaGlsZElkeCArIDEpO1xuICAgIH1cbiAgfVxuXG4gIGlzVGVybWluYWwoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNOb250ZXJtaW5hbCgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc0l0ZXJhdGlvbigpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc09wdGlvbmFsKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vLyBUZXJtaW5hbHNcblxuZXhwb3J0IGNsYXNzIFRlcm1pbmFsTm9kZSBleHRlbmRzIE5vZGUge1xuICBnZXQgY3Rvck5hbWUoKSB7XG4gICAgcmV0dXJuICdfdGVybWluYWwnO1xuICB9XG5cbiAgaXNUZXJtaW5hbCgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGdldCBwcmltaXRpdmVWYWx1ZSgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBgcHJpbWl0aXZlVmFsdWVgIHByb3BlcnR5IHdhcyByZW1vdmVkIGluIE9obSB2MTcuJyk7XG4gIH1cbn1cblxuLy8gTm9udGVybWluYWxzXG5cbmV4cG9ydCBjbGFzcyBOb250ZXJtaW5hbE5vZGUgZXh0ZW5kcyBOb2RlIHtcbiAgY29uc3RydWN0b3IocnVsZU5hbWUsIGNoaWxkcmVuLCBjaGlsZE9mZnNldHMsIG1hdGNoTGVuZ3RoKSB7XG4gICAgc3VwZXIobWF0Y2hMZW5ndGgpO1xuICAgIHRoaXMucnVsZU5hbWUgPSBydWxlTmFtZTtcbiAgICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgdGhpcy5jaGlsZE9mZnNldHMgPSBjaGlsZE9mZnNldHM7XG4gIH1cblxuICBnZXQgY3Rvck5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMucnVsZU5hbWU7XG4gIH1cblxuICBpc05vbnRlcm1pbmFsKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaXNMZXhpY2FsKCkge1xuICAgIHJldHVybiBjb21tb24uaXNMZXhpY2FsKHRoaXMuY3Rvck5hbWUpO1xuICB9XG5cbiAgaXNTeW50YWN0aWMoKSB7XG4gICAgcmV0dXJuIGNvbW1vbi5pc1N5bnRhY3RpYyh0aGlzLmN0b3JOYW1lKTtcbiAgfVxufVxuXG4vLyBJdGVyYXRpb25zXG5cbmV4cG9ydCBjbGFzcyBJdGVyYXRpb25Ob2RlIGV4dGVuZHMgTm9kZSB7XG4gIGNvbnN0cnVjdG9yKGNoaWxkcmVuLCBjaGlsZE9mZnNldHMsIG1hdGNoTGVuZ3RoLCBpc09wdGlvbmFsKSB7XG4gICAgc3VwZXIobWF0Y2hMZW5ndGgpO1xuICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICB0aGlzLmNoaWxkT2Zmc2V0cyA9IGNoaWxkT2Zmc2V0cztcbiAgICB0aGlzLm9wdGlvbmFsID0gaXNPcHRpb25hbDtcbiAgfVxuXG4gIGdldCBjdG9yTmFtZSgpIHtcbiAgICByZXR1cm4gJ19pdGVyJztcbiAgfVxuXG4gIGlzSXRlcmF0aW9uKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaXNPcHRpb25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25hbDtcbiAgfVxufVxuIiwiaW1wb3J0IHtUcmFjZX0gZnJvbSAnLi9UcmFjZS5qcyc7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgZXJyb3JzIGZyb20gJy4vZXJyb3JzLmpzJztcbmltcG9ydCB7SXRlcmF0aW9uTm9kZSwgTm9udGVybWluYWxOb2RlLCBUZXJtaW5hbE5vZGV9IGZyb20gJy4vbm9kZXMuanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuaW1wb3J0IHtNQVhfQ09ERV9QT0lOVH0gZnJvbSAnLi9JbnB1dFN0cmVhbS5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKlxuICBFdmFsdWF0ZSB0aGUgZXhwcmVzc2lvbiBhbmQgcmV0dXJuIGB0cnVlYCBpZiBpdCBzdWNjZWVkcywgYGZhbHNlYCBvdGhlcndpc2UuIFRoaXMgbWV0aG9kIHNob3VsZFxuICBvbmx5IGJlIGNhbGxlZCBkaXJlY3RseSBieSBgU3RhdGUucHJvdG90eXBlLmV2YWwoZXhwcilgLCB3aGljaCBhbHNvIHVwZGF0ZXMgdGhlIGRhdGEgc3RydWN0dXJlc1xuICB0aGF0IGFyZSB1c2VkIGZvciB0cmFjaW5nLiAoTWFraW5nIHRob3NlIHVwZGF0ZXMgaW4gYSBtZXRob2Qgb2YgYFN0YXRlYCBlbmFibGVzIHRoZSB0cmFjZS1zcGVjaWZpY1xuICBkYXRhIHN0cnVjdHVyZXMgdG8gYmUgXCJzZWNyZXRzXCIgb2YgdGhhdCBjbGFzcywgd2hpY2ggaXMgZ29vZCBmb3IgbW9kdWxhcml0eS4pXG5cbiAgVGhlIGNvbnRyYWN0IG9mIHRoaXMgbWV0aG9kIGlzIGFzIGZvbGxvd3M6XG4gICogV2hlbiB0aGUgcmV0dXJuIHZhbHVlIGlzIGB0cnVlYCxcbiAgICAtIHRoZSBzdGF0ZSBvYmplY3Qgd2lsbCBoYXZlIGBleHByLmdldEFyaXR5KClgIG1vcmUgYmluZGluZ3MgdGhhbiBpdCBkaWQgYmVmb3JlIHRoZSBjYWxsLlxuICAqIFdoZW4gdGhlIHJldHVybiB2YWx1ZSBpcyBgZmFsc2VgLFxuICAgIC0gdGhlIHN0YXRlIG9iamVjdCBtYXkgaGF2ZSBtb3JlIGJpbmRpbmdzIHRoYW4gaXQgZGlkIGJlZm9yZSB0aGUgY2FsbCwgYW5kXG4gICAgLSBpdHMgaW5wdXQgc3RyZWFtJ3MgcG9zaXRpb24gbWF5IGJlIGFueXdoZXJlLlxuXG4gIE5vdGUgdGhhdCBgU3RhdGUucHJvdG90eXBlLmV2YWwoZXhwcilgLCB1bmxpa2UgdGhpcyBtZXRob2QsIGd1YXJhbnRlZXMgdGhhdCBuZWl0aGVyIHRoZSBzdGF0ZVxuICBvYmplY3QncyBiaW5kaW5ncyBub3IgaXRzIGlucHV0IHN0cmVhbSdzIHBvc2l0aW9uIHdpbGwgY2hhbmdlIGlmIHRoZSBleHByZXNzaW9uIGZhaWxzIHRvIG1hdGNoLlxuKi9cbnBleHBycy5QRXhwci5wcm90b3R5cGUuZXZhbCA9IGNvbW1vbi5hYnN0cmFjdCgnZXZhbCcpOyAvLyBmdW5jdGlvbihzdGF0ZSkgeyAuLi4gfVxuXG5wZXhwcnMuYW55LmV2YWwgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICBjb25zdCBvcmlnUG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuICBjb25zdCBjcCA9IGlucHV0U3RyZWFtLm5leHRDb2RlUG9pbnQoKTtcbiAgaWYgKGNwICE9PSB1bmRlZmluZWQpIHtcbiAgICBzdGF0ZS5wdXNoQmluZGluZyhuZXcgVGVybWluYWxOb2RlKFN0cmluZy5mcm9tQ29kZVBvaW50KGNwKS5sZW5ndGgpLCBvcmlnUG9zKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICBzdGF0ZS5wcm9jZXNzRmFpbHVyZShvcmlnUG9zLCB0aGlzKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbnBleHBycy5lbmQuZXZhbCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIGlmIChpbnB1dFN0cmVhbS5hdEVuZCgpKSB7XG4gICAgc3RhdGUucHVzaEJpbmRpbmcobmV3IFRlcm1pbmFsTm9kZSgwKSwgb3JpZ1Bvcyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgc3RhdGUucHJvY2Vzc0ZhaWx1cmUob3JpZ1BvcywgdGhpcyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5wZXhwcnMuVGVybWluYWwucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICBjb25zdCBvcmlnUG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuICBpZiAoIWlucHV0U3RyZWFtLm1hdGNoU3RyaW5nKHRoaXMub2JqKSkge1xuICAgIHN0YXRlLnByb2Nlc3NGYWlsdXJlKG9yaWdQb3MsIHRoaXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBzdGF0ZS5wdXNoQmluZGluZyhuZXcgVGVybWluYWxOb2RlKHRoaXMub2JqLmxlbmd0aCksIG9yaWdQb3MpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG5wZXhwcnMuUmFuZ2UucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICBjb25zdCBvcmlnUG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuXG4gIC8vIEEgcmFuZ2UgY2FuIG9wZXJhdGUgaW4gb25lIG9mIHR3byBtb2RlczogbWF0Y2hpbmcgYSBzaW5nbGUsIDE2LWJpdCBfY29kZSB1bml0XyxcbiAgLy8gb3IgbWF0Y2hpbmcgYSBfY29kZSBwb2ludF8uIChDb2RlIHBvaW50cyBvdmVyIDB4RkZGRiB0YWtlIHVwIHR3byAxNi1iaXQgY29kZSB1bml0cy4pXG4gIGNvbnN0IGNwID0gdGhpcy5tYXRjaENvZGVQb2ludCA/IGlucHV0U3RyZWFtLm5leHRDb2RlUG9pbnQoKSA6IGlucHV0U3RyZWFtLm5leHRDaGFyQ29kZSgpO1xuXG4gIC8vIEFsd2F5cyBjb21wYXJlIGJ5IGNvZGUgcG9pbnQgdmFsdWUgdG8gZ2V0IHRoZSBjb3JyZWN0IHJlc3VsdCBpbiBhbGwgc2NlbmFyaW9zLlxuICAvLyBOb3RlIHRoYXQgZm9yIHN0cmluZ3Mgb2YgbGVuZ3RoIDEsIGNvZGVQb2ludEF0KDApIGFuZCBjaGFyUG9pbnRBdCgwKSBhcmUgZXF1aXZhbGVudC5cbiAgaWYgKGNwICE9PSB1bmRlZmluZWQgJiYgdGhpcy5mcm9tLmNvZGVQb2ludEF0KDApIDw9IGNwICYmIGNwIDw9IHRoaXMudG8uY29kZVBvaW50QXQoMCkpIHtcbiAgICBzdGF0ZS5wdXNoQmluZGluZyhuZXcgVGVybWluYWxOb2RlKFN0cmluZy5mcm9tQ29kZVBvaW50KGNwKS5sZW5ndGgpLCBvcmlnUG9zKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICBzdGF0ZS5wcm9jZXNzRmFpbHVyZShvcmlnUG9zLCB0aGlzKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbnBleHBycy5QYXJhbS5wcm90b3R5cGUuZXZhbCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICByZXR1cm4gc3RhdGUuZXZhbChzdGF0ZS5jdXJyZW50QXBwbGljYXRpb24oKS5hcmdzW3RoaXMuaW5kZXhdKTtcbn07XG5cbnBleHBycy5MZXgucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgc3RhdGUuZW50ZXJMZXhpZmllZENvbnRleHQoKTtcbiAgY29uc3QgYW5zID0gc3RhdGUuZXZhbCh0aGlzLmV4cHIpO1xuICBzdGF0ZS5leGl0TGV4aWZpZWRDb250ZXh0KCk7XG4gIHJldHVybiBhbnM7XG59O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IHRoaXMudGVybXMubGVuZ3RoOyBpZHgrKykge1xuICAgIGlmIChzdGF0ZS5ldmFsKHRoaXMudGVybXNbaWR4XSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IHRoaXMuZmFjdG9ycy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgY29uc3QgZmFjdG9yID0gdGhpcy5mYWN0b3JzW2lkeF07XG4gICAgaWYgKCFzdGF0ZS5ldmFsKGZhY3RvcikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wZXhwcnMuSXRlci5wcm90b3R5cGUuZXZhbCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIGNvbnN0IGFyaXR5ID0gdGhpcy5nZXRBcml0eSgpO1xuICBjb25zdCBjb2xzID0gW107XG4gIGNvbnN0IGNvbE9mZnNldHMgPSBbXTtcbiAgd2hpbGUgKGNvbHMubGVuZ3RoIDwgYXJpdHkpIHtcbiAgICBjb2xzLnB1c2goW10pO1xuICAgIGNvbE9mZnNldHMucHVzaChbXSk7XG4gIH1cblxuICBsZXQgbnVtTWF0Y2hlcyA9IDA7XG4gIGxldCBwcmV2UG9zID0gb3JpZ1BvcztcbiAgbGV0IGlkeDtcbiAgd2hpbGUgKG51bU1hdGNoZXMgPCB0aGlzLm1heE51bU1hdGNoZXMgJiYgc3RhdGUuZXZhbCh0aGlzLmV4cHIpKSB7XG4gICAgaWYgKGlucHV0U3RyZWFtLnBvcyA9PT0gcHJldlBvcykge1xuICAgICAgdGhyb3cgZXJyb3JzLmtsZWVuZUV4cHJIYXNOdWxsYWJsZU9wZXJhbmQodGhpcywgc3RhdGUuX2FwcGxpY2F0aW9uU3RhY2spO1xuICAgIH1cbiAgICBwcmV2UG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuICAgIG51bU1hdGNoZXMrKztcbiAgICBjb25zdCByb3cgPSBzdGF0ZS5fYmluZGluZ3Muc3BsaWNlKHN0YXRlLl9iaW5kaW5ncy5sZW5ndGggLSBhcml0eSwgYXJpdHkpO1xuICAgIGNvbnN0IHJvd09mZnNldHMgPSBzdGF0ZS5fYmluZGluZ09mZnNldHMuc3BsaWNlKFxuICAgICAgc3RhdGUuX2JpbmRpbmdPZmZzZXRzLmxlbmd0aCAtIGFyaXR5LFxuICAgICAgYXJpdHlcbiAgICApO1xuICAgIGZvciAoaWR4ID0gMDsgaWR4IDwgcm93Lmxlbmd0aDsgaWR4KyspIHtcbiAgICAgIGNvbHNbaWR4XS5wdXNoKHJvd1tpZHhdKTtcbiAgICAgIGNvbE9mZnNldHNbaWR4XS5wdXNoKHJvd09mZnNldHNbaWR4XSk7XG4gICAgfVxuICB9XG4gIGlmIChudW1NYXRjaGVzIDwgdGhpcy5taW5OdW1NYXRjaGVzKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxldCBvZmZzZXQgPSBzdGF0ZS5wb3NUb09mZnNldChvcmlnUG9zKTtcbiAgbGV0IG1hdGNoTGVuZ3RoID0gMDtcbiAgaWYgKG51bU1hdGNoZXMgPiAwKSB7XG4gICAgY29uc3QgbGFzdENvbCA9IGNvbHNbYXJpdHkgLSAxXTtcbiAgICBjb25zdCBsYXN0Q29sT2Zmc2V0cyA9IGNvbE9mZnNldHNbYXJpdHkgLSAxXTtcblxuICAgIGNvbnN0IGVuZE9mZnNldCA9XG4gICAgICBsYXN0Q29sT2Zmc2V0c1tsYXN0Q29sT2Zmc2V0cy5sZW5ndGggLSAxXSArIGxhc3RDb2xbbGFzdENvbC5sZW5ndGggLSAxXS5tYXRjaExlbmd0aDtcbiAgICBvZmZzZXQgPSBjb2xPZmZzZXRzWzBdWzBdO1xuICAgIG1hdGNoTGVuZ3RoID0gZW5kT2Zmc2V0IC0gb2Zmc2V0O1xuICB9XG4gIGNvbnN0IGlzT3B0aW9uYWwgPSB0aGlzIGluc3RhbmNlb2YgcGV4cHJzLk9wdDtcbiAgZm9yIChpZHggPSAwOyBpZHggPCBjb2xzLmxlbmd0aDsgaWR4KyspIHtcbiAgICBzdGF0ZS5fYmluZGluZ3MucHVzaChcbiAgICAgIG5ldyBJdGVyYXRpb25Ob2RlKGNvbHNbaWR4XSwgY29sT2Zmc2V0c1tpZHhdLCBtYXRjaExlbmd0aCwgaXNPcHRpb25hbClcbiAgICApO1xuICAgIHN0YXRlLl9iaW5kaW5nT2Zmc2V0cy5wdXNoKG9mZnNldCk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5wZXhwcnMuTm90LnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIC8qXG4gICAgVE9ETzpcbiAgICAtIFJpZ2h0IG5vdyB3ZSdyZSBqdXN0IHRocm93aW5nIGF3YXkgYWxsIG9mIHRoZSBmYWlsdXJlcyB0aGF0IGhhcHBlbiBpbnNpZGUgYSBgbm90YCwgYW5kXG4gICAgICByZWNvcmRpbmcgYHRoaXNgIGFzIGEgZmFpbGVkIGV4cHJlc3Npb24uXG4gICAgLSBEb3VibGUgbmVnYXRpb24gc2hvdWxkIGJlIGVxdWl2YWxlbnQgdG8gbG9va2FoZWFkLCBidXQgdGhhdCdzIG5vdCB0aGUgY2FzZSByaWdodCBub3cgd3J0XG4gICAgICBmYWlsdXJlcy4gRS5nLiwgfn4nZm9vJyBwcm9kdWNlcyBhIGZhaWx1cmUgZm9yIH5+J2ZvbycsIGJ1dCBtYXliZSBpdCBzaG91bGQgcHJvZHVjZVxuICAgICAgYSBmYWlsdXJlIGZvciAnZm9vJyBpbnN0ZWFkLlxuICAqL1xuXG4gIGNvbnN0IHtpbnB1dFN0cmVhbX0gPSBzdGF0ZTtcbiAgY29uc3Qgb3JpZ1BvcyA9IGlucHV0U3RyZWFtLnBvcztcbiAgc3RhdGUucHVzaEZhaWx1cmVzSW5mbygpO1xuXG4gIGNvbnN0IGFucyA9IHN0YXRlLmV2YWwodGhpcy5leHByKTtcblxuICBzdGF0ZS5wb3BGYWlsdXJlc0luZm8oKTtcbiAgaWYgKGFucykge1xuICAgIHN0YXRlLnByb2Nlc3NGYWlsdXJlKG9yaWdQb3MsIHRoaXMpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlucHV0U3RyZWFtLnBvcyA9IG9yaWdQb3M7XG4gIHJldHVybiB0cnVlO1xufTtcblxucGV4cHJzLkxvb2thaGVhZC5wcm90b3R5cGUuZXZhbCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIGlmIChzdGF0ZS5ldmFsKHRoaXMuZXhwcikpIHtcbiAgICBpbnB1dFN0cmVhbS5wb3MgPSBvcmlnUG9zO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIGNvbnN0IGNhbGxlciA9IHN0YXRlLmN1cnJlbnRBcHBsaWNhdGlvbigpO1xuICBjb25zdCBhY3R1YWxzID0gY2FsbGVyID8gY2FsbGVyLmFyZ3MgOiBbXTtcbiAgY29uc3QgYXBwID0gdGhpcy5zdWJzdGl0dXRlUGFyYW1zKGFjdHVhbHMpO1xuXG4gIGNvbnN0IHBvc0luZm8gPSBzdGF0ZS5nZXRDdXJyZW50UG9zSW5mbygpO1xuICBpZiAocG9zSW5mby5pc0FjdGl2ZShhcHApKSB7XG4gICAgLy8gVGhpcyBydWxlIGlzIGFscmVhZHkgYWN0aXZlIGF0IHRoaXMgcG9zaXRpb24sIGkuZS4sIGl0IGlzIGxlZnQtcmVjdXJzaXZlLlxuICAgIHJldHVybiBhcHAuaGFuZGxlQ3ljbGUoc3RhdGUpO1xuICB9XG5cbiAgY29uc3QgbWVtb0tleSA9IGFwcC50b01lbW9LZXkoKTtcbiAgY29uc3QgbWVtb1JlYyA9IHBvc0luZm8ubWVtb1ttZW1vS2V5XTtcblxuICBpZiAobWVtb1JlYyAmJiBwb3NJbmZvLnNob3VsZFVzZU1lbW9pemVkUmVzdWx0KG1lbW9SZWMpKSB7XG4gICAgaWYgKHN0YXRlLmhhc05lY2Vzc2FyeUluZm8obWVtb1JlYykpIHtcbiAgICAgIHJldHVybiBzdGF0ZS51c2VNZW1vaXplZFJlc3VsdChzdGF0ZS5pbnB1dFN0cmVhbS5wb3MsIG1lbW9SZWMpO1xuICAgIH1cbiAgICBkZWxldGUgcG9zSW5mby5tZW1vW21lbW9LZXldO1xuICB9XG4gIHJldHVybiBhcHAucmVhbGx5RXZhbChzdGF0ZSk7XG59O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLmhhbmRsZUN5Y2xlID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIGNvbnN0IHBvc0luZm8gPSBzdGF0ZS5nZXRDdXJyZW50UG9zSW5mbygpO1xuICBjb25zdCB7Y3VycmVudExlZnRSZWN1cnNpb259ID0gcG9zSW5mbztcbiAgY29uc3QgbWVtb0tleSA9IHRoaXMudG9NZW1vS2V5KCk7XG4gIGxldCBtZW1vUmVjID0gcG9zSW5mby5tZW1vW21lbW9LZXldO1xuXG4gIGlmIChjdXJyZW50TGVmdFJlY3Vyc2lvbiAmJiBjdXJyZW50TGVmdFJlY3Vyc2lvbi5oZWFkQXBwbGljYXRpb24udG9NZW1vS2V5KCkgPT09IG1lbW9LZXkpIHtcbiAgICAvLyBXZSBhbHJlYWR5IGtub3cgYWJvdXQgdGhpcyBsZWZ0IHJlY3Vyc2lvbiwgYnV0IGl0J3MgcG9zc2libGUgdGhlcmUgYXJlIFwiaW52b2x2ZWRcbiAgICAvLyBhcHBsaWNhdGlvbnNcIiB0aGF0IHdlIGRvbid0IGFscmVhZHkga25vdyBhYm91dCwgc28uLi5cbiAgICBtZW1vUmVjLnVwZGF0ZUludm9sdmVkQXBwbGljYXRpb25NZW1vS2V5cygpO1xuICB9IGVsc2UgaWYgKCFtZW1vUmVjKSB7XG4gICAgLy8gTmV3IGxlZnQgcmVjdXJzaW9uIGRldGVjdGVkISBNZW1vaXplIGEgZmFpbHVyZSB0byB0cnkgdG8gZ2V0IGEgc2VlZCBwYXJzZS5cbiAgICBtZW1vUmVjID0gcG9zSW5mby5tZW1vaXplKG1lbW9LZXksIHtcbiAgICAgIG1hdGNoTGVuZ3RoOiAwLFxuICAgICAgZXhhbWluZWRMZW5ndGg6IDAsXG4gICAgICB2YWx1ZTogZmFsc2UsXG4gICAgICByaWdodG1vc3RGYWlsdXJlT2Zmc2V0OiAtMSxcbiAgICB9KTtcbiAgICBwb3NJbmZvLnN0YXJ0TGVmdFJlY3Vyc2lvbih0aGlzLCBtZW1vUmVjKTtcbiAgfVxuICByZXR1cm4gc3RhdGUudXNlTWVtb2l6ZWRSZXN1bHQoc3RhdGUuaW5wdXRTdHJlYW0ucG9zLCBtZW1vUmVjKTtcbn07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUucmVhbGx5RXZhbCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICBjb25zdCB7aW5wdXRTdHJlYW19ID0gc3RhdGU7XG4gIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gIGNvbnN0IG9yaWdQb3NJbmZvID0gc3RhdGUuZ2V0Q3VycmVudFBvc0luZm8oKTtcbiAgY29uc3QgcnVsZUluZm8gPSBzdGF0ZS5ncmFtbWFyLnJ1bGVzW3RoaXMucnVsZU5hbWVdO1xuICBjb25zdCB7Ym9keX0gPSBydWxlSW5mbztcbiAgY29uc3Qge2Rlc2NyaXB0aW9ufSA9IHJ1bGVJbmZvO1xuXG4gIHN0YXRlLmVudGVyQXBwbGljYXRpb24ob3JpZ1Bvc0luZm8sIHRoaXMpO1xuXG4gIGlmIChkZXNjcmlwdGlvbikge1xuICAgIHN0YXRlLnB1c2hGYWlsdXJlc0luZm8oKTtcbiAgfVxuXG4gIC8vIFJlc2V0IHRoZSBpbnB1dCBzdHJlYW0ncyBleGFtaW5lZExlbmd0aCBwcm9wZXJ0eSBzbyB0aGF0IHdlIGNhbiB0cmFja1xuICAvLyB0aGUgZXhhbWluZWQgbGVuZ3RoIG9mIHRoaXMgcGFydGljdWxhciBhcHBsaWNhdGlvbi5cbiAgY29uc3Qgb3JpZ0lucHV0U3RyZWFtRXhhbWluZWRMZW5ndGggPSBpbnB1dFN0cmVhbS5leGFtaW5lZExlbmd0aDtcbiAgaW5wdXRTdHJlYW0uZXhhbWluZWRMZW5ndGggPSAwO1xuXG4gIGxldCB2YWx1ZSA9IHRoaXMuZXZhbE9uY2UoYm9keSwgc3RhdGUpO1xuICBjb25zdCBjdXJyZW50TFIgPSBvcmlnUG9zSW5mby5jdXJyZW50TGVmdFJlY3Vyc2lvbjtcbiAgY29uc3QgbWVtb0tleSA9IHRoaXMudG9NZW1vS2V5KCk7XG4gIGNvbnN0IGlzSGVhZE9mTGVmdFJlY3Vyc2lvbiA9IGN1cnJlbnRMUiAmJiBjdXJyZW50TFIuaGVhZEFwcGxpY2F0aW9uLnRvTWVtb0tleSgpID09PSBtZW1vS2V5O1xuICBsZXQgbWVtb1JlYztcblxuICBpZiAoc3RhdGUuZG9Ob3RNZW1vaXplKSB7XG4gICAgc3RhdGUuZG9Ob3RNZW1vaXplID0gZmFsc2U7XG4gIH0gZWxzZSBpZiAoaXNIZWFkT2ZMZWZ0UmVjdXJzaW9uKSB7XG4gICAgdmFsdWUgPSB0aGlzLmdyb3dTZWVkUmVzdWx0KGJvZHksIHN0YXRlLCBvcmlnUG9zLCBjdXJyZW50TFIsIHZhbHVlKTtcbiAgICBvcmlnUG9zSW5mby5lbmRMZWZ0UmVjdXJzaW9uKCk7XG4gICAgbWVtb1JlYyA9IGN1cnJlbnRMUjtcbiAgICBtZW1vUmVjLmV4YW1pbmVkTGVuZ3RoID0gaW5wdXRTdHJlYW0uZXhhbWluZWRMZW5ndGggLSBvcmlnUG9zO1xuICAgIG1lbW9SZWMucmlnaHRtb3N0RmFpbHVyZU9mZnNldCA9IHN0YXRlLl9nZXRSaWdodG1vc3RGYWlsdXJlT2Zmc2V0KCk7XG4gICAgb3JpZ1Bvc0luZm8ubWVtb2l6ZShtZW1vS2V5LCBtZW1vUmVjKTsgLy8gdXBkYXRlcyBvcmlnUG9zSW5mbydzIG1heEV4YW1pbmVkTGVuZ3RoXG4gIH0gZWxzZSBpZiAoIWN1cnJlbnRMUiB8fCAhY3VycmVudExSLmlzSW52b2x2ZWQobWVtb0tleSkpIHtcbiAgICAvLyBUaGlzIGFwcGxpY2F0aW9uIGlzIG5vdCBpbnZvbHZlZCBpbiBsZWZ0IHJlY3Vyc2lvbiwgc28gaXQncyBvayB0byBtZW1vaXplIGl0LlxuICAgIG1lbW9SZWMgPSBvcmlnUG9zSW5mby5tZW1vaXplKG1lbW9LZXksIHtcbiAgICAgIG1hdGNoTGVuZ3RoOiBpbnB1dFN0cmVhbS5wb3MgLSBvcmlnUG9zLFxuICAgICAgZXhhbWluZWRMZW5ndGg6IGlucHV0U3RyZWFtLmV4YW1pbmVkTGVuZ3RoIC0gb3JpZ1BvcyxcbiAgICAgIHZhbHVlLFxuICAgICAgZmFpbHVyZXNBdFJpZ2h0bW9zdFBvc2l0aW9uOiBzdGF0ZS5jbG9uZVJlY29yZGVkRmFpbHVyZXMoKSxcbiAgICAgIHJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQ6IHN0YXRlLl9nZXRSaWdodG1vc3RGYWlsdXJlT2Zmc2V0KCksXG4gICAgfSk7XG4gIH1cbiAgY29uc3Qgc3VjY2VlZGVkID0gISF2YWx1ZTtcblxuICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICBzdGF0ZS5wb3BGYWlsdXJlc0luZm8oKTtcbiAgICBpZiAoIXN1Y2NlZWRlZCkge1xuICAgICAgc3RhdGUucHJvY2Vzc0ZhaWx1cmUob3JpZ1BvcywgdGhpcyk7XG4gICAgfVxuICAgIGlmIChtZW1vUmVjKSB7XG4gICAgICBtZW1vUmVjLmZhaWx1cmVzQXRSaWdodG1vc3RQb3NpdGlvbiA9IHN0YXRlLmNsb25lUmVjb3JkZWRGYWlsdXJlcygpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJlY29yZCB0cmFjZSBpbmZvcm1hdGlvbiBpbiB0aGUgbWVtbyB0YWJsZSwgc28gdGhhdCBpdCBpcyBhdmFpbGFibGUgaWYgdGhlIG1lbW9pemVkIHJlc3VsdFxuICAvLyBpcyB1c2VkIGxhdGVyLlxuICBpZiAoc3RhdGUuaXNUcmFjaW5nKCkgJiYgbWVtb1JlYykge1xuICAgIGNvbnN0IGVudHJ5ID0gc3RhdGUuZ2V0VHJhY2VFbnRyeShvcmlnUG9zLCB0aGlzLCBzdWNjZWVkZWQsIHN1Y2NlZWRlZCA/IFt2YWx1ZV0gOiBbXSk7XG4gICAgaWYgKGlzSGVhZE9mTGVmdFJlY3Vyc2lvbikge1xuICAgICAgY29tbW9uLmFzc2VydChlbnRyeS50ZXJtaW5hdGluZ0xSRW50cnkgIT0gbnVsbCB8fCAhc3VjY2VlZGVkKTtcbiAgICAgIGVudHJ5LmlzSGVhZE9mTGVmdFJlY3Vyc2lvbiA9IHRydWU7XG4gICAgfVxuICAgIG1lbW9SZWMudHJhY2VFbnRyeSA9IGVudHJ5O1xuICB9XG5cbiAgLy8gRml4IHRoZSBpbnB1dCBzdHJlYW0ncyBleGFtaW5lZExlbmd0aCAtLSBpdCBzaG91bGQgYmUgdGhlIG1heGltdW0gZXhhbWluZWQgbGVuZ3RoXG4gIC8vIGFjcm9zcyBhbGwgYXBwbGljYXRpb25zLCBub3QganVzdCB0aGlzIG9uZS5cbiAgaW5wdXRTdHJlYW0uZXhhbWluZWRMZW5ndGggPSBNYXRoLm1heChcbiAgICBpbnB1dFN0cmVhbS5leGFtaW5lZExlbmd0aCxcbiAgICBvcmlnSW5wdXRTdHJlYW1FeGFtaW5lZExlbmd0aFxuICApO1xuXG4gIHN0YXRlLmV4aXRBcHBsaWNhdGlvbihvcmlnUG9zSW5mbywgdmFsdWUpO1xuXG4gIHJldHVybiBzdWNjZWVkZWQ7XG59O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLmV2YWxPbmNlID0gZnVuY3Rpb24gKGV4cHIsIHN0YXRlKSB7XG4gIGNvbnN0IHtpbnB1dFN0cmVhbX0gPSBzdGF0ZTtcbiAgY29uc3Qgb3JpZ1BvcyA9IGlucHV0U3RyZWFtLnBvcztcblxuICBpZiAoc3RhdGUuZXZhbChleHByKSkge1xuICAgIGNvbnN0IGFyaXR5ID0gZXhwci5nZXRBcml0eSgpO1xuICAgIGNvbnN0IGJpbmRpbmdzID0gc3RhdGUuX2JpbmRpbmdzLnNwbGljZShzdGF0ZS5fYmluZGluZ3MubGVuZ3RoIC0gYXJpdHksIGFyaXR5KTtcbiAgICBjb25zdCBvZmZzZXRzID0gc3RhdGUuX2JpbmRpbmdPZmZzZXRzLnNwbGljZShzdGF0ZS5fYmluZGluZ09mZnNldHMubGVuZ3RoIC0gYXJpdHksIGFyaXR5KTtcbiAgICBjb25zdCBtYXRjaExlbmd0aCA9IGlucHV0U3RyZWFtLnBvcyAtIG9yaWdQb3M7XG4gICAgcmV0dXJuIG5ldyBOb250ZXJtaW5hbE5vZGUodGhpcy5ydWxlTmFtZSwgYmluZGluZ3MsIG9mZnNldHMsIG1hdGNoTGVuZ3RoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUuZ3Jvd1NlZWRSZXN1bHQgPSBmdW5jdGlvbiAoYm9keSwgc3RhdGUsIG9yaWdQb3MsIGxyTWVtb1JlYywgbmV3VmFsdWUpIHtcbiAgaWYgKCFuZXdWYWx1ZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHtpbnB1dFN0cmVhbX0gPSBzdGF0ZTtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIGxyTWVtb1JlYy5tYXRjaExlbmd0aCA9IGlucHV0U3RyZWFtLnBvcyAtIG9yaWdQb3M7XG4gICAgbHJNZW1vUmVjLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgbHJNZW1vUmVjLmZhaWx1cmVzQXRSaWdodG1vc3RQb3NpdGlvbiA9IHN0YXRlLmNsb25lUmVjb3JkZWRGYWlsdXJlcygpO1xuXG4gICAgaWYgKHN0YXRlLmlzVHJhY2luZygpKSB7XG4gICAgICAvLyBCZWZvcmUgZXZhbHVhdGluZyB0aGUgYm9keSBhZ2FpbiwgYWRkIGEgdHJhY2Ugbm9kZSBmb3IgdGhpcyBhcHBsaWNhdGlvbiB0byB0aGUgbWVtbyBlbnRyeS5cbiAgICAgIC8vIEl0cyBvbmx5IGNoaWxkIGlzIGEgY29weSBvZiB0aGUgdHJhY2Ugbm9kZSBmcm9tIGBuZXdWYWx1ZWAsIHdoaWNoIHdpbGwgYWx3YXlzIGJlIHRoZSBsYXN0XG4gICAgICAvLyBlbGVtZW50IGluIGBzdGF0ZS50cmFjZWAuXG4gICAgICBjb25zdCBzZWVkVHJhY2UgPSBzdGF0ZS50cmFjZVtzdGF0ZS50cmFjZS5sZW5ndGggLSAxXTtcbiAgICAgIGxyTWVtb1JlYy50cmFjZUVudHJ5ID0gbmV3IFRyYWNlKFxuICAgICAgICBzdGF0ZS5pbnB1dCxcbiAgICAgICAgb3JpZ1BvcyxcbiAgICAgICAgaW5wdXRTdHJlYW0ucG9zLFxuICAgICAgICB0aGlzLFxuICAgICAgICB0cnVlLFxuICAgICAgICBbbmV3VmFsdWVdLFxuICAgICAgICBbc2VlZFRyYWNlLmNsb25lKCldXG4gICAgICApO1xuICAgIH1cbiAgICBpbnB1dFN0cmVhbS5wb3MgPSBvcmlnUG9zO1xuICAgIG5ld1ZhbHVlID0gdGhpcy5ldmFsT25jZShib2R5LCBzdGF0ZSk7XG4gICAgaWYgKGlucHV0U3RyZWFtLnBvcyAtIG9yaWdQb3MgPD0gbHJNZW1vUmVjLm1hdGNoTGVuZ3RoKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgaWYgKHN0YXRlLmlzVHJhY2luZygpKSB7XG4gICAgICBzdGF0ZS50cmFjZS5zcGxpY2UoLTIsIDEpOyAvLyBEcm9wIHRoZSB0cmFjZSBmb3IgdGhlIG9sZCBzZWVkLlxuICAgIH1cbiAgfVxuICBpZiAoc3RhdGUuaXNUcmFjaW5nKCkpIHtcbiAgICAvLyBUaGUgbGFzdCBlbnRyeSBpcyBmb3IgYW4gdW51c2VkIHJlc3VsdCAtLSBwb3AgaXQgYW5kIHNhdmUgaXQgaW4gdGhlIFwicmVhbFwiIGVudHJ5LlxuICAgIGxyTWVtb1JlYy50cmFjZUVudHJ5LnJlY29yZExSVGVybWluYXRpb24oc3RhdGUudHJhY2UucG9wKCksIG5ld1ZhbHVlKTtcbiAgfVxuICBpbnB1dFN0cmVhbS5wb3MgPSBvcmlnUG9zICsgbHJNZW1vUmVjLm1hdGNoTGVuZ3RoO1xuICByZXR1cm4gbHJNZW1vUmVjLnZhbHVlO1xufTtcblxucGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5ldmFsID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gIGNvbnN0IHtpbnB1dFN0cmVhbX0gPSBzdGF0ZTtcbiAgY29uc3Qgb3JpZ1BvcyA9IGlucHV0U3RyZWFtLnBvcztcbiAgY29uc3QgY3AgPSBpbnB1dFN0cmVhbS5uZXh0Q29kZVBvaW50KCk7XG4gIGlmIChjcCAhPT0gdW5kZWZpbmVkICYmIGNwIDw9IE1BWF9DT0RFX1BPSU5UKSB7XG4gICAgY29uc3QgY2ggPSBTdHJpbmcuZnJvbUNvZGVQb2ludChjcCk7XG4gICAgaWYgKHRoaXMucGF0dGVybi50ZXN0KGNoKSkge1xuICAgICAgc3RhdGUucHVzaEJpbmRpbmcobmV3IFRlcm1pbmFsTm9kZShjaC5sZW5ndGgpLCBvcmlnUG9zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICBzdGF0ZS5wcm9jZXNzRmFpbHVyZShvcmlnUG9zLCB0aGlzKTtcbiAgcmV0dXJuIGZhbHNlO1xufTtcbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUuZ2V0QXJpdHkgPSBhYnN0cmFjdCgnZ2V0QXJpdHknKTtcblxucGV4cHJzLmFueS5nZXRBcml0eSA9XG4gIHBleHBycy5lbmQuZ2V0QXJpdHkgPVxuICBwZXhwcnMuVGVybWluYWwucHJvdG90eXBlLmdldEFyaXR5ID1cbiAgcGV4cHJzLlJhbmdlLnByb3RvdHlwZS5nZXRBcml0eSA9XG4gIHBleHBycy5QYXJhbS5wcm90b3R5cGUuZ2V0QXJpdHkgPVxuICBwZXhwcnMuQXBwbHkucHJvdG90eXBlLmdldEFyaXR5ID1cbiAgcGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS5nZXRBcml0eSA9XG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUuZ2V0QXJpdHkgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIFRoaXMgaXMgb2sgYi9jIGFsbCB0ZXJtcyBtdXN0IGhhdmUgdGhlIHNhbWUgYXJpdHkgLS0gdGhpcyBwcm9wZXJ0eSBpc1xuICAvLyBjaGVja2VkIGJ5IHRoZSBHcmFtbWFyIGNvbnN0cnVjdG9yLlxuICByZXR1cm4gdGhpcy50ZXJtcy5sZW5ndGggPT09IDAgPyAwIDogdGhpcy50ZXJtc1swXS5nZXRBcml0eSgpO1xufTtcblxucGV4cHJzLlNlcS5wcm90b3R5cGUuZ2V0QXJpdHkgPSBmdW5jdGlvbiAoKSB7XG4gIGxldCBhcml0eSA9IDA7XG4gIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IHRoaXMuZmFjdG9ycy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgYXJpdHkgKz0gdGhpcy5mYWN0b3JzW2lkeF0uZ2V0QXJpdHkoKTtcbiAgfVxuICByZXR1cm4gYXJpdHk7XG59O1xuXG5wZXhwcnMuSXRlci5wcm90b3R5cGUuZ2V0QXJpdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmV4cHIuZ2V0QXJpdHkoKTtcbn07XG5cbnBleHBycy5Ob3QucHJvdG90eXBlLmdldEFyaXR5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gMDtcbn07XG5cbnBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLmdldEFyaXR5ID0gcGV4cHJzLkxleC5wcm90b3R5cGUuZ2V0QXJpdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmV4cHIuZ2V0QXJpdHkoKTtcbn07XG4iLCJpbXBvcnQge2Fic3RyYWN0fSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQcml2YXRlIHN0dWZmXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBnZXRNZXRhSW5mbyhleHByLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgY29uc3QgbWV0YUluZm8gPSB7fTtcbiAgaWYgKGV4cHIuc291cmNlICYmIGdyYW1tYXJJbnRlcnZhbCkge1xuICAgIGNvbnN0IGFkanVzdGVkID0gZXhwci5zb3VyY2UucmVsYXRpdmVUbyhncmFtbWFySW50ZXJ2YWwpO1xuICAgIG1ldGFJbmZvLnNvdXJjZUludGVydmFsID0gW2FkanVzdGVkLnN0YXJ0SWR4LCBhZGp1c3RlZC5lbmRJZHhdO1xuICB9XG4gIHJldHVybiBtZXRhSW5mbztcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnBleHBycy5QRXhwci5wcm90b3R5cGUub3V0cHV0UmVjaXBlID0gYWJzdHJhY3QoJ291dHB1dFJlY2lwZScpO1xuXG5wZXhwcnMuYW55Lm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uIChmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFsnYW55JywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKV07XG59O1xuXG5wZXhwcnMuZW5kLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uIChmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFsnZW5kJywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKV07XG59O1xuXG5wZXhwcnMuVGVybWluYWwucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uIChmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFsndGVybWluYWwnLCBnZXRNZXRhSW5mbyh0aGlzLCBncmFtbWFySW50ZXJ2YWwpLCB0aGlzLm9ial07XG59O1xuXG5wZXhwcnMuUmFuZ2UucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uIChmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFsncmFuZ2UnLCBnZXRNZXRhSW5mbyh0aGlzLCBncmFtbWFySW50ZXJ2YWwpLCB0aGlzLmZyb20sIHRoaXMudG9dO1xufTtcblxucGV4cHJzLlBhcmFtLnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPSBmdW5jdGlvbiAoZm9ybWFscywgZ3JhbW1hckludGVydmFsKSB7XG4gIHJldHVybiBbJ3BhcmFtJywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKSwgdGhpcy5pbmRleF07XG59O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPSBmdW5jdGlvbiAoZm9ybWFscywgZ3JhbW1hckludGVydmFsKSB7XG4gIHJldHVybiBbJ2FsdCcsIGdldE1ldGFJbmZvKHRoaXMsIGdyYW1tYXJJbnRlcnZhbCldLmNvbmNhdChcbiAgICB0aGlzLnRlcm1zLm1hcCh0ZXJtID0+IHRlcm0ub3V0cHV0UmVjaXBlKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkpXG4gICk7XG59O1xuXG5wZXhwcnMuRXh0ZW5kLnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPSBmdW5jdGlvbiAoZm9ybWFscywgZ3JhbW1hckludGVydmFsKSB7XG4gIGNvbnN0IGV4dGVuc2lvbiA9IHRoaXMudGVybXNbMF07IC8vIFtleHRlbnNpb24sIG9yaWdpbmFsXVxuICByZXR1cm4gZXh0ZW5zaW9uLm91dHB1dFJlY2lwZShmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpO1xufTtcblxucGV4cHJzLlNwbGljZS5wcm90b3R5cGUub3V0cHV0UmVjaXBlID0gZnVuY3Rpb24gKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkge1xuICBjb25zdCBiZWZvcmVUZXJtcyA9IHRoaXMudGVybXMuc2xpY2UoMCwgdGhpcy5leHBhbnNpb25Qb3MpO1xuICBjb25zdCBhZnRlclRlcm1zID0gdGhpcy50ZXJtcy5zbGljZSh0aGlzLmV4cGFuc2lvblBvcyArIDEpO1xuICByZXR1cm4gW1xuICAgICdzcGxpY2UnLFxuICAgIGdldE1ldGFJbmZvKHRoaXMsIGdyYW1tYXJJbnRlcnZhbCksXG4gICAgYmVmb3JlVGVybXMubWFwKHRlcm0gPT4gdGVybS5vdXRwdXRSZWNpcGUoZm9ybWFscywgZ3JhbW1hckludGVydmFsKSksXG4gICAgYWZ0ZXJUZXJtcy5tYXAodGVybSA9PiB0ZXJtLm91dHB1dFJlY2lwZShmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpKSxcbiAgXTtcbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uIChmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFsnc2VxJywgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKV0uY29uY2F0KFxuICAgIHRoaXMuZmFjdG9ycy5tYXAoZmFjdG9yID0+IGZhY3Rvci5vdXRwdXRSZWNpcGUoZm9ybWFscywgZ3JhbW1hckludGVydmFsKSlcbiAgKTtcbn07XG5cbnBleHBycy5TdGFyLnByb3RvdHlwZS5vdXRwdXRSZWNpcGUgPVxuICBwZXhwcnMuUGx1cy5wcm90b3R5cGUub3V0cHV0UmVjaXBlID1cbiAgcGV4cHJzLk9wdC5wcm90b3R5cGUub3V0cHV0UmVjaXBlID1cbiAgcGV4cHJzLk5vdC5wcm90b3R5cGUub3V0cHV0UmVjaXBlID1cbiAgcGV4cHJzLkxvb2thaGVhZC5wcm90b3R5cGUub3V0cHV0UmVjaXBlID1cbiAgcGV4cHJzLkxleC5wcm90b3R5cGUub3V0cHV0UmVjaXBlID1cbiAgICBmdW5jdGlvbiAoZm9ybWFscywgZ3JhbW1hckludGVydmFsKSB7XG4gICAgICByZXR1cm4gW1xuICAgICAgICB0aGlzLmNvbnN0cnVjdG9yLm5hbWUudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgZ2V0TWV0YUluZm8odGhpcywgZ3JhbW1hckludGVydmFsKSxcbiAgICAgICAgdGhpcy5leHByLm91dHB1dFJlY2lwZShmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpLFxuICAgICAgXTtcbiAgICB9O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLm91dHB1dFJlY2lwZSA9IGZ1bmN0aW9uIChmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpIHtcbiAgcmV0dXJuIFtcbiAgICAnYXBwJyxcbiAgICBnZXRNZXRhSW5mbyh0aGlzLCBncmFtbWFySW50ZXJ2YWwpLFxuICAgIHRoaXMucnVsZU5hbWUsXG4gICAgdGhpcy5hcmdzLm1hcChhcmcgPT4gYXJnLm91dHB1dFJlY2lwZShmb3JtYWxzLCBncmFtbWFySW50ZXJ2YWwpKSxcbiAgXTtcbn07XG5cbnBleHBycy5Vbmljb2RlQ2hhci5wcm90b3R5cGUub3V0cHV0UmVjaXBlID0gZnVuY3Rpb24gKGZvcm1hbHMsIGdyYW1tYXJJbnRlcnZhbCkge1xuICByZXR1cm4gWyd1bmljb2RlQ2hhcicsIGdldE1ldGFJbmZvKHRoaXMsIGdyYW1tYXJJbnRlcnZhbCksIHRoaXMuY2F0ZWdvcnlPclByb3BdO1xufTtcbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qXG4gIENhbGxlZCBhdCBncmFtbWFyIGNyZWF0aW9uIHRpbWUgdG8gcmV3cml0ZSBhIHJ1bGUgYm9keSwgcmVwbGFjaW5nIGVhY2ggcmVmZXJlbmNlIHRvIGEgZm9ybWFsXG4gIHBhcmFtZXRlciB3aXRoIGEgYFBhcmFtYCBub2RlLiBSZXR1cm5zIGEgUEV4cHIgLS0gZWl0aGVyIGEgbmV3IG9uZSwgb3IgdGhlIG9yaWdpbmFsIG9uZSBpZlxuICBpdCB3YXMgbW9kaWZpZWQgaW4gcGxhY2UuXG4qL1xucGV4cHJzLlBFeHByLnByb3RvdHlwZS5pbnRyb2R1Y2VQYXJhbXMgPSBhYnN0cmFjdCgnaW50cm9kdWNlUGFyYW1zJyk7XG5cbnBleHBycy5hbnkuaW50cm9kdWNlUGFyYW1zID1cbiAgcGV4cHJzLmVuZC5pbnRyb2R1Y2VQYXJhbXMgPVxuICBwZXhwcnMuVGVybWluYWwucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9XG4gIHBleHBycy5SYW5nZS5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID1cbiAgcGV4cHJzLlBhcmFtLnByb3RvdHlwZS5pbnRyb2R1Y2VQYXJhbXMgPVxuICBwZXhwcnMuVW5pY29kZUNoYXIucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9XG4gICAgZnVuY3Rpb24gKGZvcm1hbHMpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbnBleHBycy5BbHQucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9IGZ1bmN0aW9uIChmb3JtYWxzKSB7XG4gIHRoaXMudGVybXMuZm9yRWFjaCgodGVybSwgaWR4LCB0ZXJtcykgPT4ge1xuICAgIHRlcm1zW2lkeF0gPSB0ZXJtLmludHJvZHVjZVBhcmFtcyhmb3JtYWxzKTtcbiAgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxucGV4cHJzLlNlcS5wcm90b3R5cGUuaW50cm9kdWNlUGFyYW1zID0gZnVuY3Rpb24gKGZvcm1hbHMpIHtcbiAgdGhpcy5mYWN0b3JzLmZvckVhY2goKGZhY3RvciwgaWR4LCBmYWN0b3JzKSA9PiB7XG4gICAgZmFjdG9yc1tpZHhdID0gZmFjdG9yLmludHJvZHVjZVBhcmFtcyhmb3JtYWxzKTtcbiAgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9XG4gIHBleHBycy5Ob3QucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9XG4gIHBleHBycy5Mb29rYWhlYWQucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9XG4gIHBleHBycy5MZXgucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9XG4gICAgZnVuY3Rpb24gKGZvcm1hbHMpIHtcbiAgICAgIHRoaXMuZXhwciA9IHRoaXMuZXhwci5pbnRyb2R1Y2VQYXJhbXMoZm9ybWFscyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLmludHJvZHVjZVBhcmFtcyA9IGZ1bmN0aW9uIChmb3JtYWxzKSB7XG4gIGNvbnN0IGluZGV4ID0gZm9ybWFscy5pbmRleE9mKHRoaXMucnVsZU5hbWUpO1xuICBpZiAoaW5kZXggPj0gMCkge1xuICAgIGlmICh0aGlzLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gVE9ETzogU2hvdWxkIHRoaXMgYmUgc3VwcG9ydGVkPyBTZWUgaXNzdWUgIzY0LlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJhbWV0ZXJpemVkIHJ1bGVzIGNhbm5vdCBiZSBwYXNzZWQgYXMgYXJndW1lbnRzIHRvIGFub3RoZXIgcnVsZS4nKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuUGFyYW0oaW5kZXgpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYXJncy5mb3JFYWNoKChhcmcsIGlkeCwgYXJncykgPT4ge1xuICAgICAgYXJnc1tpZHhdID0gYXJnLmludHJvZHVjZVBhcmFtcyhmb3JtYWxzKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufTtcbiIsImltcG9ydCB7YWJzdHJhY3R9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy1tYWluLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIE9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFJldHVybnMgYHRydWVgIGlmIHRoaXMgcGFyc2luZyBleHByZXNzaW9uIG1heSBhY2NlcHQgd2l0aG91dCBjb25zdW1pbmcgYW55IGlucHV0LlxucGV4cHJzLlBFeHByLnByb3RvdHlwZS5pc051bGxhYmxlID0gZnVuY3Rpb24gKGdyYW1tYXIpIHtcbiAgcmV0dXJuIHRoaXMuX2lzTnVsbGFibGUoZ3JhbW1hciwgT2JqZWN0LmNyZWF0ZShudWxsKSk7XG59O1xuXG5wZXhwcnMuUEV4cHIucHJvdG90eXBlLl9pc051bGxhYmxlID0gYWJzdHJhY3QoJ19pc051bGxhYmxlJyk7XG5cbnBleHBycy5hbnkuX2lzTnVsbGFibGUgPVxuICBwZXhwcnMuUmFuZ2UucHJvdG90eXBlLl9pc051bGxhYmxlID1cbiAgcGV4cHJzLlBhcmFtLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9XG4gIHBleHBycy5QbHVzLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9XG4gIHBleHBycy5Vbmljb2RlQ2hhci5wcm90b3R5cGUuX2lzTnVsbGFibGUgPVxuICAgIGZ1bmN0aW9uIChncmFtbWFyLCBtZW1vKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxucGV4cHJzLmVuZC5faXNOdWxsYWJsZSA9IGZ1bmN0aW9uIChncmFtbWFyLCBtZW1vKSB7XG4gIHJldHVybiB0cnVlO1xufTtcblxucGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9IGZ1bmN0aW9uIChncmFtbWFyLCBtZW1vKSB7XG4gIGlmICh0eXBlb2YgdGhpcy5vYmogPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gVGhpcyBpcyBhbiBvdmVyLXNpbXBsaWZpY2F0aW9uOiBpdCdzIG9ubHkgY29ycmVjdCBpZiB0aGUgaW5wdXQgaXMgYSBzdHJpbmcuIElmIGl0J3MgYW4gYXJyYXlcbiAgICAvLyBvciBhbiBvYmplY3QsIHRoZW4gdGhlIGVtcHR5IHN0cmluZyBwYXJzaW5nIGV4cHJlc3Npb24gaXMgbm90IG51bGxhYmxlLlxuICAgIHJldHVybiB0aGlzLm9iaiA9PT0gJyc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS5faXNOdWxsYWJsZSA9IGZ1bmN0aW9uIChncmFtbWFyLCBtZW1vKSB7XG4gIHJldHVybiB0aGlzLnRlcm1zLmxlbmd0aCA9PT0gMCB8fCB0aGlzLnRlcm1zLnNvbWUodGVybSA9PiB0ZXJtLl9pc051bGxhYmxlKGdyYW1tYXIsIG1lbW8pKTtcbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLl9pc051bGxhYmxlID0gZnVuY3Rpb24gKGdyYW1tYXIsIG1lbW8pIHtcbiAgcmV0dXJuIHRoaXMuZmFjdG9ycy5ldmVyeShmYWN0b3IgPT4gZmFjdG9yLl9pc051bGxhYmxlKGdyYW1tYXIsIG1lbW8pKTtcbn07XG5cbnBleHBycy5TdGFyLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9XG4gIHBleHBycy5PcHQucHJvdG90eXBlLl9pc051bGxhYmxlID1cbiAgcGV4cHJzLk5vdC5wcm90b3R5cGUuX2lzTnVsbGFibGUgPVxuICBwZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS5faXNOdWxsYWJsZSA9XG4gICAgZnVuY3Rpb24gKGdyYW1tYXIsIG1lbW8pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbnBleHBycy5MZXgucHJvdG90eXBlLl9pc051bGxhYmxlID0gZnVuY3Rpb24gKGdyYW1tYXIsIG1lbW8pIHtcbiAgcmV0dXJuIHRoaXMuZXhwci5faXNOdWxsYWJsZShncmFtbWFyLCBtZW1vKTtcbn07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUuX2lzTnVsbGFibGUgPSBmdW5jdGlvbiAoZ3JhbW1hciwgbWVtbykge1xuICBjb25zdCBrZXkgPSB0aGlzLnRvTWVtb0tleSgpO1xuICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtZW1vLCBrZXkpKSB7XG4gICAgY29uc3Qge2JvZHl9ID0gZ3JhbW1hci5ydWxlc1t0aGlzLnJ1bGVOYW1lXTtcbiAgICBjb25zdCBpbmxpbmVkID0gYm9keS5zdWJzdGl0dXRlUGFyYW1zKHRoaXMuYXJncyk7XG4gICAgbWVtb1trZXldID0gZmFsc2U7IC8vIFByZXZlbnQgaW5maW5pdGUgcmVjdXJzaW9uIGZvciByZWN1cnNpdmUgcnVsZXMuXG4gICAgbWVtb1trZXldID0gaW5saW5lZC5faXNOdWxsYWJsZShncmFtbWFyLCBtZW1vKTtcbiAgfVxuICByZXR1cm4gbWVtb1trZXldO1xufTtcbiIsImltcG9ydCB7YWJzdHJhY3QsIGNoZWNrTm90TnVsbH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gT3BlcmF0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLypcbiAgUmV0dXJucyBhIFBFeHByIHRoYXQgcmVzdWx0cyBmcm9tIHJlY3Vyc2l2ZWx5IHJlcGxhY2luZyBldmVyeSBmb3JtYWwgcGFyYW1ldGVyIChpLmUuLCBpbnN0YW5jZVxuICBvZiBgUGFyYW1gKSBpbnNpZGUgdGhpcyBQRXhwciB3aXRoIGl0cyBhY3R1YWwgdmFsdWUgZnJvbSBgYWN0dWFsc2AgKGFuIEFycmF5KS5cblxuICBUaGUgcmVjZWl2ZXIgbXVzdCBub3QgYmUgbW9kaWZpZWQ7IGEgbmV3IFBFeHByIG11c3QgYmUgcmV0dXJuZWQgaWYgYW55IHJlcGxhY2VtZW50IGlzIG5lY2Vzc2FyeS5cbiovXG4vLyBmdW5jdGlvbihhY3R1YWxzKSB7IC4uLiB9XG5wZXhwcnMuUEV4cHIucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPSBhYnN0cmFjdCgnc3Vic3RpdHV0ZVBhcmFtcycpO1xuXG5wZXhwcnMuYW55LnN1YnN0aXR1dGVQYXJhbXMgPVxuICBwZXhwcnMuZW5kLnN1YnN0aXR1dGVQYXJhbXMgPVxuICBwZXhwcnMuVGVybWluYWwucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPVxuICBwZXhwcnMuUmFuZ2UucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPVxuICBwZXhwcnMuVW5pY29kZUNoYXIucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPVxuICAgIGZ1bmN0aW9uIChhY3R1YWxzKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5wZXhwcnMuUGFyYW0ucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPSBmdW5jdGlvbiAoYWN0dWFscykge1xuICByZXR1cm4gY2hlY2tOb3ROdWxsKGFjdHVhbHNbdGhpcy5pbmRleF0pO1xufTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUuc3Vic3RpdHV0ZVBhcmFtcyA9IGZ1bmN0aW9uIChhY3R1YWxzKSB7XG4gIHJldHVybiBuZXcgcGV4cHJzLkFsdCh0aGlzLnRlcm1zLm1hcCh0ZXJtID0+IHRlcm0uc3Vic3RpdHV0ZVBhcmFtcyhhY3R1YWxzKSkpO1xufTtcblxucGV4cHJzLlNlcS5wcm90b3R5cGUuc3Vic3RpdHV0ZVBhcmFtcyA9IGZ1bmN0aW9uIChhY3R1YWxzKSB7XG4gIHJldHVybiBuZXcgcGV4cHJzLlNlcSh0aGlzLmZhY3RvcnMubWFwKGZhY3RvciA9PiBmYWN0b3Iuc3Vic3RpdHV0ZVBhcmFtcyhhY3R1YWxzKSkpO1xufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPVxuICBwZXhwcnMuTm90LnByb3RvdHlwZS5zdWJzdGl0dXRlUGFyYW1zID1cbiAgcGV4cHJzLkxvb2thaGVhZC5wcm90b3R5cGUuc3Vic3RpdHV0ZVBhcmFtcyA9XG4gIHBleHBycy5MZXgucHJvdG90eXBlLnN1YnN0aXR1dGVQYXJhbXMgPVxuICAgIGZ1bmN0aW9uIChhY3R1YWxzKSB7XG4gICAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5leHByLnN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscykpO1xuICAgIH07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUuc3Vic3RpdHV0ZVBhcmFtcyA9IGZ1bmN0aW9uIChhY3R1YWxzKSB7XG4gIGlmICh0aGlzLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gQXZvaWQgbWFraW5nIGEgY29weSBvZiB0aGlzIGFwcGxpY2F0aW9uLCBhcyBhbiBvcHRpbWl6YXRpb25cbiAgICByZXR1cm4gdGhpcztcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBhcmdzID0gdGhpcy5hcmdzLm1hcChhcmcgPT4gYXJnLnN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscykpO1xuICAgIHJldHVybiBuZXcgcGV4cHJzLkFwcGx5KHRoaXMucnVsZU5hbWUsIGFyZ3MpO1xuICB9XG59O1xuIiwiaW1wb3J0IHthYnN0cmFjdCwgY29weVdpdGhvdXREdXBsaWNhdGVzfSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQcml2YXRlIHN0dWZmXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBpc1Jlc3RyaWN0ZWRKU0lkZW50aWZpZXIoc3RyKSB7XG4gIHJldHVybiAvXlthLXpBLVpfJF1bMC05YS16QS1aXyRdKiQvLnRlc3Qoc3RyKTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUR1cGxpY2F0ZWROYW1lcyhhcmd1bWVudE5hbWVMaXN0KSB7XG4gIC8vIGBjb3VudGAgaXMgdXNlZCB0byByZWNvcmQgdGhlIG51bWJlciBvZiB0aW1lcyBlYWNoIGFyZ3VtZW50IG5hbWUgb2NjdXJzIGluIHRoZSBsaXN0LFxuICAvLyB0aGlzIGlzIHVzZWZ1bCBmb3IgY2hlY2tpbmcgZHVwbGljYXRlZCBhcmd1bWVudCBuYW1lLiBJdCBtYXBzIGFyZ3VtZW50IG5hbWVzIHRvIGludHMuXG4gIGNvbnN0IGNvdW50ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgYXJndW1lbnROYW1lTGlzdC5mb3JFYWNoKGFyZ05hbWUgPT4ge1xuICAgIGNvdW50W2FyZ05hbWVdID0gKGNvdW50W2FyZ05hbWVdIHx8IDApICsgMTtcbiAgfSk7XG5cbiAgLy8gQXBwZW5kIHN1YnNjcmlwdHMgKCdfMScsICdfMicsIC4uLikgdG8gZHVwbGljYXRlIGFyZ3VtZW50IG5hbWVzLlxuICBPYmplY3Qua2V5cyhjb3VudCkuZm9yRWFjaChkdXBBcmdOYW1lID0+IHtcbiAgICBpZiAoY291bnRbZHVwQXJnTmFtZV0gPD0gMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoaXMgbmFtZSBzaG93cyB1cCBtb3JlIHRoYW4gb25jZSwgc28gYWRkIHN1YnNjcmlwdHMuXG4gICAgbGV0IHN1YnNjcmlwdCA9IDE7XG4gICAgYXJndW1lbnROYW1lTGlzdC5mb3JFYWNoKChhcmdOYW1lLCBpZHgpID0+IHtcbiAgICAgIGlmIChhcmdOYW1lID09PSBkdXBBcmdOYW1lKSB7XG4gICAgICAgIGFyZ3VtZW50TmFtZUxpc3RbaWR4XSA9IGFyZ05hbWUgKyAnXycgKyBzdWJzY3JpcHQrKztcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKlxuICBSZXR1cm5zIGEgbGlzdCBvZiBzdHJpbmdzIHRoYXQgd2lsbCBiZSB1c2VkIGFzIHRoZSBkZWZhdWx0IGFyZ3VtZW50IG5hbWVzIGZvciBpdHMgcmVjZWl2ZXJcbiAgKGEgcGV4cHIpIGluIGEgc2VtYW50aWMgYWN0aW9uLiBUaGlzIGlzIHVzZWQgZXhjbHVzaXZlbHkgYnkgdGhlIFNlbWFudGljcyBFZGl0b3IuXG5cbiAgYGZpcnN0QXJnSW5kZXhgIGlzIHRoZSAxLWJhc2VkIGluZGV4IG9mIHRoZSBmaXJzdCBhcmd1bWVudCBuYW1lIHRoYXQgd2lsbCBiZSBnZW5lcmF0ZWQgZm9yIHRoaXNcbiAgcGV4cHIuIEl0IGVuYWJsZXMgdXMgdG8gbmFtZSBhcmd1bWVudHMgcG9zaXRpb25hbGx5LCBlLmcuLCBpZiB0aGUgc2Vjb25kIGFyZ3VtZW50IGlzIGFcbiAgbm9uLWFscGhhbnVtZXJpYyB0ZXJtaW5hbCBsaWtlIFwiK1wiLCBpdCB3aWxsIGJlIG5hbWVkICckMicuXG5cbiAgYG5vRHVwQ2hlY2tgIGlzIHRydWUgaWYgdGhlIGNhbGxlciBvZiBgdG9Bcmd1bWVudE5hbWVMaXN0YCBpcyBub3QgYSB0b3AgbGV2ZWwgY2FsbGVyLiBJdCBlbmFibGVzXG4gIHVzIHRvIGF2b2lkIG5lc3RlZCBkdXBsaWNhdGlvbiBzdWJzY3JpcHRzIGFwcGVuZGluZywgZS5nLiwgJ18xXzEnLCAnXzFfMicsIGJ5IG9ubHkgY2hlY2tpbmdcbiAgZHVwbGljYXRlcyBhdCB0aGUgdG9wIGxldmVsLlxuXG4gIEhlcmUgaXMgYSBtb3JlIGVsYWJvcmF0ZSBleGFtcGxlIHRoYXQgaWxsdXN0cmF0ZXMgaG93IHRoaXMgbWV0aG9kIHdvcmtzOlxuICBgKGEgXCIrXCIgYikudG9Bcmd1bWVudE5hbWVMaXN0KDEpYCBldmFsdWF0ZXMgdG8gYFsnYScsICckMicsICdiJ11gIHdpdGggdGhlIGZvbGxvd2luZyByZWN1cnNpdmVcbiAgY2FsbHM6XG5cbiAgICAoYSkudG9Bcmd1bWVudE5hbWVMaXN0KDEpIC0+IFsnYSddLFxuICAgIChcIitcIikudG9Bcmd1bWVudE5hbWVMaXN0KDIpIC0+IFsnJDInXSxcbiAgICAoYikudG9Bcmd1bWVudE5hbWVMaXN0KDMpIC0+IFsnYiddXG5cbiAgTm90ZXM6XG4gICogVGhpcyBtZXRob2QgbXVzdCBvbmx5IGJlIGNhbGxlZCBvbiB3ZWxsLWZvcm1lZCBleHByZXNzaW9ucywgZS5nLiwgdGhlIHJlY2VpdmVyIG11c3RcbiAgICBub3QgaGF2ZSBhbnkgQWx0IHN1Yi1leHByZXNzaW9ucyB3aXRoIGluY29uc2lzdGVudCBhcml0aWVzLlxuICAqIGUuZ2V0QXJpdHkoKSA9PT0gZS50b0FyZ3VtZW50TmFtZUxpc3QoMSkubGVuZ3RoXG4qL1xuLy8gZnVuY3Rpb24oZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykgeyAuLi4gfVxucGV4cHJzLlBFeHByLnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBhYnN0cmFjdCgndG9Bcmd1bWVudE5hbWVMaXN0Jyk7XG5cbnBleHBycy5hbnkudG9Bcmd1bWVudE5hbWVMaXN0ID0gZnVuY3Rpb24gKGZpcnN0QXJnSW5kZXgsIG5vRHVwQ2hlY2spIHtcbiAgcmV0dXJuIFsnYW55J107XG59O1xuXG5wZXhwcnMuZW5kLnRvQXJndW1lbnROYW1lTGlzdCA9IGZ1bmN0aW9uIChmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIHJldHVybiBbJ2VuZCddO1xufTtcblxucGV4cHJzLlRlcm1pbmFsLnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbiAoZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICBpZiAodHlwZW9mIHRoaXMub2JqID09PSAnc3RyaW5nJyAmJiAvXltfYS16QS1aMC05XSskLy50ZXN0KHRoaXMub2JqKSkge1xuICAgIC8vIElmIHRoaXMgdGVybWluYWwgaXMgYSB2YWxpZCBzdWZmaXggZm9yIGEgSlMgaWRlbnRpZmllciwganVzdCBwcmVwZW5kIGl0IHdpdGggJ18nXG4gICAgcmV0dXJuIFsnXycgKyB0aGlzLm9ial07XG4gIH0gZWxzZSB7XG4gICAgLy8gT3RoZXJ3aXNlLCBuYW1lIGl0IHBvc2l0aW9uYWxseS5cbiAgICByZXR1cm4gWyckJyArIGZpcnN0QXJnSW5kZXhdO1xuICB9XG59O1xuXG5wZXhwcnMuUmFuZ2UucHJvdG90eXBlLnRvQXJndW1lbnROYW1lTGlzdCA9IGZ1bmN0aW9uIChmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIGxldCBhcmdOYW1lID0gdGhpcy5mcm9tICsgJ190b18nICsgdGhpcy50bztcbiAgLy8gSWYgdGhlIGBhcmdOYW1lYCBpcyBub3QgdmFsaWQgdGhlbiB0cnkgdG8gcHJlcGVuZCBhIGBfYC5cbiAgaWYgKCFpc1Jlc3RyaWN0ZWRKU0lkZW50aWZpZXIoYXJnTmFtZSkpIHtcbiAgICBhcmdOYW1lID0gJ18nICsgYXJnTmFtZTtcbiAgfVxuICAvLyBJZiB0aGUgYGFyZ05hbWVgIHN0aWxsIG5vdCB2YWxpZCBhZnRlciBwcmVwZW5kaW5nIGEgYF9gLCB0aGVuIG5hbWUgaXQgcG9zaXRpb25hbGx5LlxuICBpZiAoIWlzUmVzdHJpY3RlZEpTSWRlbnRpZmllcihhcmdOYW1lKSkge1xuICAgIGFyZ05hbWUgPSAnJCcgKyBmaXJzdEFyZ0luZGV4O1xuICB9XG4gIHJldHVybiBbYXJnTmFtZV07XG59O1xuXG5wZXhwcnMuQWx0LnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbiAoZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICAvLyBgdGVybUFyZ05hbWVMaXN0c2AgaXMgYW4gYXJyYXkgb2YgYXJyYXlzIHdoZXJlIGVhY2ggcm93IGlzIHRoZVxuICAvLyBhcmd1bWVudCBuYW1lIGxpc3QgdGhhdCBjb3JyZXNwb25kcyB0byBhIHRlcm0gaW4gdGhpcyBhbHRlcm5hdGlvbi5cbiAgY29uc3QgdGVybUFyZ05hbWVMaXN0cyA9IHRoaXMudGVybXMubWFwKHRlcm0gPT5cbiAgICB0ZXJtLnRvQXJndW1lbnROYW1lTGlzdChmaXJzdEFyZ0luZGV4LCB0cnVlKVxuICApO1xuXG4gIGNvbnN0IGFyZ3VtZW50TmFtZUxpc3QgPSBbXTtcbiAgY29uc3QgbnVtQXJncyA9IHRlcm1BcmdOYW1lTGlzdHNbMF0ubGVuZ3RoO1xuICBmb3IgKGxldCBjb2xJZHggPSAwOyBjb2xJZHggPCBudW1BcmdzOyBjb2xJZHgrKykge1xuICAgIGNvbnN0IGNvbCA9IFtdO1xuICAgIGZvciAobGV0IHJvd0lkeCA9IDA7IHJvd0lkeCA8IHRoaXMudGVybXMubGVuZ3RoOyByb3dJZHgrKykge1xuICAgICAgY29sLnB1c2godGVybUFyZ05hbWVMaXN0c1tyb3dJZHhdW2NvbElkeF0pO1xuICAgIH1cbiAgICBjb25zdCB1bmlxdWVOYW1lcyA9IGNvcHlXaXRob3V0RHVwbGljYXRlcyhjb2wpO1xuICAgIGFyZ3VtZW50TmFtZUxpc3QucHVzaCh1bmlxdWVOYW1lcy5qb2luKCdfb3JfJykpO1xuICB9XG5cbiAgaWYgKCFub0R1cENoZWNrKSB7XG4gICAgcmVzb2x2ZUR1cGxpY2F0ZWROYW1lcyhhcmd1bWVudE5hbWVMaXN0KTtcbiAgfVxuICByZXR1cm4gYXJndW1lbnROYW1lTGlzdDtcbn07XG5cbnBleHBycy5TZXEucHJvdG90eXBlLnRvQXJndW1lbnROYW1lTGlzdCA9IGZ1bmN0aW9uIChmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIC8vIEdlbmVyYXRlIHRoZSBhcmd1bWVudCBuYW1lIGxpc3QsIHdpdGhvdXQgd29ycnlpbmcgYWJvdXQgZHVwbGljYXRlcy5cbiAgbGV0IGFyZ3VtZW50TmFtZUxpc3QgPSBbXTtcbiAgdGhpcy5mYWN0b3JzLmZvckVhY2goZmFjdG9yID0+IHtcbiAgICBjb25zdCBmYWN0b3JBcmd1bWVudE5hbWVMaXN0ID0gZmFjdG9yLnRvQXJndW1lbnROYW1lTGlzdChmaXJzdEFyZ0luZGV4LCB0cnVlKTtcbiAgICBhcmd1bWVudE5hbWVMaXN0ID0gYXJndW1lbnROYW1lTGlzdC5jb25jYXQoZmFjdG9yQXJndW1lbnROYW1lTGlzdCk7XG5cbiAgICAvLyBTaGlmdCB0aGUgZmlyc3RBcmdJbmRleCB0byB0YWtlIHRoaXMgZmFjdG9yJ3MgYXJndW1lbnQgbmFtZXMgaW50byBhY2NvdW50LlxuICAgIGZpcnN0QXJnSW5kZXggKz0gZmFjdG9yQXJndW1lbnROYW1lTGlzdC5sZW5ndGg7XG4gIH0pO1xuICBpZiAoIW5vRHVwQ2hlY2spIHtcbiAgICByZXNvbHZlRHVwbGljYXRlZE5hbWVzKGFyZ3VtZW50TmFtZUxpc3QpO1xuICB9XG4gIHJldHVybiBhcmd1bWVudE5hbWVMaXN0O1xufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLnRvQXJndW1lbnROYW1lTGlzdCA9IGZ1bmN0aW9uIChmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKSB7XG4gIGNvbnN0IGFyZ3VtZW50TmFtZUxpc3QgPSB0aGlzLmV4cHJcbiAgICAudG9Bcmd1bWVudE5hbWVMaXN0KGZpcnN0QXJnSW5kZXgsIG5vRHVwQ2hlY2spXG4gICAgLm1hcChleHByQXJndW1lbnRTdHJpbmcgPT5cbiAgICAgIGV4cHJBcmd1bWVudFN0cmluZ1tleHByQXJndW1lbnRTdHJpbmcubGVuZ3RoIC0gMV0gPT09ICdzJ1xuICAgICAgICA/IGV4cHJBcmd1bWVudFN0cmluZyArICdlcydcbiAgICAgICAgOiBleHByQXJndW1lbnRTdHJpbmcgKyAncydcbiAgICApO1xuICBpZiAoIW5vRHVwQ2hlY2spIHtcbiAgICByZXNvbHZlRHVwbGljYXRlZE5hbWVzKGFyZ3VtZW50TmFtZUxpc3QpO1xuICB9XG4gIHJldHVybiBhcmd1bWVudE5hbWVMaXN0O1xufTtcblxucGV4cHJzLk9wdC5wcm90b3R5cGUudG9Bcmd1bWVudE5hbWVMaXN0ID0gZnVuY3Rpb24gKGZpcnN0QXJnSW5kZXgsIG5vRHVwQ2hlY2spIHtcbiAgcmV0dXJuIHRoaXMuZXhwci50b0FyZ3VtZW50TmFtZUxpc3QoZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykubWFwKGFyZ05hbWUgPT4ge1xuICAgIHJldHVybiAnb3B0JyArIGFyZ05hbWVbMF0udG9VcHBlckNhc2UoKSArIGFyZ05hbWUuc2xpY2UoMSk7XG4gIH0pO1xufTtcblxucGV4cHJzLk5vdC5wcm90b3R5cGUudG9Bcmd1bWVudE5hbWVMaXN0ID0gZnVuY3Rpb24gKGZpcnN0QXJnSW5kZXgsIG5vRHVwQ2hlY2spIHtcbiAgcmV0dXJuIFtdO1xufTtcblxucGV4cHJzLkxvb2thaGVhZC5wcm90b3R5cGUudG9Bcmd1bWVudE5hbWVMaXN0ID0gcGV4cHJzLkxleC5wcm90b3R5cGUudG9Bcmd1bWVudE5hbWVMaXN0ID1cbiAgZnVuY3Rpb24gKGZpcnN0QXJnSW5kZXgsIG5vRHVwQ2hlY2spIHtcbiAgICByZXR1cm4gdGhpcy5leHByLnRvQXJndW1lbnROYW1lTGlzdChmaXJzdEFyZ0luZGV4LCBub0R1cENoZWNrKTtcbiAgfTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbiAoZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICByZXR1cm4gW3RoaXMucnVsZU5hbWVdO1xufTtcblxucGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbiAoZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICByZXR1cm4gWyckJyArIGZpcnN0QXJnSW5kZXhdO1xufTtcblxucGV4cHJzLlBhcmFtLnByb3RvdHlwZS50b0FyZ3VtZW50TmFtZUxpc3QgPSBmdW5jdGlvbiAoZmlyc3RBcmdJbmRleCwgbm9EdXBDaGVjaykge1xuICByZXR1cm4gWydwYXJhbScgKyB0aGlzLmluZGV4XTtcbn07XG5cbi8vIFwiVmFsdWUgcGV4cHJzXCIgKFZhbHVlLCBTdHIsIEFyciwgT2JqKSBhcmUgZ29pbmcgYXdheSBzb29uLCBzbyB3ZSBkb24ndCB3b3JyeSBhYm91dCB0aGVtIGhlcmUuXG4iLCJpbXBvcnQge2Fic3RyYWN0fSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgUEV4cHIsIGZvciB1c2UgYXMgYSBVSSBsYWJlbCwgZXRjLlxucGV4cHJzLlBFeHByLnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPSBhYnN0cmFjdCgndG9EaXNwbGF5U3RyaW5nJyk7XG5cbnBleHBycy5BbHQucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9IHBleHBycy5TZXEucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuc291cmNlKSB7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlLnRyaW1tZWQoKS5jb250ZW50cztcbiAgfVxuICByZXR1cm4gJ1snICsgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgJ10nO1xufTtcblxucGV4cHJzLmFueS50b0Rpc3BsYXlTdHJpbmcgPVxuICBwZXhwcnMuZW5kLnRvRGlzcGxheVN0cmluZyA9XG4gIHBleHBycy5JdGVyLnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPVxuICBwZXhwcnMuTm90LnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPVxuICBwZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPVxuICBwZXhwcnMuTGV4LnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPVxuICBwZXhwcnMuVGVybWluYWwucHJvdG90eXBlLnRvRGlzcGxheVN0cmluZyA9XG4gIHBleHBycy5SYW5nZS5wcm90b3R5cGUudG9EaXNwbGF5U3RyaW5nID1cbiAgcGV4cHJzLlBhcmFtLnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPVxuICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gICAgfTtcblxucGV4cHJzLkFwcGx5LnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHBzID0gdGhpcy5hcmdzLm1hcChhcmcgPT4gYXJnLnRvRGlzcGxheVN0cmluZygpKTtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZSArICc8JyArIHBzLmpvaW4oJywnKSArICc+JztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZTtcbiAgfVxufTtcblxucGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS50b0Rpc3BsYXlTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnVW5pY29kZSBbJyArIHRoaXMuY2F0ZWdvcnlPclByb3AgKyAnXSBjaGFyYWN0ZXInO1xufTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQcml2YXRlIHN0dWZmXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKlxuICBgRmFpbHVyZWBzIHJlcHJlc2VudCBleHByZXNzaW9ucyB0aGF0IHdlcmVuJ3QgbWF0Y2hlZCB3aGlsZSBwYXJzaW5nLiBUaGV5IGFyZSB1c2VkIHRvIGdlbmVyYXRlXG4gIGVycm9yIG1lc3NhZ2VzIGF1dG9tYXRpY2FsbHkuIFRoZSBpbnRlcmZhY2Ugb2YgYEZhaWx1cmVgcyBpbmNsdWRlcyB0aGUgY29sbG93aW5nIG1ldGhvZHM6XG5cbiAgLSBnZXRUZXh0KCkgOiBTdHJpbmdcbiAgLSBnZXRUeXBlKCkgOiBTdHJpbmcgIChvbmUgb2Yge1wiZGVzY3JpcHRpb25cIiwgXCJzdHJpbmdcIiwgXCJjb2RlXCJ9KVxuICAtIGlzRGVzY3JpcHRpb24oKSA6IGJvb2xcbiAgLSBpc1N0cmluZ1Rlcm1pbmFsKCkgOiBib29sXG4gIC0gaXNDb2RlKCkgOiBib29sXG4gIC0gaXNGbHVmZnkoKSA6IGJvb2xcbiAgLSBtYWtlRmx1ZmZ5KCkgOiB2b2lkXG4gIC0gc3Vic3VtZXMoRmFpbHVyZSkgOiBib29sXG4qL1xuXG5mdW5jdGlvbiBpc1ZhbGlkVHlwZSh0eXBlKSB7XG4gIHJldHVybiB0eXBlID09PSAnZGVzY3JpcHRpb24nIHx8IHR5cGUgPT09ICdzdHJpbmcnIHx8IHR5cGUgPT09ICdjb2RlJztcbn1cblxuZXhwb3J0IGNsYXNzIEZhaWx1cmUge1xuICBjb25zdHJ1Y3RvcihwZXhwciwgdGV4dCwgdHlwZSkge1xuICAgIGlmICghaXNWYWxpZFR5cGUodHlwZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBGYWlsdXJlIHR5cGU6ICcgKyB0eXBlKTtcbiAgICB9XG4gICAgdGhpcy5wZXhwciA9IHBleHByO1xuICAgIHRoaXMudGV4dCA9IHRleHQ7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmZsdWZmeSA9IGZhbHNlO1xuICB9XG5cbiAgZ2V0UEV4cHIoKSB7XG4gICAgcmV0dXJuIHRoaXMucGV4cHI7XG4gIH1cblxuICBnZXRUZXh0KCkge1xuICAgIHJldHVybiB0aGlzLnRleHQ7XG4gIH1cblxuICBnZXRUeXBlKCkge1xuICAgIHJldHVybiB0aGlzLnR5cGU7XG4gIH1cblxuICBpc0Rlc2NyaXB0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnR5cGUgPT09ICdkZXNjcmlwdGlvbic7XG4gIH1cblxuICBpc1N0cmluZ1Rlcm1pbmFsKCkge1xuICAgIHJldHVybiB0aGlzLnR5cGUgPT09ICdzdHJpbmcnO1xuICB9XG5cbiAgaXNDb2RlKCkge1xuICAgIHJldHVybiB0aGlzLnR5cGUgPT09ICdjb2RlJztcbiAgfVxuXG4gIGlzRmx1ZmZ5KCkge1xuICAgIHJldHVybiB0aGlzLmZsdWZmeTtcbiAgfVxuXG4gIG1ha2VGbHVmZnkoKSB7XG4gICAgdGhpcy5mbHVmZnkgPSB0cnVlO1xuICB9XG5cbiAgY2xlYXJGbHVmZnkoKSB7XG4gICAgdGhpcy5mbHVmZnkgPSBmYWxzZTtcbiAgfVxuXG4gIHN1YnN1bWVzKHRoYXQpIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5nZXRUZXh0KCkgPT09IHRoYXQuZ2V0VGV4dCgpICYmXG4gICAgICB0aGlzLnR5cGUgPT09IHRoYXQudHlwZSAmJlxuICAgICAgKCF0aGlzLmlzRmx1ZmZ5KCkgfHwgKHRoaXMuaXNGbHVmZnkoKSAmJiB0aGF0LmlzRmx1ZmZ5KCkpKVxuICAgICk7XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy50eXBlID09PSAnc3RyaW5nJyA/IEpTT04uc3RyaW5naWZ5KHRoaXMuZ2V0VGV4dCgpKSA6IHRoaXMuZ2V0VGV4dCgpO1xuICB9XG5cbiAgY2xvbmUoKSB7XG4gICAgY29uc3QgZmFpbHVyZSA9IG5ldyBGYWlsdXJlKHRoaXMucGV4cHIsIHRoaXMudGV4dCwgdGhpcy50eXBlKTtcbiAgICBpZiAodGhpcy5pc0ZsdWZmeSgpKSB7XG4gICAgICBmYWlsdXJlLm1ha2VGbHVmZnkoKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhaWx1cmU7XG4gIH1cblxuICB0b0tleSgpIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpICsgJyMnICsgdGhpcy50eXBlO1xuICB9XG59XG4iLCJpbXBvcnQge2Fic3RyYWN0fSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMtbWFpbi5qcyc7XG5pbXBvcnQge0ZhaWx1cmV9IGZyb20gJy4vRmFpbHVyZS5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBPcGVyYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5wZXhwcnMuUEV4cHIucHJvdG90eXBlLnRvRmFpbHVyZSA9IGFic3RyYWN0KCd0b0ZhaWx1cmUnKTtcblxucGV4cHJzLmFueS50b0ZhaWx1cmUgPSBmdW5jdGlvbiAoZ3JhbW1hcikge1xuICByZXR1cm4gbmV3IEZhaWx1cmUodGhpcywgJ2FueSBvYmplY3QnLCAnZGVzY3JpcHRpb24nKTtcbn07XG5cbnBleHBycy5lbmQudG9GYWlsdXJlID0gZnVuY3Rpb24gKGdyYW1tYXIpIHtcbiAgcmV0dXJuIG5ldyBGYWlsdXJlKHRoaXMsICdlbmQgb2YgaW5wdXQnLCAnZGVzY3JpcHRpb24nKTtcbn07XG5cbnBleHBycy5UZXJtaW5hbC5wcm90b3R5cGUudG9GYWlsdXJlID0gZnVuY3Rpb24gKGdyYW1tYXIpIHtcbiAgcmV0dXJuIG5ldyBGYWlsdXJlKHRoaXMsIHRoaXMub2JqLCAnc3RyaW5nJyk7XG59O1xuXG5wZXhwcnMuUmFuZ2UucHJvdG90eXBlLnRvRmFpbHVyZSA9IGZ1bmN0aW9uIChncmFtbWFyKSB7XG4gIC8vIFRPRE86IGNvbWUgdXAgd2l0aCBzb21ldGhpbmcgYmV0dGVyXG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCBKU09OLnN0cmluZ2lmeSh0aGlzLmZyb20pICsgJy4uJyArIEpTT04uc3RyaW5naWZ5KHRoaXMudG8pLCAnY29kZScpO1xufTtcblxucGV4cHJzLk5vdC5wcm90b3R5cGUudG9GYWlsdXJlID0gZnVuY3Rpb24gKGdyYW1tYXIpIHtcbiAgY29uc3QgZGVzY3JpcHRpb24gPVxuICAgIHRoaXMuZXhwciA9PT0gcGV4cHJzLmFueSA/ICdub3RoaW5nJyA6ICdub3QgJyArIHRoaXMuZXhwci50b0ZhaWx1cmUoZ3JhbW1hcik7XG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCBkZXNjcmlwdGlvbiwgJ2Rlc2NyaXB0aW9uJyk7XG59O1xuXG5wZXhwcnMuTG9va2FoZWFkLnByb3RvdHlwZS50b0ZhaWx1cmUgPSBmdW5jdGlvbiAoZ3JhbW1hcikge1xuICByZXR1cm4gdGhpcy5leHByLnRvRmFpbHVyZShncmFtbWFyKTtcbn07XG5cbnBleHBycy5BcHBseS5wcm90b3R5cGUudG9GYWlsdXJlID0gZnVuY3Rpb24gKGdyYW1tYXIpIHtcbiAgbGV0IHtkZXNjcmlwdGlvbn0gPSBncmFtbWFyLnJ1bGVzW3RoaXMucnVsZU5hbWVdO1xuICBpZiAoIWRlc2NyaXB0aW9uKSB7XG4gICAgY29uc3QgYXJ0aWNsZSA9IC9eW2FlaW91QUVJT1VdLy50ZXN0KHRoaXMucnVsZU5hbWUpID8gJ2FuJyA6ICdhJztcbiAgICBkZXNjcmlwdGlvbiA9IGFydGljbGUgKyAnICcgKyB0aGlzLnJ1bGVOYW1lO1xuICB9XG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCBkZXNjcmlwdGlvbiwgJ2Rlc2NyaXB0aW9uJyk7XG59O1xuXG5wZXhwcnMuVW5pY29kZUNoYXIucHJvdG90eXBlLnRvRmFpbHVyZSA9IGZ1bmN0aW9uIChncmFtbWFyKSB7XG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCAnYSBVbmljb2RlIFsnICsgdGhpcy5jYXRlZ29yeU9yUHJvcCArICddIGNoYXJhY3RlcicsICdkZXNjcmlwdGlvbicpO1xufTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUudG9GYWlsdXJlID0gZnVuY3Rpb24gKGdyYW1tYXIpIHtcbiAgY29uc3QgZnMgPSB0aGlzLnRlcm1zLm1hcCh0ID0+IHQudG9GYWlsdXJlKGdyYW1tYXIpKTtcbiAgY29uc3QgZGVzY3JpcHRpb24gPSAnKCcgKyBmcy5qb2luKCcgb3IgJykgKyAnKSc7XG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCBkZXNjcmlwdGlvbiwgJ2Rlc2NyaXB0aW9uJyk7XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS50b0ZhaWx1cmUgPSBmdW5jdGlvbiAoZ3JhbW1hcikge1xuICBjb25zdCBmcyA9IHRoaXMuZmFjdG9ycy5tYXAoZiA9PiBmLnRvRmFpbHVyZShncmFtbWFyKSk7XG4gIGNvbnN0IGRlc2NyaXB0aW9uID0gJygnICsgZnMuam9pbignICcpICsgJyknO1xuICByZXR1cm4gbmV3IEZhaWx1cmUodGhpcywgZGVzY3JpcHRpb24sICdkZXNjcmlwdGlvbicpO1xufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLnRvRmFpbHVyZSA9IGZ1bmN0aW9uIChncmFtbWFyKSB7XG4gIGNvbnN0IGRlc2NyaXB0aW9uID0gJygnICsgdGhpcy5leHByLnRvRmFpbHVyZShncmFtbWFyKSArIHRoaXMub3BlcmF0b3IgKyAnKSc7XG4gIHJldHVybiBuZXcgRmFpbHVyZSh0aGlzLCBkZXNjcmlwdGlvbiwgJ2Rlc2NyaXB0aW9uJyk7XG59O1xuIiwiaW1wb3J0IHthYnN0cmFjdH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gT3BlcmF0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLypcbiAgZTEudG9TdHJpbmcoKSA9PT0gZTIudG9TdHJpbmcoKSA9PT4gZTEgYW5kIGUyIGFyZSBzZW1hbnRpY2FsbHkgZXF1aXZhbGVudC5cbiAgTm90ZSB0aGF0IHRoaXMgaXMgbm90IGFuIGlmZiAoPD09Pik6IGUuZy4sXG4gICh+XCJiXCIgXCJhXCIpLnRvU3RyaW5nKCkgIT09IChcImFcIikudG9TdHJpbmcoKSwgZXZlbiB0aG91Z2hcbiAgflwiYlwiIFwiYVwiIGFuZCBcImFcIiBhcmUgaW50ZXJjaGFuZ2VhYmxlIGluIGFueSBncmFtbWFyLFxuICBib3RoIGluIHRlcm1zIG9mIHRoZSBsYW5ndWFnZXMgdGhleSBhY2NlcHQgYW5kIHRoZWlyIGFyaXRpZXMuXG4qL1xucGV4cHJzLlBFeHByLnByb3RvdHlwZS50b1N0cmluZyA9IGFic3RyYWN0KCd0b1N0cmluZycpO1xuXG5wZXhwcnMuYW55LnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2FueSc7XG59O1xuXG5wZXhwcnMuZW5kLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2VuZCc7XG59O1xuXG5wZXhwcnMuVGVybWluYWwucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5vYmopO1xufTtcblxucGV4cHJzLlJhbmdlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMuZnJvbSkgKyAnLi4nICsgSlNPTi5zdHJpbmdpZnkodGhpcy50byk7XG59O1xuXG5wZXhwcnMuUGFyYW0ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJyQnICsgdGhpcy5pbmRleDtcbn07XG5cbnBleHBycy5MZXgucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJyMoJyArIHRoaXMuZXhwci50b1N0cmluZygpICsgJyknO1xufTtcblxucGV4cHJzLkFsdC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLnRlcm1zLmxlbmd0aCA9PT0gMVxuICAgID8gdGhpcy50ZXJtc1swXS50b1N0cmluZygpXG4gICAgOiAnKCcgKyB0aGlzLnRlcm1zLm1hcCh0ZXJtID0+IHRlcm0udG9TdHJpbmcoKSkuam9pbignIHwgJykgKyAnKSc7XG59O1xuXG5wZXhwcnMuU2VxLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuZmFjdG9ycy5sZW5ndGggPT09IDFcbiAgICA/IHRoaXMuZmFjdG9yc1swXS50b1N0cmluZygpXG4gICAgOiAnKCcgKyB0aGlzLmZhY3RvcnMubWFwKGZhY3RvciA9PiBmYWN0b3IudG9TdHJpbmcoKSkuam9pbignICcpICsgJyknO1xufTtcblxucGV4cHJzLkl0ZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5leHByICsgdGhpcy5vcGVyYXRvcjtcbn07XG5cbnBleHBycy5Ob3QucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ34nICsgdGhpcy5leHByO1xufTtcblxucGV4cHJzLkxvb2thaGVhZC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAnJicgKyB0aGlzLmV4cHI7XG59O1xuXG5wZXhwcnMuQXBwbHkucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBwcyA9IHRoaXMuYXJncy5tYXAoYXJnID0+IGFyZy50b1N0cmluZygpKTtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZSArICc8JyArIHBzLmpvaW4oJywnKSArICc+JztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5ydWxlTmFtZTtcbiAgfVxufTtcblxucGV4cHJzLlVuaWNvZGVDaGFyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdcXFxccHsnICsgdGhpcy5jYXRlZ29yeU9yUHJvcCArICd9Jztcbn07XG4iLCJpbXBvcnQge0ZhaWx1cmV9IGZyb20gJy4vRmFpbHVyZS5qcyc7XG5pbXBvcnQge1Rlcm1pbmFsTm9kZX0gZnJvbSAnLi9ub2Rlcy5qcyc7XG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0IHtQRXhwciwgVGVybWluYWx9IGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuXG5leHBvcnQgY2xhc3MgQ2FzZUluc2Vuc2l0aXZlVGVybWluYWwgZXh0ZW5kcyBQRXhwciB7XG4gIGNvbnN0cnVjdG9yKHBhcmFtKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLm9iaiA9IHBhcmFtO1xuICB9XG5cbiAgX2dldFN0cmluZyhzdGF0ZSkge1xuICAgIGNvbnN0IHRlcm1pbmFsID0gc3RhdGUuY3VycmVudEFwcGxpY2F0aW9uKCkuYXJnc1t0aGlzLm9iai5pbmRleF07XG4gICAgYXNzZXJ0KHRlcm1pbmFsIGluc3RhbmNlb2YgVGVybWluYWwsICdleHBlY3RlZCBhIFRlcm1pbmFsIGV4cHJlc3Npb24nKTtcbiAgICByZXR1cm4gdGVybWluYWwub2JqO1xuICB9XG5cbiAgLy8gSW1wbGVtZW50YXRpb24gb2YgdGhlIFBFeHByIEFQSVxuXG4gIGFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBldmFsKHN0YXRlKSB7XG4gICAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICAgIGNvbnN0IG9yaWdQb3MgPSBpbnB1dFN0cmVhbS5wb3M7XG4gICAgY29uc3QgbWF0Y2hTdHIgPSB0aGlzLl9nZXRTdHJpbmcoc3RhdGUpO1xuICAgIGlmICghaW5wdXRTdHJlYW0ubWF0Y2hTdHJpbmcobWF0Y2hTdHIsIHRydWUpKSB7XG4gICAgICBzdGF0ZS5wcm9jZXNzRmFpbHVyZShvcmlnUG9zLCB0aGlzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdGUucHVzaEJpbmRpbmcobmV3IFRlcm1pbmFsTm9kZShtYXRjaFN0ci5sZW5ndGgpLCBvcmlnUG9zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGdldEFyaXR5KCkge1xuICAgIHJldHVybiAxO1xuICB9XG5cbiAgc3Vic3RpdHV0ZVBhcmFtcyhhY3R1YWxzKSB7XG4gICAgcmV0dXJuIG5ldyBDYXNlSW5zZW5zaXRpdmVUZXJtaW5hbCh0aGlzLm9iai5zdWJzdGl0dXRlUGFyYW1zKGFjdHVhbHMpKTtcbiAgfVxuXG4gIHRvRGlzcGxheVN0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5vYmoudG9EaXNwbGF5U3RyaW5nKCkgKyAnIChjYXNlLWluc2Vuc2l0aXZlKSc7XG4gIH1cblxuICB0b0ZhaWx1cmUoZ3JhbW1hcikge1xuICAgIHJldHVybiBuZXcgRmFpbHVyZShcbiAgICAgIHRoaXMsXG4gICAgICB0aGlzLm9iai50b0ZhaWx1cmUoZ3JhbW1hcikgKyAnIChjYXNlLWluc2Vuc2l0aXZlKScsXG4gICAgICAnZGVzY3JpcHRpb24nXG4gICAgKTtcbiAgfVxuXG4gIF9pc051bGxhYmxlKGdyYW1tYXIsIG1lbW8pIHtcbiAgICByZXR1cm4gdGhpcy5vYmouX2lzTnVsbGFibGUoZ3JhbW1hciwgbWVtbyk7XG4gIH1cbn1cbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFeHRlbnNpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5pbXBvcnQgJy4vcGV4cHJzLWFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UuanMnO1xuaW1wb3J0ICcuL3BleHBycy1hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZC5qcyc7XG5pbXBvcnQgJy4vcGV4cHJzLWFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5LmpzJztcbmltcG9ydCAnLi9wZXhwcnMtYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlLmpzJztcbmltcG9ydCAnLi9wZXhwcnMtZXZhbC5qcyc7XG5pbXBvcnQgJy4vcGV4cHJzLWdldEFyaXR5LmpzJztcbmltcG9ydCAnLi9wZXhwcnMtb3V0cHV0UmVjaXBlLmpzJztcbmltcG9ydCAnLi9wZXhwcnMtaW50cm9kdWNlUGFyYW1zLmpzJztcbmltcG9ydCAnLi9wZXhwcnMtaXNOdWxsYWJsZS5qcyc7XG5pbXBvcnQgJy4vcGV4cHJzLXN1YnN0aXR1dGVQYXJhbXMuanMnO1xuaW1wb3J0ICcuL3BleHBycy10b0FyZ3VtZW50TmFtZUxpc3QuanMnO1xuaW1wb3J0ICcuL3BleHBycy10b0Rpc3BsYXlTdHJpbmcuanMnO1xuaW1wb3J0ICcuL3BleHBycy10b0ZhaWx1cmUuanMnO1xuaW1wb3J0ICcuL3BleHBycy10b1N0cmluZy5qcyc7XG5cbmV4cG9ydCAqIGZyb20gJy4vcGV4cHJzLW1haW4uanMnO1xuZXhwb3J0IHtDYXNlSW5zZW5zaXRpdmVUZXJtaW5hbH0gZnJvbSAnLi9DYXNlSW5zZW5zaXRpdmVUZXJtaW5hbC5qcyc7XG4iLCJpbXBvcnQge0lucHV0U3RyZWFtfSBmcm9tICcuL0lucHV0U3RyZWFtLmpzJztcbmltcG9ydCB7TWF0Y2hSZXN1bHR9IGZyb20gJy4vTWF0Y2hSZXN1bHQuanMnO1xuaW1wb3J0IHtQb3NJbmZvfSBmcm9tICcuL1Bvc0luZm8uanMnO1xuaW1wb3J0IHtUcmFjZX0gZnJvbSAnLi9UcmFjZS5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxubGV0IGJ1aWx0SW5BcHBseVN5bnRhY3RpY0JvZHk7XG5cbnV0aWwuYXdhaXRCdWlsdEluUnVsZXMoYnVpbHRJblJ1bGVzID0+IHtcbiAgYnVpbHRJbkFwcGx5U3ludGFjdGljQm9keSA9IGJ1aWx0SW5SdWxlcy5ydWxlcy5hcHBseVN5bnRhY3RpYy5ib2R5O1xufSk7XG5cbmNvbnN0IGFwcGx5U3BhY2VzID0gbmV3IHBleHBycy5BcHBseSgnc3BhY2VzJyk7XG5cbmV4cG9ydCBjbGFzcyBNYXRjaFN0YXRlIHtcbiAgY29uc3RydWN0b3IobWF0Y2hlciwgc3RhcnRFeHByLCBvcHRQb3NpdGlvblRvUmVjb3JkRmFpbHVyZXMpIHtcbiAgICB0aGlzLm1hdGNoZXIgPSBtYXRjaGVyO1xuICAgIHRoaXMuc3RhcnRFeHByID0gc3RhcnRFeHByO1xuXG4gICAgdGhpcy5ncmFtbWFyID0gbWF0Y2hlci5ncmFtbWFyO1xuICAgIHRoaXMuaW5wdXQgPSBtYXRjaGVyLmdldElucHV0KCk7XG4gICAgdGhpcy5pbnB1dFN0cmVhbSA9IG5ldyBJbnB1dFN0cmVhbSh0aGlzLmlucHV0KTtcbiAgICB0aGlzLm1lbW9UYWJsZSA9IG1hdGNoZXIuX21lbW9UYWJsZTtcblxuICAgIHRoaXMudXNlckRhdGEgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5kb05vdE1lbW9pemUgPSBmYWxzZTtcblxuICAgIHRoaXMuX2JpbmRpbmdzID0gW107XG4gICAgdGhpcy5fYmluZGluZ09mZnNldHMgPSBbXTtcbiAgICB0aGlzLl9hcHBsaWNhdGlvblN0YWNrID0gW107XG4gICAgdGhpcy5fcG9zU3RhY2sgPSBbMF07XG4gICAgdGhpcy5pbkxleGlmaWVkQ29udGV4dFN0YWNrID0gW2ZhbHNlXTtcblxuICAgIHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uID0gLTE7XG4gICAgdGhpcy5fcmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uU3RhY2sgPSBbXTtcbiAgICB0aGlzLl9yZWNvcmRlZEZhaWx1cmVzU3RhY2sgPSBbXTtcblxuICAgIGlmIChvcHRQb3NpdGlvblRvUmVjb3JkRmFpbHVyZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wb3NpdGlvblRvUmVjb3JkRmFpbHVyZXMgPSBvcHRQb3NpdGlvblRvUmVjb3JkRmFpbHVyZXM7XG4gICAgICB0aGlzLnJlY29yZGVkRmFpbHVyZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHBvc1RvT2Zmc2V0KHBvcykge1xuICAgIHJldHVybiBwb3MgLSB0aGlzLl9wb3NTdGFja1t0aGlzLl9wb3NTdGFjay5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIGVudGVyQXBwbGljYXRpb24ocG9zSW5mbywgYXBwKSB7XG4gICAgdGhpcy5fcG9zU3RhY2sucHVzaCh0aGlzLmlucHV0U3RyZWFtLnBvcyk7XG4gICAgdGhpcy5fYXBwbGljYXRpb25TdGFjay5wdXNoKGFwcCk7XG4gICAgdGhpcy5pbkxleGlmaWVkQ29udGV4dFN0YWNrLnB1c2goZmFsc2UpO1xuICAgIHBvc0luZm8uZW50ZXIoYXBwKTtcbiAgICB0aGlzLl9yaWdodG1vc3RGYWlsdXJlUG9zaXRpb25TdGFjay5wdXNoKHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uKTtcbiAgICB0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiA9IC0xO1xuICB9XG5cbiAgZXhpdEFwcGxpY2F0aW9uKHBvc0luZm8sIG9wdE5vZGUpIHtcbiAgICBjb25zdCBvcmlnUG9zID0gdGhpcy5fcG9zU3RhY2sucG9wKCk7XG4gICAgdGhpcy5fYXBwbGljYXRpb25TdGFjay5wb3AoKTtcbiAgICB0aGlzLmluTGV4aWZpZWRDb250ZXh0U3RhY2sucG9wKCk7XG4gICAgcG9zSW5mby5leGl0KCk7XG5cbiAgICB0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiA9IE1hdGgubWF4KFxuICAgICAgdGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb24sXG4gICAgICB0aGlzLl9yaWdodG1vc3RGYWlsdXJlUG9zaXRpb25TdGFjay5wb3AoKVxuICAgICk7XG5cbiAgICBpZiAob3B0Tm9kZSkge1xuICAgICAgdGhpcy5wdXNoQmluZGluZyhvcHROb2RlLCBvcmlnUG9zKTtcbiAgICB9XG4gIH1cblxuICBlbnRlckxleGlmaWVkQ29udGV4dCgpIHtcbiAgICB0aGlzLmluTGV4aWZpZWRDb250ZXh0U3RhY2sucHVzaCh0cnVlKTtcbiAgfVxuXG4gIGV4aXRMZXhpZmllZENvbnRleHQoKSB7XG4gICAgdGhpcy5pbkxleGlmaWVkQ29udGV4dFN0YWNrLnBvcCgpO1xuICB9XG5cbiAgY3VycmVudEFwcGxpY2F0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9hcHBsaWNhdGlvblN0YWNrW3RoaXMuX2FwcGxpY2F0aW9uU3RhY2subGVuZ3RoIC0gMV07XG4gIH1cblxuICBpblN5bnRhY3RpY0NvbnRleHQoKSB7XG4gICAgY29uc3QgY3VycmVudEFwcGxpY2F0aW9uID0gdGhpcy5jdXJyZW50QXBwbGljYXRpb24oKTtcbiAgICBpZiAoY3VycmVudEFwcGxpY2F0aW9uKSB7XG4gICAgICByZXR1cm4gY3VycmVudEFwcGxpY2F0aW9uLmlzU3ludGFjdGljKCkgJiYgIXRoaXMuaW5MZXhpZmllZENvbnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIHRvcC1sZXZlbCBjb250ZXh0IGlzIHN5bnRhY3RpYyBpZiB0aGUgc3RhcnQgYXBwbGljYXRpb24gaXMuXG4gICAgICByZXR1cm4gdGhpcy5zdGFydEV4cHIuZmFjdG9yc1swXS5pc1N5bnRhY3RpYygpO1xuICAgIH1cbiAgfVxuXG4gIGluTGV4aWZpZWRDb250ZXh0KCkge1xuICAgIHJldHVybiB0aGlzLmluTGV4aWZpZWRDb250ZXh0U3RhY2tbdGhpcy5pbkxleGlmaWVkQ29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgc2tpcFNwYWNlcygpIHtcbiAgICB0aGlzLnB1c2hGYWlsdXJlc0luZm8oKTtcbiAgICB0aGlzLmV2YWwoYXBwbHlTcGFjZXMpO1xuICAgIHRoaXMucG9wQmluZGluZygpO1xuICAgIHRoaXMucG9wRmFpbHVyZXNJbmZvKCk7XG4gICAgcmV0dXJuIHRoaXMuaW5wdXRTdHJlYW0ucG9zO1xuICB9XG5cbiAgc2tpcFNwYWNlc0lmSW5TeW50YWN0aWNDb250ZXh0KCkge1xuICAgIHJldHVybiB0aGlzLmluU3ludGFjdGljQ29udGV4dCgpID8gdGhpcy5za2lwU3BhY2VzKCkgOiB0aGlzLmlucHV0U3RyZWFtLnBvcztcbiAgfVxuXG4gIG1heWJlU2tpcFNwYWNlc0JlZm9yZShleHByKSB7XG4gICAgaWYgKGV4cHIuYWxsb3dzU2tpcHBpbmdQcmVjZWRpbmdTcGFjZSgpICYmIGV4cHIgIT09IGFwcGx5U3BhY2VzKSB7XG4gICAgICByZXR1cm4gdGhpcy5za2lwU3BhY2VzSWZJblN5bnRhY3RpY0NvbnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuaW5wdXRTdHJlYW0ucG9zO1xuICAgIH1cbiAgfVxuXG4gIHB1c2hCaW5kaW5nKG5vZGUsIG9yaWdQb3MpIHtcbiAgICB0aGlzLl9iaW5kaW5ncy5wdXNoKG5vZGUpO1xuICAgIHRoaXMuX2JpbmRpbmdPZmZzZXRzLnB1c2godGhpcy5wb3NUb09mZnNldChvcmlnUG9zKSk7XG4gIH1cblxuICBwb3BCaW5kaW5nKCkge1xuICAgIHRoaXMuX2JpbmRpbmdzLnBvcCgpO1xuICAgIHRoaXMuX2JpbmRpbmdPZmZzZXRzLnBvcCgpO1xuICB9XG5cbiAgbnVtQmluZGluZ3MoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgfVxuXG4gIHRydW5jYXRlQmluZGluZ3MobmV3TGVuZ3RoKSB7XG4gICAgLy8gWWVzLCB0aGlzIGlzIHRoaXMgcmVhbGx5IGZhc3RlciB0aGFuIHNldHRpbmcgdGhlIGBsZW5ndGhgIHByb3BlcnR5ICh0ZXN0ZWQgd2l0aFxuICAgIC8vIGJpbi9lczViZW5jaCBvbiBOb2RlIHY2LjEuMCkuXG4gICAgLy8gVXBkYXRlIDIwMjEtMTAtMjU6IHN0aWxsIHRydWUgb24gdjE0LjE1LjUg4oCUIGl0J3MgfjIwJSBzcGVlZHVwIG9uIGVzNWJlbmNoLlxuICAgIHdoaWxlICh0aGlzLl9iaW5kaW5ncy5sZW5ndGggPiBuZXdMZW5ndGgpIHtcbiAgICAgIHRoaXMucG9wQmluZGluZygpO1xuICAgIH1cbiAgfVxuXG4gIGdldEN1cnJlbnRQb3NJbmZvKCkge1xuICAgIHJldHVybiB0aGlzLmdldFBvc0luZm8odGhpcy5pbnB1dFN0cmVhbS5wb3MpO1xuICB9XG5cbiAgZ2V0UG9zSW5mbyhwb3MpIHtcbiAgICBsZXQgcG9zSW5mbyA9IHRoaXMubWVtb1RhYmxlW3Bvc107XG4gICAgaWYgKCFwb3NJbmZvKSB7XG4gICAgICBwb3NJbmZvID0gdGhpcy5tZW1vVGFibGVbcG9zXSA9IG5ldyBQb3NJbmZvKCk7XG4gICAgfVxuICAgIHJldHVybiBwb3NJbmZvO1xuICB9XG5cbiAgcHJvY2Vzc0ZhaWx1cmUocG9zLCBleHByKSB7XG4gICAgdGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb24gPSBNYXRoLm1heCh0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiwgcG9zKTtcblxuICAgIGlmICh0aGlzLnJlY29yZGVkRmFpbHVyZXMgJiYgcG9zID09PSB0aGlzLnBvc2l0aW9uVG9SZWNvcmRGYWlsdXJlcykge1xuICAgICAgY29uc3QgYXBwID0gdGhpcy5jdXJyZW50QXBwbGljYXRpb24oKTtcbiAgICAgIGlmIChhcHApIHtcbiAgICAgICAgLy8gU3Vic3RpdHV0ZSBwYXJhbWV0ZXJzIHdpdGggdGhlIGFjdHVhbCBwZXhwcnMgdGhhdCB3ZXJlIHBhc3NlZCB0b1xuICAgICAgICAvLyB0aGUgY3VycmVudCBydWxlLlxuICAgICAgICBleHByID0gZXhwci5zdWJzdGl0dXRlUGFyYW1zKGFwcC5hcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoaXMgYnJhbmNoIGlzIG9ubHkgcmVhY2hlZCBmb3IgdGhlIFwiZW5kLWNoZWNrXCIgdGhhdCBpc1xuICAgICAgICAvLyBwZXJmb3JtZWQgYWZ0ZXIgdGhlIHRvcC1sZXZlbCBhcHBsaWNhdGlvbi4gSW4gdGhhdCBjYXNlLFxuICAgICAgICAvLyBleHByID09PSBwZXhwcnMuZW5kIHNvIHRoZXJlIGlzIG5vIG5lZWQgdG8gc3Vic3RpdHV0ZVxuICAgICAgICAvLyBwYXJhbWV0ZXJzLlxuICAgICAgfVxuXG4gICAgICB0aGlzLnJlY29yZEZhaWx1cmUoZXhwci50b0ZhaWx1cmUodGhpcy5ncmFtbWFyKSwgZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZEZhaWx1cmUoZmFpbHVyZSwgc2hvdWxkQ2xvbmVJZk5ldykge1xuICAgIGNvbnN0IGtleSA9IGZhaWx1cmUudG9LZXkoKTtcbiAgICBpZiAoIXRoaXMucmVjb3JkZWRGYWlsdXJlc1trZXldKSB7XG4gICAgICB0aGlzLnJlY29yZGVkRmFpbHVyZXNba2V5XSA9IHNob3VsZENsb25lSWZOZXcgPyBmYWlsdXJlLmNsb25lKCkgOiBmYWlsdXJlO1xuICAgIH0gZWxzZSBpZiAodGhpcy5yZWNvcmRlZEZhaWx1cmVzW2tleV0uaXNGbHVmZnkoKSAmJiAhZmFpbHVyZS5pc0ZsdWZmeSgpKSB7XG4gICAgICB0aGlzLnJlY29yZGVkRmFpbHVyZXNba2V5XS5jbGVhckZsdWZmeSgpO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZEZhaWx1cmVzKGZhaWx1cmVzLCBzaG91bGRDbG9uZUlmTmV3KSB7XG4gICAgT2JqZWN0LmtleXMoZmFpbHVyZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIHRoaXMucmVjb3JkRmFpbHVyZShmYWlsdXJlc1trZXldLCBzaG91bGRDbG9uZUlmTmV3KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNsb25lUmVjb3JkZWRGYWlsdXJlcygpIHtcbiAgICBpZiAoIXRoaXMucmVjb3JkZWRGYWlsdXJlcykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBhbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIE9iamVjdC5rZXlzKHRoaXMucmVjb3JkZWRGYWlsdXJlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgYW5zW2tleV0gPSB0aGlzLnJlY29yZGVkRmFpbHVyZXNba2V5XS5jbG9uZSgpO1xuICAgIH0pO1xuICAgIHJldHVybiBhbnM7XG4gIH1cblxuICBnZXRSaWdodG1vc3RGYWlsdXJlUG9zaXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uO1xuICB9XG5cbiAgX2dldFJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uID49IDBcbiAgICAgID8gdGhpcy5wb3NUb09mZnNldCh0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbilcbiAgICAgIDogLTE7XG4gIH1cblxuICAvLyBSZXR1cm5zIHRoZSBtZW1vaXplZCB0cmFjZSBlbnRyeSBmb3IgYGV4cHJgIGF0IGBwb3NgLCBpZiBvbmUgZXhpc3RzLCBgbnVsbGAgb3RoZXJ3aXNlLlxuICBnZXRNZW1vaXplZFRyYWNlRW50cnkocG9zLCBleHByKSB7XG4gICAgY29uc3QgcG9zSW5mbyA9IHRoaXMubWVtb1RhYmxlW3Bvc107XG4gICAgaWYgKHBvc0luZm8gJiYgZXhwciBpbnN0YW5jZW9mIHBleHBycy5BcHBseSkge1xuICAgICAgY29uc3QgbWVtb1JlYyA9IHBvc0luZm8ubWVtb1tleHByLnRvTWVtb0tleSgpXTtcbiAgICAgIGlmIChtZW1vUmVjICYmIG1lbW9SZWMudHJhY2VFbnRyeSkge1xuICAgICAgICBjb25zdCBlbnRyeSA9IG1lbW9SZWMudHJhY2VFbnRyeS5jbG9uZVdpdGhFeHByKGV4cHIpO1xuICAgICAgICBlbnRyeS5pc01lbW9pemVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBuZXcgdHJhY2UgZW50cnksIHdpdGggdGhlIGN1cnJlbnRseSBhY3RpdmUgdHJhY2UgYXJyYXkgYXMgaXRzIGNoaWxkcmVuLlxuICBnZXRUcmFjZUVudHJ5KHBvcywgZXhwciwgc3VjY2VlZGVkLCBiaW5kaW5ncykge1xuICAgIGlmIChleHByIGluc3RhbmNlb2YgcGV4cHJzLkFwcGx5KSB7XG4gICAgICBjb25zdCBhcHAgPSB0aGlzLmN1cnJlbnRBcHBsaWNhdGlvbigpO1xuICAgICAgY29uc3QgYWN0dWFscyA9IGFwcCA/IGFwcC5hcmdzIDogW107XG4gICAgICBleHByID0gZXhwci5zdWJzdGl0dXRlUGFyYW1zKGFjdHVhbHMpO1xuICAgIH1cbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5nZXRNZW1vaXplZFRyYWNlRW50cnkocG9zLCBleHByKSB8fFxuICAgICAgbmV3IFRyYWNlKHRoaXMuaW5wdXQsIHBvcywgdGhpcy5pbnB1dFN0cmVhbS5wb3MsIGV4cHIsIHN1Y2NlZWRlZCwgYmluZGluZ3MsIHRoaXMudHJhY2UpXG4gICAgKTtcbiAgfVxuXG4gIGlzVHJhY2luZygpIHtcbiAgICByZXR1cm4gISF0aGlzLnRyYWNlO1xuICB9XG5cbiAgaGFzTmVjZXNzYXJ5SW5mbyhtZW1vUmVjKSB7XG4gICAgaWYgKHRoaXMudHJhY2UgJiYgIW1lbW9SZWMudHJhY2VFbnRyeSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIHRoaXMucmVjb3JkZWRGYWlsdXJlcyAmJlxuICAgICAgdGhpcy5pbnB1dFN0cmVhbS5wb3MgKyBtZW1vUmVjLnJpZ2h0bW9zdEZhaWx1cmVPZmZzZXQgPT09IHRoaXMucG9zaXRpb25Ub1JlY29yZEZhaWx1cmVzXG4gICAgKSB7XG4gICAgICByZXR1cm4gISFtZW1vUmVjLmZhaWx1cmVzQXRSaWdodG1vc3RQb3NpdGlvbjtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHVzZU1lbW9pemVkUmVzdWx0KG9yaWdQb3MsIG1lbW9SZWMpIHtcbiAgICBpZiAodGhpcy50cmFjZSkge1xuICAgICAgdGhpcy50cmFjZS5wdXNoKG1lbW9SZWMudHJhY2VFbnRyeSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWVtb1JlY1JpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiA9XG4gICAgICB0aGlzLmlucHV0U3RyZWFtLnBvcyArIG1lbW9SZWMucmlnaHRtb3N0RmFpbHVyZU9mZnNldDtcbiAgICB0aGlzLnJpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvbiA9IE1hdGgubWF4KFxuICAgICAgdGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb24sXG4gICAgICBtZW1vUmVjUmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uXG4gICAgKTtcbiAgICBpZiAoXG4gICAgICB0aGlzLnJlY29yZGVkRmFpbHVyZXMgJiZcbiAgICAgIHRoaXMucG9zaXRpb25Ub1JlY29yZEZhaWx1cmVzID09PSBtZW1vUmVjUmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uICYmXG4gICAgICBtZW1vUmVjLmZhaWx1cmVzQXRSaWdodG1vc3RQb3NpdGlvblxuICAgICkge1xuICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlcyhtZW1vUmVjLmZhaWx1cmVzQXRSaWdodG1vc3RQb3NpdGlvbiwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5pbnB1dFN0cmVhbS5leGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KFxuICAgICAgdGhpcy5pbnB1dFN0cmVhbS5leGFtaW5lZExlbmd0aCxcbiAgICAgIG1lbW9SZWMuZXhhbWluZWRMZW5ndGggKyBvcmlnUG9zXG4gICAgKTtcblxuICAgIGlmIChtZW1vUmVjLnZhbHVlKSB7XG4gICAgICB0aGlzLmlucHV0U3RyZWFtLnBvcyArPSBtZW1vUmVjLm1hdGNoTGVuZ3RoO1xuICAgICAgdGhpcy5wdXNoQmluZGluZyhtZW1vUmVjLnZhbHVlLCBvcmlnUG9zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBFdmFsdWF0ZSBgZXhwcmAgYW5kIHJldHVybiBgdHJ1ZWAgaWYgaXQgc3VjY2VlZGVkLCBgZmFsc2VgIG90aGVyd2lzZS4gT24gc3VjY2VzcywgYGJpbmRpbmdzYFxuICAvLyB3aWxsIGhhdmUgYGV4cHIuZ2V0QXJpdHkoKWAgbW9yZSBlbGVtZW50cyB0aGFuIGJlZm9yZSwgYW5kIHRoZSBpbnB1dCBzdHJlYW0ncyBwb3NpdGlvbiBtYXlcbiAgLy8gaGF2ZSBpbmNyZWFzZWQuIE9uIGZhaWx1cmUsIGBiaW5kaW5nc2AgYW5kIHBvc2l0aW9uIHdpbGwgYmUgdW5jaGFuZ2VkLlxuICBldmFsKGV4cHIpIHtcbiAgICBjb25zdCB7aW5wdXRTdHJlYW19ID0gdGhpcztcbiAgICBjb25zdCBvcmlnTnVtQmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgY29uc3Qgb3JpZ1VzZXJEYXRhID0gdGhpcy51c2VyRGF0YTtcblxuICAgIGxldCBvcmlnUmVjb3JkZWRGYWlsdXJlcztcbiAgICBpZiAodGhpcy5yZWNvcmRlZEZhaWx1cmVzKSB7XG4gICAgICBvcmlnUmVjb3JkZWRGYWlsdXJlcyA9IHRoaXMucmVjb3JkZWRGYWlsdXJlcztcbiAgICAgIHRoaXMucmVjb3JkZWRGYWlsdXJlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ1BvcyA9IGlucHV0U3RyZWFtLnBvcztcbiAgICBjb25zdCBtZW1vUG9zID0gdGhpcy5tYXliZVNraXBTcGFjZXNCZWZvcmUoZXhwcik7XG5cbiAgICBsZXQgb3JpZ1RyYWNlO1xuICAgIGlmICh0aGlzLnRyYWNlKSB7XG4gICAgICBvcmlnVHJhY2UgPSB0aGlzLnRyYWNlO1xuICAgICAgdGhpcy50cmFjZSA9IFtdO1xuICAgIH1cblxuICAgIC8vIERvIHRoZSBhY3R1YWwgZXZhbHVhdGlvbi5cbiAgICBjb25zdCBhbnMgPSBleHByLmV2YWwodGhpcyk7XG5cbiAgICBpZiAodGhpcy50cmFjZSkge1xuICAgICAgY29uc3QgYmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncy5zbGljZShvcmlnTnVtQmluZGluZ3MpO1xuICAgICAgY29uc3QgdHJhY2VFbnRyeSA9IHRoaXMuZ2V0VHJhY2VFbnRyeShtZW1vUG9zLCBleHByLCBhbnMsIGJpbmRpbmdzKTtcbiAgICAgIHRyYWNlRW50cnkuaXNJbXBsaWNpdFNwYWNlcyA9IGV4cHIgPT09IGFwcGx5U3BhY2VzO1xuICAgICAgdHJhY2VFbnRyeS5pc1Jvb3ROb2RlID0gZXhwciA9PT0gdGhpcy5zdGFydEV4cHI7XG4gICAgICBvcmlnVHJhY2UucHVzaCh0cmFjZUVudHJ5KTtcbiAgICAgIHRoaXMudHJhY2UgPSBvcmlnVHJhY2U7XG4gICAgfVxuXG4gICAgaWYgKGFucykge1xuICAgICAgaWYgKHRoaXMucmVjb3JkZWRGYWlsdXJlcyAmJiBpbnB1dFN0cmVhbS5wb3MgPT09IHRoaXMucG9zaXRpb25Ub1JlY29yZEZhaWx1cmVzKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKHRoaXMucmVjb3JkZWRGYWlsdXJlcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgIHRoaXMucmVjb3JkZWRGYWlsdXJlc1trZXldLm1ha2VGbHVmZnkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFJlc2V0IHRoZSBwb3NpdGlvbiwgYmluZGluZ3MsIGFuZCB1c2VyRGF0YS5cbiAgICAgIGlucHV0U3RyZWFtLnBvcyA9IG9yaWdQb3M7XG4gICAgICB0aGlzLnRydW5jYXRlQmluZGluZ3Mob3JpZ051bUJpbmRpbmdzKTtcbiAgICAgIHRoaXMudXNlckRhdGEgPSBvcmlnVXNlckRhdGE7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucmVjb3JkZWRGYWlsdXJlcykge1xuICAgICAgdGhpcy5yZWNvcmRGYWlsdXJlcyhvcmlnUmVjb3JkZWRGYWlsdXJlcywgZmFsc2UpO1xuICAgIH1cblxuICAgIC8vIFRoZSBidWlsdC1pbiBhcHBseVN5bnRhY3RpYyBydWxlIG5lZWRzIHNwZWNpYWwgaGFuZGxpbmc6IHdlIHdhbnQgdG8gc2tpcFxuICAgIC8vIHRyYWlsaW5nIHNwYWNlcywganVzdCBhcyB3aXRoIHRoZSB0b3AtbGV2ZWwgYXBwbGljYXRpb24gb2YgYSBzeW50YWN0aWMgcnVsZS5cbiAgICBpZiAoZXhwciA9PT0gYnVpbHRJbkFwcGx5U3ludGFjdGljQm9keSkge1xuICAgICAgdGhpcy5za2lwU3BhY2VzKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFucztcbiAgfVxuXG4gIGdldE1hdGNoUmVzdWx0KCkge1xuICAgIHRoaXMuZ3JhbW1hci5fc2V0VXBNYXRjaFN0YXRlKHRoaXMpO1xuICAgIHRoaXMuZXZhbCh0aGlzLnN0YXJ0RXhwcik7XG4gICAgbGV0IHJpZ2h0bW9zdEZhaWx1cmVzO1xuICAgIGlmICh0aGlzLnJlY29yZGVkRmFpbHVyZXMpIHtcbiAgICAgIHJpZ2h0bW9zdEZhaWx1cmVzID0gT2JqZWN0LmtleXModGhpcy5yZWNvcmRlZEZhaWx1cmVzKS5tYXAoXG4gICAgICAgIGtleSA9PiB0aGlzLnJlY29yZGVkRmFpbHVyZXNba2V5XVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgY3N0ID0gdGhpcy5fYmluZGluZ3NbMF07XG4gICAgaWYgKGNzdCkge1xuICAgICAgY3N0LmdyYW1tYXIgPSB0aGlzLmdyYW1tYXI7XG4gICAgfVxuICAgIHJldHVybiBuZXcgTWF0Y2hSZXN1bHQoXG4gICAgICB0aGlzLm1hdGNoZXIsXG4gICAgICB0aGlzLmlucHV0LFxuICAgICAgdGhpcy5zdGFydEV4cHIsXG4gICAgICBjc3QsXG4gICAgICB0aGlzLl9iaW5kaW5nT2Zmc2V0c1swXSxcbiAgICAgIHRoaXMucmlnaHRtb3N0RmFpbHVyZVBvc2l0aW9uLFxuICAgICAgcmlnaHRtb3N0RmFpbHVyZXNcbiAgICApO1xuICB9XG5cbiAgZ2V0VHJhY2UoKSB7XG4gICAgdGhpcy50cmFjZSA9IFtdO1xuICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gdGhpcy5nZXRNYXRjaFJlc3VsdCgpO1xuXG4gICAgLy8gVGhlIHRyYWNlIG5vZGUgZm9yIHRoZSBzdGFydCBydWxlIGlzIGFsd2F5cyB0aGUgbGFzdCBlbnRyeS4gSWYgaXQgaXMgYSBzeW50YWN0aWMgcnVsZSxcbiAgICAvLyB0aGUgZmlyc3QgZW50cnkgaXMgZm9yIGFuIGFwcGxpY2F0aW9uIG9mICdzcGFjZXMnLlxuICAgIC8vIFRPRE8ocGR1YnJveSk6IENsZWFuIHRoaXMgdXAgYnkgaW50cm9kdWNpbmcgYSBzcGVjaWFsIGBNYXRjaDxzdGFydEFwcGw+YCBydWxlLCB3aGljaCB3aWxsXG4gICAgLy8gZW5zdXJlIHRoYXQgdGhlcmUgaXMgYWx3YXlzIGEgc2luZ2xlIHJvb3QgdHJhY2Ugbm9kZS5cbiAgICBjb25zdCByb290VHJhY2UgPSB0aGlzLnRyYWNlW3RoaXMudHJhY2UubGVuZ3RoIC0gMV07XG4gICAgcm9vdFRyYWNlLnJlc3VsdCA9IG1hdGNoUmVzdWx0O1xuICAgIHJldHVybiByb290VHJhY2U7XG4gIH1cblxuICBwdXNoRmFpbHVyZXNJbmZvKCkge1xuICAgIHRoaXMuX3JpZ2h0bW9zdEZhaWx1cmVQb3NpdGlvblN0YWNrLnB1c2godGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb24pO1xuICAgIHRoaXMuX3JlY29yZGVkRmFpbHVyZXNTdGFjay5wdXNoKHRoaXMucmVjb3JkZWRGYWlsdXJlcyk7XG4gIH1cblxuICBwb3BGYWlsdXJlc0luZm8oKSB7XG4gICAgdGhpcy5yaWdodG1vc3RGYWlsdXJlUG9zaXRpb24gPSB0aGlzLl9yaWdodG1vc3RGYWlsdXJlUG9zaXRpb25TdGFjay5wb3AoKTtcbiAgICB0aGlzLnJlY29yZGVkRmFpbHVyZXMgPSB0aGlzLl9yZWNvcmRlZEZhaWx1cmVzU3RhY2sucG9wKCk7XG4gIH1cbn1cbiIsImltcG9ydCB7Z3JhbW1hckRvZXNOb3RTdXBwb3J0SW5jcmVtZW50YWxQYXJzaW5nfSBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQge01hdGNoU3RhdGV9IGZyb20gJy4vTWF0Y2hTdGF0ZS5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuXG5leHBvcnQgY2xhc3MgTWF0Y2hlciB7XG4gIGNvbnN0cnVjdG9yKGdyYW1tYXIpIHtcbiAgICB0aGlzLmdyYW1tYXIgPSBncmFtbWFyO1xuICAgIHRoaXMuX21lbW9UYWJsZSA9IFtdO1xuICAgIHRoaXMuX2lucHV0ID0gJyc7XG4gICAgdGhpcy5faXNNZW1vVGFibGVTdGFsZSA9IGZhbHNlO1xuICB9XG5cbiAgX3Jlc2V0TWVtb1RhYmxlKCkge1xuICAgIHRoaXMuX21lbW9UYWJsZSA9IFtdO1xuICAgIHRoaXMuX2lzTWVtb1RhYmxlU3RhbGUgPSBmYWxzZTtcbiAgfVxuXG4gIGdldElucHV0KCkge1xuICAgIHJldHVybiB0aGlzLl9pbnB1dDtcbiAgfVxuXG4gIHNldElucHV0KHN0cikge1xuICAgIGlmICh0aGlzLl9pbnB1dCAhPT0gc3RyKSB7XG4gICAgICB0aGlzLnJlcGxhY2VJbnB1dFJhbmdlKDAsIHRoaXMuX2lucHV0Lmxlbmd0aCwgc3RyKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICByZXBsYWNlSW5wdXRSYW5nZShzdGFydElkeCwgZW5kSWR4LCBzdHIpIHtcbiAgICBjb25zdCBwcmV2SW5wdXQgPSB0aGlzLl9pbnB1dDtcbiAgICBjb25zdCBtZW1vVGFibGUgPSB0aGlzLl9tZW1vVGFibGU7XG4gICAgaWYgKFxuICAgICAgc3RhcnRJZHggPCAwIHx8XG4gICAgICBzdGFydElkeCA+IHByZXZJbnB1dC5sZW5ndGggfHxcbiAgICAgIGVuZElkeCA8IDAgfHxcbiAgICAgIGVuZElkeCA+IHByZXZJbnB1dC5sZW5ndGggfHxcbiAgICAgIHN0YXJ0SWR4ID4gZW5kSWR4XG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaW5kaWNlczogJyArIHN0YXJ0SWR4ICsgJyBhbmQgJyArIGVuZElkeCk7XG4gICAgfVxuXG4gICAgLy8gdXBkYXRlIGlucHV0XG4gICAgdGhpcy5faW5wdXQgPSBwcmV2SW5wdXQuc2xpY2UoMCwgc3RhcnRJZHgpICsgc3RyICsgcHJldklucHV0LnNsaWNlKGVuZElkeCk7XG4gICAgaWYgKHRoaXMuX2lucHV0ICE9PSBwcmV2SW5wdXQgJiYgbWVtb1RhYmxlLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuX2lzTWVtb1RhYmxlU3RhbGUgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIHVwZGF0ZSBtZW1vIHRhYmxlIChzaW1pbGFyIHRvIHRoZSBhYm92ZSlcbiAgICBjb25zdCByZXN0T2ZNZW1vVGFibGUgPSBtZW1vVGFibGUuc2xpY2UoZW5kSWR4KTtcbiAgICBtZW1vVGFibGUubGVuZ3RoID0gc3RhcnRJZHg7XG4gICAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgc3RyLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgIG1lbW9UYWJsZS5wdXNoKHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9zSW5mbyBvZiByZXN0T2ZNZW1vVGFibGUpIHtcbiAgICAgIG1lbW9UYWJsZS5wdXNoKHBvc0luZm8pO1xuICAgIH1cblxuICAgIC8vIEludmFsaWRhdGUgbWVtb1JlY3NcbiAgICBmb3IgKGxldCBwb3MgPSAwOyBwb3MgPCBzdGFydElkeDsgcG9zKyspIHtcbiAgICAgIGNvbnN0IHBvc0luZm8gPSBtZW1vVGFibGVbcG9zXTtcbiAgICAgIGlmIChwb3NJbmZvKSB7XG4gICAgICAgIHBvc0luZm8uY2xlYXJPYnNvbGV0ZUVudHJpZXMocG9zLCBzdGFydElkeCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBtYXRjaChvcHRTdGFydEFwcGxpY2F0aW9uU3RyLCBvcHRpb25zID0ge2luY3JlbWVudGFsOiB0cnVlfSkge1xuICAgIHJldHVybiB0aGlzLl9tYXRjaCh0aGlzLl9nZXRTdGFydEV4cHIob3B0U3RhcnRBcHBsaWNhdGlvblN0ciksIHtcbiAgICAgIGluY3JlbWVudGFsOiBvcHRpb25zLmluY3JlbWVudGFsLFxuICAgICAgdHJhY2luZzogZmFsc2UsXG4gICAgfSk7XG4gIH1cblxuICB0cmFjZShvcHRTdGFydEFwcGxpY2F0aW9uU3RyLCBvcHRpb25zID0ge2luY3JlbWVudGFsOiB0cnVlfSkge1xuICAgIHJldHVybiB0aGlzLl9tYXRjaCh0aGlzLl9nZXRTdGFydEV4cHIob3B0U3RhcnRBcHBsaWNhdGlvblN0ciksIHtcbiAgICAgIGluY3JlbWVudGFsOiBvcHRpb25zLmluY3JlbWVudGFsLFxuICAgICAgdHJhY2luZzogdHJ1ZSxcbiAgICB9KTtcbiAgfVxuXG4gIF9tYXRjaChzdGFydEV4cHIsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICB0cmFjaW5nOiBmYWxzZSxcbiAgICAgIGluY3JlbWVudGFsOiB0cnVlLFxuICAgICAgcG9zaXRpb25Ub1JlY29yZEZhaWx1cmVzOiB1bmRlZmluZWQsXG4gICAgICAuLi5vcHRpb25zLFxuICAgIH07XG4gICAgaWYgKCFvcHRzLmluY3JlbWVudGFsKSB7XG4gICAgICB0aGlzLl9yZXNldE1lbW9UYWJsZSgpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5faXNNZW1vVGFibGVTdGFsZSAmJiAhdGhpcy5ncmFtbWFyLnN1cHBvcnRzSW5jcmVtZW50YWxQYXJzaW5nKSB7XG4gICAgICB0aHJvdyBncmFtbWFyRG9lc05vdFN1cHBvcnRJbmNyZW1lbnRhbFBhcnNpbmcodGhpcy5ncmFtbWFyKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGF0ZSA9IG5ldyBNYXRjaFN0YXRlKHRoaXMsIHN0YXJ0RXhwciwgb3B0cy5wb3NpdGlvblRvUmVjb3JkRmFpbHVyZXMpO1xuICAgIHJldHVybiBvcHRzLnRyYWNpbmcgPyBzdGF0ZS5nZXRUcmFjZSgpIDogc3RhdGUuZ2V0TWF0Y2hSZXN1bHQoKTtcbiAgfVxuXG4gIC8qXG4gICAgUmV0dXJucyB0aGUgc3RhcnRpbmcgZXhwcmVzc2lvbiBmb3IgdGhpcyBNYXRjaGVyJ3MgYXNzb2NpYXRlZCBncmFtbWFyLiBJZlxuICAgIGBvcHRTdGFydEFwcGxpY2F0aW9uU3RyYCBpcyBzcGVjaWZpZWQsIGl0IGlzIGEgc3RyaW5nIGV4cHJlc3NpbmcgYSBydWxlIGFwcGxpY2F0aW9uIGluIHRoZVxuICAgIGdyYW1tYXIuIElmIG5vdCBzcGVjaWZpZWQsIHRoZSBncmFtbWFyJ3MgZGVmYXVsdCBzdGFydCBydWxlIHdpbGwgYmUgdXNlZC5cbiAgKi9cbiAgX2dldFN0YXJ0RXhwcihvcHRTdGFydEFwcGxpY2F0aW9uU3RyKSB7XG4gICAgY29uc3QgYXBwbGljYXRpb25TdHIgPSBvcHRTdGFydEFwcGxpY2F0aW9uU3RyIHx8IHRoaXMuZ3JhbW1hci5kZWZhdWx0U3RhcnRSdWxlO1xuICAgIGlmICghYXBwbGljYXRpb25TdHIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBzdGFydCBydWxlIGFyZ3VtZW50IC0tIHRoZSBncmFtbWFyIGhhcyBubyBkZWZhdWx0IHN0YXJ0IHJ1bGUuJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnRBcHAgPSB0aGlzLmdyYW1tYXIucGFyc2VBcHBsaWNhdGlvbihhcHBsaWNhdGlvblN0cik7XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuU2VxKFtzdGFydEFwcCwgcGV4cHJzLmVuZF0pO1xuICB9XG59XG4iLCJpbXBvcnQge0lucHV0U3RyZWFtfSBmcm9tICcuL0lucHV0U3RyZWFtLmpzJztcbmltcG9ydCB7SXRlcmF0aW9uTm9kZX0gZnJvbSAnLi9ub2Rlcy5qcyc7XG5pbXBvcnQge01hdGNoUmVzdWx0fSBmcm9tICcuL01hdGNoUmVzdWx0LmpzJztcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgKiBhcyBlcnJvcnMgZnJvbSAnLi9lcnJvcnMuanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBzdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3QgZ2xvYmFsQWN0aW9uU3RhY2sgPSBbXTtcblxuY29uc3QgaGFzT3duUHJvcGVydHkgPSAoeCwgcHJvcCkgPT4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHgsIHByb3ApO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBXcmFwcGVycyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBXcmFwcGVycyBkZWNvcmF0ZSBDU1Qgbm9kZXMgd2l0aCBhbGwgb2YgdGhlIGZ1bmN0aW9uYWxpdHkgKGkuZS4sIG9wZXJhdGlvbnMgYW5kIGF0dHJpYnV0ZXMpXG4vLyBwcm92aWRlZCBieSBhIFNlbWFudGljcyAoc2VlIGJlbG93KS4gYFdyYXBwZXJgIGlzIHRoZSBhYnN0cmFjdCBzdXBlcmNsYXNzIG9mIGFsbCB3cmFwcGVycy4gQVxuLy8gYFdyYXBwZXJgIG11c3QgaGF2ZSBgX25vZGVgIGFuZCBgX3NlbWFudGljc2AgaW5zdGFuY2UgdmFyaWFibGVzLCB3aGljaCByZWZlciB0byB0aGUgQ1NUIG5vZGUgYW5kXG4vLyBTZW1hbnRpY3MgKHJlc3AuKSBmb3Igd2hpY2ggaXQgd2FzIGNyZWF0ZWQsIGFuZCBhIGBfY2hpbGRXcmFwcGVyc2AgaW5zdGFuY2UgdmFyaWFibGUgd2hpY2ggaXNcbi8vIHVzZWQgdG8gY2FjaGUgdGhlIHdyYXBwZXIgaW5zdGFuY2VzIHRoYXQgYXJlIGNyZWF0ZWQgZm9yIGl0cyBjaGlsZCBub2Rlcy4gU2V0dGluZyB0aGVzZSBpbnN0YW5jZVxuLy8gdmFyaWFibGVzIGlzIHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgY29uc3RydWN0b3Igb2YgZWFjaCBTZW1hbnRpY3Mtc3BlY2lmaWMgc3ViY2xhc3Mgb2Zcbi8vIGBXcmFwcGVyYC5cbmNsYXNzIFdyYXBwZXIge1xuICBjb25zdHJ1Y3Rvcihub2RlLCBzb3VyY2VJbnRlcnZhbCwgYmFzZUludGVydmFsKSB7XG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gICAgdGhpcy5zb3VyY2UgPSBzb3VyY2VJbnRlcnZhbDtcblxuICAgIC8vIFRoZSBpbnRlcnZhbCB0aGF0IHRoZSBjaGlsZE9mZnNldHMgb2YgYG5vZGVgIGFyZSByZWxhdGl2ZSB0by4gSXQgc2hvdWxkIGJlIHRoZSBzb3VyY2VcbiAgICAvLyBvZiB0aGUgY2xvc2VzdCBOb250ZXJtaW5hbCBub2RlLlxuICAgIHRoaXMuX2Jhc2VJbnRlcnZhbCA9IGJhc2VJbnRlcnZhbDtcblxuICAgIGlmIChub2RlLmlzTm9udGVybWluYWwoKSkge1xuICAgICAgY29tbW9uLmFzc2VydChzb3VyY2VJbnRlcnZhbCA9PT0gYmFzZUludGVydmFsKTtcbiAgICB9XG4gICAgdGhpcy5fY2hpbGRXcmFwcGVycyA9IFtdO1xuICB9XG5cbiAgX2ZvcmdldE1lbW9pemVkUmVzdWx0Rm9yKGF0dHJpYnV0ZU5hbWUpIHtcbiAgICAvLyBSZW1vdmUgdGhlIG1lbW9pemVkIGF0dHJpYnV0ZSBmcm9tIHRoZSBjc3ROb2RlIGFuZCBhbGwgaXRzIGNoaWxkcmVuLlxuICAgIGRlbGV0ZSB0aGlzLl9ub2RlW3RoaXMuX3NlbWFudGljcy5hdHRyaWJ1dGVLZXlzW2F0dHJpYnV0ZU5hbWVdXTtcbiAgICB0aGlzLmNoaWxkcmVuLmZvckVhY2goY2hpbGQgPT4ge1xuICAgICAgY2hpbGQuX2ZvcmdldE1lbW9pemVkUmVzdWx0Rm9yKGF0dHJpYnV0ZU5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0aGUgd3JhcHBlciBvZiB0aGUgc3BlY2lmaWVkIGNoaWxkIG5vZGUuIENoaWxkIHdyYXBwZXJzIGFyZSBjcmVhdGVkIGxhemlseSBhbmRcbiAgLy8gY2FjaGVkIGluIHRoZSBwYXJlbnQgd3JhcHBlcidzIGBfY2hpbGRXcmFwcGVyc2AgaW5zdGFuY2UgdmFyaWFibGUuXG4gIGNoaWxkKGlkeCkge1xuICAgIGlmICghKDAgPD0gaWR4ICYmIGlkeCA8IHRoaXMuX25vZGUubnVtQ2hpbGRyZW4oKSkpIHtcbiAgICAgIC8vIFRPRE86IENvbnNpZGVyIHRocm93aW5nIGFuIGV4Y2VwdGlvbiBoZXJlLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgbGV0IGNoaWxkV3JhcHBlciA9IHRoaXMuX2NoaWxkV3JhcHBlcnNbaWR4XTtcbiAgICBpZiAoIWNoaWxkV3JhcHBlcikge1xuICAgICAgY29uc3QgY2hpbGROb2RlID0gdGhpcy5fbm9kZS5jaGlsZEF0KGlkeCk7XG4gICAgICBjb25zdCBvZmZzZXQgPSB0aGlzLl9ub2RlLmNoaWxkT2Zmc2V0c1tpZHhdO1xuXG4gICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLl9iYXNlSW50ZXJ2YWwuc3ViSW50ZXJ2YWwob2Zmc2V0LCBjaGlsZE5vZGUubWF0Y2hMZW5ndGgpO1xuICAgICAgY29uc3QgYmFzZSA9IGNoaWxkTm9kZS5pc05vbnRlcm1pbmFsKCkgPyBzb3VyY2UgOiB0aGlzLl9iYXNlSW50ZXJ2YWw7XG4gICAgICBjaGlsZFdyYXBwZXIgPSB0aGlzLl9jaGlsZFdyYXBwZXJzW2lkeF0gPSB0aGlzLl9zZW1hbnRpY3Mud3JhcChjaGlsZE5vZGUsIHNvdXJjZSwgYmFzZSk7XG4gICAgfVxuICAgIHJldHVybiBjaGlsZFdyYXBwZXI7XG4gIH1cblxuICAvLyBSZXR1cm5zIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHdyYXBwZXJzIG9mIGFsbCBvZiB0aGUgY2hpbGRyZW4gb2YgdGhlIG5vZGUgYXNzb2NpYXRlZFxuICAvLyB3aXRoIHRoaXMgd3JhcHBlci5cbiAgX2NoaWxkcmVuKCkge1xuICAgIC8vIEZvcmNlIHRoZSBjcmVhdGlvbiBvZiBhbGwgY2hpbGQgd3JhcHBlcnNcbiAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCB0aGlzLl9ub2RlLm51bUNoaWxkcmVuKCk7IGlkeCsrKSB7XG4gICAgICB0aGlzLmNoaWxkKGlkeCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jaGlsZFdyYXBwZXJzO1xuICB9XG5cbiAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIENTVCBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHdyYXBwZXIgY29ycmVzcG9uZHMgdG8gYW4gaXRlcmF0aW9uXG4gIC8vIGV4cHJlc3Npb24sIGkuZS4sIGEgS2xlZW5lLSosIEtsZWVuZS0rLCBvciBhbiBvcHRpb25hbC4gUmV0dXJucyBgZmFsc2VgIG90aGVyd2lzZS5cbiAgaXNJdGVyYXRpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUuaXNJdGVyYXRpb24oKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYHRydWVgIGlmIHRoZSBDU1Qgbm9kZSBhc3NvY2lhdGVkIHdpdGggdGhpcyB3cmFwcGVyIGlzIGEgdGVybWluYWwgbm9kZSwgYGZhbHNlYFxuICAvLyBvdGhlcndpc2UuXG4gIGlzVGVybWluYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUuaXNUZXJtaW5hbCgpO1xuICB9XG5cbiAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIENTVCBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHdyYXBwZXIgaXMgYSBub250ZXJtaW5hbCBub2RlLCBgZmFsc2VgXG4gIC8vIG90aGVyd2lzZS5cbiAgaXNOb250ZXJtaW5hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZS5pc05vbnRlcm1pbmFsKCk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgQ1NUIG5vZGUgYXNzb2NpYXRlZCB3aXRoIHRoaXMgd3JhcHBlciBpcyBhIG5vbnRlcm1pbmFsIG5vZGVcbiAgLy8gY29ycmVzcG9uZGluZyB0byBhIHN5bnRhY3RpYyBydWxlLCBgZmFsc2VgIG90aGVyd2lzZS5cbiAgaXNTeW50YWN0aWMoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNOb250ZXJtaW5hbCgpICYmIHRoaXMuX25vZGUuaXNTeW50YWN0aWMoKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYHRydWVgIGlmIHRoZSBDU1Qgbm9kZSBhc3NvY2lhdGVkIHdpdGggdGhpcyB3cmFwcGVyIGlzIGEgbm9udGVybWluYWwgbm9kZVxuICAvLyBjb3JyZXNwb25kaW5nIHRvIGEgbGV4aWNhbCBydWxlLCBgZmFsc2VgIG90aGVyd2lzZS5cbiAgaXNMZXhpY2FsKCkge1xuICAgIHJldHVybiB0aGlzLmlzTm9udGVybWluYWwoKSAmJiB0aGlzLl9ub2RlLmlzTGV4aWNhbCgpO1xuICB9XG5cbiAgLy8gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIENTVCBub2RlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHdyYXBwZXIgaXMgYW4gaXRlcmF0b3Igbm9kZVxuICAvLyBoYXZpbmcgZWl0aGVyIG9uZSBvciBubyBjaGlsZCAoPyBvcGVyYXRvciksIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICAvLyBPdGhlcndpc2UsIHRocm93cyBhbiBleGNlcHRpb24uXG4gIGlzT3B0aW9uYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUuaXNPcHRpb25hbCgpO1xuICB9XG5cbiAgLy8gQ3JlYXRlIGEgbmV3IF9pdGVyIHdyYXBwZXIgaW4gdGhlIHNhbWUgc2VtYW50aWNzIGFzIHRoaXMgd3JhcHBlci5cbiAgaXRlcmF0aW9uKG9wdENoaWxkV3JhcHBlcnMpIHtcbiAgICBjb25zdCBjaGlsZFdyYXBwZXJzID0gb3B0Q2hpbGRXcmFwcGVycyB8fCBbXTtcblxuICAgIGNvbnN0IGNoaWxkTm9kZXMgPSBjaGlsZFdyYXBwZXJzLm1hcChjID0+IGMuX25vZGUpO1xuICAgIGNvbnN0IGl0ZXIgPSBuZXcgSXRlcmF0aW9uTm9kZShjaGlsZE5vZGVzLCBbXSwgLTEsIGZhbHNlKTtcblxuICAgIGNvbnN0IHdyYXBwZXIgPSB0aGlzLl9zZW1hbnRpY3Mud3JhcChpdGVyLCBudWxsLCBudWxsKTtcbiAgICB3cmFwcGVyLl9jaGlsZFdyYXBwZXJzID0gY2hpbGRXcmFwcGVycztcbiAgICByZXR1cm4gd3JhcHBlcjtcbiAgfVxuXG4gIC8vIFJldHVybnMgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgY2hpbGRyZW4gb2YgdGhpcyBDU1Qgbm9kZS5cbiAgZ2V0IGNoaWxkcmVuKCkge1xuICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbigpO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0aGUgbmFtZSBvZiBncmFtbWFyIHJ1bGUgdGhhdCBjcmVhdGVkIHRoaXMgQ1NUIG5vZGUuXG4gIGdldCBjdG9yTmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbm9kZS5jdG9yTmFtZTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdGhlIG51bWJlciBvZiBjaGlsZHJlbiBvZiB0aGlzIENTVCBub2RlLlxuICBnZXQgbnVtQ2hpbGRyZW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUubnVtQ2hpbGRyZW4oKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgdGhlIGNvbnRlbnRzIG9mIHRoZSBpbnB1dCBzdHJlYW0gY29uc3VtZWQgYnkgdGhpcyBDU1Qgbm9kZS5cbiAgZ2V0IHNvdXJjZVN0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2UuY29udGVudHM7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0gU2VtYW50aWNzIC0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIEEgU2VtYW50aWNzIGlzIGEgY29udGFpbmVyIGZvciBhIGZhbWlseSBvZiBPcGVyYXRpb25zIGFuZCBBdHRyaWJ1dGVzIGZvciBhIGdpdmVuIGdyYW1tYXIuXG4vLyBTZW1hbnRpY3MgZW5hYmxlIG1vZHVsYXJpdHkgKGRpZmZlcmVudCBjbGllbnRzIG9mIGEgZ3JhbW1hciBjYW4gY3JlYXRlIHRoZWlyIHNldCBvZiBvcGVyYXRpb25zXG4vLyBhbmQgYXR0cmlidXRlcyBpbiBpc29sYXRpb24pIGFuZCBleHRlbnNpYmlsaXR5IGV2ZW4gd2hlbiBvcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIGFyZSBtdXR1YWxseS1cbi8vIHJlY3Vyc2l2ZS4gVGhpcyBjb25zdHJ1Y3RvciBzaG91bGQgbm90IGJlIGNhbGxlZCBkaXJlY3RseSBleGNlcHQgZnJvbVxuLy8gYFNlbWFudGljcy5jcmVhdGVTZW1hbnRpY3NgLiBUaGUgbm9ybWFsIHdheXMgdG8gY3JlYXRlIGEgU2VtYW50aWNzLCBnaXZlbiBhIGdyYW1tYXIgJ2cnLCBhcmVcbi8vIGBnLmNyZWF0ZVNlbWFudGljcygpYCBhbmQgYGcuZXh0ZW5kU2VtYW50aWNzKHBhcmVudFNlbWFudGljcylgLlxuZXhwb3J0IGNsYXNzIFNlbWFudGljcyB7XG4gIGNvbnN0cnVjdG9yKGdyYW1tYXIsIHN1cGVyU2VtYW50aWNzKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5ncmFtbWFyID0gZ3JhbW1hcjtcbiAgICB0aGlzLmNoZWNrZWRBY3Rpb25EaWN0cyA9IGZhbHNlO1xuXG4gICAgLy8gQ29uc3RydWN0b3IgZm9yIHdyYXBwZXIgaW5zdGFuY2VzLCB3aGljaCBhcmUgcGFzc2VkIGFzIHRoZSBhcmd1bWVudHMgdG8gdGhlIHNlbWFudGljIGFjdGlvbnNcbiAgICAvLyBvZiBhbiBvcGVyYXRpb24gb3IgYXR0cmlidXRlLiBPcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIHJlcXVpcmUgZG91YmxlIGRpc3BhdGNoOiB0aGUgc2VtYW50aWNcbiAgICAvLyBhY3Rpb24gaXMgY2hvc2VuIGJhc2VkIG9uIGJvdGggdGhlIG5vZGUncyB0eXBlIGFuZCB0aGUgc2VtYW50aWNzLiBXcmFwcGVycyBlbnN1cmUgdGhhdFxuICAgIC8vIHRoZSBgZXhlY3V0ZWAgbWV0aG9kIGlzIGNhbGxlZCB3aXRoIHRoZSBjb3JyZWN0IChtb3N0IHNwZWNpZmljKSBzZW1hbnRpY3Mgb2JqZWN0IGFzIGFuXG4gICAgLy8gYXJndW1lbnQuXG4gICAgdGhpcy5XcmFwcGVyID0gY2xhc3MgZXh0ZW5kcyAoc3VwZXJTZW1hbnRpY3MgPyBzdXBlclNlbWFudGljcy5XcmFwcGVyIDogV3JhcHBlcikge1xuICAgICAgY29uc3RydWN0b3Iobm9kZSwgc291cmNlSW50ZXJ2YWwsIGJhc2VJbnRlcnZhbCkge1xuICAgICAgICBzdXBlcihub2RlLCBzb3VyY2VJbnRlcnZhbCwgYmFzZUludGVydmFsKTtcbiAgICAgICAgc2VsZi5jaGVja0FjdGlvbkRpY3RzSWZIYXZlbnRBbHJlYWR5KCk7XG4gICAgICAgIHRoaXMuX3NlbWFudGljcyA9IHNlbGY7XG4gICAgICB9XG5cbiAgICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gJ1tzZW1hbnRpY3Mgd3JhcHBlciBmb3IgJyArIHNlbGYuZ3JhbW1hci5uYW1lICsgJ10nO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnN1cGVyID0gc3VwZXJTZW1hbnRpY3M7XG4gICAgaWYgKHN1cGVyU2VtYW50aWNzKSB7XG4gICAgICBpZiAoIShncmFtbWFyLmVxdWFscyh0aGlzLnN1cGVyLmdyYW1tYXIpIHx8IGdyYW1tYXIuX2luaGVyaXRzRnJvbSh0aGlzLnN1cGVyLmdyYW1tYXIpKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJDYW5ub3QgZXh0ZW5kIGEgc2VtYW50aWNzIGZvciBncmFtbWFyICdcIiArXG4gICAgICAgICAgICB0aGlzLnN1cGVyLmdyYW1tYXIubmFtZSArXG4gICAgICAgICAgICBcIicgZm9yIHVzZSB3aXRoIGdyYW1tYXIgJ1wiICtcbiAgICAgICAgICAgIGdyYW1tYXIubmFtZSArXG4gICAgICAgICAgICBcIicgKG5vdCBhIHN1Yi1ncmFtbWFyKVwiXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICB0aGlzLm9wZXJhdGlvbnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuc3VwZXIub3BlcmF0aW9ucyk7XG4gICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBPYmplY3QuY3JlYXRlKHRoaXMuc3VwZXIuYXR0cmlidXRlcyk7XG4gICAgICB0aGlzLmF0dHJpYnV0ZUtleXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICAvLyBBc3NpZ24gdW5pcXVlIHN5bWJvbHMgZm9yIGVhY2ggb2YgdGhlIGF0dHJpYnV0ZXMgaW5oZXJpdGVkIGZyb20gdGhlIHN1cGVyLXNlbWFudGljcyBzbyB0aGF0XG4gICAgICAvLyB0aGV5IGFyZSBtZW1vaXplZCBpbmRlcGVuZGVudGx5LlxuXG4gICAgICBmb3IgKGNvbnN0IGF0dHJpYnV0ZU5hbWUgaW4gdGhpcy5hdHRyaWJ1dGVzKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLmF0dHJpYnV0ZUtleXMsIGF0dHJpYnV0ZU5hbWUsIHtcbiAgICAgICAgICB2YWx1ZTogdXRpbC51bmlxdWVJZChhdHRyaWJ1dGVOYW1lKSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3BlcmF0aW9ucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgdGhpcy5hdHRyaWJ1dGVLZXlzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB9XG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gJ1tzZW1hbnRpY3MgZm9yICcgKyB0aGlzLmdyYW1tYXIubmFtZSArICddJztcbiAgfVxuXG4gIGNoZWNrQWN0aW9uRGljdHNJZkhhdmVudEFscmVhZHkoKSB7XG4gICAgaWYgKCF0aGlzLmNoZWNrZWRBY3Rpb25EaWN0cykge1xuICAgICAgdGhpcy5jaGVja0FjdGlvbkRpY3RzKCk7XG4gICAgICB0aGlzLmNoZWNrZWRBY3Rpb25EaWN0cyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2tzIHRoYXQgdGhlIGFjdGlvbiBkaWN0aW9uYXJpZXMgZm9yIGFsbCBvcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIGluIHRoaXMgc2VtYW50aWNzLFxuICAvLyBpbmNsdWRpbmcgdGhlIG9uZXMgdGhhdCB3ZXJlIGluaGVyaXRlZCBmcm9tIHRoZSBzdXBlci1zZW1hbnRpY3MsIGFncmVlIHdpdGggdGhlIGdyYW1tYXIuXG4gIC8vIFRocm93cyBhbiBleGNlcHRpb24gaWYgb25lIG9yIG1vcmUgb2YgdGhlbSBkb2Vzbid0LlxuICBjaGVja0FjdGlvbkRpY3RzKCkge1xuICAgIGxldCBuYW1lO1xuXG4gICAgZm9yIChuYW1lIGluIHRoaXMub3BlcmF0aW9ucykge1xuICAgICAgdGhpcy5vcGVyYXRpb25zW25hbWVdLmNoZWNrQWN0aW9uRGljdCh0aGlzLmdyYW1tYXIpO1xuICAgIH1cblxuICAgIGZvciAobmFtZSBpbiB0aGlzLmF0dHJpYnV0ZXMpIHtcbiAgICAgIHRoaXMuYXR0cmlidXRlc1tuYW1lXS5jaGVja0FjdGlvbkRpY3QodGhpcy5ncmFtbWFyKTtcbiAgICB9XG4gIH1cblxuICB0b1JlY2lwZShzZW1hbnRpY3NPbmx5KSB7XG4gICAgZnVuY3Rpb24gaGFzU3VwZXJTZW1hbnRpY3Mocykge1xuICAgICAgcmV0dXJuIHMuc3VwZXIgIT09IFNlbWFudGljcy5CdWlsdEluU2VtYW50aWNzLl9nZXRTZW1hbnRpY3MoKTtcbiAgICB9XG5cbiAgICBsZXQgc3RyID0gJyhmdW5jdGlvbihnKSB7XFxuJztcbiAgICBpZiAoaGFzU3VwZXJTZW1hbnRpY3ModGhpcykpIHtcbiAgICAgIHN0ciArPSAnICB2YXIgc2VtYW50aWNzID0gJyArIHRoaXMuc3VwZXIudG9SZWNpcGUodHJ1ZSkgKyAnKGcnO1xuXG4gICAgICBjb25zdCBzdXBlclNlbWFudGljc0dyYW1tYXIgPSB0aGlzLnN1cGVyLmdyYW1tYXI7XG4gICAgICBsZXQgcmVsYXRlZEdyYW1tYXIgPSB0aGlzLmdyYW1tYXI7XG4gICAgICB3aGlsZSAocmVsYXRlZEdyYW1tYXIgIT09IHN1cGVyU2VtYW50aWNzR3JhbW1hcikge1xuICAgICAgICBzdHIgKz0gJy5zdXBlckdyYW1tYXInO1xuICAgICAgICByZWxhdGVkR3JhbW1hciA9IHJlbGF0ZWRHcmFtbWFyLnN1cGVyR3JhbW1hcjtcbiAgICAgIH1cblxuICAgICAgc3RyICs9ICcpO1xcbic7XG4gICAgICBzdHIgKz0gJyAgcmV0dXJuIGcuZXh0ZW5kU2VtYW50aWNzKHNlbWFudGljcyknO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAgcmV0dXJuIGcuY3JlYXRlU2VtYW50aWNzKCknO1xuICAgIH1cbiAgICBbJ09wZXJhdGlvbicsICdBdHRyaWJ1dGUnXS5mb3JFYWNoKHR5cGUgPT4ge1xuICAgICAgY29uc3Qgc2VtYW50aWNPcGVyYXRpb25zID0gdGhpc1t0eXBlLnRvTG93ZXJDYXNlKCkgKyAncyddO1xuICAgICAgT2JqZWN0LmtleXMoc2VtYW50aWNPcGVyYXRpb25zKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICBjb25zdCB7YWN0aW9uRGljdCwgZm9ybWFscywgYnVpbHRJbkRlZmF1bHR9ID0gc2VtYW50aWNPcGVyYXRpb25zW25hbWVdO1xuXG4gICAgICAgIGxldCBzaWduYXR1cmUgPSBuYW1lO1xuICAgICAgICBpZiAoZm9ybWFscy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgc2lnbmF0dXJlICs9ICcoJyArIGZvcm1hbHMuam9pbignLCAnKSArICcpJztcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBtZXRob2Q7XG4gICAgICAgIGlmIChoYXNTdXBlclNlbWFudGljcyh0aGlzKSAmJiB0aGlzLnN1cGVyW3R5cGUudG9Mb3dlckNhc2UoKSArICdzJ11bbmFtZV0pIHtcbiAgICAgICAgICBtZXRob2QgPSAnZXh0ZW5kJyArIHR5cGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWV0aG9kID0gJ2FkZCcgKyB0eXBlO1xuICAgICAgICB9XG4gICAgICAgIHN0ciArPSAnXFxuICAgIC4nICsgbWV0aG9kICsgJygnICsgSlNPTi5zdHJpbmdpZnkoc2lnbmF0dXJlKSArICcsIHsnO1xuXG4gICAgICAgIGNvbnN0IHNyY0FycmF5ID0gW107XG4gICAgICAgIE9iamVjdC5rZXlzKGFjdGlvbkRpY3QpLmZvckVhY2goYWN0aW9uTmFtZSA9PiB7XG4gICAgICAgICAgaWYgKGFjdGlvbkRpY3RbYWN0aW9uTmFtZV0gIT09IGJ1aWx0SW5EZWZhdWx0KSB7XG4gICAgICAgICAgICBsZXQgc291cmNlID0gYWN0aW9uRGljdFthY3Rpb25OYW1lXS50b1N0cmluZygpLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gQ29udmVydCBtZXRob2Qgc2hvcnRoYW5kIHRvIHBsYWluIG9sZCBmdW5jdGlvbiBzeW50YXguXG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vb2htanMvb2htL2lzc3Vlcy8yNjNcbiAgICAgICAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKC9eLipcXCgvLCAnZnVuY3Rpb24oJyk7XG5cbiAgICAgICAgICAgIHNyY0FycmF5LnB1c2goJ1xcbiAgICAgICcgKyBKU09OLnN0cmluZ2lmeShhY3Rpb25OYW1lKSArICc6ICcgKyBzb3VyY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHN0ciArPSBzcmNBcnJheS5qb2luKCcsJykgKyAnXFxuICAgIH0pJztcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHN0ciArPSAnO1xcbiAgfSknO1xuXG4gICAgaWYgKCFzZW1hbnRpY3NPbmx5KSB7XG4gICAgICBzdHIgPVxuICAgICAgICAnKGZ1bmN0aW9uKCkge1xcbicgK1xuICAgICAgICAnICB2YXIgZ3JhbW1hciA9IHRoaXMuZnJvbVJlY2lwZSgnICtcbiAgICAgICAgdGhpcy5ncmFtbWFyLnRvUmVjaXBlKCkgK1xuICAgICAgICAnKTtcXG4nICtcbiAgICAgICAgJyAgdmFyIHNlbWFudGljcyA9ICcgK1xuICAgICAgICBzdHIgK1xuICAgICAgICAnKGdyYW1tYXIpO1xcbicgK1xuICAgICAgICAnICByZXR1cm4gc2VtYW50aWNzO1xcbicgK1xuICAgICAgICAnfSk7XFxuJztcbiAgICB9XG5cbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgYWRkT3BlcmF0aW9uT3JBdHRyaWJ1dGUodHlwZSwgc2lnbmF0dXJlLCBhY3Rpb25EaWN0KSB7XG4gICAgY29uc3QgdHlwZVBsdXJhbCA9IHR5cGUgKyAncyc7XG5cbiAgICBjb25zdCBwYXJzZWROYW1lQW5kRm9ybWFsQXJncyA9IHBhcnNlU2lnbmF0dXJlKHNpZ25hdHVyZSwgdHlwZSk7XG4gICAgY29uc3Qge25hbWV9ID0gcGFyc2VkTmFtZUFuZEZvcm1hbEFyZ3M7XG4gICAgY29uc3Qge2Zvcm1hbHN9ID0gcGFyc2VkTmFtZUFuZEZvcm1hbEFyZ3M7XG5cbiAgICAvLyBUT0RPOiBjaGVjayB0aGF0IHRoZXJlIGFyZSBubyBkdXBsaWNhdGUgZm9ybWFsIGFyZ3VtZW50c1xuXG4gICAgdGhpcy5hc3NlcnROZXdOYW1lKG5hbWUsIHR5cGUpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBhY3Rpb24gZGljdGlvbmFyeSBmb3IgdGhpcyBvcGVyYXRpb24gLyBhdHRyaWJ1dGUgdGhhdCBjb250YWlucyBhIGBfZGVmYXVsdGAgYWN0aW9uXG4gICAgLy8gd2hpY2ggZGVmaW5lcyB0aGUgZGVmYXVsdCBiZWhhdmlvciBvZiBpdGVyYXRpb24sIHRlcm1pbmFsLCBhbmQgbm9uLXRlcm1pbmFsIG5vZGVzLi4uXG4gICAgY29uc3QgYnVpbHRJbkRlZmF1bHQgPSBuZXdEZWZhdWx0QWN0aW9uKHR5cGUsIG5hbWUsIGRvSXQpO1xuICAgIGNvbnN0IHJlYWxBY3Rpb25EaWN0ID0ge19kZWZhdWx0OiBidWlsdEluRGVmYXVsdH07XG4gICAgLy8gLi4uIGFuZCBhZGQgaW4gdGhlIGFjdGlvbnMgc3VwcGxpZWQgYnkgdGhlIHByb2dyYW1tZXIsIHdoaWNoIG1heSBvdmVycmlkZSBzb21lIG9yIGFsbCBvZiB0aGVcbiAgICAvLyBkZWZhdWx0IG9uZXMuXG4gICAgT2JqZWN0LmtleXMoYWN0aW9uRGljdCkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgIHJlYWxBY3Rpb25EaWN0W25hbWVdID0gYWN0aW9uRGljdFtuYW1lXTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGVudHJ5ID1cbiAgICAgIHR5cGUgPT09ICdvcGVyYXRpb24nXG4gICAgICAgID8gbmV3IE9wZXJhdGlvbihuYW1lLCBmb3JtYWxzLCByZWFsQWN0aW9uRGljdCwgYnVpbHRJbkRlZmF1bHQpXG4gICAgICAgIDogbmV3IEF0dHJpYnV0ZShuYW1lLCByZWFsQWN0aW9uRGljdCwgYnVpbHRJbkRlZmF1bHQpO1xuXG4gICAgLy8gVGhlIGZvbGxvd2luZyBjaGVjayBpcyBub3Qgc3RyaWN0bHkgbmVjZXNzYXJ5IChpdCB3aWxsIGhhcHBlbiBsYXRlciBhbnl3YXkpIGJ1dCBpdCdzIGJldHRlclxuICAgIC8vIHRvIGNhdGNoIGVycm9ycyBlYXJseS5cbiAgICBlbnRyeS5jaGVja0FjdGlvbkRpY3QodGhpcy5ncmFtbWFyKTtcblxuICAgIHRoaXNbdHlwZVBsdXJhbF1bbmFtZV0gPSBlbnRyeTtcblxuICAgIGZ1bmN0aW9uIGRvSXQoLi4uYXJncykge1xuICAgICAgLy8gRGlzcGF0Y2ggdG8gbW9zdCBzcGVjaWZpYyB2ZXJzaW9uIG9mIHRoaXMgb3BlcmF0aW9uIC8gYXR0cmlidXRlIC0tIGl0IG1heSBoYXZlIGJlZW5cbiAgICAgIC8vIG92ZXJyaWRkZW4gYnkgYSBzdWItc2VtYW50aWNzLlxuICAgICAgY29uc3QgdGhpc1RoaW5nID0gdGhpcy5fc2VtYW50aWNzW3R5cGVQbHVyYWxdW25hbWVdO1xuXG4gICAgICAvLyBDaGVjayB0aGF0IHRoZSBjYWxsZXIgcGFzc2VkIHRoZSBjb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMuXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCAhPT0gdGhpc1RoaW5nLmZvcm1hbHMubGVuZ3RoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnSW52YWxpZCBudW1iZXIgb2YgYXJndW1lbnRzIHBhc3NlZCB0byAnICtcbiAgICAgICAgICAgIG5hbWUgK1xuICAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgIHR5cGUgK1xuICAgICAgICAgICAgJyAoZXhwZWN0ZWQgJyArXG4gICAgICAgICAgICB0aGlzVGhpbmcuZm9ybWFscy5sZW5ndGggK1xuICAgICAgICAgICAgJywgZ290ICcgK1xuICAgICAgICAgICAgYXJndW1lbnRzLmxlbmd0aCArXG4gICAgICAgICAgICAnKSdcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ3JlYXRlIGFuIFwiYXJndW1lbnRzIG9iamVjdFwiIGZyb20gdGhlIGFyZ3VtZW50cyB0aGF0IHdlcmUgcGFzc2VkIHRvIHRoaXNcbiAgICAgIC8vIG9wZXJhdGlvbiAvIGF0dHJpYnV0ZS5cbiAgICAgIGNvbnN0IGFyZ3NPYmogPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgZm9yIChjb25zdCBbaWR4LCB2YWxdIG9mIE9iamVjdC5lbnRyaWVzKGFyZ3MpKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hbCA9IHRoaXNUaGluZy5mb3JtYWxzW2lkeF07XG4gICAgICAgIGFyZ3NPYmpbZm9ybWFsXSA9IHZhbDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb2xkQXJncyA9IHRoaXMuYXJncztcbiAgICAgIHRoaXMuYXJncyA9IGFyZ3NPYmo7XG4gICAgICBjb25zdCBhbnMgPSB0aGlzVGhpbmcuZXhlY3V0ZSh0aGlzLl9zZW1hbnRpY3MsIHRoaXMpO1xuICAgICAgdGhpcy5hcmdzID0gb2xkQXJncztcbiAgICAgIHJldHVybiBhbnM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICdvcGVyYXRpb24nKSB7XG4gICAgICB0aGlzLldyYXBwZXIucHJvdG90eXBlW25hbWVdID0gZG9JdDtcbiAgICAgIHRoaXMuV3JhcHBlci5wcm90b3R5cGVbbmFtZV0udG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAnWycgKyBuYW1lICsgJyBvcGVyYXRpb25dJztcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLldyYXBwZXIucHJvdG90eXBlLCBuYW1lLCB7XG4gICAgICAgIGdldDogZG9JdCxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLCAvLyBTbyB0aGUgcHJvcGVydHkgY2FuIGJlIGRlbGV0ZWQuXG4gICAgICB9KTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLmF0dHJpYnV0ZUtleXMsIG5hbWUsIHtcbiAgICAgICAgdmFsdWU6IHV0aWwudW5pcXVlSWQobmFtZSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBleHRlbmRPcGVyYXRpb25PckF0dHJpYnV0ZSh0eXBlLCBuYW1lLCBhY3Rpb25EaWN0KSB7XG4gICAgY29uc3QgdHlwZVBsdXJhbCA9IHR5cGUgKyAncyc7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCBgbmFtZWAgcmVhbGx5IGlzIGp1c3QgYSBuYW1lLCBpLmUuLCB0aGF0IGl0IGRvZXNuJ3QgYWxzbyBjb250YWluIGZvcm1hbHMuXG4gICAgcGFyc2VTaWduYXR1cmUobmFtZSwgJ2F0dHJpYnV0ZScpO1xuXG4gICAgaWYgKCEodGhpcy5zdXBlciAmJiBuYW1lIGluIHRoaXMuc3VwZXJbdHlwZVBsdXJhbF0pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdDYW5ub3QgZXh0ZW5kICcgK1xuICAgICAgICAgIHR5cGUgK1xuICAgICAgICAgIFwiICdcIiArXG4gICAgICAgICAgbmFtZSArXG4gICAgICAgICAgXCInOiBkaWQgbm90IGluaGVyaXQgYW4gXCIgK1xuICAgICAgICAgIHR5cGUgK1xuICAgICAgICAgICcgd2l0aCB0aGF0IG5hbWUnXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoaGFzT3duUHJvcGVydHkodGhpc1t0eXBlUGx1cmFsXSwgbmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGV4dGVuZCAnICsgdHlwZSArIFwiICdcIiArIG5hbWUgKyBcIicgYWdhaW5cIik7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgbmV3IG9wZXJhdGlvbiAvIGF0dHJpYnV0ZSB3aG9zZSBhY3Rpb25EaWN0IGRlbGVnYXRlcyB0byB0aGUgc3VwZXIgb3BlcmF0aW9uIC9cbiAgICAvLyBhdHRyaWJ1dGUncyBhY3Rpb25EaWN0LCBhbmQgd2hpY2ggaGFzIGFsbCB0aGUga2V5cyBmcm9tIGBpbmhlcml0ZWRBY3Rpb25EaWN0YC5cbiAgICBjb25zdCBpbmhlcml0ZWRGb3JtYWxzID0gdGhpc1t0eXBlUGx1cmFsXVtuYW1lXS5mb3JtYWxzO1xuICAgIGNvbnN0IGluaGVyaXRlZEFjdGlvbkRpY3QgPSB0aGlzW3R5cGVQbHVyYWxdW25hbWVdLmFjdGlvbkRpY3Q7XG4gICAgY29uc3QgbmV3QWN0aW9uRGljdCA9IE9iamVjdC5jcmVhdGUoaW5oZXJpdGVkQWN0aW9uRGljdCk7XG4gICAgT2JqZWN0LmtleXMoYWN0aW9uRGljdCkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgIG5ld0FjdGlvbkRpY3RbbmFtZV0gPSBhY3Rpb25EaWN0W25hbWVdO1xuICAgIH0pO1xuXG4gICAgdGhpc1t0eXBlUGx1cmFsXVtuYW1lXSA9XG4gICAgICB0eXBlID09PSAnb3BlcmF0aW9uJ1xuICAgICAgICA/IG5ldyBPcGVyYXRpb24obmFtZSwgaW5oZXJpdGVkRm9ybWFscywgbmV3QWN0aW9uRGljdClcbiAgICAgICAgOiBuZXcgQXR0cmlidXRlKG5hbWUsIG5ld0FjdGlvbkRpY3QpO1xuXG4gICAgLy8gVGhlIGZvbGxvd2luZyBjaGVjayBpcyBub3Qgc3RyaWN0bHkgbmVjZXNzYXJ5IChpdCB3aWxsIGhhcHBlbiBsYXRlciBhbnl3YXkpIGJ1dCBpdCdzIGJldHRlclxuICAgIC8vIHRvIGNhdGNoIGVycm9ycyBlYXJseS5cbiAgICB0aGlzW3R5cGVQbHVyYWxdW25hbWVdLmNoZWNrQWN0aW9uRGljdCh0aGlzLmdyYW1tYXIpO1xuICB9XG5cbiAgYXNzZXJ0TmV3TmFtZShuYW1lLCB0eXBlKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KFdyYXBwZXIucHJvdG90eXBlLCBuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYWRkICcgKyB0eXBlICsgXCIgJ1wiICsgbmFtZSArIFwiJzogdGhhdCdzIGEgcmVzZXJ2ZWQgbmFtZVwiKTtcbiAgICB9XG4gICAgaWYgKG5hbWUgaW4gdGhpcy5vcGVyYXRpb25zKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYWRkICcgKyB0eXBlICsgXCIgJ1wiICsgbmFtZSArIFwiJzogYW4gb3BlcmF0aW9uIHdpdGggdGhhdCBuYW1lIGFscmVhZHkgZXhpc3RzXCJcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChuYW1lIGluIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnQ2Fubm90IGFkZCAnICsgdHlwZSArIFwiICdcIiArIG5hbWUgKyBcIic6IGFuIGF0dHJpYnV0ZSB3aXRoIHRoYXQgbmFtZSBhbHJlYWR5IGV4aXN0c1wiXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybnMgYSB3cmFwcGVyIGZvciB0aGUgZ2l2ZW4gQ1NUIGBub2RlYCBpbiB0aGlzIHNlbWFudGljcy5cbiAgLy8gSWYgYG5vZGVgIGlzIGFscmVhZHkgYSB3cmFwcGVyLCByZXR1cm5zIGBub2RlYCBpdHNlbGYuICAvLyBUT0RPOiB3aHkgaXMgdGhpcyBuZWVkZWQ/XG4gIHdyYXAobm9kZSwgc291cmNlLCBvcHRCYXNlSW50ZXJ2YWwpIHtcbiAgICBjb25zdCBiYXNlSW50ZXJ2YWwgPSBvcHRCYXNlSW50ZXJ2YWwgfHwgc291cmNlO1xuICAgIHJldHVybiBub2RlIGluc3RhbmNlb2YgdGhpcy5XcmFwcGVyID8gbm9kZSA6IG5ldyB0aGlzLldyYXBwZXIobm9kZSwgc291cmNlLCBiYXNlSW50ZXJ2YWwpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2lnbmF0dXJlKHNpZ25hdHVyZSwgdHlwZSkge1xuICBpZiAoIVNlbWFudGljcy5wcm90b3R5cGVHcmFtbWFyKSB7XG4gICAgLy8gVGhlIE9wZXJhdGlvbnMgYW5kIEF0dHJpYnV0ZXMgZ3JhbW1hciB3b24ndCBiZSBhdmFpbGFibGUgd2hpbGUgT2htIGlzIGxvYWRpbmcsXG4gICAgLy8gYnV0IHdlIGNhbiBnZXQgYXdheSB0aGUgZm9sbG93aW5nIHNpbXBsaWZpY2F0aW9uIGIvYyBub25lIG9mIHRoZSBvcGVyYXRpb25zXG4gICAgLy8gdGhhdCBhcmUgdXNlZCB3aGlsZSBsb2FkaW5nIHRha2UgYXJndW1lbnRzLlxuICAgIGNvbW1vbi5hc3NlcnQoc2lnbmF0dXJlLmluZGV4T2YoJygnKSA9PT0gLTEpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBzaWduYXR1cmUsXG4gICAgICBmb3JtYWxzOiBbXSxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgciA9IFNlbWFudGljcy5wcm90b3R5cGVHcmFtbWFyLm1hdGNoKFxuICAgIHNpZ25hdHVyZSxcbiAgICB0eXBlID09PSAnb3BlcmF0aW9uJyA/ICdPcGVyYXRpb25TaWduYXR1cmUnIDogJ0F0dHJpYnV0ZVNpZ25hdHVyZSdcbiAgKTtcbiAgaWYgKHIuZmFpbGVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3Ioci5tZXNzYWdlKTtcbiAgfVxuXG4gIHJldHVybiBTZW1hbnRpY3MucHJvdG90eXBlR3JhbW1hclNlbWFudGljcyhyKS5wYXJzZSgpO1xufVxuXG5mdW5jdGlvbiBuZXdEZWZhdWx0QWN0aW9uKHR5cGUsIG5hbWUsIGRvSXQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICguLi5jaGlsZHJlbikge1xuICAgIGNvbnN0IHRoaXNUaGluZyA9IHRoaXMuX3NlbWFudGljcy5vcGVyYXRpb25zW25hbWVdIHx8IHRoaXMuX3NlbWFudGljcy5hdHRyaWJ1dGVzW25hbWVdO1xuICAgIGNvbnN0IGFyZ3MgPSB0aGlzVGhpbmcuZm9ybWFscy5tYXAoZm9ybWFsID0+IHRoaXMuYXJnc1tmb3JtYWxdKTtcblxuICAgIGlmICghdGhpcy5pc0l0ZXJhdGlvbigpICYmIGNoaWxkcmVuLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gVGhpcyBDU1Qgbm9kZSBjb3JyZXNwb25kcyB0byBhIG5vbi10ZXJtaW5hbCBpbiB0aGUgZ3JhbW1hciAoZS5nLiwgQWRkRXhwcikuIFRoZSBmYWN0IHRoYXRcbiAgICAgIC8vIHdlIGdvdCBoZXJlIG1lYW5zIHRoYXQgdGhpcyBhY3Rpb24gZGljdGlvbmFyeSBkb2Vzbid0IGhhdmUgYW4gYWN0aW9uIGZvciB0aGlzIHBhcnRpY3VsYXJcbiAgICAgIC8vIG5vbi10ZXJtaW5hbCBvciBhIGdlbmVyaWMgYF9ub250ZXJtaW5hbGAgYWN0aW9uLlxuICAgICAgLy8gQXMgYSBjb252ZW5pZW5jZSwgaWYgdGhpcyBub2RlIG9ubHkgaGFzIG9uZSBjaGlsZCwgd2UganVzdCByZXR1cm4gdGhlIHJlc3VsdCBvZiBhcHBseWluZ1xuICAgICAgLy8gdGhpcyBvcGVyYXRpb24gLyBhdHRyaWJ1dGUgdG8gdGhlIGNoaWxkIG5vZGUuXG4gICAgICByZXR1cm4gZG9JdC5hcHBseShjaGlsZHJlblswXSwgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE90aGVyd2lzZSwgd2UgdGhyb3cgYW4gZXhjZXB0aW9uIHRvIGxldCB0aGUgcHJvZ3JhbW1lciBrbm93IHRoYXQgd2UgZG9uJ3Qga25vdyB3aGF0XG4gICAgICAvLyB0byBkbyB3aXRoIHRoaXMgbm9kZS5cbiAgICAgIHRocm93IGVycm9ycy5taXNzaW5nU2VtYW50aWNBY3Rpb24odGhpcy5jdG9yTmFtZSwgbmFtZSwgdHlwZSwgZ2xvYmFsQWN0aW9uU3RhY2spO1xuICAgIH1cbiAgfTtcbn1cblxuLy8gQ3JlYXRlcyBhIG5ldyBTZW1hbnRpY3MgaW5zdGFuY2UgZm9yIGBncmFtbWFyYCwgaW5oZXJpdGluZyBvcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIGZyb21cbi8vIGBvcHRTdXBlclNlbWFudGljc2AsIGlmIGl0IGlzIHNwZWNpZmllZC4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgYWN0cyBhcyBhIHByb3h5IGZvciB0aGUgbmV3XG4vLyBTZW1hbnRpY3MgaW5zdGFuY2UuIFdoZW4gdGhhdCBmdW5jdGlvbiBpcyBpbnZva2VkIHdpdGggYSBDU1Qgbm9kZSBhcyBhbiBhcmd1bWVudCwgaXQgcmV0dXJuc1xuLy8gYSB3cmFwcGVyIGZvciB0aGF0IG5vZGUgd2hpY2ggZ2l2ZXMgYWNjZXNzIHRvIHRoZSBvcGVyYXRpb25zIGFuZCBhdHRyaWJ1dGVzIHByb3ZpZGVkIGJ5IHRoaXNcbi8vIHNlbWFudGljcy5cblNlbWFudGljcy5jcmVhdGVTZW1hbnRpY3MgPSBmdW5jdGlvbiAoZ3JhbW1hciwgb3B0U3VwZXJTZW1hbnRpY3MpIHtcbiAgY29uc3QgcyA9IG5ldyBTZW1hbnRpY3MoXG4gICAgZ3JhbW1hcixcbiAgICBvcHRTdXBlclNlbWFudGljcyAhPT0gdW5kZWZpbmVkXG4gICAgICA/IG9wdFN1cGVyU2VtYW50aWNzXG4gICAgICA6IFNlbWFudGljcy5CdWlsdEluU2VtYW50aWNzLl9nZXRTZW1hbnRpY3MoKVxuICApO1xuXG4gIC8vIFRvIGVuYWJsZSBjbGllbnRzIHRvIGludm9rZSBhIHNlbWFudGljcyBsaWtlIGEgZnVuY3Rpb24sIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgYWN0cyBhcyBhIHByb3h5XG4gIC8vIGZvciBgc2AsIHdoaWNoIGlzIHRoZSByZWFsIGBTZW1hbnRpY3NgIGluc3RhbmNlLlxuICBjb25zdCBwcm94eSA9IGZ1bmN0aW9uIEFTZW1hbnRpY3MobWF0Y2hSZXN1bHQpIHtcbiAgICBpZiAoIShtYXRjaFJlc3VsdCBpbnN0YW5jZW9mIE1hdGNoUmVzdWx0KSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ1NlbWFudGljcyBleHBlY3RlZCBhIE1hdGNoUmVzdWx0LCBidXQgZ290ICcgK1xuICAgICAgICAgIGNvbW1vbi51bmV4cGVjdGVkT2JqVG9TdHJpbmcobWF0Y2hSZXN1bHQpXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAobWF0Y2hSZXN1bHQuZmFpbGVkKCkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2Nhbm5vdCBhcHBseSBTZW1hbnRpY3MgdG8gJyArIG1hdGNoUmVzdWx0LnRvU3RyaW5nKCkpO1xuICAgIH1cblxuICAgIGNvbnN0IGNzdCA9IG1hdGNoUmVzdWx0Ll9jc3Q7XG4gICAgaWYgKGNzdC5ncmFtbWFyICE9PSBncmFtbWFyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiQ2Fubm90IHVzZSBhIE1hdGNoUmVzdWx0IGZyb20gZ3JhbW1hciAnXCIgK1xuICAgICAgICAgIGNzdC5ncmFtbWFyLm5hbWUgK1xuICAgICAgICAgIFwiJyB3aXRoIGEgc2VtYW50aWNzIGZvciAnXCIgK1xuICAgICAgICAgIGdyYW1tYXIubmFtZSArXG4gICAgICAgICAgXCInXCJcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGlucHV0U3RyZWFtID0gbmV3IElucHV0U3RyZWFtKG1hdGNoUmVzdWx0LmlucHV0KTtcbiAgICByZXR1cm4gcy53cmFwKGNzdCwgaW5wdXRTdHJlYW0uaW50ZXJ2YWwobWF0Y2hSZXN1bHQuX2NzdE9mZnNldCwgbWF0Y2hSZXN1bHQuaW5wdXQubGVuZ3RoKSk7XG4gIH07XG5cbiAgLy8gRm9yd2FyZCBwdWJsaWMgbWV0aG9kcyBmcm9tIHRoZSBwcm94eSB0byB0aGUgc2VtYW50aWNzIGluc3RhbmNlLlxuICBwcm94eS5hZGRPcGVyYXRpb24gPSBmdW5jdGlvbiAoc2lnbmF0dXJlLCBhY3Rpb25EaWN0KSB7XG4gICAgcy5hZGRPcGVyYXRpb25PckF0dHJpYnV0ZSgnb3BlcmF0aW9uJywgc2lnbmF0dXJlLCBhY3Rpb25EaWN0KTtcbiAgICByZXR1cm4gcHJveHk7XG4gIH07XG4gIHByb3h5LmV4dGVuZE9wZXJhdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCBhY3Rpb25EaWN0KSB7XG4gICAgcy5leHRlbmRPcGVyYXRpb25PckF0dHJpYnV0ZSgnb3BlcmF0aW9uJywgbmFtZSwgYWN0aW9uRGljdCk7XG4gICAgcmV0dXJuIHByb3h5O1xuICB9O1xuICBwcm94eS5hZGRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAobmFtZSwgYWN0aW9uRGljdCkge1xuICAgIHMuYWRkT3BlcmF0aW9uT3JBdHRyaWJ1dGUoJ2F0dHJpYnV0ZScsIG5hbWUsIGFjdGlvbkRpY3QpO1xuICAgIHJldHVybiBwcm94eTtcbiAgfTtcbiAgcHJveHkuZXh0ZW5kQXR0cmlidXRlID0gZnVuY3Rpb24gKG5hbWUsIGFjdGlvbkRpY3QpIHtcbiAgICBzLmV4dGVuZE9wZXJhdGlvbk9yQXR0cmlidXRlKCdhdHRyaWJ1dGUnLCBuYW1lLCBhY3Rpb25EaWN0KTtcbiAgICByZXR1cm4gcHJveHk7XG4gIH07XG4gIHByb3h5Ll9nZXRBY3Rpb25EaWN0ID0gZnVuY3Rpb24gKG9wZXJhdGlvbk9yQXR0cmlidXRlTmFtZSkge1xuICAgIGNvbnN0IGFjdGlvbiA9XG4gICAgICBzLm9wZXJhdGlvbnNbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXSB8fCBzLmF0dHJpYnV0ZXNbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXTtcbiAgICBpZiAoIWFjdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnXCInICtcbiAgICAgICAgICBvcGVyYXRpb25PckF0dHJpYnV0ZU5hbWUgK1xuICAgICAgICAgICdcIiBpcyBub3QgYSB2YWxpZCBvcGVyYXRpb24gb3IgYXR0cmlidXRlICcgK1xuICAgICAgICAgICduYW1lIGluIHRoaXMgc2VtYW50aWNzIGZvciBcIicgK1xuICAgICAgICAgIGdyYW1tYXIubmFtZSArXG4gICAgICAgICAgJ1wiJ1xuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbi5hY3Rpb25EaWN0O1xuICB9O1xuICBwcm94eS5fcmVtb3ZlID0gZnVuY3Rpb24gKG9wZXJhdGlvbk9yQXR0cmlidXRlTmFtZSkge1xuICAgIGxldCBzZW1hbnRpYztcbiAgICBpZiAob3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lIGluIHMub3BlcmF0aW9ucykge1xuICAgICAgc2VtYW50aWMgPSBzLm9wZXJhdGlvbnNbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXTtcbiAgICAgIGRlbGV0ZSBzLm9wZXJhdGlvbnNbb3BlcmF0aW9uT3JBdHRyaWJ1dGVOYW1lXTtcbiAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbk9yQXR0cmlidXRlTmFtZSBpbiBzLmF0dHJpYnV0ZXMpIHtcbiAgICAgIHNlbWFudGljID0gcy5hdHRyaWJ1dGVzW29wZXJhdGlvbk9yQXR0cmlidXRlTmFtZV07XG4gICAgICBkZWxldGUgcy5hdHRyaWJ1dGVzW29wZXJhdGlvbk9yQXR0cmlidXRlTmFtZV07XG4gICAgfVxuICAgIGRlbGV0ZSBzLldyYXBwZXIucHJvdG90eXBlW29wZXJhdGlvbk9yQXR0cmlidXRlTmFtZV07XG4gICAgcmV0dXJuIHNlbWFudGljO1xuICB9O1xuICBwcm94eS5nZXRPcGVyYXRpb25OYW1lcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMocy5vcGVyYXRpb25zKTtcbiAgfTtcbiAgcHJveHkuZ2V0QXR0cmlidXRlTmFtZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHMuYXR0cmlidXRlcyk7XG4gIH07XG4gIHByb3h5LmdldEdyYW1tYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHMuZ3JhbW1hcjtcbiAgfTtcbiAgcHJveHkudG9SZWNpcGUgPSBmdW5jdGlvbiAoc2VtYW50aWNzT25seSkge1xuICAgIHJldHVybiBzLnRvUmVjaXBlKHNlbWFudGljc09ubHkpO1xuICB9O1xuXG4gIC8vIE1ha2UgdGhlIHByb3h5J3MgdG9TdHJpbmcoKSB3b3JrLlxuICBwcm94eS50b1N0cmluZyA9IHMudG9TdHJpbmcuYmluZChzKTtcblxuICAvLyBSZXR1cm5zIHRoZSBzZW1hbnRpY3MgZm9yIHRoZSBwcm94eS5cbiAgcHJveHkuX2dldFNlbWFudGljcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcztcbiAgfTtcblxuICByZXR1cm4gcHJveHk7XG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLSBPcGVyYXRpb24gLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gQW4gT3BlcmF0aW9uIHJlcHJlc2VudHMgYSBmdW5jdGlvbiB0byBiZSBhcHBsaWVkIHRvIGEgY29uY3JldGUgc3ludGF4IHRyZWUgKENTVCkgLS0gaXQncyB2ZXJ5XG4vLyBzaW1pbGFyIHRvIGEgVmlzaXRvciAoaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9WaXNpdG9yX3BhdHRlcm4pLiBBbiBvcGVyYXRpb24gaXMgZXhlY3V0ZWQgYnlcbi8vIHJlY3Vyc2l2ZWx5IHdhbGtpbmcgdGhlIENTVCwgYW5kIGF0IGVhY2ggbm9kZSwgaW52b2tpbmcgdGhlIG1hdGNoaW5nIHNlbWFudGljIGFjdGlvbiBmcm9tXG4vLyBgYWN0aW9uRGljdGAuIFNlZSBgT3BlcmF0aW9uLnByb3RvdHlwZS5leGVjdXRlYCBmb3IgZGV0YWlscyBvZiBob3cgYSBDU1Qgbm9kZSdzIG1hdGNoaW5nIHNlbWFudGljXG4vLyBhY3Rpb24gaXMgZm91bmQuXG5jbGFzcyBPcGVyYXRpb24ge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBmb3JtYWxzLCBhY3Rpb25EaWN0LCBidWlsdEluRGVmYXVsdCkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5mb3JtYWxzID0gZm9ybWFscztcbiAgICB0aGlzLmFjdGlvbkRpY3QgPSBhY3Rpb25EaWN0O1xuICAgIHRoaXMuYnVpbHRJbkRlZmF1bHQgPSBidWlsdEluRGVmYXVsdDtcbiAgfVxuXG4gIGNoZWNrQWN0aW9uRGljdChncmFtbWFyKSB7XG4gICAgZ3JhbW1hci5fY2hlY2tUb3BEb3duQWN0aW9uRGljdCh0aGlzLnR5cGVOYW1lLCB0aGlzLm5hbWUsIHRoaXMuYWN0aW9uRGljdCk7XG4gIH1cblxuICAvLyBFeGVjdXRlIHRoaXMgb3BlcmF0aW9uIG9uIHRoZSBDU1Qgbm9kZSBhc3NvY2lhdGVkIHdpdGggYG5vZGVXcmFwcGVyYCBpbiB0aGUgY29udGV4dCBvZiB0aGVcbiAgLy8gZ2l2ZW4gU2VtYW50aWNzIGluc3RhbmNlLlxuICBleGVjdXRlKHNlbWFudGljcywgbm9kZVdyYXBwZXIpIHtcbiAgICB0cnkge1xuICAgICAgLy8gTG9vayBmb3IgYSBzZW1hbnRpYyBhY3Rpb24gd2hvc2UgbmFtZSBtYXRjaGVzIHRoZSBub2RlJ3MgY29uc3RydWN0b3IgbmFtZSwgd2hpY2ggaXMgZWl0aGVyXG4gICAgICAvLyB0aGUgbmFtZSBvZiBhIHJ1bGUgaW4gdGhlIGdyYW1tYXIsIG9yICdfdGVybWluYWwnIChmb3IgYSB0ZXJtaW5hbCBub2RlKSwgb3IgJ19pdGVyJyAoZm9yIGFuXG4gICAgICAvLyBpdGVyYXRpb24gbm9kZSkuXG4gICAgICBjb25zdCB7Y3Rvck5hbWV9ID0gbm9kZVdyYXBwZXIuX25vZGU7XG4gICAgICBsZXQgYWN0aW9uRm4gPSB0aGlzLmFjdGlvbkRpY3RbY3Rvck5hbWVdO1xuICAgICAgaWYgKGFjdGlvbkZuKSB7XG4gICAgICAgIGdsb2JhbEFjdGlvblN0YWNrLnB1c2goW3RoaXMsIGN0b3JOYW1lXSk7XG4gICAgICAgIHJldHVybiBhY3Rpb25Gbi5hcHBseShub2RlV3JhcHBlciwgbm9kZVdyYXBwZXIuX2NoaWxkcmVuKCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgYWN0aW9uIGRpY3Rpb25hcnkgZG9lcyBub3QgY29udGFpbiBhIHNlbWFudGljIGFjdGlvbiBmb3IgdGhpcyBzcGVjaWZpYyB0eXBlIG9mIG5vZGUuXG4gICAgICAvLyBJZiB0aGlzIGlzIGEgbm9udGVybWluYWwgbm9kZSBhbmQgdGhlIHByb2dyYW1tZXIgaGFzIHByb3ZpZGVkIGEgYF9ub250ZXJtaW5hbGAgc2VtYW50aWNcbiAgICAgIC8vIGFjdGlvbiwgd2UgaW52b2tlIGl0OlxuICAgICAgaWYgKG5vZGVXcmFwcGVyLmlzTm9udGVybWluYWwoKSkge1xuICAgICAgICBhY3Rpb25GbiA9IHRoaXMuYWN0aW9uRGljdC5fbm9udGVybWluYWw7XG4gICAgICAgIGlmIChhY3Rpb25Gbikge1xuICAgICAgICAgIGdsb2JhbEFjdGlvblN0YWNrLnB1c2goW3RoaXMsICdfbm9udGVybWluYWwnLCBjdG9yTmFtZV0pO1xuICAgICAgICAgIHJldHVybiBhY3Rpb25Gbi5hcHBseShub2RlV3JhcHBlciwgbm9kZVdyYXBwZXIuX2NoaWxkcmVuKCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE90aGVyd2lzZSwgd2UgaW52b2tlIHRoZSAnX2RlZmF1bHQnIHNlbWFudGljIGFjdGlvbi5cbiAgICAgIGdsb2JhbEFjdGlvblN0YWNrLnB1c2goW3RoaXMsICdkZWZhdWx0IGFjdGlvbicsIGN0b3JOYW1lXSk7XG4gICAgICByZXR1cm4gdGhpcy5hY3Rpb25EaWN0Ll9kZWZhdWx0LmFwcGx5KG5vZGVXcmFwcGVyLCBub2RlV3JhcHBlci5fY2hpbGRyZW4oKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGdsb2JhbEFjdGlvblN0YWNrLnBvcCgpO1xuICAgIH1cbiAgfVxufVxuXG5PcGVyYXRpb24ucHJvdG90eXBlLnR5cGVOYW1lID0gJ29wZXJhdGlvbic7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tIEF0dHJpYnV0ZSAtLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBBdHRyaWJ1dGVzIGFyZSBPcGVyYXRpb25zIHdob3NlIHJlc3VsdHMgYXJlIG1lbW9pemVkLiBUaGlzIG1lYW5zIHRoYXQsIGZvciBhbnkgZ2l2ZW4gc2VtYW50aWNzLFxuLy8gdGhlIHNlbWFudGljIGFjdGlvbiBmb3IgYSBDU1Qgbm9kZSB3aWxsIGJlIGludm9rZWQgbm8gbW9yZSB0aGFuIG9uY2UuXG5jbGFzcyBBdHRyaWJ1dGUgZXh0ZW5kcyBPcGVyYXRpb24ge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBhY3Rpb25EaWN0LCBidWlsdEluRGVmYXVsdCkge1xuICAgIHN1cGVyKG5hbWUsIFtdLCBhY3Rpb25EaWN0LCBidWlsdEluRGVmYXVsdCk7XG4gIH1cblxuICBleGVjdXRlKHNlbWFudGljcywgbm9kZVdyYXBwZXIpIHtcbiAgICBjb25zdCBub2RlID0gbm9kZVdyYXBwZXIuX25vZGU7XG4gICAgY29uc3Qga2V5ID0gc2VtYW50aWNzLmF0dHJpYnV0ZUtleXNbdGhpcy5uYW1lXTtcbiAgICBpZiAoIWhhc093blByb3BlcnR5KG5vZGUsIGtleSkpIHtcbiAgICAgIC8vIFRoZSBmb2xsb3dpbmcgaXMgYSBzdXBlci1zZW5kIC0tIGlzbid0IEpTIGJlYXV0aWZ1bD8gOi9cbiAgICAgIG5vZGVba2V5XSA9IE9wZXJhdGlvbi5wcm90b3R5cGUuZXhlY3V0ZS5jYWxsKHRoaXMsIHNlbWFudGljcywgbm9kZVdyYXBwZXIpO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZVtrZXldO1xuICB9XG59XG5cbkF0dHJpYnV0ZS5wcm90b3R5cGUudHlwZU5hbWUgPSAnYXR0cmlidXRlJztcbiIsImltcG9ydCB7TWF0Y2hlcn0gZnJvbSAnLi9NYXRjaGVyLmpzJztcbmltcG9ydCB7U2VtYW50aWNzfSBmcm9tICcuL1NlbWFudGljcy5qcyc7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSAnLi9jb21tb24uanMnO1xuaW1wb3J0ICogYXMgZXJyb3JzIGZyb20gJy4vZXJyb3JzLmpzJztcbmltcG9ydCAqIGFzIHBleHBycyBmcm9tICcuL3BleHBycy5qcyc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQcml2YXRlIHN0dWZmXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5jb25zdCBTUEVDSUFMX0FDVElPTl9OQU1FUyA9IFsnX2l0ZXInLCAnX3Rlcm1pbmFsJywgJ19ub250ZXJtaW5hbCcsICdfZGVmYXVsdCddO1xuXG5mdW5jdGlvbiBnZXRTb3J0ZWRSdWxlVmFsdWVzKGdyYW1tYXIpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKGdyYW1tYXIucnVsZXMpXG4gICAgLnNvcnQoKVxuICAgIC5tYXAobmFtZSA9PiBncmFtbWFyLnJ1bGVzW25hbWVdKTtcbn1cblxuLy8gVW50aWwgRVMyMDE5LCBKU09OIHdhcyBub3QgYSB2YWxpZCBzdWJzZXQgb2YgSmF2YVNjcmlwdCBiZWNhdXNlIFUrMjAyOCAobGluZSBzZXBhcmF0b3IpXG4vLyBhbmQgVSsyMDI5IChwYXJhZ3JhcGggc2VwYXJhdG9yKSBhcmUgYWxsb3dlZCBpbiBKU09OIHN0cmluZyBsaXRlcmFscywgYnV0IG5vdCBpbiBKUy5cbi8vIFRoaXMgZnVuY3Rpb24gcHJvcGVybHkgZW5jb2RlcyB0aG9zZSB0d28gY2hhcmFjdGVycyBzbyB0aGF0IHRoZSByZXN1bHRpbmcgc3RyaW5nIGlzXG4vLyByZXByZXNlbnRzIGJvdGggdmFsaWQgSlNPTiwgYW5kIHZhbGlkIEphdmFTY3JpcHQgKGZvciBFUzIwMTggYW5kIGJlbG93KS5cbi8vIFNlZSBodHRwczovL3Y4LmRldi9mZWF0dXJlcy9zdWJzdW1lLWpzb24gZm9yIG1vcmUgZGV0YWlscy5cbmNvbnN0IGpzb25Ub0pTID0gc3RyID0+IHN0ci5yZXBsYWNlKC9cXHUyMDI4L2csICdcXFxcdTIwMjgnKS5yZXBsYWNlKC9cXHUyMDI5L2csICdcXFxcdTIwMjknKTtcblxubGV0IG9obUdyYW1tYXI7XG5sZXQgYnVpbGRHcmFtbWFyO1xuXG5leHBvcnQgY2xhc3MgR3JhbW1hciB7XG4gIGNvbnN0cnVjdG9yKG5hbWUsIHN1cGVyR3JhbW1hciwgcnVsZXMsIG9wdERlZmF1bHRTdGFydFJ1bGUpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuc3VwZXJHcmFtbWFyID0gc3VwZXJHcmFtbWFyO1xuICAgIHRoaXMucnVsZXMgPSBydWxlcztcbiAgICBpZiAob3B0RGVmYXVsdFN0YXJ0UnVsZSkge1xuICAgICAgaWYgKCEob3B0RGVmYXVsdFN0YXJ0UnVsZSBpbiBydWxlcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiSW52YWxpZCBzdGFydCBydWxlOiAnXCIgK1xuICAgICAgICAgICAgb3B0RGVmYXVsdFN0YXJ0UnVsZSArXG4gICAgICAgICAgICBcIicgaXMgbm90IGEgcnVsZSBpbiBncmFtbWFyICdcIiArXG4gICAgICAgICAgICBuYW1lICtcbiAgICAgICAgICAgIFwiJ1wiXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICB0aGlzLmRlZmF1bHRTdGFydFJ1bGUgPSBvcHREZWZhdWx0U3RhcnRSdWxlO1xuICAgIH1cbiAgICB0aGlzLl9tYXRjaFN0YXRlSW5pdGlhbGl6ZXIgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5zdXBwb3J0c0luY3JlbWVudGFsUGFyc2luZyA9IHRydWU7XG4gIH1cblxuICBtYXRjaGVyKCkge1xuICAgIHJldHVybiBuZXcgTWF0Y2hlcih0aGlzKTtcbiAgfVxuXG4gIC8vIFJldHVybiB0cnVlIGlmIHRoZSBncmFtbWFyIGlzIGEgYnVpbHQtaW4gZ3JhbW1hciwgb3RoZXJ3aXNlIGZhbHNlLlxuICAvLyBOT1RFOiBUaGlzIG1pZ2h0IGdpdmUgYW4gdW5leHBlY3RlZCByZXN1bHQgaWYgY2FsbGVkIGJlZm9yZSBCdWlsdEluUnVsZXMgaXMgZGVmaW5lZCFcbiAgaXNCdWlsdEluKCkge1xuICAgIHJldHVybiB0aGlzID09PSBHcmFtbWFyLlByb3RvQnVpbHRJblJ1bGVzIHx8IHRoaXMgPT09IEdyYW1tYXIuQnVpbHRJblJ1bGVzO1xuICB9XG5cbiAgZXF1YWxzKGcpIHtcbiAgICBpZiAodGhpcyA9PT0gZykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vIERvIHRoZSBjaGVhcGVzdCBjb21wYXJpc29ucyBmaXJzdC5cbiAgICBpZiAoXG4gICAgICBnID09IG51bGwgfHxcbiAgICAgIHRoaXMubmFtZSAhPT0gZy5uYW1lIHx8XG4gICAgICB0aGlzLmRlZmF1bHRTdGFydFJ1bGUgIT09IGcuZGVmYXVsdFN0YXJ0UnVsZSB8fFxuICAgICAgISh0aGlzLnN1cGVyR3JhbW1hciA9PT0gZy5zdXBlckdyYW1tYXIgfHwgdGhpcy5zdXBlckdyYW1tYXIuZXF1YWxzKGcuc3VwZXJHcmFtbWFyKSlcbiAgICApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgbXlSdWxlcyA9IGdldFNvcnRlZFJ1bGVWYWx1ZXModGhpcyk7XG4gICAgY29uc3Qgb3RoZXJSdWxlcyA9IGdldFNvcnRlZFJ1bGVWYWx1ZXMoZyk7XG4gICAgcmV0dXJuIChcbiAgICAgIG15UnVsZXMubGVuZ3RoID09PSBvdGhlclJ1bGVzLmxlbmd0aCAmJlxuICAgICAgbXlSdWxlcy5ldmVyeSgocnVsZSwgaSkgPT4ge1xuICAgICAgICByZXR1cm4gKFxuICAgICAgICAgIHJ1bGUuZGVzY3JpcHRpb24gPT09IG90aGVyUnVsZXNbaV0uZGVzY3JpcHRpb24gJiZcbiAgICAgICAgICBydWxlLmZvcm1hbHMuam9pbignLCcpID09PSBvdGhlclJ1bGVzW2ldLmZvcm1hbHMuam9pbignLCcpICYmXG4gICAgICAgICAgcnVsZS5ib2R5LnRvU3RyaW5nKCkgPT09IG90aGVyUnVsZXNbaV0uYm9keS50b1N0cmluZygpXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICBtYXRjaChpbnB1dCwgb3B0U3RhcnRBcHBsaWNhdGlvbikge1xuICAgIGNvbnN0IG0gPSB0aGlzLm1hdGNoZXIoKTtcbiAgICBtLnJlcGxhY2VJbnB1dFJhbmdlKDAsIDAsIGlucHV0KTtcbiAgICByZXR1cm4gbS5tYXRjaChvcHRTdGFydEFwcGxpY2F0aW9uKTtcbiAgfVxuXG4gIHRyYWNlKGlucHV0LCBvcHRTdGFydEFwcGxpY2F0aW9uKSB7XG4gICAgY29uc3QgbSA9IHRoaXMubWF0Y2hlcigpO1xuICAgIG0ucmVwbGFjZUlucHV0UmFuZ2UoMCwgMCwgaW5wdXQpO1xuICAgIHJldHVybiBtLnRyYWNlKG9wdFN0YXJ0QXBwbGljYXRpb24pO1xuICB9XG5cbiAgY3JlYXRlU2VtYW50aWNzKCkge1xuICAgIHJldHVybiBTZW1hbnRpY3MuY3JlYXRlU2VtYW50aWNzKHRoaXMpO1xuICB9XG5cbiAgZXh0ZW5kU2VtYW50aWNzKHN1cGVyU2VtYW50aWNzKSB7XG4gICAgcmV0dXJuIFNlbWFudGljcy5jcmVhdGVTZW1hbnRpY3ModGhpcywgc3VwZXJTZW1hbnRpY3MuX2dldFNlbWFudGljcygpKTtcbiAgfVxuXG4gIC8vIENoZWNrIHRoYXQgZXZlcnkga2V5IGluIGBhY3Rpb25EaWN0YCBjb3JyZXNwb25kcyB0byBhIHNlbWFudGljIGFjdGlvbiwgYW5kIHRoYXQgaXQgbWFwcyB0b1xuICAvLyBhIGZ1bmN0aW9uIG9mIHRoZSBjb3JyZWN0IGFyaXR5LiBJZiBub3QsIHRocm93IGFuIGV4Y2VwdGlvbi5cbiAgX2NoZWNrVG9wRG93bkFjdGlvbkRpY3Qod2hhdCwgbmFtZSwgYWN0aW9uRGljdCkge1xuICAgIGNvbnN0IHByb2JsZW1zID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGsgaW4gYWN0aW9uRGljdCkge1xuICAgICAgY29uc3QgdiA9IGFjdGlvbkRpY3Rba107XG4gICAgICBjb25zdCBpc1NwZWNpYWxBY3Rpb24gPSBTUEVDSUFMX0FDVElPTl9OQU1FUy5pbmNsdWRlcyhrKTtcblxuICAgICAgaWYgKCFpc1NwZWNpYWxBY3Rpb24gJiYgIShrIGluIHRoaXMucnVsZXMpKSB7XG4gICAgICAgIHByb2JsZW1zLnB1c2goYCcke2t9JyBpcyBub3QgYSB2YWxpZCBzZW1hbnRpYyBhY3Rpb24gZm9yICcke3RoaXMubmFtZX0nYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB2ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHByb2JsZW1zLnB1c2goYCcke2t9JyBtdXN0IGJlIGEgZnVuY3Rpb24gaW4gYW4gYWN0aW9uIGRpY3Rpb25hcnkgZm9yICcke3RoaXMubmFtZX0nYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgYWN0dWFsID0gdi5sZW5ndGg7XG4gICAgICBjb25zdCBleHBlY3RlZCA9IHRoaXMuX3RvcERvd25BY3Rpb25Bcml0eShrKTtcbiAgICAgIGlmIChhY3R1YWwgIT09IGV4cGVjdGVkKSB7XG4gICAgICAgIGxldCBkZXRhaWxzO1xuICAgICAgICBpZiAoayA9PT0gJ19pdGVyJyB8fCBrID09PSAnX25vbnRlcm1pbmFsJykge1xuICAgICAgICAgIGRldGFpbHMgPVxuICAgICAgICAgICAgYGl0IHNob3VsZCB1c2UgYSByZXN0IHBhcmFtZXRlciwgZS5nLiBcXGAke2t9KC4uLmNoaWxkcmVuKSB7fVxcYC4gYCArXG4gICAgICAgICAgICAnTk9URTogdGhpcyBpcyBuZXcgaW4gT2htIHYxNiDigJQgc2VlIGh0dHBzOi8vb2htanMub3JnL2QvYXRpIGZvciBkZXRhaWxzLic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGV0YWlscyA9IGBleHBlY3RlZCAke2V4cGVjdGVkfSwgZ290ICR7YWN0dWFsfWA7XG4gICAgICAgIH1cbiAgICAgICAgcHJvYmxlbXMucHVzaChgU2VtYW50aWMgYWN0aW9uICcke2t9JyBoYXMgdGhlIHdyb25nIGFyaXR5OiAke2RldGFpbHN9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChwcm9ibGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBwcmV0dHlQcm9ibGVtcyA9IHByb2JsZW1zLm1hcChwcm9ibGVtID0+ICctICcgKyBwcm9ibGVtKTtcbiAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICBbXG4gICAgICAgICAgYEZvdW5kIGVycm9ycyBpbiB0aGUgYWN0aW9uIGRpY3Rpb25hcnkgb2YgdGhlICcke25hbWV9JyAke3doYXR9OmAsXG4gICAgICAgICAgLi4ucHJldHR5UHJvYmxlbXMsXG4gICAgICAgIF0uam9pbignXFxuJylcbiAgICAgICk7XG4gICAgICBlcnJvci5wcm9ibGVtcyA9IHByb2JsZW1zO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBleHBlY3RlZCBhcml0eSBmb3IgYSBzZW1hbnRpYyBhY3Rpb24gbmFtZWQgYGFjdGlvbk5hbWVgLCB3aGljaFxuICAvLyBpcyBlaXRoZXIgYSBydWxlIG5hbWUgb3IgYSBzcGVjaWFsIGFjdGlvbiBuYW1lIGxpa2UgJ19ub250ZXJtaW5hbCcuXG4gIF90b3BEb3duQWN0aW9uQXJpdHkoYWN0aW9uTmFtZSkge1xuICAgIC8vIEFsbCBzcGVjaWFsIGFjdGlvbnMgaGF2ZSBhbiBleHBlY3RlZCBhcml0eSBvZiAwLCB0aG91Z2ggYWxsIGJ1dCBfdGVybWluYWxcbiAgICAvLyBhcmUgZXhwZWN0ZWQgdG8gdXNlIHRoZSByZXN0IHBhcmFtZXRlciBzeW50YXggKGUuZy4gYF9pdGVyKC4uLmNoaWxkcmVuKWApLlxuICAgIC8vIFRoaXMgaXMgY29uc2lkZXJlZCB0byBoYXZlIGFyaXR5IDAsIGkuZS4gYCgoLi4uYXJncykgPT4ge30pLmxlbmd0aGAgaXMgMC5cbiAgICByZXR1cm4gU1BFQ0lBTF9BQ1RJT05fTkFNRVMuaW5jbHVkZXMoYWN0aW9uTmFtZSlcbiAgICAgID8gMFxuICAgICAgOiB0aGlzLnJ1bGVzW2FjdGlvbk5hbWVdLmJvZHkuZ2V0QXJpdHkoKTtcbiAgfVxuXG4gIF9pbmhlcml0c0Zyb20oZ3JhbW1hcikge1xuICAgIGxldCBnID0gdGhpcy5zdXBlckdyYW1tYXI7XG4gICAgd2hpbGUgKGcpIHtcbiAgICAgIGlmIChnLmVxdWFscyhncmFtbWFyLCB0cnVlKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGcgPSBnLnN1cGVyR3JhbW1hcjtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgdG9SZWNpcGUoc3VwZXJHcmFtbWFyRXhwciA9IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IG1ldGFJbmZvID0ge307XG4gICAgLy8gSW5jbHVkZSB0aGUgZ3JhbW1hciBzb3VyY2UgaWYgaXQgaXMgYXZhaWxhYmxlLlxuICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgbWV0YUluZm8uc291cmNlID0gdGhpcy5zb3VyY2UuY29udGVudHM7XG4gICAgfVxuXG4gICAgbGV0IHN0YXJ0UnVsZSA9IG51bGw7XG4gICAgaWYgKHRoaXMuZGVmYXVsdFN0YXJ0UnVsZSkge1xuICAgICAgc3RhcnRSdWxlID0gdGhpcy5kZWZhdWx0U3RhcnRSdWxlO1xuICAgIH1cblxuICAgIGNvbnN0IHJ1bGVzID0ge307XG4gICAgT2JqZWN0LmtleXModGhpcy5ydWxlcykuZm9yRWFjaChydWxlTmFtZSA9PiB7XG4gICAgICBjb25zdCBydWxlSW5mbyA9IHRoaXMucnVsZXNbcnVsZU5hbWVdO1xuICAgICAgY29uc3Qge2JvZHl9ID0gcnVsZUluZm87XG4gICAgICBjb25zdCBpc0RlZmluaXRpb24gPSAhdGhpcy5zdXBlckdyYW1tYXIgfHwgIXRoaXMuc3VwZXJHcmFtbWFyLnJ1bGVzW3J1bGVOYW1lXTtcblxuICAgICAgbGV0IG9wZXJhdGlvbjtcbiAgICAgIGlmIChpc0RlZmluaXRpb24pIHtcbiAgICAgICAgb3BlcmF0aW9uID0gJ2RlZmluZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcGVyYXRpb24gPSBib2R5IGluc3RhbmNlb2YgcGV4cHJzLkV4dGVuZCA/ICdleHRlbmQnIDogJ292ZXJyaWRlJztcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWV0YUluZm8gPSB7fTtcbiAgICAgIGlmIChydWxlSW5mby5zb3VyY2UgJiYgdGhpcy5zb3VyY2UpIHtcbiAgICAgICAgY29uc3QgYWRqdXN0ZWQgPSBydWxlSW5mby5zb3VyY2UucmVsYXRpdmVUbyh0aGlzLnNvdXJjZSk7XG4gICAgICAgIG1ldGFJbmZvLnNvdXJjZUludGVydmFsID0gW2FkanVzdGVkLnN0YXJ0SWR4LCBhZGp1c3RlZC5lbmRJZHhdO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IGlzRGVmaW5pdGlvbiA/IHJ1bGVJbmZvLmRlc2NyaXB0aW9uIDogbnVsbDtcbiAgICAgIGNvbnN0IGJvZHlSZWNpcGUgPSBib2R5Lm91dHB1dFJlY2lwZShydWxlSW5mby5mb3JtYWxzLCB0aGlzLnNvdXJjZSk7XG5cbiAgICAgIHJ1bGVzW3J1bGVOYW1lXSA9IFtcbiAgICAgICAgb3BlcmF0aW9uLCAvLyBcImRlZmluZVwiL1wiZXh0ZW5kXCIvXCJvdmVycmlkZVwiXG4gICAgICAgIG1ldGFJbmZvLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgcnVsZUluZm8uZm9ybWFscyxcbiAgICAgICAgYm9keVJlY2lwZSxcbiAgICAgIF07XG4gICAgfSk7XG5cbiAgICAvLyBJZiB0aGUgY2FsbGVyIHByb3ZpZGVkIGFuIGV4cHJlc3Npb24gdG8gdXNlIGZvciB0aGUgc3VwZXJncmFtbWFyLCB1c2UgdGhhdC5cbiAgICAvLyBPdGhlcndpc2UsIGlmIHRoZSBzdXBlcmdyYW1tYXIgaXMgYSB1c2VyIGdyYW1tYXIsIHVzZSBpdHMgcmVjaXBlIGlubGluZS5cbiAgICBsZXQgc3VwZXJHcmFtbWFyT3V0cHV0ID0gJ251bGwnO1xuICAgIGlmIChzdXBlckdyYW1tYXJFeHByKSB7XG4gICAgICBzdXBlckdyYW1tYXJPdXRwdXQgPSBzdXBlckdyYW1tYXJFeHByO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdXBlckdyYW1tYXIgJiYgIXRoaXMuc3VwZXJHcmFtbWFyLmlzQnVpbHRJbigpKSB7XG4gICAgICBzdXBlckdyYW1tYXJPdXRwdXQgPSB0aGlzLnN1cGVyR3JhbW1hci50b1JlY2lwZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY2lwZUVsZW1lbnRzID0gW1xuICAgICAgLi4uWydncmFtbWFyJywgbWV0YUluZm8sIHRoaXMubmFtZV0ubWFwKEpTT04uc3RyaW5naWZ5KSxcbiAgICAgIHN1cGVyR3JhbW1hck91dHB1dCxcbiAgICAgIC4uLltzdGFydFJ1bGUsIHJ1bGVzXS5tYXAoSlNPTi5zdHJpbmdpZnkpLFxuICAgIF07XG4gICAgcmV0dXJuIGpzb25Ub0pTKGBbJHtyZWNpcGVFbGVtZW50cy5qb2luKCcsJyl9XWApO1xuICB9XG5cbiAgLy8gVE9ETzogQ29tZSB1cCB3aXRoIGJldHRlciBuYW1lcyBmb3IgdGhlc2UgbWV0aG9kcy5cbiAgLy8gVE9ETzogV3JpdGUgdGhlIGFuYWxvZyBvZiB0aGVzZSBtZXRob2RzIGZvciBpbmhlcml0ZWQgYXR0cmlidXRlcy5cbiAgdG9PcGVyYXRpb25BY3Rpb25EaWN0aW9uYXJ5VGVtcGxhdGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RvT3BlcmF0aW9uT3JBdHRyaWJ1dGVBY3Rpb25EaWN0aW9uYXJ5VGVtcGxhdGUoKTtcbiAgfVxuICB0b0F0dHJpYnV0ZUFjdGlvbkRpY3Rpb25hcnlUZW1wbGF0ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdG9PcGVyYXRpb25PckF0dHJpYnV0ZUFjdGlvbkRpY3Rpb25hcnlUZW1wbGF0ZSgpO1xuICB9XG5cbiAgX3RvT3BlcmF0aW9uT3JBdHRyaWJ1dGVBY3Rpb25EaWN0aW9uYXJ5VGVtcGxhdGUoKSB7XG4gICAgLy8gVE9ETzogYWRkIHRoZSBzdXBlci1ncmFtbWFyJ3MgdGVtcGxhdGVzIGF0IHRoZSByaWdodCBwbGFjZSwgZS5nLiwgYSBjYXNlIGZvciBBZGRFeHByX3BsdXNcbiAgICAvLyBzaG91bGQgYXBwZWFyIG5leHQgdG8gb3RoZXIgY2FzZXMgb2YgQWRkRXhwci5cblxuICAgIGNvbnN0IHNiID0gbmV3IGNvbW1vbi5TdHJpbmdCdWZmZXIoKTtcbiAgICBzYi5hcHBlbmQoJ3snKTtcblxuICAgIGxldCBmaXJzdCA9IHRydWU7XG5cbiAgICBmb3IgKGNvbnN0IHJ1bGVOYW1lIGluIHRoaXMucnVsZXMpIHtcbiAgICAgIGNvbnN0IHtib2R5fSA9IHRoaXMucnVsZXNbcnVsZU5hbWVdO1xuICAgICAgaWYgKGZpcnN0KSB7XG4gICAgICAgIGZpcnN0ID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzYi5hcHBlbmQoJywnKTtcbiAgICAgIH1cbiAgICAgIHNiLmFwcGVuZCgnXFxuJyk7XG4gICAgICBzYi5hcHBlbmQoJyAgJyk7XG4gICAgICB0aGlzLmFkZFNlbWFudGljQWN0aW9uVGVtcGxhdGUocnVsZU5hbWUsIGJvZHksIHNiKTtcbiAgICB9XG5cbiAgICBzYi5hcHBlbmQoJ1xcbn0nKTtcbiAgICByZXR1cm4gc2IuY29udGVudHMoKTtcbiAgfVxuXG4gIGFkZFNlbWFudGljQWN0aW9uVGVtcGxhdGUocnVsZU5hbWUsIGJvZHksIHNiKSB7XG4gICAgc2IuYXBwZW5kKHJ1bGVOYW1lKTtcbiAgICBzYi5hcHBlbmQoJzogZnVuY3Rpb24oJyk7XG4gICAgY29uc3QgYXJpdHkgPSB0aGlzLl90b3BEb3duQWN0aW9uQXJpdHkocnVsZU5hbWUpO1xuICAgIHNiLmFwcGVuZChjb21tb24ucmVwZWF0KCdfJywgYXJpdHkpLmpvaW4oJywgJykpO1xuICAgIHNiLmFwcGVuZCgnKSB7XFxuJyk7XG4gICAgc2IuYXBwZW5kKCcgIH0nKTtcbiAgfVxuXG4gIC8vIFBhcnNlIGEgc3RyaW5nIHdoaWNoIGV4cHJlc3NlcyBhIHJ1bGUgYXBwbGljYXRpb24gaW4gdGhpcyBncmFtbWFyLCBhbmQgcmV0dXJuIHRoZVxuICAvLyByZXN1bHRpbmcgQXBwbHkgbm9kZS5cbiAgcGFyc2VBcHBsaWNhdGlvbihzdHIpIHtcbiAgICBsZXQgYXBwO1xuICAgIGlmIChzdHIuaW5kZXhPZignPCcpID09PSAtMSkge1xuICAgICAgLy8gc2ltcGxlIGFwcGxpY2F0aW9uXG4gICAgICBhcHAgPSBuZXcgcGV4cHJzLkFwcGx5KHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHBhcmFtZXRlcml6ZWQgYXBwbGljYXRpb25cbiAgICAgIGNvbnN0IGNzdCA9IG9obUdyYW1tYXIubWF0Y2goc3RyLCAnQmFzZV9hcHBsaWNhdGlvbicpO1xuICAgICAgYXBwID0gYnVpbGRHcmFtbWFyKGNzdCwge30pO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSB0aGF0IHRoZSBhcHBsaWNhdGlvbiBpcyB2YWxpZC5cbiAgICBpZiAoIShhcHAucnVsZU5hbWUgaW4gdGhpcy5ydWxlcykpIHtcbiAgICAgIHRocm93IGVycm9ycy51bmRlY2xhcmVkUnVsZShhcHAucnVsZU5hbWUsIHRoaXMubmFtZSk7XG4gICAgfVxuICAgIGNvbnN0IHtmb3JtYWxzfSA9IHRoaXMucnVsZXNbYXBwLnJ1bGVOYW1lXTtcbiAgICBpZiAoZm9ybWFscy5sZW5ndGggIT09IGFwcC5hcmdzLmxlbmd0aCkge1xuICAgICAgY29uc3Qge3NvdXJjZX0gPSB0aGlzLnJ1bGVzW2FwcC5ydWxlTmFtZV07XG4gICAgICB0aHJvdyBlcnJvcnMud3JvbmdOdW1iZXJPZlBhcmFtZXRlcnMoXG4gICAgICAgIGFwcC5ydWxlTmFtZSxcbiAgICAgICAgZm9ybWFscy5sZW5ndGgsXG4gICAgICAgIGFwcC5hcmdzLmxlbmd0aCxcbiAgICAgICAgc291cmNlXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gYXBwO1xuICB9XG5cbiAgX3NldFVwTWF0Y2hTdGF0ZShzdGF0ZSkge1xuICAgIGlmICh0aGlzLl9tYXRjaFN0YXRlSW5pdGlhbGl6ZXIpIHtcbiAgICAgIHRoaXMuX21hdGNoU3RhdGVJbml0aWFsaXplcihzdGF0ZSk7XG4gICAgfVxuICB9XG59XG5cbi8vIFRoZSBmb2xsb3dpbmcgZ3JhbW1hciBjb250YWlucyBhIGZldyBydWxlcyB0aGF0IGNvdWxkbid0IGJlIHdyaXR0ZW4gIGluIFwidXNlcmxhbmRcIi5cbi8vIEF0IHRoZSBib3R0b20gb2Ygc3JjL21haW4uanMsIHdlIGNyZWF0ZSBhIHN1Yi1ncmFtbWFyIG9mIHRoaXMgZ3JhbW1hciB0aGF0J3MgY2FsbGVkXG4vLyBgQnVpbHRJblJ1bGVzYC4gVGhhdCBncmFtbWFyIGNvbnRhaW5zIHNldmVyYWwgY29udmVuaWVuY2UgcnVsZXMsIGUuZy4sIGBsZXR0ZXJgIGFuZFxuLy8gYGRpZ2l0YCwgYW5kIGlzIGltcGxpY2l0bHkgdGhlIHN1cGVyLWdyYW1tYXIgb2YgYW55IGdyYW1tYXIgd2hvc2Ugc3VwZXItZ3JhbW1hclxuLy8gaXNuJ3Qgc3BlY2lmaWVkLlxuR3JhbW1hci5Qcm90b0J1aWx0SW5SdWxlcyA9IG5ldyBHcmFtbWFyKFxuICAnUHJvdG9CdWlsdEluUnVsZXMnLCAvLyBuYW1lXG4gIHVuZGVmaW5lZCwgLy8gc3VwZXJncmFtbWFyXG4gIHtcbiAgICBhbnk6IHtcbiAgICAgIGJvZHk6IHBleHBycy5hbnksXG4gICAgICBmb3JtYWxzOiBbXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnYW55IGNoYXJhY3RlcicsXG4gICAgICBwcmltaXRpdmU6IHRydWUsXG4gICAgfSxcbiAgICBlbmQ6IHtcbiAgICAgIGJvZHk6IHBleHBycy5lbmQsXG4gICAgICBmb3JtYWxzOiBbXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnZW5kIG9mIGlucHV0JyxcbiAgICAgIHByaW1pdGl2ZTogdHJ1ZSxcbiAgICB9LFxuXG4gICAgY2FzZUluc2Vuc2l0aXZlOiB7XG4gICAgICBib2R5OiBuZXcgcGV4cHJzLkNhc2VJbnNlbnNpdGl2ZVRlcm1pbmFsKG5ldyBwZXhwcnMuUGFyYW0oMCkpLFxuICAgICAgZm9ybWFsczogWydzdHInXSxcbiAgICAgIHByaW1pdGl2ZTogdHJ1ZSxcbiAgICB9LFxuICAgIGxvd2VyOiB7XG4gICAgICBib2R5OiBuZXcgcGV4cHJzLlVuaWNvZGVDaGFyKCdMbCcpLFxuICAgICAgZm9ybWFsczogW10sXG4gICAgICBkZXNjcmlwdGlvbjogJ2EgbG93ZXJjYXNlIGxldHRlcicsXG4gICAgICBwcmltaXRpdmU6IHRydWUsXG4gICAgfSxcbiAgICB1cHBlcjoge1xuICAgICAgYm9keTogbmV3IHBleHBycy5Vbmljb2RlQ2hhcignTHUnKSxcbiAgICAgIGZvcm1hbHM6IFtdLFxuICAgICAgZGVzY3JpcHRpb246ICdhbiB1cHBlcmNhc2UgbGV0dGVyJyxcbiAgICAgIHByaW1pdGl2ZTogdHJ1ZSxcbiAgICB9LFxuICAgIC8vIFVuaW9uIG9mIEx0ICh0aXRsZWNhc2UpLCBMbSAobW9kaWZpZXIpLCBhbmQgTG8gKG90aGVyKSwgaS5lLiBhbnkgbGV0dGVyIG5vdCBpbiBMbCBvciBMdS5cbiAgICB1bmljb2RlTHRtbzoge1xuICAgICAgYm9keTogbmV3IHBleHBycy5Vbmljb2RlQ2hhcignTHRtbycpLFxuICAgICAgZm9ybWFsczogW10sXG4gICAgICBkZXNjcmlwdGlvbjogJ2EgVW5pY29kZSBjaGFyYWN0ZXIgaW4gTHQsIExtLCBvciBMbycsXG4gICAgICBwcmltaXRpdmU6IHRydWUsXG4gICAgfSxcblxuICAgIC8vIFRoZXNlIHJ1bGVzIGFyZSBub3QgdHJ1bHkgcHJpbWl0aXZlICh0aGV5IGNvdWxkIGJlIHdyaXR0ZW4gaW4gdXNlcmxhbmQpIGJ1dCBhcmUgZGVmaW5lZFxuICAgIC8vIGhlcmUgZm9yIGJvb3RzdHJhcHBpbmcgcHVycG9zZXMuXG4gICAgc3BhY2VzOiB7XG4gICAgICBib2R5OiBuZXcgcGV4cHJzLlN0YXIobmV3IHBleHBycy5BcHBseSgnc3BhY2UnKSksXG4gICAgICBmb3JtYWxzOiBbXSxcbiAgICB9LFxuICAgIHNwYWNlOiB7XG4gICAgICBib2R5OiBuZXcgcGV4cHJzLlJhbmdlKCdcXHgwMCcsICcgJyksXG4gICAgICBmb3JtYWxzOiBbXSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnYSBzcGFjZScsXG4gICAgfSxcbiAgfVxuKTtcblxuLy8gVGhpcyBtZXRob2QgaXMgY2FsbGVkIGZyb20gbWFpbi5qcyBvbmNlIE9obSBoYXMgbG9hZGVkLlxuR3JhbW1hci5pbml0QXBwbGljYXRpb25QYXJzZXIgPSBmdW5jdGlvbiAoZ3JhbW1hciwgYnVpbGRlckZuKSB7XG4gIG9obUdyYW1tYXIgPSBncmFtbWFyO1xuICBidWlsZEdyYW1tYXIgPSBidWlsZGVyRm47XG59O1xuIiwiaW1wb3J0IHtHcmFtbWFyfSBmcm9tICcuL0dyYW1tYXIuanMnO1xuaW1wb3J0IHtJbnB1dFN0cmVhbX0gZnJvbSAnLi9JbnB1dFN0cmVhbS5qcyc7XG5pbXBvcnQge2dldER1cGxpY2F0ZXN9IGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIGVycm9ycyBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHJpdmF0ZSBTdHVmZlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gQ29uc3RydWN0b3JzXG5cbmV4cG9ydCBjbGFzcyBHcmFtbWFyRGVjbCB7XG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICB9XG5cbiAgLy8gSGVscGVyc1xuXG4gIHNvdXJjZUludGVydmFsKHN0YXJ0SWR4LCBlbmRJZHgpIHtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2Uuc3ViSW50ZXJ2YWwoc3RhcnRJZHgsIGVuZElkeCAtIHN0YXJ0SWR4KTtcbiAgfVxuXG4gIGVuc3VyZVN1cGVyR3JhbW1hcigpIHtcbiAgICBpZiAoIXRoaXMuc3VwZXJHcmFtbWFyKSB7XG4gICAgICB0aGlzLndpdGhTdXBlckdyYW1tYXIoXG4gICAgICAgIC8vIFRPRE86IFRoZSBjb25kaXRpb25hbCBleHByZXNzaW9uIGJlbG93IGlzIGFuIHVnbHkgaGFjay4gSXQncyBraW5kIG9mIG9rIGJlY2F1c2VcbiAgICAgICAgLy8gSSBkb3VidCBhbnlvbmUgd2lsbCBldmVyIHRyeSB0byBkZWNsYXJlIGEgZ3JhbW1hciBjYWxsZWQgYEJ1aWx0SW5SdWxlc2AuIFN0aWxsLFxuICAgICAgICAvLyB3ZSBzaG91bGQgdHJ5IHRvIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGRvIHRoaXMuXG4gICAgICAgIHRoaXMubmFtZSA9PT0gJ0J1aWx0SW5SdWxlcycgPyBHcmFtbWFyLlByb3RvQnVpbHRJblJ1bGVzIDogR3JhbW1hci5CdWlsdEluUnVsZXNcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN1cGVyR3JhbW1hcjtcbiAgfVxuXG4gIGVuc3VyZVN1cGVyR3JhbW1hclJ1bGVGb3JPdmVycmlkaW5nKG5hbWUsIHNvdXJjZSkge1xuICAgIGNvbnN0IHJ1bGVJbmZvID0gdGhpcy5lbnN1cmVTdXBlckdyYW1tYXIoKS5ydWxlc1tuYW1lXTtcbiAgICBpZiAoIXJ1bGVJbmZvKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuY2Fubm90T3ZlcnJpZGVVbmRlY2xhcmVkUnVsZShuYW1lLCB0aGlzLnN1cGVyR3JhbW1hci5uYW1lLCBzb3VyY2UpO1xuICAgIH1cbiAgICByZXR1cm4gcnVsZUluZm87XG4gIH1cblxuICBpbnN0YWxsT3ZlcnJpZGRlbk9yRXh0ZW5kZWRSdWxlKG5hbWUsIGZvcm1hbHMsIGJvZHksIHNvdXJjZSkge1xuICAgIGNvbnN0IGR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzID0gZ2V0RHVwbGljYXRlcyhmb3JtYWxzKTtcbiAgICBpZiAoZHVwbGljYXRlUGFyYW1ldGVyTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgdGhyb3cgZXJyb3JzLmR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzKG5hbWUsIGR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzLCBzb3VyY2UpO1xuICAgIH1cbiAgICBjb25zdCBydWxlSW5mbyA9IHRoaXMuZW5zdXJlU3VwZXJHcmFtbWFyKCkucnVsZXNbbmFtZV07XG4gICAgY29uc3QgZXhwZWN0ZWRGb3JtYWxzID0gcnVsZUluZm8uZm9ybWFscztcbiAgICBjb25zdCBleHBlY3RlZE51bUZvcm1hbHMgPSBleHBlY3RlZEZvcm1hbHMgPyBleHBlY3RlZEZvcm1hbHMubGVuZ3RoIDogMDtcbiAgICBpZiAoZm9ybWFscy5sZW5ndGggIT09IGV4cGVjdGVkTnVtRm9ybWFscykge1xuICAgICAgdGhyb3cgZXJyb3JzLndyb25nTnVtYmVyT2ZQYXJhbWV0ZXJzKG5hbWUsIGV4cGVjdGVkTnVtRm9ybWFscywgZm9ybWFscy5sZW5ndGgsIHNvdXJjZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmluc3RhbGwobmFtZSwgZm9ybWFscywgYm9keSwgcnVsZUluZm8uZGVzY3JpcHRpb24sIHNvdXJjZSk7XG4gIH1cblxuICBpbnN0YWxsKG5hbWUsIGZvcm1hbHMsIGJvZHksIGRlc2NyaXB0aW9uLCBzb3VyY2UsIHByaW1pdGl2ZSA9IGZhbHNlKSB7XG4gICAgdGhpcy5ydWxlc1tuYW1lXSA9IHtcbiAgICAgIGJvZHk6IGJvZHkuaW50cm9kdWNlUGFyYW1zKGZvcm1hbHMpLFxuICAgICAgZm9ybWFscyxcbiAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgc291cmNlLFxuICAgICAgcHJpbWl0aXZlLFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBTdHVmZiB0aGF0IHlvdSBzaG91bGQgb25seSBkbyBvbmNlXG5cbiAgd2l0aFN1cGVyR3JhbW1hcihzdXBlckdyYW1tYXIpIHtcbiAgICBpZiAodGhpcy5zdXBlckdyYW1tYXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndGhlIHN1cGVyIGdyYW1tYXIgb2YgYSBHcmFtbWFyRGVjbCBjYW5ub3QgYmUgc2V0IG1vcmUgdGhhbiBvbmNlJyk7XG4gICAgfVxuICAgIHRoaXMuc3VwZXJHcmFtbWFyID0gc3VwZXJHcmFtbWFyO1xuICAgIHRoaXMucnVsZXMgPSBPYmplY3QuY3JlYXRlKHN1cGVyR3JhbW1hci5ydWxlcyk7XG5cbiAgICAvLyBHcmFtbWFycyB3aXRoIGFuIGV4cGxpY2l0IHN1cGVyZ3JhbW1hciBpbmhlcml0IGEgZGVmYXVsdCBzdGFydCBydWxlLlxuICAgIGlmICghc3VwZXJHcmFtbWFyLmlzQnVpbHRJbigpKSB7XG4gICAgICB0aGlzLmRlZmF1bHRTdGFydFJ1bGUgPSBzdXBlckdyYW1tYXIuZGVmYXVsdFN0YXJ0UnVsZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB3aXRoRGVmYXVsdFN0YXJ0UnVsZShydWxlTmFtZSkge1xuICAgIHRoaXMuZGVmYXVsdFN0YXJ0UnVsZSA9IHJ1bGVOYW1lO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgd2l0aFNvdXJjZShzb3VyY2UpIHtcbiAgICB0aGlzLnNvdXJjZSA9IG5ldyBJbnB1dFN0cmVhbShzb3VyY2UpLmludGVydmFsKDAsIHNvdXJjZS5sZW5ndGgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gQ3JlYXRlcyBhIEdyYW1tYXIgaW5zdGFuY2UsIGFuZCBpZiBpdCBwYXNzZXMgdGhlIHNhbml0eSBjaGVja3MsIHJldHVybnMgaXQuXG4gIGJ1aWxkKCkge1xuICAgIGNvbnN0IGdyYW1tYXIgPSBuZXcgR3JhbW1hcihcbiAgICAgIHRoaXMubmFtZSxcbiAgICAgIHRoaXMuZW5zdXJlU3VwZXJHcmFtbWFyKCksXG4gICAgICB0aGlzLnJ1bGVzLFxuICAgICAgdGhpcy5kZWZhdWx0U3RhcnRSdWxlXG4gICAgKTtcbiAgICAvLyBJbml0aWFsaXplIGludGVybmFsIHByb3BzIHRoYXQgYXJlIGluaGVyaXRlZCBmcm9tIHRoZSBzdXBlciBncmFtbWFyLlxuICAgIGdyYW1tYXIuX21hdGNoU3RhdGVJbml0aWFsaXplciA9IGdyYW1tYXIuc3VwZXJHcmFtbWFyLl9tYXRjaFN0YXRlSW5pdGlhbGl6ZXI7XG4gICAgZ3JhbW1hci5zdXBwb3J0c0luY3JlbWVudGFsUGFyc2luZyA9IGdyYW1tYXIuc3VwZXJHcmFtbWFyLnN1cHBvcnRzSW5jcmVtZW50YWxQYXJzaW5nO1xuXG4gICAgLy8gVE9ETzogY2hhbmdlIHRoZSBwZXhwci5wcm90b3R5cGUuYXNzZXJ0Li4uIG1ldGhvZHMgdG8gbWFrZSB0aGVtIGFkZFxuICAgIC8vIGV4Y2VwdGlvbnMgdG8gYW4gYXJyYXkgdGhhdCdzIHByb3ZpZGVkIGFzIGFuIGFyZy4gVGhlbiB3ZSdsbCBiZSBhYmxlIHRvXG4gICAgLy8gc2hvdyBtb3JlIHRoYW4gb25lIGVycm9yIG9mIHRoZSBzYW1lIHR5cGUgYXQgYSB0aW1lLlxuICAgIC8vIFRPRE86IGluY2x1ZGUgdGhlIG9mZmVuZGluZyBwZXhwciBpbiB0aGUgZXJyb3JzLCB0aGF0IHdheSB3ZSBjYW4gc2hvd1xuICAgIC8vIHRoZSBwYXJ0IG9mIHRoZSBzb3VyY2UgdGhhdCBjYXVzZWQgaXQuXG4gICAgY29uc3QgZ3JhbW1hckVycm9ycyA9IFtdO1xuICAgIGxldCBncmFtbWFySGFzSW52YWxpZEFwcGxpY2F0aW9ucyA9IGZhbHNlO1xuICAgIE9iamVjdC5rZXlzKGdyYW1tYXIucnVsZXMpLmZvckVhY2gocnVsZU5hbWUgPT4ge1xuICAgICAgY29uc3Qge2JvZHl9ID0gZ3JhbW1hci5ydWxlc1tydWxlTmFtZV07XG4gICAgICB0cnkge1xuICAgICAgICBib2R5LmFzc2VydENob2ljZXNIYXZlVW5pZm9ybUFyaXR5KHJ1bGVOYW1lKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZ3JhbW1hckVycm9ycy5wdXNoKGUpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgYm9keS5hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hcik7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGdyYW1tYXJFcnJvcnMucHVzaChlKTtcbiAgICAgICAgZ3JhbW1hckhhc0ludmFsaWRBcHBsaWNhdGlvbnMgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghZ3JhbW1hckhhc0ludmFsaWRBcHBsaWNhdGlvbnMpIHtcbiAgICAgIC8vIFRoZSBmb2xsb3dpbmcgY2hlY2sgY2FuIG9ubHkgYmUgZG9uZSBpZiB0aGUgZ3JhbW1hciBoYXMgbm8gaW52YWxpZCBhcHBsaWNhdGlvbnMuXG4gICAgICBPYmplY3Qua2V5cyhncmFtbWFyLnJ1bGVzKS5mb3JFYWNoKHJ1bGVOYW1lID0+IHtcbiAgICAgICAgY29uc3Qge2JvZHl9ID0gZ3JhbW1hci5ydWxlc1tydWxlTmFtZV07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYm9keS5hc3NlcnRJdGVyYXRlZEV4cHJzQXJlTm90TnVsbGFibGUoZ3JhbW1hciwgW10pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZ3JhbW1hckVycm9ycy5wdXNoKGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGdyYW1tYXJFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgZXJyb3JzLnRocm93RXJyb3JzKGdyYW1tYXJFcnJvcnMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zb3VyY2UpIHtcbiAgICAgIGdyYW1tYXIuc291cmNlID0gdGhpcy5zb3VyY2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGdyYW1tYXI7XG4gIH1cblxuICAvLyBSdWxlIGRlY2xhcmF0aW9uc1xuXG4gIGRlZmluZShuYW1lLCBmb3JtYWxzLCBib2R5LCBkZXNjcmlwdGlvbiwgc291cmNlLCBwcmltaXRpdmUpIHtcbiAgICB0aGlzLmVuc3VyZVN1cGVyR3JhbW1hcigpO1xuICAgIGlmICh0aGlzLnN1cGVyR3JhbW1hci5ydWxlc1tuYW1lXSkge1xuICAgICAgdGhyb3cgZXJyb3JzLmR1cGxpY2F0ZVJ1bGVEZWNsYXJhdGlvbihuYW1lLCB0aGlzLm5hbWUsIHRoaXMuc3VwZXJHcmFtbWFyLm5hbWUsIHNvdXJjZSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnJ1bGVzW25hbWVdKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuZHVwbGljYXRlUnVsZURlY2xhcmF0aW9uKG5hbWUsIHRoaXMubmFtZSwgdGhpcy5uYW1lLCBzb3VyY2UpO1xuICAgIH1cbiAgICBjb25zdCBkdXBsaWNhdGVQYXJhbWV0ZXJOYW1lcyA9IGdldER1cGxpY2F0ZXMoZm9ybWFscyk7XG4gICAgaWYgKGR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRocm93IGVycm9ycy5kdXBsaWNhdGVQYXJhbWV0ZXJOYW1lcyhuYW1lLCBkdXBsaWNhdGVQYXJhbWV0ZXJOYW1lcywgc291cmNlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuaW5zdGFsbChuYW1lLCBmb3JtYWxzLCBib2R5LCBkZXNjcmlwdGlvbiwgc291cmNlLCBwcmltaXRpdmUpO1xuICB9XG5cbiAgb3ZlcnJpZGUobmFtZSwgZm9ybWFscywgYm9keSwgZGVzY0lnbm9yZWQsIHNvdXJjZSkge1xuICAgIHRoaXMuZW5zdXJlU3VwZXJHcmFtbWFyUnVsZUZvck92ZXJyaWRpbmcobmFtZSwgc291cmNlKTtcbiAgICB0aGlzLmluc3RhbGxPdmVycmlkZGVuT3JFeHRlbmRlZFJ1bGUobmFtZSwgZm9ybWFscywgYm9keSwgc291cmNlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGV4dGVuZChuYW1lLCBmb3JtYWxzLCBmcmFnbWVudCwgZGVzY0lnbm9yZWQsIHNvdXJjZSkge1xuICAgIGNvbnN0IHJ1bGVJbmZvID0gdGhpcy5lbnN1cmVTdXBlckdyYW1tYXIoKS5ydWxlc1tuYW1lXTtcbiAgICBpZiAoIXJ1bGVJbmZvKSB7XG4gICAgICB0aHJvdyBlcnJvcnMuY2Fubm90RXh0ZW5kVW5kZWNsYXJlZFJ1bGUobmFtZSwgdGhpcy5zdXBlckdyYW1tYXIubmFtZSwgc291cmNlKTtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IG5ldyBwZXhwcnMuRXh0ZW5kKHRoaXMuc3VwZXJHcmFtbWFyLCBuYW1lLCBmcmFnbWVudCk7XG4gICAgYm9keS5zb3VyY2UgPSBmcmFnbWVudC5zb3VyY2U7XG4gICAgdGhpcy5pbnN0YWxsT3ZlcnJpZGRlbk9yRXh0ZW5kZWRSdWxlKG5hbWUsIGZvcm1hbHMsIGJvZHksIHNvdXJjZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cbiIsImltcG9ydCB7R3JhbW1hcn0gZnJvbSAnLi9HcmFtbWFyLmpzJztcbmltcG9ydCB7R3JhbW1hckRlY2x9IGZyb20gJy4vR3JhbW1hckRlY2wuanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4vcGV4cHJzLmpzJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFByaXZhdGUgc3R1ZmZcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBjbGFzcyBCdWlsZGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5jdXJyZW50RGVjbCA9IG51bGw7XG4gICAgdGhpcy5jdXJyZW50UnVsZU5hbWUgPSBudWxsO1xuICB9XG5cbiAgbmV3R3JhbW1hcihuYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBHcmFtbWFyRGVjbChuYW1lKTtcbiAgfVxuXG4gIGdyYW1tYXIobWV0YUluZm8sIG5hbWUsIHN1cGVyR3JhbW1hciwgZGVmYXVsdFN0YXJ0UnVsZSwgcnVsZXMpIHtcbiAgICBjb25zdCBnRGVjbCA9IG5ldyBHcmFtbWFyRGVjbChuYW1lKTtcbiAgICBpZiAoc3VwZXJHcmFtbWFyKSB7XG4gICAgICAvLyBgc3VwZXJHcmFtbWFyYCBtYXkgYmUgYSByZWNpcGUgKGkuZS4gYW4gQXJyYXkpLCBvciBhbiBhY3R1YWwgZ3JhbW1hciBpbnN0YW5jZS5cbiAgICAgIGdEZWNsLndpdGhTdXBlckdyYW1tYXIoXG4gICAgICAgIHN1cGVyR3JhbW1hciBpbnN0YW5jZW9mIEdyYW1tYXIgPyBzdXBlckdyYW1tYXIgOiB0aGlzLmZyb21SZWNpcGUoc3VwZXJHcmFtbWFyKVxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKGRlZmF1bHRTdGFydFJ1bGUpIHtcbiAgICAgIGdEZWNsLndpdGhEZWZhdWx0U3RhcnRSdWxlKGRlZmF1bHRTdGFydFJ1bGUpO1xuICAgIH1cbiAgICBpZiAobWV0YUluZm8gJiYgbWV0YUluZm8uc291cmNlKSB7XG4gICAgICBnRGVjbC53aXRoU291cmNlKG1ldGFJbmZvLnNvdXJjZSk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50RGVjbCA9IGdEZWNsO1xuICAgIE9iamVjdC5rZXlzKHJ1bGVzKS5mb3JFYWNoKHJ1bGVOYW1lID0+IHtcbiAgICAgIHRoaXMuY3VycmVudFJ1bGVOYW1lID0gcnVsZU5hbWU7XG4gICAgICBjb25zdCBydWxlUmVjaXBlID0gcnVsZXNbcnVsZU5hbWVdO1xuXG4gICAgICBjb25zdCBhY3Rpb24gPSBydWxlUmVjaXBlWzBdOyAvLyBkZWZpbmUvZXh0ZW5kL292ZXJyaWRlXG4gICAgICBjb25zdCBtZXRhSW5mbyA9IHJ1bGVSZWNpcGVbMV07XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IHJ1bGVSZWNpcGVbMl07XG4gICAgICBjb25zdCBmb3JtYWxzID0gcnVsZVJlY2lwZVszXTtcbiAgICAgIGNvbnN0IGJvZHkgPSB0aGlzLmZyb21SZWNpcGUocnVsZVJlY2lwZVs0XSk7XG5cbiAgICAgIGxldCBzb3VyY2U7XG4gICAgICBpZiAoZ0RlY2wuc291cmNlICYmIG1ldGFJbmZvICYmIG1ldGFJbmZvLnNvdXJjZUludGVydmFsKSB7XG4gICAgICAgIHNvdXJjZSA9IGdEZWNsLnNvdXJjZS5zdWJJbnRlcnZhbChcbiAgICAgICAgICBtZXRhSW5mby5zb3VyY2VJbnRlcnZhbFswXSxcbiAgICAgICAgICBtZXRhSW5mby5zb3VyY2VJbnRlcnZhbFsxXSAtIG1ldGFJbmZvLnNvdXJjZUludGVydmFsWzBdXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBnRGVjbFthY3Rpb25dKHJ1bGVOYW1lLCBmb3JtYWxzLCBib2R5LCBkZXNjcmlwdGlvbiwgc291cmNlKTtcbiAgICB9KTtcbiAgICB0aGlzLmN1cnJlbnRSdWxlTmFtZSA9IHRoaXMuY3VycmVudERlY2wgPSBudWxsO1xuICAgIHJldHVybiBnRGVjbC5idWlsZCgpO1xuICB9XG5cbiAgdGVybWluYWwoeCkge1xuICAgIHJldHVybiBuZXcgcGV4cHJzLlRlcm1pbmFsKHgpO1xuICB9XG5cbiAgcmFuZ2UoZnJvbSwgdG8pIHtcbiAgICByZXR1cm4gbmV3IHBleHBycy5SYW5nZShmcm9tLCB0byk7XG4gIH1cblxuICBwYXJhbShpbmRleCkge1xuICAgIHJldHVybiBuZXcgcGV4cHJzLlBhcmFtKGluZGV4KTtcbiAgfVxuXG4gIGFsdCguLi50ZXJtQXJncykge1xuICAgIGxldCB0ZXJtcyA9IFtdO1xuICAgIGZvciAobGV0IGFyZyBvZiB0ZXJtQXJncykge1xuICAgICAgaWYgKCEoYXJnIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByKSkge1xuICAgICAgICBhcmcgPSB0aGlzLmZyb21SZWNpcGUoYXJnKTtcbiAgICAgIH1cbiAgICAgIGlmIChhcmcgaW5zdGFuY2VvZiBwZXhwcnMuQWx0KSB7XG4gICAgICAgIHRlcm1zID0gdGVybXMuY29uY2F0KGFyZy50ZXJtcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZXJtcy5wdXNoKGFyZyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0ZXJtcy5sZW5ndGggPT09IDEgPyB0ZXJtc1swXSA6IG5ldyBwZXhwcnMuQWx0KHRlcm1zKTtcbiAgfVxuXG4gIHNlcSguLi5mYWN0b3JBcmdzKSB7XG4gICAgbGV0IGZhY3RvcnMgPSBbXTtcbiAgICBmb3IgKGxldCBhcmcgb2YgZmFjdG9yQXJncykge1xuICAgICAgaWYgKCEoYXJnIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByKSkge1xuICAgICAgICBhcmcgPSB0aGlzLmZyb21SZWNpcGUoYXJnKTtcbiAgICAgIH1cbiAgICAgIGlmIChhcmcgaW5zdGFuY2VvZiBwZXhwcnMuU2VxKSB7XG4gICAgICAgIGZhY3RvcnMgPSBmYWN0b3JzLmNvbmNhdChhcmcuZmFjdG9ycyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3JzLnB1c2goYXJnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhY3RvcnMubGVuZ3RoID09PSAxID8gZmFjdG9yc1swXSA6IG5ldyBwZXhwcnMuU2VxKGZhY3RvcnMpO1xuICB9XG5cbiAgc3RhcihleHByKSB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIHBleHBycy5QRXhwcikpIHtcbiAgICAgIGV4cHIgPSB0aGlzLmZyb21SZWNpcGUoZXhwcik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgcGV4cHJzLlN0YXIoZXhwcik7XG4gIH1cblxuICBwbHVzKGV4cHIpIHtcbiAgICBpZiAoIShleHByIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByKSkge1xuICAgICAgZXhwciA9IHRoaXMuZnJvbVJlY2lwZShleHByKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBwZXhwcnMuUGx1cyhleHByKTtcbiAgfVxuXG4gIG9wdChleHByKSB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIHBleHBycy5QRXhwcikpIHtcbiAgICAgIGV4cHIgPSB0aGlzLmZyb21SZWNpcGUoZXhwcik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgcGV4cHJzLk9wdChleHByKTtcbiAgfVxuXG4gIG5vdChleHByKSB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIHBleHBycy5QRXhwcikpIHtcbiAgICAgIGV4cHIgPSB0aGlzLmZyb21SZWNpcGUoZXhwcik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgcGV4cHJzLk5vdChleHByKTtcbiAgfVxuXG4gIGxvb2thaGVhZChleHByKSB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIHBleHBycy5QRXhwcikpIHtcbiAgICAgIGV4cHIgPSB0aGlzLmZyb21SZWNpcGUoZXhwcik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgcGV4cHJzLkxvb2thaGVhZChleHByKTtcbiAgfVxuXG4gIGxleChleHByKSB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIHBleHBycy5QRXhwcikpIHtcbiAgICAgIGV4cHIgPSB0aGlzLmZyb21SZWNpcGUoZXhwcik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgcGV4cHJzLkxleChleHByKTtcbiAgfVxuXG4gIGFwcChydWxlTmFtZSwgb3B0UGFyYW1zKSB7XG4gICAgaWYgKG9wdFBhcmFtcyAmJiBvcHRQYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgb3B0UGFyYW1zID0gb3B0UGFyYW1zLm1hcChmdW5jdGlvbiAocGFyYW0pIHtcbiAgICAgICAgcmV0dXJuIHBhcmFtIGluc3RhbmNlb2YgcGV4cHJzLlBFeHByID8gcGFyYW0gOiB0aGlzLmZyb21SZWNpcGUocGFyYW0pO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgcGV4cHJzLkFwcGx5KHJ1bGVOYW1lLCBvcHRQYXJhbXMpO1xuICB9XG5cbiAgLy8gTm90ZSB0aGF0IHVubGlrZSBvdGhlciBtZXRob2RzIGluIHRoaXMgY2xhc3MsIHRoaXMgbWV0aG9kIGNhbm5vdCBiZSB1c2VkIGFzIGFcbiAgLy8gY29udmVuaWVuY2UgY29uc3RydWN0b3IuIEl0IG9ubHkgd29ya3Mgd2l0aCByZWNpcGVzLCBiZWNhdXNlIGl0IHJlbGllcyBvblxuICAvLyBgdGhpcy5jdXJyZW50RGVjbGAgYW5kIGB0aGlzLmN1cnJlbnRSdWxlTmFtZWAgYmVpbmcgc2V0LlxuICBzcGxpY2UoYmVmb3JlVGVybXMsIGFmdGVyVGVybXMpIHtcbiAgICByZXR1cm4gbmV3IHBleHBycy5TcGxpY2UoXG4gICAgICB0aGlzLmN1cnJlbnREZWNsLnN1cGVyR3JhbW1hcixcbiAgICAgIHRoaXMuY3VycmVudFJ1bGVOYW1lLFxuICAgICAgYmVmb3JlVGVybXMubWFwKHRlcm0gPT4gdGhpcy5mcm9tUmVjaXBlKHRlcm0pKSxcbiAgICAgIGFmdGVyVGVybXMubWFwKHRlcm0gPT4gdGhpcy5mcm9tUmVjaXBlKHRlcm0pKVxuICAgICk7XG4gIH1cblxuICBmcm9tUmVjaXBlKHJlY2lwZSkge1xuICAgIC8vIHRoZSBtZXRhLWluZm8gb2YgJ2dyYW1tYXInIGlzIHByb2Nlc3NlZCBpbiBCdWlsZGVyLmdyYW1tYXJcbiAgICBjb25zdCBhcmdzID0gcmVjaXBlWzBdID09PSAnZ3JhbW1hcicgPyByZWNpcGUuc2xpY2UoMSkgOiByZWNpcGUuc2xpY2UoMik7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpc1tyZWNpcGVbMF1dKC4uLmFyZ3MpO1xuXG4gICAgY29uc3QgbWV0YUluZm8gPSByZWNpcGVbMV07XG4gICAgaWYgKG1ldGFJbmZvKSB7XG4gICAgICBpZiAobWV0YUluZm8uc291cmNlSW50ZXJ2YWwgJiYgdGhpcy5jdXJyZW50RGVjbCkge1xuICAgICAgICByZXN1bHQud2l0aFNvdXJjZSh0aGlzLmN1cnJlbnREZWNsLnNvdXJjZUludGVydmFsKC4uLm1ldGFJbmZvLnNvdXJjZUludGVydmFsKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cbiIsImltcG9ydCB7QnVpbGRlcn0gZnJvbSAnLi9CdWlsZGVyLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VSZWNpcGUocmVjaXBlKSB7XG4gIGlmICh0eXBlb2YgcmVjaXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHJlY2lwZS5jYWxsKG5ldyBCdWlsZGVyKCkpO1xuICB9IGVsc2Uge1xuICAgIGlmICh0eXBlb2YgcmVjaXBlID09PSAnc3RyaW5nJykge1xuICAgICAgLy8gc3RyaW5naWZpZWQgSlNPTiByZWNpcGVcbiAgICAgIHJlY2lwZSA9IEpTT04ucGFyc2UocmVjaXBlKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBCdWlsZGVyKCkuZnJvbVJlY2lwZShyZWNpcGUpO1xuICB9XG59XG4iLCJpbXBvcnQge21ha2VSZWNpcGV9IGZyb20gJy4uL3NyYy9tYWtlUmVjaXBlLmpzJztcbmV4cG9ydCBkZWZhdWx0IG1ha2VSZWNpcGUoW1wiZ3JhbW1hclwiLHtcInNvdXJjZVwiOlwiQnVpbHRJblJ1bGVzIHtcXG5cXG4gIGFsbnVtICAoYW4gYWxwaGEtbnVtZXJpYyBjaGFyYWN0ZXIpXFxuICAgID0gbGV0dGVyXFxuICAgIHwgZGlnaXRcXG5cXG4gIGxldHRlciAgKGEgbGV0dGVyKVxcbiAgICA9IGxvd2VyXFxuICAgIHwgdXBwZXJcXG4gICAgfCB1bmljb2RlTHRtb1xcblxcbiAgZGlnaXQgIChhIGRpZ2l0KVxcbiAgICA9IFxcXCIwXFxcIi4uXFxcIjlcXFwiXFxuXFxuICBoZXhEaWdpdCAgKGEgaGV4YWRlY2ltYWwgZGlnaXQpXFxuICAgID0gZGlnaXRcXG4gICAgfCBcXFwiYVxcXCIuLlxcXCJmXFxcIlxcbiAgICB8IFxcXCJBXFxcIi4uXFxcIkZcXFwiXFxuXFxuICBMaXN0T2Y8ZWxlbSwgc2VwPlxcbiAgICA9IE5vbmVtcHR5TGlzdE9mPGVsZW0sIHNlcD5cXG4gICAgfCBFbXB0eUxpc3RPZjxlbGVtLCBzZXA+XFxuXFxuICBOb25lbXB0eUxpc3RPZjxlbGVtLCBzZXA+XFxuICAgID0gZWxlbSAoc2VwIGVsZW0pKlxcblxcbiAgRW1wdHlMaXN0T2Y8ZWxlbSwgc2VwPlxcbiAgICA9IC8qIG5vdGhpbmcgKi9cXG5cXG4gIGxpc3RPZjxlbGVtLCBzZXA+XFxuICAgID0gbm9uZW1wdHlMaXN0T2Y8ZWxlbSwgc2VwPlxcbiAgICB8IGVtcHR5TGlzdE9mPGVsZW0sIHNlcD5cXG5cXG4gIG5vbmVtcHR5TGlzdE9mPGVsZW0sIHNlcD5cXG4gICAgPSBlbGVtIChzZXAgZWxlbSkqXFxuXFxuICBlbXB0eUxpc3RPZjxlbGVtLCBzZXA+XFxuICAgID0gLyogbm90aGluZyAqL1xcblxcbiAgLy8gQWxsb3dzIGEgc3ludGFjdGljIHJ1bGUgYXBwbGljYXRpb24gd2l0aGluIGEgbGV4aWNhbCBjb250ZXh0LlxcbiAgYXBwbHlTeW50YWN0aWM8YXBwPiA9IGFwcFxcbn1cIn0sXCJCdWlsdEluUnVsZXNcIixudWxsLG51bGwse1wiYWxudW1cIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxOCw3OF19LFwiYW4gYWxwaGEtbnVtZXJpYyBjaGFyYWN0ZXJcIixbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MCw3OF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzYwLDY2XX0sXCJsZXR0ZXJcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzMsNzhdfSxcImRpZ2l0XCIsW11dXV0sXCJsZXR0ZXJcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MiwxNDJdfSxcImEgbGV0dGVyXCIsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTA3LDE0Ml19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEwNywxMTJdfSxcImxvd2VyXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzExOSwxMjRdfSxcInVwcGVyXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMSwxNDJdfSxcInVuaWNvZGVMdG1vXCIsW11dXV0sXCJkaWdpdFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0NiwxNzddfSxcImEgZGlnaXRcIixbXSxbXCJyYW5nZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2OSwxNzddfSxcIjBcIixcIjlcIl1dLFwiaGV4RGlnaXRcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxODEsMjU0XX0sXCJhIGhleGFkZWNpbWFsIGRpZ2l0XCIsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE5LDI1NF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxOSwyMjRdfSxcImRpZ2l0XCIsW11dLFtcInJhbmdlXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjMxLDIzOV19LFwiYVwiLFwiZlwiXSxbXCJyYW5nZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NiwyNTRdfSxcIkFcIixcIkZcIl1dXSxcIkxpc3RPZlwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1OCwzMzZdfSxudWxsLFtcImVsZW1cIixcInNlcFwiXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyODIsMzM2XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjgyLDMwN119LFwiTm9uZW1wdHlMaXN0T2ZcIixbW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyOTcsMzAxXX0sMF0sW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMDMsMzA2XX0sMV1dXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMTQsMzM2XX0sXCJFbXB0eUxpc3RPZlwiLFtbXCJwYXJhbVwiLHtcInNvdXJjZUludGVydmFsXCI6WzMyNiwzMzBdfSwwXSxbXCJwYXJhbVwiLHtcInNvdXJjZUludGVydmFsXCI6WzMzMiwzMzVdfSwxXV1dXV0sXCJOb25lbXB0eUxpc3RPZlwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzM0MCwzODhdfSxudWxsLFtcImVsZW1cIixcInNlcFwiXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNzIsMzg4XX0sW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNzIsMzc2XX0sMF0sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzM3NywzODhdfSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNzgsMzg2XX0sW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNzgsMzgxXX0sMV0sW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszODIsMzg2XX0sMF1dXV1dLFwiRW1wdHlMaXN0T2ZcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszOTIsNDM0XX0sbnVsbCxbXCJlbGVtXCIsXCJzZXBcIl0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDM4LDQzOF19XV0sXCJsaXN0T2ZcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls0MzgsNTE2XX0sbnVsbCxbXCJlbGVtXCIsXCJzZXBcIl0sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDYyLDUxNl19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzQ2Miw0ODddfSxcIm5vbmVtcHR5TGlzdE9mXCIsW1tcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDc3LDQ4MV19LDBdLFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDgzLDQ4Nl19LDFdXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDk0LDUxNl19LFwiZW1wdHlMaXN0T2ZcIixbW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1MDYsNTEwXX0sMF0sW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1MTIsNTE1XX0sMV1dXV1dLFwibm9uZW1wdHlMaXN0T2ZcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1MjAsNTY4XX0sbnVsbCxbXCJlbGVtXCIsXCJzZXBcIl0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTUyLDU2OF19LFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTUyLDU1Nl19LDBdLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1NTcsNTY4XX0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTU4LDU2Nl19LFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTU4LDU2MV19LDFdLFtcInBhcmFtXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTYyLDU2Nl19LDBdXV1dXSxcImVtcHR5TGlzdE9mXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTcyLDY4Ml19LG51bGwsW1wiZWxlbVwiLFwic2VwXCJdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzY4NSw2ODVdfV1dLFwiYXBwbHlTeW50YWN0aWNcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2ODUsNzEwXX0sbnVsbCxbXCJhcHBcIl0sW1wicGFyYW1cIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3MDcsNzEwXX0sMF1dfV0pO1xuIiwiaW1wb3J0IEJ1aWx0SW5SdWxlcyBmcm9tICcuLi9kaXN0L2J1aWx0LWluLXJ1bGVzLmpzJztcbmltcG9ydCB7R3JhbW1hcn0gZnJvbSAnLi9HcmFtbWFyLmpzJztcbmltcG9ydCB7YW5ub3VuY2VCdWlsdEluUnVsZXN9IGZyb20gJy4vdXRpbC5qcyc7XG5cbkdyYW1tYXIuQnVpbHRJblJ1bGVzID0gQnVpbHRJblJ1bGVzO1xuYW5ub3VuY2VCdWlsdEluUnVsZXMoR3JhbW1hci5CdWlsdEluUnVsZXMpO1xuXG4vLyBEdXJpbmcgdGhlIGJvb3RzdHJhcCBwcm9jZXNzLCB3ZSBpbnN0YW50aWF0ZSBzb21lIGdyYW1tYXJzIHRoYXQgcmVxdWlyZVxuLy8gdGhlIGJ1aWx0LWluIHJ1bGVzIHRvIGJlIGxvYWRlZCBmaXJzdCAoZS5nLiwgb2htLWdyYW1tYXIub2htKS4gQnlcbi8vIGV4cG9ydGluZyBgbWFrZVJlY2lwZWAgaGVyZSwgdGhlIHJlY2lwZXMgZm9yIHRob3NlIGdyYW1tYXJzIGNhbiBlbmNvZGVcbi8vIHRoYXQgZGVwZW5kZW5jeSBieSBpbXBvcnRpbmcgaXQgZnJvbSB0aGlzIG1vZHVsZS5cbmV4cG9ydCB7bWFrZVJlY2lwZX0gZnJvbSAnLi9tYWtlUmVjaXBlLmpzJztcbiIsImltcG9ydCB7bWFrZVJlY2lwZX0gZnJvbSAnLi4vc3JjL21haW4ta2VybmVsLmpzJztcbmV4cG9ydCBkZWZhdWx0IG1ha2VSZWNpcGUoW1wiZ3JhbW1hclwiLHtcInNvdXJjZVwiOlwiT2htIHtcXG5cXG4gIEdyYW1tYXJzXFxuICAgID0gR3JhbW1hcipcXG5cXG4gIEdyYW1tYXJcXG4gICAgPSBpZGVudCBTdXBlckdyYW1tYXI/IFxcXCJ7XFxcIiBSdWxlKiBcXFwifVxcXCJcXG5cXG4gIFN1cGVyR3JhbW1hclxcbiAgICA9IFxcXCI8OlxcXCIgaWRlbnRcXG5cXG4gIFJ1bGVcXG4gICAgPSBpZGVudCBGb3JtYWxzPyBydWxlRGVzY3I/IFxcXCI9XFxcIiAgUnVsZUJvZHkgIC0tIGRlZmluZVxcbiAgICB8IGlkZW50IEZvcm1hbHM/ICAgICAgICAgICAgXFxcIjo9XFxcIiBPdmVycmlkZVJ1bGVCb2R5ICAtLSBvdmVycmlkZVxcbiAgICB8IGlkZW50IEZvcm1hbHM/ICAgICAgICAgICAgXFxcIis9XFxcIiBSdWxlQm9keSAgLS0gZXh0ZW5kXFxuXFxuICBSdWxlQm9keVxcbiAgICA9IFxcXCJ8XFxcIj8gTm9uZW1wdHlMaXN0T2Y8VG9wTGV2ZWxUZXJtLCBcXFwifFxcXCI+XFxuXFxuICBUb3BMZXZlbFRlcm1cXG4gICAgPSBTZXEgY2FzZU5hbWUgIC0tIGlubGluZVxcbiAgICB8IFNlcVxcblxcbiAgT3ZlcnJpZGVSdWxlQm9keVxcbiAgICA9IFxcXCJ8XFxcIj8gTm9uZW1wdHlMaXN0T2Y8T3ZlcnJpZGVUb3BMZXZlbFRlcm0sIFxcXCJ8XFxcIj5cXG5cXG4gIE92ZXJyaWRlVG9wTGV2ZWxUZXJtXFxuICAgID0gXFxcIi4uLlxcXCIgIC0tIHN1cGVyU3BsaWNlXFxuICAgIHwgVG9wTGV2ZWxUZXJtXFxuXFxuICBGb3JtYWxzXFxuICAgID0gXFxcIjxcXFwiIExpc3RPZjxpZGVudCwgXFxcIixcXFwiPiBcXFwiPlxcXCJcXG5cXG4gIFBhcmFtc1xcbiAgICA9IFxcXCI8XFxcIiBMaXN0T2Y8U2VxLCBcXFwiLFxcXCI+IFxcXCI+XFxcIlxcblxcbiAgQWx0XFxuICAgID0gTm9uZW1wdHlMaXN0T2Y8U2VxLCBcXFwifFxcXCI+XFxuXFxuICBTZXFcXG4gICAgPSBJdGVyKlxcblxcbiAgSXRlclxcbiAgICA9IFByZWQgXFxcIipcXFwiICAtLSBzdGFyXFxuICAgIHwgUHJlZCBcXFwiK1xcXCIgIC0tIHBsdXNcXG4gICAgfCBQcmVkIFxcXCI/XFxcIiAgLS0gb3B0XFxuICAgIHwgUHJlZFxcblxcbiAgUHJlZFxcbiAgICA9IFxcXCJ+XFxcIiBMZXggIC0tIG5vdFxcbiAgICB8IFxcXCImXFxcIiBMZXggIC0tIGxvb2thaGVhZFxcbiAgICB8IExleFxcblxcbiAgTGV4XFxuICAgID0gXFxcIiNcXFwiIEJhc2UgIC0tIGxleFxcbiAgICB8IEJhc2VcXG5cXG4gIEJhc2VcXG4gICAgPSBpZGVudCBQYXJhbXM/IH4ocnVsZURlc2NyPyBcXFwiPVxcXCIgfCBcXFwiOj1cXFwiIHwgXFxcIis9XFxcIikgIC0tIGFwcGxpY2F0aW9uXFxuICAgIHwgb25lQ2hhclRlcm1pbmFsIFxcXCIuLlxcXCIgb25lQ2hhclRlcm1pbmFsICAgICAgICAgICAtLSByYW5nZVxcbiAgICB8IHRlcm1pbmFsICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0gdGVybWluYWxcXG4gICAgfCBcXFwiKFxcXCIgQWx0IFxcXCIpXFxcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tIHBhcmVuXFxuXFxuICBydWxlRGVzY3IgIChhIHJ1bGUgZGVzY3JpcHRpb24pXFxuICAgID0gXFxcIihcXFwiIHJ1bGVEZXNjclRleHQgXFxcIilcXFwiXFxuXFxuICBydWxlRGVzY3JUZXh0XFxuICAgID0gKH5cXFwiKVxcXCIgYW55KSpcXG5cXG4gIGNhc2VOYW1lXFxuICAgID0gXFxcIi0tXFxcIiAoflxcXCJcXFxcblxcXCIgc3BhY2UpKiBuYW1lICh+XFxcIlxcXFxuXFxcIiBzcGFjZSkqIChcXFwiXFxcXG5cXFwiIHwgJlxcXCJ9XFxcIilcXG5cXG4gIG5hbWUgIChhIG5hbWUpXFxuICAgID0gbmFtZUZpcnN0IG5hbWVSZXN0KlxcblxcbiAgbmFtZUZpcnN0XFxuICAgID0gXFxcIl9cXFwiXFxuICAgIHwgbGV0dGVyXFxuXFxuICBuYW1lUmVzdFxcbiAgICA9IFxcXCJfXFxcIlxcbiAgICB8IGFsbnVtXFxuXFxuICBpZGVudCAgKGFuIGlkZW50aWZpZXIpXFxuICAgID0gbmFtZVxcblxcbiAgdGVybWluYWxcXG4gICAgPSBcXFwiXFxcXFxcXCJcXFwiIHRlcm1pbmFsQ2hhciogXFxcIlxcXFxcXFwiXFxcIlxcblxcbiAgb25lQ2hhclRlcm1pbmFsXFxuICAgID0gXFxcIlxcXFxcXFwiXFxcIiB0ZXJtaW5hbENoYXIgXFxcIlxcXFxcXFwiXFxcIlxcblxcbiAgdGVybWluYWxDaGFyXFxuICAgID0gZXNjYXBlQ2hhclxcbiAgICAgIHwgflxcXCJcXFxcXFxcXFxcXCIgflxcXCJcXFxcXFxcIlxcXCIgflxcXCJcXFxcblxcXCIgXFxcIlxcXFx1ezB9XFxcIi4uXFxcIlxcXFx1ezEwRkZGRn1cXFwiXFxuXFxuICBlc2NhcGVDaGFyICAoYW4gZXNjYXBlIHNlcXVlbmNlKVxcbiAgICA9IFxcXCJcXFxcXFxcXFxcXFxcXFxcXFxcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLSBiYWNrc2xhc2hcXG4gICAgfCBcXFwiXFxcXFxcXFxcXFxcXFxcIlxcXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0gZG91YmxlUXVvdGVcXG4gICAgfCBcXFwiXFxcXFxcXFxcXFxcJ1xcXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0gc2luZ2xlUXVvdGVcXG4gICAgfCBcXFwiXFxcXFxcXFxiXFxcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0gYmFja3NwYWNlXFxuICAgIHwgXFxcIlxcXFxcXFxcblxcXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tIGxpbmVGZWVkXFxuICAgIHwgXFxcIlxcXFxcXFxcclxcXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tIGNhcnJpYWdlUmV0dXJuXFxuICAgIHwgXFxcIlxcXFxcXFxcdFxcXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tIHRhYlxcbiAgICB8IFxcXCJcXFxcXFxcXHV7XFxcIiBoZXhEaWdpdCBoZXhEaWdpdD8gaGV4RGlnaXQ/XFxuICAgICAgICAgICAgIGhleERpZ2l0PyBoZXhEaWdpdD8gaGV4RGlnaXQ/IFxcXCJ9XFxcIiAgIC0tIHVuaWNvZGVDb2RlUG9pbnRcXG4gICAgfCBcXFwiXFxcXFxcXFx1XFxcIiBoZXhEaWdpdCBoZXhEaWdpdCBoZXhEaWdpdCBoZXhEaWdpdCAgLS0gdW5pY29kZUVzY2FwZVxcbiAgICB8IFxcXCJcXFxcXFxcXHhcXFwiIGhleERpZ2l0IGhleERpZ2l0ICAgICAgICAgICAgICAgICAgICAtLSBoZXhFc2NhcGVcXG5cXG4gIHNwYWNlXFxuICAgKz0gY29tbWVudFxcblxcbiAgY29tbWVudFxcbiAgICA9IFxcXCIvL1xcXCIgKH5cXFwiXFxcXG5cXFwiIGFueSkqICYoXFxcIlxcXFxuXFxcIiB8IGVuZCkgIC0tIHNpbmdsZUxpbmVcXG4gICAgfCBcXFwiLypcXFwiICh+XFxcIiovXFxcIiBhbnkpKiBcXFwiKi9cXFwiICAtLSBtdWx0aUxpbmVcXG5cXG4gIHRva2VucyA9IHRva2VuKlxcblxcbiAgdG9rZW4gPSBjYXNlTmFtZSB8IGNvbW1lbnQgfCBpZGVudCB8IG9wZXJhdG9yIHwgcHVuY3R1YXRpb24gfCB0ZXJtaW5hbCB8IGFueVxcblxcbiAgb3BlcmF0b3IgPSBcXFwiPDpcXFwiIHwgXFxcIj1cXFwiIHwgXFxcIjo9XFxcIiB8IFxcXCIrPVxcXCIgfCBcXFwiKlxcXCIgfCBcXFwiK1xcXCIgfCBcXFwiP1xcXCIgfCBcXFwiflxcXCIgfCBcXFwiJlxcXCJcXG5cXG4gIHB1bmN0dWF0aW9uID0gXFxcIjxcXFwiIHwgXFxcIj5cXFwiIHwgXFxcIixcXFwiIHwgXFxcIi0tXFxcIlxcbn1cIn0sXCJPaG1cIixudWxsLFwiR3JhbW1hcnNcIix7XCJHcmFtbWFyc1wiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzksMzJdfSxudWxsLFtdLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNCwzMl19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0LDMxXX0sXCJHcmFtbWFyXCIsW11dXV0sXCJHcmFtbWFyXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzYsODNdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzUwLDgzXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTAsNTVdfSxcImlkZW50XCIsW11dLFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzU2LDY5XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTYsNjhdfSxcIlN1cGVyR3JhbW1hclwiLFtdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3MCw3M119LFwie1wiXSxbXCJzdGFyXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzQsNzldfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NCw3OF19LFwiUnVsZVwiLFtdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4MCw4M119LFwifVwiXV1dLFwiU3VwZXJHcmFtbWFyXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODcsMTE2XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMDYsMTE2XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMDYsMTEwXX0sXCI8OlwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTEsMTE2XX0sXCJpZGVudFwiLFtdXV1dLFwiUnVsZV9kZWZpbmVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzEsMTgxXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzEsMTcwXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxLDEzNl19LFwiaWRlbnRcIixbXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTM3LDE0NV19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzNywxNDRdfSxcIkZvcm1hbHNcIixbXV1dLFtcIm9wdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0NiwxNTZdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDYsMTU1XX0sXCJydWxlRGVzY3JcIixbXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTU3LDE2MF19LFwiPVwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjIsMTcwXX0sXCJSdWxlQm9keVwiLFtdXV1dLFwiUnVsZV9vdmVycmlkZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE4OCwyNDhdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE4OCwyMzVdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxODgsMTkzXX0sXCJpZGVudFwiLFtdXSxbXCJvcHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxOTQsMjAyXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTk0LDIwMV19LFwiRm9ybWFsc1wiLFtdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMTQsMjE4XX0sXCI6PVwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMTksMjM1XX0sXCJPdmVycmlkZVJ1bGVCb2R5XCIsW11dXV0sXCJSdWxlX2V4dGVuZFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1NSwzMDVdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1NSwyOTRdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTUsMjYwXX0sXCJpZGVudFwiLFtdXSxbXCJvcHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjEsMjY5XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjYxLDI2OF19LFwiRm9ybWFsc1wiLFtdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyODEsMjg1XX0sXCIrPVwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyODYsMjk0XX0sXCJSdWxlQm9keVwiLFtdXV1dLFwiUnVsZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyMCwzMDVdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMSwzMDVdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzEsMTcwXX0sXCJSdWxlX2RlZmluZVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxODgsMjM1XX0sXCJSdWxlX292ZXJyaWRlXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1NSwyOTRdfSxcIlJ1bGVfZXh0ZW5kXCIsW11dXV0sXCJSdWxlQm9keVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzMwOSwzNjJdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzMyNCwzNjJdfSxbXCJvcHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMjQsMzI4XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMjQsMzI3XX0sXCJ8XCJdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszMjksMzYyXX0sXCJOb25lbXB0eUxpc3RPZlwiLFtbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNDQsMzU2XX0sXCJUb3BMZXZlbFRlcm1cIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNTgsMzYxXX0sXCJ8XCJdXV1dXSxcIlRvcExldmVsVGVybV9pbmxpbmVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszODUsNDA4XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszODUsMzk3XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzg1LDM4OF19LFwiU2VxXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzM4OSwzOTddfSxcImNhc2VOYW1lXCIsW11dXV0sXCJUb3BMZXZlbFRlcm1cIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszNjYsNDE4XX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlszODUsNDE4XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMzg1LDM5N119LFwiVG9wTGV2ZWxUZXJtX2lubGluZVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls0MTUsNDE4XX0sXCJTZXFcIixbXV1dXSxcIk92ZXJyaWRlUnVsZUJvZHlcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls0MjIsNDkxXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls0NDUsNDkxXX0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDQ1LDQ0OV19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDQ1LDQ0OF19LFwifFwiXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDUwLDQ5MV19LFwiTm9uZW1wdHlMaXN0T2ZcIixbW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNDY1LDQ4NV19LFwiT3ZlcnJpZGVUb3BMZXZlbFRlcm1cIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls0ODcsNDkwXX0sXCJ8XCJdXV1dXSxcIk92ZXJyaWRlVG9wTGV2ZWxUZXJtX3N1cGVyU3BsaWNlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTIyLDU0M119LG51bGwsW10sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1MjIsNTI3XX0sXCIuLi5cIl1dLFwiT3ZlcnJpZGVUb3BMZXZlbFRlcm1cIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls0OTUsNTYyXX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1MjIsNTYyXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTIyLDUyN119LFwiT3ZlcnJpZGVUb3BMZXZlbFRlcm1fc3VwZXJTcGxpY2VcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTUwLDU2Ml19LFwiVG9wTGV2ZWxUZXJtXCIsW11dXV0sXCJGb3JtYWxzXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTY2LDYwNl19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTgwLDYwNl19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTgwLDU4M119LFwiPFwiXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1ODQsNjAyXX0sXCJMaXN0T2ZcIixbW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTkxLDU5Nl19LFwiaWRlbnRcIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls1OTgsNjAxXX0sXCIsXCJdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MDMsNjA2XX0sXCI+XCJdXV0sXCJQYXJhbXNcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MTAsNjQ3XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MjMsNjQ3XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MjMsNjI2XX0sXCI8XCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzYyNyw2NDNdfSxcIkxpc3RPZlwiLFtbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MzQsNjM3XX0sXCJTZXFcIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2MzksNjQyXX0sXCIsXCJdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2NDQsNjQ3XX0sXCI+XCJdXV0sXCJBbHRcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2NTEsNjg1XX0sbnVsbCxbXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2NjEsNjg1XX0sXCJOb25lbXB0eUxpc3RPZlwiLFtbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2NzYsNjc5XX0sXCJTZXFcIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2ODEsNjg0XX0sXCJ8XCJdXV1dLFwiU2VxXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjg5LDcwNF19LG51bGwsW10sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzY5OSw3MDRdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls2OTksNzAzXX0sXCJJdGVyXCIsW11dXV0sXCJJdGVyX3N0YXJcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3MTksNzM2XX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3MTksNzI3XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzE5LDcyM119LFwiUHJlZFwiLFtdXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzcyNCw3MjddfSxcIipcIl1dXSxcIkl0ZXJfcGx1c1wiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzc0Myw3NjBdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzc0Myw3NTFdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NDMsNzQ3XX0sXCJQcmVkXCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzQ4LDc1MV19LFwiK1wiXV1dLFwiSXRlcl9vcHRcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NjcsNzgzXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NjcsNzc1XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzY3LDc3MV19LFwiUHJlZFwiLFtdXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzc3Miw3NzVdfSxcIj9cIl1dXSxcIkl0ZXJcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3MDgsNzk0XX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3MTksNzk0XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzE5LDcyN119LFwiSXRlcl9zdGFyXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzc0Myw3NTFdfSxcIkl0ZXJfcGx1c1wiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3NjcsNzc1XX0sXCJJdGVyX29wdFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls3OTAsNzk0XX0sXCJQcmVkXCIsW11dXV0sXCJQcmVkX25vdFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzgwOSw4MjRdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzgwOSw4MTZdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzgwOSw4MTJdfSxcIn5cIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODEzLDgxNl19LFwiTGV4XCIsW11dXV0sXCJQcmVkX2xvb2thaGVhZFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzgzMSw4NTJdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzgzMSw4MzhdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzgzMSw4MzRdfSxcIiZcIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODM1LDgzOF19LFwiTGV4XCIsW11dXV0sXCJQcmVkXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNzk4LDg2Ml19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbODA5LDg2Ml19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzgwOSw4MTZdfSxcIlByZWRfbm90XCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzgzMSw4MzhdfSxcIlByZWRfbG9va2FoZWFkXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg1OSw4NjJdfSxcIkxleFwiLFtdXV1dLFwiTGV4X2xleFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg3Niw4OTJdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg3Niw4ODRdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg3Niw4NzldfSxcIiNcIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODgwLDg4NF19LFwiQmFzZVwiLFtdXV1dLFwiTGV4XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODY2LDkwM119LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbODc2LDkwM119LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzg3Niw4ODRdfSxcIkxleF9sZXhcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbODk5LDkwM119LFwiQmFzZVwiLFtdXV1dLFwiQmFzZV9hcHBsaWNhdGlvblwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzkxOCw5NzldfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzkxOCw5NjNdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MTgsOTIzXX0sXCJpZGVudFwiLFtdXSxbXCJvcHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MjQsOTMxXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTI0LDkzMF19LFwiUGFyYW1zXCIsW11dXSxbXCJub3RcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MzIsOTYzXX0sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTM0LDk2Ml19LFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzkzNCw5NDhdfSxbXCJvcHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MzQsOTQ0XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTM0LDk0M119LFwicnVsZURlc2NyXCIsW11dXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzk0NSw5NDhdfSxcIj1cIl1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTUxLDk1NV19LFwiOj1cIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5NTgsOTYyXX0sXCIrPVwiXV1dXV0sXCJCYXNlX3JhbmdlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTg2LDEwNDFdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6Wzk4NiwxMDIyXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTg2LDEwMDFdfSxcIm9uZUNoYXJUZXJtaW5hbFwiLFtdXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEwMDIsMTAwNl19LFwiLi5cIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTAwNywxMDIyXX0sXCJvbmVDaGFyVGVybWluYWxcIixbXV1dXSxcIkJhc2VfdGVybWluYWxcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMDQ4LDExMDZdfSxudWxsLFtdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEwNDgsMTA1Nl19LFwidGVybWluYWxcIixbXV1dLFwiQmFzZV9wYXJlblwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzExMTMsMTE2OF19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTExMywxMTI0XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTEzLDExMTZdfSxcIihcIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTExNywxMTIwXX0sXCJBbHRcIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTIxLDExMjRdfSxcIilcIl1dXSxcIkJhc2VcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MDcsMTE2OF19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbOTE4LDExNjhdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MTgsOTYzXX0sXCJCYXNlX2FwcGxpY2F0aW9uXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6Wzk4NiwxMDIyXX0sXCJCYXNlX3JhbmdlXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEwNDgsMTA1Nl19LFwiQmFzZV90ZXJtaW5hbFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTEzLDExMjRdfSxcIkJhc2VfcGFyZW5cIixbXV1dXSxcInJ1bGVEZXNjclwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzExNzIsMTIzMV19LFwiYSBydWxlIGRlc2NyaXB0aW9uXCIsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTIxMCwxMjMxXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjEwLDEyMTNdfSxcIihcIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTIxNCwxMjI3XX0sXCJydWxlRGVzY3JUZXh0XCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTIyOCwxMjMxXX0sXCIpXCJdXV0sXCJydWxlRGVzY3JUZXh0XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTIzNSwxMjY2XX0sbnVsbCxbXSxbXCJzdGFyXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI1NSwxMjY2XX0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI1NiwxMjY0XX0sW1wibm90XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI1NiwxMjYwXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjU3LDEyNjBdfSxcIilcIl1dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyNjEsMTI2NF19LFwiYW55XCIsW11dXV1dLFwiY2FzZU5hbWVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjcwLDEzMzhdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyODUsMTMzOF19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI4NSwxMjg5XX0sXCItLVwiXSxbXCJzdGFyXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI5MCwxMzA0XX0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI5MSwxMzAyXX0sW1wibm90XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI5MSwxMjk2XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjkyLDEyOTZdfSxcIlxcblwiXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTI5NywxMzAyXX0sXCJzcGFjZVwiLFtdXV1dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMDUsMTMwOV19LFwibmFtZVwiLFtdXSxbXCJzdGFyXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxMCwxMzI0XX0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxMSwxMzIyXX0sW1wibm90XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxMSwxMzE2XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzEyLDEzMTZdfSxcIlxcblwiXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMxNywxMzIyXX0sXCJzcGFjZVwiLFtdXV1dLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzMjYsMTMzN119LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMyNiwxMzMwXX0sXCJcXG5cIl0sW1wibG9va2FoZWFkXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTMzMywxMzM3XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzM0LDEzMzddfSxcIn1cIl1dXV1dLFwibmFtZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzNDIsMTM4Ml19LFwiYSBuYW1lXCIsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTM2MywxMzgyXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTM2MywxMzcyXX0sXCJuYW1lRmlyc3RcIixbXV0sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzNzMsMTM4Ml19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEzNzMsMTM4MV19LFwibmFtZVJlc3RcIixbXV1dXV0sXCJuYW1lRmlyc3RcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMzg2LDE0MThdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0MDIsMTQxOF19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQwMiwxNDA1XX0sXCJfXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0MTIsMTQxOF19LFwibGV0dGVyXCIsW11dXV0sXCJuYW1lUmVzdFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0MjIsMTQ1Ml19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQzNywxNDUyXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDM3LDE0NDBdfSxcIl9cIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQ0NywxNDUyXX0sXCJhbG51bVwiLFtdXV1dLFwiaWRlbnRcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDU2LDE0ODldfSxcImFuIGlkZW50aWZpZXJcIixbXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDg1LDE0ODldfSxcIm5hbWVcIixbXV1dLFwidGVybWluYWxcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNDkzLDE1MzFdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE1MDgsMTUzMV19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTUwOCwxNTEyXX0sXCJcXFwiXCJdLFtcInN0YXJcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNTEzLDE1MjZdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNTEzLDE1MjVdfSxcInRlcm1pbmFsQ2hhclwiLFtdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNTI3LDE1MzFdfSxcIlxcXCJcIl1dXSxcIm9uZUNoYXJUZXJtaW5hbFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE1MzUsMTU3OV19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTU1NywxNTc5XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNTU3LDE1NjFdfSxcIlxcXCJcIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTU2MiwxNTc0XX0sXCJ0ZXJtaW5hbENoYXJcIixbXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNTc1LDE1NzldfSxcIlxcXCJcIl1dXSxcInRlcm1pbmFsQ2hhclwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE1ODMsMTY2MF19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTYwMiwxNjYwXX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTYwMiwxNjEyXX0sXCJlc2NhcGVDaGFyXCIsW11dLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2MjEsMTY2MF19LFtcIm5vdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2MjEsMTYyNl19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTYyMiwxNjI2XX0sXCJcXFxcXCJdXSxbXCJub3RcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjI3LDE2MzJdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2MjgsMTYzMl19LFwiXFxcIlwiXV0sW1wibm90XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTYzMywxNjM4XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjM0LDE2MzhdfSxcIlxcblwiXV0sW1wicmFuZ2VcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjM5LDE2NjBdfSxcIlxcdTAwMDBcIixcIvSPv79cIl1dXV0sXCJlc2NhcGVDaGFyX2JhY2tzbGFzaFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE3MDMsMTc1OF19LG51bGwsW10sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNzAzLDE3MDldfSxcIlxcXFxcXFxcXCJdXSxcImVzY2FwZUNoYXJfZG91YmxlUXVvdGVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNzY1LDE4MjJdfSxudWxsLFtdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTc2NSwxNzcxXX0sXCJcXFxcXFxcIlwiXV0sXCJlc2NhcGVDaGFyX3NpbmdsZVF1b3RlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTgyOSwxODg2XX0sbnVsbCxbXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE4MjksMTgzNV19LFwiXFxcXCdcIl1dLFwiZXNjYXBlQ2hhcl9iYWNrc3BhY2VcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxODkzLDE5NDhdfSxudWxsLFtdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTg5MywxODk4XX0sXCJcXFxcYlwiXV0sXCJlc2NhcGVDaGFyX2xpbmVGZWVkXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTk1NSwyMDA5XX0sbnVsbCxbXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE5NTUsMTk2MF19LFwiXFxcXG5cIl1dLFwiZXNjYXBlQ2hhcl9jYXJyaWFnZVJldHVyblwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzIwMTYsMjA3Nl19LG51bGwsW10sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMDE2LDIwMjFdfSxcIlxcXFxyXCJdXSxcImVzY2FwZUNoYXJfdGFiXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjA4MywyMTMyXX0sbnVsbCxbXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIwODMsMjA4OF19LFwiXFxcXHRcIl1dLFwiZXNjYXBlQ2hhcl91bmljb2RlQ29kZVBvaW50XCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjEzOSwyMjQzXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMTM5LDIyMjFdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxMzksMjE0NV19LFwiXFxcXHV7XCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIxNDYsMjE1NF19LFwiaGV4RGlnaXRcIixbXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE1NSwyMTY0XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE1NSwyMTYzXX0sXCJoZXhEaWdpdFwiLFtdXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE2NSwyMTc0XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE2NSwyMTczXX0sXCJoZXhEaWdpdFwiLFtdXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE4OCwyMTk3XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE4OCwyMTk2XX0sXCJoZXhEaWdpdFwiLFtdXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE5OCwyMjA3XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE5OCwyMjA2XX0sXCJoZXhEaWdpdFwiLFtdXV0sW1wib3B0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjIwOCwyMjE3XX0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjIwOCwyMjE2XX0sXCJoZXhEaWdpdFwiLFtdXV0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMjE4LDIyMjFdfSxcIn1cIl1dXSxcImVzY2FwZUNoYXJfdW5pY29kZUVzY2FwZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyNTAsMjMwOV19LG51bGwsW10sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjI1MCwyMjkxXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMjUwLDIyNTVdfSxcIlxcXFx1XCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyNTYsMjI2NF19LFwiaGV4RGlnaXRcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjI2NSwyMjczXX0sXCJoZXhEaWdpdFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMjc0LDIyODJdfSxcImhleERpZ2l0XCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyODMsMjI5MV19LFwiaGV4RGlnaXRcIixbXV1dXSxcImVzY2FwZUNoYXJfaGV4RXNjYXBlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjMxNiwyMzcxXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMzE2LDIzMzldfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIzMTYsMjMyMV19LFwiXFxcXHhcIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjMyMiwyMzMwXX0sXCJoZXhEaWdpdFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMzMxLDIzMzldfSxcImhleERpZ2l0XCIsW11dXV0sXCJlc2NhcGVDaGFyXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTY2NCwyMzcxXX0sXCJhbiBlc2NhcGUgc2VxdWVuY2VcIixbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNzAzLDIzNzFdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNzAzLDE3MDldfSxcImVzY2FwZUNoYXJfYmFja3NsYXNoXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzE3NjUsMTc3MV19LFwiZXNjYXBlQ2hhcl9kb3VibGVRdW90ZVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxODI5LDE4MzVdfSxcImVzY2FwZUNoYXJfc2luZ2xlUXVvdGVcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTg5MywxODk4XX0sXCJlc2NhcGVDaGFyX2JhY2tzcGFjZVwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxOTU1LDE5NjBdfSxcImVzY2FwZUNoYXJfbGluZUZlZWRcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjAxNiwyMDIxXX0sXCJlc2NhcGVDaGFyX2NhcnJpYWdlUmV0dXJuXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIwODMsMjA4OF19LFwiZXNjYXBlQ2hhcl90YWJcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjEzOSwyMjIxXX0sXCJlc2NhcGVDaGFyX3VuaWNvZGVDb2RlUG9pbnRcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjI1MCwyMjkxXX0sXCJlc2NhcGVDaGFyX3VuaWNvZGVFc2NhcGVcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjMxNiwyMzM5XX0sXCJlc2NhcGVDaGFyX2hleEVzY2FwZVwiLFtdXV1dLFwic3BhY2VcIjpbXCJleHRlbmRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMzc1LDIzOTRdfSxudWxsLFtdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIzODcsMjM5NF19LFwiY29tbWVudFwiLFtdXV0sXCJjb21tZW50X3NpbmdsZUxpbmVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDEyLDI0NThdfSxudWxsLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MTIsMjQ0M119LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQxMiwyNDE2XX0sXCIvL1wiXSxbXCJzdGFyXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQxNywyNDI5XX0sW1wic2VxXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQxOCwyNDI3XX0sW1wibm90XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQxOCwyNDIzXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDE5LDI0MjNdfSxcIlxcblwiXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQyNCwyNDI3XX0sXCJhbnlcIixbXV1dXSxbXCJsb29rYWhlYWRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDMwLDI0NDNdfSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDMyLDI0NDJdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MzIsMjQzNl19LFwiXFxuXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MzksMjQ0Ml19LFwiZW5kXCIsW11dXV1dXSxcImNvbW1lbnRfbXVsdGlMaW5lXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQ2NSwyNTAxXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNDY1LDI0ODddfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NjUsMjQ2OV19LFwiLypcIl0sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NzAsMjQ4Ml19LFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NzEsMjQ4MF19LFtcIm5vdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NzEsMjQ3Nl19LFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQ3MiwyNDc2XX0sXCIqL1wiXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjQ3NywyNDgwXX0sXCJhbnlcIixbXV1dXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0ODMsMjQ4N119LFwiKi9cIl1dXSxcImNvbW1lbnRcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyMzk4LDI1MDFdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MTIsMjUwMV19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MTIsMjQ0M119LFwiY29tbWVudF9zaW5nbGVMaW5lXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0NjUsMjQ4N119LFwiY29tbWVudF9tdWx0aUxpbmVcIixbXV1dXSxcInRva2Vuc1wiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1MDUsMjUyMF19LG51bGwsW10sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1MTQsMjUyMF19LFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1MTQsMjUxOV19LFwidG9rZW5cIixbXV1dXSxcInRva2VuXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjUyNCwyNjAwXX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTMyLDI2MDBdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTMyLDI1NDBdfSxcImNhc2VOYW1lXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1NDMsMjU1MF19LFwiY29tbWVudFwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTUzLDI1NThdfSxcImlkZW50XCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1NjEsMjU2OV19LFwib3BlcmF0b3JcIixbXV0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjU3MiwyNTgzXX0sXCJwdW5jdHVhdGlvblwiLFtdXSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNTg2LDI1OTRdfSxcInRlcm1pbmFsXCIsW11dLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI1OTcsMjYwMF19LFwiYW55XCIsW11dXV0sXCJvcGVyYXRvclwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2MDQsMjY2OV19LG51bGwsW10sW1wiYWx0XCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjYxNSwyNjY5XX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjE1LDI2MTldfSxcIjw6XCJdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjYyMiwyNjI1XX0sXCI9XCJdLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjYyOCwyNjMyXX0sXCI6PVwiXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2MzUsMjYzOV19LFwiKz1cIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjQyLDI2NDVdfSxcIipcIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjQ4LDI2NTFdfSxcIitcIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjU0LDI2NTddfSxcIj9cIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjYwLDI2NjNdfSxcIn5cIl0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjY2LDI2NjldfSxcIiZcIl1dXSxcInB1bmN0dWF0aW9uXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjY3MywyNzA5XX0sbnVsbCxbXSxbXCJhbHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyNjg3LDI3MDldfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2ODcsMjY5MF19LFwiPFwiXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2OTMsMjY5Nl19LFwiPlwiXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI2OTksMjcwMl19LFwiLFwiXSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI3MDUsMjcwOV19LFwiLS1cIl1dXX1dKTtcbiIsImltcG9ydCBvaG1HcmFtbWFyIGZyb20gJy4uL2Rpc3Qvb2htLWdyYW1tYXIuanMnO1xuaW1wb3J0IHtCdWlsZGVyfSBmcm9tICcuL0J1aWxkZXIuanMnO1xuaW1wb3J0ICogYXMgY29tbW9uIGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIGVycm9ycyBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQge0dyYW1tYXJ9IGZyb20gJy4vR3JhbW1hci5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuXG5jb25zdCBzdXBlclNwbGljZVBsYWNlaG9sZGVyID0gT2JqZWN0LmNyZWF0ZShwZXhwcnMuUEV4cHIucHJvdG90eXBlKTtcblxuZnVuY3Rpb24gbmFtZXNwYWNlSGFzKG5zLCBuYW1lKSB7XG4gIC8vIExvb2sgZm9yIGFuIGVudW1lcmFibGUgcHJvcGVydHksIGFueXdoZXJlIGluIHRoZSBwcm90b3R5cGUgY2hhaW4uXG4gIGZvciAoY29uc3QgcHJvcCBpbiBucykge1xuICAgIGlmIChwcm9wID09PSBuYW1lKSByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIFJldHVybnMgYSBHcmFtbWFyIGluc3RhbmNlIChpLmUuLCBhbiBvYmplY3Qgd2l0aCBhIGBtYXRjaGAgbWV0aG9kKSBmb3Jcbi8vIGB0cmVlYCwgd2hpY2ggaXMgdGhlIGNvbmNyZXRlIHN5bnRheCB0cmVlIG9mIGEgdXNlci13cml0dGVuIGdyYW1tYXIuXG4vLyBUaGUgZ3JhbW1hciB3aWxsIGJlIGFzc2lnbmVkIGludG8gYG5hbWVzcGFjZWAgdW5kZXIgdGhlIG5hbWUgb2YgdGhlIGdyYW1tYXJcbi8vIGFzIHNwZWNpZmllZCBpbiB0aGUgc291cmNlLlxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkR3JhbW1hcihtYXRjaCwgbmFtZXNwYWNlLCBvcHRPaG1HcmFtbWFyRm9yVGVzdGluZykge1xuICBjb25zdCBidWlsZGVyID0gbmV3IEJ1aWxkZXIoKTtcbiAgbGV0IGRlY2w7XG4gIGxldCBjdXJyZW50UnVsZU5hbWU7XG4gIGxldCBjdXJyZW50UnVsZUZvcm1hbHM7XG4gIGxldCBvdmVycmlkaW5nID0gZmFsc2U7XG4gIGNvbnN0IG1ldGFHcmFtbWFyID0gb3B0T2htR3JhbW1hckZvclRlc3RpbmcgfHwgb2htR3JhbW1hcjtcblxuICAvLyBBIHZpc2l0b3IgdGhhdCBwcm9kdWNlcyBhIEdyYW1tYXIgaW5zdGFuY2UgZnJvbSB0aGUgQ1NULlxuICBjb25zdCBoZWxwZXJzID0gbWV0YUdyYW1tYXIuY3JlYXRlU2VtYW50aWNzKCkuYWRkT3BlcmF0aW9uKCd2aXNpdCcsIHtcbiAgICBHcmFtbWFycyhncmFtbWFySXRlcikge1xuICAgICAgcmV0dXJuIGdyYW1tYXJJdGVyLmNoaWxkcmVuLm1hcChjID0+IGMudmlzaXQoKSk7XG4gICAgfSxcbiAgICBHcmFtbWFyKGlkLCBzLCBfb3BlbiwgcnVsZXMsIF9jbG9zZSkge1xuICAgICAgY29uc3QgZ3JhbW1hck5hbWUgPSBpZC52aXNpdCgpO1xuICAgICAgZGVjbCA9IGJ1aWxkZXIubmV3R3JhbW1hcihncmFtbWFyTmFtZSk7XG4gICAgICBzLmNoaWxkKDApICYmIHMuY2hpbGQoMCkudmlzaXQoKTtcbiAgICAgIHJ1bGVzLmNoaWxkcmVuLm1hcChjID0+IGMudmlzaXQoKSk7XG4gICAgICBjb25zdCBnID0gZGVjbC5idWlsZCgpO1xuICAgICAgZy5zb3VyY2UgPSB0aGlzLnNvdXJjZS50cmltbWVkKCk7XG4gICAgICBpZiAobmFtZXNwYWNlSGFzKG5hbWVzcGFjZSwgZ3JhbW1hck5hbWUpKSB7XG4gICAgICAgIHRocm93IGVycm9ycy5kdXBsaWNhdGVHcmFtbWFyRGVjbGFyYXRpb24oZywgbmFtZXNwYWNlKTtcbiAgICAgIH1cbiAgICAgIG5hbWVzcGFjZVtncmFtbWFyTmFtZV0gPSBnO1xuICAgICAgcmV0dXJuIGc7XG4gICAgfSxcblxuICAgIFN1cGVyR3JhbW1hcihfLCBuKSB7XG4gICAgICBjb25zdCBzdXBlckdyYW1tYXJOYW1lID0gbi52aXNpdCgpO1xuICAgICAgaWYgKHN1cGVyR3JhbW1hck5hbWUgPT09ICdudWxsJykge1xuICAgICAgICBkZWNsLndpdGhTdXBlckdyYW1tYXIobnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIW5hbWVzcGFjZSB8fCAhbmFtZXNwYWNlSGFzKG5hbWVzcGFjZSwgc3VwZXJHcmFtbWFyTmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcnMudW5kZWNsYXJlZEdyYW1tYXIoc3VwZXJHcmFtbWFyTmFtZSwgbmFtZXNwYWNlLCBuLnNvdXJjZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVjbC53aXRoU3VwZXJHcmFtbWFyKG5hbWVzcGFjZVtzdXBlckdyYW1tYXJOYW1lXSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIFJ1bGVfZGVmaW5lKG4sIGZzLCBkLCBfLCBiKSB7XG4gICAgICBjdXJyZW50UnVsZU5hbWUgPSBuLnZpc2l0KCk7XG4gICAgICBjdXJyZW50UnVsZUZvcm1hbHMgPSBmcy5jaGlsZHJlbi5tYXAoYyA9PiBjLnZpc2l0KCkpWzBdIHx8IFtdO1xuICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gZGVmYXVsdCBzdGFydCBydWxlIHlldCwgc2V0IGl0IG5vdy4gVGhpcyBtdXN0IGJlIGRvbmUgYmVmb3JlIHZpc2l0aW5nXG4gICAgICAvLyB0aGUgYm9keSwgYmVjYXVzZSBpdCBtaWdodCBjb250YWluIGFuIGlubGluZSBydWxlIGRlZmluaXRpb24uXG4gICAgICBpZiAoIWRlY2wuZGVmYXVsdFN0YXJ0UnVsZSAmJiBkZWNsLmVuc3VyZVN1cGVyR3JhbW1hcigpICE9PSBHcmFtbWFyLlByb3RvQnVpbHRJblJ1bGVzKSB7XG4gICAgICAgIGRlY2wud2l0aERlZmF1bHRTdGFydFJ1bGUoY3VycmVudFJ1bGVOYW1lKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGJvZHkgPSBiLnZpc2l0KCk7XG4gICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IGQuY2hpbGRyZW4ubWFwKGMgPT4gYy52aXNpdCgpKVswXTtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuc291cmNlLnRyaW1tZWQoKTtcbiAgICAgIHJldHVybiBkZWNsLmRlZmluZShjdXJyZW50UnVsZU5hbWUsIGN1cnJlbnRSdWxlRm9ybWFscywgYm9keSwgZGVzY3JpcHRpb24sIHNvdXJjZSk7XG4gICAgfSxcbiAgICBSdWxlX292ZXJyaWRlKG4sIGZzLCBfLCBiKSB7XG4gICAgICBjdXJyZW50UnVsZU5hbWUgPSBuLnZpc2l0KCk7XG4gICAgICBjdXJyZW50UnVsZUZvcm1hbHMgPSBmcy5jaGlsZHJlbi5tYXAoYyA9PiBjLnZpc2l0KCkpWzBdIHx8IFtdO1xuXG4gICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLnNvdXJjZS50cmltbWVkKCk7XG4gICAgICBkZWNsLmVuc3VyZVN1cGVyR3JhbW1hclJ1bGVGb3JPdmVycmlkaW5nKGN1cnJlbnRSdWxlTmFtZSwgc291cmNlKTtcblxuICAgICAgb3ZlcnJpZGluZyA9IHRydWU7XG4gICAgICBjb25zdCBib2R5ID0gYi52aXNpdCgpO1xuICAgICAgb3ZlcnJpZGluZyA9IGZhbHNlO1xuICAgICAgcmV0dXJuIGRlY2wub3ZlcnJpZGUoY3VycmVudFJ1bGVOYW1lLCBjdXJyZW50UnVsZUZvcm1hbHMsIGJvZHksIG51bGwsIHNvdXJjZSk7XG4gICAgfSxcbiAgICBSdWxlX2V4dGVuZChuLCBmcywgXywgYikge1xuICAgICAgY3VycmVudFJ1bGVOYW1lID0gbi52aXNpdCgpO1xuICAgICAgY3VycmVudFJ1bGVGb3JtYWxzID0gZnMuY2hpbGRyZW4ubWFwKGMgPT4gYy52aXNpdCgpKVswXSB8fCBbXTtcbiAgICAgIGNvbnN0IGJvZHkgPSBiLnZpc2l0KCk7XG4gICAgICBjb25zdCBzb3VyY2UgPSB0aGlzLnNvdXJjZS50cmltbWVkKCk7XG4gICAgICByZXR1cm4gZGVjbC5leHRlbmQoY3VycmVudFJ1bGVOYW1lLCBjdXJyZW50UnVsZUZvcm1hbHMsIGJvZHksIG51bGwsIHNvdXJjZSk7XG4gICAgfSxcbiAgICBSdWxlQm9keShfLCB0ZXJtcykge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIuYWx0KC4uLnRlcm1zLnZpc2l0KCkpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICAgIH0sXG4gICAgT3ZlcnJpZGVSdWxlQm9keShfLCB0ZXJtcykge1xuICAgICAgY29uc3QgYXJncyA9IHRlcm1zLnZpc2l0KCk7XG5cbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzdXBlci1zcGxpY2Ugb3BlcmF0b3IgKGAuLi5gKSBhcHBlYXJzIGluIHRoZSB0ZXJtcy5cbiAgICAgIGNvbnN0IGV4cGFuc2lvblBvcyA9IGFyZ3MuaW5kZXhPZihzdXBlclNwbGljZVBsYWNlaG9sZGVyKTtcbiAgICAgIGlmIChleHBhbnNpb25Qb3MgPj0gMCkge1xuICAgICAgICBjb25zdCBiZWZvcmVUZXJtcyA9IGFyZ3Muc2xpY2UoMCwgZXhwYW5zaW9uUG9zKTtcbiAgICAgICAgY29uc3QgYWZ0ZXJUZXJtcyA9IGFyZ3Muc2xpY2UoZXhwYW5zaW9uUG9zICsgMSk7XG5cbiAgICAgICAgLy8gRW5zdXJlIGl0IGFwcGVhcnMgbm8gbW9yZSB0aGFuIG9uY2UuXG4gICAgICAgIGFmdGVyVGVybXMuZm9yRWFjaCh0ID0+IHtcbiAgICAgICAgICBpZiAodCA9PT0gc3VwZXJTcGxpY2VQbGFjZWhvbGRlcikgdGhyb3cgZXJyb3JzLm11bHRpcGxlU3VwZXJTcGxpY2VzKHQpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gbmV3IHBleHBycy5TcGxpY2UoXG4gICAgICAgICAgZGVjbC5zdXBlckdyYW1tYXIsXG4gICAgICAgICAgY3VycmVudFJ1bGVOYW1lLFxuICAgICAgICAgIGJlZm9yZVRlcm1zLFxuICAgICAgICAgIGFmdGVyVGVybXNcbiAgICAgICAgKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBidWlsZGVyLmFsdCguLi5hcmdzKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIEZvcm1hbHMob3BvaW50eSwgZnMsIGNwb2ludHkpIHtcbiAgICAgIHJldHVybiBmcy52aXNpdCgpO1xuICAgIH0sXG5cbiAgICBQYXJhbXMob3BvaW50eSwgcHMsIGNwb2ludHkpIHtcbiAgICAgIHJldHVybiBwcy52aXNpdCgpO1xuICAgIH0sXG5cbiAgICBBbHQoc2Vxcykge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIuYWx0KC4uLnNlcXMudmlzaXQoKSkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcblxuICAgIFRvcExldmVsVGVybV9pbmxpbmUoYiwgbikge1xuICAgICAgY29uc3QgaW5saW5lUnVsZU5hbWUgPSBjdXJyZW50UnVsZU5hbWUgKyAnXycgKyBuLnZpc2l0KCk7XG4gICAgICBjb25zdCBib2R5ID0gYi52aXNpdCgpO1xuICAgICAgY29uc3Qgc291cmNlID0gdGhpcy5zb3VyY2UudHJpbW1lZCgpO1xuICAgICAgY29uc3QgaXNOZXdSdWxlRGVjbGFyYXRpb24gPSAhKFxuICAgICAgICBkZWNsLnN1cGVyR3JhbW1hciAmJiBkZWNsLnN1cGVyR3JhbW1hci5ydWxlc1tpbmxpbmVSdWxlTmFtZV1cbiAgICAgICk7XG4gICAgICBpZiAob3ZlcnJpZGluZyAmJiAhaXNOZXdSdWxlRGVjbGFyYXRpb24pIHtcbiAgICAgICAgZGVjbC5vdmVycmlkZShpbmxpbmVSdWxlTmFtZSwgY3VycmVudFJ1bGVGb3JtYWxzLCBib2R5LCBudWxsLCBzb3VyY2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVjbC5kZWZpbmUoaW5saW5lUnVsZU5hbWUsIGN1cnJlbnRSdWxlRm9ybWFscywgYm9keSwgbnVsbCwgc291cmNlKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhcmFtcyA9IGN1cnJlbnRSdWxlRm9ybWFscy5tYXAoZm9ybWFsID0+IGJ1aWxkZXIuYXBwKGZvcm1hbCkpO1xuICAgICAgcmV0dXJuIGJ1aWxkZXIuYXBwKGlubGluZVJ1bGVOYW1lLCBwYXJhbXMpLndpdGhTb3VyY2UoYm9keS5zb3VyY2UpO1xuICAgIH0sXG4gICAgT3ZlcnJpZGVUb3BMZXZlbFRlcm1fc3VwZXJTcGxpY2UoXykge1xuICAgICAgcmV0dXJuIHN1cGVyU3BsaWNlUGxhY2Vob2xkZXI7XG4gICAgfSxcblxuICAgIFNlcShleHByKSB7XG4gICAgICByZXR1cm4gYnVpbGRlci5zZXEoLi4uZXhwci5jaGlsZHJlbi5tYXAoYyA9PiBjLnZpc2l0KCkpKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICB9LFxuXG4gICAgSXRlcl9zdGFyKHgsIF8pIHtcbiAgICAgIHJldHVybiBidWlsZGVyLnN0YXIoeC52aXNpdCgpKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICB9LFxuICAgIEl0ZXJfcGx1cyh4LCBfKSB7XG4gICAgICByZXR1cm4gYnVpbGRlci5wbHVzKHgudmlzaXQoKSkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcbiAgICBJdGVyX29wdCh4LCBfKSB7XG4gICAgICByZXR1cm4gYnVpbGRlci5vcHQoeC52aXNpdCgpKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICB9LFxuXG4gICAgUHJlZF9ub3QoXywgeCkge1xuICAgICAgcmV0dXJuIGJ1aWxkZXIubm90KHgudmlzaXQoKSkud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcbiAgICBQcmVkX2xvb2thaGVhZChfLCB4KSB7XG4gICAgICByZXR1cm4gYnVpbGRlci5sb29rYWhlYWQoeC52aXNpdCgpKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICB9LFxuXG4gICAgTGV4X2xleChfLCB4KSB7XG4gICAgICByZXR1cm4gYnVpbGRlci5sZXgoeC52aXNpdCgpKS53aXRoU291cmNlKHRoaXMuc291cmNlKTtcbiAgICB9LFxuXG4gICAgQmFzZV9hcHBsaWNhdGlvbihydWxlLCBwcykge1xuICAgICAgY29uc3QgcGFyYW1zID0gcHMuY2hpbGRyZW4ubWFwKGMgPT4gYy52aXNpdCgpKVswXSB8fCBbXTtcbiAgICAgIHJldHVybiBidWlsZGVyLmFwcChydWxlLnZpc2l0KCksIHBhcmFtcykud2l0aFNvdXJjZSh0aGlzLnNvdXJjZSk7XG4gICAgfSxcbiAgICBCYXNlX3JhbmdlKGZyb20sIF8sIHRvKSB7XG4gICAgICByZXR1cm4gYnVpbGRlci5yYW5nZShmcm9tLnZpc2l0KCksIHRvLnZpc2l0KCkpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICAgIH0sXG4gICAgQmFzZV90ZXJtaW5hbChleHByKSB7XG4gICAgICByZXR1cm4gYnVpbGRlci50ZXJtaW5hbChleHByLnZpc2l0KCkpLndpdGhTb3VyY2UodGhpcy5zb3VyY2UpO1xuICAgIH0sXG4gICAgQmFzZV9wYXJlbihvcGVuLCB4LCBjbG9zZSkge1xuICAgICAgcmV0dXJuIHgudmlzaXQoKTtcbiAgICB9LFxuXG4gICAgcnVsZURlc2NyKG9wZW4sIHQsIGNsb3NlKSB7XG4gICAgICByZXR1cm4gdC52aXNpdCgpO1xuICAgIH0sXG4gICAgcnVsZURlc2NyVGV4dChfKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2VTdHJpbmcudHJpbSgpO1xuICAgIH0sXG5cbiAgICBjYXNlTmFtZShfLCBzcGFjZTEsIG4sIHNwYWNlMiwgZW5kKSB7XG4gICAgICByZXR1cm4gbi52aXNpdCgpO1xuICAgIH0sXG5cbiAgICBuYW1lKGZpcnN0LCByZXN0KSB7XG4gICAgICByZXR1cm4gdGhpcy5zb3VyY2VTdHJpbmc7XG4gICAgfSxcbiAgICBuYW1lRmlyc3QoZXhwcikge30sXG4gICAgbmFtZVJlc3QoZXhwcikge30sXG5cbiAgICB0ZXJtaW5hbChvcGVuLCBjcywgY2xvc2UpIHtcbiAgICAgIHJldHVybiBjcy5jaGlsZHJlbi5tYXAoYyA9PiBjLnZpc2l0KCkpLmpvaW4oJycpO1xuICAgIH0sXG5cbiAgICBvbmVDaGFyVGVybWluYWwob3BlbiwgYywgY2xvc2UpIHtcbiAgICAgIHJldHVybiBjLnZpc2l0KCk7XG4gICAgfSxcblxuICAgIGVzY2FwZUNoYXIoYykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGNvbW1vbi51bmVzY2FwZUNvZGVQb2ludCh0aGlzLnNvdXJjZVN0cmluZyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFJhbmdlRXJyb3IgJiYgZXJyLm1lc3NhZ2Uuc3RhcnRzV2l0aCgnSW52YWxpZCBjb2RlIHBvaW50ICcpKSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3JzLmludmFsaWRDb2RlUG9pbnQoYyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyOyAvLyBSZXRocm93XG4gICAgICB9XG4gICAgfSxcblxuICAgIE5vbmVtcHR5TGlzdE9mKHgsIF8sIHhzKSB7XG4gICAgICByZXR1cm4gW3gudmlzaXQoKV0uY29uY2F0KHhzLmNoaWxkcmVuLm1hcChjID0+IGMudmlzaXQoKSkpO1xuICAgIH0sXG4gICAgRW1wdHlMaXN0T2YoKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfSxcblxuICAgIF90ZXJtaW5hbCgpIHtcbiAgICAgIHJldHVybiB0aGlzLnNvdXJjZVN0cmluZztcbiAgICB9LFxuICB9KTtcbiAgcmV0dXJuIGhlbHBlcnMobWF0Y2gpLnZpc2l0KCk7XG59XG4iLCJpbXBvcnQge21ha2VSZWNpcGV9IGZyb20gJy4uL3NyYy9tYWluLWtlcm5lbC5qcyc7XG5leHBvcnQgZGVmYXVsdCBtYWtlUmVjaXBlKFtcImdyYW1tYXJcIix7XCJzb3VyY2VcIjpcIk9wZXJhdGlvbnNBbmRBdHRyaWJ1dGVzIHtcXG5cXG4gIEF0dHJpYnV0ZVNpZ25hdHVyZSA9XFxuICAgIG5hbWVcXG5cXG4gIE9wZXJhdGlvblNpZ25hdHVyZSA9XFxuICAgIG5hbWUgRm9ybWFscz9cXG5cXG4gIEZvcm1hbHNcXG4gICAgPSBcXFwiKFxcXCIgTGlzdE9mPG5hbWUsIFxcXCIsXFxcIj4gXFxcIilcXFwiXFxuXFxuICBuYW1lICAoYSBuYW1lKVxcbiAgICA9IG5hbWVGaXJzdCBuYW1lUmVzdCpcXG5cXG4gIG5hbWVGaXJzdFxcbiAgICA9IFxcXCJfXFxcIlxcbiAgICB8IGxldHRlclxcblxcbiAgbmFtZVJlc3RcXG4gICAgPSBcXFwiX1xcXCJcXG4gICAgfCBhbG51bVxcblxcbn1cIn0sXCJPcGVyYXRpb25zQW5kQXR0cmlidXRlc1wiLG51bGwsXCJBdHRyaWJ1dGVTaWduYXR1cmVcIix7XCJBdHRyaWJ1dGVTaWduYXR1cmVcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsyOSw1OF19LG51bGwsW10sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNTQsNThdfSxcIm5hbWVcIixbXV1dLFwiT3BlcmF0aW9uU2lnbmF0dXJlXCI6W1wiZGVmaW5lXCIse1wic291cmNlSW50ZXJ2YWxcIjpbNjIsMTAwXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4NywxMDBdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls4Nyw5MV19LFwibmFtZVwiLFtdXSxbXCJvcHRcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5MiwxMDBdfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOls5Miw5OV19LFwiRm9ybWFsc1wiLFtdXV1dXSxcIkZvcm1hbHNcIjpbXCJkZWZpbmVcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMDQsMTQzXX0sbnVsbCxbXSxbXCJzZXFcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTgsMTQzXX0sW1widGVybWluYWxcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMTgsMTIxXX0sXCIoXCJdLFtcImFwcFwiLHtcInNvdXJjZUludGVydmFsXCI6WzEyMiwxMzldfSxcIkxpc3RPZlwiLFtbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxMjksMTMzXX0sXCJuYW1lXCIsW11dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTM1LDEzOF19LFwiLFwiXV1dLFtcInRlcm1pbmFsXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMTQwLDE0M119LFwiKVwiXV1dLFwibmFtZVwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE0NywxODddfSxcImEgbmFtZVwiLFtdLFtcInNlcVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE2OCwxODddfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNjgsMTc3XX0sXCJuYW1lRmlyc3RcIixbXV0sW1wic3RhclwiLHtcInNvdXJjZUludGVydmFsXCI6WzE3OCwxODddfSxbXCJhcHBcIix7XCJzb3VyY2VJbnRlcnZhbFwiOlsxNzgsMTg2XX0sXCJuYW1lUmVzdFwiLFtdXV1dXSxcIm5hbWVGaXJzdFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzE5MSwyMjNdfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIwNywyMjNdfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzIwNywyMTBdfSxcIl9cIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjE3LDIyM119LFwibGV0dGVyXCIsW11dXV0sXCJuYW1lUmVzdFwiOltcImRlZmluZVwiLHtcInNvdXJjZUludGVydmFsXCI6WzIyNywyNTddfSxudWxsLFtdLFtcImFsdFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MiwyNTddfSxbXCJ0ZXJtaW5hbFwiLHtcInNvdXJjZUludGVydmFsXCI6WzI0MiwyNDVdfSxcIl9cIl0sW1wiYXBwXCIse1wic291cmNlSW50ZXJ2YWxcIjpbMjUyLDI1N119LFwiYWxudW1cIixbXV1dXX1dKTtcbiIsImltcG9ydCBvcGVyYXRpb25zQW5kQXR0cmlidXRlc0dyYW1tYXIgZnJvbSAnLi4vZGlzdC9vcGVyYXRpb25zLWFuZC1hdHRyaWJ1dGVzLmpzJztcbmltcG9ydCB7R3JhbW1hcn0gZnJvbSAnLi9HcmFtbWFyLmpzJztcbmltcG9ydCB7U2VtYW50aWNzfSBmcm9tICcuL1NlbWFudGljcy5qcyc7XG5cbmluaXRCdWlsdEluU2VtYW50aWNzKEdyYW1tYXIuQnVpbHRJblJ1bGVzKTtcbmluaXRQcm90b3R5cGVQYXJzZXIob3BlcmF0aW9uc0FuZEF0dHJpYnV0ZXNHcmFtbWFyKTsgLy8gcmVxdWlyZXMgQnVpbHRJblNlbWFudGljc1xuXG5mdW5jdGlvbiBpbml0QnVpbHRJblNlbWFudGljcyhidWlsdEluUnVsZXMpIHtcbiAgY29uc3QgYWN0aW9ucyA9IHtcbiAgICBlbXB0eSgpIHtcbiAgICAgIHJldHVybiB0aGlzLml0ZXJhdGlvbigpO1xuICAgIH0sXG4gICAgbm9uRW1wdHkoZmlyc3QsIF8sIHJlc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLml0ZXJhdGlvbihbZmlyc3RdLmNvbmNhdChyZXN0LmNoaWxkcmVuKSk7XG4gICAgfSxcbiAgICBzZWxmKC4uLl9jaGlsZHJlbikge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgfTtcblxuICBTZW1hbnRpY3MuQnVpbHRJblNlbWFudGljcyA9IFNlbWFudGljcy5jcmVhdGVTZW1hbnRpY3MoYnVpbHRJblJ1bGVzLCBudWxsKS5hZGRPcGVyYXRpb24oXG4gICAgJ2FzSXRlcmF0aW9uJyxcbiAgICB7XG4gICAgICBlbXB0eUxpc3RPZjogYWN0aW9ucy5lbXB0eSxcbiAgICAgIG5vbmVtcHR5TGlzdE9mOiBhY3Rpb25zLm5vbkVtcHR5LFxuICAgICAgRW1wdHlMaXN0T2Y6IGFjdGlvbnMuZW1wdHksXG4gICAgICBOb25lbXB0eUxpc3RPZjogYWN0aW9ucy5ub25FbXB0eSxcbiAgICAgIF9pdGVyOiBhY3Rpb25zLnNlbGYsXG4gICAgfVxuICApO1xufVxuXG5mdW5jdGlvbiBpbml0UHJvdG90eXBlUGFyc2VyKGdyYW1tYXIpIHtcbiAgU2VtYW50aWNzLnByb3RvdHlwZUdyYW1tYXJTZW1hbnRpY3MgPSBncmFtbWFyLmNyZWF0ZVNlbWFudGljcygpLmFkZE9wZXJhdGlvbigncGFyc2UnLCB7XG4gICAgQXR0cmlidXRlU2lnbmF0dXJlKG5hbWUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5hbWUucGFyc2UoKSxcbiAgICAgICAgZm9ybWFsczogW10sXG4gICAgICB9O1xuICAgIH0sXG4gICAgT3BlcmF0aW9uU2lnbmF0dXJlKG5hbWUsIG9wdEZvcm1hbHMpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5hbWUucGFyc2UoKSxcbiAgICAgICAgZm9ybWFsczogb3B0Rm9ybWFscy5jaGlsZHJlbi5tYXAoYyA9PiBjLnBhcnNlKCkpWzBdIHx8IFtdLFxuICAgICAgfTtcbiAgICB9LFxuICAgIEZvcm1hbHMob3BhcmVuLCBmcywgY3BhcmVuKSB7XG4gICAgICByZXR1cm4gZnMuYXNJdGVyYXRpb24oKS5jaGlsZHJlbi5tYXAoYyA9PiBjLnBhcnNlKCkpO1xuICAgIH0sXG4gICAgbmFtZShmaXJzdCwgcmVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMuc291cmNlU3RyaW5nO1xuICAgIH0sXG4gIH0pO1xuICBTZW1hbnRpY3MucHJvdG90eXBlR3JhbW1hciA9IGdyYW1tYXI7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZmluZEluZGVudGF0aW9uKGlucHV0KSB7XG4gIGxldCBwb3MgPSAwO1xuICBjb25zdCBzdGFjayA9IFswXTtcbiAgY29uc3QgdG9wT2ZTdGFjayA9ICgpID0+IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuXG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuXG4gIGNvbnN0IHJlZ2V4ID0gLyggKikuKig/OiR8XFxyP1xcbnxcXHIpL2c7XG4gIGxldCBtYXRjaDtcbiAgd2hpbGUgKChtYXRjaCA9IHJlZ2V4LmV4ZWMoaW5wdXQpKSAhPSBudWxsKSB7XG4gICAgY29uc3QgW2xpbmUsIGluZGVudF0gPSBtYXRjaDtcblxuICAgIC8vIFRoZSBsYXN0IG1hdGNoIHdpbGwgYWx3YXlzIGhhdmUgbGVuZ3RoIDAuIEluIGV2ZXJ5IG90aGVyIGNhc2UsIHNvbWVcbiAgICAvLyBjaGFyYWN0ZXJzIHdpbGwgYmUgbWF0Y2hlZCAocG9zc2libHkgb25seSB0aGUgZW5kIG9mIGxpbmUgY2hhcnMpLlxuICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkgYnJlYWs7XG5cbiAgICBjb25zdCBpbmRlbnRTaXplID0gaW5kZW50Lmxlbmd0aDtcbiAgICBjb25zdCBwcmV2U2l6ZSA9IHRvcE9mU3RhY2soKTtcblxuICAgIGNvbnN0IGluZGVudFBvcyA9IHBvcyArIGluZGVudFNpemU7XG5cbiAgICBpZiAoaW5kZW50U2l6ZSA+IHByZXZTaXplKSB7XG4gICAgICAvLyBJbmRlbnQgLS0gYWx3YXlzIG9ubHkgMS5cbiAgICAgIHN0YWNrLnB1c2goaW5kZW50U2l6ZSk7XG4gICAgICByZXN1bHRbaW5kZW50UG9zXSA9IDE7XG4gICAgfSBlbHNlIGlmIChpbmRlbnRTaXplIDwgcHJldlNpemUpIHtcbiAgICAgIC8vIERlZGVudCAtLSBjYW4gYmUgbXVsdGlwbGUgbGV2ZWxzLlxuICAgICAgY29uc3QgcHJldkxlbmd0aCA9IHN0YWNrLmxlbmd0aDtcbiAgICAgIHdoaWxlICh0b3BPZlN0YWNrKCkgIT09IGluZGVudFNpemUpIHtcbiAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICB9XG4gICAgICByZXN1bHRbaW5kZW50UG9zXSA9IC0xICogKHByZXZMZW5ndGggLSBzdGFjay5sZW5ndGgpO1xuICAgIH1cbiAgICBwb3MgKz0gbGluZS5sZW5ndGg7XG4gIH1cbiAgLy8gRW5zdXJlIHRoYXQgdGhlcmUgaXMgYSBtYXRjaGluZyBERURFTlQgZm9yIGV2ZXJ5IHJlbWFpbmluZyBJTkRFTlQuXG4gIGlmIChzdGFjay5sZW5ndGggPiAxKSB7XG4gICAgcmVzdWx0W3Bvc10gPSAxIC0gc3RhY2subGVuZ3RoO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG4iLCJpbXBvcnQgQnVpbHRJblJ1bGVzIGZyb20gJy4uL2Rpc3QvYnVpbHQtaW4tcnVsZXMuanMnO1xuaW1wb3J0IHtCdWlsZGVyfSBmcm9tICcuLi9zcmMvQnVpbGRlci5qcyc7XG5pbXBvcnQge0ZhaWx1cmV9IGZyb20gJy4uL3NyYy9GYWlsdXJlLmpzJztcbmltcG9ydCB7VGVybWluYWxOb2RlfSBmcm9tICcuLi9zcmMvbm9kZXMuanMnO1xuaW1wb3J0ICogYXMgcGV4cHJzIGZyb20gJy4uL3NyYy9wZXhwcnMuanMnO1xuaW1wb3J0IHtmaW5kSW5kZW50YXRpb259IGZyb20gJy4vZmluZEluZGVudGF0aW9uLmpzJztcbmltcG9ydCB7SW5wdXRTdHJlYW19IGZyb20gJy4vSW5wdXRTdHJlYW0uanMnO1xuXG5jb25zdCBJTkRFTlRfREVTQ1JJUFRJT04gPSAnYW4gaW5kZW50ZWQgYmxvY2snO1xuY29uc3QgREVERU5UX0RFU0NSSVBUSU9OID0gJ2EgZGVkZW50JztcblxuLy8gQSBzZW50aW5lbCB2YWx1ZSB0aGF0IGlzIG91dCBvZiByYW5nZSBmb3IgYm90aCBjaGFyQ29kZUF0KCkgYW5kIGNvZGVQb2ludEF0KCkuXG5jb25zdCBJTlZBTElEX0NPREVfUE9JTlQgPSAweDEwZmZmZiArIDE7XG5cbmNsYXNzIElucHV0U3RyZWFtV2l0aEluZGVudGF0aW9uIGV4dGVuZHMgSW5wdXRTdHJlYW0ge1xuICBjb25zdHJ1Y3RvcihzdGF0ZSkge1xuICAgIHN1cGVyKHN0YXRlLmlucHV0KTtcbiAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gIH1cblxuICBfaW5kZW50YXRpb25BdChwb3MpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS51c2VyRGF0YVtwb3NdIHx8IDA7XG4gIH1cblxuICBhdEVuZCgpIHtcbiAgICByZXR1cm4gc3VwZXIuYXRFbmQoKSAmJiB0aGlzLl9pbmRlbnRhdGlvbkF0KHRoaXMucG9zKSA9PT0gMDtcbiAgfVxuXG4gIG5leHQoKSB7XG4gICAgaWYgKHRoaXMuX2luZGVudGF0aW9uQXQodGhpcy5wb3MpICE9PSAwKSB7XG4gICAgICB0aGlzLmV4YW1pbmVkTGVuZ3RoID0gTWF0aC5tYXgodGhpcy5leGFtaW5lZExlbmd0aCwgdGhpcy5wb3MpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLm5leHQoKTtcbiAgfVxuXG4gIG5leHRDaGFyQ29kZSgpIHtcbiAgICBpZiAodGhpcy5faW5kZW50YXRpb25BdCh0aGlzLnBvcykgIT09IDApIHtcbiAgICAgIHRoaXMuZXhhbWluZWRMZW5ndGggPSBNYXRoLm1heCh0aGlzLmV4YW1pbmVkTGVuZ3RoLCB0aGlzLnBvcyk7XG4gICAgICByZXR1cm4gSU5WQUxJRF9DT0RFX1BPSU5UO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIubmV4dENoYXJDb2RlKCk7XG4gIH1cblxuICBuZXh0Q29kZVBvaW50KCkge1xuICAgIGlmICh0aGlzLl9pbmRlbnRhdGlvbkF0KHRoaXMucG9zKSAhPT0gMCkge1xuICAgICAgdGhpcy5leGFtaW5lZExlbmd0aCA9IE1hdGgubWF4KHRoaXMuZXhhbWluZWRMZW5ndGgsIHRoaXMucG9zKTtcbiAgICAgIHJldHVybiBJTlZBTElEX0NPREVfUE9JTlQ7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5uZXh0Q29kZVBvaW50KCk7XG4gIH1cbn1cblxuY2xhc3MgSW5kZW50YXRpb24gZXh0ZW5kcyBwZXhwcnMuUEV4cHIge1xuICBjb25zdHJ1Y3Rvcihpc0luZGVudCA9IHRydWUpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuaXNJbmRlbnQgPSBpc0luZGVudDtcbiAgfVxuXG4gIGFsbG93c1NraXBwaW5nUHJlY2VkaW5nU3BhY2UoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBldmFsKHN0YXRlKSB7XG4gICAgY29uc3Qge2lucHV0U3RyZWFtfSA9IHN0YXRlO1xuICAgIGNvbnN0IHBzZXVkb1Rva2VucyA9IHN0YXRlLnVzZXJEYXRhO1xuICAgIHN0YXRlLmRvTm90TWVtb2l6ZSA9IHRydWU7XG5cbiAgICBjb25zdCBvcmlnUG9zID0gaW5wdXRTdHJlYW0ucG9zO1xuXG4gICAgY29uc3Qgc2lnbiA9IHRoaXMuaXNJbmRlbnQgPyAxIDogLTE7XG4gICAgY29uc3QgY291bnQgPSAocHNldWRvVG9rZW5zW29yaWdQb3NdIHx8IDApICogc2lnbjtcbiAgICBpZiAoY291bnQgPiAwKSB7XG4gICAgICAvLyBVcGRhdGUgdGhlIGNvdW50IHRvIGNvbnN1bWUgdGhlIHBzZXVkb3Rva2VuLlxuICAgICAgc3RhdGUudXNlckRhdGEgPSBPYmplY3QuY3JlYXRlKHBzZXVkb1Rva2Vucyk7XG4gICAgICBzdGF0ZS51c2VyRGF0YVtvcmlnUG9zXSAtPSBzaWduO1xuXG4gICAgICBzdGF0ZS5wdXNoQmluZGluZyhuZXcgVGVybWluYWxOb2RlKDApLCBvcmlnUG9zKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5wcm9jZXNzRmFpbHVyZShvcmlnUG9zLCB0aGlzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBnZXRBcml0eSgpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIF9hc3NlcnRBbGxBcHBsaWNhdGlvbnNBcmVWYWxpZChydWxlTmFtZSwgZ3JhbW1hcikge31cblxuICBfaXNOdWxsYWJsZShncmFtbWFyLCBtZW1vKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYXNzZXJ0Q2hvaWNlc0hhdmVVbmlmb3JtQXJpdHkocnVsZU5hbWUpIHt9XG5cbiAgYXNzZXJ0SXRlcmF0ZWRFeHByc0FyZU5vdE51bGxhYmxlKGdyYW1tYXIpIHt9XG5cbiAgaW50cm9kdWNlUGFyYW1zKGZvcm1hbHMpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHN1YnN0aXR1dGVQYXJhbXMoYWN0dWFscykge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNJbmRlbnQgPyAnaW5kZW50JyA6ICdkZWRlbnQnO1xuICB9XG5cbiAgdG9EaXNwbGF5U3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cblxuICB0b0ZhaWx1cmUoZ3JhbW1hcikge1xuICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gdGhpcy5pc0luZGVudCA/IElOREVOVF9ERVNDUklQVElPTiA6IERFREVOVF9ERVNDUklQVElPTjtcbiAgICByZXR1cm4gbmV3IEZhaWx1cmUodGhpcywgZGVzY3JpcHRpb24sICdkZXNjcmlwdGlvbicpO1xuICB9XG59XG5cbi8vIENyZWF0ZSBhIG5ldyBkZWZpbml0aW9uIGZvciBgYW55YCB0aGF0IGNhbiBjb25zdW1lIGluZGVudCAmIGRlZGVudC5cbmNvbnN0IGFwcGx5SW5kZW50ID0gbmV3IHBleHBycy5BcHBseSgnaW5kZW50Jyk7XG5jb25zdCBhcHBseURlZGVudCA9IG5ldyBwZXhwcnMuQXBwbHkoJ2RlZGVudCcpO1xuY29uc3QgbmV3QW55Qm9keSA9IG5ldyBwZXhwcnMuU3BsaWNlKEJ1aWx0SW5SdWxlcywgJ2FueScsIFthcHBseUluZGVudCwgYXBwbHlEZWRlbnRdLCBbXSk7XG5cbmV4cG9ydCBjb25zdCBJbmRlbnRhdGlvblNlbnNpdGl2ZSA9IG5ldyBCdWlsZGVyKClcbiAgLm5ld0dyYW1tYXIoJ0luZGVudGF0aW9uU2Vuc2l0aXZlJylcbiAgLndpdGhTdXBlckdyYW1tYXIoQnVpbHRJblJ1bGVzKVxuICAuZGVmaW5lKCdpbmRlbnQnLCBbXSwgbmV3IEluZGVudGF0aW9uKHRydWUpLCBJTkRFTlRfREVTQ1JJUFRJT04sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgLmRlZmluZSgnZGVkZW50JywgW10sIG5ldyBJbmRlbnRhdGlvbihmYWxzZSksIERFREVOVF9ERVNDUklQVElPTiwgdW5kZWZpbmVkLCB0cnVlKVxuICAuZXh0ZW5kKCdhbnknLCBbXSwgbmV3QW55Qm9keSwgJ2FueSBjaGFyYWN0ZXInLCB1bmRlZmluZWQpXG4gIC5idWlsZCgpO1xuXG5PYmplY3QuYXNzaWduKEluZGVudGF0aW9uU2Vuc2l0aXZlLCB7XG4gIF9tYXRjaFN0YXRlSW5pdGlhbGl6ZXIoc3RhdGUpIHtcbiAgICBzdGF0ZS51c2VyRGF0YSA9IGZpbmRJbmRlbnRhdGlvbihzdGF0ZS5pbnB1dCk7XG4gICAgc3RhdGUuaW5wdXRTdHJlYW0gPSBuZXcgSW5wdXRTdHJlYW1XaXRoSW5kZW50YXRpb24oc3RhdGUpO1xuICB9LFxuICBzdXBwb3J0c0luY3JlbWVudGFsUGFyc2luZzogZmFsc2UsXG59KTtcbiIsIi8vIEdlbmVyYXRlZCBieSBzY3JpcHRzL3ByZWJ1aWxkLmpzXG5leHBvcnQgY29uc3QgdmVyc2lvbiA9ICcxNy4zLjAnO1xuIiwiaW1wb3J0IG9obUdyYW1tYXIgZnJvbSAnLi4vZGlzdC9vaG0tZ3JhbW1hci5qcyc7XG5pbXBvcnQge2J1aWxkR3JhbW1hcn0gZnJvbSAnLi9idWlsZEdyYW1tYXIuanMnO1xuaW1wb3J0ICogYXMgY29tbW9uIGZyb20gJy4vY29tbW9uLmpzJztcbmltcG9ydCAqIGFzIGVycm9ycyBmcm9tICcuL2Vycm9ycy5qcyc7XG5pbXBvcnQge0dyYW1tYXJ9IGZyb20gJy4vR3JhbW1hci5qcyc7XG5pbXBvcnQgKiBhcyBwZXhwcnMgZnJvbSAnLi9wZXhwcnMuanMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuL3V0aWwuanMnO1xuXG4vLyBMYXRlIGluaXRpYWxpemF0aW9uIGZvciBzdHVmZiB0aGF0IGlzIGJvb3RzdHJhcHBlZC5cblxuaW1wb3J0ICcuL3NlbWFudGljc0RlZmVycmVkSW5pdC5qcyc7IC8vIFRPRE86IENsZWFuIHRoaXMgdXAuXG5HcmFtbWFyLmluaXRBcHBsaWNhdGlvblBhcnNlcihvaG1HcmFtbWFyLCBidWlsZEdyYW1tYXIpO1xuXG5jb25zdCBpc0J1ZmZlciA9IG9iaiA9PlxuICAhIW9iai5jb25zdHJ1Y3RvciAmJlxuICB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopO1xuXG5mdW5jdGlvbiBjb21waWxlQW5kTG9hZChzb3VyY2UsIG5hbWVzcGFjZSkge1xuICBjb25zdCBtID0gb2htR3JhbW1hci5tYXRjaChzb3VyY2UsICdHcmFtbWFycycpO1xuICBpZiAobS5mYWlsZWQoKSkge1xuICAgIHRocm93IGVycm9ycy5ncmFtbWFyU3ludGF4RXJyb3IobSk7XG4gIH1cbiAgcmV0dXJuIGJ1aWxkR3JhbW1hcihtLCBuYW1lc3BhY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ3JhbW1hcihzb3VyY2UsIG9wdE5hbWVzcGFjZSkge1xuICBjb25zdCBucyA9IGdyYW1tYXJzKHNvdXJjZSwgb3B0TmFtZXNwYWNlKTtcblxuICAvLyBFbnN1cmUgdGhhdCB0aGUgc291cmNlIGNvbnRhaW5lZCBubyBtb3JlIHRoYW4gb25lIGdyYW1tYXIgZGVmaW5pdGlvbi5cbiAgY29uc3QgZ3JhbW1hck5hbWVzID0gT2JqZWN0LmtleXMobnMpO1xuICBpZiAoZ3JhbW1hck5hbWVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBncmFtbWFyIGRlZmluaXRpb24nKTtcbiAgfSBlbHNlIGlmIChncmFtbWFyTmFtZXMubGVuZ3RoID4gMSkge1xuICAgIGNvbnN0IHNlY29uZEdyYW1tYXIgPSBuc1tncmFtbWFyTmFtZXNbMV1dO1xuICAgIGNvbnN0IGludGVydmFsID0gc2Vjb25kR3JhbW1hci5zb3VyY2U7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgdXRpbC5nZXRMaW5lQW5kQ29sdW1uTWVzc2FnZShpbnRlcnZhbC5zb3VyY2VTdHJpbmcsIGludGVydmFsLnN0YXJ0SWR4KSArXG4gICAgICAgICdGb3VuZCBtb3JlIHRoYW4gb25lIGdyYW1tYXIgZGVmaW5pdGlvbiAtLSB1c2Ugb2htLmdyYW1tYXJzKCkgaW5zdGVhZC4nXG4gICAgKTtcbiAgfVxuICByZXR1cm4gbnNbZ3JhbW1hck5hbWVzWzBdXTsgLy8gUmV0dXJuIHRoZSBvbmUgYW5kIG9ubHkgZ3JhbW1hci5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdyYW1tYXJzKHNvdXJjZSwgb3B0TmFtZXNwYWNlKSB7XG4gIGNvbnN0IG5zID0gT2JqZWN0LmNyZWF0ZShvcHROYW1lc3BhY2UgfHwge30pO1xuICBpZiAodHlwZW9mIHNvdXJjZSAhPT0gJ3N0cmluZycpIHtcbiAgICAvLyBGb3IgY29udmVuaWVuY2UsIGRldGVjdCBOb2RlLmpzIEJ1ZmZlciBvYmplY3RzIGFuZCBhdXRvbWF0aWNhbGx5IGNhbGwgdG9TdHJpbmcoKS5cbiAgICBpZiAoaXNCdWZmZXIoc291cmNlKSkge1xuICAgICAgc291cmNlID0gc291cmNlLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdFeHBlY3RlZCBzdHJpbmcgYXMgZmlyc3QgYXJndW1lbnQsIGdvdCAnICsgY29tbW9uLnVuZXhwZWN0ZWRPYmpUb1N0cmluZyhzb3VyY2UpXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBjb21waWxlQW5kTG9hZChzb3VyY2UsIG5zKTtcbiAgcmV0dXJuIG5zO1xufVxuXG4vLyBUaGlzIGlzIHVzZWQgYnkgb2htLWVkaXRvciB0byBpbnN0YW50aWF0ZSBncmFtbWFycyBhZnRlciBpbmNyZW1lbnRhbFxuLy8gcGFyc2luZywgd2hpY2ggaXMgbm90IG90aGVyd2lzZSBzdXBwb3J0ZWQgaW4gdGhlIHB1YmxpYyBBUEkuXG5leHBvcnQge2J1aWxkR3JhbW1hciBhcyBfYnVpbGRHcmFtbWFyfTtcblxuZXhwb3J0ICogZnJvbSAnLi9tYWluLWtlcm5lbC5qcyc7XG5leHBvcnQge0luZGVudGF0aW9uU2Vuc2l0aXZlIGFzIEV4cGVyaW1lbnRhbEluZGVudGF0aW9uU2Vuc2l0aXZlfSBmcm9tICcuL0luZGVudGF0aW9uU2Vuc2l0aXZlLmpzJztcbmV4cG9ydCB7b2htR3JhbW1hcn07XG5leHBvcnQge3BleHByc307XG5leHBvcnQge3ZlcnNpb259IGZyb20gJy4vdmVyc2lvbi5qcyc7XG4iXSwibmFtZXMiOlsiY29tbW9uLmlzU3ludGFjdGljIiwicGV4cHJzLkFwcGx5IiwiY29tbW9uLnBhZExlZnQiLCJjb21tb24uU3RyaW5nQnVmZmVyIiwiY29tbW9uLmFzc2VydCIsInV0aWwuZ2V0TGluZUFuZENvbHVtbiIsInV0aWwuZ2V0TGluZUFuZENvbHVtbk1lc3NhZ2UiLCJlcnJvcnMuaW50ZXJ2YWxTb3VyY2VzRG9udE1hdGNoIiwiY29tbW9uLmRlZmluZUxhenlQcm9wZXJ0eSIsImNvbW1vbi5yZXBlYXQiLCJwZXhwcnMuUEV4cHIiLCJwZXhwcnMuYW55IiwicGV4cHJzLmVuZCIsInBleHBycy5UZXJtaW5hbCIsInBleHBycy5SYW5nZSIsInBleHBycy5Vbmljb2RlQ2hhciIsInBleHBycy5BbHQiLCJwZXhwcnMuSXRlciIsInBleHBycy5MZXgiLCJwZXhwcnMuTG9va2FoZWFkIiwicGV4cHJzLk5vdCIsInBleHBycy5QYXJhbSIsInBleHBycy5TZXEiLCJCdWlsdEluUnVsZXMiLCJ1dGlsLmF3YWl0QnVpbHRJblJ1bGVzIiwiZXJyb3JzLnVuZGVjbGFyZWRSdWxlIiwiZXJyb3JzLmFwcGxpY2F0aW9uT2ZTeW50YWN0aWNSdWxlRnJvbUxleGljYWxDb250ZXh0IiwiZXJyb3JzLndyb25nTnVtYmVyT2ZBcmd1bWVudHMiLCJlcnJvcnMuaW5jb3JyZWN0QXJndW1lbnRUeXBlIiwiZXJyb3JzLmFwcGx5U3ludGFjdGljV2l0aExleGljYWxSdWxlQXBwbGljYXRpb24iLCJlcnJvcnMudW5uZWNlc3NhcnlFeHBlcmltZW50YWxBcHBseVN5bnRhY3RpYyIsImVycm9ycy5pbnZhbGlkUGFyYW1ldGVyIiwiZXJyb3JzLmluY29uc2lzdGVudEFyaXR5IiwicGV4cHJzLkV4dGVuZCIsImVycm9ycy5rbGVlbmVFeHBySGFzTnVsbGFibGVPcGVyYW5kIiwicGV4cHJzLk9wdCIsImNvbW1vbi5pc0xleGljYWwiLCJjb21tb24uYWJzdHJhY3QiLCJwZXhwcnMuU3BsaWNlIiwicGV4cHJzLlN0YXIiLCJwZXhwcnMuUGx1cyIsInV0aWwudW5pcXVlSWQiLCJlcnJvcnMubWlzc2luZ1NlbWFudGljQWN0aW9uIiwiY29tbW9uLnVuZXhwZWN0ZWRPYmpUb1N0cmluZyIsIm9obUdyYW1tYXIiLCJidWlsZEdyYW1tYXIiLCJlcnJvcnMud3JvbmdOdW1iZXJPZlBhcmFtZXRlcnMiLCJwZXhwcnMuQ2FzZUluc2Vuc2l0aXZlVGVybWluYWwiLCJlcnJvcnMuY2Fubm90T3ZlcnJpZGVVbmRlY2xhcmVkUnVsZSIsImR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzIiwiZXJyb3JzLmR1cGxpY2F0ZVBhcmFtZXRlck5hbWVzIiwiZXJyb3JzLnRocm93RXJyb3JzIiwiZXJyb3JzLmR1cGxpY2F0ZVJ1bGVEZWNsYXJhdGlvbiIsImVycm9ycy5jYW5ub3RFeHRlbmRVbmRlY2xhcmVkUnVsZSIsImVycm9ycy5kdXBsaWNhdGVHcmFtbWFyRGVjbGFyYXRpb24iLCJlcnJvcnMudW5kZWNsYXJlZEdyYW1tYXIiLCJlcnJvcnMubXVsdGlwbGVTdXBlclNwbGljZXMiLCJjb21tb24udW5lc2NhcGVDb2RlUG9pbnQiLCJlcnJvcnMuaW52YWxpZENvZGVQb2ludCIsImVycm9ycy5ncmFtbWFyU3ludGF4RXJyb3IiXSwibWFwcGluZ3MiOiI7Ozs7OztFQUFBO0FBbUJBO0VBQ0E7RUFDQTtFQUNBO0FBQ0E7RUFDTyxTQUFTLFFBQVEsQ0FBQyxhQUFhLEVBQUU7RUFDeEMsRUFBRSxNQUFNLFVBQVUsR0FBRyxhQUFhLElBQUksRUFBRSxDQUFDO0VBQ3pDLEVBQUUsT0FBTyxZQUFZO0VBQ3JCLElBQUksTUFBTSxJQUFJLEtBQUs7RUFDbkIsTUFBTSxjQUFjO0VBQ3BCLFFBQVEsVUFBVTtFQUNsQixRQUFRLGdC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QUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztFQ0dqekcsT0FBTyxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7RUFDcEMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQzs7QUNKMUMsbUJBQWUsVUFBVSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLCs5RkFBKzlGLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENB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Q0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FB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
