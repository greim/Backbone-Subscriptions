# Backbone Subscriptions

Backbone subscriptions is a Backbone.js extension that provides loosely-coupled, app-wide communication between views, via a publish/subscribe pattern.
Backbone views are introverts when it comes to event handling.
They're great at reacting to internally-generated events, but not so great at reacting to externally-generated ones.
Backbone subscriptions provides a unique and clean solution to this problem.

## Example

```javascript
// an event that originates at the global level
window.addEventListener('message', function(ev){
  var message = JSON.parse(ev.data);
  Backbone.Subscriptions.publish('message', message);
});

// a view that subscribes to that event
var MyView = Backbone.View.extend({
  subscriptions: { 'message': 'handleMessage' },
  handleMessage: function(event, message){ ... }
});
```

The above shows an example of making a view respond to cross-window communication messages originating at `window`.
Similar use cases include subscribing to page visibility or focus changes, device orientation changes, window resize, incoming data from websockets, window scroll, local storage mutations, etc.

## Core concepts

What differentiates this from similar libraries is its reliance on the DOM as the system of record for views.
No internal reference map is used to track which instances exist or which subscribes to what.
Rather, subscribing views are lazily discovered at publish-time via the DOM.
This is possible because view elements are given the classname 'subscriber'.
The browser's native DOM engine is then used to locate these elements in a performant manner, by merely looping through a [live NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList#A_.22live.22_collection) on each event.
This approach gives three main benefits:

 1. Only views actually in the page (i.e. views that are reachable through the live DOM) receive updates from a "channel" (AKA an event that you can name anything you want).
 2. Views are naturally GC'd as sections of the DOM are overwritten, eliminating the need to explicitly unsubscribe from channels or write any other reference maintenance/cleanup code.
 3. It allows the implementation to stay compact and clean.

## API

Given that unsubscribing is implicit and no reference cleanup code is needed, the API is rather simple:

### Backbone.Subscriptions.publish(string)

Publish an event on a channel—AKA an event with a name of your choosing—identified by the given string.
Subsequent arguments are optional, and are passed along to subscribing methods.
When called, any views that subscribe to that channel, anywhere on the page, are notified.

### view.publish(string)

This method is identical to the one above, except that it's called on a view instance, and it only affects descendant views.
In other words, in the DOM tree, if viewA.el contains viewB.el but not viewC.el, and viewB and viewC both subscribe to channel 'foo', then calling `viewA.publish('foo')` will only notify viewB, not viewC.

This is only applicable in a nested-view scenario, i.e. when a view instantiates other views and inserts them into its own DOM tree.
For example, a list view might instantiate and render several item views during render and append them to itself.
If the list view provides a 'collapse all' button, it might do `this.publish('collapse')` in order to notify only its own item views they're supposed to collapse.

### view.subscriptions

This is a map keyed by channel name and valued by method names.
It's similar to the existing events object on Backbone views.

### view.method(event)

This is a method on your view that runs whenever a notification comes in over a channel.
It is passed an event object and any other parameters that were supplied in the call to the publish method.

### Example 1: Responsive views

```javascript
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

/* main.js
 * ----------------
 * Declare these event listeners once,
 * and they'll last for the lifetime of
 * the app.
 */
$(window).on('resize orientationchange', function(ev){
  Backbone.Subscriptions.publish(ev.type);
});
```

### Example 2: "Collapse all" button

```javascript
/* list.js
 * ----------------
 * A list of items that can be individually
 * expanded, plus a "collapse all" button.
 */
var List = Backbone.View.extend({
  tagName: 'ul',
  events: {
    'click button.collapse-all': 'collapseAll'
  },
  collapseAll: function(ev) {
    this.publish('collapse-all');
  },
  render: function(){
    this.collection.each(function(model){
      this.el.append(new Item({model:model}));
    }, this);
  }
});

/* item.js
 * ----------------
 * A single item within a list view.
 */
var Item = Backbone.View.extend({
  subscriptions: {
    'collapse-all': 'collapse'
  },
  collapse: function(ev) {
    this.$el.removeClass('expanded');
  }
});
```

## DOM tracking class name

To facilitate the discovery of views at runtime, each view's `el` is given the class name "subscriber". In cases where this collides with existing HTML classes, the following method can be called when your app first starts:

```javascript
Backbone.subscriptions.setDomTrackingClassName('my-custom-class');
```

## Browser support

Any browser that supports [`document.getElementsByClassName()`](https://developer.mozilla.org/en-US/docs/Web/API/document.getElementsByClassName) or [`document.querySelectorAll()`](http://www.w3.org/TR/selectors-api2/) is supported.
These methods are what enbable it to do lazy view discovery in a performant manner.
In practical terms, this means that Backbone subscriptions should work in IE8 and above, plus any remotely modern Webkit/Gecko/Presto.

## AMD/RequireJS

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
