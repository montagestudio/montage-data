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

    getDataFetchPromise: {
        value: function (type, object, propertyName, prerequisitePropertyNames, criteria) {
            var self = this;
            // Create and cache a new fetch promise if necessary.
            if (!this._getCachedFetchPromise(object, propertyName)) {
                // Parse arguments.
                criteria = arguments[arguments.length - 1];
                if (arguments.length < 5 || !prerequisitePropertyNames) {
                    prerequisitePropertyNames = [];
                } else if (!Array.isArray(prerequisitePropertyNames)) {
                    prerequisitePropertyNames = Array.prototype.slice.call(arguments, 3, -1);
                }
                // Create and cache a new fetch promise
                this._setCachedFetchPromise(object, propertyName, this.nullPromise.then(function () {
                    // First get prerequisite data if necessary...
                    return self.rootService.getObjectData(object, prerequisitePropertyNames);
                }).then(function () {
                    // Then fetch the requested data...
                    return self.rootService.fetchData(DataSelector.withTypeAndCriteria(type, criteria));
                }).then(function (data) {
                    // Then waits until the next event loop to ensure only one
                    // fetch is dispatched per event loop (caching ensures all
                    // subsequent requests for the same fetch promise within the
                    // same event loop will return the same promise)...
                    return self._makeEventLoopPromise(data);
                }).then(function (data) {
                    // Then removes the promise from the cache so subsequent
                    // requests for this fetch promise generate new fetches.
                    self._setCachedFetchPromise(object, propertyName, null);
                    return data;
                }));

            }
            // Return the created or cached fetch promise.
            return this._getCachedFetchPromise(object, propertyName);
        }
    },

    _getCachedFetchPromise: {
        value: function (object, name) {
            this._cachedFetchPromises = this._cachedFetchPromises || {};
            this._cachedFetchPromises[name] = this._cachedFetchPromises[name] || new Map();
            return this._cachedFetchPromises[name].get(object);
        }
    },

    _setCachedFetchPromise: {
        value: function (object, name, promise) {
            this._cachedFetchPromises = this._cachedFetchPromises || {};
            this._cachedFetchPromises[name] = this._cachedFetchPromises[name] || new Map();
            this._cachedFetchPromises[name].set(object, promise);
        }
    },

    getRawDataFetchPromise: {
        value: function (url, data, type) {
            return this._getRawDataFetchPromise(url, data, type, true);
        }
    },

    getRawDataFetchPromiseWithoutUsingCredentials: {
        value: function (url, data, type) {
            return this._getRawDataFetchPromise(url, data, type, false);
        }
    },

    _getRawDataFetchPromise: {
        value: function (url, data, type, useCredentials) {
            var self = this;
            return new Promise(function (resolve, reject) {
                var request;
                // Fetch the requested raw data.
                if (url) {
                    request = new XMLHttpRequest();
                    request.onload = function () { resolve(request); };
                    if (data) {
                        request.open("POST", url, true);
                        request.setRequestHeader("Content-type", type || "application/x-www-form-urlencoded");
                        request.withCredentials = useCredentials;
                        request.send(data);
                    } else {
                        request.open("GET", url, true);
                        request.withCredentials = useCredentials;
                        request.send();
                    }
                } else {
                    reject(new Error("Undefined URL"));
                }
            }).then(function (request) {
                // The response status can be 0 initially even for successful
                // requests, so defer the processing of this response until the
                // next event loop to give the status time to be set correctly.
                return self._makeEventLoopPromise(request);
            }).then(function (request) {
                // Log a warning and return null for error status responses.
                var response = request.responseText;
                if (request.status >= 300) {
                    console.warn(new Error("Status " + request.status + " for " + url));
                    response = null;
                }
                return self.parseJson(response);
            });
        }
    },

    _makeEventLoopPromise: {
        value: function (value) {
            return new Promise(function (resolve, reject) {
                window.setTimeout(function () {
                    resolve(value);
                }, 0);
            });
        }
    },

    parseJson: {
        value: function (json) {
            var parsed;
            try {
                parsed = json && JSON.parse(json);
            } catch (error) {
                console.trace("Can't parse JSON -", json);
            }
            return parsed;
        }
    }

});
