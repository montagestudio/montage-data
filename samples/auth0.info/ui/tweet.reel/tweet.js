/**
 * @module ui/game-board.reel
 */
var Component = require("montage/ui/component").Component;

/**
 * @class Tweet
 * @extends Component
 */
exports.Tweet = Component.specialize(/** @lends Tweet# */ {

	constructor: {
        value: function Tweet() {
            this.super();
        }
    },
    
	_value: {
        value: null
    },

    /**
     * The string to be displayed. `null` is equivalent to the empty string.
     * @type {string}
     * @default null
     */
    value: {
        get: function () {
            return this._value;
        },
        set: function (value) {
            if (this._value !== value) {
                this._value = value;
                this.needsDraw = true;
            }
        }
    },
});