var Montage = require("montage").Montage,
    DataMapping = require("logic/service/data-mapping").DataMapping,
    DataSelector = require("logic/service/data-selector").DataSelector,
    DataStream = require("logic/service/data-stream").DataStream,
    DataTrigger = require("logic/service/data-trigger").DataTrigger,
    Map = require("collections/map"),
    DataObjectDescriptor = require("logic/model/data-object-descriptor").DataObjectDescriptor,
    Promise = require("bluebird"),
    Set = require("collections/set"),
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
exports.DataService = Montage.specialize(/** @lends DataService.prototype */{

    /***************************************************************************
     * Initialization
     */

    constructor: {
        value: function () {
            if (!exports.DataService.mainService) {
                exports.DataService.registerService(this);
            }
        }
    },

    /***************************************************************************
     * Basic properties
     *
     * Private properties are defined where they are used.
     */

    /**
     * The types of data managed by this service. This may be `undefined` for
     * the [main service]{@link DataService.mainService}.
     *
     * An application typically includes one service for each set of related
     * data types and one parent [main service]{@link DataService.mainService}
     * which has no types of its own and which delegates work to its child
     * services based on data type.
     *
     * A service's types cannot be changed after it is added as a child of
     * another service. Often the simplest way to define a service's type is
     * to override the `types` property in the service's prototype.
     *
     * @type {Array.<DataObjectDescriptor>?}
     */
    types: {
        get: function () {
            return this._types;
        },
        set: function (types) {
            if (types && !this._types) {
                this._types = types;
            }
        }
    },

    /**
     * The priority of this service relative to other services that can manage
     * the same type of data. If two child services of a single parent service
     * manage the same type of data and have the same priority, they will be
     * prioritized by the order in which they were added to their parent.
     *
     * @type {Array.<DataObjectDescriptor>?}
     */
    priority: {
        value: 100
    },

    /**
     * If defined, used by [mapFromRawData()]{@link DataService#mapFromRawData}
     * to map the raw data on which this service is based to the data objects
     * returned by this service.
     *
     * @type {Object?}
     */
    mapping: {
        value: undefined
    },

    /***************************************************************************
     * Service tree management
     */

    /**
     * Convenience read-only reference to the root of the service tree
     * containing this service. For most applications this will be the
     * [main service]{@link DataService.mainService}.
     *
     * @type {DataService}
     */
    rootService: {
        get: function () {
            var service = this;
            while (service._parentService) {
                service = service._parentService;
            }
            return service;
        }
    },

    /**
     * Parent of this service: Every service other than a
     * [root service]{@link DataService#rootService} must have a parent.
     *
     * @private
     * @type {DataService}
     */
    _parentService: {
        value: undefined
    },

    /**
     * The children of this service, provided as a map from each of the data
     * types managed by all the children to an array of the child services that
     * can manage each data type, with the array ordered by service priority.
     *
     * @private
     * @type {Map<DataObjectDescriptor, DataService>}
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
     * Get the first child service that can manage data of a particular type.
     *
     * @private
     * @method
     * @argument {DataService} service
     */
    _getFirstChildServiceForType: {
        value: function (type) {
            var services = type && this._childServices.get(type);
            return services && services[0];
        }
    },

    /**
     * Adds the specified service as a child of this service. That added service
     * must have one or more types which will determine which kind of data it
     * will manage for this service.
     *
     * @method
     * @argument {DataService} service
     */
    addChildService: {
        value: function (service) {
            var types = this._getChildServiceTypes(service),
                any = this._childServices.get(DataObjectDescriptor.ANY_TYPE),
                type, services, added, i, n;
            // For each of the service's types (or for each of the known types
            // when adding an ANY_TYPE service), add the new service to the
            // type's services array, and if this is a new type also add all the
            // previously defined ANY_TYPE services to the type's services
            // array. This way all ANY_TYPE services will always be in all the
            // type service arrays.
            for (i = 0, n = types ? types.length : 0; i < n; i += 1) {
                services = this._childServices.get(types[i]);
                if (services) {
                    this._insertChildService(services, service);
                } else {
                    this._childServices.set(types[i], [service]);
                    if (types[i] !== DataObjectDescriptor.ANY_TYPE) {
                        this._insertChildServices(this._childServices.get(types[i]), any);
                    }
                }
            }
            // Set the service parent.
            if (types.length) {
                service._parentService = this;
            }
        }
    },

    /**
     * Returns the types array of the service, or if the service types includes
     * ANY_TYPE, returns all types currently known to the service.
     *
     * @private
     * @method
     */
    _getChildServiceTypes: {
        value: function (service) {
            // If this service handles any type, use all the known types for it.
            var types = service.types;
            if (types && types.indexOf(DataObjectDescriptor.ANY_TYPE) >= 0) {
                types = [DataObjectDescriptor.ANY_TYPE];
                this._childServices.forEach(function (services, type) {
                    if (type !== DataObjectDescriptor.ANY_TYPE) {
                        types.push(type);
                    }
                });
            }
            return types;
        }
    },

    /**
     * @private
     * @method
     */
    _insertChildServices: {
        value: function (services, inserts) {
            var i, n;
            for (i = 0, n = inserts.length; i < n; ++i) {
                this._insertChildService(services, inserts[i]);
            }
        }
    },

    /**
     * @private
     * @method
     */
    _insertChildService: {
        value: function (services, insert) {
            var i = this._getChildServiceInsertionIndex(services, insert);
            if (services[i] !== insert) {
                services.splice(i, 0, insert);
            }
        }
    },

    /**
     * Returns the index where an service should be inserted in an array of
     * services to preserve the array's decreasing service priority. If the
     * service is already in the array the service's index will be returned. If
     * the service has the same priority as other services already in the array
     * the index of the element after the last of those equal priority services
     * will be returned.
     *
     * The search for this index has performance O(log n), unless there are many
     * services with the same priority as the service to insert, in which case
     * the performance can go up to O(m), where m is the number of services with
     * that same priority.
     *
     * @private
     * @method
     */
    _getChildServiceInsertionIndex: {
        value: function _binarySearch(services, insert) {
            var below, above, i, n;
            // Start with a simple binary search. "above" will always be the
            // index of a service with a higher prioritity than the service to
            // insert. "below" will always be the index of a service with a
            // lower priority than the service to inset, except when a service
            // is found with the same priority as the service to insert, in
            // which case "below" will set to the value of "above".
            for (n = services.length, below = -1, above = n; above > below + 1;) {
                i = Math.floor((below + above) / 2);
                if (services[i].priority < insert.priority) {
                    below = i;
                } else if (services[i].priority > insert.priority) {
                    above = i;
                } else {
                    below = above;
                }
            }
            // When the services array contains services with the same priority
            // as the service to insert, a linear search is required to check
            // whether the service to insert is already in that array.
            if (below === above) {
                for (i -= 1; i >= 0 && services[i].priority === insert.priority; i -= 1);
                for (i += 1; i < above; i += 1) {
                    if (services[i] === insert || services[i].priority !== insert.priority) {
                        above = i;
                    }
                }
            }
            // Return the index of the service to insert it it's already in the
            // array, or return the index of the first service with a higher
            // priority than the service to insert.
            return above;
        }
    },

    /**
     * Remove the specified service as a child of this service.
     *
     * This method will clear the removed service's parent service.
     *
     * @method
     * @argument {DataService} service
     */
    removeChildService: {
        value: function (service) {
            service._parentService = undefined;
            this._childServices.delete(service.type);
        }
    },

    /***************************************************************************
     * Fetching
     *
     * These methods should not be overridden.
     */

    /**
     * Fetch data from the service. This is the main method to be called by
     * objects using this service.
     *
     * This method fetches raw data from a server or other source using the
     * [fetchRawData()]{@link DataService#fetchRawData} method, gets or creates
     * and registers corresponding data objects using the
     * [getDataObject()]{@link DataService#getDataObject} method, maps the raw
     * data to those data objects using the
     * [mapFromRawData()]{@link DataService#mapFromRawData} method, and then
     * returns those objects in the specified stream or in a new stream created
     * for this purpose.
     *
     * The data may be fetched asynchronously, in which case the data stream
     * will be returned immediately but the data objects will be gotten and
     * created or registered, filled with data, and added to the stream at a
     * later time.
     *
     * Subclasses should not override this method, they should instead override
     * their [fetchRawData()]{@link DataService#fetchRawData} method and their
     * [mapFromRawData()]{@link DataService#mapFromRawData} method or their
     * [mapping's]{@link DataService#mapping}
     * [mapFromRawData()]{@link DataMapping#mapFromRawData} method.
     *
     * @method
     * @argument {DataSelector} selector - Defines what data should be returned.
     *                                     A [type]{@link DataObjectDescriptor}
     *                                     can be provided instead of a
     *                                     {@link DataSelector}, in which
     *                                     case a DataSelector with no
     *                                     [criteria]{@link DataSelector#criteria}
     *                                     will be created and used for the
     *                                     fetch.
     * @argument {DataStream} stream     - The stream to which the provided data
     *                                     should be added. If not stream is
     *                                     provided a stream will be created and
     *                                     returned by this method.
     * @returns {DataStream} - The stream provided to or created by this method.
     */
    fetchData: {
        value: function (selector, stream) {
            var type = selector instanceof DataSelector ? selector.type : selector,
                service = this._getFirstChildServiceForType(type);
            // Set up the stream, accepting a type in lieu of a selector.
            if (!stream) {
                stream = new DataStream();
            }
            if (!stream.service) {
                stream.service = this;
            }
            if (selector !== type) {
                stream.selector = selector;
            } else {
                stream.selector = DataSelector.withTypeAndCriteria(type);
            }
            // Get the data from raw date or from a child service.
            if (service === this) {
                service.fetchRawData(stream);
            } else if (service) {
                stream = service.fetchData(stream.selector, stream);
            } else {
                console.warn("Can't fetch data of unknown type -", type.name + "/" + type.uuid);
                stream.dataDone();
            }
            // Return the passed in or created stream.
            return stream;
        }
    },

    /***************************************************************************
     * Tracking changes
     */

    /**
     * A set of the data objects created by this service or any other descendent
     * of this service's [root service]{@link DataService#rootService} since
     * [saveDataChanges()]{@link DataService#saveDataChanges} was last called,
     * or since the root service was created if saveDataChanges() hasn't been
     * called yet.
     *
     * @type {Set<Object>}
     */
    createdDataObjects: {
        get: function () {
            var root = this.rootService
            if (!root._createdDataObjects) {
                root._createdDataObjects = new Set();
            }
            return root._createdDataObjects;
        }
    },

    /**
     * A set of the data objects managed by this service or any other descendent
     * of this service's [root service]{@link DataService#rootService} that have
     * been changed since [saveDataChanges()]{@link DataService#saveDataChanges}
     * was last called, or since the root service was created if
     * [saveDataChanges()]{@link DataService#saveDataChanges} hasn't been called
     * yet.
     *
     * @type {Set<Object>}
     */
    changedDataObjects: {
        get: function () {
            var root = this.rootService
            if (!root._changedDataObjects) {
                root._changedDataObjects = new Set();
            }
            return root._changedDataObjects;
        }
    },

    /**
     * Save all the changes that were made to any of the objects managed by this
     * service since those objects were fetched. Note that objects fetched by a
     * child service will be managed by that service's root service, not by the
     * child service itself.
     *
     * @method
     * @returns {external:Promise} - A promise fulfilled when all of the changed
     * data has been saved.
     */
    saveDataChanges: {
        value: function () {
            // TODO.
            return this.nullPromise;
        }
    },

    /***************************************************************************
     * Data objects
     */

    /**
     * Create a new data object of a specified type.
     *
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to create.
     * @returns {Object}                     - The created object.
     */
    createDataObject: {
        value: function (type) {
            var root = this.rootService,
                object = this !== root ? root.createDataObject(type) : this._createDataObject(type);
            if (this !== root) {
                object = root.createDataObject();

            } else if (object) {
                this.createdDataObjects.add(object);
            }
            return object;
        }
    },

    /**
     * Create a data object without registering it as a new object.
     *
     * @private
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to create.
     * @returns {Object}                     - The created object.
     */
    _createDataObject: {
        value: function (type) {
            // Create the object.
            // TODO [Charles]: Object uniquing.
            var object = Object.create(type.objectPrototype);
            object.constructor.call(object);
            // Registering the created object's type.
            if (object) {
                this._registerObjectType(object, type);
            }
            // Return the created object.
            return object;
        }
    },

    _dataObjectPrototype: {
        get: function () {
            if (!this.__dataObjectPrototype && this.type) {
                this.__dataObjectPrototype = Object.create(this.type.objectPrototype);
                this._triggers = DataTrigger.addTriggers(this, this.__dataObjectPrototype);
            }
            return this.__dataObjectPrototype;
        }
    },

    /**
     * Find an existing object corresponding to the specified raw data, or if no
     * such object exists, create one.
     *
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to get or
     *                                         create.
     * @argument {Object} data               - An object whose property values
     *                                         hold the raw data.
     * @argument {?} context                 - A value that was passed in to the
     *                                         [addRawData()]{@link DataService#addRawData}
     *                                         call that invoked this method.
     * @returns {Object} - The object corresponding to the specified raw data,
     * or if no such object exists a newly created object for that data.
     */
    getDataObject: {
        value: function (type, data, context) {
            // TODO [Charles]: Object uniquing.
            return this._createDataObject(type);
        }
    },

    /**
     * Save changes made to one data object managed by this service.
     *
     * @method
     * @argument {Object} object   - The object whose data should be saved.
     * @returns {external:Promise} - A promise fulfilled when all of the data in
     * the changed object has been saved.
     */
    saveDataObject: {
        value: function (object) {
            var type = this.rootService.getObjectType(object),
                service = this.rootService._getFirstChildServiceForType(type);
            return service !== this ? service.saveDataObject(object) :
                                      this._mapAndSaveDataObject(object);
        }
    },

    /**
     * @private
     * @method
     */
    _mapAndSaveDataObject: {
        value: function (object) {
            var data = {};
            this.mapToRawData(object, data);
            return this.saveRawData(data, object);
        }
    },

    // TODO: Document.
    deleteDataObject: {
        value: function (object) {
            var type = this.rootService.getObjectType(object),
                service = this.rootService._getFirstChildServiceForType(type);
            return service !== this ? service.deleteDataObject(object) :
                                      this._mapAndDeleteDataObject(object);
        }
    },

    /**
     * @private
     * @method
     */
    _mapAndDeleteDataObject: {
        value: function (object) {
            var data = {};
            this.mapToRawData(object, data);
            return this.deleteRawData(data, object);
        }
    },

    /**
     * Get the type of the specified data object.
     *
     * @method
     * @argument {Object} object       - The object whose type is sought.
     * @returns {DataObjectDescriptor} - The type of the object, or undefined if
     * no type can be determined.
     */
    getObjectType: {
        value: function (object) {
            return this.rootService._getObjectType(object);
        }
    },

    /**
     * @private
     * @method
     * @argument {Object} object       - The object whose type is sought.
     * @returns {DataObjectDescriptor} - The type of the object, or undefined if
     * no type can be determined.
     */
    _getObjectType: {
        value: function (object) {
            var type = this._typeRegistry && this._typeRegistry.get(object);
            while (!type && object) {
                if (type instanceof DataObjectDescriptor) {
                    type = object.constructor.TYPE;
                } else {
                    object = Object.getPrototypeOf(object);
                }
            }
            return type;
        }
    },

    /**
     * Register the type of the specified data object if necessary.
     *
     * @private
     * @method
     * @argument {Object} object
     * @argument {DataObjectDescriptor} type
     */
    _registerObjectType: {
        value: function (object, type) {
            var root = this.rootService;
            if (this !== root) {
                root._registerObjectType(object, type);
            } else if (this.getObjectType(object) !== type){
                this._typeRegistry = this._typeRegistry || new WeakMap();
                this._typeRegistry.set(object, type);
            }
        }
    },

    /***************************************************************************
     * Raw data
     *
     * These methods should only be called by the service itself. They are
     * typically overridden by subclasses to implement a service.
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

    // TODO: Document.
    saveRawData: {
        value: function (data, context) {
            // Subclasses must override this.
            return this.nullPromise;
        }
    },

    // TODO: Document.
    deleteRawData: {
        value: function (data, context) {
            // Subclasses must override this.
            return this.nullPromise;
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
     * [mapFromRawData()]{@link DataService#mapFromRawData}, and then adds those
     * objects to the specified stream.
     *
     * Subclasses will probably never need to override
     * this method, and they can instead override their
     * [getDataObject()]{@link DataService#getDataObject} method if necessary,
     * and their [mapFromRawData()]{@link DataService#mapFromRawData} method
     * or their [mapping]{@link DataService#mapping}'s
     * [mapFromRawData()]{@link DataMapping#mapFromRawData} method if necessary.
     *
     * @method
     * @argument {DataStream} stream   - The stream to which the data objects
     *                                   corresponding to the raw data should be
     *                                   added.
     * @argument {Array} rawData       - An array of objects whose properties'
     *                                   values hold the raw data. This array
     *                                   will be modified by this method.
     * @argument {?} context           - A value that will be passed to
     *                                   [getDataObject()]{@link DataMapping#getDataObject}
     *                                   and
     *                                   [mapFromRawData()]{@link DataMapping#mapFromRawData}
     *                                   if it is provided.
     */
    addRawData: {
        value: function (stream, rawData, context) {
            // Convert the raw data to appropriate data objects. The conversion
            // will be done in place to avoid creating an extra array.
            var i, n, object;
            for (i = 0, n = rawData ? rawData.length : 0; i < n; i += 1) {
                object = this.getDataObject(this.type, rawData[i], context);
                this.mapFromRawData(object, rawData[i], context);
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
     *     mapFromRawData: {
     *         value: function (object, data) {
     *             object.firstName = data.GIVEN_NAME;
     *             object.lastName = data.FAMILY_NAME;
     *         }
     *     }
     *
     * Alternatively, subclasses can define a
     * [mapping]{@link DataService#mapping} to do this mapping.
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
    mapFromRawData: {
        value: function (object, data, context) {
            var i;
            if (this.mapping) {
                this.mapping.mapFromRawData(object, data, context);
            } else if (data) {
                for (i in data) {
                    object[i] = data[i];
                }
            }
        }
    },

    // TODO: Document.
    mapToRawData: {
        value: function (object, data) {
            // TO DO: Provide a default mapping based on object.TYPE.
            // For now, subclasses must override this.
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
     * Object data
     */

    /**
     * Request possibly asynchronous values from a data object.
     *
     * Subclasses should not override this method, they should override
     * [getPropertyData()]{@link DataService#getPropertyData} instead.
     *
     * Although this method returns a promise, the requested data will not be
     * passed in to the promise's callback. Instead that value will be set on
     * the object passed in to this method and it can be obtained from there
     * when the callback is called, as in the following code:
     *
     *     myService.getObjectData(myObject, "x", "y").then(function () {
     *         someFunction(myObject.x, myObject.y);
     *     }
     *
     * @method
     * @argument {object} object          - The object whose property values are
     *                                      being requested.
     * @argument {string[]} propertyNames - The names of each of the properties
     *                                      whose values are being requested.
     *                                      These can be provided as an array of
     *                                      strings or as a list of string
     *                                      arguments following the object
     *                                      argument.
     * @returns {external:Promise} - A promise fulfilled when all of the
     * requested data has been received and set on the specified properties of
     * the passed in object.
     */
    getObjectData: {
        value: function (object, propertyNames) {
            var names, start, promises, promise, i, n;
            // Accept property names as an array or as a list of arguments, but
            // avoid creating a new array to hold those property names.
            names = Array.isArray(propertyNames) ? propertyNames : arguments;
            start = names === propertyNames ? 0 : 1;
            // Request each data value separately, collecting unique resulting
            // promises into an array and a set, but avoid creating that array
            // and that set until that is necessary.
            for (i = start, n = names.length; i < n; i += 1) {
                promise = this.getPropertyData(object, names[i]);
                if (promise !== this.nullPromise) {
                    if (!promises) {
                        promises = {array: [promise]};
                    } else if (!promises.set && promises.array[0] !== promise) {
                        promises.set = new Set();
                        promises.set.add(promises.array[0]);
                        promises.set.add(promise);
                        promises.array.push(promise);
                    } else if (promises.set && !promises.set.has(promise)) {
                        promises.set.add(promise);
                        promises.array.push(promise);
                    }
                }
            }
            // Return a promise that will be fulfilled only when all of the
            // requested data has been set on the object, and if possible avoid
            // creating an additional promise for this.
            return !promises ?     this.nullPromise :
                   !promises.set ? promises.array[0] :
                                   Promise.all(promises.array).then(this.nullFunction);
        }
    },

    // TODO: Document.
    // TODO: Share code with getObjectData.
    updateObjectData: {
        value: function (object, propertyNames) {
            var names, start, promises, promise, i, n;
            // Accept property names as an array or as a list of arguments, but
            // avoid creating a new array to hold those property names.
            names = Array.isArray(propertyNames) ? propertyNames : arguments;
            start = names === propertyNames ? 0 : 1;
            // Request each data value separately, collecting unique resulting
            // promises into an array and a set, but avoid creating that array
            // and that set until that is necessary.
            for (i = start, n = names.length; i < n; i += 1) {
                promise = this.updatePropertyData(object, names[i]);
                if (promise !== this.nullPromise) {
                    if (!promises) {
                        promises = {array: [promise]};
                    } else if (!promises.set && promises.array[0] !== promise) {
                        promises.set = new Set();
                        promises.set.add(promises.array[0]);
                        promises.set.add(promise);
                        promises.array.push(promise);
                    } else if (promises.set && !promises.set.has(promise)) {
                        promises.set.add(promise);
                        promises.array.push(promise);
                    }
                }
            }
            // Return a promise that will be fulfilled only when all of the
            // requested data has been set on the object, and if possible avoid
            // creating an additional promise for this.
            return !promises ?     this.nullPromise :
                   !promises.set ? promises.array[0] :
                                   Promise.all(promises.array).then(this.nullFunction);
        }
    },

    /**
     * Request the possibly asynchronous value of a single property of a data
     * object.
     *
     * This method should not be called directly.
     * [getObjectData()]{@link DataService#getObjectData} should be called
     * instead. It will in turn call this method.
     *
     * Like the promise returned by
     * [getObjectData()]{@link DataService#getObjectData}, the promise returned
     * by this method will not pass the requested value to its callback. Instead
     * that value will be set on the object passed in to this method and it can
     * be obtained from there when the callback is called.
     *
     * Subclasses should override this method if they want to provide custom
     * fetching of object data. Because this method can be called very often,
     * subclasses overriding it should cache any data that is expensive to
     * fetch, and they should avoid any slow operations or the creation of
     * unnecessary objects when returning data that is cached or otherwise
     * immediately available. One way they can avoid creating unnecessary
     * objects is by using [nullPromise]{@link DataService#nullPromise} when
     * appropriate, as in the following code:
     *
     *     getPropertyData: {
     *         value: function (object, propertyName) {
     *             var self = this,
     *                 promise = this.nullPromise;
     *             if (propertyName === "x" && !this.x) {
     *                 promise = this.fetchX().then(function (x) {
     *                     self.x = x;
     *                     return null;
     *                 });
     *             }
     *             return promise;
     *         }
     *     }
     *
     * @method
     * @argument {object} object   - The object whose property value is being
     *                               requested.
     * @argument {string} name     - The name of the property whose value is
     *                               being requested.
     * @returns {external:Promise} - A promise fulfilled when the requested
     * value has been received and set on the specified property of the passed
     * in object.
     */
    getPropertyData: {
        value: function (object, propertyName) {
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
            var type = this.rootService.getObjectType(object),
                service = this.rootService._getFirstChildServiceForType(type),
                trigger = service !== this && service._triggers && service._triggers[propertyName];
            return trigger ? trigger.getPropertyData(object) : this.nullPromise;
        }
    },

    // TODO: Document.
    // TODO: Share code with getPropertyData.
    updatePropertyData: {
        value: function (object, propertyName) {
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
            var type = this.rootService.getObjectType(object),
                service = this.rootService._getFirstChildServiceForType(type),
                trigger = service !== this && service._triggers && service._triggers[propertyName];
            return trigger ? trigger.updatePropertyData(object) : this.nullPromise;
        }
    },

    /***************************************************************************
     * Utilities
     */

    /**
     * A shared Promise resolved with a value of `null`, useful for
     * returning from [getObjectData()]{@link DataService#getObjectData} or
     * [getPropertyData()]{@link DataService#getPropertyData} when the requested
     * data is already there.
     *
     * @type {external:Promise}
     */
    nullPromise: {
        get: function () {
            if (!exports.DataService._nullPromise) {
                exports.DataService._nullPromise = Promise.resolve(null);
            }
            return exports.DataService._nullPromise;
        }
    },

    /**
     * A function that does nothing but returns null, useful for terminating
     * a promise chain that needs to return null, as in the following code:
     *
     *     var self = this;
     *     return this.fetchSomethingAsynchronously().then(function (data) {
     *         return self.doSomethingAsynchronously(data.part);
     *     }).then(this.nullFunction);
     *
     * @type {function}
     */
    nullFunction: {
        value: function () {
            return null;
        }
    },

    /**
     * Splice an array into another array.
     *
     * @method
     * @argument {Array} array   - The array to modify.
     * @argument {Array} insert  - The items to splice into that array.
     * @argument {number} index  - The index at which to splice those items, by
     *                             default `0`.
     * @argument {number} length - The number of items of the original array to
     *                             replace with items from the spliced array, by
     *                             default `array.length`.
     */
    spliceWithArray: {
        value: function (array, insert, index, length) {
            index = index || 0,
            length = length || length === 0 ? length : Infinity;
            return insert ? array.splice.apply(array, [index, length].concat(insert)) :
                            array.splice(index, length);
        }
    }

}, /** @lends DataService */{

    /***************************************************************************
     * Class variables, and methods
     */

    /**
     * A read-only reference to the applicatin's main service.
     *
     * Applications typically have one and only one main service to which all
     * requests for data are sent. This service can in turn delegate management
     * of different types of data to child services specialized for each type.
     *
     * For this property to be correctly set
     * [registerService()]{@link DataService.registerService] must be called at
     * least once with a service that is either the main service or a descendent
     * of the main service.
     *
     * @type {DataService}
     */
    mainService: {
        get: function () {
            this._mainService = this._mainService && this._mainService.rootService;
            return this._mainService;
        }
    },

    /**
     * Register the main service or one of its descendants.
     *
     * For the [mainService]{@link DataService.mainService] property to be set
     * correctly this method must be called at least once with a service that is
     * either the main service or a descendent of the main service. It can be
     * called multiple times with the main service or a descendent of the main
     * service, but it cannot be called with a service that will not be the main
     * service or a descendent of the main service.
     *
     * The {@link DataService} constructor calls this method by default for the
     * first created services, so [mainService]{@link DataService.mainService}
     * will be set correctly if the first created service is either the main
     * service or a descendant of the main service.
     *
     * @method
     */
    registerService: {
        value: function (service) {
            this._mainService = service;
        }
    }

});
