////////////////////////////////////////////////////////////////////////////////
// Types

/**
 * An object that represents an operation that may not have completed yet but
 * this is expected to complete in the future if it's not already completed, and
 * that yields a value when it's completed.
 *
 * @external Promise
 * @see {@linkcode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise}
 */

/**
 * The basis of all types that use the Montage framework.
 *
 * @external Montage
 * @see {@linkcode http://docs.montagestudio.com/api/Montage.html}
 */

/**
 * A component that repeats its inner template for each item in an array.
 *
 * @external Repetition
 * @see {@linkcode http://docs.montagestudio.com/api/Repetition.html}
 */

////////////////////////////////////////////////////////////////////////////////
// Callbacks

/**
 * A callback function called when a [Promise]{@linkcode external:Promise} is
 * fulfilled.
 *
 * @callback OnFulfilled
 * @param {Object} value - The fulfillment value.
 */

/**
 * A callback function called when a [Promise]{@linkcode external:Promise} is
 * rejected.
 *
 * @callback OnRejected
 * @param {Object} reason - The reason for the rejection.
 */

////////////////////////////////////////////////////////////////////////////////
// Concepts

/**
 * An expression that can be evaluated relative to an object to return a value.
 * The syntax of the expression is defined by the FRB (Functional Reactive
 * Bindings) project.
 *
 * @external FrbExpression
 * @see {@linkplain https://github.com/montagejs/frb}
 */

/**
 * A well defined set of properties and methods that can be found in objects
 * that adhere to it. Sometimes incorrectly called an interface.
 *
 * @external Protocol
 * @see {@linkplain https://en.wikipedia.org/wiki/Protocol_(object-oriented_programming)}
 */

/**
 * A mechanism that calls a listener function every time the contents of an
 * array are modified in any way.
 *
 * @external RangeChangeListener
 * @see {@linkplain http://www.collectionsjs.com/method/add-range-change-listener}
 */

/**
 * Customize a Montage type.
 *
 * @external specialize
 * @see {@linkplain http://docs.montagestudio.com/api/Montage.html#specialize}
 */
