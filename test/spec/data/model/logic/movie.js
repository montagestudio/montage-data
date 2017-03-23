var Montage = require("montage").Montage;

/**
 * @class Movie
 * @extends Montage
 */
exports.Movie = Montage.specialize({

    plotSummary: {
        value: undefined
    },

    title: {
        value: undefined
    }

});
