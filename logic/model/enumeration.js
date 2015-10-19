var Montage = require("montage").Montage;

/**
 * Subclasses of this class represent enumerated types. Instances of those
 * subclasses represent possible values of those types. Enumerated type
 * subclasses and their possible values can be defined as in the following:
 *
 *     exports.Suit = Enumeration.specialize("id", "name", {
 *         SPADES: [0, "Spade"],
 *         HEARTS: [1, "Heart"],
 *         DIAMONDS: [2, "Diamond"],
 *         CLUBS: [3, "Club"]
 *     });
 *
 *     // To be use like this:
 *     myCard = {value: 12, suit: Suit.HEARTS};
 *
 * Enumerated types can also be defined as class properties using the
 * [getterFor()]{@link #Enumeration.getterFor}, as in the following:
 *
 *     exports.Card = Montage.specialize({
 *         value: {
 *             value: undefined
 *         }
 *         suit: {
 *             value: undefined
 *         }
 *     }, {
 *         Suit: {
 *             get: Enumeration.getterFor("_Suit", "id", "name", {
 *                 SPADES: [1, "Spade"],
 *                 HEARTS: [2, "Heart"],
 *                 DIAMONDS: [3, "Diamond"],
 *                 CLUBS: [4, "Club"]
 *             })
 *         }
 *     });
 *
 *     // To be use like this:
 *     myCard = new Card();
 *     myCard.value = 12;
 *     myCard.suit = Card.Suit.HEARTS;
 *
 * In addition to being defined as shown above, instances of enumerated type
 * subclasses can be created with a `create()` class method defined for each
 * subclass, as in the following:
 *
 *     Card.Suit.ROSES = Card.Suit.create(5, "Roses");
 *
 * Once instances of an enumerated type subclass are created they can be looked
 * up by any of the type's unique properties, as in
 * the following:
 *
 *     myCard.value = Math.floor(1 + 13 * Math.random());
 *     myCard.suit = Card.Suit.forId(Math.floor(1 + 4 * Math.random()));
 *
 * @class
 * @extends external:Montage
 */
