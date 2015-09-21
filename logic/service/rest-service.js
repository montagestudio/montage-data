var DataService = require("logic/service/data-service").DataService,
    DataSelector = require("logic/service/data-selector").DataSelector,
    Map = require("collections/map"),
    Promise = require("bluebird");

/**
 * Provides utility methods for REST services.
 *
 * @class
 * @extends external:DataService
 */
exports.RestService = DataService.specialize(/** @lends RestService# */{

    _propertyDataPromiseCaches: {
        get: function () {
            if (!this.__propertyDataPromiseCaches) {
                this.__propertyDataPromiseCaches = {};
            }
            return this.__propertyDataPromiseCaches;
        }
    },

    getPropertyDataPromise: {
        value: function (name, criteria, object, prerequisites) {
            var self = this,
                caches = this._propertyDataPromiseCaches;
                promise = caches[name] && caches[name].get(object);
            if (!caches[name] || !caches[name].get(object)) {
                caches[name] = caches[name] || new Map();
                caches[name].set(object, new Promise(function (resolve, reject) {
                    // Get prerequisite property values if necessary and then
                    // defer the fetch until the next event loop to allow
                    // fetches for similar data to be combined.
                    var resolution = null;
                    if (prerequisites && arguments.length > 4) {
                        resolution = DataService.main.getPropertyData(object, Array.prototype.slice.call(arguments, 3));
                    } else if (prerequisites) {
                        resolution = DataService.main.getPropertyData(object, prerequisites);
                    }
                    window.setTimeout(function () { resolve(resolution); }, 0);
                }).then(function () {
                    // Fetch the data.
                    var selector, name;
                    selector = new DataSelector();
                    selector.type = self.type;
                    for (name in criteria) {
                        selector.criteria[name] = criteria[name];
                    }
                    return DataService.main.fetchData(selector);
                }));
            }
            return caches[name].get(object);
        }
    },

    getDataFetchPromise: {
        value: function (url) {
            return new Promise(function (resolve, reject) {
                // Fetch the requested data.
                if (url) {
                    request = new XMLHttpRequest();
                    request.onload = function () { resolve(request); };
                    request.open("GET", url, true);
                    request.withCredentials = true;
                    request.send();
                } else {
                    reject(new Error("Undefined URL"));
                }
            }).then(function (request) {
                // The response status can be 0 initially even for successful
                // requests, so defer the processing of this response until the
                // next event loop so the status has time to be set correctly.
                return new Promise(function (resolve, reject) {
                    window.setTimeout(function () { resolve(request); }, 0);
                });
            }).then(function (request) {
                // Convert error status responses to exceptions.
                var error;
                if (request.status === 0 || request.status >= 300) {
                    error = new Error(String(request.status));
                    error.request = request;
                    throw error;
                }
                return request.responseText;
            });
        }
    }

});
