var DataMapping = require("./data-mapping").DataMapping,
    parse = require("frb/parse"),
    compile = require("frb/compile-evaluator"),
    Scope = require("frb/scope");


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
            this._objectDescriptorReference = deserializer.getProperty("objectDescriptor");
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
                this._requisitePropertyNames = value;
            }
        }
    },


    /***************************************************************************
     * Properties
     */

    service: {
        value: undefined
    },

    /**
     * The definition of the object that is to be mapped.
     */
    _objectDescriptorReference: {
        value: undefined
    },

    _objectMappingRules: {
        value: undefined
    },

    _rawDataMappingRules: {
        value: undefined
    },

    /**
     * The properties of the object that should participate in
     * eager mapping.
     */
    requisitePropertyNames: {
        get: function () {
            return this._requisitePropertyNames || [];
        }
    },

    _requisitePropertyNames: {
        value: undefined
    },

    _compiledObjectMappingRules: {
        get: function () {
            if (!this.__compiledObjectMappingRules) {
                var rules = {};
                this._mapRawRules(rules, this._rawDataMappingRules);
                this._mapRawRules(rules, this._objectMappingRules, true);
                this.__compiledObjectMappingRules = rules;

            }
            return this.__compiledObjectMappingRules;
        }
    },

    _compiledRawDataMappingRules: {
        get: function () {
            if (!this.__compiledRawDataMappingRules) {
                var rules = {};
                this._mapRawRules(rules, this._objectMappingRules);
                this._mapRawRules(rules, this._rawDataMappingRules, true);
                this.__compiledRawDataMappingRules = rules;

            }
            return this.__compiledObjectMappingRules;
        }
    },

    _mapRawRules: {
        value: function (rules, rawRules, addOneWayBindings) {
            var isOneWayBinding,
                isTwoWayBinding,
                shouldAddRule,
                propertyName,
                rawRule;
            for (propertyName in rawRules) {
                rawRule = rawRules[propertyName];
                isOneWayBinding = rawRule.hasOwnProperty(ONE_WAY_BINDING);
                isTwoWayBinding = !isOneWayBinding && rawRule.hasOwnProperty(TWO_WAY_BINDING);
                shouldAddRule = isOneWayBinding && addOneWayBindings || isTwoWayBinding;
                if (shouldAddRule) {
                    rules[propertyName] = {
                        converter: rawRule.converter,
                        expression: this._compileRuleExpression(rawRule[ONE_WAY_BINDING] || rawRule[TWO_WAY_BINDING])
                    }
                }
            }
        }
    },

    _compileRuleExpression: {
        value: function (rule) {
            return compile(parse(rule));
        }
    },

    /***************************************************************************
     * Mapping
     */

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
     * @argument {?} context     - A value that was passed in to the
     *                             [addRawData()]{@link DataService#addRawData}
     *                             call that invoked this method.
     */
    mapRawDataToObject: {
        value: function (data, object) {
            var requisitePropertyNames = this.requisitePropertyNames,
                rules = requisitePropertyNames.length && this._compiledObjectMappingRules || [],
                scope = requisitePropertyNames.length && new Scope(data),
                promises, rule, propertyName, propertyDescriptor, i, n;
            for (i = 0, n = requisitePropertyNames.length; i < n; i += 1) {
                propertyName = requisitePropertyNames[i];
                rule = rules.hasOwnProperty(propertyName) && rules[propertyName];
                propertyDescriptor = rule && this.objectDescriptor.propertyDescriptorForName(propertyName);
                if (propertyDescriptor && propertyDescriptor.valueDescriptor) {
                    promises = promises || [];
                    rule.converter.expression = rule.converter.expression || rule.expression;
                    rule.converter.foreignDescriptor = rule.converter.foreignDescriptor || propertyDescriptor.valueDescriptor;
                    rule.converter.service = rule.converter.service || this.service;
                    promises.push(this._resolveRelationship(object, propertyDescriptor, rule, scope));
                } else if (propertyDescriptor) {
                    object[propertyName] = this._parseRawData(rule, scope);
                } else {
                    console.warn("---------------------------------------------------");
                    console.warn("Did not map property with name (", propertyName, ")");
                    console.warn("Property not defined on this object descriptor (", this.objectDescriptor, ")");
                    console.warn("---------------------------------------------------");
                }
            }
            return promises && promises.length && Promise.all(promises) || Promise.resolve(null);
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

    _parseRawData: {
        value: function (rule, scope) {
            var value = rule.expression(scope);
            return rule.converter && rule.converter.convert(value) || value;
        }
    },

    /**
     * @todo Document.
     */
    mapObjectToRawData: {
        value: function (object, data) {


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

});