exports.Enumeration = Montage.specialize({}, /** @lends Enumeration */ {

    /**
     * Creates a new enumeration subclass with the specified attributes.
     *
     * @method
     * @argument {?Array.<string>|?string} uniquePropertyNames
     * @argument {?Array.<string>|?...string} otherPropertyNames
     * @argument {?Object} prototypeDescriptor
     * @argument {?Object} constructorDescriptor
     * @argument {?Object} constants
     * @returns {function()} - The created Enumeration subclass.
     */
    specialize: {
        value: function (uniquePropertyNames, otherPropertyNames,
                         prototypeDescriptor, constructorDescriptor, constants) {
            return this._specialize(this._parseSpecializeArguments(arguments));
        }
    },

    _parseSpecializeArguments: {
        value: function (arguments, start) {
            var unique, other, end, i, n;
            // The unique property names array is the first argument if that's
            // an array, or an array containing the first argument if that's a
            // non-empty string, or an empty array.
            start = start || 0;
            if (Array.isArray(arguments[start])) {
                unique = arguments[start];
            } else if (typeof arguments[start] !== "string") {
                unique = [];
                start -= 1;
            } else if (arguments[start].length) {
                unique = [arguments[start]];
            } else {
                unique = [];
            }
            // The other property names array is the next argument if that's an
            // array, or an array containing the next argument and all following
            // ones that are strings if there are any, or an empty array.
            other = Array.isArray(arguments[start + 1]) && arguments[start + 1];
            for (i = start + 1, n = arguments.length; !other; i += 1) {
                if (i === n || !arguments[i] || typeof arguments[i] !== "string") {
                    other = Array.prototype.slice.call(arguments, start + 1, i);
                    start = i - 2;
                }
            }
            // The remaining argument values come from the remaining arguments.
            end = Math.min(arguments.length, start + 5);
            return {
                unique: unique,
                other: other,
                prototype: end > start + 3 ? arguments[start + 2] : {},
                constructor: end > start + 4 ? arguments[start + 3] : {},
                constants: end > start + 2 ? arguments[end - 1] : {}
            };
        }
    },

    /**
     * @private
     * @method
     */
    _specialize: {
        value: function (arguments) {
            var uniquePropertyNames = arguments.unique,
                otherPropertyNames = arguments.other,
                prototypeDescriptor = arguments.prototype,
                constructorDescriptor = arguments.constructor,
                constants = arguments.constants,
                enumeration, i;
            // Create the desired enumeration.
            this._addPropertiesToDescriptor(prototypeDescriptor, uniquePropertyNames, otherPropertyNames);
            this._addLookupFunctionsToDescriptor(constructorDescriptor, uniquePropertyNames);
            this._addCreateFunctionToDescriptor(constructorDescriptor, uniquePropertyNames, otherPropertyNames);
            enumeration = Montage.specialize.call(exports.Enumeration, prototypeDescriptor, constructorDescriptor);
            // Add the requested constants.
            for (i in constants) {
                enumeration[i] = enumeration.create.apply(enumeration, constants[i]);
            }
            // Return the created enumeration.
            return enumeration;
        }
    },

    /**
     * Creates and returns a getter which, when first called, will create and
     * cache a new enumeration subclass with the specified attributes.
     *
     * @method
     * @argument {string} key
     * @argument {?Array.<string>|?string} uniquePropertyNames
     * @argument {?Array.<string>|?...string} otherPropertyNames
     * @argument {?Object} prototypeDescriptor
     * @argument {?Object} constructorDescriptor
     * @argument {?Object} constants
     * @returns {function()} - A getter that will create and cache the desired
     * Enumeration subclass.
     */
    getterFor: {
        value: function (key, uniquePropertyNames, otherPropertyNames,
                         prototypeDescriptor, constructorDescriptor, constants) {
            var specializeArguments = this._parseSpecializeArguments(arguments, 1);
            // Return a function that will create the desired enumeration.
            return function () {
                if (!this.hasOwnProperty(key)) {
                    this[key] = exports.Enumeration._specialize(specializeArguments);
                }
                return this[key];
            };
        }
    },

    _addPropertiesToDescriptor: {
        value: function(prototypeDescriptor, uniquePropertyNames, otherPropertyNames) {
            var i, n;
            for (i = 0, n = uniquePropertyNames.length; i < n; i += 1) {
                prototypeDescriptor[uniquePropertyNames[i]] = {value: undefined};
            }
            for (i = 0, n = otherPropertyNames.length; i < n; i += 1) {
                prototypeDescriptor[otherPropertyNames[i]] = {value: undefined};
            }
        }
    },

    _addLookupFunctionsToDescriptor: {
        value: function(constructorDescriptor, uniquePropertyNames) {
            var name, lookup, i, n;
            for (i = 0, n = uniquePropertyNames.length; i < n; i += 1) {
                name = "for" + uniquePropertyNames[i][0].toUpperCase() + uniquePropertyNames[i].slice(1);
                lookup = this._makeLookupFunction(uniquePropertyNames[i]);
                constructorDescriptor[name] = {value: lookup};
            }
        }
    },

    _makeLookupFunction: {
        value: function(propertyName) {
            return function (propertyValue) {
                return this._instances &&
                       this._instances[propertyName] &&
                       this._instances[propertyName][propertyValue];
            };
        }
    },

    _addCreateFunctionToDescriptor: {
        value: function(constructorDescriptor, uniquePropertyNames, otherPropertyNames) {
            var create = this._makeCreateFunction(uniquePropertyNames, otherPropertyNames);
            constructorDescriptor.create = {value: create};
        }
    },

    _makeCreateFunction: {
        value: function(uniquePropertyNames, otherPropertyNames) {
            var self = this;
            return function (propertyValues, propertiesDescriptor) {
                var createArguments = this._parseCreateArguments(uniquePropertyNames, otherPropertyNames, arguments);
                return self._create(this, uniquePropertyNames, otherPropertyNames, createArguments);
            };
        }
    },

    _parseCreateArguments: {
        value: function(uniquePropertyNames, otherPropertyNames, arguments) {
            var count = uniquePropertyNames.length + otherPropertyNames.length;
            return {
                values: Array.prototype.slice.call(arguments, 0, count),
                descriptor: arguments[count] || {}
            };
        }
    },

    _create: {
        value: function(type, uniquePropertyNames, otherPropertyNames, arguments) {
            var instance, name, i, m, n;
            // Create the instance.
            instance = new type();
            // Add to the instance the properties specified in the descriptor.
            Montage.defineProperties(instance, arguments.descriptor);
            // Add to the instance the property values specified.
            for (i = 0, n = uniquePropertyNames.length, m = otherPropertyNames.length; i < n + m; i += 1) {
                name = i < n ? uniquePropertyNames[i] : otherPropertyNames[i - n];
                instance[name] = arguments.values[i];
            }
            // Record the instance in the appropriate lookup maps.
            for (i = 0, n = uniquePropertyNames.length; i < n; i += 1) {
                type._instances = type._instances || {};
                type._instances[uniquePropertyNames[i]] = type._instances[uniquePropertyNames[i]] || {};
                type._instances[uniquePropertyNames[i]][arguments.values[i]] = instance;
            }
            // Return the created instance.
            return instance;
        }
    }

});
