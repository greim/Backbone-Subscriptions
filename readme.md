# Loosely-coupled, DOM-based, app-wide, cross-view communication for Backbone

Backbone subscriptions makes it easy to compose Backbone views into large applications by allowing *cross-view communication*.

## Features

 * Uses a publish/subscribe pattern to achieve loose coupling.
 * Ability to publish information to all views anywhere on the page.
 * Ability to publish information to only views nested within a given containing view.
 * Ability for views to subscribe to as many channels—AKA events—as they want.
 * Only views that are live in the DOM receive notifications.
 * Unsubscription is implicit; eliminating worry about memory leaks and zombie views.

## Core concepts

### Memory leaks and zombie views

Event handling in JS requires a reference chain from the listenee back to the listener.
This poses problems for views that want to communicate using events.
When a reference chain leads back to a view, that view isn't garbage collected, causing a memory leak.
In addition, it becomes a "zombie view", continuing to respond to events long after its `el` is removed from the page.
If you care about performance at all, this drastically complicates the use of events.

### DOM as system of record

In Backbone subscriptions, the reference chain from listenee to listener *is* the DOM.
When an event is published, Backbone subscriptions simply looks at the DOM for any subscribing views.
This approach gives several benefits:

 1. Only views currently in the page receive updates from a channel.
 2. Browsers' native DOM engines are *fast*, allowing subscribing views to be located with minimal processor overhead.
 3. No memory leaks or zombie views. Removing or overwriting sections of DOM doubles as your reference cleanup.
 4. It allows the implementation to stay compact and clean, since reference cleanup and unsuscription logic aren't needed.

## API

### `Backbone.Subscriptions.publish(string)`

Call this method to publish to a channel.
A channel is just a named event, and is identified by the given string.
Subsequent arguments are optional, and are passed along to subscribing methods.
When called, any views that subscribe to that channel, anywhere on the page, are notified.

### `Backbone.View.prototype.publish(string)`

This method is identical to the one above, except that it's called on a view instance, and only affects nested views.
In other words, in the DOM tree, if viewA.el contains viewB.el but not viewC.el, and viewB and viewC both subscribe to channel 'foo', then calling `viewA.publish('foo')` will only notify viewB, not viewC.

This is only applicable in a nested-view scenario, i.e. when a view instantiates other views and inserts them into its own DOM tree.
For example, a list view might instantiate and render several item views during render and append them to itself.
If the list view provides a 'collapse all' button, it might do `this.publish('collapse')` in order to notify only its own item views that they're supposed to collapse.

### `MyView.prototype.subscriptions`

This is a &lt;string, string&gt; map where keys are channels and values are the names of methods declared on that view.
It's similar to the existing events object on Backbone views, and looks like this:

```javascript
var MyView = Backbone.View.extend({
  subscriptions: {
    'foo': 'handleFoo'
  },
  handleFoo: function() {
    ...
  }
});

// elsewhere

Backbone.Subscriptions.publish('foo');
```

#### Channel filtering

Optionally, channels may be filtered by argument list length and typeof.

```javascript
var MyView = Backbone.View.extend({
  subscriptions: {

    // only be notified if caller
    // passes a string and a number
    'foo (string, number)': 'foo',

    // only be notified if caller
    // passes an object and another
    // argument of any type
    'bar (object, *)': 'bar',

    // only be notified if caller
    // passes no args
    'baz ()': 'baz'
  }
});
```

#### Handler methods

Handler methods are plain old view methods like any other backbone view method.
They get passed an event object as the first parameter.
Any subsequent arguments are passed along as well.

## Use case examples

### Example 1: Responsive views

```javascript
/* main.js
 * ----------------
 * Application-wide broadcast of viewport
 * mutation events.
 */
$(window).on('resize orientationchange', function(ev){
  Backbone.Subscriptions.publish(ev.type);
});

/* nav.js
 * ----------------
 * This navigation menu view is part of a
 * responsive design that redraws itself
 * depending on the device size and
 * orientation.
 */
var Menu = Backbone.View.extend({
  subscriptions: {
    'orientationchange': 'redraw',
    'resize': 'redraw'
  },
  redraw: function(ev) {
    console.log('redrawing menu in response to ' + ev.channel);
  }
});
```

### Example 2: Collapse-all button

```javascript
/* list.js
 * ----------------
 * A list of items that can be individually
 * expanded, plus a "collapse all" button.
 * Whenever the button is pressed, it publishes
 * a collapse-all event to any view whose
 * el is contained by this.el
 */
var List = Backbone.View.extend({
  tagName: 'ul',
  events: {
    'click button.collapse-all': 'collapseAll'
  },
  collapseAll: function() {
    this.publish('collapse-all');
  },
  render: function(){
    this.collection.each(function(model){
      this.el.append(new Item({model:model}).el);
    }, this);
  }
});

/* item.js
 * ----------------
 * A single item within a list view.
 */
var Item = Backbone.View.extend({
  tagName: 'li',
  subscriptions: {
    'collapse-all': 'collapse'
  },
  collapse: function() {
    this.$el.removeClass('expanded');
  }
});
```

## DOM tracking class name

To facilitate the discovery of views in the DOM, each view's `el` is given the class name "subscriber". In cases where this collides with existing conventions, the following method can be called when your app first starts:

```javascript
Backbone.subscriptions.setDomTrackingClassName('my-custom-class');
```

## Browser support

Any browser that supports [`document.getElementsByClassName()`](https://developer.mozilla.org/en-US/docs/Web/API/document.getElementsByClassName) or [`document.querySelectorAll()`](http://www.w3.org/TR/selectors-api2/) is supported.
These methods are what enbable it to find subscribing views in a performant manner.
In practical terms, this means that Backbone subscriptions works in **IE8 and above**, plus any remotely modern Webkit/Gecko/Presto.

## AMD/RequireJS compatible

This library creates `Backbone.Subscriptions`. If AMD/RequireJS exists, this object is also what is exported into AMD's registry.

```javascript
define([
  'backbone',
  'backbone-subscriptions'
], function(
  Backbone,
  subs
){
  alert(subs === Backbone.Subscriptions); // true
});
```
