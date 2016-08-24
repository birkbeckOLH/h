'use strict';

var stringUtil = require('./string');

var hyphenate = stringUtil.hyphenate;
var unhyphenate = stringUtil.unhyphenate;

/**
 * Utility functions for DOM manipulation.
 */

/**
 * Replace a DOM element with an HTML string and return the new DOM element.
 *
 * @param {Element} el - DOM Element to replace
 * @param {string} html - HTML string that replaces the entire element
 */
function replaceElement(el, html) {
  if (!el.parentElement) {
    throw new Error('Cannot replace an element without a parent');
  }
  var parentEl = el.parentElement;
  var siblings = Array.from(parentEl.children);
  var nodeIndex = siblings.indexOf(el);
  el.outerHTML = html;
  return parentEl.children[nodeIndex];
}

/**
 * Set the state classes (`is-$state`) on an element.
 *
 * @param {Element} el
 * @param {Object} state - A map of state keys to boolean. For each key `k`,
 *                 the class `is-$k` will be added to the element if the value
 *                 is true or removed otherwise.
 */
function setElementState(el, state) {
  Object.keys(state).forEach(function (key) {
    var stateClass = 'is-' + hyphenate(key);
    el.classList.toggle(stateClass, !!state[key]);
  });
}

function classesWithPrefix(el, prefix) {
  return Array.from(el.classList).reduce(function (classes, cls) {
    if (!cls.startsWith(prefix)) {
      return classes;
    }
    return classes.concat(cls);
  }, []);
}

function addElementToJsClassMap(el, map) {
  var jsClasses = classesWithPrefix(el, 'js-')
    .map(function (cls) { return cls.replace('js-', ''); })
    .map(unhyphenate);

  jsClasses.forEach(function (cls) {
    if (!map[cls]) {
      map[cls] = el;
    } else if (!Array.isArray(map[cls])) {
      map[cls] = [map[cls], el];
    } else {
      map[cls].push(el);
    }
  });
}

/**
 * Walk the tree of Element(s) starting at `el` and build a map of JS class names
 * to the Element or Elements which have those classes.
 *
 * @param {el} Element
 */
function jsElements(el, map) {
  map = map || {};
  addElementToJsClassMap(el, map);
  Array.from(el.children).forEach(function (child) {
    jsElements(child, map);
  });
  return map;
}

module.exports = {
  jsElements: jsElements,
  replaceElement: replaceElement,
  setElementState: setElementState,
};
