'use strict';

var dom = require('../util/dom');

/**
 * Base class for controllers that upgrade elements with additional
 * functionality.
 *
 * - Child elements with `js-$name` class prefixes are exposed on the controller
 *   as `this.refs.$name` where $name is camelCased.
 * - The element passed to the controller is exposed via the `element` property
 * - The controllers attached to an element are accessible via the
 *   `element.controllers` array
 *
 * @param {Element} element - The DOM Element to upgrade
 */
function Controller(element) {
  if (!element.controllers) {
    element.controllers = [this];
  } else {
    element.controllers.push(this);
  }

  this.state = {};
  this.element = element;
  this.refs = dom.jsElements(element);
}

/**
 * Set the state of the controller.
 *
 * This will merge `changes` into the current state and call the `update()`
 * method provided by the subclass to update the DOM to match the current state.
 */
Controller.prototype.setState = function (changes) {
  var prevState = this.state;
  this.state = Object.freeze(Object.assign({}, this.state, changes));
  this.update(this.state, prevState);
};

/**
 * Replace the HTML content of the element with an updated version from the
 * server.
 */
Controller.prototype.reload = function (html) {
  this.element.controllers = null;
  var root = dom.replaceElement(this.element, html);

  this.element = root;
  this.refs = dom.jsElements(root);
  this.state = {};
};

module.exports = Controller;
