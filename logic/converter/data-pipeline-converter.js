var PipelineConverter = require("montage/core/converter/pipeline-converter").PipelineConverter,
    DataStream = require("logic/service/data-stream").DataStream,
    Promise = require("montage/core/promise").Promise;


exports.DataPipelineConverter = PipelineConverter.specialize({

    deserializeSelf: {
        value: function (deserializer) {
            this.converters = deserializer.getProperty("converters");
        }
    },

    service: {
        set: function (value) {
            this.converters.forEach(function (converter) {
                converter.service = value;
            });
        }
    },

    _convertWithNextConverter: {
        value: function (input, converters) {
            var self = this,
                converter = converters.shift(),
                output = converter.convert(input),
                result;

            if (converters.length) {
                output = this._isStreamOrPromise(output) ? output : Promise.resolve(output);
                result = output.then(function (value) {
                    return self._convertWithNextConverter(value, converters);
                });
            } else {
                result = this._isStreamOrPromise(output) ? output : Promise.resolve(output);
            }

            return result;
        }
    },

    _isStreamOrPromise: {
        value: function (value) {
            return value instanceof DataStream || value instanceof Promise;
        }
    }

});
