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
     * @argument {Array.<string>} uniquePropertyNames - The names of the unique
     *                                                  properties of the type.
     * @returns {function()} - The created Enumeration subclass.
     */
    specialize: {
        value: function (uniquePropertyNames, otherPropertyNames,
                         prototypeDescriptor, constructorDescriptor, constants) {
            var enumeration, name;
            // Parse arguments.
            arguments = Array.prototype.slice.call(arguments);
            uniquePropertyNames = this._getPropertyNameArgument(arguments, 0, 1);
            otherPropertyNames = this._getPropertyNameArgument(arguments, 1, arguments.length);
            prototypeDescriptor = this._getObjectArgument(arguments, 1, 1);
            constructorDescriptor = this._getObjectArgument(arguments, 1, 2);
            constants = this._getObjectArgument(arguments, 1, 3);
            // Create the desired enumeration.
            this._addPropertyDescriptors(prototypeDescriptor, uniquePropertyNames, otherPropertyNames);
            this._addInstanceLookupFunctionDescriptors(constructorDescriptor, uniquePropertyNames);
            this._addInstanceCreationFunctionDescriptor(constructorDescriptor, uniquePropertyNames, otherPropertyNames);
            enumeration = Montage.specialize.call(exports.Enumeration, prototypeDescriptor, constructorDescriptor);
            // Add the requested constants.
            for (name in constants) {
                enumeration[name] = enumeration.create.apply(enumeration, constants[name]);
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
     */
    getterFor: {
        value: function (key, uniquePropertyNames, otherPropertyNames,
                         prototypeDescriptor, constructorDescriptor, constants) {
            var self = this;
            // Parse arguments.
            arguments = Array.prototype.slice.call(arguments);
            uniquePropertyNames = this._getPropertyNameArgument(arguments, 1, 2);
            otherPropertyNames = this._getPropertyNameArgument(arguments, 2, arguments.length);
            prototypeDescriptor = this._getObjectArgument(arguments, 2, 1);
            constructorDescriptor = this._getObjectArgument(arguments, 2, 2);
            constants = this._getObjectArgument(arguments, 2, 3);
            // Return a function that will create the desired enumeration.
            return function () {
                if (!this.hasOwnProperty(key)) {
                    this[key] = self.specialize(uniquePropertyNames, otherPropertyNames,
                                                prototypeDescriptor, constructorDescriptor, constants);
                }
                return this[key];
            };
        }
    },

    _getPropertyNameArgument: {
        value: function (arguments, start, end) {
            // Use for the property names arguments[start] if that's an array,
            // and otherwise an array that includes the largest possible number
            // of contiguous strings in arguments starting at index start and
            // ending before index end.
            var names, i, n;
            for (i = start, n = end; names === undefined; ++i) {
                if (i === start && i < n && Array.isArray(arguments[i])) {
                    names = arguments[i];
                } else if (i === n || !arguments[i] || typeof arguments[i] !== "string") {
                    names = Array.prototype.slice.call(arguments, start, i);
                }
            }
            return names;
        }
    },

    _getObjectArgument: {
        value: function (arguments, start, number) {
            // Use for the object arguments element the first (for
            // number === 1), second (for number === 2), or third (for
            // number === 3) element in arguments after skipping over the
            // property name found in arguments starting at index start. If
            // skipping this argument leaves less than 3 arguments remaining,
            // prioritize the 3rd argument (constants), then the 1st (prototype
            // descriptor), then the 2nd (constructor descriptor).
            var index, remaining, i, n;
            for (i = start, n = arguments.length; index === undefined; ++i) {
                if (i === start && i < n && Array.isArray(arguments[i]) || !arguments[i]) {
                    index = i + 1;
                    remaining = n - i - 1;
                } else if (i === n || typeof arguments[i] !== "string") {
                    index = i;
                    remaining = n - i;
                }
            }
            return number >= 1 && number <= 3 && remaining >= 3 ? arguments[index + number - 1] :
                   number === 1 && remaining >= 2 ?               arguments[index] :
                   number === 3 && remaining >= 1 ?               arguments[index + remaining - 1] :
                                                                  {};
        }
    },

    _addPropertyDescriptors: {
        value: function(prototypeDescriptor, uniquePropertyNames, otherPropertyNames) {
            var i, n;
            for (i = 0, n = uniquePropertyNames.length; i < n; ++i) {
                prototypeDescriptor[uniquePropertyNames[i]] = {value: undefined};
            }
            for (i = 0, n = otherPropertyNames.length; i < n; ++i) {
                prototypeDescriptor[otherPropertyNames[i]] = {value: undefined};
            }
        }
    },

    _addInstanceLookupFunctionDescriptors: {
        value: function(constructorDescriptor, uniquePropertyNames) {
            var name, lookup, i, n;
            for (i = 0, n = uniquePropertyNames.length; i < n; ++i) {
                name = "for" + uniquePropertyNames[i][0].toUpperCase() + uniquePropertyNames[i].slice(1);
                lookup = this._makeInstanceLookupFunction(uniquePropertyNames[i]);
                constructorDescriptor[name] = {value: lookup};
            }
        }
    },

    _makeInstanceLookupFunction: {
        value: function(propertyName) {
            return function (propertyValue) {
                return this._instances &&
                       this._instances[propertyName] &&
                       this._instances[propertyName][propertyValue];
            };
        }
    },

    _addInstanceCreationFunctionDescriptor: {
        value: function(constructorDescriptor, uniquePropertyNames, otherPropertyNames) {
            var create = this._makeInstanceCreationFunction(uniquePropertyNames, otherPropertyNames);
            constructorDescriptor.create = {value: create};
        }
    },

    _makeInstanceCreationFunction: {
        value: function(uniquePropertyNames, otherPropertyNames) {
            var self = this;
            return function (propertyValues, propertiesDescriptor) {
                // Parse arguments.
                var propertyCount = uniquePropertyNames.length + otherPropertyNames.length;
                if (!Array.isArray(propertyValues)) {
                    propertyValues = Array.prototype.slice.call(arguments, 0, propertyCount);
                    propertiesDescriptor = arguments[propertyCount];
                }
                // Create the instance.
                return self._createInstance(this, uniquePropertyNames, otherPropertyNames, propertyValues, propertiesDescriptor);
            };
        }
    },

    _createInstance: {
        value: function(type, uniquePropertyNames, otherPropertyNames, propertyValues, propertiesDescriptor) {
            var instance, name, i, m, n;
            // Create the instance.
            instance = new type();
            // Add to the instance the properties specified in the descriptor.
            if (propertiesDescriptor) {
                Montage.defineProperties(instance, propertiesDescriptor);
            }
            // Add to the instance the property values specified.
            for (i = 0, m = uniquePropertyNames.length, n = otherPropertyNames.length; i < m + n; ++i) {
                name = i < m ? uniquePropertyNames[i] : otherPropertyNames[i - m];
                instance[name] = propertyValues[i];
            }
            // Record the instance in the appropriate lookup maps.
            for (i = 0, m = uniquePropertyNames.length; i < m; ++i) {
                type._instances = type._instances || {};
                type._instances[uniquePropertyNames[i]] = type._instances[uniquePropertyNames[i]] || {};
                type._instances[uniquePropertyNames[i]][propertyValues[i]] = instance;
            }
            // Return the created instance.
            return instance;
        }
    }

});
