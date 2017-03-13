var DataMapping = require("./data-mapping").DataMapping,
    assign = require("frb/assign"),
    compile = require("frb/compile-evaluator"),
    ObjectDescriptorReference = require("montage/core/meta/object-descriptor-reference").ObjectDescriptorReference,
    parse = require("frb/parse"),
    Promise = require("montage/core/promise").Promise,
    Scope = require("frb/scope"),
    Promise = require("montage/core/promise").Promise,
    Set = require("collections/set");


var ONE_WAY_BINDING = "<-";
var TWO_WAY_BINDING = "<->";

/**
 * Maps raw data to data objects, using FRB expressions, of a specific type.
 *
 * TODO: Write more thorough description.
 *
 * @class ExpressionDataMapping
 * @extends external:DataMapping
 */
exports.ExpressionDataMapping = DataMapping.specialize(/** @lends DataMapping.prototype */ {

    /***************************************************************************
     * Serialization
     */

    serializeSelf: {
        value: function (serializer) {
            // serializer.setProperty("name", this.name);
            // if ((this._model) && (!this.model.isDefault)) {
            //     serializer.setProperty("model", this._model, "reference");
            // }
            //
            // if (this.objectDescriptorInstanceModule) {
            //     serializer.setProperty("objectDescriptorModule", this.objectDescriptorInstanceModule);
            // }
        }
    },

    deserializeSelf: {
        value: function (deserializer) {
            var value;
            this.objectDescriptorReference = deserializer.getProperty("objectDescriptor");
            this.schemaReference = deserializer.getProperty("schema");

            value = deserializer.getProperty("objectMapping");
            if (value) {
                this._objectMappingRules = value.rules;
            }
            value = deserializer.getProperty("rawDataMapping");
            if (value) {
                this._rawDataMappingRules = value.rules;
            }
            value = deserializer.getProperty("requisitePropertyNames");
            if (value) {
                this.addRequisitePropertyName.apply(this, value);
            }
        }
    },

    /**
     * @param   {ObjectDescriptor}
     *          objectDescriptor       - the definition of the objects
     *                                   mapped by this mapping.
     * @param   {DataService} service  - the data service this mapping should use.
     * @return itself
     */
    initWithServiceObjectDescriptorAndSchema: {
        value: function (service, objectDescriptor, schema) {
            this.service = service;
            this.objectDescriptor = objectDescriptor;
            this.schemaDescriptor = schema;
            return this;
        }
    },

    resolveReferences: {
        value: function () {
            var self = this;
            return this._resolveObjectDescriptorReferenceIfNecessary().then(function () {
                return self._resolveSchemaReferenceIfNecessary();
            });
        }
    },

    _resolveObjectDescriptorReferenceIfNecessary: {
        value: function () {
            var self = this,
                requiresInitialization = !this.objectDescriptor && this.objectDescriptorReference,
                promise = requiresInitialization ?  this.objectDescriptorReference.promise(require) :
                                                    Promise.resolve(null);
            return promise.then(function (objectDescriptor) {
                if (objectDescriptor) {
                    self.objectDescriptor = objectDescriptor;
                }
                return null;
            });
        }
    },

    _resolveSchemaReferenceIfNecessary: {
        value: function () {
            var self = this,
                requiresInitialization = !this.schemaDescriptor && this.schemaDescriptorReference,
                promise = requiresInitialization ?  this.schemaReference.promise(require) :
                                                    Promise.resolve(null);
            return promise.then(function (objectDescriptor) {
                if (objectDescriptor) {
                    self.schemaDescriptor = objectDescriptor;
                }
                return null;
            });
        }
    },

    /***************************************************************************
     * Properties
     */

    /**
     * The descriptor of the objects that are mapped by this
     * data mapping.
     * @type {ObjectDescriptor}
     */
    objectDescriptor: {
        get: function () {
            return this._objectDescriptor;
        },
        set: function (value) {
            this._objectDescriptor = value;
            this._objectDescriptorReference = new ObjectDescriptorReference().initWithValue(value);
        }
    },

    /**
     * The descriptor of the "raw data" mapped by this
     * data mapping.
     * @type {ObjectDescriptor}
     */
    schemaDescriptor: {
        get: function () {
            return this._schemaDescriptor;
        },
        set: function (value) {
            this._schemaDescriptor = value;
            this._schemaDescriptorReference = new ObjectDescriptorReference().initWithValue(value);
        }
    },

    /**
     * A reference to the object descriptor that is used
     * by this mapping.  Used by serialized data mappings.
     * @type {ObjectDescriptorReference}
     */
    objectDescriptorReference: {
        get: function () {
            return  this._objectDescriptorReference ?   this._objectDescriptorReference.promise(require) :
                                                        Promise.resolve(null);
        },
        set: function (value) {
            this._objectDescriptorReference = value;
        }
    },

    schemaDescriptorReference: {
        get: function () {
            return  this._schemaDescriptorReference ?   this._schemaDescriptorReference.promise(require) :
                                                        Promise.resolve(null);
        },
        set: function (value) {
            this._schemaDescriptorReference = value;
        }
    },

    /**
     * The service that owns this mapping object.
     * Used to create fetches for relationships.
     * @type {DataService}
     */
    service: {
        value: undefined
    },

    /**
     * Adds a name to the list of properties that will participate in
     * eager mapping.  The requisite property names will be mapped
     * during the map from raw data phase.
     * @param {...string} propertyName
     */
    addRequisitePropertyName: {
        value: function () {
            // TODO: update after changing requisitePropertyNames to a set.
            var i, length, arg;
            for (i = 0, length = arguments.length; i < length; i += 1) {
                arg = arguments[i];
                if (!this._requisitePropertyNames.has(arg)) {
                    this._requisitePropertyNames.add(arg);
                }
            }
        }
    },

    /**
     * @return {Set}
     */
    requisitePropertyNames: {
        get: function () {
            return this._requisitePropertyNames;
        }
    },

    /***************************************************************************
     * Mapping
     */

    /**
     * Adds a rule to be used for mapping objects to raw data.
     * @param {string} targetPath   - The path to assign on the target
     * @param {object} rule         - The rule to be used when processing
     *                                the mapping.  The rule must contain
     *                                the direction and path of the properties
     *                                to map.  Optionally can include
     *                                a converter.
     */
    addObjectMappingRule: {
        value: function (targetPath, rule) {
            var rawRule = {};
            rawRule[targetPath] = rule;
            this._mapObjectMappingRules(rawRule, true);
            this._mapRawDataMappingRules(rawRule);
        }
    },

    /**
     * Adds a rule to be used for mapping raw data to objects.
     * @param {string} targetPath   - The path to assign on the target
     * @param {object} rule         - The rule to be used when processing
     *                                the mapping.  The rule must contain
     *                                the direction and path of the properties
     *                                to map.  Optionally can include
     *                                a converter.
     */
    addRawDataMappingRule: {
        value: function (targetPath, rule) {
            var rawRule = {};
            rawRule[targetPath] = rule;
            this._mapRawDataMappingRules(rawRule, true);
            this._mapObjectMappingRules(rawRule);
        }
    },

    /**
     * Convert raw data to data objects of an appropriate type.
     *
     * Subclasses should override this method to map properties of the raw data
     * to data objects, as in the following:
     *
     *     mapRawDataToObject: {
     *         value: function (object, data) {
     *             object.firstName = data.GIVEN_NAME;
     *             object.lastName = data.FAMILY_NAME;
     *         }
     *     }
     *
     * The default implementation of this method copies the properties defined
     * by the raw data object to the data object.
     *
     * @method
     * @argument {Object} object - An object whose properties must be set or
     *                             modified to represent the raw data.
     * @argument {Object} data   - An object whose properties' values hold
     *                             the raw data.
     */
    mapRawDataToObject: {
        value: function (data, object) {
            var requisitePropertyNames = this._requisitePropertyNames,
                self = requisitePropertyNames.size && this,
                rules = self && this._compiledObjectMappingRules || [],
                scope = self && new Scope(data),
                promises, rule, propertyDescriptor;

            requisitePropertyNames.forEach(function (propertyName) {
                rule = rules.hasOwnProperty(propertyName) && rules[propertyName];
                propertyDescriptor = rule && self.objectDescriptor.propertyDescriptorForName(propertyName);
                if (propertyDescriptor && propertyDescriptor.valueDescriptor && rule.converter) {
                    promises = promises || [];
                    rule.converter.expression = rule.converter.expression || rule.expression;
                    rule.converter.foreignDescriptor = rule.converter.foreignDescriptor || propertyDescriptor.valueDescriptor;
                    rule.converter.service = rule.converter.service || self.service;
                    promises.push(self._resolveRelationship(object, propertyDescriptor, rule, scope));
                } else if (propertyDescriptor) {
                    object[propertyName] = self._parseRawData(rule, scope);
                } else {
                    console.warn("---------------------------------------------------");
                    console.warn("Did not map property with name (", propertyName, ")");
                    console.warn("Property not defined on this object descriptor (", self.objectDescriptor, ")");
                    console.warn("---------------------------------------------------");
                }
            });

            return promises && promises.length && Promise.all(promises) || Promise.resolve(null);
        }
    },

    /**
     * @todo Document.
     */
    mapObjectToRawData: {
        value: function (object, data) {
            var self = this,
                rules = this._compiledRawDataMappingRules,
                scope = new Scope(object),
                promises, propertyDescriptor, rule, key;
            for (key in rules) {
                rule = rules[key];
                propertyDescriptor = rule.propertyDescriptor;
                if (propertyDescriptor && propertyDescriptor.valueDescriptor && rule.converter) {
                    promises = promises || [];
                    rule.converter.expression = rule.converter.expression || rule.expression;
                    rule.converter.foreignDescriptor = rule.converter.foreignDescriptor || propertyDescriptor.valueDescriptor;
                    rule.converter.service = rule.converter.service || self.service;
                    promises.push(self._convertRelationshipToRawData());
                } else if (propertyDescriptor) {
                    data[key] = this._parseObject(rule, scope);
                }
            }
            return promises && promises.length && Promise.all(promises) || Promise.resolve(null);
        }
    },

    _compiledObjectMappingRules: {
        get: function () {
            if (!this.__compiledObjectMappingRules) {
                this.__compiledObjectMappingRules = {};
                this._mapObjectMappingRules(this._rawDataMappingRules);
                this._mapObjectMappingRules(this._objectMappingRules, true);
            }
            return this.__compiledObjectMappingRules;
        }
    },

    _compiledRawDataMappingRules: {
        get: function () {
            if (!this.__compiledRawDataMappingRules) {
                this.__compiledRawDataMappingRules = {};
                this._mapRawDataMappingRules(this._objectMappingRules);
                this._mapRawDataMappingRules(this._rawDataMappingRules, true);
            }
            return this.__compiledRawDataMappingRules;
        }
    },

    _rawDataMappingRules: {
        value: undefined
    },

    _requisitePropertyNames: {
        get: function () {
            if (!this.__requisitePropertyNames) {
                this.__requisitePropertyNames = new Set();
            }
            return this.__requisitePropertyNames;
        }
    },

    _mapObjectMappingRules: {
        value: function (rawRules, addOneWayBindings) {
            var rules = this._compiledObjectMappingRules,
                propertyName, rawRule, rule, targetPath;
            for (propertyName in rawRules) {
                rawRule = rawRules[propertyName];
                if (this._shouldMapRule(rawRule, addOneWayBindings)) {
                    targetPath = addOneWayBindings && propertyName || rawRule[TWO_WAY_BINDING];
                    rule = addOneWayBindings ?  this._mapRule(rawRule) :
                        this._mapReverseRule({"<->": propertyName, converter: rawRule.converter});
                    rule.converter = rule.converter || this._defaultConverter(propertyName, targetPath);
                    rules[targetPath] = rule;
                }
            }
        }
    },

    _mapRawDataMappingRules: {
        value: function (rawRules, addOneWayBindings) {
            var rules = this._compiledRawDataMappingRules,
                propertyName, propertyDescriptorName, propertyDescriptor, rawRule, rule, targetPath;
            for (propertyName in rawRules) {
                rawRule = rawRules[propertyName];
                if (this._shouldMapRule(rawRule, addOneWayBindings)) {
                    propertyDescriptorName = addOneWayBindings ? rawRule[ONE_WAY_BINDING] || rawRule[TWO_WAY_BINDING] :
                        propertyName;
                    propertyDescriptor = this.objectDescriptor.propertyDescriptorForName(propertyDescriptorName);
                    targetPath = addOneWayBindings && propertyName || rawRule[TWO_WAY_BINDING];
                    rule = addOneWayBindings ?  this._mapRule(rawRule) :
                                                this._mapReverseRule({"<->": propertyName, converter: rawRule.converter});
                    rule.converter = rule.converter || this._defaultConverter(propertyName, targetPath);
                    rule.propertyDescriptor = propertyDescriptor;
                    rules[targetPath] = rule;
                }
            }
        }
    },

    _mapRule: {
        value: function (rawRule) {
            var sourcePath = rawRule[ONE_WAY_BINDING] || rawRule[TWO_WAY_BINDING];
            return {
                converter: rawRule.converter,
                expression: this._compileRuleExpression(sourcePath)
            };
        }
    },

    _mapReverseRule: {
        value: function (rawRule) {
            var sourcePath = rawRule[TWO_WAY_BINDING];
            return {
                converter: rawRule.converter,
                expression: this._compileRuleExpression(sourcePath)
            };
        }
    },

    _convertRelationshipToRawData: {
        value: function (object, propertyDescriptor, rule) {
            return this._resolveRelationshipIfNecessary(object, propertyDescriptor).then(function (destination) {
                return rule.converter.revert(new Scope(destination));
            });
        }
    },

    _resolveRelationship: {
        value: function (object, propertyDescriptor, rule, scope) {
            return rule.converter.convert(scope).then(function (data) {
                object[propertyDescriptor.name] = propertyDescriptor.cardinality === 1 ? data[0] : data;
                return null;
            });
        }
    },

    _resolveRelationshipIfNecessary: {
        value: function (object, propertyDescriptor) {
            var wasPropertyFetched = this._requisitePropertyNames.has(propertyDescriptor.name);
            return wasPropertyFetched ?     Promise.resolve(object[propertyDescriptor.name]) :
                                            object[propertyDescriptor.name]; // should be data trigger.
        }
    },

    _compileRuleExpression: {
        value: function (rule) {
            return compile(parse(rule));
        }
    },

    _parseRawData: {
        value: function (rule, scope) {
            var value = rule.expression(scope);
            return rule.converter && rule.converter.convert(value) || value;
        }
    },

    _parseObject: {
        value: function (rule, scope) {
            var value = rule.expression(scope);
            return rule.converter && rule.converter.revert(value) || value;
        }
    },

    _shouldMapRule: {
        value: function (rawRule, addOneWayBindings) {
            var isOneWayBinding = rawRule.hasOwnProperty(ONE_WAY_BINDING),
                isTwoWayBinding = !isOneWayBinding && rawRule.hasOwnProperty(TWO_WAY_BINDING);
            return isOneWayBinding && addOneWayBindings || isTwoWayBinding;
        }
    },

    _defaultConverter: {
        value: function (sourcePath, targetPath) {
            var sourceDescriptor = this.objectDescriptor && this.objectDescriptor.propertyDescriptorForName(sourcePath),
                targetDescriptor = this.schemaDescriptor && this.schemaDescriptor.propertyDescriptorForName(targetPath),
                sourceDescriptorValueType = sourceDescriptor && sourceDescriptor.valueType,
                targetDescriptorValueType = targetDescriptor && targetDescriptor.valueType;

            return  sourceDescriptor && targetDescriptor &&
                    sourceDescriptorValueType !== targetDescriptorValueType ?
                        this._converterForValueTypes(sourceDescriptorValueType, targetDescriptorValueType) :
                        null;

        }
    },


    _converterForValueTypes: {
        value: function (sourceType, destinationType) {
            var converters = exports.ExpressionDataMapping.defaultConverters;
            return converters[sourceType] && converters[sourceType][destinationType] || null;
        }
    },

    /***************************************************************************
     * Deprecated
     */

    /**
     * @todo Document deprecation in favor of
     * [mapRawDataToObject()]{@link DataMapping#mapRawDataToObject}
     */
    mapFromRawData: {
        value: function (object, record, context) {
            return this.mapRawDataToObject(record, object, context);
        }
    },

    /**
     * @todo Document deprecation in favor of
     * [mapObjectToRawData()]{@link DataMapping#mapObjectToRawData}
     */
    mapToRawData: {
        value: function (object, record) {
            this.mapObjectToRawData(object, record);
        }
    }

}, {

    defaultConverters: {
        get: function () {
            if (!exports.ExpressionDataMapping._defaultConverters) {
                var defaultConverters = {};
                exports.ExpressionDataMapping._addDefaultConvertersToMap(defaultConverters);
                exports.ExpressionDataMapping._defaultConverters = defaultConverters;
            }
            return exports.ExpressionDataMapping._defaultConverters;
        }
    },

    _addDefaultConvertersToMap: {
        value: function (converters) {
            exports.ExpressionDataMapping._addDefaultBooleanConvertersToConverters(converters);
            exports.ExpressionDataMapping._addDefaultNumberConvertersToConverters(converters);
            exports.ExpressionDataMapping._addDefaultStringConvertersToConverters(converters);
        }
    },

    _addDefaultBooleanConvertersToConverters: {
        value: function (converters) {
            var booleanConverters = {};
            booleanConverters["string"] = Object.create({}, {
                convert: {
                    value: function (value) {
                        return Boolean(value);
                    }
                },
                revert: {
                    value: function (value) {
                        return String(value);
                    }
                }
            });
            booleanConverters["number"] = Object.create({}, {
                convert: {
                    value: function (value) {
                        return Boolean(value);
                    }
                },
                revert: {
                    value: function (value) {
                        return Number(value);
                    }
                }
            });
            converters["boolean"] = booleanConverters;
        }
    },

    _addDefaultNumberConvertersToConverters: {
        value: function (converters) {
            var numberConverters = {};
            numberConverters["string"] = Object.create({}, {
                convert: {
                    value: function (value) {
                        return Number(value);
                    }
                },
                revert: {
                    value: function (value) {
                        return String(value);
                    }
                }
            });
            numberConverters["boolean"] = Object.create({}, {
                convert: {
                    value: function (value) {
                        return Number(value);
                    }
                },
                revert: {
                    value: function (value) {
                        return Boolean(value);
                    }
                }
            });
            converters["number"] = numberConverters;
        }
    },

    _addDefaultStringConvertersToConverters: {
        value: function (converters) {
            var stringConverters = {};
            stringConverters["number"] = Object.create({}, {
                convert: {
                    value: function (value) {
                        return String(value);
                    }
                },
                revert: {
                    value: function (value) {
                        return Number(value);
                    }
                }
            });
            stringConverters["boolean"] = Object.create({}, {
                convert: {
                    value: function (value) {
                        return String(value);
                    }
                },
                revert: {
                    value: function (value) {
                        return Boolean(value);
                    }
                }
            });
            converters["string"] = stringConverters;
        }
    }

});
