var Promise = require("bluebird");

/*
 * Provide a polyfill for Promise so any code using Montage Data can use
 * new Promise(), Promise.all(), Promise.race(), Promise.resolve(), etc...
 * This polyfill is based on Bluebird's implementation of promises.
 */
(function () {

    // Get the global object (see <http://stackoverflow.com/a/6930376>).
    var global;
    try {
        global = Function('return this')() || (0, eval)('this');
    } catch (exception) {
        global = window;
    }

    // Promise polyfill.
    if (!global.Promise) {
        global.Promise = Promise;
    }

}());
