var DataSelector = require("logic/model/data-selector").DataSelector;

/**
 * Backward compatibility support for logic/service/data-selector after that
 * class has been moved to logic/model/data-selector.
 *
 * @class
 * @extends external:Montage
 * @todo Deprecate.
 */
exports.DataSelector = DataSelector;
