var DataQuery = require("logic/model/data-query").DataQuery;

/**
 * Backward compatibility support for logic/model/data-selector after that
 * class has been renamed to logic/model/data-query.
 *
 * @class
 * @extends external:Montage
 * @todo Deprecate.
 */
exports.DataSelector = DataQuery;
