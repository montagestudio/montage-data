var Montage = require("montage").Montage,
    Enum = require("montage/core/enum").Enum,
    AuthorizationManager = require("logic/service/authorization-manager").AuthorizationManager,
    AuthorizationPolicyType = new Enum().initWithMembers("NoAuthorizationPolicy","UpfrontAuthorizationPolicy","OnFirstFetchAuthorizationPolicy","OnDemandAuthorizationPolicy"),
    DataObjectDescriptor = require("logic/model/data-object-descriptor").DataObjectDescriptor,
    DataSelector = require("logic/service/data-selector").DataSelector,
    DataStream = require("logic/service/data-stream").DataStream,
    DataTrigger = require("logic/service/data-trigger").DataTrigger,
    Map = require("collections/map"),
    Promise = require("bluebird"),
    Set = require("collections/set"),
    WeakMap = require("collections/weak-map"),
    evaluate = require("frb/evaluate"),
    parse = require("frb/parse"),
    compile = require("frb/compile-evaluator"),
    evaluate = require("frb/evaluate"),
    Scope = require("frb/scope");

/**
 * AuthorizationPolicyType
 *
 * UpfrontAuthorizationPolicy
 *     Authorization is asked upfront, immediately after data service is
 *     created / launch of an app.
 *
 * OnDemandAuthorizationPolicy
 *     Authorization is required when a request fails because of lack of
 *     authorization. This is likely to be a good strategy for DataServices
 *     that offer data to both anonymous and authorized users.
 *
 */

/**
 * Uses [raw data services]{@link RawDataService} children to provides data
 * objects and manages changes to them.
 *
 * Data service subclasses that implement their own constructor should call this
 * class' constructor at the beginning of their constructor implementation
 * with code like the following:
 *
 *     DataService.call(this);
 *
 * @class
 * @extends external:Montage
 */
