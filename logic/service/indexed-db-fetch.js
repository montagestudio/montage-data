var DataSelector = require("logic/service/data-selector").DataSelector,
    DataStream = require("logic/service/data-stream").DataStream,
    Montage = require("montage/core/core").Montage,
    Promise = require("montage/core/promise").Promise;

var parse = require("frb/parse"),
    stringify = require("frb/stringify"),
    evaluate = require("frb/evaluate"),
    Scope = require("frb/scope"),
    compile = require("frb/compile-evaluator");

/**
 * TODO: Document
 *
 * @class
 * @extends Montage
 */
exports.IndexedDBFetch = IndexedDBFetch = Montage.specialize(/** @lends Montage.prototype */ {

    constructor: {
        value: function IndexedDBFetch() {
            Montage.call(this);
        }
    },

    fetch: {
        value: function (factory, dbName, dbVersion, stream) {
            var fetchHelper = this,
                dbOpenRequest = dbVersion ? factory.open(dbName, dbVersion) : factory.open(dbName);

            dbOpenRequest.onsuccess = function(event) {
                    var selector = stream.selector,
                        db = event.target.result,
                        criteria = selector.criteria;

                    fetchHelper.fetchTBD(fetchHelper, db, criteria.syntax, criteria.parameters, stream);
            }
        }
    },

    fetchTBD: {
        value: function (self, db, syntax, parameters, stream) {
            var syntaxType = syntax.type;

            switch (syntax.type) {
                case 'and':
                case 'not':
                case 'or':
                    self.fetchCompound(self, db, syntax, parameters, stream);
                    break;
                default:
                    self.fetchLeaf(self, db, syntax, parameters, stream);
                    break;
            }
        }
    },

    fetchCompound: {
        value: function (self, db, syntax, parameters, stream) {
            switch (syntax.type) {
                case 'and':
                    self.fetchAnd(self, db, syntax, parameters, stream);
                    break;
                case 'not':
                    self.fetchNot(self, db, syntax, parameters, stream);
                    break;
                case 'or':
                    self.fetchOr(self, db, syntax, parameters, stream);
                    break;
                default://TODO may need to generalize this further
                    break;
            }
        }
    },

    fetchAnd: {
        value: function (self, db, syntax, parameters, stream) {
            var streamLeft = DataStream.withTypeOrSelector(stream.selector),
                syntaxArgs = syntax.args
                syntaxLeft = syntaxArgs[0];

            self.fetchTBD(self, db, syntaxLeft, parameters, streamLeft);

            streamLeft.then(function (valueLeft) {
                var resultLeft = valueLeft,
                    resultLeftLength = resultLeft.length;

                if (resultLeftLength > 0) {
                    var streamRight = DataStream.withTypeOrSelector(stream.selector),
                        syntaxRight = syntaxArgs[1];

                    self.fetchTBD(self, db, syntaxRight, parameters, streamRight);

                    streamRight.then(function (valueRight) {
                        var resultRight = valueRight,
                            resultRightLength = resultRight.length;

                        if (resultRightLength > 0) {
                            var leftIsShorter = (resultLeftLength < resultRightLength),
                                shorterResult = leftIsShorter ? resultLeft : resultRight,
                                longerResult = leftIsShorter ? resultRight : resultLeft;

                            // This depends on the fact that the sources are the same for both right and left,
                            // as a poor man's deep object comparison.

                            var longerResultJSON = longerResult.map(function (r) { return JSON.stringify(r); });

                            longerResult.length = 0;

                            shorterResult.filter(function(value) {
                                return (longerResultJSON.indexOf(JSON.stringify(value)) >= 0);
                            }).map(function (r) { stream.addData(r); });
                        }

                        stream.dataDone();
                    }).catch(function (reason) {
                        stream.dataError(reason);
                    });
                }
                else {
                    stream.dataDone();
                }
            }).catch(function (reason) {
                stream.dataError(reason);
            });
        }
    },

    fetchNot: {
        value: function (self, db, syntax, parameters, stream) {
            var syntaxArgs = syntax.args,
                embeddedSyntax = syntaxArgs[0],
                embeddedStream = DataStream.withTypeOrSelector(stream.selector);

            self.fetchTBD(self, db, embeddedSyntax, parameters, embeddedStream);

            embeddedStream.then(function (embeddedResult) {
                var storeName = stream.selector.type,
                    trans = db.transaction(storeName, 'readonly'),
                    objectStore = trans.objectStore(storeName),
                    cursorOrigin = objectStore,
                    embeddedResultJSON = embeddedResult.map(function (r) { return JSON.stringify(r); });

                cursorOrigin.openCursor().onsuccess = function (event) {//TODO might need an onError
                    var cursor = event.target.result;

                    if (cursor) {
                        var currentCursorValue = cursor.value;

                        if (embeddedResultJSON.indexOf(JSON.stringify(currentCursorValue)) < 0) {
                            stream.addData(currentCursorValue);
                        }

                        cursor.continue();
                    }
                    else {
                        stream.dataDone();
                    }
                }
            }).catch(function (reason) {
                stream.dataError(reason);
            });
        }
    },

    fetchOr: {
        value: function (self, db, syntax, parameters, stream) {
            var streamLeft = DataStream.withTypeOrSelector(stream.selector),
                streamRight = DataStream.withTypeOrSelector(stream.selector),
                syntaxArgs = syntax.args,
                syntaxLeft = syntaxArgs[0],
                syntaxRight = syntaxArgs[1];

            self.fetchTBD(self, db, syntaxLeft, parameters, streamLeft);
            self.fetchTBD(self, db, syntaxRight, parameters, streamRight);

            Promise.all([streamLeft, streamRight]).then(function (values) {
                var valuesSet = new Set();

                values.forEach(v => Array.isArray(v) ? v.forEach(vv => valuesSet.add(JSON.stringify(vv))) : valuesSet.add(JSON.stringify(v)));

                values.length = 0;

                valuesSet.forEach(value => stream.addData(JSON.parse(value)));

                stream.dataDone();
            }).catch(function (reason) {
                stream.dataError(reason);
            });
        }
    },

    fetchLeaf: {
        value: function (self, db, syntax, parameters, stream) {
            switch (syntax.type) {
                case 'equals':
                case 'in':
                    self.fetchLeaf_inEquals(self, db, syntax, parameters, stream);
                    break;
                default:
                    self.fetchLeaf_generic(self, db, syntax, parameters, stream);
                    break;
            }
        }
    },

    fetchLeaf_inEquals: {
        value: function (self, db, syntax, parameters, stream) {
            var syntaxArgs = syntax.args,
                leftExpression = syntaxArgs[0],
                leftValue = self.valueForSyntax(self, leftExpression, parameters),
                rightExpression = syntaxArgs[1],
                rightValue = self.valueForSyntax(self, rightExpression, parameters),
                indexName = undefined,
                comparisonValues = undefined;

            if (leftValue) {
                comparisonValues = leftValue['valueForSyntax'];
                indexName = self.indexNameForSyntax(self, rightExpression, parameters)['indexNameForSyntax'];
            }//TODO may need to do more than ELSE here
            else {
                comparisonValues = rightValue['valueForSyntax'];
                indexName = self.indexNameForSyntax(self, leftExpression, parameters)['indexNameForSyntax'];
            }

            if (comparisonValues.length > 0) {
                var storeName = stream.selector.type,
                    trans = db.transaction(storeName, 'readonly'),
                    objectStore = trans.objectStore(storeName),
                    indexAvailable = objectStore.indexNames.contains(indexName),
                    cursorOrigin = indexAvailable ? objectStore.index(indexName) : objectStore,
                    sortedComparisonValues = comparisonValues.sort(),
                    scvLength = sortedComparisonValues.length,
                    scvIndex = 0,
                    currentComparisonValue = sortedComparisonValues[scvIndex];

                cursorOrigin.openCursor().onsuccess = function (event) {//TODO might need an onError
                    var cursor = event.target.result;

                    if (cursor) {
                        var currentCursorKey = cursor.key;

                        if (indexAvailable) {
                            if (currentCursorKey == currentComparisonValue) {
                                stream.addData(cursor.value);
                                cursor.continue();
                            }
                            else {
                                while (currentCursorKey > sortedComparisonValues[scvIndex]) {
                                    scvIndex += 1;

                                    if (scvIndex >= scvLength) {
                                        stream.dataDone();
                                    }
                                }

                                currentComparisonValue = sortedComparisonValues[scvIndex];
                                cursor.continue(currentComparisonValue);
                            }
                        }
                        else {
                            if (sortedComparisonValues.contains(currentComparisonValue)) {
                                stream.addData(cursor.value);
                            }

                            cursor.continue();
                        }
                    }
                    else {
                        stream.dataDone();
                    }
                }
            }
            else {
                stream.dataDone();
            }
        }
    },

    indexNameForSyntax: {
        value: function (self, syntax, parameters) {
            var result = undefined;

            if (syntax.type == 'property') {
                var syntaxArgs = syntax.args;

                if (syntaxArgs[0].type == 'value') {
                    var significantArg = syntaxArgs[1];

                    if (significantArg.type == 'literal') {
                        result = { 'indexNameForSyntax': significantArg.value };
                    }
                    //TODO may need to do more here
                }
            }

            return result;
        }
    },

    valueForSyntax: {
        value: function (self, syntax, parameters) {
            var result = undefined;

            if (syntax.type == 'literal') {
                result = syntax.value;
            }
            else if (syntax.type == 'property') {
                var syntaxArgs = syntax.args;

                if (syntaxArgs[0].type == 'parameters') {
                    var significantArg = syntaxArgs[1];

                    if (significantArg.type == 'literal') {
                        result = parameters[significantArg.value];
                    }
                    //TODO may need to do more here
                }
            }

            if (result) {
                if (!Array.isArray(result)) {
                    var r = new Array();

                    r.push(result);

                    result = r;
                }

                result = { 'valueForSyntax': result };
            }

            return result;
        }
    },

    fetchLeaf_generic: {
        value: function (self, db, syntax, parameters, stream) {
            var compiledSyntax = compile(syntax),
                scope = new Scope(),
                storeName = stream.selector.type,
                trans = db.transaction(storeName, 'readonly'),
                objectStore = trans.objectStore(storeName),
                cursorOrigin = objectStore;

            scope.parameters = parameters;

            cursorOrigin.openCursor().onsuccess = function (event) {//TODO might need an onError
                var cursor = event.target.result;

                if (cursor) {
                    scope.value = cursor.value;

                    if (compiledSyntax(scope) === true) {
                        stream.addData(cursor.value);
                    }

                    cursor.continue();
                }
                else {
                    stream.dataDone();
                }
            }
        }
    }

});
