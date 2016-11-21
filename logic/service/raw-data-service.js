var DataService = require("logic/service/data-service").DataService,
    DataObjectDescriptor = require("logic/model/data-object-descriptor").DataObjectDescriptor,
    DataSelector = require("logic/service/data-selector").DataSelector,
    DataStream = require("logic/service/data-stream").DataStream,
    WeakMap = require("collections/weak-map");

/**
 * Provides data objects of certain types and manages changes to them based on
 * "raw" data obtained from or sent to one or more other services, typically
 * REST or other network services. Raw data services can therefore be considered
 * proxies for these REST or other services.
 *
 * Raw data services are usually the children of a
 * [data service]{@link DataService} that often is the application's
 * [main data service]{@link DataService.mainService}. All calls to raw data
 * services that have parent services must be routed through those parents.
 *
 * Raw data service subclasses that implement their own constructor should call
 * this class' constructor at the beginning of their constructor implementation
 * with code like the following:
 *
 *     RawDataService.call(this);
 *
 * @class
 * @extends DataService
 */
exports.RawDataService = DataService.specialize(/** @lends RawDataService.prototype */ {

    /***************************************************************************
     * Initializing
     */

    constructor: {
        value: function RawDataService() {
            DataService.call(this);
        }
    },

    /***************************************************************************
     * Data Object Properties
     */

    decacheObjectProperties: {
        value: function (object, propertyNames) {
            return this.rootService.decacheObjectProperties(object, propertyNames);
        }
    },

    getObjectProperties: {
        value: function (object, propertyNames) {
            return this.rootService.getObjectProperties(object, propertyNames);
        }
    },

    updateObjectProperties: {
        value: function (object, propertyNames) {
            return this.rootService.updateObjectProperties(object, propertyNames);
        }
    },

    /**
     * Fetch the value of a data object's property, possibly asynchronously.
     *
     * The default implementation of this method just return a fulfilled promise
     * for `null`. Subclasses should override this method to perform any fetch
     * or other operation required to get the requested data. The subclass
     * implementations should only use calls to their
     * [root service's]{@link DataService.rootService}
     * [fetchData()]{@link DataService#fetchData} to fetch data.
     *
     * @method
     */
    fetchObjectProperty: {
        value: function (object, propertyName) {
            return this.nullPromise;
        }
    },

    /***************************************************************************
     * Data Object Creation
     *
     * If there were no mapping available in the app for this record giving use
     * a type/class/condtructor, we should create one ourselves matching what we know.
     * For a REST service it would be the name of the Entity. Otherwise we should be able
     * to treat by ip domain, a type based on concatenation of all keys returned,
     * which would define the "shape"
     *
     */

    getDataObject: {
        value: function (type, record, context) {
            return this.rootService.getDataObject(type, record, context);
        }
    },

    createDataObject: {
        value: function (type) {
            return this.rootService.createDataObject(type);
        }
    },

    /***************************************************************************
     * Data Object Changes
     */

    createdDataObjects: {
        get: function () {
            return this.rootService.createdDataObjects();
        }
    },

    changedDataObjects: {
        get: function () {
            return this.rootService.changedDataObjects();
        }
    },

    /***************************************************************************
     * Fetching Data
     */

    /**
     * Fetch data from this service for its parent. This method should not be
     * called directly by anyone other than this service's parent. Calls to the
     * root service should be made to initiate data fetches.
     *
     * Subclasses may override this method to fetch the requested data, but will
     * usually override [fetchRawData()]{@link RawDataService#fetchRawData}
     * instead.
     *
     * This method must be asynchronous and return as soon as possible even if
     * it takes a while to generate the requested data objects. The data objects
     * can be generated and added to the specified stream at any point after
     * this method is called, even after it returns, with calls to
     * [addData()]{@link DataStream#addData} and
     * [dataDone()]{@link DataStream#dataDone}. Usually this will be done by
     * having [fetchRawData()]{@link RawDataService#fetchRawData} make calls to
     * [addRawData()]{@link RawDataService#addRawData} and
     * [rawDataDone()]{@link RawDataService#rawDataDone}.
     *
     * The default implementation of this method calls
     * [fetchRawData()]{@link RawDataService#fetchRawData}.
     *
     * @method
     * @argument {DataObjectDescriptor|DataSelector}
     *           typeOrSelector        - Defines what data should be returned.
     *                                   If a [type]{@link DataOjectDescriptor}
     *                                   is provided instead of a
     *                                   {@link DataSelector}, a `DataSelector`
     *                                   with the specified type and no
     *                                   [criteria]{@link DataSelector#criteria}
     *                                   will be created and used for the fetch.
     * @argument {?DataStream} stream  - The stream to which the provided data
     *                                   should be added. If no stream is
     *                                   provided a stream will be created and
     *                                   returned by this method.
     * @returns {?DataStream} - The stream to which the fetched data objects
     * were or will be added, whether this stream was provided to or created by
     * this method.
     */
    fetchData: {
        value: function (typeOrSelector, stream) {
            var type = typeOrSelector instanceof DataObjectDescriptor && typeOrSelector,
                selector = type && DataSelector.withTypeAndCriteria(type) || typeOrSelector;
            stream = stream || new DataStream();
            stream.selector = this.mapSelectorToRawDataSelector(selector);
            this.fetchRawData(stream);
            stream.selector = selector;
            return stream;
        }
    },

    /**
     * Fetch the raw data of this service.
     *
     * This method should not be called directly from anyone other than this
     * service's [fetchData()]{@link RawDataService#fetchData}.
     *
     * Subclasses that don't override
     * [fetchData()]{@link RawDataService#fetchData} should override this method
     * to:
     *
     *   1. Fetch the raw records needed to generate the requested data object.
     *
     *   2. Add those records to the specified stream with calls to
     *      [addRawData()]{@link RawDataService#addRawData}.
     *
     *   3. Indicate that the fetching is done with a call to
     *      [rawDataDone()]{@link RawDataService#rawDataDone}.
     *
     * This method must be asynchronous and return as soon as possible even if
     * it takes a while to obtain the raw data. The raw data can be provided to
     * the service at any point after this method is called, even after it
     * returns, with calls to [addRawData()]{@link RawDataService#addRawData}
     * and [rawDataDone()]{@link RawDataService#rawDataDone}.
     *
     * The default implementation of this method simply calls
     * [rawDataDone()]{@link RawDataService#rawDataDone} immediately.
     *
     * @method
     * @argument {DataStream} stream - The stream to which the data objects
     *                                 corresponding to the raw data should be
     *                                 added. This stream must contain a
     *                                 reference to the selector defining what
     *                                 raw data to fetch.
     */
    fetchRawData: {
        value: function (stream) {
            this.rawDataDone(stream);
        }
    },

    /***************************************************************************
     * Saving Data
     */

    /**
     * Subclasses should override this method to delete a data object when that
     * object's raw data wouldn't be useful to perform the deletion.
     *
     * The default implementation maps the data object to raw data and calls
     * [deleteRawData()]{@link RawDataService#deleteRawData} with the data
     * object passed in as the `context` argument of that method.
     *
     * @method
     * @argument {Object} object   - The object to delete.
     * @returns {external:Promise} - A promise fulfilled when the object has
     * been deleted. The promise's fulfillment value is not significant and will
     * usually be `null`.
     */
    deleteDataObject: {
        value: function (object) {
            var record = {};
            this.mapObjectToRawData(object, record);
            return this.deleteRawData(record, object);
        }
    },

    /**
     * Subclasses should override this method to delete a data object when that
     * object's raw data would be useful to perform the deletion.
     *
     * @method
     * @argument {Object} record   - An object whose properties hold the raw
     *                               data of the object to delete.
     * @argument {?} context       - An arbitrary value sent by
     *                               [deleteDataObject()]{@link RawDataService#deleteDataObject}.
     *                               By default this is the object to delete.
     * @returns {external:Promise} - A promise fulfilled when the object's data
     * has been deleted. The promise's fulfillment value is not significant and
     * will usually be `null`.
     */
    deleteRawData: {
        value: function (record, context) {
            // Subclasses must override this.
            return this.nullPromise;
        }
    },

    /**
     * Subclasses should override this method to save a data object when that
     * object's raw data wouldn't be useful to perform the save.
     *
     * The default implementation maps the data object to raw data and calls
     * [saveRawData()]{@link RawDataService#saveRawData} with the data object
     * passed in as the `context` argument of that method.
     *
     * @method
     * @argument {Object} object   - The object to save.
     * @returns {external:Promise} - A promise fulfilled when all of the data in
     * the changed object has been saved. The promise's fulfillment value is not
     * significant and will usually be `null`.
     */
    saveDataObject: {
        value: function (object) {
            var record = {};
            this.mapObjectToRawData(object, record);
            return this.saveRawData(record, object);
        }
    },

    /**
     * Subclasses should override this method to save a data object when that
     * object's raw data would be useful to perform the save.
     *
     * @method
     * @argument {Object} record   - An object whose properties hold the raw
     *                               data of the object to save.
     * @argument {?} context       - An arbitrary value sent by
     *                               [saveDataObject()]{@link RawDataService#saveDataObject}.
     *                               By default this is the object to save.
     * @returns {external:Promise} - A promise fulfilled when the object's data
     * has been saved. The promise's fulfillment value is not significant and
     * will usually be `null`.
     */
    saveRawData: {
        value: function (record, context) {
            // Subclasses must override this.
            return this.nullPromise;
        }
    },

    /***************************************************************************
     * Offline
     */

    /*
     * Returns the [root service's offline status]{@link DataService#isOffline}.
     *
     * @type {boolean}
     */
    isOffline: {
        get: function () {
            return this.rootService.isOffline;
        }
    },

    /**
     * Called with all the data passed to
     * [addRawData()]{@link RawDataService#addRawData} to allow storing of that
     * data for offline use.
     *
     * The default implementation does nothing. This is appropriate for
     * subclasses that do not support offline operation or which operate the
     * same way when offline as when online.
     *
     * Other subclasses may override this method to store data fetched when
     * online so [fetchData]{@link RawDataSource#fetchData} can use that data
     * when offline.
     *
     * @method
     * @argument {Object} records  - An array of objects whose properties' values
     *                               hold the raw data.
     * @argument {?DataSelector} selector
     *                             - Describes how the raw data was selected.
     * @argument {?} context       - The value that was passed in to the
     *                               [rawDataDone()]{@link RawDataService#rawDataDone}
     *                               call that invoked this method.
     * @returns {external:Promise} - A promise fulfilled when the raw data has
     * been saved. The promise's fulfillment value is not significant and will
     * usually be `null`.
     */
    writeOfflineData: {
        value: function (records, selector, context) {
            // Subclasses should override this to do something useful.
            return this.nullPromise;
        }
    },

    /***************************************************************************
     * Collecting Raw Data
     */

    /**
     * To be called by [fetchData()]{@link RawDataService#fetchData} or
     * [fetchRawData()]{@link RawDataService#fetchRawData} when raw data records
     * are received. This method should never be called outside of those
     * methods.
     *
     * This method creates and registers the data objects that
     * will represent the raw records with repeated calls to
     * [getDataObject()]{@link DataService#getDataObject}, maps
     * the raw data to those objects with repeated calls to
     * [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject},
     * and then adds those objects to the specified stream.
     *
     * Subclasses should not override this method and instead override their
     * [getDataObject()]{@link DataService#getDataObject} method, their
     * [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject} method,
     * their [mapping]{@link RawDataService#mapping}'s
     * [mapRawDataToObject()]{@link RawDataMapping#mapRawDataToObject} method,
     * or several of these.
     *
     * @method
     * @argument {DataStream} stream
     *                           - The stream to which the data objects created
     *                             from the raw data should be added.
     * @argument {Array} records - An array of objects whose properties'
     *                             values hold the raw data. This array
     *                             will be modified by this method.
     * @argument {?} context     - An arbitrary value that will be passed to
     *                             [getDataObject()]{@link RawDataService#getDataObject}
     *                             and
     *                             [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject}
     *                             if it is provided.
     */
    addRawData: {
        value: function (stream, records, context) {
            var offline, object, i, n;
            // Record fetched raw data for offline use if appropriate.
            offline = records && !this.isOffline && this._streamRawData.get(stream);
            if (offline) {
                offline.push.apply(offline, records);
            } else if (records && !this.isOffline) {
                this._streamRawData.set(stream, records.slice())
            }
            // Convert the raw data to appropriate data objects. The conversion
            // will be done in place to avoid creating any unnecessary array.
            for (i = 0, n = records && records.length; i < n; i += 1) {
                object = this.getDataObject(stream.selector.type, records[i], context);
                this.mapRawDataToObject(records[i], object, context);
                records[i] = object;
            }
            // Add the converted data to the stream.
            stream.addData(records);
        }
    },

    /**
     * To be called once for each [fetchData()]{@link RawDataService#fetchData}
     * or [fetchRawData()]{@link RawDataService#fetchRawData} call received to
     * indicate that all the raw data meant for the specified stream has been
     * added to that stream.
     *
     * Subclasses should not override this method.
     *
     * @method
     * @argument {DataStream} stream - The stream to which the data objects
     *                                 corresponding to the raw data have been
     *                                 added.
     * @argument {?} context         - An arbitrary value that will be passed to
     *                                 [writeOfflineData()]{@link RawDataService#writeOfflineData}
     *                                 if it is provided.
     */
    rawDataDone: {
        value: function (stream, context) {
            var offline = this._streamRawData.get(stream);
            if (!offline) {
                stream.dataDone();
            } else {
                this._streamRawData.delete(stream);
                this.writeOfflineData(offline, stream.selector, context).then(function () {
                    stream.dataDone();
                    return null;
                }).catch(function (e) {
                    console.error(e);
                });
            }
        }
    },

    /**
     * Records in the process of being written to streams (after
     * [addRawData()]{@link RawDataService#addRawData} has been called and
     * before [rawDataDone()]{@link RawDataService#rawDataDone} is called for
     * any given stream). This is used to collect raw data that needs to be
     * stored for offline use.
     *
     * @private
     * @type {Object.<Stream, records>}
     */
    _streamRawData: {
        get: function () {
            if (!this.__streamRawData) {
                this.__streamRawData = new WeakMap();
            }
            return this.__streamRawData;
        }
    },

    __streamRawData: {
        value: undefined
    },

    /***************************************************************************
     * Mapping Raw Data
     */

    /**
     * Convert a selector for data ojects to a selector for raw data.
     *
     * The selector returned by this method will be the selector used by methods
     * that deal with raw data, like
     * [fetchRawData()]{@link RawDataService#fetchRawData]},
     * [addRawData()]{@link RawDataService#addRawData]},
     * [rawDataDone()]{@link RawDataService#rawDataDone]}, and
     * [writeOfflineData()]{@link RawDataService#writeOfflineData]}. Any
     * [stream]{@link DataStream} available to these methods will have their
     * selector references temporarly replaced by references to the mapped
     * selector returned by this method.
     *
     * The default implementation of this method returns the passed in selector.
     *
     * @method
     * @argument {DataSelector} selector - A selector defining data objects to
     *                                     select.
     * @returns {DataSelector} - A selector defining raw data to select.
     */
    mapSelectorToRawDataSelector: {
        value: function (selector) {
            return selector;
        }
    },

    /**
     * Convert raw data to data objects of an appropriate type.
     *
     * Subclasses should override this method to map properties of the raw data
     * to data objects, as in the following:
     *
     *     mapRawDataToObject: {
     *         value: function (object, record) {
     *             object.firstName = record.GIVEN_NAME;
     *             object.lastName = record.FAMILY_NAME;
     *         }
     *     }
     *
     * Alternatively, subclasses can define a
     * [mapping]{@link DataService#mapping} to do this mapping.
     *
     * The default implementation of this method uses the service's mapping if
     * the service has one, and otherwise calls the deprecated
     * [mapFromRawData()]{@link RawDataService#mapFromRawData}, whose default
     * implementation does nothing.
     *
     * @todo Make this method overridable by type name with methods like
     * `mapRawDataToHazard()` and `mapRawDataToProduct()`.
     *
     * @method
     * @argument {Object} record - An object whose properties' values hold
     *                             the raw data.
     * @argument {Object} object - An object whose properties must be set or
     *                             modified to represent the raw data.
     * @argument {?} context     - The value that was passed in to the
     *                             [addRawData()]{@link RawDataService#addRawData}
     *                             call that invoked this method.
     */
    mapRawDataToObject: {
        value: function (record, object, context) {
            if (this.mapping) {
                this.mapping.mapRawDataToObject(record, object, context);
            } else if (record) {
                this.mapFromRawData(object, record, context);
            }
        }
    },

    /**
     * @todo Document.
     * @todo Make this method overridable by type name with methods like
     * `mapHazardToRawData()` and `mapProductToRawData()`.
     *
     * @method
     */
    mapObjectToRawData: {
        value: function (object, record) {
            this.mapToRawData(object, record);
        }
    },

    /**
     * If defined, used by
     * [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject} and
     * [mapObjectToRawData()]{@link RawDataService#mapObjectToRawData} to map
     * between the raw data on which this service is based and the typed data
     * objects which this service provides and manages.
     *
     * @type {?DataMapping}
     */
    mapping: {
        value: undefined
    },

    /***************************************************************************
     * Deprecated
     */

    /**
     * @todo Document deprecation in favor of
     * [mapRawDataToObject()]{@link RawDataService#mapRawDataToObject}
     *
     * @deprecated
     * @method
     */
    mapFromRawData: {
        value: function (object, record, context) {
            // Implemented by subclasses.
        }
    },

    /**
     * @todo Document deprecation in favor of
     * [mapObjectToRawData()]{@link RawDataService#mapObjectToRawData}
     *
     * @deprecated
     * @method
     */
    mapToRawData: {
        value: function (object, record) {
            // Implemented by subclasses.
        }
    },

    /**
     * @todo Remove any dependency and delete.
     *
     * @deprecated
     * @type {OfflineService}
     */
    offlineService: {
        value: undefined
    }

});