exports.DataService = Montage.specialize(/** @lends DataService.prototype */ {

    /***************************************************************************
     * Initializing
     */

    constructor: {
        value: function DataService() {
            exports.DataService.registerService(this);
            if (exports.DataService.mainService === this) {
                if (this.providesAuthorization) {
                    exports.DataService.authorizationManager.registerAuthorizationService(this);
                }
                if (this.authorizationPolicy === AuthorizationPolicyType.UpfrontAuthorizationPolicy) {
                    exports.DataService.authorizationManager.authorizeService(this).then(function(authorization) {
                        return null;
                    });
                }
            }
        }
    },

    isMainService: {
        get: function () {
            return (exports.DataService.mainService === this);
        }
    },

    /***************************************************************************
     * Basic properties
     *
     * Private properties are defined where they are used, not here.
     */

    /**
     * The types of data handled by this service. If this `undefined`, `null`,
     * or an empty array this service is assumed to handled all types of data.
     *
     * The default implementation of this property returns the union of all
     * types handled by child services of this service. Subclasses without child
     * services should override this to directly return an array of the specific
     * types they handle.
     *
     * Applications typically have one [raw data service]{@link RawDataService}
     * service for each set of related data types and one
     * [main service]{@link DataService.mainService} which is the parent of all
     * those other services and delegates work to its child services based on
     * the type of data to which the work applies. It is possible, but rare, for
     * child raw data services to have children of their own and delegate some
     * or all of their work to those children.
     *
     * A service's types cannot be changed after it is added as a child of
     * another service.
     *
     * @type {Array.<DataObjectDescriptor>}
     */
    types: {
        get: function () {
            return this._childServiceTypes;
        }
    },

    /***************************************************************************
     * Managing service hierarchies
     */

    /**
     * A read-only reference to the parent of this service.
     *
     * This value is modified by calls to
     * [addChildService()]{@link DataService#addChildService} and
     * [removeChildService()]{@link DataService#removeChildService} and cannot
     * be modified directly.
     *
     * Data services that have no parents are assumed to be
     * [root services]{@link DataService#rootService}, and usually only the
     * [main services]{@link DataService#mainService} is a root service.
     *
     * @type {DataService}
     */
    parentService: {
        get: function () {
            return this._parentService;
        }
    },

    /**
     * Convenience read-only reference to the root of the service tree
     * containing this service. For most applications this will be the
     * [main service]{@link DataService.mainService}.
     *
     * @type {DataService}
     */
    rootService: {
        get: function () {
            return this.parentService ? this.parentService.rootService : this;
        }
    },

    isRootService: {
        get: function () {
            return (this.rootService === this);
        }
    },

    /**
     * Adds a raw data service as a child of this data service and set it to
     * handle data of the types defined by its [types]{@link DataService#types}
     * property.
     *
     * Child services must have their [types]{@link DataService#types} property
     * defined before they are passing in to this method.
     *
     * @method
     * @argument {RawDataService} service
     */
    addChildService: {
        value: function (child) {
            var types = child.types,
                children, type, i, n;
            // If the new child service already has a parent, remove it from
            // that parent.
            if (child._parentService) {
                child._parentService.removeChildService(child);
            }
            // Add the new child service to the services array of each of its
            // types or to the "all types" service array identified by the
            // `null` type, and add each of the new child's types to the array
            // of child types if they're not already there.
            for (i = 0, n = types && types.length || 1; i < n; i += 1) {
                type = types && types.length && types[i] || null;
                children = this._childServiceMap.get(type) || [];
                children.push(child);
                if (children.length === 1) {
                    this._childServiceMap.set(type, children);
                    if (type) {
                        this._childServiceTypes.push(type);
                    }
                }
            }
            // Add the new child to this service's children set.
            this._childServices.add(child);
            // Set the new child service's parent.
            child._parentService = this;
        }
    },

    /**
     * Remove a raw data service as a child of this service and clear its parent
     * if that service is a child of this service.
     *
     * The performance of this method is O(m) + O(n), where m is the number of
     * children of this service handling the same type as the child service to
     * remove and n is the number of types handled by all children of this
     * service.
     *
     * @method
     * @argument {RawDataService} service
     */
    removeChildService: {
        value: function (child) {
            var types = child.types,
                type, chidren, index, i, n;
            // Remove the child service from the services array of each of its
            // types or from the "all types" service array identified by the
            // `null` type, or remove a type altogether if its service array
            // only contains the child service to remove, or remove the "all
            // types" service array if it only contains the child service to
            // remove.
            for (i = 0, n = types && types.length || 1; i < n; i += 1) {
                type = types && types.length && types[i] || null;
                chidren = this._childServiceMap.get(type);
                index = chidren ? chidren.indexOf(child) : -1;
                if (index >= 0 && chidren.length > 1) {
                    chidren.splice(index, 1);
                } else if (index === 0) {
                    this._childServiceMap.delete(type);
                    index = type ? this._childServiceTypes.indexOf(type) : -1;
                    if (index >= 0) {
                        this._childServiceTypes.splice(index, 1);
                    }
                }
            }
            // Remove the child from this service's children set.
            this._childServices.delete(child);
            // Clear the service parent if appropriate.
            if (child._parentService === this) {
                child._parentService = undefined;
            }
        }
    },

    /**
     * Get the first child service that can handle the specified object,
     * or `null` if no such child service exists.
     *
     * @private
     * @method
     * @argument {Object} object
     * @returns {DataService}
     */
    getChildServiceForObject: {
        value: function (object) {
            return this.getChildServiceForType(this.rootService._getObjectType(object));
        }
    },

    /**
     * Get the first child service that can handle data of the specified type,
     * or `null` if no such child service exists.
     *
     * @private
     * @method
     * @argument {DataObjectDescriptor} type
     * @returns {DataService}
     */
    getChildServiceForType: {
        value: function (type) {
            var services = this._childServiceMap.get(type) || this._childServiceMap.get(null);
            return services && services[0] || null;
        }
    },

    /**
     * Private settable parent service reference.
     *
     * This property should not be modified outside of
     * [addChildService()]{@link DataService#addChildService} and
     * [removeChildService()]{@link DataService#removeChildService}.
     *
     * @private
     * @type {DataService}
     */
    _parentService: {
        value: undefined
    },

    /**
     * A map from each of the data types handled by this service to an array
     * of the child services that can handle that type, with each such array
     * ordered according to the order in which the services in it were
     * [added]{@link DataService#addChildService} as children of this service.
     *
     * If one or more child services of this service are defined as handling all
     * types (their [types]{@link DataService#types} property is `undefined`,
     * `null`, or an empty array), the child service map also include a `null`
     * key whose corresponding value is an array of all those services defined
     * to handle all types.
     *
     * The contents of this map should not be modified outside of
     * [addChildService()]{@link DataService#addChildService} and
     * [removeChildService()]{@link DataService#removeChildService}.
     *
     * @private
     * @type {Map<DataObjectDescriptor, Array<DataService>>}
     */
    _childServiceMap: {
        get: function() {
            if (!this.__childServiceMap) {
                this.__childServiceMap = new Map();
            }
            return this.__childServiceMap;
        }
    },

    /**
     * An array of the data types handled by all child services of this service.
     *
     * The contents of this map should not be modified outside of
     * [addChildService()]{@link DataService#addChildService} and
     * [removeChildService()]{@link DataService#removeChildService}.
     *
     * @private
     * @type {Array<DataObjectDescriptor>}
     */
    _childServiceTypes: {
        get: function() {
            if (!this.__childServiceTypes) {
                this.__childServiceTypes = [];
            }
            return this.__childServiceTypes;
        }
    },

    _childServices: {
        get: function() {
            if (!this.__childServices) {
                this.__childServices = new Set();
            }
            return this.__childServices;
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
     * Returns the list of DataServices a service accepts to provide
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
     * Managing data object prototypes and their triggers
     */

    /**
     * Returns a prototype for objects of the specified type. The returned
     * prototype will have the [data triggers]{@link DataTrigger} required by
     * the relationships and lazy properties of the type. A single prototype
     * will be created for all objects of a given type.
     *
     * @private
     * @method
     * @argument {DataObjectDescriptor} type
     * @returns {Object}
     */
    _getPrototypeForType: {
        value: function (type) {
            var prototype = this._dataObjectPrototypes.get(type);
            if (type && !prototype) {
                prototype = Object.create(type.objectPrototype);
                this._dataObjectPrototypes.set(type, prototype);
                this._dataObjectTriggers.set(type, DataTrigger.addTriggers(this, type, prototype));
            }
            return prototype;
        }
    },

    /**
     * Returns the [data triggers]{@link DataTrigger} set up for objects of the
     * specified type.
     *
     * @private
     * @method
     * @argument {Object} object
     * @returns {Object<string, DataTrigger>}
     */
    _getTriggersForObject: {
        value: function (object) {
            var type = this._getObjectType(object);
            return type && this._dataObjectTriggers.get(type);
        }
    },


    _dataObjectPrototypes: {
        get: function () {
            if (!this.__dataObjectPrototypes){
                this.__dataObjectPrototypes = new Map();
            }
            return this.__dataObjectPrototypes;
        }
    },

    _dataObjectTriggers: {
        get: function () {
            if (!this.__dataObjectTriggers){
                this.__dataObjectTriggers = new Map();
            }
            return this.__dataObjectTriggers;
        }
    },

    /***************************************************************************
     * Tracking data object types
     */

    /**
     * Get the type of the specified data object.
     *
     * @private
     * @method
     * @argument {Object} object       - The object whose type is sought.
     * @returns {DataObjectDescriptor} - The type of the object, or undefined if
     * no type can be determined.
     */
    _getObjectType: {
        value: function (object) {
            var type = this._typeRegistry.get(object);
            while (!type && object) {
                if (object.constructor.TYPE instanceof DataObjectDescriptor) {
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
    _setObjectType: {
        value: function (object, type) {
            if (this._isRootService && this._getObjectType(object) !== type){
                this._typeRegistry.set(object, type);
            }
        }
    },

    _typeRegistry: {
        get: function () {
            if (!this.__typeRegistry){
                this.__typeRegistry = new WeakMap();
            }
            return this.__typeRegistry;
        }
    },

    /***************************************************************************
     * Tracking data object changes
     */

    /**
     * A set of the data objects created by this service or any other descendent
     * of this service's [root service]{@link DataService#rootService} since
     * [saveDataChanges()]{@link DataService#saveDataChanges} was last called,
     * or since the root service was created if saveDataChanges() hasn't been
     * called yet.
     *
     * Since root services are responsible for tracking data objects, subclasses
     * whose instances will not be root services should override this property
     * to return their root service's value for it.
     *
     * @type {Set.<Object>}
     */
    createdDataObjects: {
        get: function () {
            if (!this._createdDataObjects) {
                this._createdDataObjects = new Set();
            }
            return this._createdDataObjects;
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
     * Since root services are responsible for tracking data objects, subclasses
     * whose instances will not be root services should override this property
     * to return their root service's value for it.
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

    /***************************************************************************
     * Creating data objects
     */

    /**
     * Find an existing data object corresponding to the specified raw data, or
     * if no such object exists, create one.
     *
     * Since root services are responsible for tracking and creating data
     * objects, subclasses whose instances will not be root services should
     * override this method to call their root service's implementation of it.
     *
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to find or
     *                                         create.
     * @argument {Object} data               - An object whose property values
     *                                         hold the object's raw data. That
     *                                         data will be used to determine
     *                                         the object's unique identifier.
     * @argument {?} context                 - A value, usually passed in to a
     *                                         [raw data service's]{@link RawDataService}
     *                                         [addRawData()]{@link RawDataService#addRawData}
     *                                         method, that can help in getting
     *                                         or creating the object.
     * @returns {Object} - The existing object with the unique identifier
     * specified in the raw data, or if no such object exists a newly created
     * object of the specified type.
     */
    getDataObject: {
        value: function (type, data, context) {
            // TODO [Charles]: Object uniquing.
            return this._createDataObject(type);
        }
    },

    /**
     * Create a new data object of the specified type.
     *
     * Since root services are responsible for tracking and creating data
     * objects, subclasses whose instances will not be root services should
     * override this method to call their root service's implementation of it.
     *
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to create.
     * @returns {Object}                     - The created object.
     */
    createDataObject: {
        value: function (type) {
            var object = this._createDataObject(type);
            this.createdDataObjects.add(object);
            return object;
        }
    },

    /**
     * Create a data object without registering it in the new object map.
     *
     * @private
     * @method
     * @argument {DataObjectDescriptor} type - The type of object to create.
     * @returns {Object}                     - The created object.
     */
    _createDataObject: {
        value: function (type) {
            var object = Object.create(this._getPrototypeForType(type));
            if (object) {
                object = object.constructor.call(object) || object;
                if (object) {
                    this._setObjectType(object, type);
                }
            }
            return object;
        }
    },

    /***************************************************************************
     * Fetching data objects
     */

    /**
     * Fetch data from the service using its child services.
     *
     * This method accept [types]{@link DataObjectDescriptor} as alternatives to
     * [selectors]{@link DataSelector}, and its [stream]{DataStream} argument is
     * optional, but when it calls its child services it will provide them with
     * both a [selectors]{@link DataSelector} and a [stream]{DataStream}.
     *
     * The requested data may be fetched asynchronously, in which case the data
     * stream will be returned immediately but the stream's data will be added
     * to the stream at a later time.
     *
     * @method
     * @argument {DataSelector} selector - Defines what data should be returned.
     *                                     A type can be provided instead of a
     *                                     {@link DataSelector}, in which
     *                                     case a DataSelector with the
     *                                     specified type and no
     *                                     [criteria]{@link DataSelector#criteria}
     *                                     will be created and used for the
     *                                     fetch.
     * @argument {?DataStream} stream    - The stream to which the provided data
     *                                     should be added. If no stream is
     *                                     provided a stream will be created and
     *                                     returned by this method.
     * @returns {DataStream} - The stream provided to or created by this method.
     */
    fetchData: {
        value: function (selector, stream) {
            // Accept a type in lieu of a selector.
            if (!(selector instanceof DataSelector)) {
                selector = DataSelector.withTypeAndCriteria(selector);
            }
            // Set up the stream.
            stream = stream || new DataStream();
            stream.selector = selector;
            // Use a child service to fetch the data.
            try {
                service = this.getChildServiceForType(selector.type);
                if (service) {
                    stream = service.fetchData(selector, stream) || stream;
                } else {
                    throw new Error("Can't fetch data of unknown type - " + selector.type.typeName + "/" + selector.type.uuid);
                }
            } catch (e) {
                stream.dataError(e);
            }
            // Return the passed in or created stream.
            return stream;
        }
    },

    /***************************************************************************
     * Handling offline
     */

    /**
     * Returns a value derived from and continuously updated with the value of
     * [navigator.onLine]{@link https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine/onLine}.
     *
     * Root services are responsible for tracking offline status, and subclasses
     * not designed to be root services should override this property to get
     * it value from their root service.
     *
     * @type {boolean}
     */
    _isOffline: {
        value: undefined
    },
    isOffline: {
        get: function () {
            var self = this;
            if (this._isOffline === undefined) {
                this._isOffline = !navigator.onLine;
                window.addEventListener('online', 
                    function (event) { 
                        self._isOffline = false;
                    });
                window.addEventListener('offline', 
                    function (event) {
                        self._isOffline = true; 
                    });
            }
            return this._isOffline;
        },
        set: function (offline) {
            if (offline !== this.isOffline) {
                this._isOffline = offline;
                if(!this._isOffline && this.isRootService) {
                    this._processOfflineToOnlineOperations();
                }
            }
        }
    },

    __compiledSortOfflineOperationExpression: {
        value: undefined
    },
    _compiledSortOfflineOperationExpression: {
        get:function() {
            return this.__compiledSortOfflineOperationExpression 
                    || (this.__compiledSortOfflineOperationExpression = compile(parse("sorted{lastModified}.reversed()")));
        }
    },
     __sortOfflineOperationScope: {
        value: undefined
    },
   _sortOfflineOperationScope: {
        get:function() {
            return this.__sortOfflineOperationScope
                    || (this.__sortOfflineOperationScope = new Scope());
        }
    },

    _processOfflineToOnlineOperations: {
        value: function() {
            /*
            1) Fetch all operations at main service level
                1.1) offlineOperations getter, on Data-Service, implemented by Raw Data Service. Default implementation is looping on childServices and collecting results of accessing offline operations on them
            2) weakmap operation - > service
            3) Sort operations by time
            4) Walk array
                forEarch:
                    matching rawDataService performOfflineOperations: (if contiguous)
            */
            var self = this,
                offlineOperations,
                dataStream = dataStream || (new DataStream()),
                i, countI, iOperation, iOperationService, j, iOperationBatch,
                operationToService = new WeakMap();

                this.readOfflineOperations(operationToService)
                    .then(function (operations) {
                        var offlineOperations = operations;


                        /* Operations shape is:
                            {
                                dataID:
                                type:
                                lastFetched: Date("08-02-2016"),
                                lastModified: Date("08-02-2016"),
                                operation: "update"||"delete"
                            }
                        */

                        //Sort operations by lastModified, descending
                        self._sortOfflineOperationScope.value = offlineOperations;
                        self._compiledSortOfflineOperationExpression(self._sortOfflineOperationScope);
                        i = 0;
                        countI = offlineOperations.length;
                        while(i<countI) {
                            iOperation = offlineOperations[i];
                            iOperationService = operationToService.get(iOperation);
                            iOperationBatch = [iOperation];
                            j=i+1;
                            while(operationToService.get(offlineOperations[j]) === iOperationService && j<countI) {
                                iOperationBatch.push(offlineOperations[j]);
                                j++;
                            }

                            iOperationService.performOfflineOperations(iOperationBatch).then(function(performedOperations) {
                                iOperationService.deleteOfflineOperations(iOperationBatch);
                            })
                            .catch(function(error) {

                            });
        
                            i += iOperationBatch.length;
                        }

                    });
        }
    },

    /**
     * Reads offline operations available through all children DataServices
     *
     * @method
     * @argument {DataSelector} selector - Defines what data should be returned.
     * @returns {DataStream} -  The stream to which the provided data
     *                                     should be added.
     * the changed object has been saved.
     */

    readOfflineOperations: {
        value: function (operationMapToService) {
            var childrenSet = this._childServices,
                promise, promises, i, n,
                childrenIterator = childrenSet.values(), childService, childServicePromise,
                array;

            while (childService = childrenIterator.next().value) {
                childServicePromise =  new Promise(function (resolve, reject) {
                    var dataService = childService;
                    array = array || [];
                    operationMapToService = operationMapToService || (new WeakMap());

                    dataService.readOfflineOperations(operationMapToService)
                    .then(function(childOperations) {
                        if (childOperations && childOperations.length) {
                            array.push.apply(array, childOperations);
                            for(var j=0, countJ = childOperations.length;(j<countJ);j++) {
                                operationMapToService.set(childOperations[j],dataService);
                            }
                        }
                        resolve(childOperations);
                    }).catch(function(e) {
                        reject(e);
                        console.error(e);
                    });
                    // if (promise !== this.emptyArrayPromise) {
                    //     promises = promises || [];
                    //     promises.push(promise);
                    // }
                });

                promises = promises || [];
                promises.push(childServicePromise);
            }
            return promises ? Promise.all(promises).then(function () { return array; }) :
                                    this.emptyArrayPromise;
        }
    },

    performOfflineOperations: {
        value: function(operations) {
            // Subclasses must override this.
            //loop
            var constructor = this.constructor,
                promises = [];
            for (var i = 0, countI = operations.length; i < countI; i++) {
                promises.push(constructor.methodForOfflineOperation(operations[i]).call(this,operations[i]));
            }

            return Promise.all(promises);
        }
    },

    deleteOfflineOperations: {
        value: function(operations) {
            // Subclasses must override this.
        }
    },

    /***************************************************************************
     * Saving changed data objects
     */

    /**
     * Delete a data object.
     *
     * @method
     * @argument {Object} object   - The object whose data should be deleted.
     * @returns {external:Promise} - A promise fulfilled when the object has
     * been deleted.
     */
    deleteDataObject: {
        value: function (object) {
            var saved = !this.createdDataObjects.has(object);
            return this._updateDataObject(object, saved && "deleteDataObject");
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
            return this._updateDataObject(object, "saveDataObject");
        }
    },

    /**
     * Save all the changes that were made to any of the objects managed by this
     * service since those objects were fetched. Note that objects fetched by a
     * child service will be managed by that service's root service, not by the
     * child service itself.
     *
     * Since root services are responsible for tracking data changes, subclasses
     * whose instances will not be root services should override this method to
     * call their root service's implementation of it.
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
            return this.nullPromise;
        }
    },

    _updateDataObject: {
        value: function (object, action) {
            var self = this,
                service = action && this.getChildServiceForObject(object),
                promise = this.nullPromise;
            if (!action) {
                self.createdDataObjects.delete(object);
            } else if (service) {
                promise = service[action](object).then(function () {
                    self.createdDataObjects.delete(object);
                    return null;
                });
            }
            return promise;
        }
    },

    /***************************************************************************
     * Managing data object property values
     */

    /**
     * @todo Rename and document API and implementation.
     *
     * Since root services are responsible for triggerring data objects fetches,
     * subclasses whose instances will not be root services should override this
     * method to call their root service's implementation of it.
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
     * To force an update of a value that was previously obtained or set, use
     * [updateObjectProperties()]{@link DataService#updateObjectProperties}
     * instead of this method.
     *
     * Since root services are responsible for determining when to fetch or
     * update data objects values, subclasses whose instances will not be root
     * services should override this method to call their root service's
     * implementation of it.
     *
     * Subclasses should define how property values are obtained by overriding
     * [fetchObjectProperty()]{@link DataService#fetchObjectProperty} instead
     * of this method. That method will be called by this method when needed.
     *
     * Although this method returns a promise, the requested data will not be
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
            var names = Array.isArray(propertyNames) ? propertyNames : arguments,
                start = names === propertyNames ? 0 : 1;
            return this._getOrUpdateObjectProperties(object, names, start, false);
        }
    },

    /**
     * Request possibly asynchronous values of a data object's properties,
     * forcing asynchronous values to be re-fetched and updated even if they
     * had previously been fetched or set.
     *
     * Except for the forced update, this method behaves exactly like
     * [getObjectProperties()]{@link DataService#getObjectProperties}.
     *
     * Since root services are responsible for determining when to fetch or
     * update data objects values, subclasses whose instances will not be root
     * services should override this method to call their root service's
     * implementation of it.
     *
     * Subclasses should define how property values are obtained by overriding
     * [fetchObjectProperty()]{@link DataService#fetchObjectProperty} instead
     * of this method. That method will be called by this method when needed.
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
            var names = Array.isArray(propertyNames) ? propertyNames : arguments,
                start = names === propertyNames ? 0 : 1;
            return this._getOrUpdateObjectProperties(object, names, start, true);
        }
    },

    /**
     * Fetch the value of a data object's property, possibly asynchronously.
     *
     * The default implementation of this method delegates the fetching to a
     * child services, or does nothing but return a fulfilled promise for `null`
     * if no child service can be found to handle the specified object.
     *
     * [Raw data service]{@link RawDataService} subclasses should override
     * this method to perform any fetch or other operation required to get the
     * requested data. The subclass implementations of this method should use
     * only [fetchData()]{@link DataService#fetchData} calls to fetch data.
     *
     * This method should never be called directly:
     * [getObjectProperties()]{@link DataService#getObjectProperties} or
     * [updateObjectProperties()]{@link DataService#updateObjectProperties}
     * should be called instead as those methods handles some required caching,
     * fetch aggregation, and [data trigger]{@link DataTrigger}. Those methods
     * will call this method if and when that is necessary.
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
            var service = this.getChildServiceForObject(object);
            return service ? service.fetchObjectProperty(object, propertyName) :
                             this.nullPromise;
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

    emptyArrayPromise: {
        get: function () {
            if (!exports.DataService._emptyArrayPromise) {
                exports.DataService._emptyArrayPromise = Promise.resolve([]);
            }
            return exports.DataService._emptyArrayPromise;
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
     * A reference to the application's main service.
     *
     * Applications typically have one and only one main service to which all
     * data requests are sent. This service can in turn delegate handling of
     * different types of data to child services specialized for each type.
     *
     * This property will be set correctly if
     * [registerService()]{@link DataService.registerService} is called at least
     * once with a service that is either the main service or a descendent of
     * it. Since `registerService()` is called by de default
     * [data service constructor]{@link DataService}, that will usually happen
     * automatically.
     *
     * @type {DataService}
     */
    mainService: {
        get: function () {
            if (this._mainService && this._mainService.parentService) {
                this._mainService = this._mainService.rootService;
            }
            return this._mainService;
        },
        set: function (service) {
            this._mainService = service;
        }
    },

    /**
     * Register the main service or one of its descendants.
     *
     * For the [main service]{@link DataService.mainService] to be set correctly
     * this method must be called at least once with a service that is either
     * the main service or a descendent of the main service. It can be called
     * multiple times with the main service or a descendent of the main service,
     * but it cannot be called with a service that will not be the main service
     * or a descendent of the main service.
     *
     * The {@link DataService} constructor calls this method, so the
     * [main service]{@link DataService.mainService} will be set correctly if
     * the first created service is either the main service or a descendant of
     * the main service.
     *
     * @method
     */
    registerService: {
        value: function (service) {
            if (!this.mainService) {
                this.mainService = service;
            }
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

    _operationTypeToServiceMethod: {
        value: new Map()
    },
    methodForOfflineOperation: {
        value: function(operation) {
            //Check if custom method per type
            var operationType = operation.type,
                iMethod = this._operationTypeToServiceMethod.get(operationType),
                iMethodName;

            if (iMethod === undefined) {
                iCapitalizedType = operationType[0].toUpperCase();
                iCapitalizedType += operationType.slice(1);
                
                iMethodName = "perform";
                iMethodName += iCapitalizedType;
                iMethodName += "OfflineOperation";

                if (typeof(iMethod = this.prototype[iMethodName]) === "function") {
                    this._operationTypeToServiceMethod.set(operationType,iMethod);
                }
                else {
                    this._operationTypeToServiceMethod.set(operationType,this.prototype.performOfflineOperation);
                }
            }
            return iMethod;
        }
    }


});
