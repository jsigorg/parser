'use strict';

var Parsimmon = require('parsimmon');

var lexemes = require('./lexemes.js');
var AST = require('../ast.js');
var join = require('./lib/join.js');

var innerTypes = Parsimmon.lazy(lazyAlt);

var unionType = Parsimmon.alt(
    join(innerTypes, lexemes.unionSeperator, 1)
        .map(function unpackUnions(unions) {
            if (unions.length === 1) {
                return unions[0];
            }

            return AST.union(unions);
        }),
    innerTypes
);

var intersectionType = Parsimmon.alt(
    join(unionType, lexemes.intersectionSeperator, 1)
        .map(function unpackIntersections(intersections) {
            if (intersections.length === 1) {
                return intersections[0];
            }

            return AST.intersection(intersections);
        }),
    unionType
);

var typeDeclaration = lexemes.label
    .chain(function captureLabels(labels) {
        return intersectionType.map(function toExpr(expr) {
            var label = labels[0] || null;
            var optional = typeof label === 'string' &&
                label.charAt(label.length - 1) === '?';

            if (optional) {
                label = label.substr(0, label.length - 1);
            }

            expr.label = label;
            expr.optional = optional;

            return expr;
        });
    });

var typeDeclarationWithParen = Parsimmon.alt(
    typeDeclaration,
    lexemes.openBrace
        .then(typeDeclaration)
        .skip(lexemes.closeBrace)
);

module.exports = typeDeclarationWithParen;

var typeExpression = require('./type-expression.js');
var typeFunction = require('./type-function.js');
var typeObject = require('./type-object.js');
var typeTuple = require('./type-tuple.js');

function lazyAlt() {
    var baseExpression = Parsimmon.alt(
        typeExpression,
        typeFunction,
        typeObject,
        typeTuple
    ).skip(Parsimmon.optWhitespace);

    return Parsimmon.alt(
        baseExpression,
        lexemes.openBrace
            .then(baseExpression)
            .skip(lexemes.closeBrace)
    );
}
