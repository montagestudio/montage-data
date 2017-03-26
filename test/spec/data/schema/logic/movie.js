exports.Movie = function () {};

exports.Movie.prototype = Object.create(Object.prototype, /** @lends Hazard.prototype */ {

    /**
     * @type {function}
     */
    constructor: {
        configurable: true,
        writable: true,
        value: exports.Movie
    }

});
