// Note: Bluebird promises are used even if ECMAScript 6 promises are available.
var Montage = require("montage").Montage,
    DataObjectDescriptor = require("logic/model/data-object-descriptor").DataObjectDescriptor,
    DataSelector = require("logic/service/data-selector").DataSelector,
    DataStream = require("logic/service/data-stream").DataStream,
    DataTrigger = require("logic/service/data-trigger").DataTrigger,
    Map = require("collections/map"),
    Promise = require("bluebird"),
    Set = require("collections/set"),
    WeakMap = require("collections/weak-map"),
    Enum = require("montage/core/enum").Enum,
    AuthorizationPolicyType = new Enum().initWithMembers("NoAuthorizationPolicy","UpfrontAuthorizationPolicy","OnFirstFetchAuthorizationPolicy","OnDemandAuthorizationPolicy"),
    AuthorizationManager = require("logic/service/authorization-manager").AuthorizationManager;

    /**
     * AuthorizationPolicyType
     *
     * UpfrontAuthorizationPolicy
     *      Authorization is asked upfront, immediately after data service is created / launch of an app.
     *
     * UpfrontAuthorizationPolicy
     *      Authorization is required when a request fails because of lack of authorization.
     *      This is likely to be a good strategy for DataServices that offer data to
     *   both anonymous and authorized .
     *
     */


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
var DataService = exports.DataService = Montage.specialize(/** @lends DataService.prototype */{

    /***************************************************************************
     * Initialization
     */

    constructor: {
        value: function DataService() {
            if (!exports.DataService.mainService) {
                exports.DataService.registerService(this);
                if(this.providesAuthorization) {
                    DataService.authorizationManager.registerAuthorizationService(this);
                }
                if(this.authorizationPolicy === AuthorizationPolicyType.UpfrontAuthorizationPolicy) {
                    DataService.authorizationManager.authorizeService(this).then(function(authorization) {

                    });
                }

            }
        }
    },

    /***************************************************************************
     * Basic properties
     *
     * Private properties are defined where they are used.
     */

    /**
     * The types of data managed by this service. By default this is an empty
     * array and is not settable, so subclasses must override this to return a
     * non-empty array.
     *
     * Applications typically includes one service for each set of related
     * data types and one parent [main service]{@link DataService.mainService}
     * which has no types of its own and which delegates work to its child
     * services based on the type of data for which the work is required.
     *
     * A service's types cannot be changed after it is added as a child of
     * another service.
     *
     * @type {Array.<DataObjectDescriptor>}
     */
    types: {
        get: function () {
            return exports.DataService._EMPTY_ARRAY;
        }
    },

    /**
     * The priority of this service relative to other services that can manage
     * the same type of data. If two child services of a single parent service
     * manage the same type of data and have the same priority, they will be
     * prioritized by the order in which they were added to their parent.
     *
     * @type {number}
     */
    priority: {
        value: 100
    },

    /**
     * If defined, used by [mapFromRawData()]{@link DataService#mapFromRawData}
     * to map the raw data on which this service is based to the data objects
     * returned by this service.
     *
     * @type {?DataMapping}
     */
    mapping: {
        value: undefined
    },

    /***************************************************************************
     * Handling offline
     */

    /*
     * @type {boolean}
     */
    worksOffline: {
        value: false
    },

    /*
     * @type {boolean}
     */
    isOffline: {
        // TODO.
        get: function () {
            if (this._isRootService && this._isOffline === undefined) {
                this._isOffline = false;
                window.setInterval(this._offlinePolling, this.offlinePollingInterval, this);
            }
            return this._isRootService ? this._isOffline : this.rootService.isOffline;
        },
        set: function (isOffline) {
            isOffline = isOffline ? true : false;
            if (!this._isRootService) {
                this.rootService.isOffline = isOffline;
            } else if (isOffline !== this.isOffline) {
                this._isOffline = isOffline;
                this._offlineService.isOfflineDidChange(isOffline);
            }
        }
    },

    /*
     * @method
     */
     //Benoit: name, really?!!
    isOfflineDidChange: {
        value: function (isOffline) {
            // Subclasses can overrride this.
        }
    },
    offlinePollingInterval: {
        value: 2000
    },
    __offlinePollingRequest: {
        value: void 0
    },
    _offlinePollingRequest: {
        get: function() {
            if(!this.__offlinePollingRequest) {
                var request = new XMLHttpRequest();
                request.timeout = 15000;
                request.onerror = this._setOfflineToTrue;
                request.onload = this._setOfflineToFalse;
                request.ontimeout = this._setOfflineToTrue;
                this.__offlinePollingRequest = request;
            }
            return this.__offlinePollingRequest;
        }
    },

    _offlinePolling: {
        value: function (self) {
            if(typeof navigator.onLine === "boolean") {
                this.isOffline = !navigator.onLine;
            }
            else {
                request = self._offlinePollingRequest;
                request.open("GET", self._offlinePollingUrl, true);
                request.send();
            }
        }
    },

    _offlinePollingUrl: {
        get: function () {
            var random = Math.floor(Math.random() * 10000000000000000000);
            return "https://avatars0.githubusercontent.com/u/1391764?s=1&_=" + random;
        }
    },

    _setOfflineToFalse: {
        get: function () {
            if (!this.__setOfflineToFalse) {
                this.__setOfflineToFalse = function () {
                    this.isOffline = false;
                }.bind(this);
            }
            return this.__setOfflineToFalse;
        }
    },

    _setOfflineToTrue: {
        get: function () {
            if (!this.__setOfflineToTrue) {
                this.__setOfflineToTrue = function () {
                    this.isOffline = true;
                }.bind(this);
            }
            return this.__setOfflineToTrue;
        }
    },

    /**
     * Get the offline service.
     *
     * For now there can only be a single offline service and it must be a
     * direct child of the root service.
     *
     * @private
     * @type {OfflineService}
     */
    _offlineService: {
        get: function () {
            if (this._isRootService && this.__offlineService === undefined) {
                this.__offlineService = this._findOfflineService();
            }
            return this._isRootService ? this.__offlineService : this.rootService._offlineService;
        }
    },

    _findOfflineService: {
        value: function () {
            var children = this.rootService._childServices.get(DataObjectDescriptor.ALL_TYPES),
                offline, i, n;
            if (children) {
                for (i = 0, n = children.length; i < n && !offline; ++i) {
                    if (children[i].worksOffline) {
                        offline = children[i];
                    }
                }
            }
            return offline || null;
        }
    },

    /***************************************************************************
     * Managing service hierarchies
     */

    /**
     * Convenience read-only reference to the root of the service tree
     * containing this service. For most applications this will be the same
     * services as the [mainMervice]{@link DataService.mainService} defined
     * by calls to [registerService()]{@link DataService.mainService}.
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
     * @private
     * @type {boolean}
     */
    _isRootService: {
        get: function () {
            return !this._parentService;
        }
    },

    /**
     * Parent of this service: Every service other than a
     * [root service]{@link DataService#rootService} will have a parent.
     *
     * @private
     * @type {DataService}
     */
    _parentService: {
        value: undefined
    },

    /**
     * Children of this service, provided as a map from each of the data types
     * managed by each of these children to an array of the children that can
     * manage that particular data type, with each array ordered by service
     * priority and by the order in which the services were added.
     *
     * The contents of the map value of this property should not be modified
     * outside of [addChildService()]{@link DataService#addChildService} and
     * [removeChildService()]{@link DataService#removeChildService}.
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
     * Adds the specified service as a child of this service. Service to add
     * must have one or more types defined for them. These determine which kind
     * of data the services will manage and services without types will not be
     * added.
     *
     * The performance of this method can be on the order of O(n), where n is
     * the number of children of this service, so it should not be called in a
     * loop or for a potentially large number of children.
     *
     * @method
     * @argument {DataService} service
     */
    addChildService: {
        value: function (service) {
            var types = this._getChildServiceTypes(service),
                all = this._childServices.get(DataObjectDescriptor.ALL_TYPES),
                services, i, n;
            // For each of the service's types (or for each of the known types
            // when adding an ALL_TYPES service), add the new service to the
            // type's services array. For each new type other than ALL_TYPES
            // also add all the previously defined ALL_TYPES services to the
            // type's services array, ensuring that all ALL_TYPES services are
            // always in all the type service arrays.
            for (i = 0, n = types ? types.length : 0; i < n; i += 1) {
                services = this._childServices.get(types[i]);
                if (services) {
                    this._insertChildService(services, service);
                } else {
                    this._childServices.set(types[i], [service]);
                    if (all && types[i] !== DataObjectDescriptor.ALL_TYPES) {
                        this._insertChildServices(this._childServices.get(types[i]), all);
                    }
                }
            }
            // Set the service parent if appropriate.
            if (types.length) {
                service._parentService = this;
            }
        }
    },

    /**
     * Remove the specified service as a child of this service and clear its
     * parent if that parent is this service.
     *
     * @method
     * @argument {DataService} service
     */
    removeChildService: {
        value: function (service) {
            var types = this._getChildServiceTypes(service),
                services, index, i, n;
            // For each of the service's types, remove the service from the
            // type's service arrays, or if the type's service array only
            // contains the service to remove remove the service array itself.
            for (i = 0, n = types.length; i < n; i += 1) {
                services = this._childServices.get(types[i]);
                index = services ? services.indexOf(service) : -1;
                if (index === 0 && services.length === 1) {
                    this._childServices.delete(types[i]);
                } else if (index >= 0) {
                    services.splice(index, 1);
                }
            }
            // Clear the service parent if appropriate.
            if (service._parentService === this) {
                service._parentService = undefined;
            }
        }
    },

    /**
     * Returns the types of the specified child service, or if the child
     * service's types includes ALL_TYPES, returns all types currently known to
     * this service.
     *
     * @private
     * @method
     * @returns {Array.<DataObjectDescriptor>}
     */
    _getChildServiceTypes: {
        value: function (service) {
            var types = service.types;
            if (types.indexOf(DataObjectDescriptor.ALL_TYPES) >= 0) {
                types = [DataObjectDescriptor.ALL_TYPES];
                this._childServices.forEach(function (services, type) {
                    if (type !== DataObjectDescriptor.ALL_TYPES) {
                        types.push(type);
                    }
                });
            }
            return types;
        }
    },

    /**
     * Insert the specified services in the provided array of services so
     * that this array remains ordered in decreasing priority order, with the
     * inserted services coming after any services already in the array that
     * have the same priority.
     *
     * @private
     * @method
     */
    _insertChildServices: {
        value: function (services, inserts) {
            var i, n;
            for (i = 0, n = inserts.length; i < n; i += 1) {
                this._insertChildService(services, inserts[i]);
            }
        }
    },

    /**
     * Insert the specified service in the provided array of services so
     * that this array remains ordered in decreasing priority order, with the
     * inserted service coming after any services already in the array that
     * have the same priority.
     *
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
     * the index of the element after the last of those same priority services
     * will be returned.
     *
     * The search for this index has performance O(m + log n), where n is the
     * total number of services in the array and m is the number of services
     * in the array with the same priority as the service to insert.
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
            // which case "below" will set to the same value as "above".
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
            // whether the service to insert is already in that array. The
            // search is performed by going back to just before the set of same
            // priority services, then going forward towards the end of that
            // set, stopping if the service to insert is encountered and setting
            // the above index to that service's index and otherwise setting
            // the above index to just after the set of same priority services.
            if (below === above) {
                for (i -= 1; i >= 0 && services[i].priority === insert.priority; i -= 1);
                for (i += 1; i < above; i += 1) {
                    if (services[i] === insert || services[i].priority !== insert.priority) {
                        above = i;
                    }
                }
            }
            // Return the index of the service to insert it it's already in the
            // array, or return the index of the first service with a priority
            // higher than the one of the service to insert if there is such a
            // service, or return the index a service would have if it was added
            // appended to the end of the array.
            return above;
        }
    },

    /**
     * Get the first service that can manage the specified object based on the
     * object's type.
     *
     * See [_firstServiceForType()]{@link DataService#_firstServiceForType} for
     * details.
     *
     * @private
     * @method
     * @argument {Object} object
     * @returns {DataService}
     */
    _firstServiceForObject: {
        value: function (object) {
            return this._firstServiceForType(this.rootService.getObjectType(object));
        }
    },

    /**
     * Get the first service that can manage data of the specified type, which
     * will be this service if it manages all types or if the specified type is
     * one of the types it manages, or the the first of the child services of
     * this service that is registered to manage the specified type.
     *
     * If no service is found that satisfies these criteria, this service's
     * parent is given an opportunity to find and provide the desired service.
     *
     * @private
     * @method
     * @argument {DataObjectDescriptor} type
     * @returns {DataService}
     */
    _firstServiceForType: {
        value: function (type) {
            return this.types.indexOf(DataObjectDescriptor.ALL_TYPES) >= 0 && this ||
                   this.types.indexOf(type) >= 0 && this ||
                   this._childServices.has(type) && this._childServices.get(type)[0] ||
                   this._parentService && this._parentService._firstServiceForType(type);
        }
    },

    /***************************************************************************
     * Managing data objects
     */

    /**
     * Find an existing data object corresponding to the specified raw data, or
     * if no such object exists, create one.
     *
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to find or
     *                                         create.
     * @argument {Object} data               - An object whose property values
     *                                         hold the raw data. That data will
     *                                         be used to determine the unique
     *                                         identifier of the object to find
     *                                         or create.
     * @argument {?} context                 - A value that was passed in to the
     *                                         [addRawData()]{@link DataService#addRawData}
     *                                         call that caused this method to
     *                                         be invoked.
     * @returns {Object} - The existing object with the unique identifier
     * specified in the raw data, or if no such object exists a newly created
     * object of the specified type.
     */
    getDataObject: {
        value: function (type, data, context) {
            // TODO [Charles]: Object uniquing.
            return this.rootService._createDataObject(type);
        }
    },

    /**
     * Create a new data object of the specified type.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to create.
     * @returns {Object}                     - The created object.
     */
    createDataObject: {
        value: function (type) {
            var object;
            if (this._isRootService) {
                object = this._createDataObject(type);
                this.createdDataObjects.add(object);
            }
            return object;
        }
    },

    /**
     * Save changes made to a data object.
     *
     * @method
     * @argument {Object} object   - The object whose data should be saved.
     * @returns {external:Promise} - A promise fulfilled when all of the data in
     * the changed object has been saved.
     */
    saveDataObject: {
        value: function (object) {
            var self = this;
            return !this._isRootService ? this.saveRawData(this._toRawData(object), object) :
                   this.isOffline ?       this._offlineService.saveDataObject(object) :
                                          this._firstServiceForObject(object).saveDataObject(object).then(function () {
                                              self.createdDataObjects.delete(object);
                                              return null;
                                          });
        }
    },

    /**
     * Delete a data object.
     *
     * @method
     * @argument {Object} object   - The object whose data should be saved.
     * @returns {external:Promise} - A promise fulfilled when the object has
     * been deleted.
     */
    deleteDataObject: {
        value: function (object) {
            var self = this;
            return !this._isRootService ? this.deleteRawData(this._toRawData(object), object) :
                   this.isOffline ?       this._offlineService.deleteDataObject(object) :
                                          this._firstServiceForObject(object).deleteDataObject(object).then(function () {
                                              self.createdDataObjects.delete(object);
                                              return null;
                                          });
        }
    },

    _toRawData: {
        value: function (object) {
            var data = {};
            this.mapToRawData(object, data);
            return data;
        }
    },

    /**
     * Create a data object without registering it in the new object map.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * @private
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to create.
     * @returns {Object}                     - The created object.
     */
    _createDataObject: {
        value: function (type) {
            var object;
            if (this._isRootService) {
                object = Object.create(this._getPrototypeForType(type));
                if (object) {
                    object = object.constructor.call(object) || object;
                    if (object) {
                        this._registerObjectType(object, type);
                    }
                }
            }
            return object;
        }
    },

    /**
     * Returns a prototype for objects of the specified type. The returned
     * prototype will have the [data triggers]{@link DataTrigger} required by
     * the relationships and lazy properties of the type. A single prototype
     * will be created for all objects of a given type.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * @private
     * @method
     * @argument {DataObjectDescriptor} type
     * @returns {Object}
     */
    _getPrototypeForType: {
        value: function (type) {
            var prototype;
            if (this._isRootService) {
                prototype = type && this.__dataObjectPrototypes && this.__dataObjectPrototypes.get(type);
                if (type && !prototype) {
                    prototype = Object.create(type.objectPrototype);
                    this.__dataObjectPrototypes = this.__dataObjectPrototypes || new Map();
                    this.__dataObjectPrototypes.set(type, prototype);
                    this.__dataObjectTriggers = this.__dataObjectTriggers || new Map();
                    this.__dataObjectTriggers.set(type, DataTrigger.addTriggers(this, type, prototype));
                }
            }
            return prototype;
        }
    },

    /**
     * Returns the [data triggers]{@link DataTrigger} set up for objects of the
     * specified type.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * @private
     * @method
     * @argument {Object} object
     * @returns {Object<string, DataTrigger>}
     */
    _getTriggersForObject: {
        value: function (object) {
            var triggers, type;
            if (this._isRootService) {
                type = this.getObjectType(object);
                triggers = type && this.__dataObjectTriggers && this.__dataObjectTriggers.get(type);
            }
            return triggers;
        }
    },

    /***************************************************************************
     * Managing data object types
     */

    /**
     * Get the type of the specified data object.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * @private
     * @method
     * @argument {Object} object       - The object whose type is sought.
     * @returns {DataObjectDescriptor} - The type of the object, or undefined if
     * no type can be determined.
     */
    getObjectType: {
        value: function (object) {
            var type;
            if (this._isRootService) {
                type = object && this._typeRegistry && this._typeRegistry.get(object);
                while (!type && object) {
                    if (type instanceof DataObjectDescriptor) {
                        type = object.constructor.TYPE;
                    } else {
                        object = Object.getPrototypeOf(object);
                    }
                }
            }
            return type;
        }
    },

    /**
     * Register the type of the specified data object if necessary.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * @private
     * @method
     * @argument {Object} object
     * @argument {DataObjectDescriptor} type
     */
    _registerObjectType: {
        value: function (object, type) {
            if (this._isRootService && this.getObjectType(object) !== type){
                this._typeRegistry = this._typeRegistry || new WeakMap();
                this._typeRegistry.set(object, type);
            }
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
     * This property is only defined on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * @type {Set.<Object>}
     */
    createdDataObjects: {
        get: function () {
            var objects;
            if (this._isRootService) {
                this._createdDataObjects = this._createdDataObjects || new Set();
                objects = this._createdDataObjects;
            }
            return objects;
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
     * This property is only defined on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * @type {Set.<Object>}
     */
    changedDataObjects: {
        get: function () {
            var objects;
            if (this._isRootService) {
                this._changedDataObjects = this._changedDataObjects || new Set();
                objects = this._changedDataObjects;
            }
            return objects;
        }
    },

    /**
     * Save all the changes that were made to any of the objects managed by this
     * service since those objects were fetched. Note that objects fetched by a
     * child service will be managed by that service's root service, not by the
     * child service itself.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * This is not yet implemented: It currently does nothing but return a
     * promise that is already fulfilled.
     *
     * @method
     * @returns {external:Promise} - A promise fulfilled when all of the changed
     * data has been saved.
     */
    saveDataChanges: {
        value: function () {
            // TODO.
            return this._isRootService ? this.nullPromise : undefined;
        }
    },

    /***************************************************************************
     * Obtaining data object property values
     */

    /**
     * @todo Rename and document API and implementation.
     *
     * @method
     */
    decacheObjectProperties: {
        value: function (object, propertyNames) {
            var names = Array.isArray(propertyNames) ? propertyNames : arguments,
                start = names === propertyNames ? 0 : 1,
                triggers = this._getTriggersForObject(object),
                trigger, i, n;
            for (i = start, n = names.length; i < n; i += 1) {
                trigger = triggers && triggers[names[i]];
                if (trigger) {
                    trigger.decacheObjectProperty(object);
                }
            }
        }
    },

    /**
     * Request possibly asynchronous values of a data object's properties. These
     * values will only be fetched if necessary and only the first time they are
     * requested.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * Subclasses should not override this method to define
     * how values are obtained. They should instead override
     * [fetchObjectProperty()]{@link DataService#fetchObjectProperty}.
     *
     * This method will call
     * [fetchObjectProperty()]{@link DataService#fetchObjectProperty} for each
     * requested asynchronous value that has not already been obtained or set.
     * If none of the requested values are asynchronous or if all the requested
     * asynchronous values have already been obtained or set this method will
     * immediately return [a fulfilled promise]{@link DataService#nullPromise}.
     * To force an update of a value that was previously obtained or set, use
     * [updateObjectProperties()]{@link DataService#updateObjectProperties}
     * instead of this method.
     *
     * Although this method returns a promise, the requested date will not be
     * passed in to the promise's callback. Instead that callback will received
     * a `null` value and the requested values will be set on the specified
     * properties of the object passed in. Those values can be accessed there
     * when the returned promise is fulfilled, as in the following code:
     *
     *     myService.getObjectProperties(myObject, "x", "y").then(function () {
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
    getObjectProperties: {
        value: function (object, propertyNames) {
            // Get the data, accepting property names as an array or as a list
            // of string arguments while avoiding the creation of any new array.
            var names, start, promise;
            if (this._isRootService) {
                names = Array.isArray(propertyNames) ? propertyNames : arguments;
                start = names === propertyNames ? 0 : 1;
                promise = this._getOrUpdateObjectProperties(object, names, start, false);
            }
            return promise;
        }
    },

    /**
     * Request possibly asynchronous values of a data object's properties,
     * forcing asynchronous values to be re-fetched and updated even if they
     * had previously been fetched or set.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
     *
     * Except for the forced update, this method behaves exactly like
     * [getObjectProperties()]{@link DataService#getObjectProperties}.
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
    updateObjectProperties: {
        value: function (object, propertyNames) {
            // Get the data, accepting property names as an array or as a list
            // of string arguments while avoiding the creation of any new array.
            var names, start, promise;
            if (this._isRootService) {
                names = Array.isArray(propertyNames) ? propertyNames : arguments;
                start = names === propertyNames ? 0 : 1;
                promise = this._getOrUpdateObjectProperties(object, names, start, true);
            }
            return promise;
        }
    },

    /**
     * @private
     * @method
     */
    _getOrUpdateObjectProperties: {
        value: function (object, names, start, isUpdate) {
            var triggers, trigger, promises, promise, i, n;
            // Request each data value separately, collecting unique resulting
            // promises into an array and a set, but avoid creating any array
            // or set unless that's necessary.
            triggers = this._getTriggersForObject(object);
            for (i = start, n = names.length; i < n; i += 1) {
                trigger = triggers && triggers[names[i]];
                promise = !trigger ? this.nullPromise :
                          isUpdate ? trigger.updateObjectProperty(object) :
                                     trigger.getObjectProperty(object);
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
            // requested data has been set on the object. If possible do this
            // without creating any additional promises.
            return !promises ?     this.nullPromise :
                   !promises.set ? promises.array[0] :
                                   Promise.all(promises.array).then(this.nullFunction);
        }
    },

    /**
     * Fetch the value of a data object's property, possibly asynchronously.
     *
     * Subclasses should overrride this method to make any
     * [fetchData()]{@link DataService#fetchData} call necessary
     * to get the requested data. The subclass implementations of
     * this method should make no network requests except through
     * [fetchData()]{@link DataService#fetchData} calls. The default
     * implementation of this method makes no calls at all and instead
     * immediately returns [a fulfilled promise]{@link DataService#nullPromise}.
     *
     * This method should be overridded but never called directly:
     * [getObjectProperties()]{@link DataService#getObjectProperties} should be
     * called instead as that method handles the caching, fetch aggregation, and
     * [data trigger]{@link DataTrigger} updating that is necessary. That method
     * calls this method when and if that is necessary.
     *
     * Like the promise returned by
     * [getObjectProperties()]{@link DataService#getObjectProperties}, the
     * promise returned by this method should not pass the requested value to
     * its callback: That value must instead be set on the object passed in to
     * this method.
     *
     * @method
     * @argument {object} object   - The object whose property value is being
     *                               requested.
     * @argument {string} name     - The name of the single property whose value
     *                               is being requested.
     * @returns {external:Promise} - A promise fulfilled when the requested
     * value has been received and set on the specified property of the passed
     * in object.
     */
    fetchObjectProperty: {
        value: function (object, propertyName) {
            var service = this._firstServiceForObject(object);
            return service && service !== this ? service.fetchObjectProperty(object, propertyName) : this.nullPromise;
        }
    },

    /***************************************************************************
     * Fetching data objects
     *
     * These methods should not be overridden.
     */

    /**
     * Fetch data from the service. This is the main method to be called by
     * objects using this service.
     *
     * This method must only be called on the
     * [root service][root service]{@link DataService#rootService}
     * of a service tree.
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
            var type, offline, service;
            if (this._isRootService) {
                type = selector instanceof DataSelector ? selector.type : selector;
                service = this.isOffline ? null : this._firstServiceForType(type);
                offline = service || service === null ? this._offlineService : null;
                // Set up the stream, accepting a type in lieu of a selector.
                if (!stream) {
                    stream = new DataStream();
                }
                if (selector !== type) {
                    stream.selector = selector;
                } else {
                    stream.selector = DataSelector.withTypeAndCriteria(type);
                }
                // Get the data from raw data.
                if (service) {
                    service.fetchRawData(stream);
                    if (offline) {
                        stream.then(function () {
                            offline.didFetchData(stream);
                        });
                    }
                } else if (offline) {
                    offline.fetchData(selector, stream);
                } else {
                    console.warn("Can't fetch data of unknown type -", type.typeName + "/" + type.uuid);
                    stream.dataDone();
                }
                // Return the passed in or created stream.
            }
            return stream;
        }
    },

    /***************************************************************************
     * Fetching and modifying raw data
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
                object = this.getDataObject(stream.selector.type, rawData[i], context);
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
            var keys, i, n;
            if (this.mapping) {
                this.mapping.mapFromRawData(object, data, context);
            } else if (data) {
                keys = Object.keys(data);
                for (i = 0, n = keys.length; i < n; i += 1) {
                    object[keys[i]] = data[keys[i]];
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
     * Authorizing
     */

    /**
     * indicate wether a service can provide user-level authorization to its
     * data. Defaults to false. Concrete services need to override this as
     * needed.
     *
     * @type {boolean}
     */
    providesAuthorization: {
        value: false
    },

    /**
     * Returns the list of DataServices a sevice accepts to provide
     * authorization on its behalf. If an array has multiple
     * authorizationServices, the final choice will be up to the App user
     * regarding which one to use. This array is expected to return moduleIds,
     * not objects, allowing the AuthorizationManager to manage unicity
     *
     * @type {moduleId}
     */
    authorizationServices: {
        value: null
    },

    /**
     * Returns the AuthorizationPolicyType used by this DataService.
     *
     * @type {AuthorizationPolicyType}
     */
    authorizationPolicy: {
        value: AuthorizationPolicyType.NoAuthorizationPolicy
    },

    /***************************************************************************
     * Utilities
     */

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
     * A shared promise resolved with a value of
     * `null`, useful for returning from methods like
     * [fetchObjectProperty()]{@link DataService#fetchObjectProperty}
     * when the requested data is already there.
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
     * A possibly shared promise resolved in the next cycle of the event loop
     * or soon thereafter, at which point the current event handling will be
     * complete. This is useful for services that need to buffer up actions so
     * they're committed only once in a given event loop.
     *
     * @type {external:Promise}
     */
    eventLoopPromise: {
        get: function () {
            var self = this;
            if (!this._eventLoopPromise) {
                this._eventLoopPromise = new Promise(function (resolve, reject) {
                    window.setTimeout(function () {
                        self._eventLoopPromise = undefined;
                        resolve();
                    }, 0);
                });
            }
            return this._eventLoopPromise;
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
            index = index || 0;
            length = length || length === 0 ? length : Infinity;
            return insert ? array.splice.apply(array, [index, length].concat(insert)) :
                            array.splice(index, length);
        }
    }

}, /** @lends DataService */ {

    /***************************************************************************
     * Managing service hierarchies
     */

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
    },

    /***************************************************************************
     * Authorizing
     */

    "AuthorizationPolicyType": {
        value: AuthorizationPolicyType
    },

    authorizationManager: {
        value: AuthorizationManager
    },

    /***************************************************************************
     * Utilities
     */

    /**
     * A shared empty array.
     *
     * @private
     * @type {Array}
     */
    _EMPTY_ARRAY: {
        get: function () {
            if (!exports.DataService.__EMPTY_ARRAY) {
                exports.DataService.__EMPTY_ARRAY = [];
            }
            return exports.DataService.__EMPTY_ARRAY;
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
     * [registerService()]{@link DataService.registerService} must be called at
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
    }

});
