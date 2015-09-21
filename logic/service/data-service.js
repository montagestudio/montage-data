var Montage = require("montage").Montage,
    DataMapping = require("logic/service/data-mapping").DataMapping,
    DataSelector = require("logic/service/data-selector").DataSelector,
    DataStream = require("logic/service/data-stream").DataStream,
    Map = require("collections/map"),
    ObjectDescriptor = require("logic/model/object-descriptor").ObjectDescriptor,
    Promise = require("bluebird"),
    WeakMap = require("collections/weak-map");

/**
 * Provides data objects and potentially manages changes to them.
 *
 * The constructor for this class does some important registration and any
 * subclass overriding that constructor should call its superclass constructor
 * at the beginning of its constructor implementation.
 *
 * @class
 * @extends external:Montage
 */
var DataService = exports.DataService = Montage.specialize(/** @lends DataService# */{

    /***************************************************************************
     * Initialization.
     */

    constructor: {
        value: function () {
            if (!DataService.main) {
                DataService.register(this);
            }
        }
    },

    /***************************************************************************
     * Public prototype properties (instance variables).
     *
     * Private properties are defined and/or documented where they are used.
     */

    /**
     * The type of data managed by this service if this service manages only one
     * type of data, `undefined` otherwise.
     *
     * An application typically includes one service for each of its data types
     * and one [main service]{@link DataService.main} which has no data type of
     * its own and instead has child services for each of the application's data
     * types. That main service delegates management of data of each of the
     * application's data type to its child service that has the corresponding
     * type.
     *
     * A service's type cannot be changed after it is set, and it must be set
     * before the service is added as a child of another service.
     *
     * @type {ObjectDescriptor}
     */
    type: {
        get: function () {
            return this._type;
        },
        set: function (type) {
            if (type && !this._type) {
                this._type = type;
                this._prototype = Object.create(type.prototype);
                this._addTriggers();
                this._type.addChangeListener(this);
            }
        }
    },

    /**
     * Maps the raw data on which this service is based to the data objects
     * returned by this service.
     *
     * If no mapping is defined the properties defined in the raw data will
     * simply be copied to the data object.
     *
     * @type {Object}
     */
    mapping: {
        value: undefined
    },

    /***************************************************************************
     * Service tree management methods.
     */

    /**
     * Parent of this service: Every service other than the
     * [main service]{@link DataService.main} must have a parent and the main
     * service's parent will be null.
     *
     * @private
     * @type {DataService}
     */
    _parentService: {
        value: undefined
    },

    /**
     * The children of this service, provided as a map of each of the data types
     * managed by this service to the child service responsible for managing
     * that data type.
     *
     * @private
     * @type {Map<ObjectDescriptor, DataService>}
     */
    _childServices: {
        get: function() {
            if (!this.__childServices) {
                this.__childServices = new Map();
            }
            return this.__childServices;
        }
    },

    /**
     * Get the child service responsible for managing data of a particular type.
     *
     * @method
     * @argument {DataService} service
     */
    getChildService: {
        value: function (type) {
            return !type ? undefined : type === this.type ? this : this._childServices.get(type);
        }
    },

    /**
     * Adds the specified service as a child of this service. The added service
     * must have a type and it will become responsible for managing data of that
     * type for this service.
     *
     * @method
     * @argument {DataService} service
     */
    addChildService: {
        value: function (service) {
            var previous = service.type && this._childServices.get(service.type);
            if (previous && previous !== service) {
                previous._parentService = undefined;
            }
            if (service.type && service !== previous) {
                service._parentService = this;
                this._childServices.set(service.type, service);
            }
        }
    },

    /**
     * Remove the specified service as a child of this service.
     *
     * This method will clear the removed service's parentService.
     *
     * @method
     * @argument {DataService} service
     */
    removeChildService: {
        value: function (service) {
            this._childServices.delete(service.type);
        }
    },

    /***************************************************************************
     * Data fetching methods.
     *
     * These are the methods to be called by object using services. These
     * methods should not be overridden.
     */

    /**
     * Fetch data from the service. This is the main method to be called by
     * objects using this service.
     *
     * This method fetches raw data from a server or other source using the
     * [fetchRawData()]{@link DataService#fetchRawData} method, creates and
     * registers corresponding data objects using the
     * [getDataObject()]{@link DataService#getDataObject} method, maps the raw
     * data to those data objects using the
     * [mapRawData()]{@link DataService#mapRawData} method, and then returns
     * those objects in the specified stream or in a new stream created for this
     * purpose.
     *
     * The data may be fetched asynchronously, in which case the data stream
     * will be returned immediately but the data objects will be created,
     * registered, filled with data, and added to the stream at a later time.
     *
     * Subclasses should not override this method, they should instead override
     * their [fetchRawData()]{@link DataService#fetchRawData} method and their
     * [mapRawData()]{@link DataService#mapRawData} method or their
     * [mapping's]{@link DataService#mapping}
     * [mapRawData()]{@link DataMapping#mapRawData} method.
     *
     * @method
     * @argument {DataSelector} selector - Defines what data should be returned.
     * @argument {DataStream} stream     - The stream to which the provided data
     *                                     should be added. If not stream is
     *                                     provided a stream will be created and
     *                                     returned by this method.
     */
    fetchData: {
        value: function (selector, stream) {
            var type, service;
            // Accept a type in lieu of a selector.
            if (!(selector instanceof DataSelector) && selector instanceof ObjectDescriptor) {
                type = selector;
                selector = new DataSelector();
                selector.type = type;
            }
            // Set up the stream.
            if (!stream) {
                stream = new DataStream();
            }
            if (!stream.service) {
                stream.service = this;
            }
            stream.selector = selector;
            // Get the data from a child service or from raw data.
            service = this.getChildService(selector.type);
            if (service !== this) {
                service.fetchData(selector, stream);
            } else {
                this.fetchRawData(stream);
            }
            // Return the passed in or created stream.
            stream._which = selector;
            return stream;
        }
    },

    /***************************************************************************
     * Raw data management methods.
     *
     * These are the methods that may be overridded when implementing services.
     * These methods should only be called by the service itself.
     */

    /**
     * Fetch the raw data of this service.
     *
     * This method should never be called directly by users of this service,
     * they should call [fetchData()]{@link DataService#fetchData} instead.
     *
     * This method should be overridden by service Subclasses to fetch the
     * service's raw data and provide it to the service by calling the service's
     * [addRawData()]{@link DataService#addRawData} method zero or more times
     * and its [rawDataDone()]{@link DataService#rawDataDone} method once.
     *
     * This method must be asynchronous and return as soon as possible even if
     * it takes a while to obtain the raw data. The raw data can be provided to
     * the service using [addRawData()]{@link DataService#addRawData} and
     * [rawDataDone()]{@link DataService#rawDataDone} at any point after this
     * method is called, even after it returns.
     *
     * This class' implementation of this method simply calls
     * [rawDataDone()]{@link DataService#rawDataDone} immediately
     *
     * @method
     * @argument {DataStream} stream     - The stream to which the data objects
     *                                     corresponding to the raw data should
     *                                     be added. This stream contains
     *                                     references to the selector defining
     *                                     which raw data to fetch.
     */
    fetchRawData: {
        value: function (stream) {
            this.rawDataDone(stream);
        }
    },

    /**
     * To be called by [fetchRawData()]{@link DataService#fetchRawData} when raw
     * data is received. This method should never be called directly by users of
     * this service.
     *
     * This method creates and registers the data objects that
     * will represent the raw data with repeated calls to
     * [getDataObject()]{@link DataService#getDataObject}, maps
     * the raw data to those objects with repeated calls to
     * [mapRawData()]{@link DataService#mapRawData}, and then adds those objects
     * to the specified stream.
     *
     * Subclasses will probably never need to override
     * this method, and they can instead override their
     * [getDataObject()]{@link DataService#getDataObject} method if necessary,
     * and their [mapRawData()]{@link DataService#mapRawData} method
     * or their [mapping]{@link DataService#mapping}'s
     * [mapRawData()]{@link DataMapping#mapRawData} method if necessary.
     *
     * @method
     * @argument {DataStream} stream   - The stream to which the data objects
     *                                   corresponding to the raw data should be
     *                                   added.
     * @argument {Array} rawData       - An array of objects whose properties'
     *                                   values hold the raw data. This array
     *                                   will be modified by this method.
     * @argument {?} context           - A value that will be passed to
     *                                   [mapRawData()]{@link DataMapping#mapRawData}
     *                                   if it is provided.
     */
    addRawData: {
        value: function (stream, rawData, context) {
            // Convert the raw data to appropriate data objects. The conversion
            // will be done in place to avoid creating an extra array.
            var i, n, object;
            for (i = 0, n = rawData ? rawData.length : 0; i < n; ++i) {
                object = this.getDataObject(this.type, rawData[i]);
                this.mapRawData(object, rawData[i], context);
                rawData[i] = object;
            }
            stream.addData(rawData);
        }
    },

    /**
     * Convert raw data to data objects of an appropriate type.
     *
     * Subclasses should override this method to map properties of the raw data
     * to data objects, as in the following:
     *
     *     mapRawData: {
     *         value: function (dataObject, rawData) {
     *             dataObject.firstName = rawData.GIVEN_NAME;
     *             dataObject.lastName = rawData.FAMILY_NAME;
     *         }
     *     }
     *
     * Alternatively, subclasses can define a
     * [mapping]{@link DataService#mapping} that does this mapping.
     *
     * The default implementation of this method copies the properties defined
     * by the raw data object to the data object.
     *
     * @method
     * @argument {Object} dataObject - An object whose properties will be
     *                                 set or modified to represent the data
     *                                 define in rawData.
     * @argument {Object} rawData    - An object whose properties' values hold
     *                                 the raw data.
     * @argument {?} context         - A value that was passed in to
     *                                 [addRawData()]{@link DataService#addRawData}
     *                                 call that invoked this method.
     */
    mapRawData: {
        value: function (dataObject, rawData, context) {
            var key;
            if (this.mapping) {
                this.mapping.mapRawData(dataObject, rawData, context);
            } else if (rawData) {
                for (key in rawData) {
                    dataObject[key] = rawData[key];
                }
            }
            return dataObject;
        }
    },

    /**
     * To be called once for each
     * [fetchRawData()]{@link DataService#fetchRawData} call received to
     * indicate that all the raw data meant for the specified stream has been
     * added to that stream.
     *
     * Subclasses will probably never need to override this method.
     *
     * @method
     * @argument {DataStream} stream - The stream to which the data objects
     *                                 corresponding to the raw data have been
     *                                 added.
     */
    rawDataDone: {
        value: function (stream) {
            stream.dataDone();
        }
    },

    /***************************************************************************
     * Data object management methods.
     */

    /**
     * Get or create a data object corresponding to the specified raw data.
     *
     * @method
     * @argument {ObjectDescriptor} type - The type of object to get or create.
     * @argument {?Object} rawData       - An object whose properties' values
     *                                     hold the raw data. If this is omitted
     *                                     a new data object will be created
     *                                     with no property values.
     */
    getDataObject: {
        value: function (type, rawData) {
            // TODO [Charles]: Object uniquing.
            var service = this.getChildService(type);
            return service === this ? Object.create(this._prototype) :
                   service ?          service.getDataObject(type, rawData) :
                                      Object.create(type.prototype);
        }
    },

    /**
     * Get the type of the specified data object.
     *
     * @method
     * @argument {Object} object   - The object whose type is sought.
     * @returns {ObjectDescriptor} - The type of the object, or undefined if no
     *                               type can be determined.
     */
    getObjectType: {
        value: function (object) {
            var type = DataService.main._typeRegistry && DataService.main._typeRegistry.get(object);
            if (!type) {
                while (object && !(object.constructor.TYPE instanceof ObjectDescriptor)) {
                    object = Object.getPrototypeOf(prototype);
                }
            }
            return type || object && object.constructor.TYPE;
        }
    },

    /**
     * Request possibly asynchronous values from a data object.
     *
     * Subclasses should not override this method, they should override
     * [getPropertyData()]{@link DataService#getPropertyData} instead.
     *
     * @method
     * @argument {object} object           - The object whose property values
     *                                       are being requested.
     * @argument {string[]} propertyNames  - The names of each of the properties
     *                                       whose values are being requested.
     *                                       These can be provided as an array
     *                                       of strings or as a list of string
     *                                       arguments following the object
     *                                       argument.
     * @returns {external:Promise} - A promise fulfilled when all of the
     * requested data has been received and set in the specified object's
     * property values. The argument passed to this promise's callback will be
     * `null`. To avoid the creation of unnecessary objects, subclasses
     * overriding this method should return DataService's shared
     * [NULL_PROMISE]{@link DataService.NULL_PROMISE} when all the requested
     * data is available at the time this method is called.
     */
    getObjectData: {
        value: function (object, propertyNames) {
            var names, start, promiseArray, promiseSet, promise;
            // Allow names to be provided as an array or as a list of arguments.
            names = Array.isArray(propertyNames) ? propertyNames : arguments;
            start = names === propertyNames ? 0 : 1;
            // Request each data value separately, collecting unique resulting
            // promises into an array and a set, but avoiding creating that
            // array and that set unless absolutely necessary.
            for (i = start, n = names.length; i < n; ++i) {
                promise = this.getPropertyData(object, names[i]);
                if (promise !== DataService.NULL_PROMISE) {
                    if (!promiseArray) {
                        promiseArray = [promise];
                    } else if (promiseArray.length === 1 && promiseArray[0] !== promise) {
                        promiseSet = new Set();
                        promiseSet.add(promiseArray[0]);
                        promiseSet.add(promise);
                        promiseArray.push(promise);
                    } else if (promiseSet && !promiseSet.has(promise)) {
                        promiseSet.add(promise);
                        promiseArray.push(promise);
                    }
                }
            }
            // Return a promise that will be fulfilled only when all of the
            // requested data has been set on the object.
            return !promiseArray ?             DataService.NULL_PROMISE :
                   promiseArray.length === 1 ? promiseArray[0] :
                                               Promise.all(promiseArray).then(function (values) {
                                                   return null;
                                               });
        }
    },

    /**
     * Request the possibly asynchronous value of a single property of a data
     * object.
     *
     * External objects should not call this method, they should call
     * [getObjectData()]{@link DataService#getObjectData} instead. This method
     * exists only so it can be overridden in subclasses.
     *
     * @method
     * @argument {object} object   - The object whose property value is being
     *                               requested.
     * @argument {string} name     - The name of the property whose value is
     *                               being requested.
     * @returns {external:Promise} - A promise fulfilled when the requested
     * property value has been set. The argument passed to this promise's
     * callback will be `null`. To avoid the creation of unnecessary objects,
     * subclasses overriding this method should return DataService's shared
     * [NULL_PROMISE]{@link DataService.NULL_PROMISE} when all the requested
     * data is available at the time this method is called.
     */
    getPropertyData: {
        value: function (object, name) {
            // TODO [Charles]: For now we'll require subclasses to handle this
            // manually but eventually this can be handled automatically using
            // relationship information to generate appropriate queries with
            // logic like the following:
            // 1) Looking at the object, find out if this value has been set.
            // 2) If so, return the null promise.
            // 3) If not, look for the corresponding relationship in the model
            //    and check if this relationships is already being fetched.
            // 4) If so, return the promise for that fetch.
            // 5) If not, schedule the fetch to be done at the next tick of the
            //    event loop and return a promise that is fulfilled when the
            //    fetch is done and when the returned values has been set.
            var type = DataService.main.getObjectType(object),
                service = DataService.main.getChildService(type),
                trigger = service && service._triggers && service._triggers[name],
                promise = trigger && trigger.promises && trigger.promises.get(object);
            if (service !== this && trigger && typeof promise === "undefined") {
                trigger.promises = trigger.promises || new WeakMap();
                trigger.promises.set(object, null);
                trigger.promises.set(object, service.getPropertyData(object, name));
                promise = trigger.promises.get(object);
            }
            return (promise || DataService.NULL_PROMISE).then(function (value) {
                return value;
            });
        }
    },

    /***************************************************************************
     * Trigger management methods.
     */

    /**
     * @private
     * @method
     * @argument {ObjectDescriptor} descriptor
     */
     _addTriggers: {
        value: function () {
            var name;
            if (this.type) {
                for (name in this.type.properties) {
                    this._addTrigger(name);
                }
            }
        }
     },

    /**
     * @private
     * @method
     * @argument {string} name
     */
     _addTrigger: {
        value: function (name) {
            var self = this,
                isRelationship = this.type && this.type.properties[name] && this.type.properties[name].isRelationship,
                trigger = isRelationship && {};
            if (isRelationship) {
                trigger.get = function () { return self._triggerGet.call(self, this, name); };
                trigger.set = function (value) { self._triggerSet.call(self, this, name, value); };
                Montage.defineProperty(this._prototype, name, trigger);
                this._triggers = this._triggers || {};
                this._triggers[name] = trigger;
            }
        }
     },

    /**
     * @private
     * @method
     */
     _removeTriggers: {
        value: function () {
            var name;
            if (this._triggers) {
                for (name in this._triggers) {
                    this._removeTrigger(name);
                }
            }
        }
     },

    /**
     * @private
     * @method
     * @argument {string} name
     */
     _removeTrigger: {
        value: function (name) {
            var trigger = this._triggers && this._triggers[name];
            if (trigger) {
                delete this._prototype[name];
                delete this._triggers[name];
            }
        }
     },

    /**
     * @private
     * @method
     * @argument {Object} object
     * @argument {string} name
     */
     _triggerGet: {
        value: function (object, name) {
            var data = this._data && this._data.get(object);
            // Start an asynchronous fetch of the property's value if necessary,
            DataService.main.getPropertyData(object, name);
            // Set up the data if necessary to get a prototype chain.
            data = data || Object.create(this.type.prototype);
            this._data = this._data || new WeakMap();
            this._data.set(object, data);
            // Return the property's current value.
            return data[name];
        }
     },

    /**
     * @private
     * @method
     * @argument {Object} object
     * @argument {string} name
     * @argument {} value
     */
     _triggerSet: {
        value: function (object, name, value) {
            var trigger = this._triggers && this._triggers[name],
                data = trigger && this._data && this._data.get(object);
            // Mark this value as fetched.
            trigger.promises = trigger.promises || new WeakMap();
            trigger.promises.set(object, DataService.NULL_PROMISE);
            // Store the value in the a data object.
            data = data || Object.create(this.type.prototype);
            data[name] = value;
            this._data = this._data || new WeakMap();
            this._data.set(object, data);
        }
     }

}, {

    /***************************************************************************
     * Constructor properties and methods (class constants, class variables, and
     * class methods).
     */

    /**
     * A shared Promise resolved with a value of `null`, useful for
     * returning from [getObjectData()]{@link DataService#getObjectData} or
     * [getPropertyData()]{@link DataService#getPropertyData} when the requested
     * data is already there.
     *
     * @type {Promise}
     */
     NULL_PROMISE: {
         get: function () {
             if (!this._nullPromise) {
                 this._nullPromise = Promise.resolve(null);
             }
             return this._nullPromise;
         }
     },

    /**
     * A read-only reference to the applicatin's main service.
     *
     * Applications typically have one and only one main service to which all
     * requests for data are sent. This service can in turn delegate management
     * of different types of data to child services specialized for each type.
     *
     * For this property to be correctly set
     * [register()]{@link DataService.register] must be called at least once
     * with a service that is either the main service or a descendent of the
     * main service.
     *
     * @memberof DataService
     * @type {DataService}
     */
    main: {
        get: function () {
            while (this._main && this._main._parentService) {
                this._main = this._main._parentService;
            }
            return this._main;
        }
    },

    /**
     * Register the main service or one of its descendants.
     *
     * For the [main]{@link DataService.main] property to be set correctly this
     * method must be called at least once with a service that is either the
     * main service or a descendent of the main service. It can be called
     * multiple times with the main service or a descendent of the main service,
     * but it cannot be called with a service that will not be the main service
     * or a descendent of the main service.
     *
     * The {@link DataService} constructor calls this method by default for the
     * first created services, so [main]{@link DataService.main] will be set
     * correctly if the first created service is either the main service or a
     * descendant of the main service.
     *
     * @memberof DataService
     * @type {DataService}
     */
    register: {
        value: function (service) {
            this._main = service;
        }
    }

});
