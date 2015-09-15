var DataService = require("logic/service/data-service").DataService,
    DataSelector = require("logic/service/data-selector").DataSelector,
    Map = require("collections/map");

/**
 * Provides utility methods for REST services.
 *
 * @class
 * @extends external:DataService
 */
exports.RestService = DataService.specialize(/** @lends RestService# */{

    getDataPromise: {
        value: function (cacheName, cacheKey, criteria, preparation) {
            var self = this,
                promise = this[cacheName] && this[cacheName].get(cacheKey);
            if (!promise) {
                promise = new Promise(function (resolve, reject) {
                    // Call the preparation function if one was provided and
                    // then defer the fetch until the next event loop to allow
                    // fetches for similar data to be combined.
                    var resolution = preparation ? preparation.call(self) : null;
                    window.setTimeout(function () { resolve(resolution); }, 0);
                }).then(function () {
                    // Fetch the data.
                    var selector, name;
                    selector = new DataSelector();
                    selector.type = self.type;
                    for (name in criteria) {
                        selector.criteria[name] = criteria[name];
                    }
                    return self.mainService.fetchData(selector);
                }).then(function () {
                    // Ensure the promise callback's argument will be null.
                    return null;
                });
                this[cacheName] = this[cacheName] || new Map();
                this[cacheName].set(cacheKey, promise);
            }
            return promise;
        }
    },

    getFetchPromise: {
        value: function (url) {
            return new Promise(function (resolve, reject) {
                console.log("RestService.getFetchPromise(" + url + ")");
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
