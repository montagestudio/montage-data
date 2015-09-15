// Note: Bluebird promises are used even if ECMAScript 6 promises are available.
var DataProvider = require("logic/service/data-provider").DataProvider,
    Promise = require("bluebird");

/**
 * A [DataProvider]{@link DataProvider} whose data is received sequentially.
 * A DataStreams is also a [Promise]{@linkcode external:Promise} which is
 * fulfilled when all the data it expects has been received.
 *
 * Objects receiving data from a stream will use its
 * [data]{@link DataStream#data} property to access that data. Alternatively
 * they can use its [then()]{@link DataStream#then} method to get that data.
 *
 * Objects putting data in a stream will use its
 * [addData()]{@link DataStream#addData} method to add that data and its
 * [dataDone()]{@link DataStream#dataDone} method to indicate that all available
 * data has been added.
 *
 * Objects can either receive data from a stream or add data to it, but not
 * both. Additionally, only one object can ever add data to a particular
 * stream. Typically that object will be a [Service]{@link DataService}.
 *
 * Streams are also [promises]{@linkcode external:Promise} that become fulfilled
 * when all the data they expect to get is first received. These promises will
 * not be fulfilled again if that data subsequently changes for any reason.
 *
 * @class
 * @extends DataProvider
 *
 */
exports.DataStream = DataProvider.specialize(/** @lends DataStream# */{

    _isDataDone: {
        value: false // Set in dataDone().
    },

    _resolve: {
        value: undefined // Set in _promise getter, used in dataDone().
    },

    _promise: {
        get: function () {
            var self = this;
            if (!this.__promise) {
                if (this._isDataDone) {
                    this.__promise = Promise.resolve(this.data);
                } else {
                    this.__promise = new Promise(function(resolve) { self._resolve = resolve; });
                }
            }
            return this.__promise;
        }
    },

    /**
     * The service responsible for this stream's data.
     *
     * @type {DataService}
     */
    service: {
        value: undefined
    },

    /**
     * The selector defining the data returned in this stream.
     *
     * @type {DataSelector}
     */
    selector: {
        value: undefined
    },

    /**
     * All the objects that has been ever been added to the stream. Property
     * defined by this class' [DataProvider]{@link DataProvider} superclass.
     *
     * @member {Array} DataStream#data
     */

    /**
     * Unused method of this class' [DataProvider]{@link DataProvider}
     * superclass.
     *
     * @method
     * @argument {int} start  - See [superclass]{@link DataProvider#requestData}.
     * @argument {int} length - See [superclass]{@link DataProvider#requestData}.
     */
    requestData: {
        value: function (start, length) {
            // Don't do anything, data will come in the order it is added to the
            // stream and no request can change that.
        }
    },

    /**
     * Add some object to the stream's [data]{@link DataStream#data} array.
     *
     * @method
     * @argument {Array} objects - An array of objects to add to the stream's
     *                             data. If this array is empty or `undefined`,
     *                             no objects are added.
     */
    addData: {
        value: function (objects) {
            if (objects && objects.length) {
                this.data.push.apply(this.data, objects);
            }
        }
    },

    /**
     * To be called when all the data expected by this stream has been added to
     * its [data]{@link DataStream#data} array.
     *
     * @method
     */
    dataDone: {
        value: function () {
            this._isDataDone = true;
            if (this._resolve) {
                this._resolve(this.data);
                this._resolve = null;
            }
        }
    },

    /**
     * Method of the [Promise]{@linkcode external:Promise} class used to
     * kick off additional processing when all the data expected by this
     * stream has been received.
     *
     * @method
     * @argument {OnFulfilled} onFulfilled - Called when the stream has received
     *                                       all the data it is expected to
     *                                       receive. Because changes in
     *                                       selectors, filters, sorting, or on
     *                                       in service data may occur after
     *                                       that, this stream'
     *                                       [data]{@link DataStream#data} array
     *                                       may actually change after this
     *                                       method is called, but if that
     *                                       happens this method will not be
     *                                       called again. This method therefore
     *                                       only provides an indication of when
     *                                       the first set of data received by
     *                                       this stream was received.
     * @argument {OnRejected} onRejected   - DataStreams are never rejected so
     *                                       rejection callbacks passed in to
     *                                       this method are never called.
     */
    then: {
        value: function (onFulfilled, onRejected) {
            return this._promise.then(onFulfilled, onRejected);
        }
    },

    /**
     * Unused method of the [Promise]{@linkcode external:Promise} class.
     *
     * @method
     * @argument {OnRejected} onRejected - Rejection callback. DataStreams are
     *                                     never rejected so callbacks passed
     *                                     in to this method are never called.
     */
    catch: {
        value: function (onRejected) {
            return this._promise.catch(onRejected);
        }
    }

});
